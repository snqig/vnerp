import { query, execute } from '@/lib/db';
import { FinishOrder, FinishOrderProps } from '@/domain/production/aggregates/FinishOrder';
import {
  IFinishOrderRepository,
  FinishOrderFilters,
} from '@/domain/production/repositories/IFinishOrderRepository';
import type { ResultSetHeader } from 'mysql2/promise';

export class MysqlFinishOrderRepository implements IFinishOrderRepository {
  async findById(id: number): Promise<FinishOrder | null> {
    const rows = await query('SELECT * FROM prd_finish_order WHERE id = ? AND deleted = 0', [id]);
    if (!rows || rows.length === 0) return null;
    return this.mapToEntity(rows[0]);
  }

  async findByFinishNo(finishNo: string): Promise<FinishOrder | null> {
    const rows = await query('SELECT * FROM prd_finish_order WHERE finish_no = ? AND deleted = 0', [
      finishNo,
    ]);
    if (!rows || rows.length === 0) return null;
    return this.mapToEntity(rows[0]);
  }

  async findByWorkOrderId(workOrderId: number): Promise<FinishOrder[]> {
    const rows = await query(
      'SELECT * FROM prd_finish_order WHERE work_order_id = ? AND deleted = 0 ORDER BY id DESC',
      [workOrderId]
    );
    return rows.map((r: any) => this.mapToEntity(r));
  }

  async findByFilters(
    filters: FinishOrderFilters,
    page = 1,
    pageSize = 20
  ): Promise<{ list: FinishOrder[]; total: number }> {
    const conditions: string[] = ['fo.deleted = 0'];
    const params: (string | number | null)[] = [];

    if (filters.workOrderId) {
      conditions.push('fo.work_order_id = ?');
      params.push(filters.workOrderId);
    }
    if (filters.status) {
      conditions.push('fo.status = ?');
      params.push(filters.status);
    }
    if (filters.warehouseId) {
      conditions.push('fo.warehouse_id = ?');
      params.push(filters.warehouseId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const countResult = await query(
      `SELECT COUNT(*) as total FROM prd_finish_order fo ${where}`,
      params
    );
    const total = Number(countResult[0]?.total || 0);
    const rows = await query(
      `SELECT fo.* FROM prd_finish_order fo ${where} ORDER BY fo.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const list = rows.map((r: any) => this.mapToEntity(r));
    return { list, total };
  }

  async save(order: FinishOrder): Promise<number> {
    const result = await execute(
      `INSERT INTO prd_finish_order (finish_no, work_order_id, warehouse_id, qualified_qty, defective_qty, status, create_by, create_time)
       VALUES (?, ?, ?, ?, ?, 1, ?, NOW())`,
      [
        order.finishNo,
        order.workOrderId,
        order.warehouseId,
        order.qualifiedQty,
        order.defectiveQty,
        order.createBy,
      ]
    );
    return result.insertId;
  }

  async update(order: FinishOrder): Promise<void> {
    const statusMap: Record<string, number> = { draft: 1, approved: 2, cancelled: 3 };
    const statusCode = statusMap[order.status] || 1;

    await execute(
      `UPDATE prd_finish_order SET status = ?, qualified_qty = ?, defective_qty = ?, update_time = NOW() WHERE id = ?`,
      [statusCode, order.qualifiedQty, order.defectiveQty, order.id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE prd_finish_order SET deleted = 1, update_time = NOW() WHERE id = ?', [
      id,
    ]);
  }

  private mapToEntity(row: any): FinishOrder {
    const props: FinishOrderProps = {
      id: row.id,
      finishNo: row.finish_no,
      workOrderId: row.work_order_id,
      warehouseId: row.warehouse_id,
      qualifiedQty: Number(row.qualified_qty || 0),
      defectiveQty: Number(row.defective_qty || 0),
      createBy: row.create_by,
      createTime: row.create_time,
      updateTime: row.update_time,
    };
    return FinishOrder.reconstitute(props);
  }
}
