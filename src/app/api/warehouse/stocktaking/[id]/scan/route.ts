import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, commonErrors } from '@/lib/api-response';

const SPLIT_FLAG_MAP: Record<number, string> = {
  0: '整料',
  1: '小料',
  2: '余料'
};

export const POST = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const resolvedParams = await params;
  const checkId = parseInt(resolvedParams.id);
  const body = await request.json();
  const { qr_code, actual_quantity } = body;

  if (!qr_code) {
    return errorResponse('请扫描二维码', 400, 400);
  }

  if (actual_quantity === undefined || actual_quantity === null) {
    return errorResponse('请输入实际数量', 400, 400);
  }

  const check: any = await queryOne(
    `SELECT * FROM inventory_checks WHERE id = ? AND deleted = 0`,
    [checkId]
  );

  if (!check) {
    return commonErrors.notFound('盘点单不存在');
  }

  if (check.status !== 1) {
    const statusMap: Record<number, string> = {
      0: '草稿', 1: '进行中', 2: '待审批', 3: '已完成', 4: '已取消'
    };
    return errorResponse(
      `当前状态为"${statusMap[check.status]}"，不能执行盘点操作`,
      400, 400
    );
  }

  const inventoryItem: any = await queryOne(
    `SELECT i.*, m.material_name, m.unit
     FROM wh_inventory i
     LEFT JOIN bas_material m ON i.material_id = m.id
     WHERE i.qr_code = ? AND i.warehouse_id = ?`,
    [qr_code, check.warehouse_id]
  );

  if (!inventoryItem) {
    return errorResponse('未找到对应的库存记录', 404, 404);
  }

  const checkItem: any = await queryOne(
    `SELECT * FROM inventory_check_items
     WHERE check_id = ? AND qr_code = ?`,
    [checkId, qr_code]
  );

  if (!checkItem) {
    return errorResponse('该物料不在本次盘点范围内', 400, 400);
  }

  const difference = actual_quantity - checkItem.book_quantity;

  let split_flag = 0;
  let parent_qr_code = null;

  const splitInfo: any = await queryOne(
    `SELECT * FROM material_splits WHERE child_qr_code = ?`,
    [qr_code]
  );

  if (splitInfo) {
    split_flag = 1;
    parent_qr_code = splitInfo.parent_qr_code;
  }

  await execute(
    `UPDATE inventory_check_items
     SET actual_quantity = ?,
         difference = ?,
         status = 1,
         updated_at = NOW()
     WHERE id = ?`,
    [actual_quantity, difference, checkItem.id]
  );

  const stats: any = await queryOne(
    `SELECT
      COUNT(CASE WHEN status = 1 THEN 1 END) as checked_count,
      COUNT(*) as total_count
     FROM inventory_check_items
     WHERE check_id = ?`,
    [checkId]
  );

  return successResponse({
    material_name: inventoryItem.material_name,
    batch_no: inventoryItem.batch_no,
    split_flag: SPLIT_FLAG_MAP[split_flag] || '整料',
    parent_qr_code: parent_qr_code,
    warehouse_location: inventoryItem.warehouse_location,
    book_quantity: checkItem.book_quantity,
    actual_quantity: actual_quantity,
    difference: difference,
    progress: Math.round((stats.checked_count / stats.total_count) * 100)
  }, '扫码盘点成功');
});