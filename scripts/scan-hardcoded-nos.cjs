/**
 * 全库硬编码虚构单号扫描（只读，不改数据）
 *
 * 目标：找出「单号列里指向其他模块的编号，但在目标表中查不到」的记录。
 * 这类数据是各模块种子脚本独立生成编号造成的，会造成跨模块链路断裂。
 *
 * 判定方法：对每个「单号引用」关系，LEFT JOIN 目标表，统计孤儿数量与样例。
 */
const mysql = require('mysql2/promise');

const CONN = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

// [标签, 子表, 子单号列, 目标表, 目标单号列, 子表软删条件]
const REFS = [
  ['发货单->销售订单', 'sal_delivery_order', 'order_no', 'sal_order', 'order_no', 'deleted = 0'],
  ['发货单->销售订单(细)', 'sal_delivery_order_item', 'order_no', 'sal_order', 'order_no', 'deleted = 0'],
  ['出库单->销售订单', 'inv_outbound_order', 'sales_order_no', 'sal_order', 'order_no', 'deleted = 0'],
  ['入库单->采购单', 'inv_inbound_order', 'po_no', 'pur_purchase_order', 'po_no', 'deleted = 0'],
  // 应收 source_no 的语义是「发货单号」（source_type=发货单），只校验发货单，不重复校验销售订单
  ['应收->发货单', 'fin_receivable', 'source_no', 'sal_delivery_order', 'delivery_no', 'deleted = 0'],
  // 应付 source_no 的语义是「采购单号」，只校验采购单，不重复校验入库单
  ['应付->采购单', 'fin_payable', 'source_no', 'pur_purchase_order', 'po_no', 'deleted = 0'],
  ['工单->销售订单', 'prod_work_order', 'order_no', 'sal_order', 'order_no', 'deleted = 0'],
  ['销售出库->销售订单', 'inv_sales_outbound', 'order_no', 'sal_order', 'order_no', 'deleted = 0'],
  // 生产入库用专属的 work_order_no 列关联工单，不是 inbound_no
  ['生产入库->工单', 'inv_production_inbound', 'work_order_no', 'prod_work_order', 'work_order_no', 'deleted = 0'],
  ['质检->入库单', 'qc_incoming_inspection', 'inbound_no', 'inv_inbound_order', 'order_no', 'deleted = 0'],
  ['对账单->采购单', 'pur_reconciliation', 'po_no', 'pur_purchase_order', 'po_no', 'deleted = 0'],
];

async function main() {
  const conn = await mysql.createConnection(CONN);

  const tableExists = async (t) => {
    const [r] = await conn.query(
      'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',
      [t]
    );
    return r.length > 0;
  };
  const colExists = async (t, c) => {
    const [r] = await conn.query(
      'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
      [t, c]
    );
    return r.length > 0;
  };

  console.log('===== 全库硬编码虚构单号扫描 =====\n');

  const findings = [];

  for (const [label, childT, childC, parentT, parentC, softDel] of REFS) {
    if (!(await tableExists(childT))) {
      console.log(`[跳过] ${label} — 子表 ${childT} 不存在`);
      continue;
    }
    if (!(await tableExists(parentT))) {
      console.log(`[跳过] ${label} — 目标表 ${parentT} 不存在`);
      continue;
    }
    if (!(await colExists(childT, childC))) {
      console.log(`[跳过] ${label} — ${childT}.${childC} 不存在`);
      continue;
    }
    if (!(await colExists(parentT, parentC))) {
      console.log(`[跳过] ${label} — ${parentT}.${parentC} 不存在`);
      continue;
    }

    const conds = [`c.\`${childC}\` IS NOT NULL`, `c.\`${childC}\` <> ''`];
    if (softDel) conds.push(`c.${softDel}`);
    const where = 'WHERE ' + conds.join(' AND ');

    try {
      const [tot] = await conn.query(
        `SELECT COUNT(*) n FROM \`${childT}\` c ${where}`
      );
      const total = Number(tot[0].n);

      const [orph] = await conn.query(
        `SELECT COUNT(*) n
         FROM \`${childT}\` c
         LEFT JOIN \`${parentT}\` p ON c.\`${childC}\` = p.\`${parentC}\`${softDel ? ' AND p.deleted = 0' : ''}
         ${where} AND p.\`${parentC}\` IS NULL`
      );
      const orphan = Number(orph[0].n);

      let sample = [];
      if (orphan > 0) {
        const [s] = await conn.query(
          `SELECT c.id, c.\`${childC}\` AS v
           FROM \`${childT}\` c
           LEFT JOIN \`${parentT}\` p ON c.\`${childC}\` = p.\`${parentC}\`${softDel ? ' AND p.deleted = 0' : ''}
           ${where} AND p.\`${parentC}\` IS NULL
           LIMIT 3`
        );
        sample = s.map((r) => `#${r.id}:${r.v}`);
      }

      const flag = orphan === 0 ? '✅' : '⚠️';
      console.log(
        `${flag} ${label.padEnd(24)} 有值 ${String(total).padStart(4)} 条, 断链 ${String(orphan).padStart(4)} 条` +
          (sample.length ? `   例: ${sample.join('  ')}` : '')
      );

      if (orphan > 0) {
        findings.push({ label, childT, childC, parentT, parentC, total, orphan, sample });
      }
    } catch (e) {
      console.log(`[错误] ${label} — ${e.message}`);
    }
  }

  // 补充：列出各模块真实单号样例，供对照
  console.log('\n----- 各模块真实单号对照 -----');
  for (const [t, c] of [
    ['sal_order', 'order_no'],
    ['pur_purchase_order', 'po_no'],
    ['sal_delivery_order', 'delivery_no'],
    ['prod_work_order', 'work_order_no'],
    ['inv_inbound_order', 'order_no'],
    ['inv_outbound_order', 'order_no'],
    ['fin_receivable', 'receivable_no'],
    ['fin_payable', 'payable_no'],
  ]) {
    if (!(await tableExists(t)) || !(await colExists(t, c))) {
      console.log(`  ${t}.${c} — 不存在`);
      continue;
    }
    const [r] = await conn.query(
      `SELECT \`${c}\` v FROM \`${t}\` WHERE deleted = 0 ORDER BY id LIMIT 3`
    );
    console.log(`  ${(t + '.' + c).padEnd(30)} ${r.map((x) => x.v).join('  |  ') || '(空)'}`);
  }

  console.log('\n===== 汇总 =====');
  if (findings.length === 0) {
    console.log('✅ 未发现单号断链。');
  } else {
    console.log(`⚠️ 发现 ${findings.length} 类单号断链，共 ${findings.reduce((a, f) => a + f.orphan, 0)} 条：`);
    findings.forEach((f) => {
      console.log(`  - ${f.label}: ${f.childT}.${f.childC} -> ${f.parentT}.${f.parentC}，${f.orphan}/${f.total} 条断链`);
      console.log(`      样例: ${f.sample.join('  ')}`);
    });
  }

  await conn.end();
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
