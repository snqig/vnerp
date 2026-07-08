import mysql from 'mysql2/promise';
import { IDeliveryRepository } from '@/domain/sales/repositories/IDeliveryRepository';
import { Delivery, DeliveryProps } from '@/domain/sales/aggregates/Delivery';
import { DeliveryLineProps } from '@/domain/sales/entities/DeliveryLine';
import { DeliveryStatusValue } from '@/domain/sales/value-objects/DeliveryStatus';
import { query, execute, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

/** sal_delivery 表行类型 */
interface SalDeliveryRow {
  id: number;
  delivery_no: string;
  status: number;
  order_id: number | null;
  order_no: string | null;
  customer_id: number;
  customer_name: string | null;
  warehouse_id: number;
  delivery_date: string | null;
  logistics_company: string | null;
  tracking_no: string | null;
  total_amount: number | string | null;
  remark: string | null;
  create_by: number | null;
  ship_by: number | null;
  ship_time: string | null;
  sign_by: number | null;
  sign_time: string | null;
  create_time: string | null;
  update_time: string | null;
  deleted: number;
}

/** sal_delivery_detail 表行类型 */
interface SalDeliveryDetailRow {
  id: number;
  delivery_id: number;
  line_no: number;
  order_detail_id: number | null;
  material_id: number;
  material_code: string | null;
  material_name: string | null;
  material_spec: string | null;
  unit: string | null;
  quantity: number | string;
  unit_price: number | string;
  amount: number | string;
  batch_no: string | null;
  remark: string | null;
  deleted: number;
}

const MAIN_COLUMNS = `id, delivery_no, status, order_id, order_no, customer_id, customer_name,
                      warehouse_id, delivery_date, logistics_company, tracking_no,
                      total_amount, remark, create_by, ship_by, ship_time, sign_by, sign_time,
                      create_time, update_time`;

const DETAIL_COLUMNS = `id, delivery_id, line_no, order_detail_id, material_id, material_code,
                        material_name, material_spec, unit, quantity, unit_price, amount,
                        batch_no, remark`;

export class MysqlDeliveryRepository implements IDeliveryRepository {
  async findById(id: number): Promise<Delivery | null> {
    const rows = await query<SalDeliveryRow>(
      `SELECT ${MAIN_COLUMNS} FROM sal_delivery WHERE id = ? AND deleted = 0`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const lines = await this.findLines(rows[0].id);
    return this.mapToAggregate(rows[0], lines);
  }

  async findByDeliveryNo(deliveryNo: string): Promise<Delivery | null> {
    const rows = await query<SalDeliveryRow>(
      `SELECT ${MAIN_COLUMNS} FROM sal_delivery WHERE delivery_no = ? AND deleted = 0`,
      [deliveryNo]
    );
    if (!rows || rows.length === 0) return null;
    const lines = await this.findLines(rows[0].id);
    return this.mapToAggregate(rows[0], lines);
  }

  async findByOrderId(orderId: number): Promise<Delivery[]> {
    const rows = await query<SalDeliveryRow>(
      `SELECT ${MAIN_COLUMNS} FROM sal_delivery WHERE order_id = ? AND deleted = 0 ORDER BY create_time DESC`,
      [orderId]
    );
    return Promise.all(rows.map((r) => this.findLines(r.id).then((l) => this.mapToAggregate(r, l))));
  }

  async findByCustomerId(customerId: number): Promise<Delivery[]> {
    const rows = await query<SalDeliveryRow>(
      `SELECT ${MAIN_COLUMNS} FROM sal_delivery WHERE customer_id = ? AND deleted = 0 ORDER BY create_time DESC`,
      [customerId]
    );
    return Promise.all(rows.map((r) => this.findLines(r.id).then((l) => this.mapToAggregate(r, l))));
  }

  async findByStatus(status: number): Promise<Delivery[]> {
    const rows = await query<SalDeliveryRow>(
      `SELECT ${MAIN_COLUMNS} FROM sal_delivery WHERE status = ? AND deleted = 0 ORDER BY create_time DESC`,
      [status]
    );
    return Promise.all(rows.map((r) => this.findLines(r.id).then((l) => this.mapToAggregate(r, l))));
  }

  async save(delivery: Delivery): Promise<number> {
    const deliveryNo = delivery.deliveryNo || (await generateDocumentNo('delivery'));

    return transaction(async (conn) => {
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO sal_delivery
         (delivery_no, status, order_id, order_no, customer_id, customer_name,
          warehouse_id, delivery_date, logistics_company, tracking_no,
          total_amount, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          deliveryNo,
          delivery.status.value,
          delivery.orderId,
          delivery.orderNo || null,
          delivery.customerId,
          delivery.customerName || null,
          delivery.warehouseId,
          delivery.deliveryDate || null,
          delivery.logisticsCompany || null,
          delivery.trackingNo || null,
          delivery.totalAmount,
          delivery.remark || null,
          delivery.createBy ?? null,
        ]
      );

      const newId = result.insertId;

      for (const line of delivery.lines) {
        await conn.execute(
          `INSERT INTO sal_delivery_detail
           (delivery_id, line_no, order_detail_id, material_id, material_code,
            material_name, material_spec, unit, quantity, unit_price, amount,
            batch_no, remark, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            newId,
            line.lineNo,
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

  async updateStatus(
    id: number,
    status: number,
    logisticsCompany?: string,
    trackingNo?: string
  ): Promise<void> {
    if (logisticsCompany !== undefined || trackingNo !== undefined) {
      await execute(
        `UPDATE sal_delivery
         SET status = ?, logistics_company = COALESCE(?, logistics_company),
             tracking_no = COALESCE(?, tracking_no), update_time = NOW()
         WHERE id = ?`,
        [status, logisticsCompany ?? null, trackingNo ?? null, id]
      );
    } else {
      await execute(
        `UPDATE sal_delivery SET status = ?, update_time = NOW() WHERE id = ?`,
        [status, id]
      );
    }
  }

  async updateShipment(
    id: number,
    status: number,
    shipBy: number,
    shipTime: string,
    logisticsCompany?: string,
    trackingNo?: string
  ): Promise<void> {
    await execute(
      `UPDATE sal_delivery
       SET status = ?, ship_by = ?, ship_time = ?,
           logistics_company = COALESCE(?, logistics_company),
           tracking_no = COALESCE(?, tracking_no), update_time = NOW()
       WHERE id = ?`,
      [status, shipBy, shipTime, logisticsCompany ?? null, trackingNo ?? null, id]
    );
  }

  async updateSign(id: number, status: number, signBy: number | null, signTime: string): Promise<void> {
    await execute(
      `UPDATE sal_delivery
       SET status = ?, sign_by = ?, sign_time = ?, update_time = NOW()
       WHERE id = ?`,
      [status, signBy, signTime, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute(
      `UPDATE sal_delivery SET deleted = 1, update_time = NOW() WHERE id = ?`,
      [id]
    );
  }

  private async findLines(deliveryId: number): Promise<SalDeliveryDetailRow[]> {
    return query<SalDeliveryDetailRow>(
      `SELECT ${DETAIL_COLUMNS} FROM sal_delivery_detail WHERE delivery_id = ? AND deleted = 0 ORDER BY line_no`,
      [deliveryId]
    );
  }

  private mapToAggregate(row: SalDeliveryRow, lines: SalDeliveryDetailRow[]): Delivery {
    const lineProps: DeliveryLineProps[] = lines.map((l) => ({
      id: l.id,
      deliveryId: l.delivery_id,
      lineNo: l.line_no,
      orderDetailId: l.order_detail_id ?? undefined,
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

    const props: DeliveryProps = {
      id: row.id,
      deliveryNo: row.delivery_no,
      status: row.status as DeliveryStatusValue,
      orderId: row.order_id ?? 0,
      orderNo: row.order_no || '',
      customerId: row.customer_id,
      customerName: row.customer_name || '',
      warehouseId: row.warehouse_id,
      deliveryDate: row.delivery_date ? new Date(row.delivery_date).toISOString().slice(0, 10) : '',
      logisticsCompany: row.logistics_company || '',
      trackingNo: row.tracking_no || '',
      totalAmount: Number(row.total_amount || 0),
      lines: lineProps,
      remark: row.remark || '',
      createBy: row.create_by ?? undefined,
      shipBy: row.ship_by ?? undefined,
      shipTime: row.ship_time ? new Date(row.ship_time).toISOString().slice(0, 19).replace('T', ' ') : undefined,
      signBy: row.sign_by ?? undefined,
      signTime: row.sign_time ? new Date(row.sign_time).toISOString().slice(0, 19).replace('T', ' ') : undefined,
      createTime: row.create_time ?? undefined,
      updateTime: row.update_time ?? undefined,
    };
    return Delivery.reconstitute(props);
  }
}
