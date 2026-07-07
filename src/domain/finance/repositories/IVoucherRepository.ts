import type { Voucher } from '../aggregates/Voucher';

export interface IVoucherRepository {
  findById(id: number): Promise<Voucher | null>;
  findByVoucherNo(voucherNo: string): Promise<Voucher | null>;
  findByPeriod(periodCode: string): Promise<Voucher[]>;
  findBySource(sourceType: string, sourceId: number): Promise<Voucher | null>;
  findByStatus(status: number): Promise<Voucher[]>;
  save(voucher: Voucher): Promise<number>;
  updateStatus(id: number, status: number, auditedBy?: string, postedBy?: string): Promise<void>;
  softDelete(id: number): Promise<void>;
}
