import type { Receivable } from '../aggregates/Receivable';

export interface IReceivableRepository {
  findById(id: number): Promise<Receivable | null>;
  findByReceivableNo(receivableNo: string): Promise<Receivable | null>;
  findByCustomerId(customerId: number): Promise<Receivable[]>;
  findByStatus(status: number): Promise<Receivable[]>;
  findOverdue(date?: string): Promise<Receivable[]>;
  save(receivable: Receivable): Promise<number>;
  updateReceivedAmount(id: number, receivedAmount: number, balance: number, status: number): Promise<void>;
  updateStatus(id: number, status: number): Promise<void>;
  softDelete(id: number): Promise<void>;
}
