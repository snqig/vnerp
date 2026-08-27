/**
 * VNERP 测试数据 - 阶段四：综合 ERP 演示数据生成
 *
 * 对应文档: docs/222.MD（ERP 各模块闭环演示数据）
 *
 * 覆盖 10 个模块的闭环数据：
 *   1. 采购管理 (pur_request / pur_purchase_order / pur_purchase_return)
 *   2. 仓储管理 (inv_inbound / inv_outbound / inv_inventory_batch / inv_transfer / inv_stocktaking)
 *   3. 大料分切 (inv_cutting_record / inv_cutting_detail)
 *   4. 生产管理 (prd_bom / prd_work_order / prd_schedule / prd_material_issue / prd_material_return / prd_finish_order / prd_work_report)
 *   5. 销售管理 (sal_order / sal_delivery / sal_return_order / sal_reconciliation)
 *   6. 印前管理 (prd_die / prd_ink / prd_screen_plate / prd_process_card)
 *   7. 质量管理 (qc_incoming_inspection / qc_inspection / qc_unqualified)
 *   8. 设备管理 (eqp_equipment / eqp_calibration / eqp_maintenance_record)
 *   9. 财务管理 (fin_receivable / fin_payable / fin_cost_record)
 *  10. 打样管理 (sal_sample_order / dcprint_ink_color)
 *
 * 闭环逻辑: 销售订单 → 工单 → 领料出库 → 完工入库 → 销售发货 → 财务对账
 *           采购申请 → 采购订单 → 来料检验 → 采购入库（批次追溯）
 *           大料分切：母卷 → 子料（窄幅 + 边角料）
 *
 * 用法: node scripts/test-data/04-generate-demo-data.mjs
 */
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
  multipleStatements: true,
};

// ═══════════════════════════════════════════════════════════
//  常量
// ═══════════════════════════════════════════════════════════
const USD_TO_CNY_RATE = 7.2;
const TAX_RATE = 13; // 13%

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

// 需要新增/确保存在的物料（用物料编码判断存在性，INSERT IGNORE 保留已有）
const MATERIALS = [
  { code: 'MAT030', name: 'PVC薄膜卷材(透明)', spec: '1000mm宽×1000M', unit: 'M', safety: 100, purchase: 8.50, type: 1 },
  { code: 'MAT031', name: 'PE薄膜卷材(白色)', spec: '1000mm宽×1000M', unit: 'M', safety: 80, purchase: 6.20, type: 1 },
  { code: 'MAT032', name: 'PVC薄膜窄幅(500mm)', spec: '500mm宽', unit: 'M', safety: 0, purchase: null, type: 1 },
  { code: 'MAT033', name: 'PVC薄膜边角料(200mm)', spec: '200mm宽', unit: 'M', safety: 0, purchase: null, type: 1 },
  { code: 'MAT034', name: 'PE薄膜窄幅(600mm)', spec: '600mm宽', unit: 'M', safety: 0, purchase: null, type: 1 },
  { code: 'MAT035', name: '丝印油墨-黑色(测试)', spec: '溶剂型', unit: 'kg', safety: 20, purchase: 35.00, type: 2 },
  { code: 'MAT011', name: '空调控制面板标签', spec: '120×80mm', unit: '张', safety: 0, purchase: null, type: 3 },
  { code: 'MAT012', name: '洗衣机控制面板', spec: '180×100mm', unit: '张', safety: 0, purchase: null, type: 3 },
  { code: 'MAT013', name: '手机电池标签', spec: '50×30mm', unit: '张', safety: 0, purchase: null, type: 3 },
];

// 清空表清单（按依赖顺序）
const TRUNCATE_TABLES = [
  'prd_process_card_material', 'prd_process_card',
  'prd_work_report', 'prd_finish_order',
  'prd_material_return_item', 'prd_material_return',
  'prd_material_issue_item', 'prd_material_issue',
  'prd_schedule', 'prd_bom_detail', 'prd_bom', 'prd_work_order',
  'prd_die', 'prd_ink', 'prd_screen_plate',
  'inv_cutting_detail', 'inv_cutting_record',
  'inv_stocktaking_item', 'inv_stocktaking',
  'inv_transfer_item', 'inv_transfer_order',
  'inv_outbound_item', 'inv_outbound_order',
  'inv_inventory_batch',
  'inv_inbound_item', 'inv_inbound_order',
  'sal_return_order_item', 'sal_return_detail', 'sal_return_order',
  'sal_delivery_detail', 'sal_delivery',
  'sal_reconciliation', 'sal_order_detail', 'sal_order',
  'sal_sample_order',
  'pur_purchase_return_line', 'pur_purchase_return',
  'pur_request_detail', 'pur_request',
  'pur_purchase_order_line', 'pur_purchase_order',
  'qc_unqualified', 'qc_inspection',
  'qc_incoming_inspection_item', 'qc_incoming_inspection',
  'eqp_maintenance_record', 'eqp_calibration', 'eqp_equipment',
  'fin_cost_record', 'fin_payable', 'fin_receivable',
  'fin_voucher_line', 'fin_voucher',
  'dcprint_ink_color',
  'sys_exchange_rate',
];

// ═══════════════════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════════════════
async function getRow(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  if (rows.length === 0) throw new Error(`查询无结果: ${sql} | params=${JSON.stringify(params)}`);
  return rows[0];
}

async function getValue(conn, sql, params = []) {
  const row = await getRow(conn, sql, params);
  return Object.values(row)[0];
}

async function tableCount(conn, table) {
  return Number(await getValue(conn, `SELECT COUNT(*) AS c FROM \`${table}\``));
}

// ═══════════════════════════════════════════════════════════
//  主流程
// ═══════════════════════════════════════════════════════════
async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  // 统计计数
  const stats = { materials: 0, po: 0, pr: 0, prt: 0, inb: 0, out: 0, batch: 0, tf: 0, ct: 0,
    cut: 0, bom: 0, wo: 0, sch: 0, mi: 0, rt: 0, fin: 0, wr: 0, pc: 0,
    die: 0, ink: 0, sp: 0, so: 0, dl: 0, sr: 0, rec: 0, spl: 0,
    iqc: 0, qci: 0, unq: 0, eq: 0, cal: 0, mtn: 0, ar: 0, ap: 0, cost: 0, cc: 0 };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤 0: 新增/确保物料存在（INSERT IGNORE，保留已有）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('━━━ 步骤 0: 确保物料主数据存在 ━━━');
  for (const m of MATERIALS) {
    const [r] = await conn.execute(
      `INSERT IGNORE INTO inv_material
        (material_code, material_name, specification, material_type, unit, safety_stock, purchase_price, status, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [m.code, m.name, m.spec, m.type, m.unit, m.safety, m.purchase]
    );
    if (r.affectedRows > 0) console.log(`  [新增] ${m.code} ${m.name}`);
    else console.log(`  [保留] ${m.code} ${m.name}`);
  }
  stats.materials = MATERIALS.length;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤 1: 动态查询主数据 ID
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━ 步骤 1: 动态查询主数据 ━━━');

  // 物料映射
  const matRows = await conn.execute(
    `SELECT id, material_code, material_name, specification, unit, purchase_price
     FROM inv_material WHERE material_code IN (${MATERIALS.map(() => '?').join(',')}) AND deleted = 0`,
    MATERIALS.map(m => m.code)
  );
  const MAT = {};
  for (const r of matRows[0]) MAT[r.material_code] = r;
  console.log(`  物料: ${Object.keys(MAT).map(k => `${k}(id=${MAT[k].id})`).join(', ')}`);

  // 仓库映射
  const whRows = (await conn.execute(
    `SELECT id, warehouse_code, warehouse_name FROM inv_warehouse
     WHERE warehouse_code IN ('WH001','WH002','WH003','WH005') AND deleted = 0`
  ))[0];
  const WH = {};
  for (const r of whRows) WH[r.warehouse_code] = r;
  console.log(`  仓库: ${Object.keys(WH).map(k => `${k}(id=${WH[k].id})`).join(', ')}`);

  // 客户映射
  const custRows = (await conn.execute(
    `SELECT id, customer_code, customer_name FROM crm_customer
     WHERE customer_code IN ('C001','C002','C003') AND deleted = 0`
  ))[0];
  const CUST = {};
  for (const r of custRows) CUST[r.customer_code] = r;
  console.log(`  客户: ${Object.keys(CUST).map(k => `${k}(id=${CUST[k].id},${CUST[k].customer_name})`).join(', ')}`);

  // 供应商映射
  const supRows = (await conn.execute(
    `SELECT id, supplier_code, supplier_name FROM pur_supplier
     WHERE supplier_code IN ('SUP001','SUP002','SUP004') AND deleted = 0`
  ))[0];
  const SUP = {};
  for (const r of supRows) SUP[r.supplier_code] = r;
  console.log(`  供应商: ${Object.keys(SUP).map(k => `${k}(id=${SUP[k].id},${SUP[k].supplier_name})`).join(', ')}`);

  // 员工
  const emp = await getRow(conn, `SELECT id, name, dept_name FROM sys_employee WHERE id = 1001`);
  console.log(`  员工: ${emp.name}(id=${emp.id}, ${emp.dept_name})`);

  // inv_material_label 是否有数据（用于分切 source_label_id）
  const labelCount = await tableCount(conn, 'inv_material_label');
  console.log(`  物料标签表 inv_material_label 行数: ${labelCount}（${labelCount === 0 ? '将用批次ID作为label占位' : '将用标签ID'}）`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤 2: 清空相关表（禁用外键检查）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━ 步骤 2: 清空相关表 ━━━');
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of TRUNCATE_TABLES) {
    await conn.execute(`TRUNCATE TABLE \`${t}\``);
  }
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  console.log(`  已清空 ${TRUNCATE_TABLES.length} 张表`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 写入汇率
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await conn.execute(
    `INSERT INTO sys_exchange_rate (from_currency, to_currency, rate, rate_date, source, remark)
     VALUES ('USD', 'CNY', ?, '2026-07-01', 'manual', '测试数据-美元兑人民币汇率')`,
    [USD_TO_CNY_RATE]
  );
  console.log(`  汇率写入: USD→CNY = ${USD_TO_CNY_RATE}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 事务包裹所有 INSERT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await conn.beginTransaction();
  console.log('\n━━━ 事务已开启，开始插入闭环数据 ━━━');

  try {
    // ═══ 5. 销售订单（先建，工单/发货/退货依赖） ═══
    console.log('\n── 模块5: 销售管理 - 销售订单 ──');
    // SO-2026-101: USD, 空调标签 5000 @0.50
    const so1Amt = 5000 * 0.50; // 2500 USD
    const so1BaseTotal = round2(so1Amt * USD_TO_CNY_RATE); // 18000
    const [so1r] = await conn.execute(
      `INSERT INTO sal_order
        (order_no, order_date, customer_id, contact_name, total_amount, tax_amount, total_with_tax,
         base_total_amount, base_tax_amount, base_grand_total, currency, exchange_rate, delivery_date, status)
       VALUES ('SO-2026-101', '2026-07-01', ?, '美的-赵经理', ?, 0, ?, ?, 0, ?, 'USD', ?, '2026-07-15', 3)`,
      [CUST.C001.id, so1Amt, so1Amt, so1BaseTotal, so1BaseTotal, USD_TO_CNY_RATE]
    );
    const so1Id = so1r.insertId;
    await conn.execute(
      `INSERT INTO sal_order_detail
        (order_id, material_id, material_name, quantity, unit, unit_price, tax_rate, amount, tax_amount, total_amount, delivery_date)
       VALUES (?, ?, ?, 5000, '张', 0.50, 0, ?, 0, ?, '2026-07-15')`,
      [so1Id, MAT.MAT011.id, MAT.MAT011.material_name, so1Amt, so1Amt]
    );
    console.log(`  SO-2026-101 (USD): 美的集团 空调标签 5000张 @0.50, total=${so1Amt}USD, base=${so1BaseTotal}CNY`);

    // SO-2026-102: CNY, 洗衣机面板 3000 @1.20
    const so2Amt = 3000 * 1.20; // 3600
    const [so2r] = await conn.execute(
      `INSERT INTO sal_order
        (order_no, order_date, customer_id, contact_name, total_amount, tax_amount, total_with_tax,
         base_total_amount, base_tax_amount, base_grand_total, currency, exchange_rate, delivery_date, status)
       VALUES ('SO-2026-102', '2026-07-08', ?, '格力-李经理', ?, 0, ?, ?, 0, ?, 'CNY', 1.0000, '2026-07-20', 2)`,
      [CUST.C002.id, so2Amt, so2Amt, so2Amt, so2Amt]
    );
    const so2Id = so2r.insertId;
    await conn.execute(
      `INSERT INTO sal_order_detail
        (order_id, material_id, material_name, quantity, unit, unit_price, tax_rate, amount, tax_amount, total_amount, delivery_date)
       VALUES (?, ?, ?, 3000, '张', 1.20, 0, ?, 0, ?, '2026-07-20')`,
      [so2Id, MAT.MAT012.id, MAT.MAT012.material_name, so2Amt, so2Amt]
    );
    console.log(`  SO-2026-102 (CNY): 格力电器 洗衣机面板 3000张 @1.20, total=${so2Amt}`);

    // SO-2026-103: CNY, 手机电池标签 10000 @0.15
    const so3Amt = 10000 * 0.15; // 1500
    const [so3r] = await conn.execute(
      `INSERT INTO sal_order
        (order_no, order_date, customer_id, contact_name, total_amount, tax_amount, total_with_tax,
         base_total_amount, base_tax_amount, base_grand_total, currency, exchange_rate, delivery_date, status)
       VALUES ('SO-2026-103', '2026-07-14', ?, '海尔-王经理', ?, 0, ?, ?, 0, ?, 'CNY', 1.0000, '2026-07-28', 1)`,
      [CUST.C003.id, so3Amt, so3Amt, so3Amt, so3Amt]
    );
    const so3Id = so3r.insertId;
    await conn.execute(
      `INSERT INTO sal_order_detail
        (order_id, material_id, material_name, quantity, unit, unit_price, tax_rate, amount, tax_amount, total_amount, delivery_date)
       VALUES (?, ?, ?, 10000, '张', 0.15, 0, ?, 0, ?, '2026-07-28')`,
      [so3Id, MAT.MAT013.id, MAT.MAT013.material_name, so3Amt, so3Amt]
    );
    console.log(`  SO-2026-103 (CNY): 海尔集团 手机电池标签 10000张 @0.15, total=${so3Amt}`);
    stats.so = 3;

    // ═══ 1. 采购管理 ═══
    console.log('\n── 模块1: 采购管理 ──');

    // 采购申请 3 条
    const prData = [
      { no: 'PR-2026-101', mat: 'MAT035', qty: 50, unit: 'kg', purpose: '工单WO-2026-101', status: 2, date: '2026-07-02' },
      { no: 'PR-2026-102', mat: 'MAT030', qty: 500, unit: 'M', purpose: '工单WO-2026-102', status: 1, date: '2026-07-10' },
      { no: 'PR-2026-103', mat: 'MAT031', qty: 300, unit: 'M', purpose: '工单WO-2026-103', status: 2, date: '2026-07-12' },
    ];
    for (const p of prData) {
      const [r] = await conn.execute(
        `INSERT INTO pur_request
          (request_no, request_date, request_type, request_dept, requester_id, requester_name,
           total_amount, currency, status, priority, expected_date, remark)
         VALUES (?, ?, 'material', '生产部', ?, ?, 0, 'CNY', ?, 1, '2026-07-20', ?)`,
        [p.no, p.date, emp.id, emp.name, p.status, `采购申请-${p.purpose}`]
      );
      await conn.execute(
        `INSERT INTO pur_request_detail
          (request_id, material_id, quantity, unit, required_date, purpose, remark)
         VALUES (?, ?, ?, ?, '2026-07-20', ?, '')`,
        [r.insertId, MAT[p.mat].id, p.qty, p.unit, p.purpose]
      );
      console.log(`  ${p.no}: ${MAT[p.mat].material_name} ${p.qty}${p.unit}, 用途=${p.purpose}, status=${p.status}`);
    }
    stats.pr = 3;

    // 采购订单 3 条（CNY，base = 原币）
    const poData = [
      { no: 'PO-2026-101', sup: 'SUP004', mat: 'MAT030', qty: 1000, price: 8.50, date: '2026-06-28', delivery: '2026-07-01' },
      { no: 'PO-2026-102', sup: 'SUP001', mat: 'MAT031', qty: 800, price: 6.20, date: '2026-06-30', delivery: '2026-07-03' },
      { no: 'PO-2026-103', sup: 'SUP002', mat: 'MAT035', qty: 50, price: 35.00, date: '2026-07-05', delivery: '2026-07-12' },
    ];
    const PO = {};
    for (const p of poData) {
      const lineAmt = round2(p.qty * p.price);
      const taxAmt = round2(lineAmt * TAX_RATE / 100);
      const grand = round2(lineAmt + taxAmt);
      const [r] = await conn.execute(
        `INSERT INTO pur_purchase_order
          (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date,
           currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total,
           base_total_amount, base_tax_amount, base_grand_total, status, payment_terms)
         VALUES (?, ?, ?, ?, ?, ?, 'CNY', 1.0000, ?, ?, ?, ?, ?, ?, ?, ?, 20, '月结30天')`,
        [p.no, SUP[p.sup].id, SUP[p.sup].supplier_name, SUP[p.sup].supplier_code,
         p.date, p.delivery, lineAmt, p.qty, TAX_RATE, taxAmt, grand, lineAmt, taxAmt, grand]
      );
      const poId = r.insertId;
      PO[p.no] = { id: poId, ...p, lineAmt, taxAmt, grand };
      await conn.execute(
        `INSERT INTO pur_purchase_order_line
          (po_id, line_no, material_id, material_code, material_name, material_spec, unit,
           order_qty, unit_price, amount, tax_rate, tax_amount, line_total,
           base_unit_price, base_amount, base_tax_amount, base_line_total, require_date)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [poId, MAT[p.mat].id, MAT[p.mat].material_code, MAT[p.mat].material_name, MAT[p.mat].specification,
         MAT[p.mat].unit, p.qty, p.price, lineAmt, TAX_RATE, taxAmt, grand,
         p.price, lineAmt, taxAmt, grand, p.delivery]
      );
      console.log(`  ${p.no}: ${SUP[p.sup].supplier_name} ${MAT[p.mat].material_name} ${p.qty}${MAT[p.mat].unit} @${p.price}, total=${lineAmt}, status=20(已收货)`);
    }
    stats.po = 3;

    // 采购退货 1 条（PO-2026-101, PVC 50M, 品质不良）
    const prtAmt = round2(50 * 8.50); // 425
    const [prtR] = await conn.execute(
      `INSERT INTO pur_purchase_return
        (return_no, status, order_id, order_no, supplier_id, supplier_name, warehouse_id,
         receipt_no, reason, return_date, total_amount, remark)
       VALUES ('PRT-2026-101', 2, ?, 'PO-2026-101', ?, ?, ?, 'INB-2026-101', '品质不良', '2026-07-02', ?, '测试数据-采购退货')`,
      [PO['PO-2026-101'].id, SUP.SUP004.id, SUP.SUP004.supplier_name, WH.WH001.id, prtAmt]
    );
    await conn.execute(
      `INSERT INTO pur_purchase_return_line
        (return_id, line_no, material_id, material_code, material_name, material_spec, unit,
         quantity, unit_price, amount, batch_no, reason, remark)
       VALUES (?, 1, ?, ?, ?, ?, ?, 50, 8.50, ?, 'B20260701-PVC', '品质不良', '')`,
      [prtR.insertId, MAT.MAT030.id, MAT.MAT030.material_code, MAT.MAT030.material_name, MAT.MAT030.specification,
       MAT.MAT030.unit, prtAmt]
    );
    console.log(`  PRT-2026-101: 关联PO-2026-101, PVC薄膜 50M, 原因=品质不良, status=2(已完成)`);
    stats.prt = 1;

    // ═══ 2. 仓储管理 ═══
    console.log('\n── 模块2: 仓储管理 ──');

    // 入库单 3 条 + 库存批次
    const inbData = [
      { no: 'INB-2026-101', po: 'PO-2026-101', wh: 'WH001', mat: 'MAT030', qty: 1000, price: 8.50, batch: 'B20260701-PVC', date: '2026-07-01', sup: 'SUP004' },
      { no: 'INB-2026-102', po: 'PO-2026-102', wh: 'WH001', mat: 'MAT031', qty: 800, price: 6.20, batch: 'B20260703-PE', date: '2026-07-03', sup: 'SUP001' },
      { no: 'INB-2026-103', po: 'PO-2026-103', wh: 'WH005', mat: 'MAT035', qty: 50, price: 35.00, batch: 'B20260705-INK', date: '2026-07-05', sup: 'SUP002' },
    ];
    for (const i of inbData) {
      const total = round2(i.qty * i.price);
      await conn.execute(
        `INSERT INTO inv_inbound_order
          (order_no, order_type, warehouse_id, warehouse_code, warehouse_name, supplier_id, supplier_name,
           po_id, po_no, grn_type, total_amount, total_quantity, status, qc_status, inbound_date,
           currency, exchange_rate, base_total_amount)
         VALUES (?, 'purchase', ?, ?, ?, ?, ?, ?, ?, 'po', ?, ?, 'completed', 'pass', ?, 'CNY', 1.0000, ?)`,
        [i.no, WH[i.wh].id, WH[i.wh].warehouse_code, WH[i.wh].warehouse_name,
         SUP[i.sup].id, SUP[i.sup].supplier_name, PO[i.po].id, i.po, total, i.qty, i.date, total]
      );
      const inbId = (await getRow(conn, `SELECT id FROM inv_inbound_order WHERE order_no = ?`, [i.no])).id;
      await conn.execute(
        `INSERT INTO inv_inbound_item
          (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price,
           base_unit_price, base_amount, produce_date, expire_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-06-15', '2027-06-15')`,
        [inbId, MAT[i.mat].id, MAT[i.mat].material_name, MAT[i.mat].specification,
         i.batch, i.qty, MAT[i.mat].unit, i.price, total, i.price, total]
      );
      console.log(`  ${i.no}: 采购入库 ${MAT[i.mat].material_name} ${i.qty}${MAT[i.mat].unit} @${i.price}, 批次=${i.batch}, qc=pass`);
    }
    stats.inb = 3;

    // 库存批次 4 条（available_qty 为反映所有事务后的最终值）
    const batchData = [
      { batch: 'B20260701-PVC', mat: 'MAT030', wh: 'WH001', qty: 1000, avail: 550, price: 8.50, date: '2026-07-01' },
      { batch: 'B20260703-PE', mat: 'MAT031', wh: 'WH001', qty: 800, avail: 450, price: 6.20, date: '2026-07-03' },
      { batch: 'B20260705-INK', mat: 'MAT035', wh: 'WH005', qty: 50, avail: 50, price: 35.00, date: '2026-07-05' },
      { batch: 'B20260710-FIN', mat: 'MAT011', wh: 'WH003', qty: 5000, avail: 2000, price: 0.50, date: '2026-07-10' },
    ];
    const BATCH = {};
    for (const b of batchData) {
      const [r] = await conn.execute(
        `INSERT INTO inv_inventory_batch
          (batch_no, material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty,
           unit, unit_price, produce_date, expire_date, inbound_date, status, inspection_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, '2026-06-15', '2027-06-15', ?, 1, 'pass')`,
        [b.batch, MAT[b.mat].id, MAT[b.mat].material_name, WH[b.wh].id, WH[b.wh].warehouse_name,
         b.qty, b.avail, MAT[b.mat].unit, b.price, b.date]
      );
      BATCH[b.batch] = { id: r.insertId, ...b };
      console.log(`  批次 ${b.batch}: ${MAT[b.mat].material_name} ${WH[b.wh].warehouse_name}, qty=${b.qty}, available=${b.avail} @${b.price}`);
    }
    stats.batch = 4;

    // 出库单 3 条
    const outData = [
      { no: 'OUT-2026-101', type: 'production', wh: 'WH001', mat: 'MAT030', qty: 200, price: 8.50, batch: 'B20260701-PVC', date: '2026-07-05' },
      { no: 'OUT-2026-102', type: 'production', wh: 'WH001', mat: 'MAT031', qty: 150, price: 6.20, batch: 'B20260703-PE', date: '2026-07-05' },
      { no: 'OUT-2026-103', type: 'sale', wh: 'WH003', mat: 'MAT011', qty: 3000, price: 0.50, batch: 'B20260710-FIN', date: '2026-07-12' },
    ];
    for (const o of outData) {
      const amt = round2(o.qty * o.price);
      await conn.execute(
        `INSERT INTO inv_outbound_order
          (order_no, order_date, outbound_type, warehouse_id, warehouse_code, warehouse_name,
           total_qty, total_amount, currency, status, operator_name, audit_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CNY', 'completed', '张三', 'approved')`,
        [o.no, o.date, o.type, WH[o.wh].id, WH[o.wh].warehouse_code, WH[o.wh].warehouse_name,
         o.qty, amt]
      );
      const outId = (await getRow(conn, `SELECT id FROM inv_outbound_order WHERE order_no = ?`, [o.no])).id;
      await conn.execute(
        `INSERT INTO inv_outbound_item
          (order_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount, batch_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [outId, MAT[o.mat].id, MAT[o.mat].material_name, MAT[o.mat].specification,
         o.qty, MAT[o.mat].unit, o.price, amt, o.batch]
      );
      console.log(`  ${o.no}: ${o.type} ${MAT[o.mat].material_name} ${o.qty}${MAT[o.mat].unit}, 批次=${o.batch}`);
    }
    stats.out = 3;

    // 调拨单 1 条
    const tfAmt = round2(300 * 8.50);
    await conn.execute(
      `INSERT INTO inv_transfer_order
        (transfer_no, type, from_warehouse_id, to_warehouse_id, status, total_qty, total_amount, remark)
       VALUES ('TF-2026-101', 1, ?, ?, 1, 300, ?, 'WH001→WH002 调拨测试')`,
      [WH.WH001.id, WH.WH002.id, tfAmt]
    );
    const tfId = (await getRow(conn, `SELECT id FROM inv_transfer_order WHERE transfer_no = 'TF-2026-101'`)).id;
    await conn.execute(
      `INSERT INTO inv_transfer_item
        (transfer_id, material_id, material_code, material_name, batch_no, quantity, out_quantity, in_quantity, unit, unit_price, amount)
       VALUES (?, ?, ?, ?, 'B20260701-PVC', 300, 300, 0, 'M', 8.50, ?)`,
      [tfId, MAT.MAT030.id, MAT.MAT030.material_code, MAT.MAT030.material_name, tfAmt]
    );
    console.log(`  TF-2026-101: WH001→WH002 PVC薄膜 300M, type=1, status=1`);
    stats.tf = 1;

    // 盘点单 2 条
    const ctData = [
      { no: 'CT-2026-101', wh: 'WH001', mat: 'MAT030', sys: 550, actual: 548, diff: -2, unit: 'M', batch: 'B20260701-PVC' },
      { no: 'CT-2026-102', wh: 'WH003', mat: 'MAT011', sys: 2000, actual: 2005, diff: 5, unit: '张', batch: 'B20260710-FIN' },
    ];
    for (const c of ctData) {
      await conn.execute(
        `INSERT INTO inv_stocktaking
          (taking_no, taking_type, warehouse_id, status, taking_date, operator_name)
         VALUES (?, 1, ?, 2, '2026-07-15', '张三')`,
        [c.no, WH[c.wh].id]
      );
      const ctId = (await getRow(conn, `SELECT id FROM inv_stocktaking WHERE taking_no = ?`, [c.no])).id;
      await conn.execute(
        `INSERT INTO inv_stocktaking_item
          (taking_id, material_id, material_code, material_name, system_qty, actual_qty, diff_qty, unit, batch_no)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ctId, MAT[c.mat].id, MAT[c.mat].material_code, MAT[c.mat].material_name, c.sys, c.actual, c.diff, c.unit, c.batch]
      );
      console.log(`  ${c.no}: ${WH[c.wh].warehouse_name} ${MAT[c.mat].material_name}, 账面=${c.sys}, 实盘=${c.actual}, 差异=${c.diff}`);
    }
    stats.ct = 2;

    // ═══ 3. 大料分切 ═══
    console.log('\n── 模块3: 大料分切 ──');
    // label 占位 ID：inv_material_label 为空时用批次 ID
    const labelPlaceholder = (batchId) => labelCount > 0 ? null : batchId;
    const cutData = [
      {
        no: 'SP-2026-101', srcBatch: 'B20260701-PVC', srcLabelNo: 'B20260701-PVC',
        origW: 1000, cutW: 700, remainW: 300, cutStr: '500+200', date: '2026-07-06',
        details: [
          { no: 'B20260701-PVC-N1', width: 500, seq: 1 },
          { no: 'B20260701-PVC-N2', width: 200, seq: 2 },
        ],
      },
      {
        no: 'SP-2026-102', srcBatch: 'B20260703-PE', srcLabelNo: 'B20260703-PE',
        origW: 1000, cutW: 600, remainW: 400, cutStr: '600', date: '2026-07-07',
        details: [{ no: 'B20260703-PE-N1', width: 600, seq: 1 }],
      },
      {
        no: 'SP-2026-103', srcBatch: 'B20260701-PVC', srcLabelNo: 'B20260701-PVC',
        origW: 1000, cutW: 500, remainW: 500, cutStr: '500', date: '2026-07-08',
        details: [{ no: 'B20260701-PVC-N3', width: 500, seq: 1 }],
      },
    ];
    for (const c of cutData) {
      const srcBatchId = BATCH[c.srcBatch].id;
      const srcLabelId = labelCount > 0 ? srcBatchId : srcBatchId; // 无标签表时用批次ID占位
      await conn.execute(
        `INSERT INTO inv_cutting_record
          (record_no, source_label_id, source_label_no, cut_width_str, original_width, cut_total_width, remain_width,
           operator_id, operator_name, cut_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [c.no, srcLabelId, c.srcLabelNo, c.cutStr, c.origW, c.cutW, c.remainW, emp.id, emp.name, `${c.date} 10:00:00`]
      );
      const cutId = (await getRow(conn, `SELECT id FROM inv_cutting_record WHERE record_no = ?`, [c.no])).id;
      for (const d of c.details) {
        await conn.execute(
          `INSERT INTO inv_cutting_detail
            (record_id, new_label_id, new_label_no, cut_width, sequence)
           VALUES (?, ?, ?, ?, ?)`,
          [cutId, srcBatchId + d.seq, d.no, d.width, d.seq]
        );
      }
      console.log(`  ${c.no}: 母卷=${c.srcLabelNo} (宽${c.origW}) → 分切${c.cutW} + 剩余${c.remainW}, ${c.details.length}条子料`);
    }
    stats.cut = 3;

    // ═══ 4. 生产管理 ═══
    console.log('\n── 模块4: 生产管理 ──');

    // BOM 1 套
    const [bomR] = await conn.execute(
      `INSERT INTO prd_bom (bom_name, product_id, version, total_cost, status, remark)
       VALUES ('BOM-101 空调控制面板标签', ?, '1.0', 0, 1, '空调标签BOM')`,
      [MAT.MAT011.id]
    );
    const bomId = bomR.insertId;
    const bomDetails = [
      { mat: 'MAT030', qty: 0.04, unit: 'M', loss: 3, type: 1 },
      { mat: 'MAT031', qty: 0.03, unit: 'M', loss: 2, type: 1 },
      { mat: 'MAT035', qty: 0.001, unit: 'kg', loss: 5, type: 3 },
    ];
    for (const d of bomDetails) {
      await conn.execute(
        `INSERT INTO prd_bom_detail
          (bom_id, material_id, material_name, quantity, unit, loss_rate, unit_cost, total_cost, item_type)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
        [bomId, MAT[d.mat].id, MAT[d.mat].material_name, d.qty, d.unit, d.loss, d.type]
      );
    }
    console.log(`  BOM-101: 产品=${MAT.MAT011.material_name}, version=1.0, ${bomDetails.length}条明细(PVC/PE/油墨)`);
    stats.bom = 1;

    // 工单 3 条
    const woData = [
      { no: 'WO-2026-101', mat: 'MAT011', so: so1Id, soNo: 'SO-2026-101', plan: 5000, completed: 5000, status: 3, start: '2026-07-05', end: '2026-07-10' },
      { no: 'WO-2026-102', mat: 'MAT012', so: so2Id, soNo: 'SO-2026-102', plan: 3000, completed: 1500, status: 2, start: '2026-07-12', end: '2026-07-18' },
      { no: 'WO-2026-103', mat: 'MAT013', so: so3Id, soNo: 'SO-2026-103', plan: 10000, completed: 0, status: 1, start: '2026-07-20', end: '2026-07-25' },
    ];
    const WO = {};
    for (const w of woData) {
      const [r] = await conn.execute(
        `INSERT INTO prd_work_order
          (work_order_no, work_order_date, sales_order_id, material_id, plan_qty, completed_qty, unit,
           plan_start_date, plan_end_date, priority, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, '张', ?, ?, 2, ?, ?)`,
        [w.no, w.start, w.so, MAT[w.mat].id, w.plan, w.completed, w.start, w.end, w.status, `测试工单-${MAT[w.mat].material_name}`]
      );
      WO[w.no] = { id: r.insertId, ...w };
      console.log(`  ${w.no}: ${MAT[w.mat].material_name}, 计划=${w.plan}张, 状态=${w.status}, 关联=${w.soNo}`);
    }
    stats.wo = 3;

    // 排产 3 条
    const schData = [
      { no: 'SCH-2026-101', wo: 'WO-2026-101', so: so1Id, soNo: 'SO-2026-101', mat: 'MAT011', plan: 5000, done: 5000, status: 3, start: '2026-07-05 08:00:00', end: '2026-07-10 17:00:00' },
      { no: 'SCH-2026-102', wo: 'WO-2026-102', so: so2Id, soNo: 'SO-2026-102', mat: 'MAT012', plan: 3000, done: 1500, status: 2, start: '2026-07-12 08:00:00', end: '2026-07-18 17:00:00' },
      { no: 'SCH-2026-103', wo: 'WO-2026-103', so: so3Id, soNo: 'SO-2026-103', mat: 'MAT013', plan: 10000, done: 0, status: 1, start: '2026-07-20 08:00:00', end: '2026-07-25 17:00:00' },
    ];
    for (const s of schData) {
      await conn.execute(
        `INSERT INTO prd_schedule
          (schedule_no, order_id, order_no, work_order_id, work_order_no, product_id, product_code, product_name,
           workshop, planned_qty, completed_qty, planned_start, planned_end, priority, status, scheduler)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'printing', ?, ?, ?, ?, 2, ?, '生产计划员')`,
        [s.no, s.so, s.soNo, WO[s.wo].id, s.wo, MAT[s.mat].id, MAT[s.mat].material_code, MAT[s.mat].material_name,
         s.plan, s.done, s.start, s.end, s.status]
      );
      console.log(`  ${s.no}: 关联${s.wo}+${s.soNo}, 印刷车间, ${s.plan}张, status=${s.status}`);
    }
    stats.sch = 3;

    // 领料单 2 条
    const miData = [
      { no: 'MR-2026-101', wo: 'WO-2026-101', date: '2026-07-05', items: [
        { mat: 'MAT030', qty: 200, unit: 'M', batch: 'B20260701-PVC' },
        { mat: 'MAT031', qty: 150, unit: 'M', batch: 'B20260703-PE' },
      ]},
      { no: 'MR-2026-102', wo: 'WO-2026-102', date: '2026-07-12', items: [
        { mat: 'MAT030', qty: 150, unit: 'M', batch: 'B20260701-PVC' },
      ]},
    ];
    for (const m of miData) {
      await conn.execute(
        `INSERT INTO prd_material_issue
          (issue_no, work_order_id, work_order_no, warehouse_id, issue_date, issue_type, operator_name, status, remark)
         VALUES (?, ?, ?, ?, ?, 'normal', '张三', 2, '生产领料-测试')`,
        [m.no, WO[m.wo].id, m.wo, WH.WH001.id, m.date]
      );
      const miId = (await getRow(conn, `SELECT id FROM prd_material_issue WHERE issue_no = ?`, [m.no])).id;
      for (const it of m.items) {
        await conn.execute(
          `INSERT INTO prd_material_issue_item
            (issue_id, material_id, material_code, material_name, required_qty, issued_qty, unit, batch_no)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [miId, MAT[it.mat].id, MAT[it.mat].material_code, MAT[it.mat].material_name, it.qty, it.qty, it.unit, it.batch]
        );
      }
      console.log(`  ${m.no}: 关联${m.wo}, ${m.items.length}条明细, status=2(已发料)`);
    }
    stats.mi = 2;

    // 退料单 1 条
    await conn.execute(
      `INSERT INTO prd_material_return
        (return_no, work_order_id, work_order_no, warehouse_id, return_date, operator_name, status, remark)
       VALUES ('RT-2026-101', ?, 'WO-2026-101', ?, '2026-07-10', '张三', 1, '余料退回')`,
      [WO['WO-2026-101'].id, WH.WH001.id]
    );
    const rtId = (await getRow(conn, `SELECT id FROM prd_material_return WHERE return_no = 'RT-2026-101'`)).id;
    await conn.execute(
      `INSERT INTO prd_material_return_item
        (return_id, material_id, material_code, material_name, return_qty, unit, batch_no)
       VALUES (?, ?, ?, ?, 10, 'M', 'B20260701-PVC')`,
      [rtId, MAT.MAT030.id, MAT.MAT030.material_code, MAT.MAT030.material_name]
    );
    console.log(`  RT-2026-101: 关联WO-2026-101, PVC 10M, 原因=余料退回, status=1`);
    stats.rt = 1;

    // 完工入库 2 条
    const finData = [
      { no: 'FIN-2026-101', wo: 'WO-2026-101', wh: 'WH003', qualified: 5000, defective: 0, status: 2 },
      { no: 'FIN-2026-102', wo: 'WO-2026-102', wh: 'WH003', qualified: 1500, defective: 50, status: 1 },
    ];
    for (const f of finData) {
      await conn.execute(
        `INSERT INTO prd_finish_order
          (finish_no, work_order_id, warehouse_id, qualified_qty, defective_qty, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [f.no, WO[f.wo].id, WH[f.wh].id, f.qualified, f.defective, f.status]
      );
      console.log(`  ${f.no}: 关联${f.wo}, 合格=${f.qualified}, 不合格=${f.defective}, status=${f.status}`);
    }
    stats.fin = 2;

    // 报工 2 条
    const wrData = [
      { no: 'WR-2026-101', wo: 'WO-2026-101', plan: 5000, completed: 5000, qualified: 5000, defective: 0 },
      { no: 'WR-2026-102', wo: 'WO-2026-102', plan: 3000, completed: 1500, qualified: 1500, defective: 50 },
    ];
    for (const w of wrData) {
      await conn.execute(
        `INSERT INTO prd_work_report
          (report_no, work_order_id, work_order_no, process_name, plan_qty, completed_qty, qualified_qty, defective_qty,
           operator_id, operator_name, start_time, end_time)
         VALUES (?, ?, ?, '印刷', ?, ?, ?, ?, ?, ?, '2026-07-06 08:00:00', '2026-07-10 17:00:00')`,
        [w.no, WO[w.wo].id, w.wo, w.plan, w.completed, w.qualified, w.defective, emp.id, emp.name]
      );
      console.log(`  ${w.no}: 关联${w.wo}, 工序=印刷, 合格=${w.qualified}, 不合格=${w.defective}`);
    }
    stats.wr = 2;

    // ═══ 6. 印前管理 ═══
    console.log('\n── 模块6: 印前管理 ──');

    // 工艺卡 1 条
    await conn.execute(
      `INSERT INTO prd_process_card
        (card_no, work_order_id, work_order_no, product_code, product_name, material_spec, work_order_date, plan_qty)
       VALUES ('PC-101', ?, 'WO-2026-101', ?, ?, '120×80mm', '2026-07-05', 5000)`,
      [WO['WO-2026-101'].id, MAT.MAT011.material_code, MAT.MAT011.material_name]
    );
    const pcId = (await getRow(conn, `SELECT id FROM prd_process_card WHERE card_no = 'PC-101'`)).id;
    await conn.execute(
      `INSERT INTO prd_process_card_material
        (card_id, card_no, label_id, label_no, material_type, material_code, material_name, specification, batch_no, quantity, unit)
       VALUES (?, 'PC-101', ?, 'B20260701-PVC', 1, ?, ?, ?, 'B20260701-PVC', 200, 'M')`,
      [pcId, BATCH['B20260701-PVC'].id, MAT.MAT030.material_code, MAT.MAT030.material_name, MAT.MAT030.specification]
    );
    console.log(`  PC-101: 关联WO-2026-101, 产品=${MAT.MAT011.material_name}, plan_qty=5000`);
    stats.pc = 1;

    // 刀模 3 条
    const dieData = [
      { code: 'DIE-001', name: 'A4标签刀模', size: '210×297mm', product: '空调控制面板标签' },
      { code: 'DIE-002', name: '洗衣机面板刀模', size: '180×100mm', product: '洗衣机控制面板' },
      { code: 'DIE-003', name: '电池标签刀模', size: '50×30mm', product: '手机电池标签' },
    ];
    for (const d of dieData) {
      await conn.execute(
        `INSERT INTO prd_die (die_code, die_name, die_type, size_spec, product_name, max_use_count, used_count, remaining_count, status)
         VALUES (?, ?, '钢', ?, ?, 100000, 5000, 95000, 1)`,
        [d.code, d.name, d.size, d.product]
      );
    }
    console.log(`  刀模: ${dieData.length}条 (DIE-001/002/003)`);
    stats.die = 3;

    // 油墨 3 条
    const inkData = [
      { code: 'INK-BLK-001', name: '油墨黑色', color: '黑色', sup: 2, safety: 20, stock: 80 },
      { code: 'INK-CYN-001', name: '油墨青色', color: '青色', sup: 2, safety: 15, stock: 45 },
      { code: 'INK-RED-001', name: '油墨红色', color: '红色', sup: 5, safety: 10, stock: 30 },
    ];
    for (const i of inkData) {
      await conn.execute(
        `INSERT INTO prd_ink (ink_code, ink_name, color_name, brand, supplier_id, unit, safety_stock, stock_qty, status)
         VALUES (?, ?, ?, '东洋', ?, 'kg', ?, ?, 1)`,
        [i.code, i.name, i.color, i.sup, i.safety, i.stock]
      );
    }
    console.log(`  油墨: ${inkData.length}条 (黑/青/红)`);
    stats.ink = 3;

    // 网版 3 条
    const spData = [
      { code: 'SCR-001', name: 'A4标签网版', mesh: '350目', product: '空调控制面板标签', status: 1 },
      { code: 'SCR-002', name: '洗衣机面板网版', mesh: '300目', product: '洗衣机控制面板', status: 2 },
      { code: 'SCR-003', name: '电池标签网版', mesh: '200目', product: '手机电池标签', status: 1 },
    ];
    for (const s of spData) {
      await conn.execute(
        `INSERT INTO prd_screen_plate (plate_code, plate_name, plate_type, mesh_count, size_spec, product_name, max_use_count, used_count, remaining_count, status)
         VALUES (?, ?, '丝网版', ?, ?, ?, 50000, 2000, 48000, ?)`,
        [s.code, s.name, s.mesh, s.mesh, s.product, s.status]
      );
    }
    console.log(`  网版: ${spData.length}条 (SCR-001/002/003)`);
    stats.sp = 3;

    // ═══ 5续. 销售发货/退货/对账/打样 ═══
    console.log('\n── 模块5: 销售管理 - 发货/退货/对账/打样 ──');

    // 发货单 3 条
    const dlData = [
      { no: 'DL-2026-101', so: so1Id, soNo: 'SO-2026-101', cust: 'C001', mat: 'MAT011', qty: 3000, price: 0.50, batch: 'B20260710-FIN', date: '2026-07-12' },
      { no: 'DL-2026-102', so: so1Id, soNo: 'SO-2026-101', cust: 'C001', mat: 'MAT011', qty: 2000, price: 0.50, batch: 'B20260710-FIN', date: '2026-07-14' },
      { no: 'DL-2026-103', so: so2Id, soNo: 'SO-2026-102', cust: 'C002', mat: 'MAT012', qty: 1500, price: 1.20, batch: 'B20260715-FIN', date: '2026-07-16' },
    ];
    for (const d of dlData) {
      const amt = round2(d.qty * d.price);
      await conn.execute(
        `INSERT INTO sal_delivery
          (delivery_no, delivery_date, order_id, order_no, customer_id, customer_name, warehouse_id,
           total_amount, total_qty, status, ship_by, ship_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?)`,
        [d.no, d.date, d.so, d.soNo, CUST[d.cust].id, CUST[d.cust].customer_name,
         WH.WH003.id, amt, d.qty, emp.id, `${d.date} 14:00:00`]
      );
      const dlId = (await getRow(conn, `SELECT id FROM sal_delivery WHERE delivery_no = ?`, [d.no])).id;
      await conn.execute(
        `INSERT INTO sal_delivery_detail
          (delivery_id, line_no, material_id, material_code, material_name, material_spec, quantity, unit, unit_price, amount, batch_no)
         VALUES (?, 1, ?, ?, ?, ?, ?, '张', ?, ?, ?)`,
        [dlId, MAT[d.mat].id, MAT[d.mat].material_code, MAT[d.mat].material_name, MAT[d.mat].specification,
         d.qty, d.price, amt, d.batch]
      );
      console.log(`  ${d.no}: 关联${d.soNo}, ${MAT[d.mat].material_name} ${d.qty}张, 批次=${d.batch}, status=2(已发货)`);
    }
    stats.dl = 3;

    // 销售退货 1 条（用 sal_return_order + sal_return_order_item，FK 一致）
    const srAmt = round2(100 * 0.50);
    await conn.execute(
      `INSERT INTO sal_return_order
        (return_no, order_id, order_no, customer_id, customer_name, return_date, return_type, return_reason,
         total_qty, total_amount, warehouse_id, inbound_status, status)
       VALUES ('SR-2026-101', ?, 'SO-2026-101', ?, ?, '2026-07-16', 1, '印刷模糊', 100, ?, ?, 1, 2)`,
      [so1Id, CUST.C001.id, CUST.C001.customer_name, srAmt, WH.WH003.id]
    );
    const srId = (await getRow(conn, `SELECT id FROM sal_return_order WHERE return_no = 'SR-2026-101'`)).id;
    await conn.execute(
      `INSERT INTO sal_return_order_item
        (return_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount, batch_no)
       VALUES (?, ?, ?, ?, 100, '张', 0.50, ?, 'B20260710-FIN')`,
      [srId, MAT.MAT011.id, MAT.MAT011.material_name, MAT.MAT011.specification, srAmt]
    );
    console.log(`  SR-2026-101: 关联SO-2026-101, 空调标签 100张, 原因=印刷模糊, status=2(已入库)`);
    stats.sr = 1;

    // 对账单 1 条
    await conn.execute(
      `INSERT INTO sal_reconciliation
        (reconciliation_no, customer_id, customer_name, period_start, period_end,
         delivery_amount, return_amount, discount_amount, net_amount, received_amount, balance_amount, status)
       VALUES ('REC-2026-101', ?, ?, '2026-07-01', '2026-07-31', 2500.00, 50.00, 0, 2450.00, 1500.00, 950.00, 2)`,
      [CUST.C001.id, CUST.C001.customer_name]
    );
    console.log(`  REC-2026-101: 客户=美的集团, 期间2026-07, 发货=2500, 退货=50, 净额=2450, 已收=1500, 余额=950`);
    stats.rec = 1;

    // 打样订单 3 条
    const splData = [
      { no: 'SPL-2026-101', cust: 'C001', product: '空调控制面板标签', qty: 50, date: '2026-06-20', status: 'confirmed', delivery: 'confirmed' },
      { no: 'SPL-2026-102', cust: 'C002', product: '洗衣机控制面板', qty: 30, date: '2026-07-05', status: 'printing', delivery: 'printing' },
      { no: 'SPL-2026-103', cust: 'C003', product: '手机电池标签', qty: 20, date: '2026-07-10', status: 'pending', delivery: 'pending' },
    ];
    for (const s of splData) {
      await conn.execute(
        `INSERT INTO sal_sample_order
          (order_no, notify_date, customer_id, customer_name, product_name, quantity, order_date, delivery_status, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.no, s.date, CUST[s.cust].id, CUST[s.cust].customer_name, s.product, s.qty, s.date, s.delivery, s.status]
      );
    }
    console.log(`  打样: ${splData.length}条 (SPL-101/102/103)`);
    stats.spl = 3;

    // ═══ 7. 质量管理 ═══
    console.log('\n── 模块7: 质量管理 ──');

    // 来料检验 3 条 + 明细
    const iqcData = [
      { no: 'IQC-2026-101', date: '2026-07-01', sup: 'SUP004', mat: 'MAT030', batch: 'B20260701-PVC', qty: 1000, unit: 'M' },
      { no: 'IQC-2026-102', date: '2026-07-03', sup: 'SUP001', mat: 'MAT031', batch: 'B20260703-PE', qty: 800, unit: 'M' },
      { no: 'IQC-2026-103', date: '2026-07-05', sup: 'SUP002', mat: 'MAT035', batch: 'B20260705-INK', qty: 50, unit: 'kg' },
    ];
    for (const i of iqcData) {
      await conn.execute(
        `INSERT INTO qc_incoming_inspection
          (inspection_no, inspection_date, supplier_name, material_code, material_name, specification, batch_no,
           quantity, unit, inspection_type, inspection_result, inspector_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sampling', 'pass', '张三')`,
        [i.no, i.date, SUP[i.sup].supplier_name, MAT[i.mat].material_code, MAT[i.mat].material_name,
         MAT[i.mat].specification, i.batch, i.qty, i.unit]
      );
      const iqcId = (await getRow(conn, `SELECT id FROM qc_incoming_inspection WHERE inspection_no = ?`, [i.no])).id;
      const items = i.no === 'IQC-2026-101'
        ? [['厚度检查', '1000±5mm', '1000mm', 'pass'], ['宽度检查', '1000mm', '1000mm', 'pass'], ['外观检查', '透明无杂质', '符合', 'pass']]
        : [['外观检查', '无瑕疵', '符合', 'pass'], ['尺寸检查', '标准', '符合', 'pass']];
      for (const it of items) {
        await conn.execute(
          `INSERT INTO qc_incoming_inspection_item
            (inspection_id, inspection_no, item_name, standard, actual_value, result)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [iqcId, i.no, it[0], it[1], it[2], it[3]]
        );
      }
      console.log(`  ${i.no}: ${MAT[i.mat].material_name} ${i.qty}${i.unit}, 批次=${i.batch}, 结果=合格(${items.length}项)`);
    }
    stats.iqc = 3;

    // 过程检验 2 条 + 成品检验 1 条（qc_inspection）
    const qciData = [
      { no: 'IPQC-2026-101', type: 2, src: '工单', srcNo: 'WO-2026-101', mat: 'MAT011', batch: null, qty: 5000, qual: 5000, unqual: 0, date: '2026-07-06' },
      { no: 'IPQC-2026-102', type: 2, src: '工单', srcNo: 'WO-2026-102', mat: 'MAT012', batch: null, qty: 1500, qual: 1500, unqual: 50, date: '2026-07-13' },
      { no: 'FQC-2026-101', type: 3, src: '工单', srcNo: 'WO-2026-101', mat: 'MAT011', batch: 'B20260710-FIN', qty: 5000, qual: 4950, unqual: 50, date: '2026-07-10' },
    ];
    const QCI = {};
    for (const q of qciData) {
      const [r] = await conn.execute(
        `INSERT INTO qc_inspection
          (inspection_no, inspection_type, source_type, source_no, material_id, batch_no,
           inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector, inspection_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '张三', ?)`,
        [q.no, q.type, q.src, q.srcNo, MAT[q.mat].id, q.batch, q.qty, q.qual, q.unqual, q.date]
      );
      QCI[q.no] = { id: r.insertId, ...q };
      console.log(`  ${q.no}: 关联${q.srcNo}, 检验=${q.qty}, 合格=${q.qual}, 不合格=${q.unqual}, 结果=合格`);
    }
    stats.qci = 3;

    // 不合格品 + 客诉
    await conn.execute(
      `INSERT INTO qc_unqualified
        (unqualified_no, handle_no, inspection_id, source_type, source_no, material_id, material_code, material_name,
         quantity, defect_type, defect_desc, handle_type, handle_status, handle_result, handler, handle_date)
       VALUES ('UNQ-2026-101', 'UNQ-H-101', ?, 'FQC', 'FQC-2026-101', ?, ?, ?, 50, '色差', '成品色差超标', 2, 2, 1, '张三', '2026-07-10')`,
      [QCI['FQC-2026-101'].id, MAT.MAT011.id, MAT.MAT011.material_code, MAT.MAT011.material_name]
    );
    console.log(`  UNQ-2026-101: 关联FQC-2026-101, 数量=50, 缺陷=色差, 处置=返修, 已处理`);
    await conn.execute(
      `INSERT INTO qc_unqualified
        (unqualified_no, handle_no, source_type, source_no, material_id, material_code, material_name,
         quantity, defect_type, defect_desc, handle_type, handle_status, handle_result, handler, handle_date)
       VALUES ('CMP-2026-101', 'CMP-H-101', 'customer', 'SO-2026-101', ?, ?, ?, 100, '印刷模糊', '客户投诉印刷模糊', 3, 2, 1, '张三', '2026-07-17')`,
      [MAT.MAT011.id, MAT.MAT011.material_code, MAT.MAT011.material_name]
    );
    console.log(`  CMP-2026-101: 关联SO-2026-101, 数量=100, 缺陷=印刷模糊, 处置=退货, 已处理`);
    stats.unq = 2;

    // ═══ 8. 设备管理 ═══
    console.log('\n── 模块8: 设备管理 ──');
    const eqData = [
      { code: 'EQ-001', name: '丝印机', type: 1, model: 'SP-2000', loc: '印刷车间' },
      { code: 'EQ-002', name: '模切机', type: 3, model: 'MQ-1500', loc: '后道车间' },
      { code: 'EQ-003', name: '分切机', type: 5, model: 'CQ-1000', loc: '原料车间' },
    ];
    const EQ = {};
    for (const e of eqData) {
      const [r] = await conn.execute(
        `INSERT INTO eqp_equipment
          (equipment_code, equipment_name, equipment_type, brand, model, location, purchase_date,
           current_status, status, rated_capacity)
         VALUES (?, ?, ?, '国产', ?, ?, '2024-01-15', 1, 1, 1000)`,
        [e.code, e.name, e.type, e.model, e.loc]
      );
      EQ[e.code] = { id: r.insertId, ...e };
    }
    console.log(`  设备台账: ${eqData.length}条 (丝印机/模切机/分切机)`);

    await conn.execute(
      `INSERT INTO eqp_calibration
        (calibration_no, equipment_id, equipment_code, equipment_name, calibration_date, next_calibration_date,
         calibration_org, calibration_result, certificate_no, calibration_cost)
       VALUES ('CAL-2026-101', ?, 'EQ-001', '丝印机', '2026-01-10', '2027-01-10', '第三方计量机构', 'qualified', 'CAL-2026-001', 800.00)`,
      [EQ['EQ-001'].id]
    );
    console.log(`  CAL-2026-101: 丝印机EQ-001 年度校准, 结果=合格`);
    stats.cal = 1;

    await conn.execute(
      `INSERT INTO eqp_maintenance_record
        (record_no, equipment_id, maintenance_type, fault_desc, maintenance_content, start_time, end_time, downtime_hours, cost, responsible_id, result)
       VALUES ('MTN-2026-101', ?, 4, '模切刀片磨损', '刀片更换', '2026-07-08 08:00:00', '2026-07-08 12:00:00', 4.00, 500.00, ?, 2)`,
      [EQ['EQ-002'].id, emp.id]
    );
    console.log(`  MTN-2026-101: 模切机EQ-002 故障维修, 内容=刀片更换, result=2(已完成)`);
    stats.mtn = 1;
    stats.eq = 3;

    // ═══ 9. 财务管理 ═══
    console.log('\n── 模块9: 财务管理 ──');
    // 应收账款 3 条
    const arData = [
      { no: 'AR-2026-101', so: 'SO-2026-101', cust: 'C001', amt: 2500, received: 1500, balance: 1000, due: '2026-08-15', status: 2 },
      { no: 'AR-2026-102', so: 'SO-2026-102', cust: 'C002', amt: 3600, received: 0, balance: 3600, due: '2026-09-01', status: 1 },
      { no: 'AR-2026-103', so: 'SO-2026-103', cust: 'C003', amt: 1500, received: 0, balance: 1500, due: '2026-09-15', status: 1 },
    ];
    for (const a of arData) {
      await conn.execute(
        `INSERT INTO fin_receivable
          (receivable_no, source_type, source_no, customer_id, amount, received_amount, balance, due_date, status)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
        [a.no, a.so, CUST[a.cust].id, a.amt, a.received, a.balance, a.due, a.status]
      );
    }
    console.log(`  应收账款: ${arData.length}条 (AR-101/102/103)`);
    stats.ar = 3;

    // 应付账款 3 条
    const apData = [
      { no: 'AP-2026-101', po: 'PO-2026-101', sup: 'SUP004', amt: 8500, paid: 8500, balance: 0, due: null, status: 3 },
      { no: 'AP-2026-102', po: 'PO-2026-102', sup: 'SUP001', amt: 4960, paid: 4960, balance: 0, due: null, status: 3 },
      { no: 'AP-2026-103', po: 'PO-2026-103', sup: 'SUP002', amt: 1750, paid: 0, balance: 1750, due: '2026-08-10', status: 1 },
    ];
    for (const a of apData) {
      await conn.execute(
        `INSERT INTO fin_payable
          (payable_no, source_type, source_no, supplier_id, amount, paid_amount, balance, due_date, status)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
        [a.no, a.po, SUP[a.sup].id, a.amt, a.paid, a.balance, a.due, a.status]
      );
    }
    console.log(`  应付账款: ${apData.length}条 (AP-101/102/103)`);
    stats.ap = 3;

    // 成本记录 3 条
    const costData = [
      { no: 'COST-2026-101', type: 'material', cat: '直接材料', amt: 1250.00, desc: '空调标签直接材料成本' },
      { no: 'COST-2026-102', type: 'labor', cat: '直接人工', amt: 800.00, desc: '空调标签直接人工成本' },
      { no: 'COST-2026-103', type: 'overhead', cat: '制造费用', amt: 450.00, desc: '空调标签制造费用' },
    ];
    for (const c of costData) {
      await conn.execute(
        `INSERT INTO fin_cost_record
          (cost_no, cost_type, cost_category, cost_date, amount, order_no, product_name, department, description, status)
         VALUES (?, ?, ?, '2026-07-10', ?, 'WO-2026-101', '空调控制面板标签', '生产部', ?, 1)`,
        [c.no, c.type, c.cat, c.amt, c.desc]
      );
    }
    console.log(`  成本记录: ${costData.length}条 (材料1250/人工800/费用450)`);
    stats.cost = 3;

    // ═══ 10. 打样管理 - 标准色卡 ═══
    console.log('\n── 模块10: 打样管理 - 标准色卡 ──');
    const ccData = [
      { code: 'CC-001', name: '企业蓝', series: '专色', pantone: '2935C' },
      { code: 'CC-002', name: '专色红', series: '专色', pantone: '185C' },
      { code: 'CC-003', name: '科技灰', series: '专色', pantone: '7540C' },
    ];
    for (const c of ccData) {
      await conn.execute(
        `INSERT INTO dcprint_ink_color (color_code, color_name, color_series, pantone_code, status, is_deleted)
         VALUES (?, ?, ?, ?, 1, 0)`,
        [c.code, c.name, c.series, c.pantone]
      );
    }
    console.log(`  标准色卡: ${ccData.length}条 (企业蓝/专色红/科技灰)`);
    stats.cc = 3;

    await conn.commit();
    console.log('\n✅ 所有数据已提交（事务提交成功）！');
  } catch (e) {
    await conn.rollback();
    console.error('\n❌ 事务已回滚:', e.message);
    throw e;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 统计信息
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 演示数据生成统计');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`物料主数据:        ${stats.materials} 条`);
  console.log(`采购申请:          ${stats.pr} 条`);
  console.log(`采购订单:          ${stats.po} 条`);
  console.log(`采购退货:          ${stats.prt} 条`);
  console.log(`入库单:            ${stats.inb} 条`);
  console.log(`库存批次:          ${stats.batch} 条`);
  console.log(`出库单:            ${stats.out} 条`);
  console.log(`调拨单:            ${stats.tf} 条`);
  console.log(`盘点单:            ${stats.ct} 条`);
  console.log(`分切单:            ${stats.cut} 条`);
  console.log(`BOM:               ${stats.bom} 套`);
  console.log(`工单:              ${stats.wo} 条`);
  console.log(`排产:              ${stats.sch} 条`);
  console.log(`领料单:            ${stats.mi} 条`);
  console.log(`退料单:            ${stats.rt} 条`);
  console.log(`完工入库:          ${stats.fin} 条`);
  console.log(`报工:              ${stats.wr} 条`);
  console.log(`工艺卡:            ${stats.pc} 条`);
  console.log(`刀模:              ${stats.die} 条`);
  console.log(`油墨:              ${stats.ink} 条`);
  console.log(`网版:              ${stats.sp} 条`);
  console.log(`销售订单:          ${stats.so} 条`);
  console.log(`发货单:            ${stats.dl} 条`);
  console.log(`退货单:            ${stats.sr} 条`);
  console.log(`对账单:            ${stats.rec} 条`);
  console.log(`打样订单:          ${stats.spl} 条`);
  console.log(`来料检验:          ${stats.iqc} 条`);
  console.log(`过程/成品检验:     ${stats.qci} 条`);
  console.log(`不合格品/客诉:     ${stats.unq} 条`);
  console.log(`设备台账:          ${stats.eq} 条`);
  console.log(`设备校准:          ${stats.cal} 条`);
  console.log(`设备维修:          ${stats.mtn} 条`);
  console.log(`应收账款:          ${stats.ar} 条`);
  console.log(`应付账款:          ${stats.ap} 条`);
  console.log(`成本记录:          ${stats.cost} 条`);
  console.log(`标准色卡:          ${stats.cc} 条`);
  console.log('──────────────────────────────────────────');
  console.log(`合计:              ${totalRecords} 条业务记录`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 综合ERP演示数据生成完成！');

  await conn.end();
}

main().catch((e) => {
  console.error('❌ 数据生成失败:', e.message);
  console.error(e.stack);
  process.exit(1);
});
