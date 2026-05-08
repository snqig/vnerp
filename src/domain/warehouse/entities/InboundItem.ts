export interface InboundItemProps {
  id?: number;
  orderId?: number;
  materialId: number;
  materialCode?: string;
  materialName: string;
  materialSpec?: string;
  batchNo: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  warehouseLocation?: string;
  produceDate?: string;
}

export class InboundItem {
  public readonly id?: number;
  public readonly orderId?: number;
  public readonly materialId: number;
  public readonly materialCode: string;
  public readonly materialName: string;
  public readonly materialSpec: string;
  public readonly batchNo: string;
  public readonly quantity: number;
  public readonly unit: string;
  public readonly unitPrice: number;
  public readonly warehouseLocation: string;
  public readonly produceDate?: string;

  private constructor(props: InboundItemProps) {
    this.id = props.id;
    this.orderId = props.orderId;
    this.materialId = props.materialId;
    this.materialCode = props.materialCode || '';
    this.materialName = props.materialName;
    this.materialSpec = props.materialSpec || '';
    this.batchNo = props.batchNo;
    this.quantity = props.quantity;
    this.unit = props.unit || '件';
    this.unitPrice = props.unitPrice || 0;
    this.warehouseLocation = props.warehouseLocation || '';
    this.produceDate = props.produceDate;
  }

  static create(props: InboundItemProps): InboundItem {
    if (!props.materialId) {
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

  get totalPrice(): number {
    return Math.round(this.quantity * this.unitPrice * 100) / 100;
  }
}
