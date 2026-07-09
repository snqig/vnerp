import { IReturnOrderRepository } from '@/domain/sales/repositories/IReturnOrderRepository';
import { IInboundOrderRepository } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { IReceivableRepository } from '@/domain/finance/repositories/IReceivableRepository';
import {
  ReturnOrder,
  ReturnOrderProps,
  InboundResult,
  ReceivableResult,
} from '@/domain/sales/aggregates/ReturnOrder';
import { InboundOrder, InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import { InboundItemProps } from '@/domain/warehouse/entities/InboundItem';
import { Receivable, ReceivableProps } from '@/domain/finance/aggregates/Receivable';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction, query } from '@/lib/db';

// 应收单来源类型：1-销售订单, 2-手工录入, 3-退货红字
const RECEIVABLE_SOURCE_TYPE_RETURN = 3;
// 入库单类型：sales_return 表示退货入库
const INBOUND_ORDER_TYPE_RETURN = 'sales_return';

export class ReturnOrderApplicationService {
  constructor(
    private readonly returnRepo: IReturnOrderRepository,
    private readonly inboundRepo: IInboundOrderRepository,
    private readonly receivableRepo: IReceivableRepository
  ) {}

  async getReturnById(id: number): Promise<ReturnOrder> {
    const ret = await this.returnRepo.findById(id);
    if (!ret) throw new NotFoundError('退货单不存在');
    return ret;
  }

  async createReturn(props: ReturnOrderProps): Promise<{ id: number; returnNo: string }> {
    const ret = ReturnOrder.create(props);
    const id = await this.returnRepo.save(ret);
    await this.persistAndPublishEvents('ReturnOrder', id, ret);
    return { id, returnNo: ret.returnNo };
  }

  async approveReturn(id: number, approveBy: number): Promise<{ status: number }> {
    const ret = await this.getReturnById(id);
    ret.approve(approveBy);

    await this.returnRepo.updateApproval(id, ret.status.value, ret.approveBy!, ret.approveTime!);
    await this.persistAndPublishEvents('ReturnOrder', id, ret);
    return { status: ret.status.value };
  }

  async completeReturn(
    id: number,
    completeBy: number
  ): Promise<{
    status: number;
    inboundOrderId: number;
    inboundOrderNo: string;
    receivableId: number;
    receivableNo: string;
  }> {
    const ret = await this.getReturnById(id);
    if (!ret.status.canComplete()) {
      throw new DomainError(`当前状态"${ret.status.label}"不允许完成`);
    }

    // 预创建退货入库单（异步）
    const inboundResult = await this.createInboundForReturn(ret);

    // 预创建红字应收单（异步）
    const receivableResult = await this.createReceivableForReturn(ret);

    // 调用聚合 complete，传同步回调返回预创建结果
    ret.complete(
      completeBy,
      () => inboundResult,
      () => receivableResult
    );

    // 持久化退货单状态变更
    await this.returnRepo.updateCompletion(
      id,
      ret.status.value,
      ret.completeBy!,
      ret.completeTime!,
      inboundResult.inboundOrderId,
      inboundResult.inboundOrderNo,
      receivableResult.receivableId,
      receivableResult.receivableNo
    );

    await this.persistAndPublishEvents('ReturnOrder', id, ret);
    return {
      status: ret.status.value,
      inboundOrderId: inboundResult.inboundOrderId,
      inboundOrderNo: inboundResult.inboundOrderNo,
      receivableId: receivableResult.receivableId,
      receivableNo: receivableResult.receivableNo,
    };
  }

  async cancelReturn(id: number, reason?: string): Promise<{ status: number }> {
    const ret = await this.getReturnById(id);
    ret.cancel(reason);

    await this.returnRepo.updateStatus(id, ret.status.value);
    await this.persistAndPublishEvents('ReturnOrder', id, ret);
    return { status: ret.status.value };
  }

  async listReturnsByStatus(status: number): Promise<ReturnOrder[]> {
    return this.returnRepo.findByStatus(status);
  }

  async listReturnsByOrder(orderId: number): Promise<ReturnOrder[]> {
    return this.returnRepo.findByOrderId(orderId);
  }

  async listReturnsByCustomer(customerId: number): Promise<ReturnOrder[]> {
    return this.returnRepo.findByCustomerId(customerId);
  }

  async deleteReturn(id: number): Promise<void> {
    const ret = await this.getReturnById(id);
    if (!ret.canDelete()) {
      throw new DomainError('仅待审核状态的退货单可删除');
    }
    await this.returnRepo.softDelete(id);
  }

  private async createInboundForReturn(ret: ReturnOrder): Promise<InboundResult> {
    const warehouseRows: Loose = await query(
      'SELECT warehouse_name FROM inv_warehouse WHERE id = ?',
      [ret.warehouseId]
    );
    const warehouseName = warehouseRows?.[0]?.warehouse_name || '';

    const items: InboundItemProps[] = ret.lines.map((line) => ({
      materialId: line.materialId,
      materialCode: line.materialCode,
      materialName: line.materialName,
      materialSpec: line.materialSpec,
      batchNo: line.batchNo || '',
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
    }));

    const inboundProps: InboundOrderProps = {
      warehouseId: ret.warehouseId,
      warehouseName,
      supplierName: ret.customerName || `客户${ret.customerId}`,
      orderType: INBOUND_ORDER_TYPE_RETURN,
      inboundDate: ret.returnDate,
      remark: `退货入库：${ret.returnNo}`,
      operatorId: ret.createBy,
      items,
    };

    const inboundOrder = InboundOrder.create(inboundProps);
    const { id: inboundId, orderNo: inboundOrderNo } = await this.inboundRepo.save(inboundOrder);
    await this.persistAndPublishEvents('InboundOrder', inboundId, inboundOrder);

    return {
      inboundOrderId: inboundId,
      inboundOrderNo,
    };
  }

  private async createReceivableForReturn(ret: ReturnOrder): Promise<ReceivableResult> {
    const receivableProps: ReceivableProps = {
      sourceType: RECEIVABLE_SOURCE_TYPE_RETURN,
      sourceId: ret.id,
      sourceNo: ret.returnNo,
      customerId: ret.customerId,
      customerName: ret.customerName,
      amount: ret.totalAmount,
      remark: `退货红字应收：${ret.returnNo}`,
    };

    const receivable = Receivable.create(receivableProps);
    const receivableId = await this.receivableRepo.save(receivable);
    await this.persistAndPublishEvents('Receivable', receivableId, receivable);

    return {
      receivableId,
      receivableNo: receivable.receivableNo,
    };
  }

  private async persistAndPublishEvents(
    aggregateType: string,
    aggregateId: number,
    aggregate: { getDomainEvents(): Loose[]; clearDomainEvents(): void }
  ): Promise<void> {
    const events = aggregate.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
    });

    aggregate.clearDomainEvents();
  }
}
