import { execute } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { DomainEvent } from '@/domain/shared/DomainTypes';

/**
 * 生产 → 财务联动处理器
 * 监听：workorder.closed
 * 功能：自动生成成本凭证
 */
export class ProductionFinanceHandler {
  async handle(event: DomainEvent): Promise<void> {
    const { workOrderId, workOrderNo } = event.payload as {
      workOrderId: number;
      workOrderNo: string;
    };

    secureLog('info', 'ProductionFinanceHandler: work order closed', {
      workOrderId,
      workOrderNo,
    });

    // 获取工单成本数据
    const rows = await execute(
      `SELECT total_material_cost, total_labor_cost, total_tool_cost,
              total_overhead_cost, unit_cost, finished_qty
       FROM prod_work_order WHERE id = ? AND deleted = 0`,
      [workOrderId]
    );
    const wo = (rows as any)[0];
    if (!wo) return;

    const totalCost =
      Number(wo.total_material_cost || 0) +
      Number(wo.total_labor_cost || 0) +
      Number(wo.total_tool_cost || 0) +
      Number(wo.total_overhead_cost || 0);

    // 生成成本凭证记录（使用 fin_receivable 表记录生产成本）
    const voucherNo = `COST${workOrderNo}${Date.now().toString().slice(-6)}`;
    await execute(
      `INSERT INTO fin_receivable
       (receivable_no, source_type, source_no, amount, due_date, status, remark, create_time)
       VALUES (?, 3, ?, ?, NOW(), 1, ?, NOW())`,
      [voucherNo, workOrderNo, totalCost, `工单${workOrderNo}成本归集`]
    );

    secureLog('info', 'ProductionFinanceHandler: cost voucher created', {
      workOrderNo,
      totalCost,
      voucherNo,
    });
  }
}
