-- ============================================================================
-- 20260922_pur_supplier_add_default_currency.sql
-- 目的：pur_supplier 表缺失 default_currency 列 —— 前端供应商编辑弹窗 + API
--       全链路（SELECT/INSERT/UPDATE）都在读写字段，但 DB 表不存在该列
--
-- 根因：多币种模块（迁移 064_purchase_multi_currency）给采购订单、入库单、
--       对账单都加了币种字段，但 pur_supplier 主表漏加。前端 CurrencySelect
--       组件在供应商编辑弹窗已集成 default_currency，API 也按 'CNY' 兜底，
--       但 DB strict 模式下 INSERT 未知列会直接报错。
--
-- 字段设计：
--   列名      default_currency
--   类型      VARCHAR(10)       —— 与 pur_purchase_order.currency 一致
--   默认值    'CNY'              —— 与 API 的 default_currency || 'CNY' 兜底对齐
--   可空      NULL               —— 保持宽松，历史数据自动填 'CNY'
--   位置      紧跟 supplier_code —— 属于供应商基础属性
--
-- 幂等性：IF NOT EXISTS；UPDATE ... SET default_currency = 'CNY' WHERE default_currency IS NULL
--         重复执行时 ALTER TABLE 报错被跳过，UPDATE 影响行 = 0。
-- ============================================================================


-- ---------------- 新增列 ----------------
ALTER TABLE pur_supplier
  ADD COLUMN default_currency VARCHAR(10) NULL DEFAULT 'CNY'
  COMMENT '默认币种'
  AFTER supplier_code;




-- ---------------- 历史数据回填（所有现有供应商统一填 CNY） ----------------
UPDATE pur_supplier
   SET default_currency = 'CNY',
       update_time = NOW()
 WHERE default_currency IS NULL OR default_currency = '';



-- ---------------- 自检 ----------------
-- SELECT COUNT(*) AS total,
--        COUNT(default_currency) AS filled,
--        COUNT(*) - COUNT(default_currency) AS missing
--   FROM pur_supplier;

-- 预期：missing = 0, filled = total
--
-- DESC pur_supplier;

-- 预期：第 2 列为 default_currency, type = varchar(10), Default = CNY

