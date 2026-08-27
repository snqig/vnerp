#!/usr/bin/env node
/**
 * 库存账实对账 / 修复脚本
 * ------------------------------------------------------------------
 * 背景：warehouse/inventory 的批次可用量 与 warehouse/inbound 的已完成入库
 *       收货量对不上。根因是历史种子数据不一致，且早期 InventorySyncHandler
 *       在唯一键竞态下会把整单入库同步丢进死信（已修复代码）。
 *
 * 本脚本做两件事：
 *   1) 全库对账：列出每个 (物料,仓库) 的「流水账净值」vs「批次可用量」缺口。
 *   2) 修复（--apply）：将指定物料的批次可用量对齐到其已完成入库单的收货量
 *      （按 batch_no 一一对应，因为入库单的 batch_no 与实物批号完全相同）。
 *
 * 默认只打印报告（dry-run），加 --apply 才真正改库。
 */
const mysql = require('mysql2/promise');

const DB = { host: '127.0.0.1', user: 'root', password: 'Snqig521223', database: 'vnerpdacahng' };
const APPLY = process.argv.includes('--apply');

async function main() {
  const conn = await mysql.createConnection(DB);
  console.log(`\n[mode] ${APPLY ? 'APPLY（改库）' : 'REPORT（只读）'}\n`);

  // ---- 1) 全库账实对账 ----
  const [led] = await conn.query(`
    SELECT material_id, warehouse_id,
      COALESCE(SUM(CASE WHEN trans_type IN ('in','inbound') THEN quantity ELSE 0 END),0)
      - COALESCE(SUM(CASE WHEN trans_type IN ('out','outbound') THEN quantity ELSE 0 END),0) AS ledger_net
    FROM inv_inventory_transaction GROUP BY material_id, warehouse_id`);
  const [bat] = await conn.query(`
    SELECT material_id, warehouse_id, COALESCE(SUM(available_qty),0) AS batch_avail
    FROM inv_inventory_batch WHERE deleted=0 GROUP BY material_id, warehouse_id`);

  const map = {};
  for (const r of led) map[`${r.material_id}_${r.warehouse_id}`] = { ledger: Number(r.ledger_net) };
  for (const r of bat) {
    const k = `${r.material_id}_${r.warehouse_id}`;
    (map[k] = map[k] || {}).batch = Number(r.batch_avail);
  }
  const mismatches = Object.entries(map)
    .map(([k, v]) => {
      const [mat, wh] = k.split('_').map(Number);
      return { material_id: mat, warehouse_id: wh, ledger: v.ledger || 0, batch: v.batch || 0, diff: (v.ledger || 0) - (v.batch || 0) };
    })
    .filter((r) => Math.abs(r.diff) > 0.0001)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  console.log(`=== 全库账实对账：共 ${mismatches.length} 处缺口 ===`);
  for (const m of mismatches) {
    console.log(`  material=${m.material_id} warehouse=${m.warehouse_id} | 流水账净值=${m.ledger} 批次可用=${m.batch} 差=${m.diff}`);
  }

  // ---- 2) 修复：将缺口物料的批次对齐到已完成入库单 ----
  // 仅处理「批次可用 < 入库收货」的缺口（漏建/少建批次），按 batch_no 对应。
  for (const m of mismatches) {
    const { material_id: mid, warehouse_id: wid } = m;
    // 取该物料在该仓库所有已完成入库单的明细（batch_no + 收货量）
    const [items] = await conn.query(
      `SELECT ii.batch_no, SUM(ii.quantity) AS qty
       FROM inv_inbound_item ii
       JOIN inv_inbound_order io ON io.id = ii.order_id
       WHERE ii.material_id = ? AND io.warehouse_id = ? AND io.status IN ('approved','completed') AND io.deleted = 0
       GROUP BY ii.batch_no`,
      [mid, wid]
    );
    if (!items.length) {
      console.log(`\n[skip] material=${mid} warehouse=${wid}: 无已完成入库单可对齐`);
      continue;
    }
    console.log(`\n=== 修复 material=${mid} warehouse=${wid}：按入库单对齐批次 ===`);
    for (const it of items) {
      const [cur] = await conn.query(
        'SELECT id, quantity, available_qty FROM inv_inventory_batch WHERE batch_no=? AND material_id=? AND warehouse_id=? AND deleted=0',
        [it.batch_no, mid, wid]
      );
      if (!cur.length) {
        console.log(`  batch ${it.batch_no}: 实物批次缺失（入库收货 ${it.qty}）—— 需新建，本脚本不自动建批，请走入库重放`);
        continue;
      }
      const before = cur[0];
      if (Math.abs(Number(before.quantity) - Number(it.qty)) < 0.0001) {
        console.log(`  batch ${it.batch_no}: 已对齐(${it.qty})，跳过`);
        continue;
      }
      console.log(`  batch ${it.batch_no}: ${before.quantity} -> ${it.qty} (入库收货量)`);
      if (APPLY) {
        await conn.execute(
          'UPDATE inv_inventory_batch SET quantity=?, available_qty=?, area=0, update_time=NOW() WHERE id=?',
          [it.qty, it.qty, before.id]
        );
      }
    }
    // 同步汇总表 inv_inventory（仿 recomputeInventorySummary）
    const [b] = await conn.query(
      'SELECT COALESCE(SUM(quantity),0) q, COALESCE(SUM(available_qty),0) a FROM inv_inventory_batch WHERE material_id=? AND warehouse_id=? AND deleted=0',
      [mid, wid]
    );
    const q = Number(b[0].q), a = Number(b[0].a);
    const [inv] = await conn.query('SELECT id, quantity, available_qty FROM inv_inventory WHERE material_id=? AND warehouse_id=? AND deleted=0', [mid, wid]);
    if (inv.length) {
      console.log(`  inv_inventory: ${inv[0].quantity}/${inv[0].available_qty} -> ${q}/${a}`);
      if (APPLY) {
        await conn.execute('UPDATE inv_inventory SET quantity=?, available_qty=?, update_time=NOW() WHERE id=?', [q, a, inv[0].id]);
      }
    }
  }

  // 复跑对账确认
  if (APPLY) {
    const [led2] = await conn.query(`
      SELECT material_id, warehouse_id,
        COALESCE(SUM(CASE WHEN trans_type IN ('in','inbound') THEN quantity ELSE 0 END),0)
        - COALESCE(SUM(CASE WHEN trans_type IN ('out','outbound') THEN quantity ELSE 0 END),0) AS ledger_net
      FROM inv_inventory_transaction GROUP BY material_id, warehouse_id`);
    const [bat2] = await conn.query(`
      SELECT material_id, warehouse_id, COALESCE(SUM(available_qty),0) AS batch_avail
      FROM inv_inventory_batch WHERE deleted=0 GROUP BY material_id, warehouse_id`);
    const m2 = {};
    for (const r of led2) m2[`${r.material_id}_${r.warehouse_id}`] = { ledger: Number(r.ledger_net) };
    for (const r of bat2) { const k = `${r.material_id}_${r.warehouse_id}`; (m2[k] = m2[k] || {}).batch = Number(r.batch_avail); }
    const remain = Object.entries(m2).filter(([k, v]) => Math.abs((v.ledger || 0) - (v.batch || 0)) > 0.0001);
    console.log(`\n[after-apply] 剩余账实缺口：${remain.length} 处`);
    for (const [k, v] of remain) console.log(`  ${k}: 流水账=${v.ledger} 批次=${v.batch}`);
  }

  await conn.end();
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
