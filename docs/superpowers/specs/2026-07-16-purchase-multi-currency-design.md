# 采购模块多币种改造（Phase 2a）设计规格

> **状态：** 已批准
> **作者：** brainstorming 流程产出
> **日期：** 2026-07-16
> **依赖：** Phase 1 多币种基础设施（已完成）

## 1. 概述

### 1.1 目标

为采购模块接入多币种支持，实现采购订单、采购退货、采购对账、供应商主数据的多币种金额管理。核心能力：

- 支持人民币（CNY）、美元（USD）、越南盾（VND）等多币种采购
- 创建订单时固化汇率，本位币金额随之固化
- 明细表冗余本位币金额字段，避免查询时计算
- 采购退货强制跟随原订单 currency + rate
- 采购对账强制关联入库单同币种
- 前端双币种展示

### 1.2 核心决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 汇率换算时机 | 创建订单时固化 | 财务确定性，避免历史订单汇率波动 |
| 明细表设计 | 冗余本位币金额字段 | 查询性能 + currency/rate 不可变前提下的冗余安全 |
| 退货币种 | 跟随原订单 currency + rate | 退货是订单的逆向业务，避免汇兑损益 |
| 对账币种 | 强制同币种才能对账 | 财务对账要求同币种汇总 |
| 历史数据 | 按历史日期查询汇率填充 | 反映真实历史成本 |
| 供应商主数据 | 增加 default_currency | 供应商稳定使用某一币种结算 |
| currency 可变性 | 创建后不可变 | 保证数据完整性 |

### 1.3 实现方案

方案 B：完整 DDD 改造。领域模型所有金额字段统一用 `Money` 值对象，引入 `CurrencySnapshot` 值对象封装 currency + rate + baseAmount，事件层携带 currency 信息。

## 2. 数据模型

### 2.1 表改造总览

| 表 | 改造内容 |
|----|---------|
| `pur_supplier` | 新增 `default_currency` VARCHAR(10) DEFAULT 'CNY' |
| `pur_purchase_order` | 新增 `base_total_amount`、`base_tax_amount`、`base_grand_total` DECIMAL(18,4) NOT NULL DEFAULT 0.0000（currency、exchange_rate 已有） |
| `pur_purchase_order_line` | 新增 `base_unit_price`、`base_amount`、`base_tax_amount`、`base_line_total` DECIMAL(18,4) NOT NULL DEFAULT 0.0000 |
| `pur_purchase_return` | 新增 `currency` VARCHAR(10) NOT NULL DEFAULT 'CNY'、`exchange_rate` DECIMAL(18,4) NOT NULL DEFAULT 1.0000、`base_total_amount` DECIMAL(18,4) NOT NULL DEFAULT 0.0000 |
| `pur_purchase_return_line` | 新增 `base_unit_price`、`base_amount` DECIMAL(18,4) NOT NULL DEFAULT 0.0000 |
| `pur_purchase_reconciliation` | 新增 `currency`、`exchange_rate`、`base_receipt_amount`、`base_return_amount`、`base_net_amount`、`base_discount_amount`、`base_paid_amount`、`base_balance_amount` |

### 2.2 Migration 064：表结构变更

幂等性通过 `INFORMATION_SCHEMA` 检查列是否存在实现（参考 migration 027/028/042-044 的模式）。

字段位置通过 `AFTER` 子句保持本位币字段紧邻原币字段。所有新金额字段使用 `NOT NULL DEFAULT 0.0000`，新币种字段使用 `NOT NULL DEFAULT 'CNY'`，新汇率字段使用 `NOT NULL DEFAULT 1.0000`。字符集与排序规则跟随表（utf8mb4_0900_ai_ci）。

### 2.3 Migration 065：历史数据回填

策略：按历史订单创建日期查询当时汇率，查不到时 fallback 到 1.0000。

实现：使用存储过程分批处理（每批 1000 条），避免长事务锁表。

回填范围：
- `pur_purchase_order`：currency、exchange_rate、base_total_amount、base_tax_amount、base_grand_total
- `pur_purchase_order_line`：base_unit_price、base_amount、base_tax_amount、base_line_total
- `pur_supplier`：default_currency
- `pur_purchase_return` / `pur_purchase_reconciliation`：历史记录按 1.0 回填（旧记录未接入入库流程）

幂等性：仅处理 `base_grand_total = 0 AND grand_total > 0` 的记录，避免重复回填。

未找到汇率的记录在日志中记录 orderId + currency，供人工核对。

### 2.4 Drizzle schema.ts 同步

所有新字段使用 `decimal({ precision: 18, scale: 4 }).default('0.0000').notNull()`，与现有金额字段精度一致（migration 024 统一为 18,4）。币种字段使用 `varchar('currency', { length: 10 }).default('CNY').notNull()`，汇率字段使用 `decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000').notNull()`。

## 3. 领域层设计

### 3.1 新增值对象：CurrencySnapshot

文件：`src/domain/shared/value-objects/CurrencySnapshot.ts`

不可变值对象，封装创建订单时的 currency + exchange_rate + baseCurrency。

**关键方法**：
- `create(currency, exchangeRate, baseCurrency)` — 工厂方法，校验 currency 长度 3、exchangeRate 正数
- `isSameCurrency` — 判断同币种短路
- `convert(money, decimalPlaces=2)` — 复用 `Money.convertTo`，使用固化的 exchangeRate

### 3.2 PurchaseOrder 聚合根

文件：`src/domain/purchase/aggregates/PurchaseOrder.ts`

**新增属性**：
- `baseCurrency: string`
- `baseTotalAmount: number`
- `baseTaxAmount: number`
- `baseGrandTotal: number`
- `currencySnapshot: CurrencySnapshot`

**改造方法**：
- `updateAmounts()` — 同时计算原币和本位币金额
- `updateLine(line)` — 同时更新明细本位币金额
- `isCurrencyImmutable()` — 返回 true

### 3.3 PurchaseOrderLine 实体

文件：`src/domain/purchase/entities/PurchaseOrderLine.ts`

**新增属性**：`baseUnitPrice`、`baseAmount`、`baseTaxAmount`、`baseLineTotal`

**改造方法**：`recompute(snapshot: CurrencySnapshot)` — 同时计算原币和本位币金额

### 3.4 PurchaseReturn 聚合根

文件：`src/domain/purchase/aggregates/PurchaseReturn.ts`

**新增属性**：`currency`、`exchangeRate`、`baseCurrency`、`baseTotalAmount`、`currencySnapshot`

**关键约束**：静态工厂 `createFromOrder(order: PurchaseOrder, ...)` 强制从原订单继承 currency + exchangeRate + baseCurrency。不提供独立的 `setCurrency()` 方法。

### 3.5 PurchaseReturnLine 实体

文件：`src/domain/purchase/entities/PurchaseReturnLine.ts`

**新增属性**：`baseUnitPrice`、`baseAmount`

### 3.6 PurchaseReconciliation 聚合根

文件：`src/domain/purchase/aggregates/PurchaseReconciliation.ts`

**新增属性**：`currency`、`exchangeRate`、`baseCurrency`、`baseReceiptAmount`、`baseReturnAmount`、`baseNetAmount`、`baseDiscountAmount`、`basePaidAmount`、`baseBalanceAmount`

**关键约束**：静态工厂 `create(props)` 在构造时遍历所有关联入库单，校验 currency 必须一致，不一致抛出 `DomainError`。汇率从首笔入库单继承。

### 3.7 领域事件改造

文件：`src/domain/purchase/events/PurchaseOrderEvents.ts` 等

事件 payload 新增字段：`currency`、`exchangeRate`、`baseCurrency`、`baseTotalAmount`、`baseTaxAmount`、`baseGrandTotal`

涉及事件：
- `PurchaseOrderCreated`
- `PurchaseOrderApproved`
- `PurchaseReturnCreated`
- `PurchaseReconciliationCreated`

## 4. 基础设施层设计

### 4.1 MysqlPurchaseOrderRepository

文件：`src/infrastructure/repositories/MysqlPurchaseOrderRepository.ts`

**改造点**：
- INSERT：包含 currency、exchange_rate、base_total_amount、base_tax_amount、base_grand_total
- SELECT：包含本位币字段 + 供应商 default_currency
- UPDATE：明细行同步更新 base_* 字段
- `toDomain` 映射：decimal → number 转换，null 通过 NOT NULL 约束避免

**防御性校验**：Repository 层不做业务校验，依赖应用服务层。

### 4.2 MysqlPurchaseReturnRepository

文件：`src/infrastructure/repositories/MysqlPurchaseReturnRepository.ts`

**改造点**：
- INSERT：包含 currency、exchange_rate、base_total_amount
- 明细行 INSERT/UPDATE：包含 base_unit_price、base_amount
- `toDomain` 映射：构建 currencySnapshot

### 4.3 MysqlPurchaseReconciliationRepository

文件：`src/infrastructure/repositories/MysqlPurchaseReconciliationRepository.ts`

**改造点**：
- INSERT：包含 currency、exchange_rate、所有 base_* 字段
- SELECT：包含 currency + base_* 字段
- 对账单创建前的 currency 一致性校验使用 `COALESCE(i.currency, 'CNY')` 兼容 `inv_inbound` 暂无 currency 字段的情况

### 4.4 DrizzlePurchaseOrderRepository

备用实现，通过 `REPOSITORY_IMPL=drizzle` 切换。使用 Drizzle ORM 链式 API，字段访问通过 camelCase 属性。

### 4.5 数据映射策略

- `DECIMAL(18,4)` → 读取时 `Number(row.field_name)`，写入时直接传 number
- 所有新字段 `NOT NULL DEFAULT`，避免 null 判断
- Repository 层做 Money ↔ number 转换，领域层只感知 Money 对象

## 5. 应用服务层设计

### 5.1 PurchaseApplicationService

文件：`src/application/services/PurchaseApplicationService.ts`

**构造注入扩展**：新增 `CurrencyApplicationService`

**createOrder 方法**（核心改造）：
1. 确定 currency：优先级 = 输入 > 供应商 default_currency > 系统默认 `finance.default_currency`
2. 查询当前汇率：同币种短路（rate=1），否则调用 `CurrencyApplicationService.getLatestRate`
3. 无汇率记录时抛 `NotFoundError`
4. 创建 `CurrencySnapshot`
5. 构建明细：同时计算原币 + 本位币金额（通过 `snapshot.convert`）
6. 汇总主表金额：原币 + 本位币
7. 构建聚合根并持久化
8. 发布事件（携带 currency 字段）

**updateOrder 方法**：
- 不可变性约束：拒绝修改 currency 和 exchangeRate，抛 `DomainError`
- 修改明细行时使用固化的 `currencySnapshot` 重新计算本位币金额

### 5.2 PurchaseReturnApplicationService

**createReturn 方法**：
- 查询原订单
- 调用 `PurchaseReturn.createFromOrder(originalOrder, ...)`，强制继承 currency + rate + baseCurrency
- 本位币退货金额按原订单固化汇率计算
- 发布事件

### 5.3 PurchaseReconciliationApplicationService

**createReconciliation 方法**：
1. 查询所有关联入库单
2. 校验同币种（`COALESCE(i.currency, 'CNY')`）
3. 不一致抛 `DomainError`，错误消息列出所有涉及的 currency
4. 从首笔入库单继承 currency + exchangeRate
5. 构建 `CurrencySnapshot`
6. 汇总金额（原币 + 本位币）
7. 持久化并发布事件

### 5.4 事件处理器

`PurchasePayableHandler`：从事件 payload 读取 currency + rate + baseAmount，传递给 `FinanceApplicationService.createPayable`。

**向后兼容**：Phase 2a 期间，财务侧暂不消费 currency 字段，仅记录到日志，Phase 2c 改造时同步更新。

## 6. API 层设计

### 6.1 采购订单 API

文件：`src/app/api/purchase/orders/route.ts`

**GET 列表响应**：新增 currency、exchangeRate、baseCurrency、baseTotalAmount、baseTaxAmount、baseGrandTotal 字段

**GET 详情响应**：包含主表 + 明细行，每行携带原币与本位币金额

**POST 创建请求**：currency 可选（默认取供应商 default_currency），exchangeRate 不传（服务端查询固化）

**PUT 更新约束**：拒绝修改 currency 和 exchangeRate，返回 400

### 6.2 采购退货 API

文件：`src/app/api/purchase/return/route.ts`

**POST 创建请求**：不传 currency/exchangeRate，强制从原订单继承

### 6.3 采购对账 API

文件：`src/app/api/purchase/reconciliation/route.ts`

**POST 创建请求**：不传 currency/exchangeRate，由入库单决定

**校验失败响应**：返回 400 + 错误消息 "对账失败：关联入库单币种不一致：USD, VND"

### 6.4 供应商 API

文件：`src/app/api/purchase/suppliers/route.ts`

**POST/PUT 请求**：新增 `defaultCurrency` 字段

### 6.5 API 权限

`/api/purchase/*` 路径权限已在 `api-permissions.ts` 注册，无需新增。

## 7. 前端改造

### 7.1 采购订单列表页

文件：`src/app/[locale]/purchase/orders/page.tsx`

- 表头新增"币种"、"价税合计（本位币）"列
- 金额列使用 `MoneyDisplay` 组件展示双币种
- 筛选条件新增 `CurrencySelect` 下拉

### 7.2 采购订单详情页

文件：`src/app/[locale]/purchase/orders/[id]/page.tsx`

- 头部展示 currency + exchangeRate + baseCurrency 信息卡片
- 明细表格每行展示原币 + 本位币金额
- 汇总区域展示双币种合计
- 不可变提示

### 7.3 采购订单创建/编辑表单

- 新增 `CurrencySelect` 币种选择器
- 选择供应商后自动填充 `defaultCurrency`
- 实时预览本位币金额（前端调用 `/api/system/exchange-rate?from=...&to=...&latest=true`）
- 提交后服务端固化真实汇率

### 7.4 采购退货页面

文件：`src/app/[locale]/purchase/return/page.tsx`

- 创建退货时展示原订单 currency（只读）
- 退货金额自动按原订单汇率换算本位币
- 列表页增加 currency 列

### 7.5 采购对账页面

文件：`src/app/[locale]/purchase/reconciliation/page.tsx`

- 创建对账时展示从入库单继承的 currency（只读）
- 同币种校验失败时显示明确提示
- 列表页增加 currency 列
- 对账金额双币种展示

### 7.6 供应商管理页面

文件：`src/app/[locale]/purchase/suppliers/page.tsx`

- 表单新增 `defaultCurrency` 字段（`CurrencySelect` 组件）
- 列表页展示默认币种列

### 7.7 i18n 扩展

新增 key 到 4 个语言文件（zh-CN / zh-TW / en / vi）的 Common 块：

- `baseCurrencyAmount` — 本位币金额
- `originalCurrencyAmount` — 原币金额
- `currencyImmutableWarning` — 币种创建后不可修改
- `exchangeRateLocked` — 汇率已固化
- `inboundCurrencyMismatch` — 关联入库单币种不一致：{currencies}
- `supplierDefaultCurrency` — 供应商默认币种
- `estimatedBaseAmount` — 预估本位币金额
- `exchangeRateAtCreation` — 创建时汇率

## 8. 测试策略

### 8.1 单元测试

**CurrencySnapshot 值对象**（新增 `tests/unit/domain/shared/value-objects/currency-snapshot.test.ts`）：
- `create` 工厂方法：有效输入、无效 currency（长度非 3）、无效 exchangeRate（≤0、NaN）
- `isSameCurrency`：同币种、不同币种
- `convert`：同币种短路、跨币种换算、VND 0 位小数、负数金额

**PurchaseOrder 聚合根**（扩展测试）：
- `create`：携带 currencySnapshot 创建
- `updateLine`：修改明细时本位币金额同步更新
- `updateAmounts`：汇总计算本位币金额
- 不可变性：创建后 currency 不可修改

**PurchaseReturn 聚合根**（扩展测试）：
- `createFromOrder`：从原订单继承 currency + rate
- 非法输入：原订单 currency 与传入 currency 不一致时抛错

**PurchaseReconciliation 聚合根**（扩展测试）：
- `create`：同币种入库单创建成功
- `create`：不同币种入库单抛 DomainError
- `create`：从首笔入库单继承 currency + rate

**PurchaseApplicationService**（扩展测试）：
- `createOrder`：currency 优先级（输入 > 供应商 > 系统默认）
- `createOrder`：汇率查询 + 固化
- `createOrder`：同币种短路（exchangeRate=1）
- `createOrder`：无汇率记录时抛 NotFoundError
- `updateOrder`：拒绝修改 currency
- `updateOrder`：修改明细行时本位币金额重新计算

**PurchaseReturnApplicationService**（扩展测试）：
- `createReturn`：从原订单继承 currency + rate
- `createReturn`：本位币金额按原订单汇率计算

**PurchaseReconciliationApplicationService**（扩展测试）：
- `createReconciliation`：同币种入库单创建成功
- `createReconciliation`：不同币种入库单抛错
- `createReconciliation`：从首笔入库单继承 currency

### 8.2 集成测试

**API 集成测试**（`tests/integration/api/purchase/*.test.ts`）：
- POST /api/purchase/orders：创建多币种订单，验证响应包含 currency + base_* 字段
- PUT /api/purchase/orders/{id}：尝试修改 currency，验证返回 400
- POST /api/purchase/return：创建退货，验证 currency 继承自原订单
- POST /api/purchase/reconciliation：不同币种入库单，验证返回 400

### 8.3 测试 Mock 策略

- `CurrencyApplicationService`：Mock `getLatestRate` 返回固定汇率
- `IPurchaseOrderRepository`：内存实现或 Mock
- `IEventBus`：Mock 验证事件 payload 包含 currency 字段
- `SystemConfigService`：Mock 返回固定 base_currency

## 9. 向后兼容与迁移策略

### 9.1 向后兼容保证

1. **API 响应**：新增字段为可选，旧客户端忽略即可
2. **数据库字段**：所有新字段 `NOT NULL DEFAULT`，旧数据迁移后填充
3. **事件 payload**：新增字段，旧消费者忽略未消费的字段
4. **前端**：新字段展示为可选，无数据时不显示本位币列

### 9.2 迁移阶段

**阶段 1：数据库迁移（migration 064 + 065）**
- 064：表结构变更
- 065：历史数据回填
- 建议迁移期间系统只读

**阶段 2：代码部署**
- 部署新版本代码
- 新创建订单自动接入多币种
- 旧订单已迁移，读取时返回 base_* 字段

**阶段 3：验证**
- 单元测试 + 集成测试
- 抽样验证历史订单的 base_* 金额
- 监控事件消费者

### 9.3 风险与缓解

1. **历史数据回填查不到汇率** → fallback 到 1.0，日志记录供人工核对
2. **事件消费者未更新** → Phase 2a 财务侧暂不消费 currency 字段，Phase 2c 同步更新
3. **前端缓存旧版** → Next.js 构建哈希自动失效
4. **对账单 `inv_inbound` 无 currency** → `COALESCE(i.currency, 'CNY')` 兼容

## 10. 范围边界

### 10.1 Phase 2a 范围内

- 4 张采购核心表（order / order_line / return / return_line）+ reconciliation + supplier
- 3 个聚合根 + 3 个实体 + 1 个值对象（CurrencySnapshot）
- 3 个 Application Service
- 6 个 API 路由
- 5 个前端页面
- 2 个 migration（064 + 065）
- i18n 扩展

### 10.2 Phase 2a 范围外

- `inv_inbound` 表的 currency 改造（仓库模块 Phase 2.x）
- `fin_payable` 表的 currency 改造（财务模块 Phase 2c）
- `pur_request` 采购申请的 currency 扩展（已有字段，仅小调整）
- 已废弃表（`pur_receipt_deprecated` 等）

### 10.3 依赖关系

- **依赖 Phase 1**：`CurrencyApplicationService`、`Money.convertTo`、`sys_currency` / `sys_exchange_rate` 表
- **被 Phase 2c 依赖**：采购事件 payload 携带 currency 字段
- **被仓库模块 Phase 2.x 依赖**：采购订单 currency 信息传递给入库单

## 11. 验收标准

1. 创建 USD 采购订单，验证 currency=USD、exchangeRate=当日汇率、base_* 字段正确计算
2. 创建 VND 采购订单，验证 decimalPlaces=0 的本位币金额为整数
3. 尝试 PUT 修改 currency，验证返回 400
4. 基于 USD 订单创建退货，验证 currency 继承为 USD、exchangeRate 继承为原值
5. 创建对账单时关联不同 currency 的入库单，验证返回 400 + 明确错误消息
6. 历史订单迁移后 base_* 字段非零且合理
7. 前端采购订单列表正确展示双币种
8. 所有单元测试和集成测试通过
