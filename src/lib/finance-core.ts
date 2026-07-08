/**
 * 财务管理核心服务
 * 应收管理、应付管理、成本核算
 */

import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { generateDocNo } from '@/lib/global-config';
import { CalcParamService } from '@/lib/calc-param-service';

// ============================================================
// 应收管理
// ============================================================

/**
 * 销售发货自动生成应收单
 */
export async function generateReceivable(
  salesOrderId: number,
  shipmentId: number,
  amount: number,
  dueDate?: string
): Promise<{ success: boolean; receivableId?: number; receivableNo?: string; message: string }> {
  try {
    // 查询销售订单和客户信息
    const orderRows: any = await query(
      `SELECT so.*, c.customer_name
       FROM sal_order so
       LEFT JOIN crm_customer c ON so.customer_id = c.id
       WHERE so.id = ?`,
      [salesOrderId]
    );

    if (orderRows.length === 0) {
      return { success: false, message: '销售订单不存在' };
    }

    const order = orderRows[0];
    const receivableNo = generateDocNo('AR');

    // 计算到期日（默认30天）
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    const finalDueDate = dueDate || defaultDueDate.toISOString().split('T')[0];

    const result: any = await execute(
      `INSERT INTO fin_receivable (
        receivable_no, source_type, source_id, source_no,
        customer_id, amount, received_amount, balance,
        due_date, status, remark
      ) VALUES (?, 1, ?, ?, ?, ?, 0, ?, ?, 1, ?)`,
      [
        receivableNo,
        salesOrderId,
        order.order_no,
        order.customer_id,
        amount,
        amount,
        finalDueDate,
        `销售发货自动生成：${order.order_no}`,
      ]
    );

    secureLog('info', '应收单生成成功', { receivableNo, salesOrderId, amount });

    return {
      success: true,
      receivableId: result.insertId,
      receivableNo,
      message: `应收单生成成功: ${receivableNo}`,
    };
  } catch (error: any) {
    secureLog('error', '应收单生成失败', { error: error.message, salesOrderId });
    return { success: false, message: `生成失败: ${error.message}` };
  }
}

/**
 * 录入回款
 */
export async function recordReceipt(
  receivableId: number,
  amount: number,
  receiptMethod: string,
  receiptDate: string,
  bankAccount?: string,
  referenceNo?: string,
  operatorId?: number
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await transaction(async (conn) => {
      // 1. 查询应收单
      const [recRows]: any = await conn.execute(`SELECT * FROM fin_receivable WHERE id = ?`, [
        receivableId,
      ]);

      if (recRows.length === 0) {
        throw new Error('应收单不存在');
      }

      const receivable = recRows[0];
      const currentReceived = parseFloat(receivable.received_amount) || 0;
      const totalAmount = parseFloat(receivable.amount);
      const newReceived = currentReceived + amount;

      if (newReceived > totalAmount) {
        throw new Error('回款金额不能超过应收金额');
      }

      // 2. 创建回款记录
      const receiptNo = generateDocNo('RC');
      await conn.execute(
        `INSERT INTO fin_receipt_record (
          receipt_no, receivable_id, customer_id, amount,
          receipt_date, receipt_method, bank_account, reference_no, handler_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptNo,
          receivableId,
          receivable.customer_id,
          amount,
          receiptDate,
          receiptMethod,
          bankAccount || '',
          referenceNo || '',
          operatorId || null,
        ]
      );

      // 3. 更新应收单
      const balance = totalAmount - newReceived;
      const status = balance <= 0 ? 3 : 2; // 3=已结清, 2=部分收款

      await conn.execute(
        `UPDATE fin_receivable SET
          received_amount = ?,
          balance = ?,
          status = ?,
          update_time = NOW()
        WHERE id = ?`,
        [newReceived, balance, status, receivableId]
      );

      return { receiptNo, newReceived, balance };
    });

    secureLog('info', '回款录入成功', { receivableId, amount, receiptNo: result.receiptNo });

    return {
      success: true,
      message: `回款录入成功，已收${result.newReceived}，余额${result.balance}`,
    };
  } catch (error: any) {
    secureLog('error', '回款录入失败', { error: error.message, receivableId });
    return { success: false, message: `录入失败: ${error.message}` };
  }
}

// ============================================================
// 应付管理
// ============================================================

/**
 * 采购入库自动生成应付单
 */
export async function generatePayable(
  purchaseOrderId: number,
  inboundId: number,
  amount: number,
  dueDate?: string
): Promise<{ success: boolean; payableId?: number; payableNo?: string; message: string }> {
  try {
    const orderRows: any = await query(
      `SELECT po.*, s.supplier_name
       FROM pur_order po
       LEFT JOIN pur_supplier s ON po.supplier_id = s.id
       WHERE po.id = ?`,
      [purchaseOrderId]
    );

    if (orderRows.length === 0) {
      return { success: false, message: '采购订单不存在' };
    }

    const order = orderRows[0];
    const payableNo = generateDocNo('AP');

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    const finalDueDate = dueDate || defaultDueDate.toISOString().split('T')[0];

    const result: any = await execute(
      `INSERT INTO fin_payable (
        payable_no, source_type, source_id, source_no,
        supplier_id, amount, paid_amount, balance,
        due_date, status, remark
      ) VALUES (?, 1, ?, ?, ?, ?, 0, ?, ?, 1, ?)`,
      [
        payableNo,
        purchaseOrderId,
        order.order_no,
        order.supplier_id,
        amount,
        amount,
        finalDueDate,
        `采购入库自动生成：${order.order_no}`,
      ]
    );

    secureLog('info', '应付单生成成功', { payableNo, purchaseOrderId, amount });

    return {
      success: true,
      payableId: result.insertId,
      payableNo,
      message: `应付单生成成功: ${payableNo}`,
    };
  } catch (error: any) {
    secureLog('error', '应付单生成失败', { error: error.message, purchaseOrderId });
    return { success: false, message: `生成失败: ${error.message}` };
  }
}

/**
 * 录入付款
 */
export async function recordPayment(
  payableId: number,
  amount: number,
  paymentMethod: string,
  paymentDate: string,
  bankAccount?: string,
  referenceNo?: string,
  operatorId?: number
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await transaction(async (conn) => {
      const [payRows]: any = await conn.execute(`SELECT * FROM fin_payable WHERE id = ?`, [
        payableId,
      ]);

      if (payRows.length === 0) {
        throw new Error('应付单不存在');
      }

      const payable = payRows[0];
      const currentPaid = parseFloat(payable.paid_amount) || 0;
      const totalAmount = parseFloat(payable.amount);
      const newPaid = currentPaid + amount;

      if (newPaid > totalAmount) {
        throw new Error('付款金额不能超过应付金额');
      }

      const paymentNo = generateDocNo('PY');
      await conn.execute(
        `INSERT INTO fin_payment_record (
          payment_no, payable_id, supplier_id, amount,
          payment_date, payment_method, bank_account, reference_no, handler_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentNo,
          payableId,
          payable.supplier_id,
          amount,
          paymentDate,
          paymentMethod,
          bankAccount || '',
          referenceNo || '',
          operatorId || null,
        ]
      );

      const balance = totalAmount - newPaid;
      const status = balance <= 0 ? 3 : 2;

      await conn.execute(
        `UPDATE fin_payable SET
          paid_amount = ?,
          balance = ?,
          status = ?,
          update_time = NOW()
        WHERE id = ?`,
        [newPaid, balance, status, payableId]
      );

      return { paymentNo, newPaid, balance };
    });

    secureLog('info', '付款录入成功', { payableId, amount, paymentNo: result.paymentNo });

    return {
      success: true,
      message: `付款录入成功，已付${result.newPaid}，余额${result.balance}`,
    };
  } catch (error: any) {
    secureLog('error', '付款录入失败', { error: error.message, payableId });
    return { success: false, message: `录入失败: ${error.message}` };
  }
}

// ============================================================
// 成本核算
// ============================================================

/**
 * 计算工单成本
 */
export async function calculateWorkOrderCost(
  workOrderId: number
): Promise<{ success: boolean; message: string; cost?: any }> {
  try {
    // 1. 查询工单信息
    const woRows: any = await query(`SELECT * FROM prd_work_order WHERE id = ? AND deleted = 0`, [
      workOrderId,
    ]);

    if (woRows.length === 0) {
      return { success: false, message: '工单不存在' };
    }

    const workOrder = woRows[0];

    // 2. 计算原材料成本（从小料领用记录）
    const materialCostRows: any = await query(
      `SELECT COALESCE(SUM(total_cost), 0) as total_cost
       FROM material_requisition_items
       WHERE requisition_id IN (
         SELECT id FROM material_requisitions
         WHERE work_order_id = ? AND status = 2 AND deleted = 0
       )`,
      [workOrderId]
    );
    const materialCost = parseFloat(materialCostRows[0]?.total_cost) || 0;

    // 3. 计算人工成本（从工序报工）
    const laborCostRows: any = await query(
      `SELECT COALESCE(SUM(actual_hours * hourly_rate), 0) as total_cost
       FROM prd_work_report
       WHERE work_order_id = ?`,
      [workOrderId]
    );
    const laborCost = parseFloat(laborCostRows[0]?.total_cost) || 0;

    // 4. 计算制造费用 — 优先从事件驱动已归集的实际数据读取
    // 事件路径（InkCostHandler/ScreenPlateCostHandler）在工单完工时已将实际制造费用累加写入 work_order_costs
    // 仅当事件路径未写入时，才使用估算系数兜底
    const existingMfgRows: any = await query(
      `SELECT manufacturing_cost, material_cost FROM work_order_costs WHERE work_order_id = ?`,
      [workOrderId]
    );
    const existingMfgCost = parseFloat(existingMfgRows[0]?.manufacturing_cost) || 0;
    const existingEventMaterialCost = parseFloat(existingMfgRows[0]?.material_cost) || 0;

    let manufacturingCost: number;
    let effectiveMaterialCost = materialCost;

    if (existingMfgCost > 0) {
      // 事件驱动路径已归集实际制造费用，直接使用
      manufacturingCost = existingMfgCost;
      // 如果事件路径也已归集材料成本（油墨计入材料），取较大值避免遗漏
      if (existingEventMaterialCost > materialCost) {
        effectiveMaterialCost = existingEventMaterialCost;
      }
    } else {
      // 事件路径无数据，使用配置系数估算兜底
      const manufacturingCostRatio = await CalcParamService.getDecimal('cost.manufacturing_cost_ratio', 0.5);
      manufacturingCost = laborCost * manufacturingCostRatio;
    }

    const totalCost = effectiveMaterialCost + laborCost + manufacturingCost;
    const completedQty = parseFloat(workOrder.completed_qty) || parseFloat(workOrder.plan_qty) || 1;
    const unitCost = totalCost / completedQty;

    // 5. 保存或更新成本记录
    const existingCost: any = await query(
      `SELECT id FROM work_order_costs WHERE work_order_id = ?`,
      [workOrderId]
    );

    if (existingCost.length > 0) {
      await execute(
        `UPDATE work_order_costs SET
          material_cost = ?,
          labor_cost = ?,
          manufacturing_cost = ?,
          total_cost = ?,
          unit_cost = ?,
          quantity = ?,
          calculate_time = NOW(),
          status = 1,
          update_time = NOW()
        WHERE work_order_id = ?`,
        [effectiveMaterialCost, laborCost, manufacturingCost, totalCost, unitCost, completedQty, workOrderId]
      );
    } else {
      await execute(
        `INSERT INTO work_order_costs (
          work_order_id, work_order_no, material_cost, labor_cost,
          manufacturing_cost, total_cost, unit_cost, quantity,
          calculate_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)`,
        [
          workOrderId,
          workOrder.work_order_no,
          effectiveMaterialCost,
          laborCost,
          manufacturingCost,
          totalCost,
          unitCost,
          completedQty,
        ]
      );
    }

    secureLog('info', '工单成本计算成功', {
      workOrderId,
      workOrderNo: workOrder.work_order_no,
      totalCost,
      unitCost,
    });

    return {
      success: true,
      message: `成本计算成功：总成本${totalCost.toFixed(2)}，单位成本${unitCost.toFixed(2)}`,
      cost: {
        materialCost: effectiveMaterialCost,
        laborCost,
        manufacturingCost,
        manufacturingCostSource: existingMfgCost > 0 ? 'event_driven' : 'estimated',
        totalCost,
        unitCost,
        quantity: completedQty,
      },
    };
  } catch (error: any) {
    secureLog('error', '工单成本计算失败', { error: error.message, workOrderId });
    return { success: false, message: `计算失败: ${error.message}` };
  }
}

// ============================================================
// 查询方法
// ============================================================

/**
 * 查询应收款汇总
 */
export async function queryReceivableSummary(customerId?: number): Promise<any> {
  let where = 'WHERE deleted = 0';
  const params: any[] = [];

  if (customerId) {
    where += ' AND customer_id = ?';
    params.push(customerId);
  }

  const rows: any = await query(
    `SELECT
      status,
      COUNT(*) as count,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(received_amount), 0) as total_received,
      COALESCE(SUM(balance), 0) as total_balance
    FROM fin_receivable
    ${where}
    GROUP BY status`,
    params
  );

  return rows;
}

/**
 * 查询应付款汇总
 */
export async function queryPayableSummary(supplierId?: number): Promise<any> {
  let where = 'WHERE deleted = 0';
  const params: any[] = [];

  if (supplierId) {
    where += ' AND supplier_id = ?';
    params.push(supplierId);
  }

  const rows: any = await query(
    `SELECT
      status,
      COUNT(*) as count,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(SUM(balance), 0) as total_balance
    FROM fin_payable
    ${where}
    GROUP BY status`,
    params
  );

  return rows;
}
