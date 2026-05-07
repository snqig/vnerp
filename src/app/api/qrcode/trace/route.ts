import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const qrCode = searchParams.get('qr_code') || '';
  const refNo = searchParams.get('ref_no') || '';
  const batchNo = searchParams.get('batch_no') || '';
  const materialCode = searchParams.get('material_code') || '';

  if (!qrCode && !refNo && !batchNo && !materialCode) {
    return errorResponse('请提供二维码编码、单号、批次号或物料编码', 400, 400);
  }

  let record: any = null;

  if (qrCode) {
    record = await queryOne('SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0', [qrCode]);
  }
  if (!record && refNo) {
    record = await queryOne('SELECT * FROM qrcode_record WHERE ref_no = ? AND deleted = 0 ORDER BY create_time DESC LIMIT 1', [refNo]);
  }
  if (!record && batchNo) {
    record = await queryOne('SELECT * FROM qrcode_record WHERE batch_no = ? AND deleted = 0 ORDER BY create_time DESC LIMIT 1', [batchNo]);
  }
  if (!record && materialCode) {
    record = await queryOne('SELECT * FROM qrcode_record WHERE material_code = ? AND deleted = 0 ORDER BY create_time DESC LIMIT 1', [materialCode]);
  }

  if (!record) return errorResponse('未找到对应的二维码记录', 404, 404);

  const scanLogs: any = await query(
    'SELECT * FROM qrcode_scan_log WHERE qr_code = ? ORDER BY create_time ASC',
    [record.qr_code]
  );

  const relatedRecords: any = await query(
    'SELECT id, qr_code, qr_type, ref_no, batch_no, material_name, quantity, status, create_time FROM qrcode_record WHERE (ref_no = ? OR batch_no = ? OR material_code = ?) AND qr_code != ? AND deleted = 0 ORDER BY create_time ASC',
    [record.ref_no, record.batch_no || '', record.material_code || '', record.qr_code]
  );

  let batchInfo: any = null;
  if (record.batch_no) {
    batchInfo = await queryOne(
      `SELECT b.*, w.warehouse_name
       FROM inv_inventory_batch b
       LEFT JOIN inv_warehouse w ON b.warehouse_id = w.id AND w.deleted = 0
       WHERE b.batch_no = ? AND b.deleted = 0`,
      [record.batch_no]
    );
  }

  let inventoryInfo: any = null;
  if (record.material_id) {
    inventoryInfo = await query(
      'SELECT i.*, w.warehouse_name FROM inv_inventory i LEFT JOIN inv_warehouse w ON i.warehouse_id = w.id WHERE i.material_id = ? AND i.deleted = 0',
      [record.material_id]
    );
  }

  let inboundInfo: any = null;
  if (record.batch_no) {
    inboundInfo = await query(
      `SELECT ii.*, io.order_no AS inbound_order_no, io.order_type AS inbound_type, io.status AS inbound_status
       FROM inv_inbound_item ii
       LEFT JOIN inv_inbound_order io ON ii.order_id = io.id AND io.deleted = 0
       WHERE ii.batch_no = ?`,
      [record.batch_no]
    );
  }

  let productionUsage: any = null;
  if (record.material_id && record.qr_type === 'material') {
    productionUsage = await query(
      `SELECT wo.work_order_no, wo.status AS work_order_status, wo.plan_qty, wo.completed_qty
       FROM prd_work_order wo
       WHERE wo.material_id = ? AND wo.deleted = 0
       ORDER BY wo.create_time DESC LIMIT 5`,
      [record.material_id]
    );
  }

  let productQRs: any = null;
  if (record.qr_type === 'material' && record.work_order_no) {
    productQRs = await query(
      `SELECT qr.qr_code, qr.qr_type, qr.material_name, qr.quantity, qr.status, qr.create_time
       FROM qrcode_record qr
       WHERE qr.work_order_no = ? AND qr.qr_type = 'product' AND qr.deleted = 0
       ORDER BY qr.create_time ASC`,
      [record.work_order_no]
    );
  }

  let shipmentInfo: any = null;
  if (record.qr_type === 'product' && record.ref_no) {
    shipmentInfo = await query(
      `SELECT sd.delivery_no, sd.delivery_date, sd.customer_name, sd.status
       FROM sal_delivery sd
       WHERE sd.order_no = ? AND sd.deleted = 0
       ORDER BY sd.create_time DESC LIMIT 5`,
      [record.ref_no]
    );
  }

  let orderInfo: any = null;
  if (record.ref_no && record.ref_no.startsWith('SO')) {
    orderInfo = await queryOne('SELECT * FROM sales_order WHERE order_no = ? AND deleted = 0', [record.ref_no]);
  }
  if (record.ref_no && record.ref_no.startsWith('PO')) {
    orderInfo = await queryOne('SELECT * FROM pur_order WHERE order_no = ? AND deleted = 0', [record.ref_no]);
  }
  if (record.work_order_no) {
    orderInfo = await queryOne('SELECT * FROM prd_work_order WHERE work_order_no = ? AND deleted = 0', [record.work_order_no]);
  }

  let qualityInfo: any = null;
  if (record.ref_no) {
    qualityInfo = await query(
      "SELECT * FROM qc_incoming_inspection WHERE (batch_no = ? OR material_code = ?) AND deleted = 0 ORDER BY create_time DESC LIMIT 5",
      [record.batch_no || '', record.material_code || '']
    );
  }

  const timeline = [
    ...scanLogs.map((log: any) => ({
      time: log.create_time,
      event: `${getScanTypeLabel(log.scan_type)}`,
      operator: log.operator_name || '-',
      result: log.scan_result,
      message: log.scan_message || '',
    })),
  ].sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (record.create_time) {
    timeline.unshift({
      time: record.create_time,
      event: `生成${getTypeLabel(record.qr_type)}二维码`,
      operator: '-',
      result: 'success',
      message: `二维码 ${record.qr_code} 已生成`,
    });
  }

  if (batchInfo) {
    timeline.push({
      time: batchInfo.create_time || batchInfo.created_at,
      event: '批次入库',
      operator: '-',
      result: 'success',
      message: `批次 ${record.batch_no} 入库，总量: ${batchInfo.quantity}，可用: ${batchInfo.available_qty}`,
    });
  }

  if (inboundInfo && inboundInfo.length > 0) {
    inboundInfo.forEach((item: any) => {
      timeline.push({
        time: item.create_time,
        event: '入库记录',
        operator: '-',
        result: 'success',
        message: `入库单 ${item.inbound_order_no || '-'}，数量: ${item.quantity}`,
      });
    });
  }

  timeline.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return successResponse({
    record,
    timeline,
    related_records: relatedRecords,
    batch: batchInfo,
    inventory: inventoryInfo,
    inbound: inboundInfo,
    production_usage: productionUsage,
    product_qrs: productQRs,
    shipment: shipmentInfo,
    order: orderInfo,
    quality: qualityInfo,
  });
});

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    material: '原料', product: '成品', workorder: '工单', ink: '油墨',
    screen_plate: '网版', die: '刀具', shipment: '出货', ink_open: '开罐', ink_mixed: '调色',
  };
  return map[type] || type;
}

function getScanTypeLabel(type: string): string {
  const map: Record<string, string> = {
    inbound: '入库扫描', outbound: '出库扫描', issue: '领料扫描', report: '报工扫描',
    check: '检验扫描', inventory: '盘点扫描', ink_open: '开罐扫描', ink_use: '油墨使用',
    plate_use: '网版领用', plate_clean: '网版清洗', die_use: '刀具使用', die_sharpen: '刀具刃磨', trace: '追溯查询',
  };
  return map[type] || type;
}
