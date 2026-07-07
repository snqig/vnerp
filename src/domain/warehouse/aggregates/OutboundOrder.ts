import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { OrderStatus } from '../value-objects/OrderStatus';
import { Money } from '../../shared/value-objects/Money';
import { OutboundItem, OutboundItemProps } from '../entities/OutboundItem';
import {
  OutboundOrderApprovedEvent,
  OutboundOrderCancelledEvent,
  OutboundOrderCreatedEvent,
  OutboundOrderSubmittedEvent,
} from '../events/OutboundOrderEvents';

export interface OutboundOrderProps {
  id?: number;
  orderNo?: string;
  status?: string;
  warehouseId: number;
  warehouseName?: string;
  outboundType?: string;
  orderDate?: string;
  customerId?: number;
  customerName?: string;
  workOrderId?: number;
  workOrderNo?: string;
  operatorId?: number;
  operatorName?: string;
  remark?: string;
  items: OutboundItemProps[];
  totalAmount?: number;
  totalQuantity?: number;
  financePosted?: boolean;
  auditStatus?: number;
  auditorId?: number;
  auditorName?: string;
  auditTime?: string;
  auditRemark?: string;
  createTime?: string;
  updateTime?: string;
}

export class OutboundOrder {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly orderNo: string,
    private _status: OrderStatus,
    public readonly warehouseId: number,
    public readonly warehouseName: string,
    public readonly outboundType: string,
    public readonly orderDate: string,
    public readonly customerId: number | undefined,
    public readonly customerName: string,
    public readonly workOrderId: number | undefined,
    public readonly workOrderNo: string,
    public readonly operatorId: number | undefined,
    public readonly operatorName: string,
    private _items: OutboundItem[],
    private _totalAmount: Money,
    private _totalQuantity: number,
    private _financePosted: boolean,
    private _auditStatus: number,
    private _auditorId: number | undefined,
    private _auditorName: string,
    private _auditTime: string,
    private _auditRemark: string,
    public readonly remark: string,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: OutboundOrderProps): OutboundOrder {
    if (!props.warehouseId) {
      throw new DomainError('仓库ID不能为空');
    }
    if (!props.items || props.items.length === 0) {
      throw new DomainError('出库项不能为空');
    }

    const items = props.items.map((item) => OutboundItem.create(item));
    const totalAmount = items.reduce(
      (sum, item) => sum.add(Money.create(item.totalPrice)),
      Money.zero()
    );
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const order = new OutboundOrder(
      props.id,
      props.orderNo || '',
      OrderStatus.draft(),
      props.warehouseId,
      props.warehouseName || '',
      props.outboundType || 'production',
      props.orderDate || new Date().toISOString().slice(0, 10),
      props.customerId,
      props.customerName || '',
      props.workOrderId,
      props.workOrderNo || '',
      props.operatorId,
      props.operatorName || '',
      items,
      totalAmount,
      totalQuantity,
      false,
      0,
      undefined,
      '',
      '',
      '',
      props.remark || '',
      props.createTime,
      props.updateTime
    );

    if (order.id) {
      order._domainEvents.push(
        new OutboundOrderCreatedEvent({
          outboundId: order.id,
          outboundNo: order.orderNo,
          warehouseId: order.warehouseId,
          outboundType: order.outboundType,
          customerId: order.customerId,
          workOrderId: order.workOrderId,
        })
      );
    }

    return order;
  }

  static reconstitute(props: OutboundOrderProps): OutboundOrder {
    const items = props.items.map((item) => OutboundItem.reconstitute(item));
    const totalAmount =
      props.totalAmount !== undefined
        ? Money.create(props.totalAmount)
        : items.reduce((sum, item) => sum.add(Money.create(item.totalPrice)), Money.zero());
    const totalQuantity =
      props.totalQuantity !== undefined
        ? props.totalQuantity
        : items.reduce((sum, item) => sum + item.quantity, 0);

    return new OutboundOrder(
      props.id,
      props.orderNo || '',
      OrderStatus.from(props.status || 'draft'),
      props.warehouseId,
      props.warehouseName || '',
      props.outboundType || 'production',
      props.orderDate || '',
      props.customerId,
      props.customerName || '',
      props.workOrderId,
      props.workOrderNo || '',
      props.operatorId,
      props.operatorName || '',
      items,
      totalAmount,
      totalQuantity,
      props.financePosted || false,
      props.auditStatus || 0,
      props.auditorId,
      props.auditorName || '',
      props.auditTime || '',
      props.auditRemark || '',
      props.remark || '',
      props.createTime,
      props.updateTime
    );
  }

  get status(): OrderStatus {
    return this._status;
  }

  get items(): OutboundItem[] {
    return [...this._items];
  }

  get totalAmount(): Money {
    return this._totalAmount;
  }

  get totalQuantity(): number {
    return this._totalQuantity;
  }

  get financePosted(): boolean {
    return this._financePosted;
  }

  get auditStatus(): number {
    return this._auditStatus;
  }

  get auditorId(): number | undefined {
    return this._auditorId;
  }

  get auditorName(): string {
    return this._auditorName;
  }

  get auditTime(): string {
    return this._auditTime;
  }

  get auditRemark(): string {
    return this._auditRemark;
  }

  submit(): void {
    this._status = this._status.transitionTo('pending');
    this._domainEvents.push(
      new OutboundOrderSubmittedEvent({
        outboundId: this.id!,
        outboundNo: this.orderNo,
        warehouseId: this.warehouseId,
        totalAmount: this._totalAmount.amount,
        totalQuantity: this._totalQuantity,
      })
    );
  }

  approve(warehouseName: string, auditorId?: number, auditorName?: string): void {
    if (this._items.length === 0) {
      throw new DomainError('出库单不能为空');
    }

    this._status = this._status.transitionTo('completed');
    this._auditStatus = 1; // 通过
    this._financePosted = true;
    this._auditorId = auditorId;
    this._auditorName = auditorName || '';
    this._auditTime = new Date().toISOString();

    this._domainEvents.push(
      new OutboundOrderApprovedEvent({
        outboundId: this.id!,
        outboundNo: this.orderNo,
        warehouseId: this.warehouseId,
        warehouseName,
        customerId: this.customerId,
        customerName: this.customerName,
        items: this._items.map((item) => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          batchNo: item.batchNo,
          batchId: item.batchId,
        })),
        totalAmount: this._totalAmount.amount,
      })
    );
  }

  cancel(reason: string = ''): void {
    this._status = this._status.transitionTo('cancelled');
    this._domainEvents.push(
      new OutboundOrderCancelledEvent({
        outboundId: this.id!,
        outboundNo: this.orderNo,
        reason,
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
