import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { ReturnOrderStatus, ReturnOrderStatusValue } from '../value-objects/ReturnOrderStatus';
import { ReturnOrderLine, ReturnOrderLineProps } from '../entities/ReturnOrderLine';
import {
  ReturnOrderCreatedEvent,
  ReturnOrderApprovedEvent,
  ReturnOrderCompletedEvent,
  ReturnOrderCancelledEvent,
} from '../events/ReturnOrderEvents';

export interface InboundResult {
  inboundOrderId: number;
  inboundOrderNo: string;
}

export interface ReceivableResult {
  receivableId: number;
  receivableNo: string;
}

export interface ReturnOrderProps {
  id?: number;
  returnNo?: string;
  status?: ReturnOrderStatusValue;
  orderId: number;
  orderNo?: string;
  customerId: number;
  customerName?: string;
  warehouseId: number;
  deliveryId?: number;
  deliveryNo?: string;
  reason: string;
  returnDate?: string;
  totalAmount?: number;
  lines: ReturnOrderLineProps[];
  approveBy?: number;
  approveTime?: string;
  completeBy?: number;
  completeTime?: string;
  inboundOrderId?: number;
  inboundOrderNo?: string;
  receivableId?: number;
  receivableNo?: string;
  remark?: string;
  createBy?: number;
  createTime?: string;
  updateTime?: string;
}

export class ReturnOrder {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly returnNo: string,
    private _status: ReturnOrderStatus,
    public readonly orderId: number,
    public readonly orderNo: string,
    public readonly customerId: number,
    public readonly customerName: string,
    public readonly warehouseId: number,
    public readonly deliveryId: number | undefined,
    public readonly deliveryNo: string,
    private _reason: string,
    public readonly returnDate: string,
    private _totalAmount: number,
    private _lines: ReturnOrderLine[],
    private _approveBy: number | undefined,
    private _approveTime: string | undefined,
    private _completeBy: number | undefined,
    private _completeTime: string | undefined,
    private _inboundOrderId: number | undefined,
    private _inboundOrderNo: string | undefined,
    private _receivableId: number | undefined,
    private _receivableNo: string | undefined,
    public readonly remark: string,
    public readonly createBy: number | undefined,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: ReturnOrderProps): ReturnOrder {
    if (!props.orderId || props.orderId <= 0) {
      throw new DomainError('销售订单ID不能为空');
    }
    if (!props.customerId || props.customerId <= 0) {
      throw new DomainError('客户ID不能为空');
    }
    if (!props.warehouseId || props.warehouseId <= 0) {
      throw new DomainError('仓库ID不能为空');
    }
    if (!props.lines || props.lines.length === 0) {
      throw new DomainError('退货明细不能为空');
    }
    if (!props.reason || !props.reason.trim()) {
      throw new DomainError('退货原因不能为空');
    }

    const lines = props.lines.map((line, index) =>
      ReturnOrderLine.create({ ...line, lineNo: line.lineNo || index + 1 })
    );
    const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);

    const order = new ReturnOrder(
      props.id,
      props.returnNo || '',
      ReturnOrderStatus.pending(),
      props.orderId,
      props.orderNo || '',
      props.customerId,
      props.customerName || '',
      props.warehouseId,
      props.deliveryId,
      props.deliveryNo || '',
      props.reason.trim(),
      props.returnDate || new Date().toISOString().slice(0, 10),
      Math.round(totalAmount * 100) / 100,
      lines,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      props.remark || '',
      props.createBy,
      props.createTime,
      props.updateTime
    );

    if (order.id) {
      order._domainEvents.push(
        new ReturnOrderCreatedEvent({
          returnId: order.id,
          returnNo: order.returnNo,
          orderId: order.orderId,
          customerId: order.customerId,
          warehouseId: order.warehouseId,
          reason: order._reason,
          lines: lines.map((l) => ({
            materialId: l.materialId,
            materialCode: l.materialCode,
            materialName: l.materialName,
            quantity: l.quantity,
            unit: l.unit,
            batchNo: l.batchNo,
            deliveryDetailId: l.deliveryDetailId,
            orderDetailId: l.orderDetailId,
          })),
        })
      );
    }
    return order;
  }

  static reconstitute(props: ReturnOrderProps): ReturnOrder {
    const lines = props.lines.map((line) => ReturnOrderLine.reconstitute(line));
    return new ReturnOrder(
      props.id,
      props.returnNo || '',
      ReturnOrderStatus.from(props.status || 1),
      props.orderId,
      props.orderNo || '',
      props.customerId,
      props.customerName || '',
      props.warehouseId,
      props.deliveryId,
      props.deliveryNo || '',
      props.reason || '',
      props.returnDate || '',
      props.totalAmount || 0,
      lines,
      props.approveBy,
      props.approveTime,
      props.completeBy,
      props.completeTime,
      props.inboundOrderId,
      props.inboundOrderNo,
      props.receivableId,
      props.receivableNo,
      props.remark || '',
      props.createBy,
      props.createTime,
      props.updateTime
    );
  }

  get status(): ReturnOrderStatus {
    return this._status;
  }
  get reason(): string {
    return this._reason;
  }
  get totalAmount(): number {
    return this._totalAmount;
  }
  get approveBy(): number | undefined {
    return this._approveBy;
  }
  get approveTime(): string | undefined {
    return this._approveTime;
  }
  get completeBy(): number | undefined {
    return this._completeBy;
  }
  get completeTime(): string | undefined {
    return this._completeTime;
  }
  get inboundOrderId(): number | undefined {
    return this._inboundOrderId;
  }
  get inboundOrderNo(): string | undefined {
    return this._inboundOrderNo;
  }
  get receivableId(): number | undefined {
    return this._receivableId;
  }
  get receivableNo(): string | undefined {
    return this._receivableNo;
  }
  get lines(): ReturnOrderLine[] {
    return [...this._lines];
  }

  approve(approveBy: number): void {
    if (!this._status.canApprove()) {
      throw new DomainError(`当前状态"${this._status.label}"不允许审核`);
    }
    if (!approveBy || approveBy <= 0) {
      throw new DomainError('审核人不能为空');
    }
    this._status = this._status.transitionTo(2);
    this._approveBy = approveBy;
    this._approveTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    this._domainEvents.push(
      new ReturnOrderApprovedEvent({
        returnId: this.id!,
        returnNo: this.returnNo,
        orderId: this.orderId,
        customerId: this.customerId,
        approvedBy: approveBy,
      })
    );
  }

  /**
   * 校验退货数量不得超过累计已发货数量（扣减已退数量）。
   * 在 approve() 之前由 ApplicationService 调用：传入从 sal_order_detail
   * 查询得到的 delivered_qty / returned_qty 聚合数据，由领域层执行业务规则判定。
   *
   * 设计原则：保持领域层零框架依赖；数据获取在应用层，规则判定在领域层。
   * 与 PurchaseReturn.validateAgainstReceivedQuantities 对称（T204 复用 T104 模板）。
   */
  validateAgainstShippedQuantities(
    shippedQtyByMaterial: Map<number, number>,
    alreadyReturnedQtyByMaterial?: Map<number, number>
  ): void {
    for (const line of this._lines) {
      const shipped = shippedQtyByMaterial.get(line.materialId) ?? 0;
      const alreadyReturned = alreadyReturnedQtyByMaterial?.get(line.materialId) ?? 0;
      const available = shipped - alreadyReturned;
      if (line.quantity > available) {
        throw new DomainError(
          `退货数量超出可退数量：物料「${line.materialName}」(${line.materialCode}) 本次退货 ${line.quantity}，已发货 ${shipped}，已退货 ${alreadyReturned}，可退 ${available}`
        );
      }
    }
  }

  complete(
    completeBy: number,
    inboundCallback: (
      items: Array<{
        materialId: number;
        materialCode: string;
        materialName: string;
        quantity: number;
        unit: string;
        batchNo: string;
      }>,
      warehouseId: number,
      returnId: number,
      returnNo: string
    ) => InboundResult,
    receivableCallback: (
      customerId: number,
      refundAmount: number,
      returnId: number,
      returnNo: string
    ) => ReceivableResult
  ): void {
    if (!this._status.canComplete()) {
      throw new DomainError(`当前状态"${this._status.label}"不允许完成`);
    }
    if (!completeBy || completeBy <= 0) {
      throw new DomainError('完成人不能为空');
    }

    const items = this._lines.map((l) => ({
      materialId: l.materialId,
      materialCode: l.materialCode,
      materialName: l.materialName,
      quantity: l.quantity,
      unit: l.unit,
      batchNo: l.batchNo,
    }));

    const inboundResult = inboundCallback(items, this.warehouseId, this.id!, this.returnNo);
    if (!inboundResult || !inboundResult.inboundOrderId || !inboundResult.inboundOrderNo) {
      throw new DomainError('入库单创建失败，无法完成退货');
    }

    const receivableResult = receivableCallback(
      this.customerId,
      this._totalAmount,
      this.id!,
      this.returnNo
    );
    if (!receivableResult || !receivableResult.receivableId || !receivableResult.receivableNo) {
      throw new DomainError('红字应收单创建失败，无法完成退货');
    }

    this._inboundOrderId = inboundResult.inboundOrderId;
    this._inboundOrderNo = inboundResult.inboundOrderNo;
    this._receivableId = receivableResult.receivableId;
    this._receivableNo = receivableResult.receivableNo;
    this._status = this._status.transitionTo(3);
    this._completeBy = completeBy;
    this._completeTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    this._domainEvents.push(
      new ReturnOrderCompletedEvent({
        returnId: this.id!,
        returnNo: this.returnNo,
        orderId: this.orderId,
        customerId: this.customerId,
        warehouseId: this.warehouseId,
        inboundOrderId: this._inboundOrderId,
        inboundOrderNo: this._inboundOrderNo,
        receivableId: this._receivableId,
        receivableNo: this._receivableNo,
        refundAmount: this._totalAmount,
        completedBy: completeBy,
        items,
      })
    );
  }

  cancel(reason?: string): void {
    if (!this._status.canCancel()) {
      throw new DomainError(`当前状态"${this._status.label}"不允许取消`);
    }
    this._status = this._status.transitionTo(9);

    this._domainEvents.push(
      new ReturnOrderCancelledEvent({
        returnId: this.id!,
        returnNo: this.returnNo,
        orderId: this.orderId,
        reason,
      })
    );
  }

  canEdit(): boolean {
    return this._status.value === 1;
  }

  canDelete(): boolean {
    return this._status.value === 1;
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
