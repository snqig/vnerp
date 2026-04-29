// 系统常量定义

// ==================== 订单状态 ====================
export const OrderStatus = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PRODUCING: 'producing',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const OrderStatusLabel: Record<string, string> = {
  [OrderStatus.DRAFT]: '草稿',
  [OrderStatus.CONFIRMED]: '已确认',
  [OrderStatus.PRODUCING]: '生产中',
  [OrderStatus.SHIPPED]: '已发货',
  [OrderStatus.COMPLETED]: '已完成',
  [OrderStatus.CANCELLED]: '已取消',
};

// ==================== 工单状态 ====================
export const WorkOrderStatus = {
  PENDING: 'pending',
  PRODUCING: 'producing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const WorkOrderStatusLabel: Record<string, string> = {
  [WorkOrderStatus.PENDING]: '待生产',
  [WorkOrderStatus.PRODUCING]: '生产中',
  [WorkOrderStatus.COMPLETED]: '已完成',
  [WorkOrderStatus.CANCELLED]: '已取消',
};

// ==================== 工单优先级 ====================
export const WorkOrderPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const WorkOrderPriorityLabel: Record<string, string> = {
  [WorkOrderPriority.LOW]: '低',
  [WorkOrderPriority.NORMAL]: '正常',
  [WorkOrderPriority.HIGH]: '高',
  [WorkOrderPriority.URGENT]: '紧急',
};

// ==================== 入库单状态 ====================
export const InboundStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const InboundStatusLabel: Record<string, string> = {
  [InboundStatus.PENDING]: '待确认',
  [InboundStatus.CONFIRMED]: '已确认',
  [InboundStatus.COMPLETED]: '已完成',
  [InboundStatus.CANCELLED]: '已取消',
};

// ==================== 出库单状态 ====================
export const OutboundStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const OutboundStatusLabel: Record<string, string> = {
  [OutboundStatus.PENDING]: '待确认',
  [OutboundStatus.CONFIRMED]: '已确认',
  [OutboundStatus.COMPLETED]: '已完成',
  [OutboundStatus.CANCELLED]: '已取消',
};

// ==================== 库存交易类型 ====================
export const InventoryTransType = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  INBOUND_CANCEL: 'inbound_cancel',
  OUTBOUND_CANCEL: 'outbound_cancel',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
} as const;

// ==================== 审核状态 ====================
export const AuditStatus = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const;

export const AuditStatusLabel: Record<number, string> = {
  [AuditStatus.PENDING]: '待审核',
  [AuditStatus.APPROVED]: '已通过',
  [AuditStatus.REJECTED]: '已拒绝',
};

// ==================== 数据权限范围 ====================
export const DataScopeType = {
  ALL: 'all',
  DEPT: 'dept',
  SELF: 'self',
  DEPT_AND_SELF: 'dept_and_self',
} as const;

export const DataScopeLabel: Record<string, string> = {
  [DataScopeType.ALL]: '全部数据',
  [DataScopeType.DEPT]: '本部门数据',
  [DataScopeType.SELF]: '仅本人数据',
  [DataScopeType.DEPT_AND_SELF]: '本部门及本人数据',
};

// ==================== 用户状态 ====================
export const UserStatus = {
  DISABLED: 0,
  ENABLED: 1,
} as const;

// ==================== 删除标记 ====================
export const DeleteFlag = {
  NORMAL: 0,
  DELETED: 1,
} as const;

// ==================== 订单号前缀 ====================
export const OrderNoPrefix = {
  SALES_ORDER: 'SO',
  WORK_ORDER: 'WO',
  INBOUND_ORDER: 'RK',
  OUTBOUND_ORDER: 'CK',
  PURCHASE_ORDER: 'CG',
} as const;

// ==================== 分页默认值 ====================
export const PaginationDefaults = {
  PAGE: 1,
  PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// ==================== 税率 ====================
export const TaxRate = {
  ZERO: 0,
  LOW: 0.03,
  NORMAL: 0.13,
  HIGH: 0.16,
} as const;

// ==================== 日期格式 ====================
export const DateFormat = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm:ss',
} as const;
