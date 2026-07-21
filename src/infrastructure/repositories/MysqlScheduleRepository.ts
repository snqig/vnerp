import { IScheduleRepository } from '@/domain/production/repositories/IScheduleRepository';
import { query, execute, queryPaginated } from '@/lib/db';

interface ScheduleRow {
  id: number;
  schedule_no: string;
  work_order_id: number | null;
  order_id: number | null;
  order_no: string | null;
  product_id: number | null;
  product_code: string | null;
  product_name: string | null;
  workshop: string | null;
  planned_qty: number | null;
  completed_qty: number | null;
  planned_start: Date | null;
  planned_end: Date | null;
  actual_start: Date | null;
  actual_end: Date | null;
  priority: number | null;
  status: number | null;
  scheduler: string | null;
  remark: string | null;
  deleted: number;
}

interface ScheduleDetailRow {
  id: number;
  schedule_id: number;
  work_order_id: number | null;
  color_seq_no: number | null;
  color_name: string | null;
  equipment_id: number | null;
  equipment_name: string | null;
  planned_start: Date | null;
  planned_end: Date | null;
  actual_start: Date | null;
  actual_end: Date | null;
  duration_hours: number | null;
  status: number | null;
}

export class MysqlScheduleRepository implements IScheduleRepository {
  async findById(id: number): Promise<ScheduleRow | null> {
    const rows = await query('SELECT * FROM prd_schedule WHERE id = ? AND deleted = 0', [
      id,
    ]);
    return rows.length > 0 ? rows[0] : null;
  }

  async findDetailsByScheduleId(scheduleId: number): Promise<ScheduleDetailRow[]> {
    return await query(
      'SELECT * FROM prd_schedule_detail WHERE schedule_id = ? AND deleted = 0 ORDER BY color_seq_no ASC',
      [scheduleId]
    );
  }

  async findByWorkOrderId(workOrderId: number): Promise<ScheduleRow | null> {
    const rows = await query(
      'SELECT * FROM prd_schedule WHERE work_order_id = ? AND deleted = 0 ORDER BY create_time DESC LIMIT 1',
      [workOrderId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async findPaginated(params: {
    page: number;
    pageSize: number;
    workshop?: string;
    status?: number;
    keyword?: string;
  }): Promise<{
    data: ScheduleRow[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    let sql = 'SELECT * FROM prd_schedule WHERE deleted = 0';
    let countSql = 'SELECT COUNT(*) as total FROM prd_schedule WHERE deleted = 0';
    const paramsArr: (string | number)[] = [];

    if (params.workshop) {
      sql += ' AND workshop = ?';
      countSql += ' AND workshop = ?';
      paramsArr.push(params.workshop);
    }

    if (params.status !== undefined && params.status !== null) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      paramsArr.push(params.status);
    }

    if (params.keyword) {
      sql += ' AND (schedule_no LIKE ? OR product_name LIKE ? OR order_no LIKE ?)';
      countSql += ' AND (schedule_no LIKE ? OR product_name LIKE ? OR order_no LIKE ?)';
      paramsArr.push(`%${params.keyword}%`, `%${params.keyword}%`, `%${params.keyword}%`);
    }

    sql += ' ORDER BY create_time DESC';

    const result = await queryPaginated(sql, countSql, paramsArr, {
      page: params.page,
      pageSize: params.pageSize,
    });

    return {
      data: result.data,
      pagination: result.pagination,
    };
  }

  async save(schedule: {
    scheduleNo: string;
    workOrderId?: number;
    orderId?: number;
    orderNo?: string;
    productId?: number;
    productCode?: string;
    productName?: string;
    workshop?: string;
    plannedQty?: number;
    completedQty?: number;
    plannedStart?: Date;
    plannedEnd?: Date;
    priority?: number;
    status?: number;
    scheduler?: string;
    remark?: string;
  }): Promise<number> {
    const result = await execute(
      `INSERT INTO prd_schedule (
        schedule_no, work_order_id, order_id, order_no, product_id, product_code,
        product_name, workshop, planned_qty, completed_qty, planned_start, planned_end,
        priority, status, scheduler, remark, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        schedule.scheduleNo,
        schedule.workOrderId || null,
        schedule.orderId || null,
        schedule.orderNo || null,
        schedule.productId || null,
        schedule.productCode || null,
        schedule.productName || null,
        schedule.workshop || null,
        schedule.plannedQty || null,
        schedule.completedQty || 0,
        schedule.plannedStart || null,
        schedule.plannedEnd || null,
        schedule.priority || 2,
        schedule.status || 1,
        schedule.scheduler || null,
        schedule.remark || null,
      ]
    );
    return result.insertId;
  }

  async saveDetails(
    details: {
      scheduleId: number;
      workOrderId?: number;
      colorSeqNo?: number;
      colorName?: string;
      equipmentId?: number;
      equipmentName?: string;
      plannedStart?: Date;
      plannedEnd?: Date;
      durationHours?: number;
      status?: number;
    }[]
  ): Promise<void> {
    for (const detail of details) {
      await execute(
        `INSERT INTO prd_schedule_detail (
          schedule_id, work_order_id, color_seq_no, color_name, equipment_id,
          equipment_name, planned_start, planned_end, duration_hours, status,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          detail.scheduleId,
          detail.workOrderId || null,
          detail.colorSeqNo || null,
          detail.colorName || null,
          detail.equipmentId || null,
          detail.equipmentName || null,
          detail.plannedStart || null,
          detail.plannedEnd || null,
          detail.durationHours || null,
          detail.status || 1,
        ]
      );
    }
  }

  async update(
    id: number,
    fields: Partial<{
      workshop: string;
      plannedQty: number;
      completedQty: number;
      plannedStart: Date;
      plannedEnd: Date;
      actualStart: Date;
      actualEnd: Date;
      priority: number;
      status: number;
      scheduler: string;
      remark: string;
    }>
  ): Promise<boolean> {
    const setClauses: string[] = [];
    const values: (string | number | Date)[] = [];

    if (fields.workshop !== undefined) {
      setClauses.push('workshop = ?');
      values.push(fields.workshop);
    }
    if (fields.plannedQty !== undefined) {
      setClauses.push('planned_qty = ?');
      values.push(fields.plannedQty);
    }
    if (fields.completedQty !== undefined) {
      setClauses.push('completed_qty = ?');
      values.push(fields.completedQty);
    }
    if (fields.plannedStart !== undefined) {
      setClauses.push('planned_start = ?');
      values.push(fields.plannedStart);
    }
    if (fields.plannedEnd !== undefined) {
      setClauses.push('planned_end = ?');
      values.push(fields.plannedEnd);
    }
    if (fields.actualStart !== undefined) {
      setClauses.push('actual_start = ?');
      values.push(fields.actualStart);
    }
    if (fields.actualEnd !== undefined) {
      setClauses.push('actual_end = ?');
      values.push(fields.actualEnd);
    }
    if (fields.priority !== undefined) {
      setClauses.push('priority = ?');
      values.push(fields.priority);
    }
    if (fields.status !== undefined) {
      setClauses.push('status = ?');
      values.push(fields.status);
    }
    if (fields.scheduler !== undefined) {
      setClauses.push('scheduler = ?');
      values.push(fields.scheduler);
    }
    if (fields.remark !== undefined) {
      setClauses.push('remark = ?');
      values.push(fields.remark);
    }

    if (setClauses.length === 0) return false;

    setClauses.push('update_time = NOW()');
    values.push(id);

    const result = await execute(
      `UPDATE prd_schedule SET ${setClauses.join(', ')} WHERE id = ? AND deleted = 0`,
      values
    );
    return result.affectedRows > 0;
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE prd_schedule SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);
  }

  async countByStatus(): Promise<Record<number, number>> {
    const rows = await query(
      'SELECT status, COUNT(*) as count FROM prd_schedule WHERE deleted = 0 GROUP BY status'
    );
    const result: Record<number, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  }

  async getConflictCount(params: {
    workshop: string;
    start: Date;
    end: Date;
    excludeId?: number;
  }): Promise<number> {
    let sql = `
      SELECT COUNT(*) as count FROM prd_schedule
      WHERE deleted = 0
        AND workshop = ?
        AND status NOT IN (5)
        AND planned_start < ?
        AND planned_end > ?
    `;
    const values: (string | number | Date)[] = [params.workshop, params.end, params.start];

    if (params.excludeId !== undefined) {
      sql += ' AND id != ?';
      values.push(params.excludeId);
    }

    const rows = await query(sql, values);
    return rows.length > 0 ? rows[0].count : 0;
  }
}
