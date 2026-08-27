import { TransferOrder } from '@/domain/warehouse/aggregates/TransferOrder';
import { Pagination, PaginatedResult } from './IInboundOrderRepository';

export interface ITransferOrderRepository {
  findById(id: number): Promise<TransferOrder | null>;
  findByTransferNo(transferNo: string): Promise<TransferOrder | null>;
  findByStatus(
    status: number,
    pagination: Pagination,
    filters?: {
      keyword?: string;
      fromWarehouseId?: number;
      toWarehouseId?: number;
      transferType?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<TransferOrder>>;
  save(order: TransferOrder): Promise<{ id: number; transferNo: string }>;
  updateStatus(id: number, status: number, currentStatus: number): Promise<boolean>;
  updateOutTime(id: number, outTime: string): Promise<void>;
  updateInTime(id: number, inTime: string): Promise<void>;
  updateApprover(id: number, approverId: number, approverName: string): Promise<void>;
  softDelete(id: number): Promise<void>;
}
