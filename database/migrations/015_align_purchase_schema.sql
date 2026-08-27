-- Migration 015: 对齐采购模块 Schema 基线
-- 目标：统一 vnerpdacahng_schema.sql 与运行时代码的表名/字段/状态码
-- 决策依据：.trae/documents/P0-高危问题修复方案.md 第99行
--   "pur_order(SQL 旧名) vs pur_purchase_order(运行时) → 以运行时为准，
--    删除 SQL 中未用的 pur_order/pur_order_detail，标注废弃"
--
-- 变更内容：
--   1. 废弃旧表 pur_order / pur_order_detail / pur_receipt / pur_receipt_detail
--      （运行时未使用；收货复用 inv_inbound_order，见 create_po_grn_tables.sql）
--   2. 建立/对齐权威表 pur_purchase_order / pur_purchase_order_line
--      （对齐 scripts/create_po_grn_tables.sql 的运行时表结构）
--   3. 状态码统一为 10/20/30/40/50/90（与 PurchaseOrderStatus.fromDbCode 一致）
--      旧码 1-待确认/2-已确认/3-部分到货/4-已完成/5-已取消 → 新码 10/20/30/40/50/90
--
-- 安全性：所有 CREATE 使用 IF NOT EXISTS，ADD COLUMN 使用 IF NOT EXISTS（MySQL 8.0+）
--         旧表采用 RENAME 而非 DROP，保留数据以便回滚

-- ==========================================
-- 1. 废弃旧表（重命名而非删除，保留数据）
-- ==========================================

-- 旧表 pur_order → pur_order_deprecated
SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'pur_order'),
  'RENAME TABLE pur_order TO pur_order_deprecated',
  'SELECT "pur_order not exists, skip" AS msg'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 旧表 pur_order_detail → pur_order_detail_deprecated
SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'pur_order_detail'),
  'RENAME TABLE pur_order_detail TO pur_order_detail_deprecated',
  'SELECT "pur_order_detail not exists, skip" AS msg'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 旧表 pur_receipt → pur_receipt_deprecated
-- 注意：运行时收货复用 inv_inbound_order（见 create_po_grn_tables.sql 第84行 ALTER TABLE inv_inbound_order）
SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'pur_receipt'),
  'RENAME TABLE pur_receipt TO pur_receipt_deprecated',
  'SELECT "pur_receipt not exists, skip" AS msg'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 旧表 pur_receipt_detail → pur_receipt_detail_deprecated
SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'pur_receipt_detail'),
  'RENAME TABLE pur_receipt_detail TO pur_receipt_detail_deprecated',
  'SELECT "pur_receipt_detail not exists, skip" AS msg'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ==========================================
-- 2. 建立权威表 pur_purchase_order（采购单主表）
-- ==========================================
CREATE TABLE IF NOT EXISTS pur_purchase_order (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    po_no VARCHAR(50) NOT NULL COMMENT '采购单号',
    supplier_id INT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
    supplier_name VARCHAR(100) NOT NULL COMMENT '供应商名称',
    supplier_code VARCHAR(50) DEFAULT NULL COMMENT '供应商编码',
    order_date DATE NOT NULL COMMENT '订单日期',
    delivery_date DATE DEFAULT NULL COMMENT '预计交货日期',
    currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000 COMMENT '汇率',
    total_amount DECIMAL(14,2) DEFAULT 0 COMMENT '订单总金额',
    total_quantity DECIMAL(14,3) DEFAULT 0 COMMENT '订单总数量',
    tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%',
    tax_amount DECIMAL(14,2) DEFAULT 0 COMMENT '税额',
    grand_total DECIMAL(14,2) DEFAULT 0 COMMENT '含税总金额',
    -- 状态: 10-草稿, 20-待审批, 30-已审批, 40-部分收货, 50-已完成, 90-已关闭
    -- 与 PurchaseOrderStatus.fromDbCode 对齐
    status TINYINT UNSIGNED DEFAULT 10 COMMENT '状态: 10-草稿, 20-待审批, 30-已审批, 40-部分收货, 50-已完成, 90-已关闭',
    over_receipt_tolerance DECIMAL(5,2) DEFAULT 5.00 COMMENT '超收容差率%',
    payment_terms VARCHAR(100) DEFAULT NULL COMMENT '付款条款',
    delivery_address TEXT DEFAULT NULL COMMENT '送货地址',
    contact_person VARCHAR(50) DEFAULT NULL COMMENT '联系人',
    contact_phone VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    audit_by INT UNSIGNED DEFAULT NULL COMMENT '审批人ID',
    audit_time DATETIME DEFAULT NULL COMMENT '审批时间',
    close_by INT UNSIGNED DEFAULT NULL COMMENT '关闭人ID',
    close_time DATETIME DEFAULT NULL COMMENT '关闭时间',
    close_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
    deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
    UNIQUE KEY uk_po_no (po_no),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status),
    INDEX idx_order_date (order_date),
    INDEX idx_delivery_date (delivery_date),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购单主表';

-- 补全字段（如果表已存在但缺字段，对齐 create_po_grn_tables.sql）
-- MySQL 8.0.29+ 支持 ADD COLUMN IF NOT EXISTS；旧版本需用存储过程
-- 此处使用存储过程保证幂等
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS p_align_purchase_order_columns()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'audit_by') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN audit_by INT UNSIGNED DEFAULT NULL COMMENT '审批人ID' AFTER update_time;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'audit_time') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN audit_time DATETIME DEFAULT NULL COMMENT '审批时间' AFTER audit_by;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'close_by') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN close_by INT UNSIGNED DEFAULT NULL COMMENT '关闭人ID' AFTER audit_time;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'close_time') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN close_time DATETIME DEFAULT NULL COMMENT '关闭时间' AFTER close_by;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'close_reason') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN close_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因' AFTER close_time;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'over_receipt_tolerance') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN over_receipt_tolerance DECIMAL(5,2) DEFAULT 5.00 COMMENT '超收容差率%' AFTER status;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'grand_total') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN grand_total DECIMAL(14,2) DEFAULT 0 COMMENT '含税总金额' AFTER tax_amount;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'tax_rate') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%' AFTER total_quantity;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'tax_amount') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN tax_amount DECIMAL(14,2) DEFAULT 0 COMMENT '税额' AFTER tax_rate;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'total_quantity') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN total_quantity DECIMAL(14,3) DEFAULT 0 COMMENT '订单总数量' AFTER total_amount;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'supplier_code') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN supplier_code VARCHAR(50) DEFAULT NULL COMMENT '供应商编码' AFTER supplier_name;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'exchange_rate') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN exchange_rate DECIMAL(10,4) DEFAULT 1.0000 COMMENT '汇率' AFTER currency;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name = 'deleted') THEN
        ALTER TABLE pur_purchase_order ADD COLUMN deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除' AFTER close_reason;
    END IF;
END$$
DELIMITER ;
CALL p_align_purchase_order_columns();
DROP PROCEDURE IF EXISTS p_align_purchase_order_columns;

-- ==========================================
-- 3. 建立权威表 pur_purchase_order_line（采购单行表）
-- ==========================================
CREATE TABLE IF NOT EXISTS pur_purchase_order_line (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    po_id INT UNSIGNED NOT NULL COMMENT '采购单ID',
    line_no INT UNSIGNED NOT NULL COMMENT '行号',
    material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
    material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
    material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
    material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
    unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
    order_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '订购数量',
    received_qty DECIMAL(14,3) DEFAULT 0 COMMENT '累计入库数量',
    returned_qty DECIMAL(14,3) DEFAULT 0 COMMENT '累计退货数量',
    unit_price DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '单价',
    amount DECIMAL(14,2) DEFAULT 0 COMMENT '金额',
    tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%',
    tax_amount DECIMAL(14,2) DEFAULT 0 COMMENT '税额',
    line_total DECIMAL(14,2) DEFAULT 0 COMMENT '行合计',
    require_date DATE DEFAULT NULL COMMENT '需求日期',
    closed_flag TINYINT(1) DEFAULT 0 COMMENT '行关闭标志',
    closed_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
    remark TEXT DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_po_line (po_id, line_no),
    INDEX idx_material (material_id),
    INDEX idx_material_code (material_code),
    INDEX idx_require_date (require_date),
    CONSTRAINT fk_pur_line_po FOREIGN KEY (po_id) REFERENCES pur_purchase_order(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购单行表';

-- 补全 pur_purchase_order_line 字段（幂等）
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS p_align_purchase_line_columns()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order_line' AND column_name = 'returned_qty') THEN
        ALTER TABLE pur_purchase_order_line ADD COLUMN returned_qty DECIMAL(14,3) DEFAULT 0 COMMENT '累计退货数量' AFTER received_qty;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order_line' AND column_name = 'tax_rate') THEN
        ALTER TABLE pur_purchase_order_line ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%' AFTER amount;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order_line' AND column_name = 'tax_amount') THEN
        ALTER TABLE pur_purchase_order_line ADD COLUMN tax_amount DECIMAL(14,2) DEFAULT 0 COMMENT '税额' AFTER tax_rate;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order_line' AND column_name = 'line_total') THEN
        ALTER TABLE pur_purchase_order_line ADD COLUMN line_total DECIMAL(14,2) DEFAULT 0 COMMENT '行合计' AFTER tax_amount;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order_line' AND column_name = 'closed_flag') THEN
        ALTER TABLE pur_purchase_order_line ADD COLUMN closed_flag TINYINT(1) DEFAULT 0 COMMENT '行关闭标志' AFTER require_date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order_line' AND column_name = 'closed_reason') THEN
        ALTER TABLE pur_purchase_order_line ADD COLUMN closed_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因' AFTER closed_flag;
    END IF;
END$$
DELIMITER ;
CALL p_align_purchase_line_columns();
DROP PROCEDURE IF EXISTS p_align_purchase_line_columns;

-- ==========================================
-- 4. 状态码迁移（如果旧表 pur_order_deprecated 有数据且需迁移）
--    旧码: 1-待确认, 2-已确认, 3-部分到货, 4-已完成, 5-已取消
--    新码: 10-草稿, 20-待审批, 30-已审批, 40-部分收货, 50-已完成, 90-已关闭
--    映射: 1→10, 2→20, 3→40, 4→50, 5→90
--    注：如需数据迁移，请手动执行以下语句（注释状态）
-- ==========================================
-- INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, order_date, total_amount, status, create_time)
-- SELECT order_no, supplier_id, '', order_date, total_amount,
--   CASE status
--     WHEN 1 THEN 10  -- 待确认 → 草稿
--     WHEN 2 THEN 20  -- 已确认 → 待审批
--     WHEN 3 THEN 40  -- 部分到货 → 部分收货
--     WHEN 4 THEN 50  -- 已完成 → 已完成
--     WHEN 5 THEN 90  -- 已取消 → 已关闭
--     ELSE 10
--   END,
--   create_time
-- FROM pur_order_deprecated
-- WHERE po_no NOT IN (SELECT po_no FROM pur_purchase_order);

-- ==========================================
-- 5. 验证
-- ==========================================
-- 验证新表存在且字段完整
SELECT 'pur_purchase_order' AS table_name,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order') AS column_count,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order' AND column_name IN
        ('id','po_no','supplier_id','supplier_name','order_date','total_amount','status',
         'audit_by','audit_time','close_by','close_time','close_reason','deleted')) AS key_columns_present
UNION ALL
SELECT 'pur_purchase_order_line',
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order_line'),
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'pur_purchase_order_line' AND column_name IN
        ('id','po_id','line_no','material_id','order_qty','received_qty','returned_qty','unit_price','amount'));
