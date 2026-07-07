export interface VoucherLineProps {
  id?: number;
  voucherId?: number;
  lineNo: number;
  accountId: number;
  accountCode?: string;
  accountName?: string;
  summary?: string;
  debitAmount?: number;
  creditAmount?: number;
  customerId?: number;
  supplierId?: number;
  departmentId?: number;
  projectId?: number;
}

export class VoucherLine {
  public readonly id?: number;
  public readonly voucherId?: number;
  public readonly lineNo: number;
  public readonly accountId: number;
  public readonly accountCode: string;
  public readonly accountName: string;
  public readonly summary: string;
  public readonly debitAmount: number;
  public readonly creditAmount: number;
  public readonly customerId?: number;
  public readonly supplierId?: number;
  public readonly departmentId?: number;
  public readonly projectId?: number;

  private constructor(props: VoucherLineProps) {
    this.id = props.id;
    this.voucherId = props.voucherId;
    this.lineNo = props.lineNo;
    this.accountId = props.accountId;
    this.accountCode = props.accountCode || '';
    this.accountName = props.accountName || '';
    this.summary = props.summary || '';
    this.debitAmount = Math.round((props.debitAmount || 0) * 100) / 100;
    this.creditAmount = Math.round((props.creditAmount || 0) * 100) / 100;
    this.customerId = props.customerId;
    this.supplierId = props.supplierId;
    this.departmentId = props.departmentId;
    this.projectId = props.projectId;
  }

  static create(props: VoucherLineProps): VoucherLine {
    if (!props.accountId) {
      throw new Error('科目ID不能为空');
    }
    if (!props.lineNo || props.lineNo <= 0) {
      throw new Error('行号必须大于0');
    }
    if ((props.debitAmount || 0) === 0 && (props.creditAmount || 0) === 0) {
      throw new Error('借贷金额不能同时为0');
    }
    if ((props.debitAmount || 0) > 0 && (props.creditAmount || 0) > 0) {
      throw new Error('借贷金额不能同时大于0');
    }
    return new VoucherLine(props);
  }

  static reconstitute(props: VoucherLineProps): VoucherLine {
    return new VoucherLine(props);
  }

  get amount(): number {
    return Math.max(this.debitAmount, this.creditAmount);
  }

  get isDebit(): boolean {
    return this.debitAmount > 0;
  }

  get isCredit(): boolean {
    return this.creditAmount > 0;
  }
}
