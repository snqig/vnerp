export enum PurBizStatus {
  DRAFT = 0,
  SUBMITTED = 1,
  REVIEWING = 2,
  REVIEW_PASS = 3,
  APPROVED = 4,
  CONVERT_PO = 5,
  REJECTED = 6,
  CLOSED = 9,
}

export const PurBizStatusLabel: Record<PurBizStatus, string> = {
  [PurBizStatus.DRAFT]: '草稿',
  [PurBizStatus.SUBMITTED]: '已提交',
  [PurBizStatus.REVIEWING]: '审校中',
  [PurBizStatus.REVIEW_PASS]: '审校通过',
  [PurBizStatus.APPROVED]: '已批准',
  [PurBizStatus.CONVERT_PO]: '已转采购',
  [PurBizStatus.REJECTED]: '驳回',
  [PurBizStatus.CLOSED]: '已关闭',
};

export enum PoStatus {
  DRAFT = 0,
  SUBMITTED = 1,
  REVIEWING = 2,
  APPROVED = 3,
  REJECTED = 4,
  PARTIAL_RECEIVED = 5,
  FULL_RECEIVED = 6,
  CLOSED = 9,
}

export const PoStatusLabel: Record<PoStatus, string> = {
  [PoStatus.DRAFT]: '草稿',
  [PoStatus.SUBMITTED]: '已提交',
  [PoStatus.REVIEWING]: '审批中',
  [PoStatus.APPROVED]: '已批准',
  [PoStatus.REJECTED]: '已驳回',
  [PoStatus.PARTIAL_RECEIVED]: '部分入库',
  [PoStatus.FULL_RECEIVED]: '全部入库',
  [PoStatus.CLOSED]: '已关闭',
};

export enum BomStatus {
  DRAFT = 0,
  ACTIVE = 1,
  OBSOLETE = 2,
}

export const BomStatusLabel: Record<BomStatus, string> = {
  [BomStatus.DRAFT]: '草稿',
  [BomStatus.ACTIVE]: '生效',
  [BomStatus.OBSOLETE]: '作废',
};

export enum InventoryTransType {
  IN = 'in',
  OUT = 'out',
  TRANSFER = 'transfer',
  ADJUST = 'adjust',
  RETURN = 'return',
}

export const InventoryTransTypeLabel: Record<InventoryTransType, string> = {
  [InventoryTransType.IN]: '入库',
  [InventoryTransType.OUT]: '出库',
  [InventoryTransType.TRANSFER]: '调拨',
  [InventoryTransType.ADJUST]: '调整',
  [InventoryTransType.RETURN]: '退料',
};

export enum FifoMode {
  FIFO_AUTO = 'FIFO',
  SPECIFIED_BATCH = 'specified_batch',
  MANUAL_OVERRIDE = 'manual_override',
}

export enum MaterialType {
  RAW = 1,
  SEMI_FINISHED = 2,
  FINISHED = 3,
  AUXILIARY = 4,
  PACKAGING = 5,
}

export const MaterialTypeLabel: Record<MaterialType, string> = {
  [MaterialType.RAW]: '原材料',
  [MaterialType.SEMI_FINISHED]: '半成品',
  [MaterialType.FINISHED]: '成品',
  [MaterialType.AUXILIARY]: '辅料',
  [MaterialType.PACKAGING]: '包材',
};

export enum AttendanceStatus {
  NORMAL = 0,
  LATE = 1,
  EARLY_LEAVE = 2,
  ABSENT = 3,
  LEAVE = 4,
  OVERTIME = 5,
}

export const AttendanceStatusLabel: Record<AttendanceStatus, string> = {
  [AttendanceStatus.NORMAL]: '正常',
  [AttendanceStatus.LATE]: '迟到',
  [AttendanceStatus.EARLY_LEAVE]: '早退',
  [AttendanceStatus.ABSENT]: '缺勤',
  [AttendanceStatus.LEAVE]: '请假',
  [AttendanceStatus.OVERTIME]: '加班',
};

export function canTransition(current: number, target: number, statusEnum: Record<string, number>): boolean {
  if (current === target) return false;
  return true;
}

export function getNextStatuses(current: PurBizStatus): PurBizStatus[] {
  switch (current) {
    case PurBizStatus.DRAFT:
      return [PurBizStatus.SUBMITTED, PurBizStatus.CLOSED];
    case PurBizStatus.SUBMITTED:
      return [PurBizStatus.REVIEWING, PurBizStatus.REJECTED, PurBizStatus.CLOSED];
    case PurBizStatus.REVIEWING:
      return [PurBizStatus.REVIEW_PASS, PurBizStatus.REJECTED];
    case PurBizStatus.REVIEW_PASS:
      return [PurBizStatus.APPROVED, PurBizStatus.REJECTED];
    case PurBizStatus.APPROVED:
      return [PurBizStatus.CONVERT_PO, PurBizStatus.CLOSED];
    case PurBizStatus.REJECTED:
      return [PurBizStatus.DRAFT, PurBizStatus.CLOSED];
    case PurBizStatus.CONVERT_PO:
      return [PurBizStatus.CLOSED];
    case PurBizStatus.CLOSED:
      return [];
    default:
      return [];
  }
}
