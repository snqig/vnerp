import { SalesOrder } from '../aggregates/SalesOrder';

export interface ISalesOrderRepository {
  findById(id: number): Promise<SalesOrder | null>;
  findByStatus(
    status: string,
    pagination: { page: number; pageSize: number },
    filters?: { keyword?: string; customerId?: number; startDate?: string; endDate?: string }
  ): Promise<{ data: SalesOrder[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>;
  save(order: SalesOrder): Promise<{ id: number; orderNo: string }>;
  updateStatus(id: number, status: string, currentStatus: string): Promise<boolean>;
  updateShippedQty(lineId: number, shippedQty: number): Promise<void>;
  updateAuditInfo(id: number, auditBy: number, auditTime: string): Promise<void>;
  softDelete(id: number): Promise<void>;
}
