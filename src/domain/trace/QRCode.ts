import { DomainError } from '@/domain/shared/DomainTypes';

export const QR_TYPE = {
  MATERIAL: 'material',
  PRODUCT: 'product',
  WORKORDER: 'workorder',
  INK: 'ink',
  SCREEN_PLATE: 'screen_plate',
  DIE: 'die',
  SHIPMENT: 'shipment',
  SPLIT: 'split',
} as const;

export const QR_STATUS = {
  ACTIVE: 1,
  USED: 2,
  INVALID: 3,
  VOID: 9,
} as const;

export interface QRCodeProps {
  id?: number;
  qrCode: string;
  qrType: string;
  parentQrCode?: string | null;
  splitFlag?: number;
  splitIndex?: number;
  batchNo?: string | null;
  materialId?: number | null;
  materialCode?: string | null;
  materialName?: string | null;
  specification?: string | null;
  quantity?: number;
  unit?: string | null;
  warehouseId?: number | null;
  warehouseName?: string | null;
  location?: string | null;
  refId?: number | null;
  refNo?: string | null;
  workOrderId?: number | null;
  workOrderNo?: string | null;
  supplierId?: number | null;
  supplierName?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  productionDate?: string | null;
  expiryDate?: string | null;
  status?: number;
  extraData?: Record<string, unknown> | null;
  remark?: string | null;
}

export class QRCode {
  public readonly id: number | undefined;
  public readonly qrCode: string;
  public readonly qrType: string;
  public readonly parentQrCode: string | null;
  public readonly splitFlag: number;
  public readonly splitIndex: number;
  public readonly batchNo: string | null;
  public readonly materialId: number | null;
  public readonly materialCode: string | null;
  public readonly materialName: string | null;
  public readonly specification: string | null;
  public readonly unit: string | null;
  public readonly warehouseId: number | null;
  public readonly warehouseName: string | null;
  public readonly refId: number | null;
  public readonly refNo: string | null;
  public readonly workOrderId: number | null;
  public readonly workOrderNo: string | null;
  public readonly supplierId: number | null;
  public readonly supplierName: string | null;
  public readonly customerId: number | null;
  public readonly customerName: string | null;
  public readonly productionDate: string | null;
  public readonly expiryDate: string | null;
  public readonly extraData: Record<string, unknown> | null;
  public readonly remark: string | null;
  private _quantity: number;
  private _status: number;

  private constructor(props: QRCodeProps) {
    this.id = props.id;
    this.qrCode = props.qrCode;
    this.qrType = props.qrType;
    this.parentQrCode = props.parentQrCode ?? null;
    this.splitFlag = props.splitFlag ?? 0;
    this.splitIndex = props.splitIndex ?? 0;
    this.batchNo = props.batchNo ?? null;
    this.materialId = props.materialId ?? null;
    this.materialCode = props.materialCode ?? null;
    this.materialName = props.materialName ?? null;
    this.specification = props.specification ?? null;
    this._quantity = props.quantity ?? 0;
    this.unit = props.unit ?? null;
    this.warehouseId = props.warehouseId ?? null;
    this.warehouseName = props.warehouseName ?? null;
    this.refId = props.refId ?? null;
    this.refNo = props.refNo ?? null;
    this.workOrderId = props.workOrderId ?? null;
    this.workOrderNo = props.workOrderNo ?? null;
    this.supplierId = props.supplierId ?? null;
    this.supplierName = props.supplierName ?? null;
    this.customerId = props.customerId ?? null;
    this.customerName = props.customerName ?? null;
    this.productionDate = props.productionDate ?? null;
    this.expiryDate = props.expiryDate ?? null;
    this.extraData = props.extraData ?? null;
    this.remark = props.remark ?? null;
    this._status = props.status ?? QR_STATUS.ACTIVE;
  }

  static create(props: QRCodeProps): QRCode {
    if (!props.qrCode) throw new DomainError('二维码编码不能为空');
    if (!props.qrType) throw new DomainError('二维码类型不能为空');
    if (props.quantity !== undefined && props.quantity < 0) throw new DomainError('数量不能为负数');
    return new QRCode(props);
  }

  static reconstitute(props: QRCodeProps): QRCode {
    return new QRCode(props);
  }

  split(quantity: number, totalSplits: number, index: number): QRCode {
    if (quantity <= 0) throw new DomainError('拆分数量必须大于0');
    if (quantity > this._quantity) throw new DomainError('拆分数量不能超过父码剩余数量');
    if (index <= 0) throw new DomainError('拆分子码索引必须大于0');
    if (index > totalSplits) throw new DomainError('拆分子码索引不能超过总数');
    return new QRCode({
      qrCode: `${this.qrCode}-S${index}`,
      qrType: QR_TYPE.SPLIT,
      parentQrCode: this.qrCode,
      splitFlag: 1,
      splitIndex: index,
      batchNo: this.batchNo,
      quantity,
      materialId: this.materialId,
      materialCode: this.materialCode,
      materialName: this.materialName,
      unit: this.unit,
      warehouseId: this.warehouseId,
    });
  }

  reduceQuantity(amount: number): void {
    if (amount < 0) throw new DomainError('扣减数量不能为负数');
    if (amount > this._quantity) throw new DomainError('扣减数量不能超过当前数量');
    this._quantity -= amount;
  }

  get quantity(): number {
    return this._quantity;
  }

  get status(): number {
    return this._status;
  }
}
