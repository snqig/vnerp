# /dashboard/* 三维度审计（逻辑关联 · 国际化 · 文硬编码）

> 审计日期：2026-09-04 ｜ 范围：`src/app/[locale]/dashboard/**`（9 页）+ `src/app/[locale]/advanced/dashboard`
> 方法：只读审计，未改码。结合 `diagnose_i18n_keys.mjs`、动态 key 手动核对、后端 API 路由核对、真实库无关（本次不涉及 DB）。

## 一、结论速览

| 维度 | 结论 | 严重度 |
|------|------|--------|
| 逻辑关联 | **今日营收为凭空捏造数据**（订单数 × 15000 魔法常量），后端无此字段 | P0 |
| 逻辑关联 | productionChange 涨跌符号永远显示 `+`（负数也显示正号） | P2 |
| 文硬编码 | `flow` 页 `table.comment` / `item.desc` 直接渲染中文，未走 `t()` | P1 |
| 国际化-缺key | **无**：字面量 + 动态 key（共 44 个）在 4 种语言全部命中 | 已通过 |
| 国际化-残留 | `flow` 页 comment/desc 根本未接入 i18n（与文硬编码同源） | P1 |

---

## 二、逻辑关联问题

### P0 · 今日营收是捏造数据 — `src/app/[locale]/dashboard/page.tsx:258`
```tsx
<div className="text-2xl font-bold">¥{(s.todayOrders * 15000).toLocaleString()}</div>
<p className="text-xs text-muted-foreground">{t('estimatedRevenue')}</p>
```
- 卡片标签 `t('todayRevenue')` 显示「今日营收」，但数值 = **`todayOrders × 15000` 魔法常量**。
- 核对后端 `src/app/api/dashboard/route.ts:153-164` 的 `stats` 返回**只有 10 个字段，无 `todayRevenue`**：
  `todayOrders / orderChange / pendingOrders / producingOrders / completedToday / inventoryAlert / totalCustomers / totalEmployees / todayProduction / productionChange`。
- 结论：此卡片数值与真实营收**毫无关联**，纯前端捏造，会误导经营决策。
- 修复方向（需你拍板其一）：
  1. **删卡**：直接移除该营收卡片（最安全，零数据风险）；
  2. **接真值**：后端新增 `todayRevenue`（如 `SUM(sal_order.total_amount) WHERE DATE(create_time)=CURDATE()`），前端改用 `s.todayRevenue`；
  3. **改名**：若本意是「预估」，把标签改为「预计营收（按均单 15000 估算）」并在 tooltip 注明口径，避免误导。

### P2 · 生产涨跌符号永远为正 — `src/app/[locale]/dashboard/page.tsx:246`
```tsx
<span className={...}>{+{s.productionChange}%</span>   {/* 无条件 + */}
```
- 上方 `orderChange`（line 171）已正确处理：`s.orderChange >= 0 ? '+' : ''`。
- 此处 `productionChange` 为负时仍显示 `+X%`，与事实相反（例如实际下降 5% 却显示 `+5%`）。
- 修复：改为 `{s.productionChange >= 0 ? '+' : ''}{s.productionChange}%`，与 orderChange 一致。

---

## 三、文硬编码问题

### P1 · `flow` 页渲染裸中文（未走 i18n）— `src/app/[locale]/dashboard/flow/page.tsx:716` & `:777`
```tsx
// line 716：表注释直接渲染
<div className="text-[10px] text-muted-foreground mb-1.5">{table.comment}</div>
// line 777：技术栈描述直接渲染
<div className="text-[10px] text-muted-foreground truncate">{item.desc}</div>
```
- `table.comment` 数据：`'用户表'`/`'客户表'`/`'采购申请'`/`'生产工单'`…（约 50 条）；
- `item.desc` 数据：`'样式系统'`/`'接口规范'`/`'认证中间件'`/`'数据校验'`…（约 20 条）。
- 二者均为**中文字面量直接渲染，未用 `t()`**，因此：
  1. 切换 `en`/`vi`/`zh-TW` 时**永远显示中文**（i18n 完全失效）；
  2. 违反 `i18n/no-chinese-hardcode` 红线（数据对象里的字面量若被该规则覆盖则会触发）。
- 修复方向：把 `comment`/`desc` 改为 key（如 `commentKey`/`descKey`），在 4 语言 `Dashboard` 命名空间补翻译；或至少对注释类做 `t()` 包裹。工作量中等（约 70 条需提取）。

### 非缺陷（仅提示）
- 其他 dashboard 页（`sales`/`warehouse`/`production`/`quality`/`ceo`）的 `// 翻译钩子`、`/* ═══ 数据接口 ═══ */` 等中文均为**代码注释**，非 UI 文本，不计入硬编码缺陷；但严格模式下 `i18n/no-chinese-hardcode` 可能标记，属低风险，可按需清理。
- `ceo` 页大量 `/* ═══ 科技标题 ═══ */` 也是注释，同上。

---

## 四、国际化问题

### 4.1 缺 key 维度：全部通过（无残留）
- 自动化工具 `scripts/debug-perf/diagnose_i18n_keys.mjs` 扫描 `src/app/[locale]/dashboard` + `advanced/dashboard`：**10 文件 / 253 字面量 key / 0 missing**。
- 但该工具**只认字面量 `t('x')`**，漏掉动态 key。已手动补查：
  - `flow` 页 `nameKey`/`labelKey` 共 **31 个**（`systemManagement`/`procurementInbound`/`databaseLayer`…）→ zh-CN/en/vi/zh-TW 全部存在 ✅
  - `sales`/`production` 页 `cfg.labelKey`/`priCfg.labelKey` 共 **13 个**（`draft`/`confirmed`/`running`/`high`…）→ 4 语言全部存在 ✅
- `ceo` 页此前缺失的 10 个 key（k_1rt8ajg 等）已在前序修复中补入 4 语言。
- **结论：/dashboard/* 已无"显示裸 key 字符串"类 i18n bug。**

### 4.2 残留 i18n 缺口（与文硬编码同源）
- 见第三节 P1：`flow` 页 `comment`/`desc` 从未接入 i18n，是比"缺 key"更底层的遗漏（连 `t()` 都没包）。

---

## 五、未做 / 验证说明
- 未起 dev server 实跑（遵循只读审计 + 本环境 `.next` EPERM 坑），以上均为**静态 + 后端路由源码**核对，置信度高。
- 未跑全量 `tsc`（基线 1195 error 为预存噪声，本次纯审计无改动）。
- 若需我把上述修复落地（尤其 P0 今日营收 + P1 flow 硬编码），请确认 P0 的修复方向（删卡 / 接真值 / 改名），我再做。

## 六、建议优先级
1. **P0**：处理今日营收捏造数据（经营误导，最高优先）。
2. **P1**：`flow` 页 comment/desc 接入 i18n（国际化 + 红线）。
3. **P2**：productionChange 符号修正（一行改动）。
