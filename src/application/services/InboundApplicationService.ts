import { IInboundOrderRepository } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { InboundOrder, InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import { IPurchaseOrderRepository } from '@/domain/purchase/repositories/IPurchaseOrderRepository';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { query, transaction } from '@/lib/db';
import type { ResultSetHeader } from 'mysql2/promise';

export interface CreateInboundFromPOParams {
  poId: number;
  warehouseId: number;
  items: Array<{
    lineNo: number;
    materialId: number;
    materialCode?: string;
    materialName: string;
    materialSpec?: string;
    unit: string;
    batchNo: string;
    quantity: number;
    unitPrice: number;
    warehouseLocation?: string;
    produceDate?: string;
  }>;
}

export class InboundApplicationService {
  constructor(
    private readonly orderRepo: IInboundOrderRepository,
    private readonly purchaseRepo?: IPurchaseOrderRepository
  ) {}

  async getOrderById(id: number): Promise<InboundOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError('入库单不存在');
    }
    return order;
  }

  async listOrders(
    status: string,
    page: number,
    pageSize: number,
    filters?: { keyword?: string; startDate?: string; endDate?: string }
  ) {
    return this.orderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createOrder(props: InboundOrderProps): Promise<{ id: number; orderNo: string }> {
    const order = InboundOrder.create(props);
    const result = await this.orderRepo.save(order);

    if (order.id) {
      await this.persistAndPublishEvents(order.id, order);
    }

    return result;
  }

  async createInboundFromPO(
    params: CreateInboundFromPOParams
  ): Promise<{ id: number; orderNo: string }> {
    if (!this.purchaseRepo) {
      throw new DomainError('采购单仓储未注入，无法从采购单创建入库单');
    }

    const purchaseOrder = await this.purchaseRepo.findById(params.poId);
    if (!purchaseOrder) {
      throw new NotFoundError('采购单不存在');
    }

    const status = purchaseOrder.status.value;
    if (status !== 'approved' && status !== 'partially_received') {
      throw new DomainError(`采购单当前状态"${purchaseOrder.status.label()}"不允许创建入库单`);
    }

    for (const item of params.items) {
      const line = purchaseOrder.lines.find((l) => l.lineNo === item.lineNo);
      if (!line) {
        throw new DomainError(`采购单行号${item.lineNo}不存在`);
      }
      if (item.materialId !== line.materialId) {
        throw new DomainError(
          `行号${item.lineNo}物料ID不匹配: 采购单${line.materialId} vs 入库${item.materialId}`
        );
      }
      if (item.quantity > line.remainingQty) {
        throw new DomainError(
          `行号${item.lineNo}入库数量${item.quantity}超过剩余可收数量${line.remainingQty}`
        );
      }
    }

    const props: InboundOrderProps = {
      warehouseId: params.warehouseId,
      supplierId: purchaseOrder.supplierId,
      supplierName: purchaseOrder.supplierName,
      poId: purchaseOrder.id,
      poNo: purchaseOrder.orderNo,
      orderType: 'purchase',
      items: params.items.map((item) => ({
        materialId: item.materialId,
        materialCode: item.materialCode || '',
        materialName: item.materialName,
        materialSpec: item.materialSpec,
        batchNo: item.batchNo,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        warehouseLocation: item.warehouseLocation,
        produceDate: item.produceDate,
      })),
    };

    const order = InboundOrder.create(props);
    const result = await this.orderRepo.save(order);

    if (order.id) {
      await this.persistAndPublishEvents(order.id, order);
    }

    return result;
  }

  async approveOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const warehouseRows = await query(
      'SELECT warehouse_name FROM inv_warehouse WHERE id = ?',
      [order.warehouseId]
    );
    const warehouseName = warehouseRows?.[0]?.warehouse_name || '';

    const previousStatus = order.status.value;
    order.approve(warehouseName);

    await transaction(async (conn) => {
      const [result] = await conn.execute(
        "UPDATE inv_inbound_order SET status = 'approved', update_time = NOW() WHERE id = ? AND status = ?",
        [id, previousStatus === 'completed' ? 'approved' : previousStatus]
      ) as [ResultSetHeader, any];
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      await conn.execute(
        "UPDATE inv_inbound_order SET qc_status = 'pass', update_time = NOW() WHERE id = ?",
        [id]
      );

      const events = order.getDomainEvents();
      await getDomainEventOutbox().saveEvents(conn, 'InboundOrder', id, events);
    });

    order.clearDomainEvents();

    return { id, status: 'completed' };
  }

  async submitOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.submit();

    const updated = await this.orderRepo.updateStatus(id, 'pending', previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);

    return { id, status: 'pending' };
  }

  async cancelOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.cancel();

    const updated = await this.orderRepo.updateStatus(id, 'cancelled', previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);

    return { id, status: 'cancelled' };
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrderById(id);

    if (!order.canDelete()) {
      throw new DomainError('当前状态的入库单不能删除');
    }

    await this.orderRepo.softDelete(id);
  }

  async unapproveOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.unapprove();

    const updated = await this.orderRepo.updateStatus(id, 'pending', previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);

    return { id, status: 'pending' };
  }

  private async persistAndPublishEvents(aggregateId: number, order: InboundOrder): Promise<void> {
    const events = order.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'InboundOrder', aggregateId, events);
    });

    order.clearDomainEvents();
  }
}
