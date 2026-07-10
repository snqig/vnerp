import { FinishOrder } from '../aggregates/FinishOrder';

export interface FinishOrderFilters {
  workOrderId?: number;
  status?: string;
  warehouseId?: number;
}

export interface IFinishOrderRepository {
  findById(id: number): Promise<FinishOrder | null>;
  findByFinishNo(finishNo: string): Promise<FinishOrder | null>;
  findByWorkOrderId(workOrderId: number): Promise<FinishOrder[]>;
  findByFilters(
    filters: FinishOrderFilters,
    page?: number,
    pageSize?: number
  ): Promise<{ list: FinishOrder[]; total: number }>;
  save(order: FinishOrder): Promise<number>;
  update(order: FinishOrder): Promise<void>;
  softDelete(id: number): Promise<void>;
}
