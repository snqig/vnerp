import { DomainEvent, DomainError } from '../../shared/DomainTypes';
import { Money } from '../../shared/value-objects/Money';
import { ReceivableStatus, ReceivableStatusEnum } from '../value-objects/ReceivableStatus';
import {
  ReceivableCreatedEvent,
  ReceivablePartialReceivedEvent,
  ReceivableSettledEvent,
  ReceivableWrittenOffEvent,
} from '../events/ReceivableEvents';

export interface ReceivableProps {
  id?: number;
  receivableNo?: string;
  sourceType?: number;
  sourceId?: number;
  sourceNo?: string;
  customerId: number;
  customerName?: string;
  amount: number;
  receivedAmount?: number;
  balance?: number;
  dueDate?: string;
  status?: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export class Receivable {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: number | undefined,
    public readonly receivableNo: string,
    public readonly sourceType: number,
    public readonly sourceId: number | undefined,
    public readonly sourceNo: string,
    public readonly customerId: number,
    public readonly customerName: string,
    private _amount: Money,
    private _receivedAmount: Money,
    private _balance: Money,
    public readonly dueDate: string,
    private _status: ReceivableStatus,
    public readonly remark: string,
    public readonly createTime: string | undefined,
    public readonly updateTime: string | undefined
  ) {}

  static create(props: ReceivableProps): Receivable {
    if (!props.customerId) {
      throw new DomainError('客户ID不能为空');
    }
    if (!props.amount || props.amount <= 0) {
      throw new DomainError('应收金额必须大于0');
    }

    const amount = Money.create(props.amount);
    const receivable = new Receivable(
      props.id,
      props.receivableNo || '',
      props.sourceType || 2,
      props.sourceId,
      props.sourceNo || '',
      props.customerId,
      props.customerName || '',
      amount,
      Money.zero(),
      amount,
      props.dueDate || '',
      ReceivableStatus.unpaid(),
      props.remark || '',
      props.createTime,
      props.updateTime
    );

    if (receivable.id) {
      receivable._domainEvents.push(
        new ReceivableCreatedEvent({
          receivableId: receivable.id,
          receivableNo: receivable.receivableNo,
          sourceType: receivable.sourceType,
          sourceId: receivable.sourceId,
          sourceNo: receivable.sourceNo,
          customerId: receivable.customerId,
          amount: receivable._amount.amount,
          dueDate: receivable.dueDate,
        })
      );
    }

    return receivable;
  }

  static reconstitute(props: ReceivableProps): Receivable {
    return new Receivable(
      props.id,
      props.receivableNo || '',
      props.sourceType || 2,
      props.sourceId,
      props.sourceNo || '',
      props.customerId,
      props.customerName || '',
      Money.create(props.amount),
      Money.create(props.receivedAmount || 0),
      Money.create(props.balance ?? props.amount),
      props.dueDate || '',
      ReceivableStatus.from(props.status || 1),
      props.remark || '',
      props.createTime,
      props.updateTime
    );
  }

  get amount(): Money {
    return this._amount;
  }

  get receivedAmount(): Money {
    return this._receivedAmount;
  }

  get balance(): Money {
    return this._balance;
  }

  get status(): ReceivableStatus {
    return this._status;
  }

  recordReceipt(receiptAmount: number, receiptNo?: string): void {
    if (this._status.isTerminal()) {
      throw new DomainError('应收款已结清或已坏账，不能再记录收款');
    }
    if (receiptAmount <= 0) {
      throw new DomainError('收款金额必须大于0');
    }

    const receipt = Money.create(receiptAmount);
    const newReceived = this._receivedAmount.add(receipt);
    if (newReceived.amount > this._amount.amount) {
      throw new DomainError(
        `收款金额超过应收余额: 收款${receipt.amount}, 已收${this._receivedAmount.amount}, 应收${this._amount.amount}`
      );
    }

    this._receivedAmount = newReceived;
    this._balance = this._amount.subtract(newReceived);

    if (this._balance.isZero()) {
      this._status = this._status.transitionTo(ReceivableStatusEnum.SETTLED);
      this._domainEvents.push(
        new ReceivableSettledEvent({
          receivableId: this.id!,
          receivableNo: this.receivableNo,
          customerId: this.customerId,
          totalAmount: this._amount.amount,
        })
      );
    } else {
      this._status = this._status.transitionTo(ReceivableStatusEnum.PARTIAL);
      this._domainEvents.push(
        new ReceivablePartialReceivedEvent({
          receivableId: this.id!,
          receivableNo: this.receivableNo,
          customerId: this.customerId,
          receivedAmount: receipt.amount,
          balance: this._balance.amount,
          receiptNo,
        })
      );
    }
  }

  writeOff(reason?: string): void {
    if (this._status.isTerminal()) {
      throw new DomainError('应收款已结清或已坏账，不能再坏账处理');
    }
    this._status = this._status.transitionTo(ReceivableStatusEnum.BAD_DEBT);
    this._domainEvents.push(
      new ReceivableWrittenOffEvent({
        receivableId: this.id!,
        receivableNo: this.receivableNo,
        customerId: this.customerId,
        writtenOffAmount: this._balance.amount,
        reason,
      })
    );
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
