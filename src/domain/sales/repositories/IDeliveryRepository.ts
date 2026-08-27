import type { Delivery } from '../aggregates/Delivery';

export interface IDeliveryRepository {
  findById(id: number): Promise<Delivery | null>;
  findByDeliveryNo(deliveryNo: string): Promise<Delivery | null>;
  findByOrderId(orderId: number): Promise<Delivery[]>;
  findByCustomerId(customerId: number): Promise<Delivery[]>;
  findByStatus(status: number): Promise<Delivery[]>;
  save(delivery: Delivery): Promise<number>;
  updateStatus(id: number, status: number, logisticsCompany?: string, trackingNo?: string): Promise<void>;
  updateShipment(
    id: number,
    status: number,
    shipBy: number,
    shipTime: string,
    logisticsCompany?: string,
    trackingNo?: string
  ): Promise<void>;
  updateSign(id: number, status: number, signBy: number | null, signTime: string): Promise<void>;
  softDelete(id: number): Promise<void>;
}
