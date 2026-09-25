-- ============================================================
-- Migration 089: 移除 inv_warehouse.used_capacity 闲置字段
-- 日期: 2026-09-22
-- 背景:
--   used_capacity 由 scripts/fix-warehouse-setup-schema.cjs 在补列时一并添加，
--   但全项目没有任何写入方：仅 /api/warehouse 读取并在 setup 列表展示，
--   导致 setup 页「容量使用」恒显示 0/cap、仓库分类列表的使用率恒为 0。
--   前端已同步移除依赖（分类列表删列、setup 列表改为只展示仓库容量），故删除该列。
-- 影响:
--   - 代码侧已无引用（本次同步清理 /api/warehouse 与 warehouse/setup 页）
--   - 列内数据恒为 0，无业务含义，删除无数据损失
--   - 幂等：列不存在时不做任何操作
-- ============================================================

SET @cnt = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'inv_warehouse'
               AND COLUMN_NAME = 'used_capacity');


SET @sql = IF(@cnt > 0,
              'ALTER TABLE inv_warehouse DROP COLUMN used_capacity',
              'SELECT ''inv_warehouse.used_capacity not exists'' AS info');

PREPARE stmt FROM @sql;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;


-- 验证
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
  FROM INFORMATION_SCHEMA.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'inv_warehouse'
   AND COLUMN_NAME IN ('capacity', 'used_capacity')
 ORDER BY ORDINAL_POSITION
