import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkOrderCompletedEvent } from '@/domain/production/events/WorkOrderEvents';
import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

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
    completedQty: number
  ): Promise<ScreenPlateCostResult> {
    const plateUsages: ScreenPlateUsageRecord[] = [];

    const usageRows: any[] = (await query(
      `SELECT 
        sp.id as plateId,
        sp.plate_code as plateCode,
        sp.plate_name as plateName,
        sp.used_count as totalUsedCount,
        sp.max_use_count as maxUseCount,
        sp.life_count as lifeCount,
        sp.max_life_count as maxLifeCount,
        spu.usage_count as currentUsage,
        sp.purchase_price as purchasePrice
       FROM screen_plate_usage spu
       LEFT JOIN prd_screen_plate sp ON spu.plate_id = sp.id
       WHERE spu.work_order_id = ?
       AND spu.deleted = 0`,
      [workOrderId]
    )) as any[];

    let totalPlateCost = 0;

    for (const row of usageRows) {
      const plateId = row.plateId;
      const currentUsage = parseInt(row.currentUsage || 1);
      const maxUseCount = parseInt(row.maxUseCount || 1000);
      const lifeCount = parseInt(row.lifeCount || 0);
      const maxLifeCount = parseInt(row.maxLifeCount || 10000);
      const purchasePrice = parseFloat(row.purchasePrice || 0);

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

    // 如果没有直接使用记录，尝试从网版关联计算
    if (plateUsages.length === 0) {
      const linkedCost = await this.calculateScreenPlateCostFromLink(workOrderId);
      if (linkedCost > 0) {
        totalPlateCost = linkedCost;
      }
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

    // 磨损成本 = 采购价格 * (当前寿命计数 / 最大寿命计数)
    const wearRatio = lifeCount / maxLifeCount;

    return purchasePrice * wearRatio * 0.1; // 磨损系数10%
  }

  private async calculateScreenPlateCostFromLink(workOrderId: number): Promise<number> {
    const linkRows: any[] = (await query(
      `SELECT 
        COUNT(*) as usageCount,
        sp.purchase_price
       FROM prd_work_order wo
       LEFT JOIN prd_screen_plate sp ON wo.id IS NOT NULL
       WHERE wo.id = ?
       LIMIT 1`,
      [workOrderId]
    )) as any[];

    if (linkRows.length > 0) {
      const row = linkRows[0];
      const usageCount = parseInt(row.usageCount || 0);
      const purchasePrice = parseFloat(row.purchasePrice || 0);

      // 默认每次使用成本估算
      return usageCount * (purchasePrice / 1000);
    }

    return 0;
  }

  private async recordScreenPlateCost(result: ScreenPlateCostResult): Promise<void> {
    const transNo = `SCR-COST-${Date.now()}`;

    for (const usage of result.plateUsages) {
      if (usage.amortizedCost <= 0 && usage.wearCost <= 0) continue;

      const totalCost = usage.amortizedCost + usage.wearCost;

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
          `${transNo}-${usage.plateId}`,
          result.workOrderId,
          usage.plateId,
          usage.plateCode,
          usage.plateName,
          usage.usageCount,
          (usage.amortizedCost + usage.wearCost) / usage.usageCount,
          totalCost,
          '6402', // 制造费用-网版摊销
          '1801', // 长期待摊费用
          null,
          'system',
          `工单 ${result.workOrderNo} 网版成本`,
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
        ) VALUES (?, 'workorder_used', ?, ?, ?, ?, NOW())`,
        [usage.plateId, usage.usageCount, null, 'system']
      );
    }
  }

  private async updateWorkOrderCost(workOrderId: number, plateCost: number): Promise<void> {
    await transaction(async (conn) => {
      const [existingCost]: any[] = await conn.execute(
        `SELECT id FROM work_order_costs WHERE work_order_id = ?`,
        [workOrderId]
      );

      if (existingCost.length > 0) {
        await conn.execute(
          `UPDATE work_order_costs 
           SET manufacturing_cost = manufacturing_cost + ?,
               total_cost = material_cost + labor_cost + manufacturing_cost + ?,
               calculate_time = NOW(),
               status = 1
           WHERE work_order_id = ?`,
          [plateCost, plateCost, workOrderId]
        );
      } else {
        await conn.execute(
          `INSERT INTO work_order_costs (
            work_order_id, manufacturing_cost, total_cost, status, calculate_time
          ) VALUES (?, ?, ?, 1, NOW())`,
          [workOrderId, plateCost, plateCost]
        );
      }
    });
  }
}
