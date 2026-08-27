-- 组织设置数据库表结构
-- 包含：企业信息、部门管理、角色权限、员工管理

-- 企业信息表
DROP TABLE IF EXISTS `sys_company`;
CREATE TABLE `sys_company` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `full_name` VARCHAR(200) NOT NULL COMMENT '企业全称',
  `short_name` VARCHAR(50) DEFAULT NULL COMMENT '企业简称',
  `code` VARCHAR(50) DEFAULT NULL COMMENT '企业编码',
  `legal_person` VARCHAR(50) DEFAULT NULL COMMENT '法定代表人',
  `reg_address` VARCHAR(300) DEFAULT NULL COMMENT '注册地址',
  `contact_phone` VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '企业邮箱',
  `tax_no` VARCHAR(50) DEFAULT NULL COMMENT '纳税人识别号',
  `bank_name` VARCHAR(100) DEFAULT NULL COMMENT '开户银行',
  `bank_account` VARCHAR(50) DEFAULT NULL COMMENT '银行账号',
  `logo` VARCHAR(255) DEFAULT NULL COMMENT '企业Logo',
  `website` VARCHAR(100) DEFAULT NULL COMMENT '企业官网',
  `fax` VARCHAR(50) DEFAULT NULL COMMENT '传真',
  `postcode` VARCHAR(20) DEFAULT NULL COMMENT '邮编',
  `description` TEXT DEFAULT NULL COMMENT '企业简介',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业信息表';

-- 插入企业信息测试数据
INSERT INTO `sys_company` (`full_name`, `short_name`, `code`, `legal_person`, `reg_address`, `contact_phone`, `email`, `tax_no`, `bank_name`, `bank_account`, `website`, `fax`, `postcode`, `description`, `status`) VALUES
('达昌丝网印刷有限公司', '达昌印刷', 'DCPRINT', '张达昌', '广东省东莞市长安镇工业区达昌路1号', '0769-88888888', 'info@dachang.com', '91441900MA1234567X', '中国工商银行东莞长安支行', '6222021234567890123', 'www.dachang.com', '0769-88888889', '523000', '达昌丝网印刷有限公司成立于2005年，是一家专业从事丝网印刷、标签印刷的高新技术企业。公司拥有先进的印刷设备和专业的技术团队，致力于为客户提供高品质的印刷解决方案。', 1);

-- 部门管理表
DROP TABLE IF EXISTS `sys_department`;
CREATE TABLE `sys_department` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `code` VARCHAR(20) NOT NULL COMMENT '部门编码',
  `name` VARCHAR(100) NOT NULL COMMENT '部门名称',
  `parent_id` INT UNSIGNED DEFAULT 0 COMMENT '上级部门ID, 0为顶级部门',
  `manager_id` INT UNSIGNED DEFAULT NULL COMMENT '部门负责人ID',
  `manager_name` VARCHAR(50) DEFAULT NULL COMMENT '部门负责人姓名',
  `sort_order` INT UNSIGNED DEFAULT 0 COMMENT '排序号',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '部门描述',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门管理表';

-- 插入部门测试数据
INSERT INTO `sys_department` (`code`, `name`, `parent_id`, `manager_name`, `sort_order`, `description`, `status`) VALUES
('D001', '总经办', 0, '张达昌', 1, '总经理办公室，负责公司整体运营管理', 1),
('D002', '行政部', 0, '李行政', 2, '负责行政事务、后勤保障', 1),
('D003', '财务部', 0, '王财务', 3, '负责财务管理、会计核算', 1),
('D004', '人力资源部', 0, '赵人事', 4, '负责人事招聘、培训管理', 1),
('D005', '销售部', 0, '钱销售', 5, '负责市场开拓、客户维护', 1),
('D006', '生产部', 0, '孙生产', 6, '负责生产计划、生产管理', 1),
('D007', '技术部', 0, '周技术', 7, '负责技术研发、工艺改进', 1),
('D008', '品质部', 0, '吴品质', 8, '负责质量检验、品质管控', 1),
('D009', '采购部', 0, '郑采购', 9, '负责物料采购、供应商管理', 1),
('D010', '仓储部', 0, '陈仓储', 10, '负责仓库管理、物料收发', 1),
('D011', '印刷车间', 6, '林印刷', 1, '负责丝网印刷生产', 1),
('D012', '后道车间', 6, '黄后道', 2, '负责后道工序加工', 1);

-- 角色权限表
DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `code` VARCHAR(50) NOT NULL COMMENT '角色编码',
  `name` VARCHAR(100) NOT NULL COMMENT '角色名称',
  `role_type` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '角色类型: 1-系统角色, 2-自定义角色',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '角色描述',
  `permissions` JSON DEFAULT NULL COMMENT '权限配置(JSON格式)',
  `data_scope` TINYINT(1) DEFAULT 1 COMMENT '数据范围: 1-全部, 2-本部门, 3-本人, 4-自定义',
  `sort_order` INT UNSIGNED DEFAULT 0 COMMENT '排序号',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限表';

-- 插入角色测试数据
INSERT INTO `sys_role` (`code`, `name`, `role_type`, `description`, `permissions`, `data_scope`, `sort_order`, `status`) VALUES
('super_admin', '超级管理员', 1, '系统超级管理员，拥有所有权限', '["*"]', 1, 1, 1),
('admin', '系统管理员', 1, '系统管理员，负责系统配置和用户管理', '["system:*", "user:*", "role:*", "dept:*"]', 1, 2, 1),
('finance_manager', '财务经理', 2, '财务管理，负责财务报表和成本核算', '["finance:*", "report:view"]', 1, 3, 1),
('sales_manager', '销售经理', 2, '销售管理，负责订单和客户管理', '["sales:*", "customer:*", "order:*"]', 2, 4, 1),
('production_manager', '生产经理', 2, '生产管理，负责生产计划和调度', '["production:*", "workorder:*", "schedule:*"]', 2, 5, 1),
('warehouse_manager', '仓库主管', 2, '仓库管理，负责库存和出入库', '["warehouse:*", "inventory:*", "inbound:*", "outbound:*"]', 2, 6, 1),
('quality_manager', '品质主管', 2, '品质管理，负责质量检验和标准', '["quality:*", "inspection:*", "standard:*"]', 2, 7, 1),
('purchase_manager', '采购经理', 2, '采购管理，负责供应商和采购订单', '["purchase:*", "supplier:*", "purchase_order:*"]', 2, 8, 1),
('hr_manager', '人事经理', 2, '人事管理，负责员工和考勤', '["hr:*", "employee:*", "attendance:*"]', 2, 9, 1),
('operator', '普通员工', 2, '普通操作员，拥有基本操作权限', '["production:view", "workorder:execute", "quality:record"]', 3, 10, 1);

-- 员工管理表
DROP TABLE IF EXISTS `sys_employee`;
CREATE TABLE `sys_employee` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `employee_no` VARCHAR(20) NOT NULL COMMENT '员工编号',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `gender` TINYINT(1) DEFAULT 1 COMMENT '性别: 1-男, 2-女',
  `id_card` VARCHAR(18) DEFAULT NULL COMMENT '身份证号',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `dept_id` INT UNSIGNED DEFAULT NULL COMMENT '部门ID',
  `dept_name` VARCHAR(100) DEFAULT NULL COMMENT '部门名称',
  `role_id` INT UNSIGNED DEFAULT NULL COMMENT '角色ID',
  `role_name` VARCHAR(100) DEFAULT NULL COMMENT '角色名称',
  `position` VARCHAR(50) DEFAULT NULL COMMENT '职位',
  `entry_date` DATE DEFAULT NULL COMMENT '入职日期',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-在职, 2-离职, 3-试用期',
  `address` VARCHAR(300) DEFAULT NULL COMMENT '家庭住址',
  `emergency_contact` VARCHAR(50) DEFAULT NULL COMMENT '紧急联系人',
  `emergency_phone` VARCHAR(20) DEFAULT NULL COMMENT '紧急联系电话',
  `education` VARCHAR(20) DEFAULT NULL COMMENT '学历',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_no` (`employee_no`),
  KEY `idx_dept_id` (`dept_id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工管理表';

-- 插入员工测试数据
INSERT INTO `sys_employee` (`employee_no`, `name`, `gender`, `id_card`, `phone`, `email`, `dept_id`, `dept_name`, `role_id`, `role_name`, `position`, `entry_date`, `status`, `address`, `emergency_contact`, `emergency_phone`, `education`, `remark`) VALUES
('E2024001', '张达昌', 1, '441900197501011234', '13800138001', 'zhang@dachang.com', 1, '总经办', 1, '超级管理员', '总经理', '2005-03-01', 1, '东莞市长安镇达昌花园1栋101', '张太太', '13900139001', '本科', '公司创始人'),
('E2024002', '李行政', 1, '441900198002021234', '13800138002', 'li@dachang.com', 2, '行政部', 2, '系统管理员', '行政经理', '2010-06-15', 1, '东莞市长安镇行政花园2栋202', '李太太', '13900139002', '本科', '负责行政事务'),
('E2024003', '王财务', 2, '441900198503031234', '13800138003', 'wang@dachang.com', 3, '财务部', 3, '财务经理', '财务经理', '2008-09-10', 1, '东莞市长安镇财务花园3栋303', '王先生', '13900139003', '本科', '注册会计师'),
('E2024004', '赵人事', 2, '441900199004041234', '13800138004', 'zhao@dachang.com', 4, '人力资源部', 9, '人事经理', '人事经理', '2015-07-20', 1, '东莞市长安镇人事花园4栋404', '赵先生', '13900139004', '本科', '人力资源管理师'),
('E2024005', '钱销售', 1, '441900198805051234', '13800138005', 'qian@dachang.com', 5, '销售部', 4, '销售经理', '销售经理', '2012-04-12', 1, '东莞市长安镇销售花园5栋505', '钱太太', '13900139005', '本科', '销售精英'),
('E2024006', '孙生产', 1, '441900197606061234', '13800138006', 'sun@dachang.com', 6, '生产部', 5, '生产经理', '生产经理', '2006-08-18', 1, '东莞市长安镇生产花园6栋606', '孙太太', '13900139006', '大专', '生产管理专家'),
('E2024007', '周技术', 1, '441900198207071234', '13800138007', 'zhou@dachang.com', 7, '技术部', 2, '系统管理员', '技术经理', '2011-11-11', 1, '东莞市长安镇技术花园7栋707', '周太太', '13900139007', '硕士', '技术专家'),
('E2024008', '吴品质', 2, '441900198908081234', '13800138008', 'wu@dachang.com', 8, '品质部', 7, '品质主管', '品质经理', '2014-03-08', 1, '东莞市长安镇品质花园8栋808', '吴先生', '13900139008', '本科', '品质管理专家'),
('E2024009', '郑采购', 1, '441900199509091234', '13800138009', 'zheng@dachang.com', 9, '采购部', 8, '采购经理', '采购经理', '2018-05-20', 1, '东莞市长安镇采购花园9栋909', '郑太太', '13900139009', '本科', '采购专家'),
('E2024010', '陈仓储', 1, '441900198310101234', '13800138010', 'chen@dachang.com', 10, '仓储部', 6, '仓库主管', '仓库主管', '2009-12-25', 1, '东莞市长安镇仓储花园10栋1010', '陈太太', '13900139010', '大专', '仓储管理专家'),
('E2024011', '林印刷', 1, '441900199211111234', '13800138011', 'lin@dachang.com', 11, '印刷车间', 10, '普通员工', '印刷机长', '2020-02-15', 1, '东莞市长安镇印刷花园11栋1111', '林太太', '13900139011', '中专', '印刷技术能手'),
('E2024012', '黄后道', 2, '441900199612121234', '13800138012', 'huang@dachang.com', 12, '后道车间', 10, '普通员工', '后道组长', '2021-06-01', 1, '东莞市长安镇后道花园12栋1212', '黄先生', '13900139012', '中专', '后道工序专家');
