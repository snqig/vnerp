import { PurchaseReturn } from '../aggregates/PurchaseReturn';

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

export interface IPurchaseReturnRepository {
  findById(id: number): Promise<PurchaseReturn | null>;
  findByReturnNo(returnNo: string): Promise<PurchaseReturn | null>;
  findByOrderId(orderId: number): Promise<PurchaseReturn[]>;
  findByStatus(
    status: number,
    pagination: Pagination,
    filters?: {
      keyword?: string;
      supplierId?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<PurchaseReturn>>;
  save(ret: PurchaseReturn): Promise<{ id: number; returnNo: string }>;
  updateStatus(id: number, status: number): Promise<void>;
  updateApproveInfo(id: number, approveBy: number, approveTime: string): Promise<void>;
  updateCompleteInfo(
    id: number,
    completeBy: number,
    completeTime: string,
    outboundOrderId: number,
    outboundOrderNo: string,
    payableId: number,
    payableNo: string
  ): Promise<void>;
  softDelete(id: number): Promise<void>;
}
