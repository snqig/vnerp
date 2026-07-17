import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { SalesOrderStatus, SalesStatus } from '../value-objects/SalesOrderStatus';
import { SalesOrderLine, SalesOrderLineProps } from '../entities/SalesOrderLine';
import { roundAmount } from '@/lib/decimal-utils';
import {
  SalesOrderCreatedEvent,
  SalesOrderSubmittedEvent,
  SalesOrderApprovedEvent,
  SalesOrderShippedEvent,
  SalesOrderClosedEvent,
} from '../events/SalesOrderEvents';

export interface SalesOrderProps {
  id?: number;
  orderNo?: string;
  status?: SalesStatus;
  customerId: number;
  customerName: string;
  orderDate: string;
  deliveryDate?: string;
  totalAmount?: number;
  totalQuantity?: number;
  taxRate?: number;
  taxAmount?: number;
  totalWithTax?: number;
  discountAmount?: number;
  discountRate?: number;
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseTotalAmount?: number;
  baseTaxAmount?: number;
  baseGrandTotal?: number;
  paymentTerms?: string;
  warehouseId?: number;
  remark?: string;
  createBy?: number;
  auditBy?: number;
  auditTime?: string;
  lines: SalesOrderLineProps[];
  createTime?: string;
  updateTime?: string;
}

export class SalesOrder {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly orderNo: string,
    private _status: SalesOrderStatus,
    public readonly customerId: number,
    public readonly customerName: string,
    public readonly orderDate: string,
    public readonly deliveryDate: string,
    private _totalAmount: number,
    private _totalQuantity: number,
    private _taxRate: number,
    private _taxAmount: number,
    private _totalWithTax: number,
    private _discountAmount: number,
    private _discountRate: number,
    public readonly currency: string,
    public readonly exchangeRate: number,
    public readonly baseCurrency: string,
    private _baseTotalAmount: number,
    private _baseTaxAmount: number,
    private _baseGrandTotal: number,
    public readonly paymentTerms: string,
    public readonly warehouseId: number,
    public readonly remark: string,
    public readonly createBy: number | undefined,
    private _auditBy: number | undefined,
    private _auditTime: string | undefined,
    private _lines: SalesOrderLine[],
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: SalesOrderProps): SalesOrder {
    if (!props.customerId || props.customerId <= 0) {
      throw new DomainError('客户不能为空');
    }
    if (!props.lines || props.lines.length === 0) {
      throw new DomainError('销售明细不能为空');
    }

    const lines = props.lines.map((line, index) =>
      SalesOrderLine.create({ ...line, lineNo: line.lineNo || index + 1 })
    );
    const totalAmount = roundAmount(lines.reduce((sum, l) => sum + l.amount, 0));
    const totalQuantity = lines.reduce((sum, l) => sum + l.orderQty, 0);
    const taxRate = props.taxRate ?? 0;
    const discountRate = props.discountRate ?? 0;
    const discountAmount = props.discountAmount ?? roundAmount((totalAmount * discountRate) / 100);
    const taxableAmount = roundAmount(totalAmount - discountAmount);
    const taxAmount = props.taxAmount ?? roundAmount((taxableAmount * taxRate) / 100);
    const totalWithTax = roundAmount(taxableAmount + taxAmount);
    const exchangeRate = props.exchangeRate || 1.0;
    const baseCurrency = props.baseCurrency || 'CNY';
    const baseTotalAmount = props.baseTotalAmount ?? 0;
    const baseTaxAmount = props.baseTaxAmount ?? 0;
    const baseGrandTotal = props.baseGrandTotal ?? 0;

    const order = new SalesOrder(
      props.id,
      props.orderNo || '',
      SalesOrderStatus.draft(),
      props.customerId,
      props.customerName || '',
      props.orderDate || new Date().toISOString().slice(0, 10),
      props.deliveryDate || '',
      totalAmount,
      totalQuantity,
      taxRate,
      taxAmount,
      totalWithTax,
      discountAmount,
      discountRate,
      props.currency || 'CNY',
      exchangeRate,
      baseCurrency,
      baseTotalAmount,
      baseTaxAmount,
      baseGrandTotal,
      props.paymentTerms || '',
      props.warehouseId || 1,
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
        new SalesOrderCreatedEvent({
          orderId: order.id,
          orderNo: order.orderNo,
          customerId: order.customerId,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          currency: order.currency,
          exchangeRate: order.exchangeRate,
          baseCurrency: order.baseCurrency,
          baseTotalAmount: order.baseTotalAmount,
          baseTaxAmount: order.baseTaxAmount,
          baseGrandTotal: order.baseGrandTotal,
        })
      );
    }
    return order;
  }

  static reconstitute(props: SalesOrderProps): SalesOrder {
    const lines = props.lines.map((line) => SalesOrderLine.reconstitute(line));
    const exchangeRate = props.exchangeRate || 1.0;
    const baseCurrency = props.baseCurrency || 'CNY';
    const baseTotalAmount = props.baseTotalAmount ?? 0;
    const baseTaxAmount = props.baseTaxAmount ?? 0;
    const baseGrandTotal = props.baseGrandTotal ?? 0;
    return new SalesOrder(
      props.id,
      props.orderNo || '',
      SalesOrderStatus.from(props.status || 'draft'),
      props.customerId,
      props.customerName || '',
      props.orderDate || '',
      props.deliveryDate || '',
      props.totalAmount || 0,
      props.totalQuantity || 0,
      props.taxRate || 0,
      props.taxAmount || 0,
      props.totalWithTax || props.totalAmount || 0,
      props.discountAmount || 0,
      props.discountRate || 0,
      props.currency || 'CNY',
      exchangeRate,
      baseCurrency,
      baseTotalAmount,
      baseTaxAmount,
      baseGrandTotal,
      props.paymentTerms || '',
      props.warehouseId || 1,
      props.remark || '',
      props.createBy,
      props.auditBy,
      props.auditTime,
      lines,
      props.createTime,
      props.updateTime
    );
  }

  get status(): SalesOrderStatus {
    return this._status;
  }
  get lines(): SalesOrderLine[] {
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
  get totalWithTax(): number {
    return this._totalWithTax;
  }
  get discountAmount(): number {
    return this._discountAmount;
  }
  get discountRate(): number {
    return this._discountRate;
  }
  get baseTotalAmount(): number {
    return this._baseTotalAmount;
  }
  get baseTaxAmount(): number {
    return this._baseTaxAmount;
  }
  get baseGrandTotal(): number {
    return this._baseGrandTotal;
  }
  get auditBy(): number | undefined {
    return this._auditBy;
  }
  get auditTime(): string | undefined {
    return this._auditTime;
  }

  get totalShippedQty(): number {
    return this._lines.reduce((sum, l) => sum + l.shippedQty, 0);
  }
  get isFullyShipped(): boolean {
    return this._lines.every((l) => l.isFullyShipped);
  }

  submit(): void {
    this._status = this._status.transitionTo('submitted');
    this._domainEvents.push(
      new SalesOrderSubmittedEvent({ orderId: this.id!, orderNo: this.orderNo })
    );
  }

  approve(auditBy: number): void {
    if (!this._status.canApprove())
      throw new DomainError(`当前状态"${this._status.label()}"不允许审核`);
    this._status = this._status.transitionTo('approved');
    this._auditBy = auditBy;
    this._auditTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    this._domainEvents.push(
      new SalesOrderApprovedEvent({
        orderId: this.id!,
        orderNo: this.orderNo,
        customerId: this.customerId,
        customerName: this.customerName,
        lines: this._lines.map((l) => ({
          materialId: l.materialId,
          materialCode: l.materialCode,
          materialName: l.materialName,
          orderQty: l.orderQty,
          unitPrice: l.unitPrice,
          remainingQty: l.remainingQty,
        })),
        totalAmount: this._totalAmount,
      })
    );
  }

  ship(
    lineShipments: Array<{
      lineNo: number;
      quantity: number;
      batchNo: string;
      warehouseId: number;
    }>,
    inventoryCheck?: (materialId: number, warehouseId: number, qty: number) => boolean
  ): void {
    if (!this._status.canShip())
      throw new DomainError(`当前状态"${this._status.label()}"不允许出库`);

    const shippedItems: Array<{
      materialId: number;
      materialCode: string;
      materialName: string;
      quantity: number;
      unitPrice: number;
      batchNo: string;
      warehouseId: number;
    }> = [];

    for (const ship of lineShipments) {
      const line = this._lines.find((l) => l.lineNo === ship.lineNo);
      if (!line) throw new DomainError(`行号${ship.lineNo}不存在`);

      if (inventoryCheck && !inventoryCheck(line.materialId, ship.warehouseId, ship.quantity)) {
        throw new DomainError(`物料${line.materialName}库存不足，无法出库`);
      }

      line.ship(ship.quantity);
      shippedItems.push({
        materialId: line.materialId,
        materialCode: line.materialCode,
        materialName: line.materialName,
        quantity: ship.quantity,
        unitPrice: line.unitPrice,
        batchNo: ship.batchNo,
        warehouseId: ship.warehouseId,
      });
    }

    if (this.isFullyShipped) {
      this._status = this._status.transitionTo('completed');
    } else if (this._status.value === 'approved') {
      this._status = this._status.transitionTo('partially_shipped');
    }

    const totalShippedAmount = shippedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    this._domainEvents.push(
      new SalesOrderShippedEvent({
        orderId: this.id!,
        orderNo: this.orderNo,
        customerId: this.customerId,
        customerName: this.customerName,
        shippedItems,
        totalShippedAmount,
      })
    );
  }

  close(): void {
    this._status = this._status.transitionTo('closed');
    this._domainEvents.push(
      new SalesOrderClosedEvent({ orderId: this.id!, orderNo: this.orderNo })
    );
  }

  /**
   * 作废：销售单从 draft/submitted/approved/partially_shipped 流转到 voided 终态。
   * 已完成（completed）状态不可直接作废（需要先 close 再处理后续回滚）。
   * 复用 SalesOrderClosedEvent 触发清理流程（与 T403 作废全链路回滚配套）。
   */
  void(): void {
    if (!this._status.canVoid()) {
      throw new DomainError(`当前状态"${this._status.label()}"不允许作废`);
    }
    this._status = this._status.transitionTo('voided');
    this._domainEvents.push(
      new SalesOrderClosedEvent({ orderId: this.id!, orderNo: this.orderNo })
    );
  }

  canEdit(): boolean {
    return this._status.canEdit();
  }
  canDelete(): boolean {
    return this._status.canDelete();
  }
  canVoid(): boolean {
    return this._status.canVoid();
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }
  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
