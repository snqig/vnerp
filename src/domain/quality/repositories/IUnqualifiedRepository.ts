import { UnqualifiedProduct, UnqualifiedProductProps } from '../aggregates/UnqualifiedProduct';

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

export interface UnqualifiedFilters {
  keyword?: string;
  handleType?: number;
  handleStatus?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateHandleInfoFields {
  handleType?: number;
  responsibleDept?: string;
  responsiblePerson?: string;
  handler?: string;
  handleResult?: number;
  costAmount?: number;
  handleDate?: string;
  remark?: string;
  updateBy?: number;
}

export interface IUnqualifiedRepository {
  findById(id: number): Promise<UnqualifiedProduct | null>;
  findByHandleNo(handleNo: string): Promise<UnqualifiedProduct | null>;
  findByStatus(
    status: string,
    pagination: Pagination,
    filters?: UnqualifiedFilters
  ): Promise<PaginatedResult<UnqualifiedProduct>>;
  save(
    record: UnqualifiedProduct
  ): Promise<{ id: number; unqualifiedNo: string; handleNo: string }>;
  updateStatus(id: number, status: string, currentStatus: string, updateBy?: number): Promise<boolean>;
  updateHandleInfo(id: number, fields: UpdateHandleInfoFields): Promise<void>;
  softDelete(id: number): Promise<void>;
}
