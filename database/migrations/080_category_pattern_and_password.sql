-- =====================================================
-- 080: 分类编码规则放宽（方案 A）+ 默认口令去弱化 —— BUG-SET-003 / BUG-SET-006
--
-- 一、分类编码规则
--   问题：迁移 074 落库的规则要求 ^MAT-CAT-\d{3,}$ / ^WH-CAT-\d{3,}$，
--         而存量 100% 不合规 —— 物料分类 169 行（0 行命中）、仓库分类 10 行（0 行命中）。
--         规则一旦被录入端强制执行（category.enforce_on_create=true），
--         就会把全部正常业务数据判为非法。
--
--   产品决议：方案 A —— **放宽正则兼容存量，不迁移 179 条历史编码**
--   （改编码会波及人工记忆、外部对账与历史单据文本）。
--
--   新规则（已对存量做 100% 覆盖验证，且 MySQL 8 ICU 与 JS new RegExp 双引擎一致）：
--     material  ^(MAT-CAT-\d{3,}|[A-Za-z]{2,}[A-Za-z0-9._\-#一-鿿 ]{0,32})$
--               兼容 MAT-CAT-XXX 标准码，也兼容 RAW / AUX / INK / PAPER /
--               CAT辅料 / CAT1.0P / CAT4#溶剂 / MATCAT01001 等存量形态（169/169）
--     warehouse ^(WH-CAT-\d{3,}|WHCAT\d{3,})$
--               兼容 WHCAT001-010 与测试期 WH-CAT-*（10/10）
--
--   注：起始段刻意用 [A-Za-z] 而非 [A-Z]。MySQL 默认排序规则不区分大小写，
--       而 JS 正则区分；用 [A-Za-z] 可让两端判定完全一致，避免"库里放过、界面拦截"。
--
-- 二、默认口令
--   sys_config['sys.default.password'] 原值为 admin123 —— 全站共享弱口令。
--   改为随机 16 位强口令（大小写+数字+符号），且仅在检测到**仍是旧弱口令**时替换，
--   保证迁移可重复执行、不覆盖运维后来显式设置的值。
--   配套：响应侧脱敏见 src/lib/config-secret.ts（BUG-SET-006 ②）。
-- =====================================================

-- -----------------------------------------------------
-- 1. 物料分类编码规则（放宽）
-- -----------------------------------------------------
UPDATE `sys_calc_param`
   SET `param_value`   = '^(MAT-CAT-\\d{3,}|[A-Za-z]{2,}[A-Za-z0-9._\\-#一-鿿 ]{0,32})$',
       `default_value` = '^(MAT-CAT-\\d{3,}|[A-Za-z]{2,}[A-Za-z0-9._\\-#一-鿿 ]{0,32})$',
       `description`   = '物料分类编码正则。兼容历史短码（RAW/INK/PAPER）与 CAT 前缀码，同时接受 MAT-CAT-XXX 标准码',
       `update_time`   = NOW()
 WHERE `param_key` = 'category.material.code_pattern';

UPDATE `sys_calc_param`
   SET `param_value`   = 'MAT-CAT-XXX，或以 2 位以上字母开头的分类码（2-34 位，可含数字、下划线、连字符、点、井号、汉字、空格）',
       `default_value` = 'MAT-CAT-XXX，或以 2 位以上字母开头的分类码（2-34 位，可含数字、下划线、连字符、点、井号、汉字、空格）',
       `update_time`   = NOW()
 WHERE `param_key` = 'category.material.code_pattern_desc';

-- -----------------------------------------------------
-- 2. 仓库分类编码规则（放宽）
-- -----------------------------------------------------
UPDATE `sys_calc_param`
   SET `param_value`   = '^(WH-CAT-\\d{3,}|WHCAT\\d{3,})$',
       `default_value` = '^(WH-CAT-\\d{3,}|WHCAT\\d{3,})$',
       `description`   = '仓库分类编码正则。兼容历史 WHCAT001 形态与 WH-CAT-XXX 标准码',
       `update_time`   = NOW()
 WHERE `param_key` = 'category.warehouse.code_pattern';

UPDATE `sys_calc_param`
   SET `param_value`   = 'WHCATXXX 或 WH-CAT-XXX（3 位以上数字）',
       `default_value` = 'WHCATXXX 或 WH-CAT-XXX（3 位以上数字）',
       `update_time`   = NOW()
 WHERE `param_key` = 'category.warehouse.code_pattern_desc';

-- -----------------------------------------------------
-- 3. 默认口令去弱化（仅替换仍为旧弱口令的场景）
-- -----------------------------------------------------
UPDATE `sys_config`
   SET `config_value` = CONCAT(
         UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 4)),
         LOWER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 4)),
         SUBSTRING('23456789', 1 + FLOOR(RAND() * 7), 2),
         '!',
         SUBSTRING('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', 1 + FLOOR(RAND() * 52), 5)
       ),
       `update_time` = NOW()
 WHERE `config_key` = 'sys.default.password'
   AND `config_value` = 'admin123';

-- -----------------------------------------------------
-- 4. 存量合规性复核（只读，迁移后应为 0）
--    SELECT COUNT(*) FROM inv_material_category
--     WHERE deleted = 0 AND category_code NOT REGEXP '^(MAT-CAT-[0-9]{3,}|[A-Za-z]{2,}[A-Za-z0-9._\\-#一-鿿 ]{0,32})$';
--    SELECT COUNT(*) FROM sys_warehouse_category
--     WHERE deleted = 0 AND code NOT REGEXP '^(WH-CAT-[0-9]{3,}|WHCAT[0-9]{3,})$';
-- -----------------------------------------------------
