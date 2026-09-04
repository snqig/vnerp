/**
 * F-003 Saga 编排接入验证（EventBus 层）
 *
 * 验收标准：注入一个永久失败的 handler，其**兄弟 handler 已提交的副作用必须被自动撤销**。
 *
 * 验证路径：
 *   1. 构造 workorder.completed 事件（Saga 编排事件）
 *   2. 注册 3 个 handler：A(成功·写库存) → B(失败·抛错) → C(不会执行)
 *   3. publish → 断言：抛出 B 的错误；A 的副作用被补偿撤销；C 未执行
 *   4. 再次 publish 同一 saga → 断言补偿幂等
 *
 * 用法：npx tsx --env-file=.env scripts/verify-saga-orchestration.ts
 */
import { InMemoryEventBus } from '../src/infrastructure/event-bus/EventBus';
import type { DomainEvent } from '../src/domain/shared/DomainTypes';
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

/** 模拟"写库存"的正向 handler（对应 WorkOrderCompletedHandler 的副作用） */
class FakeInventoryHandler {
  static executed = 0;
  constructor(private conn: mysql.Connection) {}
  async handle(event: DomainEvent) {
    FakeInventoryHandler.executed++;
    const p = event.payload as Record<string, unknown>;
    await this.conn.execute(
      // 批次号需与真实 WorkOrderCompletedHandler 一致：`WO{workOrderNo}{时间戳后缀}`
      // 补偿逻辑按 `WO{workOrderNo}%` 前缀匹配撤销，格式不符会导致补偿落空。
      `INSERT INTO inv_inventory_batch
         (material_id, material_name, batch_no, quantity, available_qty, warehouse_id, inbound_date, status, create_time)
       VALUES (?, '测试物料', ?, ?, ?, ?, CURDATE(), 1, NOW())`,
      [
        p.materialId,
        `WO${p.batchPrefix}000001`,
        p.quantity,
        p.quantity,
        p.warehouseId,
      ]
    );
  }
}

/** 永久失败的 handler（模拟下游服务不可用 / 数据非法） */
class AlwaysFailingHandler {
  static executed = 0;
  async handle() {
    AlwaysFailingHandler.executed++;
    throw new Error('模拟永久失败：下游凭证服务不可用');
  }
}

/** 排在失败者之后的 handler，用于验证"失败即中断" */
class NeverReachedHandler {
  static executed = 0;
  async handle() {
    NeverReachedHandler.executed++;
  }
}

async function main() {
  const conn = await mysql.createConnection(CONN);
  console.log('===== F-003 Saga 编排接入验证（EventBus 层）=====\n');

  try {
    const [mats] = (await conn.query(
      'SELECT id FROM inv_material WHERE deleted = 0 ORDER BY id LIMIT 1'
    )) as any[];
    const [whs] = (await conn.query(
      'SELECT id FROM inv_warehouse WHERE deleted = 0 ORDER BY id LIMIT 1'
    )) as any[];
    const materialId = mats[0].id;
    const warehouseId = whs[0].id;

    const sagaId = `orch-test-${Date.now()}`;
    const batchPrefix = `WO-ORCHTEST-${Date.now()}`;
    const quantity = 50;

    // 构造事件总线（隔离于全局 EventBus，避免污染真实链路）
    const bus = new InMemoryEventBus();
    bus.subscribe('workorder.completed', new FakeInventoryHandler(conn));
    bus.subscribe('workorder.completed', new AlwaysFailingHandler());
    bus.subscribe('workorder.completed', new NeverReachedHandler());
    // 补偿订阅者
    bus.subscribe('saga.compensate.workorder.completed', new SagaCompensationHandler());

    // 建一个可补偿的测试工单（compensateInventoryInbound 依赖它取 product/warehouse/qty）
    const [woRes] = (await conn.execute(
      `INSERT INTO prod_work_order
        (work_order_no, product_id, product_code, product_name, quantity, warehouse_id, status, deleted, create_time)
       VALUES (?, ?, 'TEST', '测试物料', ?, ?, 'completed', 1, NOW())`,
      [batchPrefix, materialId, quantity, warehouseId]
    )) as any;
    const workOrderId = Number(woRes.insertId);

    const countBatches = async () => {
      const [r] = (await conn.query(
        'SELECT COUNT(*) c FROM inv_inventory_batch WHERE batch_no LIKE ? AND deleted = 0',
        [`${batchPrefix}%`]
      )) as any[];
      return Number(r[0].c);
    };
    const countReversal = async () => {
      const [r] = (await conn.query(
        'SELECT COUNT(*) c FROM inv_inventory_transaction WHERE source_type = ? AND source_id = ?',
        ['saga_compensation', workOrderId]
      )) as any[];
      return Number(r[0].c);
    };

    console.log('--- 场景：中间 handler 永久失败，验证兄弟副作用被撤销 ---');
    check('前置：批次为 0', (await countBatches()) === 0);

    let thrown: Error | null = null;
    try {
      await bus.publish({
        eventType: 'workorder.completed',
        occurredAt: new Date(),
        payload: { sagaId, workOrderId, materialId, warehouseId, quantity, batchPrefix },
      } as unknown as DomainEvent);
    } catch (e) {
      thrown = e as Error;
    }

    check('publish 抛出失败 handler 的错误', thrown !== null, thrown?.message ?? '未抛错');
    check('失败者之后的 handler 未执行', NeverReachedHandler.executed === 0, 'C 未执行');
    check(
      '失败者之前的 handler 已执行（产生了待补偿的副作用）',
      FakeInventoryHandler.executed === 1,
      'A 已执行'
    );

    const batchesAfter = await countBatches();
    check('A 写入的批次已被补偿撤销', batchesAfter === 0, `剩余未删批次 ${batchesAfter}`);

    const revCount = await countReversal();
    check('已写反向冲销流水（红字冲销）', revCount === 1, `${revCount} 条`);

    console.log('\n--- 幂等：重复触发补偿不重复写入 ---');
    // 再次 publish（A 会再写一条批次，然后 B 再失败，再补偿一次）
    try {
      await bus.publish({
        eventType: 'workorder.completed',
        occurredAt: new Date(),
        payload: { sagaId, workOrderId, materialId, warehouseId, quantity, batchPrefix },
      } as unknown as DomainEvent);
    } catch {
      /* 预期失败 */
    }
    const revCount2 = await countReversal();
    check(
      '同一 sagaId 重复补偿不重复写冲销流水',
      revCount2 === 1,
      `仍为 ${revCount2} 条（幂等生效）`
    );
    const finalBatches = await countBatches();
    check('批次仍被撤销', finalBatches === 0, `剩余 ${finalBatches}`);

    // ---------- 清理 ----------
    await conn.execute('DELETE FROM inv_inventory_transaction WHERE source_id = ? AND source_type = ?', [
      workOrderId,
      'saga_compensation',
    ]);
    await conn.execute('DELETE FROM inv_inventory_batch WHERE batch_no LIKE ?', [`${batchPrefix}%`]);
    await conn.execute('DELETE FROM prod_work_order WHERE id = ?', [workOrderId]);
    const { recomputeInventorySummary } = await import('../src/lib/inventory-ledger');
    await recomputeInventorySummary(conn as never, materialId, warehouseId);
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
