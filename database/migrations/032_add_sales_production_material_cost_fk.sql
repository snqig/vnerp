-- ============================================================
-- Migration 032: 批量 FK - 销售+生产+领退料+成本（33 个业务 FK）
--
-- 背景：根据《项目整体分析报告》P0 #2（外键约束缺失）
--   补全 4 个模块的业务关联 FK（不含审计字段 FK，留待 034）
--
-- 前置条件：Migration 029/030/031 已完成
--
-- 涉及模块：
--   销售（13 个）：sal_order, sal_delivery, sal_delivery_detail, sal_return,
--                 sal_return_detail, sal_reconciliation
--   生产（8 个）：prd_bom, prd_bom_detail, prd_schedule, prd_schedule_detail,
--                 prd_standard_card
--   领退料（9 个）：material_requisitions, material_requisition_items,
--                   material_returns, material_return_items
--   成本（3 个）：work_order_costs, material_batch_costs
--
-- 审计字段 FK（create_by/update_by → sys_user.id 共 27 个）留待 Migration 034
--   原因：需先补 18 个索引，且优先级低于业务 FK
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== A. 索引补建（3 个，FK 前置条件）=====

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return' AND INDEX_NAME = 'idx_inbound_order');
SET @sql = IF(@idx = 0, 'ALTER TABLE sal_return ADD INDEX idx_inbound_order (inbound_order_id)', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return' AND INDEX_NAME = 'idx_receivable');
SET @sql = IF(@idx = 0, 'ALTER TABLE sal_return ADD INDEX idx_receivable (receivable_id)', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_detail' AND INDEX_NAME = 'idx_delivery_detail');
SET @sql = IF(@idx = 0, 'ALTER TABLE sal_return_detail ADD INDEX idx_delivery_detail (delivery_detail_id)', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== B. 销售模块（13 个业务 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_order' AND CONSTRAINT_NAME = 'fk_sal_order_salesman');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_order ADD CONSTRAINT fk_sal_order_salesman FOREIGN KEY (salesman_id) REFERENCES sys_user (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND CONSTRAINT_NAME = 'fk_sal_delivery_customer');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_delivery ADD CONSTRAINT fk_sal_delivery_customer FOREIGN KEY (customer_id) REFERENCES crm_customer (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery' AND CONSTRAINT_NAME = 'fk_sal_delivery_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_delivery ADD CONSTRAINT fk_sal_delivery_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_delivery_detail' AND CONSTRAINT_NAME = 'fk_sal_delivery_detail_order_detail');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_delivery_detail ADD CONSTRAINT fk_sal_delivery_detail_order_detail FOREIGN KEY (order_detail_id) REFERENCES sal_order_detail (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return' AND CONSTRAINT_NAME = 'fk_sal_return_customer');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_return ADD CONSTRAINT fk_sal_return_customer FOREIGN KEY (customer_id) REFERENCES crm_customer (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return' AND CONSTRAINT_NAME = 'fk_sal_return_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_return ADD CONSTRAINT fk_sal_return_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return' AND CONSTRAINT_NAME = 'fk_sal_return_delivery');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_return ADD CONSTRAINT fk_sal_return_delivery FOREIGN KEY (delivery_id) REFERENCES sal_delivery (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return' AND CONSTRAINT_NAME = 'fk_sal_return_inbound');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_return ADD CONSTRAINT fk_sal_return_inbound FOREIGN KEY (inbound_order_id) REFERENCES inv_inbound_order (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return' AND CONSTRAINT_NAME = 'fk_sal_return_receivable');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_return ADD CONSTRAINT fk_sal_return_receivable FOREIGN KEY (receivable_id) REFERENCES fin_receivable (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_detail' AND CONSTRAINT_NAME = 'fk_sal_return_detail_delivery_detail');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_return_detail ADD CONSTRAINT fk_sal_return_detail_delivery_detail FOREIGN KEY (delivery_detail_id) REFERENCES sal_delivery_detail (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_detail' AND CONSTRAINT_NAME = 'fk_sal_return_detail_order_detail');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_return_detail ADD CONSTRAINT fk_sal_return_detail_order_detail FOREIGN KEY (order_detail_id) REFERENCES sal_order_detail (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_return_detail' AND CONSTRAINT_NAME = 'fk_sal_return_detail_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_return_detail ADD CONSTRAINT fk_sal_return_detail_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sal_reconciliation' AND CONSTRAINT_NAME = 'fk_sal_recon_customer');
SET @sql = IF(@fk = 0, 'ALTER TABLE sal_reconciliation ADD CONSTRAINT fk_sal_recon_customer FOREIGN KEY (customer_id) REFERENCES crm_customer (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== C. 生产模块（8 个业务 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_bom' AND CONSTRAINT_NAME = 'fk_prd_bom_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE prd_bom ADD CONSTRAINT fk_prd_bom_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_bom_detail' AND CONSTRAINT_NAME = 'fk_prd_bom_detail_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE prd_bom_detail ADD CONSTRAINT fk_prd_bom_detail_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_schedule' AND CONSTRAINT_NAME = 'fk_prd_schedule_order');
SET @sql = IF(@fk = 0, 'ALTER TABLE prd_schedule ADD CONSTRAINT fk_prd_schedule_order FOREIGN KEY (order_id) REFERENCES sal_order (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_schedule' AND CONSTRAINT_NAME = 'fk_prd_schedule_work_order');
SET @sql = IF(@fk = 0, 'ALTER TABLE prd_schedule ADD CONSTRAINT fk_prd_schedule_work_order FOREIGN KEY (work_order_id) REFERENCES prd_work_order (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_schedule' AND CONSTRAINT_NAME = 'fk_prd_schedule_product');
SET @sql = IF(@fk = 0, 'ALTER TABLE prd_schedule ADD CONSTRAINT fk_prd_schedule_product FOREIGN KEY (product_id) REFERENCES inv_material (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_schedule_detail' AND CONSTRAINT_NAME = 'fk_prd_schedule_detail_work_order');
SET @sql = IF(@fk = 0, 'ALTER TABLE prd_schedule_detail ADD CONSTRAINT fk_prd_schedule_detail_work_order FOREIGN KEY (work_order_id) REFERENCES prd_work_order (id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_schedule_detail' AND CONSTRAINT_NAME = 'fk_prd_schedule_detail_equipment');
SET @sql = IF(@fk = 0, 'ALTER TABLE prd_schedule_detail ADD CONSTRAINT fk_prd_schedule_detail_equipment FOREIGN KEY (equipment_id) REFERENCES eqp_equipment (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prd_standard_card' AND CONSTRAINT_NAME = 'fk_prd_std_card_customer');
SET @sql = IF(@fk = 0, 'ALTER TABLE prd_standard_card ADD CONSTRAINT fk_prd_std_card_customer FOREIGN KEY (customer_id) REFERENCES crm_customer (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== D. 领退料模块（9 个业务 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_requisitions' AND CONSTRAINT_NAME = 'fk_mat_req_work_order');
SET @sql = IF(@fk = 0, 'ALTER TABLE material_requisitions ADD CONSTRAINT fk_mat_req_work_order FOREIGN KEY (work_order_id) REFERENCES prd_work_order (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_requisitions' AND CONSTRAINT_NAME = 'fk_mat_req_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE material_requisitions ADD CONSTRAINT fk_mat_req_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_requisitions' AND CONSTRAINT_NAME = 'fk_mat_req_original');
SET @sql = IF(@fk = 0, 'ALTER TABLE material_requisitions ADD CONSTRAINT fk_mat_req_original FOREIGN KEY (original_requisition_id) REFERENCES material_requisitions (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_requisition_items' AND CONSTRAINT_NAME = 'fk_mat_req_item_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE material_requisition_items ADD CONSTRAINT fk_mat_req_item_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_returns' AND CONSTRAINT_NAME = 'fk_mat_ret_work_order');
SET @sql = IF(@fk = 0, 'ALTER TABLE material_returns ADD CONSTRAINT fk_mat_ret_work_order FOREIGN KEY (work_order_id) REFERENCES prd_work_order (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_returns' AND CONSTRAINT_NAME = 'fk_mat_ret_requisition');
SET @sql = IF(@fk = 0, 'ALTER TABLE material_returns ADD CONSTRAINT fk_mat_ret_requisition FOREIGN KEY (requisition_id) REFERENCES material_requisitions (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_returns' AND CONSTRAINT_NAME = 'fk_mat_ret_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE material_returns ADD CONSTRAINT fk_mat_ret_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_return_items' AND CONSTRAINT_NAME = 'fk_mat_ret_item_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE material_return_items ADD CONSTRAINT fk_mat_ret_item_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== E. 成本模块（3 个业务 FK）=====

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_order_costs' AND CONSTRAINT_NAME = 'fk_wo_cost_work_order');
SET @sql = IF(@fk = 0, 'ALTER TABLE work_order_costs ADD CONSTRAINT fk_wo_cost_work_order FOREIGN KEY (work_order_id) REFERENCES prd_work_order (id) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_batch_costs' AND CONSTRAINT_NAME = 'fk_mat_batch_cost_material');
SET @sql = IF(@fk = 0, 'ALTER TABLE material_batch_costs ADD CONSTRAINT fk_mat_batch_cost_material FOREIGN KEY (material_id) REFERENCES inv_material (id) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'material_batch_costs' AND CONSTRAINT_NAME = 'fk_mat_batch_cost_warehouse');
SET @sql = IF(@fk = 0, 'ALTER TABLE material_batch_costs ADD CONSTRAINT fk_mat_batch_cost_warehouse FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse (id) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT ''exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== F. 验证：4 模块业务 FK 总数 =====
SELECT
  CASE
    WHEN TABLE_NAME LIKE 'sal_%' THEN '销售'
    WHEN TABLE_NAME LIKE 'prd_%' THEN '生产'
    WHEN TABLE_NAME LIKE 'material_%' THEN '领退料'
    WHEN TABLE_NAME IN ('work_order_costs','material_batch_costs') THEN '成本'
  END AS module,
  COUNT(*) AS fk_count
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND (
    TABLE_NAME LIKE 'sal_%' OR TABLE_NAME LIKE 'prd_%'
    OR TABLE_NAME LIKE 'material_%'
    OR TABLE_NAME IN ('work_order_costs','material_batch_costs')
  )
GROUP BY module
ORDER BY module;
