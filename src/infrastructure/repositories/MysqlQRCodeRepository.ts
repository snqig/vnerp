import { query, execute, transaction } from '@/lib/db';
import type { SqlValue } from '@/lib/db';
import { QRCode, type QRCodeProps } from '@/domain/trace/QRCode';
import type { IQRCodeRepository, TraceTimelineItem } from '@/domain/trace/repositories/IQRCodeRepository';

interface Row {
  [key: string]: SqlValue;
}

function toQRCode(row: Row): QRCode {
  const props: QRCodeProps = {
    id: Number(row.id),
    qrCode: String(row.qr_code),
    qrType: String(row.qr_type),
    parentQrCode: row.parent_qr_code != null ? String(row.parent_qr_code) : null,
    splitFlag: Number(row.split_flag ?? 0),
    splitIndex: Number(row.split_index ?? 0),
    batchNo: row.batch_no != null ? String(row.batch_no) : null,
    materialId: row.material_id != null ? Number(row.material_id) : null,
    materialCode: row.material_code != null ? String(row.material_code) : null,
    materialName: row.material_name != null ? String(row.material_name) : null,
    specification: row.specification != null ? String(row.specification) : null,
    quantity: Number(row.quantity ?? 0),
    unit: row.unit != null ? String(row.unit) : null,
    warehouseId: row.warehouse_id != null ? Number(row.warehouse_id) : null,
    warehouseName: row.warehouse_name != null ? String(row.warehouse_name) : null,
    refId: row.ref_id != null ? Number(row.ref_id) : null,
    refNo: row.ref_no != null ? String(row.ref_no) : null,
    workOrderId: row.work_order_id != null ? Number(row.work_order_id) : null,
    workOrderNo: row.work_order_no != null ? String(row.work_order_no) : null,
    supplierId: row.supplier_id != null ? Number(row.supplier_id) : null,
    supplierName: row.supplier_name != null ? String(row.supplier_name) : null,
    customerId: row.customer_id != null ? Number(row.customer_id) : null,
    customerName: row.customer_name != null ? String(row.customer_name) : null,
    productionDate: row.production_date != null ? String(row.production_date) : null,
    expiryDate: row.expiry_date != null ? String(row.expiry_date) : null,
    status: Number(row.status ?? 1),
    extraData: row.extra_data != null ? (typeof row.extra_data === 'string' ? JSON.parse(row.extra_data as string) : row.extra_data as Record<string, unknown>) : null,
    remark: row.remark != null ? String(row.remark) : null,
  };
  return QRCode.reconstitute(props);
}

export class MysqlQRCodeRepository implements IQRCodeRepository {
  async findByContent(qrCode: string): Promise<QRCode | null> {
    const rows = await query<Row>(
      'SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0 LIMIT 1',
      [qrCode]
    );
    return rows.length > 0 ? toQRCode(rows[0]) : null;
  }

  async findById(id: number): Promise<QRCode | null> {
    const rows = await query<Row>(
      'SELECT * FROM qrcode_record WHERE id = ? AND deleted = 0 LIMIT 1',
      [id]
    );
    return rows.length > 0 ? toQRCode(rows[0]) : null;
  }

  async findByParentQrCode(parentQrCode: string): Promise<QRCode[]> {
    const rows = await query<Row>(
      'SELECT * FROM qrcode_record WHERE parent_qr_code = ? AND deleted = 0 ORDER BY split_index ASC',
      [parentQrCode]
    );
    return rows.map(toQRCode);
  }

  async findByBatchNo(batchNo: string): Promise<QRCode[]> {
    const rows = await query<Row>(
      'SELECT * FROM qrcode_record WHERE batch_no = ? AND deleted = 0 ORDER BY id ASC',
      [batchNo]
    );
    return rows.map(toQRCode);
  }

  async create(qrCode: QRCode): Promise<number> {
    const result = await execute(
      `INSERT INTO qrcode_record (qr_code, qr_type, parent_qr_code, split_flag, split_index, batch_no, material_id, material_code, material_name, specification, quantity, unit, warehouse_id, warehouse_name, ref_id, ref_no, work_order_id, work_order_no, supplier_id, supplier_name, customer_id, customer_name, production_date, expiry_date, extra_data, remark, status, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        qrCode.qrCode,
        qrCode.qrType,
        qrCode.parentQrCode,
        qrCode.splitFlag,
        qrCode.splitIndex,
        qrCode.batchNo,
        qrCode.materialId,
        qrCode.materialCode,
        qrCode.materialName,
        qrCode.specification,
        qrCode.quantity,
        qrCode.unit,
        qrCode.warehouseId,
        qrCode.warehouseName,
        qrCode.refId,
        qrCode.refNo,
        qrCode.workOrderId,
        qrCode.workOrderNo,
        qrCode.supplierId,
        qrCode.supplierName,
        qrCode.customerId,
        qrCode.customerName,
        qrCode.productionDate,
        qrCode.expiryDate,
        qrCode.extraData ? JSON.stringify(qrCode.extraData) : null,
        qrCode.remark,
        qrCode.status,
      ]
    );
    return Number(result.insertId);
  }

  async createBatch(qrCodes: QRCode[]): Promise<number[]> {
    return await transaction(async (conn) => {
      const ids: number[] = [];
      for (const qrCode of qrCodes) {
        const [result] = (await conn.execute(
          `INSERT INTO qrcode_record (qr_code, qr_type, parent_qr_code, split_flag, split_index, batch_no, material_id, material_code, material_name, specification, quantity, unit, warehouse_id, warehouse_name, ref_id, ref_no, work_order_id, work_order_no, supplier_id, supplier_name, customer_id, customer_name, production_date, expiry_date, extra_data, remark, status, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            qrCode.qrCode,
            qrCode.qrType,
            qrCode.parentQrCode,
            qrCode.splitFlag,
            qrCode.splitIndex,
            qrCode.batchNo,
            qrCode.materialId,
            qrCode.materialCode,
            qrCode.materialName,
            qrCode.specification,
            qrCode.quantity,
            qrCode.unit,
            qrCode.warehouseId,
            qrCode.warehouseName,
            qrCode.refId,
            qrCode.refNo,
            qrCode.workOrderId,
            qrCode.workOrderNo,
            qrCode.supplierId,
            qrCode.supplierName,
            qrCode.customerId,
            qrCode.customerName,
            qrCode.productionDate,
            qrCode.expiryDate,
            qrCode.extraData ? JSON.stringify(qrCode.extraData) : null,
            qrCode.remark,
            qrCode.status,
          ]
        )) as unknown as [{ insertId: number }];
        ids.push(Number(result.insertId));
      }
      return ids;
    });
  }

  async updateQuantity(id: number, quantity: number): Promise<void> {
    await execute(
      'UPDATE qrcode_record SET quantity = ?, update_time = NOW() WHERE id = ? AND deleted = 0',
      [quantity, id]
    );
  }

  async queryTraceTimeline(qrCode: string): Promise<TraceTimelineItem[]> {
    const rows = await query<Row>(
      `SELECT
        qr.create_time AS time,
        qr.qr_type AS eventType,
        CASE qr.qr_type
          WHEN 'material' THEN '入库登记'
          WHEN 'split' THEN '分切拆码'
          WHEN 'product' THEN '完工入库'
          WHEN 'shipment' THEN '出库登记'
          ELSE '其他'
        END AS eventName,
        COALESCE(qr.ref_no, '') AS docNo,
        CAST(qr.quantity AS CHAR) AS quantity,
        COALESCE(qr.batch_no, '') AS batchNo,
        COALESCE(qr.material_name, '') AS materialName
      FROM qrcode_record qr
      WHERE (qr.qr_code = ? OR qr.parent_qr_code = ?)
      AND qr.deleted = 0
      ORDER BY qr.create_time ASC`,
      [qrCode, qrCode]
    );
    return rows.map((r) => ({
      time: String(r.time ?? ''),
      eventType: String(r.eventType),
      eventName: String(r.eventName),
      operator: String(r.operator ?? ''),
      docNo: String(r.docNo ?? ''),
      quantity: String(r.quantity ?? ''),
      process: String(r.process ?? ''),
      batchNo: String(r.batchNo ?? ''),
      materialName: String(r.materialName ?? ''),
    }));
  }
}
