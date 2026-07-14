import { DomainEvent, DomainError } from '@/domain/shared/DomainTypes';
import { DieSpecification, DieSpecificationProps } from '../value-objects/DieSpecification';
import {
  DieCreatedEvent,
  DieStatusChangedEvent,
  DieUsageRecordedEvent,
  DieMaintenanceCreatedEvent,
  DieMaintenanceCompletedEvent,
  DieScrappedEvent,
} from '../events/DieEvents';

export type DieStatusValue =
  | 'available'
  | 'in_use'
  | 'maintenance_needed'
  | 're_rule_needed'
  | 'scrap';

export class Die {
  private _events: DomainEvent[] = [];

  constructor(
    public id: number | undefined,
    public specification: DieSpecification,
    public status: DieStatusValue,
    public statusCode: number,
    public purchaseDate: string | undefined,
    public lastMaintenanceDate: string | undefined,
    public lastUsedDate: string | undefined,
    public lastMaintenanceImpressions: number,
    public maintenanceCount: number,
    public storageLocation: string,
    public unitPrice: number,
    public supplierId: number | undefined,
    public qrCode: string,
    public remark: string
  ) {}

  static register(props: DieSpecificationProps): Die {
    const spec = new DieSpecification(props);
    const computedStatus = spec.computeDieStatus();
    const die = new Die(
      undefined,
      spec,
      computedStatus,
      computedStatus === 'scrap'
        ? 4
        : computedStatus === 're_rule_needed'
          ? 3
          : computedStatus === 'maintenance_needed'
            ? 2
            : 1,
      undefined,
      undefined,
      undefined,
      0,
      0,
      '',
      0,
      undefined,
      '',
      ''
    );
    die._events.push(
      new DieCreatedEvent({
        dieCode: spec.dieCode,
        dieName: spec.dieName,
        templateType: spec.templateType,
      })
    );
    return die;
  }

  static fromRow(row: Record<string, unknown>): Die {
    const spec = new DieSpecification({
      dieCode: (row.template_code as string) || (row.die_code as string),
      dieName: (row.template_name as string) || (row.die_name as string),
      templateType: (row.template_type as number) || 1,
      assetType: (row.asset_type as string) || 'die',
      specification: (row.specification as string) || '',
      material: (row.material as string) || '',
      maxUsage: (row.max_usage as number) || 0,
      currentUsage: (row.current_usage as number) || 0,
      remainingUsage: (row.remaining_usage as number) || 0,
      warningUsage:
        (row.warning_usage as number) || Math.round(((row.max_usage as number) || 0) * 0.2),
      maxImpressions: (row.max_impressions as number) || 0,
      cumulativeImpressions: (row.cumulative_impressions as number) || 0,
      warningThreshold: (row.warning_threshold as number) || 80,
      maintenanceInterval: (row.maintenance_interval as number) || 8000,
      piecesPerImpression: (row.pieces_per_impression as number) || 1,
    });
    return new Die(
      row.id as number,
      spec,
      (row.die_status as DieStatusValue) || spec.computeDieStatus(),
      (row.status as number) || 1,
      row.purchase_date as string | undefined,
      row.last_maintenance_date as string | undefined,
      row.last_used_date as string | undefined,
      (row.last_maintenance_impressions as number) || 0,
      (row.maintenance_count as number) || 0,
      (row.storage_location as string) || '',
      (row.unit_price as number) || 0,
      row.supplier_id as number | undefined,
      (row.qr_code as string) || '',
      (row.remark as string) || ''
    );
  }

  toRow(): Record<string, unknown> {
    return {
      template_code: this.specification.dieCode,
      template_name: this.specification.dieName,
      template_type: this.specification.templateType,
      asset_type: this.specification.assetType,
      specification: this.specification.specification,
      material: this.specification.material,
      max_usage: this.specification.maxUsage,
      current_usage: this.specification.currentUsage,
      remaining_usage: this.specification.remainingUsage,
      warning_usage: this.specification.warningUsage,
      max_impressions: this.specification.maxImpressions,
      cumulative_impressions: this.specification.cumulativeImpressions,
      warning_threshold: this.specification.warningThreshold,
      maintenance_interval: this.specification.maintenanceInterval,
      pieces_per_impression: this.specification.piecesPerImpression,
      die_status: this.status,
      status: this.statusCode,
      storage_location: this.storageLocation,
      purchase_date: this.purchaseDate,
      supplier_id: this.supplierId,
      unit_price: this.unitPrice,
      qr_code: this.qrCode,
      remark: this.remark,
      maintenance_count: this.maintenanceCount,
      last_maintenance_impressions: this.lastMaintenanceImpressions,
      last_maintenance_date: this.lastMaintenanceDate,
      last_used_date: this.lastUsedDate,
    };
  }

  recordUsage(impressions: number, operatorId?: number, operatorName?: string): void {
    if (this.status === 'scrap') {
      throw new DomainError('已报废刀模不能使用');
    }
    if (this.status === 're_rule_needed') {
      throw new DomainError('需重做刀模请先保养后再使用');
    }
    const newCumulative = this.specification.cumulativeImpressions + impressions;
    const updatedSpec = new DieSpecification({
      ...this.specification,
      cumulativeImpressions: newCumulative,
      currentUsage: newCumulative,
      remainingUsage: Math.max(this.specification.maxUsage - newCumulative, 0),
    });
    this.specification = updatedSpec;
    this.lastUsedDate = new Date().toISOString().slice(0, 10);
    this.status = this.specification.computeDieStatus();
    if (this.status === 'scrap') this.statusCode = 4;
    else if (newCumulative >= this.specification.maxImpressions) this.statusCode = 3;
    else if (this.status === 'maintenance_needed') this.statusCode = 2;
    else this.statusCode = 1;
    const prevCumulative = newCumulative - impressions;
    this._events.push(
      new DieUsageRecordedEvent({
        id: this.id,
        dieCode: this.specification.dieCode,
        impressions,
        cumulativeAfter: newCumulative,
        operatorId,
        operatorName,
      })
    );
  }

  recordMaintenance(
    maintenanceType: string,
    cost: number,
    technicianName?: string,
    impressionsAfter?: number
  ): void {
    const currentImpressions = this.specification.cumulativeImpressions;
    const after =
      impressionsAfter !== undefined
        ? impressionsAfter
        : maintenanceType === 're_rule' || maintenanceType === 'replace'
          ? 0
          : currentImpressions;
    const updatedSpec = new DieSpecification({
      ...this.specification,
      cumulativeImpressions: after,
      currentUsage: after,
      remainingUsage: Math.max(this.specification.maxUsage - after, 0),
    });
    this.specification = updatedSpec;
    this.lastMaintenanceDate = new Date().toISOString().slice(0, 10);
    this.lastMaintenanceImpressions = currentImpressions;
    this.maintenanceCount += 1;
    this.status = this.specification.computeDieStatus();
    this.statusCode = 1;
    this._events.push(
      new DieMaintenanceCompletedEvent({
        id: this.id,
        dieCode: this.specification.dieCode,
        maintenanceType,
        cost,
        technicianName,
        impressionsBefore: currentImpressions,
        impressionsAfter: after,
      })
    );
  }

  scrap(reason: string): void {
    if (this.status === 'scrap') {
      throw new DomainError('刀模已报废');
    }
    this.status = 'scrap';
    this.statusCode = 4;
    this.remark = reason;
    this._events.push(
      new DieScrappedEvent({
        id: this.id,
        dieCode: this.specification.dieCode,
        reason,
      })
    );
  }

  getDomainEvents(): DomainEvent[] {
    return this._events;
  }

  clearDomainEvents(): void {
    this._events = [];
  }

  get cumulativeImpressions(): number {
    return this.specification.cumulativeImpressions;
  }

  get usageRate(): number {
    return this.specification.usageRate;
  }

  get impressionRate(): number {
    return this.specification.impressionRate;
  }

  get isWarning(): boolean {
    return this.specification.isWarning;
  }

  get isEndOfLife(): boolean {
    return this.specification.isEndOfLife;
  }

  get needsMaintenance(): boolean {
    return this.specification.needsMaintenance;
  }
}
