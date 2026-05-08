import { IInboundOrderRepository } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { InboundOrder, InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import { DomainError, NotFoundError, VersionConflictError, InvalidTransitionError } from '@/domain/shared/DomainTypes';
import { EventBus } from '@/infrastructure/event-bus/EventBus';
import { query } from '@/lib/db';

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

    const events = order.getDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    order.clearDomainEvents();

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

    const updated = await this.orderRepo.updateStatus(id, 'completed', previousStatus);
    if (!updated) {
      const currentOrder = await this.orderRepo.findById(id);
      if (!currentOrder) throw new NotFoundError('入库单不存在');
      throw new VersionConflictError();
    }

    await this.orderRepo.updateInspectionAndFinance(id, 3, true);

    const events = order.getDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    order.clearDomainEvents();

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

    const events = order.getDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    order.clearDomainEvents();

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

    const events = order.getDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    order.clearDomainEvents();

    return { id, status: 'cancelled' };
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrderById(id);

    if (!order.canDelete()) {
      throw new DomainError('当前状态的入库单不能删除');
    }

    await this.orderRepo.softDelete(id);
  }
}
