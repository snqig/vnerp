import { t } from '@/lib/server-translate';

import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import {
  FinishOrderCreatedEvent,
  FinishOrderApprovedEvent,
  FinishOrderCancelledEvent,
} from '../events/FinishOrderEvents';

export type FinishOrderStatus = 'draft' | 'approved' | 'cancelled';

export interface FinishOrderProps {
  id?: number;
  finishNo: string;
  workOrderId: number;
  warehouseId: number;
  qualifiedQty: number;
  defectiveQty: number;
  status?: FinishOrderStatus;
  createBy?: number;
  createTime?: string;
  updateTime?: string;
}

export class FinishOrder {
  private _domainEvents: DomainEvent[] = [];
  private _status: FinishOrderStatus;

  private constructor(
    public readonly id: number | undefined,
    public readonly finishNo: string,
    public readonly workOrderId: number,
    public readonly warehouseId: number,
    public readonly qualifiedQty: number,
    public readonly defectiveQty: number,
    public readonly createBy: number | undefined,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {
    this._status = 'draft';
  }

  static create(props: FinishOrderProps): FinishOrder {
  const ts = t;
    if (!props.finishNo) throw new DomainError(ts('k_kbfvmw'));
    if (!props.workOrderId) throw new DomainError(ts('k_1emjamq'));
    if (!props.warehouseId) throw new DomainError(ts('k_1wa8aih'));
    if (props.qualifiedQty <= 0) throw new DomainError(ts('k_e6ila3'));

    const order = new FinishOrder(
      props.id,
      props.finishNo,
      props.workOrderId,
      props.warehouseId,
      props.qualifiedQty || 0,
      props.defectiveQty || 0,
      props.createBy,
      props.createTime,
      props.updateTime
    );
    order._domainEvents.push(
      new FinishOrderCreatedEvent({
        finishOrderId: 0,
        finishNo: props.finishNo,
        workOrderId: props.workOrderId,
        warehouseId: props.warehouseId,
        qualifiedQty: props.qualifiedQty || 0,
        userId: props.createBy || 0,
      })
    );
    return order;
  }

  static reconstitute(props: FinishOrderProps): FinishOrder {
    return new FinishOrder(
      props.id,
      props.finishNo,
      props.workOrderId,
      props.warehouseId,
      props.qualifiedQty || 0,
      props.defectiveQty || 0,
      props.createBy,
      props.createTime,
      props.updateTime
    );
  }

  get status(): FinishOrderStatus {
    return this._status;
  }

  approve(userId: number, workOrderNo: string, productName: string): void {
  const ts = t;
    if (this._status !== 'draft') throw new DomainError(ts('k_107utp0'));
    this._status = 'approved';
    this._domainEvents.push(
      new FinishOrderApprovedEvent({
        finishOrderId: this.id!,
        finishNo: this.finishNo,
        workOrderId: this.workOrderId,
        workOrderNo,
        productName,
        qualifiedQty: this.qualifiedQty,
        defectiveQty: this.defectiveQty,
        warehouseId: this.warehouseId,
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
      new FinishOrderCancelledEvent({
        finishOrderId: this.id!,
        finishNo: this.finishNo,
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
