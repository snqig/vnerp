/**
 * 集成测试：不合格品处理链路（创建 → 开始处理 → 完成处理 → 归档）
 *
 * 覆盖任务书 P1-3「质量：来料检验 → 合格/不合格 → 不合格品处理」的后半段。
 *
 * 链路穿透 API → ApplicationService → 领域聚合 → Repository（真实 SQL 拼装），
 * 仅 Mock 最底层的 @/lib/db 与 outbox，因此能捕获「领域状态机」「handle_status
 * 乐观锁」「事件发布」这一类跨层缺陷。
 *
 * 领域状态机：pending(1) → handling(2) → completed(3)，仅 pending 可删除。
 */

// 固定时区，使「本地日期 ≠ UTC 日期」的场景可被稳定复现（handle_date 回归用）
process.env.TZ = 'Asia/Shanghai';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const userInfo = { userId: 1, username: 'admin', realName: '管理员' };

const state = {
  /** 内存中的 qc_unqualified 行 */
  row: null as Record<string, unknown> | null,
  /** UPDATE handle_status 的受影响行数（0 → 模拟乐观锁冲突） */
  statusAffected: 1,
  maxHandleNo: null as string | null,
  insertParams: [] as unknown[],
  statusUpdates: [] as unknown[][],
  handleInfoSql: [] as string[],
  softDeleted: [] as unknown[],
  savedEvents: [] as { aggregateId: number; events: unknown[] }[],
};

function pendingRow(over: Record<string, unknown> = {}) {
  return {
    id: 300,
    unqualified_no: 'UQ-20260926-0001',
    handle_no: 'UNQ-2026-0926-001',
    inspection_id: 101,
    source_type: 'incoming',
    source_no: 'IQC20260926001',
    material_id: 233,
    material_code: 'C01-01-0001',
    material_name: 'PET薄膜',
    quantity: 12.5,
    defect_type: '厚度超差',
    defect_desc: '实测 0.058mm',
    handle_type: null,
    handle_status: 1, // pending
    handle_result: null,
    responsible_dept: null,
    responsible_person: null,
    cost_amount: null,
    handler: null,
    handle_date: null,
    remark: null,
    create_time: '2026-09-26 10:00:00',
    update_time: '2026-09-26 10:00:00',
    create_by: 1,
    update_by: null,
    deleted: 0,
    ...over,
  };
}

const query = vi.fn(async (sql: string) => {
  // 物料由编码反查（默认命中，除非某个用例显式要求查不到）
  if (sql.includes('FROM inv_material')) {
    return [{ id: 233, material_code: 'C01-01-0001', material_name: 'PET薄膜' }];
  }
  if (sql.includes('FROM qc_unqualified WHERE id = ?')) {
    return state.row ? [state.row] : [];
  }
  if (sql.includes('FROM qc_unqualified WHERE handle_no = ?')) {
    return state.row ? [state.row] : [];
  }
  return [];
});

const queryOne = vi.fn(async (sql: string) => {
  // 物料由编码反查走的是 queryOne（不是 query）
  if (sql.includes('FROM inv_material')) {
    return { id: 233, material_code: 'C01-01-0001', material_name: 'PET薄膜' };
  }
  if (sql.includes('MAX(handle_no)')) {
    return { maxNo: state.maxHandleNo };
  }
  return null;
});

const execute = vi.fn(async (sql: string, params?: unknown[]) => {
  if (sql.includes('INSERT INTO qc_unqualified')) {
    state.insertParams = params ?? [];
    return { insertId: 300, affectedRows: 1 };
  }
  // 软删的 SQL 也含有 "UPDATE qc_unqualified SET"，必须先于通用分支判别，
  // 否则软删会被误记到 handleInfoSql。
  if (sql.includes('SET deleted = 1')) {
    state.softDeleted.push(params ?? []);
    return { affectedRows: 1 };
  }
  if (sql.includes('SET handle_status = ?')) {
    state.statusUpdates.push(params ?? []);
    return { affectedRows: state.statusAffected };
  }
  if (sql.includes('UPDATE qc_unqualified SET')) {
    state.handleInfoSql.push(sql);
    return { affectedRows: 1 };
  }
  return { insertId: 300, affectedRows: 1 };
});

const conn = {
  query: vi.fn(async () => [[], []]),
  execute: vi.fn(async () => [{ affectedRows: 1 }, []]),
};

vi.mock('@/lib/db', () => ({
  query: (...a: unknown[]) => query(...(a as [string])),
  queryOne: (...a: unknown[]) => queryOne(...(a as [string])),
  execute: (...a: unknown[]) => execute(...(a as [string])),
  queryPaginated: vi.fn(async () => ({ data: [], pagination: {} })),
  transaction: (fn: (c: unknown) => unknown) => fn(conn),
  SqlValue: undefined,
}));

const saveEvents = vi.fn(async (_c: unknown, _aggregateType: string, _aggregateId: number, _events: unknown[]) => undefined);
vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: () => ({
    saveEvents: (c: unknown, aggregateType: string, aggregateId: number, events: unknown[]) => {
      state.savedEvents.push({ aggregateId, events });
      return saveEvents(c, aggregateType, aggregateId, events);
    },
  }),
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
        // 与真实中间件一致：DomainError 由路由内 domainErrorToResponse 处理，这里兜底 500
        return new Response(
          JSON.stringify({ code: 500, success: false, message: String(error), data: null }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    };
  },
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string, params?: Record<string, unknown>) =>
    params === undefined ? key : `${key}|${JSON.stringify(params)}`
  ),
}));

vi.mock('@/lib/server-translate', () => ({
  t: (key: string) => key,
}));

vi.mock('@/lib/logger', () => ({
  secureLog: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { POST, PUT, DELETE } from '@/app/api/quality/unqualified/route';

function req(method: string, body?: unknown, qs = '') {
  return new Request(`http://localhost/api/quality/unqualified${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never;
}

function createBody(over: Record<string, unknown> = {}) {
  return {
    inspection_id: 101,
    source_type: 'incoming',
    source_no: 'IQC20260926001',
    material_code: 'C01-01-0001',
    quantity: 12.5,
    defect_type: '厚度超差',
    defect_desc: '实测 0.058mm',
    ...over,
  };
}

beforeEach(() => {
  state.row = pendingRow();
  state.statusAffected = 1;
  state.maxHandleNo = null;
  state.insertParams = [];
  state.statusUpdates = [];
  state.handleInfoSql = [];
  state.softDeleted = [];
  state.savedEvents = [];
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('不合格品处理链路', () => {
  // -------------------------------------------------------------------------
  // 创建
  // -------------------------------------------------------------------------
  describe('POST 创建不合格品记录', () => {
    it('创建成功：生成双单号，状态落 pending(1)，物料由编码反查补全', async () => {
      // 物料反查命中由 query 的默认实现提供；此处不覆盖 mockImplementation
      // （mockImplementation 不随 clearAllMocks 重置，会污染后续用例）
      const res = await POST(req('POST', createBody()));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.id).toBe(300);
      // 不合格单号 UQ-YYYYMMDD-xxxx（仓储生成），处理单号 UNQ-YYYY-MMDD-xxx
      // 单号按当天日期生成（见 MysqlUnqualifiedRepository.generateHandleNo），故动态取 today。
      const today = new Date();
      const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const handleNoPrefix = `UNQ-${today.getFullYear()}-${mmdd}-`;
      expect(json.data.unqualified_no).toMatch(/^UQ-\d{8}-\d{4}$/);
      expect(json.data.handle_no).toBe(`${handleNoPrefix}001`);

      // handle_status = 1 (pending)，且未指定处理方式时 handle_type 为 NULL
      expect(state.insertParams[11]).toBeNull(); // handle_type
      expect(state.insertParams[12]).toBe(1); // handle_status = pending
      // 物料由编码反查补全，避免前端传参被信任
      expect(state.insertParams[5]).toBe(233); // material_id
      expect(state.insertParams[7]).toBe('PET薄膜'); // material_name
    });

    it('处理单号按天递增：已有当日最大号时取 下一号', async () => {
      // 单号按当天日期生成（见 MysqlUnqualifiedRepository.generateHandleNo），
      // 故同日序号前缀随 today 变化，硬编码日期段会让测试每天必挂。
      const today = new Date();
      const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const handleNoPrefix = `UNQ-${today.getFullYear()}-${mmdd}-`;
      state.maxHandleNo = `${handleNoPrefix}007`;
      const res = await POST(req('POST', createBody()));
      const json = await res.json();

      expect(json.data.handle_no).toBe(`${handleNoPrefix}008`);
    });

    it('创建事件必须进入 outbox（否则下游订阅者永远收不到）', async () => {
      await POST(req('POST', createBody()));

      const created = state.savedEvents.flatMap((s) => s.events as { eventType: string }[]);
      expect(created.some((e) => e.eventType === 'quality.unqualified.created')).toBe(true);
    });

    it('inspection_id 缺失或非正 → 400', async () => {
      expect((await POST(req('POST', createBody({ inspection_id: undefined })))).status).toBe(400);
      expect((await POST(req('POST', createBody({ inspection_id: 0 })))).status).toBe(400);
    });

    it('物料编码不存在 → 404（不臆造物料）', async () => {
      // 必须返回 null：空数组是 truthy，`if (!material)` 判不出来
      queryOne.mockImplementationOnce(async () => null);
      const res = await POST(req('POST', createBody({ material_code: 'NOT-EXIST' })));

      expect(res.status).toBe(404);
    });

    it('quantity <= 0 → 400；handle_type 非法 → 400', async () => {
      expect((await POST(req('POST', createBody({ quantity: 0 })))).status).toBe(400);
      expect((await POST(req('POST', createBody({ handle_type: '瞎写' })))).status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 开始处理
  // -------------------------------------------------------------------------
  describe('PUT action=start 开始处理', () => {
    it('pending → handling：状态推进 + 写入处理方式与责任人', async () => {
      const res = await PUT(
        req('PUT', {
          action: 'start',
          id: 300,
          handle_type: 'rework',
          responsible_dept: '生产部',
          responsible_person: '李工',
        })
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('handling');

      // 乐观锁：WHERE handle_status = 旧值(1)，SET 新值(2)
      const p = state.statusUpdates[0];
      expect(p[0]).toBe(2); // new handle_status
      expect(p[p.length - 1]).toBe(1); // 期望的旧 handle_status
      // 处理信息落库：handle_type / responsible_dept / responsible_person
      expect(state.handleInfoSql.some((s) => s.includes('handle_type = ?'))).toBe(true);
      expect(state.handleInfoSql.some((s) => s.includes('responsible_dept = ?'))).toBe(true);
    });

    it('开始处理事件进入 outbox', async () => {
      await PUT(
        req('PUT', {
          action: 'start',
          id: 300,
          handle_type: 'scrap',
          responsible_dept: '品质部',
          responsible_person: '王工',
        })
      );

      const evts = state.savedEvents.flatMap((s) => s.events as { eventType: string }[]);
      expect(evts.some((e) => e.eventType === 'quality.unqualified.handling_started')).toBe(true);
    });

    it('handle_status 已被并发修改（affectedRows=0）→ 409 版本冲突', async () => {
      state.statusAffected = 0;

      const res = await PUT(
        req('PUT', {
          action: 'start',
          id: 300,
          handle_type: 'rework',
          responsible_dept: '生产部',
          responsible_person: '李工',
        })
      );

      expect(res.status).toBe(409);
    });

    it('非法处理方式 → 400；缺责任人 → 400', async () => {
      expect(
        (
          await PUT(
            req('PUT', {
              action: 'start',
              id: 300,
              handle_type: 'unknown',
              responsible_dept: '生产部',
              responsible_person: '李工',
            })
          )
        ).status
      ).toBe(400);
      expect(
        (
          await PUT(
            req('PUT', { action: 'start', id: 300, handle_type: 'rework', responsible_dept: '' })
          )
        ).status
      ).toBe(400);
    });

    it('非 pending 状态不得再次开始处理（handling → start 被拒）', async () => {
      state.row = pendingRow({ handle_status: 2 }); // handling

      const res = await PUT(
        req('PUT', {
          action: 'start',
          id: 300,
          handle_type: 'rework',
          responsible_dept: '生产部',
          responsible_person: '李工',
        })
      );

      expect(res.status).toBe(422);
    });
  });

  // -------------------------------------------------------------------------
  // 完成处理
  // -------------------------------------------------------------------------
  describe('PUT action=complete 完成处理', () => {
    beforeEach(() => {
      state.row = pendingRow({
        handle_status: 2, // handling
        handle_type: 1,
        responsible_dept: '生产部',
        responsible_person: '李工',
      });
    });

    it('handling → completed：写入处理人/结果/费用', async () => {
      const res = await PUT(
        req('PUT', {
          action: 'complete',
          id: 300,
          handler: '李工',
          handle_result: 1,
          cost_amount: 350.75,
        })
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('completed');

      const p = state.statusUpdates[0];
      expect(p[0]).toBe(3); // completed
      expect(p[p.length - 1]).toBe(2); // 旧值 handling
      expect(state.handleInfoSql.some((s) => s.includes('handler = ?'))).toBe(true);
      expect(state.handleInfoSql.some((s) => s.includes('cost_amount = ?'))).toBe(true);
    });

    it('handle_date 必须是本地当天（不得用 UTC 导致 +08:00 早 8 点前退一天）', async () => {
      // 北京时间 2026-09-26 02:00 == UTC 2026-09-25 18:00
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-25T18:00:00Z'));

      const d = new Date();
      expect(d.getHours()).toBe(2); // 前置校验：时区确为 +08:00
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      expect(localDate).toBe('2026-09-26');

      await PUT(
        req('PUT', {
          action: 'complete',
          id: 300,
          handler: '李工',
          handle_result: 1,
          cost_amount: 0,
        })
      );

      const calls = execute.mock.calls as unknown[][];
      const infoCall = calls.find(
        (c) => String(c[0]).includes('UPDATE qc_unqualified SET') && String(c[0]).includes('handle_date')
      );
      expect(infoCall).toBeDefined();
      const params = (infoCall?.[1] as unknown[]) ?? [];
      expect(params).toContain('2026-09-26');
      expect(params).not.toContain('2026-09-25');
    });

    it('pending 直接完成 → 422（跳过开始处理不合法）', async () => {
      state.row = pendingRow(); // pending

      const res = await PUT(
        req('PUT', { action: 'complete', id: 300, handler: '李工', handle_result: 1, cost_amount: 0 })
      );

      expect(res.status).toBe(422);
    });

    it('未分配责任人不得完成（pending→handling 之外的路径）→ 422', async () => {
      state.row = pendingRow({ handle_status: 2 }); // handling 但无责任人

      const res = await PUT(
        req('PUT', { action: 'complete', id: 300, handler: '李工', handle_result: 1, cost_amount: 0 })
      );

      expect(res.status).toBe(422);
    });

    it('handle_result 非 1/2、cost_amount 为负 → 400', async () => {
      expect(
        (
          await PUT(
            req('PUT', { action: 'complete', id: 300, handler: '李工', handle_result: 9, cost_amount: 0 })
          )
        ).status
      ).toBe(400);
      expect(
        (
          await PUT(
            req('PUT', { action: 'complete', id: 300, handler: '李工', handle_result: 1, cost_amount: -1 })
          )
        ).status
      ).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 删除与通用更新
  // -------------------------------------------------------------------------
  describe('DELETE / PUT action=update', () => {
    it('pending 可删除（软删）', async () => {
      const res = await DELETE(req('DELETE', undefined, '?id=300'));

      expect(res.status).toBe(200);
      expect(state.softDeleted[0]).toEqual([300]);
    });

    it('handling / completed 不可删除 → 422', async () => {
      state.row = pendingRow({ handle_status: 2 });
      expect((await DELETE(req('DELETE', undefined, '?id=300'))).status).toBe(422);

      state.row = pendingRow({ handle_status: 3 });
      expect((await DELETE(req('DELETE', undefined, '?id=300'))).status).toBe(422);
    });

    it('action=update 只更新白名单字段（禁止改 handle_status）', async () => {
      const res = await PUT(
        req('PUT', {
          action: 'update',
          id: 300,
          quantity: 20,
          defect_desc: '复检确认',
          handle_status: 3, // 试图越权改状态
        })
      );

      expect(res.status).toBe(200);
      // 状态更新路径未被触发（update 走的是通用 UPDATE，不是 updateStatus）
      expect(state.statusUpdates.length).toBe(0);
      const sql = state.handleInfoSql[0];
      expect(sql).toContain('quantity = ?');
      expect(sql).toContain('defect_desc = ?');
      expect(sql).not.toContain('handle_status = ?');
    });

    it('action=update 无有效字段 → 400', async () => {
      expect((await PUT(req('PUT', { action: 'update', id: 300 }))).status).toBe(400);
    });

    it('action 未知 → 400', async () => {
      expect((await PUT(req('PUT', { action: 'whatever', id: 300 }))).status).toBe(400);
    });
  });
});
