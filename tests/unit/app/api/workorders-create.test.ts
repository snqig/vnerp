/**
 * 工单创建回归测试 —— 守护 P1-3 修复（2026-09-27）
 *
 * 背景：POST /api/workorders 此前对明细 quantity 只做 `|| 0` 兜底，
 *       0/负数数量与空 material_name 的明细可直接落库；交期无顺序校验。
 * 修复后：每行 quantity 必须 >0、material_name 必填；
 *       plan_start_date/plan_end_date 非空时 end >= start。
 *       交期不做必填强制 —— 销售订单「一键生成工单」（orders/sales/page.tsx）
 *       不传交期，必须保持兼容。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConn = {
    execute: vi.fn(async (sql: string) => {
      if (sql.includes('FROM sal_order')) return [[{ id: 1, order_no: 'SO20260927001', status: 2 }]];
      if (sql.includes('COUNT(*) as cnt')) return [[{ cnt: 0 }]];
      return [{ insertId: 99, affectedRows: 1 }];
    }),
  };
  return {
    query: vi.fn(async () => [[]]),
    execute: vi.fn(async () => [{ affectedRows: 1, insertId: 1 }]),
    transaction: vi.fn(async (cb: (conn: unknown) => Promise<unknown>) => cb(mockConn)),
    mockConn,
    generateDocumentNo: vi.fn(async () => 'WO20260927001'),
  };
});

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  execute: mocks.execute,
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

vi.mock('@/lib/document-numbering', () => ({
  generateDocumentNo: mocks.generateDocumentNo,
}));

vi.mock('@/lib/api-response', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-response')>('@/lib/api-response');
  return {
    ...actual,
    logOperation: vi.fn().mockResolvedValue(undefined),
  };
});

import { POST } from '@/app/api/workorders/route';

function makePost(body: Record<string, unknown>) {
  return new Request('http://localhost/api/workorders', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never;
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    order_no: 'SO20260927001',
    customer_name: '客户A',
    items: [
      { material_id: 11, material_name: '物料A', quantity: 100, unit: '个', unit_price: 2.5 },
    ],
    plan_start_date: '2026-10-01',
    plan_end_date: '2026-10-15',
    ...overrides,
  };
}

describe('POST /api/workorders - 工单创建明细与交期校验（P1-3）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('明细 quantity=0：400 数量必须大于0，不进事务', async () => {
    const body = validBody();
    (body.items as Record<string, unknown>[])[0].quantity = 0;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const result = await res.json();
    expect(result.message).toContain('qtyMustBePositive');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('明细 quantity=-1：400', async () => {
    const body = validBody();
    (body.items as Record<string, unknown>[])[0].quantity = -1;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it('明细 quantity 非数字：400', async () => {
    const body = validBody();
    (body.items as Record<string, unknown>[])[0].quantity = 'abc';
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it('明细 material_name 为空：400 物料名称不能为空', async () => {
    const body = validBody();
    (body.items as Record<string, unknown>[])[0].material_name = '  ';
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const result = await res.json();
    expect(result.message).toContain('materialNameRequired');
  });

  it('plan_end_date 早于 plan_start_date：400 计划结束日期不能早于开始日期', async () => {
    const res = await POST(
      makePost(validBody({ plan_start_date: '2026-10-15', plan_end_date: '2026-10-01' }))
    );
    expect(res.status).toBe(400);
    const result = await res.json();
    expect(result.message).toContain('planDateOrderInvalid');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('不传交期（销售订单一键生成形状）：兼容放行，200', async () => {
    const body: Record<string, unknown> = validBody();
    delete body.plan_start_date;
    delete body.plan_end_date;
    const res = await POST(makePost(body));
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.success).toBe(true);
  });

  it('合法单：200 创建成功', async () => {
    const res = await POST(makePost(validBody()));
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.success).toBe(true);
    expect(mocks.mockConn.execute).toHaveBeenCalled();
  });
});
