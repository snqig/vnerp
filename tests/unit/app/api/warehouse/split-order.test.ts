/**
 * 分切单（split-order）审核端回归测试 —— 重点守护 R3 修复
 *
 * 背景：原 PATCH audit 在扣减母批时误用 `split_order.version`（恒 0）作乐观锁
 *       版本号，导致母料数量「静默不扣减」（扣减 SQL affectedRows=0 也不报错）。
 *       修复后改用母批自身版本 `order.batch_version`，并加 `affectedRows===0`
 *       守卫（版本冲突直接抛错，不再静默）。
 *
 * 本测试用内存 mock 驱动路由 handler（不连真实库、不依赖 dev server）：
 *   - 断言母批扣减 UPDATE 的 WHERE version=? 传的是 batch_version，而非 split_order.version；
 *   - 断言母批扣减 affectedRows=0 时 handler 抛「批次版本冲突」并回 500。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = { motherAffectedRows: 1 };

const mocks = vi.hoisted(() => {
  const motherCalls: { sql: string; params: unknown[] }[] = [];
  const mockConn = {
    query: vi.fn(async (sql: unknown) => {
      const s = typeof sql === 'string' ? sql : '';
      if (s.includes('JOIN inv_inventory_batch')) {
        // 母批 SELECT：alias `ib.version as batch_version` = 5；split_order 自身 version = 3
        return [
          [
            {
              id: 1,
              split_no: 'SP202608270001',
              status: 0,
              material_id: 4,
              material_code: 'M004',
              material_name: '测试母料',
              warehouse_id: 1,
              parent_batch_id: 777,
              batch_no: 'PB0001',
              available_qty: 100,
              quantity: 100,
              unit_price: 0,
              unit: '米',
              width: '0',
              length: '0',
              m_width: '0',
              batch_type: 1,
              out_qty: 0,
              version: 3,
              batch_version: 5,
            },
          ],
        ];
      }
      if (s.includes('split_order_detail')) {
        return [[{ id: 1, split_id: 1, total_qty: '10', is_waste: 0, width: null }]];
      }
      if (s.includes('MAX(batch_no)')) {
        return [[{ maxNo: null }]];
      }
      return [[]];
    }),
    execute: vi.fn(async (sql: unknown, params?: unknown[]) => {
      const s = typeof sql === 'string' ? sql : '';
      if (s.includes('inv_inventory_batch SET')) {
        motherCalls.push({ sql: s, params: params ?? [] });
        return [{ affectedRows: state.motherAffectedRows, insertId: 999 }];
      }
      return [{ affectedRows: 1, insertId: 999 }];
    }),
  };
  return {
    query: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(async (cb: (conn: typeof mockConn) => Promise<unknown>) => cb(mockConn)),
    mockConn,
    motherCalls,
    mockOutboxPublish: vi.fn().mockResolvedValue(undefined),
    mockEventBus: { publish: vi.fn().mockResolvedValue(undefined) },
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
      return Response.json({ code: 500, success: false, message, data: null }, { status: 500 });
    }
  },
}));

vi.mock('@/lib/api-response', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-response')>('@/lib/api-response');
  return {
    ...actual,
    logOperation: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/inventory-ledger', () => ({
  appendInventoryTransaction: vi.fn().mockResolvedValue(undefined),
  recomputeInventorySummary: vi.fn().mockResolvedValue(undefined),
  appendInventoryLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infrastructure/event-bus/EventBus', () => ({
  getEventBus: vi.fn(() => mocks.mockEventBus),
}));

import { PATCH } from '@/app/api/warehouse/split-order/route';

function makeRequest() {
  return new Request('http://localhost/api/warehouse/split-order', {
    method: 'PATCH',
    body: JSON.stringify({
      splitId: 1,
      action: 'audit',
      operatorId: 1,
      operatorName: 'tester',
    }),
  });
}

describe('分切单审核 - R3 母批版本守护', () => {
  beforeEach(() => {
    state.motherAffectedRows = 1;
    mocks.motherCalls.length = 0;
    mocks.mockConn.query.mockClear();
    mocks.mockConn.execute.mockClear();
    mocks.mockEventBus.publish.mockClear();
  });

  it('R3: 母批扣减使用 batch_version（=5），而非 split_order.version（=3）', async () => {
    const res = await PATCH(makeRequest());
    expect(res.status).toBe(200);

    const mother = mocks.motherCalls.find((c) => c.sql.includes('inv_inventory_batch SET'));
    expect(mother, '应存在母批扣减 UPDATE').toBeDefined();
    // 非尺寸分支参数顺序: [deductQty, deductQty, parentBatchId, batch_version]
    const params = mother!.params;
    expect(params.length).toBe(4);
    expect(params[3]).toBe(5); // batch_version
    expect(params[3]).not.toBe(3); // 不能是 split_order 自身 version
  });

  it('R3: 母批扣减 affectedRows=0（版本冲突）时抛「批次版本冲突」并回 500', async () => {
    state.motherAffectedRows = 0; // 模拟乐观锁冲突
    const res = await PATCH(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('版本冲突');
  });
});
