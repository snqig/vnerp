/**
 * 打样单状态管理 API 路由单元测试
 *
 * 覆盖：
 * - 各种状态转换：submit / startProduction / complete / confirm / convert / cancel
 * - convert 分支无 salesOrderId 时自动创建销售订单（T305 验证）
 * - 参数校验（缺少 id/action、不支持的操作）
 * - 错误处理（service 抛错时返回 400）
 * - reason 默认值（'手动作废'）
 *
 * Mock 策略：
 * - @/lib/api-permissions: withPermission 透传 handler（含 userInfo.id）
 * - @/lib/api-response: 保留原 successResponse/errorResponse，mock logOperation
 * - @/application/services/SampleOrderApplicationService: 整个 service 类 mock
 * - @/infrastructure/repositories/MysqlSampleOrderRepository: 构造函数 mock
 * - @/lib/logger: logger 各方法 mock
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const service = {
    submitOrder: vi.fn().mockResolvedValue(undefined),
    startProduction: vi.fn().mockResolvedValue(undefined),
    completeOrder: vi.fn().mockResolvedValue(undefined),
    confirmOrder: vi.fn().mockResolvedValue(undefined),
    convertOrder: vi.fn().mockResolvedValue(undefined),
    cancelOrder: vi.fn().mockResolvedValue(undefined),
    createSalesOrderFromSample: vi.fn().mockResolvedValue(0),
  };
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
    service,
    mockLogger,
    logOperation: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/api-permissions', () => ({
  withPermission: (
    handler: (req: Request, userInfo: { id: number }, ctx?: unknown) => Promise<Response>,
    _options?: { logTitle?: string }
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

// 注意：不能用 vi.fn(() => mocks.service)，箭头函数无 [[Construct]]，new 调用会抛
// "is not a constructor"。改用 class 形式，constructor 显式 return 对象覆盖 new 实例。
vi.mock('@/application/services/SampleOrderApplicationService', () => ({
  SampleOrderApplicationService: class {
    constructor() {
      return mocks.service;
    }
  },
}));

vi.mock('@/infrastructure/repositories/MysqlSampleOrderRepository', () => ({
  MysqlSampleOrderRepository: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: mocks.mockLogger,
  generateTraceId: vi.fn(() => 'test-trace-id'),
}));

import { PUT } from '@/app/api/sample/orders/status/route';

// ===== 工具函数 =====

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/sample/orders/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function parseResponse(res: Response): Promise<{ status: number; data: any }> {
  return { status: res.status, data: await res.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  // 重置 service 各方法默认行为
  mocks.service.submitOrder.mockResolvedValue(undefined);
  mocks.service.startProduction.mockResolvedValue(undefined);
  mocks.service.completeOrder.mockResolvedValue(undefined);
  mocks.service.confirmOrder.mockResolvedValue(undefined);
  mocks.service.convertOrder.mockResolvedValue(undefined);
  mocks.service.cancelOrder.mockResolvedValue(undefined);
  mocks.service.createSalesOrderFromSample.mockResolvedValue(0);
});

// ============================================================
// 参数校验
// ============================================================
describe('sample/orders/status PUT — 参数校验', () => {
  it('缺少 id 返回 400', async () => {
    const res = await parseResponse(
      await PUT(makeRequest({ action: 'submit' }) as any, {} as any)
    );

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toContain('缺少必填参数');
    // service 不应被调用
    expect(mocks.service.submitOrder).not.toHaveBeenCalled();
  });

  it('缺少 action 返回 400', async () => {
    const res = await parseResponse(
      await PUT(makeRequest({ id: 1 }) as any, {} as any)
    );

    expect(res.status).toBe(400);
    expect(res.data.message).toContain('缺少必填参数');
  });

  it('不支持的 action 返回 400', async () => {
    const res = await parseResponse(
      await PUT(makeRequest({ id: 1, action: 'unknown_action' }) as any, {} as any)
    );

    expect(res.status).toBe(400);
    expect(res.data.message).toContain('不支持的操作');
  });
});

// ============================================================
// 状态转换：单方法验证
// ============================================================
describe('sample/orders/status PUT — 各状态转换调用对应 service 方法', () => {
  it('submit 调用 service.submitOrder(id, userId)', async () => {
    const res = await parseResponse(
      await PUT(makeRequest({ id: 10, action: 'submit' }) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(mocks.service.submitOrder).toHaveBeenCalledWith(10, 1);
    expect(res.data.data).toEqual({ id: 10, action: 'submit' });
  });

  it('startProduction 调用 service.startProduction(id, userId)', async () => {
    const res = await parseResponse(
      await PUT(makeRequest({ id: 11, action: 'startProduction' }) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(mocks.service.startProduction).toHaveBeenCalledWith(11, 1);
  });

  it('complete 调用 service.completeOrder(id, userId)', async () => {
    const res = await parseResponse(
      await PUT(makeRequest({ id: 12, action: 'complete' }) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(mocks.service.completeOrder).toHaveBeenCalledWith(12, 1);
  });

  it('confirm 调用 service.confirmOrder(id, userId)', async () => {
    const res = await parseResponse(
      await PUT(makeRequest({ id: 13, action: 'confirm' }) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(mocks.service.confirmOrder).toHaveBeenCalledWith(13, 1);
  });
});

// ============================================================
// convert 分支 — T305：无 salesOrderId 时自动创建销售订单
// ============================================================
describe('sample/orders/status PUT convert — T305 自动创建销售订单', () => {
  it('有 salesOrderId：直接调用 convertOrder，不调用 createSalesOrderFromSample', async () => {
    const res = await parseResponse(
      await PUT(
        makeRequest({ id: 20, action: 'convert', salesOrderId: 888 }) as any,
        {} as any
      )
    );

    expect(res.status).toBe(200);
    expect(mocks.service.convertOrder).toHaveBeenCalledWith(20, 888, 1);
    // 关键断言：不应调用自动创建销售订单
    expect(mocks.service.createSalesOrderFromSample).not.toHaveBeenCalled();
  });

  it('无 salesOrderId：自动调用 createSalesOrderFromSample 并以返回值转大货', async () => {
    // T305: 自动创建销售订单返回新 id
    mocks.service.createSalesOrderFromSample.mockResolvedValueOnce(999);

    const res = await parseResponse(
      await PUT(makeRequest({ id: 21, action: 'convert' }) as any, {} as any)
    );

    expect(res.status).toBe(200);
    // 先调用 createSalesOrderFromSample
    expect(mocks.service.createSalesOrderFromSample).toHaveBeenCalledWith(21, 1);
    // 再用返回的 id 调用 convertOrder
    expect(mocks.service.convertOrder).toHaveBeenCalledWith(21, 999, 1);
  });

  it('salesOrderId 为 0（falsy）：触发自动创建销售订单', async () => {
    mocks.service.createSalesOrderFromSample.mockResolvedValueOnce(555);

    const res = await parseResponse(
      await PUT(
        makeRequest({ id: 22, action: 'convert', salesOrderId: 0 }) as any,
        {} as any
      )
    );

    expect(res.status).toBe(200);
    expect(mocks.service.createSalesOrderFromSample).toHaveBeenCalledWith(22, 1);
    expect(mocks.service.convertOrder).toHaveBeenCalledWith(22, 555, 1);
  });
});

// ============================================================
// cancel 分支 — reason 默认值
// ============================================================
describe('sample/orders/status PUT cancel — reason 默认值', () => {
  it('未传 reason：默认使用 "手动作废"', async () => {
    const res = await parseResponse(
      await PUT(makeRequest({ id: 30, action: 'cancel' }) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(mocks.service.cancelOrder).toHaveBeenCalledWith(30, '手动作废', 1);
  });

  it('传入 reason：使用传入的 reason', async () => {
    const res = await parseResponse(
      await PUT(
        makeRequest({ id: 31, action: 'cancel', reason: '客户取消订单' }) as any,
        {} as any
      )
    );

    expect(res.status).toBe(200);
    expect(mocks.service.cancelOrder).toHaveBeenCalledWith(31, '客户取消订单', 1);
  });
});

// ============================================================
// 错误处理
// ============================================================
describe('sample/orders/status PUT — 错误处理', () => {
  it('service 抛错时返回 400 且包含错误消息', async () => {
    mocks.service.submitOrder.mockRejectedValueOnce(new Error('打样单[SP001]当前状态不可提交'));

    const res = await parseResponse(
      await PUT(makeRequest({ id: 40, action: 'submit' }) as any, {} as any)
    );

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.message).toContain('当前状态不可提交');
    // logger.error 应被调用
    expect(mocks.mockLogger.error).toHaveBeenCalled();
  });

  it('service 抛错时 error 日志包含 id 和 action', async () => {
    mocks.service.confirmOrder.mockRejectedValueOnce(new Error('状态不可确认'));

    await PUT(makeRequest({ id: 41, action: 'confirm' }) as any, {} as any);

    const errorCall = mocks.mockLogger.error.mock.calls[0];
    expect(errorCall[0]).toMatchObject({
      module: 'sample',
      action: 'PUT_status',
    });
    expect(errorCall[2]).toMatchObject({ id: 41, action: 'confirm' });
  });

  it('convert 自动创建销售订单抛错时返回 400', async () => {
    mocks.service.createSalesOrderFromSample.mockRejectedValueOnce(
      new Error('打样单不存在')
    );

    const res = await parseResponse(
      await PUT(makeRequest({ id: 42, action: 'convert' }) as any, {} as any)
    );

    expect(res.status).toBe(400);
    expect(res.data.message).toContain('打样单不存在');
    // convertOrder 不应被调用（因为 createSalesOrderFromSample 已抛错）
    expect(mocks.service.convertOrder).not.toHaveBeenCalled();
  });
});

// ============================================================
// 成功响应 + 日志
// ============================================================
describe('sample/orders/status PUT — 成功响应与日志', () => {
  it('成功响应包含 id 和 action 字段', async () => {
    const res = await parseResponse(
      await PUT(makeRequest({ id: 50, action: 'submit' }) as any, {} as any)
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toEqual({ id: 50, action: 'submit' });
    expect(res.data.message).toBe('操作成功');
  });

  it('成功时输出 info 日志记录状态变更', async () => {
    await PUT(makeRequest({ id: 51, action: 'confirm' }) as any, {} as any);

    // 应有请求日志和成功日志
    const infoMessages = mocks.mockLogger.info.mock.calls.map((c) => c[1] as string);
    expect(infoMessages).toContain('状态变更请求');
    expect(infoMessages).toContain('状态变更成功');
  });
});
