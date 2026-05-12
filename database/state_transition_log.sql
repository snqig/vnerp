-- 状态流转日志表
CREATE TABLE IF NOT EXISTS `sys_state_transition_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` VARCHAR(50) NOT NULL COMMENT '实体类型: inspect/process/sales/purchase',
  `entity_id` BIGINT UNSIGNED NOT NULL COMMENT '实体ID',
  `from_status` VARCHAR(50) NOT NULL COMMENT '原状态',
  `to_status` VARCHAR(50) NOT NULL COMMENT '目标状态',
  `condition_check` TEXT COMMENT '条件检查上下文JSON',
  `passed` TINYINT DEFAULT 1 COMMENT '是否通过: 0-失败, 1-通过',
  `operator_id` BIGINT COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `remark` VARCHAR(500) COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entity` (`entity_type`, `entity_id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='状态流转日志表';

-- 库存流水防篡改触发器（必须先检查是否存在）
DELIMITER //
DROP TRIGGER IF EXISTS `trg_prevent_inv_trans_update`//
CREATE TRIGGER `trg_prevent_inv_trans_update`
BEFORE UPDATE ON `inv_inventory_transaction`
FOR EACH ROW
BEGIN
  IF OLD.trans_no = NEW.trans_no AND OLD.create_time = NEW.create_time THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = '库存流水禁止修改';
  END IF;
END//

DROP TRIGGER IF EXISTS `trg_prevent_inv_trans_delete`//
CREATE TRIGGER `trg_prevent_inv_trans_delete`
BEFORE DELETE ON `inv_inventory_transaction`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = '库存流水禁止删除';
END//
DELIMITER ;

-- 禁止负库存触发器
DELIMITER //
DROP TRIGGER IF EXISTS `trg_prevent_negative_inventory`//
CREATE TRIGGER `trg_prevent_negative_inventory`
BEFORE UPDATE ON `inv_inventory`
FOR EACH ROW
BEGIN
  IF NEW.quantity < 0 AND NEW.deleted = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = '库存数量不能为负数';
  END IF;
END//
DELIMITER ;
