import type { ReturnOrder } from '../aggregates/ReturnOrder';

export interface IReturnOrderRepository {
  findById(id: number): Promise<ReturnOrder | null>;
  findByReturnNo(returnNo: string): Promise<ReturnOrder | null>;
  findByOrderId(orderId: number): Promise<ReturnOrder[]>;
  findByCustomerId(customerId: number): Promise<ReturnOrder[]>;
  findByStatus(status: number): Promise<ReturnOrder[]>;
  save(returnOrder: ReturnOrder): Promise<number>;
  updateStatus(id: number, status: number): Promise<void>;
  updateApproval(id: number, status: number, approveBy: number, approveTime: string): Promise<void>;
  updateCompletion(
    id: number,
    status: number,
    completeBy: number,
    completeTime: string,
    inboundOrderId: number,
    inboundOrderNo: string,
    receivableId: number,
    receivableNo: string
  ): Promise<void>;
  softDelete(id: number): Promise<void>;
}
