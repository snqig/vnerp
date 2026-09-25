-- ============================================================================
-- 20260925_reapply_080_category_patterns.sql
-- 目的：补齐迁移 080 未生效的分类编码规则放宽 —— 消除「仓库分类列表 编码不合规」误报
-- ----------------------------------------------------------------------------
-- 根因（2026-09-25 DB 取证）：
--   /settings/warehouse-category 列表 10 行 WHCAT001-010 全部显示「编码不合规」。
--   规则真相源 sys_calc_param 里 category.warehouse.code_pattern 仍是旧严格值
--   ^WH-CAT-\d{3,}$（只认 WH-CAT- 形态），而：
--     · 代码兜底 category-validation.ts FALLBACK_RULES = ^(WH-CAT-\d{3,}|WHCAT\d{3,})$
--     · 前端 generateCategoryCode 生成 WHCAT+3 位（种子主流形态）
--     · 存量 10/10 行为 WHCAT001-010
--   → 库中规则把全部活跃数据判非法（invalidCodeCount=10）。
--
--   为什么 080 的放宽没落上？080_category_pattern_and_password.sql 登记批次=66，
--   早于创建这些参数行的 074_category_rules_config.sql（批次=97）：
--   080 执行时 sys_calc_param 尚无 category.* 行 → UPDATE affectedRows=0 静默跳过；
--   074 随后按自身旧严格值 INSERT → 放宽从未落库。物料分类同病（^MAT-CAT-\d{3,}$）。
--   本迁移即「补执行 080 第一节」，遵循其产品决议：方案 A —— 放宽规则兼容存量，
--   不迁移历史编码（改编码波及人工记忆、外部对账与历史单据文本）。
--
-- 幂等性 / 防覆盖：每条 UPDATE 的 WHERE 均含「仍为 074 旧严格值」判定；
--   重复执行 affectedRows=0；若管理员此后自定义过规则，本迁移不会覆盖。
--
-- 参数值与代码兜底逐字符一致（category-validation.ts:72,74,79,80），双端判定一致。
--
-- 关联性核验（迁移前已确认，无需动数据）：
--   · inv_warehouse.category_id → sys_warehouse_category：0 悬挂
--     （5 仓库挂 WHCAT001-005，1 个 category_id=NULL）
--   · 软删测试残留 2 行（id=11/12，无引用，deleted=1）→ 不处理
--   · FK 引用 0 条（软关联，无外键约束可断）
--
-- 回滚：将 4 个参数还原为 074 旧严格值（见下方注释值）。
--   material.code_pattern = ^MAT-CAT-\d{3,}$ ；desc = MAT-CAT-XXX（3位以上数字）
--   warehouse.code_pattern = ^WH-CAT-\d{3,}$ ；desc = WH-CAT-XXX（3位以上数字）
-- ============================================================================

-- 1. 物料分类编码规则（放宽，兼容 RAW/INK/PAPER/C01-01 等存量形态）
UPDATE `sys_calc_param`
   SET `param_value`   = '^(MAT-CAT-\\d{3,}|[A-Za-z]{2,}[A-Za-z0-9._\\-#一-鿿 ]{0,32})$',
       `default_value` = '^(MAT-CAT-\\d{3,}|[A-Za-z]{2,}[A-Za-z0-9._\\-#一-鿿 ]{0,32})$',
       `description`   = '物料分类编码正则。兼容历史短码（RAW/INK/PAPER）与 CAT 前缀码，同时接受 MAT-CAT-XXX 标准码',
       `update_time`   = NOW()
 WHERE `param_key` = 'category.material.code_pattern'
   AND `param_value` = '^MAT-CAT-\\d{3,}$';

UPDATE `sys_calc_param`
   SET `param_value`   = 'MAT-CAT-XXX，或以 2 位以上字母开头的分类码（2-34 位，可含数字、下划线、连字符、点、井号、汉字、空格）',
       `default_value` = 'MAT-CAT-XXX，或以 2 位以上字母开头的分类码（2-34 位，可含数字、下划线、连字符、点、井号、汉字、空格）',
       `update_time`   = NOW()
 WHERE `param_key` = 'category.material.code_pattern_desc'
   AND `param_value` = 'MAT-CAT-XXX（3位以上数字）';

-- 2. 仓库分类编码规则（放宽，兼容 WHCAT001-010 与 WH-CAT-XXX 双形态）
UPDATE `sys_calc_param`
   SET `param_value`   = '^(WH-CAT-\\d{3,}|WHCAT\\d{3,})$',
       `default_value` = '^(WH-CAT-\\d{3,}|WHCAT\\d{3,})$',
       `description`   = '仓库分类编码正则。兼容历史 WHCAT001 形态与 WH-CAT-XXX 标准码',
       `update_time`   = NOW()
 WHERE `param_key` = 'category.warehouse.code_pattern'
   AND `param_value` = '^WH-CAT-\\d{3,}$';

UPDATE `sys_calc_param`
   SET `param_value`   = 'WHCATXXX 或 WH-CAT-XXX（3 位以上数字）',
       `default_value` = 'WHCATXXX 或 WH-CAT-XXX（3 位以上数字）',
       `update_time`   = NOW()
 WHERE `param_key` = 'category.warehouse.code_pattern_desc'
   AND `param_value` = 'WH-CAT-XXX（3位以上数字）';

-- 迁移后自检（应全部命中新值）：
--   SELECT param_key, param_value FROM sys_calc_param
--    WHERE param_key IN ('category.material.code_pattern','category.warehouse.code_pattern');
-- 规则校验复检（GET /api/settings/category-rules 应 violations=0）：
--   仓库分类 10 行 / 物料分类全部行均应通过各自 pattern。
