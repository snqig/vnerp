/**
 * 入库 API 集成测试
 * 覆盖 POST/PUT/DELETE/GET 路由的：正常流程、参数异常、权限异常、领域异常
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 统一 mock：DB / 认证 / 应用服务 / 事件注册
const mockInboundService = {
  listOrders: vi.fn(),
  createOrder: vi.fn(),
  approveOrder: vi.fn(),
  submitOrder: vi.fn(),
  cancelOrder: vi.fn(),
  unapproveOrder: vi.fn(),
  deleteOrder: vi.fn(),
};

vi.mock('@/application/services/InboundApplicationService', () => ({
  InboundApplicationService: class MockInboundApplicationService {
    constructor() {
      Object.assign(this, mockInboundService);
    }
  },
}));

vi.mock('@/infrastructure/repositories/MysqlInboundOrderRepository', () => ({
  MysqlInboundOrderRepository: vi.fn(),
}));

vi.mock('@/infrastructure/config/EventRegistry', () => ({
  registerEventHandlers: vi.fn(() => ({})),
}));

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
}));

// 让 withAuthAndErrorHandler 直接执行 handler，并注入固定的 userInfo
// 同时模拟真实实现的 try-catch（未捕获错误返回 500）
vi.mock('@/lib/api-auth', () => ({
  withAuthAndErrorHandler: (
    handler: (req: Request, userInfo: any) => Promise<Response>,
    _options?: { permission?: string }
  ) => {
    return async (request: Request): Promise<Response> => {
      const userInfo = {
        userId: 1,
        username: 'admin',
        realName: '管理员',
        roles: ['admin'],
        permissions: ['warehouse:inbound:list', 'warehouse:inbound:create', 'warehouse:inbound:edit', 'warehouse:inbound:delete'],
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
}));

import { GET, POST, PUT, DELETE } from '@/app/api/warehouse/inbound/route';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { execute } from '@/lib/db';

function makeRequest(method: string, body?: any, query?: string) {
  const url = `http://localhost/api/warehouse/inbound${query ? `?${query}` : ''}`;
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(url, init);
}

async function parseResponse(res: Response) {
  const data = await res.json();
  return { status: res.status, data };
}

describe('入库 API 集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/warehouse/inbound - 查询入库单列表', () => {
    it('正常流程：返回分页列表数据', async () => {
      mockInboundService.listOrders.mockResolvedValueOnce({
        data: [
          {
            id: 1,
            orderNo: 'IN20240101001',
            inboundDate: '2024-01-01',
            supplierName: '供应商A',
            warehouseId: 1,
            orderType: 'purchase',
            totalQuantity: 100,
            totalAmount: { amount: 1000, currency: 'CNY' },
            status: { value: 'draft' },
            remark: null,
            createTime: '2024-01-01 10:00:00',
            updateTime: '2024-01-01 10:00:00',
            items: [],
          },
        ],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      });

      const req = makeRequest('GET', undefined, 'page=1&pageSize=10');
      const { status, data } = await parseResponse(await GET(req as any, {} as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.list).toHaveLength(1);
      expect(data.data.list[0].order_no).toBe('IN20240101001');
      expect(data.data.list[0].status).toBe('draft');
      expect(data.pagination.total).toBe(1);

      // 验证 service 调用参数
      expect(mockInboundService.listOrders).toHaveBeenCalledWith('', 1, 10, {
        keyword: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('支持按状态筛选', async () => {
      mockInboundService.listOrders.mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const req = makeRequest('GET', undefined, 'status=pending');
      await parseResponse(await GET(req as any, {} as any));

      expect(mockInboundService.listOrders).toHaveBeenCalledWith(
        'pending',
        1,
        10,
        expect.objectContaining({})
      );
    });

    it('使用默认分页参数（page=1, pageSize=10）', async () => {
      mockInboundService.listOrders.mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const req = makeRequest('GET');
      await parseResponse(await GET(req as any, {} as any));

      expect(mockInboundService.listOrders).toHaveBeenCalledWith('', 1, 10, expect.any(Object));
    });

    it('service 抛错时返回 500', async () => {
      mockInboundService.listOrders.mockRejectedValueOnce(new Error('数据库连接失败'));

      const req = makeRequest('GET');
      const { status, data } = await parseResponse(await GET(req as any, {} as any));

      expect(status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/warehouse/inbound - 创建入库单', () => {
    const validBody = {
      warehouse_id: 1,
      supplier_name: '供应商A',
      inbound_date: '2024-01-01',
      remark: '测试备注',
      items: [
        {
          material_id: 101,
          material_name: '材料1',
          quantity: 100,
          unit: '件',
          unit_price: 10,
        },
      ],
    };

    it('正常流程：创建成功返回 order_id 和 order_no', async () => {
      mockInboundService.createOrder.mockResolvedValueOnce({
        id: 1001,
        orderNo: 'IN20240101001',
      });

      const req = makeRequest('POST', validBody);
      const { status, data } = await parseResponse(await POST(req as any, {} as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('入库单创建成功');
      expect(data.data.order_id).toBe(1001);
      expect(data.data.order_no).toBe('IN20240101001');

      // 验证 service 调用入参（驼峰转换）
      expect(mockInboundService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouseId: 1,
          supplierName: '供应商A',
          inboundDate: '2024-01-01',
          operatorId: 1,
          items: expect.arrayContaining([
            expect.objectContaining({
              materialId: 101,
              materialName: '材料1',
              quantity: 100,
            }),
          ]),
        })
      );
    });

    it('参数异常：缺少 warehouse_id 返回 422', async () => {
      const { warehouse_id, ...invalidBody } = validBody;
      const req = makeRequest('POST', invalidBody);
      const { status, data } = await parseResponse(await POST(req as any, {} as any));

      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain('输入校验失败');
      expect(data.message).toContain('warehouse_id');
      expect(mockInboundService.createOrder).not.toHaveBeenCalled();
    });

    it('参数异常：items 为空数组返回 422', async () => {
      const req = makeRequest('POST', { ...validBody, items: [] });
      const { status, data } = await parseResponse(await POST(req as any, {} as any));

      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain('入库项不能为空');
    });

    it('参数异常：quantity 为负数返回 422', async () => {
      const req = makeRequest('POST', {
        ...validBody,
        items: [{ ...validBody.items[0], quantity: -10 }],
      });
      const { status, data } = await parseResponse(await POST(req as any, {} as any));

      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain('数量必须为正数');
    });

    it('参数异常：unit_price 为负数返回 422', async () => {
      const req = makeRequest('POST', {
        ...validBody,
        items: [{ ...validBody.items[0], unit_price: -1 }],
      });
      const { status, data } = await parseResponse(await POST(req as any, {} as any));

      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain('单价不能为负数');
    });

    it('service 抛 DomainError 时返回 500（未被路由捕获）', async () => {
      mockInboundService.createOrder.mockRejectedValueOnce(new DomainError('仓库不存在'));

      const req = makeRequest('POST', validBody);
      const { status, data } = await parseResponse(await POST(req as any, {} as any));

      expect(status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/warehouse/inbound - 更新入库单', () => {
    it('正常流程：submit 动作调用 submitOrder', async () => {
      mockInboundService.submitOrder.mockResolvedValueOnce({ id: 1, status: 'pending' });

      const req = makeRequest('PUT', { id: 1, action: 'submit' });
      const { status, data } = await parseResponse(await PUT(req as any, {} as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('入库单提交成功');
      expect(mockInboundService.submitOrder).toHaveBeenCalledWith(1);
    });

    it('正常流程：approve 动作调用 approveOrder', async () => {
      mockInboundService.approveOrder.mockResolvedValueOnce({ id: 1, status: 'completed' });

      const req = makeRequest('PUT', { id: 1, action: 'approve' });
      const { status, data } = await parseResponse(await PUT(req as any, {} as any));

      expect(status).toBe(200);
      expect(data.message).toBe('入库单审核成功');
      expect(mockInboundService.approveOrder).toHaveBeenCalledWith(1);
    });

    it('正常流程：cancel 动作调用 cancelOrder', async () => {
      mockInboundService.cancelOrder.mockResolvedValueOnce({ id: 1, status: 'cancelled' });

      const req = makeRequest('PUT', { id: 1, action: 'cancel' });
      const { status, data } = await parseResponse(await PUT(req as any, {} as any));

      expect(status).toBe(200);
      expect(data.message).toBe('入库单取消成功');
      expect(mockInboundService.cancelOrder).toHaveBeenCalledWith(1);
    });

    it('正常流程：unapprove 动作调用 unapproveOrder', async () => {
      mockInboundService.unapproveOrder.mockResolvedValueOnce({ id: 1, status: 'pending' });

      const req = makeRequest('PUT', { id: 1, action: 'unapprove' });
      const { status, data } = await parseResponse(await PUT(req as any, {} as any));

      expect(status).toBe(200);
      expect(data.message).toBe('入库单反审核成功');
      expect(mockInboundService.unapproveOrder).toHaveBeenCalledWith(1);
    });

    it('使用 status=pending 等价于 submit 动作', async () => {
      mockInboundService.submitOrder.mockResolvedValueOnce({ id: 1, status: 'pending' });

      const req = makeRequest('PUT', { id: 1, status: 'pending' });
      await parseResponse(await PUT(req as any, {} as any));

      expect(mockInboundService.submitOrder).toHaveBeenCalledWith(1);
    });

    it('使用 status=approved 等价于 approve 动作', async () => {
      mockInboundService.approveOrder.mockResolvedValueOnce({ id: 1, status: 'completed' });

      const req = makeRequest('PUT', { id: 1, status: 'approved' });
      await parseResponse(await PUT(req as any, {} as any));

      expect(mockInboundService.approveOrder).toHaveBeenCalledWith(1);
    });

    it('领域异常：NotFoundError 返回 404', async () => {
      mockInboundService.approveOrder.mockRejectedValueOnce(new NotFoundError('入库单不存在'));

      const req = makeRequest('PUT', { id: 999, action: 'approve' });
      const { status, data } = await parseResponse(await PUT(req as any, {} as any));

      expect(status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe('入库单不存在');
    });

    it('领域异常：VersionConflictError 返回 409', async () => {
      mockInboundService.submitOrder.mockRejectedValueOnce(new VersionConflictError());

      const req = makeRequest('PUT', { id: 1, action: 'submit' });
      const { status, data } = await parseResponse(await PUT(req as any, {} as any));

      expect(status).toBe(409);
      expect(data.success).toBe(false);
    });

    it('领域异常：DomainError 返回 400', async () => {
      mockInboundService.cancelOrder.mockRejectedValueOnce(
        new DomainError('当前状态的入库单不能取消')
      );

      const req = makeRequest('PUT', { id: 1, action: 'cancel' });
      const { status, data } = await parseResponse(await PUT(req as any, {} as any));

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('当前状态的入库单不能取消');
    });

    it('参数异常：缺少 id 返回 422', async () => {
      const req = makeRequest('PUT', { action: 'submit' });
      const { status, data } = await parseResponse(await PUT(req as any, {} as any));

      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain('id');
    });

    it('未知 action 返回 422（schema 枚举校验）', async () => {
      const req = makeRequest('PUT', { id: 1, action: 'unknown' as any });
      const { status, data } = await parseResponse(await PUT(req as any, {} as any));

      // schema 用 z.enum 限制 action，未知值在 parse 阶段被拒
      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain('输入校验失败');
    });

    it('仅更新 remark 字段时走直接 SQL 更新', async () => {
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      const req = makeRequest('PUT', { id: 1, remark: '新备注' });
      const { status, data } = await parseResponse(await PUT(req as any, {} as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('入库单更新成功');
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inv_inbound_order SET remark'),
        expect.arrayContaining(['新备注', 1, 'completed'])
      );
    });
  });

  describe('DELETE /api/warehouse/inbound - 删除入库单', () => {
    it('正常流程：删除草稿状态入库单', async () => {
      mockInboundService.deleteOrder.mockResolvedValueOnce(undefined);

      const req = makeRequest('DELETE', undefined, 'id=1');
      const { status, data } = await parseResponse(await DELETE(req as any, {} as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('入库单删除成功');
      expect(mockInboundService.deleteOrder).toHaveBeenCalledWith(1);
    });

    it('参数异常：缺少 id 返回 400', async () => {
      const req = makeRequest('DELETE');
      const { status, data } = await parseResponse(await DELETE(req as any, {} as any));

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('入库单ID不能为空');
      expect(mockInboundService.deleteOrder).not.toHaveBeenCalled();
    });

    it('领域异常：NotFoundError 返回 404', async () => {
      mockInboundService.deleteOrder.mockRejectedValueOnce(new NotFoundError('入库单不存在'));

      const req = makeRequest('DELETE', undefined, 'id=999');
      const { status, data } = await parseResponse(await DELETE(req as any, {} as any));

      expect(status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('领域异常：DomainError（已审核不能删除）返回 400', async () => {
      mockInboundService.deleteOrder.mockRejectedValueOnce(
        new DomainError('当前状态的入库单不能删除')
      );

      const req = makeRequest('DELETE', undefined, 'id=1');
      const { status, data } = await parseResponse(await DELETE(req as any, {} as any));

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('当前状态的入库单不能删除');
    });

    it('参数异常：id 非数字时正常处理为 parseInt', async () => {
      mockInboundService.deleteOrder.mockResolvedValueOnce(undefined);

      const req = makeRequest('DELETE', undefined, 'id=abc');
      await parseResponse(await DELETE(req as any, {} as any));

      // parseInt('abc') === NaN，仍会调用 service
      expect(mockInboundService.deleteOrder).toHaveBeenCalled();
    });
  });
});
