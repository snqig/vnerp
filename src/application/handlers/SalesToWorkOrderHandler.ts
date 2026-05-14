import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { SalesOrderApprovedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { WorkOrderCreatedEvent } from '@/domain/production/events/WorkOrderEvents';
import { query, execute, transaction } from '@/lib/db';
import { getEventBus } from '@/infrastructure/event-bus/EventBus';
import { secureLog } from '@/lib/logger';

export interface MaterialRequirementItem {
  materialId: number;
  materialCode: string;
  materialName: string;
  requiredQty: number;
  unit: string;
}

export interface WorkOrderCreationResult {
  workOrderId: number;
  workOrderNo: string;
  productName: string;
  plannedQty: number;
  materialCount: number;
}

export class SalesToWorkOrderHandler implements EventHandler<SalesOrderApprovedEvent> {
  async handle(event: SalesOrderApprovedEvent): Promise<void> {
    const { orderId, orderNo, customerId, customerName, lines, totalAmount } = event.payload;

    secureLog('info', 'Sales order approved, processing work order creation', {
      orderId,
      orderNo,
      lineCount: lines.length,
    });

    const workOrders: WorkOrderCreationResult[] = [];

    for (const line of lines) {
      try {
        const result = await this.createWorkOrderFromSalesLine({
          orderId,
          orderNo,
          customerId,
          customerName,
          materialId: line.materialId,
          materialCode: line.materialCode,
          materialName: line.materialName,
          requiredQty: line.orderQty,
          unitPrice: line.unitPrice,
        });

        if (result) {
          workOrders.push(result);
        }
      } catch (error) {
        secureLog('error', 'Failed to create work order from sales line', {
          orderNo,
          materialCode: line.materialCode,
          error: String(error),
        });
      }
    }

    secureLog('info', 'Work order creation completed', {
      orderNo,
      totalWorkOrders: workOrders.length,
      workOrders: workOrders.map((wo) => ({
        workOrderNo: wo.workOrderNo,
        productName: wo.productName,
      })),
    });
  }

  private async createWorkOrderFromSalesLine(params: {
    orderId: number;
    orderNo: string;
    customerId: number;
    customerName: string;
    materialId: number;
    materialCode: string;
    materialName: string;
    requiredQty: number;
    unitPrice: number;
  }): Promise<WorkOrderCreationResult | null> {
    const {
      orderId,
      orderNo,
      customerId,
      customerName,
      materialId,
      materialCode,
      materialName,
      requiredQty,
      unitPrice,
    } = params;

    const workOrderNo = this.generateWorkOrderNo();
    const processInfo = await this.getDefaultProcess();
    const materialRequirements = await this.getMaterialRequirements(materialId, requiredQty);

    const workOrderId = await transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO prod_work_order (
          order_no, sales_order_id, sales_order_no, status,
          product_id, product_name, product_code,
          planned_qty, completed_qty,
          process_id, process_name,
          warehouse_id, customer_id, customer_name,
          planned_start_date, planned_end_date,
          remark, create_time, update_time, deleted
        ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, 0, ?, ?, 1, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
        [
          workOrderNo,
          orderId,
          orderNo,
          materialId,
          materialName,
          materialCode,
          requiredQty,
          processInfo?.processId || null,
          processInfo?.processName || null,
          customerId,
          customerName,
          new Date().toISOString().slice(0, 10),
          this.calculateEndDate(requiredQty),
          `由销售订单 ${orderNo} 生成`,
        ]
      );

      const woId = (result as any).insertId;

      for (const mr of materialRequirements) {
        await conn.execute(
          `INSERT INTO prod_work_order_material_req (
            work_order_id, material_id, material_name, required_qty, unit, create_time
          ) VALUES (?, ?, ?, ?, ?, NOW())`,
          [woId, mr.materialId, mr.materialName, mr.requiredQty, mr.unit]
        );
      }

      await conn.execute(
        `INSERT INTO prod_work_order_log (work_order_id, action, operator, remark, create_time)
         VALUES (?, 'created', 'system', ?, NOW())`,
        [woId, `由销售订单 ${orderNo} 自动创建`]
      );

      return woId;
    });

    const eventBus = getEventBus();
    await eventBus.publish(
      new WorkOrderCreatedEvent({
        workOrderId,
        workOrderNo,
        productId: materialId,
        productName: materialName,
        plannedQty: requiredQty,
      })
    );

    return {
      workOrderId,
      workOrderNo,
      productName: materialName,
      plannedQty: requiredQty,
      materialCount: materialRequirements.length,
    };
  }

  private generateWorkOrderNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `WO${dateStr}${String(date.getTime()).slice(-6)}`;
  }

  private async getDefaultProcess(): Promise<{ processId: number; processName: string } | null> {
    const rows = (await query(
      `SELECT id, process_name FROM prd_process_route WHERE is_default = 1 AND deleted = 0 LIMIT 1`
    )) as any[];

    if (rows.length > 0) {
      return { processId: rows[0].id, processName: rows[0].process_name };
    }
    return null;
  }

  private async getMaterialRequirements(
    productId: number,
    plannedQty: number
  ): Promise<MaterialRequirementItem[]> {
    const bomRows = (await query(
      `SELECT bd.material_id, m.material_code, m.material_name, bd.quantity, m.unit
       FROM prd_bom_detail bd
       LEFT JOIN bas_material m ON bd.material_id = m.id
       WHERE bd.bom_id IN (SELECT id FROM prd_bom WHERE product_id = ? AND is_active = 1 AND deleted = 0)
       AND bd.deleted = 0`,
      [productId]
    )) as any[];

    if (bomRows.length === 0) {
      const materialRow = (await query(
        `SELECT id, material_code, material_name, unit FROM bas_material WHERE id = ?`,
        [productId]
      )) as any[];

      if (materialRow.length > 0) {
        return [
          {
            materialId: materialRow[0].id,
            materialCode: materialRow[0].material_code,
            materialName: materialRow[0].material_name,
            requiredQty: plannedQty,
            unit: materialRow[0].unit || '件',
          },
        ];
      }
      return [];
    }

    return bomRows.map((row) => ({
      materialId: row.material_id,
      materialCode: row.material_code,
      materialName: row.material_name,
      requiredQty: row.quantity * plannedQty,
      unit: row.unit || '件',
    }));
  }

  private calculateEndDate(plannedQty: number): string {
    const days = Math.ceil(plannedQty / 100);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Math.min(days, 30));
    return endDate.toISOString().slice(0, 10);
  }
}
