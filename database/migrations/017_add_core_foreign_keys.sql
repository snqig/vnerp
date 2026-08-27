-- ============================================================
-- Migration 017: 补充核心外键约束
-- 日期: 2026-07-07
-- 目的: 修复 database-design-analysis.html 报告中识别的 P0 严重问题
--       "87 张表仅 3 个外键约束，依赖应用层维护父子关系"
-- 策略:
--   1. 仅对类型完全匹配的列对添加 FK（BIGINT UNSIGNED → BIGINT UNSIGNED）
--   2. 强父子关系（主表-明细表）使用 ON DELETE CASCADE
--   3. 弱关联关系（如订单-客户）使用 ON DELETE RESTRICT
--   4. 可空外键使用 ON DELETE SET NULL
--   5. 使用 INFORMATION_SCHEMA 守卫保证幂等
--   6. migrate.ts 按分号分割，禁止使用存储过程
-- ============================================================

-- ========================================================
-- 一、销售模块外键（6 个）
-- ========================================================

-- sal_order.customer_id → crm_customer.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_order' AND CONSTRAINT_NAME = 'fk_sal_order_customer');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sal_order ADD CONSTRAINT fk_sal_order_customer FOREIGN KEY (customer_id) REFERENCES crm_customer(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sal_delivery.order_id → sal_order.id (可空，订单可删除时置空)
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND CONSTRAINT_NAME = 'fk_sal_delivery_order');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sal_delivery ADD CONSTRAINT fk_sal_delivery_order FOREIGN KEY (order_id) REFERENCES sal_order(id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sal_delivery_detail.delivery_id → sal_delivery.id (强父子，CASCADE)
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery_detail' AND CONSTRAINT_NAME = 'fk_sal_delivery_detail_delivery');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sal_delivery_detail ADD CONSTRAINT fk_sal_delivery_detail_delivery FOREIGN KEY (delivery_id) REFERENCES sal_delivery(id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sal_delivery_detail.material_id → inv_material.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery_detail' AND CONSTRAINT_NAME = 'fk_sal_delivery_detail_material');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sal_delivery_detail ADD CONSTRAINT fk_sal_delivery_detail_material FOREIGN KEY (material_id) REFERENCES inv_material(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sal_return.order_id → sal_order.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return' AND CONSTRAINT_NAME = 'fk_sal_return_order');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sal_return ADD CONSTRAINT fk_sal_return_order FOREIGN KEY (order_id) REFERENCES sal_order(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sal_return_detail.return_id → sal_return.id (强父子，CASCADE)
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_detail' AND CONSTRAINT_NAME = 'fk_sal_return_detail_return');
SET @sql = IF(@cnt = 0, 'ALTER TABLE sal_return_detail ADD CONSTRAINT fk_sal_return_detail_return FOREIGN KEY (return_id) REFERENCES sal_return(id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 二、库存模块外键（7 个）
-- ========================================================

-- inv_inventory.material_id → inv_material.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory' AND CONSTRAINT_NAME = 'fk_inv_inventory_material');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_inventory ADD CONSTRAINT fk_inv_inventory_material FOREIGN KEY (material_id) REFERENCES inv_material(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_inventory.warehouse_id → inv_warehouse.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory' AND CONSTRAINT_NAME = 'fk_inv_inventory_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_inventory ADD CONSTRAINT fk_inv_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_inventory_batch.material_id → inv_material.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch' AND CONSTRAINT_NAME = 'fk_inv_inventory_batch_material');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_inventory_batch ADD CONSTRAINT fk_inv_inventory_batch_material FOREIGN KEY (material_id) REFERENCES inv_material(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_inventory_batch.warehouse_id → inv_warehouse.id (可空)
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_batch' AND CONSTRAINT_NAME = 'fk_inv_inventory_batch_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_inventory_batch ADD CONSTRAINT fk_inv_inventory_batch_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse(id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_outbound_order.warehouse_id → inv_warehouse.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND CONSTRAINT_NAME = 'fk_inv_outbound_order_warehouse');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_outbound_order ADD CONSTRAINT fk_inv_outbound_order_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_outbound_order.customer_id → crm_customer.id (可空，仅销售出库用)
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND CONSTRAINT_NAME = 'fk_inv_outbound_order_customer');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_outbound_order ADD CONSTRAINT fk_inv_outbound_order_customer FOREIGN KEY (customer_id) REFERENCES crm_customer(id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inv_outbound_order.work_order_id → prd_work_order.id (可空，仅生产出库用)
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_outbound_order' AND CONSTRAINT_NAME = 'fk_inv_outbound_order_workorder');
SET @sql = IF(@cnt = 0, 'ALTER TABLE inv_outbound_order ADD CONSTRAINT fk_inv_outbound_order_workorder FOREIGN KEY (work_order_id) REFERENCES prd_work_order(id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 三、生产模块外键（3 个）
-- ========================================================

-- prd_work_order.sales_order_id → sal_order.id (可空)
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order' AND CONSTRAINT_NAME = 'fk_prd_work_order_sales_order');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_work_order ADD CONSTRAINT fk_prd_work_order_sales_order FOREIGN KEY (sales_order_id) REFERENCES sal_order(id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prd_work_order.material_id → inv_material.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order' AND CONSTRAINT_NAME = 'fk_prd_work_order_material');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_work_order ADD CONSTRAINT fk_prd_work_order_material FOREIGN KEY (material_id) REFERENCES inv_material(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prd_work_order_color_seq.work_order_id → prd_work_order.id (强父子，CASCADE)
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_work_order_color_seq' AND CONSTRAINT_NAME = 'fk_prd_wo_color_seq_workorder');
SET @sql = IF(@cnt = 0, 'ALTER TABLE prd_work_order_color_seq ADD CONSTRAINT fk_prd_wo_color_seq_workorder FOREIGN KEY (work_order_id) REFERENCES prd_work_order(id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 四、财务模块外键（2 个）
-- ========================================================

-- fin_receivable.customer_id → crm_customer.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_receivable' AND CONSTRAINT_NAME = 'fk_fin_receivable_customer');
SET @sql = IF(@cnt = 0, 'ALTER TABLE fin_receivable ADD CONSTRAINT fk_fin_receivable_customer FOREIGN KEY (customer_id) REFERENCES crm_customer(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fin_payable.supplier_id → pur_supplier.id
SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fin_payable' AND CONSTRAINT_NAME = 'fk_fin_payable_supplier');
SET @sql = IF(@cnt = 0, 'ALTER TABLE fin_payable ADD CONSTRAINT fk_fin_payable_supplier FOREIGN KEY (supplier_id) REFERENCES pur_supplier(id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================================
-- 五、外键添加后校验（输出当前 FK 总数）
-- ========================================================
SELECT CONCAT('外键总数: ', COUNT(*)) AS fk_summary
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY';
