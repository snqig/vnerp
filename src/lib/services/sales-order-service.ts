import { transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

export interface WorkOrderResult {
  workOrderId: number;
  workOrderNo: string;
  materialReqCount: number;
}

export async function createWorkOrderFromSalesOrder(salesOrderId: number): Promise<WorkOrderResult> {
  return await transaction(async (conn) => {
    const [salesRows]: any = await conn.execute(
      `SELECT id, order_no, customer_id, total_amount FROM sal_order WHERE id = ? AND deleted = 0`,
      [salesOrderId]
    );

    if (!salesRows || salesRows.length === 0) {
      throw new Error('销售订单不存在');
    }

    const salesOrder = salesRows[0];

    const [orderItems]: any = await conn.execute(
      `SELECT material_id, material_name, quantity FROM sal_order_detail WHERE order_id = ? AND deleted = 0 LIMIT 1`,
      [salesOrderId]
    );

    if (!orderItems || orderItems.length === 0) {
      throw new Error('销售订单无物料明细，无法创建工单');
    }

    const orderItem = orderItems[0];
    const productId = orderItem.material_id;

    if (!productId) {
      throw new Error('销售订单缺少产品ID，无法查找BOM');
    }

    const [bomRows]: any = await conn.execute(
      `SELECT id, bom_code, version FROM prd_bom_std WHERE product_id = ? AND status = 1 AND deleted = 0 LIMIT 1`,
      [productId]
    );

    if (!bomRows || bomRows.length === 0) {
      throw new Error(`产品(ID:${productId})未维护生效的BOM，无法创建工单`);
    }

    const bom = bomRows[0];
    const workOrderNo = await generateDocumentNo('WO');

    const [woResult]: any = await conn.execute(
      `INSERT INTO prod_work_order (work_order_no, sales_order_id, product_id, product_name, bom_id, plan_qty, status, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [workOrderNo, salesOrderId, productId, orderItem.material_name || '', bom.id, orderItem.quantity]
    );

    const workOrderId = woResult.insertId;

    const [bomLines]: any = await conn.execute(
      `SELECT material_id, material_code, material_name, consumption_qty, waste_rate
       FROM prd_bom_line_std WHERE bom_id = ? AND deleted = 0`,
      [bom.id]
    );

    let materialReqCount = 0;
    for (const line of bomLines) {
      const wasteMultiplier = 1 + Number(line.waste_rate || 0) / 100;
      const requiredQty = Number(line.consumption_qty) * Number(orderItem.quantity) * wasteMultiplier;

      await conn.execute(
        `INSERT INTO prod_work_order_material_req (work_order_id, material_id, material_code, material_name, required_qty, unit)
         VALUES (?, ?, ?, ?, ?, (SELECT unit FROM inv_material_std WHERE id = ? LIMIT 1))`,
        [workOrderId, line.material_id, line.material_code, line.material_name, requiredQty, line.material_id]
      );
      materialReqCount++;
    }

    return {
      workOrderId,
      workOrderNo,
      materialReqCount,
    };
  });
}
