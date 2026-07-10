import { DomainError } from '../../shared/DomainTypes';
import { ToolStatus } from '../value-objects/ToolStatus';

export interface ToolProps {
  id?: number;
  toolType: number;
  toolCode: string;
  toolName: string;
  spec?: string;
  materialId?: number;
  totalLife: number;
  warningThreshold: number;
  usedCount: number;
  remainLife: number;
  originalCost: number;
  accumulatedCost: number;
  netValue: number;
  unitCost: number;
  status: ToolStatus;
  manufactureDate?: string;
  warehouseLocation?: string;
  scrapReason?: string;
  scrapTime?: string;
  scrapBy?: number;
  remark?: string;
  isDeleted: number;
  createTime?: string;
  updateTime?: string;
}

export class Tool {
  private _props: ToolProps;

  private constructor(props: ToolProps) {
    this._props = props;
  }

  get id(): number | undefined {
    return this._props.id;
  }

  get toolType(): number {
    return this._props.toolType;
  }

  get toolCode(): string {
    return this._props.toolCode;
  }

  get toolName(): string {
    return this._props.toolName;
  }

  get spec(): string | undefined {
    return this._props.spec;
  }

  get materialId(): number | undefined {
    return this._props.materialId;
  }

  get totalLife(): number {
    return this._props.totalLife;
  }

  get warningThreshold(): number {
    return this._props.warningThreshold;
  }

  get usedCount(): number {
    return this._props.usedCount;
  }

  get remainLife(): number {
    return this._props.remainLife;
  }

  get originalCost(): number {
    return this._props.originalCost;
  }

  get accumulatedCost(): number {
    return this._props.accumulatedCost;
  }

  get netValue(): number {
    return this._props.netValue;
  }

  get unitCost(): number {
    return this._props.unitCost;
  }

  get status(): ToolStatus {
    return this._props.status;
  }

  get manufactureDate(): string | undefined {
    return this._props.manufactureDate;
  }

  get warehouseLocation(): string | undefined {
    return this._props.warehouseLocation;
  }

  get scrapReason(): string | undefined {
    return this._props.scrapReason;
  }

  get scrapTime(): string | undefined {
    return this._props.scrapTime;
  }

  get scrapBy(): number | undefined {
    return this._props.scrapBy;
  }

  get remark(): string | undefined {
    return this._props.remark;
  }

  get isDeleted(): number {
    return this._props.isDeleted;
  }

  get createTime(): string | undefined {
    return this._props.createTime;
  }

  get updateTime(): string | undefined {
    return this._props.updateTime;
  }

  get isScrapEligible(): boolean {
    return this._props.status !== ToolStatus.SCRAPPED;
  }

  get canBeUsed(): boolean {
    return [ToolStatus.ACTIVE, ToolStatus.WARNING].includes(this._props.status);
  }

  get isWarning(): boolean {
    return this._props.status === ToolStatus.WARNING;
  }

  get isEndOfLife(): boolean {
    return this._props.remainLife <= 0;
  }

  get warningPercentage(): number {
    return this._props.totalLife > 0 ? (this._props.usedCount / this._props.totalLife) * 100 : 0;
  }

  static create(input: {
    toolType: number;
    toolCode: string;
    toolName: string;
    spec?: string;
    materialId?: number;
    totalLife: number;
    warningThreshold: number;
    originalCost: number;
    manufactureDate?: string;
    warehouseLocation?: string;
    remark?: string;
  }): Tool {
    if (input.totalLife <= 0) {
      throw new DomainError('Total life must be positive');
    }
    if (input.warningThreshold <= 0 || input.warningThreshold > input.totalLife) {
      throw new DomainError('Warning threshold must be between 1 and total life');
    }
    if (input.originalCost < 0) {
      throw new DomainError('Original cost cannot be negative');
    }

    const unitCost = input.originalCost / input.totalLife;

    return new Tool({
      toolType: input.toolType,
      toolCode: input.toolCode,
      toolName: input.toolName,
      spec: input.spec,
      materialId: input.materialId,
      totalLife: input.totalLife,
      warningThreshold: input.warningThreshold,
      usedCount: 0,
      remainLife: input.totalLife,
      originalCost: input.originalCost,
      accumulatedCost: 0,
      netValue: input.originalCost,
      unitCost,
      status: ToolStatus.STANDBY,
      manufactureDate: input.manufactureDate,
      warehouseLocation: input.warehouseLocation,
      remark: input.remark,
      isDeleted: 0,
    });
  }

  static fromRow(row: Record<string, unknown>): Tool {
    return new Tool({
      id: row.id as number,
      toolType: row.tool_type as number,
      toolCode: row.tool_code as string,
      toolName: row.tool_name as string,
      spec: row.spec as string | undefined,
      materialId: row.material_id as number | undefined,
      totalLife: row.total_life as number,
      warningThreshold: row.warning_threshold as number,
      usedCount: row.used_count as number,
      remainLife: row.remain_life as number,
      originalCost: Number(row.original_cost),
      accumulatedCost: Number(row.accumulated_cost),
      netValue: Number(row.net_value),
      unitCost: Number(row.unit_cost),
      status: row.status as ToolStatus,
      manufactureDate: row.manufacture_date as string | undefined,
      warehouseLocation: row.warehouse_location as string | undefined,
      scrapReason: row.scrap_reason as string | undefined,
      scrapTime: row.scrap_time as string | undefined,
      scrapBy: row.scrap_by as number | undefined,
      remark: row.remark as string | undefined,
      isDeleted: row.is_deleted as number,
      createTime: row.create_time as string | undefined,
      updateTime: row.update_time as string | undefined,
    });
  }

  recordUsage(useCount: number): {
    newUsedCount: number;
    newRemainLife: number;
    amortizedCost: number;
    newAccumulatedCost: number;
    newNetValue: number;
    newStatus: ToolStatus;
    shouldWarn: boolean;
    isEndOfLife: boolean;
  } {
    if (!this.canBeUsed) {
      throw new DomainError(
        `Tool in status ${this._props.status} cannot be used (only active/warning allowed)`
      );
    }
    if (useCount > this._props.remainLife) {
      throw new DomainError(
        `Use count ${useCount} exceeds remaining life ${this._props.remainLife}`
      );
    }

    const newUsedCount = this._props.usedCount + useCount;
    const newRemainLife = this._props.totalLife - newUsedCount;
    const amortizedCost = this._props.unitCost * useCount;
    const newAccumulatedCost = this._props.accumulatedCost + amortizedCost;
    const newNetValue = this._props.originalCost - newAccumulatedCost;

    let newStatus = this._props.status;
    if (newRemainLife <= 0) {
      newStatus = ToolStatus.SCRAPPED;
    } else if (newUsedCount >= this._props.warningThreshold) {
      newStatus = ToolStatus.WARNING;
    }

    const oldStatus = this._props.status;

    this._props.usedCount = newUsedCount;
    this._props.remainLife = newRemainLife;
    this._props.accumulatedCost = newAccumulatedCost;
    this._props.netValue = newNetValue;
    this._props.status = newStatus;

    return {
      newUsedCount,
      newRemainLife,
      amortizedCost,
      newAccumulatedCost,
      newNetValue,
      newStatus,
      shouldWarn: newStatus === ToolStatus.WARNING && oldStatus !== ToolStatus.WARNING,
      isEndOfLife: newRemainLife <= 0,
    };
  }

  activate(): void {
    if (this._props.status !== ToolStatus.STANDBY) {
      throw new DomainError('Only tools in standby can be activated');
    }
    this._props.status = ToolStatus.ACTIVE;
  }

  startMaintenance(): void {
    if (![ToolStatus.ACTIVE, ToolStatus.WARNING].includes(this._props.status)) {
      throw new DomainError('Only active/warning tools can enter maintenance');
    }
    this._props.status = ToolStatus.MAINTENANCE;
  }

  completeMaintenance(maintenanceCost: number, lifeAfter: number): void {
    const lifeAdjustment = lifeAfter - this._props.remainLife;
    const newNetValue = this._props.netValue + maintenanceCost;
    const newOriginalCost = this._props.originalCost + maintenanceCost;
    const newUnitCost = lifeAfter > 0 ? newNetValue / lifeAfter : 0;

    this._props.remainLife = lifeAfter;
    this._props.netValue = newNetValue;
    this._props.originalCost = newOriginalCost;
    this._props.unitCost = newUnitCost;

    if (this._props.usedCount >= this._props.warningThreshold) {
      this._props.status = ToolStatus.WARNING;
    } else {
      this._props.status = ToolStatus.ACTIVE;
    }

    return lifeAdjustment;
  }

  scrap(reason: string, operatorId: number): void {
    if (this._props.status === ToolStatus.SCRAPPED) {
      throw new DomainError('Tool already scrapped');
    }
    this._props.status = ToolStatus.SCRAPPED;
    this._props.scrapReason = reason;
    this._props.scrapTime = new Date().toISOString();
    this._props.scrapBy = operatorId;
  }

  toRow(): Record<string, unknown> {
    return {
      id: this._props.id,
      tool_type: this._props.toolType,
      tool_code: this._props.toolCode,
      tool_name: this._props.toolName,
      spec: this._props.spec,
      material_id: this._props.materialId,
      total_life: this._props.totalLife,
      warning_threshold: this._props.warningThreshold,
      used_count: this._props.usedCount,
      remain_life: this._props.remainLife,
      original_cost: this._props.originalCost,
      accumulated_cost: this._props.accumulatedCost,
      net_value: this._props.netValue,
      unit_cost: this._props.unitCost,
      status: this._props.status,
      manufacture_date: this._props.manufactureDate,
      warehouse_location: this._props.warehouseLocation,
      scrap_reason: this._props.scrapReason,
      scrap_time: this._props.scrapTime,
      scrap_by: this._props.scrapBy,
      remark: this._props.remark,
      is_deleted: this._props.isDeleted,
    };
  }
}
