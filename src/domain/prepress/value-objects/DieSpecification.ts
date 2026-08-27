import { DomainError } from '@/domain/shared/DomainTypes';
import { FieldMapper, assertField, assertPositive, assertMaxUsage } from './FieldMapping';

export interface DieSpecificationProps {
  dieCode: string;
  dieName: string;
  templateType: number;
  assetType: string;
  specification?: string;
  material?: string;
  maxUsage: number;
  currentUsage: number;
  remainingUsage: number;
  warningUsage: number;
  maxImpressions: number;
  cumulativeImpressions: number;
  warningThreshold: number;
  maintenanceInterval: number;
  piecesPerImpression: number;
}

export class DieSpecification {
  readonly dieCode: string;
  readonly dieName: string;
  readonly templateType: number;
  readonly assetType: string;
  readonly specification: string;
  readonly material: string;
  readonly maxUsage: number;
  readonly currentUsage: number;
  readonly remainingUsage: number;
  readonly warningUsage: number;
  readonly maxImpressions: number;
  readonly cumulativeImpressions: number;
  readonly warningThreshold: number;
  readonly maintenanceInterval: number;
  readonly piecesPerImpression: number;

  constructor(props: DieSpecificationProps) {
    assertField(props.dieCode, '刀模编码');
    assertField(props.dieName, '刀模名称');
    assertPositive(props.maxUsage, '最大使用次数');
    assertMaxUsage(props.currentUsage, props.maxUsage);
    if (props.warningThreshold < 0 || props.warningThreshold > 100) {
      throw new DomainError('预警阈值必须在 0-100 之间');
    }

    this.dieCode = props.dieCode;
    this.dieName = props.dieName;
    this.templateType = props.templateType;
    this.assetType = props.assetType || 'die';
    this.specification = props.specification || '';
    this.material = props.material || '';
    this.maxUsage = props.maxUsage;
    this.currentUsage = props.currentUsage;
    this.remainingUsage = props.remainingUsage;
    this.warningUsage = props.warningUsage || Math.round(props.maxUsage * 0.2);
    this.maxImpressions = props.maxImpressions || props.maxUsage;
    this.cumulativeImpressions = props.cumulativeImpressions || props.currentUsage;
    this.warningThreshold = props.warningThreshold || 80;
    this.maintenanceInterval = props.maintenanceInterval || 8000;
    this.piecesPerImpression = props.piecesPerImpression || 1;
  }

  get usageRate(): number {
    return this.maxUsage > 0 ? (this.currentUsage / this.maxUsage) * 100 : 0;
  }

  get impressionRate(): number {
    return this.maxImpressions > 0 ? (this.cumulativeImpressions / this.maxImpressions) * 100 : 0;
  }

  get isWarning(): boolean {
    return this.remainingUsage <= this.warningUsage;
  }

  get isEndOfLife(): boolean {
    return this.remainingUsage <= 0 || this.cumulativeImpressions >= this.maxImpressions;
  }

  get needsMaintenance(): boolean {
    if (this.maintenanceInterval <= 0) return false;
    return this.cumulativeImpressions - this.maintenanceInterval >= 0;
  }

  computeDieStatus(): 'available' | 'in_use' | 'maintenance_needed' | 're_rule_needed' | 'scrap' {
    if (this.isEndOfLife || this.remainingUsage <= 0) return 'scrap';
    if (this.impressionRate >= 95) return 're_rule_needed';
    if (this.isWarning || this.impressionRate >= this.warningThreshold) return 'maintenance_needed';
    if (this.currentUsage > 0) return 'in_use';
    return 'available';
  }

  toDb(): Record<string, unknown> {
    return FieldMapper.toDb({
      dieCode: this.dieCode,
      dieName: this.dieName,
      templateType: this.templateType,
      assetType: this.assetType,
      specification: this.specification,
      material: this.material,
      maxUsage: this.maxUsage,
      currentUsage: this.currentUsage,
      remainingUsage: this.remainingUsage,
      warningUsage: this.warningUsage,
      maxImpressions: this.maxImpressions,
      cumulativeImpressions: this.cumulativeImpressions,
      warningThreshold: this.warningThreshold,
      maintenanceInterval: this.maintenanceInterval,
      piecesPerImpression: this.piecesPerImpression,
    });
  }
}
