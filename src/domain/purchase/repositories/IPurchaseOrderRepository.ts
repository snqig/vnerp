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
  /**
   * 整体更新「草稿」采购单：表头字段覆盖 + 明细整批替换，同一事务内完成。
   * 仅在 status = 'draft' 时生效；返回 false 表示状态已变化（并发保护），调用方应视为冲突。
   */
  updateDraft(order: PurchaseOrder): Promise<boolean>;
  updateStatus(id: number, status: string, currentStatus: string): Promise<boolean>;
  updateReceivedQty(lineId: number, receivedQty: number): Promise<void>;
  updateAuditInfo(id: number, auditBy: number, auditTime: string): Promise<void>;
  softDelete(id: number): Promise<void>;
}
