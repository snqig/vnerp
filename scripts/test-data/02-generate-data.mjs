/**
 * VNERP 测试数据 - 阶段二：数据清理与生成
 *
 * 对应 TODO 清单步骤 5~10：
 *   5. 清空相关表（禁用外键检查）
 *   6. 动态查询配置（币种/税率/汇率/HR参数）
 *   7. 插入采购订单（多币种 + base_* 本位币金额）
 *   8. 插入采购入库单 + 库存批次（A/B/C 三批次）
 *   9. 插入销售订单/生产工单/排程/领料单（FIFO 扣减批次）
 *  10. 插入 HR 薪资档案/计件单价/计件明细/薪资计算
 *
 * 用法: node scripts/test-data/02-generate-data.mjs
 *
 * 前置: 先执行 01-schema-migration.mjs
 */
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Snqig521223',
  database: process.env.DB_NAME || 'vnerpdacahng',
  charset: 'utf8mb4',
  multipleStatements: true,
};

// ═══════════════════════════════════════════════════════════
//  数据常量
// ═══════════════════════════════════════════════════════════

// 汇率（USD→CNY），同时写入 sys_exchange_rate
const USD_TO_CNY_RATE = 7.2;

// 采购订单明细数据
// PO-2026-001: CNY, 丝印油墨-黑色 1500kg @ 85
// PO-2026-002: USD, 丝印油墨-白色 1000kg @ 12 USD
// PO-2026-003: CNY, 网版 500个 @ 50
const TAX_RATE = 13; // 13%

// 领料数量（FIFO 扣减后批次可用量应为 1200/900/300）
const PICK_BLACK_INK_QTY = 300;   // 从批次 A 扣减
const PICK_WHITE_INK_QTY = 100;   // 从批次 B 扣减
const PICK_SCREEN_QTY = 200;      // 从批次 C 扣减

// 计件明细（总产量 1266 件）
const PIECE_WORK_RECORDS = [
  { workDate: '2026-07-15', processCode: 'PRINT',    quantity: 500, unitPrice: 0.5 },
  { workDate: '2026-07-16', processCode: 'PRINT',    quantity: 400, unitPrice: 0.5 },
  { workDate: '2026-07-17', processCode: 'DIE_CUT',  quantity: 266, unitPrice: 0.3 },
  { workDate: '2026-07-18', processCode: 'INSPECT',  quantity: 100, unitPrice: 0.2 },
];
// 总产量: 500+400+266+100 = 1266 件
// 计件总额: 250+200+79.80+20 = 549.80 元

// HR 薪资参数
const HR_BASE_SALARY = 8000;          // 基本工资
const HR_SOCIAL_INSURANCE_RATE = 0.105; // 个人社保比例 10.5%
const HR_HOUSING_FUND_RATE = 12;       // 公积金比例 12%
const HR_TAX_DEDUCTION = 5000;         // 个税起征点
const HR_PERFORMANCE_SALARY = 1000;    // 绩效工资
const HR_ALLOWANCES = 500;             // 补贴

// ═══════════════════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════════════════

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

async function getSingleRow(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  if (rows.length === 0) throw new Error(`查询无结果: ${sql}`);
  return rows[0];
}

async function getSingleValue(conn, sql, params = []) {
  const row = await getSingleRow(conn, sql, params);
  return Object.values(row)[0];
}

// ═══════════════════════════════════════════════════════════
//  主流程
// ═══════════════════════════════════════════════════════════

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤 6: 动态查询配置与主数据 ID
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('━━━ 步骤 6: 动态查询配置与主数据 ━━━');

  // 系统配置
  const defaultCurrency = await getSingleValue(conn,
    `SELECT config_value FROM sys_config WHERE config_key = 'currency' AND deleted = 0`);
  const defaultTaxRate = await getSingleValue(conn,
    `SELECT config_value FROM sys_config WHERE config_key = 'tax_rate' AND deleted = 0`);
  console.log(`  系统配置: currency=${defaultCurrency}, tax_rate=${defaultTaxRate}%`);

  // 写入汇率（sys_exchange_rate 当前为空）
  await conn.execute(
    `INSERT INTO sys_exchange_rate (from_currency, to_currency, rate, rate_date, source, remark)
     VALUES ('USD', 'CNY', ?, '2026-07-01', 'manual', '测试数据-美元兑人民币汇率')
     ON DUPLICATE KEY UPDATE rate = VALUES(rate)`,
    [USD_TO_CNY_RATE]
  );
  console.log(`  汇率: USD→CNY = ${USD_TO_CNY_RATE}`);

  // 动态查询主数据 ID
  const supplierInk = await getSingleRow(conn,
    `SELECT id, supplier_code, supplier_name FROM pur_supplier WHERE supplier_name = '深圳油墨公司' AND deleted = 0`);
  const supplierSpecial = await getSingleRow(conn,
    `SELECT id, supplier_code, supplier_name FROM pur_supplier WHERE supplier_name = '深圳特种油墨' AND deleted = 0`);
  const supplierAdhesive = await getSingleRow(conn,
    `SELECT id, supplier_code, supplier_name FROM pur_supplier WHERE supplier_name = '广州不干胶厂' AND deleted = 0`);

  const matBlackInk = await getSingleRow(conn,
    `SELECT id, material_code, material_name, specification, unit, purchase_price FROM inv_material WHERE material_name = '丝印油墨-黑色' AND deleted = 0`);
  const matWhiteInk = await getSingleRow(conn,
    `SELECT id, material_code, material_name, specification, unit, purchase_price FROM inv_material WHERE material_name = '丝印油墨-白色' AND deleted = 0`);
  const matScreen = await getSingleRow(conn,
    `SELECT id, material_code, material_name, specification, unit FROM inv_material WHERE material_name = '网版' AND deleted = 0 ORDER BY id LIMIT 1`);
  const matProduct = await getSingleRow(conn,
    `SELECT id, material_code, material_name, unit, purchase_price FROM inv_material WHERE material_name = '空调控制面板标签' AND deleted = 0`);

  const whRaw = await getSingleRow(conn,
    `SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE warehouse_code = 'WH001' AND deleted = 0`);
  const employee = await getSingleRow(conn,
    `SELECT id, employee_no, name, dept_name, position FROM sys_employee WHERE id = 1001`);
  const customer = await getSingleRow(conn,
    `SELECT id, customer_code, customer_name FROM crm_customer WHERE customer_code = 'C001' AND deleted = 0`);

  console.log(`  供应商: 深圳油墨公司(id=${supplierInk.id}), 深圳特种油墨(id=${supplierSpecial.id}), 广州不干胶厂(id=${supplierAdhesive.id})`);
  console.log(`  物料: 黑色油墨(id=${matBlackInk.id}), 白色油墨(id=${matWhiteInk.id}), 网版(id=${matScreen.id}), 产品-空调标签(id=${matProduct.id})`);
  console.log(`  仓库: ${whRaw.warehouse_name}(id=${whRaw.id})`);
  console.log(`  员工: ${employee.name}(id=${employee.id})`);
  console.log(`  客户: ${customer.customer_name}(id=${customer.id})`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤 5: 清空相关表（禁用外键检查）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━ 步骤 5: 清空相关表 ━━━');
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  const truncateTables = [
    'prd_material_issue_item',
    'prd_material_issue',
    'prd_schedule',
    'prd_work_order',
    'inv_inventory_batch',
    'inv_inbound_item',
    'inv_inbound_order',
    'pur_purchase_order_line',
    'pur_purchase_order',
    'sal_order_detail',
    'sal_order',
    'hr_piece_work_detail',
    'hr_piece_rate',
    'hr_salary_standard',
    'hr_salary_profile',
    'hr_salary_calculation',
    'sys_exchange_rate',
  ];
  for (const t of truncateTables) {
    await conn.execute(`TRUNCATE TABLE \`${t}\``);
    console.log(`  [ok] TRUNCATE ${t}`);
  }
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

  // 重新写入汇率（TRUNCATE 后）
  await conn.execute(
    `INSERT INTO sys_exchange_rate (from_currency, to_currency, rate, rate_date, source, remark)
     VALUES ('USD', 'CNY', ?, '2026-07-01', 'manual', '测试数据-美元兑人民币汇率')`,
    [USD_TO_CNY_RATE]
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤 7: 插入采购订单（多币种 + base_* 本位币金额）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━ 步骤 7: 插入采购订单 ━━━');

  // PO-2026-001: CNY, 丝印油墨-黑色 1500kg @ 85
  const po1LineAmount = 1500 * 85;          // 127500
  const po1TaxAmount = round2(po1LineAmount * TAX_RATE / 100); // 16575
  const po1GrandTotal = round2(po1LineAmount + po1TaxAmount);  // 144075
  const po1Rate = 1.0;
  // CNY: base = 原币 * 1.0

  const [po1Result] = await conn.execute(
    `INSERT INTO pur_purchase_order
      (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date,
       currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total,
       base_total_amount, base_tax_amount, base_grand_total, status, payment_terms)
     VALUES (?, ?, ?, ?, '2026-07-01', '2026-07-10', 'CNY', 1.0000, ?, 1500, ?, ?, ?, ?, ?, ?, 20, '月结30天')`,
    [
      'PO-2026-001', supplierInk.id, supplierInk.supplier_name, supplierInk.supplier_code,
      po1LineAmount, TAX_RATE, po1TaxAmount, po1GrandTotal,
      po1LineAmount, po1TaxAmount, po1GrandTotal,
    ]
  );
  const po1Id = po1Result.insertId;
  console.log(`  PO-2026-001 (CNY): 黑色油墨 1500kg @85, total=${po1LineAmount}, tax=${po1TaxAmount}, grand=${po1GrandTotal}`);

  await conn.execute(
    `INSERT INTO pur_purchase_order_line
      (po_id, line_no, material_id, material_code, material_name, material_spec, unit,
       order_qty, unit_price, amount, tax_rate, tax_amount, line_total,
       base_unit_price, base_amount, base_tax_amount, base_line_total, require_date)
     VALUES (?, 1, ?, ?, ?, ?, ?, 1500, 85, ?, ?, ?, ?, 85, ?, ?, ?, '2026-07-10')`,
    [po1Id, matBlackInk.id, matBlackInk.material_code, matBlackInk.material_name, matBlackInk.specification, matBlackInk.unit,
     po1LineAmount, TAX_RATE, po1TaxAmount, po1GrandTotal,
     po1LineAmount, po1TaxAmount, po1GrandTotal]
  );

  // PO-2026-002: USD, 丝印油墨-白色 1000kg @ 12 USD
  const po2LineAmount = 1000 * 12;          // 12000 USD
  const po2TaxAmount = round2(po2LineAmount * TAX_RATE / 100); // 1560 USD
  const po2GrandTotal = round2(po2LineAmount + po2TaxAmount);  // 13560 USD
  const po2Rate = USD_TO_CNY_RATE;
  // base = 原币 * 汇率
  const po2BaseTotal = round2(po2LineAmount * po2Rate);  // 86400
  const po2BaseTax = round2(po2TaxAmount * po2Rate);     // 11232
  const po2BaseGrand = round2(po2GrandTotal * po2Rate);  // 97632

  const [po2Result] = await conn.execute(
    `INSERT INTO pur_purchase_order
      (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date,
       currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total,
       base_total_amount, base_tax_amount, base_grand_total, status, payment_terms)
     VALUES (?, ?, ?, ?, '2026-07-02', '2026-07-12', 'USD', ?, ?, 1000, ?, ?, ?, ?, ?, ?, 20, '月结45天')`,
    [
      'PO-2026-002', supplierSpecial.id, supplierSpecial.supplier_name, supplierSpecial.supplier_code,
      po2Rate, po2LineAmount, TAX_RATE, po2TaxAmount, po2GrandTotal,
      po2BaseTotal, po2BaseTax, po2BaseGrand,
    ]
  );
  const po2Id = po2Result.insertId;
  console.log(`  PO-2026-002 (USD): 白色油墨 1000kg @12USD, total=${po2LineAmount}USD, base_total=${po2BaseTotal}CNY`);

  const po2BaseUnitPrice = round4(12 * po2Rate); // 86.4
  await conn.execute(
    `INSERT INTO pur_purchase_order_line
      (po_id, line_no, material_id, material_code, material_name, material_spec, unit,
       order_qty, unit_price, amount, tax_rate, tax_amount, line_total,
       base_unit_price, base_amount, base_tax_amount, base_line_total, require_date)
     VALUES (?, 1, ?, ?, ?, ?, ?, 1000, 12, ?, ?, ?, ?, ?, ?, ?, ?, '2026-07-12')`,
    [po2Id, matWhiteInk.id, matWhiteInk.material_code, matWhiteInk.material_name, matWhiteInk.specification, matWhiteInk.unit,
     po2LineAmount, TAX_RATE, po2TaxAmount, po2GrandTotal,
     po2BaseUnitPrice, po2BaseTotal, po2BaseTax, po2BaseGrand]
  );

  // PO-2026-003: CNY, 网版 500个 @ 50
  const po3LineAmount = 500 * 50;           // 25000
  const po3TaxAmount = round2(po3LineAmount * TAX_RATE / 100); // 3250
  const po3GrandTotal = round2(po3LineAmount + po3TaxAmount);  // 28250

  const [po3Result] = await conn.execute(
    `INSERT INTO pur_purchase_order
      (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date,
       currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total,
       base_total_amount, base_tax_amount, base_grand_total, status, payment_terms)
     VALUES (?, ?, ?, ?, '2026-07-03', '2026-07-15', 'CNY', 1.0000, ?, 500, ?, ?, ?, ?, ?, ?, 20, '货到付款')`,
    [
      'PO-2026-003', supplierAdhesive.id, supplierAdhesive.supplier_name, supplierAdhesive.supplier_code,
      po3LineAmount, TAX_RATE, po3TaxAmount, po3GrandTotal,
      po3LineAmount, po3TaxAmount, po3GrandTotal,
    ]
  );
  const po3Id = po3Result.insertId;
  console.log(`  PO-2026-003 (CNY): 网版 500个 @50, total=${po3LineAmount}, tax=${po3TaxAmount}, grand=${po3GrandTotal}`);

  await conn.execute(
    `INSERT INTO pur_purchase_order_line
      (po_id, line_no, material_id, material_code, material_name, material_spec, unit,
       order_qty, unit_price, amount, tax_rate, tax_amount, line_total,
       base_unit_price, base_amount, base_tax_amount, base_line_total, require_date)
     VALUES (?, 1, ?, ?, ?, ?, ?, 500, 50, ?, ?, ?, ?, 50, ?, ?, ?, '2026-07-15')`,
    [po3Id, matScreen.id, matScreen.material_code, matScreen.material_name, matScreen.specification, matScreen.unit,
     po3LineAmount, TAX_RATE, po3TaxAmount, po3GrandTotal,
     po3LineAmount, po3TaxAmount, po3GrandTotal]
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤 8: 插入采购入库单 + 库存批次（A/B/C）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━ 步骤 8: 插入入库单及库存批次 ━━━');

  // 入库单 1: 黑色油墨 → 批次 A
  const [inb1Result] = await conn.execute(
    `INSERT INTO inv_inbound_order
      (order_no, order_type, warehouse_id, warehouse_code, warehouse_name, supplier_id, supplier_name,
       po_id, po_no, grn_type, total_amount, total_quantity, status, qc_status, inbound_date,
       currency, exchange_rate, base_total_amount)
     VALUES (?, 'purchase', ?, ?, ?, ?, ?, ?, ?, 'po', ?, 1500, 'completed', 'pass', '2026-07-01', 'CNY', 1.0000, ?)`,
    ['INB-2026-001', whRaw.id, whRaw.warehouse_code, whRaw.warehouse_name,
     supplierInk.id, supplierInk.supplier_name, po1Id, 'PO-2026-001',
     po1LineAmount, po1LineAmount]
  );
  const inb1Id = inb1Result.insertId;

  await conn.execute(
    `INSERT INTO inv_inbound_item
      (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price,
       base_unit_price, base_amount, produce_date, expire_date)
     VALUES (?, ?, ?, ?, 'BATCH-20260701-A', 1500, ?, 85, ?, 85, ?, '2026-06-15', '2027-06-15')`,
    [inb1Id, matBlackInk.id, matBlackInk.material_name, matBlackInk.specification,
     matBlackInk.unit, po1LineAmount, po1LineAmount]
  );

  // 库存批次 A: 黑色油墨 1500kg @85
  await conn.execute(
    `INSERT INTO inv_inventory_batch
      (batch_no, material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty,
       unit, unit_price, produce_date, expire_date, inbound_date, status, inspection_status)
     VALUES ('BATCH-20260701-A', ?, ?, ?, ?, 1500, 1500, 0, ?, 85, '2026-06-15', '2027-06-15', '2026-07-01', 1, 'pass')`,
    [matBlackInk.id, matBlackInk.material_name, whRaw.id, whRaw.warehouse_name, matBlackInk.unit]
  );
  console.log(`  批次 A: BATCH-20260701-A, 黑色油墨 1500kg @85, 可用量=1500`);

  // 入库单 2: 白色油墨 → 批次 B (USD, base price = 12 * 7.2 = 86.4)
  const whiteInkBasePrice = round4(12 * USD_TO_CNY_RATE); // 86.4
  const [inb2Result] = await conn.execute(
    `INSERT INTO inv_inbound_order
      (order_no, order_type, warehouse_id, warehouse_code, warehouse_name, supplier_id, supplier_name,
       po_id, po_no, grn_type, total_amount, total_quantity, status, qc_status, inbound_date,
       currency, exchange_rate, base_total_amount)
     VALUES (?, 'purchase', ?, ?, ?, ?, ?, ?, ?, 'po', ?, 1000, 'completed', 'pass', '2026-07-02', 'USD', ?, ?)`,
    ['INB-2026-002', whRaw.id, whRaw.warehouse_code, whRaw.warehouse_name,
     supplierSpecial.id, supplierSpecial.supplier_name, po2Id, 'PO-2026-002',
     po2LineAmount, USD_TO_CNY_RATE, po2BaseTotal]
  );
  const inb2Id = inb2Result.insertId;

  await conn.execute(
    `INSERT INTO inv_inbound_item
      (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price,
       base_unit_price, base_amount, produce_date, expire_date)
     VALUES (?, ?, ?, ?, 'BATCH-20260701-B', 1000, ?, 12, ?, ?, ?, '2026-06-20', '2027-06-20')`,
    [inb2Id, matWhiteInk.id, matWhiteInk.material_name, matWhiteInk.specification,
     matWhiteInk.unit, po2LineAmount, whiteInkBasePrice, po2BaseTotal]
  );

  // 库存批次 B: 白色油墨 1000kg @86.4 (本位币单价)
  await conn.execute(
    `INSERT INTO inv_inventory_batch
      (batch_no, material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty,
       unit, unit_price, produce_date, expire_date, inbound_date, status, inspection_status)
     VALUES ('BATCH-20260701-B', ?, ?, ?, ?, 1000, 1000, 0, ?, ?, '2026-06-20', '2027-06-20', '2026-07-02', 1, 'pass')`,
    [matWhiteInk.id, matWhiteInk.material_name, whRaw.id, whRaw.warehouse_name, matWhiteInk.unit, whiteInkBasePrice]
  );
  console.log(`  批次 B: BATCH-20260701-B, 白色油墨 1000kg @${whiteInkBasePrice}(本位币), 可用量=1000`);

  // 入库单 3: 网版 → 批次 C
  const [inb3Result] = await conn.execute(
    `INSERT INTO inv_inbound_order
      (order_no, order_type, warehouse_id, warehouse_code, warehouse_name, supplier_id, supplier_name,
       po_id, po_no, grn_type, total_amount, total_quantity, status, qc_status, inbound_date,
       currency, exchange_rate, base_total_amount)
     VALUES (?, 'purchase', ?, ?, ?, ?, ?, ?, ?, 'po', ?, 500, 'completed', 'pass', '2026-07-03', 'CNY', 1.0000, ?)`,
    ['INB-2026-003', whRaw.id, whRaw.warehouse_code, whRaw.warehouse_name,
     supplierAdhesive.id, supplierAdhesive.supplier_name, po3Id, 'PO-2026-003',
     po3LineAmount, po3LineAmount]
  );
  const inb3Id = inb3Result.insertId;

  await conn.execute(
    `INSERT INTO inv_inbound_item
      (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price,
       base_unit_price, base_amount, produce_date, expire_date)
     VALUES (?, ?, ?, ?, 'BATCH-20260701-C', 500, ?, 50, ?, 50, ?, NULL, NULL)`,
    [inb3Id, matScreen.id, matScreen.material_name, matScreen.specification,
     matScreen.unit, po3LineAmount, po3LineAmount]
  );

  // 库存批次 C: 网版 500个 @50
  await conn.execute(
    `INSERT INTO inv_inventory_batch
      (batch_no, material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty,
       unit, unit_price, inbound_date, status, inspection_status)
     VALUES ('BATCH-20260701-C', ?, ?, ?, ?, 500, 500, 0, ?, 50, '2026-07-03', 1, 'pass')`,
    [matScreen.id, matScreen.material_name, whRaw.id, whRaw.warehouse_name, matScreen.unit]
  );
  console.log(`  批次 C: BATCH-20260701-C, 网版 500个 @50, 可用量=500`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤 9: 插入销售订单/生产工单/排程/领料单（FIFO 扣减）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━ 步骤 9: 插入生产链路（销售订单→工单→排程→领料） ━━━');

  // 销售订单 SO-2026-001
  const soAmount = 10000 * 0.8;  // 8000
  const soTax = round2(soAmount * TAX_RATE / 100);  // 1040
  const soGrand = round2(soAmount + soTax);  // 9040
  const [soResult] = await conn.execute(
    `INSERT INTO sal_order
      (order_no, order_date, customer_id, contact_name, total_amount, tax_amount, total_with_tax,
       base_total_amount, base_tax_amount, base_grand_total, currency, exchange_rate, delivery_date, status)
     VALUES (?, '2026-07-05', ?, '赵经理', ?, ?, ?, ?, ?, ?, 'CNY', 1.0000, '2026-07-25', 2)`,
    ['SO-2026-001', customer.id, soAmount, soTax, soGrand, soAmount, soTax, soGrand]
  );
  const soId = soResult.insertId;
  console.log(`  销售订单 SO-2026-001: 客户=${customer.customer_name}, 产品=空调控制面板标签 10000张 @0.80`);

  await conn.execute(
    `INSERT INTO sal_order_detail
      (order_id, material_id, material_name, quantity, unit, unit_price, tax_rate, amount, tax_amount, total_amount, delivery_date)
     VALUES (?, ?, ?, 10000, '张', 0.80, ?, ?, ?, ?, '2026-07-25')`,
    [soId, matProduct.id, matProduct.material_name, TAX_RATE, soAmount, soTax, soGrand]
  );

  // 生产工单 WO-2026-001
  const [woResult] = await conn.execute(
    `INSERT INTO prd_work_order
      (work_order_no, work_order_date, sales_order_id, material_id, plan_qty, unit,
       plan_start_date, plan_end_date, priority, status, remark)
     VALUES (?, '2026-07-06', ?, ?, 10000, '张', '2026-07-10', '2026-07-20', 1, 1, '测试工单-空调控制面板标签')`,
    ['WO-2026-001', soId, matProduct.id]
  );
  const woId = woResult.insertId;
  console.log(`  工单 WO-2026-001: 产品=空调控制面板标签, 计划=10000张, 状态=1(待生产)`);

  // 排程 SCH-2026-001
  await conn.execute(
    `INSERT INTO prd_schedule
      (schedule_no, work_order_id, work_order_no, order_id, order_no, product_id, product_code, product_name,
       workshop, planned_qty, completed_qty, planned_start, planned_end, priority, status, scheduler)
     VALUES (?, ?, 'WO-2026-001', ?, 'SO-2026-001', ?, ?, ?, '印刷车间', 10000, 0, '2026-07-10 08:00:00', '2026-07-20 17:00:00', 2, 1, '生产计划员')`,
    ['SCH-2026-001', woId, soId, matProduct.id, matProduct.material_code, matProduct.material_name]
  );
  console.log(`  排程 SCH-2026-001: 关联工单=WO-2026-001, 销售订单=SO-2026-001`);

  // 领料单 MR-2026-001（FIFO 扣减批次可用量）
  const [issueResult] = await conn.execute(
    `INSERT INTO prd_material_issue
      (issue_no, work_order_id, work_order_no, warehouse_id, issue_date, issue_type,
       operator_name, status, remark)
     VALUES (?, ?, 'WO-2026-001', ?, '2026-07-10', 'normal', '仓管员-张三', 2, 'FIFO领料-测试数据')`,
    ['MR-2026-001', woId, whRaw.id]
  );
  const issueId = issueResult.insertId;

  // 领料明细 1: 黑色油墨 300kg ← 批次 A (FIFO: A 是最早批次)
  await conn.execute(
    `INSERT INTO prd_material_issue_item
      (issue_id, material_id, material_code, material_name, required_qty, issued_qty, unit, batch_no)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'BATCH-20260701-A')`,
    [issueId, matBlackInk.id, matBlackInk.material_code, matBlackInk.material_name,
     PICK_BLACK_INK_QTY, PICK_BLACK_INK_QTY, matBlackInk.unit]
  );
  // FIFO 扣减批次 A 可用量: 1500 - 300 = 1200
  await conn.execute(
    `UPDATE inv_inventory_batch SET available_qty = available_qty - ?, version = version + 1
     WHERE batch_no = 'BATCH-20260701-A'`,
    [PICK_BLACK_INK_QTY]
  );
  console.log(`  领料 MR-2026-001 明细1: 黑色油墨 ${PICK_BLACK_INK_QTY}kg ← 批次A, 扣减后A=1200`);

  // 领料明细 2: 白色油墨 100kg ← 批次 B
  await conn.execute(
    `INSERT INTO prd_material_issue_item
      (issue_id, material_id, material_code, material_name, required_qty, issued_qty, unit, batch_no)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'BATCH-20260701-B')`,
    [issueId, matWhiteInk.id, matWhiteInk.material_code, matWhiteInk.material_name,
     PICK_WHITE_INK_QTY, PICK_WHITE_INK_QTY, matWhiteInk.unit]
  );
  // FIFO 扣减批次 B 可用量: 1000 - 100 = 900
  await conn.execute(
    `UPDATE inv_inventory_batch SET available_qty = available_qty - ?, version = version + 1
     WHERE batch_no = 'BATCH-20260701-B'`,
    [PICK_WHITE_INK_QTY]
  );
  console.log(`  领料 MR-2026-001 明细2: 白色油墨 ${PICK_WHITE_INK_QTY}kg ← 批次B, 扣减后B=900`);

  // 领料明细 3: 网版 200个 ← 批次 C
  await conn.execute(
    `INSERT INTO prd_material_issue_item
      (issue_id, material_id, material_code, material_name, required_qty, issued_qty, unit, batch_no)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'BATCH-20260701-C')`,
    [issueId, matScreen.id, matScreen.material_code, matScreen.material_name,
     PICK_SCREEN_QTY, PICK_SCREEN_QTY, matScreen.unit]
  );
  // FIFO 扣减批次 C 可用量: 500 - 200 = 300
  await conn.execute(
    `UPDATE inv_inventory_batch SET available_qty = available_qty - ?, version = version + 1
     WHERE batch_no = 'BATCH-20260701-C'`,
    [PICK_SCREEN_QTY]
  );
  console.log(`  领料 MR-2026-001 明细3: 网版 ${PICK_SCREEN_QTY}个 ← 批次C, 扣减后C=300`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤 10: 插入 HR 薪资数据
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━ 步骤 10: 插入 HR 薪资数据 ━━━');

  // 10a. 薪资标准表（hr_salary_standard）
  await conn.execute(
    `INSERT INTO hr_salary_standard
      (position_code, skill_level, base_salary, piece_rate_type, performance_base, effective_date, status)
     VALUES ('PRINTER', 3, ?, 'mixed', ?, '2026-01-01', 1)`,
    [HR_BASE_SALARY, HR_PERFORMANCE_SALARY]
  );
  console.log(`  薪资标准: 岗位=PRINTER, 基本工资=${HR_BASE_SALARY}, 绩效基数=${HR_PERFORMANCE_SALARY}`);

  // 10b. 计件单价表（hr_piece_rate）
  const pieceRates = [
    { processCode: 'PRINT',   unitPrice: 0.5 },
    { processCode: 'DIE_CUT', unitPrice: 0.3 },
    { processCode: 'INSPECT', unitPrice: 0.2 },
  ];
  for (const pr of pieceRates) {
    await conn.execute(
      `INSERT INTO hr_piece_rate (process_code, unit_price, unit, effective_date, status)
       VALUES (?, ?, '件', '2026-01-01', 1)`,
      [pr.processCode, pr.unitPrice]
    );
  }
  console.log(`  计件单价: PRINT=0.50, DIE_CUT=0.30, INSPECT=0.20`);

  // 10c. 薪资档案（hr_salary_profile）
  await conn.execute(
    `INSERT INTO hr_salary_profile
      (employee_id, salary_type, base_salary, social_insurance_base, housing_fund_rate, tax_deduction,
       bank_account, bank_name, effective_date, status, remark)
     VALUES (?, 'mixed', ?, ?, ?, ?, '6228480402564890018', '中国农业银行', '2026-01-01', 1, '测试薪资档案')`,
    [employee.id, HR_BASE_SALARY, HR_BASE_SALARY, HR_HOUSING_FUND_RATE, HR_TAX_DEDUCTION]
  );
  console.log(`  薪资档案: 员工=${employee.name}(id=${employee.id}), 基本工资=${HR_BASE_SALARY}, 社保基数=${HR_BASE_SALARY}, 公积金比例=${HR_HOUSING_FUND_RATE}%`);

  // 10d. 计件明细（hr_piece_work_detail）- 总产量 1266 件
  let totalPieceQty = 0;
  let totalPieceAmount = 0;
  for (const pw of PIECE_WORK_RECORDS) {
    const amount = round2(pw.quantity * pw.unitPrice);
    await conn.execute(
      `INSERT INTO hr_piece_work_detail
        (employee_id, work_date, process_code, product_code, quantity, defective_quantity, unit_price, amount, machine_id)
       VALUES (?, ?, ?, 'MAT011', ?, 0, ?, ?, 'PRN-001')`,
      [employee.id, pw.workDate, pw.processCode, pw.quantity, pw.unitPrice, amount]
    );
    totalPieceQty += pw.quantity;
    totalPieceAmount = round2(totalPieceAmount + amount);
  }
  console.log(`  计件明细: ${PIECE_WORK_RECORDS.length}条记录, 总产量=${totalPieceQty}件, 计件总额=${totalPieceAmount}元`);

  // 10e. 薪资计算（hr_salary_calculation）
  const socialInsurancePersonal = round2(HR_BASE_SALARY * HR_SOCIAL_INSURANCE_RATE); // 840
  const housingFundPersonal = round2(HR_BASE_SALARY * HR_HOUSING_FUND_RATE / 100);   // 960
  const grossPay = round2(HR_BASE_SALARY + totalPieceAmount + HR_PERFORMANCE_SALARY + HR_ALLOWANCES); // 10049.80
  const taxableIncome = Math.max(0, grossPay - HR_TAX_DEDUCTION - socialInsurancePersonal - housingFundPersonal);
  const individualTax = round2(taxableIncome * 0.10); // 324.98
  const totalDeduction = round2(socialInsurancePersonal + housingFundPersonal + individualTax); // 2124.98
  const netPay = round2(grossPay - totalDeduction); // 7924.82

  await conn.execute(
    `INSERT INTO hr_salary_calculation
      (employee_id, calc_month, base_salary, piece_salary, overtime_salary, performance_salary, allowances,
       social_insurance_personal, housing_fund_personal, individual_tax, attendance_deduction, other_deduction,
       gross_pay, total_deduction, net_pay, status, calc_log)
     VALUES (?, '2026-07', ?, ?, 0, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 'confirmed', ?)`,
    [
      employee.id, HR_BASE_SALARY, totalPieceAmount, HR_PERFORMANCE_SALARY, HR_ALLOWANCES,
      socialInsurancePersonal, housingFundPersonal, individualTax,
      grossPay, totalDeduction, netPay,
      `计件${totalPieceQty}件=${totalPieceAmount}元; 社保=${socialInsurancePersonal}(基数${HR_BASE_SALARY}*${HR_SOCIAL_INSURANCE_RATE*100}%); 公积金=${housingFundPersonal}(基数${HR_BASE_SALARY}*${HR_HOUSING_FUND_RATE}%); 个税=${individualTax}(应税${taxableIncome}*10%)`
    ]
  );
  console.log(`  薪资计算: 月份=2026-07, 基本工资=${HR_BASE_SALARY}, 计件工资=${totalPieceAmount}, 绩效=${HR_PERFORMANCE_SALARY}, 补贴=${HR_ALLOWANCES}`);
  console.log(`           社保个人=${socialInsurancePersonal}, 公积金个人=${housingFundPersonal}, 个税=${individualTax}`);
  console.log(`           应发=${grossPay}, 扣款合计=${totalDeduction}, 实发=${netPay}`);

  console.log('\n✅ 测试数据生成完成！');
  console.log('   运行 node scripts/test-data/03-validate-data.mjs 进行验证');

  await conn.end();
}

main().catch((e) => {
  console.error('❌ 数据生成失败:', e.message);
  console.error(e.stack);
  process.exit(1);
});
