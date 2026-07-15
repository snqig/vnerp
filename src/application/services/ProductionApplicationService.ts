import { IWorkOrderRepository } from '@/domain/production/repositories/IWorkOrderRepository';
import { IPickOrderRepository, PickOrderFilters } from '@/domain/production/repositories/IPickOrderRepository';
import { IWorkReportRepository, WorkReportFilters } from '@/domain/production/repositories/IWorkReportRepository';
import { IFinishOrderRepository, FinishOrderFilters } from '@/domain/production/repositories/IFinishOrderRepository';
import { WorkOrder, WorkOrderProps } from '@/domain/production/aggregates/WorkOrder';
import { PickOrder, PickOrderProps } from '@/domain/production/aggregates/PickOrder';
import { WorkReport, WorkReportProps } from '@/domain/production/aggregates/WorkReport';
import { FinishOrder, FinishOrderProps } from '@/domain/production/aggregates/FinishOrder';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction, execute, query } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

export class ProductionApplicationService {
  constructor(
    private readonly workOrderRepo: IWorkOrderRepository,
    private readonly pickOrderRepo?: IPickOrderRepository,
    private readonly workReportRepo?: IWorkReportRepository,
    private readonly finishOrderRepo?: IFinishOrderRepository
  ) {}

  // ==================== 工单基础 ====================

  async getWorkOrderById(id: number): Promise<WorkOrder> {
    const wo = await this.workOrderRepo.findById(id);
    if (!wo) throw new NotFoundError('工单不存在');
    return wo;
  }

  async listWorkOrders(
    status: string,
    page: number,
    pageSize: number,
    filters?: Record<string, unknown>
  ) {
    return this.workOrderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createWorkOrder(props: WorkOrderProps): Promise<{ id: number; workOrderNo: string }> {
    const wo = WorkOrder.create(props);
    const result = await this.workOrderRepo.save(wo);
    if (result.id) {
      await this.persistAndPublishEvents(wo.id! || result.id, wo);
    }
    return result;
  }

  async approveWorkOrder(id: number, userId: number): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    const previousStatus = wo.status.value;
    wo.approve(userId);
    const updated = await this.workOrderRepo.updateStatus(id, 'approved', previousStatus);
    if (!updated) throw new VersionConflictError();
    await this.persistAndPublishEvents(id, wo);
    return { id, status: 'approved' };
  }

  async startWorkOrder(id: number): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    const previousStatus = wo.status.value;
    wo.start();
    await transaction(async (conn) => {
      const [result] = await conn.execute<ResultSetHeader>(
        `UPDATE prod_work_order SET status = ?, actual_start_date = NOW(), update_time = NOW()
         WHERE id = ? AND status = ?`,
        [this.statusToDbCode(wo.status.value), id, this.statusToDbCode(previousStatus)]
      );
      if (result.affectedRows === 0) throw new VersionConflictError();
      await getDomainEventOutbox().saveEvents(conn, 'WorkOrder', id, wo.getDomainEvents());
    });
    wo.clearDomainEvents();
    return { id, status: 'in_progress' };
  }

  async completeWorkOrder(
    id: number,
    completedQty: number,
    warehouseId: number
  ): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    const previousStatus = wo.status.value;
    wo.complete(completedQty, warehouseId);
    await transaction(async (conn) => {
      const [result] = await conn.execute<ResultSetHeader>(
        `UPDATE prod_work_order SET status = ?, completed_qty = completed_qty + ?,
         actual_end_date = NOW(), update_time = NOW()
         WHERE id = ? AND status = ?`,
        [
          this.statusToDbCode(wo.status.value),
          completedQty,
          id,
          this.statusToDbCode(previousStatus),
        ]
      );
      if (result.affectedRows === 0) throw new VersionConflictError();
      await getDomainEventOutbox().saveEvents(conn, 'WorkOrder', id, wo.getDomainEvents());
    });
    wo.clearDomainEvents();
    return { id, status: 'completed' };
  }

  async closeWorkOrder(id: number): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    const previousStatus = wo.status.value;
    // 结案时自动核算成本
    await this.calculateWorkOrderCosts(id);
    wo.close();
    const updated = await this.workOrderRepo.updateStatus(id, 'closed', previousStatus);
    if (!updated) throw new VersionConflictError();
    await this.persistAndPublishEvents(id, wo);
    return { id, status: 'closed' };
  }

  async cancelWorkOrder(
    id: number,
    reason: string,
    userId: number
  ): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    const previousStatus = wo.status.value;
    wo.cancel(reason, userId);
    const updated = await this.workOrderRepo.updateStatus(id, 'cancelled', previousStatus);
    if (!updated) throw new VersionConflictError();
    await this.persistAndPublishEvents(id, wo);
    return { id, status: 'cancelled' };
  }

  async deleteWorkOrder(id: number): Promise<void> {
    const wo = await this.getWorkOrderById(id);
    if (!wo.canDelete()) throw new DomainError('当前状态的工单不能删除');
    await this.workOrderRepo.softDelete(id);
  }

  // ==================== 领料单 ====================

  async createPickOrder(props: PickOrderProps): Promise<{ id: number; pickNo: string }> {
    const pickNo = props.pickNo || (await generateDocumentNo('material_pick'));
    const order = PickOrder.create({ ...props, pickNo });
    const result = await this.pickOrderRepo!.save(order);
    if (result) {
      await this.persistAndPublishEvents(result, order);
    }
    return { id: result, pickNo };
  }

  async approvePickOrder(id: number, userId: number): Promise<{ id: number; status: string }> {
    const po = await this.loadPickOrder(id);
    po.approve(userId);
    await this.pickOrderRepo!.update(po);
    await this.persistAndPublishEvents(id, po);
    return { id, status: 'approved' };
  }

  async cancelPickOrder(id: number, reason: string, userId: number): Promise<void> {
    const po = await this.loadPickOrder(id);
    po.cancel(reason, userId);
    await this.pickOrderRepo!.update(po);
    await this.persistAndPublishEvents(id, po);
  }

  async listPickOrders(filters: Record<string, unknown>, page = 1, pageSize = 20) {
    return this.pickOrderRepo!.findByFilters(filters as PickOrderFilters, page, pageSize);
  }

  // ==================== 报工单 ====================

  async createWorkReport(props: WorkReportProps): Promise<{ id: number; reportNo: string }> {
    const reportNo = props.reportNo || (await generateDocumentNo('process_report'));
    const report = WorkReport.create({ ...props, reportNo });
    const id = await this.workReportRepo!.save(report);
    if (id) await this.persistAndPublishEvents(id, report);
    return { id, reportNo };
  }

  async approveWorkReport(id: number, userId: number, workOrderNo: string): Promise<void> {
    const report = await this.loadWorkReport(id);
    // Set the work order no in the event
    report.approve(userId);
    await this.workReportRepo!.update(report);
    await this.persistAndPublishEvents(id, report);
  }

  async cancelWorkReport(id: number, reason: string, userId: number): Promise<void> {
    const report = await this.loadWorkReport(id);
    report.cancel(reason, userId);
    await this.workReportRepo!.update(report);
    await this.persistAndPublishEvents(id, report);
  }

  async listWorkReports(filters: Record<string, unknown>, page = 1, pageSize = 20) {
    return this.workReportRepo!.findByFilters(filters as WorkReportFilters, page, pageSize);
  }

  // ==================== 完工入库单 ====================

  async createFinishOrder(props: FinishOrderProps): Promise<{ id: number; finishNo: string }> {
    const finishNo = props.finishNo || (await generateDocumentNo('finish_inbound'));
    const order = FinishOrder.create({ ...props, finishNo });
    const id = await this.finishOrderRepo!.save(order);
    if (id) await this.persistAndPublishEvents(id, order);
    return { id, finishNo };
  }

  async approveFinishOrder(id: number, userId: number): Promise<void> {
    const order = await this.loadFinishOrder(id);
    const wo = await this.workOrderRepo.findById(order.workOrderId);
    order.approve(userId, wo?.workOrderNo || '', wo?.productName || '');
    await this.finishOrderRepo!.update(order);
    await this.persistAndPublishEvents(id, order);
  }

  async cancelFinishOrder(id: number, reason: string, userId: number): Promise<void> {
    const order = await this.loadFinishOrder(id);
    order.cancel(reason, userId);
    await this.finishOrderRepo!.update(order);
    await this.persistAndPublishEvents(id, order);
  }

  async listFinishOrders(filters: Record<string, unknown>, page = 1, pageSize = 20) {
    return this.finishOrderRepo!.findByFilters(filters as FinishOrderFilters, page, pageSize);
  }

  // ==================== 成本核算 ====================

  async calculateWorkOrderCosts(workOrderId: number): Promise<void> {
    // 材料成本 = SUM(领料金额) - SUM(退料金额)
    const materialCostResult = await query(
      `SELECT COALESCE(SUM(pi.line_amount), 0) as total_material,
              COALESCE((SELECT SUM(ri.line_amount) FROM prd_return_order_item ri
                JOIN prd_return_order ro ON ri.return_order_id = ro.id
                WHERE ro.work_order_id = ? AND ro.status = 2 AND ro.deleted = 0), 0) as total_return`,
      [workOrderId]
    );
    const materialCost =
      Number(materialCostResult[0]?.total_material || 0) -
      Number(materialCostResult[0]?.total_return || 0);

    // 人工成本 = SUM(报工工时 × 费率)  — 默认 50 元/小时
    const laborCostResult = await query(
      `SELECT COALESCE(SUM(wr.work_hours), 0) * 50 as total_labor
       FROM prd_work_report wr
       WHERE wr.work_order_id = ? AND wr.status = 2 AND wr.deleted = 0`,
      [workOrderId]
    );
    const laborCost = Number(laborCostResult[0]?.total_labor || 0);

    // 工装成本 = SUM(工装使用记录中的分摊成本)
    const toolCostResult = await query(
      `SELECT COALESCE(SUM(tu.amortized_cost), 0) as total_tool
       FROM dcprint_tool_usage tu
       WHERE tu.work_order_id = ?`,
      [workOrderId]
    );
    const toolCost = Number(toolCostResult[0]?.total_tool || 0);

    // 制造费用 = 材料成本 × 50%（可配置）
    const overheadRate = 0.5;
    const overheadCost = materialCost * overheadRate;

    // 合格数量
    const qtyResult = await query(
      'SELECT COALESCE(SUM(qualified_qty), 0) as total_qty FROM prd_finish_order WHERE work_order_id = ? AND status = 2 AND deleted = 0',
      [workOrderId]
    );
    const totalQty = Number(qtyResult[0]?.total_qty || 0);
    const totalCost = materialCost + laborCost + toolCost + overheadCost;
    const unitCost = totalQty > 0 ? totalCost / totalQty : 0;

    await execute(
      `UPDATE prod_work_order SET
       total_material_cost = ?, total_labor_cost = ?, total_tool_cost = ?,
       total_overhead_cost = ?, unit_cost = ?, update_time = NOW()
       WHERE id = ?`,
      [materialCost, laborCost, toolCost, overheadCost, unitCost, workOrderId]
    );
  }

  // ==================== 工具方法 ====================

  private async loadPickOrder(id: number): Promise<PickOrder> {
    const po = await this.pickOrderRepo!.findById(id);
    if (!po) throw new NotFoundError('领料单不存在');
    return po;
  }

  private async loadWorkReport(id: number): Promise<WorkReport> {
    const report = await this.workReportRepo!.findById(id);
    if (!report) throw new NotFoundError('报工单不存在');
    return report;
  }

  private async loadFinishOrder(id: number): Promise<FinishOrder> {
    const order = await this.finishOrderRepo!.findById(id);
    if (!order) throw new NotFoundError('完工入库单不存在');
    return order;
  }

  private statusToDbCode(status: string): number {
    const map: Record<string, number> = {
      draft: 1,
      approved: 2,
      picking: 3,
      in_progress: 4,
      completed: 5,
      closed: 6,
      cancelled: 7,
    };
    return map[status] || 1;
  }

  private async persistAndPublishEvents(aggregateId: number, aggregate: any): Promise<void> {
    const events = aggregate.getDomainEvents ? aggregate.getDomainEvents() : [];
    if (events.length === 0) return;
    await transaction(async (conn) => {
      const aggregateType = aggregate.constructor.name;
      await getDomainEventOutbox().saveEvents(conn, aggregateType, aggregateId, events);
    });
    if (aggregate.clearDomainEvents) aggregate.clearDomainEvents();
  }
}
