/**
 * 集成测试：来料检验（IQC）链路
 *
 * 覆盖任务书 P1-3「质量：来料检验 → 合格/不合格 → 库存联动 → 不合格品处理」的前半段。
 *
 * 重点回归的不变量（均为历史踩坑点）：
 *  1. 检验结果值域归一：前端/存量三套词汇（pass/reject/qualified/unqualified/合格/不合格）
 *     必须归一到库内权威值域 pending/pass/fail，否则库存联动分支永不命中。
 *  2. 入库单 inspection_status 只能写 1（合格）/2（不合格）——写 3 会僭越 approve() 的
 *     审核语义，让入库单绕过审核即显示「已通过」。
 *  3. 数量不变量：qualified_qty + unqualified_qty = quantity（合格率统计一致性）。
 *
 * 测试策略：Mock @/lib/db（不连真实库）、@/lib/api-permissions（注入 userInfo），
 * 直接调用路由 handler，断言 HTTP 状态与 SQL 副作用（参数快照）。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const userInfo = { userId: 1, username: 'admin', realName: '管理员' };

/** SQL 副作用快照 */
const state = {
  insertParams: [] as unknown[],
  itemInsertValues: null as unknown,
  qtyUpdateParams: [] as unknown[][],
  batchUpdates: [] as { sql: string; params: unknown[] }[],
  inboundUpdates: [] as { sql: string; params: unknown[] }[],
  inboundOrder: { id: 77, order_no: 'IN-20260926-001', supplier_id: 61 } as Record<
    string,
    unknown
  > | null,
  materialId: 233 as number | null,
  existing: { id: 101 } as Record<string, unknown> | null,
  list: [] as Record<string, unknown>[],
  inspectionItems: [] as Record<string, unknown>[],
  maxNo: null as string | null,
};

function makeConn() {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('MAX(inspection_no)')) {
        return [[{ max_no: state.maxNo }], []];
      }
      if (sql.includes('INSERT INTO qc_incoming_inspection_item')) {
        return [{ affectedRows: 1 }, []];
      }
      return [[], []];
    }),
    execute: vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('INSERT INTO qc_incoming_inspection (')) {
        state.insertParams = params ?? [];
        return [{ insertId: 101 }, []];
      }
      if (sql.includes('UPDATE qc_incoming_inspection SET qualified_qty')) {
        state.qtyUpdateParams.push(params ?? []);
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes('UPDATE inv_inventory_batch')) {
        state.batchUpdates.push({ sql, params: params ?? [] });
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes('UPDATE inv_inbound_order')) {
        state.inboundUpdates.push({ sql, params: params ?? [] });
        return [{ affectedRows: 1 }, []];
      }
      return [{ affectedRows: 1 }, []];
    }),
  };
}

const conn = makeConn();

/** 模块级 query：按 SQL 语义路由 */
const query = vi.fn(async (sql: string, params?: unknown[]) => {
  if (sql.includes('FROM inv_inbound_order WHERE id = ?')) {
    return state.inboundOrder ? [state.inboundOrder] : [];
  }
  if (sql.includes('qrcode_record')) {
    return state.inboundOrder ? [state.inboundOrder] : [];
  }
  if (sql.includes('FROM inv_material WHERE material_code = ?')) {
    return state.materialId ? [{ id: state.materialId }] : [];
  }
  if (sql.includes('FROM qc_incoming_inspection WHERE id = ?')) {
    return state.existing ? [state.existing] : [];
  }
  if (sql.includes('FROM qc_incoming_inspection_item')) {
    return state.inspectionItems;
  }
  return [];
});

const execute = vi.fn(async (sql: string, params?: unknown[]) => {
  if (sql.includes('UPDATE qc_incoming_inspection SET qualified_qty')) {
    state.qtyUpdateParams.push(params ?? []);
  }
  if (sql.includes('UPDATE inv_inventory_batch')) {
    state.batchUpdates.push({ sql, params: params ?? [] });
  }
  if (sql.includes('UPDATE inv_inbound_order')) {
    state.inboundUpdates.push({ sql, params: params ?? [] });
  }
  return { insertId: 101, affectedRows: 1 };
});

vi.mock('@/lib/db', () => ({
  query: (...a: unknown[]) => query(...(a as [string])),
  queryOne: vi.fn(async () => null),
  execute: (...a: unknown[]) => execute(...(a as [string])),
  transaction: (fn: (c: unknown) => unknown) => fn(conn),
  queryPaginated: vi.fn(async () => ({
    data: state.list,
    pagination: { page: 1, pageSize: 10, total: state.list.length, totalPages: 1 },
  })),
  SqlValue: undefined,
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
  // 支持插值：返回 `key|{json params}`，便于断言缺失字段等动态文案
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

import { GET, POST, PUT, DELETE } from '@/app/api/quality/incoming/route';

function req(method: string, body?: unknown, qs = '') {
  return new Request(`http://localhost/api/quality/incoming${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never;
}

/** 合法的最小检验单请求体 */
function baseBody(over: Record<string, unknown> = {}) {
  return {
    inspectionDate: '2026-09-26',
    supplierName: '华东薄膜',
    materialCode: 'C01-01-0001',
    materialName: 'PET薄膜',
    specification: '0.05mm',
    batchNo: 'B26092601',
    quantity: 100,
    unit: 'kg',
    inspectionType: 'normal',
    inspectionResult: 'pass',
    inspectorName: '张质检',
    ...over,
  };
}

beforeEach(() => {
  state.insertParams = [];
  state.itemInsertValues = null;
  state.qtyUpdateParams = [];
  state.batchUpdates = [];
  state.inboundUpdates = [];
  state.inboundOrder = { id: 77, order_no: 'IN-20260926-001', supplier_id: 61 };
  state.materialId = 233;
  state.existing = { id: 101 };
  state.list = [];
  state.inspectionItems = [];
  state.maxNo = null;
  vi.clearAllMocks();
});

describe('来料检验 IQC 链路', () => {
  // -------------------------------------------------------------------------
  // 创建
  // -------------------------------------------------------------------------
  describe('POST 创建检验单', () => {
    it('创建成功：生成 IQC+日期+序号 单号，写入关联字段', async () => {
      const res = await POST(req('POST', baseBody()));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      // 首单序号 001
      expect(json.data.inspectionNo).toMatch(/^IQC\d{8}001$/);

      // 关联字段必须落库（报告 P1：已建未使用）
      const p = state.insertParams as unknown[];
      expect(p[13]).toBe(77); // inbound_order_id
      expect(p[14]).toBe('IN-20260926-001'); // inbound_no
      expect(p[15]).toBe(61); // supplier_id（来自入库单表头）
      expect(p[16]).toBe(233); // material_id（来自物料编码反查）
    });

    it('序号递增：当日已有 IQC 当日最大序号 时取 下一号', async () => {
      // 单号按当天日期生成，硬编码日期会使测试每天必挂。改为动态构造今日日期 + '003'。
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      state.maxNo = `IQC${dateStr}003`;
      const res = await POST(req('POST', baseBody()));
      const json = await res.json();

      expect(json.data.inspectionNo).toBe(`IQC${dateStr}004`);
    });

    it('结果归一化：reject/不合格/unqualified 一律存 fail', async () => {
      for (const raw of ['reject', '不合格', 'unqualified', 'FAIL']) {
        state.inboundUpdates = [];
        state.batchUpdates = [];
        const res = await POST(req('POST', baseBody({ inspectionResult: raw })));
        const json = await res.json();

        expect(json.data.inspectionResult).toBe('fail');
        // 归一化后必须真正触发「不合格」库存联动分支
        expect(state.batchUpdates.length).toBe(1);
        expect(state.batchUpdates[0].params[0]).toBeDefined();
        expect(state.batchUpdates[0].sql).toContain("alert_level = 'frozen'");
      }
    });

    it('结果归一化：合格/qualified/PASS 一律存 pass', async () => {
      for (const raw of ['合格', 'qualified', 'PASS']) {
        state.batchUpdates = [];
        const res = await POST(req('POST', baseBody({ inspectionResult: raw })));
        const json = await res.json();

        expect(json.data.inspectionResult).toBe('pass');
        expect(state.batchUpdates[0].sql).toContain("alert_level = 'normal'");
      }
    });

    it('未知结果值回落 pending，且不触发任何库存联动', async () => {
      const res = await POST(req('POST', baseBody({ inspectionResult: '乱写的值' })));
      const json = await res.json();

      expect(json.data.inspectionResult).toBe('pending');
      expect(state.batchUpdates.length).toBe(0);
      expect(state.inboundUpdates.length).toBe(0);
    });

    // -----------------------------------------------------------------------
    // 库存联动（核心不变量）
    // -----------------------------------------------------------------------
    it('pass：批次放行 + 入库单 inspection_status=1（严禁写 3）', async () => {
      await POST(req('POST', baseBody({ inspectionResult: 'pass' })));

      expect(state.batchUpdates).toHaveLength(1);
      expect(state.batchUpdates[0].sql).toContain("alert_level = 'normal'");
      expect(state.batchUpdates[0].sql).toContain('status = 1');

      expect(state.inboundUpdates).toHaveLength(1);
      const sql = state.inboundUpdates[0].sql;
      expect(sql).toContain('inspection_status = 1');
      // 3 是 approve() 的专属语义，质检写 3 会让入库单绕过审核
      expect(sql).not.toContain('inspection_status = 3');
    });

    it('fail：批次冻结 + 入库单 inspection_status=2', async () => {
      await POST(req('POST', baseBody({ inspectionResult: 'fail' })));

      expect(state.batchUpdates[0].sql).toContain("alert_level = 'frozen'");
      expect(state.inboundUpdates[0].sql).toContain('inspection_status = 2');
    });

    it('库存联动按 batch_no 定位，参数带检验单 id', async () => {
      await POST(req('POST', baseBody({ batchNo: 'B-XYZ', inspectionResult: 'pass' })));

      expect(state.batchUpdates[0].params).toContain('B-XYZ');
      expect(state.batchUpdates[0].params[0]).toBe(101); // inspection_id
      expect(state.inboundUpdates[0].params).toContain('B-XYZ');
    });

    // -----------------------------------------------------------------------
    // 数量拆分不变量
    // -----------------------------------------------------------------------
    it('pass：qualified=总量，unqualified=0', async () => {
      await POST(req('POST', baseBody({ quantity: 88.5, inspectionResult: 'pass' })));

      const p = state.qtyUpdateParams[0];
      expect(p[0]).toBe(88.5);
      expect(p[1]).toBe(0);
      expect(Number(p[0]) + Number(p[1])).toBeCloseTo(88.5, 4);
    });

    it('fail：qualified=0，unqualified=总量', async () => {
      await POST(req('POST', baseBody({ quantity: 88.5, inspectionResult: 'fail' })));

      const p = state.qtyUpdateParams[0];
      expect(p[0]).toBe(0);
      expect(p[1]).toBe(88.5);
    });

    it('partial：按明细 pass 项占比拆分，且和恒等于总量', async () => {
      const items = [
        { itemName: '厚度', result: 'pass' },
        { itemName: '外观', result: 'pass' },
        { itemName: '附着力', result: 'fail' },
      ];
      await POST(
        req('POST', baseBody({ quantity: 100, inspectionResult: 'partial', items }))
      );

      const p = state.qtyUpdateParams[0];
      expect(p[0]).toBeCloseTo(66.6667, 4);
      expect(p[1]).toBeCloseTo(33.3333, 4);
      expect(Number(p[0]) + Number(p[1])).toBeCloseTo(100, 4);
    });

    it('partial 无明细时保守按全部合格处理（不臆造不合格数）', async () => {
      await POST(req('POST', baseBody({ quantity: 50, inspectionResult: 'partial' })));

      const p = state.qtyUpdateParams[0];
      expect(p[0]).toBe(50);
      expect(p[1]).toBe(0);
    });

    // -----------------------------------------------------------------------
    // 参数校验
    // -----------------------------------------------------------------------
    it('缺必填字段 → 400，且返回缺失字段名', async () => {
      const body = baseBody();
      delete (body as Record<string, unknown>).materialCode;
      delete (body as Record<string, unknown>).inspectorName;

      const res = await POST(req('POST', body));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain('materialCode');
      expect(json.message).toContain('inspectorName');
    });

    it('quantity 为 0/负数/非数字 → 400', async () => {
      for (const q of [0, -5, 'abc']) {
        const res = await POST(req('POST', baseBody({ quantity: q })));
        expect(res.status).toBe(400);
      }
    });

    it('无关联入库单时 supplier_id 落 NULL（不臆造）', async () => {
      state.inboundOrder = null;
      await POST(req('POST', baseBody()));

      const p = state.insertParams as unknown[];
      expect(p[13]).toBeNull();
      expect(p[14]).toBeNull();
      expect(p[15]).toBeNull();
    });

    it('物料编码查不到时 material_id 落 NULL（不臆造）', async () => {
      state.materialId = null;
      await POST(req('POST', baseBody()));

      expect((state.insertParams as unknown[])[16]).toBeNull();
    });

    it('明细批量落库，携带 inspection_id 与 inspection_no', async () => {
      await POST(
        req('POST',
          baseBody({
            items: [
              { itemName: '厚度', standard: '0.05±0.005', actualValue: '0.051', result: 'pass' },
            ],
          })
        )
      );

      expect(conn.query).toHaveBeenCalled();
      const calls = conn.query.mock.calls as unknown[][];
      const itemCall = calls.find((c) =>
        String(c[0]).includes('INSERT INTO qc_incoming_inspection_item')
      );
      expect(itemCall).toBeDefined();
      // connection.query(sql, [itemValues])：itemValues 是「行数组的数组」
      const rows = (itemCall?.[1] as unknown[])[0] as unknown[];
      const values = rows[0] as unknown[];
      expect(values[0]).toBe(101); // inspection_id
      expect(values[1]).toMatch(/^IQC/); // inspection_no
      expect(values[2]).toBe('厚度');
    });
  });

  // -------------------------------------------------------------------------
  // 更新
  // -------------------------------------------------------------------------
  describe('PUT 更新检验单', () => {
    it('更新结果会重新触发库存联动并派生数量', async () => {
      const res = await PUT(
        req('PUT', {
          id: 101,
          inspectionNo: 'IQC20260926001',
          batchNo: 'B26092601',
          materialCode: 'C01-01-0001',
          quantity: 60,
          inspectionResult: 'reject', // 前端发 reject → 归一 fail
          items: [{ itemName: '外观', result: 'fail' }],
        })
      );

      expect(res.status).toBe(200);
      expect(state.inboundUpdates[0].sql).toContain('inspection_status = 2');
      // 更新路径同样遵守「不写 3」
      expect(state.inboundUpdates[0].sql).not.toContain('inspection_status = 3');
      const p = state.qtyUpdateParams[0];
      expect(p[0]).toBe(0);
      expect(p[1]).toBe(60);
    });

    it('更新不存在的检验单 → 404', async () => {
      state.existing = null;
      const res = await PUT(req('PUT', { id: 999, inspectionResult: 'pass' }));

      expect(res.status).toBe(404);
    });

    it('缺 id → 400', async () => {
      const res = await PUT(req('PUT', { inspectionResult: 'pass' }));

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 查询与删除
  // -------------------------------------------------------------------------
  describe('GET / DELETE', () => {
    it('GET 列表挂载明细到对应检验单', async () => {
      state.list = [{ id: 101 }, { id: 102 }];
      state.inspectionItems = [
        { id: 1, inspection_id: 101, item_name: '厚度' },
        { id: 2, inspection_id: 101, item_name: '外观' },
        { id: 3, inspection_id: 102, item_name: '附着力' },
      ];

      const res = await GET(req('GET', undefined, '?page=1&pageSize=10'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.list).toHaveLength(2);
      expect(json.data.list[0].items).toHaveLength(2);
      expect(json.data.list[1].items).toHaveLength(1);
    });

    it('DELETE 软删主表与明细（事务内）', async () => {
      const res = await DELETE(req('DELETE', undefined, '?id=101'));

      expect(res.status).toBe(200);
      const calls = conn.execute.mock.calls as unknown[][];
      expect(
        calls.some((c) => String(c[0]).includes('UPDATE qc_incoming_inspection SET deleted = 1'))
      ).toBe(true);
      expect(
        calls.some((c) =>
          String(c[0]).includes('UPDATE qc_incoming_inspection_item SET deleted = 1')
        )
      ).toBe(true);
    });

    it('DELETE 缺 id → 400；不存在的 id → 404', async () => {
      expect((await DELETE(req('DELETE', undefined, ''))).status).toBe(400);
      state.existing = null;
      expect((await DELETE(req('DELETE', undefined, '?id=999'))).status).toBe(404);
    });
  });
});
