-- ============================================================================
-- 20260925_material_category_pattern_hierarchical.sql
-- 目的：物料分类编码规则补入「层级码」形态（C01 / C01-01）—— 补 080 放宽后
--       新落地数据形态的规则缺口
-- ----------------------------------------------------------------------------
-- 背景（2026-09-25 复检发现）：
--   同日迁移 20260925_reapply_080_category_patterns.sql（batch=116）补齐了 080
--   未生效的规则放宽后，复检发现：
--     · 仓库分类 10/10 合规 ✅
--     · 物料分类仅 1/90 合规 ❌
--   原因：080 决议时（存量形态为 RAW/INK/PAPER 等短码）的放宽正则
--   `^(MAT-CAT-\d{3,}|[A-Za-z]{2,}[A-Za-z0-9._\-#一-鿿 ]{0,32})$`
--   不覆盖此后落地的新层级编码方案：
--     · C01      （一级，12 行）
--     · C01-01   （二级，77 行）
--     · CAT成品  （1 行，已被 2 位以上字母分支覆盖）
--   起始段 [A-Za-z]{2,} 要求 2 个以上字母，单字母+数字的 C01 全部落空。
--
-- 新规则（三形态全覆盖，实测 90/90；沿用 080 的 [A-Za-z] 双端一致口径）：
--   ^(MAT-CAT-\d{3,}|[A-Za-z]\d{2}(-\d{2})?|[A-Za-z]{2,}[A-Za-z0-9._\-#一-鿿 ]{0,32})$
--     分支1：MAT-CAT-XXX 标准码（历史兼容，保留）
--     分支2：层级码 = 字母+2位数字+可选「-2位数字」（C01 / C01-01）
--     分支3：2 位以上字母开头的自由码（RAW/INK/PAPER/CAT成品 等，080 原分支）
--
-- 配套代码同步：src/lib/category-validation.ts FALLBACK_RULES.material 同值同批修改
-- （BUG-SET-003 教训：库中规则与代码兜底必须同时改，否则 DB 降级路径误判全量数据）。
--
-- 幂等性 / 防覆盖：WHERE 含「仍为 080 放宽值」判定；重复执行 affectedRows=0，
--   管理员自定义过的值不会被覆盖。
--
-- 数据关联性核验（已确认，无需动数据）：
--   · 90 行编码 0 重复
--   · 层级前缀一致性 0 错位（子码恒以「父码-」为前缀）
--   · status 全部在合法值域 [0,1]
--
-- 回滚：将 2 个参数还原为 080 放宽值：
--   code_pattern = ^(MAT-CAT-\d{3,}|[A-Za-z]{2,}[A-Za-z0-9._\-#一-鿿 ]{0,32})$
--   code_pattern_desc = MAT-CAT-XXX，或以 2 位以上字母开头的分类码（2-34 位，可含数字、下划线、连字符、点、井号、汉字、空格）
-- ============================================================================

UPDATE `sys_calc_param`
   SET `param_value`   = '^(MAT-CAT-\\d{3,}|[A-Za-z]\\d{2}(-\\d{2})?|[A-Za-z]{2,}[A-Za-z0-9._\\-#一-鿿 ]{0,32})$',
       `default_value` = '^(MAT-CAT-\\d{3,}|[A-Za-z]\\d{2}(-\\d{2})?|[A-Za-z]{2,}[A-Za-z0-9._\\-#一-鿿 ]{0,32})$',
       `description`   = '物料分类编码正则。接受 MAT-CAT-XXX 标准码、层级码（C01 / C01-01）与 2 位以上字母开头的自由码（RAW/INK/PAPER 等）',
       `update_time`   = NOW()
 WHERE `param_key` = 'category.material.code_pattern'
   AND `param_value` = '^(MAT-CAT-\\d{3,}|[A-Za-z]{2,}[A-Za-z0-9._\\-#一-鿿 ]{0,32})$';

UPDATE `sys_calc_param`
   SET `param_value`   = 'MAT-CAT-XXX 标准码、层级码（字母+2位数字，如 C01 / C01-01），或以 2 位以上字母开头的分类码（2-34 位，可含数字、下划线、连字符、点、井号、汉字、空格）',
       `default_value` = 'MAT-CAT-XXX 标准码、层级码（字母+2位数字，如 C01 / C01-01），或以 2 位以上字母开头的分类码（2-34 位，可含数字、下划线、连字符、点、井号、汉字、空格）',
       `update_time`   = NOW()
 WHERE `param_key` = 'category.material.code_pattern_desc'
   AND `param_value` = 'MAT-CAT-XXX，或以 2 位以上字母开头的分类码（2-34 位，可含数字、下划线、连字符、点、井号、汉字、空格）';

-- 迁移后自检：
--   SELECT param_value FROM sys_calc_param WHERE param_key = 'category.material.code_pattern';
--   （值应为三分支正则；GET /api/settings/category-rules 应 violations=0）
