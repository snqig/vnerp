-- ========================================================
-- 010: sys_user.first_login 列
-- 用途：首次登录强制改密标记（0-否, 1-是）
-- 来源：原先仅由 src/app/api/init/migrate/route.ts 运行时动态添加，
--       未同步到权威 schema.sql，导致 schema 不一致。
--       本迁移将列正式纳入迁移链，新环境由 schema.sql 直接创建，
--       旧环境通过本迁移补齐。
-- 兼容：MySQL 不支持 ADD COLUMN IF NOT EXISTS，使用 INFORMATION_SCHEMA 守卫
-- ========================================================

SET @dbname = DATABASE();
SET @tablename = 'sys_user';

SET @colname = 'first_login';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE sys_user ADD COLUMN first_login TINYINT DEFAULT 1 COMMENT ''是否首次登录: 0-否, 1-是'' AFTER pwd_update_time'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
