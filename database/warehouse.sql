-- 仓库设置表
-- 创建时间: 2024-03-20
-- 描述: 仓库基础信息、容量和属性设置

-- 删除已存在的表
DROP TABLE IF EXISTS `inv_warehouse`;

-- 创建仓库表
CREATE TABLE `inv_warehouse` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `code` VARCHAR(20) NOT NULL COMMENT '仓库编码',
  `name` VARCHAR(100) NOT NULL COMMENT '仓库名称',
  `type` VARCHAR(20) NOT NULL DEFAULT 'raw' COMMENT '仓库类型: raw-原料, finished-成品, semi-半成品, scrap-废品, other-其他',
  `nature` VARCHAR(20) NOT NULL DEFAULT 'own' COMMENT '仓库性质: own-自有, rented-租赁, virtual-虚拟',
  `include_in_calculation` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否纳入需求计算: 1-是, 0-否',
  `address` VARCHAR(200) DEFAULT NULL COMMENT '仓库位置/地址',
  `manager` VARCHAR(50) DEFAULT NULL COMMENT '负责人',
  `contact` VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
  `capacity` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '仓库容量(件)',
  `used_capacity` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已使用容量(件)',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记: 0-正常, 1-已删除',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
  `update_by` INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='仓库设置表';

-- 插入默认仓库数据
INSERT INTO `inv_warehouse` (`code`, `name`, `type`, `nature`, `include_in_calculation`, `address`, `manager`, `contact`, `capacity`, `used_capacity`, `status`, `remark`) VALUES
('WH001', '原料主仓库', 'raw', 'own', 1, 'A栋1层', '张三', '13800138001', 10000, 6500, 1, '存放主要原材料'),
('WH002', '成品仓库', 'finished', 'own', 1, 'B栋2层', '李四', '13800138002', 8000, 4200, 1, '存放成品标签'),
('WH003', '半成品仓库', 'semi', 'own', 1, 'A栋2层', '王五', '13800138003', 5000, 2800, 1, '存放印刷后半成品'),
('WH004', '废品暂存区', 'scrap', 'own', 0, 'C栋1层', '赵六', '13800138004', 1000, 350, 1, '不良品暂存'),
('WH005', '外租仓库', 'finished', 'rented', 1, '工业区3号', '钱七', '13800138005', 3000, 1200, 1, '租赁仓库，存放季节性产品');

-- 创建仓库货位表（用于存储仓库内的具体货位信息）
DROP TABLE IF EXISTS `inv_warehouse_location`;

CREATE TABLE `inv_warehouse_location` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT '仓库ID',
  `code` VARCHAR(20) NOT NULL COMMENT '货位编码',
  `name` VARCHAR(100) NOT NULL COMMENT '货位名称',
  `area` VARCHAR(50) DEFAULT NULL COMMENT '区域',
  `shelf` VARCHAR(50) DEFAULT NULL COMMENT '货架',
  `layer` VARCHAR(20) DEFAULT NULL COMMENT '层数',
  `position` VARCHAR(20) DEFAULT NULL COMMENT '位置',
  `capacity` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '容量',
  `used_capacity` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已使用容量',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_warehouse_location` (`warehouse_id`, `code`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted` (`deleted`),
  CONSTRAINT `fk_location_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouse` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='仓库货位表';

-- 创建仓库操作日志表
DROP TABLE IF EXISTS `inv_warehouse_log`;

CREATE TABLE `inv_warehouse_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `warehouse_id` INT UNSIGNED NOT NULL COMMENT '仓库ID',
  `operation_type` VARCHAR(20) NOT NULL COMMENT '操作类型: create-创建, update-更新, delete-删除, enable-启用, disable-停用',
  `operation_content` TEXT COMMENT '操作内容',
  `operation_by` INT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
  `operation_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_operation_time` (`operation_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='仓库操作日志表';

-- 添加表注释
ALTER TABLE `inv_warehouse` COMMENT='仓库设置表 - 存储仓库基础信息、容量和属性设置';
ALTER TABLE `inv_warehouse_location` COMMENT='仓库货位表 - 存储仓库内的具体货位信息';
ALTER TABLE `inv_warehouse_log` COMMENT='仓库操作日志表 - 记录仓库的变更历史';
