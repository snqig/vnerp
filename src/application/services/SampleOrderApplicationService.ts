import { ISampleOrderRepository } from '@/domain/sample/repositories/ISampleOrderRepository';
import { ISampleFeedbackRepository } from '@/domain/sample/repositories/ISampleFeedbackRepository';
import { SampleOrder } from '@/domain/sample/aggregates/SampleOrder';
import { SampleOrderProps } from '@/domain/sample/aggregates/SampleOrder';
import { SampleFeedback } from '@/domain/sample/entities/SampleFeedback';
import { SampleFeedbackProps } from '@/domain/sample/entities/SampleFeedback';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';

export class SampleOrderApplicationService {
  constructor(
    private readonly orderRepo: ISampleOrderRepository,
    private readonly feedbackRepo?: ISampleFeedbackRepository
  ) {}

  async getOrderById(id: number): Promise<SampleOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundError('打样单不存在');
    return order;
  }

  async listOrders(
    filters: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<{ list: SampleOrder[]; total: number }> {
    return this.orderRepo.findByFilters(filters as any, page, pageSize);
  }

  async createOrder(props: Partial<SampleOrderProps>): Promise<{ id: number; orderNo: string }> {
    const orderNo = await this.orderRepo.getNextSequence();
    const order = SampleOrder.create({ ...props, orderNo } as SampleOrderProps);
    const id = await this.orderRepo.save(order);
    if (id) {
      await this.persistEvents(id, order);
    }
    return { id, orderNo };
  }

  async updateOrder(id: number, props: Partial<SampleOrderProps>): Promise<void> {
    const order = await this.getOrderById(id);
    const updated = SampleOrder.reconstitute({ ...order.toProps(), ...props });
    await this.orderRepo.update(updated);
  }

  async deleteOrder(id: number): Promise<void> {
    await this.orderRepo.delete(id);
  }

  async submitOrder(id: number, userId: number): Promise<void> {
    const order = await this.getOrderById(id);
    order.submit(userId);
    await this.orderRepo.update(order);
    await this.persistEvents(id, order);
  }

  async startProduction(id: number, userId: number): Promise<void> {
    const order = await this.getOrderById(id);
    order.startProduction(userId);
    await this.orderRepo.update(order);
    await this.persistEvents(id, order);
  }

  async completeOrder(id: number, userId: number): Promise<void> {
    const order = await this.getOrderById(id);
    order.complete(userId);
    await this.orderRepo.update(order);
    await this.persistEvents(id, order);
  }

  async confirmOrder(id: number, userId: number): Promise<void> {
    const order = await this.getOrderById(id);
    order.confirm(userId);
    await this.orderRepo.update(order);
    await this.persistEvents(id, order);
  }

  async convertOrder(id: number, salesOrderId: number, userId: number): Promise<void> {
    const order = await this.getOrderById(id);
    order.convertToSalesOrder(salesOrderId, userId);
    await this.orderRepo.update(order);
    await this.persistEvents(id, order);
  }

  async cancelOrder(id: number, reason: string, userId: number): Promise<void> {
    const order = await this.getOrderById(id);
    order.cancel(reason, userId);
    await this.orderRepo.update(order);
    await this.persistEvents(id, order);
  }

  private async persistEvents(aggregateId: number, aggregate: any): Promise<void> {
    const events = aggregate.domainEvents || [];
    if (events.length === 0) return;
    await transaction(async (conn) => {
      const aggregateType = aggregate.constructor.name;
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
    });
    aggregate.clearDomainEvents();
  }

  async linkProcessCard(id: number, processCardId: number): Promise<void> {
    const order = await this.getOrderById(id);
    order.linkProcessCard(processCardId);
    await this.orderRepo.update(order);
  }

  async linkWorkOrder(id: number, workOrderId: number): Promise<void> {
    const order = await this.getOrderById(id);
    order.linkWorkOrder(workOrderId);
    await this.orderRepo.update(order);
  }

  async updateSampleFee(
    id: number,
    fee: number,
    charged: number,
    deductible: number
  ): Promise<void> {
    const order = await this.getOrderById(id);
    order.updateSampleFee(fee, charged, deductible);
    await this.orderRepo.update(order);
  }

  // ==================== 反馈管理 ====================

  async getFeedbacks(sampleOrderId: number): Promise<SampleFeedback[]> {
    if (!this.feedbackRepo) throw new DomainError('反馈仓储未启用');
    return this.feedbackRepo.findBySampleOrderId(sampleOrderId);
  }

  async addFeedback(props: SampleFeedbackProps): Promise<number> {
    if (!this.feedbackRepo) throw new DomainError('反馈仓储未启用');
    const feedback = SampleFeedback.create(props);
    const id = await this.feedbackRepo.save(feedback);
    return id;
  }

  async approveFeedback(id: number): Promise<void> {
    if (!this.feedbackRepo) throw new DomainError('反馈仓储未启用');
    const feedback = await this.feedbackRepo.findById(id);
    if (!feedback) throw new NotFoundError('反馈不存在');
    feedback.approve();
    await this.feedbackRepo.update(feedback);
  }

  async rejectFeedback(id: number): Promise<void> {
    if (!this.feedbackRepo) throw new DomainError('反馈仓储未启用');
    const feedback = await this.feedbackRepo.findById(id);
    if (!feedback) throw new NotFoundError('反馈不存在');
    feedback.reject();
    await this.feedbackRepo.update(feedback);
  }
}
