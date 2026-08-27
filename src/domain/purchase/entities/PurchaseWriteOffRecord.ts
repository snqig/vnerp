import { DomainError } from '../../shared/DomainTypes';

export interface PurchaseWriteOffRecordProps {
  id?: number;
  reconciliationId?: number;
  payableId: number;
  amount: number;
  writeOffDate: string;
  remark?: string;
  createTime?: string;
}

export class PurchaseWriteOffRecord {
  public readonly id?: number;
  public readonly reconciliationId?: number;
  public readonly payableId: number;
  public readonly amount: number;
  public readonly writeOffDate: string;
  public readonly remark: string;
  public readonly createTime?: string;

  private constructor(props: PurchaseWriteOffRecordProps) {
    this.id = props.id;
    this.reconciliationId = props.reconciliationId;
    this.payableId = props.payableId;
    this.amount = Math.round(props.amount * 100) / 100;
    this.writeOffDate = props.writeOffDate;
    this.remark = props.remark || '';
    this.createTime = props.createTime;
  }

  static create(props: PurchaseWriteOffRecordProps): PurchaseWriteOffRecord {
    if (!props.payableId || props.payableId <= 0) {
      throw new DomainError('应付单ID不能为空');
    }
    if (!props.amount || props.amount <= 0) {
      throw new DomainError('核销金额必须大于0');
    }
    if (!props.writeOffDate) {
      throw new DomainError('核销日期不能为空');
    }
    return new PurchaseWriteOffRecord(props);
  }

  static reconstitute(props: PurchaseWriteOffRecordProps): PurchaseWriteOffRecord {
    return new PurchaseWriteOffRecord(props);
  }
}
