import { IReconciliationRepository } from '@/domain/sales/repositories/IReconciliationRepository';
import { IReceivableRepository } from '@/domain/finance/repositories/IReceivableRepository';
import { IDeliveryRepository } from '@/domain/sales/repositories/IDeliveryRepository';
import { Reconciliation, ReconciliationProps } from '@/domain/sales/aggregates/Reconciliation';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import { DomainEvent } from '@/domain/shared/DomainEvent';
import { CurrencyApplicationService } from './CurrencyApplicationService';
import { CurrencySnapshot } from '@/domain/shared/value-objects/CurrencySnapshot';
import { Money } from '@/domain/shared/value-objects/Money';
import { getSystemConfig } from '@/lib/system-config';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';

export interface WriteOffInput {
  reconciliationId: number;
  receivableId: number;
  amount: number;
  writeOffDate?: string;
  operatorId?: number;
  remark?: string;
}

export class ReconciliationApplicationService {
  constructor(
    private readonly reconciliationRepo: IReconciliationRepository,
    private readonly receivableRepo: IReceivableRepository,
    private readonly deliveryRepo: IDeliveryRepository,
    private readonly currencyService: CurrencyApplicationService
  ) {}

  async getReconciliationById(id: number): Promise<Reconciliation> {
    const recon = await this.reconciliationRepo.findById(id);
    if (!recon) throw new NotFoundError('对账单不存在');
    return recon;
  }

  async createReconciliation(
    props: ReconciliationProps
  ): Promise<{ id: number; reconciliationNo: string }> {
    if (props.lines && props.lines.length > 0) {
      const currencies = new Set<string>();
      for (const line of props.lines) {
        if (line.sourceType === 1) {
          const delivery = await this.deliveryRepo.findById(line.sourceId);
          if (delivery) {
            currencies.add(delivery.currency);
          }
        }
      }
      if (currencies.size > 1) {
        throw new DomainError('对账单中包含了多种币种的发货单，无法创建统一对账单');
      }
    }

    let effectiveProps = { ...props };

    if (!effectiveProps.currency && props.lines && props.lines.length > 0) {
      const firstLine = props.lines.find((l) => l.sourceType === 1);
      if (firstLine) {
        const delivery = await this.deliveryRepo.findById(firstLine.sourceId);
        if (delivery) {
          effectiveProps.currency = delivery.currency;
          effectiveProps.exchangeRate = delivery.exchangeRate;
          effectiveProps.baseCurrency = delivery.baseCurrency;
        }
      }
    }

    const baseCurrency =
      effectiveProps.baseCurrency || (await getSystemConfig('finance.base_currency', 'CNY'));
    const currency = effectiveProps.currency || 'CNY';
    let exchangeRate = effectiveProps.exchangeRate || 1.0;
    if (currency !== baseCurrency) {
      exchangeRate = await this.currencyService.getLatestRate(currency, baseCurrency);
    }

    const snapshot = CurrencySnapshot.create(currency, exchangeRate, baseCurrency);
    const decimalPlaces = 2;

    effectiveProps = {
      ...effectiveProps,
      exchangeRate,
      baseCurrency,
      baseDeliveryAmount:
        effectiveProps.baseDeliveryAmount ??
        Math.round(
          snapshot.convert(
            Money.create(effectiveProps.deliveryAmount || 0, currency),
            decimalPlaces
          ).amount * 100
        ) / 100,
      baseReturnAmount:
        effectiveProps.baseReturnAmount ??
        Math.round(
          snapshot.convert(Money.create(effectiveProps.returnAmount || 0, currency), decimalPlaces)
            .amount * 100
        ) / 100,
      baseNetAmount:
        effectiveProps.baseNetAmount ??
        Math.round(
          snapshot.convert(
            Money.create(
              (effectiveProps.deliveryAmount || 0) - (effectiveProps.returnAmount || 0),
              currency
            ),
            decimalPlaces
          ).amount * 100
        ) / 100,
      baseDiscountAmount:
        effectiveProps.baseDiscountAmount ??
        Math.round(
          snapshot.convert(
            Money.create(effectiveProps.discountAmount || 0, currency),
            decimalPlaces
          ).amount * 100
        ) / 100,
    };

    const recon = Reconciliation.create(effectiveProps);
    const id = await this.reconciliationRepo.save(recon);
    await this.persistAndPublishEvents('Reconciliation', id, recon);
    return { id, reconciliationNo: recon.reconciliationNo };
  }

  async confirmReconciliation(id: number, confirmBy: number): Promise<{ status: number }> {
    const recon = await this.getReconciliationById(id);
    recon.confirm(confirmBy);

    await this.reconciliationRepo.updateConfirmation(
      id,
      recon.status.value,
      recon.confirmBy!,
      recon.confirmTime!
    );
    await this.persistAndPublishEvents('Reconciliation', id, recon);
    return { status: recon.status.value };
  }

  async writeOff(input: WriteOffInput): Promise<{
    status: number;
    receivedAmount: number;
    balanceAmount: number;
  }> {
    const recon = await this.getReconciliationById(input.reconciliationId);

    const receivable = await this.receivableRepo.findById(input.receivableId);
    if (!receivable) {
      throw new NotFoundError('应收单不存在');
    }

    const receivableBalance = receivable.balance.amount;
    if (input.amount > receivableBalance) {
      throw new DomainError(`核销金额${input.amount}超过应收单余额${receivableBalance}`);
    }

    // 调用聚合 writeOff 方法（校验对账单状态和余额）
    recon.writeOff(input.receivableId, input.amount, input.writeOffDate);

    const writeOffDate = input.writeOffDate || new Date().toISOString().slice(0, 10);

    // 更新应收单：receivedAmount += amount, balance -= amount, 状态可能变化
    const newReceivableReceived = receivable.receivedAmount.amount + input.amount;
    const newReceivableBalance = receivable.balance.amount - input.amount;
    let newReceivableStatus = receivable.status.value;
    if (newReceivableBalance <= 0.001) {
      newReceivableStatus = 3; // 已结清
    } else if (newReceivableReceived > 0) {
      newReceivableStatus = 2; // 部分收款
    }

    await transaction(async (conn) => {
      // 保存核销记录
      await conn.execute(
        `INSERT INTO sal_reconciliation_writeoff
         (reconciliation_id, receivable_id, amount, write_off_date, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          input.reconciliationId,
          input.receivableId,
          input.amount,
          writeOffDate,
          input.remark || null,
          input.operatorId ?? null,
        ]
      );

      // 更新对账单主表
      await conn.execute(
        `UPDATE sal_reconciliation
         SET received_amount = ?, balance_amount = ?, status = ?, update_time = NOW()
         WHERE id = ?`,
        [recon.receivedAmount, recon.balanceAmount, recon.status.value, input.reconciliationId]
      );

      // 更新应收单
      await conn.execute(
        `UPDATE fin_receivable
         SET received_amount = ?, balance = ?, status = ?, update_time = NOW()
         WHERE id = ?`,
        [newReceivableReceived, newReceivableBalance, newReceivableStatus, input.receivableId]
      );

      // 持久化对账单领域事件
      const events = recon.getDomainEvents();
      if (events.length > 0) {
        await getDomainEventOutbox().saveEvents(
          conn,
          'Reconciliation',
          input.reconciliationId,
          events
        );
      }
    });

    recon.clearDomainEvents();
    return {
      status: recon.status.value,
      receivedAmount: recon.receivedAmount,
      balanceAmount: recon.balanceAmount,
    };
  }

  async closeReconciliation(id: number, closeBy: number): Promise<{ status: number }> {
    const recon = await this.getReconciliationById(id);
    recon.close(closeBy);

    await this.reconciliationRepo.updateClosure(
      id,
      recon.status.value,
      recon.closeBy!,
      recon.closeTime!
    );
    await this.persistAndPublishEvents('Reconciliation', id, recon);
    return { status: recon.status.value };
  }

  async listByStatus(status: number): Promise<Reconciliation[]> {
    return this.reconciliationRepo.findByStatus(status);
  }

  async listByCustomer(customerId: number): Promise<Reconciliation[]> {
    return this.reconciliationRepo.findByCustomerId(customerId);
  }

  async deleteReconciliation(id: number): Promise<void> {
    const recon = await this.getReconciliationById(id);
    if (recon.status.value !== 1) {
      throw new DomainError('仅草稿状态的对账单可删除');
    }
    await this.reconciliationRepo.softDelete(id);
  }

  private async persistAndPublishEvents(
    aggregateType: string,
    aggregateId: number,
    aggregate: { getDomainEvents(): DomainEvent[]; clearDomainEvents(): void }
  ): Promise<void> {
    const events = aggregate.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
    });

    aggregate.clearDomainEvents();
  }
}
