import mysql from 'mysql2/promise';
import type { ExecuteValues } from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Snqig521223',
  database: process.env.DB_NAME || 'vnerpdacahng',
  decimalNumbers: true,
};

type Severity = 'critical' | 'warning' | 'info';
type Module = 'warehouse' | 'production' | 'sales' | 'purchase' | 'all';

export interface AuditIssue {
  id: string;
  module: Module;
  severity: Severity;
  type: string;
  table: string;
  record_id: number | string;
  field?: string;
  actual_value?: unknown;
  expected_value?: unknown;
  rule_key: string;
  description: string;
}

export interface AuditResult {
  total_issues: number;
  severity_summary: { critical: number; warning: number; info: number };
  module_summary: Record<string, number>;
  audit_time: string;
  db_connection: string;
  issues: AuditIssue[];
}

export interface BatchDecisionInput {
  issues: AuditIssue[];
  context?: Record<string, unknown>;
}

export interface BatchDecisionOutput {
  decisions: Array<{
    issue_id: string;
    verdict: string;
    reasoning: string;
    suggested_action: string;
    priority: number;
  }>;
  summary: string;
}

async function createDbPool(): Promise<mysql.Pool> {
  return mysql.createPool(DB_CONFIG);
}

async function query<T = unknown[]>(pool: mysql.Pool, sql: string, values?: unknown[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, values as ExecuteValues | undefined);
  return rows as T[];
}

// ── 仓库模块审核 ──────────────────────────────────────────────

async function auditWarehouse(pool: mysql.Pool): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  const negativeInventory = await query<{
    id: number; material_id: number; warehouse_id: number;
    quantity: number; available_qty: number;
  }>(pool, `
    SELECT id, material_id, warehouse_id, quantity, available_qty
    FROM inv_inventory WHERE (quantity < 0 OR available_qty < 0) AND deleted = 0
  `);
  for (const row of negativeInventory) {
    issues.push({
      id: `WH-NEG-${row.id}`, module: 'warehouse', severity: 'critical',
      type: 'negative_inventory', table: 'inv_inventory', record_id: row.id,
      field: 'quantity', actual_value: row.quantity, expected_value: '>= 0',
      rule_key: 'inventory_qty_non_negative',
      description: `库存记录ID=${row.id}数量=${row.quantity}为负数，违反仓库基础规则`,
    });
  }

  const availExceedQty = await query<{ id: number; quantity: number; available_qty: number }>(
    pool, `SELECT id, quantity, available_qty FROM inv_inventory WHERE available_qty > quantity AND deleted = 0 LIMIT 20`
  );
  for (const row of availExceedQty) {
    issues.push({
      id: `WH-AVAIL-${row.id}`, module: 'warehouse', severity: 'warning',
      type: 'available_exceeds_quantity', table: 'inv_inventory', record_id: row.id,
      field: 'available_qty', actual_value: row.available_qty, expected_value: `<= ${row.quantity}`,
      rule_key: 'available_qty_le_quantity',
      description: `库存记录ID=${row.id}可用量(${row.available_qty})超过总数量(${row.quantity})`,
    });
  }

  const incompleteInbound = await query<{ id: number; order_no: string; status: string }>(
    pool, `SELECT id, order_no, status FROM inv_inbound_order WHERE status NOT IN ('completed','cancelled','closed') AND deleted = 0 LIMIT 20`
  );
  for (const row of incompleteInbound) {
    issues.push({
      id: `WH-INB-${row.id}`, module: 'warehouse', severity: 'info',
      type: 'incomplete_inbound', table: 'inv_inbound_order', record_id: row.id,
      field: 'status', actual_value: row.status, expected_value: 'completed/cancelled/closed',
      rule_key: 'inbound_should_complete',
      description: `入库单${row.order_no}(ID=${row.id})状态=${row.status}未完成`,
    });
  }

  const incompleteOutbound = await query<{ id: number; order_no: string; status: string }>(
    pool, `SELECT id, order_no, status FROM inv_outbound_order WHERE status NOT IN ('completed','cancelled','closed') AND deleted = 0 LIMIT 20`
  );
  for (const row of incompleteOutbound) {
    issues.push({
      id: `WH-OUT-${row.id}`, module: 'warehouse', severity: 'info',
      type: 'incomplete_outbound', table: 'inv_outbound_order', record_id: row.id,
      field: 'status', actual_value: row.status, expected_value: 'completed/cancelled/closed',
      rule_key: 'outbound_should_complete',
      description: `出库单${row.order_no}(ID=${row.id})状态=${row.status}未完成`,
    });
  }

  const invalidLocation = await query<{ id: number; location_id: number }>(
    pool, `
      SELECT DISTINCT i.id, i.location_id FROM inv_inbound_item i
      LEFT JOIN inv_location l ON i.location_id = l.id
      WHERE i.location_id IS NOT NULL AND l.id IS NULL AND i.deleted = 0 LIMIT 20
    `
  );
  for (const row of invalidLocation) {
    issues.push({
      id: `WH-LOC-${row.id}`, module: 'warehouse', severity: 'critical',
      type: 'invalid_location_reference', table: 'inv_inbound_item', record_id: row.id,
      field: 'location_id', actual_value: row.location_id, expected_value: 'exists in inv_location',
      rule_key: 'location_must_exist',
      description: `入库明细ID=${row.id}引用的库位ID=${row.location_id}不存在`,
    });
  }

  const orphanInventory = await query<{ id: number; material_id: number }>(
    pool, `
      SELECT i.id, i.material_id FROM inv_inventory i
      LEFT JOIN inv_material m ON i.material_id = m.id
      WHERE i.material_id IS NOT NULL AND m.id IS NULL AND i.deleted = 0 LIMIT 20
    `
  );
  for (const row of orphanInventory) {
    issues.push({
      id: `WH-MAT-${row.id}`, module: 'warehouse', severity: 'critical',
      type: 'orphan_inventory', table: 'inv_inventory', record_id: row.id,
      field: 'material_id', actual_value: row.material_id, expected_value: 'exists in inv_material',
      rule_key: 'material_must_exist',
      description: `库存记录ID=${row.id}引用的物料ID=${row.material_id}不存在于inv_material表`,
    });
  }

  return issues;
}

// ── 生产模块审核 ──────────────────────────────────────────────

async function auditProduction(pool: mysql.Pool): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  const overReported = await query<{
    work_order_id: number; total_completed: number; plan_qty: number;
  }>(pool, `
    SELECT r.work_order_id, SUM(r.completed_qty) as total_completed, w.planned_qty
    FROM prd_work_report r
    JOIN prod_work_order w ON r.work_order_id = w.id
    WHERE r.status = 1 AND r.deleted = 0
    GROUP BY r.work_order_id, w.planned_qty
    HAVING total_completed > w.planned_qty
    LIMIT 20
  `);
  for (const row of overReported) {
    issues.push({
      id: `PRD-OVER-${row.work_order_id}`,
      module: 'production', severity: 'warning',
      type: 'over_reporting', table: 'prd_work_report', record_id: row.work_order_id,
      field: 'completed_qty', actual_value: row.total_completed, expected_value: `<= ${row.plan_qty}`,
      rule_key: 'report_qty_le_plan_qty',
      description: `工单ID=${row.work_order_id}累计报工量(${row.total_completed})超过计划数量(${row.plan_qty})`,
    });
  }

  const missingFQC = await query<{ work_order_id: number; work_order_no: string }>(pool, `
    SELECT w.id as work_order_id, w.work_order_no
    FROM prod_work_order w
    WHERE w.status = 'completed' AND w.deleted = 0
    AND EXISTS (SELECT 1 FROM prd_finish_order fo WHERE fo.work_order_id = w.id AND fo.deleted = 0)
    AND NOT EXISTS (
      SELECT 1 FROM qc_inspection qi
      JOIN prd_finish_order fo ON qi.source_no = fo.finish_no
      WHERE qi.source_type = 'finish_order' AND qi.inspection_type = 2
      AND qi.deleted = 0 AND fo.work_order_id = w.id
    )
    LIMIT 20
  `);
  for (const row of missingFQC) {
    issues.push({
      id: `PRD-FQC-${row.work_order_id}`,
      module: 'production', severity: 'critical',
      type: 'missing_fqc', table: 'prd_finish_order', record_id: row.work_order_id,
      field: 'qc_inspection', actual_value: 'none', expected_value: 'inspection_type=2 required',
      rule_key: 'quality_check_mandatory',
      description: `工单${row.work_order_no}(ID=${row.work_order_id})已完工但缺少FQC检验报告`,
    });
  }

  const noBom = await query<{ id: number; work_order_no: string; material_id: number; bom_id: number | null }>(pool, `
    SELECT w.id, w.work_order_no, w.legacy_material_id as material_id, w.bom_id
    FROM prod_work_order w
    LEFT JOIN prd_bom b ON w.bom_id = b.id
    WHERE w.bom_id IS NOT NULL AND b.id IS NULL AND w.deleted = 0
    LIMIT 20
  `);
  for (const row of noBom) {
    issues.push({
      id: `PRD-BOM-${row.id}`,
      module: 'production', severity: 'warning',
      type: 'missing_bom', table: 'prod_work_order', record_id: row.id,
      field: 'bom_id', actual_value: row.bom_id ?? 'null', expected_value: 'exists in prd_bom',
      rule_key: 'work_order_requires_bom',
      description: `工单${row.work_order_no}(ID=${row.id})关联的BOM不存在`,
    });
  }

  const orphanReq = await query<{ id: number; req_no: string }>(pool, `
    SELECT r.id, r.requisition_no as req_no
    FROM material_requisitions r
    LEFT JOIN prod_work_order w ON r.work_order_id = w.id
    WHERE w.id IS NULL AND r.deleted = 0
    LIMIT 20
  `);
  for (const row of orphanReq) {
    issues.push({
      id: `PRD-REQ-${row.id}`,
      module: 'production', severity: 'critical',
      type: 'orphan_requisition', table: 'material_requisitions', record_id: row.id,
      field: 'work_order_id', actual_value: 'null', expected_value: 'valid prod_work_order.id',
      rule_key: 'requisition_needs_work_order',
      description: `领料单${row.req_no}(ID=${row.id})引用的工单ID不存在`,
    });
  }

  return issues;
}

// ── 销售模块审核 ──────────────────────────────────────────────

async function auditSales(pool: mysql.Pool): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  // sal_order.status is TINYINT: valid values 1-5
  const invalidStatus = await query<{ id: number; order_no: string; status: number }>(pool, `
    SELECT id, order_no, status FROM sal_order
    WHERE status NOT IN (1, 2, 3, 4, 5)
    AND deleted = 0 LIMIT 20
  `);
  for (const row of invalidStatus) {
    issues.push({
      id: `SAL-STATUS-${row.id}`,
      module: 'sales', severity: 'critical',
      type: 'invalid_status', table: 'sal_order', record_id: row.id,
      field: 'status', actual_value: row.status, expected_value: 'valid status range 1-5',
      rule_key: 'order_status_valid_range',
      description: `销售订单${row.order_no}(ID=${row.id})状态值=${row.status}不在合法范围内(1-5)`,
    });
  }

  const overdue = await query<{ id: number; order_no: string; delivery_date: string; status: number }>(
    pool, `
    SELECT id, order_no, delivery_date, status FROM sal_order
    WHERE delivery_date < CURDATE() AND status NOT IN (4, 5)
    AND deleted = 0 LIMIT 20
  `
  );
  for (const row of overdue) {
    issues.push({
      id: `SAL-OVD-${row.id}`,
      module: 'sales', severity: 'warning',
      type: 'overdue_delivery', table: 'sal_order', record_id: row.id,
      field: 'delivery_date', actual_value: row.delivery_date, expected_value: '>= CURRENT_DATE',
      rule_key: 'delivery_not_overdue',
      description: `销售订单${row.order_no}(ID=${row.id})交期${row.delivery_date}已逾期`,
    });
  }

  const orphanOrder = await query<{ id: number; order_no: string; customer_id: number }>(pool, `
    SELECT o.id, o.order_no, o.customer_id
    FROM sal_order o
    LEFT JOIN crm_customer c ON o.customer_id = c.id
    WHERE c.id IS NULL AND o.deleted = 0
    LIMIT 20
  `);
  for (const row of orphanOrder) {
    issues.push({
      id: `SAL-CUST-${row.id}`,
      module: 'sales', severity: 'critical',
      type: 'orphan_customer', table: 'sal_order', record_id: row.id,
      field: 'customer_id', actual_value: row.customer_id, expected_value: 'exists in crm_customer',
      rule_key: 'order_needs_customer',
      description: `销售订单${row.order_no}(ID=${row.id})引用的客户ID=${row.customer_id}不存在`,
    });
  }

  const orphanDetail = await query<{ id: number; order_id: number; material_id: number }>(pool, `
    SELECT d.id, d.order_id, d.material_id
    FROM sal_order_detail d
    LEFT JOIN inv_material m ON d.material_id = m.id
    WHERE m.id IS NULL AND d.deleted = 0
    LIMIT 20
  `);
  for (const row of orphanDetail) {
    issues.push({
      id: `SAL-MAT-${row.id}`,
      module: 'sales', severity: 'warning',
      type: 'orphan_material', table: 'sal_order_detail', record_id: row.id,
      field: 'material_id', actual_value: row.material_id, expected_value: 'exists in inv_material',
      rule_key: 'detail_needs_material',
      description: `订单明细ID=${row.id}引用的物料ID=${row.material_id}不存在于inv_material表`,
    });
  }

  const shipmentCustMismatch = await query<{
    id: number; delivery_no: string; order_id: number;
    delivery_customer_id: number; order_customer_id: number;
  }>(pool, `
    SELECT s.id, s.delivery_no, s.order_id,
           s.customer_id as delivery_customer_id,
           o.customer_id as order_customer_id
    FROM sal_delivery s
    JOIN sal_order o ON s.order_id = o.id
    WHERE s.customer_id != o.customer_id AND s.deleted = 0
    LIMIT 20
  `);
  for (const row of shipmentCustMismatch) {
    issues.push({
      id: `SAL-SHIP-${row.id}`,
      module: 'sales', severity: 'warning',
      type: 'shipment_customer_mismatch', table: 'sal_delivery', record_id: row.id,
      field: 'customer_id', actual_value: row.delivery_customer_id,
      expected_value: `${row.order_customer_id} (from order)`,
      rule_key: 'shipment_matches_order',
      description: `发货单${row.delivery_no}(ID=${row.id})客户ID=${row.delivery_customer_id}与订单客户ID=${row.order_customer_id}不一致`,
    });
  }

  return issues;
}

// ── 采购模块审核 ──────────────────────────────────────────────

async function auditPurchase(pool: mysql.Pool): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  const orphanPo = await query<{ id: number; po_no: string; supplier_id: number }>(pool, `
    SELECT o.id, o.po_no, o.supplier_id
    FROM pur_purchase_order o
    LEFT JOIN pur_supplier s ON o.supplier_id = s.id
    WHERE s.id IS NULL AND o.deleted = 0
    LIMIT 20
  `);
  for (const row of orphanPo) {
    issues.push({
      id: `PUR-SUPP-${row.id}`,
      module: 'purchase', severity: 'critical',
      type: 'orphan_supplier', table: 'pur_purchase_order', record_id: row.id,
      field: 'supplier_id', actual_value: row.supplier_id, expected_value: 'exists in pur_supplier',
      rule_key: 'po_needs_supplier',
      description: `采购订单${row.po_no}(ID=${row.id})引用的供应商ID=${row.supplier_id}不存在`,
    });
  }

  const orphanPoLine = await query<{ id: number; po_id: number; material_id: number }>(pool, `
    SELECT l.id, l.po_id, l.material_id
    FROM pur_purchase_order_line l
    LEFT JOIN inv_material m ON l.material_id = m.id
    WHERE m.id IS NULL
    LIMIT 20
  `);
  for (const row of orphanPoLine) {
    issues.push({
      id: `PUR-MAT-${row.id}`,
      module: 'purchase', severity: 'warning',
      type: 'orphan_material', table: 'pur_purchase_order_line', record_id: row.id,
      field: 'material_id', actual_value: row.material_id, expected_value: 'exists in inv_material',
      rule_key: 'po_line_needs_material',
      description: `采购订单行ID=${row.id}引用的物料ID=${row.material_id}不存在于inv_material表`,
    });
  }

  const orphanInbound = await query<{ id: number; order_no: string; po_id: number }>(pool, `
    SELECT o.id, o.order_no, o.po_id
    FROM inv_inbound_order o
    LEFT JOIN pur_purchase_order p ON o.po_id = p.id
    WHERE o.po_id IS NOT NULL AND p.id IS NULL AND o.deleted = 0
    LIMIT 20
  `);
  for (const row of orphanInbound) {
    issues.push({
      id: `PUR-INB-${row.id}`,
      module: 'purchase', severity: 'critical',
      type: 'orphan_purchase_order', table: 'inv_inbound_order', record_id: row.id,
      field: 'po_id', actual_value: row.po_id, expected_value: 'exists in pur_purchase_order',
      rule_key: 'inbound_needs_purchase_order',
      description: `入库单${row.order_no}(ID=${row.id})引用的采购订单ID=${row.po_id}不存在`,
    });
  }

  const activePoFromDisabled = await query<{ id: number; po_no: string; supplier_id: number; supplier_status: number }>(pool, `
    SELECT o.id, o.po_no, o.supplier_id, s.status as supplier_status
    FROM pur_purchase_order o
    JOIN pur_supplier s ON o.supplier_id = s.id
    WHERE s.status = 0 AND o.deleted = 0
    LIMIT 20
  `);
  for (const row of activePoFromDisabled) {
    issues.push({
      id: `PUR-DISABLED-${row.id}`,
      module: 'purchase', severity: 'warning',
      type: 'disabled_supplier_active_po', table: 'pur_purchase_order', record_id: row.id,
      field: 'supplier_status', actual_value: row.supplier_status, expected_value: 'supplier should be active (status=1)',
      rule_key: 'no_po_with_disabled_supplier',
      description: `采购订单${row.po_no}(ID=${row.id})关联的供应商ID=${row.supplier_id}已停用(status=0)`,
    });
  }

  const badPrices = await query<{ id: number; po_id: number; material_id: number; unit_price: number }>(pool, `
    SELECT l.id, l.po_id, l.material_id, l.unit_price
    FROM pur_purchase_order_line l
    WHERE l.unit_price <= 0 OR l.unit_price IS NULL
    LIMIT 20
  `);
  for (const row of badPrices) {
    issues.push({
      id: `PUR-PRICE-${row.id}`,
      module: 'purchase', severity: 'critical',
      type: 'invalid_unit_price', table: 'pur_purchase_order_line', record_id: row.id,
      field: 'unit_price', actual_value: row.unit_price, expected_value: '> 0',
      rule_key: 'po_line_price_positive',
      description: `采购订单行ID=${row.id}单价=${row.unit_price}不合法（须大于0）`,
    });
  }

  return issues;
}

// ── 基线对比：与 seed 数据期望值核对 ─────────────────────────

async function auditBaseline(pool: mysql.Pool): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  const EXPECTED = {
    customer_count: 15,
    supplier_count: 6,
    material_count: 3470,
    warehouse_count: 6,
    process_count: 42,
    work_order_count: 36,
    sales_order_count: 23,
  };

  async function checkCount(table: string, expected: number, label: string): Promise<void> {
    const [rows] = await pool.execute(`SELECT COUNT(*) as cnt FROM ${table} WHERE deleted = 0`);
    const actual = Number((rows as { cnt: number }[])[0].cnt);
    if (actual !== expected) {
      issues.push({
        id: `BASELINE-${table}`,
        module: 'all',
        severity: 'info',
        type: 'baseline_mismatch',
        table,
        record_id: 0,
        field: 'count',
        actual_value: actual,
        expected_value: expected,
        rule_key: 'seed_baseline_consistency',
        description: `${label}当前记录数=${actual}，与seed基准(${expected})不一致`,
      });
    }
  }

  await checkCount('crm_customer', EXPECTED.customer_count, '客户');
  await checkCount('pur_supplier', EXPECTED.supplier_count, '供应商');
  await checkCount('inv_material', EXPECTED.material_count, '物料');
  await checkCount('inv_warehouse', EXPECTED.warehouse_count, '仓库');
  await checkCount('prd_process_card', EXPECTED.process_count, '工序');
  await checkCount('prod_work_order', EXPECTED.work_order_count, '工单');
  await checkCount('sal_order', EXPECTED.sales_order_count, '销售订单');

  return issues;
}

// ── 入口函数 ──────────────────────────────────────────────────

export interface AuditParams {
  modules: Module[];
  strict_mode?: boolean;
}

export async function runAudit(params: AuditParams): Promise<AuditResult> {
  const pool = await createDbPool();
  try {
    const allIssues: AuditIssue[] = [];
    const moduleSet = new Set(params.modules.filter(m => m !== 'all'));
    const runModule = (mod: Exclude<Module, 'all'>) => moduleSet.has(mod);

    if (runModule('warehouse')) {
      allIssues.push(...(await auditWarehouse(pool)));
    }
    if (runModule('production')) {
      allIssues.push(...(await auditProduction(pool)));
    }
    if (runModule('sales')) {
      allIssues.push(...(await auditSales(pool)));
    }
    if (runModule('purchase')) {
      allIssues.push(...(await auditPurchase(pool)));
    }
    allIssues.push(...(await auditBaseline(pool)));

    const severitySummary = { critical: 0, warning: 0, info: 0 };
    const moduleSummary: Record<string, number> = {};
    for (const issue of allIssues) {
      severitySummary[issue.severity]++;
      moduleSummary[issue.module] = (moduleSummary[issue.module] || 0) + 1;
    }

    return {
      total_issues: allIssues.length,
      severity_summary: severitySummary,
      module_summary: moduleSummary,
      audit_time: new Date().toISOString(),
      db_connection: `${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`,
      issues: allIssues,
    };
  } finally {
    await pool.end();
  }
}
