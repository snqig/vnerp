import { PurchaseOrder } from '../aggregates/PurchaseOrder';

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

export interface IPurchaseOrderRepository {
  findById(id: number): Promise<PurchaseOrder | null>;
  findByOrderNo(orderNo: string): Promise<PurchaseOrder | null>;
  findByStatus(
    status: string,
    pagination: Pagination,
    filters?: {
      keyword?: string;
      supplierId?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<PurchaseOrder>>;
  save(order: PurchaseOrder): Promise<{ id: number; orderNo: string }>;
  updateStatus(id: number, status: string, currentStatus: string): Promise<boolean>;
  updateReceivedQty(lineId: number, receivedQty: number): Promise<void>;
  updateAuditInfo(id: number, auditBy: number, auditTime: string): Promise<void>;
  softDelete(id: number): Promise<void>;
}
