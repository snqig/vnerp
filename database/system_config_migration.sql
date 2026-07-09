-- ========================================================
-- 印刷生产经营信息管理系统 Print MIS 系统全局配置表升级脚本
-- 功能：完善系统配置表结构，支持更丰富的配置功能
-- ========================================================

USE `vnerpdacahng`;

-- 1. 备份原配置表（如果存在）
CREATE TABLE IF NOT EXISTS `sys_config_backup` AS SELECT * FROM `sys_config`;

-- 2. 删除原表（可选，或者直接修改表结构）
-- 这里我们选择修改表结构以保留现有数据

ALTER TABLE `sys_config` 
MODIFY COLUMN `config_key` VARCHAR(100) NOT NULL COMMENT '配置键名',
MODIFY COLUMN `config_value` TEXT NOT NULL COMMENT '配置值',
ADD COLUMN `config_type_enum` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '值类型' AFTER `config_value`,
ADD COLUMN `category` VARCHAR(50) NOT NULL DEFAULT '其他' COMMENT '配置分类' AFTER `config_type_enum`,
ADD COLUMN `display_name` VARCHAR(100) NOT NULL COMMENT '显示名称' AFTER `category`,
ADD COLUMN `sort_order` INT DEFAULT 0 COMMENT '排序序号' AFTER `display_name`,
ADD COLUMN `is_required` TINYINT(1) DEFAULT 0 COMMENT '是否必填' AFTER `sort_order`,
ADD COLUMN `approval_required` TINYINT(1) DEFAULT 0 COMMENT '修改需审批' AFTER `is_required`,
ADD COLUMN `status` TINYINT DEFAULT 1 COMMENT '状态：1=启用，0=禁用' AFTER `approval_required`;

-- 3. 创建配置变更审批记录表（用于审批流程）
CREATE TABLE IF NOT EXISTS `sys_config_change_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `old_value` TEXT NOT NULL COMMENT '旧值',
  `new_value` TEXT NOT NULL COMMENT '新值',
  `operator_id` INT NOT NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `remark` VARCHAR(500) COMMENT '变更说明',
  `status` TINYINT DEFAULT 0 COMMENT '0=待审批，1=已通过，2=已驳回',
  `approver_id` INT NULL COMMENT '审批人ID',
  `approver_name` VARCHAR(50) COMMENT '审批人姓名',
  `approve_time` DATETIME NULL COMMENT '审批时间',
  `approve_remark` VARCHAR(500) COMMENT '审批意见',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_config_key` (`config_key`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='配置变更审批记录表';

-- 4. 初始化完整的系统配置（丝网印刷 ERP 专用配置）
-- 如果记录已存在则跳过，否则插入
INSERT INTO `sys_config` 
(`config_name`, `config_key`, `config_value`, `config_type_enum`, `category`, `display_name`, `description`, `sort_order`, `is_required`, `approval_required`, `status`)
VALUES 
-- ========================================================
-- 一、编码规则配置
-- ========================================================
('单据流水号长度', 'serial_number_length', '4', 'number', '单据编码规则', '流水号长度', '所有单据末尾流水号位数(2-6)', 1, 1, 0, 1),
('单据日期格式', 'doc_date_format', 'YYYYMMDD', 'string', '单据编码规则', '单据日期格式', '所有单据编号中的日期格式', 2, 1, 0, 1),
('生产工单前缀', 'wo_prefix', 'WO', 'string', '单据编码规则', '生产工单前缀', '生产工单编号前缀', 3, 1, 1, 1),
('打样工单前缀', 'sample_prefix', 'SAMPLE', 'string', '单据编码规则', '打样工单前缀', '打样工单编号前缀', 4, 1, 1, 1),
('领料单前缀', 'mr_prefix', 'MR', 'string', '单据编码规则', '领料单前缀', '物料领用单编号前缀', 5, 1, 1, 1),
('成品入库前缀', 'fpr_prefix', 'FPR', 'string', '单据编码规则', '成品入库前缀', '成品入库单编号前缀', 6, 1, 1, 1),
('发货单前缀', 'sh_prefix', 'SH', 'string', '单据编码规则', '发货单前缀', '发货单编号前缀', 7, 1, 1, 1),
('采购订单前缀', 'po_prefix', 'PO', 'string', '单据编码规则', '采购订单前缀', '采购订单编号前缀', 8, 1, 1, 1),
('检验单前缀', 'qc_prefix', 'QC', 'string', '单据编码规则', '检验单前缀', '质检检验单编号前缀', 9, 1, 1, 1),
('标准卡编码前缀', 'sc_prefix', 'SC', 'string', '单据编码规则', '标准卡编码前缀', '标准卡编号前缀(颜色SCC/工艺SCP/质量SCQ/综合SCZ)', 10, 1, 1, 1),

-- ========================================================
-- 二、刀模寿命配置
-- ========================================================
('刀模有效天数', 'mould_life_days', '90', 'number', '刀模/网版寿命', '刀模有效天数', '刀模从启用到报废的有效天数', 20, 1, 1, 1),
('刀模最大使用次数', 'mould_max_times', '5000', 'number', '刀模/网版寿命', '刀模最大使用次数', '刀模最大允许使用次数', 21, 1, 1, 1),
('刀模预警天数', 'mould_warn_days', '15', 'number', '刀模/网版寿命', '刀模预警天数', '刀模到期前多少天开始预警', 22, 1, 0, 1),
('刀模报废规则', 'mould_scrap_rule', 'both', 'string', '刀模/网版寿命', '刀模报废规则', '报废规则：both=到期+超次数自动报废, date_only=仅到期, times_only=仅超次数', 23, 1, 1, 1),

-- ========================================================
-- 三、网版寿命配置
-- ========================================================
('网版有效天数', 'screen_life_days', '60', 'number', '刀模/网版寿命', '网版有效天数', '网版从启用到报废的有效天数', 24, 1, 1, 1),
('网版最大使用次数', 'screen_max_times', '3000', 'number', '刀模/网版寿命', '网版最大使用次数', '网版最大允许使用次数', 25, 1, 1, 1),
('网版预警天数', 'screen_warn_days', '10', 'number', '刀模/网版寿命', '网版预警天数', '网版到期前多少天开始预警', 26, 1, 0, 1),

-- ========================================================
-- 四、原材料/油墨保质期
-- ========================================================
('PET/PVC薄膜保质期', 'pet_film_shelf_life', '360', 'number', '原材料保质期', 'PET/PVC薄膜保质期', 'PET/PVC薄膜的有效保质期天数', 30, 1, 1, 1),
('溶剂保质期', 'solvent_shelf_life', '180', 'number', '原材料保质期', '溶剂保质期', '印刷溶剂的有效保质期天数', 31, 1, 1, 1),
('油墨未开盖保质期', 'ink_unopened_shelf_life', '180', 'number', '原材料保质期', '油墨未开盖保质期', '油墨未开盖状态下的保质期天数', 32, 1, 1, 1),
('油墨开盖后保质期', 'ink_opened_shelf_life', '30', 'number', '原材料保质期', '油墨开盖后保质期', '油墨开盖后的保质期天数', 33, 1, 1, 1),
('混合油墨必须用完时长', 'mixed_ink_expiry_hours', '24', 'number', '原材料保质期', '混合油墨过期时间', '混合油墨配制后的有效使用时长（小时）', 34, 1, 1, 1),
('辅料/胶水保质期', 'glue_shelf_life', '90', 'number', '原材料保质期', '辅料/胶水保质期', '胶水和辅料的保质期天数', 35, 1, 1, 1),
('原材料预警天数', 'material_warn_days', '30', 'number', '原材料保质期', '原材料预警天数', '所有原材料统一预警提前天数', 36, 1, 0, 1),

-- ========================================================
-- 五、小料拆分标准
-- ========================================================
('PET薄膜拆分长度', 'film_split_length', '10', 'number', '小料拆分标准', 'PET薄膜拆分长度', '整卷PET薄膜拆分成小料的长度单位（米）', 40, 1, 1, 1),
('PVC薄膜拆分长度', 'pvc_split_length', '10', 'number', '小料拆分标准', 'PVC薄膜拆分长度', '整卷PVC薄膜拆分成小料的长度单位（米）', 41, 1, 1, 1),
('油墨拆分重量', 'ink_split_weight', '1', 'number', '小料拆分标准', '油墨拆分重量', '整桶油墨拆分成小料的重量单位（kg）', 42, 1, 1, 1),
('溶剂拆分容积', 'solvent_split_volume', '5', 'number', '小料拆分标准', '溶剂拆分容积', '整桶溶剂拆分成小料的容积单位（L）', 43, 1, 1, 1),
('网布拆分长度', 'mesh_split_length', '10', 'number', '小料拆分标准', '网布拆分长度', '整卷网布拆分成小料的长度单位（米）', 44, 1, 1, 1),

-- ========================================================
-- 六、仓库管理规则
-- ========================================================
('强制先进先出(FIFO)', 'fifo_enabled', 'true', 'boolean', '仓库管理规则', '强制先进先出', '是否强制按入库时间先进先出出库', 50, 1, 1, 1),
('允许整料直接发料', 'allow_whole_material_issue', 'false', 'boolean', '仓库管理规则', '允许整料直接发料', '是否允许未拆分的整料直接发料（建议关闭）', 51, 1, 1, 1),
('领料优先级', 'requisition_priority', 'expiry_first', 'string', '仓库管理规则', '领料优先级', 'expiry_first=先到期先出，fifo=标准先进先出', 52, 1, 1, 1),
('允许无单发料', 'allow_no_issue_without_order', 'false', 'boolean', '仓库管理规则', '允许无单发料', '是否允许没有订单直接发料（建议关闭）', 53, 1, 1, 1),
('超领需要审批', 'over_requisition_approval', 'true', 'boolean', '仓库管理规则', '超领需要审批', '超过标准定额领料是否需要审批', 54, 1, 1, 1),
('补料需要双审批', 'replenish_dual_approval', 'true', 'boolean', '仓库管理规则', '补料需要双审批', '补料是否需要仓库主管+生产经理双重审批', 55, 1, 1, 1),
('呆滞料判定天数', 'obsolete_material_days', '90', 'number', '仓库管理规则', '呆滞料判定天数', '库存超过此天数未动销判定为呆滞料', 56, 1, 0, 1),

-- ========================================================
-- 七、循环盘点周期
-- ========================================================
('A类物料盘点周期', 'a_class_cycle', '7', 'string', '盘点周期管理', 'A类物料盘点周期', 'A类高价值物料盘点周期(天)', 60, 1, 1, 1),
('B类物料盘点周期', 'b_class_cycle', '30', 'string', '盘点周期管理', 'B类物料盘点周期', 'B类中价值物料盘点周期(天)', 61, 1, 1, 1),
('C类物料盘点周期', 'c_class_cycle', '90', 'string', '盘点周期管理', 'C类物料盘点周期', 'C类低价值物料盘点周期(天)', 62, 1, 1, 1),

-- ========================================================
-- 八、生产与品质规则
-- ========================================================
('允许跳工序报工', 'allow_skip_process', 'false', 'boolean', '生产与品质规则', '允许跳工序报工', '是否允许跳过工序顺序进行报工（建议关闭）', 70, 1, 1, 1),
('允许重复报工', 'allow_duplicate_reporting', 'false', 'boolean', '生产与品质规则', '允许重复报工', '是否允许同一工序重复报工（建议关闭）', 71, 1, 1, 1),
('成品入库前必须检验', 'quality_check_mandatory', 'true', 'boolean', '生产与品质规则', '成品入库前必须检验', '成品入库前是否必须经过FQC检验', 72, 1, 1, 1),
('发货前必须OQC检验', 'oqc_before_ship', 'true', 'boolean', '生产与品质规则', '发货前必须OQC检验', '发货前是否必须经过OQC出货检验', 73, 1, 1, 1),

-- ========================================================
-- 九、审批规则
-- ========================================================
('参数修改需要审批', 'require_approval_for_config_change', 'true', 'boolean', '审批规则', '配置修改需审批', '修改系统参数是否需要审批流程', 80, 1, 0, 1),
('配置审批角色', 'config_approver_role', 'system_admin', 'string', '审批规则', '审批人角色', '配置变更的审批人角色', 81, 1, 0, 1),
('参数生效方式', 'config_effect_mode', 'immediate', 'string', '审批规则', '生效方式', 'immediate=立即生效, next_day=次日生效', 82, 1, 0, 1),

-- ========================================================
-- 十、基础系统配置（保留原配置）
-- ========================================================
('系统名称', 'sys.name', '印刷生产经营信息管理系统 Print MIS丝网印刷管理系统', 'string', '系统基础配置', '系统名称', '系统显示名称', 90, 1, 0, 1),
('系统版本', 'sys.version', 'v2.0.0', 'string', '系统基础配置', '系统版本号', '系统版本号', 91, 1, 0, 1),
('版权信息', 'sys.copyright', '© 2024 印刷生产经营信息管理系统 Print MIS. All Rights Reserved.', 'string', '系统基础配置', '版权信息', '版权声明信息', 92, 1, 0, 1),
('默认密码', 'sys.default.password', 'admin123', 'string', '系统基础配置', '用户默认密码', '新用户默认密码', 93, 1, 0, 1)
ON DUPLICATE KEY UPDATE 
`display_name` = VALUES(`display_name`),
`category` = VALUES(`category`),
`description` = VALUES(`description`),
`sort_order` = VALUES(`sort_order`),
`is_required` = VALUES(`is_required`),
`approval_required` = VALUES(`approval_required`),
`update_time` = CURRENT_TIMESTAMP;

-- ========================================================
-- 完成信息
-- ========================================================
SELECT '系统配置表升级完成！' AS message;
