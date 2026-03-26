-- 仓库分类管理表
-- 用于管理仓库的分类，支持统计可用仓库数量

DROP TABLE IF EXISTS `sys_warehouse_category`;
CREATE TABLE `sys_warehouse_category` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `code` VARCHAR(20) NOT NULL COMMENT '分类编码',
  `name` VARCHAR(100) NOT NULL COMMENT '分类名称',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '分类描述',
  `sort_order` INT UNSIGNED DEFAULT 0 COMMENT '排序号',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '删除标记: 0-未删除, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='仓库分类表';

-- 插入默认仓库分类数据
INSERT INTO `sys_warehouse_category` (`code`, `name`, `description`, `sort_order`, `status`) VALUES
('WH-CAT-001', '原材料仓', '存放生产所需原材料的仓库', 1, 1),
('WH-CAT-002', '半成品仓', '存放半成品的仓库', 2, 1),
('WH-CAT-003', '成品仓', '存放已完成产品的仓库', 3, 1),
('WH-CAT-004', '辅料仓', '存放辅助材料的仓库', 4, 1),
('WH-CAT-005', '耗材仓', '存放生产耗材的仓库', 5, 1),
('WH-CAT-006', '退货仓', '存放退货产品的仓库', 6, 1),
('WH-CAT-007', '报废仓', '存放报废物品的仓库', 7, 1);

-- 仓库表添加分类字段（如果不存在）
-- 注意：这需要在已有的仓库表中添加category_id字段
-- ALTER TABLE `sys_warehouse` ADD COLUMN `category_id` INT UNSIGNED DEFAULT NULL COMMENT '仓库分类ID' AFTER `code`;
-- ALTER TABLE `sys_warehouse` ADD KEY `idx_category_id` (`category_id`);
