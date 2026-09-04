import { t } from '@/lib/server-translate';

import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import {
  PickOrderCreatedEvent,
  PickOrderApprovedEvent,
  PickOrderCancelledEvent,
} from '../events/PickOrderEvents';

export type PickOrderStatus = 'draft' | 'approved' | 'cancelled';

export interface PickOrderItemProps {
  id?: number;
  materialId: number;
  materialName: string;
  materialSpec: string;
  requiredQty: number;
  actualQty: number;
  batchNo?: string;
  unitCost: number;
  lineAmount: number;
  unit: string;
  remark?: string;
}

export interface PickOrderProps {
  id?: number;
  pickNo: string;
  workOrderId: number;
  warehouseId?: number;
  pickerName?: string;
  totalQty: number;
  status?: PickOrderStatus;
  remark?: string;
  createBy?: number;
  items: PickOrderItemProps[];
  createTime?: string;
  updateTime?: string;
}

export class PickOrderItem {
  constructor(
    public readonly id: number | undefined,
    public readonly materialId: number,
    public readonly materialName: string,
    public readonly materialSpec: string,
    public readonly requiredQty: number,
    public readonly actualQty: number,
    public readonly batchNo: string,
    public readonly unitCost: number,
    public readonly lineAmount: number,
    public readonly unit: string,
    public readonly remark: string
  ) {}

  static create(props: PickOrderItemProps): PickOrderItem {
  const ts = t;
    if (!props.materialId) throw new DomainError(ts('k_ed1q6x'));
    if (props.actualQty <= 0) throw new DomainError(ts('k_ee3zxj'));
    return new PickOrderItem(
      props.id,
      props.materialId,
      props.materialName || '',
      props.materialSpec || '',
      props.requiredQty || 0,
      props.actualQty,
      props.batchNo || '',
      props.unitCost || 0,
      props.lineAmount || 0,
      props.unit || 'pcs',
      props.remark || ''
    );
  }

  static reconstitute(props: PickOrderItemProps): PickOrderItem {
    return new PickOrderItem(
      props.id,
      props.materialId,
      props.materialName || '',
      props.materialSpec || '',
      props.requiredQty || 0,
      props.actualQty || 0,
      props.batchNo || '',
      props.unitCost || 0,
      props.lineAmount || 0,
      props.unit || 'pcs',
      props.remark || ''
    );
  }
}

export class PickOrder {
  private _domainEvents: DomainEvent[] = [];
  private _status: PickOrderStatus;

  private constructor(
    public readonly id: number | undefined,
    public readonly pickNo: string,
    public readonly workOrderId: number,
    public readonly warehouseId: number,
    public readonly pickerName: string,
    public readonly totalQty: number,
    public readonly remark: string,
    public readonly createBy: number | undefined,
    private _items: PickOrderItem[],
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {
    this._status = 'draft';
  }

  static create(props: PickOrderProps): PickOrder {
  const ts = t;
    if (!props.pickNo) throw new DomainError(ts('k_xv0v0q'));
    if (!props.workOrderId) throw new DomainError(ts('k_1emjamq'));
    if (!props.items || props.items.length === 0) throw new DomainError(ts('k_73rf7a'));

    const items = props.items.map((i) => PickOrderItem.create(i));
    const totalQty = items.reduce((s, i) => s + i.actualQty, 0);

    const order = new PickOrder(
      props.id,
      props.pickNo,
      props.workOrderId,
      props.warehouseId || 1,
      props.pickerName || '',
      totalQty,
      props.remark || '',
      props.createBy,
      items,
      props.createTime,
      props.updateTime
    );
    order._domainEvents.push(
      new PickOrderCreatedEvent({
        pickOrderId: 0,
        pickNo: props.pickNo,
        workOrderId: props.workOrderId,
        userId: props.createBy || 0,
      })
    );
    return order;
  }

  static reconstitute(props: PickOrderProps): PickOrder {
    const items = (props.items || []).map((i) => PickOrderItem.reconstitute(i));
    return new PickOrder(
      props.id,
      props.pickNo,
      props.workOrderId,
      props.warehouseId || 1,
      props.pickerName || '',
      props.totalQty || 0,
      props.remark || '',
      props.createBy,
      items,
      props.createTime,
      props.updateTime
    );
  }

  get status(): PickOrderStatus {
    return this._status;
  }
  get items(): PickOrderItem[] {
    return [...this._items];
  }

  approve(userId: number): void {
  const ts = t;
    if (this._status !== 'draft') throw new DomainError(ts('k_1jyq3ky'));
    this._status = 'approved';
    this._domainEvents.push(
      new PickOrderApprovedEvent({
        pickOrderId: this.id!,
        pickNo: this.pickNo,
        workOrderId: this.workOrderId,
        items: this._items.map((i) => ({
          materialId: i.materialId,
          quantity: i.actualQty,
          batchNo: i.batchNo,
          warehouseId: this.warehouseId,
        })),
        userId,
      })
    );
  }

  cancel(reason: string, userId: number): void {
  const ts = t;
    if (this._status !== 'draft' && this._status !== 'approved') {
      throw new DomainError(ts('k_1atqguz'));
    }
    this._status = 'cancelled';
    this._domainEvents.push(
      new PickOrderCancelledEvent({
        pickOrderId: this.id!,
        pickNo: this.pickNo,
        workOrderId: this.workOrderId,
        reason,
        userId,
      })
    );
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }
  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
