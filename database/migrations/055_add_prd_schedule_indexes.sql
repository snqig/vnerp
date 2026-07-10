-- 055: 为 prd_schedule 和 prd_schedule_detail 表补充索引
-- 背景：这两张表已存在于数据库，但 ORM Schema 补全后需要确保索引完整

-- 1. 确保 prd_schedule.work_order_id 有索引
SET @exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'prd_schedule'
    AND index_name = 'idx_schedule_work_order'
);

SET @sql = IF(@exists = 0,
  'ALTER TABLE prd_schedule ADD INDEX idx_schedule_work_order (work_order_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 确保 prd_schedule_detail.schedule_id 有索引
SET @exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'prd_schedule_detail'
    AND index_name = 'idx_detail_schedule'
);

SET @sql = IF(@exists = 0,
  'ALTER TABLE prd_schedule_detail ADD INDEX idx_detail_schedule (schedule_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 确保 prd_schedule_detail.work_order_id 有索引
SET @exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'prd_schedule_detail'
    AND index_name = 'idx_detail_work_order'
);

SET @sql = IF(@exists = 0,
  'ALTER TABLE prd_schedule_detail ADD INDEX idx_detail_work_order (work_order_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. 为 prd_schedule 添加计划开始时间索引（如缺失）
SET @exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'prd_schedule'
    AND index_name = 'idx_schedule_planned_start'
);

SET @sql = IF(@exists = 0,
  'ALTER TABLE prd_schedule ADD INDEX idx_schedule_planned_start (planned_start)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
