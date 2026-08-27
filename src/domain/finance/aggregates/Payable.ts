import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { Money } from '../../shared/value-objects/Money';
import { PayableStatus, PayableStatusEnum } from '../value-objects/PayableStatus';
import {
  PayableCreatedEvent,
  PayablePartialPaidEvent,
  PayableSettledEvent,
} from '../events/PayableEvents';

export interface PayableProps {
  id?: number;
  payableNo?: string;
  sourceType?: number;
  sourceId?: number;
  sourceNo?: string;
  supplierId: number;
  supplierName?: string;
  amount: number;
  paidAmount?: number;
  balance?: number;
  currency?: string;
  exchangeRate?: number;
  baseAmount?: number;
  dueDate?: string;
  status?: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export class Payable {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly payableNo: string,
    public readonly sourceType: number,
    public readonly sourceId: number | undefined,
    public readonly sourceNo: string,
    public readonly supplierId: number,
    public readonly supplierName: string,
    private _amount: Money,
    private _paidAmount: Money,
    private _balance: Money,
    public readonly currency: string,
    public readonly exchangeRate: number,
    private _baseAmount: number,
    public readonly dueDate: string,
    private _status: PayableStatus,
    public readonly remark: string,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: PayableProps): Payable {
    if (!props.supplierId) {
      throw new DomainError('供应商ID不能为空');
    }
    if (!props.amount || props.amount <= 0) {
      throw new DomainError('应付金额必须大于0');
    }

    const amount = Money.create(props.amount);
    const currency = props.currency || 'CNY';
    const exchangeRate = props.exchangeRate || 1.0;
    const baseAmount = props.baseAmount ?? 0;
    const payable = new Payable(
      props.id,
      props.payableNo || '',
      props.sourceType || 2,
      props.sourceId,
      props.sourceNo || '',
      props.supplierId,
      props.supplierName || '',
      amount,
      Money.zero(),
      amount,
      currency,
      exchangeRate,
      baseAmount,
      props.dueDate || '',
      PayableStatus.unpaid(),
      props.remark || '',
      props.createTime,
      props.updateTime
    );

    if (payable.id) {
      payable._domainEvents.push(
        new PayableCreatedEvent({
          payableId: payable.id,
          payableNo: payable.payableNo,
          sourceType: payable.sourceType,
          sourceId: payable.sourceId,
          sourceNo: payable.sourceNo,
          supplierId: payable.supplierId,
          amount: payable._amount.amount,
          dueDate: payable.dueDate,
          currency: payable.currency,
          exchangeRate: payable.exchangeRate,
          baseAmount: payable.baseAmount,
        })
      );
    }

    return payable;
  }

  static reconstitute(props: PayableProps): Payable {
    const currency = props.currency || 'CNY';
    const exchangeRate = props.exchangeRate || 1.0;
    const baseAmount = props.baseAmount ?? 0;
    return new Payable(
      props.id,
      props.payableNo || '',
      props.sourceType || 2,
      props.sourceId,
      props.sourceNo || '',
      props.supplierId,
      props.supplierName || '',
      Money.create(props.amount),
      Money.create(props.paidAmount || 0),
      Money.create(props.balance ?? props.amount),
      currency,
      exchangeRate,
      baseAmount,
      props.dueDate || '',
      PayableStatus.from(props.status || 1),
      props.remark || '',
      props.createTime,
      props.updateTime
    );
  }

  get amount(): Money {
    return this._amount;
  }

  get baseAmount(): number {
    return this._baseAmount;
  }

  get paidAmount(): Money {
    return this._paidAmount;
  }

  get balance(): Money {
    return this._balance;
  }

  get status(): PayableStatus {
    return this._status;
  }

  recordPayment(paymentAmount: number, paymentNo?: string): void {
    if (this._status.isTerminal()) {
      throw new DomainError('应付款已结清，不能再记录付款');
    }
    if (paymentAmount <= 0) {
      throw new DomainError('付款金额必须大于0');
    }

    const payment = Money.create(paymentAmount);
    const newPaid = this._paidAmount.add(payment);
    if (newPaid.amount > this._amount.amount) {
      throw new DomainError(
        `付款金额超过应付余额: 付款${payment.amount}, 已付${this._paidAmount.amount}, 应付${this._amount.amount}`
      );
    }

    this._paidAmount = newPaid;
    this._balance = this._amount.subtract(newPaid);

    if (this._balance.isZero()) {
      this._status = this._status.transitionTo(PayableStatusEnum.SETTLED);
      this._domainEvents.push(
        new PayableSettledEvent({
          payableId: this.id!,
          payableNo: this.payableNo,
          supplierId: this.supplierId,
          totalAmount: this._amount.amount,
        })
      );
    } else {
      this._status = this._status.transitionTo(PayableStatusEnum.PARTIAL);
      this._domainEvents.push(
        new PayablePartialPaidEvent({
          payableId: this.id!,
          payableNo: this.payableNo,
          supplierId: this.supplierId,
          paidAmount: payment.amount,
          balance: this._balance.amount,
          paymentNo,
        })
      );
    }
  }

  isOverdue(date?: string): boolean {
    if (!this.dueDate) return false;
    const checkDate = date || new Date().toISOString().slice(0, 10);
    return this.dueDate < checkDate && !this._status.isSettled();
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
