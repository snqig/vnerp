import { t } from '@/lib/server-translate';

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
  sourceType?: string;
  sourceOrderId?: number;
  orderType?: string;
  inboundDate?: string;
  remark?: string;
  operatorId?: number;
  items: InboundItemProps[];
  totalAmount?: number;
  totalQuantity?: number;
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseTotalAmount?: number;
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
    public readonly sourceType: string,
    public readonly sourceOrderId: number | undefined,
    public readonly orderType: string,
    public readonly inboundDate: string,
    public readonly remark: string,
    private _items: InboundItem[],
    private _totalAmount: Money,
    private _totalQuantity: number,
    public readonly currency: string,
    public readonly exchangeRate: number,
    public readonly baseCurrency: string,
    private _baseTotalAmount: number,
    private _inspectionStatus: number,
    private _financePosted: boolean,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: InboundOrderProps): InboundOrder {
  const ts = t;
    if (!props.warehouseId) {
      throw new DomainError(ts('k_1t9r8nc'));
    }
    if (!props.items || props.items.length === 0) {
      throw new DomainError(ts('k_5wfvaq'));
    }

    const sourceType = props.sourceType || (props.poId ? 'purchase_order' : '');
    if (sourceType === 'purchase_order') {
      if (!props.poId) throw new DomainError(ts('k_15fxe1r'));
      if (!props.poNo) throw new DomainError(ts('k_xkrfw6'));
      if (!props.supplierId) throw new DomainError(ts('k_119kr33'));
    }

    const items = props.items.map((item) => InboundItem.create(item));
    const totalAmount = items.reduce(
      (sum, item) => sum.add(Money.create(item.totalPrice)),
      Money.zero()
    );
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const currency = props.currency || 'CNY';
    const exchangeRate = props.exchangeRate || 1.0;
    const baseCurrency = props.baseCurrency || 'CNY';
    const baseTotalAmount = props.baseTotalAmount ?? 0;

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
      sourceType,
      props.sourceOrderId,
      props.orderType || 'purchase',
      props.inboundDate || new Date().toISOString().slice(0, 10),
      props.remark || '',
      items,
      totalAmount,
      totalQuantity,
      currency,
      exchangeRate,
      baseCurrency,
      baseTotalAmount,
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
    const currency = props.currency || 'CNY';
    const exchangeRate = props.exchangeRate || 1.0;
    const baseCurrency = props.baseCurrency || 'CNY';
    const baseTotalAmount = props.baseTotalAmount ?? 0;

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
      props.sourceType || '',
      props.sourceOrderId,
      props.orderType || 'purchase',
      props.inboundDate || '',
      props.remark || '',
      items,
      totalAmount,
      totalQuantity,
      currency,
      exchangeRate,
      baseCurrency,
      baseTotalAmount,
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

  get baseTotalAmount(): number {
    return this._baseTotalAmount;
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
  const ts = t;
    if (this._items.length === 0) {
      throw new DomainError(ts('k_zekht2'));
    }

    // 仅在质检显式判定为「不合格」(2) 时禁止审核。
    // 严禁改回 `!== 3`：inspection_status=3 只由本方法在下方（transitionTo 之后）设置，
    // 而质检模块最多只能把它置为 1(检验中)/2(不合格)，永远写不出 3。
    // 用 `!== 3` 会导致「必须已通过质检才能审核、而只有审核才会置为已通过」的死锁，
    // 使所有入库单都无法审核，下游库存/应付/采购收货事件链全部不触发。
    if (this._inspectionStatus === 2) {
      throw new DomainError(ts('k_inbound_approve_requires_qc'));
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
        poId: this.poId,
        items: this._items.map((item) => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          batchNo: item.batchNo,
          purchaseOrderItemId: item.purchaseOrderItemId,
          purchaseOrderLineNo: item.purchaseOrderLineNo,
        })),
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
        poId: this.poId,
        items: this._items.map((item) => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          batchNo: item.batchNo,
          purchaseOrderItemId: item.purchaseOrderItemId,
          purchaseOrderLineNo: item.purchaseOrderLineNo,
        })),
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
