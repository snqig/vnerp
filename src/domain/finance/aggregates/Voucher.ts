import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { Money } from '../../shared/value-objects/Money';
import { VoucherStatus, VoucherStatusEnum } from '../value-objects/VoucherStatus';
import { VoucherLine, VoucherLineProps } from '../entities/VoucherLine';
import {
  VoucherAuditedEvent,
  VoucherCreatedEvent,
  VoucherPostedEvent,
  VoucherSubmittedEvent,
  VoucherVoidedEvent,
} from '../events/VoucherEvents';

export interface VoucherProps {
  id?: number;
  voucherNo?: string;
  periodCode: string;
  voucherDate?: string;
  voucherType?: number; // 1=收, 2=付, 3=转, 4=调整
  sourceType?: string;
  sourceId?: number;
  sourceNo?: string;
  totalDebit?: number;
  totalCredit?: number;
  status?: number;
  summary?: string;
  lines: VoucherLineProps[];
  createdBy?: string;
  auditedBy?: string;
  postedBy?: string;
  auditedAt?: string;
  postedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export class Voucher {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly voucherNo: string,
    public readonly periodCode: string,
    public readonly voucherDate: string,
    public readonly voucherType: number,
    public readonly sourceType: string,
    public readonly sourceId: number | undefined,
    public readonly sourceNo: string,
    private _totalDebit: Money,
    private _totalCredit: Money,
    private _status: VoucherStatus,
    public readonly summary: string,
    private _lines: VoucherLine[],
    public readonly createdBy: string,
    private _auditedBy: string,
    private _postedBy: string,
    public readonly auditedAt: string | undefined,
    public readonly postedAt: string | undefined,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: VoucherProps): Voucher {
    if (!props.periodCode) {
      throw new DomainError('会计期间不能为空');
    }
    if (!props.lines || props.lines.length === 0) {
      throw new DomainError('凭证明细不能为空');
    }

    const lines = props.lines.map((line) => VoucherLine.create(line));
    const totalDebit = lines.reduce(
      (sum, line) => sum.add(Money.create(line.debitAmount)),
      Money.zero()
    );
    const totalCredit = lines.reduce(
      (sum, line) => sum.add(Money.create(line.creditAmount)),
      Money.zero()
    );

    if (!totalDebit.equals(totalCredit)) {
      throw new DomainError(
        `借贷不平衡: 借方${totalDebit.amount}, 贷方${totalCredit.amount}`
      );
    }

    const voucher = new Voucher(
      props.id,
      props.voucherNo || '',
      props.periodCode,
      props.voucherDate || new Date().toISOString().slice(0, 10),
      props.voucherType || 3,
      props.sourceType || '',
      props.sourceId,
      props.sourceNo || '',
      totalDebit,
      totalCredit,
      VoucherStatus.draft(),
      props.summary || '',
      lines,
      props.createdBy || '',
      props.auditedBy || '',
      props.postedBy || '',
      props.auditedAt,
      props.postedAt,
      props.createTime,
      props.updateTime
    );

    if (voucher.id) {
      voucher._domainEvents.push(
        new VoucherCreatedEvent({
          voucherId: voucher.id,
          voucherNo: voucher.voucherNo,
          periodCode: voucher.periodCode,
          voucherType: voucher.voucherType,
          sourceType: voucher.sourceType,
          totalDebit: voucher._totalDebit.amount,
          totalCredit: voucher._totalCredit.amount,
        })
      );
    }

    return voucher;
  }

  static reconstitute(props: VoucherProps): Voucher {
    const lines = props.lines.map((line) => VoucherLine.reconstitute(line));
    const totalDebit =
      props.totalDebit !== undefined
        ? Money.create(props.totalDebit)
        : lines.reduce((sum, line) => sum.add(Money.create(line.debitAmount)), Money.zero());
    const totalCredit =
      props.totalCredit !== undefined
        ? Money.create(props.totalCredit)
        : lines.reduce((sum, line) => sum.add(Money.create(line.creditAmount)), Money.zero());

    return new Voucher(
      props.id,
      props.voucherNo || '',
      props.periodCode,
      props.voucherDate || '',
      props.voucherType || 3,
      props.sourceType || '',
      props.sourceId,
      props.sourceNo || '',
      totalDebit,
      totalCredit,
      VoucherStatus.from(props.status || 0),
      props.summary || '',
      lines,
      props.createdBy || '',
      props.auditedBy || '',
      props.postedBy || '',
      props.auditedAt,
      props.postedAt,
      props.createTime,
      props.updateTime
    );
  }

  get totalDebit(): Money {
    return this._totalDebit;
  }

  get totalCredit(): Money {
    return this._totalCredit;
  }

  get status(): VoucherStatus {
    return this._status;
  }

  get lines(): VoucherLine[] {
    return [...this._lines];
  }

  get auditedBy(): string {
    return this._auditedBy;
  }

  get postedBy(): string {
    return this._postedBy;
  }

  submit(): void {
    this._status = this._status.transitionTo(VoucherStatusEnum.SUBMITTED);
    this._domainEvents.push(
      new VoucherSubmittedEvent({
        voucherId: this.id!,
        voucherNo: this.voucherNo,
        periodCode: this.periodCode,
      })
    );
  }

  audit(auditedBy: string): void {
    this._status = this._status.transitionTo(VoucherStatusEnum.AUDITED);
    this._auditedBy = auditedBy;
    this._domainEvents.push(
      new VoucherAuditedEvent({
        voucherId: this.id!,
        voucherNo: this.voucherNo,
        auditedBy,
      })
    );
  }

  post(postedBy: string): void {
    this._status = this._status.transitionTo(VoucherStatusEnum.POSTED);
    this._postedBy = postedBy;
    this._domainEvents.push(
      new VoucherPostedEvent({
        voucherId: this.id!,
        voucherNo: this.voucherNo,
        periodCode: this.periodCode,
        postedBy,
        totalDebit: this._totalDebit.amount,
        totalCredit: this._totalCredit.amount,
        lines: this._lines.map((line) => ({
          accountId: line.accountId,
          accountCode: line.accountCode,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
        })),
      })
    );
  }

  void(reason?: string): void {
    this._status = this._status.transitionTo(VoucherStatusEnum.VOIDED);
    this._domainEvents.push(
      new VoucherVoidedEvent({
        voucherId: this.id!,
        voucherNo: this.voucherNo,
        reason,
      })
    );
  }

  isBalanced(): boolean {
    return this._totalDebit.equals(this._totalCredit);
  }

  canEdit(): boolean {
    return this._status.canEdit();
  }

  canDelete(): boolean {
    return this._status.canDelete();
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
