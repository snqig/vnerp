import { t } from '@/lib/server-translate';
import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { getIcPrefix, generateDocNo, getConfig } from '@/lib/global-config';

import { withPermission } from '@/lib/api-permissions';
import { STOCKTAKING_TYPE_LABEL, STOCKTAKING_STATUS_LABEL } from '@/lib/status-labels';
import { appendInventoryLog } from '@/lib/inventory-ledger';
import type { DbRow } from '@/types/db';

const TYPE_MAP = STOCKTAKING_TYPE_LABEL;
const STATUS_MAP = STOCKTAKING_STATUS_LABEL;

function generateCheckNo(): string {
  return generateDocNo(getIcPrefix());
}

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const checkNo = searchParams.get('checkNo') || '';
  const statusRaw = searchParams.get('status');
  const status = statusRaw !== null && statusRaw !== '' ? Number(statusRaw) : undefined;
  const typeRaw = searchParams.get('type');
  const type = typeRaw !== null && typeRaw !== '' ? Number(typeRaw) : undefined;

  let where = 'WHERE s.deleted = 0';
  const params: SqlValue[] = [];

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

  const totalRows = await query(`SELECT COUNT(*) as total FROM inv_stocktaking s ${where}`, params);
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT s.*, w.warehouse_name,
            u1.real_name as checker_name,
            u2.real_name as approver_name,
            (SELECT COUNT(*) FROM inv_stocktaking_item si WHERE si.taking_id = s.id) as total_items,
            (SELECT COUNT(*) FROM inv_stocktaking_item si WHERE si.taking_id = s.id AND si.diff_qty <> 0) as diff_items,
            (SELECT COALESCE(SUM(ABS(si.diff_qty)), 0) FROM inv_stocktaking_item si WHERE si.taking_id = s.id) as diff_amount
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
    list: rows.map((row: DbRow) => {
  const ts = t;
  return  ({
      ...row,
      check_no: row.taking_no,
      type_name: TYPE_MAP[row.taking_type] || ts('k_1lpnuh4'),
      status_name: STATUS_MAP[row.status] || ts('k_1lpnuh4'),
    });
}),
    total,
    page,
    pageSize,
  });
});

export const POST = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const { type = 1, warehouse_id, checker_id, remark } = body;

  if (!warehouse_id) {
    return errorResponse('SELECT_WAREHOUSE', 400, 400);
  }

  if (![1, 2, 3, 4].includes(type)) {
    return errorResponse('INVALID_STOCKTAKING_TYPE', 400, 400);
  }

  const _now = new Date();
  const checkNo = generateCheckNo();

  const result = await execute(
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

  const inventoryItems = await query(
    `SELECT
      i.id as inventory_id,
      i.material_id,
      i.batch_no,
      i.quantity as system_qty,
      m.material_name,
      m.unit
    FROM inv_inventory i
    LEFT JOIN inv_material m ON i.material_id = m.id
    WHERE i.warehouse_id = ?
      AND i.quantity > 0
      AND i.deleted = 0`,
    [warehouse_id]
  );

  for (const item of inventoryItems) {
    await execute(
      `INSERT INTO inv_stocktaking_item (
        taking_id, material_id, material_code, material_name,
        system_qty, actual_qty, diff_qty, unit, batch_no, batch_id, location_id, original_inbound_date, qr_code
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?)`,
      [
        checkId,
        item.material_id,
        item.material_code || null,
        item.material_name,
        item.system_qty,
        item.unit,
        item.batch_no || null,
        item.batch_id || null,
        item.location_id || null,
        item.original_inbound_date || null,
        item.qr_code || null,
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
    ts('k_uu2zhr')
  );
});

export const PUT = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const { id, action, approver_id, items } = body;

  const check = await queryOne(`SELECT * FROM inv_stocktaking WHERE id = ? AND deleted = 0`, [id]);

  if (!check) {
    return commonErrors.notFound(ts('k_rt4j0w'));
  }

  switch (action) {
    case 'submit':
      if (check.status !== 1) {
        return errorResponse('ONLY_IN_PROGRESS_CAN_SUBMIT', 400, 400);
      }

      const uncheckedCount = await queryOne(
        `SELECT COUNT(*) as count FROM inv_stocktaking_item
         WHERE taking_id = ? AND actual_qty = 0`,
        [id]
      );

      if (uncheckedCount.count > 0) {
        return errorResponse(`盘点项目未完成，还有 ${uncheckedCount.count} 项未盘点`, 400, 400);
      }

      const _diffStats = await queryOne(
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

      return successResponse(null, 'STOCKTAKING_SUBMITTED');

    case 'approve':
      if (check.status !== 2) {
        return errorResponse('ONLY_PENDING_APPROVAL_CAN_APPROVE', 400, 400);
      }

      if (!approver_id) {
        return errorResponse('APPROVER_REQUIRED', 400, 400);
      }

      const _stocktakingThreshold = Number(getConfig('stocktaking_diff_threshold') || 100);

      // 使用事务保护盘点审批操作，确保数据一致性
      await transaction(async (conn) => {
        const diffItems: DbRow[] = await conn
          .execute(`SELECT * FROM inv_stocktaking_item WHERE taking_id = ? AND diff_qty != 0`, [id])
          .then(([rows]) => rows as DbRow[]);

        for (const item of diffItems) {
          // 检查是否会产生负库存
          const currentStock: unknown = await conn
            .execute(
              `SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
              [item.material_id, check.warehouse_id]
            )
            .then(([rows]) => (rows as DbRow[])[0]);

          if (currentStock && currentStock.quantity + item.diff_qty < 0) {
            throw new Error(`物料ID ${item.material_id} 盘点后将产生负库存，请检查盘点数据`);
          }

          // 更新库存
          await conn.execute(
            `UPDATE inv_inventory SET quantity = quantity + ?, update_time = NOW() WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
            [item.diff_qty, item.material_id, check.warehouse_id]
          );

          // 记录库存流水（R5：统一 canonical 形态，弃用旧 change_type 形态）
          const beforeQty = currentStock ? Number((currentStock as DbRow).quantity) : null;
          const diffQty = Number(item.diff_qty);
          await appendInventoryLog(conn, {
            materialId: Number(item.material_id),
            warehouseId: check.warehouse_id,
            operationType: 3,
            operationQty: diffQty,
            beforeQty,
            afterQty: beforeQty !== null ? beforeQty + diffQty : null,
            businessType: 'stocktaking',
            businessNo: check.taking_no,
            remark: ts('k_1fkc9ul'),
          });
        }

        // 更新盘点单状态
        await conn.execute(
          `UPDATE inv_stocktaking SET status = 3, approver_id = ?, update_time = NOW() WHERE id = ?`,
          [approver_id, id]
        );

        // 解锁库存
        await conn.execute(`UPDATE inv_inventory SET stocktaking_flag = 0 WHERE warehouse_id = ?`, [
          check.warehouse_id,
        ]);
      });

      return successResponse(null, 'STOCKTAKING_APPROVED');

    case 'reject':
      if (check.status !== 2) {
        return errorResponse('ONLY_PENDING_APPROVAL_CAN_REJECT', 400, 400);
      }

      await execute(`UPDATE inv_stocktaking SET status = 1, update_time = NOW() WHERE id = ?`, [
        id,
      ]);

      return successResponse(null, 'STOCKTAKING_REJECTED');

    case 'cancel':
      if (![1].includes(check.status)) {
        return errorResponse('ONLY_IN_PROGRESS_CAN_CANCEL', 400, 400);
      }

      await execute(`UPDATE inv_stocktaking SET status = 4, update_time = NOW() WHERE id = ?`, [
        id,
      ]);

      await execute(`UPDATE inv_inventory SET stocktaking_flag = 0 WHERE warehouse_id = ?`, [
        check.warehouse_id,
      ]);

      return successResponse(null, 'STOCKTAKING_CANCELLED');

    case 'update_items':
      if (!items || !Array.isArray(items)) {
        return errorResponse('STOCKTAKING_ITEMS_REQUIRED', 400, 400);
      }

      for (const item of items) {
        const { id: itemId, actual_quantity, difference_reason } = item;

        const checkItem = await queryOne(
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

      const stats = await queryOne(
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
        ts('k_10hw13d')
      );

    default:
      return errorResponse('INVALID_OPERATION_TYPE', 400, 400);
  }
});

export const DELETE = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('ID_PARAM_REQUIRED', 400, 400);
  }

  const check = await queryOne(`SELECT * FROM inv_stocktaking WHERE id = ? AND deleted = 0`, [
    Number(id),
  ]);

  if (!check) {
    return commonErrors.notFound(ts('k_rt4j0w'));
  }

  if (![4].includes(check.status)) {
    return errorResponse('ONLY_CANCELLED_CAN_DELETE', 400, 400);
  }

  await execute(`UPDATE inv_stocktaking SET deleted = 1, update_time = NOW() WHERE id = ?`, [
    Number(id),
  ]);

  await execute(`UPDATE inv_inventory SET stocktaking_flag = 0 WHERE warehouse_id = ?`, [
    check.warehouse_id,
  ]);

  return successResponse(null, 'STOCKTAKING_DELETED');
});
