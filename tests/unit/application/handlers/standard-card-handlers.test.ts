import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * StandardCardHandlers 事件分发测试
 *
 * 覆盖目标：
 * 1. StandardCardNotificationHandler.supports() 覆盖全部 7 个事件类型（含新增 Rejected/NewVersionCreated）
 * 2. handle() 各事件分发到正确的处理方法
 * 3. StandardCardRejected → 写驳回通知 + 失效缓存
 * 4. StandardCardNewVersionCreated → 失效父卡缓存（不写通知）
 * 5. StandardCardWorkOrderLinkHandler 只处理 Confirmed
 */

// vi.mock 工厂会被提升到文件顶部，必须用 vi.hoisted 包裹 mock fn 以避免 TDZ
const { mockDbInsert, mockDbQuery, mockDbExecute, mockCacheDelete } = vi.hoisted(() => ({
  mockDbInsert: vi.fn().mockResolvedValue({ insertId: 1 }),
  mockDbQuery: vi.fn().mockResolvedValue([]),
  mockDbExecute: vi.fn().mockResolvedValue({}),
  mockCacheDelete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: mockDbInsert,
    query: mockDbQuery,
    execute: mockDbExecute,
  },
}));

vi.mock('@/lib/cache', () => ({
  getCacheManager: () => ({ delete: mockCacheDelete }),
}));

import {
  StandardCardNotificationHandler,
  StandardCardWorkOrderLinkHandler,
} from '@/application/handlers/StandardCardHandlers';
import {
  StandardCardCreatedEvent,
  StandardCardSubmittedEvent,
  StandardCardApprovedEvent,
  StandardCardConfirmedEvent,
  StandardCardObsoletedEvent,
  StandardCardRejectedEvent,
  StandardCardNewVersionCreatedEvent,
} from '@/domain/standard-card/events/StandardCardEvents';

describe('StandardCardNotificationHandler', () => {
  let handler: StandardCardNotificationHandler;

  beforeEach(() => {
    handler = new StandardCardNotificationHandler();
    mockDbInsert.mockClear();
    mockCacheDelete.mockClear();
  });

  describe('supports() 事件覆盖', () => {
    it('覆盖全部 7 个事件类型', () => {
      expect(handler.supports('StandardCardCreated')).toBe(true);
      expect(handler.supports('StandardCardSubmitted')).toBe(true);
      expect(handler.supports('StandardCardApproved')).toBe(true);
      expect(handler.supports('StandardCardConfirmed')).toBe(true);
      expect(handler.supports('StandardCardObsoleted')).toBe(true);
      expect(handler.supports('StandardCardRejected')).toBe(true);
      expect(handler.supports('StandardCardNewVersionCreated')).toBe(true);
    });

    it('未知事件不支持', () => {
      expect(handler.supports('Unknown')).toBe(false);
      expect(handler.supports('')).toBe(false);
    });
  });

  describe('handle() 事件分发', () => {
    it('StandardCardSubmitted → 写通知 + 失效列表缓存', async () => {
      const event = new StandardCardSubmittedEvent({
        standardCardId: 1,
        code: 'SCC001',
        version: '1.0',
        userId: 100,
      });
      await handler.handle(event);

      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      const insertArg = mockDbInsert.mock.calls[0][1];
      expect(insertArg.title).toBe('标准卡待审核');
      expect(mockCacheDelete).toHaveBeenCalledWith('standard_card_list');
    });

    it('StandardCardApproved → 写通知 + 失效卡片缓存', async () => {
      const event = new StandardCardApprovedEvent({
        standardCardId: 1,
        code: 'SCC001',
        version: '1.0',
        userId: 100,
        approvalLevel: 'tech_manager',
      });
      await handler.handle(event);

      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      const insertArg = mockDbInsert.mock.calls[0][1];
      expect(insertArg.title).toBe('标准卡待总经理审批');
      expect(mockCacheDelete).toHaveBeenCalledWith('standard_card_1');
    });

    it('StandardCardConfirmed → 写通知 + 失效卡片与物料缓存', async () => {
      const event = new StandardCardConfirmedEvent({
        standardCardId: 1,
        code: 'SCC001',
        version: '1.0',
        materialId: 10,
        userId: 100,
      });
      await handler.handle(event);

      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      expect(mockCacheDelete).toHaveBeenCalledWith('standard_card_1');
      expect(mockCacheDelete).toHaveBeenCalledWith('material_standard_card_10');
    });

    it('StandardCardObsoleted → 仅失效缓存（不写通知）', async () => {
      const event = new StandardCardObsoletedEvent({
        standardCardId: 1,
        code: 'SCC001',
        version: '1.0',
        reason: '过期',
        userId: 100,
      });
      await handler.handle(event);

      expect(mockDbInsert).not.toHaveBeenCalled();
      expect(mockCacheDelete).toHaveBeenCalledWith('standard_card_1');
      expect(mockCacheDelete).toHaveBeenCalledWith('standard_card_list');
    });

    it('StandardCardRejected → 写驳回通知（含原因）+ 失效缓存', async () => {
      const event = new StandardCardRejectedEvent({
        standardCardId: 1,
        code: 'SCC001',
        version: '1.0',
        reason: '颜色不符',
        userId: 100,
      });
      await handler.handle(event);

      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      const insertArg = mockDbInsert.mock.calls[0][1];
      expect(insertArg.title).toBe('标准卡审核被驳回');
      expect(insertArg.content).toContain('颜色不符');
      expect(insertArg.content).toContain('SCC001');
      expect(insertArg.receive_user).toBe(100);
      expect(mockCacheDelete).toHaveBeenCalledWith('standard_card_1');
      expect(mockCacheDelete).toHaveBeenCalledWith('standard_card_list');
    });

    it('StandardCardNewVersionCreated → 失效父卡缓存（不写通知）', async () => {
      const event = new StandardCardNewVersionCreatedEvent({
        parentStandardCardId: 5,
        parentVersion: '1.0',
        newVersion: '2.0',
        code: 'SCC001',
        userId: 100,
      });
      await handler.handle(event);

      expect(mockDbInsert).not.toHaveBeenCalled();
      expect(mockCacheDelete).toHaveBeenCalledWith('standard_card_5');
      expect(mockCacheDelete).toHaveBeenCalledWith('standard_card_list');
    });

    it('StandardCardCreated → 仅日志（不写通知、不失效缓存）', async () => {
      const event = new StandardCardCreatedEvent({
        standardCardId: 1,
        code: 'SCC001',
        version: '1.0',
        name: '测试',
        type: 'color',
        userId: 100,
      });
      await handler.handle(event);

      expect(mockDbInsert).not.toHaveBeenCalled();
      expect(mockCacheDelete).not.toHaveBeenCalled();
    });

    it('未知事件类型 → 不调用 db/cache', async () => {
      const event = {
        eventId: 'x',
        eventType: 'Unknown',
        occurredAt: new Date(),
        payload: {},
      } as never;
      await handler.handle(event);

      expect(mockDbInsert).not.toHaveBeenCalled();
      expect(mockCacheDelete).not.toHaveBeenCalled();
    });
  });
});

describe('StandardCardWorkOrderLinkHandler', () => {
  let handler: StandardCardWorkOrderLinkHandler;

  beforeEach(() => {
    handler = new StandardCardWorkOrderLinkHandler();
    mockDbQuery.mockClear();
    mockDbExecute.mockClear();
    mockDbQuery.mockResolvedValue([]);
  });

  it('supports() 只覆盖 Confirmed', () => {
    expect(handler.supports('StandardCardConfirmed')).toBe(true);
    expect(handler.supports('StandardCardSubmitted')).toBe(false);
    expect(handler.supports('StandardCardApproved')).toBe(false);
    expect(handler.supports('StandardCardRejected')).toBe(false);
    expect(handler.supports('StandardCardNewVersionCreated')).toBe(false);
  });

  it('非 Confirmed 事件不触发工单关联', async () => {
    const event = new StandardCardSubmittedEvent({
      standardCardId: 1,
      code: 'SCC001',
      version: '1.0',
      userId: 100,
    });
    await handler.handle(event);

    expect(mockDbQuery).not.toHaveBeenCalled();
    expect(mockDbExecute).not.toHaveBeenCalled();
  });

  it('Confirmed 事件且 materialId 存在 → 查询并更新工单', async () => {
    mockDbQuery.mockResolvedValueOnce([{ id: 11 }, { id: 12 }]);
    const event = new StandardCardConfirmedEvent({
      standardCardId: 1,
      code: 'SCC001',
      version: '1.0',
      materialId: 10,
      userId: 100,
    });
    await handler.handle(event);

    expect(mockDbQuery).toHaveBeenCalledTimes(1);
    expect(mockDbExecute).toHaveBeenCalledTimes(2);
  });

  it('Confirmed 事件但 materialId 缺失 → 不查询', async () => {
    const event = new StandardCardConfirmedEvent({
      standardCardId: 1,
      code: 'SCC001',
      version: '1.0',
      materialId: undefined,
      userId: 100,
    });
    await handler.handle(event);

    expect(mockDbQuery).not.toHaveBeenCalled();
    expect(mockDbExecute).not.toHaveBeenCalled();
  });
});
