import { WorkReport } from '../aggregates/WorkReport';

export interface WorkReportFilters {
  workOrderId?: number;
  status?: string;
  processName?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface IWorkReportRepository {
  findById(id: number): Promise<WorkReport | null>;
  findByReportNo(reportNo: string): Promise<WorkReport | null>;
  findByWorkOrderId(workOrderId: number): Promise<WorkReport[]>;
  findByFilters(
    filters: WorkReportFilters,
    page?: number,
    pageSize?: number
  ): Promise<{ list: WorkReport[]; total: number }>;
  save(report: WorkReport): Promise<number>;
  update(report: WorkReport): Promise<void>;
  softDelete(id: number): Promise<void>;
}
