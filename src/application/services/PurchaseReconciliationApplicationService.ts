import { IPurchaseReconciliationRepository } from '@/domain/purchase/repositories/IPurchaseReconciliationRepository';
import { IPayableRepository } from '@/domain/finance/repositories/IPayableRepository';
import {
  PurchaseReconciliation,
  PurchaseReconciliationProps,
} from '@/domain/purchase/aggregates/PurchaseReconciliation';
import { MysqlPurchaseReconciliationRepository } from '@/infrastructure/repositories/MysqlPurchaseReconciliationRepository';
import { MysqlPayableRepository } from '@/infrastructure/repositories/MysqlPayableRepository';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';
import type { ResultSetHeader } from 'mysql2/promise';

export interface WriteOffInput {
  reconciliationId: number;
  payableId: number;
  amount: number;
  writeOffDate?: string;
  operatorId?: number;
  remark?: string;
}

export class PurchaseReconciliationApplicationService {
  constructor(
    private readonly reconciliationRepo: IPurchaseReconciliationRepository,
    private readonly payableRepo: IPayableRepository
  ) {}

  static create(): PurchaseReconciliationApplicationService {
    return new PurchaseReconciliationApplicationService(
      new MysqlPurchaseReconciliationRepository(),
      new MysqlPayableRepository()
    );
  }

  async getReconciliationById(id: number): Promise<PurchaseReconciliation> {
    const recon = await this.reconciliationRepo.findById(id);
    if (!recon) throw new NotFoundError('采购对账单不存在');
    return recon;
  }

  async createReconciliation(
    props: PurchaseReconciliationProps
  ): Promise<{ id: number; reconciliationNo: string }> {
    const recon = PurchaseReconciliation.create(props);
    const result = await this.reconciliationRepo.save(recon);
    await this.persistAndPublishEvents('PurchaseReconciliation', result.id, recon);
    return { id: result.id, reconciliationNo: result.reconciliationNo };
  }

  async confirmReconciliation(id: number, confirmBy: number): Promise<{ status: number }> {
    const recon = await this.getReconciliationById(id);
    recon.confirm(confirmBy);

    await this.reconciliationRepo.updateConfirmInfo(id, recon.confirmBy!, recon.confirmTime!);
    await this.persistAndPublishEvents('PurchaseReconciliation', id, recon);
    return { status: recon.status.value };
  }

  async writeOff(input: WriteOffInput): Promise<{
    status: number;
    paidAmount: number;
    balanceAmount: number;
  }> {
    const recon = await this.getReconciliationById(input.reconciliationId);

    const payable = await this.payableRepo.findById(input.payableId);
    if (!payable) {
      throw new NotFoundError('应付单不存在');
    }

    const payableBalance = payable.balance.amount;
    if (input.amount > payableBalance) {
      throw new DomainError(`核销金额${input.amount}超过应付单余额${payableBalance}`);
    }

    // 捕获原始余额，用于乐观锁校验（防止并发核销导致余额丢失更新）
    const originalBalance = recon.balanceAmount;

    recon.writeOff(input.payableId, input.amount, input.writeOffDate);

    const writeOffDate = input.writeOffDate || new Date().toISOString().slice(0, 10);

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO pur_purchase_reconciliation_writeoff
         (reconciliation_id, payable_id, amount, write_off_date, create_time)
         VALUES (?, ?, ?, ?, NOW())`,
        [input.reconciliationId, input.payableId, input.amount, writeOffDate]
      );

      // 乐观锁：仅当余额未被其他事务修改时才更新（WHERE balance_amount = 原始余额）
      const [updateResult] = await conn.execute(
        `UPDATE pur_purchase_reconciliation
         SET paid_amount = ?, balance_amount = ?, status = ?, update_time = NOW()
         WHERE id = ? AND balance_amount = ?`,
        [
          recon.paidAmount,
          recon.balanceAmount,
          recon.status.value,
          input.reconciliationId,
          originalBalance,
        ]
      ) as [ResultSetHeader, any];
      if (updateResult.affectedRows === 0) {
        throw new VersionConflictError();
      }

      // 应付单的 paid_amount/balance/status 由 PurchaseReconciliationWrittenOffHandler
      // 异步处理（事件驱动），避免跨聚合在同一事务中直接写入
      const events = recon.getDomainEvents();
      if (events.length > 0) {
        await getDomainEventOutbox().saveEvents(
          conn,
          'PurchaseReconciliation',
          input.reconciliationId,
          events
        );
      }
    });

    recon.clearDomainEvents();
    return {
      status: recon.status.value,
      paidAmount: recon.paidAmount,
      balanceAmount: recon.balanceAmount,
    };
  }

  async closeReconciliation(id: number, closeBy: number): Promise<{ status: number }> {
    const recon = await this.getReconciliationById(id);
    recon.close(closeBy);

    await this.reconciliationRepo.updateCloseInfo(id, recon.closeBy!, recon.closeTime!);
    await this.persistAndPublishEvents('PurchaseReconciliation', id, recon);
    return { status: recon.status.value };
  }

  async listReconciliations(
    status: number,
    page: number,
    pageSize: number,
    filters?: { keyword?: string; supplierId?: number; startDate?: string; endDate?: string }
  ) {
    return this.reconciliationRepo.findByStatus(status, { page, pageSize }, filters);
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
