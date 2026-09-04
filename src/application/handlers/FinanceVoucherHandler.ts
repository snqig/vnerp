import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { DbResult } from '@/types/db';

type FinanceEvent = InboundOrderApprovedEvent | WorkOrderCompletedEvent;

export class FinanceVoucherHandler implements EventHandler<FinanceEvent> {
  async handle(event: FinanceEvent): Promise<void> {
    let inboundNo: string | undefined;
    let totalAmount = 0;
    let supplierId: number | undefined;
    let sourceType = 1;
    let remark = '';

    if (event.eventType === 'inbound.approved') {
      const payload = (event as InboundOrderApprovedEvent).payload;
      inboundNo = payload.inboundNo;
      totalAmount = payload.totalAmount;
      supplierId = payload.supplierId;
      sourceType = 1;
      remark = `采购入库单 ${inboundNo} 自动生成`;
    } else if (event.eventType === 'workorder.completed') {
      const payload = (event as WorkOrderCompletedEvent).payload;
      inboundNo = payload.workOrderNo;
      totalAmount = 0;
      supplierId = undefined;
      sourceType = 2;
      remark = `生产工单 ${inboundNo} 完工`;
    }

    if (!inboundNo) return;

    if (event.eventType === 'workorder.completed') {
      const payload = (event as WorkOrderCompletedEvent).payload;
      const [workOrderItems] = (await conn.execute(
        'SELECT SUM(total_price) as total_cost FROM prod_work_order_item WHERE work_order_id = ?',
        [payload.workOrderId]
      )) as DbResult;
      totalAmount = Number((workOrderItems[0] as any)?.total_cost || 0);
    }

    if (totalAmount <= 0) {
      secureLog('info', 'Skip finance voucher for zero amount', {
        inboundNo,
        sourceType,
        totalAmount,
      });
      return;
    }

    if (event.eventType === 'workorder.completed') {
      const payload = (event as WorkOrderCompletedEvent).payload;
      const [workOrderItems] = (await conn.execute(
        'SELECT SUM(total_price) as total_cost FROM prod_work_order_item WHERE work_order_id = ?',
        [payload.workOrderId]
      )) as DbResult;
      totalAmount = Number((workOrderItems[0] as any)?.total_cost || 0);
    }

    if (totalAmount <= 0) {
      secureLog('info', 'Skip finance voucher for zero amount', {
        inboundNo,
        sourceType,
        totalAmount,
      });
      return;
    }

    let created = false;
    await transaction(async (conn) => {
      // 幂等校验：同一 source_no 仅生成一条应付单，避免重复审核导致重复记账（T301）
      const [existing] = (await conn.execute(
        'SELECT id FROM fin_payable WHERE source_no = ? AND deleted = 0 LIMIT 1',
        [inboundNo]
      )) as DbResult;
      if (existing && existing.length > 0) {
        secureLog('info', 'Payable already exists for source, skip', {
          inboundNo,
          sourceType,
          existingId: existing[0].id,
        });
        return;
      }

      const payableNo = 'AP' + Date.now();
      await conn.execute(
        `INSERT INTO fin_payable
         (payable_no, supplier_id, source_type, source_no, amount, paid_amount, balance, status, due_date, remark, create_time)
         VALUES (?, ?, ?, ?, ?, 0, ?, 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, NOW())`,
        [payableNo, supplierId || null, sourceType, inboundNo, totalAmount, totalAmount, remark]
      );
      created = true;
    });

    if (created) {
      secureLog('info', 'Payable created', {
        inboundNo,
        totalAmount,
        supplierId,
        sourceType,
      });
    }
  }
}
