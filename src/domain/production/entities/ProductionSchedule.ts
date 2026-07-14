export interface ProductionSchedule {
  id: number;
  scheduleNo: string;
  workOrderId: number | null;
  orderId: number | null;
  orderNo: string | null;
  productId: number | null;
  productCode: string | null;
  productName: string | null;
  workshop: string | null;
  plannedQty: number | null;
  completedQty: number | null;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  priority: number | null;
  status: number | null;
  scheduler: string | null;
  remark: string | null;
}

export interface ProductionScheduleDetail {
  id: number;
  scheduleId: number;
  workOrderId: number | null;
  colorSeqNo: number | null;
  colorName: string | null;
  equipmentId: number | null;
  equipmentName: string | null;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  durationHours: number | null;
  status: number | null;
}
