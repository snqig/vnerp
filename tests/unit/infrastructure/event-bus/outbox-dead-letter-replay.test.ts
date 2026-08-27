/**
 * P2-① 死信重放补偿闭环 —— API 路由动作回归测试
 *
 * 测试目标（不连真实库、不依赖 dev server，全部内存 mock 驱动）：
 * 1. GET  ?action=dead-letters          → 返回 count + items（来自 fetchDeadLetterEvents）
 * 2. POST {action:'replay-dead-letter', id}（id 合法且为死信）→ replayed=1
 * 3. POST {action:'replay-dead-letter', id}（id 非死信/不存在）→ replayed=0 + 提示文案
 * 4. POST {action:'replay-dead-letter', id}（非法 id: 0/负数/小数）→ 400
 * 5. POST {action:'replay-dead-letters'}                  → replayed=N（批量）
 * 6. GET/POST 未知 action                                  → 400
 *
 * 通过 mock DomainEventOutboxFactory 让路由直接拿到可断言的 repository 替身，
 * 并 mock OutboxPoller / withPermission 以消除运行期副作用与鉴权依赖。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repoMocks = vi.hoisted(() => ({
  fetchDeadLetterEvents: vi.fn(),
  replayDeadLetter: vi.fn(),
  replayAllDeadLetters: vi.fn(),
  fetchPendingEvents: vi.fn(),
}));

vi.mock('@/infrastructure/event-bus/DomainEventOutboxFactory', () => ({
  getDomainEventOutbox: () => repoMocks,
  getEventBusType: () => 'mysql',
}));

vi.mock('@/infrastructure/event-bus/OutboxPoller', () => ({
  OutboxPoller: {
    isRunning: vi.fn(() => false),
    poll: vi.fn(async () => ({ processed: 0, failed: 0, retried: 0 })),
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

// withPermission 透传：直接调用 handler，跳过鉴权，便于单测路由分支
vi.mock('@/lib/api-permissions', () => ({
  withPermission:
    (handler: (req: Request, user: { id: number }) => Promise<Response>) =>
    (request: Request) => handler(request, { id: 1 }),
}));

vi.mock('@/lib/logger', () => ({ secureLog: vi.fn() }));

import { GET, POST } from '@/app/api/system/outbox/route';
import { NextRequest } from 'next/server';

function getReq(action: string): NextRequest {
  return new NextRequest(`http://localhost/api/system/outbox?action=${action}`);
}

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/system/outbox', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('P2-① 死信重放 API 路由', () => {
  beforeEach(() => {
    repoMocks.fetchDeadLetterEvents.mockReset();
    repoMocks.replayDeadLetter.mockReset();
    repoMocks.replayAllDeadLetters.mockReset();
    repoMocks.fetchPendingEvents.mockReset();
  });

  it('GET ?action=dead-letters 返回 count 与 items', async () => {
    const rows = [
      {
        id: 11,
        eventType: 'inbound.approved',
        aggregateType: 'InboundOrder',
        aggregateId: 4,
        retryCount: 3,
        errorMessage: 'boom',
        createdAt: new Date('2026-08-27T00:00:00Z'),
      },
    ];
    repoMocks.fetchDeadLetterEvents.mockResolvedValue(rows);

    const res = await GET(getReq('dead-letters'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.count).toBe(1);
    expect(body.data.items[0].id).toBe(11);
    expect(body.data.items[0].errorMessage).toBe('boom');
    expect(repoMocks.fetchDeadLetterEvents).toHaveBeenCalledWith(100);
  });

  it('POST replay-dead-letter（id 合法且为死信）replayed=1', async () => {
    repoMocks.replayDeadLetter.mockResolvedValue(1);
    const res = await POST(postReq({ action: 'replay-dead-letter', id: 7 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.replayed).toBe(1);
    expect(body.message).toContain('已重放');
    expect(repoMocks.replayDeadLetter).toHaveBeenCalledWith(7);
  });

  it('POST replay-dead-letter（id 非死信/不存在）replayed=0 且提示', async () => {
    repoMocks.replayDeadLetter.mockResolvedValue(0);
    const res = await POST(postReq({ action: 'replay-dead-letter', id: 999 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.replayed).toBe(0);
    expect(body.message).toContain('不存在或非死信');
  });

  it('POST replay-dead-letter（非法 id: 0/负数/小数）返回 400', async () => {
    const cases = [0, -5, 1.5, 'abc', null];
    for (const id of cases) {
      const res = await POST(postReq({ action: 'replay-dead-letter', id }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain('Invalid id');
      expect(repoMocks.replayDeadLetter).not.toHaveBeenCalled();
      repoMocks.replayDeadLetter.mockClear();
    }
  });

  it('POST replay-dead-letters 批量重放返回数量', async () => {
    repoMocks.replayAllDeadLetters.mockResolvedValue(3);
    const res = await POST(postReq({ action: 'replay-dead-letters' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.replayed).toBe(3);
    expect(body.message).toContain('已重放');
    expect(repoMocks.replayAllDeadLetters).toHaveBeenCalledTimes(1);
  });

  it('GET 未知 action 返回 400', async () => {
    const res = await GET(getReq('foo'));
    expect(res.status).toBe(400);
  });

  it('POST 未知 action 返回 400', async () => {
    const res = await POST(postReq({ action: 'unknown' }));
    expect(res.status).toBe(400);
  });
});
