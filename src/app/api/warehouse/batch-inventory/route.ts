import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

// 获取批次库存列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const materialKeyword = searchParams.get('materialKeyword') || '';
  const batchNo = searchParams.get('batchNo') || '';
  const warehouseId = searchParams.get('warehouseId') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (materialKeyword) {
    whereClause += ' AND (bi.material_name LIKE ? OR bi.material_code LIKE ?)';
    params.push(`%${materialKeyword}%`, `%${materialKeyword}%`);
  }

  if (batchNo) {
    whereClause += ' AND bi.batch_no = ?';
    params.push(batchNo);
  }

  if (warehouseId) {
    whereClause += ' AND bi.warehouse_id = ?';
    params.push(warehouseId);
  }

  if (status) {
    whereClause += ' AND bi.status = ?';
    params.push(status);
  }

  const offset = (page - 1) * pageSize;
  const [rows]: any = await query(
    `SELECT bi.*, w.warehouse_name 
     FROM inv_batch_inventory bi
     LEFT JOIN inv_warehouse w ON bi.warehouse_id = w.id
     ${whereClause}
     ORDER BY bi.inbound_date ASC, bi.batch_no ASC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const [countRows]: any = await query(
    `SELECT COUNT(*) as total FROM inv_batch_inventory bi ${whereClause}`,
    params
  );

  return successResponse({
    list: rows,
    total: countRows[0].total,
    page,
    pageSize
  });
});

// 获取可用批次列表（用于出库时选择）
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { material_id, warehouse_id, required_qty } = body;

  if (!material_id) {
    return errorResponse('物料ID不能为空', 400, 400);
  }

  let whereClause = 'WHERE bi.material_id = ? AND bi.available_quantity > 0 AND bi.status = 1';
  const params: any[] = [material_id];

  if (warehouse_id) {
    whereClause += ' AND bi.warehouse_id = ?';
    params.push(warehouse_id);
  }

  // 按入库日期升序（先进先出）
  const [rows]: any = await query(
    `SELECT bi.*, w.warehouse_name 
     FROM inv_batch_inventory bi
     LEFT JOIN inv_warehouse w ON bi.warehouse_id = w.id
     ${whereClause}
     ORDER BY bi.inbound_date ASC, bi.batch_no ASC`,
    params
  );

  // 计算自动分配方案（先进先出）
  let remaining = required_qty || 0;
  const allocationPlan: any[] = [];

  if (required_qty) {
    for (const batch of rows) {
      if (remaining <= 0) break;
      const allocateQty = Math.min(remaining, parseFloat(batch.available_quantity));
      allocationPlan.push({
        batch_inventory_id: batch.id,
        batch_no: batch.batch_no,
        warehouse_id: batch.warehouse_id,
        warehouse_name: batch.warehouse_name,
        allocate_qty: allocateQty,
        available_qty: batch.available_quantity
      });
      remaining -= allocateQty;
    }
  }

  return successResponse({
    batches: rows,
    allocation_plan: allocationPlan,
    total_available: rows.reduce((sum: number, b: any) => sum + parseFloat(b.available_quantity), 0),
    shortage: remaining > 0 ? remaining : 0
  });
});

// 入库操作（新增批次库存）
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const {
    inbound_no,
    warehouse_id,
    inbound_date,
    items,
    remark
  } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return errorResponse('入库明细不能为空', 400, 400);
  }

  return await transaction(async (conn) => {
    // 1. 创建入库单
    const [orderResult]: any = await conn.execute(
      `INSERT INTO inv_production_inbound (inbound_no, warehouse_id, inbound_date, qc_status, status, operator_name, remark) 
       VALUES (?, ?, ?, 1, 2, '系统', ?)`,
      [inbound_no || `IN${Date.now()}`, warehouse_id, inbound_date || new Date().toISOString().split('T')[0], remark || '']
    );
    const inboundId = orderResult.insertId;

    // 2. 处理每个入库明细
    for (const item of items) {
      const { material_id, material_code, material_name, specification, unit, quantity, batch_no, supplier_id, supplier_name } = item;

      // 生成批次号（如果没有提供）
      const finalBatchNo = batch_no || `B${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      // 2a. 插入入库明细
      await conn.execute(
        `INSERT INTO inv_production_inbound_item (inbound_id, material_id, material_code, material_name, quantity, unit, batch_no, remaining_qty, remark) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [inboundId, material_id, material_code, material_name, quantity, unit, finalBatchNo, quantity, remark || '']
      );

      // 2b. 检查批次库存是否已存在
      const [existing]: any = await conn.execute(
        `SELECT id, inbound_quantity, available_quantity FROM inv_batch_inventory 
         WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?`,
        [finalBatchNo, material_id, warehouse_id]
      );

      if (existing.length > 0) {
        // 更新已有批次
        await conn.execute(
          `UPDATE inv_batch_inventory 
           SET inbound_quantity = inbound_quantity + ?, 
               available_quantity = available_quantity + ?,
               status = 1
           WHERE id = ?`,
          [quantity, quantity, existing[0].id]
        );
      } else {
        // 创建新批次
        await conn.execute(
          `INSERT INTO inv_batch_inventory (batch_no, material_id, material_code, material_name, specification, unit, warehouse_id, inbound_no, inbound_date, inbound_quantity, outbound_quantity, available_quantity, supplier_id, supplier_name, qc_status, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, 1)`,
          [finalBatchNo, material_id, material_code, material_name, specification || '', unit, warehouse_id, inbound_no, inbound_date, quantity, quantity, supplier_id || null, supplier_name || '']
        );
      }

      // 2c. 更新总库存表
      await conn.execute(
        `INSERT INTO inv_inventory (warehouse_id, material_id, material_code, material_name, total_qty, available_qty, unit, update_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
           total_qty = total_qty + VALUES(total_qty),
           available_qty = available_qty + VALUES(available_qty),
           update_time = NOW()`,
        [warehouse_id, material_id, material_code, material_name, quantity, quantity, unit]
      );
    }

    return successResponse({ inbound_id: inboundId, inbound_no }, '入库成功，批次库存已更新');
  });
});

// 出库操作（扣减批次库存）
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const {
    outbound_no,
    customer_id,
    customer_name,
    warehouse_id,
    outbound_date,
    items,
    remark
  } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return errorResponse('出库明细不能为空', 400, 400);
  }

  return await transaction(async (conn) => {
    // 1. 创建出库单
    const [orderResult]: any = await conn.execute(
      `INSERT INTO inv_sales_outbound (outbound_no, customer_id, customer_name, warehouse_id, outbound_date, status, remark) 
       VALUES (?, ?, ?, ?, ?, 2, ?)`,
      [outbound_no || `SO${Date.now()}`, customer_id || null, customer_name || '', warehouse_id, outbound_date || new Date().toISOString().split('T')[0], remark || '']
    );
    const outboundId = orderResult.insertId;

    // 2. 处理每个出库明细
    for (const item of items) {
      const { material_id, material_code, material_name, unit, quantity, batch_inventory_id, batch_no, remark: itemRemark } = item;

      let targetBatchId = batch_inventory_id;
      let targetBatchNo = batch_no;

      // 如果没有指定批次，自动按先进先出分配
      if (!targetBatchId) {
        const [availableBatches]: any = await conn.execute(
          `SELECT id, batch_no, available_quantity FROM inv_batch_inventory 
           WHERE material_id = ? AND warehouse_id = ? AND available_quantity > 0 AND status = 1
           ORDER BY inbound_date ASC, batch_no ASC`,
          [material_id, warehouse_id]
        );

        if (availableBatches.length === 0) {
          return errorResponse(`物料 ${material_name} 无可用库存`, 400, 400);
        }

        // 找到第一个有足够库存的批次
        for (const batch of availableBatches) {
          if (parseFloat(batch.available_quantity) >= quantity) {
            targetBatchId = batch.id;
            targetBatchNo = batch.batch_no;
            break;
          }
        }

        if (!targetBatchId) {
          // 如果单个批次库存不足，使用第一个批次（部分出库）
          targetBatchId = availableBatches[0].id;
          targetBatchNo = availableBatches[0].batch_no;
        }
      }

      // 3. 校验批次库存
      const [batch]: any = await conn.execute(
        `SELECT id, batch_no, material_code, material_name, available_quantity, unit 
         FROM inv_batch_inventory WHERE id = ? FOR UPDATE`,
        [targetBatchId]
      );

      if (batch.length === 0) {
        return errorResponse(`批次库存不存在`, 400, 400);
      }

      const availableQty = parseFloat(batch[0].available_quantity);
      if (availableQty < quantity) {
        return errorResponse(
          `批次 ${batch[0].batch_no} 可用库存不足：可用 ${availableQty} ${batch[0].unit}，需要 ${quantity} ${unit || batch[0].unit}`,
          400,
          400
        );
      }

      // 4. 扣减批次库存
      await conn.execute(
        `UPDATE inv_batch_inventory 
         SET outbound_quantity = outbound_quantity + ?, 
             available_quantity = available_quantity - ?,
             status = CASE WHEN (available_quantity - ?) <= 0 THEN 2 ELSE status END
         WHERE id = ?`,
        [quantity, quantity, quantity, targetBatchId]
      );

      // 5. 插入出库明细
      await conn.execute(
        `INSERT INTO inv_sales_outbound_item (outbound_id, material_id, material_code, material_name, quantity, unit, batch_no, batch_inventory_id, remark) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [outboundId, material_id, material_code, material_name, quantity, unit || batch[0].unit, targetBatchNo, targetBatchId, itemRemark || '']
      );

      // 6. 更新总库存表
      await conn.execute(
        `UPDATE inv_inventory 
         SET total_qty = total_qty - ?, 
             available_qty = available_qty - ?,
             update_time = NOW()
         WHERE warehouse_id = ? AND material_id = ?`,
        [quantity, quantity, warehouse_id, material_id]
      );
    }

    return successResponse({ outbound_id: outboundId, outbound_no }, '出库成功，批次库存已扣减');
  });
});
