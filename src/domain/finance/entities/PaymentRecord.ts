export interface PaymentRecordProps {
  id?: number;
  paymentNo: string;
  payableId?: number;
  supplierId: number;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  bankAccount?: string;
  referenceNo?: string;
  handlerId?: number;
  remark?: string;
  createTime?: string;
}

export class PaymentRecord {
  public readonly id?: number;
  public readonly paymentNo: string;
  public readonly payableId?: number;
  public readonly supplierId: number;
  public readonly amount: number;
  public readonly paymentDate: string;
  public readonly paymentMethod: string;
  public readonly bankAccount: string;
  public readonly referenceNo: string;
  public readonly handlerId?: number;
  public readonly remark: string;
  public readonly createTime?: string;

  private constructor(props: PaymentRecordProps) {
    this.id = props.id;
    this.paymentNo = props.paymentNo;
    this.payableId = props.payableId;
    this.supplierId = props.supplierId;
    this.amount = Math.round(props.amount * 100) / 100;
    this.paymentDate = props.paymentDate || new Date().toISOString().slice(0, 10);
    this.paymentMethod = props.paymentMethod || '';
    this.bankAccount = props.bankAccount || '';
    this.referenceNo = props.referenceNo || '';
    this.handlerId = props.handlerId;
    this.remark = props.remark || '';
    this.createTime = props.createTime;
  }

  static create(props: PaymentRecordProps): PaymentRecord {
    if (!props.supplierId) {
      throw new Error('供应商ID不能为空');
    }
    if (!props.amount || props.amount <= 0) {
      throw new Error('付款金额必须大于0');
    }
    if (!props.paymentNo) {
      throw new Error('付款单号不能为空');
    }
    return new PaymentRecord(props);
  }

  static reconstitute(props: PaymentRecordProps): PaymentRecord {
    return new PaymentRecord(props);
  }
}
