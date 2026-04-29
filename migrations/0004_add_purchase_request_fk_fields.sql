-- 采购请购单表结构增强迁移
-- 增加字段：request_dept_id, requester_id, reviewer_id, reviewer_name, approver_id, approver_name
-- 明细表增加字段：material_id

-- 幂等执行：先检查列是否存在再添加

-- 主表新增字段
SET @dbname = DATABASE();
SET @tablename = 'pur_request';

-- request_dept_id
SET @colname = 'request_dept_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE pur_request ADD COLUMN request_dept_id INT UNSIGNED DEFAULT NULL COMMENT ''申请部门ID'' AFTER request_type'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- requester_id
SET @colname = 'requester_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE pur_request ADD COLUMN requester_id INT UNSIGNED DEFAULT NULL COMMENT ''申请人ID'' AFTER request_dept'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- reviewer_id
SET @colname = 'reviewer_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE pur_request ADD COLUMN reviewer_id INT UNSIGNED DEFAULT NULL COMMENT ''审校人ID'' AFTER requester_name'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- reviewer_name
SET @colname = 'reviewer_name';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE pur_request ADD COLUMN reviewer_name VARCHAR(50) DEFAULT NULL COMMENT ''审校人姓名'' AFTER reviewer_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- approver_id
SET @colname = 'approver_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE pur_request ADD COLUMN approver_id INT UNSIGNED DEFAULT NULL COMMENT ''批准人ID'' AFTER reviewer_name'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- approver_name
SET @colname = 'approver_name';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE pur_request ADD COLUMN approver_name VARCHAR(50) DEFAULT NULL COMMENT ''批准人姓名'' AFTER approver_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 明细表新增 material_id
SET @tablename = 'pur_request_item';
SET @colname = 'material_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE pur_request_item ADD COLUMN material_id INT UNSIGNED DEFAULT NULL COMMENT ''物料ID'' AFTER line_no'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 为 material_id 添加索引
SET @indexname = 'idx_material_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = @indexname) > 0,
  'SELECT 1',
  'ALTER TABLE pur_request_item ADD INDEX idx_material_id (material_id)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 回填：根据 request_dept 匹配 sys_department.id 更新 request_dept_id
UPDATE pur_request pr
LEFT JOIN sys_department d ON pr.request_dept = d.dept_name
SET pr.request_dept_id = d.id
WHERE pr.request_dept_id IS NULL AND pr.request_dept IS NOT NULL AND d.id IS NOT NULL;

-- 回填：根据 requester_name 匹配 sys_employee 更新 requester_id
UPDATE pur_request pr
LEFT JOIN sys_employee e ON pr.requester_name = e.name
SET pr.requester_id = e.id
WHERE pr.requester_id IS NULL AND pr.requester_name IS NOT NULL AND e.id IS NOT NULL;

-- 回填：根据 material_name 匹配 inv_material 更新 material_id
UPDATE pur_request_item pri
LEFT JOIN inv_material m ON pri.material_name = m.material_name
SET pri.material_id = m.id
WHERE pri.material_id IS NULL AND pri.material_name IS NOT NULL AND m.id IS NOT NULL;
