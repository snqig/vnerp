import { query, execute, transaction } from '@/lib/db';
import type { SqlValue } from '@/lib/db';
import { QRCode } from '@/domain/trace/QRCode';
import type { IQRCodeRepository, TraceTimelineItem } from '@/domain/trace/repositories/IQRCodeRepository';

interface Row {
  [key: string]: SqlValue;
}

function toQRCode(row: Row): QRCode {
  return QRCode.reconstitute({
    id: Number(row.id),
    qrContent: String(row.qr_content),
    parentQrId: row.parent_qr_id != null ? Number(row.parent_qr_id) : null,
    splitFlag: Number(row.split_flag ?? 0),
    splitIndex: Number(row.split_index ?? 0),
    sourceType: Number(row.source_type),
    batchNo: row.batch_no != null ? String(row.batch_no) : null,
    quantity: Number(row.quantity ?? 0),
    materialId: row.material_id != null ? Number(row.material_id) : null,
    materialName: row.material_name != null ? String(row.material_name) : null,
    status: Number(row.status ?? 1),
  });
}

export class MysqlQRCodeRepository implements IQRCodeRepository {
  async findByContent(qrContent: string): Promise<QRCode | null> {
    const rows = await query<Row>(
      'SELECT * FROM qrcode_record WHERE qr_content = ? AND deleted = 0 LIMIT 1',
      [qrContent]
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

  async findByParentId(parentId: number): Promise<QRCode[]> {
    const rows = await query<Row>(
      'SELECT * FROM qrcode_record WHERE parent_qr_id = ? AND deleted = 0 ORDER BY split_index ASC',
      [parentId]
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
      `INSERT INTO qrcode_record (qr_content, parent_qr_id, split_flag, split_index, source_type, batch_no, quantity, material_id, material_name, status, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        qrCode.qrContent,
        qrCode.parentQrId,
        qrCode.splitFlag,
        qrCode.splitIndex,
        qrCode.sourceType,
        qrCode.batchNo,
        qrCode.quantity,
        qrCode.materialId,
        qrCode.materialName,
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
          `INSERT INTO qrcode_record (qr_content, parent_qr_id, split_flag, split_index, source_type, batch_no, quantity, material_id, material_name, status, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            qrCode.qrContent,
            qrCode.parentQrId,
            qrCode.splitFlag,
            qrCode.splitIndex,
            qrCode.sourceType,
            qrCode.batchNo,
            qrCode.quantity,
            qrCode.materialId,
            qrCode.materialName,
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

  async queryTraceTimeline(qrContent: string): Promise<TraceTimelineItem[]> {
    const rows = await query<Row>(
      `SELECT
        qr.create_time AS time,
        CASE qr.source_type
          WHEN 1 THEN 'inbound'
          WHEN 2 THEN 'split'
          WHEN 3 THEN 'finished'
          WHEN 4 THEN 'outbound'
          ELSE 'other'
        END AS eventType,
        CASE qr.source_type
          WHEN 1 THEN '入库登记'
          WHEN 2 THEN '分切拆码'
          WHEN 3 THEN '完工入库'
          WHEN 4 THEN '出库登记'
          ELSE '其他'
        END AS eventName,
        '' AS operator,
        '' AS docNo,
        CAST(qr.quantity AS CHAR) AS quantity,
        '' AS process,
        COALESCE(qr.batch_no, '') AS batchNo,
        COALESCE(qr.material_name, '') AS materialName
      FROM qrcode_record qr
      WHERE (qr.qr_content = ? OR qr.id IN (
        SELECT parent_qr_id FROM qrcode_record WHERE qr_content = ? AND deleted = 0
      ))
      AND qr.deleted = 0
      ORDER BY qr.create_time ASC`,
      [qrContent, qrContent]
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
