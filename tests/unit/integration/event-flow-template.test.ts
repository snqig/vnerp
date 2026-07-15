/**
 * 事件流集成测试模板
 *
 * 验证任意领域事件的 Producer → Outbox → Consumer 端到端连通性。
 * 以 FinishOrderApprovedEvent 为示例，覆盖完整事件生命周期。
 *
 * === 四个测试阶段 ===
 * 1. 事件发布：聚合根状态变更 → _domainEvents 收集事件
 * 2. 事件投递：persistEvents → outbox.saveEvents 写入 outbox 表
 * 3. 事件消费：EventBus.publish → Handler.handle 执行业务逻辑
 * 4. 事件幂等：重复投递同一事件 → Handler 不重复处理
 *
 * === 使用方式 ===
 * 复制本文件，替换以下三处即可验证其他事件流：
 *   - Producer：聚合根（如 FinishOrder）及其状态变更方法（如 approve）
 *   - Event：领域事件类（如 FinishOrderApprovedEvent）
 *   - Consumer：Handler 类（如 FinishOrderInventoryHandler）
 *
 * Mock 策略：
 *   - @/lib/db：transaction + mockConn.execute（模拟事务连接）
 *   - @/lib/logger：secureLog 静默
 *   - @/infrastructure/cache/CacheManager：无 Redis（内存模式）
 *   - 真实组件：FinishOrder 聚合、MysqlDomainEventOutboxRepository、InMemoryEventBus、FinishOrderInventoryHandler
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PoolConnection } from 'mysql2/promise';

// vi.hoisted 确保 mock 变量在 vi.mock 工厂中可用（vi.mock 会被提升到文件顶部）
const mocks = vi.hoisted(() => {
  const mockConn = { execute: vi.fn() };
  return {
    mockConn,
    transaction: vi.fn(
      async (cb: (conn: typeof mockConn) => Promise<unknown>) => cb(mockConn)
    ),
    query: vi.fn(),
    execute: vi.fn(),
    getPool: vi.fn(),
    secureLog: vi.fn(),
  };
});

vi.mock('@/lib/db', () => ({
  transaction: mocks.transaction,
  query: mocks.query,
  execute: mocks.execute,
  getPool: mocks.getPool,
}));

vi.mock('@/lib/logger', () => ({
  secureLog: mocks.secureLog,
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    stepStart: vi.fn(),
    stepEnd: vi.fn(),
  },
}));

vi.mock('@/infrastructure/cache/CacheManager', () => ({
  getRedisClientIfAvailable: () => null,
  getCacheManager: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    deletePattern: vi.fn(),
  }),
}));

import { FinishOrder } from '@/domain/production/aggregates/FinishOrder';
import { FinishOrderApprovedEvent } from '@/domain/production/events/FinishOrderEvents';
import { FinishOrderInventoryHandler } from '@/application/handlers/FinishOrderInventoryHandler';
import { InMemoryEventBus } from '@/infrastructure/event-bus/EventBus';
import { MysqlDomainEventOutboxRepository } from '@/infrastructure/repositories/MysqlDomainEventOutboxRepository';
import { DomainError } from '@/domain/shared/DomainTypes';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

// ===== 辅助函数 =====

/** mysql2 conn.execute() 返回 [rows, fields] 元组 */
function mockRows(rows: unknown[]): [unknown[], unknown[]] {
  return [rows, []];
}

/** 模拟 INSERT/UPDATE 的 ResultSetHeader 返回 */
function mockResult(affectedRows: number, insertId = 0): [Record<string, number>, unknown[]] {
  return [
    { affectedRows, insertId, changedRows: affectedRows, fieldCount: 0, serverStatus: 2, warningStatus: 0 },
    [],
  ];
}

/** 构造一个 draft 状态的 FinishOrder（使用 reconstitute，不产生 Created 事件） */
function makeFinishOrder(): FinishOrder {
  return FinishOrder.reconstitute({
    id: 1,
    finishNo: 'FIN001',
    workOrderId: 10,
    warehouseId: 5,
    qualifiedQty: 100,
    defectiveQty: 0,
    createBy: 1,
  });
}

/** 构造一个 FinishOrderApprovedEvent 的纯对象（用于 EventBus 投递） */
function makeApprovedEvent(finishOrderId = 1): DomainEvent {
  return {
    eventType: 'prod.finish.approved',
    occurredAt: new Date(),
    payload: {
      finishOrderId,
      finishNo: 'FIN001',
      workOrderId: 10,
      workOrderNo: 'WO001',
      productName: '彩色包装盒',
      qualifiedQty: 100,
      defectiveQty: 0,
      warehouseId: 5,
      userId: 1,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
});

// ============================================================
// 阶段 1：事件发布 — 聚合根状态变更 → _domainEvents 收集事件
// ============================================================
describe('阶段 1：事件发布 — 聚合根状态变更后领域事件被正确添加', () => {
  it('approve() 后状态变为 approved，_domainEvents 包含 FinishOrderApprovedEvent', () => {
    const order = makeFinishOrder();

    // 初始状态：draft，无事件
    expect(order.status).toBe('draft');
    expect(order.getDomainEvents()).toHaveLength(0);

    // 触发状态变更
    order.approve(1, 'WO001', '彩色包装盒');

    // 验证状态流转
    expect(order.status).toBe('approved');

    // 验证领域事件
    const events = order.getDomainEvents();
    expect(events).toHaveLength(1);

    const event = events[0] as FinishOrderApprovedEvent;
    expect(event.eventType).toBe('prod.finish.approved');
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.payload).toMatchObject({
      finishOrderId: 1,
      finishNo: 'FIN001',
      workOrderId: 10,
      workOrderNo: 'WO001',
      productName: '彩色包装盒',
      qualifiedQty: 100,
      defectiveQty: 0,
      warehouseId: 5,
      userId: 1,
    });
  });

  it('非 draft 状态调用 approve() 抛出 DomainError，不产生新事件', () => {
    const order = makeFinishOrder();
    order.approve(1, 'WO001', '产品A'); // draft → approved

    // 已是 approved 状态，再次 approve 应抛错
    expect(() => order.approve(2, 'WO001', '产品A')).toThrow(DomainError);
    expect(() => order.approve(2, 'WO001', '产品A')).toThrow('只有草稿状态的完工单才能审核');

    // 事件数量仍为 1（第一次 approve 产生），未增加
    expect(order.getDomainEvents()).toHaveLength(1);
  });
});

// ============================================================
// 阶段 2：事件投递 — persistEvents 写入 outbox 表
// ============================================================
describe('阶段 2：事件投递 — saveEvents 将事件写入 domain_event_outbox 表', () => {
  it('saveEvents 在事务连接上执行 INSERT INTO domain_event_outbox', async () => {
    const order = makeFinishOrder();
    order.approve(1, 'WO001', '彩色包装盒');
    const events = order.getDomainEvents();
    expect(events).toHaveLength(1);

    // 使用真实的 MysqlDomainEventOutboxRepository（仅 conn 被 mock）
    const outboxRepo = new MysqlDomainEventOutboxRepository();
    await outboxRepo.saveEvents(
      mocks.mockConn as unknown as PoolConnection,
      'FinishOrder',
      1,
      events
    );

    // 验证 conn.execute 被调用 1 次（1 个事件）
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(1);

    const [sql, params] = mocks.mockConn.execute.mock.calls[0];
    expect(String(sql)).toContain('INSERT INTO domain_event_outbox');
    expect(String(sql)).toContain('event_type');
    expect(String(sql)).toContain('aggregate_type');
    expect(String(sql)).toContain('aggregate_id');
    expect(String(sql)).toContain('payload');
    expect(String(sql)).toContain("'pending'");

    // 验证参数：[eventType, aggregateType, aggregateId, JSON.stringify(event)]
    expect(params[0]).toBe('prod.finish.approved');
    expect(params[1]).toBe('FinishOrder');
    expect(params[2]).toBe(1);
    const payloadStr = params[3] as string;
    expect(() => JSON.parse(payloadStr)).not.toThrow();
    const parsed = JSON.parse(payloadStr);
    expect(parsed.eventType).toBe('prod.finish.approved');
    expect(parsed.payload.finishOrderId).toBe(1);
  });

  it('多个事件时 saveEvents 逐条写入（每事件一条 INSERT）', async () => {
    const event1 = new FinishOrderApprovedEvent({
      finishOrderId: 1,
      finishNo: 'FIN001',
      workOrderId: 10,
      workOrderNo: 'WO001',
      productName: '产品A',
      qualifiedQty: 100,
      defectiveQty: 0,
      warehouseId: 5,
      userId: 1,
    });
    const event2 = new FinishOrderApprovedEvent({
      finishOrderId: 2,
      finishNo: 'FIN002',
      workOrderId: 20,
      workOrderNo: 'WO002',
      productName: '产品B',
      qualifiedQty: 200,
      defectiveQty: 1,
      warehouseId: 6,
      userId: 2,
    });

    const outboxRepo = new MysqlDomainEventOutboxRepository();
    await outboxRepo.saveEvents(
      mocks.mockConn as unknown as PoolConnection,
      'FinishOrder',
      1,
      [event1, event2]
    );

    // 2 个事件 → 2 次 INSERT
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(2);

    // 两次 INSERT 的 eventType 均为 prod.finish.approved
    expect(mocks.mockConn.execute.mock.calls[0][1][0]).toBe('prod.finish.approved');
    expect(mocks.mockConn.execute.mock.calls[1][1][0]).toBe('prod.finish.approved');

    // 验证 payload 中的 finishOrderId 不同（区分两个事件）
    const payload1 = JSON.parse(mocks.mockConn.execute.mock.calls[0][1][3] as string);
    const payload2 = JSON.parse(mocks.mockConn.execute.mock.calls[1][1][3] as string);
    expect(payload1.payload.finishOrderId).toBe(1);
    expect(payload2.payload.finishOrderId).toBe(2);
  });
});

// ============================================================
// 阶段 3：事件消费 — Handler 正确消费事件并执行业务逻辑
// ============================================================
describe('阶段 3：事件消费 — Handler 通过 EventBus 消费事件并执行库存写操作', () => {
  it('EventBus.publish 触发 FinishOrderInventoryHandler 执行库存入库', async () => {
    const bus = new InMemoryEventBus();
    const handler = new FinishOrderInventoryHandler();
    bus.subscribe('prod.finish.approved', handler);

    const event = makeApprovedEvent();

    // mockConn.execute 序列：
    // 1. SELECT prod_work_order → 返回工单产品信息
    // 2. INSERT IGNORE inv_inventory_transaction → affectedRows=1（首次处理）
    // 3. SELECT inv_inventory → 无现有库存
    // 4. INSERT inv_inventory → 新增库存
    mocks.mockConn.execute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 50, product_code: 'P001', product_name: '彩色包装盒' }])
      )
      .mockResolvedValueOnce(mockResult(1)) // INSERT IGNORE → 首次
      .mockResolvedValueOnce(mockRows([])) // 库存查询：无
      .mockResolvedValueOnce(mockResult(1)); // INSERT 库存

    await bus.publish(event);

    // 验证 handler 在事务内执行了 4 次 conn.execute
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(4);

    // 验证执行了 INSERT IGNORE（幂等记录）
    const insertIgnoreCall = mocks.mockConn.execute.mock.calls.find((c) =>
      String(c[0]).includes('INSERT IGNORE') &&
      String(c[0]).includes('inv_inventory_transaction')
    );
    expect(insertIgnoreCall).toBeDefined();

    // 验证执行了库存写操作（INSERT inv_inventory，非 IGNORE、非 transaction 表）
    const invWriteCall = mocks.mockConn.execute.mock.calls.find((c) => {
      const sql = String(c[0]);
      return (
        sql.includes('INSERT') &&
        !sql.includes('IGNORE') &&
        sql.includes('inv_inventory') &&
        !sql.includes('inv_inventory_transaction')
      );
    });
    expect(invWriteCall).toBeDefined();
  });

  it('工单不存在时 Handler 安全跳过（不抛错，不写库存）', async () => {
    const bus = new InMemoryEventBus();
    const handler = new FinishOrderInventoryHandler();
    bus.subscribe('prod.finish.approved', handler);

    const event = makeApprovedEvent();
    // 覆盖 workOrderId 为不存在的值
    (event.payload as Record<string, unknown>).workOrderId = 999;

    // 工单查询返回空
    mocks.mockConn.execute.mockResolvedValueOnce(mockRows([]));

    // 不应抛错
    await expect(bus.publish(event)).resolves.toBeUndefined();

    // 只执行了 1 次（工单查询），无库存写操作
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 阶段 4：事件幂等 — 重复投递同一事件不导致重复处理
// ============================================================
describe('阶段 4：事件幂等 — 重复投递同一事件时 Handler 不重复处理', () => {
  it('同一事件投递两次：首次处理库存，第二次幂等跳过', async () => {
    const bus = new InMemoryEventBus();
    const handler = new FinishOrderInventoryHandler();
    bus.subscribe('prod.finish.approved', handler);

    const event = makeApprovedEvent();

    // 第一次投递：INSERT IGNORE → affectedRows=1 → 处理库存
    mocks.mockConn.execute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 50, product_code: 'P001', product_name: '彩色包装盒' }])
      )
      .mockResolvedValueOnce(mockResult(1)) // INSERT IGNORE → 首次
      .mockResolvedValueOnce(mockRows([])) // 库存查询：无
      .mockResolvedValueOnce(mockResult(1)); // INSERT 库存

    await bus.publish(event);

    const callsAfterFirst = mocks.mockConn.execute.mock.calls.length;

    // 第二次投递（重复事件）：INSERT IGNORE → affectedRows=0 → 幂等跳过
    mocks.mockConn.execute
      .mockResolvedValueOnce(
        mockRows([{ product_id: 50, product_code: 'P001', product_name: '彩色包装盒' }])
      )
      .mockResolvedValueOnce(mockResult(0)); // INSERT IGNORE → 已处理（affectedRows=0）

    await bus.publish(event); // 不应抛错

    const allCalls = mocks.mockConn.execute.mock.calls;
    const secondCalls = allCalls.slice(callsAfterFirst);

    // 第二次只执行了 2 次（工单查询 + INSERT IGNORE），无库存写操作
    expect(secondCalls).toHaveLength(2);

    const hasInvWriteInSecond = secondCalls.some((call) => {
      const sql = String(call[0]);
      const sqlUpper = sql.toUpperCase();
      const isWrite =
        sqlUpper.includes('UPDATE') ||
        (sqlUpper.includes('INSERT') && !sqlUpper.includes('IGNORE'));
      return isWrite && sql.includes('inv_inventory') && !sql.includes('inv_inventory_transaction');
    });
    expect(hasInvWriteInSecond).toBe(false);

    // 两次都使用了事务
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});
