/**
 * 采购订单提交 — 物料分类校验集成测试
 *
 * 验证链路：
 *   POST /api/purchase/orders
 *     → 提取 lines[].material_id
 *     → checkMaterialsCategorized(materialIds)
 *     → require_on_business 决定拦截 or 放行 + 提示
 *
 * 测试场景：
 *   1. 所有物料已归类 → 放行
 *   2. 部分未归类 + require_on_business=false → 放行 + 警告
 *   3. 部分未归类 + require_on_business=true → 400 拦截
 *   4. 空明细 → 不触发分类校验
 *   5. material_id 非法值 → 被过滤
 *   6. 重复 material_id → 传入去重前的原始数组
 *   7. 校验异常 → 当前实现返回 500
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  checkMaterialsCategorized: vi.fn(),
  createOrder: vi.fn(),
  listOrders: vi.fn(),
  approveOrder: vi.fn(),
  secureLog: vi.fn(),
}));

vi.mock('@/lib/category-validation', () => ({
  checkMaterialsCategorized: h.checkMaterialsCategorized,
}));

vi.mock('@/application/services/PurchaseApplicationService', () => ({
  PurchaseApplicationService: class {
    createOrder = h.createOrder;
    listOrders = h.listOrders;
    approveOrder = h.approveOrder;
  },
}));

vi.mock('@/infrastructure/RepositoryRegistry', () => ({
  RepositoryRegistry: {
    getPurchaseOrderRepository: vi.fn(() => ({
      findById: vi.fn(),
      findByOrderNo: vi.fn(),
      findByStatus: vi.fn(),
      save: vi.fn().mockResolvedValue({ id: 1, orderNo: 'PO-TEST-001' }),
      updateStatus: vi.fn(),
      updateReceivedQty: vi.fn(),
      updateAuditInfo: vi.fn(),
      softDelete: vi.fn(),
    })),
  },
}));

vi.mock('@/application/services/CurrencyApplicationService', () => ({
  CurrencyApplicationService: class {
    getLatestRate() { return Promise.resolve(1); }
    convertToBaseCurrency() {}
    clearCache() {}
  },
}));

vi.mock('@/infrastructure/repositories/MysqlCurrencyRepository', () => ({
  MysqlCurrencyRepository: vi.fn(),
}));

vi.mock('@/application/EventRegistry', () => ({
  registerEventHandlers: vi.fn(() => ({})),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: h.secureLog,
}));

vi.mock('@/lib/api-auth', () => ({
  withAuthAndErrorHandler: (
    handler: (req: Request, userInfo: any) => Promise<Response>,
    _options?: any
  ) => {
    return async (request: Request): Promise<Response> => {
      const userInfo = {
        userId: 1,
        username: 'admin',
        realName: '管理员',
        roles: ['admin'],
        permissions: ['*'],
      };
      try {
        return await handler(request, userInfo);
      } catch (error: any) {
        const body = {
          code: 500,
          success: false,
          message: error?.message || '服务器内部错误',
          data: null,
        };
        return new Response(JSON.stringify(body), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    };
  },
  withPermission: (handler: any, _options?: any) => handler,
}));

import { POST } from '@/app/api/purchase/orders/route';

type Loose = Record<string, unknown>;

function makeRequest(body?: Loose): Request {
  return new Request('http://localhost/api/purchase/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

async function parseResponse(res: Response) {
  const data = await res.json();
  return { status: res.status, data };
}

function defaultBody(overrides?: Partial<Loose>): Loose {
  return {
    supplier_id: 100,
    supplier_name: '测试供应商',
    order_date: '2026-08-10',
    currency: 'CNY',
    tax_rate: 0.13,
    lines: [
      {
        material_id: 1,
        material_code: 'MAT-CAT-001',
        material_name: '合规分类物料',
        unit: '个',
        order_qty: 10,
        unit_price: 100,
      },
    ],
    ...overrides,
  };
}

describe('POST /api/purchase/orders — 物料分类校验集成', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('场景 1：所有物料已归类', () => {
    it('放行，正常创建采购订单', async () => {
      h.checkMaterialsCategorized.mockResolvedValueOnce({
        blocked: false,
        uncategorized: [],
        message: null,
      });
      h.createOrder.mockResolvedValueOnce({
        id: 1,
        orderNo: 'PO-20260810-001',
      });

      const req = makeRequest(defaultBody());
      const res = await POST(req as any, {
        userId: 1,
        username: 'admin',
      } as any);

      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(h.checkMaterialsCategorized).toHaveBeenCalledWith([1]);
      expect(h.createOrder).toHaveBeenCalled();

      // 日志：有开始和完成日志
      expect(h.secureLog).toHaveBeenCalledWith(
        'info',
        '[purchase/orders] 开始物料分类校验',
        expect.any(Object)
      );
      expect(h.secureLog).toHaveBeenCalledWith(
        'info',
        '[purchase/orders] 物料分类校验完成',
        expect.objectContaining({ blocked: false, uncategorizedCount: 0 })
      );
    });
  });

  describe('场景 2：部分未归类 + require_on_business=false', () => {
    it('放行，附带警告日志', async () => {
      h.checkMaterialsCategorized.mockResolvedValueOnce({
        blocked: false,
        uncategorized: [
          { id: 2, material_code: 'RAW', material_name: '油墨(未归类)' },
        ],
        message: '提示：以下物料尚未设置物料分类：RAW(油墨(未归类))',
      });
      h.createOrder.mockResolvedValueOnce({
        id: 1,
        orderNo: 'PO-20260810-002',
      });

      const req = makeRequest(
        defaultBody({
          lines: [
            { material_id: 1, material_code: 'MAT-CAT-001', material_name: '已归类', unit: '个', order_qty: 5, unit_price: 50 },
            { material_id: 2, material_code: 'RAW', material_name: '油墨(未归类)', unit: '瓶', order_qty: 10, unit_price: 20 },
          ],
        })
      );
      const res = await POST(req as any, {
        userId: 1,
        username: 'admin',
      } as any);

      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(h.checkMaterialsCategorized).toHaveBeenCalledWith([1, 2]);

      // 警告日志存在
      expect(h.secureLog).toHaveBeenCalledWith(
        'warn',
        '[purchase/orders] 物料分类校验警告',
        expect.any(Object)
      );

      // 阻断日志不存在
      const blockCall = h.secureLog.mock.calls.find(
        (c: any[]) => c[1] === '[purchase/orders] 物料分类校验阻断提交'
      );
      expect(blockCall).toBeUndefined();
    });
  });

  describe('场景 3：未归类 + require_on_business=true（硬拦截）', () => {
    it('返回 400，不创建订单', async () => {
      h.checkMaterialsCategorized.mockResolvedValueOnce({
        blocked: true,
        uncategorized: [
          { id: 2, material_code: 'RAW', material_name: '油墨' },
          { id: 3, material_code: 'SOLVENT', material_name: '溶剂' },
        ],
        message:
          '以下物料尚未设置物料分类，无法提交业务单据：RAW(油墨)、SOLVENT(溶剂)。请先在「基础数据 → 物料分类」中归类。',
      });

      const req = makeRequest(
        defaultBody({
          lines: [
            { material_id: 2, material_code: 'RAW', material_name: '油墨', unit: '瓶', order_qty: 10, unit_price: 20 },
            { material_id: 3, material_code: 'SOLVENT', material_name: '溶剂', unit: '瓶', order_qty: 5, unit_price: 30 },
          ],
        })
      );
      const res = await POST(req as any, {
        userId: 1,
        username: 'admin',
      } as any);

      const { status, data } = await parseResponse(res);

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('尚未设置物料分类');
      expect(data.message).toContain('RAW(油墨)');

      // 创建订单未被调用
      expect(h.createOrder).not.toHaveBeenCalled();

      // 阻断日志存在
      expect(h.secureLog).toHaveBeenCalledWith(
        'warn',
        '[purchase/orders] 物料分类校验阻断提交',
        expect.any(Object)
      );
    });
  });

  describe('场景 4：空明细 — 无物料需校验', () => {
    it('返回必填校验错误，不调用 checkMaterialsCategorized', async () => {
      const req = makeRequest(defaultBody({ lines: [] }));
      const res = await POST(req as any, {
        userId: 1,
        username: 'admin',
      } as any);

      const { status, data } = await parseResponse(res);

      expect(status).toBe(400);
      expect(data.message).toContain('采购明细不能为空');
      expect(h.checkMaterialsCategorized).not.toHaveBeenCalled();
    });
  });

  describe('场景 5：material_id 非法值被过滤', () => {
    it('null/0/undefined 被路由过滤，-1 被 checkMaterialsCategorized 内部过滤', async () => {
      h.checkMaterialsCategorized.mockResolvedValueOnce({
        blocked: false,
        uncategorized: [],
        message: null,
      });
      h.createOrder.mockResolvedValueOnce({ id: 1, orderNo: 'PO-003' });

      const req = makeRequest(
        defaultBody({
          lines: [
            { material_id: null, material_code: '', material_name: '', unit: '个', order_qty: 1, unit_price: 10 },
            { material_id: 0, material_code: '', material_name: '', unit: '个', order_qty: 1, unit_price: 10 },
            { material_id: undefined, material_code: '', material_name: '', unit: '个', order_qty: 1, unit_price: 10 },
            { material_id: -1, material_code: '', material_name: '', unit: '个', order_qty: 1, unit_price: 10 },
            { material_id: 10, material_code: 'M10', material_name: '有效物料', unit: '个', order_qty: 1, unit_price: 10 },
          ],
        })
      );
      const res = await POST(req as any, {
        userId: 1,
        username: 'admin',
      } as any);

      const { status } = await parseResponse(res);

      expect(status).toBe(200);
      // null/0/undefined 被 filter(Boolean) 过滤；-1 是 truthy 会被传入，
      // 但 checkMaterialsCategorized 内部通过 v > 0 过滤掉
      expect(h.checkMaterialsCategorized).toHaveBeenCalledWith([-1, 10]);
    });
  });

  describe('场景 6：重复 material_id', () => {
    it('路由传入原始数组，内部去重', async () => {
      h.checkMaterialsCategorized.mockResolvedValueOnce({
        blocked: false,
        uncategorized: [],
        message: null,
      });
      h.createOrder.mockResolvedValueOnce({ id: 1, orderNo: 'PO-004' });

      const req = makeRequest(
        defaultBody({
          lines: [
            { material_id: 1, material_code: 'M1', material_name: 'A', unit: '个', order_qty: 1, unit_price: 10 },
            { material_id: 1, material_code: 'M1', material_name: 'A', unit: '个', order_qty: 1, unit_price: 10 },
            { material_id: 2, material_code: 'M2', material_name: 'B', unit: '个', order_qty: 1, unit_price: 10 },
          ],
        })
      );
      const res = await POST(req as any, {
        userId: 1,
        username: 'admin',
      } as any);

      const { status } = await parseResponse(res);

      expect(status).toBe(200);
      // 路由层未去重，checkMaterialsCategorized 内部去重
      expect(h.checkMaterialsCategorized).toHaveBeenCalledWith([1, 1, 2]);
    });
  });

  describe('场景 7：校验异常 — 当前实现返回 500', () => {
    it('checkMaterialsCategorized 抛错时，路由返回 500', async () => {
      h.checkMaterialsCategorized.mockRejectedValueOnce(
        new Error('DB connection timeout')
      );

      const req = makeRequest(defaultBody());
      const res = await POST(req as any, {
        userId: 1,
        username: 'admin',
      } as any);

      const { status } = await parseResponse(res);
      expect(status).toBe(500);
    });
  });

  describe('场景 8：合规编码 MAT-CAT-001 通过', () => {
    it('正常走通路由', async () => {
      h.checkMaterialsCategorized.mockResolvedValueOnce({
        blocked: false,
        uncategorized: [],
        message: null,
      });
      h.createOrder.mockResolvedValueOnce({ id: 1, orderNo: 'PO-006' });

      const req = makeRequest(
        defaultBody({
          lines: [
            { material_id: 1, material_code: 'MAT-CAT-001', material_name: '合规编码物料', unit: '个', order_qty: 10, unit_price: 100 },
          ],
        })
      );
      const res = await POST(req as any, {
        userId: 1,
        username: 'admin',
      } as any);

      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
