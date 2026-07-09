import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
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
  {
    config_key: 'serial_number_length',
    config_value: '4',
    config_type_enum: 'number',
    category: tc('text_6nj4ef'),
    display_name: tc('text_f055jf'),
    description: tc('text_n5ly90'),
    sort_order: 1,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'doc_date_format',
    config_value: 'YYYYMMDD',
    config_type_enum: 'string',
    category: tc('text_6nj4ef'),
    display_name: tc('text_9wjme2'),
    description: tc('text_kv3zjt'),
    sort_order: 2,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'wo_prefix',
    config_value: 'WO',
    config_type_enum: 'string',
    category: tc('text_6nj4ef'),
    display_name: tc('text_pkyvuz'),
    description: tc('text_djpyr0'),
    sort_order: 3,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'sample_prefix',
    config_value: 'SAMPLE',
    config_type_enum: 'string',
    category: tc('text_6nj4ef'),
    display_name: tc('text_lwb789'),
    description: tc('text_cw7a48'),
    sort_order: 4,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'mr_prefix',
    config_value: 'MR',
    config_type_enum: 'string',
    category: tc('text_6nj4ef'),
    display_name: tc('text_tr0bpn'),
    description: tc('text_nvs7iv'),
    sort_order: 5,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'fpr_prefix',
    config_value: 'FPR',
    config_type_enum: 'string',
    category: tc('text_6nj4ef'),
    display_name: tc('text_ath87m'),
    description: tc('text_tj5nbq'),
    sort_order: 6,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'sh_prefix',
    config_value: 'SH',
    config_type_enum: 'string',
    category: tc('text_6nj4ef'),
    display_name: tc('text_9a3nbi'),
    description: tc('text_yau6nh'),
    sort_order: 7,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'po_prefix',
    config_value: 'PO',
    config_type_enum: 'string',
    category: tc('text_6nj4ef'),
    display_name: tc('text_ff15is'),
    description: tc('text_yo7izx'),
    sort_order: 8,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'qc_prefix',
    config_value: 'QC',
    config_type_enum: 'string',
    category: tc('text_6nj4ef'),
    display_name: tc('text_3878kc'),
    description: tc('text_hkrx7'),
    sort_order: 9,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'sc_prefix',
    config_value: 'SC',
    config_type_enum: 'string',
    category: tc('text_6nj4ef'),
    display_name: tc('text_o84lpc'),
    description: tc('text_csl5rs'),
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
    category: tc('text_askxpe'),
    display_name: tc('text_2yv9eh'),
    description: tc('text_tejtd2'),
    sort_order: 20,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'mould_max_times',
    config_value: '5000',
    config_type_enum: 'number',
    category: tc('text_askxpe'),
    display_name: tc('text_6neg1s'),
    description: tc('text_bnjl5j'),
    sort_order: 21,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'mould_warn_days',
    config_value: '15',
    config_type_enum: 'number',
    category: tc('text_askxpe'),
    display_name: tc('text_3fdx4a'),
    description: tc('text_tv4yqm'),
    sort_order: 22,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'mould_scrap_rule',
    config_value: 'both',
    config_type_enum: 'string',
    category: tc('text_askxpe'),
    display_name: tc('text_3jjx4g'),
    description: tc('text_bqddyk'),
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
    category: tc('text_gjjg2g'),
    display_name: tc('text_iqfcyr'),
    description: tc('text_puvxhs'),
    sort_order: 24,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'screen_max_times',
    config_value: '3000',
    config_type_enum: 'number',
    category: tc('text_gjjg2g'),
    display_name: tc('text_ef4zii'),
    description: tc('text_6nwrt9'),
    sort_order: 25,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'screen_warn_days',
    config_value: '10',
    config_type_enum: 'number',
    category: tc('text_gjjg2g'),
    display_name: tc('text_cc66g0'),
    description: tc('text_50hiu0'),
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
    category: tc('text_uuczo4'),
    display_name: tc('text_cmezov'),
    description: tc('text_n1mzp9'),
    sort_order: 30,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'solvent_shelf_life',
    config_value: '180',
    config_type_enum: 'number',
    category: tc('text_uuczo4'),
    display_name: tc('text_hesc08'),
    description: tc('text_6edg39'),
    sort_order: 31,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'ink_unopened_shelf_life',
    config_value: '180',
    config_type_enum: 'number',
    category: tc('text_uuczo4'),
    display_name: tc('text_t40jj7'),
    description: tc('text_4gmgyu'),
    sort_order: 32,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'ink_opened_shelf_life',
    config_value: '30',
    config_type_enum: 'number',
    category: tc('text_uuczo4'),
    display_name: tc('text_j9lrbp'),
    description: tc('text_ijqyo'),
    sort_order: 33,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'mixed_ink_expiry_hours',
    config_value: '24',
    config_type_enum: 'number',
    category: tc('text_uuczo4'),
    display_name: tc('text_24nmtm'),
    description: tc('text_iyvbee'),
    sort_order: 34,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'glue_shelf_life',
    config_value: '90',
    config_type_enum: 'number',
    category: tc('text_uuczo4'),
    display_name: tc('text_dlyn2d'),
    description: tc('text_o62c5j'),
    sort_order: 35,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'material_warn_days',
    config_value: '30',
    config_type_enum: 'number',
    category: tc('text_uuczo4'),
    display_name: tc('text_nl566n'),
    description: tc('text_gqpjwm'),
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
    category: tc('text_9moh6f'),
    display_name: tc('text_bdcvqa'),
    description: tc('text_lca0ld'),
    sort_order: 40,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'pvc_split_length',
    config_value: '10',
    config_type_enum: 'number',
    category: tc('text_9moh6f'),
    display_name: tc('text_g066l8'),
    description: tc('text_mvzhvh'),
    sort_order: 41,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'ink_split_weight',
    config_value: '1',
    config_type_enum: 'number',
    category: tc('text_9moh6f'),
    display_name: tc('text_t917tb'),
    description: tc('text_e9f88q'),
    sort_order: 42,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'solvent_split_volume',
    config_value: '5',
    config_type_enum: 'number',
    category: tc('text_9moh6f'),
    display_name: tc('text_qdc2u6'),
    description: tc('text_pl5fr3'),
    sort_order: 43,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'mesh_split_length',
    config_value: '10',
    config_type_enum: 'number',
    category: tc('text_9moh6f'),
    display_name: tc('text_rkbo6f'),
    description: tc('text_ciy4ow'),
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
    category: tc('text_48cw5i'),
    display_name: tc('text_ch2qpt'),
    description: tc('text_d1axxc'),
    sort_order: 50,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'allow_whole_material_issue',
    config_value: 'false',
    config_type_enum: 'boolean',
    category: tc('text_48cw5i'),
    display_name: tc('text_thrr8r'),
    description: tc('text_4mqud5'),
    sort_order: 51,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'requisition_priority',
    config_value: 'expiry_first',
    config_type_enum: 'string',
    category: tc('text_48cw5i'),
    display_name: tc('text_trmukc'),
    description: tc('text_bptuyh'),
    sort_order: 52,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'allow_no_issue_without_order',
    config_value: 'false',
    config_type_enum: 'boolean',
    category: tc('text_48cw5i'),
    display_name: tc('text_xbfhe4'),
    description: tc('text_p4iuph'),
    sort_order: 53,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'over_requisition_approval',
    config_value: 'true',
    config_type_enum: 'boolean',
    category: tc('text_48cw5i'),
    display_name: tc('text_bqiouy'),
    description: tc('text_tox1k7'),
    sort_order: 54,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'replenish_dual_approval',
    config_value: 'true',
    config_type_enum: 'boolean',
    category: tc('text_48cw5i'),
    display_name: tc('text_7wpftb'),
    description: tc('text_yegpf3'),
    sort_order: 55,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'obsolete_material_days',
    config_value: '90',
    config_type_enum: 'number',
    category: tc('text_48cw5i'),
    display_name: tc('text_48ky1u'),
    description: tc('text_2ucuu3'),
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
    category: tc('text_bbztgd'),
    display_name: tc('text_p4fog2'),
    description: tc('text_wx2ysd'),
    sort_order: 60,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'b_class_cycle',
    config_value: '30',
    config_type_enum: 'string',
    category: tc('text_bbztgd'),
    display_name: tc('text_h31wgv'),
    description: tc('text_x86287'),
    sort_order: 61,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'c_class_cycle',
    config_value: '90',
    config_type_enum: 'string',
    category: tc('text_bbztgd'),
    display_name: tc('text_bqkklc'),
    description: tc('text_2jjag5'),
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
    category: tc('text_l8g7k2'),
    display_name: tc('text_memryy'),
    description: tc('text_43wf9'),
    sort_order: 70,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'allow_duplicate_reporting',
    config_value: 'false',
    config_type_enum: 'boolean',
    category: tc('text_l8g7k2'),
    display_name: tc('text_rr2n1l'),
    description: tc('text_hf97a7'),
    sort_order: 71,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'quality_check_mandatory',
    config_value: 'true',
    config_type_enum: 'boolean',
    category: tc('text_l8g7k2'),
    display_name: tc('text_xsqx74'),
    description: tc('text_r1ik8f'),
    sort_order: 72,
    is_required: true,
    approval_required: true,
    status: 1,
  },
  {
    config_key: 'oqc_before_ship',
    config_value: 'true',
    config_type_enum: 'boolean',
    category: tc('text_l8g7k2'),
    display_name: tc('text_igf3fk'),
    description: tc('text_3eiy82'),
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
    category: tc('text_bz4zwt'),
    display_name: tc('text_p52jfw'),
    description: tc('text_xvxq2f'),
    sort_order: 80,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'config_approver_role',
    config_value: 'system_admin',
    config_type_enum: 'string',
    category: tc('text_bz4zwt'),
    display_name: tc('text_fvdj4y'),
    description: tc('text_589vf'),
    sort_order: 81,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'config_effect_mode',
    config_value: 'immediate',
    config_type_enum: 'string',
    category: tc('text_bz4zwt'),
    display_name: tc('text_f74rb3'),
    description: tc('text_x035e1'),
    sort_order: 82,
    is_required: true,
    approval_required: false,
    status: 1,
  },

  // 九、系统基础配置
  {
    config_key: 'company_name',
    config_value: tc('text_k8ia1j'),
    config_type_enum: 'string',
    category: tc('text_tnvytn'),
    display_name: tc('text_amf4wf'),
    description: tc('text_w1483y'),
    sort_order: 89,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'company_short_name',
    config_value: tc('text_ik15qt'),
    config_type_enum: 'string',
    category: tc('text_tnvytn'),
    display_name: tc('text_amlugs'),
    description: tc('text_amlugs'),
    sort_order: 89,
    is_required: false,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'sys.name',
    config_value: tc('text_p944b5'),
    config_type_enum: 'string',
    category: tc('text_tnvytn'),
    display_name: tc('text_gahjnr'),
    description: tc('text_vgik5f'),
    sort_order: 90,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'sys.version',
    config_value: 'v2.0.0',
    config_type_enum: 'string',
    category: tc('text_tnvytn'),
    display_name: tc('text_7xo7v3'),
    description: tc('text_7xo7v3'),
    sort_order: 91,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'sys.copyright',
    config_value: '© 2024 VNERP. All Rights Reserved.',
    config_type_enum: 'string',
    category: tc('text_tnvytn'),
    display_name: tc('text_eufaax'),
    description: tc('text_9v8htl'),
    sort_order: 92,
    is_required: true,
    approval_required: false,
    status: 1,
  },
  {
    config_key: 'sys.default.password',
    config_value: 'admin123',
    config_type_enum: 'string',
    category: tc('text_tnvytn'),
    display_name: tc('text_rb1qju'),
    description: tc('text_cz0ire'),
    sort_order: 93,
    is_required: true,
    approval_required: false,
    status: 1,
  },
];

// 迁移旧配置项到正确的分类
async function migrateOldConfigs(): Promise<void> {
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
      category: tc('text_tnvytn'),
      display_name: tc('text_amf4wf'),
      description: tc('text_ameopg'),
      config_type_enum: 'string',
      sort_order: 94,
    },
    company_code: {
      category: tc('text_tnvytn'),
      display_name: tc('text_ammg1j'),
      description: tc('text_eyfcnt'),
      config_type_enum: 'string',
      sort_order: 95,
    },
    default_warehouse: {
      category: tc('text_48cw5i'),
      display_name: tc('text_km37jg'),
      description: tc('text_wcx7tc'),
      config_type_enum: 'string',
      sort_order: 57,
    },
    fifo_mode: {
      category: tc('text_48cw5i'),
      display_name: tc('text_yb3f8a'),
      description: tc('text_gffp2l'),
      config_type_enum: 'string',
      sort_order: 58,
    },
    auto_inbound_approve: {
      category: tc('text_48cw5i'),
      display_name: tc('text_nu9w04'),
      description: tc('text_57z19o'),
      config_type_enum: 'boolean',
      sort_order: 59,
    },
    batch_no_prefix: {
      category: tc('text_6nj4ef'),
      display_name: tc('text_ralum6'),
      description: tc('text_siepq5'),
      config_type_enum: 'string',
      sort_order: 11,
    },
    order_no_prefix: {
      category: tc('text_6nj4ef'),
      display_name: tc('text_6hr3mv'),
      description: tc('text_73bwt1'),
      config_type_enum: 'string',
      sort_order: 12,
    },
    currency: {
      category: tc('text_tnvytn'),
      display_name: tc('text_kmdt3a'),
      description: tc('text_mfybj6'),
      config_type_enum: 'string',
      sort_order: 96,
    },
    tax_rate: {
      category: tc('text_tnvytn'),
      display_name: tc('text_kmaoed'),
      description: tc('text_fugh7h'),
      config_type_enum: 'number',
      sort_order: 97,
    },
    print_label_on_inbound: {
      category: tc('text_48cw5i'),
      display_name: tc('text_jv0i8y'),
      description: tc('text_u9q429'),
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

// 确保sys_config表有所需的列
async function ensureConfigTableColumns(): Promise<void> {
  // 先检查现有列
  const columns: any[] = await query(`SHOW COLUMNS FROM sys_config`);
  const existingColumns = new Set(columns.map((c: any) => c.Field));

  const newColumns: [string, string][] = [
    ['config_type_enum', tc('text_pzjn5e')],
    ['category', tc('text_1hn796')],
    ['display_name', tc('text_r8prlt')],
    ['description', tc('text_f87tlz')],
    ['sort_order', tc('text_c4y2el')],
    ['is_required', tc('text_shjucc')],
    ['approval_required', tc('text_93vfex')],
    ['status', tc('text_m4e84i')],
  ];

  for (const [colName, colDef] of newColumns) {
    if (!existingColumns.has(colName)) {
      try {
        await execute(`ALTER TABLE sys_config ADD COLUMN ${colName} ${colDef}`);
      } catch (e: any) {}
    }
  }
}

// 初始化默认配置项（插入缺失的，更新已存在但分类改变的）
async function initDefaultConfigs(): Promise<void> {
  await ensureConfigTableColumns();
  await migrateOldConfigs();

  for (const config of DEFAULT_CONFIGS) {
    const existing: any = await queryOne(
      `SELECT id, config_value FROM sys_config WHERE config_key = ?`,
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
          config.config_value,
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
    } else {
      await execute(
        `UPDATE sys_config SET category = ?, sort_order = ?, display_name = ?, description = ?, config_type_enum = ?, is_required = ?, approval_required = ? WHERE config_key = ?`,
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
    }
  }
}

export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
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
     FROM sys_config ${where} ORDER BY sort_order`,
    params
  );

  // 提取唯一的分类，并按最小sort_order排序
  const categoryOrder = new Map<string, number>();
  rows.forEach((row: any) => {
    if (!categoryOrder.has(row.category)) {
      categoryOrder.set(row.category, row.sort_order);
    }
  });

  const categories: string[] = [];
  const grouped: Record<string, any[]> = {};

  // 按分类的最小sort_order排序
  const sortedCategories = Array.from(categoryOrder.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([cat]) => cat);

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
      approval_required: Boolean(row.approval_required),
    });
  });

  return successResponse({
    list: rows,
    categories: sortedCategories,
    grouped,
  });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    await initDefaultConfigs();

    const body = await request.json();
    const { configs, updates, operator_id, remark } = body;

    const configData = configs || updates;

    if (!configData || !Array.isArray(configData) || configData.length === 0) {
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

      for (const config of configData) {
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
            remark || null,
          ]
        );
      }

      return successResponse(null, '配置修改申请已提交，等待审批');
    } else {
      for (const config of configData) {
        await execute(
          `UPDATE sys_config SET config_value = ?, update_time = NOW() WHERE config_key = ?`,
          [String(config.config_value), config.config_key]
        );
      }

      clearConfigCache();

      return successResponse(null, '配置更新成功');
    }
  },
  { logTitle: '保存系统配置' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const body = await request.json();
    const { log_id, action, approver_id } = body;

    if (!log_id) {
      return errorResponse('缺少变更记录ID', 400, 400);
    }

    const log: any = await queryOne(`SELECT * FROM sys_config_change_log WHERE id = ?`, [log_id]);

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
  },
  { logTitle: '审批配置变更' }
);
