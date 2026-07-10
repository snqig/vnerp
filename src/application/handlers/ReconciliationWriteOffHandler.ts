import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { ReconciliationWrittenOffEvent } from '@/domain/sales/events/ReconciliationEvents';
import { logger, secureLog } from '@/lib/logger';

export class ReconciliationWriteOffHandler implements EventHandler<ReconciliationWrittenOffEvent> {
  async handle(event: ReconciliationWrittenOffEvent): Promise<void> {
    const { reconciliationId, reconciliationNo, customerId, totalWriteOffAmount, writeOffRecords } =
      event.payload;
    const ctx = {
      module: 'reconciliation-writeoff',
      action: 'sync',
      reconciliationId,
      reconciliationNo,
    };

    if (!writeOffRecords || writeOffRecords.length === 0) {
      logger.info(ctx, '跳过：无核销记录', { reconciliationNo });
      return;
    }

    try {
      secureLog('info', 'Reconciliation write-off completed', {
        reconciliationNo,
        customerId,
        totalWriteOffAmount,
        recordCount: writeOffRecords.length,
      });

      logger.info(ctx, '对账核销完成，应收单已同步更新', {
        reconciliationNo,
        totalWriteOffAmount,
        recordCount: writeOffRecords.length,
      });
    } catch (err) {
      logger.error(ctx, `ReconciliationWriteOff 失败`, {
        error: err instanceof Error ? err.message : String(err),
        reconciliationNo,
      });
      throw err;
    }
  }
}
