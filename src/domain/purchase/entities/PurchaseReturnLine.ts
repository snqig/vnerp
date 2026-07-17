import { DomainError } from '../../shared/DomainTypes';

export interface PurchaseReturnLineProps {
  id?: number;
  returnId?: number;
  lineNo: number;
  orderLineId?: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  baseUnitPrice?: number;
  baseAmount?: number;
  batchNo?: string;
  reason?: string;
  remark?: string;
}

export class PurchaseReturnLine {
  public readonly id?: number;
  public readonly returnId?: number;
  public readonly lineNo: number;
  public readonly orderLineId?: number;
  public readonly materialId: number;
  public readonly materialCode: string;
  public readonly materialName: string;
  public readonly materialSpec: string;
  public readonly unit: string;
  public readonly quantity: number;
  public readonly unitPrice: number;
  public readonly amount: number;
  public readonly baseUnitPrice: number;
  public readonly baseAmount: number;
  public readonly batchNo: string;
  public readonly reason: string;
  public readonly remark: string;

  private constructor(props: PurchaseReturnLineProps) {
    this.id = props.id;
    this.returnId = props.returnId;
    this.lineNo = props.lineNo;
    this.orderLineId = props.orderLineId;
    this.materialId = props.materialId;
    this.materialCode = props.materialCode || '';
    this.materialName = props.materialName || '';
    this.materialSpec = props.materialSpec || '';
    this.unit = props.unit || '件';
    this.quantity = Math.round(props.quantity * 10000) / 10000;
    this.unitPrice = Math.round(props.unitPrice * 100) / 100;
    this.amount = Math.round((props.amount ?? this.quantity * this.unitPrice) * 100) / 100;
    this.baseUnitPrice = Math.round((props.baseUnitPrice ?? this.unitPrice) * 100) / 100;
    this.baseAmount = Math.round((props.baseAmount ?? this.amount) * 100) / 100;
    this.batchNo = props.batchNo || '';
    this.reason = props.reason || '';
    this.remark = props.remark || '';
  }

  static create(props: PurchaseReturnLineProps): PurchaseReturnLine {
    if (!props.materialId || props.materialId <= 0) {
      throw new DomainError('物料ID不能为空');
    }
    if (!props.quantity || props.quantity <= 0) {
      throw new DomainError('退货数量必须大于0');
    }
    if (!props.lineNo || props.lineNo <= 0) {
      throw new DomainError('行号不能为空');
    }
    return new PurchaseReturnLine(props);
  }

  static reconstitute(props: PurchaseReturnLineProps): PurchaseReturnLine {
    return new PurchaseReturnLine(props);
  }
}
