import type { Payable } from '../aggregates/Payable';

export interface IPayableRepository {
  findById(id: number): Promise<Payable | null>;
  findByPayableNo(payableNo: string): Promise<Payable | null>;
  findBySupplierId(supplierId: number): Promise<Payable[]>;
  findByStatus(status: number): Promise<Payable[]>;
  findOverdue(date?: string): Promise<Payable[]>;
  save(payable: Payable): Promise<number>;
  updatePaidAmount(id: number, paidAmount: number, balance: number, status: number): Promise<void>;
  updateStatus(id: number, status: number): Promise<void>;
  softDelete(id: number): Promise<void>;
}
