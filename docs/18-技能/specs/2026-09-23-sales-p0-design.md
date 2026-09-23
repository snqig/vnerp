# Sales P0 修复设计 — 2026-09-23

## 背景

对 `/api/orders/sales` 路由与前端 `orders/sales/page.tsx` 的深度审计发现 **3 个 P0 级问题** + 字段对齐差距。本设计冻结 P0 修复范围，明确本期与后续迭代边界。

**审计原始报告**：见用户消息中"Orders/Sales 模块深度分析报告"全文（字段对齐表 + 业务逻辑问题 + 表关联分析 + 改进优先级）。

## 本期目标（P0 立即修复）

| # | 问题 | 优先级 | 策略 |
|---|---|---|---|
| 1 | 税率硬编码 `* 1.13` | P0 | 从 `sys_config` 读 `default_tax_rate` 配置项，默认 0.13 |
| 2 | POST 创建无事务 | P0 | 用已有 `transaction()` helper 包裹主表 INSERT → 明细循环 → 总金额 UPDATE |
| 3 | 订单号 `SO + Date.now()` | P0 | 换用已有 `generateDocNo('SO')` — `global-config.ts` 导出、全项目 20+ 路由共用 |
| 4 | GET/POST 字段对齐 | P0 | sal_order_item 的 base_* 三列确认存储后补 API 返回；GET 已返回但前端未展示的字段列表归档 |

---

## P0-1 税率可配置

### 数据源

在 `sys_config` 插入一行：
```sql
INSERT INTO sys_config (category, config_key, config_value, description, created_at)
VALUES ('finance', 'default_tax_rate', '0.13', '销售订单默认税率（小数）', NOW());
```

### 读取 API

`src/lib/global-config.ts` 或新建 `src/lib/sales-config.ts` 暴露：
```ts
export async function getDefaultTaxRate(): Promise<number> { ... }
```
- 查 `sys_config WHERE config_key='default_tax_rate'`
- 不存在或解析失败 → fallback `0.13`（兼容老数据）

### route.ts POST 改造

```ts
const taxRate = await getDefaultTaxRate();

// 先算总金额（明细累加），再写主表
let totalAmount = 0;
for (const item of items) {
  totalAmount += (item.quantity || 0) * (item.unit_price || 0);
}
const totalWithTax = totalAmount * (1 + taxRate);
const taxAmount = totalWithTax - totalAmount;

// 事务内一次性插入主表，带 total_amount / total_with_tax / tax_amount
```

### 数据库变更

需确认 `sal_order` 是否已有 `tax_amount` 列。若缺失，执行：
```sql
ALTER TABLE sal_order ADD COLUMN tax_amount DECIMAL(18,4) NULL COMMENT '税额' AFTER total_with_tax;
```

---

## P0-2 创建流程事务化

### 现状

`POST /api/orders/sales` 的主逻辑：
1. `execute(INSERT INTO sal_order ...)` —— 无事务
2. `result.insertId`
3. 循环 `execute(INSERT INTO sal_order_item ...)` —— 每次独立
4. `execute(UPDATE sal_order SET total_amount=?, total_with_tax=? WHERE id=?)` —— 独立

失败场景：步骤 3 中某条明细插入失败，主表已存在，留下**孤儿主单**；步骤 4 失败时主单 total_amount 为 null/零。

### 改造

使用 `@/lib/db` 已有导出 `transaction()`（全项目 20+ 处使用，签名 `async (connection) => Promise<T>`）：

```ts
const orderId: number = await transaction(async (conn) => {
  // 1) 主表 INSERT（带 initial amounts）
  const [orderRes] = await conn.execute(
    `INSERT INTO sal_order (
      order_no, customer_id, order_date, delivery_date, status,
      salesman_id, payment_terms, contract_no, remark,
      currency, create_by, create_time, update_time, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
    [order_no, customer_id, ...]
  );
  const id = Number(orderRes.insertId);

  // 2) 明细循环 INSERT（单次事务内）
  for (const item of items) {
    await conn.execute(INSERT INTO sal_order_item ...);
  }

  // 3) 主表 UPDATE 金额（同一事务）
  await conn.execute(
    `UPDATE sal_order SET
       total_amount = ?, total_with_tax = ?, tax_amount = ?
     WHERE id = ?`,
    [totalAmount, totalWithTax, taxAmount, id]
  );

  return id;
});
```

失败时事务自动回滚，主表和明细都不会留下。

### 注意

`transaction()` helper 当前返回 MySQL2 的 `connection.execute()`，签名为 `[rows, fields]`（tuple）。写 `const [res] = await conn.execute(...)` 取第一元素，即 `ResultSetHeader`，其上有 `.insertId`。已在 `src/app/api/workorders/route.ts:125` 等 20+ 处验证。

---

## P0-3 订单号生成

### 替换

```ts
// 旧
const order_no = 'SO' + Date.now();
// 新
import { generateDocNo } from '@/lib/global-config';
const order_no = generateDocNo('SO');
```

### 格式

`generateDocNo('SO')` 输出 `SO20260923001`（前缀 + 日期 YYYYMMDD + N 位随机序号）。

### 唯一性权衡

**已知不足**：random 序号在并发极端情况下理论上可冲突（`serialLen` 默认 3 → 同日 999 条内低概率）。

**本期接受**（决策）：
- 与项目 20+ 个路由保持一致
- 冲突概率低到不构成现实风险
- 未来真遇到再升级为 `SELECT MAX` + 1 原子序号方案

---

## P0-4 字段对齐

### sal_order_item 明细表 base_* 三列

前端 Order 类型定义：
```ts
items: {
  base_unit_price?: number;
  base_amount?: number;
  base_tax_amount?: number;
  base_line_total?: number;
}[];
```

**需先确认 sal_order_item 表是否真有 `base_unit_price` / `base_amount` / `base_tax_amount` / `base_line_total` 列**。

- **若存在**：GET 直接返回 SELECT * 已包含，类型断言即可；POST 写入时补齐计算值
- **若不存在**：API GET 返回中 `order.items[i].base_amount` 为 null 是预期行为，本期 API 不补，标记为"数据模型演进"挂起

### GET 已返回但前端未展示的字段

| 字段 | 状态 | 本期 |
|---|---|---|
| total_with_tax | API 返回 ✅ 前端未展示 | 在列表/详情补充 |
| tax_amount | API 不返回（需加列） | 与 P0-1 同批次 |
| contact_name / contact_phone / delivery_address | API 返回 ✅ 前端未展示 | 详情弹层补充展示 |
| exchange_rate | API 返回 ✅ 前端未展示 | 本期暂不强制（币种功能 P2） |

### base_* 三字段前端有但 API 不返回

前端 Order 类型声明了 `base_amount / base_tax_amount / base_line_total` 但 API 返回时可能为 null。

- **决策**：本期以"数据库列为准"。若 sal_order_item 确实有这三列且之前 INSERT 漏写，补齐写入逻辑；若无此列，前端类型定义标记 optional，留待表结构演进。

---

## 非目标（本期不做）

| 功能 | 优先级 | 原因 |
|---|---|---|
| 订单确认/取消/审批状态流转 | P1 | 需独立设计，本期只修数据完整性 |
| shipped_qty 发货跟踪 | P1 | 依赖出库链路 |
| 双路由收敛（/api/orders vs /api/orders/sales） | P1 | 标记 deprecated，不强制合并 |
| N+1 查询优化 | P1 | 当前 20 条分页下可接受，后续换 JOIN |
| 下游单据关联（出库/工单/应收） | P2 | 需要跨模块 schema 变更 |
| amount 与 total_amount 去重 | P2 | 历史兼容 |
| 打印模板 / 收款跟踪 | P2 | 独立模块 |
| 客户级税率覆盖 | P2 | 在方案 B，本期走全局默认 |

---

## 改动清单

| 文件 | 操作 |
|---|---|
| `src/app/api/orders/sales/route.ts` | 改 POST：generateDocNo + transaction + 税率配置读取 + 事务包裹 + tax_amount 写入 |
| `src/lib/sales-config.ts`（新建） | `getDefaultTaxRate()` 函数（查 sys_config + fallback 0.13） |
| `database/migrations/20260923_sales_p0.sql`（新建） | ① 插入 default_tax_rate sys_config 行 ② ALTER sal_order ADD tax_amount（若缺失） |
| `src/app/[locale]/orders/sales/page.tsx` | 列表详情展示 total_with_tax / contact_* |
| `src/app/[locale]/orders/sales/sales-stats-cards.tsx` | （本次会话已提取）保持 |

---

## 成功标准

1. POST 创建事务化后，任何明细/主表写入失败均不产生孤儿记录
2. `default_tax_rate` 配置项可在 sys_config 调整，立即生效
3. `SO20260923001` 格式订单号生成稳定（与全项目统一）
4. `tsc --noEmit` 对改动文件无报错
5. 原 route.ts 单元测试（若有）仍通过；新增事务测试（mock transaction）

## 开放问题（待实现前确认）

- [ ] `DESCRIBE sal_order` 是否已有 `tax_amount` 列？若无，执行迁移
- [ ] `DESCRIBE sal_order_item` 是否有 `base_amount / base_tax_amount / base_line_total` 三列？
- [ ] sys_config 表 schema（key-value 还是 structured JSON？）— 实现前快速查一下
