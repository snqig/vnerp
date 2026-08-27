-- ============================================================
-- 印刷生产经营信息管理系统 Print MIS 系统可审计性核心表结构
-- 文件名: audit_system_tables.sql
-- 说明: 包含操作日志、登录日志、库存流水、财务流水四张核心审计表
-- 原则: 所有操作留痕，所有修改留底，所有单据不可删，所有变动有据可查
-- ============================================================

USE `vnerpdacahng`;

-- ============================================================
-- 1. 操作日志表（核心审计表）
-- 记录所有增、删、改、审核、反审、导入、导出、打印操作
-- ============================================================
CREATE TABLE IF NOT EXISTS `sys_operate_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `module` VARCHAR(64) NOT NULL COMMENT '操作模块: 采购/销售/库存/生产/财务/系统',
  `type` VARCHAR(32) NOT NULL COMMENT '操作类型: 新增/修改/删除/审核/反审/作废/导入/导出/打印/登录/登出',
  `title` VARCHAR(128) COMMENT '操作标题/单据编号',
  `username` VARCHAR(64) NOT NULL COMMENT '操作人用户名',
  `user_id` BIGINT UNSIGNED COMMENT '操作人ID',
  `content` VARCHAR(1000) COMMENT '操作内容描述',
  `before_data` LONGTEXT COMMENT '修改前数据（JSON格式）',
  `after_data` LONGTEXT COMMENT '修改后数据（JSON格式）',
  `ip` VARCHAR(50) COMMENT '客户端IP地址',
  `user_agent` VARCHAR(500) COMMENT '浏览器/设备信息',
  `request_url` VARCHAR(255) COMMENT '请求URL',
  `request_method` VARCHAR(16) COMMENT '请求方法: GET/POST/PUT/DELETE',
  `request_param` LONGTEXT COMMENT '请求参数（JSON格式，已脱敏）',
  `response_result` LONGTEXT COMMENT '响应结果（JSON格式，已脱敏）',
  `status` TINYINT DEFAULT 1 COMMENT '操作状态: 0-失败, 1-成功',
  `error_msg` VARCHAR(500) COMMENT '错误信息',
  `duration_ms` INT COMMENT '执行耗时（毫秒）',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module`),
  KEY `idx_type` (`type`),
  KEY `idx_username` (`username`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_module_type` (`module`, `type`),
  KEY `idx_title` (`title`),
  KEY `idx_ip` (`ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统操作日志表（不可修改/不可删除）';

-- ============================================================
-- 2. 登录日志表
-- 记录所有登录、登出、异常登录行为
-- ============================================================
CREATE TABLE IF NOT EXISTS `sys_login_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `username` VARCHAR(64) NOT NULL COMMENT '登录用户名',
  `user_id` BIGINT UNSIGNED COMMENT '用户ID',
  `login_type` TINYINT DEFAULT 1 COMMENT '登录类型: 1-账号密码, 2-手机验证码, 3-扫码登录',
  `status` TINYINT DEFAULT 1 COMMENT '登录状态: 0-失败, 1-成功',
  `ip` VARCHAR(50) COMMENT 'IP地址',
  `address` VARCHAR(255) COMMENT '登录地点（IP解析）',
  `browser` VARCHAR(255) COMMENT '浏览器信息',
  `os` VARCHAR(100) COMMENT '操作系统',
  `device` VARCHAR(100) COMMENT '设备类型',
  `error_msg` VARCHAR(255) COMMENT '失败原因',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_ip` (`ip`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_username_time` (`username`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统登录日志表';

-- ============================================================
-- 3. 库存流水表（不可修改、不可删除）
-- 每一次库存变动必须生成流水，永久留存
-- ============================================================
CREATE TABLE IF NOT EXISTS `stock_flow` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '流水ID',
  `flow_no` VARCHAR(64) NOT NULL COMMENT '流水号（唯一）',
  `business_type` VARCHAR(64) NOT NULL COMMENT '业务类型: 采购入库/销售出库/生产领料/生产入库/盘点/调拨/退货',
  `source_type` VARCHAR(50) COMMENT '来源单据类型: purchase_order/sales_order/work_order/stocktaking/transfer',
  `source_no` VARCHAR(64) COMMENT '来源单据号',
  `source_id` BIGINT COMMENT '来源单据ID',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `warehouse_name` VARCHAR(100) COMMENT '仓库名称',
  `material_id` BIGINT UNSIGNED COMMENT '物料ID',
  `material_code` VARCHAR(50) COMMENT '物料编码',
  `material_name` VARCHAR(100) COMMENT '物料名称',
  `product_id` BIGINT UNSIGNED COMMENT '产品ID（成品库存用）',
  `product_code` VARCHAR(50) COMMENT '产品编码',
  `product_name` VARCHAR(100) COMMENT '产品名称',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '变动数量（正数入库，负数出库）',
  `stock_before` DECIMAL(18,4) NOT NULL COMMENT '变动前库存',
  `stock_after` DECIMAL(18,4) NOT NULL COMMENT '变动后库存',
  `unit_price` DECIMAL(12,4) DEFAULT 0 COMMENT '单价',
  `total_amount` DECIMAL(14,2) DEFAULT 0 COMMENT '总金额',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `create_by` VARCHAR(64) COMMENT '操作人',
  `create_by_id` BIGINT COMMENT '操作人ID',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间（不可修改）',
  `remark` VARCHAR(500) COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_flow_no` (`flow_no`),
  KEY `idx_business_type` (`business_type`),
  KEY `idx_source` (`source_type`, `source_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_batch_no` (`batch_no`),
  KEY `idx_create_by` (`create_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存流水表（不可修改/不可删除）';

-- ============================================================
-- 4. 财务流水表
-- 所有财务变动自动生成流水，确保财务数据可追溯
-- ============================================================
CREATE TABLE IF NOT EXISTS `finance_flow` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '流水ID',
  `flow_no` VARCHAR(64) NOT NULL COMMENT '流水号（唯一）',
  `type` VARCHAR(32) NOT NULL COMMENT '类型: 应收/实收/应付/实付/收款/付款/转账',
  `sub_type` VARCHAR(32) COMMENT '子类型: 销售应收/采购应付/工资/费用/退款',
  `source_type` VARCHAR(50) COMMENT '来源单据类型: sales_order/purchase_order/voucher',
  `source_no` VARCHAR(64) COMMENT '来源单据号',
  `source_id` BIGINT COMMENT '来源单据ID',
  `customer_id` BIGINT COMMENT '客户ID（应收用）',
  `customer_name` VARCHAR(100) COMMENT '客户名称',
  `supplier_id` BIGINT COMMENT '供应商ID（应付用）',
  `supplier_name` VARCHAR(100) COMMENT '供应商名称',
  `amount` DECIMAL(14,2) NOT NULL COMMENT '金额（正数增加，负数减少）',
  `balance_before` DECIMAL(14,2) DEFAULT 0 COMMENT '变动前余额',
  `balance_after` DECIMAL(14,2) DEFAULT 0 COMMENT '变动后余额',
  `currency` VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` DECIMAL(10,6) DEFAULT 1.000000 COMMENT '汇率',
  `account_code` VARCHAR(50) COMMENT '科目编码',
  `account_name` VARCHAR(100) COMMENT '科目名称',
  `voucher_no` VARCHAR(64) COMMENT '凭证号',
  `period` VARCHAR(20) COMMENT '会计期间: YYYY-MM',
  `create_by` VARCHAR(64) COMMENT '操作人',
  `create_by_id` BIGINT COMMENT '操作人ID',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间（不可修改）',
  `remark` VARCHAR(500) COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_flow_no` (`flow_no`),
  KEY `idx_type` (`type`),
  KEY `idx_source` (`source_type`, `source_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_voucher` (`voucher_no`),
  KEY `idx_period` (`period`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_create_by` (`create_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='财务流水表（不可修改/不可删除）';

-- ============================================================
-- 5. 数据变更历史表（用于关键字段变更追踪）
-- 记录金额、数量、价格、状态等关键字段的修改前后值
-- ============================================================
CREATE TABLE IF NOT EXISTS `data_change_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `table_name` VARCHAR(64) NOT NULL COMMENT '表名',
  `record_id` BIGINT NOT NULL COMMENT '记录ID',
  `record_no` VARCHAR(64) COMMENT '单据编号',
  `field_name` VARCHAR(64) NOT NULL COMMENT '字段名',
  `field_label` VARCHAR(64) COMMENT '字段中文名',
  `old_value` VARCHAR(500) COMMENT '修改前值',
  `new_value` VARCHAR(500) COMMENT '修改后值',
  `change_type` VARCHAR(32) DEFAULT 'update' COMMENT '变更类型: insert/update/delete',
  `module` VARCHAR(64) COMMENT '所属模块',
  `username` VARCHAR(64) COMMENT '操作人',
  `user_id` BIGINT COMMENT '操作人ID',
  `ip` VARCHAR(50) COMMENT 'IP地址',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',
  PRIMARY KEY (`id`),
  KEY `idx_table_record` (`table_name`, `record_id`),
  KEY `idx_record_no` (`record_no`),
  KEY `idx_field_name` (`field_name`),
  KEY `idx_module` (`module`),
  KEY `idx_username` (`username`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据变更历史表';

-- ============================================================
-- 6. 权限变更日志表
-- 记录角色、权限、用户权限的变更历史
-- ============================================================
CREATE TABLE IF NOT EXISTS `permission_change_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `change_type` VARCHAR(32) NOT NULL COMMENT '变更类型: role/user/menu/permission',
  `target_id` BIGINT NOT NULL COMMENT '目标对象ID',
  `target_name` VARCHAR(100) COMMENT '目标对象名称',
  `action` VARCHAR(32) NOT NULL COMMENT '操作: grant/revoke/update/create/delete',
  `old_value` LONGTEXT COMMENT '变更前数据（JSON）',
  `new_value` LONGTEXT COMMENT '变更后数据（JSON）',
  `username` VARCHAR(64) COMMENT '操作人',
  `user_id` BIGINT COMMENT '操作人ID',
  `ip` VARCHAR(50) COMMENT 'IP地址',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',
  PRIMARY KEY (`id`),
  KEY `idx_change_type` (`change_type`),
  KEY `idx_target_id` (`target_id`),
  KEY `idx_action` (`action`),
  KEY `idx_username` (`username`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限变更日志表';

-- ============================================================
-- 7. 异常登录监控表
-- 记录密码错误、异地登录等异常行为
-- ============================================================
CREATE TABLE IF NOT EXISTS `login_abnormal` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `username` VARCHAR(64) NOT NULL COMMENT '用户名',
  `ip` VARCHAR(50) COMMENT 'IP地址',
  `abnormal_type` VARCHAR(32) NOT NULL COMMENT '异常类型: password_error/location_change/frequency/high_risk_ip',
  `risk_level` TINYINT DEFAULT 1 COMMENT '风险等级: 1-低, 2-中, 3-高',
  `description` VARCHAR(255) COMMENT '异常描述',
  `is_handled` TINYINT DEFAULT 0 COMMENT '是否已处理: 0-否, 1-是',
  `handled_by` VARCHAR(64) COMMENT '处理人',
  `handled_time` DATETIME COMMENT '处理时间',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间',
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`),
  KEY `idx_ip` (`ip`),
  KEY `idx_abnormal_type` (`abnormal_type`),
  KEY `idx_risk_level` (`risk_level`),
  KEY `idx_is_handled` (`is_handled`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='异常登录监控表';

-- ============================================================
-- 8. 单据作废记录表
-- 记录所有被作废的单据，确保数据不可物理删除
-- ============================================================
CREATE TABLE IF NOT EXISTS `document_cancel_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `table_name` VARCHAR(64) NOT NULL COMMENT '表名',
  `record_id` BIGINT NOT NULL COMMENT '记录ID',
  `record_no` VARCHAR(64) NOT NULL COMMENT '单据编号',
  `document_type` VARCHAR(32) NOT NULL COMMENT '单据类型',
  `cancel_reason` VARCHAR(500) NOT NULL COMMENT '作废原因',
  `original_status` VARCHAR(32) COMMENT '原状态',
  `cancel_status` VARCHAR(32) DEFAULT 'cancelled' COMMENT '作废后状态',
  `cancel_by` VARCHAR(64) COMMENT '作废人',
  `cancel_by_id` BIGINT COMMENT '作废人ID',
  `cancel_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作废时间',
  `snapshot_data` LONGTEXT COMMENT '作废时数据快照（JSON）',
  `is_restored` TINYINT DEFAULT 0 COMMENT '是否已恢复: 0-否, 1-是',
  `restore_time` DATETIME COMMENT '恢复时间',
  `restore_by` VARCHAR(64) COMMENT '恢复人',
  PRIMARY KEY (`id`),
  KEY `idx_table_record` (`table_name`, `record_id`),
  KEY `idx_record_no` (`record_no`),
  KEY `idx_document_type` (`document_type`),
  KEY `idx_cancel_by` (`cancel_by`),
  KEY `idx_cancel_time` (`cancel_time`),
  KEY `idx_is_restored` (`is_restored`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='单据作废记录表';

-- ============================================================
-- 创建审计相关视图（方便查询）
-- ============================================================

-- 操作统计视图（按模块统计）
CREATE OR REPLACE VIEW `v_audit_module_stats` AS
SELECT 
  module,
  type,
  COUNT(*) as operation_count,
  SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as fail_count,
  AVG(duration_ms) as avg_duration_ms,
  DATE(create_time) as operation_date
FROM sys_operate_log
GROUP BY module, type, DATE(create_time);

-- 库存流水汇总视图
CREATE OR REPLACE VIEW `v_stock_flow_summary` AS
SELECT 
  business_type,
  warehouse_id,
  warehouse_name,
  DATE(create_time) as flow_date,
  COUNT(*) as flow_count,
  SUM(quantity) as total_quantity,
  SUM(total_amount) as total_amount
FROM stock_flow
GROUP BY business_type, warehouse_id, warehouse_name, DATE(create_time);

-- 财务流水汇总视图
CREATE OR REPLACE VIEW `v_finance_flow_summary` AS
SELECT 
  type,
  sub_type,
  period,
  COUNT(*) as flow_count,
  SUM(amount) as total_amount,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as in_amount,
  SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as out_amount
FROM finance_flow
GROUP BY type, sub_type, period;

-- ============================================================
-- 创建定时清理存储过程（保留最近2年数据，归档到历史表）
-- ============================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS `sp_archive_audit_logs`()
BEGIN
  DECLARE archive_date DATE;
  SET archive_date = DATE_SUB(CURDATE(), INTERVAL 2 YEAR);
  
  -- 归档操作日志（创建历史表如果不存在）
  CREATE TABLE IF NOT EXISTS `sys_operate_log_history` LIKE `sys_operate_log`;
  
  START TRANSACTION;
  
  -- 将2年前的数据移动到历史表
  INSERT INTO `sys_operate_log_history`
  SELECT * FROM `sys_operate_log` WHERE create_time < archive_date;
  
  DELETE FROM `sys_operate_log` WHERE create_time < archive_date;
  
  COMMIT;
END //

CREATE PROCEDURE IF NOT EXISTS `sp_archive_login_logs`()
BEGIN
  DECLARE archive_date DATE;
  SET archive_date = DATE_SUB(CURDATE(), INTERVAL 1 YEAR);
  
  CREATE TABLE IF NOT EXISTS `sys_login_log_history` LIKE `sys_login_log`;
  
  START TRANSACTION;
  
  INSERT INTO `sys_login_log_history`
  SELECT * FROM `sys_login_log` WHERE create_time < archive_date;
  
  DELETE FROM `sys_login_log` WHERE create_time < archive_date;
  
  COMMIT;
END //

DELIMITER ;

-- ============================================================
-- 添加表注释和说明
-- ============================================================

-- 确保现有表也有审计字段（如果不存在则添加）
-- 为关键业务表增加审计字段

-- 采购订单表
ALTER TABLE `pur_purchase_order`
  ADD COLUMN IF NOT EXISTS `audit_by` BIGINT COMMENT '审核人ID',
  ADD COLUMN IF NOT EXISTS `audit_time` DATETIME COMMENT '审核时间',
  ADD COLUMN IF NOT EXISTS `audit_status` TINYINT DEFAULT 0 COMMENT '审核状态: 0-未审核, 1-已审核, 2-已反审';

-- 销售订单表
ALTER TABLE `sal_order`
  ADD COLUMN IF NOT EXISTS `audit_by` BIGINT COMMENT '审核人ID',
  ADD COLUMN IF NOT EXISTS `audit_time` DATETIME COMMENT '审核时间',
  ADD COLUMN IF NOT EXISTS `audit_status` TINYINT DEFAULT 0 COMMENT '审核状态: 0-未审核, 1-已审核, 2-已反审';

-- 生产工单表
ALTER TABLE `prod_work_order`
  ADD COLUMN IF NOT EXISTS `audit_by` BIGINT COMMENT '审核人ID',
  ADD COLUMN IF NOT EXISTS `audit_time` DATETIME COMMENT '审核时间',
  ADD COLUMN IF NOT EXISTS `audit_status` TINYINT DEFAULT 0 COMMENT '审核状态: 0-未审核, 1-已审核, 2-已反审';

-- 出入库单表
ALTER TABLE `warehouse_inbound`
  ADD COLUMN IF NOT EXISTS `audit_by` BIGINT COMMENT '审核人ID',
  ADD COLUMN IF NOT EXISTS `audit_time` DATETIME COMMENT '审核时间',
  ADD COLUMN IF NOT EXISTS `audit_status` TINYINT DEFAULT 0 COMMENT '审核状态: 0-未审核, 1-已审核';

ALTER TABLE `warehouse_outbound`
  ADD COLUMN IF NOT EXISTS `audit_by` BIGINT COMMENT '审核人ID',
  ADD COLUMN IF NOT EXISTS `audit_time` DATETIME COMMENT '审核时间',
  ADD COLUMN IF NOT EXISTS `audit_status` TINYINT DEFAULT 0 COMMENT '审核状态: 0-未审核, 1-已审核';

-- 库存盘点表
ALTER TABLE `warehouse_stocktaking`
  ADD COLUMN IF NOT EXISTS `audit_by` BIGINT COMMENT '审核人ID',
  ADD COLUMN IF NOT EXISTS `audit_time` DATETIME COMMENT '审核时间',
  ADD COLUMN IF NOT EXISTS `audit_status` TINYINT DEFAULT 0 COMMENT '审核状态: 0-未审核, 1-已审核';

-- 应收应付表
ALTER TABLE `fin_receivable`
  ADD COLUMN IF NOT EXISTS `audit_by` BIGINT COMMENT '审核人ID',
  ADD COLUMN IF NOT EXISTS `audit_time` DATETIME COMMENT '审核时间',
  ADD COLUMN IF NOT EXISTS `audit_status` TINYINT DEFAULT 0 COMMENT '审核状态: 0-未审核, 1-已审核';

ALTER TABLE `fin_payable`
  ADD COLUMN IF NOT EXISTS `audit_by` BIGINT COMMENT '审核人ID',
  ADD COLUMN IF NOT EXISTS `audit_time` DATETIME COMMENT '审核时间',
  ADD COLUMN IF NOT EXISTS `audit_status` TINYINT DEFAULT 0 COMMENT '审核状态: 0-未审核, 1-已审核';

-- ============================================================
-- 完成提示
-- ============================================================
SELECT '印刷生产经营信息管理系统 Print MIS 审计系统表创建完成' AS result;
SELECT CONCAT(
  '共创建 ', 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'vnerpdacahng' AND table_name LIKE 'sys_%log%'),
  ' 张日志表, ',
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'vnerpdacahng' AND table_name LIKE '%flow%'),
  ' 张流水表, ',
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'vnerpdacahng' AND table_name LIKE '%audit%'),
  ' 张审计表'
) AS summary;
