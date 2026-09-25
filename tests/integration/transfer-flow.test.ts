/**
 * 集成测试：调拨单 创建 → 提交 → 审批 → 调出 → 调入 全链路
 *
 * 覆盖任务书 P1-3「调拨：创建→调出→在途→调入」链路。
 *
 * 重点回归一个已修复的状态机死锁：
 *   旧实现 PUT action=approve 把 status 从 1 直接推到 2（已出库），
 *   而调出接口的前置校验是 status===1 → 审批后永远调不出，链路 100% 走不通。
 *   修复：审批不推进 status，仅写 approver_id/approver_name；调出据此放行。
 *
 * 测试策略：
 * - Mock @/lib/db（不连真实库）、@/lib/api-permissions（注入 userInfo 并模拟 500 兜底）
 * - Mock next-intl / server-translate 让文案返回 key 本身，便于断言
 * - 直接调用路由 handler，断言 HTTP 状态、响应体与 SQL 副作用
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const userInfo = { userId: 1, username: 'admin', realName: '管理员' };

/** 内存态：模拟 inv_transfer_order / inv_transfer_item / 批次 */
const state = {
  transfer: {} as Record<string, unknown>,
  batches: [] as Record<string, unknown>[],
  stats: { complete_count: 1, total_count: 1 },
  batchUpdates: [] as unknown[][],
  existingBatch: null as Record<string, unknown> | null,
};

/** mock 事务连接：按 SQL 语义路由返回 */
const mockConn = {
  query: vi.fn(async () => [[], []]),
  execute: vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes('SELECT id, available_qty, unit_price, batch_no')) {
      return [state.batches, []];
    }
    if (sql.includes('FROM inv_material')) {
      return [
        [
          {
            id: params?.[0],
            material_code: 'MAT001',
            material_name: 'PET薄膜',
            unit: 'kg',
            purchase_price: 0,
            cost_price: 12.5,
          },
        ],
        [],
      ];
    }
    if (sql.includes('FROM inv_warehouse')) {
      return [[{ warehouse_name: '辅料仓' }], []];
    }
    if (sql.includes('SELECT id FROM inv_inventory_batch')) {
      return [state.existingBatch ? [state.existingBatch] : [], []];
    }
    if (sql.includes('UPDATE inv_inventory_batch')) {
      state.batchUpdates.push(params ?? []);
      return [{ affectedRows: 1 }, []];
    }
    if (sql.includes('SUM(CASE WHEN')) {
      return [[state.stats], []];
    }
    return [{ affectedRows: 1 }, []];
  }),
};

const appendInventoryTransaction = vi.fn().mockResolvedValue(undefined);
const appendInventoryLog = vi.fn().mockResolvedValue(undefined);
const recomputeInventorySummary = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/db', () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  execute: vi.fn(async () => ({ insertId: 201, affectedRows: 1 })),
  transaction: vi.fn((fn: (conn: unknown) => unknown) => fn(mockConn)),
  SqlValue: undefined,
}));

vi.mock('@/lib/inventory-ledger', () => ({
  appendInventoryTransaction: (...a: unknown[]) => appendInventoryTransaction(...(a as [])),
  appendInventoryLog: (...a: unknown[]) => appendInventoryLog(...(a as [])),
  recomputeInventorySummary: (...a: unknown[]) => recomputeInventorySummary(...(a as [])),
}));

vi.mock('@/lib/api-permissions', () => ({
  withPermission: (handler: unknown) => {
    return async (request: Request, context?: Record<string, unknown>) => {
      try {
        return await (handler as (r: Request, u: unknown, c: unknown) => Promise<Response>)(
          request,
          userInfo,
          context ?? {}
        );
      } catch (error: unknown) {
        // 与真实中间件一致：BusinessError → 400，其余 → 500
        const e = error as { statusCode?: number; httpStatus?: number; message?: string };
        const status = e?.statusCode === 400 || e?.httpStatus === 400 ? 400 : 500;
        return new Response(
          JSON.stringify({ code: status, success: false, message: e?.message, data: null }),
          { status, headers: { 'Content-Type': 'application/json' } }
        );
      }
    };
  },
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock('@/lib/server-translate', () => ({
  t: (key: string) => key,
}));

vi.mock('@/lib/global-config', () => ({
  getTrPrefix: () => 'TR',
  generateDocNo: (p: string) => `${p}202609260001`,
}));

vi.mock('@/lib/category-validation', () => ({
  checkMaterialsCategorized: vi.fn(async () => ({
    blocked: false,
    uncategorized: [],
    message: null,
  })),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { GET, POST, PUT } from '@/app/api/warehouse/transfer/route';
import { POST as OUTBOUND } from '@/app/api/warehouse/transfer/[id]/outbound/route';
import { POST as INBOUND } from '@/app/api/warehouse/transfer/[id]/inbound/route';
import { queryOne, execute } from '@/lib/db';

function req(method: string, body?: unknown) {
  return new Request('http://localhost/api/warehouse/transfer', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never;
}

function ctx(id: number | string) {
  return { params: Promise.resolve({ id: String(id) }) } as never;
}

async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

describe('调拨链路：创建 → 提交 → 审批 → 调出 → 调入', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appendInventoryTransaction.mockResolvedValue(undefined);
    appendInventoryLog.mockResolvedValue(undefined);
    recomputeInventorySummary.mockResolvedValue(undefined);
    state.batches = [];
    state.batchUpdates = [];
    state.existingBatch = null;
    state.stats = { complete_count: 1, total_count: 1 };
    state.transfer = {};
  });

  describe('创建（POST /api/warehouse/transfer）', () => {
    it('缺少调出仓/调入仓/非法类型，均返回 400', async () => {
      const r1 = await json(await POST(req('POST', { to_warehouse_id: 2 })));
      expect(r1.status).toBe(400);
      expect(r1.body.message).toBe('k_vqjfur');

      const r2 = await json(await POST(req('POST', { from_warehouse_id: 1 })));
      expect(r2.status).toBe(400);
      expect(r2.body.message).toBe('k_l4ganq');

      const r3 = await json(await POST(req('POST', { from_warehouse_id: 1, to_warehouse_id: 2, type: 9 })));
      expect(r3.status).toBe(400);
      expect(r3.body.message).toBe('k_1s5wyn2');
    });

    it('库位调拨（type=1）跨仓或缺失库位，返回 400', async () => {
      const r1 = await json(
        await POST(req('POST', { type: 1, from_warehouse_id: 1, to_warehouse_id: 2 }))
      );
      expect(r1.status).toBe(400);
      expect(r1.body.message).toBe('k_1jzjwz0');

      const r2 = await json(
        await POST(req('POST', { type: 1, from_warehouse_id: 1, to_warehouse_id: 1 }))
      );
      expect(r2.status).toBe(400);
      expect(r2.body.message).toBe('k_11r9q71');

      const r3 = await json(
        await POST(req('POST', { type: 1, from_warehouse_id: 1, to_warehouse_id: 1, from_location: 'A-01' }))
      );
      expect(r3.status).toBe(400);
      expect(r3.body.message).toBe('k_qk44qs');
    });

    it('创建成功：写入主表与明细，初始状态为 0（草稿）', async () => {
      const r = await json(
        await POST(
          req('POST', {
            type: 2,
            from_warehouse_id: 1,
            to_warehouse_id: 4,
            operator_id: 1,
            items: [{ material_id: 11, quantity: 50, unit: 'kg' }],
          })
        )
      );

      expect(r.status).toBe(200);
      expect(r.body.data.status).toBe(0);
      expect(r.body.data.transfer_no).toBe('TR202609260001');

      const calls = (execute as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      expect(calls[0][0]).toContain('INSERT INTO inv_transfer_order');
      expect(calls[1][0]).toContain('INSERT INTO inv_transfer_item');
      // 入库参数顺序：transfer_id, material_id, material_code, material_name, quantity...
      const itemParams = calls[1][1] as unknown[];
      expect(itemParams[1]).toBe(11); // material_id
      expect(itemParams[4]).toBe(50); // quantity
    });
  });

  describe('状态流转（PUT /api/warehouse/transfer）', () => {
    it('草稿提交审批：0 → 1', async () => {
      vi.mocked(queryOne).mockResolvedValueOnce({ id: 201, status: 0 } as never);
      const r = await json(await PUT(req('PUT', { id: 201, action: 'submit' })));
      expect(r.status).toBe(200);
      const sql = (execute as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as string;
      expect(sql).toContain('SET status = 1');
    });

    it('【回归】审批通过不推进 status，仅落审批人 —— 修复与调出接口的状态机死锁', async () => {
      vi.mocked(queryOne).mockResolvedValueOnce({ id: 201, status: 1 } as never);
      const r = await json(await PUT(req('PUT', { id: 201, action: 'approve', approver_id: 9 })));

      expect(r.status).toBe(200);
      const [sql, params] = (execute as unknown as { mock: { calls: unknown[][] } }).mock
        .calls[0] as [string, unknown[]];
      // 关键断言：审批后仍是「待审批」态（语义=已审批待出库），不得跳到 2
      expect(sql).not.toMatch(/SET\s+status\s*=/);
      expect(sql).toContain('approver_id = ?');
      expect(params[0]).toBe(9);
    });

    it('非待审批态审批 / 缺失审批人，返回 400', async () => {
      vi.mocked(queryOne).mockResolvedValueOnce({ id: 201, status: 0 } as never);
      const r1 = await json(await PUT(req('PUT', { id: 201, action: 'approve', approver_id: 9 })));
      expect(r1.status).toBe(400);
      expect(r1.body.message).toBe('k_hmi4kz');

      vi.mocked(queryOne).mockResolvedValueOnce({ id: 201, status: 1 } as never);
      const r2 = await json(await PUT(req('PUT', { id: 201, action: 'approve' })));
      expect(r2.status).toBe(400);
      expect(r2.body.message).toBe('k_141pjml');
    });

    it('驳回与取消落到 4（已取消）', async () => {
      vi.mocked(queryOne).mockResolvedValueOnce({ id: 201, status: 1 } as never);
      const r1 = await json(await PUT(req('PUT', { id: 201, action: 'reject' })));
      expect(r1.status).toBe(200);
      expect((execute as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toContain(
        'SET status = 4'
      );

      vi.mocked(queryOne).mockResolvedValueOnce({ id: 201, status: 0 } as never);
      const r2 = await json(await PUT(req('PUT', { id: 201, action: 'cancel' })));
      expect(r2.status).toBe(200);
    });
  });

  describe('调出（POST /api/warehouse/transfer/[id]/outbound）', () => {
    it('已审批的待出库单可正常调出：扣批次、记台账与流水、状态 1 → 2', async () => {
      state.batches = [{ id: 501, available_qty: 100, unit_price: 10, batch_no: 'B-001' }];
      vi.mocked(queryOne)
        .mockResolvedValueOnce({
          id: 201,
          status: 1,
          approver_id: 9,
          transfer_no: 'TR202609260001',
          from_warehouse_id: 1,
        } as never)
        // 事务后的进度查询
        .mockResolvedValueOnce({ out_count: 1, total_count: 1 } as never);

      const r = await json(
        await OUTBOUND(req('POST', { items: [{ material_id: 11, quantity: 60 }] }), ctx(201))
      );

      expect(r.status).toBe(200);
      expect(r.body.data.status).toBe(2);
      expect(r.body.data.out_quantity).toBe(60);

      // 批次扣减带 version 递增
      const updates = state.batchUpdates;
      expect(updates).toHaveLength(1);
      expect(updates[0][0]).toBe(60); // 扣减数量
      expect(updates[0][2]).toBe(501); // 批次 id

      // 台账 + 流水 + 派生汇总
      expect(appendInventoryTransaction).toHaveBeenCalledTimes(1);
      const txArg = appendInventoryTransaction.mock.calls[0][1] as Record<string, unknown>;
      expect(txArg.transType).toBe('out');
      expect(txArg.sourceType).toBe('transfer_out');
      expect(txArg.quantity).toBe(60);

      expect(appendInventoryLog).toHaveBeenCalledTimes(1);
      const logArg = appendInventoryLog.mock.calls[0][1] as Record<string, unknown>;
      expect(logArg.operationType).toBe(2); // 2-出库
      expect(logArg.businessType).toBe('transfer_out');

      expect(recomputeInventorySummary).toHaveBeenCalledWith(mockConn, 11, 1);
    });

    it('【回归】未审批（status=1 但无 approver_id）不得调出，返回 400', async () => {
      vi.mocked(queryOne).mockResolvedValueOnce({
        id: 201,
        status: 1,
        approver_id: null,
        transfer_no: 'TR202609260001',
        from_warehouse_id: 1,
      } as never);

      const r = await json(
        await OUTBOUND(req('POST', { items: [{ material_id: 11, quantity: 10 }] }), ctx(201))
      );
      expect(r.status).toBe(400);
      expect(r.body.message).toBe('k_trf_not_approved');
    });

    it('非待出库状态（已出库=2）重复调出，返回 400', async () => {
      vi.mocked(queryOne).mockResolvedValueOnce({
        id: 201,
        status: 2,
        approver_id: 9,
        transfer_no: 'TR202609260001',
      } as never);

      const r = await json(
        await OUTBOUND(req('POST', { items: [{ material_id: 11, quantity: 10 }] }), ctx(201))
      );
      expect(r.status).toBe(400);
      expect(r.body.message).toContain('不能执行出库操作');
    });

    it('调出仓库存不足：抛业务异常返回 400（不得被吞成 500）', async () => {
      state.batches = [{ id: 501, available_qty: 5, unit_price: 10, batch_no: 'B-001' }];
      vi.mocked(queryOne).mockResolvedValueOnce({
        id: 201,
        status: 1,
        approver_id: 9,
        transfer_no: 'TR202609260001',
        from_warehouse_id: 1,
      } as never);

      const r = await json(
        await OUTBOUND(req('POST', { items: [{ material_id: 11, quantity: 60 }] }), ctx(201))
      );
      expect(r.status).toBe(400);
      expect(r.body.message).toContain('库存不足');
    });

    it('部分调出：未全部完成时状态保持 1（在途），不跳到 2', async () => {
      state.batches = [{ id: 501, available_qty: 100, unit_price: 10, batch_no: 'B-001' }];
      state.stats = { complete_count: 1, total_count: 2 }; // 仅 1/2 行完成
      vi.mocked(queryOne)
        .mockResolvedValueOnce({
          id: 201,
          status: 1,
          approver_id: 9,
          transfer_no: 'TR202609260001',
          from_warehouse_id: 1,
        } as never)
        .mockResolvedValueOnce({ out_count: 1, total_count: 2 } as never);

      const r = await json(
        await OUTBOUND(req('POST', { items: [{ material_id: 11, quantity: 30 }] }), ctx(201))
      );
      expect(r.status).toBe(200);
      expect(r.body.data.status).toBe(1);
    });

    it('空明细或非法数量：返回 400', async () => {
      const r1 = await json(await OUTBOUND(req('POST', { items: [] }), ctx(201)));
      expect(r1.status).toBe(400);
      expect(r1.body.message).toBe('k_831vwd');

      vi.mocked(queryOne).mockResolvedValueOnce({
        id: 201,
        status: 1,
        approver_id: 9,
        transfer_no: 'TR202609260001',
        from_warehouse_id: 1,
      } as never);
      const r2 = await json(
        await OUTBOUND(req('POST', { items: [{ material_id: 11, quantity: 0 }] }), ctx(201))
      );
      expect(r2.status).toBe(400);
      expect(r2.body.message).toBe('k_1rxflii');
    });
  });

  describe('调入（POST /api/warehouse/transfer/[id]/inbound）', () => {
    it('已出库单调入：目标仓无同名批次则新建，记台账与流水，状态 2 → 3', async () => {
      state.existingBatch = null;
      vi.mocked(queryOne).mockResolvedValueOnce({
        id: 201,
        status: 2,
        transfer_no: 'TR202609260001',
        to_warehouse_id: 4,
      } as never);

      const r = await json(
        await INBOUND(req('POST', { items: [{ material_id: 11, quantity: 60 }] }), ctx(201))
      );

      expect(r.status).toBe(200);
      expect(r.body.data.status).toBe(3);
      expect(r.body.data.in_quantity).toBe(60);

      const insertCall = (mockConn.execute as unknown as { mock: { calls: unknown[][] } }).mock.calls.find(
        (c) => String(c[0]).includes('INSERT INTO inv_inventory_batch')
      );
      expect(insertCall).toBeTruthy();
      const p = insertCall![1] as unknown[];
      expect(p[0]).toBe('TRF-TR202609260001-MAT001'); // 批次号 = 调拨单号 + 物料编码
      expect(p[5]).toBe(60); // quantity
      expect(p[6]).toBe(60); // available_qty
      expect(p[8]).toBe(12.5); // unit_price 取 cost_price（locked_qty 为字面量 0，不占位）

      expect(appendInventoryTransaction).toHaveBeenCalledTimes(1);
      const txArg = appendInventoryTransaction.mock.calls[0][1] as Record<string, unknown>;
      expect(txArg.transType).toBe('in');
      expect(txArg.sourceType).toBe('transfer_in');

      expect(appendInventoryLog).toHaveBeenCalledTimes(1);
      const logArg = appendInventoryLog.mock.calls[0][1] as Record<string, unknown>;
      expect(logArg.operationType).toBe(1); // 1-入库
      expect(recomputeInventorySummary).toHaveBeenCalledWith(mockConn, 11, 4);
    });

    it('目标仓已存在同名批次则累加，不重复建批', async () => {
      state.existingBatch = { id: 777 };
      vi.mocked(queryOne).mockResolvedValueOnce({
        id: 201,
        status: 2,
        transfer_no: 'TR202609260001',
        to_warehouse_id: 4,
      } as never);

      const r = await json(
        await INBOUND(req('POST', { items: [{ material_id: 11, quantity: 20 }] }), ctx(201))
      );
      expect(r.status).toBe(200);

      const insertCall = (mockConn.execute as unknown as { mock: { calls: unknown[][] } }).mock.calls.find(
        (c) => String(c[0]).includes('INSERT INTO inv_inventory_batch')
      );
      expect(insertCall).toBeFalsy();
      expect(state.batchUpdates).toHaveLength(1);
      expect(state.batchUpdates[0][2]).toBe(777);
    });

    it('未完成调出（status=1）不得调入，返回 400', async () => {
      vi.mocked(queryOne).mockResolvedValueOnce({
        id: 201,
        status: 1,
        transfer_no: 'TR202609260001',
      } as never);

      const r = await json(
        await INBOUND(req('POST', { items: [{ material_id: 11, quantity: 10 }] }), ctx(201))
      );
      expect(r.status).toBe(400);
      expect(r.body.message).toContain('不能执行入库操作');
    });

    it('物料不存在：返回 400（BusinessError 不被吞成 500）', async () => {
      vi.mocked(queryOne).mockResolvedValueOnce({
        id: 201,
        status: 2,
        transfer_no: 'TR202609260001',
        to_warehouse_id: 4,
      } as never);
      // 让物料查询返回空
      (mockConn.execute as unknown as { mockImplementation: (f: unknown) => void }).mockImplementation(
        async (sql: string, params?: unknown[]) => {
          if (sql.includes('FROM inv_material')) return [[], []];
          if (sql.includes('SUM(CASE WHEN')) return [[state.stats], []];
          return [{ affectedRows: 1 }, []];
        }
      );

      const r = await json(
        await INBOUND(req('POST', { items: [{ material_id: 999, quantity: 10 }] }), ctx(201))
      );
      expect(r.status).toBe(400);
      expect(r.body.message).toContain('不存在');
    });
  });

  describe('列表查询（GET）', () => {
    it('返回分页列表并派生 approved / pending_outbound', async () => {
      const rows = [
        { id: 1, transfer_no: 'TR1', type: 2, status: 1, approver_id: null },
        { id: 2, transfer_no: 'TR2', type: 2, status: 1, approver_id: 9 },
        { id: 3, transfer_no: 'TR3', type: 2, status: 2, approver_id: 9 },
      ];
      const { query } = await import('@/lib/db');
      vi.mocked(query)
        .mockResolvedValueOnce([{ total: 3 }] as never)
        .mockResolvedValueOnce(rows as never);

      const r = await json(await GET(req('GET')));
      expect(r.status).toBe(200);
      expect(r.body.data.total).toBe(3);
      expect(r.body.data.list[0].approved).toBe(false);
      expect(r.body.data.list[0].pending_outbound).toBe(false);
      expect(r.body.data.list[1].approved).toBe(true);
      expect(r.body.data.list[1].pending_outbound).toBe(true);
      expect(r.body.data.list[2].pending_outbound).toBe(false);
      expect(r.body.data.list[2].status_name).toBe('已出库');
    });
  });
});
