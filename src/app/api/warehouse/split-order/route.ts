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
import { appendInventoryTransaction, recomputeInventorySummary, appendInventoryLog } from '@/lib/inventory-ledger';
import Decimal from 'decimal.js';
import type { DbRow } from '@/types/db';

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
    const total = (countResult as DbRow[])[0]?.total || 0;

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
      const [parentBatch] = await conn.query(
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
      const [maxOrder] = await conn.query(
        `SELECT MAX(split_no) as maxNo FROM split_order WHERE split_no LIKE ?`,
        [`FJ${dateStr}%`]
      );
      const maxNo = (maxOrder as DbRow[])[0]?.maxNo;
      const seq = maxNo ? String(parseInt(maxNo.slice(-4)) + 1).padStart(4, '0') : '0001';
      const splitNo = `FJ${dateStr}${seq}`;

      const [orderResult] = await conn.execute(
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
      const [orders] = await conn.query(
        `SELECT s.*, ib.available_qty, ib.quantity, ib.unit_price, ib.unit, ib.width, ib.length,
          ib.material_id, ib.material_name, ib.warehouse_id, ib.batch_type, ib.version as batch_version,
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

        const [details] = await conn.query(`SELECT * FROM split_order_detail WHERE split_id = ?`, [
          splitId,
        ]);

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

        // 尺寸类物料(宽×长>0)按"面积"守恒；其它(重量/件数)按卷/重量直接扣。
        const motherWidth = new Decimal(parseFloat(order.width) || 0);
        const motherLength = new Decimal(parseFloat(order.length) || 0);
        const isDimensional = motherWidth.greaterThan(0) && motherLength.greaterThan(0);
        const motherAreaPerRoll = motherWidth.times(motherLength);

        // 母料扣减量（折算成母卷当量）：面积类 = (子批面积 + 损耗面积) / 母卷面积；否则直接按卷数。
        let deductQty = totalQty;
        let consumedArea: Decimal | null = null;
        if (isDimensional) {
          let childrenArea = new Decimal(0);
          for (const d of details) {
            if (d.is_waste) continue;
            const childWidth = new Decimal(
              parseFloat(d.width) || parseFloat(order.m_width || order.width) || 0
            );
            childrenArea = childrenArea.plus(
              childWidth.times(motherLength).times(new Decimal(d.total_qty))
            );
          }
          const wasteArea = totalWasteQty.times(motherAreaPerRoll);
          consumedArea = childrenArea.plus(wasteArea);
          deductQty = consumedArea.div(motherAreaPerRoll);
        }

        if (isDimensional) {
          const motherAreaAvail = motherAreaPerRoll.times(new Decimal(parentAvailableQty));
          if ((consumedArea as Decimal).greaterThan(motherAreaAvail)) {
            throw new Error(
              `分切总面积(${(consumedArea as Decimal).toNumber()})超过母料可用面积(${motherAreaAvail.toNumber()}), 请调整明细`
            );
          }
        } else if (totalQty.greaterThan(new Decimal(parentAvailableQty))) {
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
          const childLength = isDimensional ? motherLength.toNumber() : 0;
          const childArea = isDimensional
            ? new Decimal(childWidth).times(motherLength).times(new Decimal(d.total_qty)).toNumber()
            : null;

          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const [maxChildBatch] = await conn.query(
            `SELECT MAX(batch_no) as maxNo FROM inv_inventory_batch WHERE batch_no LIKE ?`,
            [`SC${dateStr}%`]
          );
          const maxChildNo = (maxChildBatch as DbRow[])[0]?.maxNo;
          const childSeq = maxChildNo
            ? String(parseInt(maxChildNo.slice(-4)) + 1).padStart(4, '0')
            : '0001';
          const childBatchNo = `SC${dateStr}${childSeq}`;

          const pieceCost = totalCostDecimal.times(new Decimal(d.total_qty)).div(totalOutQty);

          const [batchResult] = await conn.execute(
            `INSERT INTO inv_inventory_batch (
              batch_no, material_id, material_code, material_name,
              warehouse_id, quantity, available_qty, locked_qty,
              unit, unit_price, width, length, area, batch_type, parent_batch_id,
              inbound_date, produce_date, status, create_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1, ?, CURDATE(), CURDATE(), 1, ?)`,
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
              childLength,
              childArea,
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

          // 财务级库存流水（子批 'in' 入库），与批次新增同事务。
          await appendInventoryTransaction(conn, {
            transType: 'in',
            sourceType: 'split_order',
            sourceId: splitId,
            sourceLineId: d.id,
            materialId: order.material_id,
            batchNo: childBatchNo,
            warehouseId,
            quantity: d.total_qty,
            unitPrice: pieceCost.toNumber(),
            totalAmount: pieceCost.toNumber(),
            referenceNo: order.split_no,
            remark: `分切入库-${order.split_no}`,
            createBy: operatorId || null,
          });
        }

        const parentCost = new Decimal(order.out_qty || 0).times(order.unit_price || 0);

        const deductNum = deductQty.toNumber();
        let motherUpdRes: unknown;
        if (isDimensional) {
          // 母批面积 = 宽×长×当前数量；扣减 consumedArea（面积守恒，卷数按当量折算）。
          const motherQty = new Decimal(parseFloat(order.quantity) || 0);
          const newArea = motherWidth
            .times(motherLength)
            .times(motherQty)
            .minus(consumedArea as Decimal);
          motherUpdRes = await conn.execute(
            `UPDATE inv_inventory_batch SET
              quantity = quantity - ?,
              available_qty = available_qty - ?,
              area = ?,
              version = version + 1,
              update_time = NOW()
            WHERE id = ? AND version = ?`,
            [deductNum, deductNum, newArea.toNumber(), parentBatchId, order.batch_version]
          );
        } else {
          motherUpdRes = await conn.execute(
            `UPDATE inv_inventory_batch SET
              quantity = quantity - ?,
              available_qty = available_qty - ?,
              version = version + 1,
              update_time = NOW()
            WHERE id = ? AND version = ?`,
            [deductNum, deductNum, parentBatchId, order.batch_version]
          );
        }
        const motherUpd = (Array.isArray(motherUpdRes) ? motherUpdRes[0] : motherUpdRes) as {
          affectedRows?: number;
        };
        if ((motherUpd?.affectedRows ?? 0) === 0) {
          throw new Error('母料库存扣减失败：批次版本冲突或已被修改，请刷新后重试');
        }

        // 财务级库存流水（母料 'out' 出库，含良品与损耗），与母料扣减同事务。
        await appendInventoryTransaction(conn, {
          transType: 'out',
          sourceType: 'split_order',
          sourceId: splitId,
          materialId: order.material_id,
          batchNo: order.batch_no || null,
          warehouseId,
          quantity: deductQty.toNumber(),
          unitPrice: Number(order.unit_price) || 0,
          totalAmount: parentCost.toNumber(),
          referenceNo: order.split_no,
          remark: `分切母料出库-${order.split_no}`,
          createBy: operatorId || null,
        });

        // 批次明细已更新：派生重算汇总表，杜绝双写漂移。
        await recomputeInventorySummary(conn, order.material_id, warehouseId);

        await appendInventoryLog(conn, {
          materialId: order.material_id,
          warehouseId,
          batchNo: order.batch_no || '',
          operationType: 2,
          operationQty: deductQty.toNumber(),
          beforeQty: parentAvailableQty,
          afterQty: parentAvailableQty - deductQty.toNumber(),
          businessType: 'split_order',
          businessNo: order.split_no,
          remark: `分切出库-${order.split_no}`,
          operatorId,
        });

        if (totalWasteQty.greaterThan(0)) {
          const wasteCost = totalCostDecimal.times(totalWasteQty).div(totalQty);
          await appendInventoryLog(conn, {
            materialId: order.material_id,
            warehouseId,
            batchNo: order.batch_no || '',
            operationType: 3,
            operationQty: totalWasteQty.toNumber(),
            beforeQty: 0,
            afterQty: totalWasteQty.negated().toNumber(),
            businessType: 'split_order',
            businessNo: order.split_no,
            remark: `分切损耗-${order.split_no}(${totalWasteQty.toNumber()})`,
            operatorId,
          });
        }

        for (const d of details) {
          if (d.is_waste) continue;
          await appendInventoryLog(conn, {
            materialId: order.material_id,
            warehouseId,
            batchNo: d.child_batch_no || '',
            operationType: 1,
            operationQty: d.total_qty,
            beforeQty: 0,
            afterQty: d.total_qty,
            businessType: 'split_order',
            businessNo: order.split_no,
            remark: `分切入库-${order.split_no}`,
            operatorId,
          });
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
