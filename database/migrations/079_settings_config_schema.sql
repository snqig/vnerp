-- =====================================================
-- 079: 系统配置（sys_config）结构收敛 —— BUG-SET-002 / 012
--
-- 背景：
--   原实现把结构变更挂在请求路径上做「懒迁移」：
--     ① GET /api/settings/system 的 ensureConfigTableColumns() 拼出
--        ALTER TABLE sys_config ADD COLUMN config_type_enum <中文词条>
--        （ts('k_1hoaz9s') 的真实取值是「配置类型」，不是合法类型）
--        语句必然报错，又被 catch (_e) {} 吞掉 ⇒ 这 8 列的自动补齐从未生效过；
--     ② system/route.ts POST 用 execute(ts('k_jyctof')) 把翻译词条当 DDL 建
--        sys_config_change_log；change-approval POST 在 INSERT 失败时
--        CREATE TABLE IF NOT EXISTS 建 sys_config_change_request。
--
--   结构变更属于迁移的职责，不应由读接口持有 DDL 权限。
--   本迁移把上述三件事一次性收到正式路径上，之后：
--     - 启动任务 / CLI 只管**数据**（种子）；
--     - 读接口是纯读。
--
-- 幂等：information_schema 探测 + 动态 SQL + CREATE TABLE IF NOT EXISTS
--       （MySQL 8.0 不支持 ADD COLUMN IF NOT EXISTS，那是 MariaDB 语法）
-- =====================================================

-- -----------------------------------------------------
-- 1. sys_config 补齐 8 个业务列（列定义以 live 库权威定义为准）
-- -----------------------------------------------------
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_config' AND COLUMN_NAME = 'config_type_enum');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sys_config` ADD COLUMN `config_type_enum` varchar(20) DEFAULT ''string'' COMMENT ''值类型: string/number/boolean/json''',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_config' AND COLUMN_NAME = 'category');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sys_config` ADD COLUMN `category` varchar(50) DEFAULT ''系统基础配置'' COMMENT ''配置分类''',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_config' AND COLUMN_NAME = 'display_name');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sys_config` ADD COLUMN `display_name` varchar(100) DEFAULT NULL COMMENT ''显示名称''',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_config' AND COLUMN_NAME = 'description');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sys_config` ADD COLUMN `description` varchar(255) DEFAULT NULL COMMENT ''描述''',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_config' AND COLUMN_NAME = 'sort_order');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sys_config` ADD COLUMN `sort_order` int DEFAULT 0 COMMENT ''排序号''',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_config' AND COLUMN_NAME = 'is_required');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sys_config` ADD COLUMN `is_required` tinyint DEFAULT 0 COMMENT ''是否必填: 1-是, 0-否''',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_config' AND COLUMN_NAME = 'approval_required');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sys_config` ADD COLUMN `approval_required` tinyint DEFAULT 0 COMMENT ''是否需要审批: 1-是, 0-否''',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_config' AND COLUMN_NAME = 'status');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sys_config` ADD COLUMN `status` tinyint DEFAULT 1 COMMENT ''状态: 1-启用, 0-禁用''',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------
-- 2. sys_config_change_log —— 配置变更审批流水（system/route.ts 使用）
--    结构对照 live 库 SHOW CREATE TABLE 复刻，先于 1 号表建立
--    （它此前由翻译词条 k_jyctof 承载 DDL，属于「schema 由语言包驱动」的反模式）
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_config_change_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `old_value` text NOT NULL COMMENT '旧值',
  `new_value` text NOT NULL COMMENT '新值',
  `operator_id` int NOT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人姓名',
  `remark` varchar(500) DEFAULT NULL COMMENT '变更说明',
  `status` tinyint DEFAULT '0' COMMENT '0=待审批，1=已通过，2=已驳回',
  `approver_id` int DEFAULT NULL COMMENT '审批人ID',
  `approver_name` varchar(50) DEFAULT NULL COMMENT '审批人姓名',
  `approve_time` datetime DEFAULT NULL COMMENT '审批时间',
  `approve_remark` varchar(500) DEFAULT NULL COMMENT '审批意见',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_config_key` (`config_key`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='配置变更审批记录表';

-- -----------------------------------------------------
-- 3. sys_config_change_request —— 变更申请单（change-approval/route.ts 使用）
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_config_change_request` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module` varchar(100) NOT NULL,
  `config_key` varchar(200) NOT NULL,
  `old_value` text,
  `new_value` text NOT NULL,
  `change_type` varchar(20) DEFAULT 'update',
  `reason` text,
  `applicant_id` int DEFAULT '0',
  `applicant_name` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `approver_id` int DEFAULT NULL,
  `approver_name` varchar(100) DEFAULT NULL,
  `approve_time` datetime DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------
-- 4. 说明：种子数据（DEFAULT_CONFIGS 的 127 个键）不在此迁移内
--
--   种子的**唯一真相源**是 src/lib/system-config-seed.ts，
--   由启动任务（src/instrumentation.ts）或手工 CLI 执行：
--     npx tsx scripts/seed-system-config.ts
--   不把 127 个键搬进 SQL，是为了避免「同一份默认值维护两处」。
-- -----------------------------------------------------
