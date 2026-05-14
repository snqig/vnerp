/**
 * 物料领用管理核心服务
 * 支持：正常领料、超领、补料、退料
 */

import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { getConfig, generateDocNo } from '@/lib/global-config';
import { allocateFIFO, enforceFIFO, checkWholeMaterial } from '@/lib/warehouse-core';
import { adjustInventory } from '@/lib/inventory-sync';

// ============================================================
// 类型定义
// ============================================================

export interface RequisitionItem {
  materialId: number;
  materialCode?: string;
  materialName?: string;
  plannedQuantity: number;
  unit?: string;
}

export interface RequisitionCreateParams {
  workOrderId: number;
  workOrderNo?: string;
  type: 'normal' | 'over' | 'supplementary';
  items: RequisitionItem[];
  applicantId?: number;
  applicantName?: string;
  warehouseId?: number;
  originalRequisitionId?: number;
  reason?: string;
  remark?: string;
}

export interface IssueItem {
  materialId: number;
  qrCode: string;
  quantity: number;
  batchNo?: string;
}

// ============================================================
// 自动生成领料单
// ============================================================

/**
 * 根据工单自动生成领料单
 */
export async function autoGenerateRequisition(
  workOrderId: number,
  applicantId?: number,
  applicantName?: string
): Promise<{ success: boolean; requisitionId?: number; requisitionNo?: string; message: string }> {
  try {
    // 1. 查询工单信息
    const workOrderRows: any = await query(
      `SELECT wo.*, m.material_code, m.material_name, m.unit
       FROM prd_work_order wo
       LEFT JOIN inv_material m ON wo.material_id = m.id
       WHERE wo.id = ? AND wo.deleted = 0`,
      [workOrderId]
    );

    if (workOrderRows.length === 0) {
      return { success: false, message: '工单不存在' };
    }

    const workOrder = workOrderRows[0];

    // 2. 查询BOM明细
    const bomRows: any = await query(
      `SELECT bd.*, m.material_code, m.material_name, m.unit
       FROM prd_bom_detail bd
       LEFT JOIN prd_bom b ON bd.bom_id = b.id
       LEFT JOIN inv_material m ON bd.material_id = m.id
       WHERE b.material_id = ? AND b.deleted = 0`,
      [workOrder.material_id]
    );

    if (bomRows.length === 0) {
      return { success: false, message: '未找到BOM信息，无法生成领料单' };
    }

    // 3. 创建领料单
    const result = await transaction(async (conn) => {
      const requisitionNo = generateDocNo(getConfig('mr_prefix') || 'MR');

      const [reqResult]: any = await conn.execute(
        `INSERT INTO material_requisitions (
          requisition_no, work_order_id, work_order_no, type, status,
          applicant_id, applicant_name, total_quantity, warehouse_id, remark
        ) VALUES (?, ?, ?, 'normal', 1, ?, ?, ?, ?, ?)`,
        [
          requisitionNo,
          workOrderId,
          workOrder.work_order_no,
          applicantId || null,
          applicantName || '',
          0,
          workOrder.warehouse_id || null,
          `自动生成：${workOrder.work_order_no}`,
        ]
      );

      const requisitionId = reqResult.insertId;
      let totalQuantity = 0;

      // 4. 创建领料明细并FIFO推荐
      for (const bomItem of bomRows) {
        const plannedQty = parseFloat(bomItem.quantity) * parseFloat(workOrder.plan_qty);
        totalQuantity += plannedQty;

        // FIFO推荐批次
        const fifoResult = await allocateFIFO(bomItem.material_id, plannedQty);
        const recommendedBatch =
          fifoResult.allocations.length > 0 ? fifoResult.allocations[0] : null;

        await conn.execute(
          `INSERT INTO material_requisition_items (
            requisition_id, material_id, material_code, material_name,
            planned_quantity, actual_quantity, unit, qr_code, batch_no,
            warehouse_location, fifo_recommended, split_flag, unit_cost
          ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
          [
            requisitionId,
            bomItem.material_id,
            bomItem.material_code || '',
            bomItem.material_name || '',
            plannedQty,
            bomItem.unit || 'pcs',
            recommendedBatch?.qrCode || '',
            recommendedBatch?.batchNo || '',
            recommendedBatch?.location || '',
            recommendedBatch ? 1 : 0,
            recommendedBatch?.splitFlag || 1,
            recommendedBatch?.unitCost || 0,
          ]
        );
      }

      // 更新总数量
      await conn.execute(`UPDATE material_requisitions SET total_quantity = ? WHERE id = ?`, [
        totalQuantity,
        requisitionId,
      ]);

      return { requisitionId, requisitionNo };
    });

    secureLog('info', '领料单自动生成成功', {
      requisitionNo: result.requisitionNo,
      workOrderId,
    });

    return {
      success: true,
      requisitionId: result.requisitionId,
      requisitionNo: result.requisitionNo,
      message: `领料单生成成功: ${result.requisitionNo}`,
    };
  } catch (error: any) {
    secureLog('error', '领料单生成失败', { error: error.message, workOrderId });
    return { success: false, message: `生成失败: ${error.message}` };
  }
}

// ============================================================
// 提交超领申请
// ============================================================

/**
 * 提交超领申请
 */
export async function submitOverRequisition(
  workOrderId: number,
  materialId: number,
  quantity: number,
  reason: string,
  applicantId?: number,
  applicantName?: string
): Promise<{ success: boolean; requisitionId?: number; message: string }> {
  if (!reason) {
    return { success: false, message: '超领原因必填' };
  }

  const overApproval = getConfig('over_requisition_approval');
  const status = overApproval ? 0 : 1; // 需要审批则为待审批，否则直接待出库

  try {
    const requisitionNo = generateDocNo(getConfig('mr_prefix') || 'MR');

    const result: any = await execute(
      `INSERT INTO material_requisitions (
        requisition_no, work_order_id, type, status,
        applicant_id, applicant_name, total_quantity, reason, remark
      ) VALUES (?, ?, 'over', ?, ?, ?, ?, ?, ?)`,
      [
        requisitionNo,
        workOrderId,
        status,
        applicantId || null,
        applicantName || '',
        quantity,
        reason,
        `超领申请：${reason}`,
      ]
    );

    // 创建明细
    await execute(
      `INSERT INTO material_requisition_items (
        requisition_id, material_id, planned_quantity, actual_quantity
      ) VALUES (?, ?, ?, 0)`,
      [result.insertId, materialId, quantity]
    );

    return {
      success: true,
      requisitionId: result.insertId,
      message: overApproval ? '超领申请已提交，等待审批' : '超领单已生成',
    };
  } catch (error: any) {
    secureLog('error', '超领申请失败', { error: error.message, workOrderId, materialId });
    return { success: false, message: `申请失败: ${error.message}` };
  }
}

// ============================================================
// 提交补料申请
// ============================================================

/**
 * 提交补料申请
 */
export async function submitSupplementaryRequisition(
  originalRequisitionId: number,
  materialId: number,
  quantity: number,
  reason: string,
  applicantId?: number,
  applicantName?: string
): Promise<{ success: boolean; requisitionId?: number; message: string }> {
  if (!reason) {
    return { success: false, message: '补料原因必填' };
  }

  // 验证原领料单
  const originalRows: any = await query(
    `SELECT * FROM material_requisitions WHERE id = ? AND deleted = 0`,
    [originalRequisitionId]
  );

  if (originalRows.length === 0) {
    return { success: false, message: '原领料单不存在' };
  }

  const dualApproval = getConfig('replenish_dual_approval');
  const status = dualApproval ? 0 : 1;

  try {
    const requisitionNo = generateDocNo(getConfig('mr_prefix') || 'MR');
    const original = originalRows[0];

    const result: any = await execute(
      `INSERT INTO material_requisitions (
        requisition_no, work_order_id, work_order_no, type, status,
        applicant_id, applicant_name, total_quantity, original_requisition_id, reason, remark
      ) VALUES (?, ?, ?, 'supplementary', ?, ?, ?, ?, ?, ?, ?)`,
      [
        requisitionNo,
        original.work_order_id,
        original.work_order_no,
        status,
        applicantId || null,
        applicantName || '',
        quantity,
        originalRequisitionId,
        reason,
        `补料申请：${reason}`,
      ]
    );

    await execute(
      `INSERT INTO material_requisition_items (
        requisition_id, material_id, planned_quantity, actual_quantity
      ) VALUES (?, ?, ?, 0)`,
      [result.insertId, materialId, quantity]
    );

    return {
      success: true,
      requisitionId: result.insertId,
      message: dualApproval ? '补料申请已提交，等待双重审批' : '补料单已生成',
    };
  } catch (error: any) {
    secureLog('error', '补料申请失败', { error: error.message, originalRequisitionId });
    return { success: false, message: `申请失败: ${error.message}` };
  }
}

// ============================================================
// 扫码领料出库
// ============================================================

/**
 * 扫码领料出库
 */
export async function issueMaterial(
  requisitionId: number,
  items: IssueItem[],
  operatorId?: number
): Promise<{ success: boolean; message: string; issuedItems?: any[] }> {
  try {
    // 1. 查询领料单
    const reqRows: any = await query(
      `SELECT * FROM material_requisitions WHERE id = ? AND deleted = 0`,
      [requisitionId]
    );

    if (reqRows.length === 0) {
      return { success: false, message: '领料单不存在' };
    }

    const requisition = reqRows[0];
    if (requisition.status !== 1) {
      return { success: false, message: '领料单状态不正确，无法出库' };
    }

    const issuedItems: any[] = [];

    const result = await transaction(async (conn) => {
      for (const item of items) {
        // 2. 检查整料
        const wholeCheck = await checkWholeMaterial(item.qrCode);
        if (wholeCheck.isWhole) {
          throw new Error(`物料${item.materialId}: ${wholeCheck.message}`);
        }

        // 3. FIFO校验
        const fifoCheck = await enforceFIFO(
          item.materialId,
          item.batchNo || item.qrCode,
          requisitionId
        );
        if (!fifoCheck.isValid && fifoCheck.needsApproval) {
          throw new Error(`FIFO校验失败: ${fifoCheck.message}`);
        }

        // 4. 扣减库存
        const inventoryResult = await adjustInventory({
          materialId: item.materialId,
          warehouseId: requisition.warehouse_id,
          batchNo: item.batchNo,
          quantity: -item.quantity,
          operationType: 'outbound',
          businessType: '生产领料',
          businessNo: requisition.requisition_no,
          operatorId,
        });

        if (!inventoryResult.success) {
          throw new Error(`库存扣减失败: ${inventoryResult.message}`);
        }

        // 5. 更新领料明细
        await conn.execute(
          `UPDATE material_requisition_items SET
            actual_quantity = actual_quantity + ?,
            issued_quantity = issued_quantity + ?,
            qr_code = ?,
            batch_no = ?,
            fifo_recommended = ?
          WHERE requisition_id = ? AND material_id = ?`,
          [
            item.quantity,
            item.quantity,
            item.qrCode,
            item.batchNo || '',
            fifoCheck.isValid ? 1 : 0,
            requisitionId,
            item.materialId,
          ]
        );

        // 6. 更新批次成本已使用数量
        await conn.execute(
          `UPDATE material_batch_costs SET
            used_quantity = used_quantity + ?,
            remaining_quantity = remaining_quantity - ?
          WHERE qr_code = ?`,
          [item.quantity, item.quantity, item.qrCode]
        );

        issuedItems.push({
          materialId: item.materialId,
          qrCode: item.qrCode,
          quantity: item.quantity,
          fifoRecommended: fifoCheck.isValid,
        });
      }

      // 7. 更新领料单状态
      await conn.execute(
        `UPDATE material_requisitions SET
          status = 2,
          issued_quantity = issued_quantity + ?,
          update_time = NOW()
        WHERE id = ?`,
        [items.reduce((sum, i) => sum + i.quantity, 0), requisitionId]
      );

      return issuedItems;
    });

    secureLog('info', '领料出库成功', {
      requisitionId,
      requisitionNo: requisition.requisition_no,
      itemCount: result.length,
    });

    return {
      success: true,
      message: `出库成功：共${result.length}项物料`,
      issuedItems: result,
    };
  } catch (error: any) {
    secureLog('error', '领料出库失败', { error: error.message, requisitionId });
    return { success: false, message: `出库失败: ${error.message}` };
  }
}

// ============================================================
// 退料
// ============================================================

/**
 * 创建退料单
 */
export async function createReturn(
  workOrderId: number,
  requisitionId: number,
  items: { materialId: number; qrCode: string; quantity: number; reason?: string }[],
  applicantId?: number,
  applicantName?: string
): Promise<{ success: boolean; returnId?: number; returnNo?: string; message: string }> {
  try {
    const result = await transaction(async (conn) => {
      const returnNo = generateDocNo('RT');
      let totalQuantity = 0;

      const [returnResult]: any = await conn.execute(
        `INSERT INTO material_returns (
          return_no, work_order_id, requisition_id, status,
          applicant_id, applicant_name, total_quantity, remark
        ) VALUES (?, ?, ?, 0, ?, ?, 0, ?)`,
        [returnNo, workOrderId, requisitionId, applicantId || null, applicantName || '', '生产退料']
      );

      const returnId = returnResult.insertId;

      for (const item of items) {
        totalQuantity += item.quantity;

        // 查询物料信息
        const [matRows]: any = await conn.execute(
          `SELECT material_code, material_name, unit FROM inv_material WHERE id = ?`,
          [item.materialId]
        );
        const material = matRows[0] || {};

        // 查询批次成本
        const [costRows]: any = await conn.execute(
          `SELECT unit_cost FROM material_batch_costs WHERE qr_code = ?`,
          [item.qrCode]
        );
        const unitCost = costRows.length > 0 ? parseFloat(costRows[0].unit_cost) : 0;

        await conn.execute(
          `INSERT INTO material_return_items (
            return_id, material_id, material_code, material_name,
            quantity, unit, qr_code, reason, unit_cost, total_cost
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            returnId,
            item.materialId,
            material.material_code || '',
            material.material_name || '',
            item.quantity,
            material.unit || 'pcs',
            item.qrCode,
            item.reason || '生产完成剩余',
            unitCost,
            unitCost * item.quantity,
          ]
        );
      }

      // 更新总数量
      await conn.execute(`UPDATE material_returns SET total_quantity = ? WHERE id = ?`, [
        totalQuantity,
        returnId,
      ]);

      return { returnId, returnNo };
    });

    return {
      success: true,
      returnId: result.returnId,
      returnNo: result.returnNo,
      message: `退料单创建成功: ${result.returnNo}`,
    };
  } catch (error: any) {
    secureLog('error', '退料单创建失败', { error: error.message, workOrderId });
    return { success: false, message: `创建失败: ${error.message}` };
  }
}

/**
 * 确认退料入库
 */
export async function confirmReturn(
  returnId: number,
  warehouseId: number,
  operatorId?: number
): Promise<{ success: boolean; message: string }> {
  try {
    const returnRows: any = await query(
      `SELECT * FROM material_returns WHERE id = ? AND deleted = 0`,
      [returnId]
    );

    if (returnRows.length === 0) {
      return { success: false, message: '退料单不存在' };
    }

    const returnOrder = returnRows[0];
    if (returnOrder.status !== 0) {
      return { success: false, message: '退料单状态不正确' };
    }

    const itemRows: any = await query(`SELECT * FROM material_return_items WHERE return_id = ?`, [
      returnId,
    ]);

    for (const item of itemRows) {
      // 增加库存
      const inventoryResult = await adjustInventory({
        materialId: item.material_id,
        warehouseId,
        batchNo: item.batch_no,
        quantity: item.quantity,
        operationType: 'inbound',
        businessType: '生产退料',
        businessNo: returnOrder.return_no,
        operatorId,
      });

      if (!inventoryResult.success) {
        return { success: false, message: `库存回写失败: ${inventoryResult.message}` };
      }
    }

    // 更新退料单状态
    await execute(
      `UPDATE material_returns SET
        status = 1,
        confirm_time = NOW(),
        update_time = NOW()
      WHERE id = ?`,
      [returnId]
    );

    return { success: true, message: '退料入库确认成功' };
  } catch (error: any) {
    secureLog('error', '退料确认失败', { error: error.message, returnId });
    return { success: false, message: `确认失败: ${error.message}` };
  }
}

// ============================================================
// 审批
// ============================================================

/**
 * 审批领料单
 */
export async function approveRequisition(
  requisitionId: number,
  approved: boolean,
  approverId?: number,
  approverName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const status = approved ? 1 : 3; // 1=待出库，3=已取消

    await execute(
      `UPDATE material_requisitions SET
        status = ?,
        approver_id = ?,
        approver_name = ?,
        approve_time = NOW(),
        update_time = NOW()
      WHERE id = ? AND status = 0`,
      [status, approverId || null, approverName || '', requisitionId]
    );

    return {
      success: true,
      message: approved ? '审批通过' : '审批已驳回',
    };
  } catch (error: any) {
    secureLog('error', '审批失败', { error: error.message, requisitionId });
    return { success: false, message: `审批失败: ${error.message}` };
  }
}
