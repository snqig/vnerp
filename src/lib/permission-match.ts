/**
 * @module permission-match
 * @description 权限码匹配核心（零依赖，服务端与客户端均可安全 import）。
 *
 * 背景（2026-09-15，BUG-管理员权限缺失 §5）：
 * 系统存在三套权限码词汇表——
 *  1. `API_PERMISSIONS`（permissions-catalog.ts，网关 `withPermission` 实际校验的精确码，
 *     形如 `order:view`，单数模块 + 动作位）；
 *  2. `sys_menu.permission`（登录/`getUserInfo` 产出给用户的通配码，
 *     形如 `orders:*`、`warehouse:inbound:*`、`dashboard:finance:*`，复数模块 + 尾部 `*`）；
 *  3. `sys_role.permissions`（角色权限 UI 保存，`getUserInfo` 不读）。
 * 两边交集为 0：字面量 `includes()` 比较会让除 super_admin 外的所有角色必然 403
 * （super_admin 靠 `roles.includes('super_admin')` 硬绕过）。
 *
 * 本模块在 `hasPermission` 内做**通配符展开 + 模块别名归一**，让词汇表 2 能命中词汇表 1：
 * - 精确码 / `*`：直接命中；
 * - 2 段顶层通配 `a:*`（目录=整个域）：`a`（别名展开后）命中请求码首段即放行，不限动作；
 * - 3+ 段子菜单通配 `a:b:*`：仅**尾段** `b`（别名展开后）命中请求码「首段或动作位」才放行
 *   ——不做中间段/首段命中，杜绝 `settings:warehouse-category:*` 放行整个 `warehouse` 之类；
 * - 例外：`dashboard` 展示型持有码命中后仅放行只读动作位（看板不授权写入）。
 *
 * 这是**止血方案**（原报告方向 3）：长期仍应统一权限码词汇表（方向 1，见
 * `docs/qa/BUG-管理员权限缺失-根因与修复-20260915.md` §5）。
 */

/**
 * 模块别名：菜单词汇表的模块段 → API 词汇表的模块段。
 * 维护规则：新增菜单模块时，若其权限码模块名与 `API_PERMISSIONS` 不一致，必须在此登记。
 */
export const PERMISSION_MODULE_ALIASES: Record<string, readonly string[]> = {
  // 订单域目录：订单 / 工单 / 交付 / BOM / 客户 / 产品（orders 顶层目录及其子菜单尾段共用）
  orders: ['order', 'workorder', 'delivery', 'bom', 'customer', 'product'],
  // 顶层看板目录 → dashboard 模块
  dashboard_center: ['dashboard'],
  // 工程技术部（样品转量产 + SOP 均走标准卡/样品权限码）
  engineering: ['standard-card', 'sample'],
  // 单复数差异
  customers: ['customer'],
  products: ['product'],
  sales: ['order'], // orders:sales:* / dashboard:sales:* 尾段
  // 子菜单名与 API 模块名不同形的映射
  manage: ['qrcode'], // qrcode:manage:* → qrcode:view
  'die-template': ['prepress'], // prepress:die-template:* → prepress:die / screen-plate / ink
  labels: ['dcprint'], // dcprint:labels:* → dcprint:label
  'process-cards': ['dcprint'], // dcprint:process-cards:* → dcprint:process-card
};

/** 只读动作位：`dashboard:*` 展示型持有码命中后仅放行这些动作 */
export const READ_ONLY_ACTIONS: readonly string[] = [
  'view',
  'list',
  'query',
  'stats',
  'schedule',
  'search',
];

/**
 * 判定单个持有权限码 `held`（用户侧，通配形态）是否放行所需权限码 `required`（API 侧，精确形态）。
 * 两侧词汇表形态见模块注释。纯函数，无副作用。
 */
export function matchPermission(held: string, required: string): boolean {
  if (!held || !required) return false;
  if (held === required || held === '*') return true;
  if (!held.endsWith(':*')) return false;

  const segs = held.slice(0, -2).split(':');
  const rSegs = required.split(':');
  const expand = (s: string): readonly string[] => PERMISSION_MODULE_ALIASES[s] ?? [s];

  // 2 段顶层通配（目录=整个域）：首段命中即放行，不限动作
  if (segs.length === 1) {
    return expand(segs[0]).includes(rSegs[0]);
  }

  // 3+ 段子菜单通配：仅尾段命中请求「首段或动作位」
  const tail = segs[segs.length - 1];
  const expanded = expand(tail);
  const hit = expanded.includes(rSegs[0]) || expanded.includes(rSegs[rSegs.length - 1]);
  if (!hit) return false;

  // dashboard 展示型看板：只放只读动作
  if (segs[0] === 'dashboard') {
    return READ_ONLY_ACTIONS.includes(rSegs[rSegs.length - 1]);
  }
  return true;
}

/**
 * 判定持有权限码集合 `permissions` 是否放行所需权限码 `required`。
 * 包含精确命中 / 全局 `*` / 逐条通配展开。
 */
export function hasPermissionIn(permissions: readonly string[], required: string): boolean {
  return permissions.some((p) => matchPermission(p, required));
}
