/**
 * 报工单创建回归测试 —— 守护 P1-4 修复（2026-09-27）
 *
 * 背景：POST /api/production/work-report 此前数量列 parseFloat(...) || 0，
 *       负数可直接入库；work_order_id 无存在性校验，幽灵工单的报工也能落库。
 * 修复后：completed/qualified/defective/scrap 四个数量必须 >=0（非数字 400）；
 *       work_order_id 必须对应真实未删除工单。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConn = {
    execute: vi.fn(async (sql: string) => {
      if (sql.includes('LAST_INSERT_ID')) return [[{ id: 7 }]];
      return [{ affectedRows: 1 }];
    }),
  };
  return {
    query: vi.fn(async () => [[]]),
    execute: vi.fn(async () => [{ affectedRows: 1, insertId: 1 }]),
    queryOne: vi.fn(async () => ({ id: 5 })), // 默认：工单存在
    transaction: vi.fn(async (cb: (conn: unknown) => Promise<unknown>) => cb(mockConn)),
    mockConn,
    generateDocNo: vi.fn(() => 'BG20260927001'),
    saveEvents: vi.fn(async () => undefined),
  };
});

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  execute: mocks.execute,
  queryOne: mocks.queryOne,
  transaction: mocks.transaction,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock('@/lib/api-permissions', () => ({
  withPermission: (handler: (request: Request, userInfo: unknown) => Promise<Response>) =>
    async (request: Request): Promise<Response> =>
      handler(request, { userId: 1, realName: '管理员', username: 'admin' }),
}));

vi.mock('@/lib/global-config', () => ({
  getWrPrefix: vi.fn(() => 'BG'),
  generateDocNo: mocks.generateDocNo,
}));

vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: vi.fn(() => ({ saveEvents: mocks.saveEvents })),
}));

vi.mock('@/domain/production/events/WorkOrderEvents', () => ({
  WorkReportedEvent: class {
    constructor(public payload: unknown) {}
  },
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { POST } from '@/app/api/production/work-report/route';

function makePost(body: Record<string, unknown>) {
  return new Request('http://localhost/api/production/work-report', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never;
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    work_order_id: 5,
    work_order_no: 'WO20260927001',
    process_name: '印刷',
    completed_qty: 100,
    qualified_qty: 98,
    defective_qty: 0,
    scrap_qty: 0,
    ...overrides,
  };
}

describe('POST /api/production/work-report - 报工数量与工单存在性校验（P1-4）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryOne.mockResolvedValue({ id: 5 });
  });

  it('completed_qty=-3：400 数量必须大于等于0，不进事务', async () => {
    const res = await POST(makePost(validBody({ completed_qty: -3 })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('qtyNonNegative');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('qualified_qty=-1：400', async () => {
    const res = await POST(makePost(validBody({ qualified_qty: -1 })));
    expect(res.status).toBe(400);
  });

  it('scrap_qty=-2：400', async () => {
    const res = await POST(makePost(validBody({ scrap_qty: -2 })));
    expect(res.status).toBe(400);
  });

  it('completed_qty 非数字（abc）：400', async () => {
    const res = await POST(makePost(validBody({ completed_qty: 'abc' })));
    expect(res.status).toBe(400);
  });

  it('数量为字符串数字（"5.5"）：接受', async () => {
    const res = await POST(makePost(validBody({ completed_qty: '5.5' })));
    expect(res.status).toBe(200);
  });

  it('work_order_id 不存在：400 工单不存在，不进事务', async () => {
    mocks.queryOne.mockResolvedValue(null as unknown as { id: number });
    const res = await POST(makePost(validBody({ work_order_id: 999 })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('k_lmufdi');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('合法单：200 创建成功，INSERT 报工记录', async () => {
    const res = await POST(makePost(validBody()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mocks.mockConn.execute).toHaveBeenCalled();
    const insertCall = mocks.mockConn.execute.mock.calls.find(
      (c: unknown[]) => String(c[0]).includes('INSERT INTO prd_work_report')
    );
    expect(insertCall).toBeTruthy();
  });
});
