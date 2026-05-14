import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { getIcPrefix, generateDocNo, getConfig } from '@/lib/global-config';

interface InventoryCheck {
  id: number;
  check_no: string;
  type: string;
  warehouse_id: number;
  status: number;
  start_time: string | null;
  end_time: string | null;
  checker_id: number | null;
  approver_id: number | null;
  total_items: number;
  diff_items: number;
  diff_amount: number;
  remark: string | null;
  create_time: string;
  update_time: string;
}

interface InventoryCheckItem {
  id: number;
  check_id: number;
  material_id: number;
  qr_code: string | null;
  batch_no: string | null;
  warehouse_location: string | null;
  split_flag: number;
  parent_qr_code: string | null;
  book_quantity: number;
  actual_quantity: number;
  difference: number;
  difference_reason: string | null;
  status: number;
}

const TYPE_MAP: Record<number, string> = {
  1: '定期盘点',
  2: '不定期盘点',
  3: '循环盘点',
  4: '抽盘',
};

const STATUS_MAP: Record<number, string> = {
  1: '进行中',
  2: '待审批',
  3: '已完成',
  4: '已取消',
};

function generateCheckNo(): string {
  return generateDocNo(getIcPrefix());
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const checkNo = searchParams.get('checkNo') || '';
  const status = searchParams.get('status') !== '' ? Number(searchParams.get('status')) : undefined;
  const type = searchParams.get('type') !== '' ? Number(searchParams.get('type')) : undefined;

  let where = 'WHERE s.deleted = 0';
  const params: any[] = [];

  if (checkNo) {
    where += ' AND s.taking_no LIKE ?';
    params.push(`%${checkNo}%`);
  }
  if (status !== undefined) {
    where += ' AND s.status = ?';
    params.push(status);
  }
  if (type !== undefined) {
    where += ' AND s.taking_type = ?';
    params.push(type);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM inv_stocktaking s ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any[] = await query(
    `SELECT s.*, w.warehouse_name,
            u1.real_name as checker_name,
            u2.real_name as approver_name
     FROM inv_stocktaking s
     LEFT JOIN inv_warehouse w ON s.warehouse_id = w.id
     LEFT JOIN sys_user u1 ON s.operator_id = u1.id
     LEFT JOIN sys_user u2 ON s.create_by = u2.id
     ${where}
     ORDER BY s.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({
    list: rows.map((row: any) => ({
      ...row,
      check_no: row.taking_no,
      type_name: TYPE_MAP[row.taking_type] || '未知',
      status_name: STATUS_MAP[row.status] || '未知',
    })),
    total,
    page,
    pageSize,
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { type = 1, warehouse_id, checker_id, remark } = body;

  if (!warehouse_id) {
    return errorResponse('请选择盘点仓库', 400, 400);
  }

  if (![1, 2, 3, 4].includes(type)) {
    return errorResponse('盘点类型无效', 400, 400);
  }

  const now = new Date();
  const checkNo = generateCheckNo();

  const result: any = await execute(
    `INSERT INTO inv_stocktaking (
      taking_no, taking_type, warehouse_id, status,
      taking_date, operator_id, remark, create_time, update_time
    ) VALUES (?, ?, ?, 1, NOW(), ?, ?, NOW(), NOW())`,
    [checkNo, type, warehouse_id, checker_id || null, remark || null]
  );

  const checkId = result.insertId;

  await execute(`UPDATE inv_inventory SET stocktaking_flag = 1 WHERE warehouse_id = ?`, [
    warehouse_id,
  ]);

  const inventoryItems: any[] = await query(
    `SELECT
      i.id as inventory_id,
      i.material_id,
      i.batch_no,
      i.quantity as system_qty,
      m.material_name,
      m.unit
    FROM inv_inventory i
    LEFT JOIN bas_material m ON i.material_id = m.id
    WHERE i.warehouse_id = ?
      AND i.quantity > 0
      AND i.deleted = 0`,
    [warehouse_id]
  );

  for (const item of inventoryItems) {
    await execute(
      `INSERT INTO inv_stocktaking_item (
        taking_id, material_id, material_code, material_name,
        system_qty, actual_qty, diff_qty, unit, batch_no
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [
        checkId,
        item.material_id,
        item.material_code || null,
        item.material_name,
        item.system_qty,
        item.unit,
        item.batch_no || null,
      ]
    );
  }

  await execute(`UPDATE inv_stocktaking SET total_items = ? WHERE id = ?`, [
    inventoryItems.length,
    checkId,
  ]);

  return successResponse(
    {
      id: checkId,
      check_no: checkNo,
      status: 1,
      item_count: inventoryItems.length,
      locked: true,
    },
    '盘点单生成成功，库存已锁定'
  );
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, approver_id, items } = body;

  const check: any = await queryOne(`SELECT * FROM inv_stocktaking WHERE id = ? AND deleted = 0`, [
    id,
  ]);

  if (!check) {
    return commonErrors.notFound('盘点单不存在');
  }

  switch (action) {
    case 'submit':
      if (check.status !== 1) {
        return errorResponse('只有进行中的盘点单才能提交', 400, 400);
      }

      const uncheckedCount: any = await queryOne(
        `SELECT COUNT(*) as count FROM inv_stocktaking_item
         WHERE taking_id = ? AND actual_qty = 0`,
        [id]
      );

      if (uncheckedCount.count > 0) {
        return errorResponse(`还有 ${uncheckedCount.count} 项未盘点，请完成所有盘点项`, 400, 400);
      }

      const diffStats: any = await queryOne(
        `SELECT
          COUNT(*) as diff_items,
          COALESCE(SUM(ABS(diff_qty)), 0) as diff_amount
         FROM inv_stocktaking_item
         WHERE taking_id = ? AND diff_qty != 0`,
        [id]
      );

      await execute(
        `UPDATE inv_stocktaking
         SET status = 2,
             update_time = NOW()
         WHERE id = ?`,
        [id]
      );

      return successResponse(null, '盘点结果已提交，等待审批');

    case 'approve':
      if (check.status !== 2) {
        return errorResponse('只有待审批的盘点单才能审批', 400, 400);
      }

      if (!approver_id) {
        return errorResponse('请指定审批人', 400, 400);
      }

      const stocktakingThreshold = Number(getConfig('stocktaking_diff_threshold') || 100);

      const diffItems: any[] = await query(
        `SELECT * FROM inv_stocktaking_item
         WHERE taking_id = ? AND diff_qty != 0`,
        [id]
      );

      for (const item of diffItems) {
        await execute(
          `UPDATE inv_inventory
           SET quantity = quantity + ?,
               update_time = NOW()
           WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
          [item.diff_qty, item.material_id, check.warehouse_id]
        );
      }

      await execute(
        `UPDATE inv_stocktaking
         SET status = 3, update_time = NOW()
         WHERE id = ?`,
        [id]
      );

      await execute(`UPDATE inv_inventory SET stocktaking_flag = 0 WHERE warehouse_id = ?`, [
        check.warehouse_id,
      ]);

      return successResponse(null, '盘点审批通过，库存已调整');

    case 'reject':
      if (check.status !== 2) {
        return errorResponse('只有待审批的盘点单才能驳回', 400, 400);
      }

      await execute(`UPDATE inv_stocktaking SET status = 1, update_time = NOW() WHERE id = ?`, [
        id,
      ]);

      return successResponse(null, '盘点单已驳回，请重新盘点');

    case 'cancel':
      if (![1].includes(check.status)) {
        return errorResponse('只有进行中的盘点单才能取消', 400, 400);
      }

      await execute(`UPDATE inv_stocktaking SET status = 4, update_time = NOW() WHERE id = ?`, [
        id,
      ]);

      await execute(`UPDATE inv_inventory SET stocktaking_flag = 0 WHERE warehouse_id = ?`, [
        check.warehouse_id,
      ]);

      return successResponse(null, '盘点单已取消');

    case 'update_items':
      if (!items || !Array.isArray(items)) {
        return errorResponse('缺少盘点明细数据', 400, 400);
      }

      for (const item of items) {
        const { id: itemId, actual_quantity, difference_reason } = item;

        const checkItem: any = await queryOne(
          `SELECT * FROM inv_stocktaking_item WHERE id = ? AND taking_id = ?`,
          [itemId, id]
        );

        if (!checkItem) continue;

        const diff_qty = actual_quantity - checkItem.system_qty;

        await execute(
          `UPDATE inv_stocktaking_item
           SET actual_qty = ?,
               diff_qty = ?,
               remark = ?
           WHERE id = ?`,
          [actual_quantity, diff_qty, difference_reason || null, itemId]
        );
      }

      const stats: any = await queryOne(
        `SELECT
          COUNT(CASE WHEN actual_qty > 0 THEN 1 END) as checked_count,
          COUNT(*) as total_count
         FROM inv_stocktaking_item
         WHERE taking_id = ?`,
        [id]
      );

      return successResponse(
        {
          checked_count: stats.checked_count,
          total_count: stats.total_count,
          progress: Math.round((stats.checked_count / stats.total_count) * 100),
        },
        '盘点数据更新成功'
      );

    default:
      return errorResponse('无效的操作类型', 400, 400);
  }
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('缺少ID参数', 400, 400);
  }

  const check: any = await queryOne(`SELECT * FROM inv_stocktaking WHERE id = ? AND deleted = 0`, [
    Number(id),
  ]);

  if (!check) {
    return commonErrors.notFound('盘点单不存在');
  }

  if (![4].includes(check.status)) {
    return errorResponse('只能删除已取消的盘点单', 400, 400);
  }

  await execute(`UPDATE inv_stocktaking SET deleted = 1, update_time = NOW() WHERE id = ?`, [
    Number(id),
  ]);

  await execute(`UPDATE inv_inventory SET stocktaking_flag = 0 WHERE warehouse_id = ?`, [
    check.warehouse_id,
  ]);

  return successResponse(null, '盘点单删除成功');
});
