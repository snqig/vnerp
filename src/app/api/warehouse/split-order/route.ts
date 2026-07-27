import { NextRequest } from 'next/server';
import { query, transaction, execute } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  logOperation,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getEventBus } from '@/infrastructure/event-bus/EventBus';
import { SplitOrderAuditedEvent } from '@/domain/cutting/events/SplitOrderEvents';
import Decimal from 'decimal.js';

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    let where = 'WHERE s.deleted = 0';
    const params: (string | number)[] = [];

    if (status) {
      where += ' AND s.status = ?';
      params.push(parseInt(status));
    }
    if (keyword) {
      where += ' AND (s.split_no LIKE ? OR m.material_name LIKE ? OR m.material_code LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (startDate) {
      where += ' AND s.split_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND s.split_date <= ?';
      params.push(endDate);
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM split_order s LEFT JOIN inv_material m ON s.material_id = m.id ${where}`,
      params
    );
    const total = (countResult as Loose[])[0]?.total || 0;

    const offset = (page - 1) * pageSize;
    const rows = await query(
      `SELECT s.*, m.material_code, m.specification,
        (SELECT COUNT(*) FROM split_order_detail WHERE split_id = s.id) as detail_count
      FROM split_order s
      LEFT JOIN inv_material m ON s.material_id = m.id
      ${where}
      ORDER BY s.create_time DESC
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const totalPages = Math.ceil(total / pageSize);
    return paginatedResponse(rows || [], { page, pageSize, total, totalPages });
  },
  { errorMessage: '获取分切单列表失败' }
);

export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const { parentBatchId, warehouseId, remark, details, operatorId, operatorName } = body;

    if (!parentBatchId || !details || !Array.isArray(details) || details.length === 0) {
      return errorResponse('母料批次和分切明细不能为空', 400, 400);
    }

    return await transaction(async (conn) => {
      const [parentBatch]: Loose = await conn.query(
        `SELECT id, batch_no, material_id, material_name, available_qty, quantity, unit_price, width, length, unit
         FROM inv_inventory_batch WHERE id = ? AND deleted = 0 FOR UPDATE`,
        [parentBatchId]
      );

      if (!parentBatch || parentBatch.length === 0) {
        throw new Error('母料批次不存在');
      }

      const batch = parentBatch[0];
      const availableQty = parseFloat(batch.available_qty);
      let totalOutQty = new Decimal(0);
      let totalWasteQty = new Decimal(0);

      for (const d of details) {
        const qty = new Decimal(d.totalQty || 0);
        if (d.isWaste) {
          totalWasteQty = totalWasteQty.plus(qty);
        } else {
          totalOutQty = totalOutQty.plus(qty);
        }
      }

      const totalQty = totalOutQty.plus(totalWasteQty);

      if (totalQty.greaterThan(availableQty)) {
        throw new Error(`分切总数(${totalQty.toNumber()})超过母料可用量(${availableQty})`);
      }

      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const [maxOrder]: Loose = await conn.query(
        `SELECT MAX(split_no) as maxNo FROM split_order WHERE split_no LIKE ?`,
        [`FJ${dateStr}%`]
      );
      const maxNo = (maxOrder as Loose[])[0]?.maxNo;
      const seq = maxNo ? String(parseInt(maxNo.slice(-4)) + 1).padStart(4, '0') : '0001';
      const splitNo = `FJ${dateStr}${seq}`;

      const [orderResult]: Loose = await conn.execute(
        `INSERT INTO split_order (
          split_no, split_date, parent_batch_id, material_id, material_name,
          warehouse_id, out_qty, total_waste, status, remark,
          operator_id, operator_name, create_by
        ) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [
          splitNo,
          parentBatchId,
          batch.material_id,
          batch.material_name,
          warehouseId,
          totalOutQty.toNumber(),
          totalWasteQty.toNumber(),
          remark || '',
          operatorId || null,
          operatorName || '',
          operatorId || null,
        ]
      );

      const splitId = (orderResult as { insertId: number }).insertId;

      for (const d of details) {
        await conn.execute(
          `INSERT INTO split_order_detail (
            split_id, pieces, qty_per_piece, total_qty, width, is_waste, remark
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            splitId,
            d.pieces || 1,
            d.qtyPerPiece || 0,
            d.totalQty || 0,
            d.width || 0,
            d.isWaste ? 1 : 0,
            d.remark || '',
          ]
        );
      }

      await logOperation({
        title: '创建分切单',
        oper_name: operatorName,
        oper_type: 'warehouse',
        oper_method: 'POST',
        oper_url: '/api/warehouse/split-order',
        oper_param: JSON.stringify({ parentBatchId, splitNo, totalQty: totalQty.toNumber() }),
        oper_result: `分切单 ${splitNo} 创建成功`,
        status: 1,
      });

      return successResponse({ splitId, splitNo }, '分切单创建成功');
    });
  },
  { errorMessage: '创建分切单失败' }
);

export const PATCH = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const { splitId, action, operatorId, operatorName } = body;

    if (!splitId) {
      return errorResponse('splitId不能为空', 400, 400);
    }

    return await transaction(async (conn) => {
      const [orders]: Loose = await conn.query(
        `SELECT s.*, ib.available_qty, ib.quantity, ib.unit_price, ib.unit, ib.width, ib.length,
          ib.material_id, ib.material_name, ib.warehouse_id, ib.batch_type,
          m.material_code, m.width as m_width
        FROM split_order s
        JOIN inv_inventory_batch ib ON s.parent_batch_id = ib.id
        LEFT JOIN inv_material m ON s.material_id = m.id
        WHERE s.id = ? AND s.deleted = 0 FOR UPDATE`,
        [splitId]
      );

      if (!orders || orders.length === 0) {
        throw new Error('分切单不存在');
      }

      const order = orders[0];

      if (action === 'audit') {
        if (order.status !== 0) {
          throw new Error('分切单状态不正确，只能审核草稿状态的分切单');
        }

        const [details]: Loose = await conn.query(
          `SELECT * FROM split_order_detail WHERE split_id = ?`,
          [splitId]
        );

        if (!details || details.length === 0) {
          throw new Error('分切单没有明细');
        }

        const parentAvailableQty = parseFloat(order.available_qty);
        let totalOutQty = new Decimal(0);
        let totalWasteQty = new Decimal(0);

        for (const d of details) {
          const qty = new Decimal(d.total_qty);
          if (d.is_waste) {
            totalWasteQty = totalWasteQty.plus(qty);
          } else {
            totalOutQty = totalOutQty.plus(qty);
          }
        }

        const totalQty = totalOutQty.plus(totalWasteQty);

        if (totalQty.greaterThan(new Decimal(parentAvailableQty))) {
          throw new Error(
            `分切总数(${totalQty.toNumber()})超过母料可用量(${parentAvailableQty}), 请调整明细`
          );
        }

        const totalCostDecimal = new Decimal(order.out_qty || 0).times(order.unit_price || 0);
        const childBatchIds: number[] = [];
        const parentBatchId = order.parent_batch_id;
        const warehouseId = order.warehouse_id;

        for (const d of details) {
          if (d.is_waste) continue;

          const childWidth = parseFloat(d.width) || parseFloat(order.m_width || order.width) || 0;

          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const [maxChildBatch]: Loose = await conn.query(
            `SELECT MAX(batch_no) as maxNo FROM inv_inventory_batch WHERE batch_no LIKE ?`,
            [`SC${dateStr}%`]
          );
          const maxChildNo = (maxChildBatch as Loose[])[0]?.maxNo;
          const childSeq = maxChildNo
            ? String(parseInt(maxChildNo.slice(-4)) + 1).padStart(4, '0')
            : '0001';
          const childBatchNo = `SC${dateStr}${childSeq}`;

          const pieceCost = totalCostDecimal.times(new Decimal(d.total_qty)).div(totalOutQty);

          const [batchResult]: Loose = await conn.execute(
            `INSERT INTO inv_inventory_batch (
              batch_no, material_id, material_code, material_name,
              warehouse_id, quantity, available_qty, locked_qty,
              unit, unit_price, width, batch_type, parent_batch_id,
              inbound_date, produce_date, status, create_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, ?, CURDATE(), CURDATE(), 1, ?)`,
            [
              childBatchNo,
              order.material_id,
              order.material_code || '',
              order.material_name,
              warehouseId,
              d.total_qty,
              d.total_qty,
              order.unit || '米',
              pieceCost.toNumber(),
              childWidth,
              parentBatchId,
              operatorId || null,
            ]
          );

          const childBatchId = (batchResult as { insertId: number }).insertId;
          childBatchIds.push(childBatchId);

          await conn.execute(
            `UPDATE split_order_detail SET child_batch_id = ?, child_batch_no = ?, allocated_cost = ? WHERE id = ?`,
            [childBatchId, childBatchNo, pieceCost.toNumber(), d.id]
          );
        }

        const parentCost = new Decimal(order.out_qty || 0).times(order.unit_price || 0);

        await conn.execute(
          `UPDATE inv_inventory_batch SET
            quantity = quantity - ?,
            available_qty = available_qty - ?,
            version = version + 1,
            update_time = NOW()
          WHERE id = ? AND version = ?`,
          [totalQty.toNumber(), totalQty.toNumber(), parentBatchId, order.version]
        );

        await conn.execute(
          `INSERT INTO inv_inventory_log (material_id, warehouse_id, batch_no, operation_type,
            operation_qty, before_qty, after_qty, business_type, business_no, remark, operator_id, create_time)
          SELECT ?, ?, ?, 2, ?, ?, ?, 'split_order', ?, ?, ?, NOW()`,
          [
            order.material_id,
            warehouseId,
            order.batch_no || '',
            totalQty.toNumber(),
            parentAvailableQty,
            parentAvailableQty - totalQty.toNumber(),
            order.split_no,
            `分切出库-${order.split_no}`,
            operatorId,
          ]
        );

        if (totalWasteQty.greaterThan(0)) {
          const wasteCost = totalCostDecimal.times(totalWasteQty).div(totalQty);
          await conn.execute(
            `INSERT INTO inv_inventory_log (material_id, warehouse_id, batch_no, operation_type,
              operation_qty, before_qty, after_qty, business_type, business_no, remark, operator_id, create_time)
            VALUES (?, ?, ?, 3, ?, 0, ?, 'split_order', ?, ?, ?, NOW())`,
            [
              order.material_id,
              warehouseId,
              order.batch_no || '',
              totalWasteQty.toNumber(),
              totalWasteQty.negated().toNumber(),
              order.split_no,
              `分切损耗-${order.split_no}(${totalWasteQty.toNumber()})`,
              operatorId,
            ]
          );
        }

        for (const d of details) {
          if (d.is_waste) continue;
          await conn.execute(
            `INSERT INTO inv_inventory_log (material_id, warehouse_id, batch_no, operation_type,
              operation_qty, before_qty, after_qty, business_type, business_no, remark, operator_id, create_time)
            VALUES (?, ?, ?, 1, ?, 0, ?, 'split_order', ?, ?, ?, NOW())`,
            [
              order.material_id,
              warehouseId,
              d.child_batch_no || '',
              d.total_qty,
              d.total_qty,
              order.split_no,
              `分切入库-${order.split_no}`,
              operatorId,
            ]
          );
        }

        const now = new Date();
        await conn.execute(
          `UPDATE split_order SET status = 1, total_cost = ?,
            audit_time = ?, auditor_id = ?, auditor_name = ?,
            version = version + 1, update_time = NOW()
          WHERE id = ? AND version = ?`,
          [totalCostDecimal.toNumber(), now, operatorId, operatorName || '', splitId, order.version]
        );

        const eventBus = getEventBus();
        await eventBus.publish(
          new SplitOrderAuditedEvent({
            splitId,
            splitNo: order.split_no,
            parentBatchId,
            materialId: order.material_id,
            warehouseId,
            childBatchIds,
            totalCost: totalCostDecimal.toNumber(),
            auditorId: operatorId,
            auditorName: operatorName || '',
          })
        );

        await logOperation({
          title: '审核分切单',
          oper_name: operatorName,
          oper_type: 'warehouse',
          oper_method: 'PATCH',
          oper_url: '/api/warehouse/split-order',
          oper_param: JSON.stringify({ splitId, action: 'audit' }),
          oper_result: `分切单 ${order.split_no} 审核通过`,
          status: 1,
        });

        return successResponse(
          {
            splitId,
            splitNo: order.split_no,
            status: 1,
            childBatchIds,
            childCount: childBatchIds.length,
            totalCost: totalCostDecimal.toNumber(),
            wasteQty: totalWasteQty.toNumber(),
          },
          '分切单审核通过，库存已更新'
        );
      }

      if (action === 'void') {
        if (order.status !== 0) {
          throw new Error('只能作废草稿状态的分切单');
        }

        await conn.execute(
          `UPDATE split_order SET status = 3, version = version + 1, update_time = NOW() WHERE id = ? AND version = ?`,
          [splitId, order.version]
        );

        return successResponse(null, '分切单已作废');
      }

      throw new Error(`不支持的操作: ${action}`);
    });
  },
  { errorMessage: '操作分切单失败' }
);
