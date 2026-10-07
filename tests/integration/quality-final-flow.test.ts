/**
 * 集成测试：终检（FQC）链路
 *
 * 对照对象：tests/integration/quality-incoming-flow.test.ts（IQC「已修标准」模板）。
 *
 * 本次回归的不变量：
 *  1. 必填/值域校验：cardId(>0) + cardNo + finalResult(enum) + qualifiedQty/defectQty(>=0) + inspector。
 *  2. 数量域规则：qualifiedQty + defectQty <= plan_qty（超出 → 400 qtySumExceedsPlan）。
 *  3. 结果码映射：写入 qc_final_inspection.inspection_result（pass=1, fail=2, concession=3），
 *     且 inspection_qty = qualified_qty + unqualified_qty。
 *  4. 流程卡联动：burdening_status（pass/concession → 3, fail → 5）。
 *
 * 本次新增暴露的缺口（红测试，当前实现会失败）：
 *  A. final POST 不校验 cardId 是否真实存在 → 缺失流程卡时 INSERT...SELECT 命中 0 行仍静默成功（无记录）。
 *  B. final PUT 不校验 id 是否真实存在 → 缺失记录时 UPDATE 命中 0 行仍静默成功。
 *
 * 说明：final POST 的 INSERT 用 SELECT 子查询从 prd_process_card 取 card_no，故 cardNo 字段本身不参与写库，
 * 不存在 process 那种 cardNo/cardId 错位缺口（这点 final 比 process 更稳）。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const userInfo = { userId: 1, username: 'admin', realName: '管理员' };

const state = {
  finalInsertParams: null as unknown[] | null,
  qcFinalUpdateParams: null as unknown[] | null,
  processCardUpdates: [] as { sql: string; params: unknown[] }[],
  // final POST：plan_qty + 存在性查询返回
  card: { plan_qty: 100, card_no: 'PC-100' } as Record<string, unknown> | null,
  // final PUT：按 id 取当前记录
  finalRec: { card_id: 5 } as Record<string, unknown> | null,
};

const query = vi.fn(async (sql: string, params?: unknown[]) => {
  // A：cardId 存在性 + plan_qty 查询
  if (sql.includes('SELECT plan_qty FROM prd_process_card WHERE id = ? AND deleted = 0')) {
    return state.card ? [state.card] : [];
  }
  // B：final PUT 取当前记录
  if (sql.includes('SELECT card_id FROM qc_final_inspection WHERE id = ?')) {
    return state.finalRec ? [state.finalRec] : [];
  }
  if (sql.includes('INSERT INTO qc_final_inspection')) {
    state.finalInsertParams = params ?? [];
    return [{ insertId: 1 }, []];
  }
  if (sql.includes('UPDATE qc_final_inspection')) {
    state.qcFinalUpdateParams = params ?? [];
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

vi.mock('@/lib/global-config', () => ({
  generateDocNo: vi.fn((prefix: string) => `FPR-${prefix}-001`),
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

import { GET, POST, PUT } from '@/app/api/quality/final/route';

function req(method: string, body?: unknown) {
  return new Request(`http://localhost/api/quality/final`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never;
}

function baseBody(over: Record<string, unknown> = {}) {
  return {
    cardId: 5,
    cardNo: 'PC-100',
    finalResult: 'pass',
    qualifiedQty: 90,
    defectQty: 10,
    inspector: '张质检',
    defectReason: '色差',
    packMethod: '箱装',
    remark: '',
    ...over,
  };
}

beforeEach(() => {
  state.finalInsertParams = null;
  state.qcFinalUpdateParams = null;
  state.processCardUpdates = [];
  state.card = { plan_qty: 100, card_no: 'PC-100' };
  state.finalRec = { card_id: 5 };
  vi.clearAllMocks();
});

describe('终检 FQC 链路', () => {
  // ---------------------------------------------------------------------------
  // POST
  // ---------------------------------------------------------------------------
  describe('POST 创建终检记录', () => {
    it('非法 finalResult（zod enum）→ 400', async () => {
      const res = await POST(req('POST', baseBody({ finalResult: 'bogus' })));
      expect(res.status).toBe(400);
    });

    it('缺必填字段（cardId/cardNo/inspector）→ 400', async () => {
      const b1 = baseBody();
      delete (b1 as Record<string, unknown>).cardId;
      expect((await POST(req('POST', b1))).status).toBe(400);

      const b2 = baseBody();
      delete (b2 as Record<string, unknown>).cardNo;
      expect((await POST(req('POST', b2))).status).toBe(400);

      const b3 = baseBody();
      delete (b3 as Record<string, unknown>).inspector;
      expect((await POST(req('POST', b3))).status).toBe(400);
    });

    it('合格数+不良数 超过计划数 → 400（qtySumExceedsPlan）', async () => {
      const res = await POST(req('POST', baseBody({ qualifiedQty: 60, defectQty: 60 })));
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.message).toContain('qtySumExceedsPlan');
    });

    // —— 缺口 A（已修复）：cardId 不存在 → 404 ——
    it('cardId 不存在 → 404（关联完整性：缺失流程卡拒绝写入）', async () => {
      state.card = null;
      const res = await POST(req('POST', baseBody({ cardId: 999 })));
      expect(res.status).toBe(404);
    });

    it('结果码映射 + 数量不变量：inspection_qty = qualified_qty + unqualified_qty', async () => {
      const cases: Array<[string, number]> = [
        ['pass', 1],
        ['fail', 2],
        ['concession', 3],
      ];
      for (const [result, code] of cases) {
        state.processCardUpdates = [];
        const res = await POST(req('POST', baseBody({ finalResult: result, qualifiedQty: 90, defectQty: 10 })));
        expect(res.status).toBe(200);
        const p = state.finalInsertParams!;
        // params: [finalNo, inspection_qty, qualified_qty, unqualified_qty, resultCode, inspector, defect_reason, pack_method, remark, cardId]
        expect(p[4]).toBe(code); // inspection_result
        expect(Number(p[1])).toBeCloseTo(Number(p[2]) + Number(p[3]), 6); // qty 不变量
      }
    });

    it('pass/concession → 流程卡 burdening_status=3；fail → 5', async () => {
      await POST(req('POST', baseBody({ finalResult: 'pass' })));
      expect(state.processCardUpdates.some((u) => u.sql.includes('burdening_status = 3'))).toBe(true);

      state.processCardUpdates = [];
      await POST(req('POST', baseBody({ finalResult: 'concession' })));
      expect(state.processCardUpdates.some((u) => u.sql.includes('burdening_status = 3'))).toBe(true);

      state.processCardUpdates = [];
      await POST(req('POST', baseBody({ finalResult: 'fail' })));
      expect(state.processCardUpdates.some((u) => u.sql.includes('burdening_status = 5'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // PUT
  // ---------------------------------------------------------------------------
  describe('PUT 更新终检记录', () => {
    it('缺 id → 400', async () => {
      expect((await PUT(req('PUT', { finalResult: 'pass' }))).status).toBe(400);
    });

    // —— 缺口 B（已修复）：id 不存在 → 404 ——
    it('id 不存在 → 404（关联完整性：缺失记录拒绝更新）', async () => {
      state.finalRec = null;
      const res = await PUT(req('PUT', { id: 999, finalResult: 'pass', qualifiedQty: 5, defectQty: 5, inspector: 'X' }));
      expect(res.status).toBe(404);
    });

    it('更新写回 qc_final_inspection 并联动流程卡（按 card_id）', async () => {
      const res = await PUT(
        req('PUT', { id: 1, finalResult: 'fail', qualifiedQty: 5, defectQty: 5, inspector: 'X', remark: 're' })
      );
      expect(res.status).toBe(200);
      expect(state.qcFinalUpdateParams).not.toBeNull();
      expect(state.qcFinalUpdateParams![0]).toBe(2); // inspection_result
      expect(state.processCardUpdates.some((u) => u.sql.includes('burdening_status = 5'))).toBe(true);
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
