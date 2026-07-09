import { query, transaction } from '@/lib/db';
import { randomUUID } from 'crypto';

export interface LabelGenerationResult {
  labelId: number;
  labelNo: string;
  qrCode: string;
  zplContent: string;
}

export interface BatchLabelResult {
  labels: LabelGenerationResult[];
  totalCount: number;
}

async function generateLabelNo(conn: any): Promise<string> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `LBL-${dateStr}`;

  const [rows]: any = await conn.query(
    `SELECT label_no FROM inv_material_label WHERE label_no LIKE ? AND deleted = 0`,
    [`${prefix}-%`]
  );

  let maxSeq = 0;
  for (const row of rows) {
    const parts = row.label_no.split('-');
    const seqPart = parts[parts.length - 1];
    const seq = parseInt(seqPart, 10);
    if (seq > maxSeq) {
      maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}-${nextSeq}`;
}

export async function generateInboundLabels(params: {
  inboundOrderId: number;
  inboundOrderNo: string;
  warehouseId: number;
  warehouseName: string;
  supplierName?: string;
  items: Array<{
    materialId: number;
    materialCode?: string;
    materialName: string;
    specification?: string;
    batchNo: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    produceDate?: string;
  }>;
}): Promise<BatchLabelResult> {
  return await transaction(async (conn) => {
    const labels: LabelGenerationResult[] = [];

    for (const item of params.items) {
      const labelNo = await generateLabelNo(conn);
      const qrUuid = randomUUID();

      await conn.execute(
        `INSERT INTO qrcode_record (
          qr_code, qr_type, ref_id, ref_no, batch_no,
          material_id, material_code, material_name, specification,
          quantity, unit, warehouse_id, warehouse_name,
          supplier_name, production_date, status, create_time, deleted
        ) VALUES (?, 'material', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), 0)`,
        [
          qrUuid,
          params.inboundOrderId,
          params.inboundOrderNo,
          item.batchNo,
          item.materialId,
          item.materialCode || '',
          item.materialName,
          item.specification || '',
          item.quantity,
          item.unit,
          params.warehouseId,
          params.warehouseName,
          params.supplierName || null,
          item.produceDate || null,
        ]
      );

      await conn.execute(
        `INSERT INTO inv_material_label (
          label_no, qr_code, purchase_order_no, supplier_name, receive_date,
          material_code, material_name, specification, unit, batch_no,
          quantity, warehouse_id, status, create_time, update_time, deleted
        ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW(), 0)`,
        [
          labelNo,
          qrUuid,
          params.inboundOrderNo,
          params.supplierName || null,
          item.materialCode || '',
          item.materialName,
          item.specification || '',
          item.unit,
          item.batchNo,
          item.quantity,
          params.warehouseId,
        ]
      );

      const [labelRow]: any = await conn.query(
        `SELECT id FROM inv_material_label WHERE label_no = ? AND deleted = 0`,
        [labelNo]
      );
      const labelId = labelRow.length > 0 ? labelRow[0].id : 0;

      const zplContent = generateZPLLabel({
        labelNo,
        qrCode: qrUuid,
        materialCode: item.materialCode || '',
        materialName: item.materialName,
        specification: item.specification,
        batchNo: item.batchNo,
        quantity: item.quantity,
        unit: item.unit,
        warehouseName: params.warehouseName,
        supplierName: params.supplierName,
      });

      labels.push({
        labelId,
        labelNo,
        qrCode: qrUuid,
        zplContent,
      });
    }

    return {
      labels,
      totalCount: labels.length,
    };
  });
}

export async function generateWorkOrderLabels(params: {
  workOrderId: number;
  workOrderNo: string;
  customerName?: string;
  productName: string;
  quantity: number;
  unit: string;
}): Promise<LabelGenerationResult> {
  return await transaction(async (conn) => {
    const labelNo = await generateLabelNo(conn);
    const qrUuid = randomUUID();

    await conn.execute(
      `INSERT INTO qrcode_record (
        qr_code, qr_type, ref_id, ref_no,
        material_name, quantity, unit,
        customer_name, work_order_id, work_order_no,
        status, create_time, deleted
      ) VALUES (?, 'work_order', ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), 0)`,
      [
        qrUuid,
        params.workOrderId,
        params.workOrderNo,
        params.productName,
        params.quantity,
        params.unit,
        params.customerName || null,
        params.workOrderId,
        params.workOrderNo,
      ]
    );

    await conn.execute(
      `INSERT INTO inv_material_label (
        label_no, qr_code, material_name, unit, batch_no,
        quantity, status, create_time, update_time, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW(), 0)`,
      [labelNo, qrUuid, params.productName, params.unit, params.workOrderNo, params.quantity]
    );

    const [labelRow]: any = await conn.query(
      `SELECT id FROM inv_material_label WHERE label_no = ? AND deleted = 0`,
      [labelNo]
    );
    const labelId = labelRow.length > 0 ? labelRow[0].id : 0;

    const zplContent = generateZPLLabel({
      labelNo,
      qrCode: qrUuid,
      materialCode: params.workOrderNo,
      materialName: params.productName,
      batchNo: params.workOrderNo,
      quantity: params.quantity,
      unit: params.unit,
    });

    return {
      labelId,
      labelNo,
      qrCode: qrUuid,
      zplContent,
    };
  });
}

export async function scanToConfirmOutbound(params: {
  qrCode: string;
  outboundOrderId: number;
  outboundOrderNo: string;
  operatorId?: number;
  operatorName?: string;
  deviceInfo?: string;
}): Promise<{ confirmed: boolean; materialInfo: any; message: string }> {
  return transaction(async (conn) => {
    const [qrRows]: any = await conn.execute(
      `SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0 FOR UPDATE`,
      [params.qrCode]
    );

    if (!qrRows || qrRows.length === 0) {
      return {
        confirmed: false,
        materialInfo: null,
        message: '二维码不存在',
      };
    }

    const qrRecord = qrRows[0];

    if (qrRecord.status !== 'active') {
      return {
        confirmed: false,
        materialInfo: qrRecord,
        message: `二维码状态异常: ${qrRecord.status}`,
      };
    }

    const [outboundItems]: any = await conn.execute(
      `SELECT material_id, material_code, material_name, quantity
       FROM inv_outbound_item
       WHERE order_id = ? AND deleted = 0`,
      [params.outboundOrderId]
    );

    const matchedItem = (outboundItems || []).find(
      (item: any) =>
        Number(item.material_id) === Number(qrRecord.material_id) ||
        item.material_code === qrRecord.material_code
    );

    if (!matchedItem) {
      return {
        confirmed: false,
        materialInfo: qrRecord,
        message: '该物料不属于当前出库单',
      };
    }

    await conn.execute(
      `UPDATE qrcode_record SET
        scan_count = scan_count + 1,
        last_scan_time = NOW()
      WHERE id = ?`,
      [qrRecord.id]
    );

    await conn.execute(
      `INSERT INTO qrcode_scan_log (
        qr_code, qr_type, ref_id, ref_no,
        scan_type, operator_id, operator_name, device_info,
        scan_time, create_time, deleted
      ) VALUES (?, ?, ?, ?, 'outbound_confirm', ?, ?, ?, NOW(), NOW(), 0)`,
      [
        params.qrCode,
        qrRecord.qr_type,
        params.outboundOrderId,
        params.outboundOrderNo,
        params.operatorId || null,
        params.operatorName || null,
        params.deviceInfo || null,
      ]
    );

    return {
      confirmed: true,
      materialInfo: {
        materialId: qrRecord.material_id,
        materialCode: qrRecord.material_code,
        materialName: qrRecord.material_name,
        specification: qrRecord.specification,
        batchNo: qrRecord.batch_no,
        quantity: qrRecord.quantity,
        unit: qrRecord.unit,
        warehouseId: qrRecord.warehouse_id,
        warehouseName: qrRecord.warehouse_name,
      },
      message: '扫码确认成功',
    };
  });
}

export function generateZPLLabel(params: {
  labelNo: string;
  qrCode: string;
  materialCode: string;
  materialName: string;
  specification?: string;
  batchNo: string;
  quantity: number;
  unit: string;
  warehouseName?: string;
  supplierName?: string;
  labelWidth?: number;
  labelHeight?: number;
}): string {
  const dpi = 203;
  const widthDots = Math.round(((params.labelWidth || 60) / 25.4) * dpi);
  const heightDots = Math.round(((params.labelHeight || 40) / 25.4) * dpi);

  const qrSize = 100;
  const qrX = 10;
  const qrY = 10;

  const textX = qrX + qrSize + 15;

  let zpl = '^XA';
  zpl += `^CI28`;
  zpl += `^PW${widthDots}`;
  zpl += `^LL${heightDots}`;
  zpl += `^BY2,2,50`;
  zpl += `^FO${qrX},${qrY}^BQN,2,4^FDQA,${params.qrCode}^FS`;

  let currentY = qrY;
  zpl += `^FO${textX},${currentY}^A0N,20,20^FH^FD${escapeZPLText(params.materialCode)}^FS`;
  currentY += 24;

  const nameLines = wrapText(params.materialName, 18);
  for (const line of nameLines) {
    zpl += `^FO${textX},${currentY}^A0N,18,18^FH^FD${escapeZPLText(line)}^FS`;
    currentY += 22;
  }

  if (params.specification) {
    zpl += `^FO${textX},${currentY}^A0N,16,16^FH^FD${escapeZPLText(params.specification)}^FS`;
    currentY += 20;
  }

  zpl += `^FO${textX},${currentY}^A0N,18,18^FH^FD${params.quantity}${params.unit}^FS`;
  currentY += 22;

  if (params.warehouseName) {
    zpl += `^FO${textX},${currentY}^A0N,16,16^FH^FD${escapeZPLText(params.warehouseName)}^FS`;
    currentY += 20;
  }

  zpl += `^FO10,${heightDots - 20}^A0N,14,14^FH^FD${escapeZPLText(params.labelNo)}^FS`;

  zpl += '^XZ';

  return zpl;
}

export function generateZPLBatchLabels(
  labels: Array<{
    labelNo: string;
    qrCode: string;
    materialCode: string;
    materialName: string;
    specification?: string;
    batchNo: string;
    quantity: number;
    unit: string;
    warehouseName?: string;
    supplierName?: string;
  }>
): string {
  return labels
    .map((label) =>
      generateZPLLabel({
        labelNo: label.labelNo,
        qrCode: label.qrCode,
        materialCode: label.materialCode,
        materialName: label.materialName,
        specification: label.specification,
        batchNo: label.batchNo,
        quantity: label.quantity,
        unit: label.unit,
        warehouseName: label.warehouseName,
        supplierName: label.supplierName,
      })
    )
    .join('\n');
}

export async function generateFIFOPriorityLabels(params: {
  warehouseId: number;
  materialId: number;
  warehouseName: string;
}): Promise<BatchLabelResult> {
  const batches: any = await query(
    `SELECT
      id, batch_no, material_id, material_code, material_name,
      specification, available_qty, unit, expire_date, inbound_date
    FROM inv_inventory_batch
    WHERE warehouse_id = ? AND material_id = ? AND available_qty > 0 AND deleted = 0 AND status = 'normal'
      AND expire_date IS NOT NULL AND DATEDIFF(expire_date, CURDATE()) <= 60
    ORDER BY expire_date ASC, inbound_date ASC`,
    [params.warehouseId, params.materialId]
  );

  if (!batches || batches.length === 0) {
    return { labels: [], totalCount: 0 };
  }

  return await transaction(async (conn) => {
    const labels: LabelGenerationResult[] = [];

    for (const batch of batches) {
      const labelNo = await generateLabelNo(conn);
      const qrUuid = randomUUID();

      await conn.execute(
        `INSERT INTO qrcode_record (
          qr_code, qr_type, ref_id, ref_no, batch_no,
          material_id, material_code, material_name, specification,
          quantity, unit, warehouse_id, warehouse_name,
          expiry_date, status, create_time, deleted
        ) VALUES (?, 'fifo_priority', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), 0)`,
        [
          qrUuid,
          batch.id,
          batch.batch_no,
          batch.batch_no,
          batch.material_id,
          batch.material_code,
          batch.material_name,
          batch.specification || '',
          batch.available_qty,
          batch.unit,
          params.warehouseId,
          params.warehouseName,
          batch.expire_date,
        ]
      );

      await conn.execute(
        `INSERT INTO inv_material_label (
          label_no, qr_code, material_code, material_name, specification,
          unit, batch_no, quantity, warehouse_id,
          status, create_time, update_time, deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW(), 0)`,
        [
          labelNo,
          qrUuid,
          batch.material_code,
          `${batch.material_name}[优先消耗]`,
          batch.specification || '',
          batch.unit,
          batch.batch_no,
          batch.available_qty,
          params.warehouseId,
        ]
      );

      const [labelRow]: any = await conn.query(
        `SELECT id FROM inv_material_label WHERE label_no = ? AND deleted = 0`,
        [labelNo]
      );
      const labelId = labelRow.length > 0 ? labelRow[0].id : 0;

      const zplContent = generateZPLLabel({
        labelNo,
        qrCode: qrUuid,
        materialCode: batch.material_code,
        materialName: `${batch.material_name}[优先消耗]`,
        specification: batch.specification,
        batchNo: batch.batch_no,
        quantity: batch.available_qty,
        unit: batch.unit,
        warehouseName: params.warehouseName,
      });

      labels.push({
        labelId,
        labelNo,
        qrCode: qrUuid,
        zplContent,
      });
    }

    return {
      labels,
      totalCount: labels.length,
    };
  });
}

function escapeZPLText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\^/g, '\\^').replace(/~/g, '\\~');
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (!text) return [];
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerLine) {
      lines.push(remaining);
      break;
    }
    lines.push(remaining.substring(0, maxCharsPerLine));
    remaining = remaining.substring(maxCharsPerLine);
  }
  return lines;
}
