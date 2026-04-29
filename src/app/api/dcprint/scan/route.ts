import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

// POST - 扫描二维码查询信息
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { qrContent, scanType, operatorId, operatorName } = body;

  if (!qrContent) {
    return errorResponse('二维码内容不能为空', 400, 400);
  }

  let qrData: any;
  try {
    qrData = JSON.parse(qrContent);
  } catch {
    // 如果不是JSON格式，尝试按标签号查询
    qrData = { ID: qrContent, TYPE: '0' };
  }

  const labelNo = qrData.ID;
  const type = qrData.TYPE;

  if (!labelNo) {
    return errorResponse('二维码格式不正确', 400, 400);
  }

  // 记录扫码日志
  await logScan(scanType, qrContent, labelNo, operatorId, operatorName, 'scanning');

  // 根据类型查询不同信息
  let result: any = null;

  switch (type) {
    case '0': // 母材标签
    case '1': // 入库标签
    case '2': // 分切后标签
      result = await queryMaterialLabel(labelNo);
      break;
    case '3': // 工单
      result = await queryWorkOrder(labelNo);
      break;
    case '4': // 流程卡
      result = await queryProcessCard(labelNo);
      break;
    default:
      // 默认查询物料标签
      result = await queryMaterialLabel(labelNo);
  }

  if (!result) {
    await logScan(scanType, qrContent, labelNo, operatorId, operatorName, 'failed', '未找到对应记录');
    return errorResponse('未找到对应记录', 404, 404);
  }

  await logScan(scanType, qrContent, labelNo, operatorId, operatorName, 'success');

  return successResponse({
    type,
    data: result,
  }, '扫码查询成功');
}, '扫码查询失败');

// 查询物料标签
async function queryMaterialLabel(labelNo: string) {
  const label = await queryOne<any>(
    `SELECT
      l.id,
      l.label_no as labelNo,
      l.qr_code as qrCode,
      l.purchase_order_no as purchaseOrderNo,
      l.supplier_name as supplierName,
      l.receive_date as receiveDate,
      l.material_code as materialCode,
      l.material_name as materialName,
      l.specification,
      l.unit,
      l.batch_no as batchNo,
      l.quantity,
      l.package_qty as packageQty,
      l.width,
      l.length_per_roll as lengthPerRoll,
      l.remark,
      l.color_code as colorCode,
      l.mix_remark as mixRemark,
      l.warehouse_id as warehouseId,
      l.location_id as locationId,
      NULL as warehouseName,
      NULL as locationName,
      l.is_main_material as isMainMaterial,
      l.is_used as isUsed,
      l.is_cut as isCut,
      l.parent_label_id as parentLabelId,
      pl.label_no as parentLabelNo,
      l.status,
      l.create_time as createTime
    FROM inv_material_label l
    LEFT JOIN inv_material_label pl ON l.parent_label_id = pl.id
    WHERE l.label_no = ? AND l.deleted = 0`,
    [labelNo]
  );

  if (!label) return null;

  // 查询分切记录（如果是母材）
  if (label.isMainMaterial === 1) {
    const cuttingRecords = await query<any[]>(
      `SELECT
        r.id,
        r.record_no as recordNo,
        r.cut_width_str as cutWidthStr,
        r.original_width as originalWidth,
        r.cut_total_width as cutTotalWidth,
        r.remain_width as remainWidth,
        r.cut_time as cutTime,
        r.operator_name as operatorName,
        d.new_label_no as newLabelNo,
        d.cut_width as cutWidth,
        d.sequence
      FROM inv_cutting_record r
      LEFT JOIN inv_cutting_detail d ON r.id = d.record_id
      WHERE r.source_label_id = ?
      ORDER BY r.cut_time DESC`,
      [label.id]
    );
    label.cuttingRecords = cuttingRecords || [];
  }

  // 查询子标签（如果有）
  if (label.isCut === 1) {
    const childLabels = await query<any[]>(
      `SELECT
        label_no as labelNo,
        width,
        material_code as materialCode,
        material_name as materialName,
        is_used as isUsed,
        create_time as createTime
      FROM inv_material_label
      WHERE parent_label_id = ? AND deleted = 0
      ORDER BY create_time`,
      [label.id]
    );
    label.childLabels = childLabels || [];
  }

  return label;
}

// 查询工单
async function queryWorkOrder(workOrderNo: string) {
  const workOrder = await queryOne<any>(
    `SELECT
      wo.id,
      wo.order_no as orderNo,
      wo.qr_code as qrCode,
      wo.product_id as productId,
      p.code as productCode,
      p.name as productName,
      p.specification as productSpec,
      wo.quantity,
      wo.plan_start_date as planStartDate,
      wo.plan_end_date as planEndDate,
      wo.status,
      wo.workshop,
      wo.remarks,
      wo.create_time as createTime
    FROM work_orders wo
    LEFT JOIN products p ON wo.product_id = p.id
    WHERE wo.order_no = ? AND wo.deleted = 0`,
    [workOrderNo]
  );

  if (!workOrder) return null;

  // 查询关联的流程卡
  const processCards = await query<any[]>(
    `SELECT
      card_no as cardNo,
      main_label_no as mainLabelNo,
      burdening_status as burdeningStatus,
      lock_status as lockStatus,
      create_user_name as createUserName,
      create_time as createTime
    FROM prd_process_card
    WHERE work_order_id = ? AND deleted = 0
    ORDER BY create_time DESC`,
    [workOrder.id]
  );

  workOrder.processCards = processCards || [];

  return workOrder;
}

// 查询流程卡
async function queryProcessCard(cardNo: string) {
  const card = await queryOne<any>(
    `SELECT
      c.id,
      c.card_no as cardNo,
      c.qr_code as qrCode,
      c.work_order_id as workOrderId,
      c.work_order_no as workOrderNo,
      c.product_code as productCode,
      c.product_name as productName,
      c.material_spec as materialSpec,
      c.work_order_date as workOrderDate,
      c.plan_qty as planQty,
      c.main_label_id as mainLabelId,
      c.main_label_no as mainLabelNo,
      c.burdening_status as burdeningStatus,
      c.lock_status as lockStatus,
      c.create_user_name as createUserName,
      c.create_time as createTime,
      l.material_code as mainMaterialCode,
      l.material_name as mainMaterialName,
      l.specification as mainSpecification,
      l.batch_no as mainBatchNo,
      l.supplier_name as mainSupplierName,
      l.receive_date as mainReceiveDate
    FROM prd_process_card c
    LEFT JOIN inv_material_label l ON c.main_label_id = l.id
    WHERE c.card_no = ? AND c.deleted = 0`,
    [cardNo]
  );

  if (!card) return null;

  // 查询流程卡关联的物料
  const materials = await query<any[]>(
    `SELECT
      label_no as labelNo,
      material_type as materialType,
      material_code as materialCode,
      material_name as materialName,
      specification,
      batch_no as batchNo,
      quantity,
      unit,
      remark,
      create_time as createTime
    FROM prd_process_card_material
    WHERE card_id = ?
    ORDER BY material_type, create_time`,
    [card.id]
  );

  card.materials = materials || [];
  card.mainMaterials = materials?.filter((m: any) => m.materialType === 'main') || [];
  card.auxiliaryMaterials = materials?.filter((m: any) => m.materialType === 'auxiliary') || [];

  return card;
}

// 记录扫码日志
async function logScan(
  scanType: string,
  qrContent: string,
  labelNo: string,
  operatorId?: number,
  operatorName?: string,
  operation?: string,
  message?: string
) {
  try {
    await execute(
      `INSERT INTO inv_scan_log (
        scan_type, qr_content, label_no, operation, result, message,
        operator_id, operator_name, scan_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        scanType, qrContent, labelNo, operation,
        message ? 'failed' : 'success', message,
        operatorId, operatorName,
      ]
    );
  } catch (error) {
    console.error('记录扫码日志失败:', error);
  }
}
