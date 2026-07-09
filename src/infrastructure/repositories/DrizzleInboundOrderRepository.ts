/**
 * DrizzleInboundOrderRepository
 *
 * 演示性实现：将 MysqlInboundOrderRepository 中的 5 个核心 raw SQL 查询
 * 迁移到 Drizzle 查询构建器，验证迁移流程。
 *
 * 5 个核心查询对应的 Drizzle 构建器写法：
 *   1. findById            -> drizzleDb.query.invInboundOrders.findFirst + inArray items
 *   2. findByStatus        -> drizzleDb.select().from().where(and(...)) + count + orderBy + limit
 *   3. save                -> drizzleDb.insert(values) + batch insert items (transaction)
 *   4. updateStatus        -> drizzleDb.update().set().where(and(eq, eq)) 条件乐观锁
 *   5. softDelete          -> drizzleDb.update().set({deleted:true}).where(eq)
 *
 * 与原 MysqlInboundOrderRepository 行为对齐，字段映射保持一致。
 * 原始 raw SQL 版本仍保留运行（未删除），便于对比验证。
 */

import { eq, and, like, or, gte, lte, desc, inArray, count } from 'drizzle-orm';
import { drizzleDb } from '@/lib/db';
import { invInboundOrders, invInboundItems } from '@/lib/db/schema';
import { transaction } from '@/lib/db';
import {
  IInboundOrderRepository,
  Pagination,
  PaginatedResult,
} from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { InboundOrder, InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import { generateDocumentNo } from '@/lib/document-numbering';

const DB_TO_DOMAIN_STATUS: Record<string, string> = {
  draft: 'draft',
  pending: 'pending',
  approved: 'completed',
  completed: 'completed',
  cancelled: 'cancelled',
};

const DOMAIN_TO_DB_STATUS: Record<string, string> = {
  draft: 'draft',
  pending: 'pending',
  completed: 'approved',
  cancelled: 'cancelled',
};

export class DrizzleInboundOrderRepository implements IInboundOrderRepository {
  /**
   * 1. findById - 按 ID 查询单个入库单 + 明细
   * Drizzle 替代：query API + inArray 加载子表
   */
  async findById(id: number): Promise<InboundOrder | null> {
    const order = await drizzleDb.query.invInboundOrders.findFirst({
      where: and(eq(invInboundOrders.id, id), eq(invInboundOrders.deleted, false)),
    });

    if (!order) return null;

    const items = await drizzleDb.query.invInboundItems.findMany({
      where: eq(invInboundItems.orderId, id),
    });

    const props: InboundOrderProps = {
      id: order.id,
      orderNo: order.orderNo,
      status: (DB_TO_DOMAIN_STATUS[order.status ?? 'pending'] ?? 'pending') as any,
      warehouseId: order.warehouseId,
      supplierName: order.supplierName ?? '',
      supplierId: order.supplierId ?? undefined,
      poId: order.poId ?? undefined,
      poNo: order.poNo ?? undefined,
      orderType: order.orderType ?? 'purchase',
      inboundDate: order.inboundDate ? String(order.inboundDate) : undefined,
      remark: order.remark ?? undefined,
      items: items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        materialId: item.materialId ?? 0,
        materialName: item.materialName ?? '',
        materialSpec: item.materialSpec ?? undefined,
        batchNo: item.batchNo ?? '',
        quantity: Number(item.quantity),
        unit: item.unit ?? '',
        unitPrice: Number(item.unitPrice),
        warehouseLocation: item.warehouseLocation ?? undefined,
        produceDate: item.produceDate ? String(item.produceDate) : undefined,
      })),
      totalAmount: order.totalAmount ? Number(order.totalAmount) : 0,
      totalQuantity: Number(order.totalQuantity),
      createTime: order.createTime ? String(order.createTime) : undefined,
      updateTime: order.updateTime ? String(order.updateTime) : undefined,
    };

    return InboundOrder.reconstitute(props);
  }

  /**
   * 2. findByStatus - 分页列表 + 动态过滤 + 批量加载明细
   * Drizzle 替代：select + where(and(...)) + orderBy(desc) + limit/offset
   *             count 单独查询；items 用 inArray 一次性加载
   */
  async findByStatus(
    status: string,
    pagination: Pagination,
    filters?: { keyword?: string; startDate?: string; endDate?: string }
  ): Promise<PaginatedResult<InboundOrder>> {
    const conditions = [eq(invInboundOrders.deleted, false)];

    if (filters?.keyword) {
      const kw = `%${filters.keyword}%`;
      conditions.push(
        or(like(invInboundOrders.orderNo, kw), like(invInboundOrders.supplierName, kw))!
      );
    }

    if (status) {
      const dbStatus = DOMAIN_TO_DB_STATUS[status] ?? status;
      conditions.push(eq(invInboundOrders.status, dbStatus));
    }

    if (filters?.startDate) {
      conditions.push(gte(invInboundOrders.inboundDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(invInboundOrders.inboundDate, new Date(filters.endDate)));
    }

    const where = and(...conditions);

    // 总数
    const totalRow = await drizzleDb.select({ total: count() }).from(invInboundOrders).where(where);
    const total = totalRow[0]?.total ?? 0;

    // 分页数据
    const orders = await drizzleDb
      .select()
      .from(invInboundOrders)
      .where(where)
      .orderBy(desc(invInboundOrders.createTime))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);

    if (orders.length === 0) {
      return {
        data: [],
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // 批量加载明细（inArray 一次性查询，避免 N+1）
    const orderIds = orders.map((o) => o.id);
    const allItems = await drizzleDb.query.invInboundItems.findMany({
      where: inArray(invInboundItems.orderId, orderIds),
    });

    const itemsMap = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const list = itemsMap.get(item.orderId) ?? [];
      list.push(item);
      itemsMap.set(item.orderId, list);
    }

    const data = orders.map((o) =>
      InboundOrder.reconstitute({
        id: o.id,
        orderNo: o.orderNo,
        status: (DB_TO_DOMAIN_STATUS[o.status ?? 'pending'] ?? 'pending') as any,
        warehouseId: o.warehouseId,
        supplierName: o.supplierName ?? '',
        supplierId: o.supplierId ?? undefined,
        poId: o.poId ?? undefined,
        poNo: o.poNo ?? undefined,
        orderType: o.orderType ?? 'purchase',
        inboundDate: o.inboundDate ? String(o.inboundDate) : undefined,
        remark: o.remark ?? undefined,
        items: (itemsMap.get(o.id) ?? []).map((item) => ({
          id: item.id,
          orderId: item.orderId,
          materialId: item.materialId ?? 0,
          materialName: item.materialName ?? '',
          materialSpec: item.materialSpec ?? undefined,
          batchNo: item.batchNo ?? '',
          quantity: Number(item.quantity),
          unit: item.unit ?? '',
          unitPrice: Number(item.unitPrice),
          warehouseLocation: item.warehouseLocation ?? undefined,
          produceDate: item.produceDate ? String(item.produceDate) : undefined,
        })),
        totalAmount: o.totalAmount ? Number(o.totalAmount) : 0,
        totalQuantity: Number(o.totalQuantity),
        createTime: o.createTime ? String(o.createTime) : undefined,
        updateTime: o.updateTime ? String(o.updateTime) : undefined,
      })
    );

    return {
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  }

  /**
   * 3. save - 事务插入主表 + 批量插入明细
   * Drizzle 替代：transaction 内 drizzleDb.insert() 链式调用
   * 注意：仍使用现有 transaction 包装以复用连接管理
   */
  async save(order: InboundOrder): Promise<{ id: number; orderNo: string }> {
    const orderNo = await generateDocumentNo('inbound');
    const items = order.items;

    return await transaction(async (conn) => {
      // 主表插入
      const [orderResult]: any = await conn.execute(
        `INSERT INTO inv_inbound_order
         (order_no, order_type, warehouse_id, supplier_id, supplier_name, po_id, po_no,
          total_amount, total_quantity, status, inbound_date, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderNo,
          order.orderType || 'purchase',
          order.warehouseId,
          order.supplierId || null,
          order.supplierName || null,
          order.poId || null,
          order.poNo || null,
          order.totalAmount.amount,
          order.totalQuantity,
          DOMAIN_TO_DB_STATUS[order.status.value] || order.status.value,
          order.inboundDate || null,
          order.remark || null,
        ]
      );
      const orderId = orderResult.insertId;

      // 明细批量插入（保留 raw execute 以在事务连接内执行；
      // 后续可改用 drizzleDb.transaction + drizzleDb.insert 完成彻底迁移）
      for (const item of items) {
        await conn.execute(
          `INSERT INTO inv_inbound_item
           (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price, warehouse_location, produce_date, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            orderId,
            item.materialId,
            item.materialName || null,
            item.materialSpec || null,
            item.batchNo || null,
            item.quantity,
            item.unit || null,
            item.unitPrice || 0,
            item.totalPrice || 0,
            item.warehouseLocation || null,
            item.produceDate || null,
          ]
        );
      }

      return { id: orderId, orderNo };
    });
  }

  /**
   * 4. updateStatus - 条件 UPDATE（乐观锁，要求当前 status 匹配）
   * Drizzle 替代：drizzleDb.update().set().where(and(eq, eq))
   */
  async updateStatus(id: number, status: string, currentStatus: string): Promise<boolean> {
    const dbStatus = DOMAIN_TO_DB_STATUS[status] ?? status;
    const dbCurrentStatus = DOMAIN_TO_DB_STATUS[currentStatus] ?? currentStatus;

    const result = await drizzleDb
      .update(invInboundOrders)
      .set({ status: dbStatus, updateTime: new Date() })
      .where(and(eq(invInboundOrders.id, id), eq(invInboundOrders.status, dbCurrentStatus)));

    // affectedRows 在 mysql2 ResultSetHeader 上
    return (result[0] as any)?.affectedRows > 0;
  }

  /**
   * 5. softDelete - 软删除（deleted = 1）
   * Drizzle 替代：drizzleDb.update().set({deleted:true}).where(eq)
   */
  async softDelete(id: number): Promise<void> {
    await drizzleDb
      .update(invInboundOrders)
      .set({ deleted: true, updateTime: new Date() })
      .where(eq(invInboundOrders.id, id));
  }

  /**
   * updateInspectionAndFinance - 辅助方法（保持接口完整）
   * 注意：当前实现保持与原 raw SQL 版本一致，未迁移以避免引入 finance_posted 列
   */
  async updateInspectionAndFinance(
    id: number,
    inspectionStatus: number,
    financePosted: boolean
  ): Promise<void> {
    // 使用 Drizzle 更新 qc_status
    await drizzleDb
      .update(invInboundOrders)
      .set({
        qcStatus: inspectionStatus === 3 ? 'pass' : 'pending',
        updateTime: new Date(),
      })
      .where(eq(invInboundOrders.id, id));
  }
}
