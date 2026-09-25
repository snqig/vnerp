# ERP 系统全面优化实施方案

> 生成时间：2026-09-24
> 范围：Phase 1 / Phase 2 / Phase 3 全部并行推进
> 执行模式：子代理驱动（subagent-driven）

---

## 一、现状盘点结论

### 1.1 StatsCards 覆盖率

| 状态 | 数量 |
|------|------|
| 已使用 `<StatsCards>` 组件 | **68 个页面** |
| 有旧风格重复 Card（已修复） | **8 个页面** ← 本次已清理 |
| 完全没有统计卡片区域 | **约 87 个页面** |
| 需要重点新增的页面 | **约 30 个页面**（见下表） |

#### 需要新增 StatsCards 的重点页面（按优先级）

**P0 - 列表型页面，用户每日高频访问：**

| 页面路径 | 应有统计数据 | cols 配置建议 |
|----------|-------------|--------------|
| `finance/payables` | 总金额/未付/逾期/本月应付 | `{mobile:2,tablet:2,desktop:4}` |
| `finance/costs` | 总成本/材料/人工/其他 | `{mobile:2,tablet:2,desktop:4}` |
| `warehouse/inventory` | 总SKU/库存金额/预警数/周转率 | `{mobile:2,tablet:2,desktop:4}` |
| `warehouse/batch` | 总批次/即将到期/已过期/可用 | `{mobile:2,tablet:2,desktop:4}` |
| `warehouse/cost` | 总成本/在库/在途/已出库 | `{mobile:2,tablet:2,desktop:4}` |
| `production/mrp` | 待计算/即将到期/缺料/安全库存 | `{mobile:2,tablet:2,desktop:4}` |
| `equipment` | 总数/运行中/维护中/待校准 | `{mobile:2,tablet:2,desktop:4}` |
| `quality/spc` | 总检测/合格/不合格/合格率 | `{mobile:2,tablet:2,desktop:4}` |
| `dcprint/process-card` | 总数/待确认/已完成/异常 | `{mobile:2,tablet:2,desktop:4}` |
| `purchase/return` | 总退货/待审核/已完成/退款额 | `{mobile:2,tablet:2,desktop:4}` |
| `purchase/suppliers` | 总供应商/S级/A级/B级/待审核 | `{mobile:2,tablet:2,desktop:4}` |
| `dcprint/die` | 总模具/在用/维修中/报废 | `{mobile:2,tablet:2,desktop:4}` |
| `hr/attendance` | 应出勤/实出勤/请假/迟到 | `{mobile:2,tablet:2,desktop:4}` |
| `hr/employee` | 总员工/在职/试用期/本月入职 | `{mobile:2,tablet:2,desktop:4}` |
| `settings/exchange-rate` | 币种数/生效中/即将过期/待更新 | `{mobile:2,tablet:2,desktop:4}` |

**P1 - 报表/分析型页面：**

| 页面路径 | 应有统计数据 | cols 配置建议 |
|----------|-------------|--------------|
| `finance/report` | 已修复（本次清理重复Card，保留StatsCards） | - |
| `production/report` | 总工单/已完成/延期/返工率 | `{mobile:2,tablet:2,desktop:4}` |
| `warehouse/trace` | 追溯记录/物料类型/仓库/时间跨度 | `{mobile:2,tablet:2,desktop:4}` |
| `dcprint/ink-usage` | 总用量/本月/同比/异常 | `{mobile:2,tablet:2,desktop:4}` |
| `delivery/vehicles` | 总车辆/在用/维护中/空闲 | `{mobile:2,tablet:2,desktop:4}` |
| `quality/incoming` | 已修复（本次清理重复Card，保留StatsCards） | - |

**暂不推荐（表单/设置页，无统计意义）：**
- 所有 `new/`、`edit/` 路由页面
- `settings/` 下除 exchange-rate 外的设置页
- `sample/standard-card/input*` 系列录入页
- `login`、`api-docs` 等系统页

---

### 1.2 N+1 查询热点（P0 性能问题）

| 文件 | 方法 | 问题等级 | 参考正确实现 |
|------|------|----------|-------------|
| `src/infrastructure/repositories/MysqlDeliveryRepository.ts` | L97 `findByOrderId`、L107 `findByCustomerId`、L117 `findByStatus` | 高（每条记录 N+1 次明细查询） | 同目录 `MysqlSalesOrderRepository.ts:L130` |
| `src/infrastructure/repositories/MysqlReturnOrderRepository.ts` | L104 `findByOrderId`、L114 `findByCustomerId`、L124 `findByStatus` | 高（同上） | 同目录 `MysqlPurchaseReturnRepository.ts:L119` |
| `src/infrastructure/repositories/MysqlReconciliationRepository.ts` | L121 `findByCustomerId`、L137 `findByStatus` | **极高**（双重 N+1：findLines + findWriteOffs，2N+1 次查询） | 同目录 `MysqlPurchaseReconciliationRepository.ts:L113` |

**修复策略**：将所有 `rows.map(r => findXxx(r.id))` 改为：
```typescript
// 1. 收集所有 ID
const ids = rows.map(r => r.id);
// 2. 一次批量查询
const [lines] = await db.execute(
  sql`SELECT * FROM sal_delivery_detail WHERE delivery_id IN (${sql.join(ids)})`
);
// 3. 按 ID 分组后映射
const linesByDeliveryId = groupBy(lines, 'delivery_id');
return rows.map(r => this.mapToAggregate(r, linesByDeliveryId.get(r.id) ?? []));
```

---

### 1.3 缓存基础设施现状

| 组件 | 状态 | 已使用文件数 | 备注 |
|------|------|-------------|------|
| `CacheManager` (接口) | ✅ 存在 | - | `src/infrastructure/cache/CacheManager.ts` |
| `InMemoryCacheManager` | ✅ 存在 | - | Map 实现，自动清理，TTL 默认 300s |
| `RedisCacheManager` | ✅ 存在 | - | ioredis，降级容错，commandTimeout 1s |
| `CacheGuard` (singleflight + SETNX) | ✅ 存在 | - | `src/infrastructure/cache/CacheGuard.ts` |
| `getCacheManager()` 工厂 | ✅ 存在 | - | 根据 `REDIS_URL` 自动切换实现 |
| 生产强制 Redis | ✅ 已配置 | - | `NODE_ENV=production` 且无 REDIS_URL 时抛错 |

**已在生产使用的模块（11 个）：**
- `DashboardDataService.ts` — overview/production/trend 三类 key
- `api-cache.ts` — API 路由响应缓存
- `TraceCacheService.ts` — 二维码追溯缓存
- `bom-expansion.ts` — BOM 展开结果缓存
- `token-blacklist.ts` — JWT 黑名单/refresh token
- `MaterialLifecycleService.ts` — 物料生命周期统计
- `StandardCardHandlers.ts` — 标准卡列表/详情
- `route.ts` (refresh) — refresh 并发锁
- `InfrastructureHealthCheck.ts` — 健康检查
- `CacheInvalidationHandler.ts` — 事件驱动失效

**缺失缓存的高频查询（可追加）：**
- 销售订单列表、采购订单列表（页面级全量查询）
- 库存查询（warehouse/inventory）
- 设备列表（equipment）
- 模具列表（dcprint/die）

---

## 二、Phase 1：性能优化 + UI 一致性基础

### 2.1 任务清单

#### T1.1 修复 N+1 查询（高优先级，预计 1-2 小时）

| 子任务 | 文件 | 涉及方法 | 参考文件 |
|--------|------|---------|---------|
| 配送单明细批量查询 | `MysqlDeliveryRepository.ts` | findByOrderId, findByCustomerId, findByStatus | `MysqlSalesOrderRepository.ts` |
| 退货单明细批量查询 | `MysqlReturnOrderRepository.ts` | findByOrderId, findByCustomerId, findByStatus | `MysqlPurchaseReturnRepository.ts` |
| 对账明细+核销批量查询 | `MysqlReconciliationRepository.ts` | findByCustomerId, findByStatus | `MysqlPurchaseReconciliationRepository.ts` |

**验收标准**：
- tsc 无新增错误
- 每个 Repository 方法查询次数从 O(N) 降至 O(1)
- 对应页面功能正常（手工验证或跑已有测试）

---

#### T1.2 缺失索引补充（高优先级，预计 30 分钟）

检查以下常见查询是否有索引：

| 表名 | 建议索引字段 | 触发场景 |
|------|-------------|---------|
| `sal_delivery` | `(customer_id, status)` | 按客户/状态筛选配送单 |
| `sal_return_order` | `(customer_id, status)` | 按客户/状态筛选退货单 |
| `fin_receivable` | `(status, due_date)` | 应收账款账龄分析 |
| `fin_payable` | `(status, due_date)` | 应付账款账龄分析 |
| `eq_equipment` | `(status, next_maintenance_date)` | 设备列表+维护提醒 |
| `qc_inspection` | `(material_id, inspection_date)` | 来料质检查询 |

**验收标准**：
- 生成 SQL migration 文件 `database/migrations/YYYY_add_missing_indexes.sql`
- tsc 无新增错误

---

#### T1.3 核心页面 StatsCards 新增（P0 优先级，预计 3-4 小时）

为以下 15 个 P0 页面添加 StatsCards（参考 `production/schedule/page.tsx` 的写法）：

1. `finance/payables/page.tsx`
2. `finance/costs/page.tsx`
3. `warehouse/inventory/page.tsx`
4. `warehouse/batch/page.tsx`
5. `warehouse/cost/page.tsx`
6. `production/mrp/page.tsx`
7. `equipment/page.tsx`
8. `quality/spc/page.tsx`
9. `dcprint/process-card/page.tsx`
10. `purchase/return/page.tsx`
11. `purchase/suppliers/page.tsx`
12. `dcprint/die/page.tsx`
13. `hr/attendance/page.tsx`
14. `hr/employee/page.tsx`
15. `settings/exchange-rate/page.tsx`

**验收标准**：
- 每个页面顶部有 StatsCards，cols 配置 `{mobile:2, tablet:2, desktop:4}`
- 不覆盖已有 Card 统计区域（如有），在其上方插入
- tsc 无新增错误
- 页面渲染正常（无布局错乱）

---

#### T1.4 报表类页面 StatsCards 补充（P1 优先级，预计 1-2 小时）

1. `production/report/page.tsx`
2. `warehouse/trace/page.tsx`
3. `dcprint/ink-usage/page.tsx`
4. `delivery/vehicles/page.tsx`
5. `quality/incoming/page.tsx`（已有旧 Card，替换为 StatsCards）
6. `finance/report/page.tsx`（已有旧 Card，替换为 StatsCards）

---

### 2.2 执行顺序

```
T1.1 (N+1 修复) → T1.2 (索引补充) → T1.3 (P0 StatsCards) → T1.4 (P1 StatsCards)
                      ↓ 并行
              子代理 A（N+1 + 索引）
              子代理 B（StatsCards P0）
              子代理 C（StatsCards P1）
```

---

## 三、Phase 2：财务管理 + 业务功能完善

### 3.1 任务清单

#### T2.1 应收账款管理页面（新建）

**文件**：`src/app/[locale]/finance/receivables/page.tsx`

**数据来源**：
- `sal_sales_order` + `fin_receivable` 关联
- 聚合：未收款总额、已收款总额、逾期金额、即将到期（30天内）

**StatsCards**：
- 应收总额 / 已收金额 / 逾期金额 / 即将到期（30天内）

**表格列**：
- 客户名称 | 应收单号 | 来源订单 | 应收金额 | 已收金额 | 余额 | 状态 | 到期日 | 操作

**参考**：现有 `finance/payables/page.tsx` 结构，镜像实现

---

#### T2.2 应付账款管理页面（已有，增强）

**文件**：`src/app/[locale]/finance/payables/page.tsx`（增强）

**新增功能**：
- 添加 StatsCards（总金额/未付/逾期/本月应付）
- 增加"一键标记收款"操作列按钮（调用 `recordReceipt` 领域方法）
- 按到期日排序默认

---

#### T2.3 收款/付款记录页面（新建）

**文件**：
- `src/app/[locale]/finance/receipts/page.tsx`
- `src/app/[locale]/finance/payments/page.tsx`

**数据源**：
- `fin_receipt_record` 表（对应 `fin_receivable.recordReceipt()`）
- `fin_payment_record` 表（对应 `fin_payable.recordPayment()`）

**注意**：这两个表在 `init-full-tables.ts` 中有 DDL，但需要确认是否有对应的 migration 文件。若无，需补充 migration。

---

#### T2.4 账龄分析报表（新建）

**文件**：`src/app/[locale]/finance/aging-report/page.tsx`

**逻辑**：
- 应收账龄：未到期 / 1-30天 / 31-60天 / 61-90天 / 90天以上
- 应付账龄：同上
- 按客户/供应商分组统计

**数据来源**：`fin_receivable` / `fin_payable` 的 `due_date` + `balance` 字段

---

#### T2.5 设备维护提醒功能（已有数据，补 UI）

**已有表**：
- `eq_equipment` — 设备台账
- `eq_maintenance_plan` — 维护计划
- `eq_maintenance_record` — 维护记录

**新增 UI**：
- 在 `equipment/page.tsx` 添加工具栏"维护提醒"标签
- 显示：今日到期维护 / 本周到期 / 已逾期未维护
- 点击进入维护计划详情页（新建 `equipment/maintenance/page.tsx`）

---

#### T2.6 设备报修工单（已有，确认完整性）

**已有页面**：`equipment/repair/page.tsx`（已有 StatsCards）

**检查项**：
- 报修流程是否完整（报修 → 审核 → 维修 → 验收 → 归档）
- 是否有待处理工单数量统计
- 是否有维修时长/成本统计

---

#### T2.7 打样进度跟踪（新建/增强）

**已有表**：
- `sal_sample_feedback` — 样品反馈
- `sal_sample_quotation` — 样品报价
- `dcprint_sample_process_card` — 工艺卡

**新增 UI**：
- 在 `sample/orders` 列表页添加工序进度条
- 新建 `sample/progress/page.tsx` — 打样进度看板

---

### 3.2 执行顺序

```
T2.1 (应收管理) → T2.2 (应付增强) → T2.3 (收付款记录)
                                              ↓ 并行
                              T2.4 (账龄分析)
                                              ↓ 并行
                              T2.5 (设备维护提醒)
                                              ↓ 并行
                              T2.6 (报修工单检查)
                              T2.7 (打样进度)
```

---

## 四、Phase 3：高级功能 + 测试

### 4.1 任务清单

#### T3.1 高频查询缓存注入（预计 2-3 小时）

**目标**：为以下页面数据层加入缓存，减少数据库压力：

| 页面 | 缓存 key 模式 | TTL 建议 | 失效方式 |
|------|-------------|---------|---------|
| `warehouse/inventory` | `warehouse:inventory:list` | 120s | 入库/出库/调拨事件 |
| `production/schedule` | `production:schedule:list` | 60s | 工单创建/完成事件 |
| `equipment` | `equipment:list` | 300s | 设备状态变更事件 |
| `dcprint/die` | `dcprint:die:list` | 300s | 模具状态变更事件 |
| `purchase/orders` | `purchase:orders:list` | 60s | 订单创建/修改事件 |

**实现方式**：复用现有 `CacheGuard.getOrLoad(key, ttl, loader)` 模式

---

#### T3.2 成本核算功能（预计 3-4 小时）

**已有表**：`fin_cost_detail`（需确认是否存在）

**功能**：
- 工单成本归集（材料+人工+制造费用+外包）
- 成本分摊规则配置
- 成本报表（按产品/客户/时间段）

**页面**：
- `finance/cost-detail/page.tsx` — 成本明细
- `finance/cost-analysis/page.tsx` — 成本分析（折线图+饼图）

---

#### T3.3 财务报表增强（预计 2 小时）

**文件**：`finance/report/page.tsx`

**新增 Tab**：
- "利润表" — 收入/成本/毛利/净利趋势
- "现金流量" — 经营/投资/筹资现金流

**数据来源**：`fin_voucher` + `fin_voucher_line` 凭证表

---

#### T3.4 单元测试补充（预计 3-4 小时）

**目标覆盖率**：Domain Layer 核心聚合根 80%+

| 文件 | 测试内容 |
|------|---------|
| `domain/finance/aggregates/Receivable.ts` | recordReceipt/writeOff/state machine |
| `domain/finance/aggregates/Payable.ts` | recordPayment/state machine |
| `domain/production/aggregates/WorkOrder.ts` | 状态流转/数量校验 |
| `domain/warehouse/aggregates/Stock.ts` | 库存增减/预警 |
| `infrastructure/cache/CacheGuard.ts` | singleflight/SETNX/降级 |

---

#### T3.5 性能基准测试（预计 1 小时）

**测试项**：
- 配送单列表：修复前 vs 修复后（N+1 → 批量）
- 对账列表：修复前 vs 修复后（双重 N+1 → 批量）
- Dashboard 数据：首次加载 vs 缓存命中

**工具**：`wr k` 或手动 `console.time()` 对比

---

### 4.2 执行顺序

```
T3.1 (缓存注入) → T3.2 (成本核算) → T3.3 (报表增强)
                        ↓ 并行
              T3.4 (单元测试)  ← 依赖 T3.1-T3.3
                        ↓
              T3.5 (性能基准)  ← 依赖 T3.1 + N+1修复
```

---

## 五、风险与注意事项

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| N+1 修复引入 bug | 数据错误 | 每个 Repository 修复后跑 tsc + 对照原 SQL 逻辑 |
| StatsCards 覆盖已有 Card | 样式冲突 | 先读目标页面结构，确认插入位置 |
| 新建页面 i18n 缺失 | 非中文用户看到英文 key | 所有新页面字符串走 `useTranslations` |
| 缓存 key 失效遗漏 | 数据陈旧 | 复用现有 `CacheInvalidationHandler.ts` 事件驱动模式 |
| 账龄分析 SQL 复杂 | 性能问题 | 用物化视图或定期汇总表，避免实时聚合大表 |

---

## 六、交付物清单

| 类别 | 交付物 | 状态 |
|------|--------|------|
| 性能 | N+1 修复（3个 Repository 文件） | 待执行 |
| 性能 | 缺失索引 migration 文件 | 待执行 |
| UI | 15 个 P0 页面 StatsCards | 待执行 |
| UI | 6 个 P1 页面 StatsCards | 待执行 |
| 财务 | `finance/receivables` 新页面 | 待执行 |
| 财务 | `finance/receipts` 新页面 | 待执行 |
| 财务 | `finance/payments` 新页面 | 待执行 |
| 财务 | `finance/aging-report` 新页面 | 待执行 |
| 业务 | `equipment/maintenance` 新页面 | 待执行 |
| 业务 | `sample/progress` 新页面 | 待执行 |
| 高级 | 5 个高频查询缓存注入 | 待执行 |
| 高级 | `finance/cost-detail` 新页面 | 待执行 |
| 高级 | `finance/cost-analysis` 新页面 | 待执行 |
| 测试 | 5 个 Domain 单元测试文件 | 待执行 |

---

## 七、子代理并行策略

| 子代理 | 负责任务 | 依赖 |
|--------|---------|------|
| **Agent A** | T1.1 (N+1修复) + T1.2 (索引) + T3.5 (性能基准) | 无 |
| **Agent B** | T1.3 (P0 StatsCards × 15页) + T1.4 (P1 StatsCards × 6页) | 无（可与 A 并行） |
| **Agent C** | T2.1 (应收管理) + T2.3 (收付款记录) + T2.4 (账龄分析) | T2.1 完成后即可开始 T2.4 |
| **Agent D** | T2.2 (应付增强) + T2.5 (设备维护提醒) + T2.7 (打样进度) | 无 |
| **Agent E** | T3.1 (缓存注入) + T3.2 (成本核算) + T3.3 (报表增强) | 无 |
| **Agent F** | T2.6 (报修工单检查) + T3.4 (单元测试) | Agent A 完成后启动测试编写 |

**并行度**：Agent A/B/C/D/E 可同时启动，F 在 A 完成后启动。
