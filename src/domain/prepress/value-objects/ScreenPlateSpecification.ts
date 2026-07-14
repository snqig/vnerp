import { DomainError } from '@/domain/shared/DomainTypes';
import { FieldMapper, assertField, assertPositive } from './FieldMapping';

export interface ScreenPlateSpecificationProps {
  plateCode: string;
  plateName: string;
  plateType?: string;
  meshCount?: string;
  meshMaterial?: string;
  sizeSpec?: string;
  frameType?: string;
  tensionValue?: number;
  maxUseCount: number;
  usedCount: number;
  remainingCount: number;
  maintenanceDays: number;
  customerId?: number;
  productName?: string;
  exposureDate?: string;
  lastCleanDate?: string;
  lastReclaimDate?: string;
  tensionDate?: string;
}

export class ScreenPlateSpecification {
  readonly plateCode: string;
  readonly plateName: string;
  readonly plateType: string;
  readonly meshCount: string;
  readonly meshMaterial: string;
  readonly sizeSpec: string;
  readonly frameType: string;
  readonly tensionValue: number;
  readonly maxUseCount: number;
  readonly usedCount: number;
  readonly remainingCount: number;
  readonly maintenanceDays: number;
  readonly customerId: number;
  readonly productName: string;
  readonly exposureDate: string;
  readonly lastCleanDate: string;
  readonly lastReclaimDate: string;
  readonly tensionDate: string;

  constructor(props: ScreenPlateSpecificationProps) {
    assertField(props.plateCode, '网版编码');
    assertField(props.plateName, '网版名称');
    assertPositive(props.maxUseCount, '最大使用次数');
    if (props.usedCount > props.maxUseCount) {
      throw new DomainError('当前使用次数不能超过最大使用次数');
    }

    this.plateCode = props.plateCode;
    this.plateName = props.plateName;
    this.plateType = props.plateType || '';
    this.meshCount = props.meshCount || '';
    this.meshMaterial = props.meshMaterial || '';
    this.sizeSpec = props.sizeSpec || '';
    this.frameType = props.frameType || '';
    this.tensionValue = props.tensionValue || 0;
    this.maxUseCount = props.maxUseCount;
    this.usedCount = props.usedCount;
    this.remainingCount = props.remainingCount;
    this.maintenanceDays = props.maintenanceDays || 360;
    this.customerId = props.customerId || 0;
    this.productName = props.productName || '';
    this.exposureDate = props.exposureDate || '';
    this.lastCleanDate = props.lastCleanDate || '';
    this.lastReclaimDate = props.lastReclaimDate || '';
    this.tensionDate = props.tensionDate || '';
  }

  get usageRate(): number {
    return (this.usedCount / this.maxUseCount) * 100;
  }

  get isWarning(): boolean {
    return this.remainingCount <= Math.round(this.maxUseCount * 0.2);
  }

  get needsReclaim(): boolean {
    return this.remainingCount <= 0;
  }

  toDb(): Record<string, unknown> {
    return FieldMapper.toDb({
      plateCode: this.plateCode,
      plateName: this.plateName,
      plateType: this.plateType,
      meshCount: this.meshCount,
      meshMaterial: this.meshMaterial,
      sizeSpec: this.sizeSpec,
      frameType: this.frameType,
      tensionValue: this.tensionValue,
      maxUseCount: this.maxUseCount,
      usedCount: this.usedCount,
      remainingCount: this.remainingCount,
      maintenanceDays: this.maintenanceDays,
      customerId: this.customerId,
      productName: this.productName,
      exposureDate: this.exposureDate,
      lastCleanDate: this.lastCleanDate,
      lastReclaimDate: this.lastReclaimDate,
      tensionDate: this.tensionDate,
    });
  }
}
