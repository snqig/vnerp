/**
 * 系统配置种子 / 数据迁移 —— 从 `api/settings/system/route.ts` 抽出
 *
 * 为什么抽出来（BUG-SET-002）：
 *   原实现把「补列 + 迁移旧键 + 全量 upsert 127 个默认键」挂在 `GET /api/settings/system` 上，
 *   导致**读接口携带写副作用与 DDL 权限要求**。抽成独立模块后：
 *     - 读接口（GET）变成纯读；
 *     - 种子改为「启动任务 + 可手工执行的 CLI」两条正式路径；
 *     - 结构变更（补列 / 建变更记录表）回归 `database/migrations/079_*.sql`。
 *
 * 为什么不再依赖 next-intl（附带修复 locale pollution）：
 *   原实现用 `getTranslations('Common')` 取分类名写库 —— 谁来触发种子，库里就写成谁的语言。
 *   种子写入的是**持久化数据**，必须与请求语言无关，故改为固定的 zh-CN 词表
 *   （与 DEFAULT_CONFIGS 里已硬编码的中文分类保持一致）。
 *
 * 幂等：按 config_key 逐键 upsert，可重复执行。
 * 用法：
 *   - 启动时：src/instrumentation.ts 的 register()（Node.js runtime，非致命）
 *   - 手工：npx tsx scripts/seed-system-config.ts
 */

import { query, execute, queryOne } from '@/lib/db';
import type { DbRow } from '@/types/db';
import { secureLog } from '@/lib/logger';

import { randomBytes } from 'node:crypto';
import { isSecretConfigKey } from '@/lib/config-secret';

interface SystemConfigItem {
  id?: number;
  config_key: string;
  config_value: string;
  config_type_enum: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_required: boolean;
  approval_required: boolean;
  status: number;
}

// 完整的默认配置定义
const DEFAULT_CONFIGS: SystemConfigItem[] = [
  // 一、编码规则配置
  {
    config_key: 'serial_number_length',
    config_value: '4',
    config_type_enum: 'number',
    category: '单据编码规则',
    display_name: '流水号长度',
    description: '所有单据末尾流水号位数(2-6)',
    sort_order: 1,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'doc_date_format',
    config_value: 'YYYYMMDD',
    config_type_enum: 'string',
    category: '单据编码规则',
    display_name: '单据日期格式',
    description: '所有单据编号中的日期格式',
    sort_order: 2,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'wo_prefix',
    config_value: 'WO',
    config_type_enum: 'string',
    category: '单据编码规则',
    display_name: '生产工单前缀',
    description: '生产工单编号前缀',
    sort_order: 3,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'sample_prefix',
    config_value: 'SAMPLE',
    config_type_enum: 'string',
    category: '单据编码规则',
    display_name: '打样工单前缀',
    description: '打样工单编号前缀',
    sort_order: 4,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'mr_prefix',
    config_value: 'MR',
    config_type_enum: 'string',
    category: '单据编码规则',
    display_name: '领料单前缀',
    description: '物料领用单编号前缀',
    sort_order: 5,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'fpr_prefix',
    config_value: 'FPR',
    config_type_enum: 'string',
    category: '单据编码规则',
    display_name: '成品入库前缀',
    description: '成品入库单编号前缀',
    sort_order: 6,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'sh_prefix',
    config_value: 'SH',
    config_type_enum: 'string',
    category: '单据编码规则',
    display_name: '发货单前缀',
    description: '发货单编号前缀',
    sort_order: 7,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'po_prefix',
    config_value: 'PO',
    config_type_enum: 'string',
    category: '单据编码规则',
    display_name: '采购订单前缀',
    description: '采购订单编号前缀',
    sort_order: 8,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'qc_prefix',
    config_value: 'QC',
    config_type_enum: 'string',
    category: '单据编码规则',
    display_name: '检验单前缀',
    description: '质检检验单编号前缀',
    sort_order: 9,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'sc_prefix',
    config_value: 'SC',
    config_type_enum: 'string',
    category: '单据编码规则',
    display_name: '标准卡编码前缀',
    description: '标准卡编号前缀(颜色SCC/工艺SCP/质量SCQ/综合SCZ)',
    sort_order: 10,
    is_required: true,
    approval_required: true,
    status: 1,
  },

  // 二、刀模寿命配置
  {
    config_key: 'mould_life_days',
    config_value: '90',
    config_type_enum: 'number',
    category: '刀模配置',
    display_name: '刀模有效天数',
    description: '刀模从启用到报废的有效天数',
    sort_order: 20,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'mould_max_times',
    config_value: '5000',
    config_type_enum: 'number',
    category: '刀模配置',
    display_name: '刀模最大使用次数',
    description: '刀模最大允许使用次数',
    sort_order: 21,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'mould_warn_days',
    config_value: '15',
    config_type_enum: 'number',
    category: '刀模配置',
    display_name: '刀模预警天数',
    description: '刀模到期前多少天开始预警',
    sort_order: 22,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'mould_scrap_rule',
    config_value: 'both',
    config_type_enum: 'string',
    category: '刀模配置',
    display_name: '刀模报废规则',
    description: '报废规则：both=到期+超次数自动报废, date_only=仅到期, times_only=仅超次数',
    sort_order: 23,
    is_required: true,
    approval_required: true,
    status: 1,
  },

  // 三、网版寿命配置
  {
    config_key: 'screen_life_days',
    config_value: '60',
    config_type_enum: 'number',
    category: '网版配置',
    display_name: '网版有效天数',
    description: '网版从启用到报废的有效天数',
    sort_order: 24,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'screen_max_times',
    config_value: '3000',
    config_type_enum: 'number',
    category: '网版配置',
    display_name: '网版最大使用次数',
    description: '网版最大允许使用次数',
    sort_order: 25,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'screen_warn_days',
    config_value: '10',
    config_type_enum: 'number',
    category: '网版配置',
    display_name: '网版预警天数',
    description: '网版到期前多少天开始预警',
    sort_order: 26,
    is_required: true,
    approval_required: false,
    status: 1,
  },

  // 四、原材料/油墨保质期
  {
    config_key: 'pet_film_shelf_life',
    config_value: '360',
    config_type_enum: 'number',
    category: '原材料保质期',
    display_name: 'PET/PVC薄膜保质期',
    description: 'PET/PVC薄膜的有效保质期天数',
    sort_order: 30,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'solvent_shelf_life',
    config_value: '180',
    config_type_enum: 'number',
    category: '原材料保质期',
    display_name: '溶剂保质期',
    description: '印刷溶剂的有效保质期天数',
    sort_order: 31,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'ink_unopened_shelf_life',
    config_value: '180',
    config_type_enum: 'number',
    category: '原材料保质期',
    display_name: '油墨未开盖保质期',
    description: '油墨未开盖状态下的保质期天数',
    sort_order: 32,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'ink_opened_shelf_life',
    config_value: '30',
    config_type_enum: 'number',
    category: '原材料保质期',
    display_name: '油墨开盖后保质期',
    description: '油墨开盖后的保质期天数',
    sort_order: 33,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'mixed_ink_expiry_hours',
    config_value: '24',
    config_type_enum: 'number',
    category: '原材料保质期',
    display_name: '混合油墨过期时间',
    description: '混合油墨配制后的有效使用时长（小时）',
    sort_order: 34,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'glue_shelf_life',
    config_value: '90',
    config_type_enum: 'number',
    category: '原材料保质期',
    display_name: '辅料/胶水保质期',
    description: '胶水和辅料的保质期天数',
    sort_order: 35,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'material_warn_days',
    config_value: '30',
    config_type_enum: 'number',
    category: '原材料保质期',
    display_name: '原材料预警天数',
    description: '所有原材料统一预警提前天数',
    sort_order: 36,
    is_required: true,
    approval_required: false,
    status: 1,
  },

  // 五、小料拆分标准
  {
    config_key: 'film_split_length',
    config_value: '10',
    config_type_enum: 'number',
    category: '小料拆分标准',
    display_name: 'PET薄膜拆分长度',
    description: '整卷PET薄膜拆分成小料的长度单位（米）',
    sort_order: 40,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'pvc_split_length',
    config_value: '10',
    config_type_enum: 'number',
    category: '小料拆分标准',
    display_name: 'PVC薄膜拆分长度',
    description: '整卷PVC薄膜拆分成小料的长度单位（米）',
    sort_order: 41,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'ink_split_weight',
    config_value: '1',
    config_type_enum: 'number',
    category: '小料拆分标准',
    display_name: '油墨拆分重量',
    description: '整桶油墨拆分成小料的重量单位（kg）',
    sort_order: 42,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'solvent_split_volume',
    config_value: '5',
    config_type_enum: 'number',
    category: '小料拆分标准',
    display_name: '溶剂拆分容积',
    description: '整桶溶剂拆分成小料的容积单位（L）',
    sort_order: 43,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'mesh_split_length',
    config_value: '10',
    config_type_enum: 'number',
    category: '小料拆分标准',
    display_name: '网布拆分长度',
    description: '整卷网布拆分成小料的长度单位（米）',
    sort_order: 44,
    is_required: true,
    approval_required: true,
    status: 1,
  },

  // 六、仓库管理规则
  {
    config_key: 'fifo_enabled',
    config_value: 'true',
    config_type_enum: 'boolean',
    category: '仓库管理规则',
    display_name: '强制先进先出',
    description: '是否强制按入库时间先进先出出库',
    sort_order: 50,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'allow_whole_material_issue',
    config_value: 'false',
    config_type_enum: 'boolean',
    category: '仓库管理规则',
    display_name: '允许整料直接发料',
    description: '是否允许未拆分的整料直接发料（建议关闭）',
    sort_order: 51,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'requisition_priority',
    config_value: 'expiry_first',
    config_type_enum: 'string',
    category: '仓库管理规则',
    display_name: '领料优先级',
    description: 'expiry_first=先到期先出，fifo=标准先进先出',
    sort_order: 52,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'allow_no_issue_without_order',
    config_value: 'false',
    config_type_enum: 'boolean',
    category: '仓库管理规则',
    display_name: '允许无单发料',
    description: '是否允许没有订单直接发料（建议关闭）',
    sort_order: 53,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'over_requisition_approval',
    config_value: 'true',
    config_type_enum: 'boolean',
    category: '仓库管理规则',
    display_name: '超领需要审批',
    description: '超过标准定额领料是否需要审批',
    sort_order: 54,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'replenish_dual_approval',
    config_value: 'true',
    config_type_enum: 'boolean',
    category: '仓库管理规则',
    display_name: '补料需要双审批',
    description: '补料是否需要仓库主管+生产经理双重审批',
    sort_order: 55,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'obsolete_material_days',
    config_value: '90',
    config_type_enum: 'number',
    category: '仓库管理规则',
    display_name: '呆滞料判定天数',
    description: '库存超过此天数未动销判定为呆滞料',
    sort_order: 56,
    is_required: true,
    approval_required: false,
    status: 1,
  },

  // 七、循环盘点周期
  {
    config_key: 'a_class_cycle',
    config_value: '7',
    config_type_enum: 'string',
    category: '盘点周期管理',
    display_name: 'A类物料盘点周期',
    description: 'A类高价值物料盘点周期(天)',
    sort_order: 60,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'b_class_cycle',
    config_value: '30',
    config_type_enum: 'string',
    category: '盘点周期管理',
    display_name: 'B类物料盘点周期',
    description: 'B类中价值物料盘点周期(天)',
    sort_order: 61,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'c_class_cycle',
    config_value: '90',
    config_type_enum: 'string',
    category: '盘点周期管理',
    display_name: 'C类物料盘点周期',
    description: 'C类低价值物料盘点周期(天)',
    sort_order: 62,
    is_required: true,
    approval_required: true,
    status: 1,
  },

  // 八、生产与品质规则
  {
    config_key: 'allow_skip_process',
    config_value: 'false',
    config_type_enum: 'boolean',
    category: '生产与品质规则',
    display_name: '允许跳工序报工',
    description: '是否允许跳过工序顺序进行报工（建议关闭）',
    sort_order: 70,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'allow_duplicate_reporting',
    config_value: 'false',
    config_type_enum: 'boolean',
    category: '生产与品质规则',
    display_name: '允许重复报工',
    description: '是否允许同一工序重复报工（建议关闭）',
    sort_order: 71,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'quality_check_mandatory',
    config_value: 'true',
    config_type_enum: 'boolean',
    category: '生产与品质规则',
    display_name: '成品入库前必须检验',
    description: '成品入库前是否必须经过FQC检验',
    sort_order: 72,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'oqc_before_ship',
    config_value: 'true',
    config_type_enum: 'boolean',
    category: '生产与品质规则',
    display_name: '发货前必须OQC检验',
    description: '发货前是否必须经过OQC出货检验',
    sort_order: 73,
    is_required: true,
    approval_required: true,
    status: 1,
  },

  // 九、审批规则
  {
    config_key: 'require_approval_for_config_change',
    config_value: 'true',
    config_type_enum: 'boolean',
    category: '审批规则',
    display_name: '配置修改需审批',
    description: '修改系统参数是否需要审批流程',
    sort_order: 80,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'config_approver_role',
    config_value: 'system_admin',
    config_type_enum: 'string',
    category: '审批规则',
    display_name: '审批人角色',
    description: '配置变更的审批人角色',
    sort_order: 81,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'config_effect_mode',
    config_value: 'immediate',
    config_type_enum: 'string',
    category: '审批规则',
    display_name: '生效方式',
    description: 'immediate=立即生效, next_day=次日生效',
    sort_order: 82,
    is_required: true,
    approval_required: false,
    status: 1,
  },

  // 九、系统基础配置
  {
    config_key: 'company_name',
    config_value: '越南达昌丝网印刷有限公司',
    config_type_enum: 'string',
    category: '系统基础配置',
    display_name: '公司名称',
    description: '公司全称，用于全局显示',
    sort_order: 89,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'company_short_name',
    config_value: '达昌印刷',
    config_type_enum: 'string',
    category: '系统基础配置',
    display_name: '公司简称',
    description: '公司简称',
    sort_order: 89,
    is_required: false,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'sys.name',
    config_value: 'VNERP丝网印刷管理系统',
    config_type_enum: 'string',
    category: '系统基础配置',
    display_name: '系统名称',
    description: '系统显示名称',
    sort_order: 90,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'sys.version',
    config_value: 'v2.0.0',
    config_type_enum: 'string',
    category: '系统基础配置',
    display_name: '系统版本号',
    description: '系统版本号',
    sort_order: 91,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'sys.copyright',
    config_value: '© 2024 VNERP. All Rights Reserved.',
    config_type_enum: 'string',
    category: '系统基础配置',
    display_name: '版权信息',
    description: '版权声明信息',
    sort_order: 92,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'sys.default.password',
    // ⚠️ 不得再写死任何固定口令（原值 admin123，BUG-SET-006）。
    // 真实种子值由 resolveSeedValue() 现场生成强口令；此处留空仅为占位，
    // 且该键永不会走「更新已有行」分支去覆盖用户设置的值。
    config_value: '',
    config_type_enum: 'string',
    category: '系统基础配置',
    display_name: '用户默认密码',
    description: '新用户默认密码',
    sort_order: 93,
    is_required: true,
    approval_required: false,
    status: 1,
  },
];

// 迁移旧配置项到正确的分类
//
// ⚠️ 原先用 `getTranslations('Common')` 取分类名/显示名 —— 这是 **locale pollution**：
//    种子写入的是持久化数据，谁触发种子（中文请求 / 英文请求）库里就写成谁的语言。
//    改为固定 zh-CN 词表（取值与 messages/zh-CN.json 的 Common 命名空间逐条核对过），
//    与 DEFAULT_CONFIGS 里已硬编码的中文分类保持一致，并与请求语言彻底解耦。
const ZH_CN_LABELS: Record<string, string> = {
  // 分类
  k_xj9vm2: '系统基础配置',
  k_185glin: '仓库管理规则',
  k_6k0dvs: '单据编码规则',
  // 显示名 / 描述
  companyName: '公司名称',
  companyFullName: '公司全称',
  companyCode: '公司编码',
  k_1vz2f8c: '公司简称编码',
  k_1yczi2f: '默认仓库',
  k_1mr113d: '系统默认仓库',
  k_1az2t13: 'FIFO模式',
  k_qre4qy: '先进先出模式',
  k_q2w7gt: '入库自动审批',
  k_bfs4ix: '入库单是否自动审批',
  k_ul0wdp: '批次号前缀',
  k_91nefw: '库存批次号前缀',
  k_fg8ale: '订单编号前缀',
  k_xa1mgc: '销售订单编号前缀',
  k_uxhvfl: '默认货币',
  k_1mskhhd: '系统默认货币单位',
  k_168fx7a: '默认税率',
  k_z0pave: '系统默认税率(%)',
  k_y43tbv: '入库打印标签',
  k_1nuyja4: '入库时是否自动打印标签',
};

async function migrateOldConfigs(): Promise<void> {
  const ts = (key: string): string => ZH_CN_LABELS[key] ?? key;
  const tc = ts;
  const migrations: Record<
    string,
    {
      category: string;
      display_name: string;
      description: string;
      config_type_enum: string;
      sort_order: number;
    }
  > = {
    company_name: {
      category: ts('k_xj9vm2'),
      display_name: tc('companyName'),
      description: tc('companyFullName'),
      config_type_enum: 'string',
      sort_order: 94,
    },
    company_code: {
      category: ts('k_xj9vm2'),
      display_name: tc('companyCode'),
      description: ts('k_1vz2f8c'),
      config_type_enum: 'string',
      sort_order: 95,
    },
    default_warehouse: {
      category: ts('k_185glin'),
      display_name: ts('k_1yczi2f'),
      description: ts('k_1mr113d'),
      config_type_enum: 'string',
      sort_order: 57,
    },
    fifo_mode: {
      category: ts('k_185glin'),
      display_name: ts('k_1az2t13'),
      description: ts('k_qre4qy'),
      config_type_enum: 'string',
      sort_order: 58,
    },
    auto_inbound_approve: {
      category: ts('k_185glin'),
      display_name: ts('k_q2w7gt'),
      description: ts('k_bfs4ix'),
      config_type_enum: 'boolean',
      sort_order: 59,
    },
    batch_no_prefix: {
      category: ts('k_6k0dvs'),
      display_name: ts('k_ul0wdp'),
      description: ts('k_91nefw'),
      config_type_enum: 'string',
      sort_order: 11,
    },
    order_no_prefix: {
      category: ts('k_6k0dvs'),
      display_name: ts('k_fg8ale'),
      description: ts('k_xa1mgc'),
      config_type_enum: 'string',
      sort_order: 12,
    },
    currency: {
      category: ts('k_xj9vm2'),
      display_name: ts('k_uxhvfl'),
      description: ts('k_1mskhhd'),
      config_type_enum: 'string',
      sort_order: 96,
    },
    tax_rate: {
      category: ts('k_xj9vm2'),
      display_name: ts('k_168fx7a'),
      description: ts('k_z0pave'),
      config_type_enum: 'number',
      sort_order: 97,
    },
    print_label_on_inbound: {
      category: ts('k_185glin'),
      display_name: ts('k_y43tbv'),
      description: ts('k_1nuyja4'),
      config_type_enum: 'boolean',
      sort_order: 60,
    },
  };

  for (const [configKey, migration] of Object.entries(migrations)) {
    await execute(
      `UPDATE sys_config SET category = ?, display_name = ?, description = ?, config_type_enum = ?, sort_order = ? WHERE config_key = ? AND (display_name IS NULL OR sort_order = 0)`,
      [
        migration.category,
        migration.display_name,
        migration.description,
        migration.config_type_enum,
        migration.sort_order,
        configKey,
      ]
    );
  }
}

// ⚠️ 原 `ensureConfigTableColumns()` 已删除（BUG-SET-002 / BUG-SET-012）。
//
// 它把 next-intl 的**中文词条**当成 MySQL 列类型拼进 DDL：
//   ALTER TABLE sys_config ADD COLUMN config_type_enum <ts('k_1hoaz9s')>
// 而 `k_1hoaz9s` 的实际取值是「配置类型」—— 不是合法类型，语句必然报错，
// 又被 `catch (_e) {}` 吞掉 ⇒ 这 8 个列的「自动补齐」从未生效过一次。
//
// 补列属于**结构变更**，已回归 `database/migrations/079_settings_config_schema.sql`：
//   config_type_enum / category / display_name / description /
//   sort_order / is_required / approval_required / status
// 以及变更审批用到的 sys_config_change_log / sys_config_change_request 两张表。
// 启动任务与 CLI 只管**数据**，不再持有 DDL 权限。

// ============================================================
// 种子执行入口
// ============================================================

/**
 * 生成一次性强口令（16 位，含大小写字母/数字/符号）。
 *
 * 用途：`sys.default.password` 的**首次**种子值。
 * 依据 BUG-SET-006：默认密码不得是 admin123 这类共享弱口令；
 * 新用户仍由 `system.force_change_password=true` + `sys_user.first_login=1` 强制首登改密。
 */
export function generateStrongPassword(length = 16): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/**
 * 种子值解析。
 *
 * 凭证类键（`sys.default.password` 等）在**每次执行时**现场生成强口令，
 * 避免把固定弱口令（原值 `admin123`）写进库 —— BUG-SET-006 ①。
 * 其余键直接使用声明值。
 */
function resolveSeedValue(config: SystemConfigItem): string {
  if (isSecretConfigKey(config.config_key)) return generateStrongPassword();
  return config.config_value;
}

export interface SeedResult {
  /** sys_config 当前总键数 */
  total: number;
  /** 本次新增的键 */
  inserted: string[];
  /** 本次更新的键 */
  updated: number;
}

/**
 * 幂等执行：确保 sys_config 含全部默认键。
 *
 * ⚠️ 只做**数据**变更，不再执行 ALTER（补列/建表属于迁移迁移 079 的职责）。
 */
export async function initDefaultConfigs(): Promise<SeedResult> {
  await migrateOldConfigs();

  const inserted: string[] = [];
  let updated = 0;

  for (const config of DEFAULT_CONFIGS) {
    const existing = await queryOne(
      `SELECT id FROM sys_config WHERE config_key = ?`,
      [config.config_key]
    );

    if (!existing) {
      await execute(
        `INSERT INTO sys_config (
          config_name, config_key, config_value, config_type_enum, category,
          display_name, description, sort_order,
          is_required, approval_required, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          config.display_name,
          config.config_key,
          resolveSeedValue(config),
          config.config_type_enum,
          config.category,
          config.display_name,
          config.description,
          config.sort_order,
          config.is_required ? 1 : 0,
          config.approval_required ? 1 : 0,
          config.status,
        ]
      );
      inserted.push(config.config_key);
      continue;
    }

    // 已存在：只同步「元数据」，绝不覆盖 config_value（用户改过的值必须保留）
    await execute(
      `UPDATE sys_config SET category = ?, sort_order = ?, display_name = ?, description = ?,
              config_type_enum = ?, is_required = ?, approval_required = ? WHERE config_key = ?`,
      [
        config.category,
        config.sort_order,
        config.display_name,
        config.description,
        config.config_type_enum,
        config.is_required ? 1 : 0,
        config.approval_required ? 1 : 0,
        config.config_key,
      ]
    );
    updated += 1;
  }

  const totalRow = (await queryOne(`SELECT COUNT(*) AS n FROM sys_config`)) as DbRow | null;
  return { total: Number(totalRow?.n ?? 0), inserted, updated };
}

/**
 * 启动期入口：任何失败都**不阻塞服务启动**（DB 未就绪 / 无权限时只告警）。
 */
export async function bootstrapSystemConfig(): Promise<void> {
  try {
    const result = await initDefaultConfigs();
    secureLog('info', '[system-config-seed] 默认配置已就绪', {
      total: result.total,
      inserted: result.inserted.length,
      updated: result.updated,
    });
  } catch (e) {
    secureLog('warn', '[system-config-seed] 默认配置种子失败（不阻塞启动）', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
