import { IPurchaseReturnRepository } from '@/domain/purchase/repositories/IPurchaseReturnRepository';
import {
  PurchaseReturn,
  PurchaseReturnProps,
  OutboundResult,
  PayableRefundResult,
} from '@/domain/purchase/aggregates/PurchaseReturn';
import { MysqlPurchaseReturnRepository } from '@/infrastructure/repositories/MysqlPurchaseReturnRepository';
import { DomainError, DomainEvent, NotFoundError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { query, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

export class PurchaseReturnApplicationService {
  constructor(private readonly returnRepo: IPurchaseReturnRepository) {}

  static create(): PurchaseReturnApplicationService {
    return new PurchaseReturnApplicationService(new MysqlPurchaseReturnRepository());
  }

  async getReturnById(id: number): Promise<PurchaseReturn> {
    const ret = await this.returnRepo.findById(id);
    if (!ret) throw new NotFoundError('采购退货单不存在');
    return ret;
  }

  async createReturn(props: PurchaseReturnProps): Promise<{ id: number; returnNo: string }> {
    const ret = PurchaseReturn.create(props);
    const result = await this.returnRepo.save(ret);
    await this.persistAndPublishEvents('PurchaseReturn', result.id, ret);
    return { id: result.id, returnNo: result.returnNo };
  }

  async approveReturn(id: number, approveBy: number): Promise<{ status: number }> {
    const ret = await this.getReturnById(id);

    // T104: 审核前校验退货数量不得超过累计已入库量（扣减已退数量）
    await this.validateReturnQuantitiesAgainstReceived(ret);

    ret.approve(approveBy);

    await this.returnRepo.updateApproveInfo(id, ret.approveBy!, ret.approveTime!);
    await this.persistAndPublishEvents('PurchaseReturn', id, ret);
    return { status: ret.status.value };
  }

  /**
   * 从 pur_purchase_order_line 拉取 received_qty / returned_qty 聚合数据，
   * 调用聚合根的领域校验方法 validateAgainstReceivedQuantities。
   *
   * 数据获取在应用层，规则判定在领域层，保持 DDD 分层规范。
   */
  private async validateReturnQuantitiesAgainstReceived(ret: PurchaseReturn): Promise<void> {
    interface LineQtyRow {
      material_id: number;
      received_qty: number | string;
      returned_qty: number | string;
    }
    const rows = await query<LineQtyRow>(
      'SELECT material_id, received_qty, returned_qty FROM pur_purchase_order_line WHERE po_id = ?',
      [ret.orderId]
    );

    if (!rows || rows.length === 0) {
      // 采购单无明细行：所有退货均不合法
      const receivedMap = new Map<number, number>();
      const returnedMap = new Map<number, number>();
      ret.validateAgainstReceivedQuantities(receivedMap, returnedMap);
      return;
    }

    const receivedMap = new Map<number, number>();
    const returnedMap = new Map<number, number>();
    for (const row of rows) {
      const mid = Number(row.material_id);
      // 同一物料在多行的情况：累加 received/returned
      receivedMap.set(mid, (receivedMap.get(mid) ?? 0) + Number(row.received_qty || 0));
      returnedMap.set(mid, (returnedMap.get(mid) ?? 0) + Number(row.returned_qty || 0));
    }
    ret.validateAgainstReceivedQuantities(receivedMap, returnedMap);
  }

  async completeReturn(
    id: number,
    completeBy: number
  ): Promise<{
    status: number;
    outboundOrderId: number;
    outboundOrderNo: string;
    payableId: number;
    payableNo: string;
  }> {
    const ret = await this.getReturnById(id);

    const orderNo = ret.returnNo;
    const totalQty = ret.lines.reduce((sum, l) => sum + l.quantity, 0);

    // 在事务中预创建出库单与红字应付单，再调用聚合 complete() 完成状态流转
    await transaction(async (conn) => {
      // 1. 创建退货出库单（inv_outbound_order）
      const outboundOrderNo = await generateDocumentNo('outbound');
      const [obResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO inv_outbound_order
         (order_no, order_date, outbound_type, warehouse_id, total_qty, total_amount,
          status, audit_status, finance_posted, operator_id, remark, create_time)
         VALUES (?, ?, 'return', ?, ?, ?, 'pending', 0, 0, ?, ?, NOW())`,
        [
          outboundOrderNo,
          ret.returnDate,
          ret.warehouseId,
          totalQty,
          ret.totalAmount,
          completeBy,
          `采购退货出库：${orderNo}`,
        ]
      );
      const outboundOrderId = obResult.insertId;

      // 2. 创建红字应付单（fin_payable，负数金额代表供应商应退）
      const payableNo = await generateDocumentNo('payable');
      const refundAmount = ret.totalAmount;
      const [payResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO fin_payable
         (payable_no, source_type, source_id, source_no, supplier_id,
          amount, paid_amount, balance, due_date, status, remark)
         VALUES (?, 'purchase_return', ?, ?, ?, ?, 0, ?, NULL, 1, ?)`,
        [
          payableNo,
          id,
          orderNo,
          ret.supplierId,
          -refundAmount,
          -refundAmount,
          `采购退货红字应付：${orderNo}`,
        ]
      );
      const payableId = payResult.insertId;

      // 3. 调用聚合 complete()：校验状态流转并记录出库单/应付单引用（同步回调返回预创建的 ID）
      ret.complete(
        completeBy,
        (): OutboundResult => ({ outboundOrderId, outboundOrderNo }),
        (): PayableRefundResult => ({ payableId, payableNo })
      );

      // 4. 更新退货单主表完成信息
      await conn.execute(
        `UPDATE pur_purchase_return
         SET status = 3, complete_by = ?, complete_time = ?,
             outbound_order_id = ?, outbound_order_no = ?,
             payable_id = ?, payable_no = ?, update_time = NOW()
         WHERE id = ?`,
        [
          ret.completeBy ?? null,
          ret.completeTime ?? null,
          outboundOrderId,
          outboundOrderNo,
          payableId,
          payableNo,
          id,
        ]
      );

      // 5. 持久化领域事件
      const events = ret.getDomainEvents();
      if (events.length > 0) {
        await getDomainEventOutbox().saveEvents(conn, 'PurchaseReturn', id, events);
      }
    });

    ret.clearDomainEvents();
    return {
      status: ret.status.value,
      outboundOrderId: ret.outboundOrderId!,
      outboundOrderNo: ret.outboundOrderNo!,
      payableId: ret.payableId!,
      payableNo: ret.payableNo!,
    };
  }

  async cancelReturn(id: number, reason?: string): Promise<{ status: number }> {
    const ret = await this.getReturnById(id);
    ret.cancel(reason);

    await this.returnRepo.updateStatus(id, ret.status.value);
    await this.persistAndPublishEvents('PurchaseReturn', id, ret);
    return { status: ret.status.value };
  }

  async deleteReturn(id: number): Promise<void> {
    const ret = await this.getReturnById(id);
    if (!ret.canDelete()) {
      throw new DomainError('仅待审核状态的退货单可删除');
    }
    await this.returnRepo.softDelete(id);
  }

  private async persistAndPublishEvents(
    aggregateType: string,
    aggregateId: number,
    aggregate: { getDomainEvents(): DomainEvent[]; clearDomainEvents(): void }
  ): Promise<void> {
    const events = aggregate.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
    });

    aggregate.clearDomainEvents();
  }
}
