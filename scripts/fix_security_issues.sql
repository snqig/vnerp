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
  scope_type VARCHAR(20) NOT NULL COMMENT '权限范围：all全部，dept部门，self本人',
  dept_ids TEXT COMMENT '可见部门ID列表（逗号分隔）',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_role (role_id),
  INDEX idx_scope (scope_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据权限范围表';

-- =====================================================
-- 完成
-- =====================================================
SELECT '安全修复脚本执行完成' as message;
