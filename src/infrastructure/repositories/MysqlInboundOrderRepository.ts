import { getTranslations } from 'next-intl/server';

import {
  IInboundOrderRepository,
  Pagination,
  PaginatedResult,
  InboundOrderContentUpdate,
} from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { InboundOrder, InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import type { DbConnection } from '@/types/db';
import { generateDocumentNo } from '@/lib/document-numbering';
import type { InboundStatus } from '@/domain/warehouse/value-objects/OrderStatus';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

interface InboundOrderRow {
  id: number;
  order_no: string;
  inbound_date: string | null;
  supplier_name: string;
  supplier_id: number | null;
  po_id: number | null;
  po_no: string | null;
  source_type: string | null;
  source_order_id: number | null;
  warehouse_id: number;
  warehouse_name: string | null;
  order_type: string;
  total_quantity: number;
  currency: string;
  exchange_rate: number;
  total_amount: number;
  base_total_amount: number;
  status: string;
  remark: string | null;
  create_time: string;
  update_time: string;
  deleted: number;
  items?: InboundOrderItemRow[];
}

interface InboundOrderItemRow {
  id: number;
  order_id: number;
  material_id: number;
  material_code: string | null;
  material_name: string;
  material_spec: string | null;
  batch_no: string;
  batch_id: number | null;
  original_inbound_date: string | null;
  location_id: number | null;
  qr_code: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  warehouse_location: string | null;
  produce_date: string | null;
  purchase_order_item_id: number | null;
  purchase_order_line_no: number | null;
  create_time: string;
}

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

const ITEM_COLUMNS = `id, order_id, material_id, material_code, material_name, material_spec,
                      batch_no, batch_id, original_inbound_date, location_id, qr_code,
                      quantity, unit, unit_price, total_price, warehouse_location,
                      produce_date, purchase_order_item_id, purchase_order_line_no`;

export class MysqlInboundOrderRepository implements IInboundOrderRepository {
  async findById(id: number): Promise<InboundOrder | null> {
    const orders = await query<InboundOrderRow>(
      'SELECT * FROM inv_inbound_order WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const items = await query<InboundOrderItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM inv_inbound_item WHERE order_id = ?`,
      [id]
    );

    const props: InboundOrderProps = {
      id: order.id,
      orderNo: order.order_no,
      status: (DB_TO_DOMAIN_STATUS[order.status] || order.status) as InboundStatus,
      warehouseId: order.warehouse_id,
      warehouseName: order.warehouse_name || '',
      supplierName: order.supplier_name || '',
      supplierId: order.supplier_id ?? undefined,
      poId: order.po_id ?? undefined,
      poNo: order.po_no ?? undefined,
      sourceType: order.source_type ?? undefined,
      sourceOrderId: order.source_order_id ?? undefined,
      orderType: order.order_type,
      inboundDate: order.inbound_date ?? undefined,
      currency: order.currency || 'CNY',
      exchangeRate: Number(order.exchange_rate) || 1.0,
      baseCurrency: 'CNY',
      baseTotalAmount: Number(order.base_total_amount) || 0,
      remark: order.remark ?? undefined,
      items: items.map((item) => ({
        id: item.id,
        orderId: item.order_id,
        materialId: item.material_id,
        materialCode: item.material_code || '',
        materialName: item.material_name,
        materialSpec: item.material_spec ?? undefined,
        batchNo: item.batch_no || '',
        batchId: item.batch_id ?? null,
        originalInboundDate: item.original_inbound_date ?? null,
        locationId: item.location_id ?? null,
        qrCode: item.qr_code ?? null,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unit_price,
        warehouseLocation: item.warehouse_location ?? undefined,
        produceDate: item.produce_date ?? undefined,
        purchaseOrderItemId: item.purchase_order_item_id ?? undefined,
        purchaseOrderLineNo: item.purchase_order_line_no ?? undefined,
      })),
      totalAmount: order.total_amount,
      totalQuantity: order.total_quantity,
      createTime: order.create_time,
      updateTime: order.update_time,
    };

    return InboundOrder.reconstitute(props);
  }

  async findByStatus(
    status: string,
    pagination: Pagination,
    filters?: { keyword?: string; startDate?: string; endDate?: string; poId?: number }
  ): Promise<PaginatedResult<InboundOrder>> {
    let sql = `SELECT o.id, o.order_no, o.inbound_date, o.supplier_name, o.supplier_id,
               o.po_id, o.po_no, o.warehouse_id, o.warehouse_name, o.order_type, o.total_quantity,
               o.currency, o.exchange_rate, o.total_amount, o.base_total_amount,
               o.status, o.remark, o.create_time, o.update_time,
               o.source_type, o.source_order_id
               FROM inv_inbound_order o WHERE o.deleted = 0`;
    let countSql = `SELECT COUNT(*) as total FROM inv_inbound_order o WHERE o.deleted = 0`;
    const params: (string | number | null)[] = [];

    if (filters?.keyword) {
      const condition = ` AND (o.order_no LIKE ? OR o.supplier_name LIKE ? OR o.po_no LIKE ?)`;
      sql += condition;
      countSql += condition;
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    if (status) {
      const dbStatus = DOMAIN_TO_DB_STATUS[status] || status;
      sql += ` AND o.status = ?`;
      countSql += ` AND o.status = ?`;
      params.push(dbStatus);
    }

    if (filters?.poId) {
      const condition = ` AND o.po_id = ?`;
      sql += condition;
      countSql += condition;
      params.push(filters.poId);
    }

    if (filters?.startDate) {
      sql += ` AND o.inbound_date >= ?`;
      countSql += ` AND o.inbound_date >= ?`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ` AND o.inbound_date <= ?`;
      countSql += ` AND o.inbound_date <= ?`;
      params.push(filters.endDate);
    }

    sql += ` ORDER BY o.create_time DESC`;

    const result = await queryPaginated<InboundOrderRow>(sql, countSql, params, pagination);

    if (result.data.length > 0) {
      const orderIds = result.data.map((o) => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const items = await query(
        `SELECT ${ITEM_COLUMNS} FROM inv_inbound_item WHERE order_id IN (${placeholders})`,
        orderIds
      );

      const itemsMap = new Map<number, InboundOrderItemRow[]>();
      for (const item of items as InboundOrderItemRow[]) {
        if (!itemsMap.has(item.order_id)) {
          itemsMap.set(item.order_id, []);
        }
        itemsMap.get(item.order_id)!.push(item);
      }

      for (const order of result.data) {
        order.items = itemsMap.get(order.id) || [];
      }
    }

    return {
      data: result.data.map((o) =>
        InboundOrder.reconstitute({
          id: o.id,
          orderNo: o.order_no,
          status: (DB_TO_DOMAIN_STATUS[o.status] || o.status) as InboundStatus,
          warehouseId: o.warehouse_id,
          warehouseName: o.warehouse_name || '',
          supplierName: o.supplier_name || '',
          supplierId: o.supplier_id ?? undefined,
          poId: o.po_id ?? undefined,
          poNo: o.po_no ?? undefined,
          sourceType: o.source_type ?? undefined,
          sourceOrderId: o.source_order_id ?? undefined,
          orderType: o.order_type,
          inboundDate: o.inbound_date ?? undefined,
          currency: o.currency || 'CNY',
          exchangeRate: Number(o.exchange_rate) || 1.0,
          baseCurrency: 'CNY',
          baseTotalAmount: Number(o.base_total_amount) || 0,
          remark: o.remark ?? undefined,
          items: (o.items || []).map((item: InboundOrderItemRow) => ({
            id: item.id,
            orderId: item.order_id,
            materialId: item.material_id,
            materialCode: item.material_code || '',
            materialName: item.material_name,
            materialSpec: item.material_spec ?? undefined,
            batchNo: item.batch_no || '',
            batchId: item.batch_id ?? null,
            originalInboundDate: item.original_inbound_date ?? null,
            locationId: item.location_id ?? null,
            qrCode: item.qr_code ?? null,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unit_price,
            warehouseLocation: item.warehouse_location ?? undefined,
            produceDate: item.produce_date ?? undefined,
            purchaseOrderItemId: item.purchase_order_item_id ?? undefined,
            purchaseOrderLineNo: item.purchase_order_line_no ?? undefined,
          })),
          totalAmount: o.total_amount,
          totalQuantity: o.total_quantity,
          createTime: o.create_time,
          updateTime: o.update_time,
        })
      ),
      pagination: result.pagination,
    };
  }

  async save(order: InboundOrder): Promise<{ id: number; orderNo: string }> {
    const orderNo = await generateDocumentNo('inbound');
    const items = order.items;

    return await transaction(async (conn) => {
      const [orderResult] = await conn.execute(
        `INSERT INTO inv_inbound_order
         (order_no, order_type, warehouse_id, warehouse_name, supplier_id, supplier_name, po_id, po_no,
          currency, exchange_rate, total_amount, total_quantity,
          base_total_amount, status, inbound_date, remark,
          source_type, source_order_id, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderNo,
          order.orderType || 'purchase',
          order.warehouseId,
          order.warehouseName || null,
          order.supplierId || null,
          order.supplierName || null,
          order.poId || null,
          order.poNo || null,
          order.currency,
          order.exchangeRate,
          order.totalAmount.amount,
          order.totalQuantity,
          order.baseTotalAmount,
          DOMAIN_TO_DB_STATUS[order.status.value] || order.status.value,
          order.inboundDate || null,
          order.remark || null,
          order.sourceType || null,
          order.sourceOrderId || null,
        ]
      );

      const orderId = (orderResult as ResultSetHeader).insertId;

      for (const item of items) {
        await conn.execute(
          `INSERT INTO inv_inbound_item
           (order_id, material_id, material_code, material_name, material_spec, batch_no, batch_id, original_inbound_date, location_id, qr_code, quantity, unit, unit_price, total_price, warehouse_location, produce_date, purchase_order_item_id, purchase_order_line_no, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            orderId,
            item.materialId,
            item.materialCode || null,
            item.materialName || null,
            item.materialSpec || null,
            item.batchNo || null,
            item.batchId ?? null,
            item.originalInboundDate ?? null,
            item.locationId ?? null,
            item.qrCode ?? null,
            item.quantity,
            item.unit || null,
            item.unitPrice || 0,
            item.totalPrice || 0,
            item.warehouseLocation || null,
            item.produceDate || null,
            item.purchaseOrderItemId ?? null,
            item.purchaseOrderLineNo ?? null,
          ]
        );
      }

      return { id: orderId, orderNo };
    });
  }

  async updateOrderContent(
    id: number,
    data: InboundOrderContentUpdate
  ): Promise<{ id: number; orderNo: string }> {
    return await transaction(async (conn) => {
  const ts = await getTranslations('Common');
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT order_no FROM inv_inbound_order WHERE id = ? AND deleted = 0',
        [id]
      );
      const row = rows[0];
      if (!row) {
        throw new Error(ts('k_x2pmqg'));
      }

      await conn.execute(
        `UPDATE inv_inbound_order
         SET supplier_name = ?, warehouse_id = ?, inbound_date = ?, currency = ?,
             total_amount = ?, total_quantity = ?, base_total_amount = ?, remark = ?, update_time = NOW()
         WHERE id = ?`,
        [
          data.supplierName,
          data.warehouseId,
          data.inboundDate,
          data.currency,
          data.totalAmount,
          data.totalQuantity,
          data.baseTotalAmount,
          data.remark,
          id,
        ]
      );

      await conn.execute('DELETE FROM inv_inbound_item WHERE order_id = ?', [id]);

      for (const item of data.items) {
        await conn.execute(
          `INSERT INTO inv_inbound_item
           (order_id, material_id, material_code, material_name, material_spec, batch_no, batch_id, original_inbound_date, location_id, qr_code, quantity, unit, unit_price, total_price, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            id,
            item.materialId,
            item.materialCode || null,
            item.materialName || null,
            item.materialSpec || null,
            item.batchNo || null,
            item.batchId ?? null,
            item.originalInboundDate ?? null,
            item.locationId ?? null,
            item.qrCode ?? null,
            item.quantity,
            item.unit || null,
            item.unitPrice || 0,
            item.totalPrice || 0,
          ]
        );
      }

      return { id, orderNo: row.order_no };
    });
  }

  async updateStatus(id: number, status: string, currentStatus: string): Promise<boolean> {
    const dbStatus = DOMAIN_TO_DB_STATUS[status] || status;
    const dbCurrentStatus = DOMAIN_TO_DB_STATUS[currentStatus] || currentStatus;
    const result = await execute(
      'UPDATE inv_inbound_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
      [dbStatus, id, dbCurrentStatus]
    );
    return result.affectedRows > 0;
  }

  async updateInspectionAndFinance(
    id: number,
    inspectionStatus: number,
    financePosted: boolean,
    conn?: DbConnection
  ): Promise<void> {
    // inspection_status / finance_posted 两列已由迁移脚本补齐：
    //   scripts/migrate-add-inbound-inspection-columns.cjs
    // 补齐前它们不存在，本 SQL 必抛 ER_BAD_FIELD_ERROR(1054)，原实现又被 try/catch 静默吞掉，
    // 导致质检/记账状态从来没有被真正持久化。
    // 现在同时写 qc_status（历史在用的质检列，实测已有 62 条 'pass'），让两个质检状态来源保持同步。
    //
    // ⚠️ 必须在调用方的事务连接(conn)上执行：本方法常在 transaction(async (conn) => {...}) 回调内被调用，
    // 若改用模块级 execute() 会从连接池取另一条独立连接去更新同一行，而事务连接仍持有该行锁未提交，
    // 从而触发 Lock wait timeout（ER_LOCK_WAIT_TIMEOUT）且被旧 try/catch 静默吞掉 —— 既写不进、又不报错。
    const sql = `UPDATE inv_inbound_order
        SET inspection_status = ?, finance_posted = ?, qc_status = ?, update_time = NOW()
      WHERE id = ?`;
    const params = [
      inspectionStatus,
      financePosted ? 1 : 0,
      inspectionStatus === 3 ? 'pass' : 'pending',
      id,
    ];
    if (conn) {
      await conn.execute(sql, params);
    } else {
      await execute(sql, params);
    }
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE inv_inbound_order SET deleted = 1, update_time = NOW() WHERE id = ?', [
      id,
    ]);
  }
}
