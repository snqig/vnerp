import { ISalesOrderRepository } from '@/domain/sales/repositories/ISalesOrderRepository';
import { SalesOrder, SalesOrderProps } from '@/domain/sales/aggregates/SalesOrder';
import { SalesOrderStatus } from '@/domain/sales/value-objects/SalesOrderStatus';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { EventBus } from '@/infrastructure/event-bus/EventBus';
import { DomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutbox';
import { transaction, query } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { InventoryValidationService } from '@/application/services/InventoryValidationService';

export class SalesApplicationService {
  constructor(
    private readonly orderRepo: ISalesOrderRepository,
    private readonly eventBus: EventBus
  ) {}

  async getOrderById(id: number): Promise<SalesOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundError('销售单不存在');
    return order;
  }

  async listOrders(
    status: string, page: number, pageSize: number,
    filters?: { keyword?: string; customerId?: number; startDate?: string; endDate?: string }
  ) {
    return this.orderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createOrder(props: SalesOrderProps): Promise<{ id: number; orderNo: string }> {
    const order = SalesOrder.create(props);
    const result = await this.orderRepo.save(order);
    if (result.id) await this.persistAndPublishEvents(result.id, order);
    return result;
  }

  async submitOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.submit();
    const updated = await this.orderRepo.updateStatus(id, 'submitted', previousStatus);
    if (!updated) throw new VersionConflictError();
    await this.persistAndPublishEvents(id, order);
    return { id, status: 'submitted' };
  }

  async approveOrder(id: number, auditBy: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.approve(auditBy);

    await transaction(async (conn) => {
      const [result]: any = await conn.execute(
        'UPDATE sal_order SET status = ?, audit_by = ?, audit_time = NOW(), update_time = NOW() WHERE id = ? AND status = ?',
        [order.status.toDbCode(), auditBy, id, SalesOrderStatus.from(previousStatus).toDbCode()]
      );
      if (result.affectedRows === 0) throw new VersionConflictError();
      await DomainEventOutbox.saveEvents(conn, 'SalesOrder', id, order.getDomainEvents());
    });

    order.clearDomainEvents();
    this.publishOutboxEventsAsync(id);
    return { id, status: 'approved' };
  }

  async shipGoods(
    id: number,
    lineShipments: Array<{ lineNo: number; quantity: number; batchNo: string; warehouseId: number }>
  ): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    for (const shipment of lineShipments) {
      const line = order.lines.find(l => l.lineNo === shipment.lineNo);
      if (!line) throw new DomainError(`行号${shipment.lineNo}不存在`);
      const check = await InventoryValidationService.checkStock(
        line.materialId, shipment.warehouseId, shipment.quantity
      );
      if (!check.sufficient) throw new DomainError(check.message || '库存不足');
    }

    const previousStatus = order.status.value;
    order.ship(lineShipments);

    await transaction(async (conn) => {
      const currentDbStatus = SalesOrderStatus.from(previousStatus).toDbCode();
      const [result]: any = await conn.execute(
        'UPDATE sal_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
        [order.status.toDbCode(), id, currentDbStatus]
      );
      if (result.affectedRows === 0) throw new VersionConflictError();

      for (const line of order.lines) {
        if (line.id) {
          await conn.execute(
            'UPDATE sal_order_detail SET shipped_qty = ? WHERE order_id = ? AND id = ?',
            [line.shippedQty, id, line.id]
          );
        }
      }

      await DomainEventOutbox.saveEvents(conn, 'SalesOrder', id, order.getDomainEvents());
    });

    order.clearDomainEvents();
    this.publishOutboxEventsAsync(id);
    return { id, status: order.status.value };
  }

  async closeOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.close();
    const updated = await this.orderRepo.updateStatus(id, 'closed', previousStatus);
    if (!updated) throw new VersionConflictError();
    await this.persistAndPublishEvents(id, order);
    return { id, status: 'closed' };
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrderById(id);
    if (!order.canDelete()) throw new DomainError('当前状态的销售单不能删除');
    await this.orderRepo.softDelete(id);
  }

  private async persistAndPublishEvents(aggregateId: number, order: SalesOrder): Promise<void> {
    const events = order.getDomainEvents();
    if (events.length === 0) return;
    await transaction(async (conn) => {
      await DomainEventOutbox.saveEvents(conn, 'SalesOrder', aggregateId, events);
    });
    order.clearDomainEvents();
    this.publishOutboxEventsAsync(aggregateId);
  }

  private publishOutboxEventsAsync(aggregateId: number): void {
    setImmediate(async () => {
      try {
        const pendingEvents = await DomainEventOutbox.fetchPendingEvents();
        for (const eventRow of pendingEvents) {
          if (eventRow.aggregate_id !== aggregateId && eventRow.aggregate_type !== 'SalesOrder') continue;
          try {
            const event = JSON.parse(eventRow.payload);
            await this.eventBus.publish({ ...event, occurredAt: new Date(event.occurredAt) });
            await DomainEventOutbox.markAsProcessed(eventRow.id);
          } catch (error: any) {
            secureLog('error', 'Outbox event publish failed', { eventId: eventRow.id, error: error.message });
            await DomainEventOutbox.markAsFailed(eventRow.id, error.message);
          }
        }
      } catch (error) {
        secureLog('error', 'Outbox processing failed', { aggregateId, error: String(error) });
      }
    });
  }
}
