import { IWorkOrderRepository } from '@/domain/production/repositories/IWorkOrderRepository';
import { WorkOrder, WorkOrderProps } from '@/domain/production/aggregates/WorkOrder';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { transaction } from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

/** 库存行类型 */
interface InventoryRow {
  id: number;
  quantity: string | number;
}

export class ProductionApplicationService {
  constructor(
    private readonly workOrderRepo: IWorkOrderRepository
  ) {}

  async getWorkOrderById(id: number): Promise<WorkOrder> {
    const wo = await this.workOrderRepo.findById(id);
    if (!wo) throw new NotFoundError('工单不存在');
    return wo;
  }

  async listWorkOrders(
    status: string,
    page: number,
    pageSize: number,
    filters?: { keyword?: string; productId?: number }
  ) {
    return this.workOrderRepo.findByStatus(status, { page, pageSize }, filters);
  }

  async createWorkOrder(props: WorkOrderProps): Promise<{ id: number; workOrderNo: string }> {
    const wo = WorkOrder.create(props);
    const result = await this.workOrderRepo.save(wo);
    if (result.id) await this.persistAndPublishEvents(result.id, wo);
    return result;
  }

  async releaseWorkOrder(id: number): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    const previousStatus = wo.status.value;
    wo.release();
    const updated = await this.workOrderRepo.updateStatus(id, 'released', previousStatus);
    if (!updated) throw new VersionConflictError();
    await this.persistAndPublishEvents(id, wo);
    return { id, status: 'released' };
  }

  async startWorkOrder(id: number): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    const previousStatus = wo.status.value;
    wo.start();

    await transaction(async (conn) => {
      const { WorkOrderStatusVO } =
        await import('@/domain/production/value-objects/WorkOrderStatus');
      const [result] = await conn.execute<ResultSetHeader>(
        'UPDATE prod_work_order SET status = ?, actual_start_date = NOW(), update_time = NOW() WHERE id = ? AND status = ?',
        [wo.status.toDbCode(), id, WorkOrderStatusVO.from(previousStatus).toDbCode()]
      );
      if (result.affectedRows === 0) throw new VersionConflictError();
      await getDomainEventOutbox().saveEvents(conn, 'WorkOrder', id, wo.getDomainEvents());
    });

    wo.clearDomainEvents();
    return { id, status: 'in_progress' };
  }

  async pauseWorkOrder(id: number): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    const previousStatus = wo.status.value;
    wo.pause();
    const updated = await this.workOrderRepo.updateStatus(id, 'paused', previousStatus);
    if (!updated) throw new VersionConflictError();
    return { id, status: 'paused' };
  }

  async resumeWorkOrder(id: number): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    const previousStatus = wo.status.value;
    wo.resume();
    const updated = await this.workOrderRepo.updateStatus(id, 'in_progress', previousStatus);
    if (!updated) throw new VersionConflictError();
    return { id, status: 'in_progress' };
  }

  async issueMaterials(
    id: number,
    issues: Array<{ materialId: number; quantity: number; batchNo: string; warehouseId: number }>
  ): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    wo.issueMaterials(issues);

    await transaction(async (conn) => {
      for (const issue of issues) {
        await conn.execute(
          'UPDATE prod_work_order_material SET issued_qty = issued_qty + ? WHERE work_order_id = ? AND material_id = ?',
          [issue.quantity, id, issue.materialId]
        );

        const [existingInv] = await conn.execute<RowDataPacket[]>(
          'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
          [issue.materialId, issue.warehouseId]
        );
        if (existingInv.length > 0) {
          const invRow = existingInv[0] as unknown as InventoryRow;
          await conn.execute(
            'UPDATE inv_inventory SET quantity = quantity - ?, update_time = NOW() WHERE id = ?',
            [issue.quantity, invRow.id]
          );
        }

        const transNo = 'TRX' + Date.now() + String(issue.materialId).slice(-4);
        await conn.execute(
          `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, material_id, batch_no, warehouse_id, quantity, create_time)
           VALUES (?, 'out', 'workorder', ?, ?, ?, ?, ?, ?, NOW())`,
          [transNo, id, issue.materialId, issue.batchNo, issue.warehouseId, issue.quantity]
        );
      }

      await getDomainEventOutbox().saveEvents(conn, 'WorkOrder', id, wo.getDomainEvents());
    });

    wo.clearDomainEvents();
    return { id, status: wo.status.value };
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
      const { WorkOrderStatusVO } =
        await import('@/domain/production/value-objects/WorkOrderStatus');
      const [result] = await conn.execute<ResultSetHeader>(
        'UPDATE prod_work_order SET status = ?, completed_qty = completed_qty + ?, actual_end_date = NOW(), update_time = NOW() WHERE id = ? AND status = ?',
        [wo.status.toDbCode(), completedQty, id, WorkOrderStatusVO.from(previousStatus).toDbCode()]
      );
      if (result.affectedRows === 0) throw new VersionConflictError();

      const [existingInv] = await conn.execute<RowDataPacket[]>(
        'SELECT id, quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
        [wo.productId, warehouseId]
      );
      if (existingInv.length > 0) {
        const invRow = existingInv[0] as unknown as InventoryRow;
        await conn.execute(
          'UPDATE inv_inventory SET quantity = quantity + ?, update_time = NOW() WHERE id = ?',
          [completedQty, invRow.id]
        );
      } else {
        await conn.execute(
          `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, quantity, unit, create_time)
           VALUES (?, ?, ?, ?, ?, '件', NOW())`,
          [wo.productId, wo.productCode, wo.productName, warehouseId, completedQty]
        );
      }

      await getDomainEventOutbox().saveEvents(conn, 'WorkOrder', id, wo.getDomainEvents());
    });

    wo.clearDomainEvents();
    return { id, status: 'completed' };
  }

  async closeWorkOrder(id: number): Promise<{ id: number; status: string }> {
    const wo = await this.getWorkOrderById(id);
    const previousStatus = wo.status.value;
    wo.close();
    const updated = await this.workOrderRepo.updateStatus(id, 'closed', previousStatus);
    if (!updated) throw new VersionConflictError();
    await this.persistAndPublishEvents(id, wo);
    return { id, status: 'closed' };
  }

  async deleteWorkOrder(id: number): Promise<void> {
    const wo = await this.getWorkOrderById(id);
    if (!wo.canDelete()) throw new DomainError('当前状态的工单不能删除');
    await this.workOrderRepo.softDelete(id);
  }

  private async persistAndPublishEvents(aggregateId: number, wo: WorkOrder): Promise<void> {
    const events = wo.getDomainEvents();
    if (events.length === 0) return;
    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'WorkOrder', aggregateId, events);
    });
    wo.clearDomainEvents();
  }
}
