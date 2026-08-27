/**
 * rebuild-purchase-chain.cjs
 * 以「warehouse/inbound 的 20 组入库单」为权威，重建完整采购业务链：
 *   采购申请 pur_request + pur_request_item
 *   → 采购订单 pur_purchase_order + pur_purchase_order_line（关联申请物料，回写 inbound.po_id/supplier）
 *   → 应付单 fin_payable（source_type=1 采购订单，source_no=po_no）
 *   → 付款 fin_payment_record（部分付款 60%，回写应付 paid/balance/status）
 * 旧 pur_ 与 fin_payable/fin_payment_record 数据先备份到 _bak_pur_20260817 再清空重建。
 * 目的：让 申请→订单→入库→应付→付款 数量/金额一致、相互关联，整理整个采购过程。
 */
const mysql = require('mysql2/promise');
const db = { host: '127.0.0.1', port: 3306, user: 'root', password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4' };
const BAK = '20260817';
const r2 = (n) => Math.round(Number(n) * 100) / 100;
const r4 = (n) => Math.round(Number(n) * 10000) / 10000;
const pad = (n) => String(n).padStart(2, '0');

async function main() {
  const conn = await mysql.createConnection(db);
  try {
    const q = async (s, p = []) => (await conn.execute(s, p))[0];

    // 0) 备份
    const T = ['pur_request', 'pur_request_item', 'pur_purchase_order', 'pur_purchase_order_line', 'fin_payable', 'fin_payment_record'];
    console.log('→ 备份到 _bak_pur_' + BAK);
    for (const t of T) {
      const bak = `${t}_bak_pur_${BAK}`;
      await conn.execute(`DROP TABLE IF EXISTS \`${bak}\``);
      await conn.execute(`CREATE TABLE \`${bak}\` LIKE \`${t}\``);
      await conn.execute(`INSERT INTO \`${bak}\` SELECT * FROM \`${t}\``);
    }
    console.log('✓ 备份完成');

    // 1) 清空（FK 关闭）
    await conn.execute('SET FOREIGN_KEY_CHECKS=0');
    for (const t of T) await conn.execute(`DELETE FROM \`${t}\``);
    await conn.execute('SET FOREIGN_KEY_CHECKS=1');
    console.log('✓ 6 张采购/财务表已清空');

    // 2) 取供应商池
    const sups = await q('SELECT id, supplier_code, supplier_name FROM pur_supplier WHERE deleted=0 ORDER BY id');
    if (!sups.length) throw new Error('无可用供应商');
    console.log('供应商池:', sups.length, '家');

    // 3) 取入库单 + 明细（按入库单分组）
    const rows = await q(`
      SELECT io.id AS inbound_id, io.order_no AS inbound_no, io.warehouse_id,
             ii.id AS item_id, ii.material_id, ii.material_name, ii.material_spec,
             ii.batch_no, ii.quantity, ii.unit, ii.unit_price,
             m.material_code
      FROM inv_inbound_item ii
      JOIN inv_inbound_order io ON io.id = ii.order_id
      JOIN inv_material m ON m.id = ii.material_id
      WHERE ii.deleted = 0 AND io.deleted = 0 AND io.status = 'completed'
      ORDER BY io.id, ii.id`);
    if (!rows.length) throw new Error('无入库明细，无法驱动采购链');

    // 按入库单分组
    const groups = new Map();
    for (const r of rows) {
      if (!groups.has(r.inbound_id)) groups.set(r.inbound_id, { inbound_id: r.inbound_id, inbound_no: r.inbound_no, warehouse_id: r.warehouse_id, items: [] });
      groups.get(r.inbound_id).items.push(r);
    }
    const inboundList = [...groups.values()];
    console.log('入库单组数:', inboundList.length);

    const taxRate = 0.13;
    let reqN = 0, poN = 0, lineN = 0, payN = 0, pymtN = 0, linkN = 0;
    let seq = 0;

    for (let gi = 0; gi < inboundList.length; gi++) {
      const g = inboundList[gi];
      const sup = sups[gi % sups.length];
      const idx = gi + 1;

      // ---- 采购申请 ----
      const reqNo = `PR-20260817-${pad(idx)}`;
      let reqTotal = 0;
      const reqItems = [];
      for (const it of g.items) {
        const amt = r2(Number(it.quantity) * Number(it.unit_price));
        reqTotal += amt;
        reqItems.push({ ...it, amt });
      }
      await conn.execute(
        `INSERT INTO pur_request
          (request_no, request_date, request_type, request_dept, requester_name,
           total_amount, currency, status, priority, expected_date, supplier_name, remark, create_time, update_time, deleted)
         VALUES (?, CURDATE(), 'material', '生产部', '系统重建', ?, 'CNY', 4, 2, CURDATE(), ?, '由入库数据重建采购申请', NOW(), NOW(), 0)`,
        [reqNo, r2(reqTotal), sup.supplier_name]
      );
      const reqId = (await conn.execute('SELECT LAST_INSERT_ID() AS id'))[0][0].id;
      for (let li = 0; li < reqItems.length; li++) {
        const ri = reqItems[li];
        await conn.execute(
          `INSERT INTO pur_request_item
            (request_id, line_no, material_id, material_code, material_name, material_spec,
             material_unit, quantity, price, amount, expected_date, remark, create_time, update_time, deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), '', NOW(), NOW(), 0)`,
          [reqId, li + 1, ri.material_id, ri.material_code, ri.material_name, ri.material_spec || '',
           ri.unit || '件', ri.quantity, ri.unit_price, ri.amt]
        );
      }
      reqN++;

      // ---- 采购订单 ----
      const poNo = `PO-20260817-${pad(idx)}`;
      let poTotal = 0;
      const poLines = [];
      for (const it of g.items) {
        const amt = r4(Number(it.quantity) * Number(it.unit_price));
        poTotal += amt;
        poLines.push({ ...it, amt });
      }
      const taxAmt = r4(poTotal * taxRate);
      const grand = r4(poTotal + taxAmt);
      await conn.execute(
        `INSERT INTO pur_purchase_order
          (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date,
           currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount,
           grand_total, status, received_quantity, base_total_amount, base_tax_amount,
           base_grand_total, remark, create_time, update_time, deleted)
         VALUES (?, ?, ?, ?, CURDATE(), CURDATE(), 'CNY', 1, ?, ?, ?, ?, ?, 3, ?, ?, ?, ?, '由入库数据重建', NOW(), NOW(), 0)`,
        [poNo, sup.id, sup.supplier_name, sup.supplier_code, r4(poTotal),
         r4(poLines.reduce((s, l) => s + Number(l.quantity), 0)),
         taxRate, taxAmt, grand, r4(poLines.reduce((s, l) => s + Number(l.quantity), 0)),
         r4(poTotal), taxAmt, grand]
      );
      const poId = (await conn.execute('SELECT LAST_INSERT_ID() AS id'))[0][0].id;
      for (let li = 0; li < poLines.length; li++) {
        const pl = poLines[li];
        const ltTax = r4(pl.amt * taxRate);
        const ltGrand = r4(pl.amt + ltTax);
        await conn.execute(
          `INSERT INTO pur_purchase_order_line
            (po_id, line_no, material_id, material_code, material_name, material_spec, unit,
             order_qty, received_qty, returned_qty, unit_price, amount, tax_rate, tax_amount,
             line_total, base_unit_price, base_amount, base_tax_amount, base_line_total, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [poId, li + 1, pl.material_id, pl.material_code, pl.material_name, pl.material_spec || '',
           pl.unit || '件', pl.quantity, pl.quantity, pl.unit_price, pl.amt, taxRate, ltTax, ltGrand,
           pl.unit_price, pl.amt, ltTax, ltGrand]
        );
        lineN++;
      }
      poN++;

      // ---- 回写入库单：关联 PO 与供应商 ----
      await conn.execute(
        `UPDATE inv_inbound_order SET po_id = ?, supplier_id = ?, supplier_name = ?, update_time = NOW() WHERE id = ?`,
        [poId, sup.id, sup.supplier_name, g.inbound_id]
      );
      linkN++;

      // ---- 应付单 ----
      seq++;
      const apNo = `AP20260817${pad(idx)}`;
      await conn.execute(
        `INSERT INTO fin_payable
          (payable_no, source_type, source_no, supplier_id, amount, paid_amount, balance,
           due_date, status, remark, deleted, create_time, update_time)
         VALUES (?, 1, ?, ?, ?, 0, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1, ?, 0, NOW(), NOW())`,
        [apNo, poNo, sup.id, grand, grand, `采购入库自动生成：${poNo}`]
      );
      const payableId = (await conn.execute('SELECT LAST_INSERT_ID() AS id'))[0][0].id;
      payN++;

      // ---- 付款（部分 60%）----
      const payAmt = r2(grand * 0.6);
      const pyNo = `PY20260817${pad(idx)}`;
      await conn.execute(
        `INSERT INTO fin_payment_record
          (payment_no, payable_id, supplier_id, amount, payment_date, payment_method, remark, deleted, create_time)
         VALUES (?, ?, ?, ?, CURDATE(), '银行转账', '采购付款（重建）', 0, NOW())`,
        [pyNo, payableId, sup.id, payAmt]
      );
      pymtN++;
      const balance = r2(grand - payAmt);
      const newStatus = balance <= 0 ? 3 : 2;
      await conn.execute(
        `UPDATE fin_payable SET paid_amount = ?, balance = ?, status = ?, update_time = NOW() WHERE id = ?`,
        [payAmt, balance, newStatus, payableId]
      );
    }

    console.log(`\n✓ 生成 采购申请 ${reqN} / 订单 ${poN} / 订单行 ${lineN} / 应付 ${payN} / 付款 ${pymtN} / 入库关联 ${linkN}`);

    // 4) 校验
    console.log('\n=== 一致性校验 ===');
    const checks = [
      ['申请行金额合计 = 申请头 total_amount',
        `SELECT COUNT(*) c FROM pur_request r
         WHERE r.deleted=0 AND ABS(r.total_amount - COALESCE((SELECT SUM(amount) FROM pur_request_item i WHERE i.request_id=r.id),0))>0.01`],
      ['订单行金额合计 = 订单 total_amount',
        `SELECT COUNT(*) c FROM pur_purchase_order p
         WHERE p.deleted=0 AND ABS(p.total_amount - COALESCE((SELECT SUM(amount) FROM pur_purchase_order_line l WHERE l.po_id=p.id),0))>0.001`],
      ['订单 received_qty = 入库数量(回写后)',
        `SELECT COUNT(*) c FROM pur_purchase_order p
         JOIN inv_inbound_order io ON io.po_id=p.id
         JOIN inv_inbound_item ii ON ii.order_id=io.id AND ii.deleted=0
         WHERE p.deleted=0 AND ABS(p.received_quantity - (SELECT COALESCE(SUM(quantity),0) FROM inv_inbound_item x JOIN inv_inbound_order y ON y.id=x.order_id WHERE y.po_id=p.id AND x.deleted=0 AND y.deleted=0))>0.001`],
      ['入库单 po_id 全部回填',
        `SELECT COUNT(*) c FROM inv_inbound_order WHERE deleted=0 AND status='completed' AND (po_id IS NULL OR po_id=0)`],
      ['应付 source_no 对应 PO 存在',
        `SELECT COUNT(*) c FROM fin_payable fp WHERE fp.deleted=0 AND NOT EXISTS (SELECT 1 FROM pur_purchase_order p WHERE p.po_no=fp.source_no)`],
      ['付款 payable_id 对应应付存在',
        `SELECT COUNT(*) c FROM fin_payment_record pr WHERE pr.deleted=0 AND NOT EXISTS (SELECT 1 FROM fin_payable f WHERE f.id=pr.payable_id)`],
      ['应付 paid+balance = amount',
        `SELECT COUNT(*) c FROM fin_payable WHERE deleted=0 AND ABS(paid_amount+balance-amount)>0.01`],
    ];
    let allOk = true;
    for (const [name, sql] of checks) {
      const [r] = await conn.execute(sql);
      const bad = r[0].c;
      const ok = bad === 0;
      if (!ok) allOk = false;
      console.log(`  ${ok ? '✅' : '❌'} ${name}: 不一致 ${bad} 行`);
    }

    // 数量概览
    const [cnt] = await conn.execute(
      `SELECT (SELECT COUNT(*) FROM pur_request WHERE deleted=0) req,
              (SELECT COUNT(*) FROM pur_purchase_order WHERE deleted=0) po,
              (SELECT COUNT(*) FROM fin_payable WHERE deleted=0) ap,
              (SELECT COUNT(*) FROM fin_payment_record WHERE deleted=0) py,
              (SELECT COUNT(*) FROM inv_inbound_order WHERE deleted=0 AND po_id>0) linked`
    );
    console.log('\n概览:', JSON.stringify(cnt[0]));
    console.log(allOk ? '\n🎉 采购业务链完整且一致。回滚表后缀 _bak_pur_' + BAK : '\n⚠️ 存在不一致，请检查');
  } finally {
    await conn.end();
  }
}
main().catch((e) => { console.error('❌ 失败:', e.message); if (e.sql) console.error('SQL:', e.sql); if (e.parameters) console.error('PARAMS:', JSON.stringify(e.parameters)); process.exit(1); });
