import { IReturnOrderRepository } from '@/domain/sales/repositories/IReturnOrderRepository';
import { ReturnOrder, ReturnOrderProps } from '@/domain/sales/aggregates/ReturnOrder';
import { ReturnOrderLineProps } from '@/domain/sales/entities/ReturnOrderLine';
import { query, execute, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

const MAIN_COLUMNS = `id, return_no, status, order_id, order_no, customer_id, customer_name,
                      warehouse_id, delivery_id, delivery_no, reason, return_date, total_amount,
                      approve_by, approve_time, complete_by, complete_time,
                      inbound_order_id, inbound_order_no, receivable_id, receivable_no,
                      remark, create_by, create_time, update_time`;

const DETAIL_COLUMNS = `id, return_id, line_no, delivery_detail_id, order_detail_id,
                        material_id, material_code, material_name, material_spec,
                        unit, quantity, unit_price, amount, batch_no, remark`;

export class MysqlReturnOrderRepository implements IReturnOrderRepository {
  async findById(id: number): Promise<ReturnOrder | null> {
    const rows = await query<any>(
      `SELECT ${MAIN_COLUMNS} FROM sal_return WHERE id = ? AND deleted = 0`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const lines = await this.findLines(rows[0].id);
    return this.mapToAggregate(rows[0], lines);
  }

  async findByReturnNo(returnNo: string): Promise<ReturnOrder | null> {
    const rows = await query<any>(
      `SELECT ${MAIN_COLUMNS} FROM sal_return WHERE return_no = ? AND deleted = 0`,
      [returnNo]
    );
    if (!rows || rows.length === 0) return null;
    const lines = await this.findLines(rows[0].id);
    return this.mapToAggregate(rows[0], lines);
  }

  async findByOrderId(orderId: number): Promise<ReturnOrder[]> {
    const rows = await query<any>(
      `SELECT ${MAIN_COLUMNS} FROM sal_return WHERE order_id = ? AND deleted = 0 ORDER BY create_time DESC`,
      [orderId]
    );
    return Promise.all(rows.map((r) => this.findLines(r.id).then((l) => this.mapToAggregate(r, l))));
  }

  async findByCustomerId(customerId: number): Promise<ReturnOrder[]> {
    const rows = await query<any>(
      `SELECT ${MAIN_COLUMNS} FROM sal_return WHERE customer_id = ? AND deleted = 0 ORDER BY create_time DESC`,
      [customerId]
    );
    return Promise.all(rows.map((r) => this.findLines(r.id).then((l) => this.mapToAggregate(r, l))));
  }

  async findByStatus(status: number): Promise<ReturnOrder[]> {
    const rows = await query<any>(
      `SELECT ${MAIN_COLUMNS} FROM sal_return WHERE status = ? AND deleted = 0 ORDER BY create_time DESC`,
      [status]
    );
    return Promise.all(rows.map((r) => this.findLines(r.id).then((l) => this.mapToAggregate(r, l))));
  }

  async save(returnOrder: ReturnOrder): Promise<number> {
    const returnNo = returnOrder.returnNo || (await generateDocumentNo('return_order'));

    return transaction(async (conn) => {
      const [result]: any = await conn.execute(
        `INSERT INTO sal_return
         (return_no, status, order_id, order_no, customer_id, customer_name,
          warehouse_id, delivery_id, delivery_no, reason, return_date, total_amount,
          remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          returnNo,
          returnOrder.status.value,
          returnOrder.orderId,
          returnOrder.orderNo || null,
          returnOrder.customerId,
          returnOrder.customerName || null,
          returnOrder.warehouseId,
          returnOrder.deliveryId ?? null,
          returnOrder.deliveryNo || null,
          returnOrder.reason,
          returnOrder.returnDate,
          returnOrder.totalAmount,
          returnOrder.remark || null,
          returnOrder.createBy ?? null,
        ]
      );

      const newId = result.insertId;

      for (const line of returnOrder.lines) {
        await conn.execute(
          `INSERT INTO sal_return_detail
           (return_id, line_no, delivery_detail_id, order_detail_id, material_id,
            material_code, material_name, material_spec, unit, quantity, unit_price,
            amount, batch_no, remark, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            newId,
            line.lineNo,
            line.deliveryDetailId ?? null,
            line.orderDetailId ?? null,
            line.materialId,
            line.materialCode || null,
            line.materialName || null,
            line.materialSpec || null,
            line.unit || null,
            line.quantity,
            line.unitPrice,
            line.amount,
            line.batchNo || null,
            line.remark || null,
          ]
        );
      }

      return newId;
    });
  }

  async updateStatus(id: number, status: number): Promise<void> {
    await execute(
      `UPDATE sal_return SET status = ?, update_time = NOW() WHERE id = ?`,
      [status, id]
    );
  }

  async updateApproval(id: number, status: number, approveBy: number, approveTime: string): Promise<void> {
    await execute(
      `UPDATE sal_return
       SET status = ?, approve_by = ?, approve_time = ?, update_time = NOW()
       WHERE id = ?`,
      [status, approveBy, approveTime, id]
    );
  }

  async updateCompletion(
    id: number,
    status: number,
    completeBy: number,
    completeTime: string,
    inboundOrderId: number,
    inboundOrderNo: string,
    receivableId: number,
    receivableNo: string
  ): Promise<void> {
    await execute(
      `UPDATE sal_return
       SET status = ?, complete_by = ?, complete_time = ?,
           inbound_order_id = ?, inbound_order_no = ?,
           receivable_id = ?, receivable_no = ?, update_time = NOW()
       WHERE id = ?`,
      [status, completeBy, completeTime, inboundOrderId, inboundOrderNo, receivableId, receivableNo, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute(
      `UPDATE sal_return SET deleted = 1, update_time = NOW() WHERE id = ?`,
      [id]
    );
  }

  private async findLines(returnId: number): Promise<any[]> {
    return query<any>(
      `SELECT ${DETAIL_COLUMNS} FROM sal_return_detail WHERE return_id = ? AND deleted = 0 ORDER BY line_no`,
      [returnId]
    );
  }

  private mapToAggregate(row: any, lines: any[]): ReturnOrder {
    const lineProps: ReturnOrderLineProps[] = lines.map((l) => ({
      id: l.id,
      returnId: l.return_id,
      lineNo: l.line_no,
      deliveryDetailId: l.delivery_detail_id,
      orderDetailId: l.order_detail_id,
      materialId: l.material_id,
      materialCode: l.material_code || '',
      materialName: l.material_name || '',
      materialSpec: l.material_spec || '',
      unit: l.unit || '件',
      quantity: Number(l.quantity),
      unitPrice: Number(l.unit_price || 0),
      amount: Number(l.amount || 0),
      batchNo: l.batch_no || '',
      remark: l.remark || '',
    }));

    const props: ReturnOrderProps = {
      id: row.id,
      returnNo: row.return_no,
      status: row.status,
      orderId: row.order_id,
      orderNo: row.order_no || '',
      customerId: row.customer_id,
      customerName: row.customer_name || '',
      warehouseId: row.warehouse_id,
      deliveryId: row.delivery_id,
      deliveryNo: row.delivery_no || '',
      reason: row.reason || '',
      returnDate: row.return_date ? new Date(row.return_date).toISOString().slice(0, 10) : '',
      totalAmount: Number(row.total_amount || 0),
      lines: lineProps,
      approveBy: row.approve_by,
      approveTime: row.approve_time ? new Date(row.approve_time).toISOString().slice(0, 19).replace('T', ' ') : undefined,
      completeBy: row.complete_by,
      completeTime: row.complete_time ? new Date(row.complete_time).toISOString().slice(0, 19).replace('T', ' ') : undefined,
      inboundOrderId: row.inbound_order_id,
      inboundOrderNo: row.inbound_order_no || undefined,
      receivableId: row.receivable_id,
      receivableNo: row.receivable_no || undefined,
      remark: row.remark || '',
      createBy: row.create_by,
      createTime: row.create_time,
      updateTime: row.update_time,
    };
    return ReturnOrder.reconstitute(props);
  }
}
