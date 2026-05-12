-- 物料生命周期管理模块数据库迁移脚本
-- 创建日期: 2026-05-11
-- 说明: 原材料管理核心字段扩展

-- =============================================
-- 1. 更新 inv_material 表新增字段
-- =============================================
ALTER TABLE `inv_material`
ADD COLUMN IF NOT EXISTS `material_no` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '物料编号' AFTER `id`,
ADD COLUMN IF NOT EXISTS `material_type` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '材质: PET/PP/PE/PVC等' AFTER `spec`,
ADD COLUMN IF NOT EXISTS `thickness` DECIMAL(5,2) COMMENT '厚度(mm)' AFTER `material_type`,
ADD COLUMN IF NOT EXISTS `manufacturer` VARCHAR(100) COMMENT '生产厂家' AFTER `thickness`,
ADD COLUMN IF NOT EXISTS `shelf_life` INT NOT NULL DEFAULT 365 COMMENT '保质期(天)' AFTER `batch_no`,
ADD COLUMN IF NOT EXISTS `production_date` DATE COMMENT '生产日期' AFTER `shelf_life`,
ADD COLUMN IF NOT EXISTS `expire_date` DATE COMMENT '过期日期' AFTER `production_date`,
ADD COLUMN IF NOT EXISTS `warning_days` INT NOT NULL DEFAULT 7 COMMENT '提前预警天数' AFTER `expire_date`,
ADD INDEX IF NOT EXISTS `idx_material_no` (`material_no`),
ADD INDEX IF NOT EXISTS `idx_expire_date` (`expire_date`),
ADD INDEX IF NOT EXISTS `idx_status` (`status`);

-- =============================================
-- 2. 物料保质期预警视图
-- =============================================
CREATE OR REPLACE VIEW `v_material_expiry_warning` AS
SELECT 
  m.id,
  m.material_no,
  m.material_name,
  m.spec,
  m.warehouse_id,
  m.warehouse_name,
  m.stock_qty,
  m.unit,
  m.production_date,
  m.expire_date,
  m.warning_days,
  m.status,
  DATEDIFF(m.expire_date, CURDATE()) as days_until_expiry,
  CASE 
    WHEN DATEDIFF(m.expire_date, CURDATE()) <= 0 THEN '已过期'
    WHEN DATEDIFF(m.expire_date, CURDATE()) <= m.warning_days THEN '即将过期'
    ELSE '正常'
  END as expiry_status,
  CASE 
    WHEN DATEDIFF(m.expire_date, CURDATE()) <= m.warning_days AND DATEDIFF(m.expire_date, CURDATE()) > 0 THEN 1
    ELSE 0
  END as need_warning
FROM inv_material m
WHERE m.deleted = 0 AND m.expire_date IS NOT NULL;

-- =============================================
-- 3. 物料库存预警视图
-- =============================================
CREATE OR REPLACE VIEW `v_material_stock_warning` AS
SELECT 
  m.id,
  m.material_no,
  m.material_name,
  m.spec,
  m.warehouse_id,
  m.warehouse_name,
  m.stock_qty,
  m.min_stock,
  m.max_stock,
  m.unit,
  m.unit_price,
  m.status,
  CASE 
    WHEN m.stock_qty <= 0 THEN '缺货'
    WHEN m.stock_qty <= m.min_stock THEN '库存不足'
    WHEN m.stock_qty >= m.max_stock THEN '库存过高'
    ELSE '正常'
  END as stock_status,
  CASE 
    WHEN m.stock_qty <= 0 THEN 3
    WHEN m.stock_qty <= m.min_stock THEN 2
    WHEN m.stock_qty >= m.max_stock THEN 1
    ELSE 0
  END as warning_level,
  ROUND(m.stock_qty * m.unit_price, 2) as stock_value
FROM inv_material m
WHERE m.deleted = 0;

-- =============================================
-- 4. 物料批次追溯视图
-- =============================================
CREATE OR REPLACE VIEW `v_material_batch_trace` AS
SELECT 
  b.id as batch_id,
  b.material_id,
  m.material_no,
  m.material_name,
  m.spec,
  b.batch_no,
  b.quantity,
  b.available_qty,
  b.locked_qty,
  b.inbound_date,
  b.expire_date,
  b.opened_at,
  b.production_date,
  b.supplier_name,
  b.source_inbound_no,
  CASE 
    WHEN b.expire_date IS NOT NULL AND b.expire_date <= CURDATE() THEN '已过期'
    WHEN b.expire_date IS NOT NULL AND b.expire_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN '30天内过期'
    WHEN b.opened_at IS NOT NULL THEN '已开封'
    ELSE '正常'
  END as batch_status,
  DATEDIFF(b.expire_date, CURDATE()) as days_until_expiry
FROM inv_inventory_batch b
LEFT JOIN inv_material m ON b.material_id = m.id
WHERE b.deleted = 0;

-- =============================================
-- 5. 物料消耗分析视图
-- =============================================
CREATE OR REPLACE VIEW `v_material_consumption_analysis` AS
SELECT 
  m.id as material_id,
  m.material_no,
  m.material_name,
  m.spec,
  m.unit,
  COALESCE(consume.monthly_avg, 0) as monthly_avg_consumption,
  COALESCE(consume.total_consumed, 0) as total_consumed,
  COALESCE(consume.consume_count, 0) as consume_count,
  m.stock_qty as current_stock,
  ROUND(m.stock_qty / NULLIF(consume.monthly_avg, 0), 1) as stock_months_supply,
  CASE 
    WHEN consume.monthly_avg IS NULL OR consume.monthly_avg = 0 THEN NULL
    WHEN m.stock_qty / consume.monthly_avg <= 1 THEN '库存紧张'
    WHEN m.stock_qty / consume.monthly_avg <= 2 THEN '需要补货'
    ELSE '库存充足'
  END as supply_status
FROM inv_material m
LEFT JOIN (
  SELECT 
    material_id,
    AVG(monthly_consume) as monthly_avg,
    SUM(consume_qty) as total_consumed,
    COUNT(*) as consume_count
  FROM (
    SELECT 
      material_id,
      DATE_FORMAT(create_time, '%Y-%m') as month,
      SUM(consume_qty) as monthly_consume,
      SUM(consume_qty) as consume_qty,
      COUNT(*) as consume_count
    FROM inv_material_consume_log
    WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY material_id, DATE_FORMAT(create_time, '%Y-%m')
  ) monthly
  GROUP BY material_id
) consume ON m.id = consume.material_id
WHERE m.deleted = 0 AND m.category = 'raw_material';

-- =============================================
-- 6. 物料分类扩展表
-- =============================================
CREATE TABLE IF NOT EXISTS `inv_material_category` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `code` VARCHAR(50) NOT NULL COMMENT '分类编码',
  `name` VARCHAR(100) NOT NULL COMMENT '分类名称',
  `parent_id` INT UNSIGNED COMMENT '父分类ID',
  `level` TINYINT NOT NULL DEFAULT 1 COMMENT '层级',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `is_active` TINYINT DEFAULT 1 COMMENT '是否启用',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料分类扩展表';

-- =============================================
-- 7. 物料消耗记录表
-- =============================================
CREATE TABLE IF NOT EXISTS `inv_material_consume_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `batch_id` BIGINT UNSIGNED COMMENT '批次ID',
  `consume_qty` DECIMAL(12,4) NOT NULL COMMENT '消耗数量',
  `consume_type` VARCHAR(20) NOT NULL COMMENT '消耗类型: production/quality/scrapped/trial',
  `work_order_id` BIGINT UNSIGNED COMMENT '工单ID',
  `work_order_no` VARCHAR(50) COMMENT '工单号',
  `source_type` VARCHAR(50) COMMENT '来源类型',
  `source_id` BIGINT UNSIGNED COMMENT '来源ID',
  `source_no` VARCHAR(100) COMMENT '来源单号',
  `operator_id` INT COMMENT '操作人',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_batch` (`batch_id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_consume_type` (`consume_type`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料消耗记录表';

-- =============================================
-- 8. 物料库存调整记录表
-- =============================================
CREATE TABLE IF NOT EXISTS `inv_material_adjustment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `batch_id` BIGINT UNSIGNED COMMENT '批次ID',
  `adjustment_type` VARCHAR(20) NOT NULL COMMENT '调整类型: inventory/stocktaking/damaged/expired/other',
  `before_qty` DECIMAL(12,4) NOT NULL COMMENT '调整前数量',
  `after_qty` DECIMAL(12,4) NOT NULL COMMENT '调整后数量',
  `adjustment_qty` DECIMAL(12,4) NOT NULL COMMENT '调整数量(正负)',
  `reason` VARCHAR(500) COMMENT '调整原因',
  `operator_id` INT NOT NULL COMMENT '操作人',
  `approve_user` INT COMMENT '审核人',
  `approve_status` VARCHAR(20) DEFAULT 'pending' COMMENT '审核状态',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_adjustment_type` (`adjustment_type`),
  KEY `idx_operator` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料库存调整记录表';

-- =============================================
-- 9. 初始化物料分类
-- =============================================
INSERT INTO `inv_material_category` (`code`, `name`, `parent_id`, `level`, `sort_order`) VALUES
('RAW', '原材料', NULL, 1, 1),
('INK', '油墨', NULL, 1, 2),
('SOLVENT', '溶剂', NULL, 1, 3),
('FILM', '薄膜', NULL, 1, 4),
('PAPER', '纸张', NULL, 1, 5),
('PACKAGING', '包装材料', NULL, 1, 6),
('AUX', '辅助材料', NULL, 1, 7),
('SEMI', '半成品', NULL, 1, 8),
('FINISHED', '成品', NULL, 1, 9),
('OTHER', '其他', NULL, 1, 10);

-- 子分类
INSERT INTO `inv_material_category` (`code`, `name`, `parent_id`, `level`, `sort_order`) 
SELECT code, name, id, 2, 1 FROM inv_material_category WHERE code IN ('RAW', 'INK');

-- =============================================
-- 10. 物料保质期检查存储过程
-- =============================================
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS `sp_check_material_expiry`()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_material_id BIGINT;
  DECLARE v_material_name VARCHAR(100);
  DECLARE v_expire_date DATE;
  DECLARE v_warning_days INT;
  DECLARE v_days_until_expiry INT;
  
  DECLARE cur CURSOR FOR 
    SELECT id, material_name, expire_date, warning_days
    FROM inv_material
    WHERE deleted = 0 
    AND expire_date IS NOT NULL
    AND expire_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    AND status = 'normal';
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  CREATE TEMPORARY TABLE IF NOT EXISTS tmp_expiry_warning (
    material_id BIGINT,
    material_name VARCHAR(100),
    expire_date DATE,
    warning_days INT,
    days_until_expiry INT,
    need_notify TINYINT
  );
  
  OPEN cur;
  
  read_loop: LOOP
    FETCH cur INTO v_material_id, v_material_name, v_expire_date, v_warning_days;
    IF done THEN
      LEAVE read_loop;
    END IF;
    
    SET v_days_until_expiry = DATEDIFF(v_expire_date, CURDATE());
    
    IF v_days_until_expiry <= v_warning_days AND v_days_until_expiry > 0 THEN
      INSERT INTO tmp_expiry_warning VALUES (v_material_id, v_material_name, v_expire_date, v_warning_days, v_days_until_expiry, 1);
      
      INSERT INTO sys_notification (title, content, type, source_type, source_id, receive_user, is_read)
      SELECT 
        '物料即将过期',
        CONCAT('物料【', v_material_name, '】将在', v_days_until_expiry, '天后过期，请及时处理'),
        'material_expiry_warning',
        'material',
        v_material_id,
        u.id,
        0
      FROM sys_user u
      WHERE u.deleted = 0 AND u.status = 'active';
    END IF;
    
    IF v_days_until_expiry <= 0 THEN
      UPDATE inv_material SET status = 'expired' WHERE id = v_material_id;
    END IF;
    
  END LOOP;
  
  CLOSE cur;
  
  SELECT * FROM tmp_expiry_warning;
  
  DROP TEMPORARY TABLE IF EXISTS tmp_expiry_warning;
END //
DELIMITER ;

-- =============================================
-- 11. 物料编号自动生成函数
-- =============================================
DELIMITER //
CREATE FUNCTION IF NOT EXISTS `fn_generate_material_no`(p_category VARCHAR(20))
RETURNS VARCHAR(50)
BEGIN
  DECLARE v_prefix VARCHAR(10);
  DECLARE v_date_str VARCHAR(8);
  DECLARE v_seq INT;
  DECLARE v_seq_str VARCHAR(10);
  
  SET v_prefix = COALESCE((SELECT config_value FROM sys_config WHERE config_key = CONCAT('material_prefix_', p_category)), 'MAT');
  SET v_date_str = DATE_FORMAT(CURDATE(), '%Y%m%d');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(material_no, -4) AS UNSIGNED)), 0) + 1
  INTO v_seq
  FROM inv_material
  WHERE material_no LIKE CONCAT(v_prefix, v_date_str, '%');
  
  IF v_seq IS NULL OR v_seq = 0 THEN
    SET v_seq = 1;
  END IF;
  
  SET v_seq_str = LPAD(v_seq, 4, '0');
  
  RETURN CONCAT(v_prefix, v_date_str, v_seq_str);
END //
DELIMITER ;
