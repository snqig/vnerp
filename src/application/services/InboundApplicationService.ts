import { t } from '@/lib/server-translate';
import { getTranslations } from 'next-intl/server';

import { IInboundOrderRepository } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { InboundOrder, InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import { IPurchaseOrderRepository } from '@/domain/purchase/repositories/IPurchaseOrderRepository';
import { PurchaseOrderLine } from '@/domain/purchase/entities/PurchaseOrderLine';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { AppError } from '@/lib/error-handling';
import { CurrencyApplicationService } from './CurrencyApplicationService';
import { CurrencySnapshot } from '@/domain/shared/value-objects/CurrencySnapshot';
import { Money } from '@/domain/shared/value-objects/Money';
import { getSystemConfig } from '@/lib/system-config';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';
import {
  assertWarehouseExists,
  assertAllMaterialsExist,
  assertSupplierExists,
} from '@/lib/reference-validation';
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
    private readonly currencyService: CurrencyApplicationService,
    private readonly purchaseRepo?: IPurchaseOrderRepository
  ) {}

  async getOrderById(id: number): Promise<InboundOrder> {
  const ts = await getTranslations('Common');
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundError(ts('k_5pww03'));
    }
    return order;
  }

  async listOrders(
    status: string,
    page: number,
    pageSize: number,
    filters?: { keyword?: string; startDate?: string; endDate?: string; poId?: number }
  ) {
    return this.orderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createOrder(props: InboundOrderProps): Promise<{ id: number; orderNo: string }> {
    const baseCurrency = await getSystemConfig('finance.base_currency', 'CNY');
    const currency = props.currency || 'CNY';
    let exchangeRate = props.exchangeRate || 1.0;
    if (currency !== baseCurrency) {
      exchangeRate = await this.currencyService.getLatestRate(currency, baseCurrency);
    }

    const computedTotalAmount = props.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const snapshot = CurrencySnapshot.create(currency, exchangeRate, baseCurrency);
    const baseTotalAmount =
      Math.round(snapshot.convert(Money.create(computedTotalAmount, currency)).amount * 100) / 100;

    const order = InboundOrder.create({
      ...props,
      currency,
      exchangeRate,
      baseCurrency,
      baseTotalAmount,
    });
    // 前置查重：同一入库单内不允许重复的 (物料, 批次) 组合，避免落库触发 uk_inbound_order_line
    this.assertNoDuplicateInboundLines(props.items);
    // 引用完整性守卫（应用层）：写入前确认仓库与物料主数据存在，
    // 阻断 material_id 等无数据库外键列的悬空引用（审计发现的历史痛点）。
    await assertWarehouseExists(props.warehouseId);
    await assertAllMaterialsExist(props.items.map((i) => i.materialId));
    if (props.supplierId) {
      await assertSupplierExists(props.supplierId);
    }
    const result = await this.orderRepo.save(order);

    if (order.id) {
      await this.persistAndPublishEvents(order.id, order);
    }

    return result;
  }

  /**
   * 入库明细前置查重：同一入库单内不允许出现重复的 (物料, 批次) 组合。
   * 在落库之前拦截，避免触发 uk_inbound_order_line 唯一约束而浪费单号生成。
   * 注意：跨单据的 (物料, 批次) 唯一性由 uk_warehouse_material_batch 在数据库层兜底，
   * 并通过统一异常处理将 1062 转译为 409 友好提示。
   */
  private assertNoDuplicateInboundLines(
    items: Array<{ materialId?: number | null; batchNo?: string | null }>
  ): void {
  const ts = t;
    const counts = new Map<string, number>();
    for (const item of items ?? []) {
      const key = `${item.materialId ?? ''}__${item.batchNo ?? ''}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of counts) {
      if (count > 1) {
        const [materialId, batchNo] = key.split('__');
        throw AppError.conflict(
          `入库明细存在重复行：物料#${materialId || ts('k_1yw5ep9')} 批次「${batchNo || ts('k_1yw5ep9')}」出现了 ${count} 次，请合并后重试`
        );
      }
    }
  }

  /**
   * 内容级更新（仅草稿/待审核单）。
   * 重新计算金额/数量/本位币，校验明细无重复 (物料,批次)，再落库。
   */
  async updateOrderContent(
    id: number,
    input: {
      supplierName?: string;
      warehouseId: number;
      inboundDate?: string;
      currency?: string;
      remark?: string;
      items: Array<{
        materialId?: number;
        materialCode?: string;
        materialName: string;
        materialSpec?: string;
        batchNo?: string;
        quantity: number;
        unit?: string;
        unitPrice?: number;
      }>;
    }
  ): Promise<{ id: number; orderNo: string }> {
  const ts = await getTranslations('Common');
    const order = await this.getOrderById(id);
    const status = order.status.value;
    if (status !== 'draft' && status !== 'pending') {
      throw new DomainError(ts('k_u3fnes'));
    }

    const items = input.items;
    // 前置查重：同一入库单内不允许重复的 (物料, 批次) 组合
    this.assertNoDuplicateInboundLines(items);

    const baseCurrency = await getSystemConfig('finance.base_currency', 'CNY');
    const currency = input.currency || 'CNY';
    let exchangeRate = 1.0;
    if (currency !== baseCurrency) {
      exchangeRate = await this.currencyService.getLatestRate(currency, baseCurrency);
    }

    const computedTotalAmount = items.reduce(
      (sum, it) => sum + it.quantity * (it.unitPrice || 0),
      0
    );
    const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0);
    const snapshot = CurrencySnapshot.create(currency, exchangeRate, baseCurrency);
    const baseTotalAmount =
      Math.round(snapshot.convert(Money.create(computedTotalAmount, currency)).amount * 100) / 100;

    const contentItems = items.map((it) => ({
      materialId: it.materialId ?? 0,
      materialCode: it.materialCode ?? null,
      materialName: it.materialName,
      materialSpec: it.materialSpec ?? null,
      batchNo: it.batchNo ?? null,
      quantity: it.quantity,
      unit: it.unit || ts('k_w0gthl'),
      unitPrice: it.unitPrice || 0,
      totalPrice: Math.round(it.quantity * (it.unitPrice || 0) * 100) / 100,
    }));

    // 引用完整性守卫（应用层）：编辑草稿/待审核单时同样拦截悬空引用
    await assertWarehouseExists(input.warehouseId);
    await assertAllMaterialsExist(items.map((it) => it.materialId));

    return this.orderRepo.updateOrderContent(id, {
      supplierName: input.supplierName ?? null,
      warehouseId: input.warehouseId,
      inboundDate: input.inboundDate ?? null,
      currency,
      baseTotalAmount,
      totalAmount: computedTotalAmount,
      totalQuantity,
      remark: input.remark ?? null,
      items: contentItems,
    });
  }

  async createInboundFromPO(
    params: CreateInboundFromPOParams
  ): Promise<{ id: number; orderNo: string }> {
  const ts = await getTranslations('Common');
    if (!this.purchaseRepo) {
      throw new DomainError(ts('k_1j4dx46'));
    }

    const purchaseOrder = await this.purchaseRepo.findById(params.poId);
    if (!purchaseOrder) {
      throw new NotFoundError(ts('k_1m3z88r'));
    }

    const status = purchaseOrder.status.value;
    if (status !== 'approved' && status !== 'partially_received') {
      throw new DomainError(`采购单当前状态"${purchaseOrder.status.label()}"不允许创建入库单`);
    }

    // 引用完整性守卫（应用层）：仓库与物料主数据必须存在
    await assertWarehouseExists(params.warehouseId);
    await assertAllMaterialsExist(params.items.map((i) => i.materialId));
    if (purchaseOrder.supplierId) {
      await assertSupplierExists(purchaseOrder.supplierId);
    }

    // 同一入库单内同物料多行需先按 lineNo 聚合数量，再逐行做容差校验
    const qtyByLineNo = new Map<number, number>();
    for (const item of params.items) {
      qtyByLineNo.set(item.lineNo, (qtyByLineNo.get(item.lineNo) || 0) + item.quantity);
    }

    const lineMap = new Map<number, PurchaseOrderLine>();
    for (const line of purchaseOrder.lines) {
      lineMap.set(line.lineNo, line);
    }

    const tolerance = purchaseOrder.overReceiptTolerance ?? 0;
    for (const item of params.items) {
      const line = lineMap.get(item.lineNo);
      if (!line) {
        throw new DomainError(`采购单行号${item.lineNo}不存在`);
      }
      if (item.materialId !== line.materialId) {
        throw new DomainError(
          `行号${item.lineNo}物料ID不匹配: 采购单${line.materialId} vs 入库${item.materialId}`
        );
      }
      const maxAllowed = line.orderQty * (1 + tolerance / 100);
      const newReceived = line.receivedQty + (qtyByLineNo.get(item.lineNo) || 0);
      if (newReceived > maxAllowed) {
        throw new DomainError(
          `行${item.lineNo}入库将超限：订购${line.orderQty}、已收${line.receivedQty}、本次${qtyByLineNo.get(item.lineNo)}、容差${tolerance}%、上限${maxAllowed}`
        );
      }
    }

    const baseCurrency = await getSystemConfig('finance.base_currency', 'CNY');
    const currency = purchaseOrder.currency || 'CNY';
    let exchangeRate = purchaseOrder.exchangeRate || 1.0;
    if (currency !== baseCurrency) {
      exchangeRate = await this.currencyService.getLatestRate(currency, baseCurrency);
    }

    const computedTotalAmount = params.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const snapshot = CurrencySnapshot.create(currency, exchangeRate, baseCurrency);
    const baseTotalAmount =
      Math.round(snapshot.convert(Money.create(computedTotalAmount, currency)).amount * 100) / 100;

    const props: InboundOrderProps = {
      warehouseId: params.warehouseId,
      supplierId: purchaseOrder.supplierId,
      supplierName: purchaseOrder.supplierName,
      poId: purchaseOrder.id,
      poNo: purchaseOrder.orderNo,
      sourceType: 'purchase_order',
      sourceOrderId: purchaseOrder.id,
      orderType: 'purchase',
      currency,
      exchangeRate,
      baseCurrency,
      baseTotalAmount,
      items: params.items.map((item) => {
        const line = lineMap.get(item.lineNo);
        return {
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
          purchaseOrderItemId: line?.id,
          purchaseOrderLineNo: line?.lineNo,
        };
      }),
    };

    const order = InboundOrder.create(props);
    // 前置查重：同一入库单内不允许重复的 (物料, 批次) 组合，避免落库触发 uk_inbound_order_line
    this.assertNoDuplicateInboundLines(props.items);
    const result = await this.orderRepo.save(order);

    if (order.id) {
      await this.persistAndPublishEvents(order.id, order);
    }

    return result;
  }

  async approveOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    // 引用完整性守卫（应用层，纵深防御）：审核时再次确认仓库存在，
    // 并复用返回行里的仓库名，避免一次额外的 SELECT。
    const warehouseRow = await assertWarehouseExists(order.warehouseId);
    const warehouseName = String(warehouseRow.warehouse_name ?? '');

    const previousStatus = order.status.value;

    if (previousStatus === 'draft' || previousStatus === 'rejected') {
      order.submit();
    }

    order.approve(warehouseName);

    await transaction(async (conn) => {
      // 同上：领域 'completed' 可能对应库里的 'approved' 或 'completed'，不能只猜 'approved'。
      const statusPredicate =
        previousStatus === 'completed' ? "status IN ('approved','completed')" : 'status = ?';
      const predicateParams = previousStatus === 'completed' ? [] : [previousStatus];
      const [result] = (await conn.execute(
        `UPDATE inv_inbound_order SET status = 'approved', update_time = NOW() WHERE id = ? AND ${statusPredicate}`,
        [id, ...predicateParams]
      )) as [ResultSetHeader, any];
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      await this.orderRepo.updateInspectionAndFinance(id, order.inspectionStatus, order.financePosted, conn);

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

    await transaction(async (conn) => {
      // 领域侧 OrderStatus.from() 把 DB 的 'approved' 与 'completed' 都折叠成 'completed'，
      // 因此到这里已读不回库里的原始字面值。
      // 原实现一律猜测为 'approved'，但真实库实测为 63 条 'completed' + 0 条 'approved'，
      // 必然匹配不到 → affectedRows=0 → 误抛 VersionConflictError(409)。
      // 两种字面值代表同一个领域状态，同时接受并不会削弱乐观锁语义。
      const statusPredicate =
        previousStatus === 'completed' ? "status IN ('approved','completed')" : 'status = ?';
      const predicateParams = previousStatus === 'completed' ? [] : [previousStatus];
      const [result] = (await conn.execute(
        `UPDATE inv_inbound_order SET status = 'pending', update_time = NOW() WHERE id = ? AND ${statusPredicate}`,
        [id, ...predicateParams]
      )) as [ResultSetHeader, any];
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      const events = order.getDomainEvents();
      await getDomainEventOutbox().saveEvents(conn, 'InboundOrder', id, events);
    });

    order.clearDomainEvents();

    return { id, status: 'pending' };
  }

  async cancelOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.cancel();

    await transaction(async (conn) => {
      const whereStatus = previousStatus === 'completed' ? 'approved' : previousStatus;
      const [result] = (await conn.execute(
        "UPDATE inv_inbound_order SET status = 'cancelled', update_time = NOW() WHERE id = ? AND status = ?",
        [id, whereStatus]
      )) as [ResultSetHeader, any];
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      const events = order.getDomainEvents();
      await getDomainEventOutbox().saveEvents(conn, 'InboundOrder', id, events);
    });

    order.clearDomainEvents();

    return { id, status: 'cancelled' };
  }

  async rejectOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.reject();

    await transaction(async (conn) => {
      const statusPredicate =
        previousStatus === 'completed' ? "status IN ('approved','completed')" : 'status = ?';
      const predicateParams = previousStatus === 'completed' ? [] : [previousStatus];
      const [result] = (await conn.execute(
        `UPDATE inv_inbound_order SET status = 'rejected', update_time = NOW() WHERE id = ? AND ${statusPredicate}`,
        [id, ...predicateParams]
      )) as [ResultSetHeader, any];
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      const events = order.getDomainEvents();
      await getDomainEventOutbox().saveEvents(conn, 'InboundOrder', id, events);
    });

    order.clearDomainEvents();

    return { id, status: 'rejected' };
  }

  async deleteOrder(id: number): Promise<void> {
  const ts = await getTranslations('Common');
    const order = await this.getOrderById(id);

    if (!order.canDelete()) {
      throw new DomainError(ts('k_83i36l'));
    }

    await this.orderRepo.softDelete(id);
  }

  async unapproveOrder(id: number): Promise<{ id: number; status: string }> {
    const order = await this.getOrderById(id);

    const previousStatus = order.status.value;
    order.unapprove();

    await transaction(async (conn) => {
      // 领域侧 OrderStatus.from() 把 DB 的 'approved' 与 'completed' 都折叠成 'completed'，
      // 因此到这里已读不回库里的原始字面值。
      // 原实现一律猜测为 'approved'，但真实库实测为 63 条 'completed' + 0 条 'approved'，
      // 必然匹配不到 → affectedRows=0 → 误抛 VersionConflictError(409)。
      // 两种字面值代表同一个领域状态，同时接受并不会削弱乐观锁语义。
      const statusPredicate =
        previousStatus === 'completed' ? "status IN ('approved','completed')" : 'status = ?';
      const predicateParams = previousStatus === 'completed' ? [] : [previousStatus];
      const [result] = (await conn.execute(
        `UPDATE inv_inbound_order SET status = 'pending', update_time = NOW() WHERE id = ? AND ${statusPredicate}`,
        [id, ...predicateParams]
      )) as [ResultSetHeader, any];
      if (result.affectedRows === 0) {
        throw new VersionConflictError();
      }

      // 反审核需同步重置质检/记账标记（领域 unapprove() 已把 inspectionStatus 置 0、financePosted 置 false），
      // 必须在本事务连接上执行，否则会因行锁冲突触发 Lock wait timeout。
      await this.orderRepo.updateInspectionAndFinance(id, order.inspectionStatus, order.financePosted, conn);

      const events = order.getDomainEvents();
      await getDomainEventOutbox().saveEvents(conn, 'InboundOrder', id, events);
    });

    order.clearDomainEvents();

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
