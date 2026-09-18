# 多币种支持 Phase 2b 设计文档

> 日期：2026-07-17
> 状态：草稿
> 范围：销售模块 + 库存/入库衔接 + 财务应收/应付
> 基于：Phase 1（基础设施）+ Phase 2a（采购多币种）已完成

## 1. 范围总览

### 1.1 包含模块

| 模块 | 子范围 | 优先级 |
|------|--------|--------|
| 销售 | `sal_order`, `sal_order_detail`, `sal_delivery`, `sal_delivery_detail`, `sal_return`, `sal_return_detail`, `sal_reconciliation`, 相关聚合根/实体 | 高 |
| 库存 | `inv_inbound_order`, `inv_inbound_item`, `inv_outbound_order`, `inv_outbound_item` | 高 |
| 财务 | `fin_payable`, `fin_receivable`, `fin_payment_record`, `fin_receipt_record` | 高 |

### 1.2 排除模块（延后处理）

| 模块 | 原因 |
|------|------|
| 生产成本 (`prod_work_order` 等) | 成本核算通常只用本位币，无需多币种 |

### 1.3 关键设计决策

| 决策 | 选项 | 结论 |
|------|------|------|
| 入库单币种来源 | 继承但允许覆盖 | 默认从 PO 继承 currency+exchange_rate，用户可手动修改 |
| 应收/应付币种来源 | 继承+手动调整 | 默认从来源单据继承，允许用户在特殊场景手动调整 |

## 2. 数据库设计

### 2.1 精度规范

- 金额字段：`DECIMAL(18,4)` — 兼容 VND（大金额无小数）和 USD/CNY
- 汇率字段：`DECIMAL(18,6)` — 6 位小数精度
- `base_amount` = 原币金额 × 汇率，创建时计算存储
- 旧数据回填策略：currency=CNY, exchange_rate=1.0, base_amount=原金额

### 2.2 Migration 066 — 库存/入库衔接

```sql
-- inv_inbound_order
ALTER TABLE `inv_inbound_order`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

-- inv_inbound_item
ALTER TABLE `inv_inbound_item`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

-- inv_outbound_order
ALTER TABLE `inv_outbound_order`
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

-- inv_outbound_item
ALTER TABLE `inv_outbound_item`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

-- 旧数据回填
UPDATE `inv_inbound_order` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
UPDATE `inv_outbound_order` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
```

### 2.3 Migration 067 — 销售模块

```sql
-- sal_order（已有 currency + exchange_rate）
ALTER TABLE `sal_order`
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `total_amount`,
  ADD COLUMN `base_tax_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币税额' AFTER `tax_amount`,
  ADD COLUMN `base_grand_total` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币含税总额' AFTER `total_with_tax`;

-- sal_order_detail
ALTER TABLE `sal_order_detail`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `material_spec`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`,
  ADD COLUMN `base_tax_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币税额' AFTER `tax_amount`;

-- sal_delivery
ALTER TABLE `sal_delivery`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

-- sal_delivery_detail
ALTER TABLE `sal_delivery_detail`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

-- sal_return
ALTER TABLE `sal_return`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

-- sal_return_detail
ALTER TABLE `sal_return_detail`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

-- sal_reconciliation（7 个 base_*）
ALTER TABLE `sal_reconciliation`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_delivery_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币出库金额' AFTER `delivery_amount`,
  ADD COLUMN `base_return_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币退货金额' AFTER `return_amount`,
  ADD COLUMN `base_net_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币净额' AFTER `net_amount`,
  ADD COLUMN `base_discount_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币折扣金额' AFTER `discount_amount`,
  ADD COLUMN `base_received_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币实收金额' AFTER `received_amount`,
  ADD COLUMN `base_balance_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币余额' AFTER `balance_amount`;

-- 旧数据回填
UPDATE `sal_order` SET `base_total_amount` = `total_amount`, `base_tax_amount` = `tax_amount`, `base_grand_total` = `total_with_tax` WHERE `base_total_amount` = 0;
UPDATE `sal_delivery` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
UPDATE `sal_return` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
```

### 2.4 Migration 068 — 财务模块

```sql
-- fin_payable
ALTER TABLE `fin_payable`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

-- fin_receivable
ALTER TABLE `fin_receivable`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

-- fin_payment_record
ALTER TABLE `fin_payment_record`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

-- fin_receipt_record
ALTER TABLE `fin_receipt_record`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

-- 旧数据回填
UPDATE `fin_payable` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
UPDATE `fin_receivable` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
UPDATE `fin_payment_record` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
UPDATE `fin_receipt_record` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
```

### 2.5 Drizzle Schema 同步

新建/修改 `src/lib/db/schema.ts` 中对应表定义，追加新字段列，保持与 Phase 2a 模式一致。

## 3. 领域层设计

### 3.1 复用已有资产

| 资产 | 位置 | 状态 |
|------|------|------|
| `Money` 值对象（含 `convertTo`/`format`） | `src/domain/shared/value-objects/Money.ts` | Phase 1 完成 |
| `CurrencySnapshot` 值对象 | `src/domain/shared/value-objects/CurrencySnapshot.ts` | Phase 2a 完成 |
| `ICurrencyService` 接口 | `src/domain/shared/CurrencyService.ts` | Phase 1 完成 |
| `CurrencyApplicationService`（含缓存） | `src/application/services/CurrencyApplicationService.ts` | Phase 1 完成 |
| `MysqlCurrencyRepository` | `src/infrastructure/repositories/MysqlCurrencyRepository.ts` | Phase 1 完成 |

### 3.2 SalesOrder 聚合根

**Props 接口修改：**
```typescript
export interface SalesOrderProps {
  // ...原有字段...
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseTotalAmount?: number;
  baseTaxAmount?: number;
  baseGrandTotal?: number;
}
```

**构造函数追加参数：** 与 `PurchaseOrder` 模式一致（7 个新参数：`currency`, `exchangeRate`, `baseCurrency`, `baseTotalAmount`, `baseTaxAmount`, `baseGrandTotal`）。

**getter / create / reconstitute：** 与 `PurchaseOrder` 完全一致。

### 3.3 SalesOrderLine 实体

```typescript
export interface SalesOrderLineProps {
  // ...原有字段...
  baseUnitPrice?: number;
  baseAmount?: number;
  baseTaxAmount?: number;
  baseLineTotal?: number;
}
```

### 3.4 Delivery 聚合根

```typescript
export interface DeliveryProps {
  // ...原有字段...
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseTotalAmount?: number;
}
```

### 3.5 ReturnOrder 聚合根

```typescript
export interface ReturnOrderProps {
  // ...原有字段...
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseTotalAmount?: number;
}
```

### 3.6 Reconciliation 聚合根

```typescript
export interface ReconciliationProps {
  // ...原有字段...
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseDeliveryAmount?: number;
  baseReturnAmount?: number;
  baseNetAmount?: number;
  baseDiscountAmount?: number;
  baseReceivedAmount?: number;
  baseBalanceAmount?: number;
}
```

### 3.7 InboundOrder 聚合根

```typescript
export interface InboundOrderProps {
  // ...原有字段...
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseTotalAmount?: number;
}
```

### 3.8 Payable 聚合根

```typescript
export interface PayableProps {
  // ...原有字段...
  currency?: string;
  exchangeRate?: number;
  baseAmount?: number;
}
```

### 3.9 Receivable 聚合根

```typescript
export interface ReceivableProps {
  // ...原有字段...
  currency?: string;
  exchangeRate?: number;
  baseAmount?: number;
}
```

### 3.10 领域事件扩展

每个聚合根的 `CreatedEvent` 追加对应可选字段（与 Phase 2a 模式一致，向后兼容）：
- `SalesOrderCreatedEvent` → 追加 `currency`, `exchangeRate`, `baseCurrency`, `baseTotalAmount`, `baseGrandTotal`
- `DeliveryCreatedEvent` → 追加 `currency`, `exchangeRate`, `baseCurrency`, `baseTotalAmount`
- `ReturnOrderCreatedEvent` → 追加 `currency`, `exchangeRate`, `baseCurrency`, `baseTotalAmount`
- `ReconciliationCreatedEvent` → 追加 `currency`, `exchangeRate`, `baseCurrency`, 3-5 个 base_* 字段
- `PayableCreatedEvent` → 追加 `currency`, `exchangeRate`, `baseAmount`

## 4. 应用服务层设计

### 4.1 SalesApplicationService

**构造函数注入：**
```typescript
constructor(
  private readonly orderRepo: ISalesOrderRepository,
  private readonly currencyService: CurrencyApplicationService,
) {}
```

**createOrder 方法：**
- 确定 currency：输入 > 系统默认（`finance.default_currency`）
- 查询本位币（`finance.base_currency`）
- 若 currency ≠ baseCurrency，调用 `currencyService.getLatestRate` 获取汇率
- 构建 `CurrencySnapshot` 固化汇率
- 为每个明细行计算 base_* 字段
- 计算主表 base_total_amount / base_tax_amount / base_grand_total

**createDelivery：**
- 从 `sal_order` 继承 currency + exchangeRate（只读，不允许覆盖），与采购退货相同模式

**createReturn：**
- 从原 `sal_delivery` 或 `sal_order` 继承 currency + exchangeRate（只读）

**createReconciliation：**
- 查询关联出库单
- 校验同币种一致性（与 `PurchaseReconciliationApplicationService` 相同模式）

### 4.2 InboundApplicationService

**构造函数注入 `CurrencyApplicationService`、`IPurchaseOrderRepository`（可选）：**

**createInbound：**
- 若关联 PO（`purchase_order_id`），从 PO 继承 currency + exchangeRate，允许用户覆盖
- 若无 PO，默认 CNY
- 为明细行计算 base_* 字段

**createOutbound：**
- 若关联 SO（`sales_order_id`），从 SO 继承 currency + exchangeRate，允许覆盖
- 若无 SO，默认 CNY

### 4.3 FinanceApplicationService

**构造函数注入 `CurrencyApplicationService`：**

**createPayable（来源 = 采购入库单 + 采购单）：**
- 从来源单继承 currency + exchangeRate
- 允许用户手动调整（应用服务层覆盖）
- 若手动调整 currency，重新计算 exchangeRate 和 baseAmount

**createReceivable（来源 = 销售出库单 + 销售单）：**
- 同上

**recordPayment / recordReceipt：**
- 继承对应应付/应收的 currency + exchangeRate
- 计算 baseAmount

## 5. 基础设施层设计

### 5.1 Repository 改造列表

| Repository 文件 | 改造内容 |
|---|---|
| `MysqlSalesOrderRepository.ts` | INSERT/SELECT/mapToProps 追加 base_* 字段 |
| `MysqlDeliveryRepository.ts` | 同上 |
| `MysqlReturnOrderRepository.ts` | 同上 |
| `MysqlReconciliationRepository.ts` | 同上（7 个 base_*） |
| `MysqlInboundOrderRepository.ts` | 新增 currency + exchangeRate + base_total_amount |
| `MysqlOutboundOrderRepository.ts` | 新增 exchange_rate + base_total_amount |
| `MysqlPayableRepository.ts` | 新增 currency + exchangeRate + base_amount |
| `MysqlReceivableRepository.ts` | 新增 currency + exchangeRate + base_amount |

### 5.2 改造模式

每个 Repository 的改造分 3 步（与 Phase 2a 完全一致）：
1. Row 接口追加新字段类型定义
2. INSERT/SELECT SQL 追加新列
3. `mapToProps` 方法读取新字段

## 6. API 路由设计

### 6.1 销售模块

| 路由文件 | 操作 |
|---|---|
| `src/app/api/sales/orders/route.ts` | GET 响应追加 base_* 字段；POST 接收 currency；PUT 拒绝 currency 修改 |
| `src/app/api/sales/delivery/route.ts` | GET 响应追加 currency+exchange_rate+base_total_amount；POST 不接收 currency（从 SO 继承） |
| `src/app/api/sales/return/route.ts` | GET 响应追加；POST 不接收 currency（从源单据继承） |
| `src/app/api/sales/reconciliation/route.ts` | GET 响应追加；POST 包装 DomainError 同币种校验 |

### 6.2 库存模块

| 路由文件 | 操作 |
|---|---|
| `src/app/api/inventory/inbound/route.ts` | GET 响应追加；POST 接收可选 currency（默认从 PO 继承） |
| `src/app/api/inventory/outbound/route.ts` | GET 响应追加；POST 接收可选 currency |

### 6.3 财务模块

| 路由文件 | 操作 |
|---|---|
| `src/app/api/finance/payable/route.ts` | GET 响应追加 currency+exchange_rate+base_amount；POST 接收 currency |
| `src/app/api/finance/receivable/route.ts` | GET 响应追加；POST 接收 currency |
| `src/app/api/finance/payment/route.ts` | GET 响应追加；POST 继承应付 currency |
| `src/app/api/finance/receipt/route.ts` | GET 响应追加；POST 继承应收 currency |

## 7. 前端设计

### 7.1 复用组件

| 组件 | 用途 |
|---|---|
| `<MoneyDisplay amount currency baseAmount baseCurrency />` | 双币种金额展示 |
| `<CurrencySelect value onChange />` | 币种选择器 |
| `formatMoney()` | 金额格式化工具 |

### 7.2 页面改造列表

| 页面 | 改造内容 |
|---|---|
| 销售订单列表/创建页 | 加币种列 + `MoneyDisplay` + `CurrencySelect` |
| 销售订单详情页 | 加币种信息卡 + 明细双币列 |
| 销售出库页 | 显示继承币种（只读）+ `MoneyDisplay` |
| 销售退货页 | 继承币种显示 + 双币金额 |
| 销售对账页 | 同币种校验提示 + 双币金额 |
| 入库管理页 | 从 PO 获取 currency 展示 + 可选覆盖 |
| 应付/应收页 | 币种列 + `MoneyDisplay` + 来源单号链接 |

### 7.3 i18n 扩展（约 12 个新 key）

| Key | 中文 | English |
|---|---|---|
| `sales.baseCurrencyAmount` | 本位币金额 | Base Currency Amount |
| `sales.inheritedCurrency` | 继承币种 | Inherited Currency |
| `inventory.inboundCurrency` | 入库币种 | Inbound Currency |
| `finance.payableCurrency` | 应付币种 | Payable Currency |
| `finance.receivableCurrency` | 应收币种 | Receivable Currency |
| `common.allowOverride` | 允许修改 | Allow Override |
| `common.currencyConsistencyError` | 单据币种不一致 | Document Currency Mismatch |

## 8. 错误处理

| 场景 | 处理方式 |
|---|---|
| 汇率未配置 | `CurrencyApplicationService.getLatestRate` 抛出明确错误，前端 toast 提示 |
| Redis 不可用 | 降级为内存 Map 缓存（复用现有降级模式） |
| 币种停用 | 已存在单据保留原币种，新建单据不能选择已停用币种 |
| 对账币种不一致 | `DomainError` + 400 HTTP + 明确错误消息（同 Phase 2a） |
| 币种创建后修改 | PUT 处理程序拒绝 `currency`/`exchange_rate` 字段（同 Phase 2a） |

## 9. 测试策略

### 9.1 单元测试

- `CurrencySnapshot` 值对象 — 已有 10 测试
- `SalesOrder` 聚合根 — base_* 字段创建/读取
- `SalesApplicationService.createOrder` — 多币种换算

### 9.2 集成测试

- 各 Repository — INSERT/SELECT 新字段正确读写
- `CurrencyApplicationService` — 缓存命中/失效

### 9.3 回归测试

- 现有 1382 测试 — 确认无新失败（已知 6 个预存失败不受影响）

## 10. 旧数据迁移说明

所有历史数据按原金额视为 CNY（exchange_rate=1.0），base_amount = 原金额：
- 这保证了财务汇总的一致性（历史数据本位币 = 原金额）
- 新增业务按实时汇率换算
- 不改已有数据，仅追加新列并设默认值

## 11. 估算

| 工作项 | 文件数 | 估算 |
|--------|--------|------|
| DB migrations (3 个) | 3 | 小 |
| Drizzle schema sync | 1 | 小 |
| 领域层 (7 聚合根 + 6 实体 + 7 事件文件) | ~20 | 中 |
| Repository (8 个) | 8 | 中 |
| Application Service (3 个) | 3 | 中 |
| API routes (9 个) | 9 | 小 |
| 前端页面 (7 个) | 7 | 中 |
| i18n | 4 | 小 |
| 测试 | ~10 | 中 |
| **合计** | **~65** | **大（约 2-3 倍 Phase 2a 工作量）** |
