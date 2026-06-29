import { IInboundOrderRepository } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { InboundOrder, InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import {
  DomainError,
  NotFoundError,
  VersionConflictError,
  InvalidTransitionError,
} from '@/domain/shared/DomainTypes';
import { EventBus } from '@/infrastructure/event-bus/EventBus';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { query, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class InboundApplicationService {
  constructor(
    private readonly orderRepo: IInboundOrderRepository,
    private readonly eventBus: EventBus
  ) {}

  async getOrderById(id: number): Promise<InboundOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError('入库单不存在');
    }
    return order;
  }

  async listOrders(
    status: string,
    page: number,
    pageSize: number,
    filters?: { keyword?: string; startDate?: string; endDate?: string }
  ) {
    return this.orderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createOrder(props: InboundOrderProps): Promise<{ id: number; orderNo: string }> {
    const order = InboundOrder.create(props);
    const result = await this.orderRepo.save(order);

    if (order.id) {
      await this.persistAndPublishEvents(order.id, order);
    }

    return result;
  }

  async approveOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const warehouseRows: any = await query(
      'SELECT warehouse_name FROM inv_warehouse WHERE id = ?',
      [order.warehouseId]
    );
    const warehouseName = warehouseRows?.[0]?.warehouse_name || '';

    const previousStatus = order.status.value;
    order.approve(warehouseName);

    await transaction(async (conn) => {
      const [result]: any = await conn.execute(
        "UPDATE inv_inbound_order SET status = 'approved', update_time = NOW() WHERE id = ? AND status = ?",
        [id, previousStatus === 'completed' ? 'approved' : previousStatus]
      );
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      await conn.execute(
        "UPDATE inv_inbound_order SET qc_status = 'pass', update_time = NOW() WHERE id = ?",
        [id]
      );

      const events = order.getDomainEvents();
      await getDomainEventOutbox().saveEvents(conn, 'InboundOrder', id, events);
    });

    order.clearDomainEvents();
    this.publishOutboxEventsAsync(id);

    return { id, status: 'completed' };
  }

  async submitOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.submit();

    const updated = await this.orderRepo.updateStatus(id, 'pending', previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);

    return { id, status: 'pending' };
  }

  async cancelOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.cancel();

    const updated = await this.orderRepo.updateStatus(id, 'cancelled', previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);

    return { id, status: 'cancelled' };
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrderById(id);

    if (!order.canDelete()) {
      throw new DomainError('当前状态的入库单不能删除');
    }

    await this.orderRepo.softDelete(id);
  }

  async unapproveOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.unapprove();

    const updated = await this.orderRepo.updateStatus(id, 'pending', previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);

    return { id, status: 'pending' };
  }

  private async persistAndPublishEvents(aggregateId: number, order: InboundOrder): Promise<void> {
    const events = order.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'InboundOrder', aggregateId, events);
    });

    order.clearDomainEvents();
    this.publishOutboxEventsAsync(aggregateId);
  }

  private publishOutboxEventsAsync(aggregateId: number): void {
    setImmediate(async () => {
      try {
        const pendingEvents = await getDomainEventOutbox().fetchPendingEvents();
        for (const eventRow of pendingEvents) {
          if (eventRow.aggregateId !== aggregateId && eventRow.aggregateType !== 'InboundOrder')
            continue;
          try {
            const event = JSON.parse(eventRow.payload);
            const domainEvent = { ...event, occurredAt: new Date(event.occurredAt) };
            await this.eventBus.publish(domainEvent);
            await getDomainEventOutbox().markAsProcessed(eventRow.id);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            secureLog('error', 'Outbox event publish failed', {
              eventId: eventRow.id,
              eventType: eventRow.eventType,
              error: errorMessage,
            });
            await getDomainEventOutbox().markAsFailed(eventRow.id, errorMessage);
          }
        }
      } catch (error) {
        secureLog('error', 'Outbox processing failed', { aggregateId, error: String(error) });
      }
    });
  }
}
