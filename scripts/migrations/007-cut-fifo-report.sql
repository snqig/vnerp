-- ============================================================
-- vnerp 丝网印刷 ERP 仓储分切追溯体系改造
-- 版本: 007
-- 描述: 大料分切全链路管理 + 二维码追溯 + FIFO管控 + 动态月报
-- ============================================================

-- ============================================================
-- 1. 物料主数据表扩展
-- ============================================================
ALTER TABLE inv_material
  ADD COLUMN width DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '标准宽幅(mm)',
  ADD COLUMN length DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '大料标准总长(m)',
  ADD COLUMN unit_mark TINYINT NOT NULL DEFAULT 0 COMMENT '单位标记: 0=普通 1=支 2=卷';

-- ============================================================
-- 2. 库存批次表扩展
-- ============================================================
ALTER TABLE inv_inventory_batch
  ADD COLUMN batch_type TINYINT NOT NULL DEFAULT 0 COMMENT '批次类型: 0=大料 1=小料',
  ADD COLUMN width DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '批次宽幅(mm)',
  ADD COLUMN length DECIMAL(10,2) DEFAULT NULL COMMENT '大料总长(m), 小料为空',
  ADD COLUMN parent_batch_id BIGINT UNSIGNED DEFAULT NULL COMMENT '母料批次ID(仅小料)',
  ADD COLUMN qrcode_uid VARCHAR(64) DEFAULT NULL COMMENT '二维码全局唯一ID',
  ADD INDEX idx_parent_batch (parent_batch_id),
  ADD INDEX idx_batch_type (batch_type);

-- ============================================================
-- 3. 出入库明细表扩展(冗余字段,加速报表聚合)
-- ============================================================
ALTER TABLE inv_inbound_item
  ADD COLUMN width DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '宽幅冗余',
  ADD COLUMN batch_type TINYINT NOT NULL DEFAULT 0 COMMENT '批次类型冗余';

ALTER TABLE inv_outbound_item
  ADD COLUMN width DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '宽幅冗余',
  ADD COLUMN batch_type TINYINT NOT NULL DEFAULT 0 COMMENT '批次类型冗余';

-- ============================================================
-- 4. 新增分切单主表
-- ============================================================
CREATE TABLE IF NOT EXISTS split_order (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  split_no VARCHAR(50) NOT NULL COMMENT '分切单号',
  split_date DATE DEFAULT NULL COMMENT '分切日期',
  parent_batch_id BIGINT UNSIGNED NOT NULL COMMENT '母料批次ID',
  material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
  material_name VARCHAR(100) DEFAULT NULL COMMENT '物料名称',
  warehouse_id BIGINT UNSIGNED DEFAULT NULL COMMENT '仓库ID',
  out_qty DECIMAL(12,3) DEFAULT 0.000 COMMENT '出库总数量(辅单位)',
  total_waste DECIMAL(12,3) DEFAULT 0.000 COMMENT '总损耗',
  total_cost DECIMAL(18,4) DEFAULT NULL COMMENT '总成本',
  status TINYINT DEFAULT 0 COMMENT '状态: 0=草稿 1=已审核 3=已作废',
  remark TEXT COMMENT '备注',
  operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
  operator_name VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
  audit_time DATETIME DEFAULT NULL COMMENT '审核时间',
  auditor_id BIGINT UNSIGNED DEFAULT NULL COMMENT '审核人ID',
  auditor_name VARCHAR(50) DEFAULT NULL COMMENT '审核人姓名',
  version INT DEFAULT 0 COMMENT '乐观锁版本',
  create_by BIGINT UNSIGNED DEFAULT NULL,
  update_by BIGINT UNSIGNED DEFAULT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT DEFAULT 0,
  INDEX idx_split_no (split_no),
  INDEX idx_parent_batch (parent_batch_id),
  INDEX idx_material (material_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分切单主表';

-- ============================================================
-- 5. 新增分切单明细表
-- ============================================================
CREATE TABLE IF NOT EXISTS split_order_detail (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  split_id BIGINT UNSIGNED NOT NULL COMMENT '分切单ID',
  child_batch_id BIGINT UNSIGNED DEFAULT NULL COMMENT '子料批次ID(审核后填充)',
  child_batch_no VARCHAR(50) DEFAULT NULL COMMENT '子料批次号',
  pieces DECIMAL(10,0) DEFAULT 1 COMMENT '分切份数',
  qty_per_piece DECIMAL(12,3) DEFAULT 0.000 COMMENT '单份数量',
  total_qty DECIMAL(12,3) DEFAULT 0.000 COMMENT '总数量',
  width DECIMAL(10,2) DEFAULT 0.00 COMMENT '子料宽幅(mm)',
  allocated_cost DECIMAL(18,4) DEFAULT NULL COMMENT '分摊成本',
  is_waste TINYINT DEFAULT 0 COMMENT '是否损耗: 0=正品 1=损耗',
  remark TEXT COMMENT '备注',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_split (split_id),
  INDEX idx_child_batch (child_batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分切单明细表';

-- ============================================================
-- 6. 新增用户报表配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS report_user_config (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  report_key VARCHAR(50) NOT NULL COMMENT '报表标识',
  selected_fields JSON DEFAULT NULL COMMENT '已勾选字段',
  selected_categories JSON DEFAULT NULL COMMENT '已勾选业务分类',
  date_range JSON DEFAULT NULL COMMENT '日期范围配置',
  view_mode VARCHAR(20) DEFAULT 'all' COMMENT '视图模式: all/large/small',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_report (user_id, report_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户报表配置表';

-- ============================================================
-- 7. 新增FIFO管控模式系统配置
-- ============================================================
INSERT INTO sys_config (config_key, config_value, description)
VALUES ('fifo_control_mode', 'off', 'FIFO出库管控模式: off=关闭 hint=提示 force=强制')
ON DUPLICATE KEY UPDATE config_value = 'off', description = VALUES(description);

-- ============================================================
-- 8. 数据清洗: 解析存量规格文本填充width/length
-- ============================================================
UPDATE inv_material
SET width = CAST(SUBSTRING_INDEX(specification, '*', 1) AS DECIMAL(10,2)),
    length = CASE
      WHEN specification LIKE '%*%' THEN CAST(SUBSTRING_INDEX(specification, '*', -1) AS DECIMAL(10,2))
      ELSE NULL
    END
WHERE specification IS NOT NULL AND specification != ''
  AND (width = 0 OR width IS NULL);

-- ============================================================
-- 9. 回滚脚本 (注释状态, 需要时取消注释执行)
-- ============================================================
/*
-- 回滚: 删除新增字段
ALTER TABLE inv_material
  DROP COLUMN width,
  DROP COLUMN length,
  DROP COLUMN unit_mark;

ALTER TABLE inv_inventory_batch
  DROP COLUMN batch_type,
  DROP COLUMN width,
  DROP COLUMN length,
  DROP COLUMN parent_batch_id,
  DROP COLUMN qrcode_uid;

ALTER TABLE inv_inbound_item
  DROP COLUMN width,
  DROP COLUMN batch_type;

ALTER TABLE inv_outbound_item
  DROP COLUMN width,
  DROP COLUMN batch_type;

-- 回滚: 删除新增表
DROP TABLE IF EXISTS split_order_detail;
DROP TABLE IF EXISTS split_order;
DROP TABLE IF EXISTS report_user_config;

-- 回滚: 删除系统配置
DELETE FROM sys_config WHERE config_key = 'fifo_control_mode';
*/
