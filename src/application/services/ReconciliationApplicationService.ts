import { IReconciliationRepository } from '@/domain/sales/repositories/IReconciliationRepository';
import { IReceivableRepository } from '@/domain/finance/repositories/IReceivableRepository';
import { Reconciliation, ReconciliationProps } from '@/domain/sales/aggregates/Reconciliation';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
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
    private readonly receivableRepo: IReceivableRepository
  ) {}

  async getReconciliationById(id: number): Promise<Reconciliation> {
    const recon = await this.reconciliationRepo.findById(id);
    if (!recon) throw new NotFoundError('对账单不存在');
    return recon;
  }

  async createReconciliation(
    props: ReconciliationProps
  ): Promise<{ id: number; reconciliationNo: string }> {
    const recon = Reconciliation.create(props);
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
    aggregate: { getDomainEvents(): any[]; clearDomainEvents(): void }
  ): Promise<void> {
    const events = aggregate.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
    });

    aggregate.clearDomainEvents();
  }
}
