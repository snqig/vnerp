import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export interface InkUsageRecord {
  inkId: number;
  inkCode: string;
  inkName: string;
  colorName: string;
  usageQty: number;
  unitPrice: number;
  totalCost: number;
}

export interface InkCostCalculationResult {
  workOrderId: number;
  workOrderNo: string;
  inkUsages: InkUsageRecord[];
  totalInkCost: number;
}

export class InkCostHandler implements EventHandler<WorkOrderCompletedEvent> {
  async handle(event: WorkOrderCompletedEvent): Promise<void> {
    const { workOrderId, workOrderNo, completedQty } = event.payload;

    secureLog('info', 'Processing ink cost for work order', {
      workOrderId,
      workOrderNo,
      completedQty,
    });

    try {
      const result = await this.calculateInkCost(workOrderId, workOrderNo);

      if (result.totalInkCost > 0) {
        await this.recordInkCost(result);
        await this.updateWorkOrderCost(workOrderId, result.totalInkCost);
        secureLog('info', 'Ink cost recorded', {
          workOrderNo,
          totalCost: result.totalInkCost,
          inkCount: result.inkUsages.length,
        });
      }
    } catch (error) {
      secureLog('error', 'Failed to process ink cost', {
        workOrderNo,
        error: String(error),
      });
    }
  }

  private async calculateInkCost(
    workOrderId: number,
    workOrderNo: string
  ): Promise<InkCostCalculationResult> {
    const inkUsages: InkUsageRecord[] = [];

    const usageRows = await query<{
      inkId: number;
      inkCode: string | null;
      inkName: string | null;
      colorName: string | null;
      usageQty: string | number;
      unitPrice: string | number | null;
      supplier_id: number | null;
    }>(
      `SELECT
        iu.ink_id as inkId,
        bi.ink_code as inkCode,
        bi.ink_name as inkName,
        bi.color_name as colorName,
        iu.usage_qty as usageQty,
        bi.unit_price as unitPrice,
        bi.supplier_id
       FROM ink_usage iu
       LEFT JOIN base_ink bi ON iu.ink_id = bi.id
       WHERE iu.work_order_id = ?
       AND iu.deleted = 0`,
      [workOrderId]
    );

    let totalInkCost = 0;

    for (const row of usageRows) {
      const usageQty = parseFloat(String(row.usageQty || 0));
      const unitPrice = parseFloat(String(row.unitPrice || 0));
      const totalCost = usageQty * unitPrice;

      inkUsages.push({
        inkId: row.inkId,
        inkCode: row.inkCode ?? '',
        inkName: row.inkName ?? '',
        colorName: row.colorName || '',
        usageQty,
        unitPrice,
        totalCost,
      });

      totalInkCost += totalCost;
    }

    // 如果没有直接的油墨使用记录，尝试从配方计算
    if (inkUsages.length === 0) {
      const formulaCost = await this.calculateInkCostFromFormula(workOrderId);
      if (formulaCost > 0) {
        totalInkCost = formulaCost;
      }
    }

    return {
      workOrderId,
      workOrderNo,
      inkUsages,
      totalInkCost: Math.round(totalInkCost * 100) / 100,
    };
  }

  private async calculateInkCostFromFormula(workOrderId: number): Promise<number> {
    // 从工艺配方计算标准油墨成本
    const formulaRows = await query<{
      planned_qty: string | number;
      quantity_per_piece: string | number;
      unit_price: string | number;
    }>(
      `SELECT
        wo.planned_qty,
        wf.quantity_per_piece,
        bi.unit_price
       FROM prod_work_order wo
       LEFT JOIN prd_process_route pr ON wo.process_id = pr.id
       LEFT JOIN prd_work_order_material_req wom ON wom.work_order_id = wo.id
       LEFT JOIN ink_formula_workorder ifw ON ifw.work_order_id = wo.id
       LEFT JOIN ink_formula_detail ifd ON ifd.formula_id = ifw.formula_id
       LEFT JOIN base_ink bi ON ifd.ink_id = bi.id
       WHERE wo.id = ?
       LIMIT 1`,
      [workOrderId]
    );

    if (formulaRows.length > 0) {
      const row = formulaRows[0];
      const plannedQty = parseFloat(String(row.planned_qty || 0));
      const qtyPerPiece = parseFloat(String(row.quantity_per_piece || 0));
      const unitPrice = parseFloat(String(row.unit_price || 0));

      return plannedQty * qtyPerPiece * unitPrice;
    }

    return 0;
  }

  private async recordInkCost(result: InkCostCalculationResult): Promise<void> {
    const transNo = `INK-COST-${Date.now()}`;

    for (const usage of result.inkUsages) {
      if (usage.totalCost <= 0) continue;

      await execute(
        `INSERT INTO inv_inventory_transaction (
          trans_no, trans_type, source_type, source_id,
          material_id, material_code, material_name,
          quantity, unit_price, total_amount,
          account_dr, account_cr,
          operator_id, operator_name,
          remark, create_time
        ) VALUES (?, 'out', 'workorder', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          `${transNo}-${usage.inkId}`,
          result.workOrderId,
          usage.inkId,
          usage.inkCode,
          usage.inkName,
          usage.usageQty,
          usage.unitPrice,
          usage.totalCost,
          '6401', // 制造费用-油墨
          '1301', // 原材料
          null, // operator_id
          'system',
          `工单 ${result.workOrderNo} 油墨成本`,
        ]
      );

      // 更新库存
      await execute(
        `UPDATE base_ink 
         SET stock_qty = stock_qty - ?, update_time = NOW()
         WHERE id = ? AND stock_qty >= ?`,
        [usage.usageQty, usage.inkId, usage.usageQty]
      );
    }
  }

  private async updateWorkOrderCost(workOrderId: number, inkCost: number): Promise<void> {
    await execute(
      `INSERT INTO work_order_costs (
        work_order_id, material_cost, labor_cost, manufacturing_cost, total_cost, status, calculate_time
      ) VALUES (?, ?, 0, 0, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        material_cost = material_cost + VALUES(material_cost),
        total_cost = material_cost + labor_cost + manufacturing_cost,
        calculate_time = NOW(),
        status = 1`,
      [workOrderId, inkCost, inkCost]
    );
  }
}
