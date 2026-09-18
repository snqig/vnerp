# 数据库外键关联问题 · 复核报告（基于真实库实测）

> 复核时间：2026-08-13  
> 方法：直接连真实库 `vnerpdacahng` 查询 `information_schema`，核对 Drizzle Schema 源码，逐条验证原诊断报告的论断。  
> 结论：**原报告方向正确（Drizzle Schema 确实 0 个外键定义），但多处事实错误，且遗漏了一个真正高危的问题。**

---

## 一、实测关键数字（决定性证据）

| 维度                   | 原报告假设         | 真实库实测                                      |
| -------------------- | ------------- | ------------------------------------------ |
| 真实库总表数               | 95+           | **229 张**                                  |
| 真实库外键总数              | 声称"SQL 层有 FK" | **129 个**（分布在 66 张表）                       |
| Drizzle Schema 定义的外键 | 缺失            | **0 个 `foreignKey()` / 0 个 `relations()`** |
| Drizzle 建模表数         | —             | 约 **112 张**（覆盖不到一半真实表）                     |

**关键点**：真实库外键是**充足**的（129 个），但 Drizzle Schema 对它们**一无所知**。原报告把"Drizzle 缺 FK"等同于"库里缺 FK"，这是误判——库里有，只是 ORM 层没建模。

---

## 二、原报告论断逐条核对

### ✅ 正确的部分

- **问题1 核心论点**：Drizzle Schema 完全没有 `foreignKey()` / `relations()` 定义。✅ 属实（全仓 grep 零命中）。
- **问题4 采购→入库**：`inv_inbound_order.po_id` / `po_no` 存在，但**真实库确实没有**指向 `pur_purchase_order` 的外键（该表仅 1 个 FK：`fk_inv_inbound_warehouse`）。✅ 属实，是真缺口。
- **问题7 CRM 关联不全**：`crm_customer_analysis.customer_id` 真实库**确实没有**外键（0 FK）。✅ 属实，是真缺口。

### ❌ 错误/过时的部分（原报告说"无 FK"，真实库其实有）

- **问题3 称 `inv_warehouse ↔ inv_inventory` 无 FK** → 错。真实库有 `fk_inv_inventory_warehouse` + `fk_inv_inventory_material`。
- **问题3 称 `inv_material ↔ inv_inventory_batch` 无 FK** → 错。真实库有 `fk_inv_inventory_batch_material` + `fk_inv_inventory_batch_warehouse`。
- **问题3 称 `sal_order ↔ sal_order_detail` 无 FK** → 错。真实库有 `fk_sal_order_detail_order`。
- **问题6 称 `prd_work_order.productId` 应指向 `inv_material` 但没建** → 错。真实库 `prd_work_order` 已有 4 个 FK，其中 `material_id→inv_material` 和 `sales_order_id→sal_order` **各出现两次**（见第四节重复问题）。
- **问题5 称 `fin_receivable` 缺 `source_order_id` 字段** → 错。Drizzle 的 `finance.ts` 已定义 `salesOrderId` 字段；真实库缺的是该字段上的**外键约束**（字段在，FK 不在）。属"半对"。
- **问题8 称"Finance Schema 几乎是空的"** → 部分对。`finance.ts` 只导出 `finReceivable`/`finPayable`，但真实库还有 `fin_voucher`/`fin_voucher_line`/`fin_account`/`fin_account_balance`/`fin_period` 等表——这些表 Drizzle **根本没建模**，连表定义都没有，不止是缺 FK。

---

## 三、真实库外键全景（129 个，按模块精选）

**仓储（inv\_）**：inbound_order→warehouse；inbound_item→inbound_order；inventory→material/warehouse；inventory_batch→material/warehouse；outbound_order→warehouse/operator；outbound_item→order/material（×2 重复）；stock_adjust→warehouse/operator/approver；transfer_order→from/to_wh/applicant/approver/operator；transfer_item→order/material；stocktaking→warehouse；stocktaking_item→taking/material；production_inbound→work_order/warehouse 等。

**销售（sal\_）**：order→customer/salesman；order_detail→order/material；delivery→order/customer/warehouse；delivery_detail→delivery/material/order_detail（×2 重复）；return→order/customer/delivery/receivable/warehouse；return_detail→return/delivery_detail/material/order_detail；quote_item→quote；reconciliation→customer。

**采购（pur\_）**：purchase_order→supplier；purchase_order_line→po/material。

**生产（prd\_）**：work_order→material（×2）/sales_order（×2）；schedule→work_order/product(material)；schedule_detail→schedule/work_order/equipment；bom_detail→bom/material；standard_card→customer；work_order_color_seq→work_order；work_order_costs→work_order。

**财务（fin\_）**：receivable→customer；payable→supplier；voucher→period；voucher_line→voucher/account/customer(SET NULL)/supplier(SET NULL)；account_balance→account/period。

**CRM / HR / 系统 / 设备 / 印前** 等均有对应 FK（customer→salesman、customer_contact→customer、user→department、role_menu→role/menu、dict_data→dict_type、maintenance_record→equipment/plan 等）。

---

## 四、真正需要解决的问题（优先级重排）

### 🔴 P0 — 被原报告遗漏的致命风险

**Drizzle 对 129 个真实外键完全不知情。** 一旦有人执行 `drizzle-kit generate` 或 `drizzle-kit push`（项目同时有两套迁移体系），Drizzle 会以"schema 里没有这些 FK"为由，生成 `DROP FOREIGN KEY` 语句，**一次性删掉真实库全部 129 个外键**。这不是"类型安全缺失"的小问题，而是数据完整性灾难。  
→ **任何 FK 相关工作之前，必须先让 Drizzle 精确建模这 129 个 FK。**

### 🔴 P1 — 真实库确实缺失、应当补的 FK（仅 3 处）

1. `inv_inbound_order.po_id → pur_purchase_order` （采购→入库链路断裂）
2. `fin_receivable.salesOrderId → sal_order` （应收→销售订单，字段已有、缺约束）
3. `crm_customer_analysis.customer_id → crm_customer` （分析表孤儿数据风险）

### 🟠 P2 — 重复 / 命名不一致的 FK（应清理）

- `prd_work_order`：`material_id→inv_material` 出现 **2 次**、`sales_order_id→sal_order` 出现 **2 次**。
- `inv_outbound_item`：`order_id→inv_outbound_order` 出现 **2 次**（`fk_inv_outbound_item_order` + `fk_outbound_item_order`）。
- `sal_delivery_detail`、`sal_return_detail` 等也存在重复 FK。
- 命名风格不统一（有的带 `fk_inv_` 前缀，有的不带）。

### 🟡 P3 — Drizzle 建模覆盖不足

财务 `fin_voucher`/`fin_voucher_line`/`fin_account`/`fin_account_balance`/`fin_period`、以及其余约 117 张未在 Drizzle 中建模的真实表，连 `mysqlTable` 都没有。要补 `relations()` 必须先补这些表定义。

---

## 五、建议路径（与原报告不同）

原报告建议"按 SQL DDL 给 Drizzle 补外键 + relations()"——方向对，但**没意识到必须一次性补全 129 个且精确匹配 live**，否则更危险。建议：

1. **第一阶段（安全对齐，低风险）**：把真实库现有 129 个 FK 精确建模进 Drizzle（`foreignKey()` + `relations()`），使 `drizzle-kit` 与真实库一致，**不新增任何 DB 约束**。这是防止误删的护城河。
2. **第二阶段（补齐真缺口，中风险）**：加 P1 的 3 个缺失 FK + 清理 P2 重复 FK，需先跑数据孤儿检测（参考 `scripts/check-duplicate-data.mjs` 思路），再走自定义迁移（不要走 drizzle-kit push）。
3. **第三阶段（覆盖补全）**：补齐 P3 未建模的表，再逐步享受 `relations()` 的查询便利。

> 注意：项目外键由**裸 SQL 迁移/种子脚本**建立，Drizzle 从未是其来源。因此"让 Drizzle 接管 FK"必须谨慎，推荐长期维持"Drizzle 仅建模、不主动 push FK 变更"的策略。



---

## 六、待确认（见对话中的选项）

- 范围：仅做 P0 安全对齐？还是连 P1/P2 一起？
- 是否先产出逐表执行计划文档再动手？
- `finance.ts` 等缺失表是否一并补建模？
