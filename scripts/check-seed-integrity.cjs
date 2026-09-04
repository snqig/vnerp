/**
 * 跨模块种子数据关联性校验（只读，不修改任何数据）
 *
 * 检查 orders / sample / plm / warehouse / purchase / finance / hr 之间的引用完整性：
 *   - 订单 -> 客户 / 产品
 *   - 工单 -> 订单 / 产品 / BOM
 *   - BOM 行 -> 物料
 *   - 库存 -> 物料 / 仓库
 *   - 采购订单 -> 供应商
 *   - 应收/应付 -> 订单 / 采购单
 *   - 员工 -> 部门
 *
 * 输出：每张表的记录数、孤儿引用数、孤儿样例。
 */
const mysql = require('mysql2/promise');

const CONN = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

// [标签, 子表, 子列, 父表, 父列, 子表软删条件]
const LINKS = [
  ['订单 -> 客户', 'sal_order', 'customer_id', 'crm_customer', 'id', 'deleted = 0'],
  ['工单 -> 订单', 'prod_work_order', 'order_id', 'sal_order', 'id', 'deleted = 0'],
  ['工单 -> 产品', 'prod_work_order', 'product_id', 'mdm_product', 'id', 'deleted = 0'],
  ['工单 -> BOM', 'prod_work_order', 'bom_id', 'prd_bom', 'id', 'deleted = 0'],
  ['工单 -> 仓库', 'prod_work_order', 'warehouse_id', 'inv_warehouse', 'id', 'deleted = 0'],
  ['BOM行 -> 物料', 'prd_bom_detail', 'material_id', 'inv_material', 'id', null],
  ['BOM行 -> BOM', 'prd_bom_detail', 'bom_id', 'prd_bom', 'id', null],
  ['库存 -> 物料', 'inv_inventory', 'material_id', 'inv_material', 'id', 'deleted = 0'],
  ['库存 -> 仓库', 'inv_inventory', 'warehouse_id', 'inv_warehouse', 'id', 'deleted = 0'],
  ['批次 -> 物料', 'inv_inventory_batch', 'material_id', 'inv_material', 'id', 'deleted = 0'],
  ['批次 -> 仓库', 'inv_inventory_batch', 'warehouse_id', 'inv_warehouse', 'id', 'deleted = 0'],
  ['入库单 -> 采购单', 'inv_inbound_order', 'po_id', 'pur_purchase_order', 'id', 'deleted = 0'],
  ['入库单 -> 供应商', 'inv_inbound_order', 'supplier_id', 'pur_supplier', 'id', 'deleted = 0'],
  ['采购单 -> 供应商', 'pur_purchase_order', 'supplier_id', 'pur_supplier', 'id', 'deleted = 0'],
  ['采购单行 -> 物料', 'pur_purchase_order_line', 'material_id', 'inv_material', 'id', null],
  ['PLM ECO -> 产品', 'plm_eco', 'product_id', 'mdm_product', 'id', 'deleted = 0'],
  ['应收 -> 客户', 'fin_receivable', 'customer_id', 'crm_customer', 'id', 'deleted = 0'],
  ['应付 -> 供应商', 'fin_payable', 'supplier_id', 'pur_supplier', 'id', 'deleted = 0'],
  ['员工 -> 部门', 'sys_employee', 'dept_id', 'sys_department', 'id', 'deleted = 0'],
];

// 单号类引用：种子数据各模块独立生成编号，需单独归类报告（不做强行改写）
const DOC_NO_LINKS = [
  // 注：应收/应付的 source_no 语义是「发货单号 / 采购单号」，已分别由下方两条校验覆盖，
  // 不再拿同一列去匹配其它目标（如销售订单、入库单），避免把正常业务编号误判为孤儿。
  ['应收单号 -> 发货单', 'fin_receivable', 'source_no', 'sal_delivery_order', 'delivery_no', 'deleted = 0'],
  ['应付单号 -> 采购单', 'fin_payable', 'source_no', 'pur_purchase_order', 'po_no', 'deleted = 0'],
  ['入库单号 -> 采购单', 'inv_inbound_order', 'po_no', 'pur_purchase_order', 'po_no', 'deleted = 0'],
  ['发货单号 -> 销售订单', 'sal_delivery_order', 'order_no', 'sal_order', 'order_no', 'deleted = 0'],
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

  console.log('===== 跨模块种子数据关联性校验 =====\n');

  const problems = [];

  const runLinks = async (links, sink) => {
    for (const [label, childT, childC, parentT, parentC, softDel] of links) {
      // 前置检查：表/列存在性
      if (!(await tableExists(childT))) {
        console.log(`[跳过] ${label} — 子表 ${childT} 不存在`);
        continue;
      }
      if (!(await tableExists(parentT))) {
        console.log(`[跳过] ${label} — 父表 ${parentT} 不存在`);
        continue;
      }
      if (!(await colExists(childT, childC))) {
        console.log(`[跳过] ${label} — ${childT}.${childC} 列不存在`);
        continue;
      }
      if (!(await colExists(parentT, parentC))) {
        console.log(`[跳过] ${label} — ${parentT}.${parentC} 列不存在`);
        continue;
      }

      // 软删条件与"引用列非空"条件合并成一个 WHERE 子句，避免空 WHERE 语法错误
      const conds = [`c.\`${childC}\` IS NOT NULL`];
      if (softDel) conds.push(`c.${softDel}`);
      const where = 'WHERE ' + conds.join(' AND ');

      try {
        const [tot] = await conn.query(
          `SELECT COUNT(*) AS n FROM \`${childT}\` c ${where}`
        );
        const total = Number(tot[0].n);

        const [orph] = await conn.query(
          `SELECT COUNT(*) AS n
           FROM \`${childT}\` c
           LEFT JOIN \`${parentT}\` p ON c.\`${childC}\` = p.\`${parentC}\`
           ${where} AND p.\`${parentC}\` IS NULL`
        );
        const orphan = Number(orph[0].n);

        let sample = [];
        if (orphan > 0) {
          const [s] = await conn.query(
            `SELECT c.id, c.\`${childC}\` AS ref_value
             FROM \`${childT}\` c
             LEFT JOIN \`${parentT}\` p ON c.\`${childC}\` = p.\`${parentC}\`
             ${where} AND p.\`${parentC}\` IS NULL
             LIMIT 3`
          );
          sample = s.map((r) => `#${r.id}(${r.ref_value})`);
        }

        const status = orphan === 0 ? '✅' : '⚠️';
        console.log(
          `${status} ${label.padEnd(22)} 引用 ${String(total).padStart(5)} 条, 孤儿 ${String(orphan).padStart(5)} 条` +
            (sample.length ? `  例: ${sample.join(', ')}` : '')
        );

        if (orphan > 0) {
          sink.push({ label, childT, childC, parentT, orphan, sample });
        }
      } catch (e) {
        console.log(`[错误] ${label} — ${e.message}`);
      }
    }
  };

  console.log('----- 主键引用（ID 级） -----');
  await runLinks(LINKS, problems);

  console.log('\n----- 单号引用（跨模块编号对齐） -----');
  const docNoProblems = [];
  await runLinks(DOC_NO_LINKS, docNoProblems);

  // 额外：各模块主表记录数概览
  console.log('\n----- 主表记录数概览 -----');
  const OVERVIEW = [
    'crm_customer',
    'mdm_product',
    'sal_order',
    'prod_work_order',
    'prd_bom',
    'prd_bom_detail',
    'inv_material',
    'inv_warehouse',
    'inv_inventory',
    'inv_inventory_batch',
    'pur_supplier',
    'pur_purchase_order',
    'pur_purchase_order_line',
    'inv_inbound_order',
    'plm_eco',
    'fin_receivable',
    'fin_payable',
    'sys_employee',
    'sys_department',
    'prd_standard_card',
  ];
  for (const t of OVERVIEW) {
    if (!(await tableExists(t))) {
      console.log(`  ${t.padEnd(26)} — 表不存在`);
      continue;
    }
    const hasDeleted = await colExists(t, 'deleted');
    const [r] = await conn.query(
      `SELECT COUNT(*) AS n FROM \`${t}\`${hasDeleted ? ' WHERE deleted = 0' : ''}`
    );
    console.log(`  ${t.padEnd(26)} ${String(r[0].n).padStart(6)} 条`);
  }

  console.log('\n===== 汇总 =====');
  if (problems.length === 0) {
    console.log('✅ ID 级引用全部完整，无孤儿数据。');
  } else {
    console.log(`⚠️ ID 级引用断裂 ${problems.length} 处：`);
    problems.forEach((p) => {
      console.log(`  - ${p.label}: ${p.childT}.${p.childC} -> ${p.parentT}，孤儿 ${p.orphan} 条`);
    });
  }

  if (docNoProblems.length === 0) {
    console.log('✅ 单号级引用全部对齐。');
  } else {
    console.log(`\n⚠️ 单号级引用断裂 ${docNoProblems.length} 处（种子数据各模块独立生成编号，需业务侧确认后再对齐）：`);
    docNoProblems.forEach((p) => {
      console.log(`  - ${p.label}: ${p.childT}.${p.childC} -> ${p.parentT}.? ，孤儿 ${p.orphan} 条  例: ${p.sample.join(', ')}`);
    });
  }

  await conn.end();
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
