import { InboundOrder } from '@/domain/warehouse/aggregates/InboundOrder';

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

export interface IInboundOrderRepository {
  findById(id: number): Promise<InboundOrder | null>;
  findByStatus(
    status: string,
    pagination: Pagination,
    filters?: { keyword?: string; startDate?: string; endDate?: string }
  ): Promise<PaginatedResult<InboundOrder>>;
  save(order: InboundOrder): Promise<{ id: number; orderNo: string }>;
  updateStatus(id: number, status: string, currentStatus: string): Promise<boolean>;
  updateInspectionAndFinance(
    id: number,
    inspectionStatus: number,
    financePosted: boolean
  ): Promise<void>;
  softDelete(id: number): Promise<void>;
}
