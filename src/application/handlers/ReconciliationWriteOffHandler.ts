import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { ReconciliationWrittenOffEvent } from '@/domain/sales/events/ReconciliationEvents';
import { transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';

/**
 * 处理销售对账核销完成事件：
 * 1. 更新每张应收单的 received_amount / balance / status
 * 2. 全额核销的应收单状态变为 3（已结清）
 * 3. 部分核销的应收单状态变为 2（部分收款）
 *
 * T306: 修复此前仅记录日志、未实际更新 fin_receivable 的缺陷。
 * 镜像 PurchaseReconciliationWrittenOffHandler 的实现模式（FOR UPDATE 锁 + 透支保护）。
 */
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

    secureLog('info', 'Reconciliation write-off started', {
      reconciliationNo,
      customerId,
      totalWriteOffAmount,
      recordCount: writeOffRecords.length,
    });

    await transaction(async (conn) => {
      for (const record of writeOffRecords) {
        // SELECT ... FOR UPDATE 锁定应收单行，防止并发核销导致 received_amount/balance 丢失更新
        const [receivableRow]: Loose = await conn.execute(
          `SELECT id, receivable_no, amount, received_amount, balance, status
           FROM fin_receivable
           WHERE id = ?
           FOR UPDATE`,
          [record.receivableId]
        );

        if (!receivableRow || receivableRow.length === 0) {
          secureLog('warn', '应收单不存在或已删除，跳过', {
            receivableId: record.receivableId,
            reconciliationNo,
          });
          continue;
        }

        const receivable = receivableRow[0];
        const currentReceived = Number(receivable.received_amount || 0);
        const currentBalance = Number(receivable.balance || 0);

        let writeOffAmount = Number(record.amount);
        // 透支保护：并发核销可能导致应收单余额不足，截断为当前余额
        if (writeOffAmount > currentBalance && currentBalance > 0) {
          secureLog('warn', '核销金额超过应收单当前余额，截断为余额', {
            receivableId: record.receivableId,
            requestedAmount: writeOffAmount,
            currentBalance,
          });
          writeOffAmount = currentBalance;
        } else if (currentBalance <= 0) {
          secureLog('warn', '应收单余额已为0，跳过核销', {
            receivableId: record.receivableId,
            requestedAmount: writeOffAmount,
          });
          continue;
        }

        const newReceivedAmount = Math.round((currentReceived + writeOffAmount) * 100) / 100;
        const newBalance = Math.round((currentBalance - writeOffAmount) * 100) / 100;

        let newStatus = Number(receivable.status);
        if (newBalance <= 0.001) {
          newStatus = 3; // 已结清
        } else if (newReceivedAmount > 0) {
          newStatus = 2; // 部分收款
        }

        await conn.execute(
          `UPDATE fin_receivable
           SET received_amount = ?, balance = ?, status = ?, update_time = NOW()
           WHERE id = ?`,
          [newReceivedAmount, newBalance, newStatus, record.receivableId]
        );

        secureLog('info', '更新应收单核销状态', {
          receivableId: record.receivableId,
          receivableNo: receivable.receivable_no,
          writeOffAmount,
          newReceivedAmount,
          newBalance,
          newStatus,
        });
      }
    });

    secureLog('info', 'Reconciliation write-off completed', {
      reconciliationId,
      reconciliationNo,
      processedCount: writeOffRecords.length,
    });

    logger.info(ctx, '对账核销完成，应收单已同步更新', {
      reconciliationNo,
      totalWriteOffAmount,
      recordCount: writeOffRecords.length,
    });
  }
}
