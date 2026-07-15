import { ISalesOrderRepository } from '@/domain/sales/repositories/ISalesOrderRepository';
import { SalesOrder, SalesOrderProps } from '@/domain/sales/aggregates/SalesOrder';
import { SalesOrderStatus } from '@/domain/sales/value-objects/SalesOrderStatus';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';
import { InventoryValidationService } from '@/application/services/InventoryValidationService';
import {
  getSystemConfig,
  getSystemConfigBoolean,
  getSystemConfigNumber,
} from '@/lib/system-config';
import type { ResultSetHeader } from 'mysql2/promise';

export class SalesApplicationService {
  constructor(private readonly orderRepo: ISalesOrderRepository) {}

  async getOrderById(id: number): Promise<SalesOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundError('销售单不存在');
    return order;
  }

  async listOrders(
    status: string,
    page: number,
    pageSize: number,
    filters?: { keyword?: string; customerId?: number; startDate?: string; endDate?: string }
  ) {
    return this.orderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createOrder(props: SalesOrderProps): Promise<{ id: number; orderNo: string }> {
    let effectiveProps = props;
    // 财务默认税率/币种（未指定时使用系统配置）
    if (!props.taxRate) {
      const taxRate = await getSystemConfigNumber('finance.tax_rate', 13);
      effectiveProps = { ...effectiveProps, taxRate };
    }
    if (!props.currency) {
      const currency = await getSystemConfig('finance.default_currency', 'CNY');
      if (currency) effectiveProps = { ...effectiveProps, currency };
    }

    // 明细行税率默认继承表头税率
    effectiveProps = {
      ...effectiveProps,
      lines: effectiveProps.lines.map((l) => ({
        ...l,
        taxRate: l.taxRate ?? effectiveProps.taxRate,
      })),
    };

    const order = SalesOrder.create(effectiveProps);

    // 订单最低金额校验
    const minAmount = await getSystemConfigNumber('order.min_amount', 0);
    if (minAmount > 0 && order.totalAmount < minAmount) {
      throw new DomainError(
        `订单金额 ${order.totalAmount} 低于最低订单金额 ${minAmount}，无法创建`
      );
    }

    const result = await this.orderRepo.save(order);
    if (result.id) await this.persistAndPublishEvents(result.id, order);
    return result;
  }

  async submitOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.submit();
    const updated = await this.orderRepo.updateStatus(id, 'submitted', previousStatus);
    if (!updated) throw new VersionConflictError();
    await this.persistAndPublishEvents(id, order);

    // 订单自动审核
    const autoApprove = await getSystemConfigBoolean('order.auto_approve', false);
    if (autoApprove) {
      try {
        return await this.approveOrder(id, order.createBy || 0);
      } catch {
        // 自动审核失败（如状态不允许）则保持已提交状态
      }
    }
    return { id, status: 'submitted' };
  }

  async approveOrder(id: number, auditBy: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.approve(auditBy);

    await transaction(async (conn) => {
      const [result] = await conn.execute(
        'UPDATE sal_order SET status = ?, audit_by = ?, audit_time = NOW(), update_time = NOW() WHERE id = ? AND status = ?',
        [order.status.toDbCode(), auditBy, id, SalesOrderStatus.from(previousStatus).toDbCode()]
      ) as [ResultSetHeader, any];
      if (result.affectedRows === 0) throw new VersionConflictError();
      await getDomainEventOutbox().saveEvents(conn, 'SalesOrder', id, order.getDomainEvents());
    });

    order.clearDomainEvents();
    return { id, status: 'approved' };
  }

  async shipGoods(
    id: number,
    lineShipments: Array<{ lineNo: number; quantity: number; batchNo: string; warehouseId: number }>
  ): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    for (const shipment of lineShipments) {
      const line = order.lines.find((l) => l.lineNo === shipment.lineNo);
      if (!line) throw new DomainError(`行号${shipment.lineNo}不存在`);
      const check = await InventoryValidationService.checkStock(
        line.materialId,
        shipment.warehouseId,
        shipment.quantity
      );
      if (!check.sufficient) throw new DomainError(check.message || '库存不足');
    }

    const previousStatus = order.status.value;
    order.ship(lineShipments);

    await transaction(async (conn) => {
      const currentDbStatus = SalesOrderStatus.from(previousStatus).toDbCode();
      const [result] = await conn.execute(
        'UPDATE sal_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
        [order.status.toDbCode(), id, currentDbStatus]
      ) as [ResultSetHeader, any];
      if (result.affectedRows === 0) throw new VersionConflictError();

      for (const line of order.lines) {
        if (line.id) {
          await conn.execute(
            'UPDATE sal_order_detail SET shipped_qty = ? WHERE order_id = ? AND id = ?',
            [line.shippedQty, id, line.id]
          );
        }
      }

      await getDomainEventOutbox().saveEvents(conn, 'SalesOrder', id, order.getDomainEvents());
    });

    order.clearDomainEvents();
    return { id, status: order.status.value };
  }

  async closeOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.close();
    const updated = await this.orderRepo.updateStatus(id, 'closed', previousStatus);
    if (!updated) throw new VersionConflictError();
    await this.persistAndPublishEvents(id, order);
    return { id, status: 'closed' };
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrderById(id);
    if (!order.canDelete()) throw new DomainError('当前状态的销售单不能删除');
    await this.orderRepo.softDelete(id);
  }

  private async persistAndPublishEvents(aggregateId: number, order: SalesOrder): Promise<void> {
    const events = order.getDomainEvents();
    if (events.length === 0) return;
    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'SalesOrder', aggregateId, events);
    });
    order.clearDomainEvents();
  }
}
