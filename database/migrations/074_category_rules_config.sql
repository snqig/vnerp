-- =====================================================
-- 074: 分类规则配置化 + sys_warehouse_category 列补齐
--
-- 背景：
--   系统设置里的"分类编码规则"（^MAT-CAT-\d{3,}$ / ^WH-CAT-\d{3,}$）此前
--   硬编码在 src/app/api/settings/category-rules/route.ts 的常量里，
--   既不可配置，也从未被任何录入端执行过（校验器本身查错列名，见下）。
--
--   本迁移把规则落到 sys_calc_param，使其成为真正的"系统设置"，
--   由 src/lib/category-validation.ts 统一读取，前后端共用同一份规则。
--
-- 幂等：ON DUPLICATE KEY UPDATE + information_schema 探测 + 动态 SQL
--       （MySQL 8.0 不支持 ADD COLUMN IF NOT EXISTS，那是 MariaDB 语法）
-- =====================================================

-- -----------------------------------------------------
-- 1. 分类规则参数（category 分类）
-- -----------------------------------------------------
INSERT INTO `sys_calc_param` (`category`, `param_key`, `param_value`, `value_type`, `default_value`, `description`) VALUES
-- 物料分类
('category', 'category.material.code_pattern',      '^MAT-CAT-\\d{3,}$', 'string', '^MAT-CAT-\\d{3,}$', '物料分类编码正则。新增分类时强制校验，不符合则拒绝保存'),
('category', 'category.material.code_pattern_desc', 'MAT-CAT-XXX（3位以上数字）', 'string', 'MAT-CAT-XXX（3位以上数字）', '物料分类编码规则的中文描述，用于错误提示与前端占位符'),
('category', 'category.material.max_depth',         '4',                 'int',    '4',                 '物料分类最大层级深度，超过则拒绝新增子分类'),
-- 仓库分类
('category', 'category.warehouse.code_pattern',      '^WH-CAT-\\d{3,}$',  'string', '^WH-CAT-\\d{3,}$',  '仓库分类编码正则。新增分类时强制校验，不符合则拒绝保存'),
('category', 'category.warehouse.code_pattern_desc', 'WH-CAT-XXX（3位以上数字）', 'string', 'WH-CAT-XXX（3位以上数字）', '仓库分类编码规则的中文描述，用于错误提示与前端占位符'),
('category', 'category.warehouse.max_depth',         '3',                 'int',    '3',                 '仓库分类最大层级深度（当前仓库分类为单层，预留）'),
-- 拦截策略：新增强制、编辑放行（存量不合规数据不被锁死）
('category', 'category.enforce_on_create',           'true',              'boolean','true',              '新增分类时是否强制校验编码规则（true=不符合直接拒绝）'),
('category', 'category.enforce_on_update',           'false',             'boolean','false',             '编辑分类时是否强制校验编码规则（false=仅提示，避免锁死存量不合规数据）'),
-- 业务单据侧：采购/领料等使用物料时是否要求物料已归类
('category', 'category.require_on_business',         'false',             'boolean','false',             '采购等业务单据是否强制要求物料已归类（false=仅提示不拦截，true=未归类物料直接拒绝提交）')
ON DUPLICATE KEY UPDATE
  `param_value`   = VALUES(`param_value`),
  `value_type`    = VALUES(`value_type`),
  `default_value` = VALUES(`default_value`),
  `description`   = VALUES(`description`),
  `status`        = 1,
  `deleted`       = 0;

-- -----------------------------------------------------
-- 2. sys_warehouse_category 补齐 deleted 列
--
-- 权威快照 database/vnerpdacahng_schema.sql 里该表【没有】deleted 列，
-- 但 database/warehouse_category.sql 与全部业务代码都在 WHERE deleted = 0。
-- 这是 category-rules / category-linkage 校验器失效的原因之一。
--
-- 注意：MySQL 8.0 不支持 ALTER TABLE ... ADD COLUMN IF NOT EXISTS
--       （那是 MariaDB 语法），因此用 information_schema 探测 + 动态 SQL。
--       迁移运行器按 ';' 切分后在同一连接上逐条执行，会话变量与
--       prepared statement 均可跨语句保持。
-- -----------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'sys_warehouse_category'
     AND COLUMN_NAME  = 'deleted'
);

SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sys_warehouse_category` ADD COLUMN `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT ''软删除: 0-正常, 1-已删除''',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'sys_warehouse_category'
     AND INDEX_NAME   = 'idx_deleted'
);

SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE `sys_warehouse_category` ADD INDEX `idx_deleted` (`deleted`)',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------
-- 3. inv_warehouse 补齐 category_id 列
--
-- 权威快照里 inv_warehouse 【没有】category_id，唯一添加它的脚本
-- database/alter_warehouse_add_category.sql 引用了 w.code / w.name / w.type
-- 这三个不存在的列（真实列名是 warehouse_code / warehouse_name / warehouse_type），
-- 脚本本身跑不通 → 该列在 live 库大概率缺失。
--
-- 后果：
--   - DELETE /api/organization/warehouse-category 的"分类下是否有仓库"守卫
--     会抛 Unknown column 'category_id' → 删除分类恒定 500；
--   - /api/init/warehouse-category 的 LEFT JOIN 同样报错。
-- -----------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'inv_warehouse'
     AND COLUMN_NAME  = 'category_id'
);

SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `inv_warehouse` ADD COLUMN `category_id` BIGINT UNSIGNED DEFAULT NULL COMMENT ''仓库分类ID（sys_warehouse_category.id）''',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'inv_warehouse'
     AND INDEX_NAME   = 'idx_warehouse_category_id'
);

SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE `inv_warehouse` ADD INDEX `idx_warehouse_category_id` (`category_id`)',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

-- 说明：此处刻意【不加】外键约束。sys_warehouse_category.id 是
-- bigint unsigned（权威快照）而 warehouse_category.sql 建表用 INT UNSIGNED，
-- 两套定义并存时加 FK 会在部分环境直接失败；先补列保证功能可用，
-- FK 留待 DBA 确认 live 库真实类型后单独处理。

-- -----------------------------------------------------
-- 4. inv_material_category 补齐 category_type / remark 列
--
-- 权威快照里这两列【不存在】，但以下位置都在读写它们：
--   - 前端 base-data/material-category 页有"分类类型"下拉（选了会被静默丢弃）
--   - src/app/api/init/supplement-tables/route.ts 的建表语句含这两列
--   - init/settings-seed、init/core-flow-seed、init/warehouse-category-seed
--     的 INSERT / SELECT 都引用 category_type
-- 即：live 库缺列时，这些初始化按钮一律 Unknown column 报错。
-- -----------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'inv_material_category'
     AND COLUMN_NAME  = 'category_type'
);

SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `inv_material_category` ADD COLUMN `category_type` TINYINT DEFAULT NULL COMMENT ''分类类型: 1-原材料,2-半成品,3-成品,4-辅料,5-包材,6-油墨,7-溶剂,8-网版,9-刀具,10-设备配件''',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'inv_material_category'
     AND COLUMN_NAME  = 'remark'
);

SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `inv_material_category` ADD COLUMN `remark` VARCHAR(255) DEFAULT NULL COMMENT ''备注''',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------
-- 5. 存量不合规数据自查（只读，不自动改数据）
--
-- 按"新增强制 + 编辑放行"策略，存量不合规编码不做自动改写
-- （改编码会波及 inv_material.category_id 之外的人工记忆与外部对账）。
-- 运维可执行以下语句列出待整改清单：
--
--   SELECT id, category_code, category_name
--     FROM inv_material_category
--    WHERE deleted = 0 AND category_code NOT REGEXP '^MAT-CAT-[0-9]{3,}$';
--
--   SELECT id, code, name
--     FROM sys_warehouse_category
--    WHERE deleted = 0 AND code NOT REGEXP '^WH-CAT-[0-9]{3,}$';
--
-- 也可在「系统设置 → 分类规则校验」页面直接查看（本次已修复该页）。
-- -----------------------------------------------------
