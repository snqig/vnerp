-- ============================================================
-- 迁移：qms_complaint 数据一致性修复（quality/complaint）
-- 日期：2026-09-25
-- 背景（运行时核验结论）：
--   1) 列表页/新建表单/API 全走「新轨」字段 product_id/product_code/product_name，
--      但 6 行存量种子只写「老轨」material_id/material_code/material_name
--      → 列表「产品名称」列全空。
--   2) 种子被重复插入两次（COMP-2026-001~003，id 1-3 与 4-6 完全重复，
--      仅 create_time 相差 44 秒）→ 列表出现重复单号。
--   3) status 默认 0，页面 statusMap 从 1（registered）起 → status=0 行徽标空白；
--      POST 创建也未写 status → 新建行同样落 0。
--   4) PUT 路由支持 8D 字段（d1_team..d8_congratulations + d1_date..d8_date），
--      但 qms_complaint 无这些列 → 8D 保存必 500（Unknown column）。
--   注：stats 路由的 qc_complaint/created_at 错误为代码层修复，不在本迁移内。
-- 回滚：见文件底部注释；备份表 qms_complaint_bak_20260925。
-- 幂等：所有 UPDATE 带守卫，DDL 以 d1_team 存在性守卫。
-- ============================================================

-- 备份
CREATE TABLE IF NOT EXISTS qms_complaint_bak_20260925 AS
SELECT * FROM qms_complaint;

-- 1) 老轨 → 新轨 回填（仅填新轨为空且老轨有值的行）
UPDATE qms_complaint
SET product_name = material_name,
    product_code = material_code
WHERE deleted = 0
  AND (product_name IS NULL OR product_name = '')
  AND material_name IS NOT NULL AND material_name <> '';

-- 2) 软删重复种子行（同单号保留先写入的 id 1-3，软删后写入的 id 4-6）
UPDATE qms_complaint
SET deleted = 1
WHERE id IN (4, 5, 6) AND deleted = 0;

-- 3) status 0 → 1（registered：页面/新建语义的初始态）
UPDATE qms_complaint
SET status = 1
WHERE status = 0;

-- 4) 补 8D 列（PUT 路由已按这些列名读写）
SET @has_d1_team := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'qms_complaint'
    AND COLUMN_NAME = 'd1_team'
);
SET @ddl := IF(@has_d1_team = 0,
  'ALTER TABLE qms_complaint
     ADD COLUMN d1_team varchar(100) NULL COMMENT ''D1 成立小组'',
     ADD COLUMN d1_date datetime NULL COMMENT ''D1 日期'',
     ADD COLUMN d2_desc text NULL COMMENT ''D2 问题描述'',
     ADD COLUMN d2_date datetime NULL COMMENT ''D2 日期'',
     ADD COLUMN d3_interim_action varchar(500) NULL COMMENT ''D3 临时措施'',
     ADD COLUMN d3_date datetime NULL COMMENT ''D3 日期'',
     ADD COLUMN d4_root_cause varchar(500) NULL COMMENT ''D4 根因'',
     ADD COLUMN d4_date datetime NULL COMMENT ''D4 日期'',
     ADD COLUMN d5_corrective_action varchar(500) NULL COMMENT ''D5 纠正措施'',
     ADD COLUMN d5_date datetime NULL COMMENT ''D5 日期'',
     ADD COLUMN d6_implement_verify varchar(500) NULL COMMENT ''D6 实施验证'',
     ADD COLUMN d6_date datetime NULL COMMENT ''D6 日期'',
     ADD COLUMN d7_preventive_action varchar(500) NULL COMMENT ''D7 预防措施'',
     ADD COLUMN d7_date datetime NULL COMMENT ''D7 日期'',
     ADD COLUMN d8_congratulations varchar(500) NULL COMMENT ''D8 团队祝贺'',
     ADD COLUMN d8_date datetime NULL COMMENT ''D8 日期''',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 回滚参考（勿在迁移内执行）：
--   UPDATE qms_complaint SET product_name = NULL, product_code = NULL
--     WHERE id IN (1,2,3) AND deleted = 0;
--   UPDATE qms_complaint SET deleted = 0 WHERE id IN (4,5,6);
--   UPDATE qms_complaint SET status = 0 WHERE id IN (1,2,3);
--   ALTER TABLE qms_complaint
--     DROP COLUMN d1_team, DROP COLUMN d1_date, DROP COLUMN d2_desc,
--     DROP COLUMN d2_date, DROP COLUMN d3_interim_action, DROP COLUMN d3_date,
--     DROP COLUMN d4_root_cause, DROP COLUMN d4_date, DROP COLUMN d5_corrective_action,
--     DROP COLUMN d5_date, DROP COLUMN d6_implement_verify, DROP COLUMN d6_date,
--     DROP COLUMN d7_preventive_action, DROP COLUMN d7_date, DROP COLUMN d8_congratulations,
--     DROP COLUMN d8_date;
-- ============================================================
