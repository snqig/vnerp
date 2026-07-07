import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import {
  PurchaseReconciliationStatus,
  PurchaseReconciliationStatusValue,
} from '../value-objects/PurchaseReconciliationStatus';
import { PurchaseWriteOffRecord, PurchaseWriteOffRecordProps } from '../entities/PurchaseWriteOffRecord';
import {
  PurchaseReconciliationCreatedEvent,
  PurchaseReconciliationConfirmedEvent,
  PurchaseReconciliationPartialWrittenOffEvent,
  PurchaseReconciliationWrittenOffEvent,
  PurchaseReconciliationClosedEvent,
} from '../events/PurchaseReconciliationEvents';

const DECIMAL_PLACES = 2;

function roundMoney(n: number): number {
  return Math.round(n * Math.pow(10, DECIMAL_PLACES)) / Math.pow(10, DECIMAL_PLACES);
}

export interface PurchaseReconciliationLineProps {
  id?: number;
  sourceType: 1 | 2; // 1=收货单, 2=退货单
  sourceId: number;
  sourceNo: string;
  sourceDate: string;
  amount: number;
}

export interface PurchaseReconciliationProps {
  id?: number;
  reconciliationNo?: string;
  status?: PurchaseReconciliationStatusValue;
  supplierId: number;
  supplierName: string;
  periodStart: string;
  periodEnd: string;
  receiptAmount: number;
  returnAmount: number;
  netAmount?: number;
  discountAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  lines?: PurchaseReconciliationLineProps[];
  writeOffRecords?: PurchaseWriteOffRecordProps[];
  remark?: string;
  createBy?: number;
  confirmBy?: number;
  confirmTime?: string;
  closeBy?: number;
  closeTime?: string;
  createTime?: string;
  updateTime?: string;
}

export class PurchaseReconciliation {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly reconciliationNo: string,
    private _status: PurchaseReconciliationStatus,
    public readonly supplierId: number,
    public readonly supplierName: string,
    public readonly periodStart: string,
    public readonly periodEnd: string,
    private _receiptAmount: number,
    private _returnAmount: number,
    private _netAmount: number,
    private _discountAmount: number,
    private _paidAmount: number,
    private _balanceAmount: number,
    private _lines: PurchaseReconciliationLineProps[],
    private _writeOffRecords: PurchaseWriteOffRecord[],
    public readonly remark: string,
    public readonly createBy: number | undefined,
    private _confirmBy: number | undefined,
    private _confirmTime: string | undefined,
    private _closeBy: number | undefined,
    private _closeTime: string | undefined,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: PurchaseReconciliationProps): PurchaseReconciliation {
    if (!props.supplierId || props.supplierId <= 0) {
      throw new DomainError('供应商ID不能为空');
    }
    if (!props.periodStart || !props.periodEnd) {
      throw new DomainError('对账时段不能为空');
    }
    if (props.periodStart > props.periodEnd) {
      throw new DomainError('对账开始日期不能晚于结束日期');
    }

    const receiptAmount = roundMoney(props.receiptAmount || 0);
    const returnAmount = roundMoney(props.returnAmount || 0);

    if (returnAmount > receiptAmount) {
      throw new DomainError('退货金额不能超过收货金额');
    }

    const netAmount = roundMoney(receiptAmount - returnAmount);
    const discountAmount = roundMoney(props.discountAmount || 0);
    const balanceAmount = roundMoney(netAmount - discountAmount);

    const order = new PurchaseReconciliation(
      props.id,
      props.reconciliationNo || '',
      PurchaseReconciliationStatus.draft(),
      props.supplierId,
      props.supplierName || '',
      props.periodStart,
      props.periodEnd,
      receiptAmount,
      returnAmount,
      netAmount,
      discountAmount,
      0,
      balanceAmount,
      props.lines || [],
      [],
      props.remark || '',
      props.createBy,
      undefined,
      undefined,
      undefined,
      undefined,
      props.createTime,
      props.updateTime
    );

    if (order.id) {
      order._domainEvents.push(
        new PurchaseReconciliationCreatedEvent({
          reconciliationId: order.id,
          reconciliationNo: order.reconciliationNo,
          supplierId: order.supplierId,
          supplierName: order.supplierName,
          receiptAmount: order._receiptAmount,
          returnAmount: order._returnAmount,
          netAmount: order._netAmount,
        })
      );
    }
    return order;
  }

  static reconstitute(props: PurchaseReconciliationProps): PurchaseReconciliation {
    const receiptAmount = roundMoney(props.receiptAmount || 0);
    const returnAmount = roundMoney(props.returnAmount || 0);
    const netAmount = roundMoney(props.netAmount ?? receiptAmount - returnAmount);
    const discountAmount = roundMoney(props.discountAmount || 0);
    const paidAmount = roundMoney(props.paidAmount || 0);

    let balanceAmount: number;
    if (props.balanceAmount !== undefined && props.balanceAmount !== null) {
      balanceAmount = roundMoney(props.balanceAmount);
    } else {
      balanceAmount = roundMoney(netAmount - discountAmount - paidAmount);
    }

    const writeOffRecords = (props.writeOffRecords || []).map((r) =>
      PurchaseWriteOffRecord.reconstitute(r)
    );

    return new PurchaseReconciliation(
      props.id,
      props.reconciliationNo || '',
      PurchaseReconciliationStatus.from(props.status || 1),
      props.supplierId,
      props.supplierName || '',
      props.periodStart,
      props.periodEnd,
      receiptAmount,
      returnAmount,
      netAmount,
      discountAmount,
      paidAmount,
      balanceAmount,
      props.lines || [],
      writeOffRecords,
      props.remark || '',
      props.createBy,
      props.confirmBy,
      props.confirmTime,
      props.closeBy,
      props.closeTime,
      props.createTime,
      props.updateTime
    );
  }

  get status(): PurchaseReconciliationStatus {
    return this._status;
  }
  get receiptAmount(): number {
    return this._receiptAmount;
  }
  get returnAmount(): number {
    return this._returnAmount;
  }
  get netAmount(): number {
    return this._netAmount;
  }
  get discountAmount(): number {
    return this._discountAmount;
  }
  get paidAmount(): number {
    return this._paidAmount;
  }
  get balanceAmount(): number {
    return this._balanceAmount;
  }
  get confirmBy(): number | undefined {
    return this._confirmBy;
  }
  get confirmTime(): string | undefined {
    return this._confirmTime;
  }
  get closeBy(): number | undefined {
    return this._closeBy;
  }
  get closeTime(): string | undefined {
    return this._closeTime;
  }

  get lines(): PurchaseReconciliationLineProps[] {
    return [...this._lines];
  }

  get writeOffRecords(): PurchaseWriteOffRecord[] {
    return [...this._writeOffRecords];
  }

  getWriteOffSummary(): Array<{
    payableId: number;
    totalAmount: number;
    count: number;
  }> {
    const map = new Map<number, { totalAmount: number; count: number }>();
    for (const record of this._writeOffRecords) {
      const existing = map.get(record.payableId);
      if (existing) {
        existing.totalAmount = roundMoney(existing.totalAmount + record.amount);
        existing.count++;
      } else {
        map.set(record.payableId, { totalAmount: record.amount, count: 1 });
      }
    }
    return Array.from(map.entries()).map(([payableId, { totalAmount, count }]) => ({
      payableId,
      totalAmount,
      count,
    }));
  }

  confirm(confirmBy: number): void {
    if (!confirmBy || confirmBy <= 0) {
      throw new DomainError('确认人不能为空');
    }
    this._status = this._status.transitionTo(2);
    this._confirmBy = confirmBy;
    this._confirmTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    this._domainEvents.push(
      new PurchaseReconciliationConfirmedEvent({
        reconciliationId: this.id!,
        reconciliationNo: this.reconciliationNo,
        supplierId: this.supplierId,
        confirmBy,
      })
    );
  }

  writeOff(payableId: number, amount: number, writeOffDate?: string): void {
    if (!this._status.canWriteOff()) {
      throw new DomainError(`当前状态"${this._status.label}"不允许核销`);
    }

    if (!payableId || payableId <= 0) {
      throw new DomainError('应付单ID不能为空');
    }

    const roundedAmount = roundMoney(amount);
    if (roundedAmount <= 0) {
      throw new DomainError('核销金额必须大于0');
    }

    const currentBalance = roundMoney(this._balanceAmount);
    if (roundedAmount > currentBalance) {
      throw new DomainError(
        `核销金额${roundedAmount}超过对账单余额${currentBalance}`
      );
    }

    const record = PurchaseWriteOffRecord.create({
      payableId,
      amount: roundedAmount,
      writeOffDate: writeOffDate || new Date().toISOString().slice(0, 10),
      reconciliationId: this.id,
    });
    this._writeOffRecords.push(record);

    this._paidAmount = roundMoney(this._paidAmount + roundedAmount);
    this._balanceAmount = roundMoney(
      this._netAmount - this._discountAmount - this._paidAmount
    );

    if (roundMoney(this._balanceAmount) <= 0) {
      this._status = this._status.transitionTo(4);
      this._domainEvents.push(
        new PurchaseReconciliationWrittenOffEvent({
          reconciliationId: this.id!,
          reconciliationNo: this.reconciliationNo,
          supplierId: this.supplierId,
          totalWriteOffAmount: this._paidAmount,
          writeOffRecords: this._writeOffRecords.map((r) => ({
            payableId: r.payableId,
            amount: r.amount,
            writeOffDate: r.writeOffDate,
          })),
        })
      );
    } else {
      if (this._status.value === 2) {
        this._status = this._status.transitionTo(3);
      }
      this._domainEvents.push(
        new PurchaseReconciliationPartialWrittenOffEvent({
          reconciliationId: this.id!,
          reconciliationNo: this.reconciliationNo,
          payableId,
          writeOffAmount: roundedAmount,
          paidAmount: this._paidAmount,
          balance: this._balanceAmount,
        })
      );
    }
  }

  close(closeBy: number): void {
    if (!closeBy || closeBy <= 0) {
      throw new DomainError('关闭人不能为空');
    }

    if (this._status.value === 3 && roundMoney(this._balanceAmount) <= 0) {
      this._status = this._status.transitionTo(4);
    }

    if (!this._status.canClose()) {
      if (this._status.value === 3) {
        throw new DomainError(`对账单尚有余额${roundMoney(this._balanceAmount)}未核销，不能关闭`);
      }
      throw new DomainError(`当前状态"${this._status.label}"不允许关闭`);
    }

    this._status = this._status.transitionTo(9);
    this._closeBy = closeBy;
    this._closeTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    this._domainEvents.push(
      new PurchaseReconciliationClosedEvent({
        reconciliationId: this.id!,
        reconciliationNo: this.reconciliationNo,
        supplierId: this.supplierId,
        closeBy,
      })
    );
  }

  canEdit(): boolean {
    return this._status.value === 1;
  }

  canDelete(): boolean {
    return this._status.value === 1;
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
