import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { query, execute } from '@/lib/db';
import { secureLog } from '@/lib/logger';

/**
 * 工装成本分摊归集处理器
 *
 * 订阅 workorder.completed 事件，归集该工单所有工装使用记录（dcprint_tool_usage）
 * 的 amortized_cost 到完工成本核算表（work_order_costs.manufacturing_cost），
 * 与 InkCostHandler（油墨） / ScreenPlateCostHandler（网版）保持同一归集模式。
 *
 * 分摊成本快照在报工时由 ToolManagementService.recordUsage 固化，此处仅做汇总归集，
 * 不重算历史数据，保证历史工单不受后续调整影响。
 */
export class ToolCostHandler implements EventHandler<WorkOrderCompletedEvent> {
  async handle(event: WorkOrderCompletedEvent): Promise<void> {
    const { workOrderId, workOrderNo, completedQty } = event.payload;

    secureLog('info', '[ToolCostHandler] Processing tool cost for work order', {
      workOrderId,
      workOrderNo,
      completedQty,
    });

    try {
      const rows = await query<{ total_tool_cost: string | number }>(
        `SELECT COALESCE(SUM(amortized_cost), 0) AS total_tool_cost
         FROM dcprint_tool_usage
         WHERE work_order_id = ?`,
        [workOrderId]
      );

      const totalToolCost = parseFloat(String(rows[0]?.total_tool_cost || 0));

      if (totalToolCost > 0) {
        await this.recordToolCost(workOrderId, workOrderNo, totalToolCost);
        await this.updateWorkOrderCost(workOrderId, totalToolCost);
        secureLog('info', '[ToolCostHandler] Tool cost recorded', {
          workOrderNo,
          totalCost: totalToolCost,
        });
      }
    } catch (error) {
      secureLog('error', '[ToolCostHandler] Failed to process tool cost', {
        workOrderNo,
        error: String(error),
      });
    }
  }

  private async recordToolCost(
    workOrderId: number,
    workOrderNo: string,
    totalCost: number
  ): Promise<void> {
    const transNo = `TOOL-COST-${workOrderId}-${Date.now()}`;
    await execute(
      `INSERT INTO inv_inventory_transaction (
        trans_no, trans_type, source_type, source_id,
        material_id, material_code, material_name,
        quantity, unit_price, total_amount,
        account_dr, account_cr,
        operator_id, operator_name,
        remark, create_time
      ) VALUES (?, 'out', 'workorder', ?, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, NULL, 'system', ?, NOW())`,
      [transNo, workOrderId, totalCost, '6403', '1801', `工单 ${workOrderNo} 工装摊销成本归集`]
    );
  }

  private async updateWorkOrderCost(workOrderId: number, toolCost: number): Promise<void> {
    await execute(
      `INSERT INTO work_order_costs (
        work_order_id, material_cost, labor_cost, manufacturing_cost, total_cost, status, calculate_time
      ) VALUES (?, 0, 0, ?, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        manufacturing_cost = manufacturing_cost + VALUES(manufacturing_cost),
        total_cost = material_cost + labor_cost + manufacturing_cost,
        calculate_time = NOW(),
        status = 1`,
      [workOrderId, toolCost, toolCost]
    );
  }
}
