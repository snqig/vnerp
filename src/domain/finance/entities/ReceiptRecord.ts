export interface ReceiptRecordProps {
  id?: number;
  receiptNo: string;
  receivableId?: number;
  customerId: number;
  amount: number;
  receiptDate?: string;
  receiptMethod?: string;
  bankAccount?: string;
  referenceNo?: string;
  handlerId?: number;
  remark?: string;
  createTime?: string;
}

export class ReceiptRecord {
  public readonly id?: number;
  public readonly receiptNo: string;
  public readonly receivableId?: number;
  public readonly customerId: number;
  public readonly amount: number;
  public readonly receiptDate: string;
  public readonly receiptMethod: string;
  public readonly bankAccount: string;
  public readonly referenceNo: string;
  public readonly handlerId?: number;
  public readonly remark: string;
  public readonly createTime?: string;

  private constructor(props: ReceiptRecordProps) {
    this.id = props.id;
    this.receiptNo = props.receiptNo;
    this.receivableId = props.receivableId;
    this.customerId = props.customerId;
    this.amount = Math.round(props.amount * 100) / 100;
    this.receiptDate = props.receiptDate || new Date().toISOString().slice(0, 10);
    this.receiptMethod = props.receiptMethod || '';
    this.bankAccount = props.bankAccount || '';
    this.referenceNo = props.referenceNo || '';
    this.handlerId = props.handlerId;
    this.remark = props.remark || '';
    this.createTime = props.createTime;
  }

  static create(props: ReceiptRecordProps): ReceiptRecord {
    if (!props.customerId) {
      throw new Error('客户ID不能为空');
    }
    if (!props.amount || props.amount <= 0) {
      throw new Error('收款金额必须大于0');
    }
    if (!props.receiptNo) {
      throw new Error('收款单号不能为空');
    }
    return new ReceiptRecord(props);
  }

  static reconstitute(props: ReceiptRecordProps): ReceiptRecord {
    return new ReceiptRecord(props);
  }
}
