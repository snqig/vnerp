import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { WorkOrderStatusVO, WorkOrderStatus } from '../value-objects/WorkOrderStatus';
import { MaterialRequirement, MaterialRequirementProps } from '../entities/MaterialRequirement';
import {
  WorkOrderCreatedEvent,
  WorkOrderReleasedEvent,
  WorkOrderStartedEvent,
  WorkOrderMaterialIssuedEvent,
  WorkOrderCompletedEvent,
  WorkOrderClosedEvent,
} from '../events/WorkOrderEvents';

export interface WorkOrderProps {
  id?: number;
  workOrderNo?: string;
  status?: WorkOrderStatus;
  productId: number;
  productName: string;
  productCode?: string;
  plannedQty: number;
  completedQty: number;
  processId?: number;
  processName?: string;
  warehouseId?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  remark?: string;
  createBy?: number;
  materialRequirements: MaterialRequirementProps[];
  createTime?: string;
  updateTime?: string;
}

export class WorkOrder {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly workOrderNo: string,
    private _status: WorkOrderStatusVO,
    public readonly productId: number,
    public readonly productName: string,
    public readonly productCode: string,
    private _plannedQty: number,
    private _completedQty: number,
    public readonly processId: number | undefined,
    public readonly processName: string | undefined,
    public readonly warehouseId: number,
    public readonly plannedStartDate: string | undefined,
    public readonly plannedEndDate: string | undefined,
    private _actualStartDate: string | undefined,
    private _actualEndDate: string | undefined,
    public readonly remark: string,
    public readonly createBy: number | undefined,
    private _materialRequirements: MaterialRequirement[],
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: WorkOrderProps): WorkOrder {
    if (!props.productId || props.productId <= 0) throw new DomainError('产品不能为空');
    if (!props.plannedQty || props.plannedQty <= 0) throw new DomainError('计划数量必须大于0');

    const materialReqs = (props.materialRequirements || []).map((mr) =>
      MaterialRequirement.create(mr)
    );

    const wo = new WorkOrder(
      props.id,
      props.workOrderNo || '',
      WorkOrderStatusVO.draft(),
      props.productId,
      props.productName || '',
      props.productCode || '',
      props.plannedQty,
      props.completedQty || 0,
      props.processId,
      props.processName,
      props.warehouseId || 1,
      props.plannedStartDate,
      props.plannedEndDate,
      undefined,
      undefined,
      props.remark || '',
      props.createBy,
      materialReqs,
      props.createTime,
      props.updateTime
    );

    if (wo.id) {
      wo._domainEvents.push(
        new WorkOrderCreatedEvent({
          workOrderId: wo.id,
          workOrderNo: wo.workOrderNo,
          productId: wo.productId,
          productName: wo.productName,
          plannedQty: wo.plannedQty,
        })
      );
    }
    return wo;
  }

  static reconstitute(props: WorkOrderProps): WorkOrder {
    const materialReqs = (props.materialRequirements || []).map((mr) =>
      MaterialRequirement.reconstitute(mr)
    );
    return new WorkOrder(
      props.id,
      props.workOrderNo || '',
      WorkOrderStatusVO.from(props.status || 'draft'),
      props.productId,
      props.productName || '',
      props.productCode || '',
      props.plannedQty,
      props.completedQty || 0,
      props.processId,
      props.processName,
      props.warehouseId || 1,
      props.plannedStartDate,
      props.plannedEndDate,
      props.actualStartDate,
      props.actualEndDate,
      props.remark || '',
      props.createBy,
      materialReqs,
      props.createTime,
      props.updateTime
    );
  }

  get status(): WorkOrderStatusVO {
    return this._status;
  }
  get plannedQty(): number {
    return this._plannedQty;
  }
  get completedQty(): number {
    return this._completedQty;
  }
  get actualStartDate(): string | undefined {
    return this._actualStartDate;
  }
  get actualEndDate(): string | undefined {
    return this._actualEndDate;
  }
  get materialRequirements(): MaterialRequirement[] {
    return [...this._materialRequirements];
  }

  release(): void {
    if (!this._status.canRelease())
      throw new DomainError(`当前状态"${this._status.label()}"不允许下达`);
    this._status = this._status.transitionTo('released');
    this._domainEvents.push(
      new WorkOrderReleasedEvent({
        workOrderId: this.id!,
        workOrderNo: this.workOrderNo,
        materialRequirements: this._materialRequirements.map((mr) => ({
          materialId: mr.materialId,
          materialCode: mr.materialCode,
          requiredQty: mr.requiredQty,
        })),
      })
    );
  }

  start(): void {
    if (!this._status.canStart())
      throw new DomainError(`当前状态"${this._status.label()}"不允许开工`);
    this._status = this._status.transitionTo('in_progress');
    this._actualStartDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    this._domainEvents.push(
      new WorkOrderStartedEvent({
        workOrderId: this.id!,
        workOrderNo: this.workOrderNo,
      })
    );
  }

  pause(): void {
    if (!this._status.canPause()) throw new DomainError(`当前状态不允许暂停`);
    this._status = this._status.transitionTo('paused');
  }

  resume(): void {
    if (!this._status.canResume()) throw new DomainError(`当前状态不允许恢复`);
    this._status = this._status.transitionTo('in_progress');
  }

  issueMaterials(
    issues: Array<{ materialId: number; quantity: number; batchNo: string; warehouseId: number }>
  ): void {
    if (this._status.value !== 'released' && this._status.value !== 'in_progress') {
      throw new DomainError('只有已下达或生产中的工单才能领料');
    }

    const issuedItems: Array<{
      materialId: number;
      materialCode: string;
      materialName: string;
      quantity: number;
      batchNo: string;
      warehouseId: number;
    }> = [];

    for (const issue of issues) {
      const mr = this._materialRequirements.find((m) => m.materialId === issue.materialId);
      if (!mr) throw new DomainError(`物料ID${issue.materialId}不在工单BOM中`);
      mr.issue(issue.quantity);
      issuedItems.push({
        materialId: mr.materialId,
        materialCode: mr.materialCode,
        materialName: mr.materialName,
        quantity: issue.quantity,
        batchNo: issue.batchNo,
        warehouseId: issue.warehouseId,
      });
    }

    this._domainEvents.push(
      new WorkOrderMaterialIssuedEvent({
        workOrderId: this.id!,
        workOrderNo: this.workOrderNo,
        issuedItems,
      })
    );
  }

  complete(completedQty: number, warehouseId: number): void {
    if (!this._status.canComplete())
      throw new DomainError(`当前状态"${this._status.label()}"不允许完工`);
    this._completedQty += completedQty;
    if (this._completedQty > this._plannedQty) {
      throw new DomainError(
        `完工数量超限: 计划${this._plannedQty}, 已完工${this._completedQty - completedQty}, 本次${completedQty}`
      );
    }
    this._status = this._status.transitionTo('completed');
    this._actualEndDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    this._domainEvents.push(
      new WorkOrderCompletedEvent({
        workOrderId: this.id!,
        workOrderNo: this.workOrderNo,
        productId: this.productId,
        productName: this.productName,
        completedQty,
        warehouseId,
      })
    );
  }

  close(): void {
    this._status = this._status.transitionTo('closed');
    this._domainEvents.push(
      new WorkOrderClosedEvent({ workOrderId: this.id!, workOrderNo: this.workOrderNo })
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
