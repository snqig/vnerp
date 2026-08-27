import type { Reconciliation } from '../aggregates/Reconciliation';

export interface IReconciliationRepository {
  findById(id: number): Promise<Reconciliation | null>;
  findByReconciliationNo(reconciliationNo: string): Promise<Reconciliation | null>;
  findByCustomerId(customerId: number): Promise<Reconciliation[]>;
  findByStatus(status: number): Promise<Reconciliation[]>;
  save(reconciliation: Reconciliation): Promise<number>;
  updateWriteOff(
    id: number,
    receivedAmount: number,
    balanceAmount: number,
    status: number
  ): Promise<void>;
  updateStatus(id: number, status: number): Promise<void>;
  updateConfirmation(id: number, status: number, confirmBy: number, confirmTime: string): Promise<void>;
  updateClosure(id: number, status: number, closeBy: number, closeTime: string): Promise<void>;
  softDelete(id: number): Promise<void>;
}
