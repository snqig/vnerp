export interface StocktakingItemProps {
  id?: number;
  takingId?: number;
  materialId: number;
  materialCode?: string;
  materialName: string;
  batchNo?: string;
  warehouseId?: number;
  location?: string;
  bookQty: number;
  actualQty?: number;
  diffQty?: number;
  unit: string;
  unitPrice: number;
  diffAmount?: number;
  scanTime?: string;
  scanOperator?: string;
  remark?: string;
  status?: number; // 0-待盘, 1-已盘, 2-差异已处理
}

export class StocktakingItem {
  public readonly id?: number;
  public readonly takingId?: number;
  public readonly materialId: number;
  public readonly materialCode: string;
  public readonly materialName: string;
  public readonly batchNo: string;
  public readonly warehouseId?: number;
  public readonly location: string;
  public readonly bookQty: number;
  private _actualQty: number;
  private _diffQty: number;
  public readonly unit: string;
  public readonly unitPrice: number;
  private _diffAmount: number;
  public readonly scanTime?: string;
  public readonly scanOperator?: string;
  public readonly remark: string;
  private _status: number;

  private constructor(props: StocktakingItemProps) {
    this.id = props.id;
    this.takingId = props.takingId;
    this.materialId = props.materialId;
    this.materialCode = props.materialCode || '';
    this.materialName = props.materialName;
    this.batchNo = props.batchNo || '';
    this.warehouseId = props.warehouseId;
    this.location = props.location || '';
    this.bookQty = props.bookQty || 0;
    this._actualQty = props.actualQty ?? 0;
    this._diffQty = props.diffQty ?? 0;
    this.unit = props.unit || '件';
    this.unitPrice = props.unitPrice || 0;
    this._diffAmount = props.diffAmount ?? 0;
    this.scanTime = props.scanTime;
    this.scanOperator = props.scanOperator;
    this.remark = props.remark || '';
    this._status = props.status ?? 0;
  }

  static create(props: StocktakingItemProps): StocktakingItem {
    if (!props.materialId) {
      throw new Error('物料ID不能为空');
    }
    return new StocktakingItem(props);
  }

  static reconstitute(props: StocktakingItemProps): StocktakingItem {
    return new StocktakingItem(props);
  }

  get actualQty(): number {
    return this._actualQty;
  }

  get diffQty(): number {
    return this._diffQty;
  }

  get diffAmount(): number {
    return this._diffAmount;
  }

  get status(): number {
    return this._status;
  }

  recordActualQty(qty: number, operator?: string): void {
    if (qty < 0) {
      throw new Error('实盘数量不能为负数');
    }
    this._actualQty = qty;
    this._diffQty = Math.round((qty - this.bookQty) * 10000) / 10000;
    this._diffAmount = Math.round(this._diffQty * this.unitPrice * 100) / 100;
    this._status = 1;
    if (operator) {
      // scanOperator is readonly in constructor; for domain mutation we rely on repository to persist
    }
  }

  markDiffProcessed(): void {
    this._status = 2;
  }

  hasDiff(): boolean {
    return Math.abs(this._diffQty) > 0.0001;
  }
}
