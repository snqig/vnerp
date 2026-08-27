import { StocktakingOrder } from '@/domain/warehouse/aggregates/StocktakingOrder';
import { Pagination, PaginatedResult } from './IInboundOrderRepository';

export interface IStocktakingOrderRepository {
  findById(id: number): Promise<StocktakingOrder | null>;
  findByCheckNo(checkNo: string): Promise<StocktakingOrder | null>;
  findByStatus(
    status: number,
    pagination: Pagination,
    filters?: {
      keyword?: string;
      warehouseId?: number;
      stocktakingType?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<StocktakingOrder>>;
  save(order: StocktakingOrder): Promise<{ id: number; checkNo: string }>;
  updateStatus(id: number, status: number, currentStatus: number): Promise<boolean>;
  updateItemActualQty(
    itemId: number,
    actualQty: number,
    diffQty: number,
    diffAmount: number,
    scanOperator?: string
  ): Promise<void>;
  updateApprover(
    id: number,
    approverId: number,
    approverName: string,
    approveTime: string,
    approveRemark: string
  ): Promise<void>;
  updateDiffSummary(id: number, diffItems: number, totalDiffAmount: number): Promise<void>;
  softDelete(id: number): Promise<void>;
}
