import { ITransferOrderRepository } from '@/domain/warehouse/repositories/ITransferOrderRepository';
import { TransferOrder, TransferOrderProps } from '@/domain/warehouse/aggregates/TransferOrder';
import {
  DomainError,
  NotFoundError,
  VersionConflictError,
} from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';

export class TransferApplicationService {
  constructor(
    private readonly orderRepo: ITransferOrderRepository
  ) {}

  async getOrderById(id: number): Promise<TransferOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError('调拨单不存在');
    }
    return order;
  }

  async listOrders(
    status: number,
    page: number,
    pageSize: number,
    filters?: {
      keyword?: string;
      fromWarehouseId?: number;
      toWarehouseId?: number;
      transferType?: number;
      startDate?: string;
      endDate?: string;
    }
  ) {
    return this.orderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createOrder(props: TransferOrderProps): Promise<{ id: number; transferNo: string }> {
    const order = TransferOrder.create(props);
    const result = await this.orderRepo.save(order);
    return result;
  }

  async submitOrder(id: number): Promise<{ id: number; status: number }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.submit();

    const updated = await this.orderRepo.updateStatus(id, 1, previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);
    return { id, status: 1 };
  }

  async approveOrder(
    id: number,
    approverId?: number,
    approverName?: string
  ): Promise<{ id: number; status: number }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.approve(approverId, approverName);

    const updated = await this.orderRepo.updateStatus(id, 2, previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    if (approverId && approverName) {
      await this.orderRepo.updateApprover(id, approverId, approverName);
    }

    await this.persistAndPublishEvents(id, order);
    return { id, status: 2 };
  }

  async shipOutOrder(
    id: number,
    operatorId?: number,
    operatorName?: string
  ): Promise<{ id: number; status: number }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.shipOut(operatorId, operatorName);

    const updated = await this.orderRepo.updateStatus(id, 2, previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.orderRepo.updateOutTime(id, order.outTime);
    await this.persistAndPublishEvents(id, order);
    return { id, status: 2 };
  }

  async receiveInOrder(
    id: number,
    operatorId?: number,
    operatorName?: string
  ): Promise<{ id: number; status: number }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.receiveIn(operatorId, operatorName);

    const updated = await this.orderRepo.updateStatus(id, 3, previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.orderRepo.updateInTime(id, order.inTime);
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

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrderById(id);
    if (!order.canDelete()) {
      throw new DomainError('当前状态的调拨单不能删除');
    }
    await this.orderRepo.softDelete(id);
  }

  private async persistAndPublishEvents(
    aggregateId: number,
    order: TransferOrder
  ): Promise<void> {
    const events = order.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'TransferOrder', aggregateId, events);
    });

    order.clearDomainEvents();
  }
}
