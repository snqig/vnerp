/**
 * GET /api/finance/cost 统计口径回归测试
 *
 * 背景：cost_summary 原本独立查询，不带 keyword / cost_type 过滤，
 * 导致筛选列表后顶部汇总卡仍是全量金额（列表与统计口径分裂）。
 * 修复：汇总 SQL 复用列表同一 where + params。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  query: mocks.query,
  execute: mocks.execute,
}));

vi.mock('@/lib/api-permissions', () => ({
  withPermission:
    (
      handler: (
        request: Request,
        userInfo: { userId: number; realName: string; username: string },
        ctx?: unknown
      ) => Promise<Response>
    ) =>
    async (request: Request, ctx?: unknown): Promise<Response> =>
      handler(
        request,
        { userId: 1, realName: '管理员', username: 'admin' },
        ctx
      ),
}));

import { GET } from '@/app/api/finance/cost/route';

function get(url: string) {
  return GET(new Request(url) as unknown as Parameters<typeof GET>[0]);
}

describe('GET /api/finance/cost 汇总与列表口径一致', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query
      .mockResolvedValueOnce([{ total: 1 }]) // COUNT
      .mockResolvedValueOnce([{ id: 1 }]) // 列表
      .mockResolvedValueOnce([
        { material: 100, labor: 50, overhead: 0, outsource: 0, total: 150 },
      ]); // summary
  });

  it('cost_type 筛选同时作用于汇总查询', async () => {
    await get('http://localhost/api/finance/cost?page=1&pageSize=20&cost_type=material&keyword=');

    // 三次 query：COUNT / 列表 / 汇总
    expect(mocks.query).toHaveBeenCalledTimes(3);
    const summaryCall = mocks.query.mock.calls[2];
    const summarySql = String(summaryCall[0]);
    // WHERE 子句里的过滤条件是占位符 "AND cost_type = ?"，
    // 区别于 SELECT 中 CASE WHEN cost_type = 'material' 的固定写法
    expect(summarySql).toContain('AND cost_type = ?');
    expect(summaryCall[1]).toEqual(expect.arrayContaining(['material']));
  });

  it('keyword 筛选同时作用于汇总查询（三个 LIKE 参数）', async () => {
    await get('http://localhost/api/finance/cost?page=1&pageSize=20&keyword=%E7%A9%BA%E8%B0%83&cost_type=');

    const summaryCall = mocks.query.mock.calls[2];
    const summarySql = String(summaryCall[0]);
    expect(summarySql).toContain('cost_no LIKE ?');
    const likeParams = (summaryCall[1] as unknown[]).filter(
      (v) => typeof v === 'string' && v.includes('%')
    );
    expect(likeParams).toHaveLength(3);
  });

  it('无筛选时汇总查询不带额外条件', async () => {
    await get('http://localhost/api/finance/cost?page=1&pageSize=20');

    const summaryCall = mocks.query.mock.calls[2];
    const summarySql = String(summaryCall[0]);
    expect(summarySql).not.toContain('AND cost_type = ?');
    expect(summarySql).not.toContain('LIKE ?');
  });
});
