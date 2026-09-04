import { getTranslations } from 'next-intl/server';

import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { PurchaseReconciliationWrittenOffEvent } from '@/domain/purchase/events/PurchaseReconciliationEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { DbRow } from '@/types/db';

/**
 * 处理采购对账核销完成事件：
 * 1. 更新每张应付单的 paid_amount / balance / status
 * 2. 全额核销的应付单状态变为 3（已结清）
 * 3. 部分核销的应付单状态变为 2（部分付款）
 */
export class PurchaseReconciliationWrittenOffHandler implements EventHandler<PurchaseReconciliationWrittenOffEvent> {
  async handle(event: PurchaseReconciliationWrittenOffEvent): Promise<void> {
  const ts = await getTranslations('Common');
    const { reconciliationId, reconciliationNo, supplierId, totalWriteOffAmount, writeOffRecords } =
      event.payload;

    secureLog('info', ts('k_1ssb35o'), {
      reconciliationId,
      reconciliationNo,
      supplierId,
      totalWriteOffAmount,
      payableCount: writeOffRecords.length,
    });

    await transaction(async (conn) => {
      for (const record of writeOffRecords) {
        // SELECT ... FOR UPDATE 锁定应付单行，防止并发核销导致 paid_amount/balance 丢失更新
        const [payableRow]: DbRow[] = await conn.execute(
          `SELECT id, payable_no, amount, paid_amount, balance, status
           FROM fin_payable
           WHERE id = ?
           FOR UPDATE`,
          [record.payableId]
        );

        if (!payableRow || payableRow.length === 0) {
          secureLog('warn', ts('k_17zale7'), {
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
          secureLog('warn', ts('k_e5to9b'), {
            payableId: record.payableId,
            requestedAmount: writeOffAmount,
            currentBalance,
          });
          writeOffAmount = currentBalance;
        } else if (currentBalance <= 0) {
          secureLog('warn', ts('k_vygjfs'), {
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

        secureLog('info', ts('k_tfk91l'), {
          payableId: record.payableId,
          payableNo: payable.payable_no,
          writeOffAmount,
          newPaidAmount,
          newBalance,
          newStatus,
        });
      }
    });

    secureLog('info', ts('k_194qtwq'), {
      reconciliationId,
      reconciliationNo,
      processedCount: writeOffRecords.length,
    });
  }
}
