import { IDeliveryRepository } from '@/domain/sales/repositories/IDeliveryRepository';
import { Delivery, DeliveryProps } from '@/domain/sales/aggregates/Delivery';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';
import { InventoryValidationService } from '@/application/services/InventoryValidationService';

export interface ShipDeliveryInput {
  deliveryId: number;
  shipBy: number;
  logisticsCompany?: string;
  trackingNo?: string;
  skipInventoryCheck?: boolean;
}

export class DeliveryApplicationService {
  constructor(private readonly deliveryRepo: IDeliveryRepository) {}

  async getDeliveryById(id: number): Promise<Delivery> {
    const delivery = await this.deliveryRepo.findById(id);
    if (!delivery) throw new NotFoundError('发货单不存在');
    return delivery;
  }

  async createDelivery(props: DeliveryProps): Promise<{ id: number; deliveryNo: string }> {
    const delivery = Delivery.create(props);
    const id = await this.deliveryRepo.save(delivery);
    await this.persistAndPublishEvents('Delivery', id, delivery);
    return { id, deliveryNo: delivery.deliveryNo };
  }

  async shipDelivery(input: ShipDeliveryInput): Promise<{ status: number }> {
    const delivery = await this.getDeliveryById(input.deliveryId);

    if (!input.skipInventoryCheck) {
      for (const line of delivery.lines) {
        const check = await InventoryValidationService.checkStock(
          line.materialId,
          delivery.warehouseId,
          line.quantity
        );
        if (!check.sufficient) {
          throw new DomainError(check.message || `物料${line.materialName}库存不足，无法发货`);
        }
      }
    }

    delivery.ship(input.shipBy, input.logisticsCompany, input.trackingNo);

    await this.deliveryRepo.updateShipment(
      input.deliveryId,
      delivery.status.value,
      delivery.shipBy!,
      delivery.shipTime!,
      input.logisticsCompany,
      input.trackingNo
    );

    await this.persistAndPublishEvents('Delivery', input.deliveryId, delivery);
    return { status: delivery.status.value };
  }

  async signDelivery(id: number, signBy?: number): Promise<{ status: number }> {
    const delivery = await this.getDeliveryById(id);
    delivery.sign(signBy);

    await this.deliveryRepo.updateSign(
      id,
      delivery.status.value,
      delivery.signBy ?? null,
      delivery.signTime!
    );

    await this.persistAndPublishEvents('Delivery', id, delivery);
    return { status: delivery.status.value };
  }

  async cancelDelivery(id: number, reason?: string): Promise<{ status: number }> {
    const delivery = await this.getDeliveryById(id);
    delivery.cancel(reason);

    await this.deliveryRepo.updateStatus(id, delivery.status.value);
    await this.persistAndPublishEvents('Delivery', id, delivery);
    return { status: delivery.status.value };
  }

  async listDeliveriesByStatus(status: number): Promise<Delivery[]> {
    return this.deliveryRepo.findByStatus(status);
  }

  async listDeliveriesByOrder(orderId: number): Promise<Delivery[]> {
    return this.deliveryRepo.findByOrderId(orderId);
  }

  async listDeliveriesByCustomer(customerId: number): Promise<Delivery[]> {
    return this.deliveryRepo.findByCustomerId(customerId);
  }

  async deleteDelivery(id: number): Promise<void> {
    const delivery = await this.getDeliveryById(id);
    if (!delivery.canDelete()) {
      throw new DomainError('仅待发货状态的发货单可删除');
    }
    await this.deliveryRepo.softDelete(id);
  }

  private async persistAndPublishEvents(
    aggregateType: string,
    aggregateId: number,
    aggregate: { getDomainEvents(): Loose[]; clearDomainEvents(): void }
  ): Promise<void> {
    const events = aggregate.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
    });

    aggregate.clearDomainEvents();
  }
}
