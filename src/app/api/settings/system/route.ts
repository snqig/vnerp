import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { clearConfigCache } from '@/lib/global-config';

interface SystemConfigItem {
  id?: number;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_required: boolean;
  approval_required: boolean;
  status: number;
}

const DEFAULT_CONFIGS: SystemConfigItem[] = [
  {
    config_key: 'wo_prefix',
    config_value: 'WO',
    config_type: 'string',
    category: '单据编码规则',
    display_name: '生产工单前缀',
    description: '生产工单编号前缀',
    sort_order: 1,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'sample_prefix',
    config_value: 'SAMPLE',
    config_type: 'string',
    category: '单据编码规则',
    display_name: '打样工单前缀',
    description: '打样工单编号前缀',
    sort_order: 2,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'mr_prefix',
    config_value: 'MR',
    config_type: 'string',
    category: '单据编码规则',
    display_name: '领料单前缀',
    description: '物料领用单编号前缀',
    sort_order: 3,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'fpr_prefix',
    config_value: 'FPR',
    config_type: 'string',
    category: '单据编码规则',
    display_name: '成品入库前缀',
    description: '成品入库单编号前缀',
    sort_order: 4,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'sh_prefix',
    config_value: 'SH',
    config_type: 'string',
    category: '单据编码规则',
    display_name: '发货单前缀',
    description: '发货单编号前缀',
    sort_order: 5,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'po_prefix',
    config_value: 'PO',
    config_type: 'string',
    category: '单据编码规则',
    display_name: '采购订单前缀',
    description: '采购订单编号前缀',
    sort_order: 6,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'ir_prefix',
    config_value: 'IC',
    config_type: 'string',
    category: '单据编码规则',
    display_name: '盘点单前缀',
    description: '库存盘点单编号前缀',
    sort_order: 7,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'tr_prefix',
    config_value: 'TR',
    config_type: 'string',
    category: '单据编码规则',
    display_name: '调拨单前缀',
    description: '库存调拨单编号前缀',
    sort_order: 8,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'mould_life_days',
    config_value: '90',
    config_type: 'number',
    category: '刀模/网版寿命管理',
    display_name: '刀模有效天数',
    description: '刀模从启用到报废的有效天数',
    sort_order: 10,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'mould_max_times',
    config_value: '5000',
    config_type: 'number',
    category: '刀模/网版寿命管理',
    display_name: '刀模最大使用次数',
    description: '刀模最大允许使用次数',
    sort_order: 11,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'mould_warn_days',
    config_value: '15',
    config_type: 'number',
    category: '刀模/网版寿命管理',
    display_name: '刀模预警天数',
    description: '刀模到期前多少天开始预警',
    sort_order: 12,
    is_required: true,
    approval_required: false,
    status: 1
  },
  {
    config_key: 'screen_life_days',
    config_value: '60',
    config_type: 'number',
    category: '刀模/网版寿命管理',
    display_name: '网版有效天数',
    description: '网版从启用到报废的有效天数',
    sort_order: 13,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'screen_max_times',
    config_value: '3000',
    config_type: 'number',
    category: '刀模/网版寿命管理',
    display_name: '网版最大使用次数',
    description: '网版最大允许使用次数',
    sort_order: 14,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'screen_warn_days',
    config_value: '10',
    config_type: 'number',
    category: '刀模/网版寿命管理',
    display_name: '网版预警天数',
    description: '网版到期前多少天开始预警',
    sort_order: 15,
    is_required: true,
    approval_required: false,
    status: 1
  },
  {
    config_key: 'ink_unopened_shelf_life',
    config_value: '180',
    config_type: 'number',
    category: '油墨保质期管理',
    display_name: '油墨未开盖保质期(天)',
    description: '油墨未开盖状态下的保质期天数',
    sort_order: 20,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'ink_opened_shelf_life',
    config_value: '30',
    config_type: 'number',
    category: '油墨保质期管理',
    display_name: '油墨开盖后保质期(天)',
    description: '油墨开盖后的保质期天数',
    sort_order: 21,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'mixed_ink_expiry_hours',
    config_value: '24',
    config_type: 'number',
    category: '油墨保质期管理',
    display_name: '混合油墨过期时间(小时)',
    description: '混合油墨配制后的有效使用时长',
    sort_order: 22,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'film_split_length',
    config_value: '10',
    config_type: 'number',
    category: '小料拆分标准',
    display_name: '薄膜拆分长度(米)',
    description: '整卷薄膜拆分成小料的长度单位',
    sort_order: 30,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'ink_split_weight',
    config_value: '1',
    config_type: 'number',
    category: '小料拆分标准',
    display_name: '油墨拆分重量(kg)',
    description: '整桶油墨拆分成小料的重量单位',
    sort_order: 31,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'solvent_split_volume',
    config_value: '5',
    config_type: 'number',
    category: '小料拆分标准',
    display_name: '溶剂拆分容积(L)',
    description: '整桶溶剂拆分成小料的容积单位',
    sort_order: 32,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'fifo_enabled',
    config_value: 'true',
    config_type: 'boolean',
    category: '仓库7步闭环规则',
    display_name: '强制先进先出(FIFO)',
    description: '是否强制按入库时间先进先出出库',
    sort_order: 40,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'allow_whole_material_issue',
    config_value: 'false',
    config_type: 'boolean',
    category: '仓库7步闭环规则',
    display_name: '允许整料直接发料',
    description: '是否允许未拆分的整料直接发料（建议关闭）',
    sort_order: 41,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'allow_skip_process',
    config_value: 'false',
    config_type: 'boolean',
    category: '仓库7步闭环规则',
    display_name: '允许跳工序报工',
    description: '是否允许跳过工序顺序进行报工（建议关闭）',
    sort_order: 42,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'allow_over_requisition',
    config_value: 'false',
    config_type: 'boolean',
    category: '仓库7步闭环规则',
    display_name: '允许超领料',
    description: '是否允许超过BOM定额领料（建议关闭）',
    sort_order: 43,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'stocktaking_cycle_days',
    config_value: '30',
    config_type: 'number',
    category: '仓库7步闭环规则',
    display_name: '盘点周期(天)',
    description: '定期盘点的周期天数',
    sort_order: 44,
    is_required: true,
    approval_required: false,
    status: 1
  },
  {
    config_key: 'obsolete_material_days',
    config_value: '90',
    config_type: 'number',
    category: '仓库7步闭环规则',
    display_name: '呆滞料判定天数',
    description: '库存超过此天数未动销判定为呆滞料',
    sort_order: 45,
    is_required: true,
    approval_required: false,
    status: 1
  },
  {
    config_key: 'quality_check_mandatory',
    config_value: 'true',
    config_type: 'boolean',
    category: '生产报工规则',
    display_name: '检验强制执行',
    description: '是否强制执行IPQC/FQC检验',
    sort_order: 50,
    is_required: true,
    approval_required: true,
    status: 1
  },
  {
    config_key: 'require_approval_for_config_change',
    config_value: 'true',
    config_type: 'boolean',
    category: '参数修改审批规则',
    display_name: '配置修改需审批',
    description: '修改系统参数是否需要审批流程',
    sort_order: 60,
    is_required: true,
    approval_required: false,
    status: 1
  }
];

async function ensureTableExists(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS sys_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
      config_value TEXT NOT NULL COMMENT '配置值',
      config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '值类型',
      category VARCHAR(50) NOT NULL DEFAULT '其他' COMMENT '配置分类',
      display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
      description VARCHAR(500) NULL COMMENT '配置说明',
      sort_order INT DEFAULT 0 COMMENT '排序序号',
      is_required TINYINT(1) DEFAULT 0 COMMENT '是否必填',
      approval_required TINYINT(1) DEFAULT 0 COMMENT '修改需审批',
      status TINYINT DEFAULT 1 COMMENT '状态：1=启用，0=禁用',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category (category),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统全局配置表'
  `);
}

async function initDefaultConfigs(): Promise<void> {
  for (const config of DEFAULT_CONFIGS) {
    const existing: any = await queryOne(
      `SELECT id FROM sys_config WHERE config_key = ?`,
      [config.config_key]
    );

    if (!existing) {
      await execute(
        `INSERT INTO sys_config (
          config_key, config_value, config_type, category,
          display_name, description, sort_order,
          is_required, approval_required, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          config.config_key,
          config.config_value,
          config.config_type,
          config.category,
          config.display_name,
          config.description,
          config.sort_order,
          config.is_required ? 1 : 0,
          config.approval_required ? 1 : 0
        ]
      );
    }
  }
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  await ensureTableExists();
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
    `SELECT * FROM sys_config ${where} ORDER BY category, sort_order`,
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
  await ensureTableExists();

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
    await execute(`
      CREATE TABLE IF NOT EXISTS sys_config_change_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL,
        old_value TEXT NOT NULL,
        new_value TEXT NOT NULL,
        operator_id INT NOT NULL,
        remark VARCHAR(500),
        status TINYINT DEFAULT 0 COMMENT '0=待审批，1=已通过，2=已驳回',
        approver_id INT NULL,
        approve_time DATETIME NULL,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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