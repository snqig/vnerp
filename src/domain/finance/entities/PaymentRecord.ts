import { t } from '@/lib/server-translate';

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
  const ts = t;
    if (!props.supplierId) {
      throw new Error(ts('k_h5paib'));
    }
    if (!props.amount || props.amount <= 0) {
      throw new Error(ts('k_3ty25s'));
    }
    if (!props.paymentNo) {
      throw new Error(ts('k_1hutxfd'));
    }
    return new PaymentRecord(props);
  }

  static reconstitute(props: PaymentRecordProps): PaymentRecord {
    return new PaymentRecord(props);
  }
}
