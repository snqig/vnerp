import { NextRequest } from 'next/server';
import { query, transaction } from '@/lib/db';
import { successResponse, errorResponse, logOperation } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { allocateFIFO, planFIFOAllocation } from '@/lib/fifo-allocation';

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

export const GET = withPermission(
  async (request: NextRequest, _userInfo) => {
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
      WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 1
      ORDER BY
        CASE WHEN split_flag = 2 THEN 0 ELSE 1 END ASC,
        CASE WHEN opened_at IS NOT NULL THEN 0 ELSE 1 END ASC,
        expire_date ASC,
        inbound_date ASC,
        id ASC`,
      [materialId, warehouseId]
    );

    const totalAvailable = (batches as Loose[]).reduce(
      (sum, b) => sum + parseFloat(b.available_qty),
      0
    );

    const allocationPlan: FIFOAllocationItem[] = [];
    let shortage = 0;

    if (requiredQty > 0) {
      const allocation = await planFIFOAllocation(
        { query },
        parseInt(materialId),
        parseInt(warehouseId),
        requiredQty
      );

      allocationPlan.push(
        ...allocation.allocations.map((a) => ({
          batch_id: a.batch_id,
          batch_no: a.batch_no,
          material_id: a.material_id,
          material_code: a.material_code,
          material_name: a.material_name,
          allocate_qty: a.allocate_qty,
          available_qty_before: a.available_qty_before,
          unit_cost: a.unit_cost,
          inbound_date: a.inbound_date,
        }))
      );
      shortage = allocation.shortage;
    }

    return successResponse({
      batches,
      total_available: totalAvailable,
      allocation_plan: allocationPlan,
      shortage,
      can_fulfill: shortage === 0,
    });
  },
  { errorMessage: '获取FIFO分配方案失败' }
);

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const {
      warehouseId,
      warehouseCode,
      warehouseName,
      items,
      operatorId,
      operatorName,
      remark,
      outboundType,
    } = body;

    if (!warehouseId || !items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('warehouseId 和 items 不能为空', 400, 400);
    }

    return await transaction(async (conn) => {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const [maxOrder]: Loose = await conn.query(
        `SELECT MAX(order_no) as maxNo FROM inv_outbound_order WHERE order_no LIKE ?`,
        [`CK${dateStr}%`]
      );
      const maxNo = maxOrder[0]?.maxNo;
      const seq = maxNo ? String(parseInt(maxNo.slice(-3)) + 1).padStart(3, '0') : '001';
      const orderNo = `CK${dateStr}${seq}`;

      const allAllocations: FIFOAllocationResult[] = [];
      const allOutboundItems: Loose[] = [];

      for (const item of items) {
        const {
          material_id,
          material_code,
          material_name,
          qty,
          unit: _unit,
          batch_no,
          batch_id,
        } = item;
        const requiredQty = parseFloat(qty);

        if (batch_id || batch_no) {
          const [batch]: Loose = await conn.query(
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
            throw new Error(
              `批次 ${batchData.batch_no} 库存不足: 可用 ${availableQty}, 需要 ${requiredQty}`
            );
          }

          allAllocations.push({
            material_id: batchData.material_id,
            material_code: batchData.material_code,
            material_name: batchData.material_name,
            required_qty: requiredQty,
            total_available: availableQty,
            allocated_qty: requiredQty,
            shortage: 0,
            allocations: [
              {
                batch_id: batchData.id,
                batch_no: batchData.batch_no,
                material_id: batchData.material_id,
                material_code: batchData.material_code,
                material_name: batchData.material_name,
                allocate_qty: requiredQty,
                available_qty_before: availableQty,
                unit_cost: parseFloat(batchData.unit_price) || 0,
                inbound_date: batchData.inbound_date,
              },
            ],
          });
        } else {
          const allocation = await allocateFIFO(conn, material_id, warehouseId, requiredQty);
          if (allocation.shortage > 0) {
            throw new Error(
              `物料 ${material_name || material_code} 库存不足: 需要 ${requiredQty}, 可用 ${allocation.total_available}, 缺少 ${allocation.shortage}`
            );
          }
          allAllocations.push(allocation);
        }
      }

      let totalQty = 0;
      let totalAmount = 0;

      for (const allocation of allAllocations) {
        for (const alloc of allocation.allocations) {
          const amount = alloc.allocate_qty * alloc.unit_cost;

          const [lockResult]: Loose = await conn.execute(
            `UPDATE inv_inventory_batch SET
              locked_qty = locked_qty + ?,
              available_qty = available_qty - ?
            WHERE id = ? AND available_qty >= ?`,
            [alloc.allocate_qty, alloc.allocate_qty, alloc.batch_id, alloc.allocate_qty]
          );

          if (lockResult.affectedRows === 0) {
            throw new Error(`批次 ${alloc.batch_no} 库存(可用量)不足或已被其他单据锁定，无法预留`);
          }

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

      const [orderResult]: Loose = await conn.execute(
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
            obItem.unit || '个',
            obItem.unit_cost,
            obItem.amount,
            obItem.batch_no,
            `FIFO出库-批次${obItem.batch_no}`,
          ]
        );
      }

      const result = {
        orderId,
        orderNo,
        allocations: allAllocations,
        totalQty,
        totalAmount,
        outboundItemCount: allOutboundItems.length,
      };

      await logOperation({
        title: 'FIFO出库',
        oper_name: operatorName,
        oper_type: 'warehouse',
        oper_method: 'POST',
        oper_url: '/api/warehouse/outbound/fifo',
        oper_param: JSON.stringify({ warehouseId, outboundType, totalQty, totalAmount }),
        oper_result: `FIFO出库单 ${orderNo} 创建成功，共${allOutboundItems.length}项`,
        status: 1,
      });

      return successResponse(result, 'FIFO出库单创建成功');
    });
  },
  { errorMessage: 'FIFO出库失败' }
);

export const PATCH = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { orderId, operatorId, operatorName, remark } = body;

    if (!orderId) {
      return errorResponse('orderId 不能为空', 400, 400);
    }

    return await transaction(async (conn) => {
      const [orders]: Loose = await conn.execute(
        `SELECT id, order_no, status, warehouse_id, warehouse_code, version FROM inv_outbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
        [orderId]
      );

      if (orders.length === 0) {
        throw new Error('出库单不存在');
      }

      const order = orders[0];

      if (order.status === 'completed') {
        throw new Error('出库单已完成，不能重复确认');
      }

      const [items]: Loose = await conn.execute(
        `SELECT id, material_id, material_name, quantity, unit, batch_no FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
        [orderId]
      );

      if (items.length === 0) {
        throw new Error('出库单没有明细');
      }

      const deductionDetails: Loose[] = [];

      for (const item of items) {
        const requiredQty = parseFloat(item.quantity);

        const [batchRows]: Loose = await conn.execute(
          `SELECT id, batch_no, locked_qty, quantity, unit_price, version FROM inv_inventory_batch
           WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0
           FOR UPDATE`,
          [item.batch_no, item.material_id, order.warehouse_id]
        );

        if (batchRows.length === 0) {
          throw new Error(`批次 ${item.batch_no} 不存在`);
        }

        const batch = batchRows[0];
        const lockedQty = parseFloat(batch.locked_qty || 0);
        if (lockedQty < requiredQty) {
          throw new Error(
            `批次 ${item.batch_no} 预留锁定不足: 锁定 ${lockedQty}, 需要 ${requiredQty}（可用量已由建单时预留）`
          );
        }

        const [deductResult]: Loose = await conn.execute(
          `UPDATE inv_inventory_batch SET
            locked_qty = locked_qty - ?,
            quantity = quantity - ?,
            version = version + 1,
            update_time = NOW()
          WHERE id = ? AND locked_qty >= ? AND version = ?`,
          [requiredQty, requiredQty, batch.id, requiredQty, batch.version]
        );

        if (deductResult.affectedRows === 0) {
          throw new Error(`批次 ${item.batch_no} 扣减失败，可能已被其他操作修改，请刷新后重试`);
        }

        const [currentInv]: Loose = await conn.query(
          'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
          [item.material_id, order.warehouse_id]
        );
        const beforeQty = currentInv.length > 0 ? parseFloat(currentInv[0].quantity) : 0;
        const afterQty = beforeQty - requiredQty;

        await conn.execute(
          `INSERT INTO inv_inventory_log (
            material_id, warehouse_id, batch_no, operation_type, operation_qty,
            before_qty, after_qty, business_type, business_no, remark, operator_id, create_time
          ) VALUES (?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            item.material_id,
            order.warehouse_id,
            item.batch_no,
            requiredQty,
            beforeQty,
            afterQty,
            'outbound_order',
            order.order_no,
            `FIFO出库确认-批次${item.batch_no}`,
            operatorId || null,
          ]
        );

        deductionDetails.push({
          batch_id: batch.id,
          batch_no: item.batch_no,
          material_id: item.material_id,
          deducted_qty: requiredQty,
          unit_cost: parseFloat(batch.unit_price) || 0,
        });
      }

      const [orderUpdateResult]: Loose = await conn.execute(
        `UPDATE inv_outbound_order SET
        status = 'completed',
        audit_status = 1,
        auditor_id = ?,
        auditor_name = ?,
        audit_time = NOW(),
        audit_remark = ?,
        version = version + 1,
        update_time = NOW()
      WHERE id = ? AND version = ?`,
        [operatorId, operatorName, remark || '', orderId, order.version]
      );
      if (orderUpdateResult.affectedRows === 0) {
        throw new Error('出库单版本冲突，可能已被其他操作修改，请刷新后重试');
      }

      const result = {
        orderId,
        orderNo: order.order_no,
        status: 'completed',
        deductionDetails,
        totalDeductedBatches: deductionDetails.length,
      };

      await logOperation({
        title: 'FIFO出库确认',
        oper_name: operatorName,
        oper_type: 'warehouse',
        oper_method: 'PATCH',
        oper_url: '/api/warehouse/outbound/fifo',
        oper_param: JSON.stringify({ orderId, operatorId }),
        oper_result: `FIFO出库单 ${order.order_no} 确认成功，扣减${deductionDetails.length}个批次`,
        status: 1,
      });

      return successResponse(result, 'FIFO出库确认成功，库存已按先进先出扣减');
    });
  },
  { errorMessage: 'FIFO出库确认失败' }
);
