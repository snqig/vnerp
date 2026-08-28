import { IOutboundOrderRepository } from '@/domain/warehouse/repositories/IOutboundOrderRepository';
import { OutboundOrder, OutboundOrderProps } from '@/domain/warehouse/aggregates/OutboundOrder';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { AppError } from '@/lib/error-handling';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { query, transaction } from '@/lib/db';
import { assertWarehouseExists, assertAllMaterialsExist } from '@/lib/reference-validation';
import type { ResultSetHeader } from 'mysql2/promise';

export class OutboundApplicationService {
  constructor(private readonly orderRepo: IOutboundOrderRepository) {}

  async getOrderById(id: number): Promise<OutboundOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError('出库单不存在');
    }
    return order;
  }

  async listOrders(
    status: string,
    page: number,
    pageSize: number,
    filters?: {
      keyword?: string;
      outboundType?: string;
      warehouseId?: number;
      startDate?: string;
      endDate?: string;
    }
  ) {
    return this.orderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createOrder(props: OutboundOrderProps): Promise<{ id: number; orderNo: string }> {
    // 前置查重：同一出库单内不允许重复的 (物料, 批次) 组合，避免落库触发 uk_outbound_order_line
    this.assertNoDuplicateOutboundLines(props.items);
    // #① 引用完整性：写入前断言仓库与物料主数据存在（防悬空引用）
    await assertWarehouseExists(props.warehouseId);
    await assertAllMaterialsExist(props.items.map((i) => i.materialId));
    const order = OutboundOrder.create(props);
    const result = await this.orderRepo.save(order);
    return result;
  }

  /**
   * 出库明细前置查重：同一出库单内不允许出现重复的 (物料, 批次) 组合。
   * 在落库之前拦截，避免触发 uk_outbound_order_line 唯一约束而浪费单号生成。
   */
  private assertNoDuplicateOutboundLines(
    items: Array<{ materialId?: number | null; batchNo?: string | null }>
  ): void {
    const counts = new Map<string, number>();
    for (const item of items ?? []) {
      const key = `${item.materialId ?? ''}__${item.batchNo ?? ''}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of counts) {
      if (count > 1) {
        const [materialId, batchNo] = key.split('__');
        throw AppError.conflict(
          `出库明细存在重复行：物料#${materialId || '空'} 批次「${batchNo || '空'}」出现了 ${count} 次，请合并后重试`
        );
      }
    }
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

  async approveOrder(
    id: number,
    auditorId?: number,
    auditorName?: string
  ): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const warehouseRows = await query('SELECT warehouse_name FROM inv_warehouse WHERE id = ?', [
      order.warehouseId,
    ]);
    const warehouseName = warehouseRows?.[0]?.warehouse_name || '';

    const previousStatus = order.status.value;
    order.approve(warehouseName, auditorId, auditorName);

    await transaction(async (conn) => {
      const [result] = (await conn.execute(
        "UPDATE inv_outbound_order SET status = 'approved', audit_status = 1, finance_posted = 1, auditor_id = ?, auditor_name = ?, audit_time = NOW(), update_time = NOW() WHERE id = ? AND status = ?",
        [
          auditorId || null,
          auditorName || null,
          id,
          previousStatus === 'completed' ? 'approved' : previousStatus,
        ]
      )) as [ResultSetHeader, any];
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      const events = order.getDomainEvents();
      await getDomainEventOutbox().saveEvents(conn, 'OutboundOrder', id, events);
    });

    order.clearDomainEvents();
    return { id, status: 'completed' };
  }

  async cancelOrder(id: number, reason?: string): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);
    const previousStatus = order.status.value;
    order.cancel(reason || '');

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
      throw new DomainError('当前状态的出库单不能删除');
    }
    await this.orderRepo.softDelete(id);
  }

  private async persistAndPublishEvents(aggregateId: number, order: OutboundOrder): Promise<void> {
    const events = order.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'OutboundOrder', aggregateId, events);
    });

    order.clearDomainEvents();
  }
}
