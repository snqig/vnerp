import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { OrderStatus, InboundStatus } from '../value-objects/OrderStatus';
import { Money } from '../../shared/value-objects/Money';
import { InboundItem, InboundItemProps } from '../entities/InboundItem';
import {
  InboundOrderApprovedEvent,
  InboundOrderCancelledEvent,
  InboundOrderCreatedEvent,
  InboundOrderSubmittedEvent,
} from '../events/InboundOrderEvents';

export interface InboundOrderProps {
  id?: number;
  orderNo?: string;
  status?: InboundStatus;
  warehouseId: number;
  warehouseName?: string;
  supplierName: string;
  orderType?: string;
  inboundDate?: string;
  remark?: string;
  items: InboundItemProps[];
  totalAmount?: number;
  totalQuantity?: number;
  inspectionStatus?: number;
  financePosted?: boolean;
  createTime?: string;
  updateTime?: string;
}

export class InboundOrder {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly orderNo: string,
    private _status: OrderStatus,
    public readonly warehouseId: number,
    public readonly warehouseName: string,
    public readonly supplierName: string,
    public readonly orderType: string,
    public readonly inboundDate: string,
    public readonly remark: string,
    private _items: InboundItem[],
    private _totalAmount: Money,
    private _totalQuantity: number,
    private _inspectionStatus: number,
    private _financePosted: boolean,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: InboundOrderProps): InboundOrder {
    if (!props.warehouseId) {
      throw new DomainError('仓库ID不能为空');
    }
    if (!props.items || props.items.length === 0) {
      throw new DomainError('入库项不能为空');
    }

    const items = props.items.map(item => InboundItem.create(item));
    const totalAmount = items.reduce(
      (sum, item) => sum.add(Money.create(item.totalPrice)),
      Money.zero()
    );
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const order = new InboundOrder(
      props.id,
      props.orderNo || '',
      OrderStatus.draft(),
      props.warehouseId,
      props.warehouseName || '',
      props.supplierName || '',
      props.orderType || 'purchase',
      props.inboundDate || new Date().toISOString().slice(0, 10),
      props.remark || '',
      items,
      totalAmount,
      totalQuantity,
      0,
      false,
      props.createTime,
      props.updateTime
    );

    if (order.id) {
      order._domainEvents.push(
        new InboundOrderCreatedEvent({
          orderId: order.id,
          orderNo: order.orderNo,
          warehouseId: order.warehouseId,
          supplierName: order.supplierName,
        })
      );
    }

    return order;
  }

  static reconstitute(props: InboundOrderProps): InboundOrder {
    const items = props.items.map(item => InboundItem.reconstitute(item));
    const totalAmount = props.totalAmount !== undefined
      ? Money.create(props.totalAmount)
      : items.reduce((sum, item) => sum.add(Money.create(item.totalPrice)), Money.zero());
    const totalQuantity = props.totalQuantity !== undefined
      ? props.totalQuantity
      : items.reduce((sum, item) => sum + item.quantity, 0);

    return new InboundOrder(
      props.id,
      props.orderNo || '',
      OrderStatus.from(props.status || 'draft'),
      props.warehouseId,
      props.warehouseName || '',
      props.supplierName || '',
      props.orderType || 'purchase',
      props.inboundDate || '',
      props.remark || '',
      items,
      totalAmount,
      totalQuantity,
      props.inspectionStatus || 0,
      props.financePosted || false,
      props.createTime,
      props.updateTime
    );
  }

  get status(): OrderStatus {
    return this._status;
  }

  get items(): InboundItem[] {
    return [...this._items];
  }

  get totalAmount(): Money {
    return this._totalAmount;
  }

  get totalQuantity(): number {
    return this._totalQuantity;
  }

  get inspectionStatus(): number {
    return this._inspectionStatus;
  }

  get financePosted(): boolean {
    return this._financePosted;
  }

  submit(): void {
    this._status = this._status.transitionTo('pending');
    this._domainEvents.push(
      new InboundOrderSubmittedEvent({
        orderId: this.id!,
        orderNo: this.orderNo,
      })
    );
  }

  approve(warehouseName: string): void {
    if (this._items.length === 0) {
      throw new DomainError('入库单不能为空');
    }

    this._status = this._status.transitionTo('completed');
    this._inspectionStatus = 3;
    this._financePosted = true;

    this._domainEvents.push(
      new InboundOrderApprovedEvent({
        orderId: this.id!,
        orderNo: this.orderNo,
        warehouseId: this.warehouseId,
        warehouseName,
        supplierName: this.supplierName,
        items: this._items.map(item => ({
          id: item.id,
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          materialSpec: item.materialSpec,
          batchNo: item.batchNo,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          produceDate: item.produceDate,
        })),
        totalAmount: this._totalAmount.amount,
        inboundDate: this.inboundDate,
      })
    );
  }

  cancel(): void {
    this._status = this._status.transitionTo('cancelled');
    this._domainEvents.push(
      new InboundOrderCancelledEvent({
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
