/**
 * 出库单创建回归测试 —— 守护 P0-3 修复（2026-09-26）
 *
 * 背景：validateRequestBody 只挡 undefined/null/''，0 会被当有效值——
 *       未选仓（warehouseId=0）与 qty=0/负数的出库单此前可直接落库；
 *       空 items 数组也能创建无明细出库单。
 * 修复后：items 非空、warehouseId>0、每行 qty>0、物料编码/名称至少一项非空。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockConn = {
    execute: vi.fn(async () => [{ insertId: 1, affectedRows: 1 }]),
    query: vi.fn(async () => [{ affectedRows: 1 }]),
  };
  return {
    query: vi.fn(async () => [[]]),
    execute: vi.fn(async () => [{ affectedRows: 1, insertId: 1 }]),
    queryPaginated: vi.fn(),
    transaction: vi.fn(async (cb: (conn: unknown) => Promise<unknown>) => cb(mockConn)),
    mockConn,
    generateDocumentNo: vi.fn(async () => 'OUT20260926001'),
    checkMaterialsCategorized: vi.fn(async () => ({ blocked: false, uncategorized: [] })),
  };
});

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  execute: mocks.execute,
  queryPaginated: mocks.queryPaginated,
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

vi.mock('@/lib/category-validation', () => ({
  checkMaterialsCategorized: mocks.checkMaterialsCategorized,
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/api-response', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-response')>('@/lib/api-response');
  return {
    ...actual,
    logOperation: vi.fn().mockResolvedValue(undefined),
  };
});

import { POST } from '@/app/api/warehouse/outbound/route';

function makePost(body: Record<string, unknown>) {
  return new Request('http://localhost/api/warehouse/outbound', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never;
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    orderDate: '2026-09-26',
    outboundType: 'sale',
    warehouseId: 1,
    warehouseCode: 'WH01',
    warehouseName: '主仓',
    remark: '',
    items: [
      {
        materialId: 0,
        materialCode: 'M001',
        materialName: '物料A',
        specification: '',
        width: 0,
        batchNo: '',
        qty: 5,
        unit: '米',
        isRawMaterial: true,
        unitPrice: 0,
        locationCode: '',
        remark: '',
      },
    ],
    operatorId: 1,
    operatorName: '管理员',
    ...overrides,
  };
}

describe('POST /api/warehouse/outbound - 出库硬校验（P0-3）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('warehouseId=0（未选仓）：400 缺少仓库ID，不进事务', async () => {
    const res = await POST(makePost(validBody({ warehouseId: 0 })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('k_1hxcz4f');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('items 空数组：400 出库明细不能为空', async () => {
    const res = await POST(makePost(validBody({ items: [] })));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('k_15xvt0o');
  });

  it('qty=0：400 出库数量必须大于0，不进事务', async () => {
    const body = validBody();
    (body.items as Record<string, unknown>[])[0].qty = 0;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const result = await res.json();
    expect(result.message).toContain('k_1rxflii');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('qty=-5：400', async () => {
    const body = validBody();
    (body.items as Record<string, unknown>[])[0].qty = -5;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it('物料编码与名称都为空：400 请输入物料编码', async () => {
    const body = validBody();
    (body.items as Record<string, unknown>[])[0].materialCode = '';
    (body.items as Record<string, unknown>[])[0].materialName = '';
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const result = await res.json();
    expect(result.message).toContain('enterMaterialCode');
  });

  it('合法单：200 创建成功，写入明细', async () => {
    const res = await POST(makePost(validBody()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mocks.mockConn.execute).toHaveBeenCalledTimes(1); // INSERT 主表
    expect(mocks.mockConn.query).toHaveBeenCalledTimes(1); // INSERT 明细
  });
});
