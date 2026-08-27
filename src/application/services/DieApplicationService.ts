import { IDieRepository } from '@/domain/prepress/repositories/IDieRepository';
import { Die, DieStatusValue } from '@/domain/prepress/aggregates/Die';
import { DieSpecificationProps } from '@/domain/prepress/value-objects/DieSpecification';
import { DomainError } from '@/domain/shared/DomainTypes';

export class DieApplicationService {
  constructor(private dieRepo: IDieRepository) {}

  async register(props: {
    dieCode?: string;
    dieName: string;
    templateType: number;
    assetType?: string;
    specification?: string;
    material?: string;
    maxUsage: number;
    currentUsage?: number;
    warningUsage?: number;
    maxImpressions?: number;
    cumulativeImpressions?: number;
    warningThreshold?: number;
    maintenanceInterval?: number;
    piecesPerImpression?: number;
    storageLocation?: string;
    purchaseDate?: string;
    supplierId?: number;
    unitPrice?: number;
    qrCode?: string;
    remark?: string;
  }): Promise<Die> {
    const dieCode = props.dieCode || `DIE${Date.now()}`;
    const exists = await this.dieRepo.existsByCode(dieCode);
    if (exists) throw new DomainError(`刀模编号 ${dieCode} 已存在`);

    const specProps: DieSpecificationProps = {
      dieCode,
      dieName: props.dieName,
      templateType: props.templateType,
      assetType: props.assetType || (props.templateType === 2 ? 'screen_mesh' : 'die'),
      specification: props.specification,
      material: props.material,
      maxUsage: props.maxUsage,
      currentUsage: props.currentUsage || 0,
      remainingUsage: props.maxUsage - (props.currentUsage || 0),
      warningUsage: props.warningUsage || Math.round(props.maxUsage * 0.2),
      maxImpressions: props.maxImpressions || props.maxUsage,
      cumulativeImpressions: props.cumulativeImpressions || props.currentUsage || 0,
      warningThreshold: props.warningThreshold || 80,
      maintenanceInterval: props.maintenanceInterval || 8000,
      piecesPerImpression: props.piecesPerImpression || 1,
    };

    const die = Die.register(specProps);
    die.storageLocation = props.storageLocation || '';
    die.purchaseDate = props.purchaseDate;
    die.supplierId = props.supplierId;
    die.unitPrice = props.unitPrice || 0;
    die.qrCode = props.qrCode || '';
    die.remark = props.remark || '';

    const id = await this.dieRepo.save(die);
    return new Die(
      id,
      die.specification,
      die.status,
      die.statusCode,
      die.purchaseDate,
      undefined,
      undefined,
      0,
      0,
      die.storageLocation,
      die.unitPrice,
      die.supplierId,
      die.qrCode,
      die.remark
    );
  }

  async update(
    equipmentId: number,
    props: Partial<{
      dieName: string;
      assetType: string;
      specification: string;
      material: string;
      maxUsage: number;
      currentUsage: number;
      warningUsage: number;
      maxImpressions: number;
      cumulativeImpressions: number;
      warningThreshold: number;
      maintenanceInterval: number;
      dieStatus: DieStatusValue;
      statusCode: number;
      storageLocation: string;
      unitPrice: number;
      qrCode: string;
      remark: string;
    }>
  ): Promise<void> {
    const die = await this.dieRepo.getById(equipmentId);
    if (!die) throw new DomainError('刀模/网版不存在');

    if (props.maxUsage !== undefined || props.currentUsage !== undefined) {
      const maxUsage = props.maxUsage ?? die.specification.maxUsage;
      const currentUsage = props.currentUsage ?? die.specification.currentUsage;
      const remainingUsage = maxUsage - currentUsage;
      die.specification = new (
        await import('@/domain/prepress/value-objects/DieSpecification')
      ).DieSpecification({
        ...die.specification,
        maxUsage,
        currentUsage,
        remainingUsage,
        warningUsage: props.warningUsage ?? die.specification.warningUsage,
        maxImpressions: props.maxImpressions ?? die.specification.maxImpressions,
        cumulativeImpressions:
          props.cumulativeImpressions ?? die.specification.cumulativeImpressions,
        warningThreshold: props.warningThreshold ?? die.specification.warningThreshold,
        maintenanceInterval: props.maintenanceInterval ?? die.specification.maintenanceInterval,
      });
    }

    if (props.dieName !== undefined)
      die.specification = new (
        await import('@/domain/prepress/value-objects/DieSpecification')
      ).DieSpecification({ ...die.specification, dieName: props.dieName });
    if (props.assetType !== undefined)
      die.specification = new (
        await import('@/domain/prepress/value-objects/DieSpecification')
      ).DieSpecification({ ...die.specification, assetType: props.assetType });
    if (props.dieStatus !== undefined) die.status = props.dieStatus;
    if (props.statusCode !== undefined) die.statusCode = props.statusCode;
    if (props.storageLocation !== undefined) die.storageLocation = props.storageLocation;
    if (props.unitPrice !== undefined) die.unitPrice = props.unitPrice;
    if (props.qrCode !== undefined) die.qrCode = props.qrCode;
    if (props.remark !== undefined) die.remark = props.remark;

    // Recompute status from specification
    const computedStatus = die.specification.computeDieStatus();
    if (!props.dieStatus) {
      die.status = computedStatus;
    }

    await this.dieRepo.update(die);
  }

  async recordUsage(
    dieId: number,
    impressions: number,
    context?: {
      workOrderId?: number;
      workOrderNo?: string;
      processName?: string;
      operatorId?: number;
      operatorName?: string;
      equipmentId?: number;
      remark?: string;
    }
  ): Promise<Die> {
    const die = await this.dieRepo.getById(dieId);
    if (!die) throw new DomainError('刀模/网版不存在');
    die.recordUsage(impressions, context?.operatorId, context?.operatorName);
    await this.dieRepo.update(die);
    return die;
  }

  async recordMaintenance(
    dieId: number,
    maintenanceType: string,
    cost: number,
    technicianName?: string,
    impressionsAfter?: number
  ): Promise<Die> {
    const die = await this.dieRepo.getById(dieId);
    if (!die) throw new DomainError('刀模/网版不存在');
    die.recordMaintenance(maintenanceType, cost, technicianName, impressionsAfter);
    await this.dieRepo.update(die);
    return die;
  }

  async scrap(dieId: number, reason: string): Promise<void> {
    const die = await this.dieRepo.getById(dieId);
    if (!die) throw new DomainError('刀模/网版不存在');
    die.scrap(reason);
    await this.dieRepo.update(die);
  }

  async getById(id: number): Promise<Die | null> {
    return this.dieRepo.getById(id);
  }

  async list(params?: {
    keyword?: string;
    templateType?: number;
    assetType?: string;
    dieStatus?: DieStatusValue;
    status?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: Die[]; total: number }> {
    return this.dieRepo.findAll(params);
  }

  async getDashboardStats(): Promise<Record<string, unknown>> {
    return this.dieRepo.getDashboardStats();
  }

  async getTypeStats(): Promise<Record<string, unknown>[]> {
    return this.dieRepo.getTypeStats();
  }

  async softDelete(id: number): Promise<void> {
    await this.dieRepo.softDelete(id);
  }
}
