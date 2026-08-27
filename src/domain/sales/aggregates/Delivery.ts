import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { DeliveryStatus, DeliveryStatusValue } from '../value-objects/DeliveryStatus';
import { DeliveryLine, DeliveryLineProps } from '../entities/DeliveryLine';
import {
  DeliveryCreatedEvent,
  DeliveryShippedEvent,
  DeliverySignedEvent,
  DeliveryCancelledEvent,
} from '../events/DeliveryEvents';

export interface DeliveryProps {
  id?: number;
  deliveryNo?: string;
  status?: DeliveryStatusValue;
  orderId: number;
  orderNo?: string;
  customerId: number;
  customerName?: string;
  warehouseId: number;
  deliveryDate?: string;
  logisticsCompany?: string;
  trackingNo?: string;
  totalAmount?: number;
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseTotalAmount?: number;
  lines: DeliveryLineProps[];
  remark?: string;
  createBy?: number;
  shipBy?: number;
  shipTime?: string;
  signBy?: number;
  signTime?: string;
  createTime?: string;
  updateTime?: string;
}

export class Delivery {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly deliveryNo: string,
    private _status: DeliveryStatus,
    public readonly orderId: number,
    public readonly orderNo: string,
    public readonly customerId: number,
    public readonly customerName: string,
    public readonly warehouseId: number,
    public readonly deliveryDate: string,
    private _logisticsCompany: string,
    private _trackingNo: string,
    private _totalAmount: number,
    public readonly currency: string,
    public readonly exchangeRate: number,
    public readonly baseCurrency: string,
    private _baseTotalAmount: number,
    private _lines: DeliveryLine[],
    public readonly remark: string,
    public readonly createBy: number | undefined,
    private _shipBy: number | undefined,
    private _shipTime: string | undefined,
    private _signBy: number | undefined,
    private _signTime: string | undefined,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: DeliveryProps): Delivery {
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
      throw new DomainError('发货明细不能为空');
    }

    const lines = props.lines.map((line, index) =>
      DeliveryLine.create({ ...line, lineNo: line.lineNo || index + 1 })
    );
    const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);
    const currency = props.currency || 'CNY';
    const exchangeRate = props.exchangeRate || 1.0;
    const baseCurrency = props.baseCurrency || 'CNY';
    const baseTotalAmount = props.baseTotalAmount ?? 0;

    const delivery = new Delivery(
      props.id,
      props.deliveryNo || '',
      DeliveryStatus.pending(),
      props.orderId,
      props.orderNo || '',
      props.customerId,
      props.customerName || '',
      props.warehouseId,
      props.deliveryDate || new Date().toISOString().slice(0, 10),
      props.logisticsCompany || '',
      props.trackingNo || '',
      Math.round(totalAmount * 100) / 100,
      currency,
      exchangeRate,
      baseCurrency,
      baseTotalAmount,
      lines,
      props.remark || '',
      props.createBy,
      undefined,
      undefined,
      undefined,
      undefined,
      props.createTime,
      props.updateTime
    );

    if (delivery.id) {
      delivery._domainEvents.push(
        new DeliveryCreatedEvent({
          deliveryId: delivery.id,
          deliveryNo: delivery.deliveryNo,
          orderId: delivery.orderId,
          customerId: delivery.customerId,
          warehouseId: delivery.warehouseId,
          currency: delivery.currency,
          exchangeRate: delivery.exchangeRate,
          baseCurrency: delivery.baseCurrency,
          baseTotalAmount: delivery.baseTotalAmount,
          lines: lines.map((l) => ({
            materialId: l.materialId,
            materialCode: l.materialCode,
            materialName: l.materialName,
            quantity: l.quantity,
            unit: l.unit,
            batchNo: l.batchNo,
            orderDetailId: l.orderDetailId,
          })),
        })
      );
    }
    return delivery;
  }

  static reconstitute(props: DeliveryProps): Delivery {
    const lines = props.lines.map((line) => DeliveryLine.reconstitute(line));
    const currency = props.currency || 'CNY';
    const exchangeRate = props.exchangeRate || 1.0;
    const baseCurrency = props.baseCurrency || 'CNY';
    const baseTotalAmount = props.baseTotalAmount ?? 0;
    return new Delivery(
      props.id,
      props.deliveryNo || '',
      DeliveryStatus.from(props.status || 1),
      props.orderId,
      props.orderNo || '',
      props.customerId,
      props.customerName || '',
      props.warehouseId,
      props.deliveryDate || '',
      props.logisticsCompany || '',
      props.trackingNo || '',
      props.totalAmount || 0,
      currency,
      exchangeRate,
      baseCurrency,
      baseTotalAmount,
      lines,
      props.remark || '',
      props.createBy,
      props.shipBy,
      props.shipTime,
      props.signBy,
      props.signTime,
      props.createTime,
      props.updateTime
    );
  }

  get status(): DeliveryStatus {
    return this._status;
  }
  get logisticsCompany(): string {
    return this._logisticsCompany;
  }
  get trackingNo(): string {
    return this._trackingNo;
  }
  get totalAmount(): number {
    return this._totalAmount;
  }
  get baseTotalAmount(): number {
    return this._baseTotalAmount;
  }
  get shipBy(): number | undefined {
    return this._shipBy;
  }
  get shipTime(): string | undefined {
    return this._shipTime;
  }
  get signBy(): number | undefined {
    return this._signBy;
  }
  get signTime(): string | undefined {
    return this._signTime;
  }
  get lines(): DeliveryLine[] {
    return [...this._lines];
  }

  ship(
    shipBy: number,
    logisticsCompany?: string,
    trackingNo?: string,
    inventoryCheck?: (materialId: number, warehouseId: number, qty: number) => boolean
  ): void {
    if (!this._status.canShip()) {
      throw new DomainError(`当前状态"${this._status.label}"不允许发货`);
    }
    if (!shipBy || shipBy <= 0) {
      throw new DomainError('发货人不能为空');
    }

    for (const line of this._lines) {
      if (inventoryCheck && !inventoryCheck(line.materialId, this.warehouseId, line.quantity)) {
        throw new DomainError(`物料${line.materialName}库存不足，无法发货`);
      }
    }

    this._status = this._status.transitionTo(2);
    this._shipBy = shipBy;
    this._shipTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (logisticsCompany) this._logisticsCompany = logisticsCompany;
    if (trackingNo) this._trackingNo = trackingNo;

    this._domainEvents.push(
      new DeliveryShippedEvent({
        deliveryId: this.id!,
        deliveryNo: this.deliveryNo,
        orderId: this.orderId,
        customerId: this.customerId,
        warehouseId: this.warehouseId,
        logisticsCompany: this._logisticsCompany,
        trackingNo: this._trackingNo,
        shippedItems: this._lines.map((l) => ({
          materialId: l.materialId,
          materialCode: l.materialCode,
          materialName: l.materialName,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          batchNo: l.batchNo,
          orderDetailId: l.orderDetailId,
        })),
        totalAmount: this._totalAmount,
      })
    );
  }

  sign(signBy?: number): void {
    if (!this._status.canSign()) {
      throw new DomainError(`当前状态"${this._status.label}"不允许签收`);
    }
    this._status = this._status.transitionTo(3);
    this._signBy = signBy;
    this._signTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    this._domainEvents.push(
      new DeliverySignedEvent({
        deliveryId: this.id!,
        deliveryNo: this.deliveryNo,
        orderId: this.orderId,
        customerId: this.customerId,
        signedBy: signBy,
      })
    );
  }

  cancel(reason?: string): void {
    if (!this._status.canCancel()) {
      throw new DomainError(`当前状态"${this._status.label}"不允许取消`);
    }
    this._status = this._status.transitionTo(9);

    this._domainEvents.push(
      new DeliveryCancelledEvent({
        deliveryId: this.id!,
        deliveryNo: this.deliveryNo,
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
