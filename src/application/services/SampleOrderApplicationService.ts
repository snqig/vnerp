import { ISampleOrderRepository } from '@/domain/sample/repositories/ISampleOrderRepository';
import { ISampleFeedbackRepository } from '@/domain/sample/repositories/ISampleFeedbackRepository';
import { SampleOrder } from '@/domain/sample/aggregates/SampleOrder';
import { SampleOrderProps } from '@/domain/sample/aggregates/SampleOrder';
import { SampleFeedback } from '@/domain/sample/entities/SampleFeedback';
import { SampleFeedbackProps } from '@/domain/sample/entities/SampleFeedback';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';
import { logger, generateTraceId } from '@/lib/logger';

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
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'listOrders', traceId };
    logger.stepStart(ctx, '列表查询', { filters, page, pageSize });
    const result = await this.orderRepo.findByFilters(filters as any, page, pageSize);
    logger.stepEnd(ctx, '列表查询', { total: result.total, count: result.list.length });
    return result;
  }

  async createOrder(props: Partial<SampleOrderProps>): Promise<{ id: number; orderNo: string }> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'createOrder', traceId };
    logger.stepStart(ctx, '创建打样单', {
      customerName: props.customerName,
      productName: props.productName,
      materialNo: props.materialNo,
    });

    const orderNo = await this.orderRepo.getNextSequence();
    logger.info(ctx, '生成打样单号', { orderNo });

    const order = SampleOrder.create({ ...props, orderNo } as SampleOrderProps);
    const id = await this.orderRepo.save(order);
    logger.info(ctx, '打样单已保存', { id, orderNo });

    if (id) {
      await this.persistEvents(id, order, ctx);
    }
    logger.stepEnd(ctx, '创建打样单', { id, orderNo });
    return { id, orderNo };
  }

  async updateOrder(id: number, props: Partial<SampleOrderProps>): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'updateOrder', traceId };
    logger.stepStart(ctx, '更新打样单', { id, fields: Object.keys(props) });

    const order = await this.getOrderById(id);
    logger.info(ctx, '更新前状态', {
      id,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
    });

    const updated = SampleOrder.reconstitute({ ...order.toProps(), ...props });
    await this.orderRepo.update(updated);
    logger.info(ctx, '更新后状态', {
      id,
      status: updated.status,
      deliveryStatus: updated.deliveryStatus,
    });
    logger.stepEnd(ctx, '更新打样单', { id });
  }

  async deleteOrder(id: number): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'deleteOrder', traceId };
    logger.stepStart(ctx, '删除打样单', { id });
    await this.orderRepo.delete(id);
    logger.stepEnd(ctx, '删除打样单', { id });
  }

  async submitOrder(id: number, userId: number): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'submitOrder', traceId, userId };
    logger.stepStart(ctx, '提交打样单', { id, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, '状态流转前', { id, status: order.status });
    order.submit(userId);
    logger.info(ctx, '状态流转后', {
      id,
      status: order.status,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await this.orderRepo.update(order);
    await this.persistEvents(id, order, ctx);
    logger.stepEnd(ctx, '提交打样单', { id });
  }

  async startProduction(id: number, userId: number): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'startProduction', traceId, userId };
    logger.stepStart(ctx, '开始打样生产', { id, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, '状态流转前', { id, status: order.status });
    order.startProduction(userId);
    logger.info(ctx, '状态流转后', {
      id,
      status: order.status,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await this.orderRepo.update(order);
    await this.persistEvents(id, order, ctx);
    logger.stepEnd(ctx, '开始打样生产', { id });
  }

  async completeOrder(id: number, userId: number): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'completeOrder', traceId, userId };
    logger.stepStart(ctx, '完成打样', { id, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, '状态流转前', { id, status: order.status });
    order.complete(userId);
    logger.info(ctx, '状态流转后', {
      id,
      status: order.status,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await this.orderRepo.update(order);
    await this.persistEvents(id, order, ctx);
    logger.stepEnd(ctx, '完成打样', { id });
  }

  async confirmOrder(id: number, userId: number): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'confirmOrder', traceId, userId };
    logger.stepStart(ctx, '确认打样', { id, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, '状态流转前', { id, status: order.status });
    order.confirm(userId);
    logger.info(ctx, '状态流转后', {
      id,
      status: order.status,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await this.orderRepo.update(order);
    await this.persistEvents(id, order, ctx);
    logger.stepEnd(ctx, '确认打样', { id });
  }

  async convertOrder(id: number, salesOrderId: number, userId: number): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'convertOrder', traceId, userId };
    logger.stepStart(ctx, '转大货', { id, salesOrderId, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, '状态流转前', { id, status: order.status });
    order.convertToSalesOrder(salesOrderId, userId);
    logger.info(ctx, '状态流转后', {
      id,
      status: order.status,
      salesOrderId,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await this.orderRepo.update(order);
    await this.persistEvents(id, order, ctx);
    logger.stepEnd(ctx, '转大货', { id, salesOrderId });
  }

  async cancelOrder(id: number, reason: string, userId: number): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'cancelOrder', traceId, userId };
    logger.stepStart(ctx, '作废打样单', { id, reason, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, '状态流转前', { id, status: order.status });
    order.cancel(reason, userId);
    logger.info(ctx, '状态流转后', {
      id,
      status: order.status,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await this.orderRepo.update(order);
    await this.persistEvents(id, order, ctx);
    logger.stepEnd(ctx, '作废打样单', { id });
  }

  private async persistEvents(
    aggregateId: number,
    aggregate: any,
    parentCtx?: Record<string, unknown>
  ): Promise<void> {
    const events = aggregate.domainEvents || [];
    if (events.length === 0) return;
    const ctx = {
      module: 'sample',
      action: 'persistEvents',
      traceId: (parentCtx?.traceId as string) || generateTraceId(),
    };
    logger.info(ctx, '持久化领域事件', {
      aggregateId,
      eventCount: events.length,
      eventTypes: events.map((e: any) => e.eventType),
    });
    await transaction(async (conn) => {
      const aggregateType = aggregate.constructor.name;
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
    });
    aggregate.clearDomainEvents();
    logger.info(ctx, '领域事件已持久化', { aggregateId, cleared: true });
  }

  async linkProcessCard(id: number, processCardId: number): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'linkProcessCard', traceId };
    logger.stepStart(ctx, '关联工艺卡', { id, processCardId });
    const order = await this.getOrderById(id);
    order.linkProcessCard(processCardId);
    await this.orderRepo.update(order);
    logger.stepEnd(ctx, '关联工艺卡', { id, processCardId });
  }

  async linkWorkOrder(id: number, workOrderId: number): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'linkWorkOrder', traceId };
    logger.stepStart(ctx, '关联工单', { id, workOrderId });
    const order = await this.getOrderById(id);
    order.linkWorkOrder(workOrderId);
    await this.orderRepo.update(order);
    logger.stepEnd(ctx, '关联工单', { id, workOrderId });
  }

  async updateSampleFee(
    id: number,
    fee: number,
    charged: number,
    deductible: number
  ): Promise<void> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'updateSampleFee', traceId };
    logger.stepStart(ctx, '更新打样费用', { id, fee, charged, deductible });
    const order = await this.getOrderById(id);
    order.updateSampleFee(fee, charged, deductible);
    await this.orderRepo.update(order);
    logger.stepEnd(ctx, '更新打样费用', { id, fee });
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
