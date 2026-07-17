import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { clearSystemConfigCache } from '@/lib/system-config';
import { withPermission } from '@/lib/api-permissions';

const DEFAULT_CONFIGS: {
  config_name: string;
  config_key: string;
  config_value: string;
  config_type: number;
  description: string;
}[] = [
  {
    config_name: '库存允许负数',
    config_key: 'inventory.allow_negative',
    config_value: 'false',
    config_type: 2,
    description: '是否允许库存数量为负数',
  },
  {
    config_name: '库存预警阈值',
    config_key: 'inventory.alert_threshold',
    config_value: '10',
    config_type: 1,
    description: '低于此数量触发库存预警',
  },
  {
    config_name: '库存盘点差异审批',
    config_key: 'inventory.stocktake_approval',
    config_value: 'true',
    config_type: 2,
    description: '盘点差异是否需要审批',
  },
  {
    config_name: '默认仓库编码',
    config_key: 'inventory.default_warehouse',
    config_value: 'WH001',
    config_type: 1,
    description: '新建单据默认带出的仓库编码',
  },
  {
    config_name: '库存数量精度',
    config_key: 'inventory.decimal_precision',
    config_value: '2',
    config_type: 1,
    description: '库存数量保留的小数位数',
  },
  {
    config_name: '安全库存比例',
    config_key: 'inventory.safety_stock_ratio',
    config_value: '20',
    config_type: 1,
    description: '安全库存占日均销量的百分比',
  },
  {
    config_name: '自动生成批次号',
    config_key: 'inventory.auto_batch',
    config_value: 'true',
    config_type: 2,
    description: '入库时是否自动生成批次号',
  },
  {
    config_name: '批次过期预警天数',
    config_key: 'inventory.batch_expire_warn_days',
    config_value: '30',
    config_type: 1,
    description: '距批次失效还有多少天时进行预警',
  },
  {
    config_name: '库存盘点周期',
    config_key: 'inventory.stocktake_cycle_days',
    config_value: '90',
    config_type: 1,
    description: '默认库存盘点周期（天）',
  },
  {
    config_name: '入库单号前缀',
    config_key: 'inbound.prefix',
    config_value: 'INB',
    config_type: 1,
    description: '入库单号前缀',
  },
  {
    config_name: '出库单号前缀',
    config_key: 'outbound.prefix',
    config_value: 'OTB',
    config_type: 1,
    description: '出库单号前缀',
  },
  {
    config_name: '订单号前缀',
    config_key: 'order.prefix',
    config_value: 'ORD',
    config_type: 1,
    description: '销售订单号前缀',
  },
  {
    config_name: '订单自动审核',
    config_key: 'order.auto_approve',
    config_value: 'false',
    config_type: 2,
    description: '订单提交后是否自动审核通过',
  },
  {
    config_name: '缺货处理方式',
    config_key: 'order.out_of_stock_action',
    config_value: 'warn',
    config_type: 1,
    description: 'warn=提醒，block=禁止下单，allow=允许超卖',
  },
  {
    config_name: '订单超期提醒',
    config_key: 'order.overdue_remind_days',
    config_value: '7',
    config_type: 1,
    description: '订单超过承诺交货期多少天触发提醒',
  },
  {
    config_name: '默认交货周期',
    config_key: 'order.default_delivery_days',
    config_value: '7',
    config_type: 1,
    description: '新建销售订单默认的承诺交货天数',
  },
  {
    config_name: '订单价格精度',
    config_key: 'order.price_precision',
    config_value: '2',
    config_type: 1,
    description: '订单单价与金额保留的小数位数',
  },
  {
    config_name: '客户信用额度控制',
    config_key: 'order.credit_control',
    config_value: 'true',
    config_type: 2,
    description: '下单时是否校验客户可用信用额度',
  },
  {
    config_name: '退货期限',
    config_key: 'order.return_deadline_days',
    config_value: '15',
    config_type: 1,
    description: '销售订单允许退货的天数',
  },
  {
    config_name: '采购单号前缀',
    config_key: 'purchase.prefix',
    config_value: 'PO',
    config_type: 1,
    description: '采购订单号前缀',
  },
  {
    config_name: '采购价格上限控制',
    config_key: 'purchase.price_control',
    config_value: 'true',
    config_type: 2,
    description: '采购价超过历史最高价时是否拦截',
  },
  {
    config_name: '采购到货提醒',
    config_key: 'purchase.arrival_remind_days',
    config_value: '3',
    config_type: 1,
    description: '距预计到货日期多少天发送提醒',
  },
  {
    config_name: '采购允差比例',
    config_key: 'purchase.tolerance_ratio',
    config_value: '5',
    config_type: 1,
    description: '到货数量与订单数量的允许偏差百分比',
  },
  {
    config_name: '采购默认税率',
    config_key: 'purchase.tax_rate',
    config_value: '13',
    config_type: 1,
    description: '采购单据默认税率（%）',
  },
  {
    config_name: '采购审批金额阈值',
    config_key: 'purchase.approval_threshold',
    config_value: '10000',
    config_type: 1,
    description: '超过此金额的采购单需要审批',
  },
  {
    config_name: '默认付款期限',
    config_key: 'finance.payment_terms_days',
    config_value: '30',
    config_type: 1,
    description: '默认付款期限天数',
  },
  {
    config_name: '默认币种',
    config_key: 'finance.default_currency',
    config_value: 'CNY',
    config_type: 1,
    description: '系统默认结算币种',
  },
  {
    config_name: '成本计价方法',
    config_key: 'finance.cost_method',
    config_value: 'moving_avg',
    config_type: 1,
    description: 'moving_avg=移动平均，fifo=先进先出，weighted=加权平均',
  },
  {
    config_name: '税率',
    config_key: 'finance.tax_rate',
    config_value: '13',
    config_type: 1,
    description: '默认增值税税率（%）',
  },
  {
    config_name: '启用多币种',
    config_key: 'finance.multi_currency',
    config_value: 'false',
    config_type: 2,
    description: '是否启用多币种核算',
  },
  {
    config_name: '系统名称',
    config_key: 'system.name',
    config_value: 'DC ERP',
    config_type: 1,
    description: '系统登录页与标题显示的名称',
  },
  {
    config_name: '默认语言',
    config_key: 'system.default_language',
    config_value: 'zh-CN',
    config_type: 1,
    description: '新用户默认语言',
  },
  {
    config_name: '密码最小长度',
    config_key: 'system.password_min_length',
    config_value: '6',
    config_type: 1,
    description: '用户密码最小长度要求',
  },
  {
    config_name: '登录失败锁定次数',
    config_key: 'system.login_fail_lock_count',
    config_value: '5',
    config_type: 1,
    description: '连续登录失败多少次后锁定账号',
  },
  {
    config_name: '会话超时',
    config_key: 'system.session_timeout',
    config_value: '120',
    config_type: 1,
    description: '用户会话超时时间（分钟）',
  },
  {
    config_name: '操作日志保留天数',
    config_key: 'system.log_retention_days',
    config_value: '180',
    config_type: 1,
    description: '操作日志保留天数，0表示永久保留',
  },
  {
    config_name: '公司名称',
    config_key: 'company.name',
    config_value: '某某科技有限公司',
    config_type: 1,
    description: '打印单据与报表抬头显示的公司名称',
  },
  {
    config_name: '默认分页大小',
    config_key: 'ui.page_size',
    config_value: '20',
    config_type: 1,
    description: '列表页默认每页显示条数',
  },
  {
    config_name: '启用邮件通知',
    config_key: 'notify.email',
    config_value: 'true',
    config_type: 2,
    description: '业务事件是否发送邮件通知',
  },
  {
    config_name: '导出文件编码',
    config_key: 'export.encoding',
    config_value: 'UTF-8',
    config_type: 1,
    description: '数据导出文件的字符编码',
  },
];

async function ensureConfigTable(): Promise<boolean> {
  try {
    await execute(`CREATE TABLE IF NOT EXISTS sys_config (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      config_name VARCHAR(100) NOT NULL COMMENT '参数名称',
      config_key VARCHAR(100) NOT NULL COMMENT '参数键名',
      config_value VARCHAR(500) NOT NULL COMMENT '参数键值',
      config_type TINYINT DEFAULT 1 COMMENT '参数类型: 1-文本, 2-开关',
      description VARCHAR(500) COMMENT '描述',
      remark VARCHAR(500) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_config_key (config_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统参数配置表'`);
    return true;
  } catch {
    return false;
  }
}

async function seedDefaultConfigs(): Promise<number> {
  let count = 0;
  try {
    const rows: any = await query(`SELECT COUNT(*) as total FROM sys_config`);
    if (rows[0]?.total === 0) {
      for (const cfg of DEFAULT_CONFIGS) {
        try {
          await execute(
            `INSERT IGNORE INTO sys_config (config_name, config_key, config_value, config_type, description) VALUES (?, ?, ?, ?, ?)`,
            [cfg.config_name, cfg.config_key, cfg.config_value, cfg.config_type, cfg.description]
          );
          count++;
        } catch {}
      }
    }
  } catch {}
  return count;
}

export const GET = withPermission(
  async (request: NextRequest, _userInfo) => {
    await ensureConfigTable();
    const seeded = await seedDefaultConfigs();
    if (seeded > 0) clearSystemConfigCache();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 20);
    const configName = searchParams.get('configName') || '';
    const configKey = searchParams.get('configKey') || '';

    let where = 'WHERE 1=1 AND deleted = 0';
    const params: any[] = [];
    if (configName) {
      where += ' AND config_name LIKE ?';
      params.push(`%${configName}%`);
    }
    if (configKey) {
      where += ' AND config_key LIKE ?';
      params.push(`%${configKey}%`);
    }

    const totalRows: any = await query(`SELECT COUNT(*) as total FROM sys_config ${where}`, params);
    const total = totalRows[0]?.total || 0;

    const rows: any = await query(
      `SELECT * FROM sys_config ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return successResponse({ list: rows, total, page, pageSize });
  },
  { logTitle: '获取系统配置', logType: 'system' }
);

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { config_name, config_key, config_value, config_type, description } = body;

    const result: Loose = await execute(
      `INSERT INTO sys_config (config_name, config_key, config_value, config_type, description) VALUES (?, ?, ?, ?, ?)`,
      [config_name, config_key, config_value, config_type ?? 1, description || null]
    );

    clearSystemConfigCache();
    return successResponse({ id: result.insertId }, '创建成功');
  },
  { logTitle: '创建系统配置', logType: 'system' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, config_name, config_key, config_value, config_type, description } = body;

    await execute(
      `UPDATE sys_config SET config_name = ?, config_key = ?, config_value = ?, config_type = ?, description = ? WHERE id = ?`,
      [config_name, config_key, config_value, config_type ?? 1, description || null, id]
    );

    clearSystemConfigCache();
    return successResponse(null, '更新成功');
  },
  { logTitle: '更新系统配置', logType: 'system' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: '缺少id' }, { status: 400 });

    await execute(`DELETE FROM sys_config WHERE id = ?`, [Number(id)]);
    clearSystemConfigCache();
    return successResponse(null, '删除成功');
  },
  { logTitle: '删除系统配置', logType: 'system' }
);
