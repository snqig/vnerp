import { getTranslations } from 'next-intl/server';

import {
  ISampleOrderRepository,
  SampleOrderFilters,
} from '@/domain/sample/repositories/ISampleOrderRepository';
import { ISampleFeedbackRepository } from '@/domain/sample/repositories/ISampleFeedbackRepository';
import { SampleOrder } from '@/domain/sample/aggregates/SampleOrder';
import { SampleOrderProps } from '@/domain/sample/aggregates/SampleOrder';
import { SampleFeedback } from '@/domain/sample/entities/SampleFeedback';
import { SampleFeedbackProps } from '@/domain/sample/entities/SampleFeedback';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import { DomainEvent } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction, query } from '@/lib/db';
import { assertCustomerExists, assertMaterialByCode } from '@/lib/reference-validation';
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { logger, generateTraceId } from '@/lib/logger';

interface DomainEventAggregate {
  readonly domainEvents: readonly DomainEvent[];
  clearDomainEvents(): void;
  constructor: { name: string };
}

export class SampleOrderApplicationService {
  constructor(
    private readonly orderRepo: ISampleOrderRepository,
    private readonly feedbackRepo?: ISampleFeedbackRepository
  ) {}

  async getOrderById(id: number): Promise<SampleOrder> {
  const ts = await getTranslations('Common');
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundError(ts('k_uv7869'));
    return order;
  }

  async listOrders(
    filters: SampleOrderFilters,
    page: number,
    pageSize: number
  ): Promise<{ list: SampleOrder[]; total: number }> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'listOrders', traceId };
    logger.stepStart(ctx, ts('k_1apexnh'), { filters, page, pageSize });
    const result = await this.orderRepo.findByFilters(filters, page, pageSize);
    logger.stepEnd(ctx, ts('k_1apexnh'), { total: result.total, count: result.list.length });
    return result;
  }

  async createOrder(props: Partial<SampleOrderProps>): Promise<{ id: number; orderNo: string }> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'createOrder', traceId };
    logger.stepStart(ctx, ts('k_b4qke5'), {
      customerName: props.customerName,
      productName: props.productName,
      materialNo: props.materialNo,
    });

    // 引用完整性校验（写入前）：客户（按 ID）、物料（按编码）
    if (props.customerId) {
      await assertCustomerExists(props.customerId);
    }
    if (props.materialNo) {
      await assertMaterialByCode(props.materialNo);
    }

    const orderNo = await this.orderRepo.getNextSequence();
    logger.info(ctx, ts('k_oqulf0'), { orderNo });

    const order = SampleOrder.create({ ...props, orderNo } as SampleOrderProps);

    // 聚合写入与事件 Outbox 写入必须在同一事务内，保证 Transactional Outbox 契约
    const id = await transaction(async (conn) => {
      const newId = await this.orderRepo.save(order, conn);
      logger.info(ctx, ts('k_1k4wao9'), { id: newId, orderNo });
      if (newId) {
        await this.persistEvents(newId, order, ctx, conn);
      }
      return newId;
    });
    if (id) {
      order.clearDomainEvents();
    }
    logger.stepEnd(ctx, ts('k_b4qke5'), { id, orderNo });
    return { id, orderNo };
  }

  async updateOrder(id: number, props: Partial<SampleOrderProps>): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'updateOrder', traceId };
    logger.stepStart(ctx, ts('k_199k416'), { id, fields: Object.keys(props) });

    const order = await this.getOrderById(id);
    logger.info(ctx, ts('k_1kvjygt'), {
      id,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
    });

    const updated = SampleOrder.reconstitute({ ...order.toProps(), ...props });
    await this.orderRepo.update(updated);
    logger.info(ctx, ts('k_1hpb5bs'), {
      id,
      status: updated.status,
      deliveryStatus: updated.deliveryStatus,
    });
    logger.stepEnd(ctx, ts('k_199k416'), { id });
  }

  async deleteOrder(id: number): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'deleteOrder', traceId };
    logger.stepStart(ctx, ts('k_remthu'), { id });
    await this.orderRepo.delete(id);
    logger.stepEnd(ctx, ts('k_remthu'), { id });
  }

  async submitOrder(id: number, userId: number): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'submitOrder', traceId, userId };
    logger.stepStart(ctx, ts('k_1v2kn7m'), { id, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, ts('k_3x8l6w'), { id, status: order.status });
    order.submit(userId);
    logger.info(ctx, ts('k_miv8ap'), {
      id,
      status: order.status,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await transaction(async (conn) => {
      await this.orderRepo.update(order, conn);
      await this.persistEvents(id, order, ctx, conn);
    });
    order.clearDomainEvents();
    logger.stepEnd(ctx, ts('k_1v2kn7m'), { id });
  }

  async startProduction(id: number, userId: number): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'startProduction', traceId, userId };
    logger.stepStart(ctx, ts('k_1n6voak'), { id, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, ts('k_3x8l6w'), { id, status: order.status });
    order.startProduction(userId);
    logger.info(ctx, ts('k_miv8ap'), {
      id,
      status: order.status,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await transaction(async (conn) => {
      await this.orderRepo.update(order, conn);
      await this.persistEvents(id, order, ctx, conn);
    });
    order.clearDomainEvents();
    logger.stepEnd(ctx, ts('k_1n6voak'), { id });
  }

  async completeOrder(id: number, userId: number): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'completeOrder', traceId, userId };
    logger.stepStart(ctx, ts('k_iz0ggj'), { id, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, ts('k_3x8l6w'), { id, status: order.status });
    order.complete(userId);
    logger.info(ctx, ts('k_miv8ap'), {
      id,
      status: order.status,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await transaction(async (conn) => {
      await this.orderRepo.update(order, conn);
      await this.persistEvents(id, order, ctx, conn);
    });
    order.clearDomainEvents();
    logger.stepEnd(ctx, ts('k_iz0ggj'), { id });
  }

  async confirmOrder(id: number, userId: number): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'confirmOrder', traceId, userId };
    logger.stepStart(ctx, ts('k_1omwee1'), { id, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, ts('k_3x8l6w'), { id, status: order.status });
    order.confirm(userId);
    logger.info(ctx, ts('k_miv8ap'), {
      id,
      status: order.status,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await transaction(async (conn) => {
      await this.orderRepo.update(order, conn);
      await this.persistEvents(id, order, ctx, conn);
    });
    order.clearDomainEvents();
    logger.stepEnd(ctx, ts('k_1omwee1'), { id });
  }

  /**
   * T305: Auto-generate sales order from sample order
   * @description Reads sample order data, creates sal_order + sal_order_detail records,
   *   and returns the new sales order id. Called when converting a sample to production
   *   without an existing salesOrderId.
   */
  async createSalesOrderFromSample(id: number, userId: number): Promise<number> {
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'createSalesOrderFromSample', traceId, userId };
    logger.stepStart(ctx, 'Create sales order from sample', { id, userId });

    // 1. Read sample order
    const order = await this.getOrderById(id);
    logger.info(ctx, 'Sample order loaded', {
      id,
      orderNo: order.orderNo,
      customerId: order.customerId,
      sampleFee: order.sampleFee,
    });

    // 1.1 Idempotency: if sample order already linked to a sales order, return existing id
    if (order.salesOrderId) {
      logger.info(ctx, 'Sample order already linked to sales order, returning existing id', {
        id,
        salesOrderId: order.salesOrderId,
      });
      logger.stepEnd(ctx, 'Create sales order from sample', {
        salesOrderId: order.salesOrderId,
        skipped: true,
      });
      return order.salesOrderId;
    }

    // 2. Generate sales order number prefix: SO + YYYYMMDD
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `SO${y}${m}${d}`;
    const today = `${y}-${m}-${d}`;

    // Query base sequence once; on unique constraint conflict, increment locally (seq + 1 per retry)
    const seqRows = await query<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM sal_order WHERE order_no LIKE ?',
      [`${prefix}%`]
    );
    const baseSeq = (seqRows[0]?.cnt || 0) + 1;

    // 3. Lookup material id by material_no (sample material_no -> inv_material.id)
    let materialId = 0;
    if (order.materialNo) {
      const matRows = await query<{ id: number }>(
        'SELECT id FROM inv_material WHERE material_code = ? AND deleted = 0 LIMIT 1',
        [order.materialNo]
      );
      if (matRows.length > 0) {
        materialId = matRows[0].id;
      }
    }
    logger.info(ctx, 'Material id resolved', { materialNo: order.materialNo, materialId });

    // 4. Compute amounts (from sample fee / quotation)
    const quantity = order.quantity || 1;
    const unitPrice = order.sampleFee || 0;
    const totalAmount = unitPrice;

    // 5. Insert sal_order + sal_order_detail in one transaction (atomic)
    //    Retry on unique constraint conflict (ER_DUP_ENTRY): increment sequence by 1 each retry.
    //    The uk_order_no unique index (migration 062) provides the concurrency safety net.
    const MAX_RETRIES = 3;
    let lastOrderNo = '';

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const nextSeq = baseSeq + attempt;
      const orderNo = `${prefix}${String(nextSeq).padStart(4, '0')}`;
      lastOrderNo = orderNo;
      logger.info(ctx, 'Sales order number generated', { orderNo, attempt });

      try {
        const newSalesOrderId = await transaction(async (conn) => {
          const [orderResult] = await conn.execute(
            `INSERT INTO sal_order
             (order_no, order_date, customer_id, total_amount, total_with_tax, currency, status, create_by, create_time)
             VALUES (?, ?, ?, ?, ?, 'CNY', 1, ?, NOW())`,
            [orderNo, today, order.customerId || 0, totalAmount, totalAmount, userId]
          );
          const newId = (orderResult as ResultSetHeader).insertId;
          logger.info(ctx, 'Sales order created', { salesOrderId: newId, orderNo });

          await conn.execute(
            `INSERT INTO sal_order_detail
             (order_id, material_id, material_name, quantity, unit_price, total_amount, create_time)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [newId, materialId, order.productName || null, quantity, unitPrice, totalAmount]
          );
          logger.info(ctx, 'Sales order detail created', { salesOrderId: newId, materialId });
          return newId;
        });

        logger.stepEnd(ctx, 'Create sales order from sample', {
          salesOrderId: newSalesOrderId,
          orderNo,
        });
        return newSalesOrderId;
      } catch (error) {
        const dbErr = error as { code?: string };
        if (dbErr.code === 'ER_DUP_ENTRY') {
          logger.warn(ctx, 'Sales order number conflict, retrying', { orderNo, attempt });
          if (attempt < MAX_RETRIES - 1) {
            continue; // retry with next sequence number
          }
          break; // last attempt exhausted — fall through to DomainError
        }
        throw error; // non-DUP error: propagate immediately
      }
    }

    // All retries exhausted — unique constraint still violated
    throw new DomainError(
      `Sales order number generation failed after ${MAX_RETRIES} retries (last attempted: ${lastOrderNo})`,
      'SALES_ORDER_NO_CONFLICT'
    );
  }

  async convertOrder(id: number, salesOrderId: number, userId: number): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'convertOrder', traceId, userId };
    logger.stepStart(ctx, ts('k_1ki65eh'), { id, salesOrderId, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, ts('k_3x8l6w'), { id, status: order.status });
    order.convertToSalesOrder(salesOrderId, userId);
    logger.info(ctx, ts('k_miv8ap'), {
      id,
      status: order.status,
      salesOrderId,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await transaction(async (conn) => {
      await this.orderRepo.update(order, conn);
      await this.persistEvents(id, order, ctx, conn);
    });
    order.clearDomainEvents();
    logger.stepEnd(ctx, ts('k_1ki65eh'), { id, salesOrderId });
  }

  async cancelOrder(id: number, reason: string, userId: number): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'cancelOrder', traceId, userId };
    logger.stepStart(ctx, ts('k_17uscn5'), { id, reason, userId });

    const order = await this.getOrderById(id);
    logger.info(ctx, ts('k_3x8l6w'), { id, status: order.status });
    order.cancel(reason, userId);
    logger.info(ctx, ts('k_miv8ap'), {
      id,
      status: order.status,
      events: order.domainEvents.map((e) => e.eventType),
    });

    await transaction(async (conn) => {
      await this.orderRepo.update(order, conn);
      await this.persistEvents(id, order, ctx, conn);
    });
    order.clearDomainEvents();
    logger.stepEnd(ctx, ts('k_17uscn5'), { id });
  }

  /**
   * 持久化领域事件到 Outbox。
   * - 传入 conn 时：在外部事务连接上写入，不开启新事务、不清除事件
   *   （由调用方在事务提交成功后调用 aggregate.clearDomainEvents()）。
   * - 未传入 conn 时：开启独立事务写入并立即清除事件（兼容旧调用方）。
   */
  private async persistEvents(
    aggregateId: number,
    aggregate: DomainEventAggregate,
    parentCtx?: Record<string, unknown>,
    conn?: PoolConnection
  ): Promise<void> {
  const ts = await getTranslations('Common');
    const events = [...(aggregate.domainEvents || [])];
    if (events.length === 0) return;
    const ctx = {
      module: 'sample',
      action: 'persistEvents',
      traceId: (parentCtx?.traceId as string) || generateTraceId(),
    };
    logger.info(ctx, ts('k_14k9tht'), {
      aggregateId,
      eventCount: events.length,
      eventTypes: events.map((e: DomainEvent) => e.eventType),
    });
    const aggregateType = aggregate.constructor.name;
    if (conn) {
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
      logger.info(ctx, ts('k_12eae3j'), { aggregateId });
      return;
    }
    await transaction(async (tx) => {
      await getDomainEventOutbox().saveEvents(tx, aggregateType, aggregateId, events);
    });
    aggregate.clearDomainEvents();
    logger.info(ctx, ts('k_1iiuqf5'), { aggregateId, cleared: true });
  }

  async linkProcessCard(id: number, processCardId: number): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'linkProcessCard', traceId };
    logger.stepStart(ctx, ts('k_12h8twk'), { id, processCardId });
    const order = await this.getOrderById(id);
    order.linkProcessCard(processCardId);
    await this.orderRepo.update(order);
    logger.stepEnd(ctx, ts('k_12h8twk'), { id, processCardId });
  }

  async linkWorkOrder(id: number, workOrderId: number): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'linkWorkOrder', traceId };
    logger.stepStart(ctx, ts('k_1yxsmpc'), { id, workOrderId });
    const order = await this.getOrderById(id);
    order.linkWorkOrder(workOrderId);
    await this.orderRepo.update(order);
    logger.stepEnd(ctx, ts('k_1yxsmpc'), { id, workOrderId });
  }

  async updateSampleFee(
    id: number,
    fee: number,
    charged: number,
    deductible: number
  ): Promise<void> {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'updateSampleFee', traceId };
    logger.stepStart(ctx, ts('k_fmgu2y'), { id, fee, charged, deductible });
    const order = await this.getOrderById(id);
    order.updateSampleFee(fee, charged, deductible);
    await this.orderRepo.update(order);
    logger.stepEnd(ctx, ts('k_fmgu2y'), { id, fee });
  }

  // ==================== 反馈管理 ====================

  async getFeedbacks(sampleOrderId: number): Promise<SampleFeedback[]> {
  const ts = await getTranslations('Common');
    if (!this.feedbackRepo) throw new DomainError(ts('k_hjzga4'));
    return this.feedbackRepo.findBySampleOrderId(sampleOrderId);
  }

  async addFeedback(props: SampleFeedbackProps): Promise<number> {
  const ts = await getTranslations('Common');
    if (!this.feedbackRepo) throw new DomainError(ts('k_hjzga4'));
    const feedback = SampleFeedback.create(props);
    const id = await this.feedbackRepo.save(feedback);
    return id;
  }

  async approveFeedback(id: number): Promise<void> {
  const ts = await getTranslations('Common');
    if (!this.feedbackRepo) throw new DomainError(ts('k_hjzga4'));
    const feedback = await this.feedbackRepo.findById(id);
    if (!feedback) throw new NotFoundError(ts('k_wffz5r'));
    feedback.approve();
    await this.feedbackRepo.update(feedback);
  }

  async rejectFeedback(id: number): Promise<void> {
  const ts = await getTranslations('Common');
    if (!this.feedbackRepo) throw new DomainError(ts('k_hjzga4'));
    const feedback = await this.feedbackRepo.findById(id);
    if (!feedback) throw new NotFoundError(ts('k_wffz5r'));
    feedback.reject();
    await this.feedbackRepo.update(feedback);
  }
}
