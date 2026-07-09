import {
  IInboundOrderRepository,
  Pagination,
  PaginatedResult,
} from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { InboundOrder, InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
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

const ITEM_COLUMNS = `id, order_id, material_id, material_name, material_spec,
                      batch_no, quantity, unit, unit_price, total_price, warehouse_location, produce_date`;

export class MysqlInboundOrderRepository implements IInboundOrderRepository {
  async findById(id: number): Promise<InboundOrder | null> {
    const orders = await query<any>(
      'SELECT * FROM inv_inbound_order WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const items = await query<any>(
      `SELECT ${ITEM_COLUMNS} FROM inv_inbound_item WHERE order_id = ?`,
      [id]
    );

    const props: InboundOrderProps = {
      id: order.id,
      orderNo: order.order_no,
      status: (DB_TO_DOMAIN_STATUS[order.status] || order.status) as any,
      warehouseId: order.warehouse_id,
      supplierName: order.supplier_name || '',
      supplierId: order.supplier_id,
      poId: order.po_id,
      poNo: order.po_no,
      orderType: order.order_type,
      inboundDate: order.inbound_date,
      remark: order.remark,
      items: items.map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        materialId: item.material_id,
        materialName: item.material_name,
        materialSpec: item.material_spec,
        batchNo: item.batch_no || '',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unit_price,
        warehouseLocation: item.warehouse_location,
        produceDate: item.produce_date,
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
    filters?: { keyword?: string; startDate?: string; endDate?: string }
  ): Promise<PaginatedResult<InboundOrder>> {
    let sql = `SELECT o.id, o.order_no, o.inbound_date, o.supplier_name, o.supplier_id,
               o.po_id, o.po_no, o.warehouse_id, o.order_type, o.total_quantity,
               o.total_amount, o.status, o.remark, o.create_time, o.update_time
               FROM inv_inbound_order o WHERE o.deleted = 0`;
    let countSql = `SELECT COUNT(*) as total FROM inv_inbound_order o WHERE o.deleted = 0`;
    const params: any[] = [];

    if (filters?.keyword) {
      const condition = ` AND (o.order_no LIKE ? OR o.supplier_name LIKE ?)`;
      sql += condition;
      countSql += condition;
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    if (status) {
      const dbStatus = DOMAIN_TO_DB_STATUS[status] || status;
      sql += ` AND o.status = ?`;
      countSql += ` AND o.status = ?`;
      params.push(dbStatus);
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

    const result = await queryPaginated(sql, countSql, params, pagination);

    if (result.data.length > 0) {
      const orderIds = result.data.map((o: any) => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const items = await query(
        `SELECT ${ITEM_COLUMNS} FROM inv_inbound_item WHERE order_id IN (${placeholders})`,
        orderIds
      );

      const itemsMap = new Map<number, any[]>();
      for (const item of items as any[]) {
        if (!itemsMap.has(item.order_id)) {
          itemsMap.set(item.order_id, []);
        }
        itemsMap.get(item.order_id)!.push(item);
      }

      for (const order of result.data as any[]) {
        order.items = itemsMap.get(order.id) || [];
      }
    }

    return {
      data: result.data.map((o: any) =>
        InboundOrder.reconstitute({
          id: o.id,
          orderNo: o.order_no,
          status: (DB_TO_DOMAIN_STATUS[o.status] || o.status) as any,
          warehouseId: o.warehouse_id,
          supplierName: o.supplier_name || '',
          supplierId: o.supplier_id,
          poId: o.po_id,
          poNo: o.po_no,
          orderType: o.order_type,
          inboundDate: o.inbound_date,
          remark: o.remark,
          items: (o.items || []).map((item: any) => ({
            id: item.id,
            orderId: item.order_id,
            materialId: item.material_id,
            materialName: item.material_name,
            materialSpec: item.material_spec,
            batchNo: item.batch_no || '',
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unit_price,
            warehouseLocation: item.warehouse_location,
            produceDate: item.produce_date,
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
    financePosted: boolean
  ): Promise<void> {
    try {
      await execute('UPDATE inv_inbound_order SET qc_status = ? WHERE id = ?', [
        inspectionStatus === 3 ? 'pass' : 'pending',
        id,
      ]);
    } catch {}
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE inv_inbound_order SET deleted = 1, update_time = NOW() WHERE id = ?', [
      id,
    ]);
  }
}
