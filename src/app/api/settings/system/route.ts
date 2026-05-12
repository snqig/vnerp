import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { clearConfigCache } from '@/lib/global-config';

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
  { config_key: 'serial_number_length', config_value: '4', config_type_enum: 'number', category: '单据编码规则', display_name: '流水号长度', description: '所有单据末尾流水号位数(2-6)', sort_order: 1, is_required: true, approval_required: false, status: 1 },
  { config_key: 'doc_date_format', config_value: 'YYYYMMDD', config_type_enum: 'string', category: '单据编码规则', display_name: '单据日期格式', description: '所有单据编号中的日期格式', sort_order: 2, is_required: true, approval_required: false, status: 1 },
  { config_key: 'wo_prefix', config_value: 'WO', config_type_enum: 'string', category: '单据编码规则', display_name: '生产工单前缀', description: '生产工单编号前缀', sort_order: 3, is_required: true, approval_required: true, status: 1 },
  { config_key: 'sample_prefix', config_value: 'SAMPLE', config_type_enum: 'string', category: '单据编码规则', display_name: '打样工单前缀', description: '打样工单编号前缀', sort_order: 4, is_required: true, approval_required: true, status: 1 },
  { config_key: 'mr_prefix', config_value: 'MR', config_type_enum: 'string', category: '单据编码规则', display_name: '领料单前缀', description: '物料领用单编号前缀', sort_order: 5, is_required: true, approval_required: true, status: 1 },
  { config_key: 'fpr_prefix', config_value: 'FPR', config_type_enum: 'string', category: '单据编码规则', display_name: '成品入库前缀', description: '成品入库单编号前缀', sort_order: 6, is_required: true, approval_required: true, status: 1 },
  { config_key: 'sh_prefix', config_value: 'SH', config_type_enum: 'string', category: '单据编码规则', display_name: '发货单前缀', description: '发货单编号前缀', sort_order: 7, is_required: true, approval_required: true, status: 1 },
  { config_key: 'po_prefix', config_value: 'PO', config_type_enum: 'string', category: '单据编码规则', display_name: '采购订单前缀', description: '采购订单编号前缀', sort_order: 8, is_required: true, approval_required: true, status: 1 },
  { config_key: 'qc_prefix', config_value: 'QC', config_type_enum: 'string', category: '单据编码规则', display_name: '检验单前缀', description: '质检检验单编号前缀', sort_order: 9, is_required: true, approval_required: true, status: 1 },
  { config_key: 'sc_prefix', config_value: 'SC', config_type_enum: 'string', category: '单据编码规则', display_name: '标准卡编码前缀', description: '标准卡编号前缀(颜色SCC/工艺SCP/质量SCQ/综合SCZ)', sort_order: 10, is_required: true, approval_required: true, status: 1 },
  
  // 二、刀模寿命配置
  { config_key: 'mould_life_days', config_value: '90', config_type_enum: 'number', category: '刀模/网版寿命', display_name: '刀模有效天数', description: '刀模从启用到报废的有效天数', sort_order: 20, is_required: true, approval_required: true, status: 1 },
  { config_key: 'mould_max_times', config_value: '5000', config_type_enum: 'number', category: '刀模/网版寿命', display_name: '刀模最大使用次数', description: '刀模最大允许使用次数', sort_order: 21, is_required: true, approval_required: true, status: 1 },
  { config_key: 'mould_warn_days', config_value: '15', config_type_enum: 'number', category: '刀模/网版寿命', display_name: '刀模预警天数', description: '刀模到期前多少天开始预警', sort_order: 22, is_required: true, approval_required: false, status: 1 },
  { config_key: 'mould_scrap_rule', config_value: 'both', config_type_enum: 'string', category: '刀模/网版寿命', display_name: '刀模报废规则', description: '报废规则：both=到期+超次数自动报废, date_only=仅到期, times_only=仅超次数', sort_order: 23, is_required: true, approval_required: true, status: 1 },
  
  // 三、网版寿命配置
  { config_key: 'screen_life_days', config_value: '60', config_type_enum: 'number', category: '刀模/网版寿命', display_name: '网版有效天数', description: '网版从启用到报废的有效天数', sort_order: 24, is_required: true, approval_required: true, status: 1 },
  { config_key: 'screen_max_times', config_value: '3000', config_type_enum: 'number', category: '刀模/网版寿命', display_name: '网版最大使用次数', description: '网版最大允许使用次数', sort_order: 25, is_required: true, approval_required: true, status: 1 },
  { config_key: 'screen_warn_days', config_value: '10', config_type_enum: 'number', category: '刀模/网版寿命', display_name: '网版预警天数', description: '网版到期前多少天开始预警', sort_order: 26, is_required: true, approval_required: false, status: 1 },
  
  // 四、原材料/油墨保质期
  { config_key: 'pet_film_shelf_life', config_value: '360', config_type_enum: 'number', category: '原材料保质期', display_name: 'PET/PVC薄膜保质期', description: 'PET/PVC薄膜的有效保质期天数', sort_order: 30, is_required: true, approval_required: true, status: 1 },
  { config_key: 'solvent_shelf_life', config_value: '180', config_type_enum: 'number', category: '原材料保质期', display_name: '溶剂保质期', description: '印刷溶剂的有效保质期天数', sort_order: 31, is_required: true, approval_required: true, status: 1 },
  { config_key: 'ink_unopened_shelf_life', config_value: '180', config_type_enum: 'number', category: '原材料保质期', display_name: '油墨未开盖保质期', description: '油墨未开盖状态下的保质期天数', sort_order: 32, is_required: true, approval_required: true, status: 1 },
  { config_key: 'ink_opened_shelf_life', config_value: '30', config_type_enum: 'number', category: '原材料保质期', display_name: '油墨开盖后保质期', description: '油墨开盖后的保质期天数', sort_order: 33, is_required: true, approval_required: true, status: 1 },
  { config_key: 'mixed_ink_expiry_hours', config_value: '24', config_type_enum: 'number', category: '原材料保质期', display_name: '混合油墨过期时间', description: '混合油墨配制后的有效使用时长（小时）', sort_order: 34, is_required: true, approval_required: true, status: 1 },
  { config_key: 'glue_shelf_life', config_value: '90', config_type_enum: 'number', category: '原材料保质期', display_name: '辅料/胶水保质期', description: '胶水和辅料的保质期天数', sort_order: 35, is_required: true, approval_required: true, status: 1 },
  { config_key: 'material_warn_days', config_value: '30', config_type_enum: 'number', category: '原材料保质期', display_name: '原材料预警天数', description: '所有原材料统一预警提前天数', sort_order: 36, is_required: true, approval_required: false, status: 1 },
  
  // 五、小料拆分标准
  { config_key: 'film_split_length', config_value: '10', config_type_enum: 'number', category: '小料拆分标准', display_name: 'PET薄膜拆分长度', description: '整卷PET薄膜拆分成小料的长度单位（米）', sort_order: 40, is_required: true, approval_required: true, status: 1 },
  { config_key: 'pvc_split_length', config_value: '10', config_type_enum: 'number', category: '小料拆分标准', display_name: 'PVC薄膜拆分长度', description: '整卷PVC薄膜拆分成小料的长度单位（米）', sort_order: 41, is_required: true, approval_required: true, status: 1 },
  { config_key: 'ink_split_weight', config_value: '1', config_type_enum: 'number', category: '小料拆分标准', display_name: '油墨拆分重量', description: '整桶油墨拆分成小料的重量单位（kg）', sort_order: 42, is_required: true, approval_required: true, status: 1 },
  { config_key: 'solvent_split_volume', config_value: '5', config_type_enum: 'number', category: '小料拆分标准', display_name: '溶剂拆分容积', description: '整桶溶剂拆分成小料的容积单位（L）', sort_order: 43, is_required: true, approval_required: true, status: 1 },
  { config_key: 'mesh_split_length', config_value: '10', config_type_enum: 'number', category: '小料拆分标准', display_name: '网布拆分长度', description: '整卷网布拆分成小料的长度单位（米）', sort_order: 44, is_required: true, approval_required: true, status: 1 },
  
  // 六、仓库管理规则
  { config_key: 'fifo_enabled', config_value: 'true', config_type_enum: 'boolean', category: '仓库管理规则', display_name: '强制先进先出', description: '是否强制按入库时间先进先出出库', sort_order: 50, is_required: true, approval_required: true, status: 1 },
  { config_key: 'allow_whole_material_issue', config_value: 'false', config_type_enum: 'boolean', category: '仓库管理规则', display_name: '允许整料直接发料', description: '是否允许未拆分的整料直接发料（建议关闭）', sort_order: 51, is_required: true, approval_required: true, status: 1 },
  { config_key: 'requisition_priority', config_value: 'expiry_first', config_type_enum: 'string', category: '仓库管理规则', display_name: '领料优先级', description: 'expiry_first=先到期先出，fifo=标准先进先出', sort_order: 52, is_required: true, approval_required: true, status: 1 },
  { config_key: 'allow_no_issue_without_order', config_value: 'false', config_type_enum: 'boolean', category: '仓库管理规则', display_name: '允许无单发料', description: '是否允许没有订单直接发料（建议关闭）', sort_order: 53, is_required: true, approval_required: true, status: 1 },
  { config_key: 'over_requisition_approval', config_value: 'true', config_type_enum: 'boolean', category: '仓库管理规则', display_name: '超领需要审批', description: '超过标准定额领料是否需要审批', sort_order: 54, is_required: true, approval_required: true, status: 1 },
  { config_key: 'replenish_dual_approval', config_value: 'true', config_type_enum: 'boolean', category: '仓库管理规则', display_name: '补料需要双审批', description: '补料是否需要仓库主管+生产经理双重审批', sort_order: 55, is_required: true, approval_required: true, status: 1 },
  { config_key: 'obsolete_material_days', config_value: '90', config_type_enum: 'number', category: '仓库管理规则', display_name: '呆滞料判定天数', description: '库存超过此天数未动销判定为呆滞料', sort_order: 56, is_required: true, approval_required: false, status: 1 },
  
  // 七、循环盘点周期
  { config_key: 'a_class_cycle', config_value: '7', config_type_enum: 'string', category: '盘点周期管理', display_name: 'A类物料盘点周期', description: 'A类高价值物料盘点周期(天)', sort_order: 60, is_required: true, approval_required: true, status: 1 },
  { config_key: 'b_class_cycle', config_value: '30', config_type_enum: 'string', category: '盘点周期管理', display_name: 'B类物料盘点周期', description: 'B类中价值物料盘点周期(天)', sort_order: 61, is_required: true, approval_required: true, status: 1 },
  { config_key: 'c_class_cycle', config_value: '90', config_type_enum: 'string', category: '盘点周期管理', display_name: 'C类物料盘点周期', description: 'C类低价值物料盘点周期(天)', sort_order: 62, is_required: true, approval_required: true, status: 1 },
  
  // 八、生产与品质规则
  { config_key: 'allow_skip_process', config_value: 'false', config_type_enum: 'boolean', category: '生产与品质规则', display_name: '允许跳工序报工', description: '是否允许跳过工序顺序进行报工（建议关闭）', sort_order: 70, is_required: true, approval_required: true, status: 1 },
  { config_key: 'allow_duplicate_reporting', config_value: 'false', config_type_enum: 'boolean', category: '生产与品质规则', display_name: '允许重复报工', description: '是否允许同一工序重复报工（建议关闭）', sort_order: 71, is_required: true, approval_required: true, status: 1 },
  { config_key: 'quality_check_mandatory', config_value: 'true', config_type_enum: 'boolean', category: '生产与品质规则', display_name: '成品入库前必须检验', description: '成品入库前是否必须经过FQC检验', sort_order: 72, is_required: true, approval_required: true, status: 1 },
  { config_key: 'oqc_before_ship', config_value: 'true', config_type_enum: 'boolean', category: '生产与品质规则', display_name: '发货前必须OQC检验', description: '发货前是否必须经过OQC出货检验', sort_order: 73, is_required: true, approval_required: true, status: 1 },
  
  // 九、审批规则
  { config_key: 'require_approval_for_config_change', config_value: 'true', config_type_enum: 'boolean', category: '审批规则', display_name: '配置修改需审批', description: '修改系统参数是否需要审批流程', sort_order: 80, is_required: true, approval_required: false, status: 1 },
  { config_key: 'config_approver_role', config_value: 'system_admin', config_type_enum: 'string', category: '审批规则', display_name: '审批人角色', description: '配置变更的审批人角色', sort_order: 81, is_required: true, approval_required: false, status: 1 },
  { config_key: 'config_effect_mode', config_value: 'immediate', config_type_enum: 'string', category: '审批规则', display_name: '生效方式', description: 'immediate=立即生效, next_day=次日生效', sort_order: 82, is_required: true, approval_required: false, status: 1 },
  
  // 十、系统基础配置
  { config_key: 'sys.name', config_value: 'VNERP丝网印刷管理系统', config_type_enum: 'string', category: '系统基础配置', display_name: '系统名称', description: '系统显示名称', sort_order: 90, is_required: true, approval_required: false, status: 1 },
  { config_key: 'sys.version', config_value: 'v2.0.0', config_type_enum: 'string', category: '系统基础配置', display_name: '系统版本号', description: '系统版本号', sort_order: 91, is_required: true, approval_required: false, status: 1 },
  { config_key: 'sys.copyright', config_value: '© 2024 VNERP. All Rights Reserved.', config_type_enum: 'string', category: '系统基础配置', display_name: '版权信息', description: '版权声明信息', sort_order: 92, is_required: true, approval_required: false, status: 1 },
  { config_key: 'sys.default.password', config_value: 'admin123', config_type_enum: 'string', category: '系统基础配置', display_name: '用户默认密码', description: '新用户默认密码', sort_order: 93, is_required: true, approval_required: false, status: 1 }
];

// 初始化默认配置项（只插入缺失的）
async function initDefaultConfigs(): Promise<void> {
  for (const config of DEFAULT_CONFIGS) {
    const existing: any = await queryOne(
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
          config.display_name, // 填充 config_name
          config.config_key,
          config.config_value,
          config.config_type_enum,
          config.category,
          config.display_name,
          config.description,
          config.sort_order,
          config.is_required ? 1 : 0,
          config.approval_required ? 1 : 0,
          config.status
        ]
      );
    }
  }
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  await initDefaultConfigs();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  let where = 'WHERE status = 1';
  const params: any[] = [];

  if (category && category !== 'all') {
    where += ' AND category = ?';
    params.push(category);
  }

  const rows: any[] = await query(
    `SELECT id, config_name, config_key, config_value, config_type_enum as config_type, 
            category, display_name, description, sort_order, 
            is_required, approval_required, status 
     FROM sys_config ${where} ORDER BY category, sort_order`,
    params
  );

  const categories: string[] = [];
  const grouped: Record<string, any[]> = {};

  rows.forEach((row: any) => {
    if (!categories.includes(row.category)) {
      categories.push(row.category);
    }
    if (!grouped[row.category]) {
      grouped[row.category] = [];
    }
    grouped[row.category].push({
      ...row,
      is_required: Boolean(row.is_required),
      approval_required: Boolean(row.approval_required)
    });
  });

  return successResponse({
    list: rows,
    categories,
    grouped
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  await initDefaultConfigs();

  const body = await request.json();
  const { configs, operator_id, remark } = body;

  if (!configs || !Array.isArray(configs) || configs.length === 0) {
    return errorResponse('缺少配置数据', 400, 400);
  }

  const requireApproval: any = await queryOne(
    `SELECT config_value FROM sys_config WHERE config_key = 'require_approval_for_config_change'`
  );

  const needApproval = requireApproval?.config_value === 'true';

  if (needApproval) {
    // 确保变更记录表存在
    try {
      await execute(`SELECT 1 FROM sys_config_change_log LIMIT 1`);
    } catch {
      await execute(`
        CREATE TABLE IF NOT EXISTS sys_config_change_log (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          config_key VARCHAR(100) NOT NULL COMMENT '配置键',
          old_value TEXT NOT NULL COMMENT '旧值',
          new_value TEXT NOT NULL COMMENT '新值',
          operator_id INT NOT NULL COMMENT '操作人ID',
          operator_name VARCHAR(50) COMMENT '操作人姓名',
          remark VARCHAR(500) COMMENT '变更说明',
          status TINYINT DEFAULT 0 COMMENT '0=待审批，1=已通过，2=已驳回',
          approver_id INT NULL COMMENT '审批人ID',
          approver_name VARCHAR(50) COMMENT '审批人姓名',
          approve_time DATETIME NULL COMMENT '审批时间',
          approve_remark VARCHAR(500) COMMENT '审批意见',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          INDEX idx_config_key (config_key),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='配置变更审批记录表'
      `);
    }
    
    for (const config of configs) {
      const current: any = await queryOne(
        `SELECT config_value FROM sys_config WHERE config_key = ?`,
        [config.config_key]
      );

      if (!current) continue;

      await execute(
        `INSERT INTO sys_config_change_log (
          config_key, old_value, new_value, operator_id, remark, status
        ) VALUES (?, ?, ?, ?, ?, 0)`,
        [
          config.config_key,
          current.config_value,
          String(config.config_value),
          operator_id || 1,
          remark || null
        ]
      );
    }

    return successResponse(null, '配置修改申请已提交，等待审批');
  } else {
    for (const config of configs) {
      await execute(
        `UPDATE sys_config SET config_value = ?, update_time = NOW() WHERE config_key = ?`,
        [String(config.config_value), config.config_key]
      );
    }

    clearConfigCache();

    return successResponse(null, '配置更新成功');
  }
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { log_id, action, approver_id } = body;

  if (!log_id) {
    return errorResponse('缺少变更记录ID', 400, 400);
  }

  const log: any = await queryOne(
    `SELECT * FROM sys_config_change_log WHERE id = ?`,
    [log_id]
  );

  if (!log) {
    return commonErrors.notFound('变更记录不存在');
  }

  if (log.status !== 0) {
    return errorResponse('该记录已处理', 400, 400);
  }

  switch (action) {
    case 'approve':
      await execute(
        `UPDATE sys_config SET config_value = ?, update_time = NOW() WHERE config_key = ?`,
        [log.new_value, log.config_key]
      );

      await execute(
        `UPDATE sys_config_change_log SET status = 1, approver_id = ?, approve_time = NOW() WHERE id = ?`,
        [approver_id || 1, log_id]
      );

      clearConfigCache();

      return successResponse(null, '配置变更已审批通过并生效');

    case 'reject':
      await execute(
        `UPDATE sys_config_change_log SET status = 2, approver_id = ?, approve_time = NOW() WHERE id = ?`,
        [approver_id || 1, log_id]
      );

      return successResponse(null, '配置变更已驳回');

    default:
      return errorResponse('无效的操作类型', 400, 400);
  }
});
