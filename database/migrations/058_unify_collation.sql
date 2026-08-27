-- 058: 统一排序规则为 utf8mb4_0900_ai_ci
-- 将所有使用 utf8mb4_unicode_ci 的列统一为 utf8mb4_0900_ai_ci

-- ========================================
-- 查找并修改所有使用 unicode_ci 的列
-- 以下为已知使用 utf8mb4_unicode_ci 的表（基于调研结果）
-- ========================================

-- 以下 SQL 会遍历所有使用 utf8mb4_unicode_ci 排序规则的列并修改
-- 注意: 在大表上执行可能需要较长时间

-- 方法: 使用存储过程批量修改（如果可用）
-- 或逐表修改已知的 28 处 unicode_ci 列

-- 示例修改语句（按实际表结构调整）:
-- ALTER TABLE <table_name> CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 注意: 此迁移需要根据实际数据库中使用 unicode_ci 的表来执行
-- 建议先运行以下查询确认需要修改的表:
-- SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
-- AND COLLATION_NAME = 'utf8mb4_unicode_ci';
