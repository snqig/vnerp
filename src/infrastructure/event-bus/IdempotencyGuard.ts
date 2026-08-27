import { execute } from '@/lib/db';
import { secureLog } from '@/lib/logger';

/**
 * 过期 processing 记录回收阈值（分钟）
 *
 * 可通过环境变量 IDEMPOTENCY_STALE_THRESHOLD_MINUTES 配置，默认 5 分钟。
 * 设置时应略大于业务 handler 的最大执行时间，避免误杀正在执行中的 handler。
 * 例如：若最慢的 handler 需要 8 分钟，应设为 10 或更大。
 */
function getStaleThresholdMinutes(): number {
  const raw = Number.parseInt(process.env.IDEMPOTENCY_STALE_THRESHOLD_MINUTES || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
}

/**
 * 事件处理器幂等性守护（两阶段标记 + 崩溃恢复）
 *
 * 基于 sys_event_processed 表的唯一键 (event_id, handler_name) 实现：
 *
 * 两阶段状态流转：
 *   checkAndMark → INSERT status='processing'（预占位）
 *   markAsProcessed → UPDATE status='processed'（handler 成功后确认）
 *   deleteMark → DELETE（handler 失败后清除，允许重试）
 *
 * 崩溃恢复：
 *   reclaimStaleProcessing → 清理 status='processing' 且超过阈值的记录
 *   阈值通过 IDEMPOTENCY_STALE_THRESHOLD_MINUTES 环境变量配置（默认 5 分钟）
 *   场景：进程在 checkAndMark 与 markAsProcessed 之间崩溃 →
 *         记录残留为 'processing' → 定时回收后允许重投递再次执行
 *   注意：阈值应略大于 handler 最大执行时间，否则会误杀正在执行中的 handler
 *
 * INSERT IGNORE 行为：
 * - 新插入 → affectedRows = 1（首次处理，应执行业务逻辑）
 * - 唯一键冲突 → affectedRows = 0（已处理过或正在处理中，跳过）
 */
export class IdempotencyGuard {
  /**
   * 尝试标记事件为已处理（预占位，status='processing'）
   *
   * 流程：
   * 1. 清理当前事件的过期 'processing' 记录（崩溃恢复）
   * 2. INSERT IGNORE 新记录（status='processing'）
   * 3. affectedRows=1 → 首次处理（返回 true）
   * 4. affectedRows=0 → 已存在（返回 false）
   *
   * @returns true=首次处理（应执行业务逻辑），false=已处理过（跳过）
   */
  static async checkAndMark(eventId: number, handlerName: string): Promise<boolean> {
    try {
      // Step 1: 清理当前事件的过期 'processing' 记录（崩溃恢复）
      // 如果上次执行在 markAsProcessed 之前崩溃，记录会残留为 'processing'
      const threshold = getStaleThresholdMinutes();
      await execute(
        `DELETE FROM sys_event_processed
         WHERE event_id = ? AND handler_name = ? AND status = 'processing'
           AND processed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [eventId, handlerName, threshold]
      );

      // Step 2: INSERT IGNORE 尝试预占位
      const result = await execute(
        `INSERT IGNORE INTO sys_event_processed (event_id, handler_name, status) VALUES (?, ?, 'processing')`,
        [eventId, handlerName]
      );

      const isFirstTime = result.affectedRows === 1;
      if (!isFirstTime) {
        secureLog('debug', 'IdempotencyGuard: event already processed or in progress, skipping', {
          eventId,
          handlerName,
        });
      }
      return isFirstTime;
    } catch (error) {
      // DB 故障时降级为允许执行（业务侧需容忍重复，优于丢失事件）
      secureLog('warn', 'IdempotencyGuard: mark failed, allowing execution', {
        eventId,
        handlerName,
        error: error instanceof Error ? error.message : String(error),
      });
      return true;
    }
  }

  /**
   * 标记事件处理完成（status='processing' → 'processed'）
   *
   * 在 handler 成功执行后调用，将预占位确认为已完成。
   * 如果此方法失败（DB 故障），记录会残留为 'processing'，
   * 将由 reclaimStaleProcessing 在 5 分钟后清理并允许重试。
   */
  static async markAsProcessed(eventId: number, handlerName: string): Promise<void> {
    try {
      await execute(
        `UPDATE sys_event_processed SET status = 'processed', processed_at = NOW()
         WHERE event_id = ? AND handler_name = ? AND status = 'processing'`,
        [eventId, handlerName]
      );
    } catch (error) {
      // 不抛出异常：handler 已成功执行，markAsProcessed 失败仅影响未来去重
      // 残留的 'processing' 记录将由 reclaimStaleProcessing 清理
      secureLog('warn', 'IdempotencyGuard: markAsProcessed failed, record will be reclaimed later', {
        eventId,
        handlerName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 删除幂等记录（handler 失败时调用，允许重试）
   */
  static async deleteMark(eventId: number, handlerName: string): Promise<void> {
    try {
      await execute(
        `DELETE FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
        [eventId, handlerName]
      );
      secureLog('debug', 'IdempotencyGuard: mark deleted (handler failed, allowing retry)', {
        eventId,
        handlerName,
      });
    } catch (error) {
      secureLog('warn', 'IdempotencyGuard: deleteMark failed', {
        eventId,
        handlerName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 批量回收过期的 'processing' 记录（崩溃恢复）
   *
   * 定期由 OutboxPoller 调用，清理因进程崩溃残留的 'processing' 记录。
   * 回收后，这些事件可被 XAUTOCLAIM 重投递并重新执行。
   *
   * @returns 回收的记录数
   */
  static async reclaimStaleProcessing(): Promise<number> {
    try {
      const threshold = getStaleThresholdMinutes();
      const result = await execute(
        `DELETE FROM sys_event_processed
         WHERE status = 'processing'
           AND processed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [threshold]
      );
      const reclaimed = result.affectedRows;
      if (reclaimed > 0) {
        secureLog('warn', 'IdempotencyGuard: reclaimed stale processing records', {
          count: reclaimed,
          thresholdMinutes: threshold,
          note: 'If handlers routinely take longer than the threshold, increase IDEMPOTENCY_STALE_THRESHOLD_MINUTES',
        });
      }
      return reclaimed;
    } catch (error) {
      secureLog('warn', 'IdempotencyGuard: reclaimStaleProcessing failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * 清理过期的已处理记录（定期维护）
   */
  static async cleanupOlderThan(days: number = 30): Promise<number> {
    try {
      const result = await execute(
        `DELETE FROM sys_event_processed WHERE processed_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [days]
      );
      const deleted = result.affectedRows;
      if (deleted > 0) {
        secureLog('info', 'IdempotencyGuard: cleaned up old processed records', {
          deleted,
          olderThanDays: days,
        });
      }
      return deleted;
    } catch (error) {
      secureLog('warn', 'IdempotencyGuard: cleanupOlderThan failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}
