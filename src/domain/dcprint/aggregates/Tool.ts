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
  // 体系B 字段 (刀模)
  assetType?: string;
  layoutType?: string;
  piecesPerImpression?: number;
  material?: string;
  qrCode?: string;
  supplierId?: number;
  maintenanceInterval?: number;
  maintenanceCount?: number;
  lastMaintenanceDate?: string;
  lastMaintenanceImpressions?: number;
  lastUsedDate?: string;
  // 体系C 字段 (网版)
  meshCount?: string;
  meshMaterial?: string;
  size?: string;
  tensionValue?: number;
  frameType?: string;
  customerId?: number;
  reclaimCount?: number;
  exposureDate?: string;
  lastCleanDate?: string;
  lastReclaimDate?: string;
  tensionDate?: string;
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

  get assetType(): string | undefined {
    return this._props.assetType;
  }

  get layoutType(): string | undefined {
    return this._props.layoutType;
  }

  get piecesPerImpression(): number | undefined {
    return this._props.piecesPerImpression;
  }

  get material(): string | undefined {
    return this._props.material;
  }

  get qrCode(): string | undefined {
    return this._props.qrCode;
  }

  get supplierId(): number | undefined {
    return this._props.supplierId;
  }

  get maintenanceInterval(): number | undefined {
    return this._props.maintenanceInterval;
  }

  get maintenanceCount(): number | undefined {
    return this._props.maintenanceCount;
  }

  get lastMaintenanceDate(): string | undefined {
    return this._props.lastMaintenanceDate;
  }

  get lastMaintenanceImpressions(): number | undefined {
    return this._props.lastMaintenanceImpressions;
  }

  get lastUsedDate(): string | undefined {
    return this._props.lastUsedDate;
  }

  get meshCount(): string | undefined {
    return this._props.meshCount;
  }

  get meshMaterial(): string | undefined {
    return this._props.meshMaterial;
  }

  get size(): string | undefined {
    return this._props.size;
  }

  get tensionValue(): number | undefined {
    return this._props.tensionValue;
  }

  get frameType(): string | undefined {
    return this._props.frameType;
  }

  get customerId(): number | undefined {
    return this._props.customerId;
  }

  get reclaimCount(): number | undefined {
    return this._props.reclaimCount;
  }

  get exposureDate(): string | undefined {
    return this._props.exposureDate;
  }

  get lastCleanDate(): string | undefined {
    return this._props.lastCleanDate;
  }

  get lastReclaimDate(): string | undefined {
    return this._props.lastReclaimDate;
  }

  get tensionDate(): string | undefined {
    return this._props.tensionDate;
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
    assetType?: string;
    layoutType?: string;
    piecesPerImpression?: number;
    material?: string;
    qrCode?: string;
    supplierId?: number;
    maintenanceInterval?: number;
    meshCount?: string;
    meshMaterial?: string;
    size?: string;
    tensionValue?: number;
    frameType?: string;
    customerId?: number;
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
      assetType: input.assetType,
      layoutType: input.layoutType,
      piecesPerImpression: input.piecesPerImpression,
      material: input.material,
      qrCode: input.qrCode,
      supplierId: input.supplierId,
      maintenanceInterval: input.maintenanceInterval,
      maintenanceCount: 0,
      meshCount: input.meshCount,
      meshMaterial: input.meshMaterial,
      size: input.size,
      tensionValue: input.tensionValue,
      frameType: input.frameType,
      customerId: input.customerId,
      reclaimCount: 0,
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
      assetType: row.asset_type as string | undefined,
      layoutType: row.layout_type as string | undefined,
      piecesPerImpression: row.pieces_per_impression as number | undefined,
      material: row.material as string | undefined,
      qrCode: row.qr_code as string | undefined,
      supplierId: row.supplier_id as number | undefined,
      maintenanceInterval: row.maintenance_interval as number | undefined,
      maintenanceCount: row.maintenance_count as number | undefined,
      lastMaintenanceDate: row.last_maintenance_date as string | undefined,
      lastMaintenanceImpressions: row.last_maintenance_impressions as number | undefined,
      lastUsedDate: row.last_used_date as string | undefined,
      meshCount: row.mesh_count as string | undefined,
      meshMaterial: row.mesh_material as string | undefined,
      size: row.size as string | undefined,
      tensionValue: row.tension_value as number | undefined,
      frameType: row.frame_type as string | undefined,
      customerId: row.customer_id as number | undefined,
      reclaimCount: row.reclaim_count as number | undefined,
      exposureDate: row.exposure_date as string | undefined,
      lastCleanDate: row.last_clean_date as string | undefined,
      lastReclaimDate: row.last_reclaim_date as string | undefined,
      tensionDate: row.tension_date as string | undefined,
      scrapReason: row.scrap_reason as string | undefined,
      scrapTime: row.scrap_time as string | undefined,
      scrapBy: row.scrap_by as number | undefined,
      remark: row.remark as string | undefined,
      isDeleted: row.deleted as number,
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
      asset_type: this._props.assetType,
      layout_type: this._props.layoutType,
      pieces_per_impression: this._props.piecesPerImpression,
      material: this._props.material,
      qr_code: this._props.qrCode,
      supplier_id: this._props.supplierId,
      maintenance_interval: this._props.maintenanceInterval,
      maintenance_count: this._props.maintenanceCount,
      last_maintenance_date: this._props.lastMaintenanceDate,
      last_maintenance_impressions: this._props.lastMaintenanceImpressions,
      last_used_date: this._props.lastUsedDate,
      mesh_count: this._props.meshCount,
      mesh_material: this._props.meshMaterial,
      size: this._props.size,
      tension_value: this._props.tensionValue,
      frame_type: this._props.frameType,
      customer_id: this._props.customerId,
      reclaim_count: this._props.reclaimCount,
      exposure_date: this._props.exposureDate,
      last_clean_date: this._props.lastCleanDate,
      last_reclaim_date: this._props.lastReclaimDate,
      tension_date: this._props.tensionDate,
      scrap_reason: this._props.scrapReason,
      scrap_time: this._props.scrapTime,
      scrap_by: this._props.scrapBy,
      remark: this._props.remark,
      deleted: this._props.isDeleted,
    };
  }
}
