# 多币种支持设计文档

> 日期：2026-07-16
> 状态：已批准（待实现）
> 范围：跨境采购 + 跨境销售 + 财务收付款多币种核算

## 1. 背景与目标

### 1.1 业务背景
公司有跨境采购（向国外供应商用美元/越南盾付款）和跨境销售（向海外客户用美元结算）需求。现有系统金额字段以人民币（CNY）为主，部分表（`pur_purchase_order`、`sal_order`）已有 `currency` + `exchange_rate` 字段但未启用，财务表（`fin_payable`/`fin_receivable`/`fin_payment_record`/`fin_receipt_record`）完全缺失多币种字段。

### 1.2 目标
- 支持多币种业务单据（CNY/USD/VND，可扩展）
- 按公司设置本位币（如中国公司 CNY，越南公司 VND）
- 实时汇率换算，业务单据创建时计算并存储本位币金额快照
- 财务报表按本位币汇总，无需实时换算

### 1.3 非目标（YAGNI）
- 汇率 API 自动获取（先用手动录入）
- 多公司主体合并报表
- 期货套期保值
- 历史汇率追溯调整

## 2. 现状分析

### 2.1 已有基础设施
| 资产 | 位置 | 状态 |
|------|------|------|
| `Money` 值对象 | `src/domain/shared/value-objects/Money.ts` | 已有 currency 字段 + add/subtract/multiply，缺 convertTo |
| `pur_purchase_order` 表 | `database/vnerpdacahng_schema.sql:2827` | 已有 `currency` + `exchange_rate`，缺 `base_amount` |
| `sal_order` 表 | `database/vnerpdacahng_schema.sql:3372` | 已有 `currency` + `exchange_rate`，缺 `base_amount` |
| `sys_company` 表 | `database/vnerpdacahng_schema.sql:3741` | 已有公司主体，缺 `base_currency` 字段 |
| 配置项 | `settings/config/page.tsx:312-337` | 已有 `finance.default_currency` 和 `finance.multi_currency` |
| `audit_system_tables.sql:133` | 已有 `exchange_rate DECIMAL(10,6)` | 审计表已有汇率字段 |

### 2.2 缺失部分
- 无 `sys_currency`（币种主数据）表
- 无 `sys_exchange_rate`（汇率表）表
- `sys_company` 缺 `base_currency` 字段
- `fin_payable`/`fin_receivable`/`fin_payment_record`/`fin_receipt_record` 缺 `currency` + `exchange_rate` + `base_amount` 字段
- `Money` 值对象缺 `convertTo`/`format` 方法
- 无 `ICurrencyService` 领域服务接口
- 无统一的货币格式化工具和 `<MoneyDisplay>` 组件

## 3. 架构设计

### 3.1 分层架构
```
┌─────────────────────────────────────────────┐
│  前端层                                       │
│  <MoneyDisplay amount currency /> 组件        │
│  formatMoney() 工具 + <CurrencySelect>        │
├─────────────────────────────────────────────┤
│  API 路由层（Thin Controller）                 │
│  /api/system/currency  /api/system/exchange-rate │
├─────────────────────────────────────────────┤
│  应用服务层                                   │
│  CurrencyApplicationService                   │
│  采购/销售/财务服务调用 Money.convertTo()       │
├─────────────────────────────────────────────┤
│  领域层                                       │
│  Money 值对象（扩展 convertTo/format）         │
│  ICurrencyService 接口                        │
├─────────────────────────────────────────────┤
│  基础设施层                                   │
│  MysqlCurrencyRepository（实现 ICurrencyService）│
├─────────────────────────────────────────────┤
│  数据库层                                     │
│  sys_currency / sys_exchange_rate (新建)       │
│  sys_company.base_currency (新字段)            │
│  fin_*.{currency,exchange_rate,base_amount}   │
└─────────────────────────────────────────────┘
```

### 3.2 核心数据流（以采购单为例）
1. 创建采购单时，用户选币种 USD
2. `CurrencyApplicationService` 查 `sys_exchange_rate` 取最新 USD→CNY 汇率（带 Redis 缓存）
3. 存入 `pur_purchase_order`：`currency=USD`, `exchange_rate=7.25`, `total_amount=1000`(原币), `base_amount=7250`(本位币)
4. 生成应付 `fin_payable` 时携带 currency+exchange_rate+base_amount
5. 报表查询时直接 SUM(base_amount) 得到本位币汇总，无需实时换算

### 3.3 关键设计决策
虽然采用"实时汇率换算"，但每笔业务单据**创建时**会按当时汇率计算 `base_amount` 并存储。这保证报表数据稳定（不因后续汇率波动改变已发生的历史金额），同时汇率表保持最新汇率供新单据使用。这比纯实时换算更符合财务规范。

## 4. 数据库设计

### 4.1 新建表

#### sys_currency（币种主数据）
```sql
CREATE TABLE `sys_currency` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL COMMENT '币种代码 ISO 4217 (CNY/USD/VND)',
  `name` varchar(50) NOT NULL COMMENT '币种名称',
  `symbol` varchar(10) DEFAULT NULL COMMENT '符号 (¥/$/₫)',
  `decimal_places` tinyint DEFAULT 2 COMMENT '小数位 (CNY=2, USD=2, VND=0)',
  `status` tinyint DEFAULT 1 COMMENT '1启用 0停用',
  `sort` int DEFAULT 0,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  `update_by` bigint unsigned DEFAULT NULL,
  `deleted` tinyint DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='币种主数据';

-- 预置数据
INSERT INTO `sys_currency` (`code`, `name`, `symbol`, `decimal_places`, `sort`) VALUES
  ('CNY', '人民币', '¥', 2, 1),
  ('USD', '美元', '$', 2, 2),
  ('VND', '越南盾', '₫', 0, 3);
```

#### sys_exchange_rate（汇率表）
```sql
CREATE TABLE `sys_exchange_rate` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `from_currency` varchar(10) NOT NULL COMMENT '源币种',
  `to_currency` varchar(10) NOT NULL COMMENT '目标币种',
  `rate` decimal(18,6) NOT NULL COMMENT '汇率',
  `rate_date` date NOT NULL COMMENT '汇率日期',
  `source` varchar(50) DEFAULT 'manual' COMMENT '汇率来源 manual/api',
  `remark` varchar(200) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `create_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_from_to_date` (`from_currency`,`to_currency`,`rate_date`),
  KEY `idx_date` (`rate_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='汇率表';
```

### 4.2 修改表

#### sys_company 加本位币字段
```sql
ALTER TABLE `sys_company`
  ADD COLUMN `base_currency` varchar(10) DEFAULT 'CNY' COMMENT '本位币' AFTER `tax_no`;
```

#### 财务表补多币种字段
涉及表：`fin_payable`、`fin_receivable`、`fin_payment_record`、`fin_receipt_record`

```sql
-- 以 fin_payable 为例，其余三表同构
ALTER TABLE `fin_payable`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT '1.000000' COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币金额' AFTER `exchange_rate`;

-- 旧数据回填：currency 默认 CNY，exchange_rate 默认 1，base_amount = amount
UPDATE `fin_payable` SET `base_amount` = `amount` WHERE `base_amount` = 0;
-- 对 fin_receivable、fin_payment_record、fin_receipt_record 同样回填
```

#### 采购/销售主表补 base_amount
```sql
ALTER TABLE `pur_purchase_order`
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币总金额' AFTER `grand_total`;

ALTER TABLE `sal_order`
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT '0.0000' COMMENT '本位币总金额' AFTER `total_with_tax`;

-- 旧数据回填
UPDATE `pur_purchase_order` SET `base_amount` = `total_amount` WHERE `base_amount` = 0;
UPDATE `sal_order` SET `base_amount` = `total_amount` WHERE `base_amount` = 0;
```

### 4.3 精度规范
- 金额字段：`decimal(18,4)` — 兼容 VND（无小数但金额大）和 USD/CNY
- 汇率字段：`decimal(18,6)` — 容纳 6 位小数精度
- `base_amount` = 原币金额 × 汇率，创建时计算存储

## 5. 领域层设计

### 5.1 Money 值对象扩展
在现有 `src/domain/shared/value-objects/Money.ts` 基础上添加：

```typescript
/**
 * 按汇率转换为目标币种（返回新的 Money 对象）
 * @param rate 汇率（from→to）
 * @param targetCurrency 目标币种代码
 * @param decimalPlaces 目标币种小数位（VND=0, CNY/USD=2）
 */
convertTo(rate: number, targetCurrency: string, decimalPlaces: number = 2): Money {
  if (this.currency === targetCurrency) {
    return new Money(this.amount, this.currency);
  }
  const converted = this.amount * rate;
  const factor = Math.pow(10, decimalPlaces);
  const rounded = Math.round(converted * factor) / factor;
  return new Money(rounded, targetCurrency);
}

/**
 * 按目标币种小数位格式化金额
 */
format(decimalPlaces: number = 2): string {
  return this.amount.toFixed(decimalPlaces);
}
```

### 5.2 ICurrencyService 领域服务接口
```typescript
// src/domain/shared/CurrencyService.ts (新建)

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDate: Date;
}

export interface ICurrencyService {
  getCurrency(code: string): Promise<CurrencyInfo | null>;
  getLatestRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null>;
  getRateOnDate(fromCurrency: string, toCurrency: string, date: Date): Promise<ExchangeRate | null>;
  listActiveCurrencies(): Promise<CurrencyInfo[]>;
}
```

**原则：**
- 领域层只定义接口，不依赖 MySQL/Drizzle
- `Money.convertTo` 是纯函数，汇率由调用方传入
- 应用服务层负责调用 `ICurrencyService` 获取汇率

## 6. 应用层与基础设施层

### 6.1 MysqlCurrencyRepository
```typescript
// src/infrastructure/repositories/MysqlCurrencyRepository.ts (新建)
export class MysqlCurrencyRepository implements ICurrencyService {
  async getCurrency(code: string): Promise<CurrencyInfo | null> {
    // SELECT * FROM sys_currency WHERE code = ? AND status = 1 AND deleted = 0
  }
  async getLatestRate(from: string, to: string): Promise<ExchangeRate | null> {
    // SELECT * FROM sys_exchange_rate
    // WHERE from_currency=? AND to_currency=?
    // ORDER BY rate_date DESC LIMIT 1
  }
  // ...其他方法
}
```

### 6.2 CurrencyApplicationService
```typescript
// src/application/services/CurrencyApplicationService.ts (新建)
export class CurrencyApplicationService {
  constructor(private currencyService: ICurrencyService) {}

  /** 获取最新汇率，带 Redis 缓存（TTL 5分钟） */
  async getLatestRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    const cacheKey = `rate:${from}:${to}`;
    const cached = await cache.get(cacheKey);
    if (cached) return parseFloat(cached);
    const rate = await this.currencyService.getLatestRate(from, to);
    if (!rate) throw new Error(`汇率未配置: ${from}→${to}`);
    await cache.set(cacheKey, rate.rate, 300);
    return rate.rate;
  }

  /** 换算金额为本位币 */
  async convertToBaseCurrency(money: Money, baseCurrency: string): Promise<Money> {
    if (money.currency === baseCurrency) return money;
    const rate = await this.getLatestRate(money.currency, baseCurrency);
    const target = await this.currencyService.getCurrency(baseCurrency);
    return money.convertTo(rate, baseCurrency, target?.decimalPlaces ?? 2);
  }
}
```

**缓存降级：** 无 Redis 时降级为内存 Map 缓存，复用项目现有的 Redis 降级模式。

### 6.3 业务服务集成（以采购订单为例）
```typescript
// src/application/services/PurchaseApplicationService.ts (修改)
async createPurchaseOrder(dto: CreatePurchaseOrderDTO): Promise<PurchaseOrder> {
  const baseCurrency = await this.getCompanyBaseCurrency();
  const totalAmount = Money.create(dto.totalAmount, dto.currency);
  const baseAmount = await this.currencyAppService.convertToBaseCurrency(totalAmount, baseCurrency);
  const rate = await this.currencyAppService.getLatestRate(dto.currency, baseCurrency);

  return this.purchaseOrderRepo.create({
    ...dto,
    exchange_rate: rate,
    base_amount: baseAmount.amount,
  });
}
```

### 6.4 API 路由
```typescript
// src/app/api/system/currency/route.ts (新建)
//   GET  - 币种列表
//   POST - 新建币种
//   PUT  - 更新币种
//   DELETE - 删除币种

// src/app/api/system/exchange-rate/route.ts (新建)
//   GET  /api/system/exchange-rate?from=USD&to=CNY  → 最新汇率
//   GET  /api/system/exchange-rate?date=2026-07-16   → 指定日期汇率
//   POST /api/system/exchange-rate                   → 录入汇率
```

## 7. 前端设计

### 7.1 新建组件

#### `<MoneyDisplay>` 组件
```tsx
// src/components/ui/money-display.tsx
interface MoneyDisplayProps {
  amount: number;
  currency?: string;      // 原币代码，默认 CNY
  baseAmount?: number;    // 本位币金额（可选，提供则双行显示）
  baseCurrency?: string;  // 本位币代码
  showSymbol?: boolean;   // 是否显示符号 ¥/$/₫
}
// 渲染：$1,000.00 (≈¥7,250.00)  或仅 ¥7,250.00
```

#### `formatMoney()` 工具函数
```typescript
// src/lib/money-format.ts (新建)
export function formatMoney(amount: number, currency: string, decimalPlaces = 2): string {
  return new Intl.NumberFormat(getLocaleByCurrency(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(amount);
}
// VND 用 0 位小数，CNY/USD 用 2 位
```

#### `<CurrencySelect>` 币种选择器
```tsx
// src/components/ui/currency-select.tsx
// 下拉选 sys_currency 表数据，显示 "¥ CNY 人民币" 格式
```

### 7.2 新建页面
- **汇率管理页面** `settings/exchange-rate`：汇率列表（筛选 from/to 币种）、录入/更新汇率表单
- **币种管理页面** `settings/currency`：币种 CRUD（启用/停用、设置小数位）

### 7.3 现有页面改造

#### 采购订单页面（已有 currency 字段，改造小）
- 表单加币种选择器 + 汇率自动填充（选币种后自动查最新汇率）
- 列表/详情用 `<MoneyDisplay>` 展示原币+本位币
- 总金额区域显示"USD 1,000.00 (≈CNY 7,250.00)"

#### 销售订单页面（已有 currency 字段，改造小）
- 同采购订单

#### 财务页面（fin_payable/receivable 等）
- 列表加币种列
- 付款/收款表单加币种选择
- 报表按本位币汇总（SUM(base_amount)）

### 7.4 i18n
新增 Common 块 key（4 语言文件同步）：
- `currency`、`exchangeRate`、`baseCurrency`、`originalCurrency`、`convertedAmount`、`exchangeRateManagement`、`currencyManagement`

## 8. 分阶段实施计划

### Phase 1：基础设施
**交付物：**
- 数据库迁移：新建 `sys_currency`、`sys_exchange_rate` 表
- `sys_company` 加 `base_currency` 字段
- `Money` 值对象扩展 `convertTo`/`format`
- `ICurrencyService` 接口 + `MysqlCurrencyRepository` 实现
- `CurrencyApplicationService`（含 Redis 缓存）
- 预置数据：CNY/USD/VND 三币种 + 初始汇率
- API：`/api/system/currency`、`/api/system/exchange-rate`
- 前端：`formatMoney()` 工具、`<CurrencySelect>`、`<MoneyDisplay>` 组件
- 设置页面：币种管理、汇率管理

**验证：** 能查询币种、录入汇率、调用 `convertTo` 正确换算

### Phase 2：采购模块改造
**交付物：**
- `pur_purchase_order` 加 `base_amount` 字段
- `PurchaseApplicationService` 集成 `CurrencyApplicationService`
- 创建采购单时自动查汇率、计算 base_amount
- 采购订单页面：币种选择器 + 汇率自动填充 + 双币展示
- `fin_payable` 加 currency+exchange_rate+base_amount 字段
- 生成应付时携带多币种信息
- 旧数据回填：currency=CNY, exchange_rate=1, base_amount=amount

**验证：** 创建 USD 采购单 → 应付生成正确本位币金额

### Phase 3：销售模块改造
**交付物：**
- `sal_order` 加 `base_amount` 字段
- `SalesApplicationService` 集成 `CurrencyApplicationService`
- 销售订单页面：币种选择器 + 双币展示
- `fin_receivable` 加 currency+exchange_rate+base_amount 字段
- 生成应收时携带多币种信息
- 旧数据回填

**验证：** 创建 USD 销售单 → 应收生成正确本位币金额

### Phase 4：财务收付款 + 报表
**交付物：**
- `fin_payment_record`、`fin_receipt_record` 加 currency+exchange_rate+base_amount
- 付款/收款表单：币种选择 + 汇率显示 + 本位币金额
- 财务报表：按 `base_amount` 汇总（SUM 不再需要实时换算）
- 对账单：原币+本位币双列展示
- 汇率损益计算（收付时汇率与应收应付时汇率的差异）

**验证：** 跨币种收付款 → 报表正确汇总本位币 + 汇兑损益正确

## 9. 错误处理
- 汇率未配置时：`CurrencyApplicationService.getLatestRate` 抛出明确错误，前端 toast 提示"汇率未配置，请先在汇率管理中录入"
- Redis 缓存不可用时：降级为内存 Map 缓存，不影响业务
- 币种停用时：已存在的单据保留原币种，新建单据不能选择已停用币种

## 10. 测试策略
- 单元测试：`Money.convertTo` 各种币种组合（含 VND 0 位小数）、`formatMoney` 格式化
- 集成测试：`MysqlCurrencyRepository` CRUD、`CurrencyApplicationService` 缓存命中/失效
- E2E 测试：创建 USD 采购单 → 生成应付 → 付款 → 报表汇总本位币金额正确
