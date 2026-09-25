import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { query, execute } from '@/lib/db';
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

    // 无直接油墨使用记录时的口径：**不推算**，保持「未归集」的真实状态。
    //
    // 原实现此处调用 calculateInkCostFromFormula() 做配方兜底，但该路径存在双重缺陷，已移除：
    //   1) 它引用的对象在库中**全部不存在** —— prd_work_order_material_req / ink_formula_detail
    //      两张表不存在，prd_ink_formula 亦不存在；且全库没有任何表有 quantity_per_piece 列。
    //      故该查询必然抛 ER_NO_SUCH_TABLE / ER_BAD_FIELD_ERROR。
    //   2) 异常会被 handle() 的 try/catch 吞掉并记一条 secureLog('error')，于是「每个工单完工」
    //      都会留下一条噪声错误日志，而油墨成本从未被真正归集（静默失效）。
    //   3) 即便它侥幸不抛错，返回值也不回填 inkUsages，recordInkCost() 会遍历空数组空转
    //      —— 结果是只写 work_order_costs 成本、却不产生任何库存流水，成本口径割裂。
    //
    // 现行真实数据面：ink_usage 与 ink_dispatch 均为 **0 行**，不存在「工单 → 实际用墨量」的数据源，
    // 任何重写都只能臆造口径（本文档口径：不臆测业务）。待「领墨单 ink_dispatch →
    // 配方 dcprint_ink_formula_version / dcprint_ink_formula_item」链路产生真实数据后，
    // 再按该新表族重写成本归集（含库存流水与配方理论成本两条口径的取舍）。
    if (inkUsages.length === 0) {
      secureLog('warn', 'Ink cost skipped: no ink usage record for work order', {
        workOrderId,
        workOrderNo,
      });
    }

    return {
      workOrderId,
      workOrderNo,
      inkUsages,
      totalInkCost: Math.round(totalInkCost * 100) / 100,
    };
  }

  private async recordInkCost(result: InkCostCalculationResult): Promise<void> {
    const transNo = `INK-COST-${Date.now()}`;

    for (const usage of result.inkUsages) {
      if (usage.totalCost <= 0) continue;

      await execute(
        // 列对齐 inv_inventory_transaction 真实列集：该表【无】material_name/operator_id/operator_name
        // （人员列实为 create_by，且为 bigint，不接受 'system' 字符串）。
        // 油墨是 base_ink 记录（其无 material_id 列、且与 inv_material id 空间不同），
        // 故 material_id/material_code 置 NULL，油墨编码改记 reference_no 以便追溯。
        `INSERT INTO inv_inventory_transaction (
          trans_no, trans_type, source_type, source_id,
          material_id, material_code,
          quantity, unit_price, total_amount,
          account_dr, account_cr,
          reference_no, remark, create_time
        ) VALUES (?, 'out', 'workorder', ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          `${transNo}-${usage.inkId}`,
          result.workOrderId,
          usage.usageQty,
          usage.unitPrice,
          usage.totalCost,
          '6401', // 制造费用-油墨
          '1301', // 原材料
          usage.inkCode,
          `工单 ${result.workOrderNo} 油墨成本（${usage.inkCode}）`,
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
