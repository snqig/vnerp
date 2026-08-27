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
    if (!props.finishNo) throw new DomainError('完工单号不能为空');
    if (!props.workOrderId) throw new DomainError('关联工单不能为空');
    if (!props.warehouseId) throw new DomainError('入库仓库不能为空');
    if (props.qualifiedQty <= 0) throw new DomainError('合格数量必须大于0');

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
    if (this._status !== 'draft') throw new DomainError('只有草稿状态的完工单才能审核');
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
    if (this._status !== 'draft' && this._status !== 'approved') {
      throw new DomainError('当前状态不允许作废');
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
