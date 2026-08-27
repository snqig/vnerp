export interface InboundItemProps {
  id?: number;
  orderId?: number;
  purchaseOrderItemId?: number;
  purchaseOrderLineNo?: number;
  materialId: number;
  materialCode?: string;
  materialName: string;
  materialSpec?: string;
  batchNo: string;
  batchId?: number | null;
  originalInboundDate?: string | null;
  locationId?: number | null;
  qrCode?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  warehouseLocation?: string;
  produceDate?: string;
}

export class InboundItem {
  public readonly id?: number;
  public readonly orderId?: number;
  private readonly _purchaseOrderItemId?: number;
  private readonly _purchaseOrderLineNo?: number;
  public readonly materialId: number;
  public readonly materialCode: string;
  public readonly materialName: string;
  public readonly materialSpec: string;
  public readonly batchNo: string;
  public readonly batchId?: number | null;
  public readonly originalInboundDate?: string | null;
  public readonly locationId?: number | null;
  public readonly qrCode?: string | null;
  public readonly quantity: number;
  public readonly unit: string;
  public readonly unitPrice: number;
  public readonly warehouseLocation: string;
  public readonly produceDate?: string;

  private constructor(props: InboundItemProps) {
    this.id = props.id;
    this.orderId = props.orderId;
    this._purchaseOrderItemId = props.purchaseOrderItemId;
    this._purchaseOrderLineNo = props.purchaseOrderLineNo;
    this.materialId = props.materialId;
    this.materialCode = props.materialCode || '';
    this.materialName = props.materialName;
    this.materialSpec = props.materialSpec || '';
    this.batchNo = props.batchNo;
    this.batchId = props.batchId ?? null;
    this.originalInboundDate = props.originalInboundDate ?? null;
    this.locationId = props.locationId ?? null;
    this.qrCode = props.qrCode ?? null;
    this.quantity = props.quantity;
    this.unit = props.unit || '件';
    this.unitPrice = props.unitPrice || 0;
    this.warehouseLocation = props.warehouseLocation || '';
    this.produceDate = props.produceDate;
  }

  static create(props: InboundItemProps): InboundItem {
    // 允许 materialId 为 0：手动入库自由录入物料（未关联主数据）时合法；仅拒绝缺失或负数
    if (props.materialId === null || props.materialId === undefined || props.materialId < 0) {
      throw new Error('物料ID不能为空');
    }
    if (!props.quantity || props.quantity <= 0) {
      throw new Error('入库数量必须大于0');
    }
    return new InboundItem(props);
  }

  static reconstitute(props: InboundItemProps): InboundItem {
    return new InboundItem(props);
  }

  get purchaseOrderItemId(): number | undefined {
    return this._purchaseOrderItemId;
  }

  get purchaseOrderLineNo(): number | undefined {
    return this._purchaseOrderLineNo;
  }

  get totalPrice(): number {
    return Math.round(this.quantity * this.unitPrice * 100) / 100;
  }
}
