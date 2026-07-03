/* eslint-disable @typescript-eslint/no-unused-vars */
import type { PoolConnection } from 'mysql2/promise';
import type { DomainEvent } from '@/domain/shared/DomainTypes';
import type {
  IDomainEventOutboxRepository,
  EventOutboxRecord,
} from '@/infrastructure/event-bus/types/IDomainEventOutboxRepository';

/**
 * 内存模式领域事件 Outbox（no-op 实现）
 *
 * 用于 EVENT_BUS_TYPE=memory 模式：
 * - 事件不持久化到数据库（saveEvents 直接 return）
 * - fetchPendingEvents 永远返回空数组
 * - 所有状态更新方法均为 no-op
 *
 * 设计目标：让 ApplicationService 在 memory 模式下完全不依赖数据库表，
 * 切换 EVENT_BUS_TYPE=memory 即可禁用 Outbox 持久化能力，零运行时开销。
 *
 * no-op 接口实现的参数必然未使用，参数名保留以提高可读性，故文件级禁用 no-unused-vars。
 */
export class MemoryDomainEventOutbox implements IDomainEventOutboxRepository {
  async saveEvents(
    _conn: PoolConnection,
    _aggregateType: string,
    _aggregateId: number,
    _events: DomainEvent[]
  ): Promise<void> {
    // no-op: memory 模式不持久化事件
  }

  async fetchPendingEvents(_limit?: number): Promise<EventOutboxRecord[]> {
    return [];
  }

  async claimPendingEvents(_limit?: number): Promise<EventOutboxRecord[]> {
    return [];
  }

  async markAsProcessed(_id: number): Promise<void> {
    // no-op
  }

  async markAsFailed(_id: number, _error: string): Promise<void> {
    // no-op
  }

  async markAsDeadLetter(_id: number, _error: string): Promise<void> {
    // no-op
  }

  async markForRetry(_id: number): Promise<void> {
    // no-op
  }

  async reclaimStaleDispatching(_timeoutMinutes: number): Promise<number> {
    return 0;
  }
}
