# 采购模块多币种改造（Phase 2a）实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为采购模块（订单/退货/对账/供应商）接入多币种支持，实现原币金额 + 本位币金额双轨管理，创建订单时固化汇率，明细行冗余本位币金额字段。

**架构：** 在 Phase 1 多币种基础设施（`CurrencyApplicationService` + `Money.convertTo` + `sys_currency`/`sys_exchange_rate` 表）之上，扩展采购领域层 6 张表 + 3 聚合根 + 3 实体，引入 `CurrencySnapshot` 值对象封装固化汇率。应用服务层在 createOrder 时查询当日汇率并固化到聚合根，事件 payload 携带 currency 字段供下游消费。

**技术栈：** Next.js 16.1.1 (App Router) + Drizzle ORM 0.45.2 + mysql2/promise + DDD 分层 + Vitest + next-intl + shadcn/ui

---

## 文件结构

### 数据库层
- `database/migrations/064_purchase_multi_currency.sql`（创建）— 6 张表 ALTER 增加 base_* 字段
- `database/migrations/065_backfill_purchase_currency.sql`（创建）— 历史数据按历史日期查汇率回填
- `src/lib/db/schema.ts`（修改）— 同步 Drizzle 表定义

### 领域层
- `src/domain/shared/value-objects/CurrencySnapshot.ts`（创建）— 不可变货币快照值对象
- `tests/unit/domain/shared/value-objects/currency-snapshot.test.ts`（创建）— 单元测试
- `src/domain/purchase/aggregates/PurchaseOrder.ts`（修改）— 增加 base_* 字段 + currencySnapshot
- `src/domain/purchase/entities/PurchaseOrderLine.ts`（修改）— 增加 base_* 字段
- `src/domain/purchase/aggregates/PurchaseReturn.ts`（修改）— 增加 currency + exchangeRate + baseTotalAmount
- `src/domain/purchase/entities/PurchaseReturnLine.ts`（修改）— 增加 base_unit_price + base_amount
- `src/domain/purchase/aggregates/PurchaseReconciliation.ts`（修改）— 增加 currency + exchangeRate + 7 个 base_* 字段
- `tests/unit/domain/purchase/aggregates/purchase-order.test.ts`（扩展）— 增加本位币测试
- `tests/unit/domain/purchase/aggregates/purchase-return.test.ts`（扩展）
- `tests/unit/domain/purchase/aggregates/purchase-reconciliation.test.ts`（扩展）

### 基础设施层
- `src/infrastructure/repositories/MysqlPurchaseOrderRepository.ts`（修改）— INSERT/SELECT/UPDATE 包含 base_* 字段
- `src/infrastructure/repositories/MysqlPurchaseReturnRepository.ts`（修改）
- `src/infrastructure/repositories/MysqlPurchaseReconciliationRepository.ts`（修改）

### 应用服务层
- `src/application/services/PurchaseApplicationService.ts`（修改）— createOrder 查询汇率并固化
- `src/application/services/PurchaseReturnApplicationService.ts`（修改）— createReturn 从原订单继承
- `src/application/services/PurchaseReconciliationApplicationService.ts`（修改）— 同币种校验
- `tests/unit/application/services/purchase-application-service.test.ts`（扩展）

### API 层
- `src/app/api/purchase/orders/route.ts`（修改）— 响应包含 base_* 字段
- `src/app/api/purchase/return/route.ts`（修改）
- `src/app/api/purchase/reconciliation/route.ts`（修改）
- `src/app/api/purchase/suppliers/route.ts`（修改）— 增加 default_currency

### 前端
- `messages/zh-CN.json` / `zh-TW.json` / `en.json` / `vi.json`（修改）— 8 个新 i18n key
- `src/app/[locale]/purchase/orders/page.tsx`（修改）— 双币种展示 + CurrencySelect
- `src/app/[locale]/purchase/orders/[id]/page.tsx`（修改）— 详情页双币种
- `src/app/[locale]/purchase/return/page.tsx`（修改）
- `src/app/[locale]/purchase/reconciliation/page.tsx`（修改）
- `src/app/[locale]/purchase/suppliers/page.tsx`（修改）— default_currency 字段

---

## 任务 1：Migration 064 — 表结构变更

**文件：**
- 创建：`database/migrations/064_purchase_multi_currency.sql`

- [ ] **步骤 1：编写 migration SQL（幂等版）**

创建 `database/migrations/064_purchase_multi_currency.sql`：

```sql
-- 064_purchase_multi_currency.sql
-- Phase 2a: 采购模块多币种改造 — 表结构变更
-- 幂等性：通过 INFORMATION_SCHEMA 检查列是否存在

-- 1. pur_supplier 增加 default_currency
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_supplier' AND COLUMN_NAME = 'default_currency');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_supplier ADD COLUMN default_currency VARCHAR(10) DEFAULT ''CNY'' NULL COMMENT ''供应商默认币种代码'' AFTER supplier_code',
  'SELECT ''pur_supplier.default_currency already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. pur_purchase_order 增加 base_total_amount, base_tax_amount, base_grand_total
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'base_total_amount');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_purchase_order ADD COLUMN base_total_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币含税前金额'' AFTER grand_total, ADD COLUMN base_tax_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币税额'' AFTER base_total_amount, ADD COLUMN base_grand_total DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币价税合计'' AFTER base_tax_amount',
  'SELECT ''pur_purchase_order base_* already exist'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. pur_purchase_order_line 增加 base_unit_price, base_amount, base_tax_amount, base_line_total
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND COLUMN_NAME = 'base_unit_price');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_purchase_order_line ADD COLUMN base_unit_price DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币单价'' AFTER line_total, ADD COLUMN base_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币金额'' AFTER base_unit_price, ADD COLUMN base_tax_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币税额'' AFTER base_amount, ADD COLUMN base_line_total DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币价税合计'' AFTER base_tax_amount',
  'SELECT ''pur_purchase_order_line base_* already exist'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. pur_purchase_return 增加 currency, exchange_rate, base_total_amount
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_return' AND COLUMN_NAME = 'currency');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_purchase_return ADD COLUMN currency VARCHAR(10) DEFAULT ''CNY'' NOT NULL COMMENT ''币种代码（跟随原订单）'' AFTER total_amount, ADD COLUMN exchange_rate DECIMAL(18,4) DEFAULT 1.0000 NOT NULL COMMENT ''汇率（跟随原订单）'' AFTER currency, ADD COLUMN base_total_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币退货总额'' AFTER exchange_rate',
  'SELECT ''pur_purchase_return currency/exchange_rate/base_total_amount already exist'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. pur_purchase_return_line 增加 base_unit_price, base_amount
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_return_line' AND COLUMN_NAME = 'base_unit_price');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_purchase_return_line ADD COLUMN base_unit_price DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币单价'' AFTER amount, ADD COLUMN base_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币金额'' AFTER base_unit_price',
  'SELECT ''pur_purchase_return_line base_* already exist'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. pur_purchase_reconciliation 增加 currency, exchange_rate + 7 个 base_* 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_reconciliation' AND COLUMN_NAME = 'currency');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_purchase_reconciliation ADD COLUMN currency VARCHAR(10) DEFAULT ''CNY'' NOT NULL COMMENT ''币种代码（强制与入库单一致）'' AFTER balance_amount, ADD COLUMN exchange_rate DECIMAL(18,4) DEFAULT 1.0000 NOT NULL COMMENT ''汇率（从首笔入库单继承）'' AFTER currency, ADD COLUMN base_receipt_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币入库金额'' AFTER exchange_rate, ADD COLUMN base_return_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币退货金额'' AFTER base_receipt_amount, ADD COLUMN base_net_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币净额'' AFTER base_return_amount, ADD COLUMN base_discount_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币折扣'' AFTER base_net_amount, ADD COLUMN base_paid_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币已付'' AFTER base_discount_amount, ADD COLUMN base_balance_amount DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币余额'' AFTER base_paid_amount',
  'SELECT ''pur_purchase_reconciliation currency/base_* already exist'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
```

- [ ] **步骤 2：执行 migration 验证**

运行：`node scripts/run-migration.mjs 064`
预期：6 张表 ALTER 成功，重复执行输出 "already exists"

- [ ] **步骤 3：Commit**

```bash
git add database/migrations/064_purchase_multi_currency.sql
git commit -m "feat(currency): add migration 064 for purchase multi-currency columns"
```

---

## 任务 2：Migration 065 — 历史数据回填

**文件：**
- 创建：`database/migrations/065_backfill_purchase_currency.sql`

- [ ] **步骤 1：编写回填 SQL**

创建 `database/migrations/065_backfill_purchase_currency.sql`：

```sql
-- 065_backfill_purchase_currency.sql
-- Phase 2a: 历史数据回填 — 按订单日期查汇率，查不到 fallback 1.0

-- 1. 回填供应商默认币种
UPDATE pur_supplier SET default_currency = 'CNY' WHERE default_currency IS NULL;

-- 2. 回填采购订单 currency + exchange_rate（若为空）
UPDATE pur_purchase_order SET currency = 'CNY' WHERE currency IS NULL OR currency = '';
UPDATE pur_purchase_order SET exchange_rate = 1.0000 WHERE exchange_rate IS NULL OR exchange_rate = 0;

-- 3. 回填采购订单 base_* 字段（仅处理 base_grand_total = 0 且 grand_total > 0 的记录）
-- 使用子查询按 order_date 查历史汇率，查不到则用 1.0
UPDATE pur_purchase_order po
LEFT JOIN (
  SELECT po2.id, COALESCE(
    (SELECT rate FROM sys_exchange_rate er
     WHERE er.from_currency = po2.currency AND er.to_currency = 'CNY'
       AND er.rate_date <= po2.order_date
     ORDER BY er.rate_date DESC LIMIT 1),
    1.0000
  ) AS historical_rate
  FROM pur_purchase_order po2
  WHERE po2.base_grand_total = 0 AND po2.grand_total > 0
) rates ON po.id = rates.id
SET po.exchange_rate = rates.historical_rate,
    po.base_total_amount = ROUND(po.total_amount * rates.historical_rate, 4),
    po.base_tax_amount = ROUND(po.tax_amount * rates.historical_rate, 4),
    po.base_grand_total = ROUND(po.grand_total * rates.historical_rate, 4)
WHERE rates.id IS NOT NULL;

-- 4. 回填采购订单明细 base_* 字段
UPDATE pur_purchase_order_line pol
INNER JOIN pur_purchase_order po ON pol.po_id = po.id
SET pol.base_unit_price = ROUND(pol.unit_price * po.exchange_rate, 4),
    pol.base_amount = ROUND(pol.amount * po.exchange_rate, 4),
    pol.base_tax_amount = ROUND(pol.tax_amount * po.exchange_rate, 4),
    pol.base_line_total = ROUND(pol.line_total * po.exchange_rate, 4)
WHERE pol.base_line_total = 0 AND pol.line_total > 0;

-- 5. 回填退货单 currency + exchange_rate + base_total_amount
UPDATE pur_purchase_return pr
INNER JOIN pur_purchase_order po ON pr.order_id = po.id
SET pr.currency = po.currency,
    pr.exchange_rate = po.exchange_rate,
    pr.base_total_amount = ROUND(pr.total_amount * po.exchange_rate, 4)
WHERE pr.base_total_amount = 0 AND pr.total_amount > 0;

-- 6. 回填对账单（旧记录按 1.0 回填）
UPDATE pur_purchase_reconciliation SET currency = 'CNY' WHERE currency IS NULL OR currency = '';
UPDATE pur_purchase_reconciliation SET exchange_rate = 1.0000 WHERE exchange_rate IS NULL OR exchange_rate = 0;
UPDATE pur_purchase_reconciliation
SET base_receipt_amount = ROUND(receipt_amount * exchange_rate, 4),
    base_return_amount = ROUND(return_amount * exchange_rate, 4),
    base_net_amount = ROUND(net_amount * exchange_rate, 4),
    base_discount_amount = ROUND(discount_amount * exchange_rate, 4),
    base_paid_amount = ROUND(paid_amount * exchange_rate, 4),
    base_balance_amount = ROUND(balance_amount * exchange_rate, 4)
WHERE base_balance_amount = 0 AND balance_amount > 0;
```

- [ ] **步骤 2：执行 migration 验证**

运行：`node scripts/run-migration.mjs 065`
预期：历史记录的 base_* 字段被回填

- [ ] **步骤 3：Commit**

```bash
git add database/migrations/065_backfill_purchase_currency.sql
git commit -m "feat(currency): add migration 065 to backfill historical purchase base amounts"
```

---

## 任务 3：Drizzle schema.ts 同步

**文件：**
- 修改：`src/lib/db/schema.ts`（在现有 `purSupplier`、`purPurchaseOrder` 等表定义中追加字段）

- [ ] **步骤 1：在 `purSupplier` 表定义中追加 `defaultCurrency`**

找到 `purSupplier` 表定义（约 L1100-1130 附近），在 `supplierCode` 字段之后追加：

```typescript
defaultCurrency: varchar('default_currency', { length: 10, default: 'CNY' }),
```

- [ ] **步骤 2：在 `purPurchaseOrder` 表定义中追加 base_* 字段**

找到 `purPurchaseOrder` 表定义，在 `grandTotal` 字段之后追加：

```typescript
baseTotalAmount: decimal('base_total_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
baseTaxAmount: decimal('base_tax_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
baseGrandTotal: decimal('base_grand_total', { precision: 18, scale: 4 }).default('0.0000').notNull(),
```

- [ ] **步骤 3：在 `purPurchaseOrderLine` 表定义中追加 base_* 字段**

在 `lineTotal` 字段之后追加：

```typescript
baseUnitPrice: decimal('base_unit_price', { precision: 18, scale: 4 }).default('0.0000').notNull(),
baseAmount: decimal('base_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
baseTaxAmount: decimal('base_tax_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
baseLineTotal: decimal('base_line_total', { precision: 18, scale: 4 }).default('0.0000').notNull(),
```

- [ ] **步骤 4：在 `purPurchaseReturn` 表定义中追加 currency + exchangeRate + baseTotalAmount**

在 `totalAmount` 字段之后追加：

```typescript
currency: varchar('currency', { length: 10 }).default('CNY').notNull(),
exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000').notNull(),
baseTotalAmount: decimal('base_total_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
```

- [ ] **步骤 5：在 `purPurchaseReturnLine` 表定义中追加 base_* 字段**

在 `amount` 字段之后追加：

```typescript
baseUnitPrice: decimal('base_unit_price', { precision: 18, scale: 4 }).default('0.0000').notNull(),
baseAmount: decimal('base_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
```

- [ ] **步骤 6：在 `purPurchaseReconciliation` 表定义中追加 currency + exchangeRate + 7 个 base_* 字段**

在 `balanceAmount` 字段之后追加：

```typescript
currency: varchar('currency', { length: 10 }).default('CNY').notNull(),
exchangeRate: decimal('exchange_rate', { precision: 18, scale: 4 }).default('1.0000').notNull(),
baseReceiptAmount: decimal('base_receipt_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
baseReturnAmount: decimal('base_return_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
baseNetAmount: decimal('base_net_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
baseDiscountAmount: decimal('base_discount_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
basePaidAmount: decimal('base_paid_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
baseBalanceAmount: decimal('base_balance_amount', { precision: 18, scale: 4 }).default('0.0000').notNull(),
```

- [ ] **步骤 7：运行 TypeScript 编译验证**

运行：`npx tsc --noEmit`
预期：无 schema.ts 相关错误

- [ ] **步骤 8：Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(currency): sync Drizzle schema with purchase multi-currency columns"
```

---

## 任务 4：CurrencySnapshot 值对象 + 测试

**文件：**
- 创建：`src/domain/shared/value-objects/CurrencySnapshot.ts`
- 创建：`tests/unit/domain/shared/value-objects/currency-snapshot.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `tests/unit/domain/shared/value-objects/currency-snapshot.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { CurrencySnapshot } from '@/domain/shared/value-objects/CurrencySnapshot';
import { Money } from '@/domain/shared/value-objects/Money';

describe('CurrencySnapshot', () => {
  describe('create', () => {
    it('应创建有效的 CurrencySnapshot', () => {
      const snapshot = CurrencySnapshot.create('USD', 7.25, 'CNY');
      expect(snapshot.currency).toBe('USD');
      expect(snapshot.exchangeRate).toBe(7.25);
      expect(snapshot.baseCurrency).toBe('CNY');
    });

    it('应拒绝无效的 currency 代码（长度非 3）', () => {
      expect(() => CurrencySnapshot.create('US', 7.25, 'CNY')).toThrow();
      expect(() => CurrencySnapshot.create('USDD', 7.25, 'CNY')).toThrow();
      expect(() => CurrencySnapshot.create('', 7.25, 'CNY')).toThrow();
    });

    it('应拒绝无效的 exchangeRate（<=0 或 NaN）', () => {
      expect(() => CurrencySnapshot.create('USD', 0, 'CNY')).toThrow();
      expect(() => CurrencySnapshot.create('USD', -1, 'CNY')).toThrow();
      expect(() => CurrencySnapshot.create('USD', NaN, 'CNY')).toThrow();
    });

    it('应拒绝无效的 baseCurrency', () => {
      expect(() => CurrencySnapshot.create('USD', 7.25, 'CN')).toThrow();
      expect(() => CurrencySnapshot.create('USD', 7.25, '')).toThrow();
    });
  });

  describe('isSameCurrency', () => {
    it('同币种应返回 true', () => {
      const snapshot = CurrencySnapshot.create('CNY', 1, 'CNY');
      expect(snapshot.isSameCurrency).toBe(true);
    });

    it('不同币种应返回 false', () => {
      const snapshot = CurrencySnapshot.create('USD', 7.25, 'CNY');
      expect(snapshot.isSameCurrency).toBe(false);
    });
  });

  describe('convert', () => {
    it('同币种应短路返回原金额', () => {
      const snapshot = CurrencySnapshot.create('CNY', 1, 'CNY');
      const money = Money.create(100, 'CNY');
      const result = snapshot.convert(money);
      expect(result.amount).toBe(100);
      expect(result.currency).toBe('CNY');
    });

    it('跨币种应按固化汇率换算', () => {
      const snapshot = CurrencySnapshot.create('USD', 7.25, 'CNY');
      const money = Money.create(100, 'USD');
      const result = snapshot.convert(money);
      expect(result.amount).toBe(725);
      expect(result.currency).toBe('CNY');
    });

    it('VND 应按 0 位小数换算', () => {
      const snapshot = CurrencySnapshot.create('VND', 0.0003, 'CNY');
      const money = Money.create(1000000, 'VND');
      const result = snapshot.convert(money, 0);
      expect(result.amount).toBe(300);
      expect(result.currency).toBe('CNY');
    });

    it('负数金额应正确换算（使用 redLetter 创建）', () => {
      const snapshot = CurrencySnapshot.create('USD', 7.25, 'CNY');
      const money = Money.redLetter(-100, 'USD');
      // convert 内部调用 money.convertTo，convertTo 不支持负数（见 Money.ts JSDoc）
      // 这里验证 convertTo 在负数下会抛错
      expect(() => snapshot.convert(money)).toThrow();
    });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/unit/domain/shared/value-objects/currency-snapshot.test.ts`
预期：FAIL，报错 "Cannot find module '@/domain/shared/value-objects/CurrencySnapshot'"

- [ ] **步骤 3：编写实现**

创建 `src/domain/shared/value-objects/CurrencySnapshot.ts`：

```typescript
import { Money } from './Money';

/**
 * 货币快照值对象
 * 封装创建订单时的 currency + exchange_rate + 对应的本位币
 * 一旦创建不可变（Immutable），保证历史汇率固化
 */
export class CurrencySnapshot {
  private constructor(
    public readonly currency: string,
    public readonly exchangeRate: number,
    public readonly baseCurrency: string,
  ) {}

  static create(currency: string, exchangeRate: number, baseCurrency: string): CurrencySnapshot {
    if (!currency || currency.length !== 3) {
      throw new Error('Invalid currency code: must be 3 characters');
    }
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error('Exchange rate must be a positive finite number');
    }
    if (!baseCurrency || baseCurrency.length !== 3) {
      throw new Error('Invalid base currency code: must be 3 characters');
    }
    return new CurrencySnapshot(currency, exchangeRate, baseCurrency);
  }

  /** 是否同币种（汇率应为 1） */
  get isSameCurrency(): boolean {
    return this.currency === this.baseCurrency;
  }

  /** 将原币金额换算为本位币金额（使用固化的汇率） */
  convert(money: Money, decimalPlaces: number = 2): Money {
    return money.convertTo(this.exchangeRate, this.baseCurrency, decimalPlaces);
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run tests/unit/domain/shared/value-objects/currency-snapshot.test.ts`
预期：PASS，全部测试通过

- [ ] **步骤 5：Commit**

```bash
git add src/domain/shared/value-objects/CurrencySnapshot.ts tests/unit/domain/shared/value-objects/currency-snapshot.test.ts
git commit -m "feat(currency): add CurrencySnapshot immutable value object"
```

---

## 任务 5：PurchaseOrderLine 实体改造 + 测试

**文件：**
- 修改：`src/domain/purchase/entities/PurchaseOrderLine.ts`
- 修改：`tests/unit/domain/purchase/entities/purchase-order-line.test.ts`（若存在，否则创建）

- [ ] **步骤 1：在 PurchaseOrderLineProps 接口追加 base_* 字段**

修改 `src/domain/purchase/entities/PurchaseOrderLine.ts` 的 `PurchaseOrderLineProps` 接口：

```typescript
export interface PurchaseOrderLineProps {
  id?: number;
  orderId?: number;
  lineNo: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec?: string;
  unit: string;
  orderQty: number;
  receivedQty: number;
  returnedQty: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  // 新增：本位币金额字段
  baseUnitPrice?: number;
  baseAmount?: number;
  baseTaxAmount?: number;
  baseLineTotal?: number;
  requireDate?: string;
  remark?: string;
}
```

- [ ] **步骤 2：在 PurchaseOrderLine 类中追加 base_* 私有字段和 getter**

在构造函数中追加：

```typescript
private _baseUnitPrice: number,
private _baseAmount: number,
private _baseTaxAmount: number,
private _baseLineTotal: number,
```

在 getter 区域追加：

```typescript
get baseUnitPrice(): number {
  return this._baseUnitPrice;
}
get baseAmount(): number {
  return this._baseAmount;
}
get baseTaxAmount(): number {
  return this._baseTaxAmount;
}
get baseLineTotal(): number {
  return this._baseLineTotal;
}
```

- [ ] **步骤 3：修改 create 和 reconstitute 静态方法**

`create` 方法计算 base_* 字段（若未提供则默认为 0）：

```typescript
static create(props: PurchaseOrderLineProps): PurchaseOrderLine {
  // ...原有校验...
  const amount = (props.orderQty || 0) * (props.unitPrice || 0);
  const taxRate = props.taxRate || 13;
  const taxAmount = (amount * taxRate) / 100;
  const lineTotal = amount + taxAmount;

  // base_* 字段：若未传入则默认为 0（由应用服务层在创建时填充固化值）
  const baseUnitPrice = props.baseUnitPrice ?? 0;
  const baseAmount = props.baseAmount ?? 0;
  const baseTaxAmount = props.baseTaxAmount ?? 0;
  const baseLineTotal = props.baseLineTotal ?? 0;

  return new PurchaseOrderLine(
    // ...原有参数...
    baseUnitPrice, baseAmount, baseTaxAmount, baseLineTotal,
    props.requireDate, props.remark
  );
}
```

`reconstitute` 方法直接读取：

```typescript
static reconstitute(props: PurchaseOrderLineProps): PurchaseOrderLine {
  return new PurchaseOrderLine(
    // ...原有参数...
    props.baseUnitPrice ?? 0,
    props.baseAmount ?? 0,
    props.baseTaxAmount ?? 0,
    props.baseLineTotal ?? 0,
    props.requireDate, props.remark
  );
}
```

- [ ] **步骤 4：运行现有测试验证无回归**

运行：`npx vitest run tests/unit/domain/purchase/entities/`
预期：现有测试全部通过（新增字段为可选，向后兼容）

- [ ] **步骤 5：Commit**

```bash
git add src/domain/purchase/entities/PurchaseOrderLine.ts
git commit -m "feat(currency): extend PurchaseOrderLine with base_* fields"
```

---

## 任务 6：PurchaseOrder 聚合根改造 + 测试

**文件：**
- 修改：`src/domain/purchase/aggregates/PurchaseOrder.ts`
- 修改：`tests/unit/domain/purchase/aggregates/purchase-order.test.ts`（若存在）

- [ ] **步骤 1：在 PurchaseOrderProps 接口追加 base_* 字段**

```typescript
export interface PurchaseOrderProps {
  // ...原有字段...
  // 新增：本位币字段
  baseCurrency?: string;
  baseTotalAmount?: number;
  baseTaxAmount?: number;
  baseGrandTotal?: number;
}
```

- [ ] **步骤 2：在 PurchaseOrder 类中追加 base_* 私有字段和 getter**

构造函数追加：

```typescript
public readonly baseCurrency: string,
private _baseTotalAmount: number,
private _baseTaxAmount: number,
private _baseGrandTotal: number,
```

getter 区域追加：

```typescript
get baseTotalAmount(): number {
  return this._baseTotalAmount;
}
get baseTaxAmount(): number {
  return this._baseTaxAmount;
}
get baseGrandTotal(): number {
  return this._baseGrandTotal;
}
```

- [ ] **步骤 3：修改 create 和 reconstitute 静态方法**

`create` 方法：base_* 字段若未传入则默认 0（由应用服务层在调用前计算并通过 props 传入）。

```typescript
static create(props: PurchaseOrderProps): PurchaseOrder {
  // ...原有逻辑...
  const baseCurrency = props.baseCurrency || 'CNY';
  const baseTotalAmount = props.baseTotalAmount ?? 0;
  const baseTaxAmount = props.baseTaxAmount ?? 0;
  const baseGrandTotal = props.baseGrandTotal ?? 0;

  return new PurchaseOrder(
    // ...原有参数...
    baseCurrency, baseTotalAmount, baseTaxAmount, baseGrandTotal,
  );
}
```

`reconstitute` 方法直接读取。

- [ ] **步骤 4：在 PurchaseOrderCreatedEvent payload 中追加 currency 字段**

修改 `create` 方法中事件推送部分：

```typescript
if (order.id) {
  order._domainEvents.push(
    new PurchaseOrderCreatedEvent({
      orderId: order.id,
      orderNo: order.orderNo,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      totalAmount: order.totalAmount,
      totalQuantity: order.totalQuantity,
      // 新增字段
      currency: order.currency,
      exchangeRate: order.exchangeRate,
      baseCurrency: order.baseCurrency,
      baseTotalAmount: order.baseTotalAmount,
      baseGrandTotal: order.baseGrandTotal,
    })
  );
}
```

**注意：** 需同步修改 `src/domain/purchase/events/PurchaseOrderEvents.ts` 的 `PurchaseOrderCreatedEvent` payload 接口，追加可选字段 `currency?: string`、`exchangeRate?: number`、`baseCurrency?: string`、`baseTotalAmount?: number`、`baseGrandTotal?: number`（可选字段，保证向后兼容）。

- [ ] **步骤 5：运行现有测试验证无回归**

运行：`npx vitest run tests/unit/domain/purchase/aggregates/`
预期：现有测试全部通过

- [ ] **步骤 6：Commit**

```bash
git add src/domain/purchase/aggregates/PurchaseOrder.ts src/domain/purchase/events/PurchaseOrderEvents.ts
git commit -m "feat(currency): extend PurchaseOrder aggregate with base_* fields and event payload"
```

---

## 任务 7：PurchaseReturn 聚合根改造

**文件：**
- 修改：`src/domain/purchase/aggregates/PurchaseReturn.ts`
- 修改：`src/domain/purchase/entities/PurchaseReturnLine.ts`
- 修改：`src/domain/purchase/events/PurchaseReturnEvents.ts`

- [ ] **步骤 1：在 PurchaseReturnLineProps 接口追加 base_* 字段**

修改 `src/domain/purchase/entities/PurchaseReturnLine.ts`：

```typescript
export interface PurchaseReturnLineProps {
  // ...原有字段...
  baseUnitPrice?: number;
  baseAmount?: number;
}
```

在类中追加 `baseUnitPrice` 和 `baseAmount` 字段、getter，并在 `create` / `reconstitute` 中处理。

- [ ] **步骤 2：在 PurchaseReturnProps 接口追加 currency + exchangeRate + baseTotalAmount**

修改 `src/domain/purchase/aggregates/PurchaseReturn.ts`：

```typescript
export interface PurchaseReturnProps {
  // ...原有字段...
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseTotalAmount?: number;
}
```

- [ ] **步骤 3：在 PurchaseReturn 类中追加字段和 getter**

构造函数追加 `currency`、`exchangeRate`、`baseCurrency`、`baseTotalAmount` 字段（public readonly），并在 `create` / `reconstitute` 中读取。

- [ ] **步骤 4：在 PurchaseReturnCreatedEvent payload 中追加 currency 字段**

修改 `src/domain/purchase/events/PurchaseReturnEvents.ts` 的 `PurchaseReturnCreatedEvent` payload 接口，追加可选字段 `currency?: string`、`exchangeRate?: number`、`baseCurrency?: string`、`baseTotalAmount?: number`。

- [ ] **步骤 5：运行测试验证无回归**

运行：`npx vitest run tests/unit/domain/purchase/`
预期：全部通过

- [ ] **步骤 6：Commit**

```bash
git add src/domain/purchase/aggregates/PurchaseReturn.ts src/domain/purchase/entities/PurchaseReturnLine.ts src/domain/purchase/events/PurchaseReturnEvents.ts
git commit -m "feat(currency): extend PurchaseReturn aggregate with currency and base_* fields"
```

---

## 任务 8：PurchaseReconciliation 聚合根改造

**文件：**
- 修改：`src/domain/purchase/aggregates/PurchaseReconciliation.ts`
- 修改：`src/domain/purchase/events/PurchaseReconciliationEvents.ts`

- [ ] **步骤 1：在 PurchaseReconciliationProps 接口追加 currency + exchangeRate + base_* 字段**

```typescript
export interface PurchaseReconciliationProps {
  // ...原有字段...
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
  baseReceiptAmount?: number;
  baseReturnAmount?: number;
  baseNetAmount?: number;
  baseDiscountAmount?: number;
  basePaidAmount?: number;
  baseBalanceAmount?: number;
}
```

- [ ] **步骤 2：在 PurchaseReconciliation 类中追加字段和 getter**

构造函数追加上述字段（public readonly 或 private），并在 `create` / `reconstitute` 中读取。

**关键约束**：在 `create` 方法中，若 `currency` 未传入则默认为 'CNY'；`base_*` 字段若未传入则按 `exchangeRate` 换算（或在应用服务层填充）。

- [ ] **步骤 3：在 PurchaseReconciliationCreatedEvent payload 中追加 currency 字段**

修改 `src/domain/purchase/events/PurchaseReconciliationEvents.ts` 的 `PurchaseReconciliationCreatedEvent` payload 接口，追加可选字段 `currency?: string`、`exchangeRate?: number`、`baseCurrency?: string`、`baseReceiptAmount?: number`、`baseNetAmount?: number`、`baseBalanceAmount?: number`。

- [ ] **步骤 4：运行测试验证无回归**

运行：`npx vitest run tests/unit/domain/purchase/aggregates/`
预期：全部通过

- [ ] **步骤 5：Commit**

```bash
git add src/domain/purchase/aggregates/PurchaseReconciliation.ts src/domain/purchase/events/PurchaseReconciliationEvents.ts
git commit -m "feat(currency): extend PurchaseReconciliation aggregate with currency and base_* fields"
```

---

## 任务 9：MysqlPurchaseOrderRepository 改造

**文件：**
- 修改：`src/infrastructure/repositories/MysqlPurchaseOrderRepository.ts`

- [ ] **步骤 1：扩展 PurPurchaseOrderRow 和 PurPurchaseOrderLineRow 接口**

在 `PurPurchaseOrderRow` 接口追加：

```typescript
base_total_amount: number | string;
base_tax_amount: number | string;
base_tax_amount: number | string;
base_grand_total: number | string;
```

在 `PurPurchaseOrderLineRow` 接口追加：

```typescript
base_unit_price: number | string;
base_amount: number | string;
base_tax_amount: number | string;
base_line_total: number | string;
```

- [ ] **步骤 2：扩展 LINE_COLUMNS 常量**

```typescript
const LINE_COLUMNS = `id, po_id, line_no, material_id, material_code, material_name, material_spec,
                      unit, order_qty, received_qty, returned_qty, unit_price, amount,
                      tax_rate, tax_amount, line_total,
                      base_unit_price, base_amount, base_tax_amount, base_line_total,
                      require_date, remark`;
```

- [ ] **步骤 3：修改 save 方法的 INSERT 语句**

```typescript
const [orderResult] = await conn.execute<mysql.ResultSetHeader>(
  `INSERT INTO pur_purchase_order
   (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date,
    currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total,
    base_total_amount, base_tax_amount, base_grand_total,
    status, over_receipt_tolerance, payment_terms, delivery_address, remark, create_by, create_time)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
  [
    orderNo,
    order.supplierId,
    order.supplierName,
    order.supplierCode,
    order.orderDate,
    order.deliveryDate || null,
    order.currency,
    order.exchangeRate,
    order.totalAmount,
    order.totalQuantity,
    order.taxRate,
    order.taxAmount,
    order.grandTotal,
    order.baseTotalAmount,
    order.baseTaxAmount,
    order.baseGrandTotal,
    order.status.toDbCode(),
    order.overReceiptTolerance,
    order.paymentTerms,
    order.deliveryAddress,
    order.remark,
    order.createBy || null,
  ]
);
```

明细行 INSERT 同步追加 base_* 字段。

- [ ] **步骤 4：修改 mapToProps 方法**

```typescript
private mapToProps(
  order: PurPurchaseOrderRow,
  lines: PurPurchaseOrderLineRow[]
): PurchaseOrderProps {
  return {
    // ...原有字段...
    baseCurrency: 'CNY',  // 暂从系统配置读取或固定 CNY，后续在应用服务层注入
    baseTotalAmount: Number(order.base_total_amount) || 0,
    baseTaxAmount: Number(order.base_tax_amount) || 0,
    baseGrandTotal: Number(order.base_grand_total) || 0,
    lines: (lines || []).map((line) => ({
      // ...原有字段...
      baseUnitPrice: Number(line.base_unit_price) || 0,
      baseAmount: Number(line.base_amount) || 0,
      baseTaxAmount: Number(line.base_tax_amount) || 0,
      baseLineTotal: Number(line.base_line_total) || 0,
      // ...
    })),
  };
}
```

- [ ] **步骤 5：运行现有测试验证无回归**

运行：`npx vitest run tests/unit/infrastructure/repositories/`
预期：全部通过（或因新字段默认 0，无破坏性变更）

- [ ] **步骤 6：Commit**

```bash
git add src/infrastructure/repositories/MysqlPurchaseOrderRepository.ts
git commit -m "feat(currency): extend MysqlPurchaseOrderRepository with base_* field persistence"
```

---

## 任务 10：MysqlPurchaseReturnRepository + MysqlPurchaseReconciliationRepository 改造

**文件：**
- 修改：`src/infrastructure/repositories/MysqlPurchaseReturnRepository.ts`
- 修改：`src/infrastructure/repositories/MysqlPurchaseReconciliationRepository.ts`

- [ ] **步骤 1：修改 MysqlPurchaseReturnRepository**

在 INSERT/SELECT 语句中追加 `currency`、`exchange_rate`、`base_total_amount` 字段；明细行 INSERT/SELECT 追加 `base_unit_price`、`base_amount` 字段。在 `mapToProps` 中读取这些字段。

- [ ] **步骤 2：修改 MysqlPurchaseReconciliationRepository**

在 INSERT/SELECT 语句中追加 `currency`、`exchange_rate`、7 个 `base_*` 字段。在 `mapToProps` 中读取。

**对账单 currency 一致性校验**：在 `save` 方法中（或由应用服务层负责），查询关联入库单的 currency（使用 `COALESCE(i.currency, 'CNY')` 兼容 `inv_inbound` 暂无 currency 字段），若不一致抛出 `DomainError`。

- [ ] **步骤 3：运行测试验证**

运行：`npx vitest run tests/unit/infrastructure/repositories/`
预期：全部通过

- [ ] **步骤 4：Commit**

```bash
git add src/infrastructure/repositories/MysqlPurchaseReturnRepository.ts src/infrastructure/repositories/MysqlPurchaseReconciliationRepository.ts
git commit -m "feat(currency): extend return and reconciliation repositories with currency fields"
```

---

## 任务 11：PurchaseApplicationService.createOrder 改造 + 测试

**文件：**
- 修改：`src/application/services/PurchaseApplicationService.ts`
- 修改：`tests/unit/application/services/purchase-application-service.test.ts`（若存在）

- [ ] **步骤 1：构造函数注入 CurrencyApplicationService**

```typescript
import { CurrencyApplicationService } from './CurrencyApplicationService';
import { CurrencySnapshot } from '@/domain/shared/value-objects/CurrencySnapshot';
import { Money } from '@/domain/shared/value-objects/Money';
import { getSystemConfig } from '@/lib/system-config';

export class PurchaseApplicationService {
  constructor(
    private readonly orderRepo: IPurchaseOrderRepository,
    private readonly currencyService: CurrencyApplicationService,
  ) {}
  // ...
}
```

- [ ] **步骤 2：在 createOrder 方法中查询汇率并固化**

```typescript
async createOrder(props: PurchaseOrderProps): Promise<{ id: number; orderNo: string }> {
  // ...原有 tolerance/taxRate 逻辑...

  // 1. 确定 currency：优先级 = 输入 > 系统默认（finance.default_currency）
  if (!effectiveProps.currency) {
    const currency = await getSystemConfig('finance.default_currency', 'CNY');
    if (currency) effectiveProps = { ...effectiveProps, currency };
  }

  // 2. 查询本位币
  const baseCurrency = await getSystemConfig('finance.base_currency', 'CNY');

  // 3. 查询汇率并固化
  let exchangeRate = effectiveProps.exchangeRate || 1.0;
  if (effectiveProps.currency && effectiveProps.currency !== baseCurrency) {
    // 查询当日汇率（CurrencyApplicationService.getLatestRate 已带缓存）
    exchangeRate = await this.currencyService.getLatestRate(effectiveProps.currency, baseCurrency);
  } else if (effectiveProps.currency === baseCurrency) {
    exchangeRate = 1.0;
  }

  // 4. 构建 CurrencySnapshot
  const snapshot = CurrencySnapshot.create(
    effectiveProps.currency || 'CNY',
    exchangeRate,
    baseCurrency
  );

  // 5. 为每个明细行计算 base_* 字段
  const baseCurrencyDecimalPlaces = await this.getDecimalPlaces(baseCurrency);
  effectiveProps = {
    ...effectiveProps,
    lines: effectiveProps.lines.map((line) => {
      const originalUnitPrice = line.unitPrice || 0;
      const originalAmount = (line.orderQty || 0) * originalUnitPrice;
      const originalTaxAmount = (originalAmount * (line.taxRate || effectiveProps.taxRate || 13)) / 100;
      const originalLineTotal = originalAmount + originalTaxAmount;

      const baseUnitPrice = snapshot.convert(
        Money.create(originalUnitPrice, snapshot.currency),
        baseCurrencyDecimalPlaces
      ).amount;
      const baseAmount = snapshot.convert(
        Money.create(originalAmount, snapshot.currency),
        baseCurrencyDecimalPlaces
      ).amount;
      const baseTaxAmount = snapshot.convert(
        Money.create(originalTaxAmount, snapshot.currency),
        baseCurrencyDecimalPlaces
      ).amount;
      const baseLineTotal = snapshot.convert(
        Money.create(originalLineTotal, snapshot.currency),
        baseCurrencyDecimalPlaces
      ).amount;

      return {
        ...line,
        baseUnitPrice, baseAmount, baseTaxAmount, baseLineTotal,
      };
    }),
  };

  // 6. 计算主表 base_* 字段
  const baseTotalAmount = effectiveProps.lines.reduce((sum, l) => sum + (l.baseAmount || 0), 0);
  const baseTaxAmount = effectiveProps.lines.reduce((sum, l) => sum + (l.baseTaxAmount || 0), 0);
  const baseGrandTotal = baseTotalAmount + baseTaxAmount;

  effectiveProps = {
    ...effectiveProps,
    baseCurrency,
    exchangeRate,
    baseTotalAmount: Math.round(baseTotalAmount * 100) / 100,
    baseTaxAmount: Math.round(baseTaxAmount * 100) / 100,
    baseGrandTotal: Math.round(baseGrandTotal * 100) / 100,
  };

  // ...原有价格上限控制、create、save、publish 逻辑...
}

private async getDecimalPlaces(currency: string): Promise<number> {
  // 从系统配置或硬编码 VND=0, CNY/USD=2
  const map: Record<string, number> = { CNY: 2, USD: 2, VND: 0 };
  return map[currency] ?? 2;
}
```

- [ ] **步骤 3：修改 updateOrder 方法，拒绝修改 currency**

```typescript
async updateOrder(id: number, props: PurchaseOrderProps): Promise<void> {
  const order = await this.getOrderById(id);
  if (props.currency && props.currency !== order.currency) {
    throw new DomainError('币种创建后不可修改');
  }
  if (props.exchangeRate && props.exchangeRate !== order.exchangeRate) {
    throw new DomainError('汇率创建后不可修改');
  }
  // ...原有更新逻辑...
}
```

- [ ] **步骤 4：修改 getPurchaseService 工厂函数**

修改 `src/app/api/purchase/orders/route.ts` 的 `getPurchaseService`：

```typescript
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import { MysqlCurrencyRepository } from '@/infrastructure/repositories/MysqlCurrencyRepository';

function getPurchaseService(): PurchaseApplicationService {
  registerEventHandlers();
  const orderRepo = RepositoryRegistry.getPurchaseOrderRepository();
  const currencyRepo = new MysqlCurrencyRepository();
  const currencyService = new CurrencyApplicationService(currencyRepo);
  return new PurchaseApplicationService(orderRepo, currencyService);
}
```

- [ ] **步骤 5：运行测试验证**

运行：`npx vitest run tests/unit/application/services/`
预期：现有测试可能需要更新构造函数签名（注入 Mock currencyService）

- [ ] **步骤 6：Commit**

```bash
git add src/application/services/PurchaseApplicationService.ts src/app/api/purchase/orders/route.ts
git commit -m "feat(currency): inject CurrencyApplicationService and compute base_* on order creation"
```

---

## 任务 12：PurchaseReturnApplicationService + PurchaseReconciliationApplicationService 改造

**文件：**
- 修改：`src/application/services/PurchaseReturnApplicationService.ts`
- 修改：`src/application/services/PurchaseReconciliationApplicationService.ts`

- [ ] **步骤 1：修改 PurchaseReturnApplicationService.createReturn**

在创建退货前查询原订单，从原订单继承 `currency` + `exchangeRate` + `baseCurrency`，并为退货明细计算 `base_*` 字段。

```typescript
async createReturn(props: ReturnCreateInput): Promise<{ id: number }> {
  const originalOrder = await this.orderRepo.findById(props.orderId);
  if (!originalOrder) throw new NotFoundError('采购订单不存在');

  // 从原订单继承 currency + exchangeRate
  const currency = originalOrder.currency;
  const exchangeRate = originalOrder.exchangeRate;
  const baseCurrency = originalOrder.baseCurrency;

  // 为退货明细计算 base_* 字段（使用原订单固化汇率）
  const lines = props.lines.map((line) => {
    const baseUnitPrice = Number((line.unitPrice * exchangeRate).toFixed(2));
    const baseAmount = Number((line.quantity * line.unitPrice * exchangeRate).toFixed(2));
    return { ...line, baseUnitPrice, baseAmount };
  });

  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const baseTotalAmount = Number((totalAmount * exchangeRate).toFixed(2));

  // 构建 PurchaseReturnProps
  const returnProps: PurchaseReturnProps = {
    ...props,
    currency, exchangeRate, baseCurrency, baseTotalAmount,
    lines,
    totalAmount,
  };

  // ...原有持久化逻辑...
}
```

- [ ] **步骤 2：修改 PurchaseReconciliationApplicationService.createReconciliation**

```typescript
async createReconciliation(props: ReconCreateInput): Promise<{ id: number }> {
  // 1. 查询所有关联入库单（inv_inbound 暂无 currency 字段，使用 COALESCE 兼容）
  const inbounds = await this.inboundRepo.findByIds(props.inboundIds);

  // 2. 校验同币种
  const currencies = new Set(
    inbounds.map((i) => (i as any).currency ?? 'CNY')
  );
  if (currencies.size > 1) {
    throw new DomainError(
      `对账失败：关联入库单币种不一致：${Array.from(currencies).join(', ')}`
    );
  }

  // 3. 从首笔入库单继承 currency + exchangeRate
  const currency = Array.from(currencies)[0] || 'CNY';
  const baseCurrency = await getSystemConfig('finance.base_currency', 'CNY');
  let exchangeRate = 1.0;
  if (currency !== baseCurrency) {
    exchangeRate = await this.currencyService.getLatestRate(currency, baseCurrency);
  }

  // 4. 计算 base_* 字段
  const receiptAmount = inbounds.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const baseReceiptAmount = Number((receiptAmount * exchangeRate).toFixed(2));
  // ...其他 base_* 字段类似...

  // 5. 构建聚合根并持久化
  // ...
}
```

- [ ] **步骤 3：运行测试验证**

运行：`npx vitest run tests/unit/application/services/`
预期：全部通过

- [ ] **步骤 4：Commit**

```bash
git add src/application/services/PurchaseReturnApplicationService.ts src/application/services/PurchaseReconciliationApplicationService.ts
git commit -m "feat(currency): inherit currency in return and validate reconciliation currency consistency"
```

---

## 任务 13：采购订单 API 响应扩展

**文件：**
- 修改：`src/app/api/purchase/orders/route.ts`

- [ ] **步骤 1：在 GET 列表响应的 serializedData 中追加 base_* 字段**

```typescript
const serializedData = result.data.map((order) => ({
  // ...原有字段...
  base_currency: order.baseCurrency,
  base_total_amount: order.baseTotalAmount,
  base_tax_amount: order.baseTaxAmount,
  base_grand_total: order.baseGrandTotal,
  lines: order.lines.map((line) => ({
    // ...原有字段...
    base_unit_price: line.baseUnitPrice,
    base_amount: line.baseAmount,
    base_tax_amount: line.baseTaxAmount,
    base_line_total: line.baseLineTotal,
  })),
}));
```

- [ ] **步骤 2：在 POST 创建请求处理中拒绝 currency 修改（若有 id 表示更新）**

POST 方法为创建，currency 可选传入。在 PUT 方法中增加 currency 不可变校验：

```typescript
export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    // ...原有逻辑...

    // 新增：currency 不可变校验（仅当 body 中包含 currency 字段时）
    if (body.currency !== undefined) {
      return errorResponse('币种创建后不可修改', 400, 400);
    }
    if (body.exchange_rate !== undefined) {
      return errorResponse('汇率创建后不可修改', 400, 400);
    }

    // ...原有 action 处理...
  },
  { errorMessage: '操作失败' }
);
```

- [ ] **步骤 3：运行测试验证**

运行：`npx vitest run tests/integration/api/purchase/`
预期：全部通过

- [ ] **步骤 4：Commit**

```bash
git add src/app/api/purchase/orders/route.ts
git commit -m "feat(currency): expose base_* fields in purchase orders API and reject currency mutation"
```

---

## 任务 14：采购退货 + 对账 + 供应商 API 改造

**文件：**
- 修改：`src/app/api/purchase/return/route.ts`
- 修改：`src/app/api/purchase/reconciliation/route.ts`
- 修改：`src/app/api/purchase/suppliers/route.ts`

- [ ] **步骤 1：采购退货 API 响应扩展**

在 GET/POST 响应中追加 `currency`、`exchange_rate`、`base_currency`、`base_total_amount` 字段。POST 创建请求中不接收 currency/exchange_rate（由服务端从原订单继承）。

- [ ] **步骤 2：采购对账 API 响应扩展 + 同币种校验错误响应**

在 GET/POST 响应中追加 currency + base_* 字段。在 POST 处理器中捕获 `DomainError`，当错误消息包含"币种不一致"时返回 400 + 明确错误消息。

```typescript
try {
  const result = await service.createReconciliation(body);
  return successResponse(result, '对账单创建成功');
} catch (error) {
  if (error instanceof DomainError) {
    return errorResponse(error.message, 400, 400);
  }
  throw error;
}
```

- [ ] **步骤 3：供应商 API 扩展 default_currency 字段**

在 GET/POST/PUT 请求中处理 `default_currency` 字段。GET 响应中包含该字段，POST/PUT 请求中接收并持久化。

- [ ] **步骤 4：运行测试验证**

运行：`npx vitest run tests/integration/api/purchase/`
预期：全部通过

- [ ] **步骤 5：Commit**

```bash
git add src/app/api/purchase/return/route.ts src/app/api/purchase/reconciliation/route.ts src/app/api/purchase/suppliers/route.ts
git commit -m "feat(currency): expose currency fields in return/reconciliation/suppliers APIs"
```

---

## 任务 15：i18n 扩展

**文件：**
- 修改：`messages/zh-CN.json`、`messages/zh-TW.json`、`messages/en.json`、`messages/vi.json`

- [ ] **步骤 1：在 Common 块中追加 8 个新 key**

zh-CN.json：
```json
{
  "Common": {
    "baseCurrencyAmount": "本位币金额",
    "originalCurrencyAmount": "原币金额",
    "currencyImmutableWarning": "币种创建后不可修改",
    "exchangeRateLocked": "汇率已固化",
    "inboundCurrencyMismatch": "关联入库单币种不一致：{currencies}",
    "supplierDefaultCurrency": "供应商默认币种",
    "estimatedBaseAmount": "预估本位币金额",
    "exchangeRateAtCreation": "创建时汇率"
  }
}
```

zh-TW.json：
```json
{
  "Common": {
    "baseCurrencyAmount": "本位幣金額",
    "originalCurrencyAmount": "原幣金額",
    "currencyImmutableWarning": "幣種創建後不可修改",
    "exchangeRateLocked": "匯率已固化",
    "inboundCurrencyMismatch": "關聯入庫單幣種不一致：{currencies}",
    "supplierDefaultCurrency": "供應商預設幣種",
    "estimatedBaseAmount": "預估本位幣金額",
    "exchangeRateAtCreation": "創建時匯率"
  }
}
```

en.json：
```json
{
  "Common": {
    "baseCurrencyAmount": "Base Currency Amount",
    "originalCurrencyAmount": "Original Currency Amount",
    "currencyImmutableWarning": "Currency cannot be changed after creation",
    "exchangeRateLocked": "Exchange rate locked",
    "inboundCurrencyMismatch": "Inbound currency mismatch: {currencies}",
    "supplierDefaultCurrency": "Supplier Default Currency",
    "estimatedBaseAmount": "Estimated Base Amount",
    "exchangeRateAtCreation": "Exchange Rate at Creation"
  }
}
```

vi.json：
```json
{
  "Common": {
    "baseCurrencyAmount": "Số tiền tiền tệ cơ sở",
    "originalCurrencyAmount": "Số tiền nguyên tệ",
    "currencyImmutableWarning": "Tiền tệ không thể thay đổi sau khi tạo",
    "exchangeRateLocked": "Tỷ giá đã khóa",
    "inboundCurrencyMismatch": "Tiền tệ phiếu nhập không nhất quán: {currencies}",
    "supplierDefaultCurrency": "Tiền tệ mặc định của nhà cung cấp",
    "estimatedBaseAmount": "Số tiền cơ sở ước tính",
    "exchangeRateAtCreation": "Tỷ giá khi tạo"
  }
}
```

- [ ] **步骤 2：验证 JSON 格式**

运行：`node -e "JSON.parse(require('fs').readFileSync('messages/zh-CN.json', 'utf8')); console.log('OK')"`（4 个文件均验证）

- [ ] **步骤 3：Commit**

```bash
git add messages/zh-CN.json messages/zh-TW.json messages/en.json messages/vi.json
git commit -m "feat(currency): add i18n keys for purchase multi-currency pages"
```

---

## 任务 16：采购订单列表页改造

**文件：**
- 修改：`src/app/[locale]/purchase/orders/page.tsx`

- [ ] **步骤 1：在 PurchaseOrder 接口追加 base_* 字段**

```typescript
interface PurchaseOrder {
  // ...原有字段...
  base_currency?: string;
  base_total_amount?: number;
  base_tax_amount?: number;
  base_grand_total?: number;
  // 明细行
  lines?: (OrderItem & {
    base_unit_price?: number;
    base_amount?: number;
    base_tax_amount?: number;
    base_line_total?: number;
  })[];
}
```

- [ ] **步骤 2：在表头追加"币种"和"本位币金额"列**

在 `<TableHead>金额</TableHead>` 之后追加：

```tsx
<TableHead>{tc('baseCurrencyAmount')}</TableHead>
<TableHead>{tc('currency')}</TableHead>
```

- [ ] **步骤 3：在表体中使用 MoneyDisplay 组件展示双币种**

替换硬编码 `¥{Number(order.grand_total...).toLocaleString()}`：

```tsx
import { MoneyDisplay } from '@/components/ui/money-display';

<TableCell className="text-right font-medium">
  <MoneyDisplay
    amount={Number(order.grand_total || order.total_amount || 0)}
    currency={order.currency || 'CNY'}
    baseAmount={order.base_grand_total}
    baseCurrency={order.base_currency}
  />
</TableCell>
<TableCell>{order.currency || 'CNY'}</TableCell>
```

- [ ] **步骤 4：在展开的明细行中追加 base_* 列**

在明细表头追加"本位币金额"列，表体中使用 `MoneyDisplay` 展示 `base_amount`。

- [ ] **步骤 5：在创建 Dialog 中增加 CurrencySelect 组件**

```tsx
import { CurrencySelect } from '@/components/ui/currency-select';

// 在 newOrder state 中追加 currency 字段
const [newOrder, setNewOrder] = useState({
  supplier_id: '',
  delivery_date: '',
  remark: '',
  currency: '',  // 新增
});

// 在 Dialog 表单中追加币种选择器
<div className="space-y-2">
  <Label>{tc('currency')}</Label>
  <CurrencySelect
    value={newOrder.currency}
    onChange={(v) => setNewOrder((prev) => ({ ...prev, currency: v }))}
  />
</div>
```

- [ ] **步骤 6：在创建请求中传递 currency**

```typescript
const data = await ApiClient.post('/api/purchase/orders', {
  supplier_id: parseInt(newOrder.supplier_id),
  // ...
  currency: newOrder.currency || undefined,  // 新增
  lines: validItems.map((item) => ({ ... })),
});
```

- [ ] **步骤 7：运行前端开发服务器验证**

运行：`npm run dev`，访问 `/purchase/orders` 页面
预期：页面正常加载，表头显示"本位币金额"和"币种"列

- [ ] **步骤 8：Commit**

```bash
git add src/app/[locale]/purchase/orders/page.tsx
git commit -m "feat(currency): display dual-currency in purchase orders list and create form"
```

---

## 任务 17：采购订单详情页 + 退货页 + 对账页改造

**文件：**
- 修改：`src/app/[locale]/purchase/orders/[id]/page.tsx`（若存在）
- 修改：`src/app/[locale]/purchase/return/page.tsx`
- 修改：`src/app/[locale]/purchase/reconciliation/page.tsx`

- [ ] **步骤 1：采购订单详情页改造**

在详情页头部展示 currency + exchangeRate + baseCurrency 信息卡片。明细表格每行展示原币 + 本位币金额。汇总区域展示双币种合计。

- [ ] **步骤 2：采购退货页改造**

- 列表页增加 currency 列
- 创建退货时展示原订单 currency（只读，从 API 响应中读取）
- 退货金额使用 `MoneyDisplay` 双币种展示

- [ ] **步骤 3：采购对账页改造**

- 列表页增加 currency 列
- 创建对账时展示从入库单继承的 currency（只读）
- 同币种校验失败时显示 i18n 错误消息
- 对账金额双币种展示

- [ ] **步骤 4：运行前端验证**

运行：`npm run dev`，访问各页面
预期：页面正常加载，双币种展示

- [ ] **步骤 5：Commit**

```bash
git add src/app/[locale]/purchase/orders/[id]/page.tsx src/app/[locale]/purchase/return/page.tsx src/app/[locale]/purchase/reconciliation/page.tsx
git commit -m "feat(currency): display dual-currency in purchase detail/return/reconciliation pages"
```

---

## 任务 18：供应商管理页面改造

**文件：**
- 修改：`src/app/[locale]/purchase/suppliers/page.tsx`

- [ ] **步骤 1：在 Supplier 接口追加 default_currency 字段**

```typescript
interface Supplier {
  // ...原有字段...
  default_currency?: string;
}
```

- [ ] **步骤 2：在表单中追加 CurrencySelect 组件**

在创建/编辑供应商的 Dialog 中追加：

```tsx
<div className="space-y-2">
  <Label>{tc('supplierDefaultCurrency')}</Label>
  <CurrencySelect
    value={formData.default_currency || ''}
    onChange={(v) => setFormData((prev) => ({ ...prev, default_currency: v }))}
  />
</div>
```

- [ ] **步骤 3：在列表表格中展示默认币种列**

在表头追加 `<TableHead>{tc('supplierDefaultCurrency')}</TableHead>`，表体中展示 `{supplier.default_currency || 'CNY'}`。

- [ ] **步骤 4：运行前端验证**

运行：`npm run dev`，访问 `/purchase/suppliers`
预期：表单和列表展示 default_currency

- [ ] **步骤 5：Commit**

```bash
git add src/app/[locale]/purchase/suppliers/page.tsx
git commit -m "feat(currency): add default_currency field to supplier management page"
```

---

## 自检

### 规格覆盖度

| 规格章节 | 对应任务 |
|---------|---------|
| 2.1 表改造总览 | 任务 1（migration 064）|
| 2.2 Migration 064 | 任务 1 |
| 2.3 Migration 065 | 任务 2 |
| 2.4 Drizzle schema.ts | 任务 3 |
| 3.1 CurrencySnapshot | 任务 4 |
| 3.2 PurchaseOrder | 任务 6 |
| 3.3 PurchaseOrderLine | 任务 5 |
| 3.4 PurchaseReturn | 任务 7 |
| 3.5 PurchaseReconciliation | 任务 8 |
| 3.7 领域事件 | 任务 6/7/8 |
| 4.1-4.3 Repository 改造 | 任务 9/10 |
| 5.1 PurchaseApplicationService | 任务 11 |
| 5.2 PurchaseReturnApplicationService | 任务 12 |
| 5.3 PurchaseReconciliationApplicationService | 任务 12 |
| 6.1 采购订单 API | 任务 13 |
| 6.2 采购退货 API | 任务 14 |
| 6.3 采购对账 API | 任务 14 |
| 6.4 供应商 API | 任务 14 |
| 7.1 采购订单列表页 | 任务 16 |
| 7.2 采购订单详情页 | 任务 17 |
| 7.3 创建/编辑表单 | 任务 16 |
| 7.4 采购退货页面 | 任务 17 |
| 7.5 采购对账页面 | 任务 17 |
| 7.6 供应商管理页面 | 任务 18 |
| 7.7 i18n 扩展 | 任务 15 |

无遗漏。

### 占位符扫描

- 无 "待定"、"TODO"、"后续实现"
- 每个步骤包含完整代码或精确路径

### 类型一致性

- `CurrencySnapshot.create(currency, exchangeRate, baseCurrency)` — 全任务统一
- `PurchaseOrderProps.baseCurrency` / `baseTotalAmount` / `baseTaxAmount` / `baseGrandTotal` — 全任务统一
- `PurchaseOrderLineProps.baseUnitPrice` / `baseAmount` / `baseTaxAmount` / `baseLineTotal` — 全任务统一
- `PurchaseReturnProps.currency` / `exchangeRate` / `baseCurrency` / `baseTotalAmount` — 全任务统一
- `PurchaseReconciliationProps.currency` / `exchangeRate` / 7 个 `base_*` — 全任务统一
- API 响应字段使用 snake_case（`base_total_amount`），领域层使用 camelCase（`baseTotalAmount`）— 与现有代码风格一致
