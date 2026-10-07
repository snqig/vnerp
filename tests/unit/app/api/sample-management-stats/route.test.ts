/**
 * 打样管理统计卡片路由回归测试
 *
 * 背景（2026-10-05）：/sample/management 五张卡片恒显示 0。
 * 根因——query() 返回行数组 [{count}]，路由用 [[pending], ...] 解构后
 * 变量已是首行对象 {count}，响应构造却又取 [0].count → undefined → || 0。
 * 本测试守护：解构后直接读 .count，completed=15 必须透传到响应。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  query: mocks.query,
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

import { GET } from '@/app/api/sample/management/stats/route';

function buildRequest(url = 'http://localhost/api/sample/management/stats') {
  return new Request(url) as unknown as Parameters<typeof GET>[0];
}

describe('GET /api/sample/management/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('将各 COUNT 行的 count 正确透传（回归：解构后不得再 [0]）', async () => {
    // Promise.all 数组按顺序触发 5 次 query
    mocks.query
      .mockResolvedValueOnce([{ count: 2 }]) // pending
      .mockResolvedValueOnce([{ count: 3 }]) // sampling
      .mockResolvedValueOnce([{ count: 15 }]) // completed
      .mockResolvedValueOnce([{ count: 4 }]) // confirming
      .mockResolvedValueOnce([{ count: 20 }]); // monthly

    const res = await GET(buildRequest());
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toEqual({
      pending: 2,
      sampling: 3,
      completed: 15,
      confirming: 4,
      monthlyCount: 20,
    });
  });

  it('COUNT 为 0 时返回数字 0 而非 undefined', async () => {
    mocks.query.mockResolvedValue([{ count: 0 }]);

    const res = await GET(buildRequest());
    const json = await res.json();

    expect(json.data).toEqual({
      pending: 0,
      sampling: 0,
      completed: 0,
      confirming: 0,
      monthlyCount: 0,
    });
  });
});
