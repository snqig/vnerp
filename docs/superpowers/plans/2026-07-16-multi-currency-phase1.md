# 多币种支持 Phase 1：基础设施 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 建立多币种基础设施（币种主数据、汇率表、Money 扩展、Currency 服务、API、前端组件），为后续 Phase 2-4 的采购/销售/财务模块改造提供基础。

**架构：** 扩展现有 `Money` 值对象添加 `convertTo`/`format` 方法；新建 `sys_currency` 和 `sys_exchange_rate` 表；领域层定义 `ICurrencyService` 接口，基础设施层用 MySQL 实现，应用层 `CurrencyApplicationService` 封装缓存与换算逻辑；前端新建 `<MoneyDisplay>`/`<CurrencySelect>` 组件和币种/汇率管理页面。

**技术栈：** Next.js 16 App Router / mysql2 / Drizzle ORM / Vitest / next-intl / shadcn/ui

**规格文档：** `docs/superpowers/specs/2026-07-16-multi-currency-design.md`

---

## 文件结构

### 新建文件
| 文件 | 职责 |
|------|------|
| `database/migrations/063_create_currency_tables.sql` | 新建 sys_currency + sys_exchange_rate + sys_company.base_currency |
| `src/domain/shared/CurrencyService.ts` | ICurrencyService 接口 + CurrencyInfo/ExchangeRate 类型 |
| `src/infrastructure/repositories/MysqlCurrencyRepository.ts` | ICurrencyService 的 MySQL 实现 |
| `src/application/services/CurrencyApplicationService.ts` | 汇率缓存 + 本位币换算应用服务 |
| `src/app/api/system/currency/route.ts` | 币种 CRUD API |
| `src/app/api/system/exchange-rate/route.ts` | 汇率 CRUD + 查询 API |
| `src/lib/money-format.ts` | formatMoney 前端格式化工具 |
| `src/components/ui/money-display.tsx` | 原币+本位币双行展示组件 |
| `src/components/ui/currency-select.tsx` | 币种下拉选择器 |
| `src/app/[locale]/settings/currency/page.tsx` | 币种管理页面 |
| `src/app/[locale]/settings/exchange-rate/page.tsx` | 汇率管理页面 |
| `tests/unit/application/services/CurrencyApplicationService.test.ts` | 应用服务测试 |
| `tests/unit/infrastructure/repositories/MysqlCurrencyRepository.test.ts` | Repository 测试 |

### 修改文件
| 文件 | 变更 |
|------|------|
| `src/domain/shared/value-objects/Money.ts` | 添加 convertTo/format 方法 |
| `tests/unit/domain/shared/value-objects/money.test.ts` | 添加 convertTo/format 测试 |
| `src/lib/db/schema.ts` | 追加 sysCurrency/sysExchangeRate 表定义 |
| `messages/zh-CN.json` / `zh-TW.json` / `en.json` / `vi.json` | 添加多币种 i18n key |

---

## 任务 1：数据库迁移

**文件：**
- 创建：`database/migrations/063_create_currency_tables.sql`

- [ ] **步骤 1：编写迁移 SQL**

```sql
-- T063: 多币种基础设施 — 币种主数据 + 汇率表 + 公司本位币字段

-- 1. 币种主数据表
CREATE TABLE IF NOT EXISTS `sys_currency` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='币种主数据';

-- 预置数据
INSERT INTO `sys_currency` (`code`, `name`, `symbol`, `decimal_places`, `sort`) VALUES
  ('CNY', '人民币', '¥', 2, 1),
  ('USD', '美元', '$', 2, 2),
  ('VND', '越南盾', '₫', 0, 3)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. 汇率表
CREATE TABLE IF NOT EXISTS `sys_exchange_rate` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='汇率表';

-- 3. 公司表加本位币字段（幂等）
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_company' AND COLUMN_NAME = 'base_currency');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `sys_company` ADD COLUMN `base_currency` varchar(10) DEFAULT ''CNY'' COMMENT ''本位币'' AFTER `tax_no`',
  'SELECT ''base_currency already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
```

- [ ] **步骤 2：执行迁移**

运行：`node scripts/run-pending-migrations.mjs`
预期：输出 `Migration 063 applied successfully`

- [ ] **步骤 3：验证表已创建**

运行：
```bash
node --input-type=module -e "import mysql from 'mysql2/promise'; const c=await mysql.createConnection({host:'127.0.0.1',user:'root',password:'Snqig521223',database:'vnerpdacahng'}); const [r1]=await c.execute('SELECT * FROM sys_currency'); const [r2]=await c.execute('SHOW COLUMNS FROM sys_company LIKE \"base_currency\"'); console.log('currencies:', r1.length); console.log('base_currency col:', r2.length); await c.end();"
```
预期：`currencies: 3` / `base_currency col: 1`

- [ ] **步骤 4：Commit**

```bash
git add database/migrations/063_create_currency_tables.sql
git commit -m "feat(currency): add migration 063 — sys_currency, sys_exchange_rate, sys_company.base_currency"
```

---

## 任务 2：Drizzle Schema 同步

**文件：**
- 修改：`src/lib/db/schema.ts`（在文件末尾追加）

- [ ] **步骤 1：在 schema.ts 末尾追加两张表定义**

在 `src/lib/db/schema.ts` 文件末尾追加：

```typescript
// ==================== 币种与汇率（多币种基础设施） ====================

export const sysCurrency = mysqlTable(
  'sys_currency',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    code: varchar('code', { length: 10 }).notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 10 }),
    decimalPlaces: int('decimal_places').default(2),
    status: tinyint('status').default(1),
    sort: int('sort').default(0),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    updateTime: datetime('update_time').default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
    updateBy: bigint('update_by', { mode: 'number', unsigned: true }),
    deleted: tinyint('deleted').default(0),
  },
  (table) => ({
    codeIdx: uniqueIndex('uk_code').on(table.code),
  })
);

export const sysExchangeRate = mysqlTable(
  'sys_exchange_rate',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    fromCurrency: varchar('from_currency', { length: 10 }).notNull(),
    toCurrency: varchar('to_currency', { length: 10 }).notNull(),
    rate: decimal('rate', { precision: 18, scale: 6 }).notNull(),
    rateDate: date('rate_date').notNull(),
    source: varchar('source', { length: 50 }).default('manual'),
    remark: varchar('remark', { length: 200 }),
    createTime: datetime('create_time').default(sql`CURRENT_TIMESTAMP`),
    createBy: bigint('create_by', { mode: 'number', unsigned: true }),
  },
  (table) => ({
    fromToDateIdx: index('idx_from_to_date').on(table.fromCurrency, table.toCurrency, table.rateDate),
    dateIdx: index('idx_date').on(table.rateDate),
  })
);
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit --pretty 2>&1 | head -20`
预期：无新增错误

- [ ] **步骤 3：Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(currency): sync Drizzle schema with sys_currency and sys_exchange_rate"
```

---

## 任务 3：Money 值对象扩展（TDD）

**文件：**
- 修改：`tests/unit/domain/shared/value-objects/money.test.ts`
- 修改：`src/domain/shared/value-objects/Money.ts`

- [ ] **步骤 1：编写失败的测试**

在 `tests/unit/domain/shared/value-objects/money.test.ts` 的 `describe('8.3 Money 值对象')` 块内末尾（`});` 之前）追加：

```typescript
  describe('convertTo() 汇率转换', () => {
    it('同币种转换返回自身', () => {
      const m = Money.create(100, 'CNY');
      const result = m.convertTo(7.25, 'CNY', 2);
      expect(result.amount).toBe(100);
      expect(result.currency).toBe('CNY');
    });

    it('USD 转 CNY 正确换算', () => {
      const usd = Money.create(1000, 'USD');
      const cny = usd.convertTo(7.25, 'CNY', 2);
      expect(cny.amount).toBe(7250);
      expect(cny.currency).toBe('CNY');
    });

    it('VND 转 CNY 零小数位', () => {
      const vnd = Money.create(250000, 'VND');
      const cny = vnd.convertTo(0.0003, 'CNY', 2);
      expect(cny.amount).toBe(75);
      expect(cny.currency).toBe('CNY');
    });

    it('转换结果四舍五入到指定小数位', () => {
      const usd = Money.create(100, 'USD');
      const cny = usd.convertTo(7.253, 'CNY', 2);
      // 100 * 7.253 = 725.3 → 725.30
      expect(cny.amount).toBe(725.3);
    });

    it('VND 0 位小数转换四舍五入到整数', () => {
      const cny = Money.create(99.99, 'CNY');
      const vnd = cny.convertTo(3400, 'VND', 0);
      // 99.99 * 3400 = 339966
      expect(vnd.amount).toBe(339966);
      expect(vnd.currency).toBe('VND');
    });
  });

  describe('format() 格式化', () => {
    it('默认 2 位小数', () => {
      expect(Money.create(1234.5).format()).toBe('1234.50');
    });

    it('VND 0 位小数', () => {
      const vnd = Money.create(250000, 'VND');
      expect(vnd.format(0)).toBe('250000');
    });

    it('负数格式化（红字）', () => {
      const red = Money.redLetter(100, 'CNY');
      expect(red.format(2)).toBe('-100.00');
    });
  });
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/unit/domain/shared/value-objects/money.test.ts`
预期：FAIL — `convertTo is not a function` / `format is not a function`

- [ ] **步骤 3：在 Money.ts 中实现 convertTo 和 format**

在 `src/domain/shared/value-objects/Money.ts` 的 `equals` 方法之后、类结束 `}` 之前追加：

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
   * 按指定小数位格式化金额为字符串
   */
  format(decimalPlaces: number = 2): string {
    return this.amount.toFixed(decimalPlaces);
  }
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run tests/unit/domain/shared/value-objects/money.test.ts`
预期：PASS — 全部用例通过

- [ ] **步骤 5：Commit**

```bash
git add src/domain/shared/value-objects/Money.ts tests/unit/domain/shared/value-objects/money.test.ts
git commit -m "feat(currency): extend Money value object with convertTo and format methods"
```

---

## 任务 4：ICurrencyService 接口定义

**文件：**
- 创建：`src/domain/shared/CurrencyService.ts`

- [ ] **步骤 1：创建接口文件**

```typescript
// src/domain/shared/CurrencyService.ts

/**
 * 币种信息
 */
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

/**
 * 汇率记录
 */
export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDate: Date;
}

/**
 * 币种与汇率领域服务接口
 * 实现由基础设施层提供（MysqlCurrencyRepository）
 */
export interface ICurrencyService {
  /** 获取币种信息（含小数位） */
  getCurrency(code: string): Promise<CurrencyInfo | null>;

  /** 获取最新汇率（from→to），无则返回 null */
  getLatestRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null>;

  /** 获取指定日期汇率 */
  getRateOnDate(
    fromCurrency: string,
    toCurrency: string,
    date: Date
  ): Promise<ExchangeRate | null>;

  /** 获取所有启用的币种 */
  listActiveCurrencies(): Promise<CurrencyInfo[]>;
}
```

- [ ] **步骤 2：验证编译**

运行：`npx tsc --noEmit --pretty 2>&1 | head -10`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/domain/shared/CurrencyService.ts
git commit -m "feat(currency): define ICurrencyService domain interface"
```

---

## 任务 5：MysqlCurrencyRepository 实现（TDD）

**文件：**
- 创建：`tests/unit/infrastructure/repositories/MysqlCurrencyRepository.test.ts`
- 创建：`src/infrastructure/repositories/MysqlCurrencyRepository.ts`

- [ ] **步骤 1：编写失败的测试**

```typescript
// tests/unit/infrastructure/repositories/MysqlCurrencyRepository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MysqlCurrencyRepository } from '@/infrastructure/repositories/MysqlCurrencyRepository';

// Mock db module
vi.mock('@/lib/db', () => ({
  queryOne: vi.fn(),
  query: vi.fn(),
}));

import { queryOne, query } from '@/lib/db';

describe('MysqlCurrencyRepository', () => {
  let repo: MysqlCurrencyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new MysqlCurrencyRepository();
  });

  describe('getCurrency()', () => {
    it('返回存在的币种信息', async () => {
      vi.mocked(queryOne).mockResolvedValue({
        code: 'USD',
        name: '美元',
        symbol: '$',
        decimal_places: 2,
      });
      const result = await repo.getCurrency('USD');
      expect(result).toEqual({
        code: 'USD',
        name: '美元',
        symbol: '$',
        decimalPlaces: 2,
      });
    });

    it('币种不存在返回 null', async () => {
      vi.mocked(queryOne).mockResolvedValue(null);
      const result = await repo.getCurrency('EUR');
      expect(result).toBeNull();
    });
  });

  describe('getLatestRate()', () => {
    it('返回最新汇率记录', async () => {
      vi.mocked(queryOne).mockResolvedValue({
        from_currency: 'USD',
        to_currency: 'CNY',
        rate: '7.250000',
        rate_date: new Date('2026-07-16'),
      });
      const result = await repo.getLatestRate('USD', 'CNY');
      expect(result).toEqual({
        fromCurrency: 'USD',
        toCurrency: 'CNY',
        rate: 7.25,
        rateDate: new Date('2026-07-16'),
      });
    });

    it('汇率未配置返回 null', async () => {
      vi.mocked(queryOne).mockResolvedValue(null);
      const result = await repo.getLatestRate('EUR', 'VND');
      expect(result).toBeNull();
    });
  });

  describe('listActiveCurrencies()', () => {
    it('返回启用币种列表', async () => {
      vi.mocked(query).mockResolvedValue([
        { code: 'CNY', name: '人民币', symbol: '¥', decimal_places: 2 },
        { code: 'USD', name: '美元', symbol: '$', decimal_places: 2 },
      ]);
      const result = await repo.listActiveCurrencies();
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('CNY');
    });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/unit/infrastructure/repositories/MysqlCurrencyRepository.test.ts`
预期：FAIL — 模块不存在

- [ ] **步骤 3：实现 MysqlCurrencyRepository**

```typescript
// src/infrastructure/repositories/MysqlCurrencyRepository.ts
import { queryOne, query } from '@/lib/db';
import type { ICurrencyService, CurrencyInfo, ExchangeRate } from '@/domain/shared/CurrencyService';

interface CurrencyRow {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: string;
  rate_date: Date;
}

export class MysqlCurrencyRepository implements ICurrencyService {
  async getCurrency(code: string): Promise<CurrencyInfo | null> {
    const row = await queryOne<CurrencyRow>(
      'SELECT code, name, symbol, decimal_places FROM sys_currency WHERE code = ? AND status = 1 AND deleted = 0',
      [code]
    );
    if (!row) return null;
    return {
      code: row.code,
      name: row.name,
      symbol: row.symbol,
      decimalPlaces: row.decimal_places,
    };
  }

  async getLatestRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const row = await queryOne<ExchangeRateRow>(
      'SELECT from_currency, to_currency, rate, rate_date FROM sys_exchange_rate WHERE from_currency = ? AND to_currency = ? ORDER BY rate_date DESC LIMIT 1',
      [fromCurrency, toCurrency]
    );
    if (!row) return null;
    return {
      fromCurrency: row.from_currency,
      toCurrency: row.to_currency,
      rate: parseFloat(row.rate),
      rateDate: new Date(row.rate_date),
    };
  }

  async getRateOnDate(
    fromCurrency: string,
    toCurrency: string,
    date: Date
  ): Promise<ExchangeRate | null> {
    const row = await queryOne<ExchangeRateRow>(
      'SELECT from_currency, to_currency, rate, rate_date FROM sys_exchange_rate WHERE from_currency = ? AND to_currency = ? AND rate_date = ? ORDER BY id DESC LIMIT 1',
      [fromCurrency, toCurrency, date.toISOString().split('T')[0]]
    );
    if (!row) return null;
    return {
      fromCurrency: row.from_currency,
      toCurrency: row.to_currency,
      rate: parseFloat(row.rate),
      rateDate: new Date(row.rate_date),
    };
  }

  async listActiveCurrencies(): Promise<CurrencyInfo[]> {
    const rows = await query<CurrencyRow>(
      'SELECT code, name, symbol, decimal_places FROM sys_currency WHERE status = 1 AND deleted = 0 ORDER BY sort ASC'
    );
    return rows.map((row) => ({
      code: row.code,
      name: row.name,
      symbol: row.symbol,
      decimalPlaces: row.decimal_places,
    }));
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run tests/unit/infrastructure/repositories/MysqlCurrencyRepository.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/infrastructure/repositories/MysqlCurrencyRepository.ts tests/unit/infrastructure/repositories/MysqlCurrencyRepository.test.ts
git commit -m "feat(currency): implement MysqlCurrencyRepository with CRUD for currencies and rates"
```

---

## 任务 6：CurrencyApplicationService 实现（TDD）

**文件：**
- 创建：`tests/unit/application/services/CurrencyApplicationService.test.ts`
- 创建：`src/application/services/CurrencyApplicationService.ts`

- [ ] **步骤 1：编写失败的测试**

```typescript
// tests/unit/application/services/CurrencyApplicationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import type { ICurrencyService } from '@/domain/shared/CurrencyService';
import { Money } from '@/domain/shared/value-objects/Money';

describe('CurrencyApplicationService', () => {
  let mockCurrencyService: ICurrencyService;
  let service: CurrencyApplicationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrencyService = {
      getCurrency: vi.fn(),
      getLatestRate: vi.fn(),
      getRateOnDate: vi.fn(),
      listActiveCurrencies: vi.fn(),
    };
    service = new CurrencyApplicationService(mockCurrencyService);
  });

  describe('getLatestRate()', () => {
    it('同币种返回 1', async () => {
      const rate = await service.getLatestRate('CNY', 'CNY');
      expect(rate).toBe(1);
      expect(mockCurrencyService.getLatestRate).not.toHaveBeenCalled();
    });

    it('有缓存时返回缓存值', async () => {
      vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue({
        fromCurrency: 'USD',
        toCurrency: 'CNY',
        rate: 7.25,
        rateDate: new Date('2026-07-16'),
      });
      const rate1 = await service.getLatestRate('USD', 'CNY');
      const rate2 = await service.getLatestRate('USD', 'CNY');
      expect(rate1).toBe(7.25);
      expect(rate2).toBe(7.25);
      // 第二次应命中缓存，不再次查询 DB
      expect(mockCurrencyService.getLatestRate).toHaveBeenCalledTimes(1);
    });

    it('汇率未配置抛错', async () => {
      vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue(null);
      await expect(service.getLatestRate('EUR', 'VND')).rejects.toThrow(/汇率未配置/);
    });
  });

  describe('convertToBaseCurrency()', () => {
    it('同币种直接返回', async () => {
      const money = Money.create(100, 'CNY');
      const result = await service.convertToBaseCurrency(money, 'CNY');
      expect(result.amount).toBe(100);
      expect(result.currency).toBe('CNY');
    });

    it('USD 转 CNY 正确换算', async () => {
      vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue({
        fromCurrency: 'USD',
        toCurrency: 'CNY',
        rate: 7.25,
        rateDate: new Date(),
      });
      vi.mocked(mockCurrencyService.getCurrency).mockResolvedValue({
        code: 'CNY',
        name: '人民币',
        symbol: '¥',
        decimalPlaces: 2,
      });
      const usd = Money.create(1000, 'USD');
      const cny = await service.convertToBaseCurrency(usd, 'CNY');
      expect(cny.amount).toBe(7250);
      expect(cny.currency).toBe('CNY');
    });

    it('VND 转 CNY 零小数位', async () => {
      vi.mocked(mockCurrencyService.getLatestRate).mockResolvedValue({
        fromCurrency: 'VND',
        toCurrency: 'CNY',
        rate: 0.0003,
        rateDate: new Date(),
      });
      vi.mocked(mockCurrencyService.getCurrency).mockResolvedValue({
        code: 'CNY',
        name: '人民币',
        symbol: '¥',
        decimalPlaces: 2,
      });
      const vnd = Money.create(250000, 'VND');
      const cny = await service.convertToBaseCurrency(vnd, 'CNY');
      expect(cny.amount).toBe(75);
    });
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run tests/unit/application/services/CurrencyApplicationService.test.ts`
预期：FAIL — 模块不存在

- [ ] **步骤 3：实现 CurrencyApplicationService**

```typescript
// src/application/services/CurrencyApplicationService.ts
import type { ICurrencyService } from '@/domain/shared/CurrencyService';
import { Money } from '@/domain/shared/value-objects/Money';
import { logger } from '@/lib/logger';

// 内存缓存（无 Redis 时降级使用）
const memoryCache = new Map<string, { value: number; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟

export class CurrencyApplicationService {
  constructor(private currencyService: ICurrencyService) {}

  /**
   * 获取最新汇率，带缓存（TTL 5分钟）
   * 无 Redis 时降级为内存缓存
   */
  async getLatestRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;

    const cacheKey = `rate:${from}:${to}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const rate = await this.currencyService.getLatestRate(from, to);
    if (!rate) {
      throw new Error(`汇率未配置: ${from}→${to}，请先在汇率管理中录入`);
    }

    memoryCache.set(cacheKey, { value: rate.rate, expiresAt: Date.now() + CACHE_TTL_MS });
    return rate.rate;
  }

  /**
   * 换算金额为本位币
   */
  async convertToBaseCurrency(money: Money, baseCurrency: string): Promise<Money> {
    if (money.currency === baseCurrency) return money;

    const rate = await this.getLatestRate(money.currency, baseCurrency);
    const target = await this.currencyService.getCurrency(baseCurrency);
    const decimalPlaces = target?.decimalPlaces ?? 2;

    logger.info(
      { module: 'Currency', action: 'convertToBaseCurrency' },
      '汇率换算',
      { from: money.currency, to: baseCurrency, rate, amount: money.amount }
    );

    return money.convertTo(rate, baseCurrency, decimalPlaces);
  }

  /**
   * 清除汇率缓存（录入新汇率后调用）
   */
  clearCache(): void {
    memoryCache.clear();
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run tests/unit/application/services/CurrencyApplicationService.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/application/services/CurrencyApplicationService.ts tests/unit/application/services/CurrencyApplicationService.test.ts
git commit -m "feat(currency): implement CurrencyApplicationService with cache and conversion"
```

---

## 任务 7：币种 CRUD API

**文件：**
- 创建：`src/app/api/system/currency/route.ts`

- [ ] **步骤 1：实现币种 CRUD API**

```typescript
// src/app/api/system/currency/route.ts
import { NextRequest } from 'next/server';
import { execute, queryOne, query } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, validateRequestBody } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

// GET - 币种列表（含筛选）
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const onlyActive = searchParams.get('active') === 'true';

  let sql = 'SELECT * FROM sys_currency WHERE deleted = 0';
  const values: unknown[] = [];

  if (onlyActive) {
    sql += ' AND status = 1';
  } else if (status !== undefined && status !== null && status !== '') {
    sql += ' AND status = ?';
    values.push(parseInt(status));
  }

  sql += ' ORDER BY sort ASC, id ASC';

  const rows = await query(sql, values);
  return successResponse(rows);
});

// POST - 新建币种
export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['code', 'name']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    // 检查 code 是否已存在
    const existing = await queryOne('SELECT id FROM sys_currency WHERE code = ?', [body.code]);
    if (existing) {
      return errorResponse('币种代码已存在', 409, 409);
    }

    const result = await execute(
      `INSERT INTO sys_currency (code, name, symbol, decimal_places, status, sort)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.code,
        body.name,
        body.symbol ?? null,
        body.decimal_places ?? 2,
        body.status ?? 1,
        body.sort ?? 0,
      ]
    );

    return successResponse({ id: result.insertId }, '币种创建成功');
  },
  { logTitle: '创建币种' }
);

// PUT - 更新币种
export const PUT = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return commonErrors.badRequest('币种ID不能为空');
    }

    const existing = await queryOne('SELECT id FROM sys_currency WHERE id = ?', [id]);
    if (!existing) {
      return commonErrors.notFound('币种不存在');
    }

    await execute(
      `UPDATE sys_currency SET name = ?, symbol = ?, decimal_places = ?, status = ?, sort = ? WHERE id = ?`,
      [
        body.name,
        body.symbol ?? null,
        body.decimal_places ?? 2,
        body.status ?? 1,
        body.sort ?? 0,
        id,
      ]
    );

    return successResponse(null, '币种更新成功');
  },
  { logTitle: '更新币种' }
);

// DELETE - 删除币种（软删除）
export const DELETE = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return commonErrors.badRequest('币种ID不能为空');
    }

    await execute('UPDATE sys_currency SET deleted = 1 WHERE id = ?', [parseInt(id)]);
    return successResponse(null, '币种删除成功');
  },
  { logTitle: '删除币种' }
);
```

- [ ] **步骤 2：验证编译**

运行：`npx tsc --noEmit --pretty 2>&1 | head -10`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/system/currency/route.ts
git commit -m "feat(currency): add currency CRUD API at /api/system/currency"
```

---

## 任务 8：汇率 CRUD + 查询 API

**文件：**
- 创建：`src/app/api/system/exchange-rate/route.ts`

- [ ] **步骤 1：实现汇率 API**

```typescript
// src/app/api/system/exchange-rate/route.ts
import { NextRequest } from 'next/server';
import { execute, queryOne, query, queryPaginated } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, validateRequestBody } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

// GET - 汇率列表或最新汇率查询
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');
  const latest = searchParams.get('latest') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  // 查询最新汇率: /api/system/exchange-rate?from=USD&to=CNY&latest=true
  if (latest && from && to) {
    const rate = await queryOne(
      'SELECT * FROM sys_exchange_rate WHERE from_currency = ? AND to_currency = ? ORDER BY rate_date DESC LIMIT 1',
      [from, to]
    );
    if (!rate) {
      return successResponse(null, '未找到汇率记录');
    }
    return successResponse(rate);
  }

  // 查询指定日期汇率
  if (date && from && to) {
    const rate = await queryOne(
      'SELECT * FROM sys_exchange_rate WHERE from_currency = ? AND to_currency = ? AND rate_date = ? ORDER BY id DESC LIMIT 1',
      [from, to, date]
    );
    return successResponse(rate);
  }

  // 分页列表
  let sql = 'SELECT * FROM sys_exchange_rate WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM sys_exchange_rate WHERE 1=1';
  const values: unknown[] = [];

  if (from) {
    sql += ' AND from_currency = ?';
    countSql += ' AND from_currency = ?';
    values.push(from);
  }
  if (to) {
    sql += ' AND to_currency = ?';
    countSql += ' AND to_currency = ?';
    values.push(to);
  }

  sql += ' ORDER BY rate_date DESC, id DESC';

  const result = await queryPaginated(sql, countSql, values, { page, pageSize });
  return successResponse(result.data, undefined, result.pagination);
});

// POST - 录入汇率
export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['from_currency', 'to_currency', 'rate', 'rate_date']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    if (body.from_currency === body.to_currency) {
      return errorResponse('源币种和目标币种不能相同', 400, 400);
    }

    if (parseFloat(body.rate) <= 0) {
      return errorResponse('汇率必须大于 0', 400, 400);
    }

    const result = await execute(
      `INSERT INTO sys_exchange_rate (from_currency, to_currency, rate, rate_date, source, remark)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.from_currency,
        body.to_currency,
        body.rate,
        body.rate_date,
        body.source ?? 'manual',
        body.remark ?? null,
      ]
    );

    return successResponse({ id: result.insertId }, '汇率录入成功');
  },
  { logTitle: '录入汇率' }
);

// DELETE - 删除汇率记录
export const DELETE = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return commonErrors.badRequest('汇率记录ID不能为空');
    }

    await execute('DELETE FROM sys_exchange_rate WHERE id = ?', [parseInt(id)]);
    return successResponse(null, '汇率记录删除成功');
  },
  { logTitle: '删除汇率' }
);
```

- [ ] **步骤 2：验证编译**

运行：`npx tsc --noEmit --pretty 2>&1 | head -10`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/app/api/system/exchange-rate/route.ts
git commit -m "feat(currency): add exchange rate CRUD and query API at /api/system/exchange-rate"
```

---

## 任务 9：前端 formatMoney 工具

**文件：**
- 创建：`src/lib/money-format.ts`

- [ ] **步骤 1：实现 formatMoney 工具**

```typescript
// src/lib/money-format.ts

/**
 * 根据币种获取 locale
 */
function getLocaleByCurrency(currency: string): string {
  const map: Record<string, string> = {
    CNY: 'zh-CN',
    USD: 'en-US',
    VND: 'vi-VN',
  };
  return map[currency] || 'en-US';
}

/**
 * 币种小数位映射
 */
const DECIMAL_PLACES: Record<string, number> = {
  CNY: 2,
  USD: 2,
  VND: 0,
};

/**
 * 格式化金额为带币种符号的字符串
 * @param amount 金额
 * @param currency 币种代码（CNY/USD/VND）
 * @param decimalPlaces 小数位（不传则按币种默认）
 */
export function formatMoney(
  amount: number,
  currency: string = 'CNY',
  decimalPlaces?: number
): string {
  const digits = decimalPlaces ?? DECIMAL_PLACES[currency] ?? 2;
  try {
    return new Intl.NumberFormat(getLocaleByCurrency(currency), {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    // 币种代码无效时降级为纯数字
    return `${amount.toFixed(digits)}`;
  }
}

/**
 * 格式化金额（不带符号，仅千分位 + 小数位）
 */
export function formatAmount(
  amount: number,
  currency: string = 'CNY',
  decimalPlaces?: number
): string {
  const digits = decimalPlaces ?? DECIMAL_PLACES[currency] ?? 2;
  return new Intl.NumberFormat(getLocaleByCurrency(currency), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/**
 * 获取币种小数位
 */
export function getDecimalPlaces(currency: string): number {
  return DECIMAL_PLACES[currency] ?? 2;
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/lib/money-format.ts
git commit -m "feat(currency): add formatMoney frontend utility"
```

---

## 任务 10：CurrencySelect 组件

**文件：**
- 创建：`src/components/ui/currency-select.tsx`

- [ ] **步骤 1：实现 CurrencySelect 组件**

```tsx
// src/components/ui/currency-select.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authFetch } from '@/lib/auth-fetch';

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}

interface CurrencySelectProps {
  value: string;
  onChange: (value: string, currency?: Currency) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CurrencySelect({
  value,
  onChange,
  placeholder = '选择币种',
  disabled,
}: CurrencySelectProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await authFetch('/api/system/currency?active=true');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setCurrencies(result.data);
        }
      } catch {
        // 降级：使用默认币种列表
        setCurrencies([
          { id: 1, code: 'CNY', name: '人民币', symbol: '¥', decimal_places: 2 },
          { id: 2, code: 'USD', name: '美元', symbol: '$', decimal_places: 2 },
          { id: 3, code: 'VND', name: '越南盾', symbol: '₫', decimal_places: 0 },
        ]);
      }
    };
    loadCurrencies();
  }, []);

  return (
    <Select value={value} onValueChange={(v) => {
      const currency = currencies.find((c) => c.code === v);
      onChange(v, currency);
    }} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            {currency.symbol} {currency.code} {currency.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/components/ui/currency-select.tsx
git commit -m "feat(currency): add CurrencySelect component"
```

---

## 任务 11：MoneyDisplay 组件

**文件：**
- 创建：`src/components/ui/money-display.tsx`

- [ ] **步骤 1：实现 MoneyDisplay 组件**

```tsx
// src/components/ui/money-display.tsx
'use client';

import { formatMoney, formatAmount } from '@/lib/money-format';

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  baseAmount?: number;
  baseCurrency?: string;
  showSymbol?: boolean;
  className?: string;
}

export function MoneyDisplay({
  amount,
  currency = 'CNY',
  baseAmount,
  baseCurrency,
  showSymbol = true,
  className,
}: MoneyDisplayProps) {
  const original = showSymbol
    ? formatMoney(amount, currency)
    : formatAmount(amount, currency);

  // 同币种或无本位币金额时，单行显示
  if (!baseAmount || currency === baseCurrency) {
    return <span className={className}>{original}</span>;
  }

  // 双行显示：原币 + 本位币
  const base = showSymbol
    ? formatMoney(baseAmount, baseCurrency!)
    : formatAmount(baseAmount, baseCurrency!);

  return (
    <span className={className}>
      <span className="font-medium">{original}</span>
      <span className="text-xs text-muted-foreground ml-1">(≈{base})</span>
    </span>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/components/ui/money-display.tsx
git commit -m "feat(currency): add MoneyDisplay component for dual-currency display"
```

---

## 任务 12：i18n key 添加

**文件：**
- 修改：`messages/zh-CN.json`、`messages/zh-TW.json`、`messages/en.json`、`messages/vi.json`

- [ ] **步骤 1：在 4 个语言文件的 Common 块末尾添加 key**

在 `messages/zh-CN.json` 的 Common 块（`"clearSelection": "清空选择"` 之后）追加：

```json
    "currency": "币种",
    "exchangeRate": "汇率",
    "baseCurrency": "本位币",
    "originalCurrency": "原币种",
    "convertedAmount": "换算金额",
    "currencyManagement": "币种管理",
    "exchangeRateManagement": "汇率管理",
```

zh-TW 对应翻译：
```json
    "currency": "幣種",
    "exchangeRate": "匯率",
    "baseCurrency": "本位幣",
    "originalCurrency": "原幣種",
    "convertedAmount": "換算金額",
    "currencyManagement": "幣種管理",
    "exchangeRateManagement": "匯率管理",
```

en 对应翻译：
```json
    "currency": "Currency",
    "exchangeRate": "Exchange Rate",
    "baseCurrency": "Base Currency",
    "originalCurrency": "Original Currency",
    "convertedAmount": "Converted Amount",
    "currencyManagement": "Currency Management",
    "exchangeRateManagement": "Exchange Rate Management",
```

vi 对应翻译：
```json
    "currency": "Tiền tệ",
    "exchangeRate": "Tỷ giá",
    "baseCurrency": "Tiền tệ cơ sở",
    "originalCurrency": "Tiền tệ gốc",
    "convertedAmount": "Số tiền quy đổi",
    "currencyManagement": "Quản lý tiền tệ",
    "exchangeRateManagement": "Quản lý tỷ giá",
```

- [ ] **步骤 2：验证 JSON 格式**

运行：
```bash
node -e "['zh-CN','zh-TW','en','vi'].forEach(l => { try { JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8')); console.log(l+': OK'); } catch(e) { console.log(l+': INVALID - '+e.message); } })"
```
预期：4 个文件均 OK

- [ ] **步骤 3：Commit**

```bash
git add messages/zh-CN.json messages/zh-TW.json messages/en.json messages/vi.json
git commit -m "feat(currency): add multi-currency i18n keys to all 4 language files"
```

---

## 任务 13：币种管理页面

**文件：**
- 创建：`src/app/[locale]/settings/currency/page.tsx`

- [ ] **步骤 1：实现币种管理页面**

```tsx
// src/app/[locale]/settings/currency/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';
import { logger } from '@/lib/logger';

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  status: number;
  sort: number;
}

export default function CurrencyPage() {
  const tc = useTranslations('Common');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Currency>>({});

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/system/currency');
      const result = await response.json();
      if (result.success) {
        setCurrencies(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      logger.error({ module: 'Currency', action: 'fetchCurrencies' }, '获取币种列表失败', { error: (error as Error).message });
      toast.error(tc('fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [tc]);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast.error('请填写币种代码和名称');
      return;
    }
    try {
      const method = editing ? 'PUT' : 'POST';
      const response = await authFetch('/api/system/currency', {
        method,
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(editing ? '更新成功' : '创建成功');
        setDialogOpen(false);
        fetchCurrencies();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此币种？')) return;
    try {
      const response = await authFetch(`/api/system/currency?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('删除成功');
        fetchCurrencies();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleEdit = (currency: Currency) => {
    setForm(currency);
    setEditing(true);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setForm({ status: 1, decimal_places: 2, sort: 0 });
    setEditing(false);
    setDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tc('currencyManagement')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchCurrencies} disabled={loading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {tc('refresh')}
                </Button>
                <Button size="sm" onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  {tc('add')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc('sort') || '排序'}</TableHead>
                  <TableHead>CODE</TableHead>
                  <TableHead>{tc('currency')}</TableHead>
                  <TableHead>{tc('symbol') || '符号'}</TableHead>
                  <TableHead>{tc('decimalPlaces') || '小数位'}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{tc('operation')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.map((currency) => (
                  <TableRow key={currency.id}>
                    <TableCell>{currency.sort}</TableCell>
                    <TableCell className="font-mono">{currency.code}</TableCell>
                    <TableCell>{currency.name}</TableCell>
                    <TableCell>{currency.symbol}</TableCell>
                    <TableCell>{currency.decimal_places}</TableCell>
                    <TableCell>
                      <Badge variant={currency.status === 1 ? 'default' : 'secondary'}>
                        {currency.status === 1 ? tc('enabled') : tc('disabled')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(currency)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(currency.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? tc('edit') : tc('add')}{tc('currency')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>CODE *</Label>
                <Input
                  value={form.code || ''}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  disabled={editing}
                  placeholder="CNY / USD / VND"
                />
              </div>
              <div>
                <Label>{tc('currency')}名称 *</Label>
                <Input
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="人民币 / 美元 / 越南盾"
                />
              </div>
              <div>
                <Label>{tc('symbol') || '符号'}</Label>
                <Input
                  value={form.symbol || ''}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  placeholder="¥ / $ / ₫"
                />
              </div>
              <div>
                <Label>{tc('decimalPlaces') || '小数位'}</Label>
                <Input
                  type="number"
                  value={form.decimal_places ?? 2}
                  onChange={(e) => setForm({ ...form, decimal_places: parseInt(e.target.value) })}
                  min={0}
                  max={4}
                />
              </div>
              <div>
                <Label>{tc('sort') || '排序'}</Label>
                <Input
                  type="number"
                  value={form.sort ?? 0}
                  onChange={(e) => setForm({ ...form, sort: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>{tc('status')}</Label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={form.status ?? 1}
                  onChange={(e) => setForm({ ...form, status: parseInt(e.target.value) })}
                >
                  <option value={1}>{tc('enabled')}</option>
                  <option value={0}>{tc('disabled')}</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
```

- [ ] **步骤 2：验证编译**

运行：`npx tsc --noEmit --pretty 2>&1 | head -10`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/app/[locale]/settings/currency/page.tsx
git commit -m "feat(currency): add currency management page at settings/currency"
```

---

## 任务 14：汇率管理页面

**文件：**
- 创建：`src/app/[locale]/settings/exchange-rate/page.tsx`

- [ ] **步骤 1：实现汇率管理页面**

```tsx
// src/app/[locale]/settings/exchange-rate/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';
import { CurrencySelect } from '@/components/ui/currency-select';
import { logger } from '@/lib/logger';

interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: string;
  rate_date: string;
  source: string;
  remark: string | null;
}

export default function ExchangeRatePage() {
  const tc = useTranslations('Common');
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    from_currency: 'USD',
    to_currency: 'CNY',
    rate: '',
    rate_date: new Date().toISOString().split('T')[0],
    remark: '',
  });

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/system/exchange-rate?pageSize=100');
      const result = await response.json();
      if (result.success) {
        const data = result.data;
        setRates(Array.isArray(data) ? data : data?.list || []);
      }
    } catch (error) {
      logger.error({ module: 'Currency', action: 'fetchRates' }, '获取汇率列表失败', { error: (error as Error).message });
      toast.error(tc('fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [tc]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleSave = async () => {
    if (!form.rate || parseFloat(form.rate) <= 0) {
      toast.error('请输入有效汇率');
      return;
    }
    if (form.from_currency === form.to_currency) {
      toast.error('源币种和目标币种不能相同');
      return;
    }
    try {
      const response = await authFetch('/api/system/exchange-rate', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('汇率录入成功');
        setDialogOpen(false);
        fetchRates();
      } else {
        toast.error(result.message || '录入失败');
      }
    } catch (error) {
      toast.error('录入失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此汇率记录？')) return;
    try {
      const response = await authFetch(`/api/system/exchange-rate?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('删除成功');
        fetchRates();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tc('exchangeRateManagement')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchRates} disabled={loading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {tc('refresh')}
                </Button>
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {tc('add')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc('originalCurrency')}</TableHead>
                  <TableHead>{tc('baseCurrency')}</TableHead>
                  <TableHead>{tc('exchangeRate')}</TableHead>
                  <TableHead>{tc('date') || '日期'}</TableHead>
                  <TableHead>{tc('source') || '来源'}</TableHead>
                  <TableHead>{tc('remark') || '备注'}</TableHead>
                  <TableHead>{tc('operation')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-mono">{rate.from_currency}</TableCell>
                    <TableCell className="font-mono">{rate.to_currency}</TableCell>
                    <TableCell className="font-mono">{rate.rate}</TableCell>
                    <TableCell>{rate.rate_date}</TableCell>
                    <TableCell>{rate.source}</TableCell>
                    <TableCell>{rate.remark || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(rate.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tc('add')}{tc('exchangeRate')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>{tc('originalCurrency')}</Label>
                <CurrencySelect
                  value={form.from_currency}
                  onChange={(v) => setForm({ ...form, from_currency: v })}
                />
              </div>
              <div>
                <Label>{tc('baseCurrency')}</Label>
                <CurrencySelect
                  value={form.to_currency}
                  onChange={(v) => setForm({ ...form, to_currency: v })}
                />
              </div>
              <div>
                <Label>{tc('exchangeRate')} *</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  placeholder="7.250000"
                />
              </div>
              <div>
                <Label>{tc('date') || '日期'} *</Label>
                <Input
                  type="date"
                  value={form.rate_date}
                  onChange={(e) => setForm({ ...form, rate_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{tc('remark') || '备注'}</Label>
                <Input
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  placeholder="备注信息"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
              <Button onClick={handleSave}>{tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
```

- [ ] **步骤 2：验证编译**

运行：`npx tsc --noEmit --pretty 2>&1 | head -10`
预期：无错误

- [ ] **步骤 3：运行全部测试**

运行：`npx vitest run tests/unit/domain/shared/value-objects/money.test.ts tests/unit/infrastructure/repositories/MysqlCurrencyRepository.test.ts tests/unit/application/services/CurrencyApplicationService.test.ts`
预期：全部 PASS

- [ ] **步骤 4：Commit**

```bash
git add src/app/[locale]/settings/exchange-rate/page.tsx
git commit -m "feat(currency): add exchange rate management page at settings/exchange-rate"
```

---

## 自检结果

### 1. 规格覆盖度
对照规格 Phase 1 交付物：
- ✅ 数据库迁移：sys_currency + sys_exchange_rate + sys_company.base_currency → 任务 1
- ✅ Money 值对象扩展 convertTo/format → 任务 3
- ✅ ICurrencyService 接口 → 任务 4
- ✅ MysqlCurrencyRepository 实现 → 任务 5
- ✅ CurrencyApplicationService（含缓存）→ 任务 6
- ✅ 预置数据 CNY/USD/VND → 任务 1 SQL 中
- ✅ API /api/system/currency → 任务 7
- ✅ API /api/system/exchange-rate → 任务 8
- ✅ 前端 formatMoney 工具 → 任务 9
- ✅ <CurrencySelect> 组件 → 任务 10
- ✅ <MoneyDisplay> 组件 → 任务 11
- ✅ 设置页面：币种管理 → 任务 13
- ✅ 设置页面：汇率管理 → 任务 14
- ✅ i18n key → 任务 12
- ✅ Drizzle schema 同步 → 任务 2

### 2. 占位符扫描
- 无 TODO/待定
- 所有代码步骤都包含完整实现

### 3. 类型一致性
- `CurrencyInfo` 接口在任务 4 定义，任务 5/6 使用 — 一致
- `ExchangeRate` 接口在任务 4 定义，任务 5/6 使用 — 一致
- `convertTo(rate, targetCurrency, decimalPlaces)` 在任务 3 定义，任务 6 调用 — 一致
- `getLatestRate` / `convertToBaseCurrency` 在任务 6 定义，规格中引用 — 一致
