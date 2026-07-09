/**
 * 配方明细值对象 — 封装比例合法性校验
 * 依据: docs/油墨配方版本管理完整落地方案.md 第一节
 */
import { DomainError } from '@/domain/shared/DomainTypes';

export interface FormulaItemProps {
  id?: number;
  versionId?: number;
  materialId?: number | null;
  materialCode: string;
  materialName: string;
  inkType?: string | null;
  brand?: string | null;
  ratio: number;
  weight?: number | null;
  unit?: string;
  addOrder?: number;
  processRemark?: string | null;
  sort?: number;
  isBase?: number;
  snapshotUnitCost?: number | null;
}

export class FormulaItemVO {
  readonly id?: number;
  readonly versionId?: number;
  readonly materialId: number | null;
  readonly materialCode: string;
  readonly materialName: string;
  readonly inkType: string | null;
  readonly brand: string | null;
  readonly ratio: number;
  readonly weight: number | null;
  readonly unit: string;
  readonly addOrder: number;
  readonly processRemark: string | null;
  readonly sort: number;
  readonly isBase: number;
  readonly snapshotUnitCost: number | null;

  constructor(props: FormulaItemProps) {
    this.validate(props);

    this.id = props.id;
    this.versionId = props.versionId;
    this.materialId = props.materialId ?? null;
    this.materialCode = props.materialCode;
    this.materialName = props.materialName;
    this.inkType = props.inkType ?? null;
    this.brand = props.brand ?? null;
    this.ratio = props.ratio;
    this.weight = props.weight ?? null;
    this.unit = props.unit ?? 'kg';
    this.addOrder = props.addOrder ?? 0;
    this.processRemark = props.processRemark ?? null;
    this.sort = props.sort ?? 0;
    this.isBase = props.isBase ?? 0;
    this.snapshotUnitCost = props.snapshotUnitCost ?? null;
  }

  private validate(props: FormulaItemProps): void {
    if (!props.materialCode || props.materialCode.trim() === '') {
      throw new DomainError('物料编码不能为空');
    }
    if (!props.materialName || props.materialName.trim() === '') {
      throw new DomainError('物料名称不能为空');
    }
    if (props.ratio < 0) {
      throw new DomainError(`配比比例不能为负数: ${props.materialCode}`);
    }
    if (props.ratio > 100) {
      throw new DomainError(`配比比例不能超过100%: ${props.materialCode}`);
    }
  }

  equals(other: FormulaItemVO): boolean {
    return this.materialCode === other.materialCode;
  }

  /** 与另一个明细对比，返回有差异的字段名列表 */
  diffFields(other: FormulaItemVO): string[] {
    const fields: string[] = [];
    if (Number(this.ratio) !== Number(other.ratio)) fields.push('ratio');
    if (Number(this.weight ?? 0) !== Number(other.weight ?? 0)) fields.push('weight');
    if ((this.addOrder ?? 0) !== (other.addOrder ?? 0)) fields.push('add_order');
    if ((this.processRemark ?? '') !== (other.processRemark ?? '')) fields.push('process_remark');
    if ((this.inkType ?? '') !== (other.inkType ?? '')) fields.push('ink_type');
    if ((this.brand ?? '') !== (other.brand ?? '')) fields.push('brand');
    if ((this.isBase ?? 0) !== (other.isBase ?? 0)) fields.push('is_base');
    return fields;
  }

  toProps(): FormulaItemProps {
    return {
      id: this.id,
      versionId: this.versionId,
      materialId: this.materialId,
      materialCode: this.materialCode,
      materialName: this.materialName,
      inkType: this.inkType,
      brand: this.brand,
      ratio: this.ratio,
      weight: this.weight,
      unit: this.unit,
      addOrder: this.addOrder,
      processRemark: this.processRemark,
      sort: this.sort,
      isBase: this.isBase,
      snapshotUnitCost: this.snapshotUnitCost,
    };
  }
}
