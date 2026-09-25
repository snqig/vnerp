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
/**
 * 工单状态 —— **唯一真相源**（`prod_work_order.status`，varchar(20) 状态机）。
 *
 * 权威依据（四方一致，均于 2026-09-23 运行时核实）：
 *   1. live 库列注释：`prod_work_order.status` varchar(20) DEFAULT 'pending'
 *      COMMENT '状态: pending/confirmed/producing/completed/cancelled'
 *   2. live 数据分布（`deleted=0` 的 13 行）：confirmed 3 / pending 2 / producing 4 / completed 2
 *   3. 活跃守卫：`/api/production/material-issue`、`/api/warehouse/production-inbound`、
 *      `/api/workorders` 均按本词表校验
 *   4. 前端 `production/workorder` 列表页 `getStatusConfig` 的五个分支
 *
 * ⚠️ 此前仓内并存四套互不兼容的工单状态口径（均在本次统一中处置，勿再复活）：
 *   - `domain/production/value-objects/WorkOrderStateMachine.ts` 的 11 值类型
 *     （material_preparing / qc_* / rework…）→ 宿主类 `WorkOrderStateMachine` 零引用，已删除
 *   - `domain/production/value-objects/WorkOrderStatus.ts` 的 `WorkOrderStatusVO`
 *     （draft/approved/picking/in_progress/closed…）→ 唯一消费者 `ProductionApplicationService`
 *     零引用（整个 `@/domain/production` 桶文件无人 import）；该类已标 @deprecated，其 1..7 数字码映射已删除
 *   - DB `prod_work_order.status_new`(tinyint) → 迁移 `060_unify_status_codes.sql` 按
 *     `'scheduled'`/`'in_progress'` 回填，与线上 `'confirmed'`/`'producing'` 不匹配故 UPDATE 命中 0 行，
 *     实为**失败的半成品**且 0 代码读取 → 已退役（同批退役 `priority_new`）
 *   - 遗留取值：数字串 `'1'`（220 行，全部已软删）与 `'migrated'`（2 行 SO-LEGACY-* 占位）
 *
 * 写库必须用本对象；读取历史值请先过 `normalizeWorkOrderStatus()`。
 */
export const WorkOrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PRODUCING: 'producing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type WorkOrderStatusValue = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

/** 规范状态全集（顺序即业务流转顺序）。写入库的合法取值仅限本集合。 */
export const WORK_ORDER_STATUSES_CANONICAL: readonly string[] = [
  WorkOrderStatus.PENDING,
  WorkOrderStatus.CONFIRMED,
  WorkOrderStatus.PRODUCING,
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.CANCELLED,
];

/**
 * 未终结状态（仍会占用 / 消耗物料，MRP 净需求必须计入）。
 *
 * ⚠️ 原 `mrp-engine.calculateTimeBuckets` 写作 `status IN (1, 2)`（遗留数字码），
 * 而该列是 varchar —— JS/SQL 中字符串与整数比较恒不成立 → 各时间桶需求恒为 0。
 */
export const WORK_ORDER_STATUSES_OPEN: readonly string[] = [
  WorkOrderStatus.PENDING,
  WorkOrderStatus.CONFIRMED,
  WorkOrderStatus.PRODUCING,
];

/**
 * 可创建「完工入库单 / 领料单」的工单状态白名单。
 *
 * 未确认（pending）与已取消（cancelled）必须被拦截，未知状态兜底拒绝。
 * ⚠️ 历史上这两处校验写成 `wo.status < 20` / `>= 90`，而 prod_work_order.status 是
 * varchar 状态机（'pending'/'confirmed'/…），JS 中 `'pending' < 20` → NaN → 恒 false，
 * 导致状态校验与流转双双失效（NEW-P0-1 修好 FK 后会变为可利用漏洞）。务必用白名单。
 */
export const WORK_ORDER_STATUSES_ALLOW_INBOUND: readonly string[] = [
  WorkOrderStatus.CONFIRMED,
  WorkOrderStatus.PRODUCING,
  WorkOrderStatus.COMPLETED,
];

/**
 * 只读兼容：库内历史取值 → 规范值（**不写回**）。
 *
 * 与 `src/lib/order-status.ts` 对销售订单的处理范式一致：读取时归一，写路径一律用规范值。
 * 若只认规范值，`'migrated'` 之类会被判为「未知」而被守卫**静默放行**（守卫永久失效）。
 */
const LEGACY_WORK_ORDER_STATUS: Record<string, string> = {
  '1': WorkOrderStatus.PENDING, // 遗留数字串（220 行，均已软删）
  migrated: WorkOrderStatus.PENDING, // 迁移占位（2 行 SO-LEGACY-*，未开工）
  scheduled: WorkOrderStatus.CONFIRMED, // 迁移 060 假定的旧值（实际线上从未出现）
  in_progress: WorkOrderStatus.PRODUCING,
  draft: WorkOrderStatus.PENDING,
  created: WorkOrderStatus.PENDING,
};

/**
 * 归一化任意来源的工单状态为规范值。
 *
 * 拒绝：无法识别的值、布尔值、空值 —— **返回 null**，调用方须显式处理，
 *       不得静默当成合法值（否则守卫会永久失效）。
 */
export function normalizeWorkOrderStatus(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;
  const lower = String(value).trim().toLowerCase();
  if (lower === '') return null;
  if ((WORK_ORDER_STATUSES_CANONICAL as readonly string[]).includes(lower)) return lower;
  return LEGACY_WORK_ORDER_STATUS[lower] ?? null;
}

/** 是否可直接写库（仅规范值；历史值须先归一） */
export function isWorkOrderStatusWritable(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return (WORK_ORDER_STATUSES_CANONICAL as readonly string[]).includes(value.trim().toLowerCase());
}

export const WorkOrderStatusLabel: Record<string, string> = {
  [WorkOrderStatus.PENDING]: '待生产',
  [WorkOrderStatus.CONFIRMED]: '已确认',
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
