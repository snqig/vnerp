/**
 * F-003 扩展：sales.shipped / delivery.shipped 的 Saga 补偿验证
 *
 * 验证两个发货事件补偿对三类副作用的撤销能力：
 *   1. 库存归还（含**复活被软删批次**）
 *   2. 写反向冲销流水（trans_type='return'）
 *   3. 应收单软删（按 source_no）
 *   4. 幂等：重复补偿不重复归还
 *
 * 用法：npx tsx --env-file=.env scripts/verify-saga-shipment.ts
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

async function runCase(
  conn: mysql.Connection,
  handler: SagaCompensationHandler,
  mode: 'sales' | 'delivery'
) {
  const sagaId = `ship-${mode}-${Date.now()}`;
  const sourceNo = `SHIPTEST-${mode}-${Date.now()}`;
  const batchNo = `BATCH-SHIP-${mode}-${Date.now()}`;
  const qty = 40;
  const sourceId = 900000 + Math.floor(Math.random() * 99999);

  console.log(`\n----- 场景：${mode === 'sales' ? 'sales.shipped' : 'delivery.shipped'} -----`);

  const [mats] = (await conn.query(
    'SELECT id FROM inv_material WHERE deleted = 0 ORDER BY id LIMIT 1'
  )) as any[];
  const [whs] = (await conn.query(
    'SELECT id FROM inv_warehouse WHERE deleted = 0 ORDER BY id LIMIT 1'
  )) as any[];
  const materialId = mats[0].id;
  const warehouseId = whs[0].id;

  // 清理必须放在 finally：中途断言失败/异常也要还原，否则测试数据会残留污染库
  try {
    await runCaseInner(conn, handler, mode, sagaId, sourceNo, batchNo, qty, sourceId, materialId, warehouseId);
  } finally {
    await conn.execute('DELETE FROM inv_inventory_batch WHERE batch_no = ?', [batchNo]);
    await conn.execute('DELETE FROM fin_receivable WHERE source_no = ?', [sourceNo]);
    await conn.execute(
      'DELETE FROM inv_inventory_transaction WHERE source_type = ? AND source_id = ?',
      ['saga_compensation', sourceId]
    );
    const { recomputeInventorySummary } = await import('../src/lib/inventory-ledger');
    await recomputeInventorySummary(conn as never, materialId, warehouseId);
  }
}

async function runCaseInner(
  conn: mysql.Connection,
  handler: SagaCompensationHandler,
  mode: 'sales' | 'delivery',
  sagaId: string,
  sourceNo: string,
  batchNo: string,
  qty: number,
  sourceId: number,
  materialId: number,
  warehouseId: number
) {
  // 构造正向副作用：批次被扣减至 0 并软删（模拟发货扣减后的状态）
  await conn.execute(
    `INSERT INTO inv_inventory_batch
      (material_id, material_name, batch_no, quantity, available_qty, warehouse_id, inbound_date, status, deleted, create_time)
     VALUES (?, '测试物料', ?, 0, 0, ?, CURDATE(), 1, 1, NOW())`,
    [materialId, batchNo, warehouseId]
  );
  // 必须用真实客户 id：crm_customer.id 实际是 61+，写 1 会撞 FK 约束
  const [custs] = (await conn.query(
    'SELECT id FROM crm_customer WHERE deleted = 0 ORDER BY id LIMIT 1'
  )) as any[];
  await conn.execute(
    `INSERT INTO fin_receivable
      (receivable_no, customer_id, source_type, source_no, amount, received_amount, balance, status, deleted, create_time)
     VALUES (?, ?, 1, ?, 100, 0, 100, 1, 0, NOW())`,
    [`AR-${Date.now()}`, custs[0].id, sourceNo]
  );

  const snap = async () => {
    const [b] = (await conn.query(
      'SELECT COUNT(*) c FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0',
      [batchNo]
    )) as any[];
    const [r] = (await conn.query(
      'SELECT COUNT(*) c FROM fin_receivable WHERE source_no = ? AND deleted = 0',
      [sourceNo]
    )) as any[];
    const [t] = (await conn.query(
      'SELECT COUNT(*) c FROM inv_inventory_transaction WHERE source_type = ? AND source_id = ? AND trans_type = ?',
      ['saga_compensation', sourceId, 'return']
    )) as any[];
    const [q] = (await conn.query(
      'SELECT COALESCE(quantity,0) q FROM inv_inventory_batch WHERE batch_no = ?',
      [batchNo]
    )) as any[];
    return {
      batchAlive: Number(b[0].c),
      receivable: Number(r[0].c),
      reversal: Number(t[0].c),
      batchQty: Number(q[0]?.q ?? 0),
    };
  };

  const before = await snap();
  console.log('  【补偿前】', JSON.stringify(before), '(批次已软删，应收已生成)');

  const shippedItems = [
    { materialId, warehouseId, quantity: qty, batchNo, materialName: '测试物料', unitPrice: 2 },
  ];

  await handler.handle({
    eventType: `saga.compensate.${mode === 'sales' ? 'sales.shipped' : 'delivery.shipped'}`,
    occurredAt: new Date(),
    payload: {
      sagaId,
      originEventType: mode === 'sales' ? 'sales.shipped' : 'delivery.shipped',
      orderId: sourceId,
      orderNo: sourceNo,
      ...(mode === 'delivery' ? { deliveryId: sourceId, deliveryNo: sourceNo } : {}),
      shippedItems,
    },
  } as never);

  const after = await snap();
  console.log('  【补偿后】', JSON.stringify(after));
  check(`[${mode}] 批次已复活并归还数量`, after.batchAlive === 1 && after.batchQty === qty, `数量 ${after.batchQty}/${qty}`);
  check(`[${mode}] 应收单已软删`, after.receivable === 0, `剩余 ${after.receivable}`);
  check(`[${mode}] 已写反向冲销流水`, after.reversal === 1, `${after.reversal} 条`);

  // 幂等
  await handler.handle({
    eventType: `saga.compensate.${mode === 'sales' ? 'sales.shipped' : 'delivery.shipped'}`,
    occurredAt: new Date(),
    payload: {
      sagaId,
      originEventType: mode === 'sales' ? 'sales.shipped' : 'delivery.shipped',
      orderId: sourceId,
      orderNo: sourceNo,
      ...(mode === 'delivery' ? { deliveryId: sourceId, deliveryNo: sourceNo } : {}),
      shippedItems,
    },
  } as never);
  const idem = await snap();
  check(`[${mode}] 幂等：重复补偿不重复归还`, idem.batchQty === qty && idem.reversal === 1, `数量 ${idem.batchQty}，流水 ${idem.reversal} 条`);

}

async function main() {
  const conn = await mysql.createConnection(CONN);
  console.log('===== F-003 扩展：发货类事件 Saga 补偿验证 =====');

  try {
    const handler = new SagaCompensationHandler();
    await runCase(conn, handler, 'sales');
    await runCase(conn, handler, 'delivery');
    console.log('\n(测试数据已清理，库存已按批次重算)');
  } finally {
    await conn.end();
  }

  console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('验证脚本异常:', e);
  process.exit(1);
});
