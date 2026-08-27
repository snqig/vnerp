import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import {
  PurchaseReturnStatus,
  PurchaseReturnStatusValue,
} from '../value-objects/PurchaseReturnStatus';
import { PurchaseReturnLine, PurchaseReturnLineProps } from '../entities/PurchaseReturnLine';
import {
  PurchaseReturnCreatedEvent,
  PurchaseReturnApprovedEvent,
  PurchaseReturnCompletedEvent,
  PurchaseReturnCancelledEvent,
} from '../events/PurchaseReturnEvents';

export interface OutboundResult {
  outboundOrderId: number;
  outboundOrderNo: string;
}

export interface PayableRefundResult {
  payableId: number;
  payableNo: string;
}

export interface PurchaseReturnProps {
  id?: number;
  returnNo?: string;
  status?: PurchaseReturnStatusValue;
  orderId: number;
  orderNo?: string;
  supplierId: number;
  supplierName?: string;
  warehouseId: number;
  receiptId?: number;
  receiptNo?: string;
  reason: string;
  returnDate?: string;
  totalAmount?: number;
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseTotalAmount?: number;
  lines: PurchaseReturnLineProps[];
  approveBy?: number;
  approveTime?: string;
  completeBy?: number;
  completeTime?: string;
  outboundOrderId?: number;
  outboundOrderNo?: string;
  payableId?: number;
  payableNo?: string;
  remark?: string;
  createBy?: number;
  createTime?: string;
  updateTime?: string;
}

export class PurchaseReturn {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly returnNo: string,
    private _status: PurchaseReturnStatus,
    public readonly orderId: number,
    public readonly orderNo: string,
    public readonly supplierId: number,
    public readonly supplierName: string,
    public readonly warehouseId: number,
    public readonly receiptId: number | undefined,
    public readonly receiptNo: string,
    private _reason: string,
    public readonly returnDate: string,
    private _totalAmount: number,
    public readonly currency: string,
    public readonly exchangeRate: number,
    public readonly baseCurrency: string,
    private _baseTotalAmount: number,
    private _lines: PurchaseReturnLine[],
    private _approveBy: number | undefined,
    private _approveTime: string | undefined,
    private _completeBy: number | undefined,
    private _completeTime: string | undefined,
    private _outboundOrderId: number | undefined,
    private _outboundOrderNo: string | undefined,
    private _payableId: number | undefined,
    private _payableNo: string | undefined,
    public readonly remark: string,
    public readonly createBy: number | undefined,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: PurchaseReturnProps): PurchaseReturn {
    if (!props.orderId || props.orderId <= 0) {
      throw new DomainError('采购订单ID不能为空');
    }
    if (!props.supplierId || props.supplierId <= 0) {
      throw new DomainError('供应商ID不能为空');
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
      PurchaseReturnLine.create({ ...line, lineNo: line.lineNo || index + 1 })
    );
    const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);

    const currency = props.currency || 'CNY';
    const exchangeRate = props.exchangeRate || 1.0;
    const baseCurrency = props.baseCurrency || 'CNY';
    const baseTotalAmount = props.baseTotalAmount ?? 0;

    const order = new PurchaseReturn(
      props.id,
      props.returnNo || '',
      PurchaseReturnStatus.pending(),
      props.orderId,
      props.orderNo || '',
      props.supplierId,
      props.supplierName || '',
      props.warehouseId,
      props.receiptId,
      props.receiptNo || '',
      props.reason.trim(),
      props.returnDate || new Date().toISOString().slice(0, 10),
      Math.round(totalAmount * 100) / 100,
      currency,
      exchangeRate,
      baseCurrency,
      baseTotalAmount,
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
        new PurchaseReturnCreatedEvent({
          returnId: order.id,
          returnNo: order.returnNo,
          orderId: order.orderId,
          supplierId: order.supplierId,
          warehouseId: order.warehouseId,
          reason: order._reason,
          currency: order.currency,
          exchangeRate: order.exchangeRate,
          baseCurrency: order.baseCurrency,
          baseTotalAmount: order.baseTotalAmount,
          lines: lines.map((l) => ({
            materialId: l.materialId,
            materialCode: l.materialCode,
            materialName: l.materialName,
            quantity: l.quantity,
            unit: l.unit,
            batchNo: l.batchNo,
            orderLineId: l.orderLineId,
          })),
        })
      );
    }
    return order;
  }

  static reconstitute(props: PurchaseReturnProps): PurchaseReturn {
    const lines = props.lines.map((line) => PurchaseReturnLine.reconstitute(line));
    return new PurchaseReturn(
      props.id,
      props.returnNo || '',
      PurchaseReturnStatus.from(props.status || 1),
      props.orderId,
      props.orderNo || '',
      props.supplierId,
      props.supplierName || '',
      props.warehouseId,
      props.receiptId,
      props.receiptNo || '',
      props.reason || '',
      props.returnDate || '',
      props.totalAmount || 0,
      props.currency || 'CNY',
      props.exchangeRate || 1.0,
      props.baseCurrency || 'CNY',
      props.baseTotalAmount ?? 0,
      lines,
      props.approveBy,
      props.approveTime,
      props.completeBy,
      props.completeTime,
      props.outboundOrderId,
      props.outboundOrderNo,
      props.payableId,
      props.payableNo,
      props.remark || '',
      props.createBy,
      props.createTime,
      props.updateTime
    );
  }

  get status(): PurchaseReturnStatus {
    return this._status;
  }
  get reason(): string {
    return this._reason;
  }
  get totalAmount(): number {
    return this._totalAmount;
  }
  get baseTotalAmount(): number {
    return this._baseTotalAmount;
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
  get outboundOrderId(): number | undefined {
    return this._outboundOrderId;
  }
  get outboundOrderNo(): string | undefined {
    return this._outboundOrderNo;
  }
  get payableId(): number | undefined {
    return this._payableId;
  }
  get payableNo(): string | undefined {
    return this._payableNo;
  }
  get lines(): PurchaseReturnLine[] {
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
      new PurchaseReturnApprovedEvent({
        returnId: this.id!,
        returnNo: this.returnNo,
        orderId: this.orderId,
        supplierId: this.supplierId,
        approvedBy: approveBy,
      })
    );
  }

  /**
   * 校验退货数量不得超过累计已入库量（已扣减已退数量）。
   * 在 approve() 之前由 ApplicationService 调用：传入从 pur_purchase_order_line
   * 查询得到的 received_qty / returned_qty 聚合数据，由领域层执行业务规则判定。
   *
   * 设计原则：保持领域层零框架依赖；数据获取在应用层，规则判定在领域层。
   */
  validateAgainstReceivedQuantities(
    receivedQtyByMaterial: Map<number, number>,
    alreadyReturnedQtyByMaterial?: Map<number, number>
  ): void {
    for (const line of this._lines) {
      const received = receivedQtyByMaterial.get(line.materialId) ?? 0;
      const alreadyReturned = alreadyReturnedQtyByMaterial?.get(line.materialId) ?? 0;
      const available = received - alreadyReturned;
      if (line.quantity > available) {
        throw new DomainError(
          `退货数量超出可退数量：物料「${line.materialName}」(${line.materialCode}) 本次退货 ${line.quantity}，已入库 ${received}，已退货 ${alreadyReturned}，可退 ${available}`
        );
      }
    }
  }

  complete(
    completeBy: number,
    outboundCallback: (
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
    ) => OutboundResult,
    payableCallback: (
      supplierId: number,
      refundAmount: number,
      returnId: number,
      returnNo: string
    ) => PayableRefundResult
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

    const outboundResult = outboundCallback(items, this.warehouseId, this.id!, this.returnNo);
    if (!outboundResult || !outboundResult.outboundOrderId || !outboundResult.outboundOrderNo) {
      throw new DomainError('出库单创建失败，无法完成退货');
    }

    const payableResult = payableCallback(
      this.supplierId,
      this._totalAmount,
      this.id!,
      this.returnNo
    );
    if (!payableResult || !payableResult.payableId || !payableResult.payableNo) {
      throw new DomainError('红字应付单创建失败，无法完成退货');
    }

    this._outboundOrderId = outboundResult.outboundOrderId;
    this._outboundOrderNo = outboundResult.outboundOrderNo;
    this._payableId = payableResult.payableId;
    this._payableNo = payableResult.payableNo;
    this._status = this._status.transitionTo(3);
    this._completeBy = completeBy;
    this._completeTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    this._domainEvents.push(
      new PurchaseReturnCompletedEvent({
        returnId: this.id!,
        returnNo: this.returnNo,
        orderId: this.orderId,
        supplierId: this.supplierId,
        warehouseId: this.warehouseId,
        outboundOrderId: this._outboundOrderId,
        outboundOrderNo: this._outboundOrderNo,
        payableId: this._payableId,
        payableNo: this._payableNo,
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
      new PurchaseReturnCancelledEvent({
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
