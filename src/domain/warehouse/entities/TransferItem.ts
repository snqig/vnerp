export interface TransferItemProps {
  id?: number;
  transferId?: number;
  materialId: number;
  materialCode?: string;
  materialName: string;
  qrCode?: string;
  batchNo?: string;
  quantity: number;
  outQuantity?: number;
  inQuantity?: number;
  unit: string;
  unitPrice: number;
  amount?: number;
  remark?: string;
}

export class TransferItem {
  public readonly id?: number;
  public readonly transferId?: number;
  public readonly materialId: number;
  public readonly materialCode: string;
  public readonly materialName: string;
  public readonly qrCode: string;
  public readonly batchNo: string;
  public readonly quantity: number;
  private _outQuantity: number;
  private _inQuantity: number;
  public readonly unit: string;
  public readonly unitPrice: number;
  public readonly remark: string;

  private constructor(props: TransferItemProps) {
    this.id = props.id;
    this.transferId = props.transferId;
    this.materialId = props.materialId;
    this.materialCode = props.materialCode || '';
    this.materialName = props.materialName;
    this.qrCode = props.qrCode || '';
    this.batchNo = props.batchNo || '';
    this.quantity = props.quantity;
    this._outQuantity = props.outQuantity || 0;
    this._inQuantity = props.inQuantity || 0;
    this.unit = props.unit || '件';
    this.unitPrice = props.unitPrice || 0;
    this.remark = props.remark || '';
  }

  static create(props: TransferItemProps): TransferItem {
    if (!props.materialId) {
      throw new Error('物料ID不能为空');
    }
    if (!props.quantity || props.quantity <= 0) {
      throw new Error('调拨数量必须大于0');
    }
    return new TransferItem(props);
  }

  static reconstitute(props: TransferItemProps): TransferItem {
    return new TransferItem(props);
  }

  get outQuantity(): number {
    return this._outQuantity;
  }

  get inQuantity(): number {
    return this._inQuantity;
  }

  get totalPrice(): number {
    return Math.round(this.quantity * this.unitPrice * 100) / 100;
  }

  recordOutQuantity(qty: number): void {
    if (qty < 0 || qty > this.quantity) {
      throw new Error('出库数量不能为负数或超过申请数量');
    }
    this._outQuantity = qty;
  }

  recordInQuantity(qty: number): void {
    if (qty < 0 || qty > this._outQuantity) {
      throw new Error('入库数量不能为负数或超过出库数量');
    }
    this._inQuantity = qty;
  }
}
