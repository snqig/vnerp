/**
 * SampleOrderApplicationService — 打样单应用服务单元测试
 *
 * 覆盖：
 * - createOrder：创建打样单（事务包裹 save + persistEvents）
 * - submitOrder / confirmOrder / convertOrder / cancelOrder：状态流转与事务行为
 * - createSalesOrderFromSample：T305 自动创建销售订单
 * - getOrderById：未找到抛 NotFoundError
 * - 事务错误回滚、事件持久化、状态转换校验
 *
 * Mock 策略：
 * - @/lib/db: transaction/query + mockConn.execute
 * - @/lib/logger: logger 各方法 mock
 * - @/infrastructure/event-bus/DomainEventOutboxFactory: getDomainEventOutbox
 * - ISampleOrderRepository: 完整 mock 仓储接口
 * - SampleOrder 聚合使用真实类（验证领域行为与事件触发）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConn = { execute: vi.fn() };
  const mockOutbox = { saveEvents: vi.fn().mockResolvedValue(undefined) };
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    stepStart: vi.fn(),
    stepEnd: vi.fn(),
    branch: vi.fn(),
    db: vi.fn(),
    permission: vi.fn(),
  };
  return {
    query: vi.fn(),
    transaction: vi.fn(async (cb: (conn: typeof mockConn) => Promise<unknown>) => cb(mockConn)),
    mockConn,
    mockOutbox,
    mockLogger,
    getDomainEventOutbox: vi.fn(() => mockOutbox),
  };
});

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  transaction: mocks.transaction,
}));

vi.mock('@/lib/logger', () => ({
  logger: mocks.mockLogger,
  generateTraceId: vi.fn(() => 'test-trace-id'),
}));

vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: mocks.getDomainEventOutbox,
}));

import { SampleOrderApplicationService } from '@/application/services/SampleOrderApplicationService';
import { SampleOrder } from '@/domain/sample/aggregates/SampleOrder';
import { SampleOrderStatus } from '@/domain/sample/value-objects/SampleOrderStatus';
import { NotFoundError, DomainError } from '@/domain/shared/DomainTypes';
import type { ISampleOrderRepository } from '@/domain/sample/repositories/ISampleOrderRepository';
import type { SampleOrderProps } from '@/domain/sample/aggregates/SampleOrder';

// ===== Mock 仓储工厂 =====

function createMockRepo(): ISampleOrderRepository {
  return {
    findById: vi.fn(),
    findByOrderNo: vi.fn(),
    findByFilters: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    getNextSequence: vi.fn(),
  } as unknown as ISampleOrderRepository;
}

/** 构造一个 SampleOrderProps 用于 reconstitute */
function makeOrderProps(overrides: Partial<SampleOrderProps> = {}): SampleOrderProps {
  return {
    id: 1,
    orderNo: 'SP2026071500001',
    customerId: 100,
    customerName: '测试客户',
    productName: '测试产品',
    materialNo: 'MAT-001',
    quantity: 10,
    sampleFee: 200,
    status: SampleOrderStatus.DRAFT,
    ...overrides,
  };
}

/** 构造一个已存在的 SampleOrder（用于 findById 返回） */
function makeOrder(overrides: Partial<SampleOrderProps> = {}): SampleOrder {
  return SampleOrder.reconstitute(makeOrderProps(overrides));
}

// MySQL conn.execute 返回 [rows, fields]
function mockExecReturn(overrides: Record<string, unknown> = {}) {
  return [{ affectedRows: 1, insertId: 0, ...overrides }, []];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
  mocks.mockOutbox.saveEvents.mockResolvedValue(undefined);
});

// ============================================================
// createOrder — 创建打样单（事务包裹 save + persistEvents）
// ============================================================
describe('SampleOrderApplicationService.createOrder — 事务行为', () => {
  let service: SampleOrderApplicationService;
  let mockRepo: ISampleOrderRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new SampleOrderApplicationService(mockRepo);
  });

  it('正常创建：事务内 save + persistEvents，返回 id 与 orderNo', async () => {
    (mockRepo.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue('SP2026071500001');
    (mockRepo.save as ReturnType<typeof vi.fn>).mockResolvedValue(100);

    const result = await service.createOrder({
      customerName: '测试客户',
      productName: '测试产品',
      materialNo: 'MAT-001',
    });

    expect(result).toEqual({ id: 100, orderNo: 'SP2026071500001' });

    // 验证事务被调用 1 次
    expect(mocks.transaction).toHaveBeenCalledTimes(1);

    // 验证 save 在事务连接上调用
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const saveArgs = (mockRepo.save as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(saveArgs[0]).toBeInstanceOf(SampleOrder);
    expect(saveArgs[1]).toBe(mocks.mockConn); // 同一事务连接

    // 验证 outbox.saveEvents 被调用（含 SampleOrderCreatedEvent）
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalledTimes(1);
    const [conn, aggregateType, aggregateId, events] = mocks.mockOutbox.saveEvents.mock.calls[0];
    expect(conn).toBe(mocks.mockConn);
    expect(aggregateType).toBe('SampleOrder');
    expect(aggregateId).toBe(100);
    expect(events.length).toBe(1);
    expect((events[0] as { eventType: string }).eventType).toBe('SampleOrderCreated');
  });

  it('save 抛错时：不调用 persistEvents，异常向上抛出', async () => {
    (mockRepo.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue('SP2026071500002');
    const dbError = new Error('DB connection lost');
    (mockRepo.save as ReturnType<typeof vi.fn>).mockRejectedValue(dbError);

    await expect(
      service.createOrder({ customerName: '测试客户' })
    ).rejects.toThrow('DB connection lost');

    // 关键断言：save 抛错时不应持久化事件
    expect(mocks.mockOutbox.saveEvents).not.toHaveBeenCalled();
  });
});

// ============================================================
// submitOrder — 提交打样单（事务包裹 update + persistEvents）
// ============================================================
describe('SampleOrderApplicationService.submitOrder — 状态流转与事务', () => {
  let service: SampleOrderApplicationService;
  let mockRepo: ISampleOrderRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new SampleOrderApplicationService(mockRepo);
  });

  it('正常提交：DRAFT→PENDING，事务内 update + persistEvents', async () => {
    const order = makeOrder({ status: SampleOrderStatus.DRAFT });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    await service.submitOrder(1, 5);

    // 验证 update 在事务内调用
    expect(mockRepo.update).toHaveBeenCalledTimes(1);
    const updateArgs = (mockRepo.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updateArgs[0]).toBe(order);
    expect(updateArgs[1]).toBe(mocks.mockConn); // 同一事务连接

    // 验证 outbox.saveEvents 被调用（含 SampleOrderSubmittedEvent）
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalledTimes(1);
    const [, , , events] = mocks.mockOutbox.saveEvents.mock.calls[0];
    expect((events[0] as { eventType: string }).eventType).toBe('SampleOrderSubmitted');

    // 验证事务后聚合事件被清除
    expect(order.domainEvents.length).toBe(0);
  });

  it('非 DRAFT 状态不可提交：抛 DomainError，不调用 update', async () => {
    const order = makeOrder({ status: SampleOrderStatus.CONFIRMED });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    await expect(service.submitOrder(1, 5)).rejects.toThrow(DomainError);
    await expect(service.submitOrder(1, 5)).rejects.toThrow('不可提交');

    // 关键断言：状态校验失败不应触发事务写入
    expect(mockRepo.update).not.toHaveBeenCalled();
    expect(mocks.mockOutbox.saveEvents).not.toHaveBeenCalled();
  });
});

// ============================================================
// convertOrder — 转大货（事务行为 + 事件 payload 验证）
// ============================================================
describe('SampleOrderApplicationService.convertOrder — 转大货事务行为', () => {
  let service: SampleOrderApplicationService;
  let mockRepo: ISampleOrderRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new SampleOrderApplicationService(mockRepo);
  });

  it('正常转大货：CONFIRMED→CONVERTED，事件 payload 含 salesOrderId', async () => {
    const order = makeOrder({
      status: SampleOrderStatus.CONFIRMED,
      sampleFee: 500,
      feeCharged: 1,
      feeDeductible: 1,
    });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    await service.convertOrder(1, 888, 5);

    expect(mockRepo.update).toHaveBeenCalledTimes(1);
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalledTimes(1);
    const [, , , events] = mocks.mockOutbox.saveEvents.mock.calls[0];
    const event = events[0] as { eventType: string; payload: Record<string, unknown> };
    expect(event.eventType).toBe('SampleOrderConverted');
    expect(event.payload.salesOrderId).toBe(888);
    expect(event.payload.userId).toBe(5);

    // 验证转大货后聚合状态
    expect(order.status).toBe(SampleOrderStatus.CONVERTED);
    expect(order.salesOrderId).toBe(888);

    // 验证 feeDeducted 被标记为 1（已收取且可抵扣的打样费）
    expect(order.feeDeducted).toBe(1);
  });

  it('非 CONFIRMED 状态不可转大货：抛 DomainError', async () => {
    const order = makeOrder({ status: SampleOrderStatus.DRAFT });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    await expect(service.convertOrder(1, 888, 5)).rejects.toThrow('不可转大货');
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});

// ============================================================
// cancelOrder — 作废（reason 透传 + 事件验证）
// ============================================================
describe('SampleOrderApplicationService.cancelOrder — 作废与 reason 透传', () => {
  let service: SampleOrderApplicationService;
  let mockRepo: ISampleOrderRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new SampleOrderApplicationService(mockRepo);
  });

  it('正常作废：reason 透传到事件 payload', async () => {
    const order = makeOrder({ status: SampleOrderStatus.DRAFT });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    await service.cancelOrder(1, '客户取消订单', 5);

    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalledTimes(1);
    const [, , , events] = mocks.mockOutbox.saveEvents.mock.calls[0];
    const event = events[0] as { eventType: string; payload: Record<string, unknown> };
    expect(event.eventType).toBe('SampleOrderCancelled');
    expect(event.payload.reason).toBe('客户取消订单');
    expect(order.status).toBe(SampleOrderStatus.CANCELLED);
  });

  it('已作废状态不可重复作废：抛 DomainError', async () => {
    const order = makeOrder({ status: SampleOrderStatus.CANCELLED });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    await expect(service.cancelOrder(1, '再次作废', 5)).rejects.toThrow('不可作废');
    expect(mocks.mockOutbox.saveEvents).not.toHaveBeenCalled();
  });
});

// ============================================================
// createSalesOrderFromSample — T305 自动创建销售订单
// ============================================================
describe('SampleOrderApplicationService.createSalesOrderFromSample — T305 自动创建销售订单', () => {
  let service: SampleOrderApplicationService;
  let mockRepo: ISampleOrderRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new SampleOrderApplicationService(mockRepo);
  });

  it('正常创建：生成销售订单号、查询物料、写入 sal_order + sal_order_detail', async () => {
    const order = makeOrder({
      status: SampleOrderStatus.CONFIRMED,
      customerId: 200,
      productName: '彩色包装盒',
      materialNo: 'MAT-001',
      quantity: 100,
      sampleFee: 500,
    });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    // query 调用序列：序号计数查询 + 物料查询
    mocks.query
      .mockResolvedValueOnce([{ cnt: 0 }]) // 序号查询：当日无销售订单
      .mockResolvedValueOnce([{ id: 30 }]); // 物料查询：MAT-001 -> id=30

    // conn.execute 调用序列：INSERT sal_order + INSERT sal_order_detail
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 999 })) // INSERT sal_order
      .mockResolvedValueOnce(mockExecReturn()); // INSERT sal_order_detail

    const salesOrderId = await service.createSalesOrderFromSample(1, 5);

    expect(salesOrderId).toBe(999);

    // 验证事务被调用 1 次
    expect(mocks.transaction).toHaveBeenCalledTimes(1);

    // 验证 conn.execute 2 次（sal_order + sal_order_detail）
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(2);

    // 验证销售订单号格式：SO + YYYYMMDD + 4 位序号
    const orderInsertParams = mocks.mockConn.execute.mock.calls[0][1] as unknown[];
    const generatedOrderNo = orderInsertParams[0] as string;
    expect(generatedOrderNo).toMatch(/^SO\d{8}0001$/);

    // 验证 sal_order 参数：customer_id, total_amount
    expect(orderInsertParams[2]).toBe(200); // customer_id
    expect(orderInsertParams[3]).toBe(500); // total_amount = sampleFee
    expect(orderInsertParams[5]).toBe(5); // create_by = userId

    // 验证 sal_order_detail 参数：material_id, material_name, quantity, unit_price
    const detailInsertParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    expect(detailInsertParams[0]).toBe(999); // order_id = 新建的 salesOrderId
    expect(detailInsertParams[1]).toBe(30); // material_id 来自 inv_material 查询
    expect(detailInsertParams[2]).toBe('彩色包装盒'); // material_name = productName
    expect(detailInsertParams[3]).toBe(100); // quantity
    expect(detailInsertParams[4]).toBe(500); // unit_price = sampleFee
  });

  it('无 materialNo 时：materialId=0，不查询 inv_material', async () => {
    const order = makeOrder({
      status: SampleOrderStatus.CONFIRMED,
      customerId: 200,
      productName: '无物料产品',
      materialNo: '',
      quantity: 1,
      sampleFee: 100,
    });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    // 只有序号查询，无物料查询
    mocks.query.mockResolvedValueOnce([{ cnt: 2 }]); // 已有 2 个销售订单
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 1000 }))
      .mockResolvedValueOnce(mockExecReturn());

    const salesOrderId = await service.createSalesOrderFromSample(1, 5);

    expect(salesOrderId).toBe(1000);

    // query 只调用 1 次（序号查询），无物料查询
    expect(mocks.query).toHaveBeenCalledTimes(1);

    // 验证 material_id = 0（无 materialNo 时）
    const detailInsertParams = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    expect(detailInsertParams[1]).toBe(0); // material_id = 0

    // 验证销售订单号序号为 0003（已有 2 个 + 1）
    const orderInsertParams = mocks.mockConn.execute.mock.calls[0][1] as unknown[];
    expect(orderInsertParams[0]).toMatch(/0003$/);
  });

  it('打样单不存在时抛 NotFoundError', async () => {
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.createSalesOrderFromSample(999, 5)).rejects.toThrow(NotFoundError);
    await expect(service.createSalesOrderFromSample(999, 5)).rejects.toThrow('打样单不存在');
    // 不应进入事务
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  // ===== P1-5 补充测试场景 =====

  it('正常流转：CONFIRMED 打样单创建销售订单后返回 salesOrderId，打样单状态不变', async () => {
    const order = makeOrder({
      status: SampleOrderStatus.CONFIRMED,
      customerId: 300,
      productName: '手提袋',
      materialNo: 'MAT-002',
      quantity: 50,
      sampleFee: 800,
    });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    mocks.query
      .mockResolvedValueOnce([{ cnt: 5 }]) // 序号查询：当日已有 5 个销售订单
      .mockResolvedValueOnce([{ id: 40 }]); // 物料查询：MAT-002 -> id=40

    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 777 })) // INSERT sal_order
      .mockResolvedValueOnce(mockExecReturn()); // INSERT sal_order_detail

    const salesOrderId = await service.createSalesOrderFromSample(1, 5);

    expect(salesOrderId).toBe(777);
    // createSalesOrderFromSample 不修改打样单状态，仍为 CONFIRMED
    expect(order.status).toBe(SampleOrderStatus.CONFIRMED);
    // 事务被调用 1 次
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    // conn.execute 2 次（sal_order + sal_order_detail）
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(2);
  });

  it('异常回滚：INSERT sal_order 失败时，错误向上抛出，打样单状态不变', async () => {
    const order = makeOrder({
      status: SampleOrderStatus.CONFIRMED,
      customerId: 300,
      productName: '手提袋',
      materialNo: 'MAT-002',
      quantity: 50,
      sampleFee: 800,
    });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    mocks.query
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce([{ id: 40 }]);

    // INSERT sal_order 抛错（模拟唯一键冲突等 DB 异常）
    const dbError = new Error('Duplicate entry for order_no');
    mocks.mockConn.execute.mockRejectedValueOnce(dbError);

    await expect(service.createSalesOrderFromSample(1, 5)).rejects.toThrow(
      'Duplicate entry for order_no'
    );

    // 关键断言：打样单状态不变（事务回滚，createSalesOrderFromSample 不修改打样单状态）
    expect(order.status).toBe(SampleOrderStatus.CONFIRMED);
    // INSERT sal_order_detail 不应被调用（INSERT sal_order 已失败，事务回滚）
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(1);
    // 事务被调用 1 次（内部抛错导致回滚）
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it('幂等性：已有 salesOrderId 时直接返回，不重复创建', async () => {
    const order = makeOrder({
      status: SampleOrderStatus.CONVERTED,
      customerId: 300,
      salesOrderId: 555,
    });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    const salesOrderId = await service.createSalesOrderFromSample(1, 5);

    // 直接返回已关联的 salesOrderId
    expect(salesOrderId).toBe(555);
    // 不应执行任何 query（序号查询、物料查询）
    expect(mocks.query).not.toHaveBeenCalled();
    // 不应进入事务
    expect(mocks.transaction).not.toHaveBeenCalled();
    // 不应有任何 conn.execute
    expect(mocks.mockConn.execute).not.toHaveBeenCalled();
  });

  it('订单号生成：格式为 SO + YYYYMMDD + 4 位序号，序号基于当日计数递增', async () => {
    const order = makeOrder({
      status: SampleOrderStatus.CONFIRMED,
      customerId: 300,
      productName: '彩盒',
      materialNo: 'MAT-003',
      quantity: 20,
      sampleFee: 300,
    });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    // 当日已有 12 个销售订单 → 下一个序号为 0013
    mocks.query
      .mockResolvedValueOnce([{ cnt: 12 }])
      .mockResolvedValueOnce([{ id: 50 }]);

    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 888 }))
      .mockResolvedValueOnce(mockExecReturn());

    await service.createSalesOrderFromSample(1, 5);

    const orderInsertParams = mocks.mockConn.execute.mock.calls[0][1] as unknown[];
    const generatedOrderNo = orderInsertParams[0] as string;

    // 验证整体格式：SO + 8 位日期 + 4 位序号 = 14 位
    expect(generatedOrderNo).toMatch(/^SO\d{12}$/);

    // 验证日期部分为今天
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    expect(generatedOrderNo).toContain(`SO${y}${m}${d}`);

    // 验证序号为 0013（已有 12 + 1，4 位补零）
    expect(generatedOrderNo).toMatch(/0013$/);
  });

  // ===== P1-8: 并发冲突重试测试 =====

  it('ER_DUP_ENTRY 冲突时重试：序号递增 +1，第二次成功', async () => {
    const order = makeOrder({
      status: SampleOrderStatus.CONFIRMED,
      customerId: 200,
      productName: '彩色包装盒',
      materialNo: 'MAT-001',
      quantity: 100,
      sampleFee: 500,
    });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    mocks.query
      .mockResolvedValueOnce([{ cnt: 0 }]) // 序号查询：当日无销售订单 → baseSeq=1
      .mockResolvedValueOnce([{ id: 30 }]); // 物料查询

    // Attempt 1: INSERT sal_order → ER_DUP_ENTRY
    // Attempt 2: INSERT sal_order → 成功, INSERT sal_order_detail → 成功
    const dupError = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
    mocks.mockConn.execute
      .mockRejectedValueOnce(dupError) // Attempt 1: INSERT sal_order → conflict
      .mockResolvedValueOnce(mockExecReturn({ insertId: 999 })) // Attempt 2: INSERT sal_order
      .mockResolvedValueOnce(mockExecReturn()); // Attempt 2: INSERT sal_order_detail

    const salesOrderId = await service.createSalesOrderFromSample(1, 5);

    expect(salesOrderId).toBe(999);
    // 事务调用 2 次（2 次尝试）
    expect(mocks.transaction).toHaveBeenCalledTimes(2);

    // 验证第一次尝试序号为 0001
    const attempt1Params = mocks.mockConn.execute.mock.calls[0][1] as unknown[];
    expect(attempt1Params[0]).toMatch(/0001$/);

    // 验证第二次尝试序号为 0002（seq + 1）
    const attempt2Params = mocks.mockConn.execute.mock.calls[1][1] as unknown[];
    expect(attempt2Params[0]).toMatch(/0002$/);
  });

  it('ER_DUP_ENTRY 重试 3 次耗尽后抛出 DomainError', async () => {
    const order = makeOrder({
      status: SampleOrderStatus.CONFIRMED,
      customerId: 200,
      productName: '彩色包装盒',
      materialNo: 'MAT-001',
      quantity: 100,
      sampleFee: 500,
    });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    mocks.query
      .mockResolvedValueOnce([{ cnt: 0 }]) // baseSeq=1
      .mockResolvedValueOnce([{ id: 30 }]);

    // 所有 3 次尝试均冲突（使用 mockRejectedValueOnce 避免持久化影响后续测试）
    const dupError = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
    for (let i = 0; i < 3; i++) {
      mocks.mockConn.execute.mockRejectedValueOnce(dupError);
    }

    let thrownError: unknown;
    try {
      await service.createSalesOrderFromSample(1, 5);
    } catch (e) {
      thrownError = e;
    }

    expect(thrownError).toBeInstanceOf(DomainError);
    expect((thrownError as DomainError).code).toBe('SALES_ORDER_NO_CONFLICT');
    expect((thrownError as Error).message).toContain('Sales order number generation failed');
    // 事务调用 3 次（3 次尝试）
    expect(mocks.transaction).toHaveBeenCalledTimes(3);
  });

  it('非 ER_DUP_ENTRY 错误立即抛出，不重试', async () => {
    const order = makeOrder({
      status: SampleOrderStatus.CONFIRMED,
      customerId: 200,
      productName: '彩色包装盒',
      materialNo: 'MAT-001',
      quantity: 100,
      sampleFee: 500,
    });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    mocks.query
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce([{ id: 30 }]);

    // 非 DUP 错误（如连接断开）
    const connError = Object.assign(new Error('Connection lost'), { code: 'ECONNRESET' });
    mocks.mockConn.execute.mockRejectedValueOnce(connError);

    await expect(service.createSalesOrderFromSample(1, 5)).rejects.toThrow('Connection lost');

    // 事务只调用 1 次（不重试）
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    // execute 只调用 1 次
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// getOrderById — 未找到抛 NotFoundError
// ============================================================
describe('SampleOrderApplicationService.getOrderById — 未找到抛错', () => {
  let service: SampleOrderApplicationService;
  let mockRepo: ISampleOrderRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new SampleOrderApplicationService(mockRepo);
  });

  it('findById 返回 null 时抛 NotFoundError', async () => {
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.getOrderById(999)).rejects.toThrow(NotFoundError);
    await expect(service.getOrderById(999)).rejects.toThrow('打样单不存在');
  });

  it('findById 返回 order 时正常返回', async () => {
    const order = makeOrder({ id: 1 });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    const result = await service.getOrderById(1);
    expect(result).toBe(order);
  });
});

// ============================================================
// 事务错误回滚 — transaction 抛错时不清除 domainEvents
// ============================================================
describe('SampleOrderApplicationService — 事务错误回滚', () => {
  let service: SampleOrderApplicationService;
  let mockRepo: ISampleOrderRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new SampleOrderApplicationService(mockRepo);
  });

  it('transaction 抛错时：异常向上抛出，update 未被调用', async () => {
    const order = makeOrder({ status: SampleOrderStatus.DRAFT });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    // 模拟事务失败（不执行 cb）
    const txError = new Error('Transaction failed');
    mocks.transaction.mockRejectedValueOnce(txError);

    await expect(service.submitOrder(1, 5)).rejects.toThrow('Transaction failed');

    // 关键断言：事务失败时 update 未在事务内执行
    expect(mockRepo.update).not.toHaveBeenCalled();
    // outbox 不应被调用
    expect(mocks.mockOutbox.saveEvents).not.toHaveBeenCalled();
  });

  it('persistEvents 抛错时：异常向上抛出（事务回滚）', async () => {
    const order = makeOrder({ status: SampleOrderStatus.DRAFT });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);
    (mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    // outbox.saveEvents 抛错
    const outboxError = new Error('Outbox write failed');
    mocks.mockOutbox.saveEvents.mockRejectedValueOnce(outboxError);

    await expect(service.submitOrder(1, 5)).rejects.toThrow('Outbox write failed');

    // update 已被调用（在抛错前）
    expect(mockRepo.update).toHaveBeenCalledTimes(1);
    // 由于事务内抛错，整个事务会回滚（实际 MySQL 行为由 transaction 实现保证）
    // 这里只验证异常向上传播
  });
});

// ============================================================
// confirmOrder / completeOrder / startProduction — 状态转换错误
// ============================================================
describe('SampleOrderApplicationService — 其他状态转换错误处理', () => {
  let service: SampleOrderApplicationService;
  let mockRepo: ISampleOrderRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new SampleOrderApplicationService(mockRepo);
  });

  it('confirmOrder 在 DRAFT 状态时抛 DomainError', async () => {
    const order = makeOrder({ status: SampleOrderStatus.DRAFT });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    await expect(service.confirmOrder(1, 5)).rejects.toThrow('不可确认');
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('completeOrder 在 DRAFT 状态时抛 DomainError', async () => {
    const order = makeOrder({ status: SampleOrderStatus.DRAFT });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    await expect(service.completeOrder(1, 5)).rejects.toThrow('不可完成');
  });

  it('startProduction 正常流程：PENDING→IN_PROGRESS，事件持久化', async () => {
    const order = makeOrder({ status: SampleOrderStatus.PENDING });
    (mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

    await service.startProduction(1, 5);

    expect(order.status).toBe(SampleOrderStatus.IN_PROGRESS);
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalledTimes(1);
    const [, , , events] = mocks.mockOutbox.saveEvents.mock.calls[0];
    expect((events[0] as { eventType: string }).eventType).toBe('SampleOrderStarted');
  });
});
