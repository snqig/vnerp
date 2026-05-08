import { IInboundOrderRepository, Pagination, PaginatedResult } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { InboundOrder, InboundOrderProps } from '@/domain/warehouse/aggregates/InboundOrder';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

export class MysqlInboundOrderRepository implements IInboundOrderRepository {
  async findById(id: number): Promise<InboundOrder | null> {
    const orders = await query<any>(
      'SELECT * FROM inv_inbound_order WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const items = await query<any>(
      `SELECT id, order_id, material_id, material_code, material_name, material_spec,
              batch_no, quantity, unit, unit_price, total_price, warehouse_location, produce_date
       FROM inv_inbound_item WHERE order_id = ?`,
      [id]
    );

    const props: InboundOrderProps = {
      id: order.id,
      orderNo: order.order_no,
      status: order.status,
      warehouseId: order.warehouse_id,
      supplierName: order.supplier_name || '',
      orderType: order.order_type,
      inboundDate: order.inbound_date,
      remark: order.remark,
      items: items.map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        materialId: item.material_id,
        materialCode: item.material_code,
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
      inspectionStatus: order.inspection_status,
      financePosted: order.finance_posted,
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
    let sql = `SELECT o.id, o.order_no, o.inbound_date, o.supplier_name, o.warehouse_id,
               o.order_type, o.total_quantity, o.total_amount, o.status, o.remark,
               o.create_time, o.update_time
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
      sql += ` AND o.status = ?`;
      countSql += ` AND o.status = ?`;
      params.push(status);
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
        `SELECT id, order_id, material_id, material_code, material_name, material_spec,
                batch_no, quantity, unit, unit_price, total_price, warehouse_location, produce_date
         FROM inv_inbound_item WHERE order_id IN (${placeholders})`,
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
      data: result.data.map((o: any) => InboundOrder.reconstitute({
        id: o.id,
        orderNo: o.order_no,
        status: o.status,
        warehouseId: o.warehouse_id,
        supplierName: o.supplier_name || '',
        orderType: o.order_type,
        inboundDate: o.inbound_date,
        remark: o.remark,
        items: (o.items || []).map((item: any) => ({
          id: item.id,
          orderId: item.order_id,
          materialId: item.material_id,
          materialCode: item.material_code,
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
      })),
      pagination: result.pagination,
    };
  }

  async save(order: InboundOrder): Promise<{ id: number; orderNo: string }> {
    const orderNo = await generateDocumentNo('inbound');
    const items = order.items;

    return await transaction(async (conn) => {
      const [orderResult]: any = await conn.execute(
        `INSERT INTO inv_inbound_order
         (order_no, order_type, warehouse_id, supplier_name, total_amount, total_quantity, status, inbound_date, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderNo, order.orderType, order.warehouseId, order.supplierName,
          order.totalAmount.amount, order.totalQuantity, order.status.value,
          order.inboundDate, order.remark,
        ]
      );

      const orderId = orderResult.insertId;

      for (const item of items) {
        await conn.execute(
          `INSERT INTO inv_inbound_item
           (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price, warehouse_location, produce_date, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            orderId, item.materialId, item.materialName, item.materialSpec,
            item.batchNo, item.quantity, item.unit, item.unitPrice,
            item.totalPrice, item.warehouseLocation, item.produceDate,
          ]
        );
      }

      return { id: orderId, orderNo };
    });
  }

  async updateStatus(id: number, status: string, currentStatus: string): Promise<boolean> {
    const [result]: any = await execute(
      'UPDATE inv_inbound_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
      [status, id, currentStatus]
    );
    return result.affectedRows > 0;
  }

  async updateInspectionAndFinance(id: number, inspectionStatus: number, financePosted: boolean): Promise<void> {
    await execute(
      'UPDATE inv_inbound_order SET inspection_status = ?, finance_posted = ? WHERE id = ?',
      [inspectionStatus, financePosted ? 1 : 0, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute(
      'UPDATE inv_inbound_order SET deleted = 1, update_time = NOW() WHERE id = ?',
      [id]
    );
  }
}
