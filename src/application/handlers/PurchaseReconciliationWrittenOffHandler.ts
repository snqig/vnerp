import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { PurchaseReconciliationWrittenOffEvent } from '@/domain/purchase/events/PurchaseReconciliationEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

/**
 * 处理采购对账核销完成事件：
 * 1. 更新每张应付单的 paid_amount / balance / status
 * 2. 全额核销的应付单状态变为 3（已结清）
 * 3. 部分核销的应付单状态变为 2（部分付款）
 */
export class PurchaseReconciliationWrittenOffHandler implements EventHandler<PurchaseReconciliationWrittenOffEvent> {
  async handle(event: PurchaseReconciliationWrittenOffEvent): Promise<void> {
    const { reconciliationId, reconciliationNo, supplierId, totalWriteOffAmount, writeOffRecords } =
      event.payload;

    secureLog('info', '采购对账核销完成，更新应付单状态', {
      reconciliationId,
      reconciliationNo,
      supplierId,
      totalWriteOffAmount,
      payableCount: writeOffRecords.length,
    });

    await transaction(async (conn) => {
      for (const record of writeOffRecords) {
        // SELECT ... FOR UPDATE 锁定应付单行，防止并发核销导致 paid_amount/balance 丢失更新
        const [payableRow]: Loose[] = await conn.execute(
          `SELECT id, payable_no, amount, paid_amount, balance, status
           FROM fin_payable
           WHERE id = ?
           FOR UPDATE`,
          [record.payableId]
        );

        if (!payableRow || payableRow.length === 0) {
          secureLog('warn', '应付单不存在或已删除，跳过', {
            payableId: record.payableId,
            reconciliationNo,
          });
          continue;
        }

        const payable = payableRow[0];
        const currentPaid = Number(payable.paid_amount || 0);
        const currentBalance = Number(payable.balance || 0);

        let writeOffAmount = Number(record.amount);
        // 透支保护：并发核销可能导致应付单余额不足，截断为当前余额
        if (writeOffAmount > currentBalance && currentBalance > 0) {
          secureLog('warn', '核销金额超过应付单当前余额，截断为余额', {
            payableId: record.payableId,
            requestedAmount: writeOffAmount,
            currentBalance,
          });
          writeOffAmount = currentBalance;
        } else if (currentBalance <= 0) {
          secureLog('warn', '应付单余额已为0，跳过核销', {
            payableId: record.payableId,
            requestedAmount: writeOffAmount,
          });
          continue;
        }

        const newPaidAmount = Math.round((currentPaid + writeOffAmount) * 100) / 100;
        const newBalance = Math.round((currentBalance - writeOffAmount) * 100) / 100;

        let newStatus = Number(payable.status);
        if (newBalance <= 0.001) {
          newStatus = 3; // 已结清
        } else if (newPaidAmount > 0) {
          newStatus = 2; // 部分付款
        }

        await conn.execute(
          `UPDATE fin_payable
           SET paid_amount = ?, balance = ?, status = ?, update_time = NOW()
           WHERE id = ?`,
          [newPaidAmount, newBalance, newStatus, record.payableId]
        );

        secureLog('info', '更新应付单核销状态', {
          payableId: record.payableId,
          payableNo: payable.payable_no,
          writeOffAmount,
          newPaidAmount,
          newBalance,
          newStatus,
        });
      }
    });

    secureLog('info', '采购对账核销完成处理结束', {
      reconciliationId,
      reconciliationNo,
      processedCount: writeOffRecords.length,
    });
  }
}
