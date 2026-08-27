-- T064: 采购模块多币种支持 — 6 张采购业务表新增本位币金额字段
-- 依赖: T063 sys_currency / sys_exchange_rate 已存在
-- 幂等: 逐列检查 INFORMATION_SCHEMA.COLUMNS，已存在则跳过

-- ==========================================
-- 1. pur_supplier — 供应商默认币种
-- ==========================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_supplier' AND COLUMN_NAME = 'default_currency');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_supplier ADD COLUMN `default_currency` VARCHAR(10) DEFAULT ''CNY'' NULL COMMENT ''供应商默认币种代码'' AFTER `supplier_code`',
  'SELECT ''pur_supplier.default_currency already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ==========================================
-- 2. pur_purchase_order — 采购单本位币金额
-- ==========================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'base_total_amount');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_purchase_order
   ADD COLUMN `base_total_amount` DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币订单总金额'' AFTER `grand_total`,
   ADD COLUMN `base_tax_amount`   DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币税额''       AFTER `base_total_amount`,
   ADD COLUMN `base_grand_total`  DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币含税总金额''  AFTER `base_tax_amount`',
  'SELECT ''pur_purchase_order.base_total_amount already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ==========================================
-- 3. pur_purchase_order_line — 采购单行本位币金额
-- ==========================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND COLUMN_NAME = 'base_unit_price');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_purchase_order_line
   ADD COLUMN `base_unit_price`  DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币单价''   AFTER `line_total`,
   ADD COLUMN `base_amount`      DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币金额''   AFTER `base_unit_price`,
   ADD COLUMN `base_tax_amount`  DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币税额''   AFTER `base_amount`,
   ADD COLUMN `base_line_total`  DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币行合计'' AFTER `base_tax_amount`',
  'SELECT ''pur_purchase_order_line.base_unit_price already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ==========================================
-- 4. pur_purchase_return — 采购退货单币种/汇率/本位币
-- ==========================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_return' AND COLUMN_NAME = 'currency');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_purchase_return
   ADD COLUMN `currency`          VARCHAR(10)  DEFAULT ''CNY''   NOT NULL COMMENT ''币种''   AFTER `total_amount`,
   ADD COLUMN `exchange_rate`     DECIMAL(18,4) DEFAULT 1.0000   NOT NULL COMMENT ''汇率''   AFTER `currency`,
   ADD COLUMN `base_total_amount` DECIMAL(18,4) DEFAULT 0.0000   NOT NULL COMMENT ''本位币退货总金额'' AFTER `exchange_rate`',
  'SELECT ''pur_purchase_return.currency already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ==========================================
-- 5. pur_purchase_return_line — 采购退货单行本位币金额
-- ==========================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_return_line' AND COLUMN_NAME = 'base_unit_price');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_purchase_return_line
   ADD COLUMN `base_unit_price` DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币单价'' AFTER `amount`,
   ADD COLUMN `base_amount`     DECIMAL(18,4) DEFAULT 0.0000 NOT NULL COMMENT ''本位币金额'' AFTER `base_unit_price`',
  'SELECT ''pur_purchase_return_line.base_unit_price already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ==========================================
-- 6. pur_purchase_reconciliation — 采购对账单币种/汇率/本位币
-- ==========================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_reconciliation' AND COLUMN_NAME = 'currency');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pur_purchase_reconciliation
   ADD COLUMN `currency`             VARCHAR(10)  DEFAULT ''CNY''   NOT NULL COMMENT ''币种''       AFTER `period_end`,
   ADD COLUMN `exchange_rate`        DECIMAL(18,4) DEFAULT 1.0000   NOT NULL COMMENT ''汇率''       AFTER `currency`,
   ADD COLUMN `base_receipt_amount`  DECIMAL(18,4) DEFAULT 0.0000   NOT NULL COMMENT ''本位币收货金额'' AFTER `receipt_amount`,
   ADD COLUMN `base_return_amount`   DECIMAL(18,4) DEFAULT 0.0000   NOT NULL COMMENT ''本位币退货金额'' AFTER `return_amount`,
   ADD COLUMN `base_net_amount`      DECIMAL(18,4) DEFAULT 0.0000   NOT NULL COMMENT ''本位币净额''   AFTER `net_amount`,
   ADD COLUMN `base_discount_amount` DECIMAL(18,4) DEFAULT 0.0000   NOT NULL COMMENT ''本位币折扣金额'' AFTER `discount_amount`,
   ADD COLUMN `base_paid_amount`     DECIMAL(18,4) DEFAULT 0.0000   NOT NULL COMMENT ''本位币已核销金额'' AFTER `paid_amount`,
   ADD COLUMN `base_balance_amount`  DECIMAL(18,4) DEFAULT 0.0000   NOT NULL COMMENT ''本位币余额''   AFTER `balance_amount`',
  'SELECT ''pur_purchase_reconciliation.currency already exists'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ==========================================
-- 验证: 输出每个表新增的字段数
-- ==========================================
SELECT 'pur_supplier' AS table_name, COUNT(*) AS multi_currency_columns
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_supplier' AND (COLUMN_NAME LIKE 'base_%' OR COLUMN_NAME = 'default_currency')
UNION ALL
SELECT 'pur_purchase_order', COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME LIKE 'base_%'
UNION ALL
SELECT 'pur_purchase_order_line', COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND COLUMN_NAME LIKE 'base_%'
UNION ALL
SELECT 'pur_purchase_return', COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_return'
    AND COLUMN_NAME IN ('currency','exchange_rate','base_total_amount')
UNION ALL
SELECT 'pur_purchase_return_line', COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_return_line' AND COLUMN_NAME LIKE 'base_%'
UNION ALL
SELECT 'pur_purchase_reconciliation', COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_reconciliation'
    AND COLUMN_NAME IN ('currency','exchange_rate','base_receipt_amount','base_return_amount','base_net_amount','base_discount_amount','base_paid_amount','base_balance_amount');
