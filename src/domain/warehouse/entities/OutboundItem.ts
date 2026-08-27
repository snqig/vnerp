export interface OutboundItemProps {
  id?: number;
  orderId?: number;
  materialId: number;
  materialCode?: string;
  materialName: string;
  materialSpec?: string;
  batchNo?: string;
  batchId?: number;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount?: number;
  warehouseLocation?: string;
  remark?: string;
}

export class OutboundItem {
  public readonly id?: number;
  public readonly orderId?: number;
  public readonly materialId: number;
  public readonly materialCode: string;
  public readonly materialName: string;
  public readonly materialSpec: string;
  public readonly batchNo: string;
  public readonly batchId?: number;
  public readonly quantity: number;
  public readonly unit: string;
  public readonly unitPrice: number;
  public readonly warehouseLocation: string;
  public readonly remark: string;

  private constructor(props: OutboundItemProps) {
    this.id = props.id;
    this.orderId = props.orderId;
    this.materialId = props.materialId;
    this.materialCode = props.materialCode || '';
    this.materialName = props.materialName;
    this.materialSpec = props.materialSpec || '';
    this.batchNo = props.batchNo || '';
    this.batchId = props.batchId;
    this.quantity = props.quantity;
    this.unit = props.unit || '件';
    this.unitPrice = props.unitPrice || 0;
    this.warehouseLocation = props.warehouseLocation || '';
    this.remark = props.remark || '';
  }

  static create(props: OutboundItemProps): OutboundItem {
    if (!props.materialId) {
      throw new Error('物料ID不能为空');
    }
    if (!props.quantity || props.quantity <= 0) {
      throw new Error('出库数量必须大于0');
    }
    return new OutboundItem(props);
  }

  static reconstitute(props: OutboundItemProps): OutboundItem {
    return new OutboundItem(props);
  }

  get totalPrice(): number {
    return Math.round(this.quantity * this.unitPrice * 100) / 100;
  }
}
