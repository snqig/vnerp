-- ========================================================
-- ERP 系统数据库设计
-- 数据库: vnerpdacahng
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_0900_ai_ci
-- 连接信息: 127.0.0.1, root, Snqig521223
-- ========================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `vnerpdacahng`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `vnerpdacahng`;

-- ========================================================
-- 1. 系统管理模块
-- ========================================================

-- 用户表
CREATE TABLE `sys_user` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(加密存储)',
  `real_name` VARCHAR(50) COMMENT '真实姓名',
  `email` VARCHAR(100) COMMENT '邮箱',
  `phone` VARCHAR(20) COMMENT '手机号',
  `avatar` VARCHAR(255) COMMENT '头像URL',
  `department_id` BIGINT UNSIGNED COMMENT '部门ID',
  `position` VARCHAR(50) COMMENT '职位',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `last_login_time` DATETIME COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(50) COMMENT '最后登录IP',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记: 0-未删除, 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_department` (`department_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统用户表';

-- 部门表
CREATE TABLE `sys_department` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '部门ID',
  `parent_id` BIGINT UNSIGNED DEFAULT 0 COMMENT '父部门ID, 0为顶级部门',
  `dept_name` VARCHAR(100) NOT NULL COMMENT '部门名称',
  `dept_code` VARCHAR(50) COMMENT '部门编码',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  `leader_id` BIGINT UNSIGNED COMMENT '部门负责人ID',
  `phone` VARCHAR(20) COMMENT '联系电话',
  `email` VARCHAR(100) COMMENT '邮箱',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='部门表';

-- 角色表
CREATE TABLE `sys_role` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `role_name` VARCHAR(50) NOT NULL COMMENT '角色名称',
  `role_code` VARCHAR(50) NOT NULL COMMENT '角色编码',
  `description` VARCHAR(255) COMMENT '角色描述',
  `data_scope` TINYINT DEFAULT 1 COMMENT '数据范围: 1-全部, 2-本部门, 3-本部门及下级, 4-仅本人',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色表';

-- 用户角色关联表
CREATE TABLE `sys_user_role` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  KEY `idx_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户角色关联表';

-- 菜单/权限表
CREATE TABLE `sys_menu` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `parent_id` BIGINT UNSIGNED DEFAULT 0 COMMENT '父菜单ID',
  `menu_name` VARCHAR(50) NOT NULL COMMENT '菜单名称',
  `menu_type` TINYINT NOT NULL COMMENT '菜单类型: 1-目录, 2-菜单, 3-按钮',
  `icon` VARCHAR(50) COMMENT '菜单图标',
  `path` VARCHAR(200) COMMENT '路由路径',
  `component` VARCHAR(255) COMMENT '组件路径',
  `permission` VARCHAR(100) COMMENT '权限标识',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `visible` TINYINT DEFAULT 1 COMMENT '是否可见: 0-隐藏, 1-显示',
  `keep_alive` TINYINT DEFAULT 0 COMMENT '是否缓存: 0-否, 1-是',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_type` (`menu_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='菜单权限表';

-- 角色菜单关联表
CREATE TABLE `sys_role_menu` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `menu_id` BIGINT UNSIGNED NOT NULL COMMENT '菜单ID',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_menu` (`role_id`, `menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色菜单关联表';

-- 操作日志表
CREATE TABLE `sys_operation_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id` BIGINT UNSIGNED COMMENT '用户ID',
  `username` VARCHAR(50) COMMENT '用户名',
  `operation` VARCHAR(100) COMMENT '操作描述',
  `method` VARCHAR(10) COMMENT '请求方法',
  `request_url` VARCHAR(500) COMMENT '请求URL',
  `request_params` TEXT COMMENT '请求参数',
  `response_data` TEXT COMMENT '响应数据',
  `ip` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` VARCHAR(500) COMMENT '浏览器UA',
  `execute_time` INT COMMENT '执行时长(ms)',
  `status` TINYINT COMMENT '操作状态: 0-失败, 1-成功',
  `error_msg` TEXT COMMENT '错误信息',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='操作日志表';

-- 登录日志表
CREATE TABLE `sys_login_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id` BIGINT UNSIGNED COMMENT '用户ID',
  `username` VARCHAR(50) COMMENT '用户名',
  `login_type` TINYINT COMMENT '登录类型: 1-账号密码, 2-手机验证码',
  `ip` VARCHAR(50) COMMENT 'IP地址',
  `location` VARCHAR(100) COMMENT '登录地点',
  `user_agent` VARCHAR(500) COMMENT '浏览器UA',
  `status` TINYINT COMMENT '登录状态: 0-失败, 1-成功',
  `error_msg` VARCHAR(255) COMMENT '错误信息',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='登录日志表';

-- 数据字典表
CREATE TABLE `sys_dict_type` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '字典类型ID',
  `dict_name` VARCHAR(50) NOT NULL COMMENT '字典名称',
  `dict_code` VARCHAR(50) NOT NULL COMMENT '字典编码',
  `description` VARCHAR(255) COMMENT '描述',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_code` (`dict_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='字典类型表';

-- 字典数据表
CREATE TABLE `sys_dict_data` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '字典数据ID',
  `dict_type_id` BIGINT UNSIGNED NOT NULL COMMENT '字典类型ID',
  `dict_label` VARCHAR(50) NOT NULL COMMENT '字典标签',
  `dict_value` VARCHAR(100) NOT NULL COMMENT '字典键值',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_dict_type` (`dict_type_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='字典数据表';

-- 系统配置表
CREATE TABLE `sys_config` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_name` VARCHAR(50) NOT NULL COMMENT '配置名称',
  `config_key` VARCHAR(50) NOT NULL COMMENT '配置键名',
  `config_value` VARCHAR(500) NOT NULL COMMENT '配置值',
  `config_type` TINYINT DEFAULT 1 COMMENT '配置类型: 1-系统, 2-业务',
  `description` VARCHAR(255) COMMENT '描述',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统配置表';

-- ========================================================
-- 2. 客户管理模块
-- ========================================================

-- 客户表
CREATE TABLE `crm_customer` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '客户ID',
  `customer_code` VARCHAR(50) NOT NULL COMMENT '客户编码',
  `customer_name` VARCHAR(100) NOT NULL COMMENT '客户名称',
  `short_name` VARCHAR(50) COMMENT '客户简称',
  `customer_type` TINYINT COMMENT '客户类型: 1-企业, 2-个人',
  `industry` VARCHAR(50) COMMENT '所属行业',
  `scale` VARCHAR(50) COMMENT '企业规模',
  `credit_level` VARCHAR(20) COMMENT '信用等级',
  `province` VARCHAR(50) COMMENT '省份',
  `city` VARCHAR(50) COMMENT '城市',
  `district` VARCHAR(50) COMMENT '区县',
  `address` VARCHAR(255) COMMENT '详细地址',
  `contact_name` VARCHAR(50) COMMENT '联系人姓名',
  `contact_phone` VARCHAR(20) COMMENT '联系人电话',
  `contact_email` VARCHAR(100) COMMENT '联系人邮箱',
  `fax` VARCHAR(20) COMMENT '传真',
  `website` VARCHAR(100) COMMENT '网站',
  `business_license` VARCHAR(50) COMMENT '营业执照号',
  `tax_number` VARCHAR(50) COMMENT '税号',
  `bank_name` VARCHAR(100) COMMENT '开户银行',
  `bank_account` VARCHAR(50) COMMENT '银行账号',
  `salesman_id` BIGINT UNSIGNED COMMENT '业务员ID',
  `follow_up_status` TINYINT DEFAULT 1 COMMENT '跟进状态: 1-潜在客户, 2-意向客户, 3-成交客户, 4-流失客户',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_code` (`customer_code`),
  KEY `idx_customer_name` (`customer_name`),
  KEY `idx_salesman` (`salesman_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户表';

-- 客户联系人表
CREATE TABLE `crm_customer_contact` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '联系人ID',
  `customer_id` BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
  `contact_name` VARCHAR(50) NOT NULL COMMENT '联系人姓名',
  `gender` TINYINT COMMENT '性别: 1-男, 2-女',
  `position` VARCHAR(50) COMMENT '职位',
  `department` VARCHAR(50) COMMENT '部门',
  `phone` VARCHAR(20) COMMENT '手机号',
  `telephone` VARCHAR(20) COMMENT '座机',
  `email` VARCHAR(100) COMMENT '邮箱',
  `wechat` VARCHAR(50) COMMENT '微信',
  `qq` VARCHAR(20) COMMENT 'QQ',
  `is_primary` TINYINT DEFAULT 0 COMMENT '是否主要联系人: 0-否, 1-是',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户联系人表';

-- 客户跟进记录表
CREATE TABLE `crm_customer_follow_up` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '跟进记录ID',
  `customer_id` BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
  `follow_up_type` TINYINT COMMENT '跟进方式: 1-电话, 2-邮件, 3-拜访, 4-微信, 5-其他',
  `follow_up_content` TEXT COMMENT '跟进内容',
  `follow_up_time` DATETIME COMMENT '跟进时间',
  `next_follow_up_time` DATETIME COMMENT '下次跟进时间',
  `follow_up_by` BIGINT UNSIGNED COMMENT '跟进人ID',
  `attachment` VARCHAR(255) COMMENT '附件',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_follow_up_time` (`follow_up_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户跟进记录表';

-- ========================================================
-- 3. 供应商管理模块
-- ========================================================

-- 供应商表
CREATE TABLE `pur_supplier` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '供应商ID',
  `supplier_code` VARCHAR(50) NOT NULL COMMENT '供应商编码',
  `supplier_name` VARCHAR(100) NOT NULL COMMENT '供应商名称',
  `short_name` VARCHAR(50) COMMENT '供应商简称',
  `supplier_type` TINYINT COMMENT '供应商类型: 1-原材料, 2-辅料, 3-设备, 4-服务',
  `province` VARCHAR(50) COMMENT '省份',
  `city` VARCHAR(50) COMMENT '城市',
  `address` VARCHAR(255) COMMENT '详细地址',
  `contact_name` VARCHAR(50) COMMENT '联系人',
  `contact_phone` VARCHAR(20) COMMENT '联系电话',
  `contact_email` VARCHAR(100) COMMENT '联系邮箱',
  `business_license` VARCHAR(50) COMMENT '营业执照号',
  `tax_number` VARCHAR(50) COMMENT '税号',
  `bank_name` VARCHAR(100) COMMENT '开户银行',
  `bank_account` VARCHAR(50) COMMENT '银行账号',
  `credit_level` VARCHAR(20) COMMENT '信用等级',
  `cooperation_status` TINYINT DEFAULT 1 COMMENT '合作状态: 1-合作中, 2-暂停合作, 3-终止合作',
  `settlement_method` VARCHAR(50) COMMENT '结算方式',
  `payment_terms` VARCHAR(100) COMMENT '付款条件',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supplier_code` (`supplier_code`),
  KEY `idx_supplier_name` (`supplier_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='供应商表';

-- 供应商物料关联表
CREATE TABLE `pur_supplier_material` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `supplier_id` BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `supply_price` DECIMAL(18,4) COMMENT '供应价格',
  `min_order_qty` DECIMAL(18,4) COMMENT '最小订购量',
  `lead_time` INT COMMENT '交货周期(天)',
  `is_default` TINYINT DEFAULT 0 COMMENT '是否默认供应商: 0-否, 1-是',
  `status` TINYINT DEFAULT 1 COMMENT '状态',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supplier_material` (`supplier_id`, `material_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='供应商物料关联表';

-- ========================================================
-- 4. 物料管理模块
-- ========================================================

-- 物料分类表
CREATE TABLE `inv_material_category` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `parent_id` BIGINT UNSIGNED DEFAULT 0 COMMENT '父分类ID',
  `category_code` VARCHAR(50) NOT NULL COMMENT '分类编码',
  `category_name` VARCHAR(100) NOT NULL COMMENT '分类名称',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`category_code`),
  KEY `idx_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料分类表';

-- 物料表
CREATE TABLE `inv_material` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '物料ID',
  `material_code` VARCHAR(50) NOT NULL COMMENT '物料编码',
  `material_name` VARCHAR(100) NOT NULL COMMENT '物料名称',
  `specification` VARCHAR(255) COMMENT '规格型号',
  `category_id` BIGINT UNSIGNED COMMENT '分类ID',
  `material_type` TINYINT COMMENT '物料类型: 1-原材料, 2-半成品, 3-成品, 4-辅料, 5-包材',
  `unit` VARCHAR(20) COMMENT '计量单位',
  `barcode` VARCHAR(50) COMMENT '条形码',
  `brand` VARCHAR(50) COMMENT '品牌',
  `safety_stock` DECIMAL(18,4) DEFAULT 0 COMMENT '安全库存',
  `max_stock` DECIMAL(18,4) COMMENT '最大库存',
  `min_stock` DECIMAL(18,4) COMMENT '最小库存',
  `purchase_price` DECIMAL(18,4) COMMENT '采购单价',
  `sale_price` DECIMAL(18,4) COMMENT '销售单价',
  `cost_price` DECIMAL(18,4) COMMENT '成本单价',
  `warehouse_id` BIGINT UNSIGNED COMMENT '默认仓库ID',
  `shelf_life` INT COMMENT '保质期(天)',
  `warning_days` INT COMMENT '预警天数',
  `is_batch_managed` TINYINT DEFAULT 0 COMMENT '是否批次管理: 0-否, 1-是',
  `is_serial_managed` TINYINT DEFAULT 0 COMMENT '是否序列号管理: 0-否, 1-是',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_code` (`material_code`),
  KEY `idx_category` (`category_id`),
  KEY `idx_material_name` (`material_name`),
  KEY `idx_type` (`material_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='物料表';

-- 仓库表
CREATE TABLE `inv_warehouse` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '仓库ID',
  `warehouse_code` VARCHAR(50) NOT NULL COMMENT '仓库编码',
  `warehouse_name` VARCHAR(100) NOT NULL COMMENT '仓库名称',
  `warehouse_type` TINYINT COMMENT '仓库类型: 1-原材料仓, 2-半成品仓, 3-成品仓, 4-辅料仓',
  `province` VARCHAR(50) COMMENT '省份',
  `city` VARCHAR(50) COMMENT '城市',
  `address` VARCHAR(255) COMMENT '详细地址',
  `manager_id` BIGINT UNSIGNED COMMENT '仓库负责人ID',
  `contact_phone` VARCHAR(20) COMMENT '联系电话',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_warehouse_code` (`warehouse_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='仓库表';

-- 库存表
CREATE TABLE `inv_inventory` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '库存ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `location_code` VARCHAR(50) COMMENT '库位编码',
  `quantity` DECIMAL(18,4) DEFAULT 0 COMMENT '库存数量',
  `locked_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '锁定数量',
  `available_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '可用数量',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `production_date` DATE COMMENT '生产日期',
  `expiry_date` DATE COMMENT '过期日期',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_warehouse_batch` (`material_id`, `warehouse_id`, `batch_no`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_batch` (`batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存表';

-- 库存流水表
CREATE TABLE `inv_inventory_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '流水ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `operation_type` TINYINT NOT NULL COMMENT '操作类型: 1-入库, 2-出库, 3-盘点, 4-调拨, 5-报废',
  `operation_qty` DECIMAL(18,4) NOT NULL COMMENT '操作数量',
  `before_qty` DECIMAL(18,4) COMMENT '操作前数量',
  `after_qty` DECIMAL(18,4) COMMENT '操作后数量',
  `business_type` VARCHAR(50) COMMENT '业务类型',
  `business_no` VARCHAR(50) COMMENT '业务单号',
  `remark` VARCHAR(255) COMMENT '备注',
  `operator_id` BIGINT UNSIGNED COMMENT '操作人ID',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_operation_type` (`operation_type`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='库存流水表';

-- ========================================================
-- 5. 采购管理模块
-- ========================================================

-- 采购申请单表
CREATE TABLE `pur_request` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '申请单ID',
  `request_no` VARCHAR(50) NOT NULL COMMENT '申请单号',
  `request_date` DATE COMMENT '申请日期',
  `request_dept_id` BIGINT UNSIGNED COMMENT '申请部门ID',
  `requester_id` BIGINT UNSIGNED COMMENT '申请人ID',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
  `currency` VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  `urgency_level` TINYINT DEFAULT 1 COMMENT '紧急程度: 1-一般, 2-紧急, 3-特急',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-待审批, 2-审批中, 3-已批准, 4-已拒绝, 5-已关闭',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_request_no` (`request_no`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购申请单表';

-- 采购申请明细表
CREATE TABLE `pur_request_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `request_id` BIGINT UNSIGNED NOT NULL COMMENT '申请单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '申请数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `required_date` DATE COMMENT '需求日期',
  `purpose` VARCHAR(255) COMMENT '用途说明',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_request` (`request_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购申请明细表';

-- 采购订单表
CREATE TABLE `pur_order` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no` VARCHAR(50) NOT NULL COMMENT '订单编号',
  `order_date` DATE COMMENT '订单日期',
  `supplier_id` BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
  `contact_name` VARCHAR(50) COMMENT '联系人',
  `contact_phone` VARCHAR(20) COMMENT '联系电话',
  `delivery_address` VARCHAR(255) COMMENT '送货地址',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
  `tax_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '税额',
  `total_with_tax` DECIMAL(18,4) DEFAULT 0 COMMENT '含税总额',
  `currency` VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` DECIMAL(10,4) DEFAULT 1 COMMENT '汇率',
  `payment_terms` VARCHAR(100) COMMENT '付款条件',
  `delivery_date` DATE COMMENT '交货日期',
  `settlement_method` VARCHAR(50) COMMENT '结算方式',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-待确认, 2-已确认, 3-部分到货, 4-已完成, 5-已取消',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_order_date` (`order_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购订单表';

-- 采购订单明细表
CREATE TABLE `pur_order_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '采购数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `unit_price` DECIMAL(18,4) COMMENT '单价',
  `tax_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '税率(%)',
  `amount` DECIMAL(18,4) COMMENT '金额',
  `tax_amount` DECIMAL(18,4) COMMENT '税额',
  `total_amount` DECIMAL(18,4) COMMENT '含税金额',
  `received_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '已到货数量',
  `delivery_date` DATE COMMENT '交货日期',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购订单明细表';

-- 采购入库单表
CREATE TABLE `pur_receipt` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '入库单ID',
  `receipt_no` VARCHAR(50) NOT NULL COMMENT '入库单号',
  `receipt_date` DATE COMMENT '入库日期',
  `order_id` BIGINT UNSIGNED COMMENT '采购订单ID',
  `supplier_id` BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
  `inspector_id` BIGINT UNSIGNED COMMENT '检验员ID',
  `inspection_result` TINYINT COMMENT '检验结果: 1-合格, 2-不合格',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-待入库, 2-已入库',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_receipt_no` (`receipt_no`),
  KEY `idx_order` (`order_id`),
  KEY `idx_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购入库单表';

-- 采购入库明细表
CREATE TABLE `pur_receipt_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `receipt_id` BIGINT UNSIGNED NOT NULL COMMENT '入库单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `order_detail_id` BIGINT UNSIGNED COMMENT '订单明细ID',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '入库数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `unit_price` DECIMAL(18,4) COMMENT '单价',
  `amount` DECIMAL(18,4) COMMENT '金额',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `production_date` DATE COMMENT '生产日期',
  `expiry_date` DATE COMMENT '过期日期',
  `location_code` VARCHAR(50) COMMENT '库位编码',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_receipt` (`receipt_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购入库明细表';

-- ========================================================
-- 6. 销售管理模块
-- ========================================================

-- 销售订单表
CREATE TABLE `sal_order` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no` VARCHAR(50) NOT NULL COMMENT '订单编号',
  `order_date` DATE COMMENT '订单日期',
  `customer_id` BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
  `contact_name` VARCHAR(50) COMMENT '联系人',
  `contact_phone` VARCHAR(20) COMMENT '联系电话',
  `delivery_address` VARCHAR(255) COMMENT '送货地址',
  `salesman_id` BIGINT UNSIGNED COMMENT '业务员ID',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
  `tax_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '税额',
  `total_with_tax` DECIMAL(18,4) DEFAULT 0 COMMENT '含税总额',
  `discount_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '折扣金额',
  `currency` VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
  `exchange_rate` DECIMAL(10,4) DEFAULT 1 COMMENT '汇率',
  `payment_terms` VARCHAR(100) COMMENT '付款条件',
  `delivery_date` DATE COMMENT '交货日期',
  `contract_no` VARCHAR(50) COMMENT '合同编号',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-待确认, 2-已确认, 3-部分发货, 4-已完成, 5-已取消',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  `update_by` BIGINT UNSIGNED COMMENT '更新人ID',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_salesman` (`salesman_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售订单表';

-- 销售订单明细表
CREATE TABLE `sal_order_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '销售数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `unit_price` DECIMAL(18,4) COMMENT '单价',
  `tax_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '税率(%)',
  `amount` DECIMAL(18,4) COMMENT '金额',
  `tax_amount` DECIMAL(18,4) COMMENT '税额',
  `total_amount` DECIMAL(18,4) COMMENT '含税金额',
  `delivered_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '已发货数量',
  `delivery_date` DATE COMMENT '交货日期',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售订单明细表';

-- 销售出库单表
CREATE TABLE `sal_delivery` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '出库单ID',
  `delivery_no` VARCHAR(50) NOT NULL COMMENT '出库单号',
  `delivery_date` DATE COMMENT '出库日期',
  `order_id` BIGINT UNSIGNED COMMENT '销售订单ID',
  `customer_id` BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
  `warehouse_id` BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
  `total_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
  `logistics_company` VARCHAR(100) COMMENT '物流公司',
  `tracking_no` VARCHAR(50) COMMENT '物流单号',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-待发货, 2-已发货, 3-已签收',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_delivery_no` (`delivery_no`),
  KEY `idx_order` (`order_id`),
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售出库单表';

-- 销售出库明细表
CREATE TABLE `sal_delivery_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `delivery_id` BIGINT UNSIGNED NOT NULL COMMENT '出库单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `order_detail_id` BIGINT UNSIGNED COMMENT '订单明细ID',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '出库数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `unit_price` DECIMAL(18,4) COMMENT '单价',
  `amount` DECIMAL(18,4) COMMENT '金额',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_delivery` (`delivery_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='销售出库明细表';

-- ========================================================
-- 7. 生产管理模块
-- ========================================================

-- 标准卡表(样品管理)
CREATE TABLE `prd_standard_card` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标准卡ID',
  `card_no` VARCHAR(50) NOT NULL COMMENT '标准卡编号',
  `customer_id` BIGINT UNSIGNED COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户名称',
  `customer_code` VARCHAR(50) COMMENT '客户代码',
  `product_name` VARCHAR(100) COMMENT '产品名称',
  `version` VARCHAR(10) COMMENT '版本',
  `date` DATE COMMENT '日期',
  `document_code` VARCHAR(50) COMMENT '文件编号',
  `finished_size` VARCHAR(50) COMMENT '成品尺寸',
  `tolerance` VARCHAR(50) COMMENT '公差',
  `material_name` VARCHAR(100) COMMENT '材料名称',
  `material_type` VARCHAR(20) COMMENT '材料类型',
  `layout_type` VARCHAR(50) COMMENT '排版方式',
  `spacing` VARCHAR(20) COMMENT '间距',
  `spacing_value` VARCHAR(20) COMMENT '间距值',
  `sheet_width` VARCHAR(20) COMMENT '片材宽',
  `sheet_length` VARCHAR(20) COMMENT '片材长',
  `core_type` VARCHAR(50) COMMENT '纸芯类型',
  `paper_direction` VARCHAR(20) COMMENT '纸向',
  `roll_width` VARCHAR(20) COMMENT '料宽',
  `paper_edge` VARCHAR(20) COMMENT '纸边',
  `standard_usage` VARCHAR(50) COMMENT '标准用量',
  `jump_distance` VARCHAR(20) COMMENT '跳距',
  `process_flow1` VARCHAR(100) COMMENT '工艺流程1',
  `process_flow2` VARCHAR(100) COMMENT '工艺流程2',
  `print_type` VARCHAR(50) COMMENT '表面处理',
  `first_jump_distance` VARCHAR(20) COMMENT '第一跳距',
  -- 印序数据(7行JSON存储)
  `sequences` JSON COMMENT '印序数据',
  `film_manufacturer` VARCHAR(100) COMMENT '膜厂商',
  `film_code` VARCHAR(50) COMMENT '膜编号',
  `film_size` VARCHAR(50) COMMENT '膜规格',
  `process_method` VARCHAR(50) COMMENT '工艺方式',
  `stamping_method` VARCHAR(50) COMMENT '冲压方法',
  `mold_code` VARCHAR(50) COMMENT '模具编号',
  `layout_method` VARCHAR(50) COMMENT '排版方式',
  `layout_way` VARCHAR(50) COMMENT '排版方向',
  `jump_distance2` VARCHAR(20) COMMENT '跳距2',
  `mylar_material` VARCHAR(100) COMMENT '麦拉材料',
  `mylar_specs` VARCHAR(50) COMMENT '麦拉规格',
  `mylar_layout` VARCHAR(50) COMMENT '麦拉排版',
  `mylar_jump` VARCHAR(20) COMMENT '麦拉跳距',
  `adhesive_type` VARCHAR(50) COMMENT '背胶种类',
  `adhesive_manufacturer` VARCHAR(100) COMMENT '背胶厂商',
  `adhesive_code` VARCHAR(50) COMMENT '背胶编号',
  `adhesive_size` VARCHAR(50) COMMENT '背胶尺寸',
  `dashed_knife` TINYINT DEFAULT 0 COMMENT '加虚线刀: 0-否, 1-是',
  `slice_per_row` VARCHAR(20) COMMENT 'PCS/排',
  `slice_per_roll` VARCHAR(20) COMMENT 'PCS/卷',
  `slice_per_bundle` VARCHAR(20) COMMENT 'PCS/扎',
  `slice_per_bag` VARCHAR(20) COMMENT 'PCS/袋',
  `slice_per_box` VARCHAR(20) COMMENT 'PCS/箱',
  `back_knife_mold` VARCHAR(50) COMMENT '背胶刀模存放',
  `back_mylar_mold` VARCHAR(50) COMMENT '背麦拉刀模存放',
  `release_paper_code` VARCHAR(50) COMMENT '离型纸编号',
  `release_paper_type` VARCHAR(50) COMMENT '离型纸种类',
  `release_paper_specs` VARCHAR(50) COMMENT '离型纸规格',
  `padding_material` VARCHAR(100) COMMENT '填充材料',
  `packing_material` VARCHAR(100) COMMENT '包装材料',
  `special_color` VARCHAR(200) COMMENT '专色配比',
  `color_formula` VARCHAR(200) COMMENT '颜色配方',
  `file_path` VARCHAR(200) COMMENT '电脑图档存储路径',
  `sample_info` VARCHAR(200) COMMENT '样品信息',
  `notes` TEXT COMMENT '注意事项',
  `glue_type` VARCHAR(50) COMMENT '滴胶类型',
  `packing_type` VARCHAR(50) COMMENT '包装类型',
  `creator` VARCHAR(50) COMMENT '制作',
  `reviewer` VARCHAR(50) COMMENT '审核',
  `factory_manager` VARCHAR(50) COMMENT '厂长',
  `quality_manager` VARCHAR(50) COMMENT '品管',
  `sales` VARCHAR(50) COMMENT '业务',
  `approver` VARCHAR(50) COMMENT '核准',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-草稿, 2-待审核, 3-已启用, 4-已归档',
  `creator_id` BIGINT UNSIGNED COMMENT '创建人ID',
  `reviewer_id` BIGINT UNSIGNED COMMENT '审核人ID',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_card_no` (`card_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='标准卡表';

-- 生产工单表
CREATE TABLE `prd_work_order` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '工单ID',
  `work_order_no` VARCHAR(50) NOT NULL COMMENT '工单编号',
  `work_order_date` DATE COMMENT '工单日期',
  `sales_order_id` BIGINT UNSIGNED COMMENT '销售订单ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '产品ID',
  `plan_qty` DECIMAL(18,4) NOT NULL COMMENT '计划数量',
  `completed_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '已完成数量',
  `unit` VARCHAR(20) COMMENT '单位',
  `plan_start_date` DATE COMMENT '计划开工日期',
  `plan_end_date` DATE COMMENT '计划完工日期',
  `actual_start_date` DATE COMMENT '实际开工日期',
  `actual_end_date` DATE COMMENT '实际完工日期',
  `workshop_id` BIGINT UNSIGNED COMMENT '车间ID',
  `workcenter_id` BIGINT UNSIGNED COMMENT '工作中心ID',
  `priority` TINYINT DEFAULT 1 COMMENT '优先级: 1-低, 2-中, 3-高, 4-紧急',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-待开工, 2-生产中, 3-已完成, 4-已关闭',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order_no` (`work_order_no`),
  KEY `idx_material` (`material_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='生产工单表';

-- BOM表(物料清单)
CREATE TABLE `prd_bom` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'BOM ID',
  `bom_no` VARCHAR(50) NOT NULL COMMENT 'BOM编号',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '成品物料ID',
  `version` VARCHAR(10) DEFAULT '1.0' COMMENT '版本号',
  `is_default` TINYINT DEFAULT 1 COMMENT '是否默认: 0-否, 1-是',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT UNSIGNED COMMENT '创建人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bom_version` (`material_id`, `version`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM表';

-- BOM明细表
CREATE TABLE `prd_bom_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `bom_id` BIGINT UNSIGNED NOT NULL COMMENT 'BOM ID',
  `material_id` BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  `quantity` DECIMAL(18,4) NOT NULL COMMENT '用量',
  `unit` VARCHAR(20) COMMENT '单位',
  `loss_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '损耗率(%)',
  `process_sequence` INT COMMENT '工序序号',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_bom` (`bom_id`),
  KEY `idx_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='BOM明细表';

-- ========================================================
-- 8. 财务管理模块
-- ========================================================

-- 应收款表
CREATE TABLE `fin_receivable` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '应收款ID',
  `receivable_no` VARCHAR(50) NOT NULL COMMENT '应收款编号',
  `source_type` TINYINT COMMENT '来源类型: 1-销售订单, 2-其他',
  `source_id` BIGINT UNSIGNED COMMENT '来源单据ID',
  `source_no` VARCHAR(50) COMMENT '来源单据号',
  `customer_id` BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
  `amount` DECIMAL(18,4) NOT NULL COMMENT '应收金额',
  `received_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '已收金额',
  `balance` DECIMAL(18,4) COMMENT '余额',
  `due_date` DATE COMMENT '到期日期',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-未收款, 2-部分收款, 3-已结清, 4-已坏账',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_receivable_no` (`receivable_no`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='应收款表';

-- 应付款表
CREATE TABLE `fin_payable` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '应付款ID',
  `payable_no` VARCHAR(50) NOT NULL COMMENT '应付款编号',
  `source_type` TINYINT COMMENT '来源类型: 1-采购订单, 2-其他',
  `source_id` BIGINT UNSIGNED COMMENT '来源单据ID',
  `source_no` VARCHAR(50) COMMENT '来源单据号',
  `supplier_id` BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
  `amount` DECIMAL(18,4) NOT NULL COMMENT '应付金额',
  `paid_amount` DECIMAL(18,4) DEFAULT 0 COMMENT '已付金额',
  `balance` DECIMAL(18,4) COMMENT '余额',
  `due_date` DATE COMMENT '到期日期',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-未付款, 2-部分付款, 3-已结清',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payable_no` (`payable_no`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='应付款表';

-- 收款记录表
CREATE TABLE `fin_receipt_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `receipt_no` VARCHAR(50) NOT NULL COMMENT '收款单号',
  `receivable_id` BIGINT UNSIGNED COMMENT '应收款ID',
  `customer_id` BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
  `amount` DECIMAL(18,4) NOT NULL COMMENT '收款金额',
  `receipt_date` DATE COMMENT '收款日期',
  `receipt_method` VARCHAR(50) COMMENT '收款方式: 银行转账, 现金, 支票等',
  `bank_account` VARCHAR(50) COMMENT '收款账户',
  `reference_no` VARCHAR(50) COMMENT '参考号/流水号',
  `handler_id` BIGINT UNSIGNED COMMENT '经办人ID',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_receipt_no` (`receipt_no`),
  KEY `idx_receivable` (`receivable_id`),
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='收款记录表';

-- 付款记录表
CREATE TABLE `fin_payment_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `payment_no` VARCHAR(50) NOT NULL COMMENT '付款单号',
  `payable_id` BIGINT UNSIGNED COMMENT '应付款ID',
  `supplier_id` BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
  `amount` DECIMAL(18,4) NOT NULL COMMENT '付款金额',
  `payment_date` DATE COMMENT '付款日期',
  `payment_method` VARCHAR(50) COMMENT '付款方式: 银行转账, 现金, 支票等',
  `bank_account` VARCHAR(50) COMMENT '付款账户',
  `reference_no` VARCHAR(50) COMMENT '参考号/流水号',
  `handler_id` BIGINT UNSIGNED COMMENT '经办人ID',
  `remark` VARCHAR(255) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_no` (`payment_no`),
  KEY `idx_payable` (`payable_id`),
  KEY `idx_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='付款记录表';

-- ========================================================
-- 9. 质量管理模块
-- ========================================================

-- 检验单表
CREATE TABLE `qc_inspection` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '检验单ID',
  `inspection_no` VARCHAR(50) NOT NULL COMMENT '检验单号',
  `inspection_type` TINYINT COMMENT '检验类型: 1-来料检验, 2-过程检验, 3-成品检验',
  `source_type` VARCHAR(50) COMMENT '来源类型',
  `source_id` BIGINT UNSIGNED COMMENT '来源单据ID',
  `source_no` VARCHAR(50) COMMENT '来源单据号',
  `material_id` BIGINT UNSIGNED COMMENT '物料ID',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `inspection_qty` DECIMAL(18,4) COMMENT '检验数量',
  `qualified_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '合格数量',
  `unqualified_qty` DECIMAL(18,4) DEFAULT 0 COMMENT '不合格数量',
  `inspection_result` TINYINT COMMENT '检验结果: 1-合格, 2-不合格, 3-特采',
  `inspector_id` BIGINT UNSIGNED COMMENT '检验员ID',
  `inspection_date` DATE COMMENT '检验日期',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inspection_no` (`inspection_no`),
  KEY `idx_type` (`inspection_type`),
  KEY `idx_result` (`inspection_result`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='检验单表';

-- 不合格品处理表
CREATE TABLE `qc_unqualified` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `unqualified_no` VARCHAR(50) NOT NULL COMMENT '不合格品编号',
  `inspection_id` BIGINT UNSIGNED COMMENT '检验单ID',
  `material_id` BIGINT UNSIGNED COMMENT '物料ID',
  `batch_no` VARCHAR(50) COMMENT '批次号',
  `unqualified_qty` DECIMAL(18,4) COMMENT '不合格数量',
  `unqualified_type` VARCHAR(50) COMMENT '不合格类型',
  `unqualified_reason` TEXT COMMENT '不合格原因',
  `handle_method` TINYINT COMMENT '处理方式: 1-返工, 2-报废, 3-特采',
  `handle_result` TEXT COMMENT '处理结果',
  `handler_id` BIGINT UNSIGNED COMMENT '处理人ID',
  `handle_date` DATE COMMENT '处理日期',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1-待处理, 2-处理中, 3-已处理',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_unqualified_no` (`unqualified_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='不合格品处理表';

-- ========================================================
-- 初始化数据
-- ========================================================

-- 初始化管理员用户(密码需要加密后存储)
INSERT INTO `sys_user` (`username`, `password`, `real_name`, `status`, `create_time`) VALUES
('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EO', '系统管理员', 1, NOW());

-- 初始化部门
INSERT INTO `sys_department` (`dept_name`, `dept_code`, `sort_order`, `status`, `create_time`) VALUES
('总经办', 'DEPT001', 1, 1, NOW()),
('销售部', 'DEPT002', 2, 1, NOW()),
('采购部', 'DEPT003', 3, 1, NOW()),
('生产部', 'DEPT004', 4, 1, NOW()),
('仓库部', 'DEPT005', 5, 1, NOW()),
('财务部', 'DEPT006', 6, 1, NOW()),
('品质部', 'DEPT007', 7, 1, NOW());

-- 初始化角色
INSERT INTO `sys_role` (`role_name`, `role_code`, `description`, `status`, `create_time`) VALUES
('系统管理员', 'ROLE_ADMIN', '拥有所有权限', 1, NOW()),
('销售人员', 'ROLE_SALES', '销售相关权限', 1, NOW()),
('采购人员', 'ROLE_PURCHASE', '采购相关权限', 1, NOW()),
('仓库人员', 'ROLE_WAREHOUSE', '仓库相关权限', 1, NOW()),
('财务人员', 'ROLE_FINANCE', '财务相关权限', 1, NOW());

-- 初始化字典类型
INSERT INTO `sys_dict_type` (`dict_name`, `dict_code`, `status`, `create_time`) VALUES
('用户状态', 'user_status', 1, NOW()),
('订单状态', 'order_status', 1, NOW()),
('付款方式', 'payment_method', 1, NOW()),
('物料类型', 'material_type', 1, NOW());

-- 初始化字典数据
INSERT INTO `sys_dict_data` (`dict_type_id`, `dict_label`, `dict_value`, `sort_order`, `status`) VALUES
(1, '启用', '1', 1, 1),
(1, '禁用', '0', 2, 1),
(2, '待确认', '1', 1, 1),
(2, '已确认', '2', 2, 1),
(2, '已完成', '3', 3, 1),
(3, '银行转账', 'bank_transfer', 1, 1),
(3, '现金', 'cash', 2, 1),
(3, '支票', 'check', 3, 1),
(4, '原材料', '1', 1, 1),
(4, '半成品', '2', 2, 1),
(4, '成品', '3', 3, 1);

-- 初始化系统配置
INSERT INTO `sys_config` (`config_name`, `config_key`, `config_value`, `config_type`, `description`) VALUES
('系统名称', 'sys.name', 'ERP管理系统', 1, '系统显示名称'),
('系统版本', 'sys.version', 'v1.0.0', 1, '系统版本号'),
('版权信息', 'sys.copyright', '© 2024 All Rights Reserved', 1, '版权信息'),
('默认密码', 'sys.default.password', '123456', 1, '用户默认密码');
