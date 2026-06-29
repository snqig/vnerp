import type { PoolConnection } from 'mysql2/promise';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

/**
 * 领域事件持久化仓储接口（Outbox 模式）
 *
 * 抽象自 src/infrastructure/event-bus/DomainEventOutbox.ts 的静态方法，
 * 提供依赖注入能力，便于 1.6 任务通过 EVENT_BUS_TYPE 环境变量切换实现。
 *
 * 设计原则：
 * - saveEvents 接收外部事务连接 PoolConnection，保证事件与业务数据同库同事务原子落库
 * - 其他方法使用内部连接池，适合后台轮询场景
 * - 返回值类型严格化（替代原 any[]），便于编译期类型检查
 */

// 事件持久化记录（对应 domain_event_outbox 表行）
export interface EventOutboxRecord {
  id: number;
  eventType: string;
  aggregateType: string | null;
  aggregateId: number | null;
  payload: string; // JSON 字符串，由消费方自行 JSON.parse
  status: 'pending' | 'processed' | 'failed' | 'dead_letter';
  retryCount: number;
  errorMessage: string | null;
  nextExecuteAt: Date | null;
  createdAt: Date;
  processedAt: Date | null;
}

export interface IDomainEventOutboxRepository {
  /**
   * 在外部事务连接内保存事件（保证与业务数据原子提交）
   * @param conn 外部事务连接（由 ApplicationService 提供）
   * @param aggregateType 聚合根类型
   * @param aggregateId 聚合根 ID
   * @param events 待持久化的事件列表
   */
  saveEvents(
    conn: PoolConnection,
    aggregateType: string,
    aggregateId: number,
    events: DomainEvent[]
  ): Promise<void>;

  /**
   * 查询待执行事件（status=pending 且 next_execute_at 已到期或为 NULL）
   * @param limit 单次最大条数
   */
  fetchPendingEvents(limit?: number): Promise<EventOutboxRecord[]>;

  /**
   * 标记事件为已处理
   */
  markAsProcessed(id: number): Promise<void>;

  /**
   * 标记事件为失败（递增 retry_count，写入 error_message）
   * @param id 事件 ID
   * @param error 错误信息（实现内部截断）
   */
  markAsFailed(id: number, error: string): Promise<void>;

  /**
   * 标记事件为死信（重试次数超限时调用，不再参与消费）
   * @param id 事件 ID
   * @param error 死信原因（完整错误栈）
   */
  markAsDeadLetter(id: number, error: string): Promise<void>;

  /**
   * 重置失败事件为待处理（指数退避到期后由轮询器调用，或手动重试）
   * @param id 事件 ID（传 0 表示批量重置所有符合条件的失败事件）
   */
  markForRetry(id: number): Promise<void>;
}
