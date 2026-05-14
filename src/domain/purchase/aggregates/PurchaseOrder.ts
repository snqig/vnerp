import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { PurchaseOrderStatus, PurchaseStatus } from '../value-objects/PurchaseOrderStatus';
import { PurchaseOrderLine, PurchaseOrderLineProps } from '../entities/PurchaseOrderLine';
import {
  PurchaseOrderCreatedEvent,
  PurchaseOrderSubmittedEvent,
  PurchaseOrderApprovedEvent,
  PurchaseOrderReceivedEvent,
  PurchaseOrderClosedEvent,
} from '../events/PurchaseOrderEvents';

export interface PurchaseOrderProps {
  id?: number;
  orderNo?: string;
  status?: PurchaseStatus;
  supplierId: number;
  supplierName: string;
  supplierCode?: string;
  orderDate: string;
  deliveryDate?: string;
  currency?: string;
  exchangeRate?: number;
  taxRate?: number;
  totalAmount?: number;
  totalQuantity?: number;
  taxAmount?: number;
  grandTotal?: number;
  overReceiptTolerance?: number;
  paymentTerms?: string;
  deliveryAddress?: string;
  remark?: string;
  createBy?: number;
  auditBy?: number;
  auditTime?: string;
  lines: PurchaseOrderLineProps[];
  createTime?: string;
  updateTime?: string;
}

export class PurchaseOrder {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly orderNo: string,
    private _status: PurchaseOrderStatus,
    public readonly supplierId: number,
    public readonly supplierName: string,
    public readonly supplierCode: string,
    public readonly orderDate: string,
    public readonly deliveryDate: string,
    public readonly currency: string,
    public readonly exchangeRate: number,
    private _taxRate: number,
    private _totalAmount: number,
    private _totalQuantity: number,
    private _taxAmount: number,
    private _grandTotal: number,
    public readonly overReceiptTolerance: number,
    public readonly paymentTerms: string,
    public readonly deliveryAddress: string,
    public readonly remark: string,
    public readonly createBy: number | undefined,
    private _auditBy: number | undefined,
    private _auditTime: string | undefined,
    private _lines: PurchaseOrderLine[],
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: PurchaseOrderProps): PurchaseOrder {
    if (!props.supplierId || props.supplierId <= 0) {
      throw new DomainError('供应商不能为空');
    }
    if (!props.lines || props.lines.length === 0) {
      throw new DomainError('采购明细不能为空');
    }

    const lines = props.lines.map((line, index) =>
      PurchaseOrderLine.create({ ...line, lineNo: line.lineNo || index + 1 })
    );

    const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);
    const totalQuantity = lines.reduce((sum, l) => sum + l.orderQty, 0);
    const taxRate = props.taxRate || 13;
    const taxAmount = (totalAmount * taxRate) / 100;
    const grandTotal = totalAmount + taxAmount;

    const order = new PurchaseOrder(
      props.id,
      props.orderNo || '',
      PurchaseOrderStatus.draft(),
      props.supplierId,
      props.supplierName || '',
      props.supplierCode || '',
      props.orderDate || new Date().toISOString().slice(0, 10),
      props.deliveryDate || '',
      props.currency || 'CNY',
      props.exchangeRate || 1.0,
      taxRate,
      totalAmount,
      totalQuantity,
      taxAmount,
      grandTotal,
      props.overReceiptTolerance || 0,
      props.paymentTerms || '',
      props.deliveryAddress || '',
      props.remark || '',
      props.createBy,
      undefined,
      undefined,
      lines,
      props.createTime,
      props.updateTime
    );

    if (order.id) {
      order._domainEvents.push(
        new PurchaseOrderCreatedEvent({
          orderId: order.id,
          orderNo: order.orderNo,
          supplierId: order.supplierId,
          supplierName: order.supplierName,
          totalAmount: order.totalAmount,
          totalQuantity: order.totalQuantity,
        })
      );
    }

    return order;
  }

  static reconstitute(props: PurchaseOrderProps): PurchaseOrder {
    const lines = props.lines.map((line) => PurchaseOrderLine.reconstitute(line));

    const totalAmount =
      props.totalAmount !== undefined
        ? props.totalAmount
        : lines.reduce((sum, l) => sum + l.amount, 0);
    const totalQuantity =
      props.totalQuantity !== undefined
        ? props.totalQuantity
        : lines.reduce((sum, l) => sum + l.orderQty, 0);
    const taxRate = props.taxRate || 13;
    const taxAmount =
      props.taxAmount !== undefined ? props.taxAmount : (totalAmount * taxRate) / 100;
    const grandTotal = props.grandTotal !== undefined ? props.grandTotal : totalAmount + taxAmount;

    return new PurchaseOrder(
      props.id,
      props.orderNo || '',
      PurchaseOrderStatus.from(props.status || 'draft'),
      props.supplierId,
      props.supplierName || '',
      props.supplierCode || '',
      props.orderDate || '',
      props.deliveryDate || '',
      props.currency || 'CNY',
      props.exchangeRate || 1.0,
      taxRate,
      totalAmount,
      totalQuantity,
      taxAmount,
      grandTotal,
      props.overReceiptTolerance || 0,
      props.paymentTerms || '',
      props.deliveryAddress || '',
      props.remark || '',
      props.createBy,
      props.auditBy,
      props.auditTime,
      lines,
      props.createTime,
      props.updateTime
    );
  }

  get status(): PurchaseOrderStatus {
    return this._status;
  }
  get lines(): PurchaseOrderLine[] {
    return [...this._lines];
  }
  get totalAmount(): number {
    return this._totalAmount;
  }
  get totalQuantity(): number {
    return this._totalQuantity;
  }
  get taxRate(): number {
    return this._taxRate;
  }
  get taxAmount(): number {
    return this._taxAmount;
  }
  get grandTotal(): number {
    return this._grandTotal;
  }
  get auditBy(): number | undefined {
    return this._auditBy;
  }
  get auditTime(): string | undefined {
    return this._auditTime;
  }

  get totalReceivedQty(): number {
    return this._lines.reduce((sum, l) => sum + l.receivedQty, 0);
  }

  get isFullyReceived(): boolean {
    return this._lines.every((l) => l.isFullyReceived);
  }

  submit(): void {
    this._status = this._status.transitionTo('submitted');
    this._domainEvents.push(
      new PurchaseOrderSubmittedEvent({
        orderId: this.id!,
        orderNo: this.orderNo,
      })
    );
  }

  approve(auditBy: number): void {
    if (!this._status.canApprove()) {
      throw new DomainError(`当前状态"${this._status.label()}"不允许审核`);
    }
    this._status = this._status.transitionTo('approved');
    this._auditBy = auditBy;
    this._auditTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    this._domainEvents.push(
      new PurchaseOrderApprovedEvent({
        orderId: this.id!,
        orderNo: this.orderNo,
        supplierId: this.supplierId,
        supplierName: this.supplierName,
        lines: this._lines.map((l) => ({
          materialId: l.materialId,
          materialCode: l.materialCode,
          materialName: l.materialName,
          orderQty: l.orderQty,
          unitPrice: l.unitPrice,
          remainingQty: l.remainingQty,
        })),
        totalAmount: this._totalAmount,
        grandTotal: this._grandTotal,
      })
    );
  }

  receive(
    lineReceives: Array<{ lineNo: number; quantity: number; batchNo: string; warehouseId: number }>
  ): void {
    if (!this._status.canReceive()) {
      throw new DomainError(`当前状态"${this._status.label()}"不允许入库`);
    }

    const receivedItems: Array<{
      materialId: number;
      materialCode: string;
      materialName: string;
      quantity: number;
      unitPrice: number;
      batchNo: string;
      warehouseId: number;
    }> = [];

    for (const recv of lineReceives) {
      const line = this._lines.find((l) => l.lineNo === recv.lineNo);
      if (!line) {
        throw new DomainError(`行号${recv.lineNo}不存在`);
      }
      line.receive(recv.quantity);

      receivedItems.push({
        materialId: line.materialId,
        materialCode: line.materialCode,
        materialName: line.materialName,
        quantity: recv.quantity,
        unitPrice: line.unitPrice,
        batchNo: recv.batchNo,
        warehouseId: recv.warehouseId,
      });
    }

    if (this.isFullyReceived) {
      this._status = this._status.transitionTo('completed');
    } else {
      if (this._status.value === 'approved') {
        this._status = this._status.transitionTo('partially_received');
      }
    }

    const totalReceivedAmount = receivedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    this._domainEvents.push(
      new PurchaseOrderReceivedEvent({
        orderId: this.id!,
        orderNo: this.orderNo,
        supplierId: this.supplierId,
        supplierName: this.supplierName,
        receivedItems,
        totalReceivedAmount,
      })
    );
  }

  close(): void {
    this._status = this._status.transitionTo('closed');
    this._domainEvents.push(
      new PurchaseOrderClosedEvent({
        orderId: this.id!,
        orderNo: this.orderNo,
      })
    );
  }

  canEdit(): boolean {
    return this._status.canEdit();
  }

  canDelete(): boolean {
    return this._status.canDelete();
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
