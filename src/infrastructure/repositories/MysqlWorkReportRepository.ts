import type { ResultSetHeader } from 'mysql2/promise';
import { query, execute } from '@/lib/db';
import { WorkReport, WorkReportProps } from '@/domain/production/aggregates/WorkReport';
import {
  IWorkReportRepository,
  WorkReportFilters,
} from '@/domain/production/repositories/IWorkReportRepository';

interface WorkReportRow {
  id: number;
  report_no: string;
  work_order_id: number;
  process_name: string;
  equipment_id: number | null;
  equipment_name: string;
  shift: string;
  operator_name: string;
  qualified_qty: number;
  defective_qty: number;
  defect_reason: string | null;
  work_hours: number;
  report_date: string;
  status: number;
  create_by: number | null;
  create_time: Date;
  update_time: Date | null;
}

export class MysqlWorkReportRepository implements IWorkReportRepository {
  async findById(id: number): Promise<WorkReport | null> {
    const rows = await query('SELECT * FROM prd_work_report WHERE id = ? AND deleted = 0', [id]);
    if (!rows || rows.length === 0) return null;
    return this.mapToEntity(rows[0]);
  }

  async findByReportNo(reportNo: string): Promise<WorkReport | null> {
    const rows = await query('SELECT * FROM prd_work_report WHERE report_no = ? AND deleted = 0', [
      reportNo,
    ]);
    if (!rows || rows.length === 0) return null;
    return this.mapToEntity(rows[0]);
  }

  async findByWorkOrderId(workOrderId: number): Promise<WorkReport[]> {
    const rows = await query(
      'SELECT * FROM prd_work_report WHERE work_order_id = ? AND deleted = 0 ORDER BY id DESC',
      [workOrderId]
    );
    return rows.map((r: WorkReportRow) => this.mapToEntity(r));
  }

  async findByFilters(
    filters: WorkReportFilters,
    page = 1,
    pageSize = 20
  ): Promise<{ list: WorkReport[]; total: number }> {
    const conditions: string[] = ['wr.deleted = 0'];
    const params: (string | number | null)[] = [];

    if (filters.workOrderId) {
      conditions.push('wr.work_order_id = ?');
      params.push(filters.workOrderId);
    }
    if (filters.status) {
      conditions.push('wr.status = ?');
      params.push(filters.status);
    }
    if (filters.processName) {
      conditions.push('wr.process_name = ?');
      params.push(filters.processName);
    }
    if (filters.dateFrom) {
      conditions.push('wr.report_date >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push('wr.report_date <= ?');
      params.push(filters.dateTo);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const countResult = await query(
      `SELECT COUNT(*) as total FROM prd_work_report wr ${where}`,
      params
    );
    const total = Number(countResult[0]?.total || 0);
    const rows = await query(
      `SELECT wr.* FROM prd_work_report wr ${where} ORDER BY wr.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const list = rows.map((r: WorkReportRow) => this.mapToEntity(r));
    return { list, total };
  }

  async save(report: WorkReport): Promise<number> {
    const result = await execute(
      `INSERT INTO prd_work_report (report_no, work_order_id, process_name, equipment_id, equipment_name, shift, operator_name, qualified_qty, defective_qty, defect_reason, work_hours, report_date, status, create_by, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
      [
        report.reportNo,
        report.workOrderId,
        report.processName,
        report.equipmentId || null,
        report.equipmentName,
        report.shift,
        report.operatorName,
        report.qualifiedQty,
        report.defectiveQty,
        report.defectReason,
        report.workHours,
        report.reportDate,
        report.createBy,
      ]
    );
    return (result as ResultSetHeader).insertId;
  }

  async update(report: WorkReport): Promise<void> {
    const statusMap: Record<string, number> = { draft: 1, approved: 2, cancelled: 3 };
    const statusCode = statusMap[report.status] || 1;

    await execute(
      `UPDATE prd_work_report SET status = ?, operator_name = ?, qualified_qty = ?, defective_qty = ?, defect_reason = ?, work_hours = ?, update_time = NOW() WHERE id = ?`,
      [
        statusCode,
        report.operatorName,
        report.qualifiedQty,
        report.defectiveQty,
        report.defectReason,
        report.workHours,
        report.id,
      ]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE prd_work_report SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);
  }

  private mapToEntity(row: WorkReportRow): WorkReport {
    const props: WorkReportProps = {
      id: row.id,
      reportNo: row.report_no,
      workOrderId: row.work_order_id,
      processName: row.process_name,
      equipmentId: row.equipment_id,
      equipmentName: row.equipment_name,
      shift: row.shift,
      operatorName: row.operator_name,
      qualifiedQty: Number(row.qualified_qty || 0),
      defectiveQty: Number(row.defective_qty || 0),
      defectReason: row.defect_reason,
      workHours: Number(row.work_hours || 0),
      reportDate: row.report_date,
      createBy: row.create_by,
      createTime: row.create_time,
      updateTime: row.update_time,
    };
    return WorkReport.reconstitute(props);
  }
}
