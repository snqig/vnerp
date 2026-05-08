import { execute, query, getPool } from '@/lib/db';
import { DomainEvent } from '@/domain/shared/DomainTypes';
import { secureLog } from '@/lib/logger';

export class DomainEventOutbox {
  static async saveEvents(
    conn: any,
    aggregateType: string,
    aggregateId: number,
    events: DomainEvent[]
  ): Promise<void> {
    for (const event of events) {
      await conn.execute(
        `INSERT INTO domain_event_outbox (event_type, aggregate_type, aggregate_id, payload, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [event.eventType, aggregateType, aggregateId, JSON.stringify(event)]
      );
    }
  }

  static async fetchPendingEvents(limit: number = 50): Promise<any[]> {
    const rows: any = await query(
      `SELECT * FROM domain_event_outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
      [limit]
    );
    return rows as any[];
  }

  static async markAsProcessed(id: number): Promise<void> {
    await execute(
      `UPDATE domain_event_outbox SET status = 'processed', processed_at = NOW() WHERE id = ?`,
      [id]
    );
  }

  static async markAsFailed(id: number, error: string): Promise<void> {
    await execute(
      `UPDATE domain_event_outbox SET status = 'failed', error_message = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [error.substring(0, 500), id]
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
}
