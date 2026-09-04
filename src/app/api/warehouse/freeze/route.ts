import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute, SqlValue } from '@/lib/db';
import { logger, generateTraceId } from '@/lib/logger';

/**
 * 库存冻结/解冻 API
 *
 * 支持按物料+仓库维度冻结库存，防止超卖
 * 冻结的库存不参与可用库存计算
 */

// 获取冻结记录列表
export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const warehouseId = searchParams.get('warehouseId');
    const freezeType = searchParams.get('freezeType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let where = 'WHERE f.status = ?';
    const params: SqlValue[] = ['active'];

    if (materialId) {
      where += ' AND f.material_id = ?';
      params.push(Number(materialId));
    }
    if (warehouseId) {
      where += ' AND f.warehouse_id = ?';
      params.push(Number(warehouseId));
    }
    if (freezeType) {
      where += ' AND f.freeze_type = ?';
      params.push(freezeType);
    }

    const countRows = await query(
      `SELECT COUNT(*) as total FROM inv_stock_freeze f ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const rows = await query(
      `SELECT f.*, m.material_name, m.material_code, m.unit,
              w.warehouse_name, u.real_name as operator_name
       FROM inv_stock_freeze f
       LEFT JOIN inv_material m ON f.material_id = m.id
       LEFT JOIN inv_warehouse w ON f.warehouse_id = w.id
       LEFT JOIN sys_user u ON f.create_by = u.id
       ${where}
       ORDER BY f.create_time DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return successResponse({ list: rows, total, page, pageSize });
  },
  { errorMessage: '操作失败' }
);

// 创建冻结记录
export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'freeze', action: 'create', userId: userInfo.userId, traceId };

    const body = await request.json();
    const {
      material_id,
      warehouse_id,
      freeze_quantity,
      freeze_type,
      reason,
      source_type,
      source_id,
    } = body;

    logger.stepStart(ctx, ts('k_ouse9g'), { material_id, warehouse_id, freeze_quantity, freeze_type });

    if (!material_id || !warehouse_id || !freeze_quantity) {
      logger.branch(ctx, ts('k_199cfle'), ts('k_1wepfy4'), false, {
        material_id,
        warehouse_id,
        freeze_quantity,
      });
      return errorResponse(ts('k_1961dqv'), 400, 400);
    }

    if (freeze_quantity <= 0) {
      logger.branch(ctx, ts('k_199cfle'), ts('k_12iy4jo'), false, { freeze_quantity });
      return errorResponse(ts('k_vod75l'), 400, 400);
    }

    logger.branch(ctx, ts('k_199cfle'), ts('k_1wepfy4'), true);

    // 检查可用库存
    logger.stepStart(ctx, ts('k_1gzwyvp'), { material_id, warehouse_id });
    const stock = await query(
      'SELECT quantity, frozen_qty FROM inv_inventory WHERE material_id = ? AND warehouse_id = ?',
      [material_id, warehouse_id]
    );
    logger.db(ctx, 'SELECT', 'stock', { material_id, warehouse_id, rows: stock.length });

    if (stock.length === 0) {
      logger.branch(ctx, ts('k_11c3iyl'), ts('k_1snl15h'), false);
      return errorResponse(ts('k_fh3hkg'), 404, 404);
    }

    const availableQty = Number(stock[0].quantity) - Number(stock[0].frozen_qty || 0);
    logger.info(ctx, `可用库存: ${availableQty}, 请求冻结: ${freeze_quantity}`);

    if (availableQty < freeze_quantity) {
      logger.branch(ctx, ts('k_11c3iyl'), ts('k_gew53r'), false, {
        availableQty,
        freeze_quantity,
      });
      return errorResponse(`可用库存不足，当前可用: ${availableQty}`, 400, 400);
    }
    logger.branch(ctx, ts('k_11c3iyl'), ts('k_gew53r'), true);

    // 创建冻结记录
    const result = await execute(
      `INSERT INTO inv_stock_freeze
       (material_id, warehouse_id, freeze_quantity, freeze_type, reason,
        source_type, source_id, status, create_by, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
      [
        material_id,
        warehouse_id,
        freeze_quantity,
        freeze_type || 'manual',
        reason || null,
        source_type || null,
        source_id || null,
        userInfo.userId,
      ]
    );
    logger.db(ctx, 'INSERT', 'inv_stock_freeze', { insertId: result.insertId });

    // 更新库存冻结数量
    await execute(
      'UPDATE inv_inventory SET frozen_qty = COALESCE(frozen_qty, 0) + ?, update_time = NOW() WHERE material_id = ? AND warehouse_id = ?',
      [freeze_quantity, material_id, warehouse_id]
    );
    logger.db(ctx, 'UPDATE', 'stock', { material_id, warehouse_id, freeze_quantity });

    logger.stepEnd(ctx, ts('k_ouse9g'), { insertId: result.insertId });
    return successResponse({ id: result.insertId }, ts('k_q0ku2x'));
  },
  { errorMessage: '操作失败' }
);

// 解冻
export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'freeze', action: 'unfreeze', userId: userInfo.userId, traceId };

    const body = await request.json();
    const { id, action } = body;

    logger.stepStart(ctx, ts('k_9us8sk'), { id, action });

    if (!id) {
      logger.branch(ctx, ts('k_199cfle'), ts('k_1r5h0gw'), false);
      return errorResponse(ts('k_1ebe6wr'), 400, 400);
    }

    if (action === 'unfreeze') {
      logger.branch(ctx, tc('operType'), ts('k_1wrd767'), true);
      const freeze = await query('SELECT * FROM inv_stock_freeze WHERE id = ? AND status = ?', [
        id,
        'active',
      ]);
      logger.db(ctx, 'SELECT', 'inv_stock_freeze', { id, rows: freeze.length });

      if (freeze.length === 0) {
        logger.branch(ctx, ts('k_yzrkvx'), ts('k_qnv08u'), false);
        return errorResponse(ts('k_ww9wi5'), 404, 404);
      }

      const record = freeze[0];
      logger.info(
        ctx,
        `解冻记录: 物料=${record.material_id}, 仓库=${record.warehouse_id}, 数量=${record.freeze_quantity}`
      );

      // 更新冻结记录状态
      await execute(
        `UPDATE inv_stock_freeze SET status = 'released', release_time = NOW(), release_by = ?, update_time = NOW() WHERE id = ?`,
        [userInfo.userId, id]
      );
      logger.db(ctx, 'UPDATE', 'inv_stock_freeze', { id, status: 'released' });

      // 减少库存冻结数量
      await execute(
        'UPDATE inv_inventory SET frozen_qty = GREATEST(COALESCE(frozen_qty, 0) - ?, 0), update_time = NOW() WHERE material_id = ? AND warehouse_id = ?',
        [record.freeze_quantity, record.material_id, record.warehouse_id]
      );
      logger.db(ctx, 'UPDATE', 'stock', {
        material_id: record.material_id,
        warehouse_id: record.warehouse_id,
        unfreeze_qty: record.freeze_quantity,
      });

      logger.stepEnd(ctx, ts('k_1wrd767'));
      return successResponse(null, ts('k_12tthmy'));
    }

    if (action === 'partial_unfreeze') {
      logger.branch(ctx, tc('operType'), ts('k_11icigx'), true);
      const { unfreeze_quantity } = body;
      if (!unfreeze_quantity || unfreeze_quantity <= 0) {
        logger.branch(ctx, ts('k_199cfle'), ts('k_1oiymec'), false, { unfreeze_quantity });
        return errorResponse(ts('k_y2bahl'), 400, 400);
      }

      const freeze = await query('SELECT * FROM inv_stock_freeze WHERE id = ? AND status = ?', [
        id,
        'active',
      ]);
      logger.db(ctx, 'SELECT', 'inv_stock_freeze', { id, rows: freeze.length });

      if (freeze.length === 0) {
        logger.branch(ctx, ts('k_yzrkvx'), ts('k_qnv08u'), false);
        return errorResponse(ts('k_ww9wi5'), 404, 404);
      }

      const record = freeze[0];
      if (unfreeze_quantity > Number(record.freeze_quantity)) {
        logger.branch(ctx, ts('k_1mx6vwt'), ts('k_7os8mq'), false, {
          unfreeze_quantity,
          freeze_quantity: record.freeze_quantity,
        });
        return errorResponse(ts('k_fita5z'), 400, 400);
      }

      const remainQty = Number(record.freeze_quantity) - unfreeze_quantity;
      logger.info(
        ctx,
        `部分解冻: 原冻结=${record.freeze_quantity}, 本次解冻=${unfreeze_quantity}, 剩余=${remainQty}`
      );

      if (remainQty <= 0) {
        logger.branch(ctx, ts('k_lngnek'), ts('k_4m6ws4'), true);
        await execute(
          `UPDATE inv_stock_freeze SET status = 'released', release_time = NOW(), release_by = ?, update_time = NOW() WHERE id = ?`,
          [userInfo.userId, id]
        );
      } else {
        logger.branch(ctx, ts('k_lngnek'), ts('k_1b7rmy2'), true);
        await execute(
          `UPDATE inv_stock_freeze SET freeze_quantity = ?, update_time = NOW() WHERE id = ?`,
          [remainQty, id]
        );
      }

      // 减少库存冻结数量
      await execute(
        'UPDATE inv_inventory SET frozen_qty = GREATEST(COALESCE(frozen_qty, 0) - ?, 0), update_time = NOW() WHERE material_id = ? AND warehouse_id = ?',
        [unfreeze_quantity, record.material_id, record.warehouse_id]
      );
      logger.db(ctx, 'UPDATE', 'stock', {
        material_id: record.material_id,
        warehouse_id: record.warehouse_id,
        unfreeze_qty: unfreeze_quantity,
      });

      logger.stepEnd(ctx, ts('k_11icigx'), { remainQty });
      return successResponse(null, remainQty > 0 ? ts('k_n4ib10') : ts('k_12tthmy'));
    }

    logger.branch(ctx, tc('operType'), ts('k_ucnvo9'), false, { action });
    return errorResponse(ts('k_4ty90w'), 400, 400);
  },
  { errorMessage: '操作失败' }
);
