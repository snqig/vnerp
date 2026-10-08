import { query, transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';
import type { DbResult } from '@/types/db';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

/**
 * 打样费抵扣核销 Handler
 *
 * 打样单转大货（SampleOrderConverted）且 fee_deducted=1 时，
 * 生成一张负额应收（红字冲抵单，source_type=2）挂到销售订单上，
 * 使「打样费抵扣大货」在 fin_receivable 中可见、可参与客户余额净额计算。
 *
 * 幂等：source_no = 打样单号 + source_type=2 唯一检查；外层另有 IdempotentHandler 包装。
 */
export class SampleFeeDeductionHandler {
  async handle(event: DomainEvent): Promise<void> {
    if (event.eventType !== 'SampleOrderConverted') return;

    const { sampleOrderId, salesOrderId } = event.payload as {
      sampleOrderId: number;
      salesOrderId: number;
    };
    const ctx = { module: 'sample-fee-deduction', action: 'writeoff', sampleOrderId, salesOrderId };

    // 1. 读取打样单费用信息（转大货事务已提交，fee_deducted 已落库）
    const rows = await query<{
      order_no: string;
      customer_id: number | null;
      customer_name: string | null;
      sample_fee: string | number;
      fee_deducted: number;
    }>(
      `SELECT order_no, customer_id, customer_name, sample_fee, fee_deducted
         FROM sal_sample_order WHERE id = ? AND deleted = 0 LIMIT 1`,
      [sampleOrderId]
    );
    const order = rows[0];
    if (!order) {
      logger.warn(ctx, 'Sample order not found, skip fee deduction', { sampleOrderId });
      return;
    }

    const sampleFee = Number(order.sample_fee || 0);
    if (order.fee_deducted !== 1 || sampleFee <= 0) {
      logger.info(ctx, 'Fee not deducted or zero amount, skip write-off', {
        feeDeducted: order.fee_deducted,
        sampleFee,
      });
      return;
    }

    let created = false;
    try {
      await transaction(async (conn) => {
        // 2. 幂等检查：同打样单号只生成一张冲抵单
        const [existing] = (await conn.execute(
          'SELECT id FROM fin_receivable WHERE source_no = ? AND source_type = 2 AND deleted = 0 LIMIT 1',
          [order.order_no]
        )) as DbResult;
        if (existing && existing.length > 0) {
          logger.info(ctx, 'Deduction receivable already exists, skip', {
            receivableId: (existing[0] as { id: number }).id,
          });
          return;
        }

        // 3. 插入负额应收（红字冲抵）
        const receivableNo = 'AROFF' + Date.now();
        const amount = -sampleFee;
        await conn.execute(
          `INSERT INTO fin_receivable
           (receivable_no, source_type, source_no, source_id, customer_id, customer_name,
            order_id, order_type, amount, received_amount, balance, status, due_date, remark, create_time)
           VALUES (?, 2, ?, ?, ?, ?, ?, 'sales', ?, 0, ?, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
          [
            receivableNo,
            order.order_no,
            sampleOrderId,
            order.customer_id,
            order.customer_name,
            salesOrderId,
            amount,
            amount,
            `打样单 ${order.order_no} 打样费抵扣大货订单`,
          ]
        );
        created = true;
        logger.info(ctx, 'Sample fee deduction receivable created', { receivableNo, amount, salesOrderId });
      });

      if (created) {
        secureLog('info', 'Sample fee deduction receivable created', {
          sampleOrderId,
          salesOrderId,
          amount: -sampleFee,
        });
      }
    } catch (err) {
      logger.error(ctx, 'Sample fee write-off failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}
