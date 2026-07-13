import { DomainError } from '@/domain/shared/DomainTypes';
import { SampleOrderStatus, canTransition } from '@/domain/sample/value-objects/SampleOrderStatus';
import {
  DomainEvent,
  SampleOrderCreatedEvent,
  SampleOrderSubmittedEvent,
  SampleOrderStartedEvent,
  SampleOrderCompletedEvent,
  SampleOrderConfirmedEvent,
  SampleOrderConvertedEvent,
  SampleOrderCancelledEvent,
} from '@/domain/sample/events/SampleOrderEvents';

/** 打样单聚合根属性 — 与 sal_sample_order 表字段一一对齐 */
export interface SampleOrderProps {
  id?: number;
  orderNo: string;
  notifyDate?: string;
  customerId?: number;
  customerName?: string;
  productName?: string;
  materialNo?: string;
  version?: string;
  sizeSpec?: string;
  materialSpec?: string;
  specification?: string;
  quantity?: number;
  orderDate?: string;
  customerRequireDate?: string;
  deliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryStatus?: string;
  status?: SampleOrderStatus;
  remark?: string;
  createTime?: string;
  updateTime?: string;
  createBy?: number;
  // 新增关联字段 (from migration 053)
  processCardId?: number;
  workOrderId?: number;
  salesOrderId?: number;
  sampleFee?: number;
  feeCharged?: number;
  feeDeductible?: number;
  feeDeducted?: number;
  sampleVersion?: number;
  parentVersionId?: number;
  convertedAt?: string;
  convertedBy?: number;
}

export class SampleOrder {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly orderNo: string,
    private _notifyDate: string,
    public readonly customerId: number | undefined,
    public readonly customerName: string,
    public readonly productName: string,
    public readonly materialNo: string,
    public readonly version: string,
    public readonly sizeSpec: string,
    public readonly materialSpec: string,
    public readonly specification: string,
    private _quantity: number,
    public readonly orderDate: string,
    public readonly customerRequireDate: string,
    public readonly deliveryDate: string,
    public readonly actualDeliveryDate: string,
    public readonly deliveryStatus: string,
    private _status: SampleOrderStatus,
    public readonly remark: string,
    public readonly createBy: number | undefined,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined,
    private _processCardId: number | undefined,
    private _workOrderId: number | undefined,
    private _salesOrderId: number | undefined,
    private _sampleFee: number,
    private _feeCharged: number,
    private _feeDeductible: number,
    private _feeDeducted: number,
    public readonly sampleVersion: number,
    public readonly parentVersionId: number | undefined,
    private _convertedAt: string,
    private _convertedBy: number | undefined
  ) {}

  static create(props: SampleOrderProps): SampleOrder {
    if (!props.orderNo) throw new DomainError('打样单编号不能为空');

    const order = new SampleOrder(
      props.id,
      props.orderNo,
      props.notifyDate || '',
      props.customerId,
      props.customerName || '',
      props.productName || '',
      props.materialNo || '',
      props.version || 'A',
      props.sizeSpec || '',
      props.materialSpec || '',
      props.specification || '',
      props.quantity || 0,
      props.orderDate || '',
      props.customerRequireDate || '',
      props.deliveryDate || '',
      props.actualDeliveryDate || '',
      props.deliveryStatus || 'pending',
      props.status || SampleOrderStatus.DRAFT,
      props.remark || '',
      props.createBy,
      props.createTime,
      props.updateTime,
      props.processCardId,
      props.workOrderId,
      props.salesOrderId,
      props.sampleFee || 0,
      props.feeCharged || 0,
      props.feeDeductible || 0,
      props.feeDeducted || 0,
      props.sampleVersion || 1,
      props.parentVersionId,
      props.convertedAt || '',
      props.convertedBy
    );

    order._domainEvents.push(
      new SampleOrderCreatedEvent({
        sampleOrderId: props.id || 0,
        orderNo: props.orderNo,
        customerId: props.customerId || 0,
        userId: props.createBy || 0,
      })
    );
    return order;
  }

  static reconstitute(props: SampleOrderProps): SampleOrder {
    return new SampleOrder(
      props.id,
      props.orderNo,
      props.notifyDate || '',
      props.customerId,
      props.customerName || '',
      props.productName || '',
      props.materialNo || '',
      props.version || 'A',
      props.sizeSpec || '',
      props.materialSpec || '',
      props.specification || '',
      props.quantity || 0,
      props.orderDate || '',
      props.customerRequireDate || '',
      props.deliveryDate || '',
      props.actualDeliveryDate || '',
      props.deliveryStatus || 'pending',
      props.status || SampleOrderStatus.DRAFT,
      props.remark || '',
      props.createBy,
      props.createTime,
      props.updateTime,
      props.processCardId,
      props.workOrderId,
      props.salesOrderId,
      props.sampleFee || 0,
      props.feeCharged || 0,
      props.feeDeductible || 0,
      props.feeDeducted || 0,
      props.sampleVersion || 1,
      props.parentVersionId,
      props.convertedAt || '',
      props.convertedBy
    );
  }

  get status(): SampleOrderStatus {
    return this._status;
  }
  get quantity(): number {
    return this._quantity;
  }
  get notifyDate(): string {
    return this._notifyDate;
  }
  get sampleFee(): number {
    return this._sampleFee;
  }
  get feeCharged(): number {
    return this._feeCharged;
  }
  get feeDeductible(): number {
    return this._feeDeductible;
  }
  get feeDeducted(): number {
    return this._feeDeducted;
  }
  get processCardId(): number | undefined {
    return this._processCardId;
  }
  get workOrderId(): number | undefined {
    return this._workOrderId;
  }
  get salesOrderId(): number | undefined {
    return this._salesOrderId;
  }
  get convertedAt(): string {
    return this._convertedAt;
  }
  get convertedBy(): number | undefined {
    return this._convertedBy;
  }
  get domainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  /** 提交打样 */
  submit(userId: number): void {
    if (!canTransition(this._status, SampleOrderStatus.PENDING)) {
      throw new DomainError(`打样单[${this.orderNo}]当前状态不可提交`);
    }
    this._status = SampleOrderStatus.PENDING;
    this._domainEvents.push(
      new SampleOrderSubmittedEvent({ sampleOrderId: this.id!, orderNo: this.orderNo, userId })
    );
  }

  /** 开始打样生产 */
  startProduction(userId: number): void {
    if (!canTransition(this._status, SampleOrderStatus.IN_PROGRESS)) {
      throw new DomainError(`打样单[${this.orderNo}]当前状态不可开始生产`);
    }
    this._status = SampleOrderStatus.IN_PROGRESS;
    this._domainEvents.push(
      new SampleOrderStartedEvent({ sampleOrderId: this.id!, orderNo: this.orderNo, userId })
    );
  }

  /** 完成打样 */
  complete(userId: number): void {
    if (!canTransition(this._status, SampleOrderStatus.COMPLETED)) {
      throw new DomainError(`打样单[${this.orderNo}]当前状态不可完成`);
    }
    this._status = SampleOrderStatus.COMPLETED;
    this._domainEvents.push(
      new SampleOrderCompletedEvent({ sampleOrderId: this.id!, orderNo: this.orderNo, userId })
    );
  }

  /** 客户确认 */
  confirm(userId: number): void {
    if (!canTransition(this._status, SampleOrderStatus.CONFIRMED)) {
      throw new DomainError(`打样单[${this.orderNo}]当前状态不可确认`);
    }
    this._status = SampleOrderStatus.CONFIRMED;
    this._domainEvents.push(
      new SampleOrderConfirmedEvent({ sampleOrderId: this.id!, orderNo: this.orderNo, userId })
    );
  }

  /** 转大货 */
  convertToSalesOrder(salesOrderId: number, userId: number): void {
    if (!canTransition(this._status, SampleOrderStatus.CONVERTED)) {
      throw new DomainError(`打样单[${this.orderNo}]当前状态不可转大货`);
    }
    this._status = SampleOrderStatus.CONVERTED;
    this._salesOrderId = salesOrderId;
    this._convertedAt = new Date().toISOString();
    this._convertedBy = userId;
    // 已收取且可抵扣的打样费，转大货时标记为已抵扣
    if (this._feeCharged && this._feeDeductible) {
      this._feeDeducted = 1;
    }
    this._domainEvents.push(
      new SampleOrderConvertedEvent({
        sampleOrderId: this.id!,
        orderNo: this.orderNo,
        salesOrderId,
        userId,
      })
    );
  }

  /** 作废 */
  cancel(reason: string, userId: number): void {
    if (!canTransition(this._status, SampleOrderStatus.CANCELLED)) {
      throw new DomainError(`打样单[${this.orderNo}]当前状态不可作废`);
    }
    this._status = SampleOrderStatus.CANCELLED;
    this._domainEvents.push(
      new SampleOrderCancelledEvent({
        sampleOrderId: this.id!,
        orderNo: this.orderNo,
        reason,
        userId,
      })
    );
  }

  /** 设置工艺卡关联 */
  linkProcessCard(processCardId: number): void {
    this._processCardId = processCardId;
  }

  /** 设置工单关联 */
  linkWorkOrder(workOrderId: number): void {
    this._workOrderId = workOrderId;
  }

  /** 更新打样费 */
  updateSampleFee(fee: number, charged: number, deductible: number): void {
    this._sampleFee = fee;
    this._feeCharged = charged;
    this._feeDeductible = deductible;
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  toProps(): SampleOrderProps {
    return {
      id: this.id,
      orderNo: this.orderNo,
      notifyDate: this._notifyDate,
      customerId: this.customerId,
      customerName: this.customerName,
      productName: this.productName,
      materialNo: this.materialNo,
      version: this.version,
      sizeSpec: this.sizeSpec,
      materialSpec: this.materialSpec,
      specification: this.specification,
      quantity: this._quantity,
      orderDate: this.orderDate,
      customerRequireDate: this.customerRequireDate,
      deliveryDate: this.deliveryDate,
      actualDeliveryDate: this.actualDeliveryDate,
      deliveryStatus: this.deliveryStatus,
      status: this._status,
      remark: this.remark,
      createBy: this.createBy,
      createTime: this.createTime,
      updateTime: this.updateTime,
      processCardId: this.processCardId,
      workOrderId: this.workOrderId,
      salesOrderId: this.salesOrderId,
      sampleFee: this._sampleFee,
      feeCharged: this._feeCharged,
      feeDeductible: this._feeDeductible,
      feeDeducted: this._feeDeducted,
      sampleVersion: this.sampleVersion,
      parentVersionId: this.parentVersionId,
      convertedAt: this.convertedAt,
      convertedBy: this.convertedBy,
    };
  }

  static generateCode(sequence: number): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const seq = String(sequence).padStart(4, '0');
    return `SP${y}${m}${d}${seq}`;
  }
}
