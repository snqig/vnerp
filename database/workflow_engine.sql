-- 审批流引擎数据库表结构

-- 1. 审批流程配置表
CREATE TABLE IF NOT EXISTS `wf_workflow_config` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '流程配置ID',
  `workflow_name` VARCHAR(100) NOT NULL COMMENT '流程名称',
  `module_type` VARCHAR(50) NOT NULL COMMENT '模块类型: sales_order/purchase_order/production_order等',
  `description` VARCHAR(500) COMMENT '流程描述',
  `is_active` TINYINT DEFAULT 0 COMMENT '是否启用: 0-禁用, 1-启用',
  `priority` INT DEFAULT 0 COMMENT '优先级(数字越大优先级越高)',
  `version` INT DEFAULT 1 COMMENT '版本号',
  `create_by` BIGINT COMMENT '创建人',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '逻辑删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module_type`),
  KEY `idx_active` (`is_active`),
  KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB COMMENT='审批流程配置表';

-- 2. 审批节点配置表
CREATE TABLE IF NOT EXISTS `wf_workflow_node` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '节点ID',
  `workflow_id` BIGINT UNSIGNED NOT NULL COMMENT '关联流程ID',
  `node_name` VARCHAR(100) NOT NULL COMMENT '节点名称',
  `node_type` VARCHAR(20) NOT NULL COMMENT '节点类型: start-开始, approve-审批, cc-抄送, end-结束',
  `node_order` INT DEFAULT 1 COMMENT '节点顺序',
  `approver_type` VARCHAR(30) COMMENT '审批人类型: single-单人, multi-多人, role-角色, department_head-部门主管',
  `approver_ids` TEXT COMMENT '审批人ID列表(JSON数组)',
  `approver_names` VARCHAR(500) COMMENT '审批人姓名列表(逗号分隔)',
  `approval_mode` VARCHAR(10) DEFAULT 'and' COMMENT '审批模式: and-会签(全部通过), or-或签(一人通过)',
  `auto_pass_hours` INT DEFAULT 0 COMMENT '自动通过小时数(0表示不自动通过)',
  `is_required` TINYINT DEFAULT 1 COMMENT '是否必填: 0-可选, 1-必填',
  `condition_expression` TEXT COMMENT '条件表达式(如: amount > 10000)',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` TINYINT DEFAULT 0 COMMENT '逻辑删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_workflow` (`workflow_id`),
  KEY `idx_order` (`node_order`)
) ENGINE=InnoDB COMMENT='审批节点配置表';

-- 3. 审批实例表(每次提交审批生成一条记录)
CREATE TABLE IF NOT EXISTS `wf_approval_instance` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '实例ID',
  `workflow_id` BIGINT UNSIGNED COMMENT '关联流程ID',
  `workflow_name` VARCHAR(100) COMMENT '流程名称(冗余)',
  `source_type` VARCHAR(50) NOT NULL COMMENT '业务来源类型',
  `source_id` BIGINT NOT NULL COMMENT '业务来源ID',
  `source_no` VARCHAR(50) COMMENT '业务单号(冗余)',
  `current_node_id` BIGINT UNSIGNED COMMENT '当前节点ID',
  `current_node_name` VARCHAR(100) COMMENT '当前节点名称',
  `status` TINYINT DEFAULT 1 COMMENT '实例状态: 0-草稿, 1-审批中, 2-已暂停, 3-已完成, 4-已驳回, 5-已撤回',
  `initiator_id` BIGINT COMMENT '发起人ID',
  `initiator_name` VARCHAR(50) COMMENT '发起人姓名',
  `amount` DECIMAL(14,2) COMMENT '审批金额(用于条件判断)',
  `urge_count` INT DEFAULT 0 COMMENT '催办次数',
  `complete_time` DATETIME COMMENT '完成时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_source` (`source_type`, `source_id`),
  KEY `idx_status` (`status`),
  KEY `idx_initiator` (`initiator_id`),
  KEY `idx_current_node` (`current_node_id`)
) ENGINE=InnoDB COMMENT='审批实例表';

-- 4. 审批任务表(每个节点生成的任务)
CREATE TABLE IF NOT EXISTS `wf_approval_task` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `instance_id` BIGINT UNSIGNED NOT NULL COMMENT '关联实例ID',
  `node_id` BIGINT UNSIGNED COMMENT '关联节点ID',
  `node_name` VARCHAR(100) COMMENT '节点名称(冗余)',
  `approver_id` BIGINT NOT NULL COMMENT '审批人ID',
  `approver_name` VARCHAR(50) COMMENT '审批人姓名',
  `status` TINYINT DEFAULT 1 COMMENT '任务状态: 1-待审批, 2-已通过, 3-已驳回, 4-已转交, 5-已撤回',
  `action` VARCHAR(20) COMMENT '审批动作: approve-通过, reject-驳回, transfer-转交, delegate-委托',
  `comment` TEXT COMMENT '审批意见',
  `action_time` DATETIME COMMENT '审批时间',
  `transfer_to_id` BIGINT COMMENT '转交人ID',
  `transfer_to_name` VARCHAR(50) COMMENT '转交人姓名',
  `delegate_from_id` BIGINT COMMENT '委托来源ID',
  `delegate_from_name` VARCHAR(50) COMMENT '委托来源姓名',
  `urge_time` DATETIME COMMENT '催办时间',
  `remark` TEXT COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_instance` (`instance_id`),
  KEY `idx_approver` (`approver_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB COMMENT='审批任务表';

-- 5. 审批抄送记录表
CREATE TABLE IF NOT EXISTS `wf_approval_cc` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '抄送ID',
  `instance_id` BIGINT UNSIGNED NOT NULL COMMENT '关联实例ID',
  `node_id` BIGINT UNSIGNED COMMENT '关联节点ID',
  `cc_user_id` BIGINT NOT NULL COMMENT '抄送人ID',
  `cc_user_name` VARCHAR(50) COMMENT '抄送人姓名',
  `is_read` TINYINT DEFAULT 0 COMMENT '是否已读: 0-未读, 1-已读',
  `read_time` DATETIME COMMENT '阅读时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_instance` (`instance_id`),
  KEY `idx_cc_user` (`cc_user_id`),
  KEY `idx_read` (`is_read`)
) ENGINE=InnoDB COMMENT='审批抄送记录表';

-- 6. 审批历史记录表
CREATE TABLE IF NOT EXISTS `wf_approval_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '历史ID',
  `instance_id` BIGINT UNSIGNED NOT NULL COMMENT '关联实例ID',
  `task_id` BIGINT UNSIGNED COMMENT '关联任务ID',
  `action` VARCHAR(20) NOT NULL COMMENT '操作类型: submit-提交, approve-通过, reject-驳回, transfer-转交, callback-撤回, urgue-催办',
  `operator_id` BIGINT COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `from_status` TINYINT COMMENT '操作前状态',
  `to_status` TINYINT COMMENT '操作后状态',
  `comment` TEXT COMMENT '操作意见',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_instance` (`instance_id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_time` (`create_time`)
) ENGINE=InnoDB COMMENT='审批历史记录表';

-- 7. 审批条件规则表
CREATE TABLE IF NOT EXISTS `wf_condition_rule` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '规则ID',
  `workflow_id` BIGINT UNSIGNED NOT NULL COMMENT '关联流程ID',
  `rule_name` VARCHAR(100) NOT NULL COMMENT '规则名称',
  `condition_type` VARCHAR(30) COMMENT '条件类型: amount-金额, quantity-数量, custom-自定义',
  `operator` VARCHAR(10) COMMENT '操作符: >, <, >=, <=, =, !=, in, between',
  `threshold_value` VARCHAR(100) COMMENT '阈值',
  `skip_nodes` VARCHAR(200) COMMENT '跳过的节点ID列表(JSON)',
  `add_nodes` VARCHAR(200) COMMENT '增加的节点ID列表(JSON)',
  `notify_users` TEXT COMMENT '额外通知用户ID(JSON数组)',
  `is_active` TINYINT DEFAULT 1 COMMENT '是否启用',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_workflow` (`workflow_id`)
) ENGINE=InnoDB COMMENT='审批条件规则表';

-- 初始化默认审批流程配置
INSERT INTO `wf_workflow_config` (`workflow_name`, `module_type`, `description`, `is_active`, `priority`) VALUES
('销售订单审批流程', 'sales_order', '销售订单的标准审批流程', 1, 100),
('采购订单审批流程', 'purchase_order', '采购订单的标准审批流程', 1, 90),
('生产工单审批流程', 'production_order', '生产工单的审批流程', 1, 80),
('付款申请审批流程', 'payment_request', '付款申请的审批流程', 1, 110);

-- 插入销售订单审批流程的节点配置
INSERT INTO `wf_workflow_node` (`workflow_id`, `node_name`, `node_type`, `node_order`, `approver_type`, `approver_ids`, `approver_names`, `approval_mode`) VALUES
(1, '开始', 'start', 1, 'single', '[]', '', 'and'),
(1, '主管审批', 'approve', 2, 'role', '[2]', '销售主管', 'and'),
(1, '经理审批', 'approve', 3, 'role', '[3]', '销售经理', 'or'),
(1, '结束', 'end', 4, 'single', '[]', '', 'and');

-- 插入采购订单审批流程的节点配置
INSERT INTO `wf_workflow_node` (`workflow_id`, `node_name`, `node_type`, `node_order`, `approver_type`, `approver_ids`, `approver_names`, `approval_mode`) VALUES
(2, '开始', 'start', 1, 'single', '[]', '', 'and'),
(2, '采购主管审批', 'approve', 2, 'role', '[4]', '采购主管', 'and'),
(2, '财务审批', 'approve', 3, 'role', '[5]', '财务经理', 'and'),
(2, '结束', 'end', 4, 'single', '[]', '', 'and');

-- 插入生产工单审批流程的节点配置
INSERT INTO `wf_workflow_node` (`workflow_id`, `node_name`, `node_type`, `node_order`, `approver_type`, `approver_ids`, `approver_names`, `approval_mode`) VALUES
(3, '开始', 'start', 1, 'single', '[]', '', 'and'),
(3, '生产主管审批', 'approve', 2, 'role', '[6]', '生产主管', 'and'),
(3, '结束', 'end', 3, 'single', '[]', '', 'and');
