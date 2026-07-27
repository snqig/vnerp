/**
 * VNERP 测试数据 - 阶段三：数据验证与追溯校验
 *
 * 对应 TODO 清单步骤 11~15：
 *  11. 验证 FIFO 追溯链（批次可用量扣减 + 出库批次号一致性 + FIFO 模拟）
 *  12. 验证生产全链路（工单状态 + 排程关联 + 领料单关联）
 *  13. 验证 HR 薪资计算（计件总产量 + 薪资公式 + 社保公积金）
 *  14. 验证多币种与汇率（base_* = 原币 * 汇率）
 *  15. 检查外键关联完整性（无孤立记录）
 *
 * 用法: node scripts/test-data/03-validate-data.mjs
 */
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Snqig521223',
  database: process.env.DB_NAME || 'vnerpdacahng',
  charset: 'utf8mb4',
};

// 验证结果统计
let passCount = 0;
let failCount = 0;

function check(label, condition, detail = '') {
  const status = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${status} | ${label}${detail ? ' | ' + detail : ''}`);
  if (condition) passCount++;
  else failCount++;
}

async function query(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  // ═══════════════════════════════════════════════════════
  // 步骤 11: 验证 FIFO 追溯链
  // ═══════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('步骤 11: 验证 FIFO 追溯链');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 11a. 批次可用量扣减验证
  const batches = await query(conn,
    `SELECT batch_no, material_name, quantity, available_qty, locked_qty, unit_price, inbound_date
     FROM inv_inventory_batch WHERE batch_no IN ('BATCH-20260701-A','BATCH-20260701-B','BATCH-20260701-C')
     ORDER BY batch_no`);

  const batchMap = {};
  batches.forEach(b => { batchMap[b.batch_no] = b; });

  check('批次 A 可用量 = 1200',
    Number(batchMap['BATCH-20260701-A']?.available_qty) === 1200,
    `实际=${batchMap['BATCH-20260701-A']?.available_qty}`);
  check('批次 B 可用量 = 900',
    Number(batchMap['BATCH-20260701-B']?.available_qty) === 900,
    `实际=${batchMap['BATCH-20260701-B']?.available_qty}`);
  check('批次 C 可用量 = 300',
    Number(batchMap['BATCH-20260701-C']?.available_qty) === 300,
    `实际=${batchMap['BATCH-20260701-C']?.available_qty}`);

  check('批次 A 初始量 = 1500', Number(batchMap['BATCH-20260701-A']?.quantity) === 1500);
  check('批次 B 初始量 = 1000', Number(batchMap['BATCH-20260701-B']?.quantity) === 1000);
  check('批次 C 初始量 = 500', Number(batchMap['BATCH-20260701-C']?.quantity) === 500);

  // 11b. 领料明细批次号一致性验证
  const issueItems = await query(conn,
    `SELECT ii.material_name, ii.batch_no, ii.issued_qty,
            ib.batch_no AS inbound_batch_no, ib.unit_price AS batch_price
     FROM prd_material_issue_item ii
     LEFT JOIN inv_inventory_batch ib ON ii.batch_no COLLATE utf8mb4_unicode_ci = ib.batch_no COLLATE utf8mb4_unicode_ci
     WHERE ii.issue_id = (SELECT id FROM prd_material_issue WHERE issue_no = 'MR-2026-001')
     ORDER BY ii.id`);

  check('领料明细数量 = 3', issueItems.length === 3, `实际=${issueItems.length}`);

  for (const item of issueItems) {
    check(`领料批次号与入库批次号一致: ${item.material_name}`,
      item.batch_no === item.inbound_batch_no,
      `领料批次=${item.batch_no}, 入库批次=${item.inbound_batch_no}`);
    check(`出库价格取批次价格: ${item.material_name}`,
      item.batch_price !== null,
      `批次价格=${item.batch_price}`);
  }

  // 11c. FIFO 模拟验证：批次按入库日期排序，最早批次优先消耗
  const fifoCheck = await query(conn,
    `SELECT batch_no, available_qty, inbound_date
     FROM inv_inventory_batch
     WHERE material_id = (SELECT id FROM inv_material WHERE material_name = '丝印油墨-黑色' AND deleted = 0 LIMIT 1)
       AND available_qty > 0 AND deleted = 0
     ORDER BY inbound_date ASC`);

  if (fifoCheck.length > 0) {
    check('FIFO: 最早入库批次仍有可用量（优先消耗）',
      fifoCheck[0].batch_no === 'BATCH-20260701-A',
      `最早批次=${fifoCheck[0].batch_no}, 可用量=${fifoCheck[0].available_qty}`);
  }

  // ═══════════════════════════════════════════════════════
  // 步骤 12: 验证生产全链路
  // ═══════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('步骤 12: 验证生产全链路');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 12a. 工单状态
  const wo = await query(conn,
    `SELECT id, work_order_no, sales_order_id, material_id, plan_qty, status
     FROM prd_work_order WHERE work_order_no = 'WO-2026-001' AND deleted = 0`);

  check('工单 WO-2026-001 存在', wo.length === 1);
  if (wo.length === 1) {
    check('工单状态 = 1（待生产）', wo[0].status === 1, `实际=${wo[0].status}`);
    check('工单关联销售订单', wo[0].sales_order_id !== null, `sales_order_id=${wo[0].sales_order_id}`);
  }

  // 12b. 排程关联
  const sched = await query(conn,
    `SELECT s.schedule_no, s.work_order_id, s.order_id, s.order_no,
            w.work_order_no, w.status AS wo_status
     FROM prd_schedule s
     LEFT JOIN prd_work_order w ON s.work_order_id = w.id
     WHERE s.schedule_no = 'SCH-2026-001' AND s.deleted = 0`);

  check('排程 SCH-2026-001 存在', sched.length === 1);
  if (sched.length === 1) {
    check('排程关联正确工单 WO-2026-001', sched[0].work_order_no === 'WO-2026-001');
    check('排程关联销售订单 SO-2026-001', sched[0].order_no === 'SO-2026-001',
      `order_no=${sched[0].order_no}`);
  }

  // 12c. 领料单关联
  const issue = await query(conn,
    `SELECT mi.issue_no, mi.work_order_id, mi.warehouse_id, mi.status,
            w.work_order_no
     FROM prd_material_issue mi
     LEFT JOIN prd_work_order w ON mi.work_order_id = w.id
     WHERE mi.issue_no = 'MR-2026-001'`);

  check('领料单 MR-2026-001 存在', issue.length === 1);
  if (issue.length === 1) {
    check('领料单关联工单 WO-2026-001', issue[0].work_order_no === 'WO-2026-001');
    check('领料单状态 = 2（已发料）', issue[0].status === 2, `实际=${issue[0].status}`);

    const issueDetail = await query(conn,
      `SELECT material_name, required_qty, issued_qty, batch_no
       FROM prd_material_issue_item
       WHERE issue_id = ? ORDER BY id`,
      [issue[0].work_order_id ? (await query(conn, 'SELECT id FROM prd_material_issue WHERE issue_no = ?', ['MR-2026-001']))[0].id : 0]);

    check('领料明细数量 = 3', issueDetail.length === 3, `实际=${issueDetail.length}`);
    if (issueDetail.length === 3) {
      check('领料-黑色油墨 300kg', issueDetail[0].material_name.includes('黑色') && Number(issueDetail[0].issued_qty) === 300);
      check('领料-白色油墨 100kg', issueDetail[1].material_name.includes('白色') && Number(issueDetail[1].issued_qty) === 100);
      check('领料-网版 200个', issueDetail[2].material_name === '网版' && Number(issueDetail[2].issued_qty) === 200);
    }
  }

  // ═══════════════════════════════════════════════════════
  // 步骤 13: 验证 HR 薪资计算
  // ═══════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('步骤 13: 验证 HR 薪资计算');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 13a. 计件明细总产量
  const pieceSummary = await query(conn,
    `SELECT SUM(quantity) AS total_qty, SUM(amount) AS total_amount, COUNT(*) AS record_count
     FROM hr_piece_work_detail
     WHERE employee_id = 1001`);

  check('计件明细总产量 = 1266 件',
    Number(pieceSummary[0].total_qty) === 1266,
    `实际=${pieceSummary[0].total_qty}`);
  check('计件明细记录数 = 4',
    pieceSummary[0].record_count === 4,
    `实际=${pieceSummary[0].record_count}`);

  // 13b. 计件单价验证
  const pieceRates = await query(conn,
    `SELECT process_code, unit_price FROM hr_piece_rate WHERE status = 1 ORDER BY process_code`);
  const rateMap = {};
  pieceRates.forEach(r => { rateMap[r.process_code] = Number(r.unit_price); });

  check('计件单价 PRINT = 0.50', rateMap['PRINT'] === 0.5);
  check('计件单价 DIE_CUT = 0.30', rateMap['DIE_CUT'] === 0.3);
  check('计件单价 INSPECT = 0.20', rateMap['INSPECT'] === 0.2);

  // 计件总额 = 1266 件按各自工序单价计算
  const expectedPieceAmount = 500 * 0.5 + 400 * 0.5 + 266 * 0.3 + 100 * 0.2; // 549.80
  check('计件总额 = 549.80 元',
    Math.abs(Number(pieceSummary[0].total_amount) - expectedPieceAmount) < 0.01,
    `实际=${pieceSummary[0].total_amount}, 预期=${expectedPieceAmount}`);

  // 13c. 薪资计算结果验证
  const salary = await query(conn,
    `SELECT * FROM hr_salary_calculation WHERE employee_id = 1001 AND calc_month = '2026-07'`);

  check('薪资计算记录存在', salary.length === 1);
  if (salary.length === 1) {
    const s = salary[0];
    check('基本工资 = 8000', Number(s.base_salary) === 8000);
    check('计件工资 = 549.80', Math.abs(Number(s.piece_salary) - 549.8) < 0.01, `实际=${s.piece_salary}`);
    check('绩效工资 = 1000', Number(s.performance_salary) === 1000);
    check('补贴 = 500', Number(s.allowances) === 500);

    // 应发 = 基本工资 + 计件工资 + 绩效 + 补贴
    const expectedGross = 8000 + 549.8 + 1000 + 500;
    check('应发工资 = 10049.80', Math.abs(Number(s.gross_pay) - expectedGross) < 0.01,
      `实际=${s.gross_pay}, 预期=${expectedGross}`);

    // 社保 = 社保基数 * 10.5%
    check('社保个人 = 840 (8000 * 10.5%)', Number(s.social_insurance_personal) === 840,
      `实际=${s.social_insurance_personal}`);
    // 公积金 = 基数 * 12%
    check('公积金个人 = 960 (8000 * 12%)', Number(s.housing_fund_personal) === 960,
      `实际=${s.housing_fund_personal}`);

    // 个税 = (应发 - 起征点 - 社保 - 公积金) * 10%
    const expectedTax = Math.round((expectedGross - 5000 - 840 - 960) * 0.10 * 100) / 100;
    check('个税 = 324.98', Math.abs(Number(s.individual_tax) - expectedTax) < 0.01,
      `实际=${s.individual_tax}, 预期=${expectedTax}`);

    // 扣款合计 = 社保 + 公积金 + 个税
    const expectedDeduction = 840 + 960 + expectedTax;
    check('扣款合计 = 2124.98', Math.abs(Number(s.total_deduction) - expectedDeduction) < 0.01,
      `实际=${s.total_deduction}, 预期=${expectedDeduction}`);

    // 实发 = 应发 - 扣款合计
    const expectedNet = expectedGross - expectedDeduction;
    check('实发工资 = 7924.82', Math.abs(Number(s.net_pay) - expectedNet) < 0.01,
      `实际=${s.net_pay}, 预期=${expectedNet}`);

    // 薪资公式验证: 实发 = 应发 - 扣款合计
    check('薪资公式: 实发 = 应发 - 扣款合计',
      Math.abs(Number(s.net_pay) - (Number(s.gross_pay) - Number(s.total_deduction))) < 0.01);
  }

  // 13d. 薪资档案验证
  const profile = await query(conn,
    `SELECT * FROM hr_salary_profile WHERE employee_id = 1001 AND status = 1`);
  check('薪资档案存在', profile.length === 1);
  if (profile.length === 1) {
    check('档案-基本工资 = 8000', Number(profile[0].base_salary) === 8000);
    check('档案-社保基数 = 8000', Number(profile[0].social_insurance_base) === 8000);
    check('档案-公积金比例 = 12%', Number(profile[0].housing_fund_rate) === 12);
    check('档案-个税起征点 = 5000', Number(profile[0].tax_deduction) === 5000);
  }

  // ═══════════════════════════════════════════════════════
  // 步骤 14: 验证多币种与汇率
  // ═══════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('步骤 14: 验证多币种与汇率');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 汇率表
  const rates = await query(conn,
    `SELECT from_currency, to_currency, rate, rate_date FROM sys_exchange_rate`);
  check('汇率表有 USD→CNY 记录',
    rates.some(r => r.from_currency === 'USD' && r.to_currency === 'CNY'),
    `记录数=${rates.length}`);

  const usdRate = rates.find(r => r.from_currency === 'USD' && r.to_currency === 'CNY');
  check('USD→CNY 汇率 = 7.2', usdRate && Number(usdRate.rate) === 7.2,
    `实际=${usdRate?.rate}`);

  // 采购订单多币种验证
  const po1 = await query(conn, `SELECT * FROM pur_purchase_order WHERE po_no = 'PO-2026-001'`);
  const po2 = await query(conn, `SELECT * FROM pur_purchase_order WHERE po_no = 'PO-2026-002'`);
  const po3 = await query(conn, `SELECT * FROM pur_purchase_order WHERE po_no = 'PO-2026-003'`);

  // PO-2026-001 (CNY, rate=1.0): base = 原币
  if (po1.length === 1) {
    check('PO-001 币种 = CNY', po1[0].currency === 'CNY');
    check('PO-001 汇率 = 1.0', Number(po1[0].exchange_rate) === 1.0);
    check('PO-001 base_total = total * rate',
      Number(po1[0].base_total_amount) === Number(po1[0].total_amount) * Number(po1[0].exchange_rate),
      `base=${po1[0].base_total_amount}, total=${po1[0].total_amount}`);
    check('PO-001 base_tax = tax * rate',
      Number(po1[0].base_tax_amount) === Number(po1[0].tax_amount) * Number(po1[0].exchange_rate));
    check('PO-001 base_grand = grand * rate',
      Number(po1[0].base_grand_total) === Number(po1[0].grand_total) * Number(po1[0].exchange_rate));
  }

  // PO-2026-002 (USD, rate=7.2): base = 原币 * 7.2
  if (po2.length === 1) {
    check('PO-002 币种 = USD', po2[0].currency === 'USD');
    check('PO-002 汇率 = 7.2', Number(po2[0].exchange_rate) === 7.2);
    check('PO-002 base_total = 12000 * 7.2 = 86400',
      Number(po2[0].base_total_amount) === 86400,
      `实际=${po2[0].base_total_amount}`);
    check('PO-002 base_tax = 1560 * 7.2 = 11232',
      Number(po2[0].base_tax_amount) === 11232,
      `实际=${po2[0].base_tax_amount}`);
    check('PO-002 base_grand = 13560 * 7.2 = 97632',
      Number(po2[0].base_grand_total) === 97632,
      `实际=${po2[0].base_grand_total}`);
    check('PO-002 base_total = total * rate',
      Math.abs(Number(po2[0].base_total_amount) - Number(po2[0].total_amount) * Number(po2[0].exchange_rate)) < 0.01);
  }

  // PO-2026-003 (CNY, rate=1.0): base = 原币
  if (po3.length === 1) {
    check('PO-003 币种 = CNY', po3[0].currency === 'CNY');
    check('PO-003 base_total = total * rate',
      Number(po3[0].base_total_amount) === Number(po3[0].total_amount) * Number(po3[0].exchange_rate));
  }

  // 采购订单明细 base_* 验证
  const po2Line = await query(conn,
    `SELECT * FROM pur_purchase_order_line WHERE po_id = ?`, [po2[0].id]);
  if (po2Line.length === 1) {
    check('PO-002 明细 base_unit_price = 12 * 7.2 = 86.4',
      Number(po2Line[0].base_unit_price) === 86.4,
      `实际=${po2Line[0].base_unit_price}`);
    check('PO-002 明细 base_amount = 12000 * 7.2 = 86400',
      Number(po2Line[0].base_amount) === 86400,
      `实际=${po2Line[0].base_amount}`);
  }

  // 入库单多币种验证
  const inb2 = await query(conn,
    `SELECT * FROM inv_inbound_order WHERE order_no = 'INB-2026-002'`);
  if (inb2.length === 1) {
    check('INB-002 币种 = USD', inb2[0].currency === 'USD');
    check('INB-002 汇率 = 7.2', Number(inb2[0].exchange_rate) === 7.2);
    check('INB-002 base_total = total * rate',
      Math.abs(Number(inb2[0].base_total_amount) - Number(inb2[0].total_amount) * Number(inb2[0].exchange_rate)) < 0.01,
      `base=${inb2[0].base_total_amount}, total=${inb2[0].total_amount}`);
  }

  // ═══════════════════════════════════════════════════════
  // 步骤 15: 检查外键关联完整性（无孤立记录）
  // ═══════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('步骤 15: 检查外键关联完整性');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 采购订单明细 → 采购订单
  const orphanPOLines = await query(conn,
    `SELECT COUNT(*) AS cnt FROM pur_purchase_order_line l
     LEFT JOIN pur_purchase_order p ON l.po_id = p.id
     WHERE p.id IS NULL`);
  check('采购订单明细无孤立记录（po_id）', Number(orphanPOLines[0].cnt) === 0,
    `孤立记录=${orphanPOLines[0].cnt}`);

  // 采购订单明细 → 物料
  const orphanPOLineMat = await query(conn,
    `SELECT COUNT(*) AS cnt FROM pur_purchase_order_line l
     LEFT JOIN inv_material m ON l.material_id = m.id
     WHERE m.id IS NULL`);
  check('采购订单明细无孤立记录（material_id）', Number(orphanPOLineMat[0].cnt) === 0,
    `孤立记录=${orphanPOLineMat[0].cnt}`);

  // 入库明细 → 入库单
  const orphanInbItems = await query(conn,
    `SELECT COUNT(*) AS cnt FROM inv_inbound_item i
     LEFT JOIN inv_inbound_order o ON i.order_id = o.id
     WHERE o.id IS NULL`);
  check('入库明细无孤立记录（order_id）', Number(orphanInbItems[0].cnt) === 0,
    `孤立记录=${orphanInbItems[0].cnt}`);

  // 库存批次 → 物料
  const orphanBatchMat = await query(conn,
    `SELECT COUNT(*) AS cnt FROM inv_inventory_batch b
     LEFT JOIN inv_material m ON b.material_id = m.id
     WHERE m.id IS NULL AND b.deleted = 0`);
  check('库存批次无孤立记录（material_id）', Number(orphanBatchMat[0].cnt) === 0,
    `孤立记录=${orphanBatchMat[0].cnt}`);

  // 库存批次 → 仓库
  const orphanBatchWh = await query(conn,
    `SELECT COUNT(*) AS cnt FROM inv_inventory_batch b
     LEFT JOIN inv_warehouse w ON b.warehouse_id = w.id
     WHERE w.id IS NULL AND b.deleted = 0`);
  check('库存批次无孤立记录（warehouse_id）', Number(orphanBatchWh[0].cnt) === 0,
    `孤立记录=${orphanBatchWh[0].cnt}`);

  // 排程 → 工单
  const orphanSchedWO = await query(conn,
    `SELECT COUNT(*) AS cnt FROM prd_schedule s
     LEFT JOIN prd_work_order w ON s.work_order_id = w.id
     WHERE s.work_order_id IS NOT NULL AND w.id IS NULL AND s.deleted = 0`);
  check('排程无孤立记录（work_order_id）', Number(orphanSchedWO[0].cnt) === 0,
    `孤立记录=${orphanSchedWO[0].cnt}`);

  // 领料明细 → 领料单
  const orphanIssueItems = await query(conn,
    `SELECT COUNT(*) AS cnt FROM prd_material_issue_item i
     LEFT JOIN prd_material_issue m ON i.issue_id = m.id
     WHERE m.id IS NULL`);
  check('领料明细无孤立记录（issue_id）', Number(orphanIssueItems[0].cnt) === 0,
    `孤立记录=${orphanIssueItems[0].cnt}`);

  // 薪资计算 → 员工
  const orphanSalaryEmp = await query(conn,
    `SELECT COUNT(*) AS cnt FROM hr_salary_calculation s
     LEFT JOIN sys_employee e ON s.employee_id = e.id
     WHERE e.id IS NULL`);
  check('薪资计算无孤立记录（employee_id）', Number(orphanSalaryEmp[0].cnt) === 0,
    `孤立记录=${orphanSalaryEmp[0].cnt}`);

  // ═══════════════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`验证完成: ✅ ${passCount} 项通过, ❌ ${failCount} 项失败`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await conn.end();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('❌ 验证脚本失败:', e.message);
  console.error(e.stack);
  process.exit(1);
});
