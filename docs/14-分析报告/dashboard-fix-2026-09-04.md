# /dashboard/* 三维度问题修复报告（2026-09-04）

> 落地前审计：见 `docs/13-分析报告/dashboard-audit-2026-09-04.md`
> 用户指令：**P0 接真值 / P1 / P2 直接改**

## 修复清单

### P0 · 今日营收「接真值」（原：前端捏造假数据）
**根因**：`dashboard/page.tsx:258` 用 `s.todayOrders * 15000` 显示「今日营收」，但后端 `stats` 从未返回该字段，是订单数 × 魔法常量编出来的。

| 文件 | 改动 |
|------|------|
| `src/app/api/dashboard/route.ts` | 新增查询 `SUM(total_amount) FROM sal_order WHERE deleted=0 AND DATE(create_time)=CURDATE()`（COALESCE 兜底 0），加入 `stats.todayRevenue` |
| `src/app/[locale]/dashboard/page.tsx` | `DashboardData.stats` 接口加 `todayRevenue: number`、默认 `0`；渲染 `¥{(s.todayRevenue \|\| 0).toLocaleString()}`；副标题 `estimatedRevenue` → `actualRevenue`（新增 key） |

- 字段已核实：`sal_order.total_amount` 为 `decimal(18,4)`，存在。
- **live 实测**：今日无订单 → 返回 `0`（真实值，此前却显示假数）。
- `messages/*.json` 的 `Dashboard` 命名空间新增 `actualRevenue: '实际营收'`（4 语言）。

### P1 · flow 页文硬编码（原：裸中文直接渲染）
**根因**：`flow/page.tsx:716` `{table.comment}`、`flow/page.tsx:777` `{item.desc}` 直接渲染中文字面量，未走 `t()`，切语言永远中文，违反 i18n 红线。

| 文件 | 改动 |
|------|------|
| `src/app/[locale]/dashboard/flow/page.tsx` | `tables.comment`（52 条）+ `tech.desc`（21 条）全部转为 `commentKey` / `descKey` 并走 `t()`；类型 `{ comment: string }` → `{ commentKey: string }`；渲染 `{t(table.commentKey)}` / `{t(item.descKey)}` |
| `messages/zh-CN.json` `messages/zh-TW.json` `messages/en.json` `messages/vi.json` | `Dashboard` 命名空间新增 **65 个 key**（52 `flowT_*` + 13 `flowD_*`，含英文开头项如 `BOM表`/`Pages & Layouts` 统一转 key） |

- **中英文统一处理**：英文开头的 `desc`（如 `Pages & Layouts`、`RBAC`）也一并转 key，保证渲染点类型安全、无 `undefined`。
- `en/vi/zh-TW` 以原值作占位（避免显示裸 key），真实翻译待后续补充。

### P2 · productionChange 涨跌符号（原：负数也显示正号）
**根因**：`dashboard/page.tsx:246` 写死 `+{s.productionChange}%`，负数也带正号；同文件 `orderChange`（:171）已正确处理符号，前后不一致。

| 文件 | 改动 |
|------|------|
| `src/app/[locale]/dashboard/page.tsx` | `+{s.productionChange}%` → `{s.productionChange >= 0 ? '+' : ''}{s.productionChange}%` |

## 验证结果
- ✅ `npx tsc --noEmit`：3 个改动源文件 **0 新增错误**（全量 1212 为预存基线噪声，与本次无关）。
- ✅ 4 个 `messages` 文件 `JSON.parse` 均合法。
- ✅ `flow/page.tsx` grep 残留 `comment:` / `desc:`（引号）/ 裸 `.comment` / `.desc` 渲染 = **NONE**（已干净）。
- ✅ live SQL 复测今日营收查询形态正确（`COALESCE` 返回 `0.0000` → `Number()` = 0）。

## 修复中踩的坑（已修）
P1 初版脚本正则只匹配「CJK 开头」的 `comment/desc`，漏掉英文开头值（`BOM表`、`BOM明细`、`Pages & Layouts` 等）→ tsc 报：
- `error TS2353: 'comment' does not exist in type '{ commentKey: string }'`
- `error TS2345: item.descKey is string | undefined`

二次脚本把所有 `comment:` / `desc:`（不论中英文）统一转 key 后，渲染点类型一致、问题解决。

## 生效方式
dev server 在跑则**硬刷新**；若 messages 未热重载，重启 `npm run dev`（脚本自带 `-p 5000`，**勿重复写端口**；如遇 `.next` 缓存 EPERM，先 `Get-Process node | Stop-Process -Force` 再起）。

## 遗留 / 待办
- `en/vi/zh-TW` 中 65 个 flow key 目前以中文/英文原值占位，需要真实翻译。
- `dashboard-audit-2026-09-04.md` 中其余 P2（仅此一项已修）、以及未覆盖的其他 dashboard 页（sales/warehouse/finance/quality/production）的潜在同类问题，建议后续用 `scripts/debug-perf/diagnose_i18n_keys.mjs` 全量扫描确认。
