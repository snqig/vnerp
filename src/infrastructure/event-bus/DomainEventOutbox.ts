import { execute, query } from '@/lib/db';
import { DomainEvent } from '@/domain/shared/DomainTypes';
import type { PoolConnection } from 'mysql2/promise';

export class DomainEventOutbox {
  static async saveEvents(
    conn: PoolConnection,
    aggregateType: string,
    aggregateId: number,
    events: DomainEvent[]
  ): Promise<void> {
    for (const event of events) {
      await conn.execute(
        `INSERT INTO domain_event_outbox (event_type, aggregate_type, aggregate_id, payload, status, create_time)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [event.eventType, aggregateType, aggregateId, JSON.stringify(event)]
      );
    }
  }

  static async fetchPendingEvents(limit: number = 50): Promise<Record<string, any>[]> {
    // 1.4 指数退避：仅查询 next_execute_at 已到期或为 NULL 的待处理事件
    const rows = await query<Record<string, any>>(
      `SELECT * FROM domain_event_outbox
       WHERE status = 'pending'
         AND (next_execute_at IS NULL OR next_execute_at <= NOW())
       ORDER BY create_time ASC LIMIT ?`,
      [limit]
    );
    return rows;
  }

  static async markAsProcessed(id: number): Promise<void> {
    await execute(
      `UPDATE domain_event_outbox SET status = 'processed', processed_at = NOW() WHERE id = ?`,
      [id]
    );
  }

  /**
   * 标记事件失败（指数退避：1s/3s/9s）
   * - 状态保持 pending（待重试语义），由 next_execute_at 控制下次执行时间
   * - retry_count 递增，达到 MAX_RETRY_COUNT 后由 OutboxPoller 调用 markAsDeadLetter
   * - 兼容旧调用方签名，向后兼容
   *
   * 注：CASE 表达式中的 retry_count 引用原值（未递增前），通过子查询读取避免被同 SET 的赋值影响
   */
  static async markAsFailed(id: number, error: string): Promise<void> {
    const errorMessage = error.substring(0, 500);
    await execute(
      `UPDATE domain_event_outbox o
       JOIN (SELECT retry_count AS old_retry FROM domain_event_outbox WHERE id = ?) t
       SET o.status = 'pending',
           o.error_message = ?,
           o.retry_count = t.old_retry + 1,
           o.next_execute_at = CASE
             WHEN t.old_retry + 1 = 1 THEN DATE_ADD(NOW(), INTERVAL 1 SECOND)
             WHEN t.old_retry + 1 = 2 THEN DATE_ADD(NOW(), INTERVAL 3 SECOND)
             WHEN t.old_retry + 1 = 3 THEN DATE_ADD(NOW(), INTERVAL 9 SECOND)
             ELSE DATE_ADD(NOW(), INTERVAL 9 SECOND)
           END
       WHERE o.id = ?`,
      [id, errorMessage, id]
    );
  }

  static async markForRetry(id: number): Promise<void> {
    if (id === 0) {
      await execute(
        `UPDATE domain_event_outbox SET status = 'pending', error_message = NULL WHERE status = 'failed' AND retry_count < 3`
      );
      return;
    }
    await execute(
      `UPDATE domain_event_outbox SET status = 'pending', error_message = NULL WHERE id = ? AND retry_count < 3`,
      [id]
    );
  }

  /**
   * 标记事件为死信（重试次数超限时由 OutboxPoller 调用）
   * - 状态变为 dead_letter，不再被 fetchPendingEvents 消费
   * - retry_count 不递增（已达上限，保留实际重试次数便于排查）
   * - 完整错误栈写入 error_message（截断 2000 字符，覆盖大多数错误栈且远小于 TEXT 上限）
   */
  static async markAsDeadLetter(id: number, errorStack: string): Promise<void> {
    await execute(
      `UPDATE domain_event_outbox
       SET status = 'dead_letter', error_message = ?
       WHERE id = ?`,
      [errorStack.substring(0, 2000), id]
    );
  }

  /**
   * 列出死信事件（status=dead_letter），按创建时间倒序
   */
  static async fetchDeadLetterEvents(limit: number = 100): Promise<Record<string, any>[]> {
    return query(
      `SELECT * FROM domain_event_outbox WHERE status = 'dead_letter' ORDER BY create_time DESC LIMIT ?`,
      [limit]
    );
  }

  /**
   * 重放单条死信事件：重置回 pending 并清空重试计数与错误信息。
   * 仅对 status=dead_letter 生效（WHERE 兜底）。须在根因修复后手动触发。
   * @returns 受影响行数
   */
  static async replayDeadLetter(id: number): Promise<number> {
    const result = await execute(
      `UPDATE domain_event_outbox
       SET status = 'pending', retry_count = 0, error_message = NULL, next_execute_at = NOW()
       WHERE id = ? AND status = 'dead_letter'`,
      [id]
    );
    return result.affectedRows;
  }

  /**
   * 批量重放所有死信事件
   * @returns 重放的事件数量
   */
  static async replayAllDeadLetters(): Promise<number> {
    const result = await execute(
      `UPDATE domain_event_outbox
       SET status = 'pending', retry_count = 0, error_message = NULL, next_execute_at = NOW()
       WHERE status = 'dead_letter'`
    );
    return result.affectedRows;
  }
}
