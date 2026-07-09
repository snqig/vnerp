import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { OrderStatus, InboundStatus } from '../value-objects/OrderStatus';
import { Money } from '../../shared/value-objects/Money';
import { InboundItem, InboundItemProps } from '../entities/InboundItem';
import {
  InboundOrderApprovedEvent,
  InboundOrderCancelledEvent,
  InboundOrderCreatedEvent,
  InboundOrderSubmittedEvent,
  InboundOrderUnapprovedEvent,
} from '../events/InboundOrderEvents';

export interface InboundOrderProps {
  id?: number;
  orderNo?: string;
  status?: InboundStatus;
  warehouseId: number;
  warehouseName?: string;
  supplierName: string;
  supplierId?: number;
  poId?: number;
  poNo?: string;
  orderType?: string;
  inboundDate?: string;
  remark?: string;
  operatorId?: number;
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
    public readonly supplierId: number | undefined,
    public readonly poId: number | undefined,
    public readonly poNo: string,
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

    const items = props.items.map((item) => InboundItem.create(item));
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
      props.supplierId,
      props.poId,
      props.poNo || '',
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
          inboundId: order.id,
          inboundNo: order.orderNo,
          warehouseId: order.warehouseId,
          supplierId: props.supplierId || 0,
          poId: props.poId,
          poNo: props.poNo,
        })
      );
    }

    return order;
  }

  static reconstitute(props: InboundOrderProps): InboundOrder {
    const items = props.items.map((item) => InboundItem.reconstitute(item));
    const totalAmount =
      props.totalAmount !== undefined
        ? Money.create(props.totalAmount)
        : items.reduce((sum, item) => sum.add(Money.create(item.totalPrice)), Money.zero());
    const totalQuantity =
      props.totalQuantity !== undefined
        ? props.totalQuantity
        : items.reduce((sum, item) => sum + item.quantity, 0);

    return new InboundOrder(
      props.id,
      props.orderNo || '',
      OrderStatus.from(props.status || 'draft'),
      props.warehouseId,
      props.warehouseName || '',
      props.supplierName || '',
      props.supplierId,
      props.poId,
      props.poNo || '',
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
        inboundId: this.id!,
        inboundNo: this.orderNo,
        warehouseId: this.warehouseId,
        supplierId: this.supplierId || 0,
        totalAmount: this._totalAmount.amount,
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
        inboundId: this.id!,
        inboundNo: this.orderNo,
        warehouseId: this.warehouseId,
        warehouseName,
        supplierId: this.supplierId || 0,
        supplierName: this.supplierName,
        poId: this.poId,
        poNo: this.poNo,
        items: this._items.map((item) => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          batchNo: item.batchNo,
        })),
        totalAmount: this._totalAmount.amount,
      })
    );
  }

  cancel(): void {
    this._status = this._status.transitionTo('cancelled');
    this._domainEvents.push(
      new InboundOrderCancelledEvent({
        inboundId: this.id!,
        inboundNo: this.orderNo,
        reason: '',
      })
    );
  }

  unapprove(): void {
    this._status = this._status.transitionTo('pending');
    this._inspectionStatus = 0;
    this._financePosted = false;
    this._domainEvents.push(
      new InboundOrderUnapprovedEvent({
        inboundId: this.id!,
        inboundNo: this.orderNo,
        reason: '',
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
