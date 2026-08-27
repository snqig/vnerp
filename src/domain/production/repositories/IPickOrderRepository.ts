import { PickOrder } from '../aggregates/PickOrder';

export interface PickOrderFilters {
  workOrderId?: number;
  status?: string;
  keyword?: string;
}

export interface IPickOrderRepository {
  findById(id: number): Promise<PickOrder | null>;
  findByPickNo(pickNo: string): Promise<PickOrder | null>;
  findByWorkOrderId(workOrderId: number): Promise<PickOrder[]>;
  findByFilters(
    filters: PickOrderFilters,
    page?: number,
    pageSize?: number
  ): Promise<{ list: PickOrder[]; total: number }>;
  save(order: PickOrder): Promise<number>;
  update(order: PickOrder): Promise<void>;
  softDelete(id: number): Promise<void>;
}
