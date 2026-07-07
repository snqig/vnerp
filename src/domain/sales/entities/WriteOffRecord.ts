export interface WriteOffRecordProps {
  id?: number;
  reconciliationId?: number;
  receivableId: number;
  amount: number;
  writeOffDate: string;
  remark?: string;
  createTime?: string;
}

export class WriteOffRecord {
  public readonly id?: number;
  public readonly reconciliationId?: number;
  public readonly receivableId: number;
  public readonly amount: number;
  public readonly writeOffDate: string;
  public readonly remark: string;
  public readonly createTime?: string;

  private constructor(props: WriteOffRecordProps) {
    this.id = props.id;
    this.reconciliationId = props.reconciliationId;
    this.receivableId = props.receivableId;
    this.amount = Math.round(props.amount * 100) / 100;
    this.writeOffDate = props.writeOffDate;
    this.remark = props.remark || '';
    this.createTime = props.createTime;
  }

  static create(props: WriteOffRecordProps): WriteOffRecord {
    if (!props.receivableId || props.receivableId <= 0) {
      throw new Error('应收单ID不能为空');
    }
    if (!props.amount || props.amount <= 0) {
      throw new Error('核销金额必须大于0');
    }
    if (!props.writeOffDate) {
      throw new Error('核销日期不能为空');
    }
    return new WriteOffRecord(props);
  }

  static reconstitute(props: WriteOffRecordProps): WriteOffRecord {
    return new WriteOffRecord(props);
  }
}
