/**
 * 销售订单状态码 —— 唯一真相源（BUG-ORD-002）
 *
 * 权威依据（四方一致，已运行时核实）：
 *   1. live 库列注释：
 *      \`sal_order.status\` tinyint DEFAULT 1
 *      COMMENT '状态: 1-待确认, 2-已确认, 3-部分发货, 4-已完成, 5-已取消'
 *   2. i18n \`Orders\` 命名空间：statusPending=待确认 / statusConfirmed=已确认 /
 *      statusPartialShip=部分发货 / statusCompleted=已完成 / statusCancelled=已取消
 *   3. 列表页 orders/sales 的 STATUS_MAP 与筛选下拉
 *   4. orders/export 的 STATUS_MAP，以及发货/工单处理器写入的 3=部分发货、4=已完成
 *
 * 修此文件之前，库内并存四套口径：
 *   - 领域 SalesOrderStatus.fromDbCode：0/1/2/3/4/6/9（draft/submitted/approved/…）★从未被 API 调用
 *   - /api/orders/sales：1/2/3（草稿/已提交/已审核）→ 审核写 3，界面按契约显示为「部分发货」
 *   - /api/orders：字符串比较 'completed'/'cancelled' → 与 tinyint 恒不相等，守卫永久失效
 *   - orders/export 与 /api/biz/contract-review：另一套 1-5 / 10-60 / 20
 *
 * 本模块把 1..5 定为规范码，其它历史码只做**只读兼容**（读取时归一到规范码），
 * 所有写路径一律使用 \`SalesOrderStatusCode\`，不得再出现字面量数字。
 *
 * ⚠️ 本文件同时被客户端组件与服务端路由引用，禁止引入任何服务端专用依赖
 *    （next/headers、@/lib/db 等）。
 */

/** 规范状态码（写入库的唯一合法取值） */
export const SalesOrderStatusCode = {
  /** 1 = 待确认（新建即此态） */
  PENDING: 1,
  /** 2 = 已确认（提交/审核通过；可发货、可开工单） */
  CONFIRMED: 2,
  /** 3 = 部分发货 */
  PARTIALLY_SHIPPED: 3,
  /** 4 = 已完成 */
  COMPLETED: 4,
  /** 5 = 已取消 */
  CANCELLED: 5,
} as const;

export type SalesOrderStatusCode = (typeof SalesOrderStatusCode)[keyof typeof SalesOrderStatusCode];

export interface SalesOrderStatusMeta {
  code: number;
  /** i18n \`Orders\` 命名空间下的 key */
  labelKey: string;
  /** 徽标样式（列表页 / 详情页共用） */
  className: string;
  /** 终态：不可再流转 */
  terminal: boolean;
}

const BADGE = {
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  warn: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ok: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
} as const;

/** 规范码 → 展示元数据 */
export const SALES_ORDER_STATUS_META: Record<number, SalesOrderStatusMeta> = {
  [SalesOrderStatusCode.PENDING]: {
    code: SalesOrderStatusCode.PENDING,
    labelKey: 'statusPending',
    className: BADGE.neutral,
    terminal: false,
  },
  [SalesOrderStatusCode.CONFIRMED]: {
    code: SalesOrderStatusCode.CONFIRMED,
    labelKey: 'statusConfirmed',
    className: BADGE.info,
    terminal: false,
  },
  [SalesOrderStatusCode.PARTIALLY_SHIPPED]: {
    code: SalesOrderStatusCode.PARTIALLY_SHIPPED,
    labelKey: 'statusPartialShip',
    className: BADGE.warn,
    terminal: false,
  },
  [SalesOrderStatusCode.COMPLETED]: {
    code: SalesOrderStatusCode.COMPLETED,
    labelKey: 'statusCompleted',
    className: BADGE.ok,
    terminal: true,
  },
  [SalesOrderStatusCode.CANCELLED]: {
    code: SalesOrderStatusCode.CANCELLED,
    labelKey: 'statusCancelled',
    className: BADGE.danger,
    terminal: true,
  },
};

/** 规范码升序列表（筛选下拉、报表分组用） */
export const SALES_ORDER_STATUS_CODES: readonly number[] = [
  SalesOrderStatusCode.PENDING,
  SalesOrderStatusCode.CONFIRMED,
  SalesOrderStatusCode.PARTIALLY_SHIPPED,
  SalesOrderStatusCode.COMPLETED,
  SalesOrderStatusCode.CANCELLED,
];

/** 允许写库的码集合（写路径校验用） */
export function isSalesOrderStatus(value: unknown): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n in SALES_ORDER_STATUS_META;
}

/**
 * 历史码 → 规范码（只读兼容，**不写回**）。
 *
 * 领域 SalesOrderStatus 旧表：0=draft, 6=voided, 9=closed
 * 导出映射旧家族 & /api/biz/contract-review 曾写入：10/20/30/40/50/60
 */
const LEGACY_CODE_ALIASES: Record<number, number> = {
  0: SalesOrderStatusCode.PENDING, // 草稿 → 待确认
  6: SalesOrderStatusCode.CANCELLED, // 作废 → 已取消
  9: SalesOrderStatusCode.COMPLETED, // 关闭 → 已完成
  10: SalesOrderStatusCode.PENDING, // 草稿
  20: SalesOrderStatusCode.CONFIRMED, // 已确认
  30: SalesOrderStatusCode.CONFIRMED, // 生产中 → 已确认（本契约无独立生产态）
  40: SalesOrderStatusCode.PARTIALLY_SHIPPED, // 已发货
  50: SalesOrderStatusCode.COMPLETED, // 已完成
  60: SalesOrderStatusCode.COMPLETED, // 已对账 → 已完成
};

/**
 * 历史**字符串**状态 → 规范码（只读兼容，**不写回**）。
 *
 * 为什么需要它：这些字符串在项目里是**真实存在**的取值来源 ——
 *   - `prod_work_order.status` 是 varchar 状态机，取值就是 pending/confirmed/producing/completed/cancelled
 *   - 领域 `SalesOrderStatus` 值对象的 `.value` 是 draft/submitted/approved/partially_shipped/completed/voided/closed
 *   - 历史代码里确实写过 `String(status) === '5' || status === 'cancelled'` 这类比较
 * 若这里只认数字，`'cancelled'` 会被判为「未知」而**静默放行**（守卫永久失效）。
 */
const LEGACY_STRING_ALIASES: Record<string, number> = {
  // 待确认
  draft: SalesOrderStatusCode.PENDING,
  pending: SalesOrderStatusCode.PENDING,
  // 已确认
  submitted: SalesOrderStatusCode.CONFIRMED,
  confirmed: SalesOrderStatusCode.CONFIRMED,
  approved: SalesOrderStatusCode.CONFIRMED,
  producing: SalesOrderStatusCode.CONFIRMED,
  in_production: SalesOrderStatusCode.CONFIRMED,
  // 部分发货
  partially_shipped: SalesOrderStatusCode.PARTIALLY_SHIPPED,
  partial_ship: SalesOrderStatusCode.PARTIALLY_SHIPPED,
  shipped: SalesOrderStatusCode.PARTIALLY_SHIPPED,
  // 已完成
  completed: SalesOrderStatusCode.COMPLETED,
  closed: SalesOrderStatusCode.COMPLETED,
  finished: SalesOrderStatusCode.COMPLETED,
  // 已取消（'rejected' 不在此列：销售订单的 reject 是"退回待确认"，不是取消）
  cancelled: SalesOrderStatusCode.CANCELLED,
  canceled: SalesOrderStatusCode.CANCELLED,
  voided: SalesOrderStatusCode.CANCELLED,
};

/**
 * 归一化任意来源的状态值为规范码。
 *
 * 接受：规范码 1..5、历史数字码（`LEGACY_CODE_ALIASES`）、历史字符串状态（`LEGACY_STRING_ALIASES`）、
 *       纯数字字符串（如 `'2'`）。
 * 拒绝：无法识别的值、布尔值、浮点数、空值 —— **返回 null**，调用方须显式处理，
 *       不得静默当成 0/1（否则守卫会永久失效，正是 BUG-ORD-002 的成因）。
 */
export function normalizeSalesOrderStatus(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  // 布尔值必须显式挡掉：Number(true) === 1 会被误判成 PENDING
  if (typeof value === 'boolean') return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const strAlias = LEGACY_STRING_ALIASES[trimmed.toLowerCase()];
    if (strAlias !== undefined) return strAlias;
    if (!/^\d+$/.test(trimmed)) return null; // 只接受纯数字字符串，避免 '2abc' 之类被 Number 截取
    value = Number(trimmed);
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value in SALES_ORDER_STATUS_META) return value;
  const alias = LEGACY_CODE_ALIASES[value];
  return alias === undefined ? null : alias;
}

/** 取展示元数据；未知码返回「未知」占位（保留原码便于排查） */
export function salesOrderStatusMeta(value: unknown): SalesOrderStatusMeta {
  const code = normalizeSalesOrderStatus(value);
  if (code !== null) return SALES_ORDER_STATUS_META[code];
  return {
    code: Number.isFinite(Number(value)) ? Number(value) : -1,
    labelKey: 'unknown',
    className: BADGE.neutral,
    terminal: false,
  };
}

/** 是否终态（不可编辑/删除） */
export function isTerminalSalesOrderStatus(value: unknown): boolean {
  return salesOrderStatusMeta(value).terminal;
}
