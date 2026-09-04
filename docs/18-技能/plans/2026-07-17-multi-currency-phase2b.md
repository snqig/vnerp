# Phase 2b Multi-Currency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend multi-currency support to sales, inventory/warehouse, and finance (AR/AP) modules.

**Architecture:** Reuse Phase 1 infrastructure (CurrencySnapshot, Money, CurrencyApplicationService) and Phase 2a patterns (domain aggregate props, repository mapToProps, service injection, API response extension, frontend MoneyDisplay). Each module follows the same 6-layer pattern: DB migration → domain layer → repository → application service → API route → frontend.

**Tech Stack:** Next.js 14, MySQL 8, Drizzle ORM, Vitest, next-intl

---

### Task 1: Migration 066 — Inventory/Warehouse Currency Columns

**Files:**
- Create: `database/migrations/066_inventory_multi_currency.sql`
- Test: `tests/integration/database/migration-066.test.ts`

**Step 1: Write the migration SQL**

```sql
-- inv_inbound_order
ALTER TABLE `inv_inbound_order`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

ALTER TABLE `inv_inbound_item`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

ALTER TABLE `inv_outbound_order`
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

ALTER TABLE `inv_outbound_item`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

UPDATE `inv_inbound_order` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
UPDATE `inv_outbound_order` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
```

**Step 2: Write the migration SQL file**

Create `database/migrations/066_inventory_multi_currency.sql` with the above SQL.

**Step 3: Validate SQL syntax**

Run: `node -e "require('child_process').execSync('mysql --help', {stdio:'inherit'})" 2>/dev/null || echo "MySQL CLI not available — manual review required"`

**Step 4: Commit**

```bash
git add database/migrations/066_inventory_multi_currency.sql
git commit -m "feat(currency): add migration 066 for inventory multi-currency fields"
```

---

### Task 2: Migration 067 — Sales Module Currency Columns

**Files:**
- Create: `database/migrations/067_sales_multi_currency.sql`

**Step 1: Write the migration SQL**

```sql
-- sal_order (已有 currency + exchange_rate)
ALTER TABLE `sal_order`
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `total_amount`,
  ADD COLUMN `base_tax_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币税额' AFTER `tax_amount`,
  ADD COLUMN `base_grand_total` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币含税总额' AFTER `total_with_tax`;

ALTER TABLE `sal_order_detail`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `material_spec`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`,
  ADD COLUMN `base_tax_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币税额' AFTER `tax_amount`;

ALTER TABLE `sal_delivery`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

ALTER TABLE `sal_delivery_detail`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

ALTER TABLE `sal_return`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_total_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币总金额' AFTER `exchange_rate`;

ALTER TABLE `sal_return_detail`
  ADD COLUMN `base_unit_price` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币单价' AFTER `unit_price`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `amount`;

ALTER TABLE `sal_reconciliation`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `total_amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_delivery_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币出库金额' AFTER `delivery_amount`,
  ADD COLUMN `base_return_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币退货金额' AFTER `return_amount`,
  ADD COLUMN `base_net_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币净额' AFTER `net_amount`,
  ADD COLUMN `base_discount_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币折扣金额' AFTER `discount_amount`,
  ADD COLUMN `base_received_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币实收金额' AFTER `received_amount`,
  ADD COLUMN `base_balance_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币余额' AFTER `balance_amount`;

UPDATE `sal_order` SET `base_total_amount` = `total_amount`, `base_tax_amount` = `tax_amount`, `base_grand_total` = `total_with_tax` WHERE `base_total_amount` = 0;
UPDATE `sal_delivery` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
UPDATE `sal_return` SET `base_total_amount` = `total_amount` WHERE `base_total_amount` = 0;
```

**Step 2: Write the migration SQL file**

Create `database/migrations/067_sales_multi_currency.sql`.

**Step 3: Commit**

```bash
git add database/migrations/067_sales_multi_currency.sql
git commit -m "feat(currency): add migration 067 for sales multi-currency fields"
```

---

### Task 3: Migration 068 — Finance Module Currency Columns

**Files:**
- Create: `database/migrations/068_finance_multi_currency.sql`

**Step 1: Write the migration SQL**

```sql
ALTER TABLE `fin_payable`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

ALTER TABLE `fin_receivable`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

ALTER TABLE `fin_payment_record`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

ALTER TABLE `fin_receipt_record`
  ADD COLUMN `currency` varchar(10) DEFAULT 'CNY' COMMENT '币种' AFTER `amount`,
  ADD COLUMN `exchange_rate` decimal(18,6) DEFAULT 1.000000 COMMENT '汇率' AFTER `currency`,
  ADD COLUMN `base_amount` decimal(18,4) DEFAULT 0.0000 COMMENT '本位币金额' AFTER `exchange_rate`;

UPDATE `fin_payable` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
UPDATE `fin_receivable` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
UPDATE `fin_payment_record` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
UPDATE `fin_receipt_record` SET `base_amount` = `amount`, `currency` = 'CNY', `exchange_rate` = 1.0 WHERE `base_amount` = 0;
```

**Step 2: Write the file**

**Step 3: Commit**

```bash
git add database/migrations/068_finance_multi_currency.sql
git commit -m "feat(currency): add migration 068 for finance multi-currency fields"
```

---

### Task 4: Drizzle Schema Sync

**Files:**
- Modify: `src/lib/db/schema.ts`

**Step 1: Read the current schema**

Read `src/lib/db/schema.ts` to find existing table definitions for `sal_order`, `sal_order_detail`, `sal_delivery`, `sal_delivery_detail`, `sal_return`, `sal_return_detail`, `sal_reconciliation`, `inv_inbound_order`, `inv_inbound_item`, `inv_outbound_order`, `inv_outbound_item`, `fin_payable`, `fin_receivable`, `fin_payment_record`, `fin_receipt_record`.

**Step 2: Add new columns to each table definition**

For each table, add the new column definitions using the same pattern as Phase 2a's `pur_purchase_order` entries. Example:
```typescript
baseTotalAmount: numeric('base_total_amount', { precision: 18, scale: 4 }).default('0.0000'),
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: No new type errors

**Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(currency): sync Drizzle schema with Phase 2b multi-currency columns"
```

---

### Task 5: Domain — SalesOrder + SalesOrderLine

**Files:**
- Modify: `src/domain/sales/aggregates/SalesOrder.ts`
- Modify: `src/domain/sales/entities/SalesOrderLine.ts`
- Modify: `src/domain/sales/events/SalesOrderEvents.ts`

**Step 1: Read existing files**

Read all 3 files to understand current structure.

**Step 2: Extend SalesOrderLineProps interface**

Add to `SalesOrderLineProps`:
```typescript
baseUnitPrice?: number;
baseAmount?: number;
baseTaxAmount?: number;
baseLineTotal?: number;
```

Add private fields, getters, and update `create`/`reconstitute` with `?? 0` defaults (exact same pattern as `PurchaseOrderLine` in Phase 2a).

**Step 3: Extend SalesOrderProps interface**

Add:
```typescript
currency?: string;
exchangeRate?: number;
baseCurrency?: string;
baseTotalAmount?: number;
baseTaxAmount?: number;
baseGrandTotal?: number;
```

**Step 4: Extend SalesOrder class**

- Add constructor params: `currency`, `exchangeRate`, `baseCurrency`, `baseTotalAmount`, `baseTaxAmount`, `baseGrandTotal`
- Add getters for base_* fields
- Update `create` with `|| 'CNY'` for currency, `?? 0` for amounts
- Update `reconstitute` to read the fields
- In event creation, pass currency fields to `SalesOrderCreatedEvent`

**Step 5: Extend SalesOrderEvents.ts**

Add optional fields to `SalesOrderCreatedEvent` payload:
```typescript
currency?: string;
exchangeRate?: number;
baseCurrency?: string;
baseTotalAmount?: number;
baseGrandTotal?: number;
```

**Step 6: Verify**

Run: `npx tsc --noEmit` — expect no new errors

**Step 7: Commit**

```bash
git add src/domain/sales/aggregates/SalesOrder.ts src/domain/sales/entities/SalesOrderLine.ts src/domain/sales/events/SalesOrderEvents.ts
git commit -m "feat(currency): extend SalesOrder aggregate with base_* fields and event payload"
```

---

### Task 6: Domain — Delivery + DeliveryLine

**Files:**
- Modify: `src/domain/sales/aggregates/Delivery.ts`
- Modify: `src/domain/sales/entities/DeliveryLine.ts`
- Modify: `src/domain/sales/events/DeliveryEvents.ts` (if exists)

**Step 1: Read existing files**

**Step 2: Extend props and entities**

- `DeliveryProps`: add `currency?`, `exchangeRate?`, `baseCurrency?`, `baseTotalAmount?`
- `DeliveryLineProps` (if exists as separate entity): add `baseUnitPrice?`, `baseAmount?`
- If DeliveryLine is inline, add base fields inline

**Step 3: Extend Delivery class**

Add constructor params, getters, update create/reconstitute (same pattern as `PurchaseReturn`).

**Step 4: Extend events**

Add optional currency fields to `DeliveryCreatedEvent` payload.

**Step 5: Verify**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add src/domain/sales/aggregates/Delivery.ts src/domain/sales/events/
git commit -m "feat(currency): extend Delivery aggregate with base_* fields"
```

---

### Task 7: Domain — ReturnOrder + ReturnOrderLine

**Files:**
- Modify: `src/domain/sales/aggregates/ReturnOrder.ts`
- Modify: `src/domain/sales/entities/ReturnOrderLine.ts`
- Modify: `src/domain/sales/events/ReturnOrderEvents.ts` (if exists)

Same pattern as `PurchaseReturn` in Phase 2a. Add `currency`, `exchangeRate`, `baseCurrency`, `baseTotalAmount` to props, constructor, create/reconstitute, and events.

---

### Task 8: Domain — Reconciliation + WriteOffRecord

**Files:**
- Modify: `src/domain/sales/aggregates/Reconciliation.ts`
- Modify: `src/domain/sales/entities/WriteOffRecord.ts` (if exists)
- Modify: `src/domain/sales/events/ReconciliationEvents.ts` (if exists)

Same pattern as `PurchaseReconciliation` in Phase 2a. Add `currency`, `exchangeRate`, `baseCurrency`, `baseDeliveryAmount`, `baseReturnAmount`, `baseNetAmount`, `baseDiscountAmount`, `baseReceivedAmount`, `baseBalanceAmount`.

---

### Task 9: Domain — InboundOrder + OutboundOrder

**Files:**
- Modify: `src/domain/warehouse/aggregates/InboundOrder.ts`
- Modify: `src/domain/warehouse/entities/InboundItem.ts` (if exists)
- Modify: `src/domain/warehouse/aggregates/OutboundOrder.ts`

**InboundOrder:**
- Add `currency`, `exchangeRate`, `baseCurrency`, `baseTotalAmount` to props and class
- InboundItem (if entity): add `baseUnitPrice`, `baseAmount`

**OutboundOrder:**
- Already has `currency` field — add `exchangeRate`, `baseTotalAmount`

---

### Task 10: Domain — Payable + Receivable

**Files:**
- Modify: `src/domain/finance/aggregates/Payable.ts`
- Modify: `src/domain/finance/aggregates/Receivable.ts`
- Modify: `src/domain/finance/events/PayableEvents.ts` (if exists)
- Modify: `src/domain/finance/events/ReceivableEvents.ts` (if exists)

**Payable/Receivable:**
- Add `currency?`, `exchangeRate?`, `baseAmount?` to Props interface
- Add constructor params, getters, update create/reconstitute
- Add optional fields to CreatedEvent payload

---

### Task 11: Repository — MysqlSalesOrderRepository

**Files:**
- Modify: `src/infrastructure/repositories/MysqlSalesOrderRepository.ts`

**Step 1: Read existing file**

**Step 2: Extend row interfaces**

Add `base_total_amount`, `base_tax_amount`, `base_grand_total` to header row; `base_unit_price`, `base_amount`, `base_tax_amount`, `base_line_total` to line row.

**Step 3: Extend SQL**

- Add columns to column constants (if they exist) or inline SELECTs
- Add columns to INSERT for save method
- Add columns to UPDATE if applicable

**Step 4: Extend mapToProps**

Add mapping for all new fields with `Number(col) || 0` pattern and `baseCurrency: 'CNY'`.

**Step 5: Verify**

Run: `npx tsc --noEmit`

**Step 6: Commit**

---

### Task 12: Repository — Delivery, Return, Reconciliation

**Files:**
- Modify: `src/infrastructure/repositories/MysqlDeliveryRepository.ts`
- Modify: `src/infrastructure/repositories/MysqlReturnOrderRepository.ts`
- Modify: `src/infrastructure/repositories/MysqlReconciliationRepository.ts`

Each follows the same pattern as Task 11: extend row interface → extend SQL → extend mapToProps.

---

### Task 13: Repository — Inbound, Outbound, Payable, Receivable

**Files:**
- Modify: `src/infrastructure/repositories/MysqlInboundOrderRepository.ts`
- Modify: `src/infrastructure/repositories/MysqlOutboundOrderRepository.ts`
- Modify: `src/infrastructure/repositories/MysqlPayableRepository.ts`
- Modify: `src/infrastructure/repositories/MysqlReceivableRepository.ts`

For inbound: add `currency`, `exchange_rate`, `base_total_amount` columns.
For outbound: add `exchange_rate`, `base_total_amount` columns.
For payable/receivable: add `currency`, `exchange_rate`, `base_amount` columns.

---

### Task 14: Application — SalesApplicationService

**Files:**
- Modify: `src/application/services/SalesApplicationService.ts`
- Test: Create `tests/unit/application/services/sales-application-service.test.ts`

**Step 1: Read existing file**

**Step 2: Add imports**

```typescript
import { CurrencyApplicationService } from './CurrencyApplicationService';
import { CurrencySnapshot } from '@/domain/shared/value-objects/CurrencySnapshot';
import { Money } from '@/domain/shared/value-objects/Money';
import { getSystemConfig } from '@/lib/system-config';
```

**Step 3: Inject CurrencyApplicationService**

```typescript
constructor(
  private readonly orderRepo: ISalesOrderRepository,
  private readonly currencyService: CurrencyApplicationService,
) {}
```

**Step 4: Modify createOrder method**

- After existing logic, determine currency (input > system default)
- Query base currency from system config
- Get exchange rate if currency ≠ baseCurrency
- Build CurrencySnapshot
- For each line, calculate base_* via snapshot.convert(Money.create(...))
- Calculate header base totals

**Step 5: Modify createDelivery**

- From SalesOrder, inherit currency + exchangeRate (read-only)
- Calculate baseTotalAmount from delivery total * exchangeRate

**Step 6: Modify createReturn**

- From delivery or order, inherit currency
- Calculate base amounts

**Step 7: Modify createReconciliation**

- Query delivery orders, verify same currency
- Throw DomainError if mismatch
- Calculate base_* amounts

**Step 8: Write unit tests**

Test cases:
1. Default CNY currency (rate = 1.0, base = original)
2. USD conversion (base amounts = original * rate)
3. Explicit currency override
4. Line base amounts correctly calculated

**Step 9: Verify**

Run: `npx vitest run tests/unit/application/services/sales-application-service.test.ts`
Run: `npx tsc --noEmit`

**Step 10: Commit**

---

### Task 15: Application — InboundApplicationService

**Files:**
- Modify: `src/application/services/InboundApplicationService.ts`

- Inject CurrencyApplicationService + IPurchaseOrderRepository
- createInbound: if linked PO, inherit currency (allow override); no PO → CNY default
- createOutbound: if linked SO, inherit currency (allow override); no SO → CNY default
- Calculate base amounts for each line item

---

### Task 16: Application — FinanceApplicationService

**Files:**
- Modify: `src/application/services/FinanceApplicationService.ts`

- Inject CurrencyApplicationService
- createPayable: inherit from source document (inbound/PO), allow manual override
- createReceivable: inherit from source document (delivery/SO), allow manual override
- recordPayment/recordReceipt: inherit from payable/receivable

---

### Task 17: API — Sales Orders Route

**Files:**
- Modify: `src/app/api/sales/orders/route.ts`

**Step 1: Read existing file**

**Step 2: Extend GET serialization**

Add `base_currency`, `base_total_amount`, `base_tax_amount`, `base_grand_total` to response. For lines, add `base_unit_price`, `base_amount`, `base_tax_amount`, `base_line_total`.

**Step 3: Add PUT currency immutability check**

```typescript
if (body.currency !== undefined) {
  return errorResponse('币种创建后不可修改', 400, 400);
}
if (body.exchange_rate !== undefined) {
  return errorResponse('汇率创建后不可修改', 400, 400);
}
```

**Step 4: Verify**

Run: `npx tsc --noEmit`

**Step 5: Commit**

---

### Task 18: API — Sales Delivery, Return, Reconciliation Routes

**Files:**
- Modify: `src/app/api/sales/delivery/route.ts`
- Modify: `src/app/api/sales/return/route.ts`
- Modify: `src/app/api/sales/reconciliation/route.ts`

Each: extend GET serialization with currency + base_* fields. Reconciliation POST wraps DomainError for currency mismatch.

---

### Task 19: API — Inventory Inbound, Outbound Routes

**Files:**
- Modify: `src/app/api/inventory/inbound/route.ts`
- Modify: `src/app/api/inventory/outbound/route.ts`

Each: extend GET with currency fields; POST accepts optional currency.

---

### Task 20: API — Finance Payable, Receivable, Payment, Receipt Routes

**Files:**
- Modify: `src/app/api/finance/payable/route.ts`
- Modify: `src/app/api/finance/receivable/route.ts`
- Modify: `src/app/api/finance/payment/route.ts`
- Modify: `src/app/api/finance/receipt/route.ts`

Each: extend GET with currency + exchange_rate + base_amount; POST accepts currency.

---

### Task 21: i18n Extension

**Files:**
- Modify: `messages/zh-CN.json`
- Modify: `messages/zh-TW.json`
- Modify: `messages/en.json`
- Modify: `messages/vi.json`

Add to `Common` block:
```json
"baseCurrencyAmount": "本位币金额",
"inheritedCurrency": "继承币种",
"inboundCurrency": "入库币种",
"payableCurrency": "应付币种",
"receivableCurrency": "应收币种",
"allowOverride": "允许修改",
"currencyConsistencyError": "单据币种不一致"
```

Verify: `node -e "JSON.parse(require('fs').readFileSync('messages/zh-CN.json','utf8')); console.log('OK')"`

---

### Task 22: Frontend — Sales Orders Page

**Files:**
- Modify: `src/app/[locale]/sales/orders/page.tsx`

1. Extend SalesOrder interface with base_* fields
2. Add `baseCurrencyAmount` and `currency` columns to table header
3. Use `<MoneyDisplay>` for amount rendering
4. Add `<CurrencySelect>` in create dialog
5. Pass `currency` in API POST

---

### Task 23: Frontend — Sales Delivery, Return, Reconciliation Pages

**Files:**
- Modify: `src/app/[locale]/sales/delivery/page.tsx`
- Modify: `src/app/[locale]/sales/return/page.tsx`
- Modify: `src/app/[locale]/sales/reconciliation/page.tsx`

Each: add currency column + MoneyDisplay. Return/reconciliation show inherited currency as read-only.

---

### Task 24: Frontend — Inventory Inbound, Outbound Pages

**Files:**
- Modify: `src/app/[locale]/inventory/inbound/page.tsx`
- Modify: `src/app/[locale]/inventory/outbound/page.tsx`

Each: add currency column + MoneyDisplay. Inbound allows currency selection/override.

---

### Task 25: Frontend — Finance Payable, Receivable Pages

**Files:**
- Modify: `src/app/[locale]/finance/payable/page.tsx`
- Modify: `src/app/[locale]/finance/receivable/page.tsx`

Each: add currency column + MoneyDisplay + source document link.

---

### Full Verification

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 new errors (pre-existing 4 errors in currency-snapshot.test.ts only)

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: 1388+ pass, 6 pre-existing failures unchanged

**Step 3: Build**

Run: `npm run build`
Expected: exit 0

**Step 4: Push**

```bash
git push origin feature/multi-currency-phase1
```
