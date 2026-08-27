-- 考勤记录表
CREATE TABLE IF NOT EXISTS `hr_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attendance_date` date NOT NULL COMMENT '考勤日期',
  `employee_id` varchar(50) NOT NULL COMMENT '员工ID',
  `employee_name` varchar(50) NOT NULL COMMENT '员工姓名',
  `department_name` varchar(50) NOT NULL COMMENT '部门名称',
  `check_in_time` time DEFAULT NULL COMMENT '上班时间',
  `check_out_time` time DEFAULT NULL COMMENT '下班时间',
  `status` varchar(20) NOT NULL COMMENT '状态',
  `working_hours` decimal(5,2) DEFAULT '0.00' COMMENT '工作时长',
  `overtime_hours` decimal(5,2) DEFAULT '0.00' COMMENT '加班时长',
  `remark` text COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  KEY `idx_attendance_date` (`attendance_date`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_employee_name` (`employee_name`),
  KEY `idx_department_name` (`department_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤记录表';

-- 插入示例数据
INSERT INTO `hr_attendance` (`attendance_date`, `employee_id`, `employee_name`, `department_name`, `check_in_time`, `check_out_time`, `status`, `working_hours`, `overtime_hours`, `remark`) VALUES
('2025-03-31', 'EMP001', '张三', '生产部', '08:00:00', '17:30:00', 'normal', 8.50, 1.00, '正常出勤'),
('2025-03-31', 'EMP002', '李四', '品质部', '08:15:00', '17:30:00', 'late', 8.25, 0.00, '迟到15分钟'),
('2025-03-31', 'EMP003', '王五', '研发部', '09:00:00', '18:00:00', 'normal', 9.00, 1.50, '正常出勤'),
('2025-03-30', 'EMP001', '张三', '生产部', '08:00:00', '17:30:00', 'normal', 8.50, 0.00, '正常出勤'),
('2025-03-30', 'EMP002', '李四', '品质部', '08:00:00', '17:30:00', 'normal', 8.50, 0.00, '正常出勤'),
('2025-03-30', 'EMP003', '王五', '研发部', NULL, NULL, 'absent', 0.00, 0.00, '缺勤'),
('2025-03-29', 'EMP001', '张三', '生产部', '08:00:00', '17:30:00', 'normal', 8.50, 0.00, '正常出勤'),
('2025-03-29', 'EMP002', '李四', '品质部', NULL, NULL, 'leave', 0.00, 0.00, '事假');
