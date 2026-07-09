import { execute, query, getPool } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';
import type { DomainEvent } from '@/domain/shared/DomainTypes';
import type {
  IDomainEventOutboxRepository,
  EventOutboxRecord,
} from '@/infrastructure/event-bus/types/IDomainEventOutboxRepository';
import { secureLog } from '@/lib/logger';

/**
 * MySQL 实现的领域事件持久化仓储
 *
 * 与原 DomainEventOutbox.ts 静态方法行为对齐，新增：
 * - markAsDeadLetter 方法（1.5 任务使用）
 * - fetchPendingEvents 加入 next_execute_at 过滤（1.4 任务指数退避使用）
 * - 返回值类型严格化为 EventOutboxRecord
 *
 * 兼容性：原 DomainEventOutbox 静态类保持运行，本类供 1.6 任务依赖注入切换使用。
 */
export class MysqlDomainEventOutboxRepository implements IDomainEventOutboxRepository {
  /**
   * 在外部事务连接内保存事件
   * 与原 DomainEventOutbox.saveEvents 行为完全一致，保证向后兼容
   */
  async saveEvents(
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

  /**
   * 查询待执行事件
   * 加入 next_execute_at 过滤：仅返回到期或无延迟的事件（1.4 指数退避）
   * 原实现未过滤 next_execute_at，本实现向后兼容（NULL 视为立即可执行）
   */
  async fetchPendingEvents(limit: number = 50): Promise<EventOutboxRecord[]> {
    const rows: Loose[] = await query(
      `SELECT id, event_type, aggregate_type, aggregate_id, payload, status,
              retry_count, error_message, next_execute_at, create_time, processed_at
       FROM domain_event_outbox
       WHERE status = 'pending'
         AND (next_execute_at IS NULL OR next_execute_at <= NOW())
       ORDER BY create_time ASC
       LIMIT ?`,
      [limit]
    );
    return rows.map(this.toRecord);
  }

  /**
   * 原子 claim 待执行事件（多实例安全）
   *
   * 使用 SELECT FOR UPDATE SKIP LOCKED 在事务内选取 pending 事件，
   * 同事务内将其状态改为 dispatching 并记录 claimed_at。
   * MySQL 8.0+ 的 SKIP LOCKED 跳过已被其他事务锁定的行，避免重复消费。
   */
  async claimPendingEvents(limit: number = 50): Promise<EventOutboxRecord[]> {
    const conn = await getPool().getConnection();
    try {
      await conn.beginTransaction();

      const [rows]: [Loose[], Loose] = await conn.query(
        `SELECT id, event_type, aggregate_type, aggregate_id, payload, status,
                retry_count, error_message, next_execute_at, create_time, processed_at
         FROM domain_event_outbox
         WHERE status = 'pending'
           AND (next_execute_at IS NULL OR next_execute_at <= NOW())
         ORDER BY create_time ASC
         LIMIT ?
         FOR UPDATE SKIP LOCKED`,
        [limit]
      );

      if (rows.length === 0) {
        await conn.commit();
        return [];
      }

      const ids = rows.map((r) => r.id);
      await conn.query(
        `UPDATE domain_event_outbox
         SET status = 'dispatching', claimed_at = NOW()
         WHERE id IN (?)`,
        [ids]
      );

      await conn.commit();
      return rows.map(this.toRecord);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async markAsProcessed(id: number): Promise<void> {
    await execute(
      `UPDATE domain_event_outbox
       SET status = 'processed', processed_at = NOW(), dispatched_at = NOW()
       WHERE id = ?`,
      [id]
    );
  }

  /**
   * 标记失败（指数退避：1s/3s/9s）
   * 与 DomainEventOutbox.markAsFailed 行为对齐：状态保持 pending，设置 next_execute_at
   * 通过 JOIN 子查询读取原 retry_count，避免同 SET 内赋值对 CASE 求值的影响
   */
  async markAsFailed(id: number, error: string): Promise<void> {
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

  /**
   * 标记死信（1.5 任务实现）
   * 完整错误栈写入 error_message（截断 2000 字符，覆盖大多数错误栈且远小于 TEXT 上限）
   */
  async markAsDeadLetter(id: number, error: string): Promise<void> {
    await execute(
      `UPDATE domain_event_outbox
       SET status = 'dead_letter', error_message = ?
       WHERE id = ?`,
      [error.substring(0, 2000), id]
    );
    secureLog('error', 'Event marked as dead letter', {
      eventId: id,
      error: error.substring(0, 200),
    });
  }

  /**
   * 重置失败事件为待处理（手动重试入口）
   * 1.4 改造：清理 next_execute_at，让事件立即可被消费
   * id=0 批量重置所有 retry_count < 3 的事件
   */
  async markForRetry(id: number): Promise<void> {
    if (id === 0) {
      await execute(
        `UPDATE domain_event_outbox
         SET status = 'pending', error_message = NULL, next_execute_at = NULL
         WHERE status = 'pending' AND retry_count > 0 AND retry_count < 3`
      );
      return;
    }
    await execute(
      `UPDATE domain_event_outbox
       SET status = 'pending', error_message = NULL, next_execute_at = NULL
       WHERE id = ? AND retry_count < 3`,
      [id]
    );
  }

  /**
   * 回收卡在 'dispatching' 状态的事件（崩溃恢复）
   *
   * OutboxPoller 在 claimPendingEvents 后崩溃会导致事件卡在 'dispatching'。
   * 此方法将超过 timeout 分钟的 dispatching 事件重置为 pending，使其可被重新消费。
   * 幂等操作：多实例并发调用不会冲突，UPDATE 是行级原子的。
   */
  async reclaimStaleDispatching(timeoutMinutes: number): Promise<number> {
    const result = await execute(
      `UPDATE domain_event_outbox
       SET status = 'pending', claimed_at = NULL
       WHERE status = 'dispatching'
         AND claimed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [timeoutMinutes]
    );
    const reset = result.affectedRows;
    if (reset > 0) {
      secureLog('warn', 'MysqlDomainEventOutbox: reclaimed stale dispatching events', {
        count: reset,
        timeoutMinutes,
      });
    }
    return reset;
  }

  // 将数据库行映射为 EventOutboxRecord
  private toRecord(row: Loose): EventOutboxRecord {
    return {
      id: row.id,
      eventType: row.event_type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      payload: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
      status: row.status,
      retryCount: row.retry_count || 0,
      errorMessage: row.error_message,
      nextExecuteAt: row.next_execute_at ? new Date(row.next_execute_at) : null,
      createdAt: row.create_time ? new Date(row.create_time) : new Date(),
      processedAt: row.processed_at ? new Date(row.processed_at) : null,
    };
  }
}

// getPool 仅用于显式标记依赖（实际查询通过 query/execute 间接使用）
void getPool;
