-- ============================================================
-- Migration 029: 批量 FK - P0 核心业务（15 个）
--
-- 背景：根据《项目整体分析报告》P0 #2（外键约束缺失）
--   补全 P0 核心业务 FK，覆盖销售/仓储/采购/生产主从表关联
--
-- 前置条件：Migration 027/028 已统一采购和总账模块主键类型
--
-- 操作顺序：
--   A. 类型对齐（3 处阻塞项：inv_inbound_item.order_id/material_id,
--      pur_purchase_order.supplier_id, pur_purchase_order_line.material_id）
--   B. 索引补建（prd_work_order.sales_order_id 缺索引）
--   C. 15 个 P0 FK 添加
--
-- ON DELETE 策略：
--   - 明细表（detail/item/line）→ CASCADE（主表删则明细同删）
--   - 主数据引用（material/warehouse/customer/supplier）→ RESTRICT
--   - 可空引用（order_id 可空的 delivery/return/work_order）→ SET NULL
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== A. 类型对齐 =====

-- A1. inv_inbound_item.order_id: INT → BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND COLUMN_NAME = 'order_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_inbound_item MODIFY COLUMN order_id BIGINT UNSIGNED NOT NULL COMMENT ''入库单ID''',
  'SELECT ''inv_inbound_item.order_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- A2. inv_inbound_item.material_id: INT → BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND COLUMN_NAME = 'material_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE inv_inbound_item MODIFY COLUMN material_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''物料ID''',
  'SELECT ''inv_inbound_item.material_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- A3. pur_purchase_order.supplier_id: INT UNSIGNED → BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND COLUMN_NAME = 'supplier_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_order MODIFY COLUMN supplier_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''供应商ID''',
  'SELECT ''pur_purchase_order.supplier_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- A4. pur_purchase_order_line.material_id: INT UNSIGNED → BIGINT UNSIGNED
SET @curr = (SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND COLUMN_NAME = 'material_id');
SET @sql = IF(@curr IS NOT NULL AND @curr NOT LIKE 'bigint%unsigned%',
  'ALTER TABLE pur_purchase_order_line MODIFY COLUMN material_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''物料ID''',
  'SELECT ''pur_purchase_order_line.material_id already bigint unsigned'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== B. 索引补建 =====

-- B1. prd_work_order.sales_order_id 缺索引（FK 前置条件）
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order' AND INDEX_NAME = 'idx_sales_order');
SET @sql = IF(@idx = 0,
  'ALTER TABLE prd_work_order ADD INDEX idx_sales_order (sales_order_id)',
  'SELECT ''idx_sales_order already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== C. P0 核心 FK 添加（15 个）=====

-- C1. sal_order_detail.order_id → sal_order.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_order_detail' AND CONSTRAINT_NAME = 'fk_sal_order_detail_order');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sal_order_detail ADD CONSTRAINT fk_sal_order_detail_order FOREIGN KEY (order_id) REFERENCES sal_order (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_sal_order_detail_order already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C2. sal_order.customer_id → crm_customer.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_order' AND CONSTRAINT_NAME = 'fk_sal_order_customer');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sal_order ADD CONSTRAINT fk_sal_order_customer FOREIGN KEY (customer_id) REFERENCES crm_customer (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_sal_order_customer already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C3. sal_order_detail.material_id → inv_material.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_order_detail' AND CONSTRAINT_NAME = 'fk_sal_order_detail_material');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sal_order_detail ADD CONSTRAINT fk_sal_order_detail_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_sal_order_detail_material already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C4. sal_delivery.order_id → sal_order.id（order_id 可空，SET NULL）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND CONSTRAINT_NAME = 'fk_sal_delivery_order');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sal_delivery ADD CONSTRAINT fk_sal_delivery_order FOREIGN KEY (order_id) REFERENCES sal_order (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_sal_delivery_order already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C5. sal_return.order_id → sal_order.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return' AND CONSTRAINT_NAME = 'fk_sal_return_order');
SET @sql = IF(@fk = 0,
  'ALTER TABLE sal_return ADD CONSTRAINT fk_sal_return_order FOREIGN KEY (order_id) REFERENCES sal_order (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_sal_return_order already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C6. inv_inventory.material_id → inv_material.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory' AND CONSTRAINT_NAME = 'fk_inv_inventory_material');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_inventory ADD CONSTRAINT fk_inv_inventory_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_inv_inventory_material already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C7. inv_inventory.warehouse_id → inv_warehouse.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory' AND CONSTRAINT_NAME = 'fk_inv_inventory_warehouse');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_inventory ADD CONSTRAINT fk_inv_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_inv_inventory_warehouse already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C8. inv_inventory_batch.material_id → inv_material.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch' AND CONSTRAINT_NAME = 'fk_inv_inventory_batch_material');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_inventory_batch ADD CONSTRAINT fk_inv_inventory_batch_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_inv_inventory_batch_material already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C9. inv_inventory_batch.warehouse_id → inv_warehouse.id（warehouse_id 可空，SET NULL）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch' AND CONSTRAINT_NAME = 'fk_inv_inventory_batch_warehouse');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_inventory_batch ADD CONSTRAINT fk_inv_inventory_batch_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_inv_inventory_batch_warehouse already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C10. inv_inbound_item.order_id → inv_inbound_order.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inbound_item' AND CONSTRAINT_NAME = 'fk_inv_inbound_item_order');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_inbound_item ADD CONSTRAINT fk_inv_inbound_item_order FOREIGN KEY (order_id) REFERENCES inv_inbound_order (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_inv_inbound_item_order already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C11. inv_outbound_item.order_id → inv_outbound_order.id（修正：列名为 order_id 非 outbound_id）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_item' AND CONSTRAINT_NAME = 'fk_inv_outbound_item_order');
SET @sql = IF(@fk = 0,
  'ALTER TABLE inv_outbound_item ADD CONSTRAINT fk_inv_outbound_item_order FOREIGN KEY (order_id) REFERENCES inv_outbound_order (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT ''fk_inv_outbound_item_order already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C12. pur_purchase_order.supplier_id → pur_supplier.id（可空，SET NULL）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order' AND CONSTRAINT_NAME = 'fk_pur_po_supplier');
SET @sql = IF(@fk = 0,
  'ALTER TABLE pur_purchase_order ADD CONSTRAINT fk_pur_po_supplier FOREIGN KEY (supplier_id) REFERENCES pur_supplier (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_pur_po_supplier already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C13. pur_purchase_order_line.material_id → inv_material.id（可空，SET NULL）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line' AND CONSTRAINT_NAME = 'fk_pur_line_material');
SET @sql = IF(@fk = 0,
  'ALTER TABLE pur_purchase_order_line ADD CONSTRAINT fk_pur_line_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_pur_line_material already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C14. prd_work_order.material_id → inv_material.id
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order' AND CONSTRAINT_NAME = 'fk_prd_wo_material');
SET @sql = IF(@fk = 0,
  'ALTER TABLE prd_work_order ADD CONSTRAINT fk_prd_wo_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT ''fk_prd_wo_material already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- C15. prd_work_order.sales_order_id → sal_order.id（可空，SET NULL）
SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order' AND CONSTRAINT_NAME = 'fk_prd_wo_sales_order');
SET @sql = IF(@fk = 0,
  'ALTER TABLE prd_work_order ADD CONSTRAINT fk_prd_wo_sales_order FOREIGN KEY (sales_order_id) REFERENCES sal_order (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_prd_wo_sales_order already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== D. 验证：检查 P0 FK 已添加 =====
SELECT
  TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
  AND CONSTRAINT_NAME IN (
    'fk_sal_order_detail_order', 'fk_sal_order_customer', 'fk_sal_order_detail_material',
    'fk_sal_delivery_order', 'fk_sal_return_order',
    'fk_inv_inventory_material', 'fk_inv_inventory_warehouse',
    'fk_inv_inventory_batch_material', 'fk_inv_inventory_batch_warehouse',
    'fk_inv_inbound_item_order', 'fk_inv_outbound_item_order',
    'fk_pur_po_supplier', 'fk_pur_line_material',
    'fk_prd_wo_material', 'fk_prd_wo_sales_order'
  )
ORDER BY TABLE_NAME;
