-- 创建工单主表
CREATE TABLE IF NOT EXISTS prod_work_order (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '工单ID',
  work_order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '工单号，如WO20240115001',
  order_id BIGINT UNSIGNED COMMENT '关联销售订单ID',
  order_no VARCHAR(50) COMMENT '关联销售订单号',
  customer_name VARCHAR(200) COMMENT '客户名称',
  product_name VARCHAR(200) COMMENT '产品名称',
  quantity DECIMAL(15,2) DEFAULT 0 COMMENT '生产数量',
  unit VARCHAR(20) COMMENT '单位',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending待生产,producing生产中,completed已完成,cancelled已取消',
  priority VARCHAR(20) DEFAULT 'normal' COMMENT '优先级：low低,normal正常,high高,urgent紧急',
  plan_start_date DATE COMMENT '计划开始日期',
  plan_end_date DATE COMMENT '计划完成日期',
  actual_start_date DATE COMMENT '实际开始日期',
  actual_end_date DATE COMMENT '实际完成日期',
  remark TEXT COMMENT '备注',
  create_by BIGINT UNSIGNED COMMENT '创建人ID',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by BIGINT UNSIGNED COMMENT '更新人ID',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT DEFAULT 0 COMMENT '删除标记：0未删除，1已删除',
  INDEX idx_work_order_no (work_order_no),
  INDEX idx_order_no (order_no),
  INDEX idx_status (status),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产工单主表';

-- 创建工单明细表
CREATE TABLE IF NOT EXISTS prod_work_order_item (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '明细ID',
  work_order_id BIGINT UNSIGNED NOT NULL COMMENT '工单ID',
  material_name VARCHAR(200) COMMENT '物料名称',
  quantity DECIMAL(15,2) DEFAULT 0 COMMENT '数量',
  unit VARCHAR(20) COMMENT '单位',
  unit_price DECIMAL(15,2) DEFAULT 0 COMMENT '单价',
  total_price DECIMAL(15,2) DEFAULT 0 COMMENT '总价',
  remark TEXT COMMENT '备注',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_work_order_id (work_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产工单明细表';
