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

export interface InboundOrderContentUpdate {
  supplierName: string | null;
  warehouseId: number;
  inboundDate: string | null;
  currency: string;
  baseTotalAmount: number;
  totalAmount: number;
  totalQuantity: number;
  remark: string | null;
  items: Array<{
    materialId: number;
    materialCode?: string | null;
    materialName: string;
    materialSpec?: string | null;
    batchNo: string | null;
    batchId?: number | null;
    originalInboundDate?: string | null;
    locationId?: number | null;
    qrCode?: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface IInboundOrderRepository {
  findById(id: number): Promise<InboundOrder | null>;
  findByStatus(
    status: string,
    pagination: Pagination,
    filters?: { keyword?: string; startDate?: string; endDate?: string; poId?: number }
  ): Promise<PaginatedResult<InboundOrder>>;
  save(order: InboundOrder): Promise<{ id: number; orderNo: string }>;
  updateStatus(id: number, status: string, currentStatus: string): Promise<boolean>;
  /**
   * 内容级更新（仅草稿/待审核单）：事务内更新表头 + 删除并重建明细行。
   * 状态校验由 Service 层负责，此处仅做防御性存在性检查。
   */
  updateOrderContent(id: number, data: InboundOrderContentUpdate): Promise<{ id: number; orderNo: string }>;
  updateInspectionAndFinance(
    id: number,
    inspectionStatus: number,
    financePosted: boolean
  ): Promise<void>;
  softDelete(id: number): Promise<void>;
}
