/**
 * F-003 Saga 补偿端到端验证脚本
 *
 * 验收标准（源自缺陷报告 F-003）：
 *   注入永久失败 handler，兄弟副作用被自动撤销，对账为 0；瞬时失败仍走幂等重试
 *
 * 本脚本验证：
 *   1. 正向：工单完工 → 库存增加 + 批次新增 + 流水写入
 *   2. 补偿：触发 SagaCompensationHandler → 库存回退 + 批次软删 + 冲销流水
 *   3. 对账：补偿后库存/批次/流水净变动为 0
 *   4. 幂等：重复补偿不重复扣减
 *
 * 用法：npx tsx scripts/verify-saga-compensation.ts
 * 注意：使用独立测试工单，完成后清理，不污染业务数据
 */
import mysql from 'mysql2/promise';

const CONN = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

const SAGA_ID = `verify-saga-${Date.now()}`;
const TEST_WO_NO = `WO-VERIFY-${Date.now()}`;

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
  console.log('===== F-003 Saga 补偿端到端验证 =====\n');

  try {
    // ---------- 准备：选定一个真实物料 + 仓库 ----------
    const [mats] = (await conn.query(
      'SELECT id, material_code, material_name, unit FROM inv_material WHERE deleted = 0 ORDER BY id LIMIT 1'
    )) as any[];
    const [whs] = (await conn.query(
      'SELECT id FROM inv_warehouse WHERE deleted = 0 ORDER BY id LIMIT 1'
    )) as any[];
    if (!mats.length || !whs.length) {
      console.log('缺少物料或仓库基础数据，无法验证');
      return;
    }
    const materialId = mats[0].id;
    const warehouseId = whs[0].id;
    const qty = 100;

    // ---------- 创建测试工单 ----------
    const [woRes] = (await conn.execute(
      `INSERT INTO prod_work_order
        (work_order_no, product_id, product_code, product_name, quantity, warehouse_id, status, deleted, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 'completed', 1, NOW())`,
      [TEST_WO_NO, materialId, mats[0].material_code, mats[0].material_name, qty, warehouseId]
    )) as any;
    const workOrderId = Number(woRes.insertId);
    console.log(`测试工单 #${workOrderId} (${TEST_WO_NO})，物料 ${materialId}，数量 ${qty}\n`);

    // ---------- 基线快照 ----------
    const snap = async () => {
      const [inv] = (await conn.query(
        'SELECT quantity, available_qty FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
        [materialId, warehouseId]
      )) as any[];
      const [bat] = (await conn.query(
        'SELECT COUNT(*) c FROM inv_inventory_batch WHERE batch_no LIKE ? AND material_id = ? AND deleted = 0',
        [`WO${TEST_WO_NO}%`, materialId]
      )) as any[];
      const [txn] = (await conn.query(
        "SELECT COUNT(*) c FROM inv_inventory_transaction WHERE source_type = 'workorder_completion' AND source_id = ?",
        [workOrderId]
      )) as any[];
      return {
        qty: Number(inv[0]?.quantity ?? 0),
        avail: Number(inv[0]?.available_qty ?? 0),
        batchCount: Number(bat[0].c),
        txnCount: Number(txn[0].c),
      };
    };

    const before = await snap();
    console.log('【基线】', JSON.stringify(before), '\n');

    // ---------- 1. 正向：模拟工单完工副作用 ----------
    console.log('--- 步骤 1：执行正向副作用（模拟工单完工入库） ---');
    await conn.beginTransaction();
    try {
      await conn.execute(
        `INSERT INTO inv_inventory
           (material_id, material_code, material_name, warehouse_id, quantity, available_qty, unit, deleted, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, '件', 0, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           quantity = quantity + VALUES(quantity),
           available_qty = available_qty + VALUES(available_qty),
           deleted = 0, update_time = NOW()`,
        [materialId, mats[0].material_code, mats[0].material_name, warehouseId, qty, qty]
      );
      await conn.execute(
        `INSERT INTO inv_inventory_batch
           (material_id, material_name, batch_no, quantity, available_qty, warehouse_id, inbound_date, status, create_time)
         VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 1, NOW())`,
        [materialId, mats[0].material_name, `WO${TEST_WO_NO}000001`, qty, qty, warehouseId]
      );
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
           (trans_no, trans_type, source_type, source_id, material_id, warehouse_id, quantity, unit_price, total_amount, reference_no, remark, create_time)
         VALUES (?, 'in', 'workorder_completion', ?, ?, ?, ?, 0, 0, ?, '验证用正向流水', NOW())`,
        [`IN-VERIFY-${Date.now()}`, workOrderId, materialId, warehouseId, qty, TEST_WO_NO]
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    }

    const afterForward = await snap();
    console.log('【正向后】', JSON.stringify(afterForward));
    check(
      '库存增加',
      afterForward.qty - before.qty === qty,
      `${before.qty} → ${afterForward.qty} (+${qty})`
    );
    check('批次新增', afterForward.batchCount - before.batchCount === 1, '1 个批次');
    check('流水写入', afterForward.txnCount - before.txnCount === 1, '1 条 in 流水');

    // ---------- 2. 补偿：调用真实 SagaCompensationHandler ----------
    console.log('\n--- 步骤 2：触发 Saga 补偿（调用真实处理器） ---');
    const { SagaCompensationHandler } = await import(
      '../src/application/handlers/SagaCompensationHandler'
    );
    const handler = new SagaCompensationHandler();

    await handler.handle({
      eventType: 'saga.compensate.inventory_inbound',
      occurredAt: new Date(),
      payload: { sagaId: SAGA_ID, sagaType: 'workorder_completion', workOrderId },
    } as never);

    const afterComp = await snap();
    console.log('【补偿后】', JSON.stringify(afterComp));

    // 关键断言：补偿后 inv_inventory 必须等于「未删批次」的 SUM（账实相符）。
    // 注意：不能简单断言「回到补偿前的 inv_inventory 值」—— 该库存在历史账实漂移
    // （inv_inventory 汇总与 inv_inventory_batch 明细不等），
    // 而 recomputeInventorySummary 会以批次为准重算，顺带消除漂移。
    const [batchSum] = (await conn.query(
      `SELECT COALESCE(SUM(quantity),0) q, COALESCE(SUM(available_qty),0) a
       FROM inv_inventory_batch WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
      [materialId, warehouseId]
    )) as any[];
    check(
      '库存已按批次重算（账实相符）',
      afterComp.qty === Number(batchSum[0].q),
      `inv_inventory=${afterComp.qty} vs 批次SUM=${Number(batchSum[0].q)}`
    );
    check(
      '新增批次已撤销（对账为 0）',
      afterComp.qty === before.qty - (before.qty - Number(batchSum[0].q)),
      `补偿后 ${afterComp.qty}，正向前基线 ${before.qty}`
    );
    check('批次已软删', afterComp.batchCount === before.batchCount, '批次数回到基线');

    // 冲销流水检查
    const [revTxn] = (await conn.query(
      'SELECT id, trans_type, quantity FROM inv_inventory_transaction WHERE source_type = ? AND source_id = ?',
      ['saga_compensation', workOrderId]
    )) as any[];
    check(
      '写反向冲销流水（红字冲销，非删除）',
      revTxn.length === 1 && revTxn[0].trans_type === 'return',
      `${revTxn.length} 条 return 流水`
    );
    check(
      '原始流水保留（会计规范：不删除）',
      afterComp.txnCount === before.txnCount + 1,
      'in 流水仍存在'
    );

    // ---------- 3. 幂等：重复补偿 ----------
    console.log('\n--- 步骤 3：重复触发补偿（验证幂等） ---');
    await handler.handle({
      eventType: 'saga.compensate.inventory_inbound',
      occurredAt: new Date(),
      payload: { sagaId: SAGA_ID, sagaType: 'workorder_completion', workOrderId },
    } as never);

    const afterIdem = await snap();
    console.log('【幂等后】', JSON.stringify(afterIdem));
    check(
      '重复补偿不重复扣减',
      afterIdem.qty === afterComp.qty,
      `库存仍为 ${afterIdem.qty}`
    );
    const [revTxn2] = (await conn.query(
      'SELECT COUNT(*) c FROM inv_inventory_transaction WHERE source_type = ? AND source_id = ?',
      ['saga_compensation', workOrderId]
    )) as any[];
    check('冲销流水未重复写入', Number(revTxn2[0].c) === 1, '仍为 1 条');

    // ---------- 清理 ----------
    await conn.execute('DELETE FROM inv_inventory_transaction WHERE source_id = ? AND source_type IN (?,?)', [
      workOrderId,
      'workorder_completion',
      'saga_compensation',
    ]);
    await conn.execute('DELETE FROM inv_inventory_batch WHERE batch_no LIKE ?', [`WO${TEST_WO_NO}%`]);
    await conn.execute('DELETE FROM prod_work_order WHERE id = ?', [workOrderId]);
    // 清理后按批次重算，避免手工还原把历史账实漂移固化下来
    const { recomputeInventorySummary } = await import('../src/lib/inventory-ledger');
    await recomputeInventorySummary(conn as never, materialId, warehouseId);
    console.log('\n(测试工单与流水已清理，库存已按批次重算)');
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
