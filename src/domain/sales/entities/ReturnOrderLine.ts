export interface ReturnOrderLineProps {
  id?: number;
  returnId?: number;
  lineNo: number;
  deliveryDetailId?: number;
  orderDetailId?: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec?: string;
  unit: string;
  quantity: number;
  unitPrice?: number;
  amount?: number;
  batchNo?: string;
  remark?: string;
}

export class ReturnOrderLine {
  public readonly id?: number;
  public readonly returnId?: number;
  public readonly lineNo: number;
  public readonly deliveryDetailId?: number;
  public readonly orderDetailId?: number;
  public readonly materialId: number;
  public readonly materialCode: string;
  public readonly materialName: string;
  public readonly materialSpec: string;
  public readonly unit: string;
  public readonly quantity: number;
  public readonly unitPrice: number;
  public readonly amount: number;
  public readonly batchNo: string;
  public readonly remark: string;

  private constructor(props: ReturnOrderLineProps) {
    this.id = props.id;
    this.returnId = props.returnId;
    this.lineNo = props.lineNo;
    this.deliveryDetailId = props.deliveryDetailId;
    this.orderDetailId = props.orderDetailId;
    this.materialId = props.materialId;
    this.materialCode = props.materialCode || '';
    this.materialName = props.materialName || '';
    this.materialSpec = props.materialSpec || '';
    this.unit = props.unit || '件';
    this.quantity = Math.round(props.quantity * 10000) / 10000;
    this.unitPrice = Math.round((props.unitPrice || 0) * 100) / 100;
    this.amount = Math.round((props.amount ?? this.quantity * this.unitPrice) * 100) / 100;
    this.batchNo = props.batchNo || '';
    this.remark = props.remark || '';
  }

  static create(props: ReturnOrderLineProps): ReturnOrderLine {
    if (!props.materialId || props.materialId <= 0) {
      throw new Error('物料ID不能为空');
    }
    if (!props.quantity || props.quantity <= 0) {
      throw new Error('退货数量必须大于0');
    }
    if (!props.lineNo || props.lineNo <= 0) {
      throw new Error('行号不能为空');
    }
    return new ReturnOrderLine(props);
  }

  static reconstitute(props: ReturnOrderLineProps): ReturnOrderLine {
    return new ReturnOrderLine(props);
  }
}
