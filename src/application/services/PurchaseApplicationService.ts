import { IPurchaseOrderRepository } from '@/domain/purchase/repositories/IPurchaseOrderRepository';
import { PurchaseOrder, PurchaseOrderProps } from '@/domain/purchase/aggregates/PurchaseOrder';
import { PurchaseOrderStatus } from '@/domain/purchase/value-objects/PurchaseOrderStatus';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { query, transaction } from '@/lib/db';
import {
  getSystemConfig,
  getSystemConfigBoolean,
  getSystemConfigNumber,
} from '@/lib/system-config';

export class PurchaseApplicationService {
  constructor(private readonly orderRepo: IPurchaseOrderRepository) {}

  async getOrderById(id: number): Promise<PurchaseOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError('采购单不存在');
    }
    return order;
  }

  async listOrders(
    status: string,
    page: number,
    pageSize: number,
    filters?: { keyword?: string; supplierId?: number; startDate?: string; endDate?: string }
  ) {
    return this.orderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createOrder(props: PurchaseOrderProps): Promise<{ id: number; orderNo: string }> {
    // 采购允差比例：未指定时使用系统配置默认值
    let effectiveProps = props;
    if (!props.overReceiptTolerance) {
      const tolerance = await getSystemConfigNumber('purchase.tolerance_ratio', 0);
      if (tolerance > 0) {
        effectiveProps = { ...props, overReceiptTolerance: tolerance };
      }
    }

    // 财务默认税率/币种（未指定时使用系统配置）
    if (!effectiveProps.taxRate) {
      const taxRate = await getSystemConfigNumber('finance.tax_rate', 13);
      effectiveProps = { ...effectiveProps, taxRate };
    }
    if (!effectiveProps.currency) {
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

    // 采购价格上限控制：单价超过该物料历史最高采购价时拦截
    const priceControl = await getSystemConfigBoolean('purchase.price_control', false);
    if (priceControl) {
      for (const line of effectiveProps.lines) {
        const maxPrice = await this.getHistoricalMaxPrice(line.materialId);
        if (maxPrice !== null && (line.unitPrice || 0) > maxPrice) {
          throw new DomainError(
            `物料「${line.materialName || line.materialCode}」采购单价 ${line.unitPrice} 超过历史最高价 ${maxPrice}，已被价格上限控制拦截`
          );
        }
      }
    }

    const order = PurchaseOrder.create(effectiveProps);
    const result = await this.orderRepo.save(order);

    if (result.id) {
      // 采购审批金额阈值：订单总额超过阈值时自动提交进入审批流
      const threshold = await getSystemConfigNumber('purchase.approval_threshold', 0);
      if (threshold > 0 && order.totalAmount > threshold) {
        order.submit();
        const updated = await this.orderRepo.updateStatus(result.id, 'submitted', 'draft');
        if (!updated) {
          throw new VersionConflictError();
        }
      }
      await this.persistAndPublishEvents(result.id, order);
    }

    return result;
  }

  /**
   * 查询某物料的历史最高采购单价，用于价格上限控制校验。
   * 无历史记录或查询失败时返回 null（不拦截）。
   */
  private async getHistoricalMaxPrice(materialId: number): Promise<number | null> {
    if (!materialId) return null;
    try {
      const rows: Loose = await query(
        'SELECT MAX(unit_price) AS max_price FROM pur_purchase_order_line WHERE material_id = ?',
        [materialId]
      );
      const max = rows[0]?.max_price;
      return max === null || max === undefined ? null : Number(max);
    } catch {
      return null;
    }
  }

  async submitOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.submit();

    const updated = await this.orderRepo.updateStatus(id, 'submitted', previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);

    return { id, status: 'submitted' };
  }

  async approveOrder(id: number, auditBy: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.approve(auditBy);

    await transaction(async (conn) => {
      const [result]: Loose = await conn.execute(
        'UPDATE pur_purchase_order SET status = ?, audit_by = ?, audit_time = NOW(), update_time = NOW() WHERE id = ? AND status = ?',
        [order.status.toDbCode(), auditBy, id, PurchaseOrderStatus.from(previousStatus).toDbCode()]
      );
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      const events = order.getDomainEvents();
      await getDomainEventOutbox().saveEvents(conn, 'PurchaseOrder', id, events);
    });

    order.clearDomainEvents();

    return { id, status: 'approved' };
  }

  /**
   * @deprecated 收货功能已迁移至入库单模块。
   * 请使用 POST /api/warehouse/inbound/from-po 从采购单创建入库单，
   * 再通过 PUT /api/warehouse/inbound?action=approve 审核入库单完成收货。
   */
  async receiveGoods(
    id: number,
    lineReceives: Array<{ lineNo: number; quantity: number; batchNo: string; warehouseId: number }>
  ): Promise<{ id: number; status: string }> {
    throw new DomainError(
      '收货功能已迁移至入库单流程，请使用 POST /api/warehouse/inbound/from-po 创建入库单'
    );
  }

  async closeOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.close();

    const updated = await this.orderRepo.updateStatus(id, 'closed', previousStatus);
    if (!updated) {
      throw new VersionConflictError();
    }

    await this.persistAndPublishEvents(id, order);

    return { id, status: 'closed' };
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.getOrderById(id);

    if (!order.canDelete()) {
      throw new DomainError('当前状态的采购单不能删除');
    }

    await this.orderRepo.softDelete(id);
  }

  private async persistAndPublishEvents(aggregateId: number, order: PurchaseOrder): Promise<void> {
    const events = order.getDomainEvents();
    if (events.length === 0) return;

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'PurchaseOrder', aggregateId, events);
    });

    order.clearDomainEvents();
  }
}
