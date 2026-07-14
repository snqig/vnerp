import { DomainError } from '@/domain/shared/DomainTypes';
import { FieldMapper, assertField } from './FieldMapping';

export interface InkSpecificationProps {
  inkCode: string;
  inkName: string;
  inkType?: string;
  baseColor?: string;
  colorCode?: string;
  density?: number;
  viscosity?: number;
  fineness?: number;
  mixingRatio?: string;
  unitPrice?: number;
  packageSize?: string;
  storageCondition?: string;
  shelfLifeDays?: number;
  remark?: string;
}

export class InkSpecification {
  readonly inkCode: string;
  readonly inkName: string;
  readonly inkType: string;
  readonly baseColor: string;
  readonly colorCode: string;
  readonly density: number;
  readonly viscosity: number;
  readonly fineness: number;
  readonly mixingRatio: string;
  readonly unitPrice: number;
  readonly packageSize: string;
  readonly storageCondition: string;
  readonly shelfLifeDays: number;
  readonly remark: string;

  constructor(props: InkSpecificationProps) {
    assertField(props.inkCode, '油墨编码');
    assertField(props.inkName, '油墨名称');

    this.inkCode = props.inkCode;
    this.inkName = props.inkName;
    this.inkType = props.inkType || '';
    this.baseColor = props.baseColor || '';
    this.colorCode = props.colorCode || '';
    this.density = props.density || 0;
    this.viscosity = props.viscosity || 0;
    this.fineness = props.fineness || 0;
    this.mixingRatio = props.mixingRatio || '';
    this.unitPrice = props.unitPrice || 0;
    this.packageSize = props.packageSize || '';
    this.storageCondition = props.storageCondition || '';
    this.shelfLifeDays = props.shelfLifeDays || 365;
    this.remark = props.remark || '';
  }

  get isExpired(): boolean {
    return this.shelfLifeDays <= 0;
  }

  toDb(): Record<string, unknown> {
    return FieldMapper.toDb({
      inkCode: this.inkCode,
      inkName: this.inkName,
      inkType: this.inkType,
      baseColor: this.baseColor,
      colorCode: this.colorCode,
      density: this.density,
      viscosity: this.viscosity,
      fineness: this.fineness,
      mixingRatio: this.mixingRatio,
      unitPrice: this.unitPrice,
      packageSize: this.packageSize,
      storageCondition: this.storageCondition,
      shelfLifeDays: this.shelfLifeDays,
      remark: this.remark,
    });
  }
}
