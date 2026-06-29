/**
 * 工单 API 集成测试
 * 覆盖 GET/POST/PUT/DELETE 路由的：正常流程、参数异常、状态流转、事务回滚
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DB 连接池（mysql2 的 connection.execute 返回 [rows, fields]）
const mockConnection = {
  query: vi.fn(),
  execute: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn((fn: (c: any) => Promise<any>) => fn(mockConnection)),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
}));

vi.mock('@/lib/document-numbering', () => ({
  generateDocumentNo: vi.fn().mockResolvedValue('WO20240101001'),
}));

import { query, transaction } from '@/lib/db';
import { GET, POST, PUT, DELETE } from '@/app/api/workorders/route';

function makeRequest(method: string, body?: any, query?: string) {
  const url = `http://localhost/api/workorders${query ? `?${query}` : ''}`;
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(url, init);
}

async function parseResponse(res: Response) {
  const data = await res.json();
  return { status: res.status, data };
}

describe('工单 API 集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/workorders - 查询工单', () => {
    it('按 id 查询单个工单：返回工单详情和明细', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([
          {
            id: 1,
            work_order_no: 'WO20240101001',
            order_no: 'SO001',
            status: 'pending',
            customer_name: '客户A',
            product_name: '产品A',
            quantity: 100,
          },
        ])
        .mockResolvedValueOnce([{ id: 1, line_no: 1, material_name: '材料1' }])
        .mockResolvedValueOnce([{ id: 1, bom_no: 'BOM001' }]);

      const req = makeRequest('GET', undefined, 'id=WO20240101001');
      const { status, data } = await parseResponse(await GET(req as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.work_order_no).toBe('WO20240101001');
      expect(data.data.items).toHaveLength(1);
      expect(data.data.bom_info).toBeDefined();
    });

    it('按 id 查询：工单不存在返回 404', async () => {
      vi.mocked(query).mockResolvedValueOnce([]);

      const req = makeRequest('GET', undefined, 'id=WO_NOT_EXIST');
      const { status, data } = await parseResponse(await GET(req as any));

      expect(status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe('工单不存在');
    });

    it('按 order_no 查询：返回工单列表', async () => {
      vi.mocked(query).mockResolvedValueOnce([
        { id: 1, work_order_no: 'WO001', order_no: 'SO001' },
        { id: 2, work_order_no: 'WO002', order_no: 'SO001' },
      ]);

      const req = makeRequest('GET', undefined, 'order_no=SO001');
      const { status, data } = await parseResponse(await GET(req as any));

      expect(status).toBe(200);
      expect(data.data.list).toHaveLength(2);
      expect(data.data.total).toBe(2);
    });

    it('列表查询：支持分页和状态筛选', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ total: 5 }])
        .mockResolvedValueOnce([
          { id: 1, work_order_no: 'WO001', status: 'pending' },
          { id: 2, work_order_no: 'WO002', status: 'pending' },
        ]);

      const req = makeRequest('GET', undefined, 'page=1&page_size=20&status=pending');
      const { status, data } = await parseResponse(await GET(req as any));

      expect(status).toBe(200);
      expect(data.data.list).toHaveLength(2);
      expect(data.data.total).toBe(5);

      // 验证带状态筛选的 SQL
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT'),
        ['pending']
      );
    });

    it('列表查询：默认分页参数（page=1, page_size=20）', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      const req = makeRequest('GET');
      await parseResponse(await GET(req as any));

      // 验证默认分页
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([20, 0])
      );
    });

    it('查询数据库异常返回 500', async () => {
      vi.mocked(query).mockRejectedValueOnce(new Error('数据库连接失败'));

      const req = makeRequest('GET', undefined, 'id=WO001');
      const { status, data } = await parseResponse(await GET(req as any));

      expect(status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/workorders - 创建工单', () => {
    const validBody = {
      order_no: 'SO001',
      customer_name: '客户A',
      items: [
        {
          material_id: 101,
          material_name: '材料1',
          quantity: 100,
          unit: 'pcs',
          unit_price: 10,
        },
      ],
      plan_start_date: '2024-01-05',
      plan_end_date: '2024-01-15',
    };

    it('正常流程：创建成功返回 work_order_id 和 qr_code', async () => {
      // Mock 1. 查询销售订单 (返回 [rows, fields])
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 1, order_no: 'SO001', status: '1' }],
      ]);
      // Mock 2. 查询已有工单
      mockConnection.execute.mockResolvedValueOnce([[{ cnt: 0 }]]);
      // Mock 3. INSERT 工单主表
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 100 }]);
      // Mock 4. INSERT 工单明细
      mockConnection.execute.mockResolvedValueOnce([{}]);
      // Mock 5. UPDATE 销售订单状态
      mockConnection.execute.mockResolvedValueOnce([{}]);
      // Mock 6. INSERT 二维码记录
      mockConnection.execute.mockResolvedValueOnce([{}]);

      const req = makeRequest('POST', validBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.work_order_no).toBe('WO20240101001');
      expect(data.data.qr_code).toMatch(/^WO-/);
    });

    it('参数异常：缺少 order_no 返回 400', async () => {
      const { order_no, ...invalidBody } = validBody;
      const req = makeRequest('POST', invalidBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('缺少必要参数');
      expect(transaction).not.toHaveBeenCalled();
    });

    it('参数异常：items 为空数组返回 400', async () => {
      const req = makeRequest('POST', { ...validBody, items: [] });
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(400);
      expect(data.message).toContain('缺少必要参数');
    });

    it('参数异常：items 不是数组返回 400', async () => {
      const req = makeRequest('POST', { ...validBody, items: 'not-an-array' });
      const { status } = await parseResponse(await POST(req as any));

      expect(status).toBe(400);
    });

    it('业务异常：销售订单不存在时抛错（500）', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const req = makeRequest('POST', validBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('销售订单不存在');
    });

    it('业务异常：销售订单已取消时抛错（500）', async () => {
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 1, order_no: 'SO001', status: 'cancelled' }],
      ]);

      const req = makeRequest('POST', validBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(500);
      expect(data.message).toContain('已取消');
    });

    it('业务异常：销售订单已存在未取消工单时抛错（500）', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1, order_no: 'SO001', status: '1' }]])
        .mockResolvedValueOnce([[{ cnt: 1 }]]);

      const req = makeRequest('POST', validBody);
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(500);
      expect(data.message).toContain('已存在未取消的工单');
    });
  });

  describe('PUT /api/workorders - 更新工单', () => {
    it('正常流程：更新工单状态为 confirmed', async () => {
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 1, work_order_no: 'WO001', order_no: 'SO001', status: 'pending' }],
      ]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const req = makeRequest('PUT', {
        id: 'WO001',
        status: 'confirmed',
      });
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('工单更新成功');
      expect(data.data.status).toBe('confirmed');
    });

    it('正常流程：更新优先级和计划日期', async () => {
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 1, work_order_no: 'WO001', order_no: 'SO001', status: 'pending' }],
      ]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const req = makeRequest('PUT', {
        id: 'WO001',
        priority: 'urgent',
        plan_start_date: '2024-01-10',
        plan_end_date: '2024-01-20',
      });
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(200);
      expect(data.data.priority).toBe('urgent');
    });

    it('参数异常：缺少 id 返回 400', async () => {
      const req = makeRequest('PUT', { status: 'confirmed' });
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(400);
      expect(data.message).toContain('工单ID不能为空');
    });

    it('业务异常：工单不存在抛错（500）', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const req = makeRequest('PUT', { id: 'WO_NOT_EXIST', status: 'confirmed' });
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(500);
      expect(data.message).toBe('工单不存在');
    });

    it('业务异常：已完成工单不能修改状态抛错（500）', async () => {
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 1, work_order_no: 'WO001', order_no: 'SO001', status: 'completed' }],
      ]);

      const req = makeRequest('PUT', { id: 'WO001', status: 'confirmed' });
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(500);
      expect(data.message).toContain('已完成');
    });

    it('业务异常：已取消工单不能修改状态抛错（500）', async () => {
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 1, work_order_no: 'WO001', order_no: 'SO001', status: 'cancelled' }],
      ]);

      const req = makeRequest('PUT', { id: 'WO001', status: 'confirmed' });
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(500);
      expect(data.message).toContain('已取消');
    });

    it('正常流程：完成工单时联动更新销售订单状态', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([
          [{ id: 1, work_order_no: 'WO001', order_no: 'SO001', status: 'producing' }],
        ])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        // 查询同 SO 下未完成工单数量
        .mockResolvedValueOnce([[{ cnt: 0 }]])
        // 更新销售订单为已完成
        .mockResolvedValueOnce([{}]);

      const req = makeRequest('PUT', { id: 'WO001', status: 'completed' });
      const { status } = await parseResponse(await PUT(req as any));

      expect(status).toBe(200);
      // 验证销售订单状态联动更新
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sal_order SET status = 4'),
        ['SO001']
      );
    });

    it('正常流程：取消工单时联动更新销售订单状态', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([
          [{ id: 1, work_order_no: 'WO001', order_no: 'SO001', status: 'pending' }],
        ])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ cnt: 0 }]])
        .mockResolvedValueOnce([{}]);

      const req = makeRequest('PUT', { id: 'WO001', status: 'cancelled' });
      const { status } = await parseResponse(await PUT(req as any));

      expect(status).toBe(200);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sal_order SET status = 2'),
        ['SO001']
      );
    });
  });

  describe('DELETE /api/workorders - 删除工单', () => {
    it('正常流程：pending 状态允许删除', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([
          [{ id: 1, work_order_no: 'WO001', order_no: 'SO001', status: 'pending' }],
        ])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ cnt: 0 }]])
        .mockResolvedValueOnce([{}]);

      const req = makeRequest('DELETE', undefined, 'id=WO001');
      const { status, data } = await parseResponse(await DELETE(req as any));

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE prod_work_order SET deleted = 1'),
        [1]
      );
    });

    it('参数异常：缺少 id 返回 400', async () => {
      const req = makeRequest('DELETE');
      const { status, data } = await parseResponse(await DELETE(req as any));

      expect(status).toBe(400);
      expect(data.message).toContain('工单ID不能为空');
    });

    it('业务异常：工单不存在抛错（500）', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const req = makeRequest('DELETE', undefined, 'id=WO_NOT_EXIST');
      const { status, data } = await parseResponse(await DELETE(req as any));

      expect(status).toBe(500);
      expect(data.message).toBe('工单不存在');
    });

    it('业务异常：生产中的工单不能删除抛错（500）', async () => {
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 1, work_order_no: 'WO001', order_no: 'SO001', status: 'producing' }],
      ]);

      const req = makeRequest('DELETE', undefined, 'id=WO001');
      const { status, data } = await parseResponse(await DELETE(req as any));

      expect(status).toBe(500);
      expect(data.message).toContain('生产中');
      expect(data.message).toContain('请先取消');
    });
  });

  describe('事务异常处理', () => {
    it('POST 事务中抛错时返回 500', async () => {
      vi.mocked(transaction).mockImplementationOnce(async () => {
        throw new Error('事务执行失败');
      });

      const req = makeRequest('POST', {
        order_no: 'SO001',
        items: [{ material_id: 1, material_name: 'M1', quantity: 10, unit: 'pcs' }],
      });
      const { status, data } = await parseResponse(await POST(req as any));

      expect(status).toBe(500);
      expect(data.message).toBe('事务执行失败');
    });

    it('PUT 事务中抛错时返回 500', async () => {
      vi.mocked(transaction).mockImplementationOnce(async () => {
        throw new Error('并发冲突');
      });

      const req = makeRequest('PUT', { id: 'WO001', status: 'confirmed' });
      const { status, data } = await parseResponse(await PUT(req as any));

      expect(status).toBe(500);
      expect(data.message).toBe('并发冲突');
    });
  });
});
