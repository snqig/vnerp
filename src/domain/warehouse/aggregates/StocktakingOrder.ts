import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { StocktakingStatus, StocktakingStatusEnum } from '../value-objects/StocktakingStatus';
import { StocktakingItem, StocktakingItemProps } from '../entities/StocktakingItem';
import {
  StocktakingOrderApprovedEvent,
  StocktakingOrderCancelledEvent,
  StocktakingOrderCreatedEvent,
  StocktakingOrderStartedEvent,
  StocktakingOrderSubmittedEvent,
} from '../events/StocktakingOrderEvents';

export interface StocktakingOrderProps {
  id?: number;
  checkNo?: string;
  status?: number;
  type: number; // 1-全仓, 2-部分, 3-抽样
  warehouseId: number;
  warehouseName?: string;
  scope?: string;
  applicantId?: number;
  applicantName?: string;
  approverId?: number;
  approverName?: string;
  approveTime?: string;
  approveRemark?: string;
  remark?: string;
  items: StocktakingItemProps[];
  totalItems?: number;
  diffItems?: number;
  totalDiffAmount?: number;
  version?: number;
  createTime?: string;
  updateTime?: string;
}

export class StocktakingOrder {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly checkNo: string,
    private _status: StocktakingStatus,
    public readonly type: number,
    public readonly warehouseId: number,
    public readonly warehouseName: string,
    public readonly scope: string,
    public readonly applicantId: number | undefined,
    public readonly applicantName: string,
    private _approverId: number | undefined,
    private _approverName: string,
    private _approveTime: string,
    private _approveRemark: string,
    private _items: StocktakingItem[],
    private _totalItems: number,
    private _diffItems: number,
    private _totalDiffAmount: number,
    public readonly version: number,
    public readonly remark: string,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: StocktakingOrderProps): StocktakingOrder {
    if (!props.warehouseId) {
      throw new DomainError('仓库ID不能为空');
    }
    if (!props.items || props.items.length === 0) {
      throw new DomainError('盘点项不能为空');
    }

    const items = props.items.map((item) => StocktakingItem.create(item));

    const order = new StocktakingOrder(
      props.id,
      props.checkNo || '',
      StocktakingStatus.draft(),
      props.type,
      props.warehouseId,
      props.warehouseName || '',
      props.scope || '',
      props.applicantId,
      props.applicantName || '',
      undefined,
      '',
      '',
      '',
      items,
      items.length,
      0,
      0,
      props.version || 0,
      props.remark || '',
      props.createTime,
      props.updateTime
    );

    if (order.id) {
      order._domainEvents.push(
        new StocktakingOrderCreatedEvent({
          stocktakingId: order.id,
          checkNo: order.checkNo,
          warehouseId: order.warehouseId,
          warehouseName: order.warehouseName,
          stocktakingType: order.type,
        })
      );
    }

    return order;
  }

  static reconstitute(props: StocktakingOrderProps): StocktakingOrder {
    const items = props.items.map((item) => StocktakingItem.reconstitute(item));

    return new StocktakingOrder(
      props.id,
      props.checkNo || '',
      StocktakingStatus.from(props.status ?? 0),
      props.type,
      props.warehouseId,
      props.warehouseName || '',
      props.scope || '',
      props.applicantId,
      props.applicantName || '',
      props.approverId,
      props.approverName || '',
      props.approveTime || '',
      props.approveRemark || '',
      items,
      props.totalItems ?? items.length,
      props.diffItems ?? 0,
      props.totalDiffAmount ?? 0,
      props.version || 0,
      props.remark || '',
      props.createTime,
      props.updateTime
    );
  }

  get status(): StocktakingStatus {
    return this._status;
  }

  get items(): StocktakingItem[] {
    return [...this._items];
  }

  get totalItems(): number {
    return this._totalItems;
  }

  get diffItems(): number {
    return this._diffItems;
  }

  get totalDiffAmount(): number {
    return this._totalDiffAmount;
  }

  get approverId(): number | undefined {
    return this._approverId;
  }

  get approverName(): string {
    return this._approverName;
  }

  get approveTime(): string {
    return this._approveTime;
  }

  get approveRemark(): string {
    return this._approveRemark;
  }

  start(): void {
    this._status = this._status.transitionTo(StocktakingStatusEnum.IN_PROGRESS);
    this._domainEvents.push(
      new StocktakingOrderStartedEvent({
        stocktakingId: this.id!,
        checkNo: this.checkNo,
        warehouseId: this.warehouseId,
      })
    );
  }

  submitForApproval(): void {
    this._status = this._status.transitionTo(StocktakingStatusEnum.PENDING_APPROVAL);
    this._diffItems = this._items.filter((item) => item.hasDiff()).length;
    this._totalDiffAmount = this._items.reduce((sum, item) => sum + item.diffAmount, 0);

    this._domainEvents.push(
      new StocktakingOrderSubmittedEvent({
        stocktakingId: this.id!,
        checkNo: this.checkNo,
        warehouseId: this.warehouseId,
        totalItems: this._totalItems,
        diffItems: this._diffItems,
      })
    );
  }

  approve(approverId?: number, approverName?: string, approveRemark?: string): void {
    this._status = this._status.transitionTo(StocktakingStatusEnum.APPROVED);
    this._approverId = approverId;
    this._approverName = approverName || '';
    this._approveTime = new Date().toISOString();
    this._approveRemark = approveRemark || '';

    this._domainEvents.push(
      new StocktakingOrderApprovedEvent({
        stocktakingId: this.id!,
        checkNo: this.checkNo,
        warehouseId: this.warehouseId,
        warehouseName: this.warehouseName,
        diffItems: this._items
          .filter((item) => item.hasDiff())
          .map((item) => ({
            materialId: item.materialId,
            materialCode: item.materialCode,
            materialName: item.materialName,
            batchNo: item.batchNo,
            diffQty: item.diffQty,
            diffAmount: item.diffAmount,
            adjustType: item.diffQty > 0 ? 1 : 2, // 1-盘盈, 2-盘亏
          })),
        totalDiffAmount: this._totalDiffAmount,
      })
    );
  }

  cancel(reason: string = ''): void {
    this._status = this._status.transitionTo(StocktakingStatusEnum.CANCELLED);
    this._domainEvents.push(
      new StocktakingOrderCancelledEvent({
        stocktakingId: this.id!,
        checkNo: this.checkNo,
        reason,
      })
    );
  }

  processDiff(itemId: number): void {
    const item = this._items.find((i) => i.id === itemId);
    if (!item) {
      throw new DomainError(`盘点项不存在: ${itemId}`);
    }
    if (!item.hasDiff()) {
      throw new DomainError('该盘点项无差异，无需处理');
    }
    item.markDiffProcessed();
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
