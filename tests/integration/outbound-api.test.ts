/**
 * 出库 API 集成测试
 * 覆盖 POST/PUT/DELETE/GET 路由的：正常流程、参数异常、状态机异常、事务回滚
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DB 连接池
const mockConnection = {
  query: vi.fn(),
  execute: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn: (c: any) => Promise<any>) => fn(mockConnection)),
  queryPaginated: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

vi.mock('@/lib/document-numbering', () => ({
  generateDocumentNo: vi.fn().mockResolvedValue('OUT20240101001'),
}));

import { query, execute, transaction, queryPaginated } from '@/lib/db';
import { GET, POST, PUT, DELETE } from '@/app/api/warehouse/outbound/route';
import { WarehouseStateMachine } from '@/lib/warehouse-state-machine';

function makeRequest(method: string, body?: any, query?: string) {
  const url = `http://localhost/api/warehouse/outbound${query ? `?${query}` : ''}`;
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(url, init);
}

async function parseResponse(res: Response) {
  const data = await res.json();
  return { status: res.status, data };
}

describe('出库 API 集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/warehouse/outbound - 查询出库单列表', () => {
    it('正常流程：返回分页列表', async () => {
      const mockData = [
        {
          id: 1,
          orderNo: 'OUT20240101001',
          orderDate: '2024-01-01',
          outboundType: 'sales',
          warehouseCode: 'WH001',
          warehouseName: '主仓库',
          totalQty: 50,
          totalAmount: 500,
          currency: 'CNY',
          status: 'pending',
          remark: null,
          operatorName: '操作员',
          auditStatus: 0,
          auditorName: null,
          auditTime: null,
          createTime: '2024-01-01 10:00:00',
        },
      ];

      vi.mocked(queryPaginated).mockResolvedValueOnce({
        data: mockData,
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      });

      // Mock 明细查询
      vi.mocked(query).mockResolvedValueOnce([
        {
          id: 1,
          orderId: 1,
          material_id: 101,
          materialName: '材料1',
          specification: '规格1',
          qty: 50,
          unit: '件',
          unit_price: 10,
          amount: 500,
          batchNo: 'B001',
          remark: null,
        },
      ]);

      const req = makeRequest('GET', undefined, 'page=1&pageSize=10');
      const { status, data } = await parseResponse(await GET(req as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.list).toHaveLength(1);
      expect(data.data.list[0].items).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
    });

    it('使用默认分页参数', async () => {
      vi.mocked(queryPaginated).mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const req = makeRequest('GET');
      await parseResponse(await GET(req as any));

      expect(queryPaginated).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        [],
        { page: 1, pageSize: 10 }
      );
    });

    it('支持按 status 筛选', async () => {
      vi.mocked(queryPaginated).mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const req = makeRequest('GET', undefined, 'status=pending');
      await parseResponse(await GET(req as any));

      expect(queryPaginated).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('AND o.status = ?'),
        expect.arrayContaining(['pending']),
        expect.any(Object)
      );
    });

    it('支持按 keyword 搜索', async () => {
      vi.mocked(queryPaginated).mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const req = makeRequest('GET', undefined, 'keyword=测试');
      await parseResponse(await GET(req as any));

      expect(queryPaginated).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.arrayContaining(['%测试%', '%测试%']),
        expect.any(Object)
      );
    });

    it('空列表时跳过明细查询', async () => {
      vi.mocked(queryPaginated).mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const req = makeRequest('GET');
      const { status } = await parseResponse(await GET(req as any));

      expect(status).toBe(200);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/warehouse/outbound - 创建出库单', () => {
    const validBody = {
      orderDate: '2024-01-01',
      warehouseId: 1,
      warehouseCode: 'WH001',
      warehouseName: '主仓库',
      operatorId: 1,
      operatorName: '操作员',
      outboundType: 'sales',
      items: [
        {
          materialId: 101,
          materialName: '材料1',
          specification: '规格1',
          qty: 50,
          unit: '件',
          unitPrice: 10,
          batchNo: 'B001',
          remark: null,
        },
      ],
    };

    it('正常流程：创建成功返回 id 和 orderNo', async () => {
      // INSERT 主表返回 [{ insertId: 1 }, fields]
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 1 }] as any);
      mockConnection.query.mockResolvedValueOnce({} as any);

      const req = makeRequest('POST', validBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('出库单创建成功');
      expect(data.data.orderNo).toBe('OUT20240101001');

      // 验证事务内的 INSERT 主表
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inv_outbound_order'),
        expect.arrayContaining([
          'OUT20240101001',
          '2024-01-01',
          'sales',
          1,
          'WH001',
          '主仓库',
          50, // totalQty
          500, // totalAmount
          '操作员',
        ])
      );
    });

    it('参数异常：缺少 orderDate 返回 400', async () => {
      const { orderDate, ...invalidBody } = validBody;
      const req = makeRequest('POST', invalidBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('orderDate');
      expect(transaction).not.toHaveBeenCalled();
    });

    it('参数异常：缺少 items 返回 400', async () => {
      const { items, ...invalidBody } = validBody;
      const req = makeRequest('POST', invalidBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(400);
      expect(data.message).toContain('items');
    });

    it('参数异常：缺少 warehouseCode 返回 400', async () => {
      const { warehouseCode, ...invalidBody } = validBody;
      const req = makeRequest('POST', invalidBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(400);
      expect(data.message).toContain('warehouseCode');
    });

    it('参数异常：缺少 operatorId 返回 400', async () => {
      const { operatorId, ...invalidBody } = validBody;
      const req = makeRequest('POST', invalidBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(400);
      expect(data.message).toContain('operatorId');
    });

    it('事务异常时抛错（被 withErrorHandler 捕获为 500）', async () => {
      vi.mocked(transaction).mockImplementationOnce(async () => {
        throw new Error('数据库写入失败');
      });

      const req = makeRequest('POST', validBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('数据库写入失败');
    });
  });

  describe('PUT /api/warehouse/outbound - 更新出库单', () => {
    const updateBody = {
      id: 1,
      orderDate: '2024-01-02',
      outboundType: 'transfer',
      warehouseId: 2,
      warehouseCode: 'WH002',
      warehouseName: '副仓库',
      remark: '更新备注',
    };

    it('正常流程：pending 状态允许更新', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ status: 'pending' }] as any);
      vi.mocked(execute).mockResolvedValueOnce({ affectedRows: 1 } as any);

      const req = makeRequest('PUT', updateBody);
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('出库单更新成功');
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inv_outbound_order SET'),
        expect.arrayContaining(['2024-01-02', 'transfer', 2, 'WH002', '副仓库', '更新备注', 1])
      );
    });

    it('参数异常：缺少 id 返回 400', async () => {
      const { id, ...invalidBody } = updateBody;
      const req = makeRequest('PUT', invalidBody);
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(400);
      expect(data.message).toContain('出库单ID不能为空');
    });

    it('资源不存在：返回 404', async () => {
      vi.mocked(query).mockResolvedValueOnce([] as any);

      const req = makeRequest('PUT', updateBody);
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toContain('出库单不存在');
    });

    it('状态机异常：completed 状态不允许更新', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ status: 'completed' }] as any);

      const req = makeRequest('PUT', updateBody);
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('不允许修改');
      expect(execute).not.toHaveBeenCalled();
    });

    it('状态机异常：cancelled 状态不允许更新', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ status: 'cancelled' }] as any);

      const req = makeRequest('PUT', updateBody);
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(400);
      expect(data.message).toContain('不允许修改');
    });
  });

  describe('DELETE /api/warehouse/outbound - 删除出库单', () => {
    it('正常流程：pending 状态允许删除', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ status: 'pending' }] as any);
      mockConnection.execute.mockResolvedValue({ affectedRows: 1 } as any);

      const req = makeRequest('DELETE', undefined, 'id=1');
      const { status, data } = await parseResponse(await DELETE(req as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('出库单删除成功');
      // 验证事务内同时更新主表和明细表
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inv_outbound_order SET deleted = 1'),
        [1]
      );
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inv_outbound_item SET deleted = 1'),
        [1]
      );
    });

    it('参数异常：缺少 id 返回 400', async () => {
      const req = makeRequest('DELETE');
      const { status, data } = await parseResponse(await DELETE(req as any));

      expect(status).toBe(400);
      expect(data.message).toContain('出库单ID不能为空');
    });

    it('资源不存在：返回 404', async () => {
      vi.mocked(query).mockResolvedValueOnce([] as any);

      const req = makeRequest('DELETE', undefined, 'id=999');
      const { status, data } = await parseResponse(await DELETE(req as any));

      expect(status).toBe(404);
      expect(data.message).toContain('出库单不存在');
    });

    it('状态机异常：completed 状态不允许删除', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ status: 'completed' }] as any);

      const req = makeRequest('DELETE', undefined, 'id=1');
      const { status, data } = await parseResponse(await DELETE(req as any));

      expect(status).toBe(400);
      expect(data.message).toContain('不允许删除');
    });

    it('状态机异常：cancelled 状态不允许删除', async () => {
      vi.mocked(query).mockResolvedValueOnce([{ status: 'cancelled' }] as any);

      const req = makeRequest('DELETE', undefined, 'id=1');
      const { status } = await parseResponse(await DELETE(req as any));

      expect(status).toBe(400);
    });
  });

  describe('状态机边界', () => {
    it('WarehouseStateMachine.canEditOutbound 各状态正确', () => {
      // 测试与 API 路由使用的状态机一致性
      expect(WarehouseStateMachine.canEditOutbound('draft')).toBe(true);
      expect(WarehouseStateMachine.canEditOutbound('pending')).toBe(true);
      expect(WarehouseStateMachine.canEditOutbound('completed')).toBe(false);
      expect(WarehouseStateMachine.canEditOutbound('cancelled')).toBe(false);
    });
  });
});
