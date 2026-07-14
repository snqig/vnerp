import type { ProductionSchedule, ProductionScheduleDetail } from '../entities/ProductionSchedule';

export interface IScheduleRepository {
  findById(id: number): Promise<ProductionSchedule | null>;
  findDetailsByScheduleId(scheduleId: number): Promise<ProductionScheduleDetail[]>;
  findByWorkOrderId(workOrderId: number): Promise<ProductionSchedule | null>;
  findPaginated(params: {
    page: number;
    pageSize: number;
    workshop?: string;
    status?: number;
    keyword?: string;
  }): Promise<{
    data: ProductionSchedule[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>;
  save(schedule: {
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
  }): Promise<number>;
  saveDetails(
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
  ): Promise<void>;
  update(
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
  ): Promise<boolean>;
  softDelete(id: number): Promise<void>;
  countByStatus(): Promise<Record<number, number>>;
  getConflictCount(params: {
    workshop: string;
    start: Date;
    end: Date;
    excludeId?: number;
  }): Promise<number>;
}
