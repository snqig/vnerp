/**
 * 集成测试：过程检验（IPQC）链路
 *
 * 对照对象：tests/integration/quality-incoming-flow.test.ts（IQC「已修标准」模板）。
 *
 * 本次回归的不变量（沿用 incoming 标准，并补充 process 特有缺口）：
 *  1. 必填/值域校验：cardId+inspectResult 必填；inspectResult ∈ {pass,fail,concession,rework,scrap}。
 *  2. 状态机：canTransitionInspect 拦截非法流转（如 pass→scrap）。
 *  3. 结果码映射：写入 qc_inspection.inspection_result（pass=1, fail=2, concession=3, rework=2, scrap=2），
 *     且 source_type='process_card'、source_no=cardNo。
 *  4. 数量不变量：inspection_qty = qualified_qty + unqualified_qty。
 *  5. 流程卡联动：burdening_status 按结果更新（pass/concession +1, fail=5, rework=6）。
 *
 * 本次新增暴露的缺口（红测试，当前实现会失败）：
 *  A. process POST 不校验 cardId 是否真实存在 → 缺失流程卡时静默成功并写入孤儿 qc_inspection。
 *  B. process POST 不校验 cardNo 与 cardId 实际卡号一致 → 跨系统点线回流断裂（qc_inspection.source_no
 *     与 prd_process_card.card_no 对不上，GET 按 cardId 关联时查不到）。
 *  C. scrap 按方案 A 并入 fail 语义：POST/PUT 均将 scrap 更新为 burdening_status = 5（与 RESULT_TO_CODE.scrap=2 保持一致）。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const userInfo = { userId: 1, username: 'admin', realName: '管理员' };

/** SQL 副作用快照 */
const state = {
  qcInsertParams: null as unknown[] | null,
  qcUpdateParams: null as unknown[] | null,
  processCardUpdates: [] as { sql: string; params: unknown[] }[],
  // 流程卡存在性 + 一致性校验的查询返回
  processCard: { id: 5, card_no: 'PC-100', plan_qty: 100 } as Record<string, unknown> | null,
  // 状态机：qc_inspection 最新一条的 inspection_result
  currentInspect: [] as { inspection_result: number }[],
  // PUT：按 id 取当前记录
  currentRecord: { source_no: 'PC-100', inspection_result: 1 } as Record<string, unknown> | null,
  // 状态机 canTransitionInspect 的可控返回值
  canTransition: true as boolean,
};

const query = vi.fn(async (sql: string, params?: unknown[]) => {
  // A/B：cardId 存在性 + cardNo 一致性校验（修复后路由才会调用）
  // 关联完整性校验：SELECT id, card_no FROM prd_process_card WHERE id = ? AND deleted = 0
  if (sql.includes('card_no FROM prd_process_card WHERE id = ?')) {
    return state.processCard ? [state.processCard] : [];
  }
  // 状态机：最新检验状态
  if (sql.includes("SELECT inspection_result FROM qc_inspection WHERE source_type = 'process_card'")) {
    return state.currentInspect;
  }
  // PUT：取当前记录
  if (sql.includes('SELECT source_no, inspection_result FROM qc_inspection WHERE id = ?')) {
    return state.currentRecord ? [state.currentRecord] : [];
  }
  if (sql.includes('INSERT INTO qc_inspection (')) {
    state.qcInsertParams = params ?? [];
    return [{ insertId: 1 }, []];
  }
  if (sql.includes('UPDATE qc_inspection')) {
    state.qcUpdateParams = params ?? [];
    return [{ affectedRows: 1 }, []];
  }
  if (sql.includes('UPDATE prd_process_card')) {
    state.processCardUpdates.push({ sql, params: params ?? [] });
    return [{ affectedRows: 1 }, []];
  }
  return [];
});

vi.mock('@/lib/db', () => ({
  query: (...a: unknown[]) => query(...(a as [string])),
  queryOne: vi.fn(async () => null),
  execute: vi.fn(async () => ({ insertId: 1, affectedRows: 1 })),
  transaction: (fn: (c: unknown) => unknown) => fn({}),
  queryPaginated: vi.fn(async () => ({
    data: [],
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
  })),
  SqlValue: undefined,
}));

vi.mock('@/lib/api-permissions', () => ({
  withPermission: (handler: unknown, _opts?: unknown) => {
    return async (request: Request, context?: Record<string, unknown>) => {
      try {
        return await (handler as (r: Request, u: unknown, c: unknown) => Promise<Response>)(
          request,
          userInfo,
          context ?? {}
        );
      } catch (error: unknown) {
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

vi.mock('@/lib/state-machine', () => ({
  StateMachineValidator: {
    canTransitionInspect: vi.fn((_from: string, _to: string) => state.canTransition),
    getInspectStatusLabel: vi.fn((s: string) => s),
  },
  StateTransitionLogger: { logTransition: vi.fn() },
  InspectStatus: undefined,
}));

vi.mock('@/lib/global-config', () => ({
  generateDocNo: vi.fn((prefix: string) => `QI-${prefix}-001`),
  getQiPrefix: vi.fn(() => 'QI'),
  getFprPrefix: vi.fn(() => 'FPR'),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string, params?: Record<string, unknown>) =>
    params === undefined ? key : `${key}|${JSON.stringify(params)}`
  ),
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { GET, POST, PUT } from '@/app/api/quality/process/route';

function req(method: string, body?: unknown) {
  return new Request(`http://localhost/api/quality/process`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never;
}

function baseBody(over: Record<string, unknown> = {}) {
  return {
    cardId: 5,
    cardNo: 'PC-100',
    inspectResult: 'pass',
    qualifiedQty: 90,
    defectQty: 10,
    inspector: '张质检',
    remark: '',
    ...over,
  };
}

beforeEach(() => {
  state.qcInsertParams = null;
  state.qcUpdateParams = null;
  state.processCardUpdates = [];
  state.processCard = { id: 5, card_no: 'PC-100', plan_qty: 100 };
  state.currentInspect = [];
  state.currentRecord = { source_no: 'PC-100', inspection_result: 1 };
  state.canTransition = true;
  vi.clearAllMocks();
});

describe('过程检验 IPQC 链路', () => {
  // ---------------------------------------------------------------------------
  // POST
  // ---------------------------------------------------------------------------
  describe('POST 创建检验记录', () => {
    it('缺 cardId/inspectResult → 400', async () => {
      expect((await POST(req('POST', { cardNo: 'PC-100', inspectResult: 'pass' }))).status).toBe(400);
      expect((await POST(req('POST', { cardId: 5 }))).status).toBe(400);
    });

    it('非法 inspectResult → 400（返回 invalidInspectResult）', async () => {
      const res = await POST(req('POST', baseBody({ inspectResult: 'bogus' })));
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.message).toContain('invalidInspectResult');
    });

    it('状态机非法流转（pass→scrap）→ 400', async () => {
      state.currentInspect = [{ inspection_result: 1 }]; // current = pass
      state.canTransition = false; // 模拟 canTransitionInspect 返回 false
      const res = await POST(req('POST', baseBody({ inspectResult: 'scrap' })));
      expect(res.status).toBe(400);
    });

    // —— 缺口 A（已修复）：cardId 不存在 → 404 ——
    it('cardId 不存在 → 404（关联完整性：缺失流程卡拒绝写入）', async () => {
      state.processCard = null;
      const res = await POST(req('POST', baseBody({ cardId: 999 })));
      expect(res.status).toBe(404);
    });

    // —— 缺口 B（已修复）：cardNo 与 cardId 实际卡号一致校验 → 400 ——
    it('cardNo 与 cardId 实际卡号不一致 → 400（关联一致性校验）', async () => {
      const res = await POST(req('POST', baseBody({ cardNo: 'PC-999' })));
      expect(res.status).toBe(400);
    });

    it('写入 qc_inspection：source_type=process_card, source_no=cardNo, resultCode 映射正确', async () => {
      const cases: Array<[string, number]> = [
        ['pass', 1],
        ['fail', 2],
        ['rework', 2],
        ['concession', 3],
      ];
      for (const [result, code] of cases) {
        state.processCardUpdates = [];
        const res = await POST(req('POST', baseBody({ inspectResult: result })));
        expect(res.status).toBe(200);
        const p = state.qcInsertParams!;
        expect(p[1]).toBe('PC-100'); // source_no
        expect(p[5]).toBe(code); // inspection_result
      }
    });

    it('数量不变量：inspection_qty = qualified_qty + unqualified_qty', async () => {
      await POST(req('POST', baseBody({ qualifiedQty: 90, defectQty: 10 })));
      const p = state.qcInsertParams!;
      expect(Number(p[2])).toBeCloseTo(Number(p[3]) + Number(p[4]), 6); // inspection_qty == q + d
    });

    it('pass → 流程卡 burdening_status +1；fail → 5；rework → 6', async () => {
      await POST(req('POST', baseBody({ inspectResult: 'pass' })));
      expect(state.processCardUpdates.some((u) => u.sql.includes('burdening_status = burdening_status + 1'))).toBe(true);

      state.processCardUpdates = [];
      await POST(req('POST', baseBody({ inspectResult: 'fail' })));
      expect(state.processCardUpdates.some((u) => u.sql.includes('burdening_status = 5'))).toBe(true);

      state.processCardUpdates = [];
      await POST(req('POST', baseBody({ inspectResult: 'rework' })));
      expect(state.processCardUpdates.some((u) => u.sql.includes('burdening_status = 6'))).toBe(true);
    });

    it('scrap → 写入 qc_inspection，流程卡 burdening_status = 5（与 fail 语义保持一致）', async () => {
      await POST(req('POST', baseBody({ inspectResult: 'scrap' })));
      expect(state.qcInsertParams![5]).toBe(2); // inspection_result=2
      expect(state.processCardUpdates.some((u) => u.sql.includes('burdening_status = 5'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // PUT
  // ---------------------------------------------------------------------------
  describe('PUT 更新检验记录', () => {
    it('缺 id → 400', async () => {
      expect((await PUT(req('PUT', { inspectResult: 'pass' }))).status).toBe(400);
    });

    it('id 不存在 → 404', async () => {
      state.currentRecord = null;
      expect((await PUT(req('PUT', { id: 999, inspectResult: 'pass' }))).status).toBe(404);
    });

    it('更新写回 qc_inspection 并联动流程卡（按 source_no）', async () => {
      const res = await PUT(
        req('PUT', { id: 1, inspectResult: 'fail', qualifiedQty: 5, defectQty: 5, inspector: 'X' })
      );
      expect(res.status).toBe(200);
      expect(state.qcUpdateParams).not.toBeNull();
      expect(state.qcUpdateParams![0]).toBe(2); // inspection_result
      expect(state.processCardUpdates.some((u) => u.sql.includes('burdening_status = 5'))).toBe(true);
    });

    it('scrap → 联动流程卡 burdening_status = 5（按 source_no）', async () => {
      const res = await PUT(
        req('PUT', { id: 1, inspectResult: 'scrap', qualifiedQty: 5, defectQty: 5, inspector: 'X' })
      );
      expect(res.status).toBe(200);
      expect(state.qcUpdateParams![0]).toBe(2); // inspection_result
      expect(
        state.processCardUpdates.some(
          (u) => u.sql.includes('burdening_status = 5') && u.sql.includes('WHERE card_no = ?')
        )
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GET
  // ---------------------------------------------------------------------------
  describe('GET 列表', () => {
    it('返回 200', async () => {
      expect((await GET(req('GET'))).status).toBe(200);
    });
  });
});
