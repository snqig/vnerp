import { WorkOrder } from '../aggregates/WorkOrder';

export interface WorkOrderFilters {
  keyword?: string;
  productName?: string;
  status?: string;
  orderType?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface IWorkOrderRepository {
  findById(id: number): Promise<WorkOrder | null>;
  findByWorkOrderNo(workOrderNo: string): Promise<WorkOrder | null>;
  findByStatus(
    status: string,
    pagination?: { page: number; pageSize: number },
    filters?: WorkOrderFilters
  ): Promise<{
    data: WorkOrder[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>;
  save(order: WorkOrder): Promise<{ id: number; workOrderNo: string }>;
  updateStatus(id: number, status: string, currentStatus: string): Promise<boolean>;
  softDelete(id: number): Promise<void>;
}
