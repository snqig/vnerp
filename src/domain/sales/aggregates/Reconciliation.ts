import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import {
  ReconciliationStatus,
  ReconciliationStatusValue,
} from '../value-objects/ReconciliationStatus';
import { WriteOffRecord, WriteOffRecordProps } from '../entities/WriteOffRecord';
import {
  ReconciliationCreatedEvent,
  ReconciliationConfirmedEvent,
  ReconciliationPartialWrittenOffEvent,
  ReconciliationWrittenOffEvent,
  ReconciliationClosedEvent,
} from '../events/ReconciliationEvents';

const DECIMAL_PLACES = 2;

function roundMoney(n: number): number {
  return Math.round(n * Math.pow(10, DECIMAL_PLACES)) / Math.pow(10, DECIMAL_PLACES);
}

export interface ReconciliationLineProps {
  id?: number;
  sourceType: 1 | 2; // 1=发货单, 2=退货单
  sourceId: number;
  sourceNo: string;
  sourceDate: string;
  amount: number;
}

export interface ReconciliationProps {
  id?: number;
  reconciliationNo?: string;
  status?: ReconciliationStatusValue;
  customerId: number;
  customerName: string;
  periodStart: string;
  periodEnd: string;
  deliveryAmount: number;
  returnAmount: number;
  netAmount?: number;
  discountAmount?: number;
  receivedAmount?: number;
  balanceAmount?: number;
  lines?: ReconciliationLineProps[];
  writeOffRecords?: WriteOffRecordProps[];
  remark?: string;
  createBy?: number;
  confirmBy?: number;
  confirmTime?: string;
  closeBy?: number;
  closeTime?: string;
  createTime?: string;
  updateTime?: string;
}

export class Reconciliation {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly reconciliationNo: string,
    private _status: ReconciliationStatus,
    public readonly customerId: number,
    public readonly customerName: string,
    public readonly periodStart: string,
    public readonly periodEnd: string,
    private _deliveryAmount: number,
    private _returnAmount: number,
    private _netAmount: number,
    private _discountAmount: number,
    private _receivedAmount: number,
    private _balanceAmount: number,
    private _lines: ReconciliationLineProps[],
    private _writeOffRecords: WriteOffRecord[],
    public readonly remark: string,
    public readonly createBy: number | undefined,
    private _confirmBy: number | undefined,
    private _confirmTime: string | undefined,
    private _closeBy: number | undefined,
    private _closeTime: string | undefined,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: ReconciliationProps): Reconciliation {
    if (!props.customerId || props.customerId <= 0) {
      throw new DomainError('客户ID不能为空');
    }
    if (!props.periodStart || !props.periodEnd) {
      throw new DomainError('对账时段不能为空');
    }
    if (props.periodStart > props.periodEnd) {
      throw new DomainError('对账开始日期不能晚于结束日期');
    }

    const deliveryAmount = roundMoney(props.deliveryAmount || 0);
    const returnAmount = roundMoney(props.returnAmount || 0);

    if (returnAmount > deliveryAmount) {
      throw new DomainError('退货金额不能超过发货金额');
    }

    const netAmount = roundMoney(deliveryAmount - returnAmount);
    const discountAmount = roundMoney(props.discountAmount || 0);
    const balanceAmount = roundMoney(netAmount - discountAmount);

    const order = new Reconciliation(
      props.id,
      props.reconciliationNo || '',
      ReconciliationStatus.draft(),
      props.customerId,
      props.customerName || '',
      props.periodStart,
      props.periodEnd,
      deliveryAmount,
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
        new ReconciliationCreatedEvent({
          reconciliationId: order.id,
          reconciliationNo: order.reconciliationNo,
          customerId: order.customerId,
          customerName: order.customerName,
          deliveryAmount: order._deliveryAmount,
          returnAmount: order._returnAmount,
          netAmount: order._netAmount,
        })
      );
    }
    return order;
  }

  static reconstitute(props: ReconciliationProps): Reconciliation {
    const deliveryAmount = roundMoney(props.deliveryAmount || 0);
    const returnAmount = roundMoney(props.returnAmount || 0);
    const netAmount = roundMoney(props.netAmount ?? deliveryAmount - returnAmount);
    const discountAmount = roundMoney(props.discountAmount || 0);
    const receivedAmount = roundMoney(props.receivedAmount || 0);

    let balanceAmount: number;
    if (props.balanceAmount !== undefined && props.balanceAmount !== null) {
      balanceAmount = roundMoney(props.balanceAmount);
    } else {
      balanceAmount = roundMoney(netAmount - discountAmount - receivedAmount);
    }

    const writeOffRecords = (props.writeOffRecords || []).map((r) =>
      WriteOffRecord.reconstitute(r)
    );

    return new Reconciliation(
      props.id,
      props.reconciliationNo || '',
      ReconciliationStatus.from(props.status || 1),
      props.customerId,
      props.customerName || '',
      props.periodStart,
      props.periodEnd,
      deliveryAmount,
      returnAmount,
      netAmount,
      discountAmount,
      receivedAmount,
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

  get status(): ReconciliationStatus {
    return this._status;
  }
  get deliveryAmount(): number {
    return this._deliveryAmount;
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
  get receivedAmount(): number {
    return this._receivedAmount;
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

  get lines(): ReconciliationLineProps[] {
    return [...this._lines];
  }

  get writeOffRecords(): WriteOffRecord[] {
    return [...this._writeOffRecords];
  }

  getWriteOffSummary(): Array<{
    receivableId: number;
    totalAmount: number;
    count: number;
  }> {
    const map = new Map<number, { totalAmount: number; count: number }>();
    for (const record of this._writeOffRecords) {
      const existing = map.get(record.receivableId);
      if (existing) {
        existing.totalAmount = roundMoney(existing.totalAmount + record.amount);
        existing.count++;
      } else {
        map.set(record.receivableId, { totalAmount: record.amount, count: 1 });
      }
    }
    return Array.from(map.entries()).map(([receivableId, { totalAmount, count }]) => ({
      receivableId,
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
      new ReconciliationConfirmedEvent({
        reconciliationId: this.id!,
        reconciliationNo: this.reconciliationNo,
        customerId: this.customerId,
        confirmBy,
      })
    );
  }

  writeOff(receivableId: number, amount: number, writeOffDate?: string): void {
    if (!this._status.canWriteOff()) {
      throw new DomainError(`当前状态"${this._status.label}"不允许核销`);
    }

    if (!receivableId || receivableId <= 0) {
      throw new DomainError('应收单ID不能为空');
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

    const record = WriteOffRecord.create({
      receivableId,
      amount: roundedAmount,
      writeOffDate: writeOffDate || new Date().toISOString().slice(0, 10),
      reconciliationId: this.id,
    });
    this._writeOffRecords.push(record);

    this._receivedAmount = roundMoney(this._receivedAmount + roundedAmount);
    this._balanceAmount = roundMoney(
      this._netAmount - this._discountAmount - this._receivedAmount
    );

    if (roundMoney(this._balanceAmount) <= 0) {
      this._status = this._status.transitionTo(4);
      this._domainEvents.push(
        new ReconciliationWrittenOffEvent({
          reconciliationId: this.id!,
          reconciliationNo: this.reconciliationNo,
          customerId: this.customerId,
          totalWriteOffAmount: this._receivedAmount,
          writeOffRecords: this._writeOffRecords.map((r) => ({
            receivableId: r.receivableId,
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
        new ReconciliationPartialWrittenOffEvent({
          reconciliationId: this.id!,
          reconciliationNo: this.reconciliationNo,
          receivableId,
          writeOffAmount: roundedAmount,
          receivedAmount: this._receivedAmount,
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
      new ReconciliationClosedEvent({
        reconciliationId: this.id!,
        reconciliationNo: this.reconciliationNo,
        customerId: this.customerId,
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
