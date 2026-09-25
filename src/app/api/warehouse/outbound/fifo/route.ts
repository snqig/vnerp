import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, transaction } from '@/lib/db';
import { successResponse, errorResponse, logOperation } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { allocateFIFO, planFIFOAllocation } from '@/lib/fifo-allocation';
import { appendInventoryTransaction, recomputeInventorySummary, appendInventoryLog } from '@/lib/inventory-ledger';
import type { DbRow, DbResultSetHeader } from '@/types/db';

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
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const materialCode = searchParams.get('materialCode');
    const warehouseId = searchParams.get('warehouseId');
    const requiredQty = parseFloat(searchParams.get('requiredQty') || '0');

    if (!warehouseId) {
      return errorResponse(ts('k_mfawgd'), 400, 400);
    }

    // 解析物料：优先 materialId，其次用 materialCode 反查
    let resolvedMaterialId: number | null = materialId ? parseInt(materialId) : null;
    let materialInfo: { materialName?: string; specification?: string; unit?: string } | null =
      null;
    if (!resolvedMaterialId && materialCode) {
      const mrows = await query(
        'SELECT id, material_name, specification, unit FROM inv_material WHERE material_code = ? AND deleted = 0 LIMIT 1',
        [materialCode]
      );
      if (mrows.length > 0) {
        resolvedMaterialId = Number(mrows[0].id ?? 0);
        materialInfo = {
          materialName: String(mrows[0].material_name ?? ''),
          specification: String(mrows[0].specification ?? ''),
          unit: String(mrows[0].unit ?? ''),
        };
      }
    }
    if (!resolvedMaterialId || isNaN(resolvedMaterialId)) {
      return errorResponse(
        materialCode ? `物料编码不存在: ${materialCode}` : ts('k_xgqql5'),
        400,
        400
      );
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
      [resolvedMaterialId, warehouseId]
    );

    const totalAvailable = batches.reduce(
      (sum, b) => sum + parseFloat(String(b.available_qty ?? 0)),
      0
    );

    const allocationPlan: FIFOAllocationItem[] = [];
    let shortage = 0;

    if (requiredQty > 0) {
      const allocation = await planFIFOAllocation(
        { query } as unknown as import('@/types/db').DbConnection,
        resolvedMaterialId,
        Number(warehouseId),
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
      material: materialInfo,
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
  const ts = await getTranslations('Common');
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
      return errorResponse(ts('k_1yisuzp'), 400, 400);
    }

    return await transaction(async (conn) => {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const [maxOrder] = await conn.query(
        `SELECT MAX(order_no) as maxNo FROM inv_outbound_order WHERE order_no LIKE ?`,
        [`CK${dateStr}%`]
      );
      const maxNo = maxOrder[0]?.maxNo;
      const seq = maxNo ? String(parseInt(String(maxNo).slice(-3)) + 1).padStart(3, '0') : '001';
      const orderNo = `CK${dateStr}${seq}`;

      const allAllocations: FIFOAllocationResult[] = [];
      const allOutboundItems: Array<{ material_id: number; material_code: string; material_name: string; batch_no: string; batch_id: number; qty: number; unit_cost: number; amount: number; unit?: string }> = [];

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
        const requiredQty = parseFloat(String(qty ?? 0));

        if (batch_id || batch_no) {
          const [batch] = await conn.query(
            `SELECT id, batch_no, material_id, material_code, material_name, available_qty, unit_price, inbound_date, unit
           FROM inv_inventory_batch
           WHERE id = ? OR batch_no = ?
           FOR UPDATE`,
            [Number(batch_id ?? 0), String(batch_no ?? '')]
          );

          if (batch.length === 0) {
            throw new Error(`指定批次不存在: ${batch_no || batch_id}`);
          }

          const batchData = batch[0];
          const availableQty = parseFloat(String(batchData.available_qty ?? 0));

          if (availableQty < requiredQty) {
            throw new Error(
              `批次 ${String(batchData.batch_no ?? '')} 库存不足: 可用 ${availableQty}, 需要 ${requiredQty}`
            );
          }

          allAllocations.push({
            material_id: Number(batchData.material_id ?? 0),
            material_code: String(batchData.material_code ?? ''),
            material_name: String(batchData.material_name ?? ''),
            required_qty: requiredQty,
            total_available: availableQty,
            allocated_qty: requiredQty,
            shortage: 0,
            allocations: [
              {
                batch_id: Number(batchData.id ?? 0),
                batch_no: String(batchData.batch_no ?? ''),
                material_id: Number(batchData.material_id ?? 0),
                material_code: String(batchData.material_code ?? ''),
                material_name: String(batchData.material_name ?? ''),
                allocate_qty: requiredQty,
                available_qty_before: availableQty,
                unit_cost: parseFloat(String(batchData.unit_price ?? 0)) || 0,
                inbound_date: String(batchData.inbound_date ?? ''),
              },
            ],
          });
        } else {
          const allocation = await allocateFIFO(conn, Number(material_id ?? 0), Number(warehouseId ?? 0), requiredQty);
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

          const [lockResult] = await conn.execute<DbResultSetHeader>(
            `UPDATE inv_inventory_batch SET
              locked_qty = locked_qty + ?,
              available_qty = available_qty - ?
            WHERE id = ? AND available_qty >= ?`,
            [Number(alloc.allocate_qty), Number(alloc.allocate_qty), Number(alloc.batch_id), Number(alloc.allocate_qty)]
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

      const [orderResult] = await conn.execute<DbResultSetHeader>(
        `INSERT INTO inv_outbound_order (
        order_no, order_date, outbound_type,
        warehouse_id, warehouse_code, warehouse_name,
        total_qty, total_amount, remark, operator_id, operator_name, status
      ) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          orderNo,
          String(outboundType || 'production'),
          Number(warehouseId),
          String(warehouseCode || ''),
          String(warehouseName || ''),
          Number(totalQty),
          Number(totalAmount),
          String(remark || ''),
          Number(operatorId ?? 0),
          String(operatorName || ''),
        ]
      );

      const orderId = orderResult.insertId;

      for (const obItem of allOutboundItems) {
        await conn.execute(
          `INSERT INTO inv_outbound_item (
          order_id, material_id, material_name, material_spec,
          quantity, unit, unit_price, amount, batch_no, remark, is_raw_material
        ) VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)`,
          [
            Number(orderId),
            Number(obItem.material_id),
            String(obItem.material_name),
            Number(obItem.qty),
            String(obItem.unit || ts('k_d5a1x9')),
            Number(obItem.unit_cost),
            Number(obItem.amount),
            String(obItem.batch_no),
            `FIFO出库-批次${String(obItem.batch_no)}`,
            0,
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
        title: ts('k_mw6d3g'),
        oper_name: operatorName,
        oper_type: 'warehouse',
        oper_method: 'POST',
        oper_url: '/api/warehouse/outbound/fifo',
        oper_param: JSON.stringify({ warehouseId, outboundType, totalQty, totalAmount }),
        oper_result: `FIFO出库单 ${orderNo} 创建成功，共${allOutboundItems.length}项`,
        status: 1,
      });

      return successResponse(result, ts('k_1kgbuyn'));
    });
  },
  { errorMessage: 'FIFO出库失败' }
);

export const PATCH = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { orderId, operatorId, operatorName, remark } = body;

    if (!orderId) {
      return errorResponse(ts('k_1ov2t54'), 400, 400);
    }

    return await transaction(async (conn) => {
      const [orders] = await conn.query(
        `SELECT id, order_no, status, warehouse_id, warehouse_code, version FROM inv_outbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
        [Number(orderId)]
      );

      if (orders.length === 0) {
        throw new Error(ts('k_14l2xo0'));
      }

      const order = orders[0];

      if (String(order.status) === 'completed') {
        throw new Error(ts('k_1598o1d'));
      }

      const [items] = await conn.query(
        `SELECT id, material_id, material_name, quantity, unit, batch_no FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
        [Number(orderId)]
      );

      if (items.length === 0) {
        throw new Error(ts('k_1q5was7'));
      }

      const deductionDetails: Array<{ batch_id: number; batch_no: string; material_id: number; deducted_qty: number; unit_cost: number }> = [];

      for (const item of items) {
        const requiredQty = parseFloat(String(item.quantity ?? 0));

        const [batchRows] = await conn.query(
          `SELECT id, batch_no, locked_qty, quantity, unit_price, version FROM inv_inventory_batch
           WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0
           FOR UPDATE`,
          [String(item.batch_no), Number(item.material_id), Number(order.warehouse_id)]
        );

        if (batchRows.length === 0) {
          throw new Error(`批次 ${String(item.batch_no)} 不存在`);
        }

        const batch = batchRows[0];
        const lockedQty = parseFloat(String(batch.locked_qty ?? 0));
        if (lockedQty < requiredQty) {
          throw new Error(
            `批次 ${String(item.batch_no)} 预留锁定不足: 锁定 ${lockedQty}, 需要 ${requiredQty}（可用量已由建单时预留）`
          );
        }

        const [deductResult] = await conn.execute<DbResultSetHeader>(
          `UPDATE inv_inventory_batch SET
            locked_qty = locked_qty - ?,
            quantity = quantity - ?,
            version = version + 1,
            update_time = NOW()
          WHERE id = ? AND locked_qty >= ? AND version = ?`,
          [Number(requiredQty), Number(requiredQty), Number(batch.id), Number(requiredQty), Number(batch.version ?? 0)]
        );

        if (deductResult.affectedRows === 0) {
          throw new Error(`批次 ${item.batch_no} 扣减失败，可能已被其他操作修改，请刷新后重试`);
        }

        const [currentInv] = await conn.query(
          'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
          [Number(item.material_id), Number(order.warehouse_id)]
        );
        const beforeQty = currentInv.length > 0 ? parseFloat(String(currentInv[0].quantity ?? 0)) : 0;
        const afterQty = beforeQty - requiredQty;

        await appendInventoryLog(conn, {
          materialId: Number(item.material_id ?? 0),
          warehouseId: Number(order.warehouse_id ?? 0),
          batchNo: String(item.batch_no ?? ''),
          operationType: 2,
          operationQty: requiredQty,
          beforeQty,
          afterQty,
          businessType: 'outbound_order',
          businessNo: String(order.order_no ?? ''),
          remark: `FIFO出库确认-批次${String(item.batch_no)}`,
          operatorId: Number(operatorId ?? 0) || null,
        });

        deductionDetails.push({
          batch_id: Number(batch.id ?? 0),
          batch_no: String(item.batch_no ?? ''),
          material_id: Number(item.material_id ?? 0),
          deducted_qty: requiredQty,
          unit_cost: parseFloat(String(batch.unit_price ?? 0)) || 0,
        });

        // 流水账：FIFO 出库确认写入财务级流水
        await appendInventoryTransaction(conn, {
          transType: 'out',
          sourceType: 'outbound_order',
          sourceId: Number(orderId),
          materialId: Number(item.material_id ?? 0),
          batchNo: String(item.batch_no ?? ''),
          warehouseId: Number(order.warehouse_id ?? 0),
          quantity: requiredQty,
          referenceNo: String(order.order_no ?? ''),
          remark: `FIFO出库确认-批次${String(item.batch_no)}`,
          createBy: Number(operatorId ?? 0) || null,
        });
        // 汇总表派生重算：汇总 = SUM(批次)，杜绝双写漂移
        await recomputeInventorySummary(conn, Number(item.material_id ?? 0), Number(order.warehouse_id ?? 0));
      }

      const [orderUpdateResult] = await conn.execute<DbResultSetHeader>(
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
        [Number(operatorId ?? 0), String(operatorName ?? ''), String(remark ?? ''), Number(orderId), Number(order.version ?? 0)]
      );
      if (orderUpdateResult.affectedRows === 0) {
        throw new Error(ts('k_166xnaj'));
      }

      const result = {
        orderId,
        orderNo: order.order_no,
        status: 'completed',
        deductionDetails,
        totalDeductedBatches: deductionDetails.length,
      };

      await logOperation({
        title: ts('k_rfwhl2'),
        oper_name: operatorName,
        oper_type: 'warehouse',
        oper_method: 'PATCH',
        oper_url: '/api/warehouse/outbound/fifo',
        oper_param: JSON.stringify({ orderId, operatorId }),
        oper_result: `FIFO出库单 ${order.order_no} 确认成功，扣减${deductionDetails.length}个批次`,
        status: 1,
      });

      return successResponse(result, ts('k_8pi72y'));
    });
  },
  { errorMessage: 'FIFO出库确认失败' }
);
