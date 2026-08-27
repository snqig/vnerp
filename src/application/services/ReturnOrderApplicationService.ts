import { IReturnOrderRepository } from '@/domain/sales/repositories/IReturnOrderRepository';
import { IInboundOrderRepository } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { IReceivableRepository } from '@/domain/finance/repositories/IReceivableRepository';
import { ISalesOrderRepository } from '@/domain/sales/repositories/ISalesOrderRepository';
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
import { DomainEvent } from '@/domain/shared/DomainEvent';
import { CurrencyApplicationService } from './CurrencyApplicationService';
import { CurrencySnapshot } from '@/domain/shared/value-objects/CurrencySnapshot';
import { Money } from '@/domain/shared/value-objects/Money';
import { getSystemConfig } from '@/lib/system-config';
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
    private readonly receivableRepo: IReceivableRepository,
    private readonly orderRepo: ISalesOrderRepository,
    private readonly currencyService: CurrencyApplicationService
  ) {}

  async getReturnById(id: number): Promise<ReturnOrder> {
    const ret = await this.returnRepo.findById(id);
    if (!ret) throw new NotFoundError('退货单不存在');
    return ret;
  }

  async createReturn(props: ReturnOrderProps): Promise<{ id: number; returnNo: string }> {
    let effectiveProps = { ...props };

    if (effectiveProps.orderId) {
      const order = await this.orderRepo.findById(effectiveProps.orderId);
      if (order) {
        if (!effectiveProps.currency) effectiveProps.currency = order.currency;
        if (!effectiveProps.exchangeRate) effectiveProps.exchangeRate = order.exchangeRate;
        if (!effectiveProps.baseCurrency) effectiveProps.baseCurrency = order.baseCurrency;
      }
    }

    const baseCurrency =
      effectiveProps.baseCurrency || (await getSystemConfig('finance.base_currency', 'CNY'));
    const currency = effectiveProps.currency || 'CNY';
    let exchangeRate = effectiveProps.exchangeRate || 1.0;
    if (currency !== baseCurrency) {
      exchangeRate = await this.currencyService.getLatestRate(currency, baseCurrency);
    }

    const snapshot = CurrencySnapshot.create(currency, exchangeRate, baseCurrency);
    const decimalPlaces = 2;

    effectiveProps = {
      ...effectiveProps,
      exchangeRate,
      baseCurrency,
      lines: effectiveProps.lines.map((line) => {
        const originalAmount = (line.quantity || 0) * (line.unitPrice || 0);
        return {
          ...line,
          baseUnitPrice: snapshot.convert(
            Money.create(line.unitPrice || 0, currency),
            decimalPlaces
          ).amount,
          baseAmount: snapshot.convert(Money.create(originalAmount, currency), decimalPlaces)
            .amount,
        };
      }),
    };

    const baseTotalAmount = effectiveProps.lines.reduce((sum, l) => sum + (l.baseAmount || 0), 0);
    effectiveProps.baseTotalAmount = Math.round(baseTotalAmount * 100) / 100;

    const ret = ReturnOrder.create(effectiveProps);
    const id = await this.returnRepo.save(ret);
    await this.persistAndPublishEvents('ReturnOrder', id, ret);
    return { id, returnNo: ret.returnNo };
  }

  async approveReturn(id: number, approveBy: number): Promise<{ status: number }> {
    const ret = await this.getReturnById(id);

    // T204: 审核前校验退货数量不得超过累计已发货量
    await this.validateReturnQuantitiesAgainstShipped(ret);

    ret.approve(approveBy);

    await this.returnRepo.updateApproval(id, ret.status.value, ret.approveBy!, ret.approveTime!);
    await this.persistAndPublishEvents('ReturnOrder', id, ret);
    return { status: ret.status.value };
  }

  /**
   * 从 sal_order_detail 拉取 delivered_qty 聚合数据，
   * 调用聚合根的领域校验方法 validateAgainstShippedQuantities。
   *
   * 数据获取在应用层，规则判定在领域层，保持 DDD 分层规范。
   * 与 PurchaseReturnApplicationService.validateReturnQuantitiesAgainstReceived 对称（T204 复用 T104 模板）。
   *
   * 注：sal_order_detail 当前未维护 returned_qty 列，已退数量暂以 0 计；
   * 后续若新增 returned_qty 列，可在此处补充 SUM 查询并传入 alreadyReturned map。
   */
  private async validateReturnQuantitiesAgainstShipped(ret: ReturnOrder): Promise<void> {
    interface LineQtyRow {
      material_id: number;
      delivered_qty: number | string | null;
    }
    const rows = await query<LineQtyRow>(
      'SELECT material_id, delivered_qty FROM sal_order_detail WHERE order_id = ?',
      [ret.orderId]
    );

    if (!rows || rows.length === 0) {
      // 销售单无明细行：所有退货均不合法
      const shippedMap = new Map<number, number>();
      ret.validateAgainstShippedQuantities(shippedMap);
      return;
    }

    const shippedMap = new Map<number, number>();
    for (const row of rows) {
      const mid = Number(row.material_id);
      // 同一物料在多行的情况：累加 delivered_qty
      shippedMap.set(mid, (shippedMap.get(mid) ?? 0) + Number(row.delivered_qty || 0));
    }
    ret.validateAgainstShippedQuantities(shippedMap);
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
    const warehouseRows = await query('SELECT warehouse_name FROM inv_warehouse WHERE id = ?', [
      ret.warehouseId,
    ]);
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
      // T305: 红字应收使用负数金额，冲减客户应收余额
      amount: -ret.totalAmount,
      remark: `退货红字应收：${ret.returnNo}`,
    };

    const receivable = Receivable.createRedLetter(receivableProps);
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
    aggregate: { getDomainEvents(): DomainEvent[]; clearDomainEvents(): void }
  ): Promise<void> {
    const events = aggregate.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
    });

    aggregate.clearDomainEvents();
  }
}
