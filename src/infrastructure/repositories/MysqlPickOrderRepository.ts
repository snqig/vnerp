import { query, execute } from '@/lib/db';
import { PickOrder, PickOrderProps } from '@/domain/production/aggregates/PickOrder';
import {
  IPickOrderRepository,
  PickOrderFilters,
} from '@/domain/production/repositories/IPickOrderRepository';
import type { ResultSetHeader } from 'mysql2/promise';

export class MysqlPickOrderRepository implements IPickOrderRepository {
  async findById(id: number): Promise<PickOrder | null> {
    const rows = await query('SELECT * FROM prd_pick_order WHERE id = ? AND deleted = 0', [id]);
    if (!rows || rows.length === 0) return null;
    return this.mapToEntity(rows[0]);
  }

  async findByPickNo(pickNo: string): Promise<PickOrder | null> {
    const rows = await query('SELECT * FROM prd_pick_order WHERE pick_no = ? AND deleted = 0', [
      pickNo,
    ]);
    if (!rows || rows.length === 0) return null;
    return this.mapToEntity(rows[0]);
  }

  async findByWorkOrderId(workOrderId: number): Promise<PickOrder[]> {
    const rows = await query(
      'SELECT * FROM prd_pick_order WHERE work_order_id = ? AND deleted = 0 ORDER BY id DESC',
      [workOrderId]
    );
    return Promise.all(rows.map((r: any) => this.mapToEntity(r)));
  }

  async findByFilters(
    filters: PickOrderFilters,
    page = 1,
    pageSize = 20
  ): Promise<{ list: PickOrder[]; total: number }> {
    const conditions: string[] = ['po.deleted = 0'];
    const params: (string | number | null)[] = [];

    if (filters.workOrderId) {
      conditions.push('po.work_order_id = ?');
      params.push(filters.workOrderId);
    }
    if (filters.status) {
      conditions.push('po.status = ?');
      params.push(filters.status);
    }
    if (filters.keyword) {
      conditions.push('(po.pick_no LIKE ? OR po.picker_name LIKE ?)');
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const countResult = await query(
      `SELECT COUNT(*) as total FROM prd_pick_order po ${where}`,
      params
    );
    const total = Number(countResult[0]?.total || 0);
    const rows = await query(
      `SELECT po.* FROM prd_pick_order po ${where} ORDER BY po.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const list = await Promise.all(rows.map((r: any) => this.mapToEntity(r)));
    return { list, total };
  }

  async save(order: PickOrder): Promise<number> {
    const result = await execute(
      `INSERT INTO prd_pick_order (pick_no, work_order_id, warehouse_id, picker_name, total_qty, status, remark, create_by, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        order.pickNo,
        order.workOrderId,
        order.warehouseId,
        order.pickerName,
        order.totalQty,
        1,
        order.remark,
        order.createBy,
      ]
    );
    const id = result.insertId;

    for (const item of order.items) {
      await execute(
        `INSERT INTO prd_pick_order_item (pick_order_id, material_id, material_name, material_spec, required_qty, actual_qty, batch_no, unit_cost, line_amount, unit, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.materialId,
          item.materialName,
          item.materialSpec,
          item.requiredQty,
          item.actualQty,
          item.batchNo,
          item.unitCost,
          item.lineAmount,
          item.unit,
          item.remark,
        ]
      );
    }
    return id;
  }

  async update(order: PickOrder): Promise<void> {
    const statusMap: Record<string, number> = { draft: 1, approved: 2, cancelled: 3 };
    const statusCode = statusMap[order.status] || 1;

    await execute(
      `UPDATE prd_pick_order SET status = ?, picker_name = ?, total_qty = ?, remark = ?, update_time = NOW() WHERE id = ?`,
      [statusCode, order.pickerName, order.totalQty, order.remark, order.id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE prd_pick_order SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);
  }

  private async mapToEntity(row: any): Promise<PickOrder> {
    const items = await query('SELECT * FROM prd_pick_order_item WHERE pick_order_id = ?', [
      row.id,
    ]);
    const props: PickOrderProps = {
      id: row.id,
      pickNo: row.pick_no,
      workOrderId: row.work_order_id,
      warehouseId: row.warehouse_id,
      pickerName: row.picker_name,
      totalQty: Number(row.total_qty || 0),
      remark: row.remark,
      createBy: row.create_by,
      createTime: row.create_time,
      updateTime: row.update_time,
      items: (items || []).map((i: any) => ({
        id: i.id,
        materialId: i.material_id,
        materialName: i.material_name,
        materialSpec: i.material_spec,
        requiredQty: Number(i.required_qty || 0),
        actualQty: Number(i.actual_qty || 0),
        batchNo: i.batch_no,
        unitCost: Number(i.unit_cost || 0),
        lineAmount: Number(i.line_amount || 0),
        unit: i.unit || 'pcs',
        remark: i.remark,
      })),
    };
    return PickOrder.reconstitute(props);
  }
}
