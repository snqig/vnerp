import { IPurchaseOrderRepository } from '@/domain/purchase/repositories/IPurchaseOrderRepository';
import { PurchaseOrder, PurchaseOrderProps } from '@/domain/purchase/aggregates/PurchaseOrder';
import { PurchaseOrderStatus } from '@/domain/purchase/value-objects/PurchaseOrderStatus';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';

export class PurchaseApplicationService {
  constructor(
    private readonly orderRepo: IPurchaseOrderRepository
  ) {}

  async getOrderById(id: number): Promise<PurchaseOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError('采购单不存在');
    }
    return order;
  }

  async listOrders(
    status: string,
    page: number,
    pageSize: number,
    filters?: { keyword?: string; supplierId?: number; startDate?: string; endDate?: string }
  ) {
    return this.orderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createOrder(props: PurchaseOrderProps): Promise<{ id: number; orderNo: string }> {
    const order = PurchaseOrder.create(props);
    const result = await this.orderRepo.save(order);

    if (result.id) {
      await this.persistAndPublishEvents(result.id, order);
    }

    return result;
  }

  async submitOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.submit();

    const updated = await this.orderRepo.updateStatus(id, 'submitted', previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);

    return { id, status: 'submitted' };
  }

  async approveOrder(id: number, auditBy: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.approve(auditBy);

    await transaction(async (conn) => {
      const [result]: any = await conn.execute(
        'UPDATE pur_purchase_order SET status = ?, audit_by = ?, audit_time = NOW(), update_time = NOW() WHERE id = ? AND status = ?',
        [order.status.toDbCode(), auditBy, id, PurchaseOrderStatus.from(previousStatus).toDbCode()]
      );
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      const events = order.getDomainEvents();
      await getDomainEventOutbox().saveEvents(conn, 'PurchaseOrder', id, events);
    });

    order.clearDomainEvents();

    return { id, status: 'approved' };
  }

  async receiveGoods(
    id: number,
    lineReceives: Array<{ lineNo: number; quantity: number; batchNo: string; warehouseId: number }>
  ): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.receive(lineReceives);

    await transaction(async (conn) => {
      const [result]: any = await conn.execute(
        'UPDATE pur_purchase_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
        [order.status.toDbCode(), id, PurchaseOrderStatus.from(previousStatus).toDbCode()]
      );
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      for (const line of order.lines) {
        await conn.execute(
          'UPDATE pur_purchase_order_line SET received_qty = ?, update_time = NOW() WHERE po_id = ? AND line_no = ?',
          [line.receivedQty, id, line.lineNo]
        );
      }

      const events = order.getDomainEvents();
      await getDomainEventOutbox().saveEvents(conn, 'PurchaseOrder', id, events);
    });

    order.clearDomainEvents();

    return { id, status: order.status.value };
  }

  async closeOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.close();

    const updated = await this.orderRepo.updateStatus(id, 'closed', previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);

    return { id, status: 'closed' };
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrderById(id);

    if (!order.canDelete()) {
      throw new DomainError('当前状态的采购单不能删除');
    }

    await this.orderRepo.softDelete(id);
  }

  private async persistAndPublishEvents(aggregateId: number, order: PurchaseOrder): Promise<void> {
    const events = order.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'PurchaseOrder', aggregateId, events);
    });

    order.clearDomainEvents();
  }
}
