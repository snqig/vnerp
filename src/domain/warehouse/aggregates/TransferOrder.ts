import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { TransferStatus, TransferStatusEnum } from '../value-objects/TransferStatus';
import { Money } from '../../shared/value-objects/Money';
import { TransferItem, TransferItemProps } from '../entities/TransferItem';
import {
  TransferOrderApprovedEvent,
  TransferOrderCancelledEvent,
  TransferOrderCreatedEvent,
  TransferOrderReceivedEvent,
  TransferOrderShippedEvent,
  TransferOrderSubmittedEvent,
} from '../events/TransferOrderEvents';

export interface TransferOrderProps {
  id?: number;
  transferNo?: string;
  status?: number;
  type: number; // 1-库位调拨, 2-仓库调拨
  fromWarehouseId: number;
  toWarehouseId: number;
  fromLocation?: string;
  toLocation?: string;
  applicantId?: number;
  applicantName?: string;
  approverId?: number;
  approverName?: string;
  operatorId?: number;
  operatorName?: string;
  outTime?: string;
  inTime?: string;
  remark?: string;
  items: TransferItemProps[];
  totalQuantity?: number;
  totalAmount?: number;
  version?: number;
  createTime?: string;
  updateTime?: string;
}

export class TransferOrder {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly transferNo: string,
    private _status: TransferStatus,
    public readonly type: number,
    public readonly fromWarehouseId: number,
    public readonly toWarehouseId: number,
    public readonly fromLocation: string,
    public readonly toLocation: string,
    public readonly applicantId: number | undefined,
    public readonly applicantName: string,
    private _approverId: number | undefined,
    private _approverName: string,
    public readonly operatorId: number | undefined,
    public readonly operatorName: string,
    private _outTime: string,
    private _inTime: string,
    private _items: TransferItem[],
    private _totalQuantity: number,
    private _totalAmount: Money,
    public readonly version: number,
    public readonly remark: string,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: TransferOrderProps): TransferOrder {
    if (!props.fromWarehouseId || !props.toWarehouseId) {
      throw new DomainError('源仓库和目标仓库不能为空');
    }
    if (props.fromWarehouseId === props.toWarehouseId) {
      throw new DomainError('源仓库和目标仓库不能相同');
    }
    if (!props.items || props.items.length === 0) {
      throw new DomainError('调拨项不能为空');
    }

    const items = props.items.map((item) => TransferItem.create(item));
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce(
      (sum, item) => sum.add(Money.create(item.totalPrice)),
      Money.zero()
    );

    const order = new TransferOrder(
      props.id,
      props.transferNo || '',
      TransferStatus.draft(),
      props.type,
      props.fromWarehouseId,
      props.toWarehouseId,
      props.fromLocation || '',
      props.toLocation || '',
      props.applicantId,
      props.applicantName || '',
      undefined,
      '',
      props.operatorId,
      props.operatorName || '',
      '',
      '',
      items,
      totalQuantity,
      totalAmount,
      props.version || 0,
      props.remark || '',
      props.createTime,
      props.updateTime
    );

    if (order.id) {
      order._domainEvents.push(
        new TransferOrderCreatedEvent({
          transferId: order.id,
          transferNo: order.transferNo,
          fromWarehouseId: order.fromWarehouseId,
          toWarehouseId: order.toWarehouseId,
          transferType: order.type,
        })
      );
    }

    return order;
  }

  static reconstitute(props: TransferOrderProps): TransferOrder {
    const items = props.items.map((item) => TransferItem.reconstitute(item));
    const totalQuantity =
      props.totalQuantity !== undefined
        ? props.totalQuantity
        : items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount =
      props.totalAmount !== undefined
        ? Money.create(props.totalAmount)
        : items.reduce((sum, item) => sum.add(Money.create(item.totalPrice)), Money.zero());

    return new TransferOrder(
      props.id,
      props.transferNo || '',
      TransferStatus.from(props.status ?? 0),
      props.type,
      props.fromWarehouseId,
      props.toWarehouseId,
      props.fromLocation || '',
      props.toLocation || '',
      props.applicantId,
      props.applicantName || '',
      props.approverId,
      props.approverName || '',
      props.operatorId,
      props.operatorName || '',
      props.outTime || '',
      props.inTime || '',
      items,
      totalQuantity,
      totalAmount,
      props.version || 0,
      props.remark || '',
      props.createTime,
      props.updateTime
    );
  }

  get status(): TransferStatus {
    return this._status;
  }

  get items(): TransferItem[] {
    return [...this._items];
  }

  get totalQuantity(): number {
    return this._totalQuantity;
  }

  get totalAmount(): Money {
    return this._totalAmount;
  }

  get approverId(): number | undefined {
    return this._approverId;
  }

  get approverName(): string {
    return this._approverName;
  }

  get outTime(): string {
    return this._outTime;
  }

  get inTime(): string {
    return this._inTime;
  }

  submit(): void {
    this._status = this._status.transitionTo(TransferStatusEnum.PENDING);
    this._domainEvents.push(
      new TransferOrderSubmittedEvent({
        transferId: this.id!,
        transferNo: this.transferNo,
        fromWarehouseId: this.fromWarehouseId,
        toWarehouseId: this.toWarehouseId,
        totalQuantity: this._totalQuantity,
      })
    );
  }

  approve(approverId?: number, approverName?: string): void {
    this._status = this._status.transitionTo(TransferStatusEnum.SHIPPED);
    this._approverId = approverId;
    this._approverName = approverName || '';

    this._domainEvents.push(
      new TransferOrderApprovedEvent({
        transferId: this.id!,
        transferNo: this.transferNo,
        approverId,
      })
    );
  }

  shipOut(operatorId?: number, operatorName?: string): void {
    this._status = this._status.transitionTo(TransferStatusEnum.SHIPPED);
    this._outTime = new Date().toISOString();

    this._domainEvents.push(
      new TransferOrderShippedEvent({
        transferId: this.id!,
        transferNo: this.transferNo,
        fromWarehouseId: this.fromWarehouseId,
        toWarehouseId: this.toWarehouseId,
        items: this._items.map((item) => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          outQuantity: item.outQuantity || item.quantity,
          batchNo: item.batchNo,
        })),
      })
    );
  }

  receiveIn(operatorId?: number, operatorName?: string): void {
    this._status = this._status.transitionTo(TransferStatusEnum.RECEIVED);
    this._inTime = new Date().toISOString();

    this._domainEvents.push(
      new TransferOrderReceivedEvent({
        transferId: this.id!,
        transferNo: this.transferNo,
        fromWarehouseId: this.fromWarehouseId,
        toWarehouseId: this.toWarehouseId,
        items: this._items.map((item) => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          inQuantity: item.inQuantity || item.outQuantity || item.quantity,
          batchNo: item.batchNo,
        })),
      })
    );
  }

  cancel(reason: string = ''): void {
    this._status = this._status.transitionTo(TransferStatusEnum.CANCELLED);
    this._domainEvents.push(
      new TransferOrderCancelledEvent({
        transferId: this.id!,
        transferNo: this.transferNo,
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
