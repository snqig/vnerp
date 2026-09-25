# 油墨开罐 & 调色油墨入库 — 统计卡重新设计

**日期：** 2026-09-26
**范围：** ink-opening / ink-mixed 两个页面的 StatsCards 组件重构

---

## 目标

将当前通用的、无业务逻辑关联的统计卡，替换为与列表数据、数据库结构、新增功能三合一的可交互统计卡。每张卡片可点击，联动下方表格过滤；移除重复的独立警告卡片。

---

## 现状问题

### ink-opening（油墨开罐）
- `overdue` 卡标签错误：使用了 `k_zh5my3`（"新增开罐"），应为"超期预警"
- 4张卡均不可点击，与表格无交互关联
- 下方有独立的"过期预警"警告卡片，与统计卡"超期预警"语义重叠

### ink-mixed（调色油墨入库）
- 4张卡不可点击，与表格无交互关联
- 仅有数字展示，无业务操作价值

---

## 设计方案

### ink-opening 统计卡（4张）

| # | key | 标签 | 图标 | 颜色 | 过滤条件 | 数据来源 |
|---|-----|------|------|------|----------|----------|
| 1 | `total` | 总开罐记录 | Droplet | blue | 无（重置） | `summary.total_count` |
| 2 | `valid` | 在效使用中 | CheckCircle | green | `status=1 AND expire_time >= NOW()` | API 新增 `valid_using_count` |
| 3 | `expired` | 已过期 | AlertTriangle | orange | `status=2` | `summary.expired_count` |
| 4 | `overdue` | 超期预警 | Clock | red | `status=1 AND expire_time < NOW()` | `summary.overdue_using_count` |

**交互逻辑：**
- 点击卡片 → 设置 `activeKey` → 同步更新 `statusFilter` 和 `expireFilter` → 表格重新请求
- 点击"总计"卡 → 清除所有过滤，恢复全量数据

**需移除：** 下方独立的"过期预警"警告卡片（`k_1tqco41`）

### ink-mixed 统计卡（4张）

| # | key | 标签 | 图标 | 颜色 | 过滤条件 | 数据来源 |
|---|-----|------|------|------|----------|----------|
| 1 | `total` | 总入库记录 | Beaker | blue | 无（重置） | `stats.total` |
| 2 | `inStock` | 已入库 | CheckCircle | green | `status=1` | `stats.inStock` |
| 3 | `inUse` | 已领用 | Clock | orange | `status=2` | `stats.inUse` |
| 4 | `expired` | 已过期 | AlertTriangle | red | `status=3` | `stats.expired` |

**交互逻辑：**
- 点击卡片 → 设置 `activeKey` → 同步更新 `statusFilter` → 表格重新请求
- 点击"总入库记录"卡 → 清除过滤，恢复全量数据

---

## 改动清单

### 1. API 层

**`src/app/api/dcprint/ink-opening/route.ts`**
- GET 返回的 `summary` 中新增 `valid_using_count` 字段（status=1 且未超期）
- SQL 计算逻辑：`SUM(CASE WHEN status = 1 AND expire_time >= NOW() THEN 1 ELSE 0 END)`
- GET 列表查询支持新参数 `is_overdue=1`：当传入时，WHERE 子句增加 `AND status = 1 AND expire_time < NOW()`，用于"超期预警"卡片点击后的列表过滤
- countSql 同步处理 `is_overdue` 参数

### 2. 翻译文件

**`messages/zh-CN.json`（Dcprint namespace）**
- 新增：`dcValidUsingLabel` = "在效使用中"
- 新增：`dcValidUsingDesc` = "有效使用期内未过期的开罐记录"
- 新增：`dcOverdueWarningLabel` = "超期预警"
- 新增：`dcOverdueWarningDesc` = "已超过有效期但仍在使用中的开罐记录"
- 修改：`k_zh5my3` 从"新增开罐"改为"超期预警"（或新增独立 key）

> 注：`k_zh5my3` 当前值是"新增开罐"，用于创建按钮的 label。需要区分：按钮用原 key，统计卡用新 key `dcOverdueWarningLabel`。

### 3. ink-opening 页面

**`src/app/[locale]/dcprint/ink-opening/page.tsx`**
- 新增状态：`activeStatKey`（追踪当前激活的统计卡）
- 新增状态：`isOverdueFilter`（boolean，标记是否只显示超期记录）
- StatsCards 添加：`clickable={true}`、`activeKey={activeStatKey}`、`onCardClick={(key) => handleStatClick(key)}`
- `handleStatClick` 函数：
  - `total` → 重置 `statusFilter='all'`，清除 `isOverdueFilter`
  - `valid` → `statusFilter='1'`，清除 `isOverdueFilter`
  - `expired` → `statusFilter='2'`
  - `overdue` → `statusFilter='1'`，设置 `isOverdueFilter=true`（API 支持 `is_overdue=1` 参数）
- 移除下方独立的"过期预警"警告卡片
- 修正 overdue 卡标签从 `ts('k_zh5my3')` 改为 `ts('dcOverdueWarningLabel')`

### 4. ink-mixed 页面

**`src/app/[locale]/dcprint/ink-mixed/page.tsx`**
- 新增状态：`activeStatKey`
- StatsCards 添加：`clickable={true}`、`activeKey={activeStatKey}`、`onCardClick`
- `handleStatClick` 函数：
  - `total` → 重置 `statusFilter`
  - `inStock` → `statusFilter='1'`
  - `inUse` → `statusFilter='2'`
  - `expired` → `statusFilter='3'`

---

## 不变的部分

- `ink-mixed/stats/route.ts` — 保持不变
- ink-opening API 的 summary 查询中已有 `using_count`、`expired_count`、`scrapped_count`、`overdue_using_count`，只需新增 `valid_using_count`
- 表格列定义、搜索框、创建/编辑弹窗 — 均不变

---

## 成功标准

1. ink-opening 4张统计卡标签正确，不再有"新增开罐"错误标签
2. ink-mixed 4张统计卡可点击，点击后表格正确过滤对应状态数据
3. ink-opening 点击"超期预警"卡片后，表格只显示超期使用中的记录
4. 点击"总计"卡片后，过滤清除，表格恢复全量数据
5. 移除 ink-opening 下方重复的独立过期预警警告卡片
6. TypeScript 编译无错误
7. 不破坏现有创建/编辑/删除功能
