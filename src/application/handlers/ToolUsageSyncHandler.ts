import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { WorkReportedEvent } from '@/domain/production/events/WorkOrderEvents';
import { query } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { ToolManagementService } from '@/application/services/ToolManagementService';
import { MysqlToolRepository } from '@/infrastructure/repositories/MysqlToolRepository';

/**
 * 报工 → 工装寿命累计事件处理器
 *
 * 订阅 workorder.reported 事件，按报工数量累加关联刀模/网版的使用次数，
 * 计算 本次分摊成本 = unitCost × completedQty，写入 dcprint_tool_usage 快照，
 * 同步更新 dcprint_tool 主表（used_count / remain_life / accumulated_cost / net_value / status）。
 *
 * 业务幂等：以 (workOrderId, toolId) 为键，重复消费不重复累计。
 */
export class ToolUsageSyncHandler implements EventHandler<WorkReportedEvent> {
  private readonly toolService = new ToolManagementService(new MysqlToolRepository());

  async handle(event: WorkReportedEvent): Promise<void> {
    const {
      workOrderId,
      workOrderNo,
      reportId,
      completedQty,
      toolIds,
      processName,
      operatorId,
      operatorName,
    } = event.payload;

    if (completedQty <= 0 || toolIds.length === 0) return;

    secureLog('info', '[ToolUsageSyncHandler] Processing work report for tool usage', {
      workOrderId,
      workOrderNo,
      reportId,
      completedQty,
      toolIds,
    });

    for (const toolId of toolIds) {
      try {
        const existing = await query<{ id: number }>(
          `SELECT id FROM dcprint_tool_usage WHERE work_order_id = ? AND tool_id = ? LIMIT 1`,
          [workOrderId, toolId]
        );
        if (existing.length > 0) {
          secureLog('info', '[ToolUsageSyncHandler] Tool usage already recorded, skipping', {
            workOrderId,
            toolId,
          });
          continue;
        }

        await this.toolService.recordUsage({
          toolId,
          workOrderId,
          workOrderNo,
          processName,
          useCount: Math.ceil(completedQty),
          operatorId,
          operatorName,
        });

        secureLog('info', '[ToolUsageSyncHandler] Tool usage recorded', {
          workOrderId,
          workOrderNo,
          toolId,
          useCount: completedQty,
        });
      } catch (error) {
        secureLog('error', '[ToolUsageSyncHandler] Failed to record tool usage', {
          workOrderId,
          toolId,
          error: String(error),
        });
      }
    }
  }
}
