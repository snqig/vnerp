import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { query, execute } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { CalcParamService } from '@/lib/calc-param-service';

export interface ScreenPlateUsageRecord {
  plateId: number;
  plateCode: string;
  plateName: string;
  usageCount: number;
  amortizedCost: number;
  wearCost: number;
}

export interface ScreenPlateCostResult {
  workOrderId: number;
  workOrderNo: string;
  plateUsages: ScreenPlateUsageRecord[];
  totalPlateCost: number;
}

/**
 * 网版成本归集处理器
 *
 * 订阅 workorder.completed 事件，归集本工单网版使用成本到完工成本核算表
 * （work_order_costs.manufacturing_cost），与 InkCostHandler（油墨）/ ToolCostHandler（工装）
 * 保持同一归集模式。
 *
 * 数据来源（2026-09-23 依库结构核实后校正）：
 * - 工单↔网版 的关联落在 `prd_work_report.screen_plate_id`（报工单），
 *   原代码引用的 `screen_plate_usage` 表在库中并不存在，导致本 handler 每次触发都抛异常并被
 *   catch 静默吞掉（等于从未生效）。
 * - 网版价格：`prd_screen_plate` 没有任何价格列，`inv_material` 中「网版」行的
 *   purchase_price 亦为空，故不从表取价，改由系统参数
 *   `screen_plate.default_purchase_price`（缺省 0）提供，避免臆造金额。
 */
export class ScreenPlateCostHandler implements EventHandler<WorkOrderCompletedEvent> {
  async handle(event: WorkOrderCompletedEvent): Promise<void> {
    const { workOrderId, workOrderNo, completedQty } = event.payload;

    secureLog('info', 'Processing screen plate cost for work order', {
      workOrderId,
      workOrderNo,
      completedQty,
    });

    try {
      const result = await this.calculateScreenPlateCost(workOrderId, workOrderNo, completedQty);

      if (result.totalPlateCost > 0) {
        await this.recordScreenPlateCost(result);
        await this.updateWorkOrderCost(workOrderId, result.totalPlateCost);
        secureLog('info', 'Screen plate cost recorded', {
          workOrderNo,
          totalCost: result.totalPlateCost,
          plateCount: result.plateUsages.length,
        });
      }
    } catch (error) {
      secureLog('error', 'Failed to process screen plate cost', {
        workOrderNo,
        error: String(error),
      });
    }
  }

  private async calculateScreenPlateCost(
    workOrderId: number,
    workOrderNo: string,
    _completedQty: number
  ): Promise<ScreenPlateCostResult> {
    const plateUsages: ScreenPlateUsageRecord[] = [];

    // 工单↔网版 的唯一真实关联：报工单 prd_work_report.screen_plate_id
    const usageRows = await query<{
      plateId: number;
      plateCode: string;
      plateName: string;
      currentUsage: string | number;
      maxUseCount: string | number;
      lifeCount: string | number;
      maxLifeCount: string | number;
    }>(
      `SELECT
        sp.id as plateId,
        sp.plate_code as plateCode,
        sp.plate_name as plateName,
        COUNT(wr.id) as currentUsage,
        sp.max_use_count as maxUseCount,
        sp.life_count as lifeCount,
        sp.max_life_count as maxLifeCount
       FROM prd_work_report wr
       INNER JOIN prd_screen_plate sp ON sp.id = wr.screen_plate_id AND sp.deleted = 0
       WHERE wr.work_order_id = ?
       AND wr.deleted = 0
       GROUP BY sp.id, sp.plate_code, sp.plate_name,
                sp.max_use_count, sp.life_count, sp.max_life_count`,
      [workOrderId]
    );

    // 网版无采购价字段，价格来自系统参数；缺省 0 表示暂不归集，不臆造金额
    const purchasePrice = CalcParamService.getCachedDecimal(
      'screen_plate.default_purchase_price',
      0
    );

    let totalPlateCost = 0;

    for (const row of usageRows) {
      const plateId = row.plateId;
      const currentUsage = parseInt(String(row.currentUsage || 1));
      const maxUseCount = parseInt(String(row.maxUseCount || 1000));
      const lifeCount = parseInt(String(row.lifeCount || 0));
      const maxLifeCount = parseInt(String(row.maxLifeCount || 10000));

      // 计算摊销成本：按使用次数摊销
      const amortizedCost = this.calculateAmortizedCost(purchasePrice, maxUseCount, currentUsage);

      // 计算磨损成本：基于寿命计数
      const wearCost = this.calculateWearCost(purchasePrice, lifeCount, maxLifeCount);

      const totalCost = amortizedCost + wearCost;

      plateUsages.push({
        plateId,
        plateCode: row.plateCode,
        plateName: row.plateName,
        usageCount: currentUsage,
        amortizedCost: Math.round(amortizedCost * 100) / 100,
        wearCost: Math.round(wearCost * 100) / 100,
      });

      totalPlateCost += totalCost;
    }

    return {
      workOrderId,
      workOrderNo,
      plateUsages,
      totalPlateCost: Math.round(totalPlateCost * 100) / 100,
    };
  }

  private calculateAmortizedCost(
    purchasePrice: number,
    maxUseCount: number,
    currentUsage: number
  ): number {
    if (maxUseCount <= 0 || purchasePrice <= 0) {
      return 0;
    }

    // 每次使用成本 = 采购价格 / 最大使用次数
    const costPerUse = purchasePrice / maxUseCount;

    // 本次使用的摊销成本
    return costPerUse * currentUsage;
  }

  private calculateWearCost(
    purchasePrice: number,
    lifeCount: number,
    maxLifeCount: number
  ): number {
    if (maxLifeCount <= 0 || purchasePrice <= 0) {
      return 0;
    }

    // 磨损成本 = 采购价格 * (当前寿命计数 / 最大寿命计数) * 磨损系数
    const wearRatio = lifeCount / maxLifeCount;
    const wearCostRatio = CalcParamService.getCachedDecimal('screen_plate.wear_cost_ratio', 0.1);

    return purchasePrice * wearRatio * wearCostRatio; // 磨损系数从配置读取
  }

  private async recordScreenPlateCost(result: ScreenPlateCostResult): Promise<void> {
    const transNo = `SCR-COST-${Date.now()}`;

    for (const usage of result.plateUsages) {
      if (usage.amortizedCost <= 0 && usage.wearCost <= 0) continue;

      const totalCost = usage.amortizedCost + usage.wearCost;
      // 网版不是 inv_material 记录（两者 id 空间不同），故 material_id 置 NULL，
      // 与 ToolCostHandler 保持一致，仅在 remark 中保留网版编码以便追溯。
      const unitPrice = usage.usageCount > 0 ? totalCost / usage.usageCount : 0;

      await execute(
        `INSERT INTO inv_inventory_transaction (
          trans_no, trans_type, source_type, source_id,
          material_id, material_code,
          quantity, unit_price, total_amount,
          account_dr, account_cr,
          reference_no, remark, create_time
        ) VALUES (?, 'out', 'workorder', ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          `${transNo}-${usage.plateId}`,
          result.workOrderId,
          usage.usageCount,
          unitPrice,
          totalCost,
          '6402', // 制造费用-网版摊销
          '1801', // 长期待摊费用
          usage.plateCode,
          `工单 ${result.workOrderNo} 网版成本（${usage.plateCode}）`,
        ]
      );

      // 更新网版使用次数
      await execute(
        `UPDATE prd_screen_plate 
         SET used_count = used_count + ?,
             life_count = life_count + ?,
             last_used_date = NOW(),
             update_time = NOW()
         WHERE id = ?`,
        [usage.usageCount, usage.usageCount, usage.plateId]
      );

      // 记录网版使用历史
      await execute(
        `INSERT INTO screen_plate_history (
          screen_plate_id, action, life_increment, operator_id, operator_name, created_at
        ) VALUES (?, 'workorder_used', ?, ?, ?, NOW())`,
        [usage.plateId, usage.usageCount, null, 'system']
      );
    }
  }

  private async updateWorkOrderCost(workOrderId: number, plateCost: number): Promise<void> {
    await execute(
      `INSERT INTO work_order_costs (
        work_order_id, material_cost, labor_cost, manufacturing_cost, total_cost, status, calculate_time
      ) VALUES (?, 0, 0, ?, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        manufacturing_cost = manufacturing_cost + VALUES(manufacturing_cost),
        total_cost = material_cost + labor_cost + manufacturing_cost,
        calculate_time = NOW(),
        status = 1`,
      [workOrderId, plateCost, plateCost]
    );
  }
}
