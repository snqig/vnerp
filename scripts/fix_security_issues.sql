-- =====================================================
-- ERP系统安全修复脚本
-- 修复内容：
-- 1. 添加乐观锁版本字段（防止库存并发超卖）
-- 2. 添加常用查询字段索引
-- 3. 添加唯一约束防止重复数据
-- =====================================================

-- =====================================================
-- 1. 库存表添加乐观锁版本字段
-- =====================================================

-- 检查并添加version字段到库存批次表
SET @exist := (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inv_inventory_batch' 
               AND column_name = 'version');

SET @sql := IF(@exist = 0, 
    'ALTER TABLE inv_inventory_batch ADD COLUMN version INT UNSIGNED DEFAULT 1 COMMENT "乐观锁版本号" AFTER available_qty',
    'SELECT "version字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加version字段到入库单表
SET @exist := (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inv_inbound_order' 
               AND column_name = 'version');

SET @sql := IF(@exist = 0, 
    'ALTER TABLE inv_inbound_order ADD COLUMN version INT UNSIGNED DEFAULT 1 COMMENT "乐观锁版本号"',
    'SELECT "version字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加version字段到出库单表
SET @exist := (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inv_outbound_order' 
               AND column_name = 'version');

SET @sql := IF(@exist = 0, 
    'ALTER TABLE inv_outbound_order ADD COLUMN version INT UNSIGNED DEFAULT 1 COMMENT "乐观锁版本号"',
    'SELECT "version字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. 添加常用查询字段索引
-- =====================================================

-- 销售订单表索引
ALTER TABLE sal_order ADD INDEX idx_status (status);
ALTER TABLE sal_order ADD INDEX idx_customer (customer_id);
ALTER TABLE sal_order ADD INDEX idx_order_date (order_date);
ALTER TABLE sal_order ADD INDEX idx_status_date (status, order_date);

-- 工单表索引
ALTER TABLE prod_work_order ADD INDEX idx_status (status);
ALTER TABLE prod_work_order ADD INDEX idx_order_no (order_no);
ALTER TABLE prod_work_order ADD INDEX idx_customer (customer_name);

-- 库存批次表索引（已存在部分索引，添加复合索引）
ALTER TABLE inv_inventory_batch ADD INDEX idx_material_warehouse (material_id, warehouse_id);
ALTER TABLE inv_inventory_batch ADD INDEX idx_batch_material (batch_no, material_id);

-- 入库单表索引
ALTER TABLE inv_inbound_order ADD INDEX idx_status (status);
ALTER TABLE inv_inbound_order ADD INDEX idx_warehouse (warehouse_id);
ALTER TABLE inv_inbound_order ADD INDEX idx_order_date (order_date);
ALTER TABLE inv_inbound_order ADD INDEX idx_supplier (supplier_name);

-- 出库单表索引
ALTER TABLE inv_outbound_order ADD INDEX idx_status (status);
ALTER TABLE inv_outbound_order ADD INDEX idx_warehouse (warehouse_id);
ALTER TABLE inv_outbound_order ADD INDEX idx_order_date (order_date);

-- 库存交易记录表索引
ALTER TABLE inv_inventory_transaction ADD INDEX idx_trans_type (trans_type);
ALTER TABLE inv_inventory_transaction ADD INDEX idx_batch_no (batch_no);
ALTER TABLE inv_inventory_transaction ADD INDEX idx_source (source_type, source_no);
ALTER TABLE inv_inventory_transaction ADD INDEX idx_operated_at (operated_at);

-- 用户表索引
ALTER TABLE sys_user ADD INDEX idx_username (username);
ALTER TABLE sys_user ADD INDEX idx_status (status);
ALTER TABLE sys_user ADD INDEX idx_dept (department_id);

-- =====================================================
-- 3. 添加金额字段注释，提醒使用整数分存储
-- =====================================================

-- 修改销售订单金额字段为整数分存储（如果还没改）
-- 注意：这需要在应用层同步修改
-- ALTER TABLE sal_order MODIFY COLUMN total_amount BIGINT NOT NULL DEFAULT 0 COMMENT '订单总金额（分）';

-- 修改工单金额字段
-- ALTER TABLE prod_work_order MODIFY COLUMN quantity BIGINT NOT NULL DEFAULT 0 COMMENT '数量（最小单位）';

-- =====================================================
-- 4. 添加审计日志表
-- =====================================================

CREATE TABLE IF NOT EXISTS sys_audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  user_id BIGINT UNSIGNED COMMENT '操作用户ID',
  username VARCHAR(100) COMMENT '操作用户名',
  operation VARCHAR(100) NOT NULL COMMENT '操作类型',
  module VARCHAR(100) COMMENT '操作模块',
  description TEXT COMMENT '操作描述',
  request_method VARCHAR(10) COMMENT '请求方法',
  request_url VARCHAR(500) COMMENT '请求URL',
  request_params TEXT COMMENT '请求参数（敏感信息脱敏）',
  response_code INT COMMENT '响应状态码',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  user_agent VARCHAR(500) COMMENT '用户代理',
  execution_time INT COMMENT '执行时间（毫秒）',
  status TINYINT DEFAULT 1 COMMENT '状态：1成功，0失败',
  error_msg TEXT COMMENT '错误信息',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user (user_id),
  INDEX idx_operation (operation),
  INDEX idx_module (module),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统审计日志表';

-- =====================================================
-- 5. 添加数据权限范围配置表
-- =====================================================

CREATE TABLE IF NOT EXISTS sys_data_scope (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ID',
  role_id BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  scope_type VARCHAR(20) NOT NULL COMMENT '权限维度：dept部门，warehouse仓库，customer客户，supplier供应商',
  target_ids TEXT COMMENT '可见目标ID列表（逗号分隔）',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_role_scope (role_id, scope_type),
  INDEX idx_scope (scope_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据权限范围表';

-- =====================================================
-- 6. 采购退货表
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_return (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '退货单ID',
  return_no VARCHAR(50) NOT NULL COMMENT '退货单号',
  order_id BIGINT UNSIGNED COMMENT '关联采购订单ID',
  order_no VARCHAR(50) COMMENT '关联采购订单号',
  supplier_id BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
  supplier_name VARCHAR(200) COMMENT '供应商名称',
  warehouse_id BIGINT UNSIGNED DEFAULT 1 COMMENT '退货仓库ID',
  return_date DATE NOT NULL COMMENT '退货日期',
  return_type VARCHAR(20) DEFAULT 'quality' COMMENT '退货类型：quality质量问题/quantity数量差异/other其他',
  total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '退货金额（不含税）',
  tax_amount DECIMAL(15,2) DEFAULT 0 COMMENT '税额',
  grand_total DECIMAL(15,2) DEFAULT 0 COMMENT '价税合计',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending待审核/approved已审核/completed已完成/cancelled已取消',
  remark TEXT COMMENT '备注',
  create_by BIGINT UNSIGNED COMMENT '创建人ID',
  audit_by BIGINT UNSIGNED COMMENT '审核人ID',
  audit_time DATETIME COMMENT '审核时间',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_return_no (return_no),
  INDEX idx_supplier (supplier_id),
  INDEX idx_order (order_id),
  INDEX idx_status (status),
  INDEX idx_return_date (return_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购退货单';

CREATE TABLE IF NOT EXISTS purchase_return_item (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '退货明细ID',
  return_id BIGINT UNSIGNED NOT NULL COMMENT '退货单ID',
  line_no INT NOT NULL COMMENT '行号',
  order_item_id BIGINT UNSIGNED COMMENT '关联采购订单明细ID',
  material_id BIGINT UNSIGNED COMMENT '物料ID',
  material_code VARCHAR(100) COMMENT '物料编码',
  material_name VARCHAR(200) COMMENT '物料名称',
  material_spec VARCHAR(200) COMMENT '规格型号',
  unit VARCHAR(50) DEFAULT '件' COMMENT '单位',
  return_qty DECIMAL(15,4) NOT NULL COMMENT '退货数量',
  unit_price DECIMAL(15,4) DEFAULT 0 COMMENT '单价',
  amount DECIMAL(15,2) DEFAULT 0 COMMENT '金额',
  tax_rate DECIMAL(5,2) DEFAULT 13 COMMENT '税率',
  tax_amount DECIMAL(15,2) DEFAULT 0 COMMENT '税额',
  line_total DECIMAL(15,2) DEFAULT 0 COMMENT '行合计',
  remark TEXT COMMENT '备注',
  INDEX idx_return_id (return_id),
  INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购退货明细';

-- =====================================================
-- 7. 销售退货表
-- =====================================================

CREATE TABLE IF NOT EXISTS sales_return (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '退货单ID',
  return_no VARCHAR(50) NOT NULL COMMENT '退货单号',
  order_id BIGINT UNSIGNED COMMENT '关联销售订单ID',
  order_no VARCHAR(50) COMMENT '关联销售订单号',
  customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
  customer_name VARCHAR(200) COMMENT '客户名称',
  warehouse_id BIGINT UNSIGNED DEFAULT 1 COMMENT '退货入库仓库ID',
  return_date DATE NOT NULL COMMENT '退货日期',
  return_type VARCHAR(20) DEFAULT 'quality' COMMENT '退货类型：quality质量问题/wrong发错货/other其他',
  total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '退货金额（不含税）',
  tax_amount DECIMAL(15,2) DEFAULT 0 COMMENT '税额',
  grand_total DECIMAL(15,2) DEFAULT 0 COMMENT '价税合计',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending待审核/approved已审核/completed已完成/cancelled已取消',
  remark TEXT COMMENT '备注',
  create_by BIGINT UNSIGNED COMMENT '创建人ID',
  audit_by BIGINT UNSIGNED COMMENT '审核人ID',
  audit_time DATETIME COMMENT '审核时间',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_return_no (return_no),
  INDEX idx_customer (customer_id),
  INDEX idx_order (order_id),
  INDEX idx_status (status),
  INDEX idx_return_date (return_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售退货单';

CREATE TABLE IF NOT EXISTS sales_return_item (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '退货明细ID',
  return_id BIGINT UNSIGNED NOT NULL COMMENT '退货单ID',
  line_no INT NOT NULL COMMENT '行号',
  order_item_id BIGINT UNSIGNED COMMENT '关联销售订单明细ID',
  material_id BIGINT UNSIGNED COMMENT '物料ID',
  material_code VARCHAR(100) COMMENT '物料编码',
  material_name VARCHAR(200) COMMENT '物料名称',
  material_spec VARCHAR(200) COMMENT '规格型号',
  unit VARCHAR(50) DEFAULT '件' COMMENT '单位',
  return_qty DECIMAL(15,4) NOT NULL COMMENT '退货数量',
  unit_price DECIMAL(15,4) DEFAULT 0 COMMENT '单价',
  amount DECIMAL(15,2) DEFAULT 0 COMMENT '金额',
  tax_rate DECIMAL(5,2) DEFAULT 13 COMMENT '税率',
  tax_amount DECIMAL(15,2) DEFAULT 0 COMMENT '税额',
  line_total DECIMAL(15,2) DEFAULT 0 COMMENT '行合计',
  remark TEXT COMMENT '备注',
  INDEX idx_return_id (return_id),
  INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售退货明细';

-- =====================================================
-- 8. 定时任务表
-- =====================================================

CREATE TABLE IF NOT EXISTS sys_scheduled_task (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '任务ID',
  task_name VARCHAR(200) NOT NULL COMMENT '任务名称',
  task_type VARCHAR(50) NOT NULL COMMENT '任务类型：inventory_alert/data_cleanup/report_generation',
  task_group VARCHAR(50) DEFAULT 'default' COMMENT '任务分组',
  cron_expression VARCHAR(100) COMMENT 'Cron表达式',
  description TEXT COMMENT '任务描述',
  config TEXT COMMENT '任务配置（JSON）',
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态：active/paused',
  last_execute_time DATETIME COMMENT '最后执行时间',
  last_result TEXT COMMENT '最后执行结果',
  create_by BIGINT UNSIGNED COMMENT '创建人',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_task_type (task_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='定时任务表';

CREATE TABLE IF NOT EXISTS sys_task_execution_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  task_id BIGINT UNSIGNED NOT NULL COMMENT '任务ID',
  task_name VARCHAR(200) COMMENT '任务名称',
  start_time DATETIME COMMENT '开始时间',
  end_time DATETIME COMMENT '结束时间',
  status VARCHAR(20) DEFAULT 'running' COMMENT '状态：running/success/failed',
  result TEXT COMMENT '执行结果',
  INDEX idx_task_id (task_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务执行日志';

-- =====================================================
-- 9. 发票管理表
-- =====================================================

CREATE TABLE IF NOT EXISTS finance_invoice (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '发票ID',
  invoice_no VARCHAR(50) NOT NULL COMMENT '发票号',
  invoice_type VARCHAR(20) NOT NULL COMMENT '发票类型：purchase采购/sales销售',
  source_type VARCHAR(50) COMMENT '来源类型',
  source_id BIGINT UNSIGNED COMMENT '来源单据ID',
  source_no VARCHAR(50) COMMENT '来源单据号',
  partner_id BIGINT UNSIGNED NOT NULL COMMENT '往来单位ID',
  partner_name VARCHAR(200) COMMENT '往来单位名称',
  invoice_date DATE NOT NULL COMMENT '开票日期',
  tax_rate DECIMAL(5,2) DEFAULT 13 COMMENT '税率',
  total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '金额（不含税）',
  tax_amount DECIMAL(15,2) DEFAULT 0 COMMENT '税额',
  grand_total DECIMAL(15,2) DEFAULT 0 COMMENT '价税合计',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending/approved/written_off/cancelled',
  remark TEXT COMMENT '备注',
  create_by BIGINT UNSIGNED COMMENT '创建人',
  audit_by BIGINT UNSIGNED COMMENT '审核人',
  audit_time DATETIME COMMENT '审核时间',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_invoice_no (invoice_no),
  INDEX idx_type (invoice_type),
  INDEX idx_partner (partner_id),
  INDEX idx_status (status),
  INDEX idx_date (invoice_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发票表';

CREATE TABLE IF NOT EXISTS finance_invoice_item (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '明细ID',
  invoice_id BIGINT UNSIGNED NOT NULL COMMENT '发票ID',
  line_no INT NOT NULL COMMENT '行号',
  material_id BIGINT UNSIGNED COMMENT '物料ID',
  material_name VARCHAR(200) COMMENT '物料名称',
  material_spec VARCHAR(200) COMMENT '规格型号',
  quantity DECIMAL(15,4) COMMENT '数量',
  unit VARCHAR(50) DEFAULT '件' COMMENT '单位',
  unit_price DECIMAL(15,4) DEFAULT 0 COMMENT '单价',
  amount DECIMAL(15,2) DEFAULT 0 COMMENT '金额',
  tax_rate DECIMAL(5,2) DEFAULT 13 COMMENT '税率',
  tax_amount DECIMAL(15,2) DEFAULT 0 COMMENT '税额',
  line_total DECIMAL(15,2) DEFAULT 0 COMMENT '行合计',
  INDEX idx_invoice_id (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发票明细';

CREATE TABLE IF NOT EXISTS finance_write_off (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '核销ID',
  invoice_id BIGINT UNSIGNED NOT NULL COMMENT '发票ID',
  invoice_no VARCHAR(50) COMMENT '发票号',
  invoice_type VARCHAR(20) COMMENT '发票类型',
  payable_id BIGINT UNSIGNED COMMENT '应付单ID',
  receivable_id BIGINT UNSIGNED COMMENT '应收单ID',
  write_off_amount DECIMAL(15,2) NOT NULL COMMENT '核销金额',
  write_off_by BIGINT UNSIGNED COMMENT '核销人',
  write_off_time DATETIME COMMENT '核销时间',
  INDEX idx_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发票核销记录';

-- =====================================================
-- 10. 操作日志增加业务关联字段
-- =====================================================

-- 添加 business_type 和 business_id 字段
SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_operation_log'
               AND column_name = 'business_type');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_operation_log ADD COLUMN business_type VARCHAR(50) COMMENT ''业务类型'' AFTER status',
    'SELECT "business_type字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_operation_log'
               AND column_name = 'business_id');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_operation_log ADD COLUMN business_id VARCHAR(100) COMMENT ''业务单据ID'' AFTER business_type',
    'SELECT "business_id字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_operation_log'
               AND column_name = 'request_params');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_operation_log ADD COLUMN request_params TEXT COMMENT ''请求参数'' AFTER business_id',
    'SELECT "request_params字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_operation_log'
               AND column_name = 'response_result');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_operation_log ADD COLUMN response_result TEXT COMMENT ''响应结果'' AFTER request_params',
    'SELECT "response_result字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 11. 用户表增加密码更新时间字段
-- =====================================================

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_user'
               AND column_name = 'pwd_update_time');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_user ADD COLUMN pwd_update_time DATETIME COMMENT ''密码最后更新时间'' AFTER first_login',
    'SELECT "pwd_update_time字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 12. 库存冻结表
-- =====================================================

CREATE TABLE IF NOT EXISTS inv_stock_freeze (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '冻结ID',
  material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  freeze_quantity DECIMAL(15,4) NOT NULL COMMENT '冻结数量',
  freeze_type VARCHAR(30) DEFAULT 'manual' COMMENT '冻结类型：manual手动/sales_order销售订单/quality_check质检/other其他',
  reason TEXT COMMENT '冻结原因',
  source_type VARCHAR(50) COMMENT '来源类型',
  source_id BIGINT UNSIGNED COMMENT '来源单据ID',
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态：active冻结/released已释放',
  create_by BIGINT UNSIGNED COMMENT '创建人',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  release_by BIGINT UNSIGNED COMMENT '释放人',
  release_time DATETIME COMMENT '释放时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_material_warehouse (material_id, warehouse_id),
  INDEX idx_status (status),
  INDEX idx_freeze_type (freeze_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存冻结记录';

-- 给stock表添加frozen_qty字段
SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'stock'
               AND column_name = 'frozen_qty');

SET @sql := IF(@exist = 0,
    'ALTER TABLE stock ADD COLUMN frozen_qty DECIMAL(15,4) DEFAULT 0 COMMENT ''冻结数量'' AFTER quantity',
    'SELECT "frozen_qty字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 13. 多单位换算表
-- =====================================================

CREATE TABLE IF NOT EXISTS inv_unit_conversion (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '换算ID',
  material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  from_unit VARCHAR(50) NOT NULL COMMENT '源单位',
  to_unit VARCHAR(50) NOT NULL COMMENT '目标单位',
  ratio DECIMAL(15,4) NOT NULL COMMENT '换算比例（1 from_unit = ratio to_unit）',
  is_default TINYINT DEFAULT 0 COMMENT '是否默认换算',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_material_units (material_id, from_unit, to_unit),
  INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单位换算关系';

-- =====================================================
-- 14. 库存预警规则表
-- =====================================================

CREATE TABLE IF NOT EXISTS inv_alert_rule (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '规则ID',
  rule_name VARCHAR(200) NOT NULL COMMENT '规则名称',
  material_id BIGINT UNSIGNED COMMENT '物料ID（空表示全局规则）',
  warehouse_id BIGINT UNSIGNED COMMENT '仓库ID（空表示全局规则）',
  alert_type VARCHAR(30) NOT NULL COMMENT '预警类型：low_stock低库存/expiry_near即将过期/over_stock超储',
  threshold DECIMAL(15,4) COMMENT '阈值',
  notify_method VARCHAR(30) DEFAULT 'in_app' COMMENT '通知方式：in_app站内信/email邮件/sms短信',
  notify_users VARCHAR(500) COMMENT '通知用户ID列表（逗号分隔）',
  enabled TINYINT DEFAULT 1 COMMENT '是否启用',
  create_by BIGINT UNSIGNED COMMENT '创建人',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT DEFAULT 0 COMMENT '是否删除',
  INDEX idx_material (material_id),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存预警规则';

-- =====================================================
-- 15. 系统通知表
-- =====================================================

CREATE TABLE IF NOT EXISTS sys_notification (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '通知ID',
  type VARCHAR(30) NOT NULL COMMENT '通知类型：inventory_alert/system/task等',
  title VARCHAR(200) NOT NULL COMMENT '通知标题',
  content TEXT COMMENT '通知内容',
  user_id BIGINT UNSIGNED COMMENT '接收用户ID（空表示广播）',
  is_read TINYINT DEFAULT 0 COMMENT '是否已读',
  read_time DATETIME COMMENT '阅读时间',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_read (is_read),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统通知';

-- =====================================================
-- 16. 盘点差异处理字段
-- =====================================================

-- 给盘点明细表添加差异处理字段
SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'inv_stocktaking_item'
               AND column_name = 'diff_status');

SET @sql := IF(@exist = 0,
    'ALTER TABLE inv_stocktaking_item ADD COLUMN diff_status VARCHAR(20) DEFAULT ''pending'' COMMENT ''差异状态：pending待处理/approved已审批/processed已处理/rejected已驳回'' AFTER difference_reason',
    'SELECT "diff_status字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'inv_stocktaking_item'
               AND column_name = 'diff_approver');

SET @sql := IF(@exist = 0,
    'ALTER TABLE inv_stocktaking_item ADD COLUMN diff_approver BIGINT UNSIGNED COMMENT ''差异审批人'' AFTER diff_status',
    'SELECT "diff_approver字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'inv_stocktaking_item'
               AND column_name = 'diff_approve_time');

SET @sql := IF(@exist = 0,
    'ALTER TABLE inv_stocktaking_item ADD COLUMN diff_approve_time DATETIME COMMENT ''差异审批时间'' AFTER diff_approver',
    'SELECT "diff_approve_time字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'inv_stocktaking_item'
               AND column_name = 'diff_reason');

SET @sql := IF(@exist = 0,
    'ALTER TABLE inv_stocktaking_item ADD COLUMN diff_reason TEXT COMMENT ''差异原因/审批意见'' AFTER diff_approve_time',
    'SELECT "diff_reason字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'inv_stocktaking_item'
               AND column_name = 'process_time');

SET @sql := IF(@exist = 0,
    'ALTER TABLE inv_stocktaking_item ADD COLUMN process_time DATETIME COMMENT ''处理时间'' AFTER diff_reason',
    'SELECT "process_time字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 17. 角色权限继承
-- =====================================================

-- 给角色表添加父角色字段
SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_role'
               AND column_name = 'parent_id');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_role ADD COLUMN parent_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''父角色ID（用于权限继承）'' AFTER role_code',
    'SELECT "parent_id字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 给角色表添加继承模式字段
SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_role'
               AND column_name = 'inherit_mode');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_role ADD COLUMN inherit_mode VARCHAR(20) DEFAULT ''merge'' COMMENT ''继承模式：merge合并父权限/override覆盖父权限'' AFTER parent_id',
    'SELECT "inherit_mode字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 18. 登录安全相关表和字段
-- =====================================================

-- 用户登录失败记录表
CREATE TABLE IF NOT EXISTS sys_login_attempt (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ID',
  username VARCHAR(100) NOT NULL COMMENT '用户名',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  user_agent VARCHAR(500) COMMENT '用户代理',
  status VARCHAR(20) NOT NULL COMMENT '状态：success成功/failed失败/locked锁定',
  fail_reason VARCHAR(200) COMMENT '失败原因',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_username (username),
  INDEX idx_ip (ip_address),
  INDEX idx_status (status),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录尝试记录';

-- 用户表添加登录安全字段
SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_user'
               AND column_name = 'login_fail_count');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_user ADD COLUMN login_fail_count INT DEFAULT 0 COMMENT ''连续登录失败次数'' AFTER pwd_update_time',
    'SELECT "login_fail_count字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_user'
               AND column_name = 'lock_until');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_user ADD COLUMN lock_until DATETIME DEFAULT NULL COMMENT ''锁定截止时间'' AFTER login_fail_count',
    'SELECT "lock_until字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_user'
               AND column_name = 'last_login_ip');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_user ADD COLUMN last_login_ip VARCHAR(50) COMMENT ''最后登录IP'' AFTER lock_until',
    'SELECT "last_login_ip字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
               AND table_name = 'sys_user'
               AND column_name = 'last_login_time');

SET @sql := IF(@exist = 0,
    'ALTER TABLE sys_user ADD COLUMN last_login_time DATETIME COMMENT ''最后登录时间'' AFTER last_login_ip',
    'SELECT "last_login_time字段已存在" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 19. 系统公告表
-- =====================================================

CREATE TABLE IF NOT EXISTS sys_announcement (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '公告ID',
  title VARCHAR(200) NOT NULL COMMENT '公告标题',
  content TEXT NOT NULL COMMENT '公告内容',
  type VARCHAR(20) DEFAULT 'info' COMMENT '类型：info通知/warning警告/urgent紧急',
  priority INT DEFAULT 0 COMMENT '优先级（越大越靠前）',
  is_top TINYINT DEFAULT 0 COMMENT '是否置顶',
  publish_time DATETIME COMMENT '发布时间',
  expire_time DATETIME COMMENT '过期时间',
  status VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft草稿/published已发布/expired已过期',
  create_by BIGINT UNSIGNED COMMENT '创建人',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_status (status),
  INDEX idx_publish_time (publish_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统公告';

-- 公告阅读记录
CREATE TABLE IF NOT EXISTS sys_announcement_read (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ID',
  announcement_id BIGINT UNSIGNED NOT NULL COMMENT '公告ID',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  read_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
  UNIQUE KEY uk_announcement_user (announcement_id, user_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告阅读记录';

-- =====================================================
-- 20. 字典管理表
-- =====================================================

CREATE TABLE IF NOT EXISTS sys_dict_type (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '字典类型ID',
  dict_name VARCHAR(100) NOT NULL COMMENT '字典名称',
  dict_type VARCHAR(100) NOT NULL COMMENT '字典类型编码',
  status TINYINT DEFAULT 1 COMMENT '状态：1启用/0停用',
  remark VARCHAR(500) COMMENT '备注',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_dict_type (dict_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典类型';

CREATE TABLE IF NOT EXISTS sys_dict_data (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '字典数据ID',
  dict_type VARCHAR(100) NOT NULL COMMENT '字典类型编码',
  dict_label VARCHAR(200) NOT NULL COMMENT '字典标签',
  dict_value VARCHAR(200) NOT NULL COMMENT '字典值',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status TINYINT DEFAULT 1 COMMENT '状态：1启用/0停用',
  remark VARCHAR(500) COMMENT '备注',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_dict_type (dict_type),
  INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典数据';

-- =====================================================
-- 21. 费用报销表
-- =====================================================

CREATE TABLE IF NOT EXISTS finance_expense (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '报销单ID',
  expense_no VARCHAR(50) NOT NULL COMMENT '报销单号',
  applicant_id BIGINT UNSIGNED NOT NULL COMMENT '申请人ID',
  expense_type VARCHAR(30) NOT NULL COMMENT '费用类型：office办公/travel差旅/entertainment招待/other其他',
  amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '报销金额',
  expense_date DATE NOT NULL COMMENT '费用日期',
  description TEXT COMMENT '说明',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending待审核/approved已审核/rejected已驳回/paid已支付',
  approve_by BIGINT UNSIGNED COMMENT '审核人',
  approve_time DATETIME COMMENT '审核时间',
  reject_reason TEXT COMMENT '驳回原因',
  create_by BIGINT UNSIGNED COMMENT '创建人',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT DEFAULT 0 COMMENT '是否删除',
  UNIQUE KEY uk_expense_no (expense_no),
  INDEX idx_applicant (applicant_id),
  INDEX idx_status (status),
  INDEX idx_expense_date (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='费用报销单';

CREATE TABLE IF NOT EXISTS finance_expense_item (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '明细ID',
  expense_id BIGINT UNSIGNED NOT NULL COMMENT '报销单ID',
  line_no INT NOT NULL COMMENT '行号',
  expense_category VARCHAR(50) COMMENT '费用科目',
  description VARCHAR(500) COMMENT '说明',
  amount DECIMAL(15,2) DEFAULT 0 COMMENT '金额',
  remark TEXT COMMENT '备注',
  INDEX idx_expense_id (expense_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='费用报销明细';

-- =====================================================
-- 完成
-- =====================================================
SELECT '安全修复脚本执行完成' as message;
