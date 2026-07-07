import { PurchaseReconciliation } from '../aggregates/PurchaseReconciliation';

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface IPurchaseReconciliationRepository {
  findById(id: number): Promise<PurchaseReconciliation | null>;
  findByReconciliationNo(reconciliationNo: string): Promise<PurchaseReconciliation | null>;
  findBySupplierId(supplierId: number): Promise<PurchaseReconciliation[]>;
  findByStatus(
    status: number,
    pagination: Pagination,
    filters?: {
      keyword?: string;
      supplierId?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<PurchaseReconciliation>>;
  save(recon: PurchaseReconciliation): Promise<{ id: number; reconciliationNo: string }>;
  updateStatus(id: number, status: number): Promise<void>;
  updateConfirmInfo(id: number, confirmBy: number, confirmTime: string): Promise<void>;
  updateCloseInfo(id: number, closeBy: number, closeTime: string): Promise<void>;
  addWriteOffRecord(
    reconciliationId: number,
    payableId: number,
    amount: number,
    paidAmount: number,
    balance: number,
    status: number,
    writeOffDate: string
  ): Promise<void>;
  softDelete(id: number): Promise<void>;
}
