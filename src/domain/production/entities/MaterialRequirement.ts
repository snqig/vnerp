import { t } from '@/lib/server-translate';

import { DomainError } from '../../shared/DomainTypes';

export interface MaterialRequirementProps {
  id?: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  specification?: string;
  unit: string;
  requiredQty: number;
  issuedQty: number;
  returnedQty: number;
  warehouseId?: number;
}

export class MaterialRequirement {
  private constructor(
    public readonly id: number | undefined,
    public readonly materialId: number,
    public readonly materialCode: string,
    public readonly materialName: string,
    public readonly specification: string,
    public readonly unit: string,
    private _requiredQty: number,
    private _issuedQty: number,
    private _returnedQty: number,
    public readonly warehouseId: number
  ) {}

  static create(props: MaterialRequirementProps): MaterialRequirement {
  const ts = t;
    if (!props.materialId || props.materialId <= 0) throw new DomainError(ts('k_1f11b1g'));
    if (!props.requiredQty || props.requiredQty <= 0) throw new DomainError(ts('k_7ufuml'));
    return new MaterialRequirement(
      props.id,
      props.materialId,
      props.materialCode || '',
      props.materialName || '',
      props.specification || '',
      props.unit || ts('k_w0gthl'),
      props.requiredQty,
      0,
      0,
      props.warehouseId || 1
    );
  }

  static reconstitute(props: MaterialRequirementProps): MaterialRequirement {
  const ts = t;
    return new MaterialRequirement(
      props.id,
      props.materialId,
      props.materialCode || '',
      props.materialName || '',
      props.specification || '',
      props.unit || ts('k_w0gthl'),
      props.requiredQty,
      props.issuedQty || 0,
      props.returnedQty || 0,
      props.warehouseId || 1
    );
  }

  get requiredQty(): number {
    return this._requiredQty;
  }
  get issuedQty(): number {
    return this._issuedQty;
  }
  get returnedQty(): number {
    return this._returnedQty;
  }

  get remainingQty(): number {
    return this._requiredQty - this._issuedQty + this._returnedQty;
  }
  get isFullyIssued(): boolean {
    return this._issuedQty >= this._requiredQty;
  }

  issue(quantity: number): void {
  const ts = t;
    if (quantity <= 0) throw new DomainError(ts('k_jkr0w4'));
    const newIssuedQty = this._issuedQty + quantity;
    if (newIssuedQty > this._requiredQty) {
      throw new DomainError(
        `领料超限: 需求${this._requiredQty}, 已领${this._issuedQty}, 本次${quantity}`
      );
    }
    this._issuedQty = newIssuedQty;
  }

  returnMaterial(quantity: number): void {
  const ts = t;
    if (quantity <= 0) throw new DomainError(ts('k_9v8iea'));
    if (quantity > this._issuedQty - this._returnedQty) {
      throw new DomainError(
        `退料超限: 已领${this._issuedQty}, 已退${this._returnedQty}, 本次${quantity}`
      );
    }
    this._returnedQty += quantity;
  }
}
