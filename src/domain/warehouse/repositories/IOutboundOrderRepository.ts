import { OutboundOrder } from '@/domain/warehouse/aggregates/OutboundOrder';
import { Pagination, PaginatedResult } from './IInboundOrderRepository';

export interface IOutboundOrderRepository {
  findById(id: number): Promise<OutboundOrder | null>;
  findByOrderNo(orderNo: string): Promise<OutboundOrder | null>;
  findByStatus(
    status: string,
    pagination: Pagination,
    filters?: {
      keyword?: string;
      outboundType?: string;
      warehouseId?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<OutboundOrder>>;
  save(order: OutboundOrder): Promise<{ id: number; orderNo: string }>;
  updateStatus(id: number, status: string, currentStatus: string): Promise<boolean>;
  updateAuditAndFinance(
    id: number,
    auditStatus: number,
    financePosted: boolean,
    auditorId?: number,
    auditorName?: string
  ): Promise<void>;
  softDelete(id: number): Promise<void>;
}
