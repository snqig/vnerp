-- ============================================================
-- Migration 026: 补齐缺失的标准审计字段
--
-- 背景：根据《项目整体分析报告》P2 #7（审计字段命名不统一）+ P2 #9（软删除不统一）
-- 35+ 张表缺失标准审计字段（create_time/update_time/create_by/update_by/deleted）
--
-- 字段标准定义：
--   create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
--   update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
--   create_by BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID'
--   update_by BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID'
--   deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除: 0-正常, 1-已删除'
--
-- 幂等模式：所有 ALTER 用 INFORMATION_SCHEMA 守卫
-- ============================================================

-- ===== A. 补 create_time（4 表：inv_inventory, fin_account, fin_period, fin_account_balance）=====

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory' AND COLUMN_NAME='create_time');
SET @sql = IF(@col=0, 'ALTER TABLE inv_inventory ADD COLUMN create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间''', 'SELECT ''inv_inventory.create_time exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account' AND COLUMN_NAME='create_time');
SET @sql = IF(@col=0, 'ALTER TABLE fin_account ADD COLUMN create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间''', 'SELECT ''fin_account.create_time exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_period' AND COLUMN_NAME='create_time');
SET @sql = IF(@col=0, 'ALTER TABLE fin_period ADD COLUMN create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间''', 'SELECT ''fin_period.create_time exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='create_time');
SET @sql = IF(@col=0, 'ALTER TABLE fin_account_balance ADD COLUMN create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT ''创建时间''', 'SELECT ''fin_account_balance.create_time exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== B. 补 update_time（6 表）=====

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='qc_inspection' AND COLUMN_NAME='update_time');
SET @sql = IF(@col=0, 'ALTER TABLE qc_inspection ADD COLUMN update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''', 'SELECT ''qc_inspection.update_time exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='material_batch_costs' AND COLUMN_NAME='update_time');
SET @sql = IF(@col=0, 'ALTER TABLE material_batch_costs ADD COLUMN update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''', 'SELECT ''material_batch_costs.update_time exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_voucher' AND COLUMN_NAME='update_time');
SET @sql = IF(@col=0, 'ALTER TABLE fin_voucher ADD COLUMN update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''', 'SELECT ''fin_voucher.update_time exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account' AND COLUMN_NAME='update_time');
SET @sql = IF(@col=0, 'ALTER TABLE fin_account ADD COLUMN update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''', 'SELECT ''fin_account.update_time exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_period' AND COLUMN_NAME='update_time');
SET @sql = IF(@col=0, 'ALTER TABLE fin_period ADD COLUMN update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''', 'SELECT ''fin_period.update_time exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='update_time');
SET @sql = IF(@col=0, 'ALTER TABLE fin_account_balance ADD COLUMN update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间''', 'SELECT ''fin_account_balance.update_time exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== C. 补 create_by + update_by（35 表，每张表一个 ALTER ADD 多列）=====

-- 系统模块
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_department' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE sys_department ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''sys_department audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_role' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE sys_role ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''sys_role audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_menu' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE sys_menu ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''sys_menu audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_dict_type' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE sys_dict_type ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''sys_dict_type audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_dict_data' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE sys_dict_data ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''sys_dict_data audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_config' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE sys_config ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''sys_config audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 客户模块
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_customer_contact' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE crm_customer_contact ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''crm_customer_contact audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 仓储模块
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_material_category' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_material_category ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_material_category audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_warehouse' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_warehouse ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_warehouse audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_inventory ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_inventory audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inventory_batch' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_inventory_batch ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_inventory_batch audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_inbound_order' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_inbound_order ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_inbound_order audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_outbound_order' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_outbound_order ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_outbound_order audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_transfer_order' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_transfer_order ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_transfer_order audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stocktaking' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_stocktaking ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_stocktaking audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_stock_adjust' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_stock_adjust ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_stock_adjust audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_sales_outbound' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_sales_outbound ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_sales_outbound audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_production_inbound' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_production_inbound ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_production_inbound audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inv_unit_conversion' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE inv_unit_conversion ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''inv_unit_conversion audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 质量模块
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='qc_inspection' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE qc_inspection ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''qc_inspection audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 财务模块
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_receivable' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE fin_receivable ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''fin_receivable audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_payable' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE fin_payable ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''fin_payable audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE fin_account ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''fin_account audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_period' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE fin_period ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''fin_period audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE fin_account_balance ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''fin_account_balance audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 生产/设备模块
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eqp_equipment' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE eqp_equipment ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''eqp_equipment audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_schedule' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE prd_schedule ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''prd_schedule audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='work_order_costs' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE work_order_costs ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''work_order_costs audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='material_batch_costs' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE material_batch_costs ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''material_batch_costs audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 领退料模块
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='material_requisitions' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE material_requisitions ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''material_requisitions audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='material_returns' AND COLUMN_NAME='create_by');
SET @sql = IF(@col=0, 'ALTER TABLE material_returns ADD COLUMN create_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''创建人ID'', ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''material_returns audit fields exist'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 仅补 update_by 的表（已有 create_by）
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_standard_card' AND COLUMN_NAME='update_by');
SET @sql = IF(@col=0, 'ALTER TABLE prd_standard_card ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''prd_standard_card.update_by exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_work_order' AND COLUMN_NAME='update_by');
SET @sql = IF(@col=0, 'ALTER TABLE prd_work_order ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''prd_work_order.update_by exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_bom' AND COLUMN_NAME='update_by');
SET @sql = IF(@col=0, 'ALTER TABLE prd_bom ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''prd_bom.update_by exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_voucher' AND COLUMN_NAME='update_by');
SET @sql = IF(@col=0, 'ALTER TABLE fin_voucher ADD COLUMN update_by BIGINT UNSIGNED DEFAULT NULL COMMENT ''更新人ID''', 'SELECT ''fin_voucher.update_by exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===== D. 补 deleted（14 表，仅业务主表）=====

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_menu' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE sys_menu ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sys_menu.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_dict_type' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE sys_dict_type ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sys_dict_type.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_dict_data' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE sys_dict_data ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sys_dict_data.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sys_config' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE sys_config ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''sys_config.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_work_order' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE prd_work_order ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''prd_work_order.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prd_bom' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE prd_bom ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''prd_bom.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_receivable' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE fin_receivable ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''fin_receivable.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_payable' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE fin_payable ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''fin_payable.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='work_order_costs' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE work_order_costs ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''work_order_costs.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='material_batch_costs' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE material_batch_costs ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''material_batch_costs.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE fin_account ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''fin_account.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_period' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE fin_period ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''fin_period.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fin_account_balance' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE fin_account_balance ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''fin_account_balance.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='qc_inspection' AND COLUMN_NAME='deleted');
SET @sql = IF(@col=0, 'ALTER TABLE qc_inspection ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''', 'SELECT ''qc_inspection.deleted exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 验证：检查仍缺失标准审计字段的业务主表
SELECT TABLE_NAME,
  MAX(CASE WHEN COLUMN_NAME='create_time' THEN 1 ELSE 0 END) AS has_create_time,
  MAX(CASE WHEN COLUMN_NAME='update_time' THEN 1 ELSE 0 END) AS has_update_time,
  MAX(CASE WHEN COLUMN_NAME='create_by' THEN 1 ELSE 0 END) AS has_create_by,
  MAX(CASE WHEN COLUMN_NAME='update_by' THEN 1 ELSE 0 END) AS has_update_by,
  MAX(CASE WHEN COLUMN_NAME='deleted' THEN 1 ELSE 0 END) AS has_deleted
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('inv_inventory','fin_account','fin_period','fin_account_balance','qc_inspection','prd_work_order','prd_bom','fin_receivable','fin_payable','sys_menu','sys_dict_type','sys_dict_data','sys_config')
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;
