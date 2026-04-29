import { NextRequest } from 'next/server';
import { query, execute, transaction, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

interface FIFOAllocationItem {
  batch_id: number;
  batch_no: string;
  material_id: number;
  material_code: string;
  material_name: string;
  allocate_qty: number;
  available_qty_before: number;
  unit_cost: number;
  inbound_date: string;
}

interface FIFOAllocationResult {
  material_id: number;
  material_code: string;
  material_name: string;
  required_qty: number;
  total_available: number;
  allocated_qty: number;
  shortage: number;
  allocations: FIFOAllocationItem[];
}

async function allocateFIFO(
  conn: any,
  materialId: number,
  warehouseId: number,
  requiredQty: number
): Promise<FIFOAllocationResult> {
  const [batches]: any = await conn.query(
    `SELECT 
      id, batch_no, material_id, material_code, material_name,
      available_qty, unit_price, inbound_date, unit, expire_date
    FROM inv_inventory_batch 
    WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 'normal'
    ORDER BY
      CASE
        WHEN expire_date IS NOT NULL AND DATEDIFF(expire_date, CURDATE()) <= 30 THEN 0
        WHEN expire_date IS NOT NULL AND DATEDIFF(expire_date, CURDATE()) <= 60 THEN 1
        ELSE 2
      END,
      inbound_date ASC,
      expire_date ASC,
      id ASC
    FOR UPDATE`,
    [materialId, warehouseId]
  );

  const result: FIFOAllocationResult = {
    material_id: materialId,
    material_code: batches.length > 0 ? batches[0].material_code : '',
    material_name: batches.length > 0 ? batches[0].material_name : '',
    required_qty: requiredQty,
    total_available: 0,
    allocated_qty: 0,
    shortage: 0,
    allocations: [],
  };

  result.total_available = batches.reduce(
    (sum: number, b: any) => sum + parseFloat(b.available_qty),
    0
  );

  let remaining = requiredQty;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const availableQty = parseFloat(batch.available_qty);
    const allocateQty = Math.min(remaining, availableQty);

    result.allocations.push({
      batch_id: batch.id,
      batch_no: batch.batch_no,
      material_id: batch.material_id,
      material_code: batch.material_code,
      material_name: batch.material_name,
      allocate_qty: allocateQty,
      available_qty_before: availableQty,
      unit_cost: parseFloat(batch.unit_price) || 0,
      inbound_date: batch.inbound_date,
    });

    remaining -= allocateQty;
    result.allocated_qty += allocateQty;
  }

  result.shortage = Math.max(0, remaining);

  return result;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get('materialId');
  const warehouseId = searchParams.get('warehouseId');
  const requiredQty = parseFloat(searchParams.get('requiredQty') || '0');

  if (!materialId || !warehouseId) {
    return errorResponse('materialId 和 warehouseId 不能为空', 400, 400);
  }

  const batches = await query(
    `SELECT 
      id, batch_no, material_id, material_code, material_name,
      quantity, available_qty, locked_qty, unit, unit_price,
      inbound_date, produce_date, expire_date, status
    FROM inv_inventory_batch 
    WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 'normal'
    ORDER BY
      CASE
        WHEN expire_date IS NOT NULL AND DATEDIFF(expire_date, CURDATE()) <= 30 THEN 0
        WHEN expire_date IS NOT NULL AND DATEDIFF(expire_date, CURDATE()) <= 60 THEN 1
        ELSE 2
      END,
      inbound_date ASC,
      expire_date ASC,
      id ASC`,
    [materialId, warehouseId]
  );

  const totalAvailable = (batches as any[]).reduce(
    (sum, b) => sum + parseFloat(b.available_qty),
    0
  );

  let allocationPlan: FIFOAllocationItem[] = [];
  let shortage = 0;

  if (requiredQty > 0) {
    let remaining = requiredQty;
    for (const batch of batches as any[]) {
      if (remaining <= 0) break;
      const availableQty = parseFloat(batch.available_qty);
      const allocateQty = Math.min(remaining, availableQty);
      allocationPlan.push({
        batch_id: batch.id,
        batch_no: batch.batch_no,
        material_id: batch.material_id,
        material_code: batch.material_code,
        material_name: batch.material_name,
        allocate_qty: allocateQty,
        available_qty_before: availableQty,
        unit_cost: parseFloat(batch.unit_price) || 0,
        inbound_date: batch.inbound_date,
      });
      remaining -= allocateQty;
    }
    shortage = Math.max(0, remaining);
  }

  return successResponse({
    batches,
    total_available: totalAvailable,
    allocation_plan: allocationPlan,
    shortage,
    can_fulfill: shortage === 0,
  });
}, '获取FIFO分配方案失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { warehouseId, warehouseCode, warehouseName, items, operatorId, operatorName, remark, outboundType } = body;

  if (!warehouseId || !items || !Array.isArray(items) || items.length === 0) {
    return errorResponse('warehouseId 和 items 不能为空', 400, 400);
  }

  return await transaction(async (conn) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const [maxOrder]: any = await conn.query(
      `SELECT MAX(order_no) as maxNo FROM inv_outbound_order WHERE order_no LIKE ?`,
      [`CK${dateStr}%`]
    );
    const maxNo = maxOrder[0]?.maxNo;
    const seq = maxNo ? String(parseInt(maxNo.slice(-3)) + 1).padStart(3, '0') : '001';
    const orderNo = `CK${dateStr}${seq}`;

    const allAllocations: FIFOAllocationResult[] = [];
    const allOutboundItems: any[] = [];

    for (const item of items) {
      const { material_id, material_code, material_name, qty, unit, batch_no, batch_id } = item;
      const requiredQty = parseFloat(qty);

      if (batch_id || batch_no) {
        const [batch]: any = await conn.query(
          `SELECT id, batch_no, material_id, material_code, material_name, available_qty, unit_price, inbound_date, unit
           FROM inv_inventory_batch 
           WHERE id = ? OR batch_no = ?
           FOR UPDATE`,
          [batch_id || 0, batch_no || '']
        );

        if (batch.length === 0) {
          throw new Error(`指定批次不存在: ${batch_no || batch_id}`);
        }

        const batchData = batch[0];
        const availableQty = parseFloat(batchData.available_qty);

        if (availableQty < requiredQty) {
          throw new Error(`批次 ${batchData.batch_no} 库存不足: 可用 ${availableQty}, 需要 ${requiredQty}`);
        }

        allAllocations.push({
          material_id: batchData.material_id,
          material_code: batchData.material_code,
          material_name: batchData.material_name,
          required_qty: requiredQty,
          total_available: availableQty,
          allocated_qty: requiredQty,
          shortage: 0,
          allocations: [{
            batch_id: batchData.id,
            batch_no: batchData.batch_no,
            material_id: batchData.material_id,
            material_code: batchData.material_code,
            material_name: batchData.material_name,
            allocate_qty: requiredQty,
            available_qty_before: availableQty,
            unit_cost: parseFloat(batchData.unit_price) || 0,
            inbound_date: batchData.inbound_date,
          }],
        });
      } else {
        const allocation = await allocateFIFO(conn, material_id, warehouseId, requiredQty);
        if (allocation.shortage > 0) {
          throw new Error(`物料 ${material_name || material_code} 库存不足: 需要 ${requiredQty}, 可用 ${allocation.total_available}, 缺少 ${allocation.shortage}`);
        }
        allAllocations.push(allocation);
      }
    }

    let totalQty = 0;
    let totalAmount = 0;

    for (const allocation of allAllocations) {
      for (const alloc of allocation.allocations) {
        const amount = alloc.allocate_qty * alloc.unit_cost;
        allOutboundItems.push({
          material_id: alloc.material_id,
          material_code: alloc.material_code,
          material_name: alloc.material_name,
          batch_no: alloc.batch_no,
          batch_id: alloc.batch_id,
          qty: alloc.allocate_qty,
          unit_cost: alloc.unit_cost,
          amount,
        });
        totalQty += alloc.allocate_qty;
        totalAmount += amount;
      }
    }

    const [orderResult]: any = await conn.execute(
      `INSERT INTO inv_outbound_order (
        order_no, order_date, outbound_type,
        warehouse_id, warehouse_code, warehouse_name,
        total_qty, total_amount, remark, operator_id, operator_name, status
      ) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderNo,
        outboundType || 'production',
        warehouseId,
        warehouseCode || '',
        warehouseName || '',
        totalQty,
        totalAmount,
        remark || '',
        operatorId,
        operatorName,
      ]
    );

    const orderId = orderResult.insertId;

    for (const obItem of allOutboundItems) {
      await conn.execute(
        `INSERT INTO inv_outbound_item (
          order_id, material_id, material_name, material_spec,
          quantity, unit, unit_price, amount, batch_no, remark
        ) VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          obItem.material_id,
          obItem.material_name,
          obItem.qty,
          obItem.unit_code || '个',
          obItem.unit_cost,
          obItem.amount,
          obItem.batch_no,
          `FIFO出库-批次${obItem.batch_no}`,
        ]
      );
    }

    return successResponse({
      orderId,
      orderNo,
      allocations: allAllocations,
      totalQty,
      totalAmount,
      outboundItemCount: allOutboundItems.length,
    }, 'FIFO出库单创建成功');
  });
}, 'FIFO出库失败');

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { orderId, operatorId, operatorName, remark } = body;

  if (!orderId) {
    return errorResponse('orderId 不能为空', 400, 400);
  }

  return await transaction(async (conn) => {
    const [orders]: any = await conn.query(
      `SELECT id, order_no, status, warehouse_id, warehouse_code FROM inv_outbound_order WHERE id = ? AND deleted = 0`,
      [orderId]
    );

    if (orders.length === 0) {
      throw new Error('出库单不存在');
    }

    const order = orders[0];

    if (order.status === 'completed') {
      throw new Error('出库单已完成，不能重复确认');
    }

    const [items]: any = await conn.query(
      `SELECT id, material_id, material_name, quantity, unit, batch_no FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
      [orderId]
    );

    if (items.length === 0) {
      throw new Error('出库单没有明细');
    }

    const deductionDetails: any[] = [];

    for (const item of items) {
      const requiredQty = parseFloat(item.quantity);

      if (item.batch_no) {
        const [batch]: any = await conn.query(
          `SELECT id, batch_no, available_qty, unit_price FROM inv_inventory_batch 
           WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0
           FOR UPDATE`,
          [item.batch_no, item.material_id, order.warehouse_id]
        );

        if (batch.length === 0) {
          throw new Error(`批次 ${item.batch_no} 不存在`);
        }

        const availableQty = parseFloat(batch[0].available_qty);
        if (availableQty < requiredQty) {
          throw new Error(`批次 ${item.batch_no} 库存不足: 可用 ${availableQty}, 需要 ${requiredQty}`);
        }

        await conn.execute(
          `UPDATE inv_inventory_batch SET
            quantity = quantity - ?,
            available_qty = available_qty - ?,
            version = version + 1,
            update_time = NOW()
          WHERE id = ?`,
          [requiredQty, requiredQty, batch[0].id]
        );

        deductionDetails.push({
          batch_id: batch[0].id,
          batch_no: item.batch_no,
          material_id: item.material_id,
          deducted_qty: requiredQty,
          unit_cost: parseFloat(batch[0].unit_price) || 0,
        });
      } else {
        const allocation = await allocateFIFO(conn, item.material_id, order.warehouse_id, requiredQty);

        if (allocation.shortage > 0) {
          throw new Error(`物料 ${item.material_name} 库存不足: 需要 ${requiredQty}, 可用 ${allocation.total_available}`);
        }

        for (const alloc of allocation.allocations) {
          await conn.execute(
            `UPDATE inv_inventory_batch SET
              quantity = quantity - ?,
              available_qty = available_qty - ?,
              version = version + 1,
              update_time = NOW()
            WHERE id = ?`,
            [alloc.allocate_qty, alloc.allocate_qty, alloc.batch_id]
          );

          deductionDetails.push({
            batch_id: alloc.batch_id,
            batch_no: alloc.batch_no,
            material_id: alloc.material_id,
            deducted_qty: alloc.allocate_qty,
            unit_cost: alloc.unit_cost,
          });
        }
      }

      await conn.execute(
        `UPDATE inv_inventory SET
          quantity = quantity - ?,
          available_qty = available_qty - ?,
          update_time = NOW()
        WHERE material_id = ? AND warehouse_id = ?`,
        [requiredQty, requiredQty, item.material_id, order.warehouse_id]
      );

      await conn.execute(
        `INSERT INTO inv_inventory_transaction (
          trans_no, trans_type, batch_no, material_id, material_code, material_name,
          warehouse_id, warehouse_code, quantity, source_type, source_no,
          operated_by, operated_at, remark
        ) VALUES (?, 'outbound', ?, ?, ?, ?, ?, ?, ?, 'outbound_order', ?, ?, NOW(), ?)`,
        [
          `OUT${Date.now()}${item.id}`,
          item.batch_no || '',
          item.material_id,
          '',
          item.material_name,
          order.warehouse_id,
          order.warehouse_code || '',
          -requiredQty,
          order.order_no,
          operatorId,
          remark || '',
        ]
      );
    }

    await conn.execute(
      `UPDATE inv_outbound_order SET
        status = 'completed',
        audit_status = 1,
        auditor_id = ?,
        auditor_name = ?,
        audit_time = NOW(),
        audit_remark = ?,
        update_time = NOW()
      WHERE id = ?`,
      [operatorId, operatorName, remark || '', orderId]
    );

    return successResponse({
      orderId,
      orderNo: order.order_no,
      status: 'completed',
      deductionDetails,
      totalDeductedBatches: deductionDetails.length,
    }, 'FIFO出库确认成功，库存已按先进先出扣减');
  });
}, 'FIFO出库确认失败');
