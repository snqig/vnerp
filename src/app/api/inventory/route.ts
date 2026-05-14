import { NextRequest } from 'next/server';
import { query, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
  logOperation,
} from '@/lib/api-response';
import { allocateFIFO, executeFIFODeductionWithRetry } from '@/lib/fifo-allocation';
import { generateTransNo, generateBatchNo } from '@/lib/utils';

class InventoryError extends Error {
  type: 'notFound' | 'conflict' | 'insufficient';
  constructor(message: string, type: 'notFound' | 'conflict' | 'insufficient') {
    super(message);
    this.type = type;
  }
}

function handleInventoryError(error: unknown) {
  if (error instanceof InventoryError) {
    if (error.type === 'notFound') return commonErrors.notFound(error.message);
    return errorResponse(error.message, 409, 409);
  }
  throw error;
}

function calculateAlertLevel(availableQty: number, safetyStock?: number): string {
  if (availableQty <= 0) return 'critical';
  if (safetyStock && availableQty < safetyStock) return 'warning';
  if (availableQty < 10) return 'warning';
  return 'normal';
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get('warehouseId');
  const status = searchParams.get('status');
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `
    SELECT
      ib.id,
      ib.batch_no,
      ib.material_id,
      ib.material_name,
      m.specification as material_spec,
      m.material_code,
      ib.warehouse_id,
      ib.warehouse_name,
      ib.quantity,
      ib.available_qty,
      ib.locked_qty,
      ib.unit,
      ib.unit_price,
      ib.status,
      ib.produce_date,
      ib.expire_date,
      ib.inbound_date,
      ib.create_time,
      m.safety_stock
    FROM inv_inventory_batch ib
    LEFT JOIN inv_material m ON ib.material_id = m.id
    WHERE ib.deleted = 0
  `;
  const values: any[] = [];

  if (warehouseId && warehouseId !== 'all') {
    sql += ' AND ib.warehouse_id = ?';
    values.push(parseInt(warehouseId));
  }

  if (status && status !== 'all') {
    sql += ' AND ib.status = ?';
    values.push(status);
  }

  if (keyword) {
    sql += ' AND (ib.batch_no LIKE ? OR ib.material_name LIKE ? OR m.material_code LIKE ?)';
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword, likeKeyword);
  }

  let countSql = `SELECT COUNT(*) as total FROM inv_inventory_batch ib LEFT JOIN inv_material m ON ib.material_id = m.id WHERE ib.deleted = 0`;
  const countValues: any[] = [];

  if (warehouseId && warehouseId !== 'all') {
    countSql += ' AND ib.warehouse_id = ?';
    countValues.push(parseInt(warehouseId));
  }

  if (status && status !== 'all') {
    countSql += ' AND ib.status = ?';
    countValues.push(status);
  }

  if (keyword) {
    countSql += ' AND (ib.batch_no LIKE ? OR ib.material_name LIKE ? OR m.material_code LIKE ?)';
    const likeKeyword = `%${keyword}%`;
    countValues.push(likeKeyword, likeKeyword, likeKeyword);
  }

  const countResult = await query(countSql, countValues);
  const total = (countResult as any[])[0]?.total || 0;

  sql += ' ORDER BY ib.create_time DESC';
  sql += ' LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const data = await query(sql, values);

  const processedData = (data as any[]).map((item) => ({
    ...item,
    alertLevel: calculateAlertLevel(
      parseFloat(item.available_qty) || 0,
      item.safety_stock ? parseFloat(item.safety_stock) : undefined
    ),
  }));

  return successResponse({
    list: processedData,
    total,
    page,
    pageSize,
  });
}, '获取库存列表失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { action, batchNo, quantity, warehouseId, materialId, sourceType, sourceNo } = body;

  const validation = validateRequestBody(body, ['action', 'quantity']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  if (action === 'inbound') {
    const inboundValidation = validateRequestBody(body, ['warehouseId', 'materialId']);
    if (!inboundValidation.valid) {
      return errorResponse(
        `入库操作缺少必填字段: ${inboundValidation.missing.join(', ')}`,
        400,
        400
      );
    }

    const material = await queryOne<any>(
      'SELECT id, material_name, material_code, unit, purchase_price FROM inv_material WHERE id = ? AND deleted = 0',
      [materialId]
    );
    if (!material) {
      return commonErrors.notFound('物料不存在');
    }

    const warehouse = await queryOne<any>(
      'SELECT id, warehouse_name FROM inv_warehouse WHERE id = ? AND deleted = 0',
      [warehouseId]
    );
    if (!warehouse) {
      return commonErrors.notFound('仓库不存在');
    }

    const batchNoNew = generateBatchNo('B');
    const transNo = generateTransNo('IN');

    const batchId = await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty, unit, unit_price, inbound_date, status, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURDATE(), 'normal', NOW())`,
        [
          batchNoNew,
          materialId,
          material.material_name,
          warehouseId,
          warehouse.warehouse_name,
          quantity,
          quantity,
          material.unit || '个',
          material.purchase_price || 0,
        ]
      );

      const [idRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const newBatchId = idRows[0].id;

      await conn.execute(
        `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, material_id, material_code, batch_no, warehouse_id, quantity, unit_cost, total_cost, remark, create_time)
         VALUES (?, 'in', ?, ?, ?, ?, ?, ?, ?, ?, '入库操作', NOW())`,
        [
          transNo,
          sourceType || 'manual',
          materialId,
          material.material_code,
          batchNoNew,
          warehouseId,
          quantity,
          material.purchase_price || 0,
          quantity * (material.purchase_price || 0),
        ]
      );

      await conn.execute(
        `INSERT INTO inv_inventory_log (warehouse_id, material_id, batch_no, trans_type, quantity, before_qty, after_qty, unit, source_type, source_no, create_time)
         VALUES (?, ?, ?, 'in', ?, 0, ?, ?, ?, ?, NOW())`,
        [
          warehouseId,
          materialId,
          batchNoNew,
          quantity,
          quantity,
          material.unit || '个',
          sourceType || 'manual',
          sourceNo || transNo,
        ]
      );

      return newBatchId;
    });

    await logOperation({
      title: '库存入库',
      oper_type: 'inventory',
      oper_method: 'POST',
      oper_url: '/api/inventory',
      oper_param: JSON.stringify({
        action: 'inbound',
        batchNo: batchNoNew,
        quantity,
        warehouseId,
        materialId,
      }),
      oper_result: '入库成功',
      status: 1,
    });

    return successResponse(
      {
        transNo,
        batchNo: batchNoNew,
        batchId,
        quantity,
        warehouseId,
        materialId,
      },
      '入库成功'
    );
  } else if (action === 'outbound') {
    const outboundValidation = validateRequestBody(body, ['quantity']);
    if (!outboundValidation.valid) {
      return errorResponse(
        `出库操作缺少必填字段: ${outboundValidation.missing.join(', ')}`,
        400,
        400
      );
    }

    if (quantity <= 0) {
      return errorResponse('出库数量必须大于0', 400, 400);
    }

    const transNo = generateTransNo('OUT');

    try {
      if (batchNo) {
        const specifiedBatchValidation = validateRequestBody(body, ['batchNo']);
        if (!specifiedBatchValidation.valid) {
          return errorResponse(
            `指定批次出库缺少必填字段: ${specifiedBatchValidation.missing.join(', ')}`,
            400,
            400
          );
        }

        const result = await transaction(async (conn) => {
          const [batchRows]: any = await conn.execute(
            'SELECT id, batch_no, material_id, material_name, warehouse_id, available_qty, quantity, unit, unit_price, version FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0 FOR UPDATE',
            [batchNo]
          );

          if (!batchRows || batchRows.length === 0) {
            throw new InventoryError('库存批次不存在', 'notFound');
          }

          const batch = batchRows[0];

          if (parseFloat(batch.available_qty) < quantity) {
            throw new InventoryError('可用库存不足', 'insufficient');
          }

          const [fifoBatches]: any = await conn.query(
            `SELECT id, batch_no FROM inv_inventory_batch
             WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 'normal'
             ORDER BY
               CASE
                 WHEN expire_date IS NOT NULL AND DATEDIFF(expire_date, CURDATE()) <= 30 THEN 0
                 WHEN expire_date IS NOT NULL AND DATEDIFF(expire_date, CURDATE()) <= 60 THEN 1
                 ELSE 2
               END,
               inbound_date ASC, expire_date ASC, id ASC
             LIMIT 1`,
            [batch.material_id, batch.warehouse_id]
          );

          const isFifoRecommended = fifoBatches.length > 0 && fifoBatches[0].batch_no === batchNo;

          const newAvailableQty = parseFloat(batch.available_qty) - quantity;
          const newQuantity = parseFloat(batch.quantity) - quantity;

          const [updateResult]: any = await conn.execute(
            'UPDATE inv_inventory_batch SET available_qty = ?, quantity = ?, version = version + 1, update_time = NOW() WHERE id = ? AND version = ?',
            [newAvailableQty, newQuantity, batch.id, batch.version]
          );

          if (updateResult.affectedRows === 0) {
            throw new InventoryError('库存已被修改，请重试', 'conflict');
          }

          await conn.execute(
            `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, material_id, batch_no, warehouse_id, quantity, unit_cost, total_cost, remark, create_time)
             VALUES (?, 'out', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              transNo,
              sourceType || 'manual',
              batch.material_id,
              batchNo,
              batch.warehouse_id,
              quantity,
              batch.unit_price,
              quantity * parseFloat(batch.unit_price || 0),
              isFifoRecommended ? '指定批次出库(FIFO推荐)' : '指定批次出库(非FIFO推荐-手动覆盖)',
            ]
          );

          await conn.execute(
            `INSERT INTO inv_inventory_log (warehouse_id, material_id, batch_no, trans_type, quantity, before_qty, after_qty, unit, source_type, source_no, create_time)
             VALUES (?, ?, ?, 'out', ?, ?, ?, ?, ?, ?, NOW())`,
            [
              batch.warehouse_id,
              batch.material_id,
              batchNo,
              quantity,
              batch.available_qty,
              newAvailableQty,
              batch.unit,
              sourceType || 'manual',
              sourceNo || transNo,
            ]
          );

          try {
            await conn.execute(
              `INSERT INTO inv_outbound_batch_allocation (
                source_type, source_id, source_no, warehouse_id,
                material_id, batch_id, batch_no, allocated_qty, unit_cost, total_cost,
                fifo_mode, operator_id, operator_name
              ) VALUES ('inventory_out', 0, ?, ?, ?, ?, ?, ?, ?, ?, 'specified_batch', NULL, NULL)`,
              [
                transNo,
                batch.warehouse_id,
                batch.material_id,
                batch.id,
                batchNo,
                quantity,
                parseFloat(batch.unit_price) || 0,
                quantity * (parseFloat(batch.unit_price) || 0),
              ]
            );
          } catch (e) {
            console.error('[库存] 出库批次分配记录写入失败:', e);
          }

          return { batchNo, quantity, batch, isFifoRecommended };
        });

        await logOperation({
          title: '库存出库-指定批次',
          oper_type: 'inventory',
          oper_method: 'POST',
          oper_url: '/api/inventory',
          oper_param: JSON.stringify({
            action: 'outbound',
            batchNo,
            quantity,
            fifoRecommended: result.isFifoRecommended,
          }),
          oper_result: result.isFifoRecommended
            ? '指定批次出库成功(FIFO推荐批次)'
            : '指定批次出库成功(非FIFO推荐批次-手动覆盖)',
          status: 1,
        });

        return successResponse(
          {
            transNo,
            batchNo: result.batchNo,
            quantity,
            fifoRecommended: result.isFifoRecommended,
            warning: result.isFifoRecommended
              ? undefined
              : '当前出库批次不是FIFO推荐批次，存在过期物料风险',
            operatedAt: new Date().toISOString(),
          },
          '出库成功'
        );
      } else {
        const fifoValidation = validateRequestBody(body, ['materialId', 'warehouseId']);
        if (!fifoValidation.valid) {
          return errorResponse(
            `FIFO出库缺少必填字段: ${fifoValidation.missing.join(', ')}，或指定batchNo`,
            400,
            400
          );
        }

        const material = await queryOne<any>(
          'SELECT id, material_name, material_code, unit FROM inv_material WHERE id = ? AND deleted = 0',
          [materialId]
        );
        if (!material) {
          return commonErrors.notFound('物料不存在');
        }

        const warehouse = await queryOne<any>(
          'SELECT id, warehouse_name, warehouse_code FROM inv_warehouse WHERE id = ? AND deleted = 0',
          [warehouseId]
        );
        if (!warehouse) {
          return commonErrors.notFound('仓库不存在');
        }

        const result = await transaction(async (conn) => {
          const allocation = await allocateFIFO(conn, materialId, warehouseId, quantity);

          if (allocation.shortage > 0) {
            throw new InventoryError(
              `物料 ${material.material_name} 库存不足: 需要 ${quantity}, 可用 ${allocation.total_available}, 缺少 ${allocation.shortage}`,
              'insufficient'
            );
          }

          const { deductionDetails, totalCost } = await executeFIFODeductionWithRetry(
            conn,
            allocation,
            {
              sourceType: 'inventory_out',
              sourceId: 0,
              sourceNo: transNo,
              warehouseId,
              warehouseCode: warehouse.warehouse_code || '',
              operatorId: null,
              operatorName: null,
            }
          );

          for (const detail of deductionDetails) {
            await conn.execute(
              `INSERT INTO inv_inventory_log (warehouse_id, material_id, batch_no, trans_type, quantity, before_qty, after_qty, unit, source_type, source_no, create_time)
               VALUES (?, ?, ?, 'out', ?, ?, ?, ?, ?, ?, NOW())`,
              [
                warehouseId,
                materialId,
                detail.batch_no,
                detail.deducted_qty,
                detail.available_qty_before || 0,
                (detail.available_qty_before || 0) - detail.deducted_qty,
                material.unit || '个',
                sourceType || 'fifo',
                sourceNo || transNo,
              ]
            );
          }

          return { allocation, deductionDetails, totalCost };
        });

        await logOperation({
          title: '库存出库-FIFO',
          oper_type: 'inventory',
          oper_method: 'POST',
          oper_url: '/api/inventory',
          oper_param: JSON.stringify({
            action: 'outbound',
            materialId,
            warehouseId,
            quantity,
            fifoMode: true,
          }),
          oper_result: `FIFO出库成功，扣减${result.deductionDetails.length}个批次，总成本${result.totalCost.toFixed(2)}`,
          status: 1,
        });

        return successResponse(
          {
            transNo,
            materialId,
            warehouseId,
            quantity,
            allocatedQty: result.allocation.allocated_qty,
            fifoMode: true,
            batchDetails: result.deductionDetails.map((d: any) => ({
              batchNo: d.batch_no,
              deductedQty: d.deducted_qty,
              unitCost: d.unit_cost,
              lineCost: d.line_cost,
            })),
            totalCost: result.totalCost,
            operatedAt: new Date().toISOString(),
          },
          'FIFO出库成功'
        );
      }
    } catch (error) {
      return handleInventoryError(error);
    }
  } else if (action === 'transfer') {
    const transferValidation = validateRequestBody(body, ['batchNo', 'warehouseId']);
    if (!transferValidation.valid) {
      return errorResponse(
        `调拨操作缺少必填字段: ${transferValidation.missing.join(', ')}`,
        400,
        400
      );
    }

    const transNo = generateTransNo('TRF');

    try {
      const result = await transaction(async (conn) => {
        const [batchRows]: any = await conn.execute(
          'SELECT id, batch_no, material_id, material_name, warehouse_id, warehouse_name, available_qty, quantity, unit, unit_price, version FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0 FOR UPDATE',
          [batchNo]
        );

        if (!batchRows || batchRows.length === 0) {
          throw new InventoryError('库存批次不存在', 'notFound');
        }

        const batch = batchRows[0];

        const [warehouseRows]: any = await conn.execute(
          'SELECT id, warehouse_name FROM inv_warehouse WHERE id = ? AND deleted = 0 FOR UPDATE',
          [warehouseId]
        );

        if (!warehouseRows || warehouseRows.length === 0) {
          throw new InventoryError('目标仓库不存在', 'notFound');
        }

        const targetWarehouse = warehouseRows[0];
        const fromWarehouseId = batch.warehouse_id;
        const fromWarehouseName = batch.warehouse_name;

        const [updateResult]: any = await conn.execute(
          'UPDATE inv_inventory_batch SET warehouse_id = ?, warehouse_name = ?, version = version + 1, update_time = NOW() WHERE id = ? AND version = ?',
          [warehouseId, targetWarehouse.warehouse_name, batch.id, batch.version]
        );

        if (updateResult.affectedRows === 0) {
          throw new InventoryError('库存已被修改，请重试', 'conflict');
        }

        await conn.execute(
          `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, material_id, batch_no, warehouse_id, quantity, unit_cost, total_cost, remark, create_time)
           VALUES (?, 'transfer', ?, ?, ?, ?, ?, ?, ?, '调拨操作', NOW())`,
          [
            transNo,
            sourceType || 'manual',
            batch.material_id,
            batchNo,
            warehouseId,
            batch.quantity,
            batch.unit_price,
            parseFloat(batch.quantity) * parseFloat(batch.unit_price || 0),
          ]
        );

        await conn.execute(
          `INSERT INTO inv_inventory_log (warehouse_id, material_id, batch_no, trans_type, quantity, before_qty, after_qty, unit, source_type, source_no, create_time)
           VALUES (?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?, NOW())`,
          [
            fromWarehouseId,
            batch.material_id,
            batchNo,
            batch.quantity,
            batch.available_qty,
            batch.available_qty,
            batch.unit,
            sourceType || 'manual',
            sourceNo || transNo,
          ]
        );

        return {
          batchNo,
          quantity,
          fromWarehouseId,
          fromWarehouseName,
          toWarehouseId: warehouseId,
          toWarehouseName: targetWarehouse.warehouse_name,
        };
      });

      await logOperation({
        title: '库存调拨',
        oper_type: 'inventory',
        oper_method: 'POST',
        oper_url: '/api/inventory',
        oper_param: JSON.stringify({ action: 'transfer', batchNo, quantity, warehouseId }),
        oper_result: '调拨成功',
        status: 1,
      });

      return successResponse(result, '调拨成功');
    } catch (error) {
      return handleInventoryError(error);
    }
  }

  return commonErrors.badRequest('未知操作类型');
}, '库存操作失败');
