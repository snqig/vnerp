import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';

/**
 * 盘点差异处理 API
 *
 * 盘点单审核后，差异需要经过审批才能调整库存
 * 流程：盘点完成 → 差异确认 → 差异审批 → 库存调整
 */

// 获取待处理的盘点差异
export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'pending';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let where = 'WHERE si.difference != 0';
  const params: Loose[] = [];

  if (type === 'pending') {
    where += ' AND si.diff_status = ?';
    params.push('pending');
  } else if (type === 'approved') {
    where += ' AND si.diff_status = ?';
    params.push('approved');
  } else if (type === 'processed') {
    where += ' AND si.diff_status = ?';
    params.push('processed');
  }

  const countRows: Loose = await query(
    `SELECT COUNT(*) as total FROM inv_stocktaking_item si ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const rows: Loose = await query(
    `SELECT si.*, m.material_name, m.material_code, m.unit,
              s.taking_no, s.warehouse_id, w.warehouse_name,
              u1.real_name as checker_name,
              u2.real_name as approver_name
       FROM inv_stocktaking_item si
       LEFT JOIN materials m ON si.material_id = m.id
       LEFT JOIN inv_stocktaking s ON si.check_id = s.id
       LEFT JOIN warehouses w ON s.warehouse_id = w.id
       LEFT JOIN sys_user u1 ON si.check_by = u1.id
       LEFT JOIN sys_user u2 ON si.diff_approver = u2.id
       ${where}
       ORDER BY si.diff_status ASC, ABS(si.difference) DESC
       LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  // 统计
  const summary: Loose = await query(
    `SELECT 
         COUNT(CASE WHEN diff_status = 'pending' THEN 1 END) as pending_count,
         COUNT(CASE WHEN diff_status = 'approved' THEN 1 END) as approved_count,
         COUNT(CASE WHEN diff_status = 'processed' THEN 1 END) as processed_count,
         SUM(CASE WHEN diff_status = 'pending' AND difference > 0 THEN difference ELSE 0 END) as pending_gain,
         SUM(CASE WHEN diff_status = 'pending' AND difference < 0 THEN ABS(difference) ELSE 0 END) as pending_loss
       FROM inv_stocktaking_item
       WHERE difference != 0`
  );

  return successResponse({
    list: rows,
    total,
    page,
    pageSize,
    summary: summary[0] || {},
  });
});

// 差异审批/处理
export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      // 审批差异
      const { item_ids, reason } = body;
      if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
        return errorResponse('请选择需要审批的差异项', 400, 400);
      }

      for (const itemId of item_ids) {
        const item: Loose = await query(
          'SELECT * FROM inv_stocktaking_item WHERE id = ? AND diff_status = ?',
          [itemId, 'pending']
        );

        if (item.length === 0) continue;

        await execute(
          `UPDATE inv_stocktaking_item 
           SET diff_status = 'approved', diff_approver = ?, diff_approve_time = NOW(),
               diff_reason = COALESCE(?, diff_reason), update_time = NOW()
           WHERE id = ?`,
          [userInfo.userId, reason || null, itemId]
        );
      }

      return successResponse(null, `已审批 ${item_ids.length} 项差异`);
    }

    if (action === 'process') {
      // 处理已审批的差异（调整库存）
      const { item_ids } = body;
      if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
        return errorResponse('请选择需要处理的差异项', 400, 400);
      }

      let processedCount = 0;

      for (const itemId of item_ids) {
        const items: Loose = await query(
          `SELECT si.*, s.warehouse_id FROM inv_stocktaking_item si
           LEFT JOIN inv_stocktaking s ON si.check_id = s.id
           WHERE si.id = ? AND si.diff_status = 'approved'`,
          [itemId]
        );

        if (items.length === 0) continue;

        const item = items[0];
        const difference = Number(item.difference);

        // 调整库存
        if (difference > 0) {
          // 盘盈：增加库存
          await execute(
            `UPDATE stock SET quantity = quantity + ?, update_time = NOW() 
             WHERE material_id = ? AND warehouse_id = ?`,
            [difference, item.material_id, item.warehouse_id]
          );
        } else {
          // 盘亏：减少库存
          await execute(
            `UPDATE stock SET quantity = GREATEST(quantity + ?, 0), update_time = NOW() 
             WHERE material_id = ? AND warehouse_id = ?`,
            [difference, item.material_id, item.warehouse_id]
          );
        }

        // 记录库存变动
        await execute(
          `INSERT INTO stock_movement (material_id, warehouse_id, movement_type, quantity, unit_price, source_type, source_no, operator_id, create_time)
           VALUES (?, ?, ?, ?, 0, 'stocktaking', ?, ?, NOW())`,
          [
            item.material_id,
            item.warehouse_id,
            difference > 0 ? 'stock_gain' : 'stock_loss',
            Math.abs(difference),
            item.taking_no || '',
            userInfo.userId,
          ]
        );

        // 更新差异状态
        await execute(
          `UPDATE inv_stocktaking_item SET diff_status = 'processed', process_time = NOW(), update_time = NOW() WHERE id = ?`,
          [itemId]
        );

        processedCount++;
      }

      return successResponse({ processedCount }, `已处理 ${processedCount} 项差异`);
    }

    if (action === 'reject') {
      // 驳回差异
      const { item_ids, reason } = body;
      if (!item_ids || !Array.isArray(item_ids)) {
        return errorResponse('请选择需要驳回的差异项', 400, 400);
      }

      for (const itemId of item_ids) {
        await execute(
          `UPDATE inv_stocktaking_item 
           SET diff_status = 'rejected', diff_reason = ?, update_time = NOW()
           WHERE id = ? AND diff_status = 'pending'`,
          [reason || '驳回', itemId]
        );
      }

      return successResponse(null, `已驳回 ${item_ids.length} 项差异`);
    }

    return errorResponse('无效的操作类型', 400, 400);
  },
  { errorMessage: '操作失败' }
);
