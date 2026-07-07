import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { SalesOrderApprovedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { WorkOrderCreatedEvent } from '@/domain/production/events/WorkOrderEvents';
import { query, execute, transaction } from '@/lib/db';
import { getEventBus } from '@/infrastructure/event-bus/EventBus';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
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
      materialId,
      materialName,
      requiredQty,
    } = params;

    const workOrderNo = this.generateWorkOrderNo();
    const today = new Date().toISOString().slice(0, 10);
    const endDate = this.calculateEndDate(requiredQty);

    const materialRequirements = await this.getMaterialRequirements(materialId, requiredQty);

    const workOrderId = await transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO prd_work_order (
          work_order_no, work_order_date, sales_order_id, material_id,
          plan_qty, completed_qty, unit,
          plan_start_date, plan_end_date,
          priority, status, remark, create_by
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 2, 1, ?, ?)`,
        [
          workOrderNo,
          today,
          orderId,
          materialId,
          requiredQty,
          '件',
          today,
          endDate,
          `由销售订单 ${orderNo} 生成`,
          0,
        ]
      );

      const woId = (result as any).insertId;

      await getDomainEventOutbox().saveEvents(conn, 'WorkOrder', woId, [
        new WorkOrderCreatedEvent({
          workOrderId: woId,
          workOrderNo,
          productId: materialId,
          productName: materialName,
          plannedQty: requiredQty,
        }),
      ]);

      return woId;
    });

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

  private async getMaterialRequirements(
    productId: number,
    plannedQty: number
  ): Promise<MaterialRequirementItem[]> {
    const bomRows = (await query(
      `SELECT bd.material_id, m.material_code, m.material_name, bd.quantity, bd.unit
       FROM prd_bom_detail bd
       LEFT JOIN inv_material m ON m.id = bd.material_id
       WHERE bd.bom_id IN (SELECT id FROM prd_bom WHERE material_id = ? AND status = 1)`,
      [productId]
    )) as any[];

    if (bomRows.length === 0) {
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
