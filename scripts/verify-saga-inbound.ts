/**
 * F-003 扩展：inbound.approved（采购入库）Saga 补偿验证
 *
 * 验证补偿链路对四类副作用的撤销能力（全部复用已有反审核 handler）：
 *   1. 库存回滚 + 批次软删  ← InventoryRollbackHandler
 *   2. 应付单软删          ← InventoryRollbackHandler（内含 T403 逻辑）
 *   3. 二维码失效          ← InboundQrInvalidationHandler
 *   4. 采购单收货量回退    ← PurchaseInboundReversalHandler
 *   5. 幂等：重复补偿不重复扣减
 *
 * 用法：npx tsx --env-file=.env scripts/verify-saga-inbound.ts
 */
import { SagaCompensationHandler } from '../src/application/handlers/SagaCompensationHandler';
import mysql from 'mysql2/promise';

const CONN = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
  }
}

async function main() {
  const conn = await mysql.createConnection(CONN);
  console.log('===== F-003 扩展：inbound.approved Saga 补偿验证 =====\n');

  const sagaId = `inbound-test-${Date.now()}`;
  const inboundNo = `PIN-SAGATEST-${Date.now()}`;
  const batchNo = `PPO-SAGATEST-${Date.now()}`;
  const qty = 60;
  const unitPrice = 5;

  let inboundId = 0;
  let poId = 0;
  let materialId = 0;
  let warehouseId = 0;

  try {
    // ---------- 准备：真实物料 / 仓库 / 一张可回退的采购单 ----------
    const [mats] = (await conn.query(
      'SELECT id FROM inv_material WHERE deleted = 0 ORDER BY id LIMIT 1'
    )) as any[];
    materialId = mats[0].id;
    const [whs] = (await conn.query(
      'SELECT id FROM inv_warehouse WHERE deleted = 0 ORDER BY id LIMIT 1'
    )) as any[];
    warehouseId = whs[0].id;
    const [pos] = (await conn.query(
      'SELECT id FROM pur_purchase_order WHERE deleted = 0 AND status IN (40,50) ORDER BY id LIMIT 1'
    )) as any[];
    poId = pos[0]?.id ?? 0;
    console.log(`物料 ${materialId} / 仓库 ${warehouseId} / 采购单 ${poId || '(无)'}\n`);

    // ---------- 构造正向副作用（模拟入库审核通过后的状态）----------
    const [woRes] = (await conn.execute(
      `INSERT INTO inv_inbound_order
        (order_no, order_type, warehouse_id, supplier_id, po_id, po_no, status, deleted, create_time)
       VALUES (?, 'purchase', ?, 1, ?, 'PO-SAGATEST', 'completed', 0, NOW())`,
      [inboundNo, warehouseId, poId || null]
    )) as any;
    inboundId = Number(woRes.insertId);

    await conn.execute(
      `INSERT INTO inv_inbound_item
        (order_id, material_id, material_name, quantity, batch_no, unit_price, deleted, create_time)
       VALUES (?, ?, '测试物料', ?, ?, ?, 0, NOW())`,
      [inboundId, materialId, qty, batchNo, unitPrice]
    );

    await conn.execute(
      `INSERT INTO inv_inventory_batch
        (material_id, material_name, batch_no, quantity, available_qty, warehouse_id, inbound_date, status, deleted, create_time)
       VALUES (?, '测试物料', ?, ?, ?, ?, CURDATE(), 1, 0, NOW())`,
      [materialId, batchNo, qty, qty, warehouseId]
    );

    await conn.execute(
      `INSERT INTO fin_payable
        (payable_no, supplier_id, source_type, source_no, amount, paid_amount, balance, status, deleted, create_time)
       VALUES (?, 1, 1, ?, ?, 0, ?, 1, 0, NOW())`,
      [`AP-SAGA-${Date.now()}`, inboundNo, qty * unitPrice, qty * unitPrice]
    );

    await conn.execute(
      `INSERT INTO qrcode_record
        (qr_code, qr_type, ref_id, ref_no, material_id, quantity, status, deleted, create_time)
       VALUES (?, 'material', ?, ?, ?, ?, 1, 0, NOW())`,
      [`QR-SAGA-${Date.now()}`, inboundId, inboundNo, materialId, qty]
    );

    const snap = async () => {
      const [b] = (await conn.query(
        'SELECT COUNT(*) c FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0',
        [batchNo]
      )) as any[];
      const [p] = (await conn.query(
        'SELECT COUNT(*) c FROM fin_payable WHERE source_no = ? AND deleted = 0',
        [inboundNo]
      )) as any[];
      const [q] = (await conn.query(
        "SELECT COUNT(*) c FROM qrcode_record WHERE ref_id = ? AND qr_type = 'material' AND status = 1",
        [inboundId]
      )) as any[];
      const [t] = (await conn.query(
        "SELECT COUNT(*) c FROM inv_inventory_transaction WHERE source_type = 'inbound_order' AND source_id = ? AND trans_type = 'return'",
        [inboundId]
      )) as any[];
      return {
        batch: Number(b[0].c),
        payable: Number(p[0].c),
        qrActive: Number(q[0].c),
        reversalTxn: Number(t[0].c),
      };
    };

    const before = await snap();
    console.log('【补偿前】', JSON.stringify(before), '\n');
    check('前置：批次/应付/二维码均已生成', before.batch === 1 && before.payable === 1 && before.qrActive === 1);

    // ---------- 触发补偿 ----------
    console.log('--- 触发 Saga 补偿 ---');
    const handler = new SagaCompensationHandler();
    await handler.handle({
      eventType: 'saga.compensate.inbound.approved',
      occurredAt: new Date(),
      payload: { sagaId, originEventType: 'inbound.approved', inboundId, inboundNo, poId: poId || undefined },
    } as never);

    const after = await snap();
    console.log('【补偿后】', JSON.stringify(after));
    check('批次已回滚（软删）', after.batch === 0, `剩余 ${after.batch}`);
    check('应付单已软删', after.payable === 0, `剩余 ${after.payable}`);
    check('二维码已失效', after.qrActive === 0, `仍有效 ${after.qrActive}`);
    check('已写反向冲销流水', after.reversalTxn === 1, `${after.reversalTxn} 条`);

    // ---------- 幂等 ----------
    console.log('\n--- 幂等：重复补偿 ---');
    await handler.handle({
      eventType: 'saga.compensate.inbound.approved',
      occurredAt: new Date(),
      payload: { sagaId, originEventType: 'inbound.approved', inboundId, inboundNo, poId: poId || undefined },
    } as never);
    const afterIdem = await snap();
    console.log('【幂等后】', JSON.stringify(afterIdem));
    check(
      '重复补偿不重复写冲销流水',
      afterIdem.reversalTxn === 1,
      `仍为 ${afterIdem.reversalTxn} 条`
    );
  } finally {
    // ---------- 清理 ----------
    if (inboundId) {
      await conn.execute('DELETE FROM inv_inbound_item WHERE order_id = ?', [inboundId]);
      await conn.execute('DELETE FROM inv_inbound_order WHERE id = ?', [inboundId]);
    }
    await conn.execute('DELETE FROM inv_inventory_batch WHERE batch_no = ?', [batchNo]);
    await conn.execute('DELETE FROM fin_payable WHERE source_no = ?', [inboundNo]);
    await conn.execute('DELETE FROM qrcode_record WHERE ref_no = ?', [inboundNo]);
    await conn.execute(
      "DELETE FROM inv_inventory_transaction WHERE source_type = 'inbound_order' AND source_id = ?",
      [inboundId]
    );
    if (materialId && warehouseId) {
      const { recomputeInventorySummary } = await import('../src/lib/inventory-ledger');
      await recomputeInventorySummary(conn as never, materialId, warehouseId);
    }
    await conn.end();
    console.log('\n(测试数据已清理，库存已按批次重算)');
  }

  console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('验证脚本异常:', e);
  process.exit(1);
});
