import { IStocktakingOrderRepository } from '@/domain/warehouse/repositories/IStocktakingOrderRepository';
import { StocktakingOrder, StocktakingOrderProps } from '@/domain/warehouse/aggregates/StocktakingOrder';
import {
  DomainError,
  NotFoundError,
  VersionConflictError,
} from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';

export class StocktakingApplicationService {
  constructor(
    private readonly orderRepo: IStocktakingOrderRepository
  ) {}

  async getOrderById(id: number): Promise<StocktakingOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError('盘点单不存在');
    }
    return order;
  }

  async listOrders(
    status: number,
    page: number,
    pageSize: number,
    filters?: {
      keyword?: string;
      warehouseId?: number;
      stocktakingType?: number;
      startDate?: string;
      endDate?: string;
    }
  ) {
    return this.orderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createOrder(props: StocktakingOrderProps): Promise<{ id: number; checkNo: string }> {
    const order = StocktakingOrder.create(props);
    const result = await this.orderRepo.save(order);
    return result;
  }

  async startOrder(id: number): Promise<{ id: number; status: number }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.start();

    const updated = await this.orderRepo.updateStatus(id, 1, previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);
    return { id, status: 1 };
  }

  async submitForApproval(id: number): Promise<{ id: number; status: number }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.submitForApproval();

    const updated = await this.orderRepo.updateStatus(id, 2, previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.orderRepo.updateDiffSummary(id, order.diffItems, order.totalDiffAmount);
    await this.persistAndPublishEvents(id, order);
    return { id, status: 2 };
  }

  async approveOrder(
    id: number,
    approverId?: number,
    approverName?: string,
    approveRemark?: string
  ): Promise<{ id: number; status: number }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.approve(approverId, approverName, approveRemark);

    const updated = await this.orderRepo.updateStatus(id, 3, previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    if (approverId && approverName) {
      await this.orderRepo.updateApprover(
        id,
        approverId,
        approverName,
        order.approveTime,
        order.approveRemark
      );
    }

    await this.persistAndPublishEvents(id, order);
    return { id, status: 3 };
  }

  async cancelOrder(id: number, reason?: string): Promise<{ id: number; status: number }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.cancel(reason || '');

    const updated = await this.orderRepo.updateStatus(id, 4, previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);
    return { id, status: 4 };
  }

  async recordActualQty(
    orderId: number,
    itemId: number,
    actualQty: number,
    scanOperator?: string
  ): Promise<void> {
    const order = await this.getOrderById(orderId);
    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundError('盘点项不存在');
    }

    item.recordActualQty(actualQty, scanOperator);

    await this.orderRepo.updateItemActualQty(
      itemId,
      actualQty,
      item.diffQty,
      item.diffAmount,
      scanOperator
    );
  }

  async processDiff(orderId: number, itemId: number): Promise<void> {
    const order = await this.getOrderById(orderId);
    order.processDiff(itemId);
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrderById(id);
    if (!order.canDelete()) {
      throw new DomainError('当前状态的盘点单不能删除');
    }
    await this.orderRepo.softDelete(id);
  }

  private async persistAndPublishEvents(
    aggregateId: number,
    order: StocktakingOrder
  ): Promise<void> {
    const events = order.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'StocktakingOrder', aggregateId, events);
    });

    order.clearDomainEvents();
  }
}
