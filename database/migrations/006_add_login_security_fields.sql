-- ========================================================
-- 006: 登录安全字段（登录失败次数、锁定时间、密码修改时间）
-- 来源：migrations/0003_add_login_security_fields.sql
-- 修正：MySQL 不支持 ADD COLUMN IF NOT EXISTS，改用 INFORMATION_SCHEMA 守卫
-- 注意：last_login_time 已存在于 schema.sql，不再重复添加
-- ========================================================

SET @dbname = DATABASE();
SET @tablename = 'sys_user';

-- login_fail_count
SET @colname = 'login_fail_count';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE sys_user ADD COLUMN login_fail_count INT DEFAULT 0 COMMENT ''登录失败次数'''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- lock_time
SET @colname = 'lock_time';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE sys_user ADD COLUMN lock_time DATETIME DEFAULT NULL COMMENT ''账号锁定时间'''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- pwd_update_time
SET @colname = 'pwd_update_time';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE sys_user ADD COLUMN pwd_update_time DATETIME DEFAULT NULL COMMENT ''密码修改时间'''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
