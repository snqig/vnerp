-- =====================================================
-- 083: HR 绩效考核表 hr_performance
--
-- 背景：/hr/performance 页面自创建起无后端支撑（/api/hr/performance 路由不存在），
--   前端一直回退 mockData（张三/李四 假数据）。本迁移补齐真实存储。
--
-- 设计：
--   - 每员工一行，uk_hr_performance_employee 唯一键按 employee_id
--   - 保存走 UPSERT（INSERT ... ON DUPLICATE KEY UPDATE），软删后再次保存自动复活
--   - 得分权重在应用层计算：产量40% + 质量30% + 设备15% + 现场管理15%
-- 幂等：CREATE TABLE IF NOT EXISTS，可重复执行。
-- =====================================================

CREATE TABLE IF NOT EXISTS `hr_performance` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT '员工ID (sys_employee.id)',
  `employee_name` VARCHAR(100) DEFAULT NULL COMMENT '员工姓名（保存时快照）',
  `employee_no` VARCHAR(50) DEFAULT NULL COMMENT '员工编号（保存时快照）',
  `output_rate` DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT '产量得分(权重40%)',
  `quality_rate` DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT '质量得分(权重30%)',
  `equipment_rate` DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT '设备得分(权重15%)',
  `site_management` DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT '现场管理得分(权重15%)',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除: 0-正常, 1-已删除',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_hr_performance_employee` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='HR绩效考核表';

-- 迁移后自检
--   SHOW COLUMNS FROM hr_performance;
--   SELECT COUNT(*) FROM hr_performance WHERE deleted = 0;
