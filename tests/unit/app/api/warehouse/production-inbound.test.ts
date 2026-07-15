/**
 * 完工入库 API 路由单元测试
 *
 * 覆盖：
 * - POST：入库单创建（含工单校验、参数校验、错误处理）
 * - PUT action=post：入库过账（含库存更新、FinishOrderApprovedEvent 发布验证）
 * - PUT action=qc：质检流程（pass/fail，自动生成不合格记录）
 * - PUT 通用更新：status/qc_status/remark
 * - DELETE：删除（状态校验）
 *
 * Mock 策略：
 * - @/lib/db: query/execute/transaction + mockConn.execute
 * - @/lib/api-permissions: withPermission 透传 handler（含 try/catch 兜底）
 * - @/lib/api-response: 保留原 successResponse/errorResponse，mock logOperation 防止污染 execute
 * - @/infrastructure/event-bus/DomainEventOutboxFactory: getDomainEventOutbox
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConn = { execute: vi.fn() };
  const mockOutbox = { saveEvents: vi.fn().mockResolvedValue(undefined) };
  return {
    query: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(async (cb: (conn: typeof mockConn) => Promise<unknown>) => cb(mockConn)),
    mockConn,
    mockOutbox,
    getDomainEventOutbox: vi.fn(() => mockOutbox),
    logOperation: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  execute: mocks.execute,
  transaction: mocks.transaction,
}));

vi.mock('@/lib/api-permissions', () => ({
  withPermission: (
    handler: (req: Request, userInfo: { id: number }, ctx?: unknown) => Promise<Response>
  ) => async (request: Request, ctx?: unknown): Promise<Response> => {
    try {
      return await handler(request, { id: 1 }, ctx);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '服务器内部错误';
      return Response.json(
        { code: 500, success: false, message, data: null },
        { status: 500 }
      );
    }
  },
}));

vi.mock('@/lib/api-response', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-response')>('@/lib/api-response');
  return {
    ...actual,
    logOperation: mocks.logOperation,
  };
});

vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: mocks.getDomainEventOutbox,
}));

import { POST, PUT, DELETE } from '@/app/api/warehouse/production-inbound/route';

// ===== Mock 数据工厂 =====

function mockExecReturn(overrides: Record<string, unknown> = {}) {
  return [{ affectedRows: 1, insertId: 0, ...overrides }, []];
}

function mockSelectReturn(rows: unknown[]) {
  return [rows, []];
}

function makeRequest(
  body: unknown,
  method = 'POST',
  url = 'http://localhost/api/warehouse/production-inbound'
): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== null && body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseResponse(res: Response): Promise<{ status: number; data: any }> {
  return { status: res.status, data: await res.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  // mockReset 清除 mockResolvedValueOnce 残留队列，防止上一个测试未消费的 Once 返回值
  // 污染下一个测试（vi.clearAllMocks 只清 mock.calls，不清返回值队列）
  mocks.query.mockReset();
  mocks.execute.mockReset();
  mocks.mockConn.execute.mockReset();
  mocks.transaction.mockImplementation(async (cb) => cb(mocks.mockConn));
  mocks.mockOutbox.saveEvents.mockResolvedValue(undefined);
  mocks.logOperation.mockResolvedValue(undefined);
});

// ============================================================
// POST — 创建入库单
// ============================================================
describe('production-inbound POST — 创建入库单', () => {
  it('正常创建：无工单关联，写入主表+明细', async () => {
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockExecReturn({ insertId: 100 })) // INSERT 主表
      .mockResolvedValueOnce(mockExecReturn()); // INSERT 明细

    const res = await parseResponse(
      await POST(makeRequest({
        warehouse_id: 1,
        inbound_date: '2026-07-15',
        operator_name: '张三',
        qc_status: 'pending',
        items: [
          {
            material_id: 10,
            material_code: 'MAT-001',
            material_name: 'PET薄膜',
            quantity: 100,
            unit: 'kg',
            batch_no: 'B001',
          },
        ],
      }) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.id).toBe(100);
    expect(res.data.data.inbound_no).toMatch(/^PI\d{8}\d{4}$/);

    // 2 conn.execute: INSERT 主表 + INSERT 明细
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(2);

    // INSERT 主表参数验证：work_order_id 为 null（无工单关联）
    const mainInsertParams = mocks.mockConn.execute.mock.calls[0][1] as unknown[];
    expect(mainInsertParams[1]).toBe(null); // work_order_id
    expect(mainInsertParams[3]).toBe(1); // warehouse_id
    expect(mainInsertParams[5]).toBe('张三'); // operator_name
    expect(mainInsertParams[6]).toBe('pending'); // qc_status
  });

  it('有工单关联且工单已审核：写入工单号', async () => {
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([{ id: 50, status: 30 }])) // SELECT 工单
      .mockResolvedValueOnce(mockExecReturn({ insertId: 101 })) // INSERT 主表
      .mockResolvedValueOnce(mockExecReturn()); // INSERT 明细

    const res = await parseResponse(
      await POST(makeRequest({
        work_order_id: 50,
        work_order_no: 'WO-001',
        warehouse_id: 1,
        inbound_date: '2026-07-15',
        items: [{ material_id: 10, quantity: 50 }],
      }) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(res.data.data.id).toBe(101);

    // 工单检查 SQL 包含 FOR UPDATE 锁
    const woSql = mocks.mockConn.execute.mock.calls[0][0] as string;
    expect(woSql).toContain('prod_work_order');
    expect(woSql).toContain('FOR UPDATE');
  });

  it('工单不存在时抛错返回 500', async () => {
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([]));

    const res = await parseResponse(
      await POST(makeRequest({
        work_order_id: 999,
        warehouse_id: 1,
        items: [{ material_id: 10, quantity: 50 }],
      }) as any, {} as any)
    );

    expect(res.status).toBe(500);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toContain('工单不存在');
  });

  it('工单未审核（status<20）时抛错', async () => {
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([{ id: 50, status: 10 }]));

    const res = await parseResponse(
      await POST(makeRequest({
        work_order_id: 50,
        warehouse_id: 1,
        items: [{ material_id: 10, quantity: 50 }],
      }) as any, {} as any)
    );

    expect(res.status).toBe(500);
    expect(res.data.message).toContain('工单未审核');
  });

  it('工单已关闭（status>=90）时抛错', async () => {
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([{ id: 50, status: 90 }]));

    const res = await parseResponse(
      await POST(makeRequest({
        work_order_id: 50,
        warehouse_id: 1,
        items: [{ material_id: 10, quantity: 50 }],
      }) as any, {} as any)
    );

    expect(res.status).toBe(500);
    expect(res.data.message).toContain('工单已关闭');
  });

  it('缺少 warehouse_id 返回 400', async () => {
    const res = await parseResponse(
      await POST(makeRequest({
        items: [{ material_id: 10, quantity: 50 }],
      }) as any, {} as any)
    );

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(mocks.mockConn.execute).not.toHaveBeenCalled();
  });

  it('items 为空数组返回 400', async () => {
    const res = await parseResponse(
      await POST(makeRequest({
        warehouse_id: 1,
        items: [],
      }) as any, {} as any)
    );

    expect(res.status).toBe(400);
    expect(mocks.mockConn.execute).not.toHaveBeenCalled();
  });
});

// ============================================================
// PUT action=post — 入库过账 + 事件发布验证
// ============================================================
describe('production-inbound PUT action=post — 入库过账 + FinishOrderApprovedEvent 发布', () => {
  it('正常过账：库存累加、工单完成、FinishOrderApprovedEvent 发布', async () => {
    const inbound = {
      id: 100,
      inbound_no: 'PI202607150001',
      work_order_id: 50,
      work_order_no: 'WO-001',
      warehouse_id: 1,
      status: 1,
      qc_status: 'pass',
    };
    const items = [
      {
        id: 1,
        material_id: 10,
        material_code: 'MAT-001',
        material_name: 'PET薄膜',
        quantity: 100,
        unit: 'kg',
        batch_no: 'B001',
      },
    ];

    // transaction 内的调用序列
    mocks.mockConn.execute
      .mockResolvedValueOnce(mockSelectReturn([inbound])) // SELECT 入库单 FOR UPDATE
      .mockResolvedValueOnce(mockSelectReturn(items)) // SELECT 入库明细
      .mockResolvedValueOnce(mockSelectReturn([{ id: 200, quantity: 50 }])) // SELECT 现有库存
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE 库存数量累加
      .mockResolvedValueOnce(mockSelectReturn([{ material_code: 'MAT-001' }])) // SELECT 物料编码
      .mockResolvedValueOnce(mockExecReturn()) // INSERT 库存事务流水
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE 入库单 status=3
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE 工单 completed_qty
      .mockResolvedValueOnce(mockSelectReturn([{ plan_qty: 100, completed_qty: 100, status: 30 }])) // SELECT 工单
      .mockResolvedValueOnce(mockExecReturn()); // UPDATE 工单 status=50

    // transaction 之后的调用
    // 注意：源代码 line 281 使用 `const [outboundRows]: Loose = await query(...)` 解构语法，
    // 取数组第一个元素作为 outboundRows，再 outboundRows[0] 取 inboundInfo。
    // 因此 query 需返回双层数组 [[inbound]]，解构后 outboundRows=[inbound]，inboundInfo=inbound。
    mocks.query
      .mockResolvedValueOnce([[inbound]]) // SELECT 入库单（双层数组适配源代码解构）
      .mockResolvedValueOnce(items); // SELECT 入库明细
    mocks.execute.mockResolvedValueOnce(mockExecReturn({ insertId: 1 })); // INSERT qrcode_record

    const res = await parseResponse(
      await PUT(makeRequest({ id: 100, action: 'post' }, 'PUT') as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toBe('入库过账成功');

    // ===== 核心断言：FinishOrderApprovedEvent 已通过 outbox.saveEvents 发布 =====
    expect(mocks.mockOutbox.saveEvents).toHaveBeenCalledTimes(1);
    const saveEventsArgs = mocks.mockOutbox.saveEvents.mock.calls[0];
    expect(saveEventsArgs[1]).toBe('ProductionInbound'); // aggregateType
    expect(saveEventsArgs[2]).toBe(100); // aggregateId = id
    const events = saveEventsArgs[3] as unknown[];
    expect(events.length).toBe(1);
    // 验证事件类型
    const event = events[0] as { eventType: string; payload: Record<string, unknown> };
    expect(event.eventType).toBe('prod.finish.approved');
    // 验证事件 payload 关键字段
    expect(event.payload.finishOrderId).toBe(100);
    expect(event.payload.finishNo).toBe('PI202607150001');
    expect(event.payload.workOrderId).toBe(50);
    expect(event.payload.workOrderNo).toBe('WO-001');
    expect(event.payload.productName).toBe('PET薄膜');
    expect(event.payload.qualifiedQty).toBe(100);
    expect(event.payload.warehouseId).toBe(1);

    // 验证二维码生成（transaction 之后执行）
    const qrInsertCalls = mocks.execute.mock.calls.filter(
      ([sql]) => (sql as string).includes('INSERT INTO qrcode_record')
    );
    expect(qrInsertCalls).toHaveLength(1);
    const qrParams = qrInsertCalls[0][1] as unknown[];
    // SQL: (?, 'product', ?, ?, ...) — qr_type 是字面量非占位符，故参数数组为：
    // [0]qr_code [1]ref_id=id [2]ref_no=inbound_no [3]material_id ...
    expect(qrParams[0]).toMatch(/^PR-/); // qr_code 前缀
    expect(qrParams[1]).toBe(100); // ref_id = id
    expect(qrParams[2]).toBe('PI202607150001'); // ref_no = inbound_no
  });

  it('入库单不存在时抛错且不发布事件', async () => {
    mocks.mockConn.execute.mockResolvedValueOnce(mockSelectReturn([]));

    const res = await parseResponse(
      await PUT(makeRequest({ id: 999, action: 'post' }, 'PUT') as any, {} as any)
    );

    expect(res.status).toBe(500);
    expect(res.data.message).toContain('入库单不存在');
    // 不应发布事件
    expect(mocks.mockOutbox.saveEvents).not.toHaveBeenCalled();
  });

  it('入库单已完成（status>=3）时抛错：不能重复过账', async () => {
    mocks.mockConn.execute.mockResolvedValueOnce(
      mockSelectReturn([{ id: 100, inbound_no: 'PI001', status: 3, qc_status: 'pass' }])
    );

    const res = await parseResponse(
      await PUT(makeRequest({ id: 100, action: 'post' }, 'PUT') as any, {} as any)
    );

    expect(res.status).toBe(500);
    expect(res.data.message).toContain('不能重复过账');
    expect(mocks.mockOutbox.saveEvents).not.toHaveBeenCalled();
  });

  it('质检不合格时抛错：不能入库', async () => {
    mocks.mockConn.execute.mockResolvedValueOnce(
      mockSelectReturn([{ id: 100, inbound_no: 'PI001', status: 1, qc_status: 'fail' }])
    );

    const res = await parseResponse(
      await PUT(makeRequest({ id: 100, action: 'post' }, 'PUT') as any, {} as any)
    );

    expect(res.status).toBe(500);
    expect(res.data.message).toContain('质检不合格');
  });
});

// ============================================================
// PUT action=qc — 质检流程
// ============================================================
describe('production-inbound PUT action=qc — 质检流程', () => {
  it('质检全部通过：qc_status=pass，不生成不合格记录', async () => {
    mocks.execute.mockResolvedValueOnce(mockExecReturn()); // UPDATE 入库单 qc_status

    const res = await parseResponse(
      await PUT(makeRequest(
        { id: 100, action: 'qc', qc_results: [{ item_id: 1, result: 'pass' }] },
        'PUT'
      ) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(res.data.data.qc_status).toBe('pass');
    // 只调用 1 次 execute（UPDATE 入库单），不查询明细、不插入不合格记录
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('质检存在不合格：qc_status=fail，自动生成 qc_unqualified 记录', async () => {
    const items = [
      { id: 1, material_id: 10, material_code: 'MAT-001', material_name: 'PET薄膜', quantity: 100 },
    ];

    mocks.execute
      .mockResolvedValueOnce(mockExecReturn()) // UPDATE 入库单 qc_status
      .mockResolvedValueOnce(mockExecReturn()); // INSERT qc_unqualified
    // 源代码 line 347 使用 `const [itemRows]: Loose = await query(...)` 解构语法，
    // 取数组第一个元素。需返回双层数组 [items]，解构后 itemRows=items（可迭代数组）。
    mocks.query.mockResolvedValueOnce([items]); // SELECT 入库明细（双层数组适配源代码解构）

    const res = await parseResponse(
      await PUT(makeRequest(
        {
          id: 100,
          action: 'qc',
          qc_results: [
            { item_id: 1, result: 'fail' },
            { item_id: 2, result: 'pass' },
          ],
        },
        'PUT'
      ) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(res.data.data.qc_status).toBe('fail');
    // INSERT qc_unqualified 应调用 1 次（只有 item_id=1 不合格）
    const insertCalls = mocks.execute.mock.calls.filter(
      ([sql]) => (sql as string).includes('INSERT INTO qc_unqualified')
    );
    expect(insertCalls).toHaveLength(1);
    // 验证不合格记录参数
    const insertParams = insertCalls[0][1] as unknown[];
    expect(insertParams[2]).toBe(10); // material_id
    expect(insertParams[3]).toBe('MAT-001'); // material_code
    expect(insertParams[4]).toBe('PET薄膜'); // material_name
    expect(insertParams[5]).toBe(100); // quantity
  });
});

// ============================================================
// PUT — 通用字段更新（status/qc_status/remark）
// ============================================================
describe('production-inbound PUT — 通用字段更新', () => {
  it('同时更新 status/qc_status/remark 三个字段', async () => {
    mocks.execute.mockResolvedValue(mockExecReturn());

    const res = await parseResponse(
      await PUT(makeRequest(
        { id: 100, status: 2, qc_status: 'pass', remark: '测试备注' },
        'PUT'
      ) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(mocks.execute).toHaveBeenCalledTimes(3);
    // 验证 SQL 分别包含对应字段更新
    const sqls = mocks.execute.mock.calls.map(([sql]) => sql as string);
    expect(sqls.some((s) => s.includes('SET status = ?'))).toBe(true);
    expect(sqls.some((s) => s.includes('SET qc_status = ?'))).toBe(true);
    expect(sqls.some((s) => s.includes('SET remark = ?'))).toBe(true);
  });
});

// ============================================================
// DELETE — 删除入库单
// ============================================================
describe('production-inbound DELETE — 删除入库单', () => {
  it('正常删除草稿入库单', async () => {
    mocks.query.mockResolvedValueOnce([{ status: 1 }]);
    mocks.execute.mockResolvedValueOnce(mockExecReturn());

    const res = await parseResponse(
      await DELETE(
        new Request('http://localhost/api/warehouse/production-inbound?id=100', {
          method: 'DELETE',
        }) as any,
        {} as any
      )
    );

    expect(res.status).toBe(200);
    const updateSql = mocks.execute.mock.calls[0][0] as string;
    expect(updateSql).toContain('SET deleted = 1');
  });

  it('已完成的入库单（status>=3）不能删除', async () => {
    mocks.query.mockResolvedValueOnce([{ status: 3 }]);

    const res = await parseResponse(
      await DELETE(
        new Request('http://localhost/api/warehouse/production-inbound?id=100', {
          method: 'DELETE',
        }) as any,
        {} as any
      )
    );

    expect(res.status).toBe(400);
    expect(res.data.message).toContain('不能删除');
  });

  it('入库单不存在时返回 404', async () => {
    mocks.query.mockResolvedValueOnce([]);

    const res = await parseResponse(
      await DELETE(
        new Request('http://localhost/api/warehouse/production-inbound?id=999', {
          method: 'DELETE',
        }) as any,
        {} as any
      )
    );

    expect(res.status).toBe(404);
    expect(res.data.message).toContain('不存在');
  });
});
