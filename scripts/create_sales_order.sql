-- 创建销售订单主表
CREATE TABLE IF NOT EXISTS sal_order (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '订单ID',
  order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号，如SO20240115001',
  customer_id BIGINT UNSIGNED COMMENT '客户ID',
  customer_name VARCHAR(200) NOT NULL COMMENT '客户名称',
  order_date DATE NOT NULL COMMENT '订单日期',
  delivery_date DATE COMMENT '交货日期',
  total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '订单总金额',
  currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  status VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft草稿,confirmed已确认,producing生产中,completed已完成,cancelled已取消',
  remark TEXT COMMENT '备注',
  salesman_id BIGINT UNSIGNED COMMENT '业务员ID',
  salesman_name VARCHAR(100) COMMENT '业务员名称',
  create_by BIGINT UNSIGNED COMMENT '创建人ID',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by BIGINT UNSIGNED COMMENT '更新人ID',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT DEFAULT 0 COMMENT '删除标记：0未删除，1已删除',
  INDEX idx_order_no (order_no),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_order_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售订单主表';

-- 创建销售订单明细表
CREATE TABLE IF NOT EXISTS sal_order_item (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '明细ID',
  order_id BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
  material_id BIGINT UNSIGNED COMMENT '物料ID',
  material_code VARCHAR(50) COMMENT '物料编码',
  material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
  specification VARCHAR(500) COMMENT '规格型号',
  quantity DECIMAL(15,3) NOT NULL COMMENT '数量',
  unit VARCHAR(20) COMMENT '单位',
  unit_price DECIMAL(15,4) NOT NULL COMMENT '单价',
  total_price DECIMAL(15,2) NOT NULL COMMENT '总价',
  remark TEXT COMMENT '备注',
  sort_order INT DEFAULT 0 COMMENT '排序号',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (order_id) REFERENCES sal_order(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售订单明细表';

-- 插入示例数据
INSERT INTO sal_order (order_no, customer_name, order_date, delivery_date, total_amount, status, salesman_name, remark) VALUES
('SO20240115001', '深圳伟业科技有限公司', '2024-01-15', '2024-01-18', 125000.00, 'producing', '张三', '丝网印刷订单'),
('SO20240115002', '广州华达包装有限公司', '2024-01-15', '2024-01-20', 85000.00, 'confirmed', '李四', '包装盒印刷'),
('SO20240115003', '东莞恒通新材料', '2024-01-15', '2024-01-22', 45000.00, 'draft', '王五', '标签印刷'),
('SO20240115004', '佛山利达印刷厂', '2024-01-14', '2024-01-16', 168000.00, 'completed', '张三', '大批量订单'),
('SO20240115005', '中山新材科技', '2024-01-15', '2024-01-19', 72000.00, 'producing', '李四', '新材料试用');
