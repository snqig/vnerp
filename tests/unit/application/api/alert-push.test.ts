/**
 * alert-push 模块单元测试
 *
 * 覆盖 Bug 8 修复：`IN (?)` 占位符展开逻辑
 *
 * Bug 8 根因：原代码使用 `notification_ids.join(',')` 拼接数组后传给 `IN (?)`，
 * MySQL 将整个字符串视为单个值，导致批量标记已读只生效第一条。
 * 修复后使用 `${notification_ids.map(() => '?').join(',')}` 显式展开占位符。
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

vi.mock('@/lib/api-auth', () => ({
  withAuthAndErrorHandler: (
    handler: (req: Request, userInfo: any, context?: any) => Promise<Response>
  ) => {
    return async (request: Request, context?: any): Promise<Response> => {
      const userInfo = {
        userId: 1,
        username: 'admin',
        realName: '管理员',
        roles: ['admin'],
        permissions: [],
        firstLogin: false,
      };
      try {
        return await handler(request, userInfo, context);
      } catch (error: any) {
        return new Response(
          JSON.stringify({
            code: 500,
            success: false,
            message: error?.message || '服务器内部错误',
            data: null,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    };
  },
  FIRST_LOGIN_WHITELIST: [],
}));

import { POST } from '@/app/api/warehouse/alert-push/route';

function makeRequest(body: any) {
  return new Request('http://localhost/api/warehouse/alert-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function parseResponse(res: Response) {
  return { status: res.status, data: await res.json() };
}

describe('alert-push POST mark_read — IN (?) 占位符展开', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('多个 ID 时生成对应数量的占位符（核心修复验证）', async () => {
    const ids = [101, 202, 303, 404, 505];
    mocks.execute.mockResolvedValueOnce({ affectedRows: 5 } as any);

    const res = await parseResponse(
      await POST(makeRequest({ action: 'mark_read', notification_ids: ids }) as any, {} as any)
    );

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    const [sql, params] = mocks.execute.mock.calls[0];

    // 核心断言：占位符数量 === ID 数量，而非 1 个 `?`
    const placeholderCount = (sql as string).match(/\?/g)?.length ?? 0;
    expect(placeholderCount).toBe(ids.length);

    // SQL 中应包含 IN (?,?,?,?,?) 而非 IN (?)
    expect(sql).toContain('IN (?,?,?,?,?)');
    expect(sql).not.toMatch(/IN \(\?\)$/);

    // 参数应为数组本身，而非 join 后的字符串
    expect(params).toEqual(ids);
    expect(Array.isArray(params)).toBe(true);
    expect(params).not.toBe(ids.join(','));

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('单个 ID 时占位符为 1 个', async () => {
    mocks.execute.mockResolvedValueOnce({ affectedRows: 1 } as any);

    await POST(makeRequest({ action: 'mark_read', notification_ids: [77] }) as any, {} as any);

    const [sql, params] = mocks.execute.mock.calls[0];
    const placeholderCount = (sql as string).match(/\?/g)?.length ?? 0;
    expect(placeholderCount).toBe(1);
    expect(sql).toContain('IN (?)');
    expect(params).toEqual([77]);
  });

  it('空数组时占位符为 0（IN () 不会匹配任何行，安全降级）', async () => {
    mocks.execute.mockResolvedValueOnce({ affectedRows: 0 } as any);

    await POST(makeRequest({ action: 'mark_read', notification_ids: [] }) as any, {} as any);

    const [sql] = mocks.execute.mock.calls[0];
    const placeholderCount = (sql as string).match(/\?/g)?.length ?? 0;
    expect(placeholderCount).toBe(0);
    expect(sql).toContain('IN ()');
  });

  it('10 个 ID 展开正确', async () => {
    const ids = Array.from({ length: 10 }, (_, i) => i + 1);
    mocks.execute.mockResolvedValueOnce({ affectedRows: 10 } as any);

    await POST(makeRequest({ action: 'mark_read', notification_ids: ids }) as any, {} as any);

    const [sql, params] = mocks.execute.mock.calls[0];
    const placeholderCount = (sql as string).match(/\?/g)?.length ?? 0;
    expect(placeholderCount).toBe(10);
    expect(params).toEqual(ids);
  });

  it('字符串类型 ID 也能正确展开', async () => {
    const ids = ['uuid-1', 'uuid-2', 'uuid-3'];
    mocks.execute.mockResolvedValueOnce({ affectedRows: 3 } as any);

    await POST(makeRequest({ action: 'mark_read', notification_ids: ids }) as any, {} as any);

    const [sql, params] = mocks.execute.mock.calls[0];
    const placeholderCount = (sql as string).match(/\?/g)?.length ?? 0;
    expect(placeholderCount).toBe(3);
    expect(params).toEqual(ids);
  });
});

describe('alert-push POST mark_read — 参数校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('缺少 notification_ids 返回 400', async () => {
    const res = await parseResponse(
      await POST(makeRequest({ action: 'mark_read' }) as any, {} as any)
    );

    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('notification_ids 为 null 返回 400', async () => {
    const res = await parseResponse(
      await POST(makeRequest({ action: 'mark_read', notification_ids: null }) as any, {} as any)
    );

    expect(res.status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('notification_ids 非数组（字符串）返回 400', async () => {
    const res = await parseResponse(
      await POST(
        makeRequest({ action: 'mark_read', notification_ids: '1,2,3' }) as any,
        {} as any
      )
    );

    expect(res.status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

describe('alert-push POST mark_read — 回归保护', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(`修复前 Bug 模式验证：join(',') 不会产生多占位符`, async () => {
    const ids = [1, 2, 3];
    mocks.execute.mockResolvedValueOnce({ affectedRows: 3 } as any);

    await POST(makeRequest({ action: 'mark_read', notification_ids: ids }) as any, {} as any);

    const [sql, params] = mocks.execute.mock.calls[0];

    // 修复后的代码不应使用 join(',') 拼接参数
    const sqlStr = sql as string;
    const paramArr = params as unknown[];

    // 关键回归断言：参数不是 join 后的字符串 "1,2,3"
    expect(paramArr).not.toEqual([ids.join(',')]);
    expect(paramArr).toEqual([1, 2, 3]);

    // 关键回归断言：SQL 不是 IN (?) 单占位符
    expect(sqlStr).not.toMatch(/IN \(\?\)\s*$/);
    expect(sqlStr).toContain('IN (?,?,?)');
  });

  it('UPDATE 语句包含 is_read 和 read_time 字段', async () => {
    mocks.execute.mockResolvedValueOnce({ affectedRows: 1 } as any);

    await POST(makeRequest({ action: 'mark_read', notification_ids: [1] }) as any, {} as any);

    const [sql] = mocks.execute.mock.calls[0];
    expect(sql).toContain('UPDATE sys_notification');
    expect(sql).toContain('is_read = 1');
    expect(sql).toContain('read_time = NOW()');
  });
});
