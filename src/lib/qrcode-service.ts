import { t } from '@/lib/server-translate';
import { getTranslations } from 'next-intl/server';

import mysql from 'mysql2/promise';
import QRCode from 'qrcode';
import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export interface QRCodeData {
  type: 'material' | 'product' | 'batch' | 'workorder' | 'inbound' | 'outbound';
  id: number;
  code: string;
  materialId?: number;
  materialCode?: string;
  batchNo?: string;
  workOrderNo?: string;
  warehouseId?: number;
  productionDate?: string;
  expireDate?: string;
  traceUrl?: string;
  extraData?: Record<string, string | number>;
}

export interface QRCodeRecord {
  id: number;
  qr_code: string;
  qr_type: string;
  /** 真实列 ref_id（兼容别名 source_id，追溯链依赖） */
  ref_id: number;
  /** 真实列 ref_no（兼容别名 source_no） */
  ref_no: string;
  /** 兼容别名：SELECT q.ref_id AS source_id 喂给 getTraceHistory */
  source_id: number;
  source_no: string;
  material_id?: number;
  material_code?: string;
  material_name?: string;
  batch_no?: string;
  work_order_no?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  production_date?: string;
  expiry_date?: string;
  qr_image_url?: string;
  trace_url?: string;
  /** tinyint：1=有效 0=失效 9=已删 */
  status: number;
  create_time: string;
}

export interface TraceRecord {
  timestamp: string;
  event: string;
  eventType: string;
  sourceType: string;
  sourceId: number;
  sourceNo: string;
  operatorId?: number;
  operatorName?: string;
  warehouseId?: number;
  warehouseName?: string;
  quantity?: number;
  batchNo?: string;
  remark?: string;
}

export interface TraceResult {
  qrCode: string;
  materialCode: string;
  materialName: string;
  batchNo: string;
  productionDate?: string;
  expireDate?: string;
  currentWarehouse?: string;
  currentQuantity?: number;
  traceHistory: TraceRecord[];
  supplierInfo?: {
    name: string;
    contact?: string;
  };
  customerInfo?: {
    name: string;
    contact?: string;
  };
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';

export class QRCodeService {
  static generateTraceUrl(type: string, id: number, code: string): string {
    return `${BASE_URL}/api/qrcode/trace?code=${code}`;
  }

  static buildQRContent(data: QRCodeData): string {
    const content: Record<string, string | number> = {
      v: '1',
      t: data.type,
      id: data.id,
      c: data.code,
    };

    if (data.materialCode) content.mc = data.materialCode;
    if (data.batchNo) content.b = data.batchNo;
    if (data.workOrderNo) content.w = data.workOrderNo;
    if (data.productionDate) content.pd = data.productionDate;
    if (data.expireDate) content.ed = data.expireDate;

    return JSON.stringify(content);
  }

  static parseQRContent(content: string): QRCodeData | null {
    try {
      const data = JSON.parse(content);
      return {
        type: data.t,
        id: data.id,
        code: data.c,
        materialCode: data.mc,
        batchNo: data.b,
        workOrderNo: data.w,
        productionDate: data.pd,
        expireDate: data.ed,
      };
    } catch {
      return null;
    }
  }

  static async generateQRCodeImage(content: string): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(content, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
      return dataUrl;
    } catch (error) {
      secureLog('error', 'QR code generation failed', { error: (error as Error).message });
      throw new Error(`二维码生成失败: ${(error as Error).message}`);
    }
  }

  static async generateMaterialQRCode(
    materialId: number,
    materialCode: string,
    materialName: string,
    options?: {
      warehouseId?: number;
      productionDate?: string;
      expireDate?: string;
    }
  ): Promise<{ qrCode: string; qrImageUrl: string; qrId: number }> {
    const qrCode = `MAT${materialId}${Date.now()}`;

    return await transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, material_id, material_code, material_name, warehouse_id, production_date, expiry_date, trace_url, status, create_time)
         VALUES (?, 'material', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [
          qrCode,
          materialId,
          materialCode,
          materialId,
          materialCode,
          materialName,
          options?.warehouseId || null,
          options?.productionDate || null,
          options?.expireDate || null,
          this.generateTraceUrl('material', materialId, qrCode),
        ]
      );

      const qrId = (result as mysql.ResultSetHeader).insertId;
      const qrContent = this.buildQRContent({
        type: 'material',
        id: materialId,
        code: qrCode,
        materialCode,
      });
      const qrImageUrl = await this.generateQRCodeImage(qrContent);

      await conn.execute(`UPDATE qrcode_record SET qr_image_url = ? WHERE id = ?`, [
        qrImageUrl,
        qrId,
      ]);

      secureLog('info', 'Material QR code generated', { qrId, materialCode });

      return { qrCode, qrImageUrl, qrId };
    });
  }

  static async generateBatchQRCode(
    batchNo: string,
    materialId: number,
    materialCode: string,
    materialName: string,
    options?: {
      warehouseId?: number;
      productionDate?: string;
      expireDate?: string;
      quantity?: number;
    }
  ): Promise<{ qrCode: string; qrImageUrl: string; qrId: number }> {
    return await transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, material_id, material_code, material_name, batch_no, warehouse_id, production_date, expiry_date, trace_url, status, create_time)
         VALUES (?, 'batch', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [
          batchNo,
          materialId,
          materialCode,
          materialId,
          materialCode,
          materialName,
          batchNo,
          options?.warehouseId || null,
          options?.productionDate || null,
          options?.expireDate || null,
          this.generateTraceUrl('batch', materialId, batchNo),
        ]
      );

      const qrId = (result as mysql.ResultSetHeader).insertId;
      const qrContent = this.buildQRContent({
        type: 'batch',
        id: materialId,
        code: batchNo,
        materialCode,
        batchNo,
        productionDate: options?.productionDate,
        expireDate: options?.expireDate,
      });
      const qrImageUrl = await this.generateQRCodeImage(qrContent);

      await conn.execute(`UPDATE qrcode_record SET qr_image_url = ? WHERE id = ?`, [
        qrImageUrl,
        qrId,
      ]);

      secureLog('info', 'Batch QR code generated', { qrId, batchNo });

      return { qrCode: batchNo, qrImageUrl, qrId };
    });
  }

  static async generateWorkOrderQRCode(
    workOrderId: number,
    workOrderNo: string,
    _productName: string,
    _options?: {
      plannedQty?: number;
      plannedEndDate?: string;
    }
  ): Promise<{ qrCode: string; qrImageUrl: string; qrId: number }> {
    return await transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, work_order_no, trace_url, status, create_time)
         VALUES (?, 'workorder', ?, ?, ?, ?, 1, NOW())`,
        [
          workOrderNo,
          workOrderId,
          workOrderNo,
          workOrderNo,
          this.generateTraceUrl('workorder', workOrderId, workOrderNo),
        ]
      );

      const qrId = (result as mysql.ResultSetHeader).insertId;
      const qrContent = this.buildQRContent({
        type: 'workorder',
        id: workOrderId,
        code: workOrderNo,
        workOrderNo,
      });
      const qrImageUrl = await this.generateQRCodeImage(qrContent);

      await conn.execute(`UPDATE qrcode_record SET qr_image_url = ? WHERE id = ?`, [
        qrImageUrl,
        qrId,
      ]);

      secureLog('info', 'Work order QR code generated', { qrId, workOrderNo });

      return { qrCode: workOrderNo, qrImageUrl, qrId };
    });
  }

  static async getQRCodeInfo(qrCode: string): Promise<QRCodeRecord | null> {
    const rows = await query(
      `SELECT q.*, q.ref_id AS source_id, q.ref_no AS source_no, w.warehouse_name
       FROM qrcode_record q
       LEFT JOIN inv_warehouse w ON q.warehouse_id = w.id
       WHERE q.qr_code = ? AND q.deleted = 0`,
      [qrCode]
    );

    if (!rows || rows.length === 0) return null;
    return rows[0];
  }

  static async traceQRCode(qrCode: string): Promise<TraceResult | null> {
    const qrInfo = await this.getQRCodeInfo(qrCode);
    if (!qrInfo) return null;

    const history = await this.getTraceHistory(qrInfo.qr_type, qrInfo.source_id, qrInfo.batch_no);

    return {
      qrCode: qrInfo.qr_code,
      materialCode: qrInfo.material_code || '',
      materialName: qrInfo.material_name || '',
      batchNo: qrInfo.batch_no || '',
      productionDate: qrInfo.production_date,
      expireDate: qrInfo.expiry_date,
      currentWarehouse: qrInfo.warehouse_name,
      traceHistory: history,
    };
  }

  static async getTraceHistory(
    qrType: string,
    sourceId: number,
    batchNo?: string
  ): Promise<TraceRecord[]> {
    let sql = `
      SELECT
        h.create_time as timestamp,
        h.trans_type as event,
        'inventory_transaction' as eventType,
        'inventory' as sourceType,
        h.source_id,
        COALESCE(h.source_no, '') as source_no,
        h.operator_id as operatorId,
        h.operator_name as operatorName,
        h.warehouse_id as warehouseId,
        w.warehouse_name as warehouseName,
        ABS(h.quantity) as quantity,
        h.batch_no as batchNo,
        h.remark
      FROM inv_inventory_transaction h
      LEFT JOIN inv_warehouse w ON h.warehouse_id = w.id
      WHERE h.material_id = ?`;

    const params: (string | number)[] = [sourceId];

    if (batchNo) {
      sql += ` AND h.batch_no = ?`;
      params.push(batchNo);
    }

    sql += ` ORDER BY h.create_time ASC`;

    const rows = await query(sql, params);
    return (rows || []).map((r: Record<string, unknown>) => ({
      timestamp: String(r.timestamp ?? ''),
      event: this.getEventLabel(String(r.event ?? '')),
      eventType: String(r.eventType ?? ''),
      sourceType: String(r.sourceType ?? ''),
      sourceId: Number(r.sourceId ?? 0),
      sourceNo: String(r.sourceNo ?? ''),
      operatorId: r.operatorId != null ? Number(r.operatorId) : undefined,
      operatorName: r.operatorName != null ? String(r.operatorName) : undefined,
      warehouseId: r.warehouseId != null ? Number(r.warehouseId) : undefined,
      warehouseName: r.warehouseName != null ? String(r.warehouseName) : undefined,
      quantity: r.quantity != null ? Number(r.quantity) : undefined,
      batchNo: r.batchNo != null ? String(r.batchNo) : undefined,
      remark: r.remark != null ? String(r.remark) : undefined,
    }));
  }

  private static getEventLabel(transType: string): string {
  const ts = t;
    const labels: Record<string, string> = {
      in: ts('k_16y3uo9'),
      out: ts('k_dwwra2'),
      inbound: ts('k_16y3uo9'),
      outbound: ts('k_dwwra2'),
      transfer: ts('k_10lrhda'),
      adjust: ts('k_1ul01iq'),
      return: ts('k_1il6wq0'),
    };
    return labels[transType] || transType;
  }

  static async getBatchQRCodeList(materialId: number): Promise<QRCodeRecord[]> {
    const rows = await query(
      `SELECT q.*, q.ref_id AS source_id, q.ref_no AS source_no, w.warehouse_name
       FROM qrcode_record q
       LEFT JOIN inv_warehouse w ON q.warehouse_id = w.id
       WHERE q.material_id = ? AND q.qr_type = 'batch' AND q.deleted = 0
       ORDER BY q.create_time DESC`,
      [materialId]
    );
    return rows || [];
  }

  static async invalidateQRCode(qrCode: string, reason: string): Promise<void> {
    // qrcode_record.status 为 tinyint（1=有效 0=失效），且无 update_time 列（否则 1054）
    await execute(
      `UPDATE qrcode_record SET status = 0, remark = CONCAT(IFNULL(remark, ''), ' | ', ?) WHERE qr_code = ?`,
      [reason, qrCode]
    );
    secureLog('info', 'QR code invalidated', { qrCode, reason });
  }
}
