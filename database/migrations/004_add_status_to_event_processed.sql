-- ==========================================
-- 迁移: 004_add_status_to_event_processed
-- 用途: 两阶段幂等标记（processing → processed），解决 mark-before-execute 崩溃窗口
-- 关联代码: src/infrastructure/event-bus/IdempotencyGuard.ts
-- 说明:
--   - status='processing': checkAndMark 时插入，表示 handler 正在执行
--   - status='processed': handler 成功后由 markAsProcessed 更新
--   - 崩溃恢复: reclaimStaleProcessing 清理超过 5 分钟的 processing 记录
--   - 旧数据默认 'processed'（向后兼容）
-- 执行: mysql -u root -p vnerpdacahng < 004_add_status_to_event_processed.sql
-- ==========================================

ALTER TABLE `sys_event_processed`
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'processed'
    COMMENT 'processing-处理中, processed-已处理'
    AFTER `handler_name`;

ALTER TABLE `sys_event_processed`
  ADD INDEX `idx_status_processed_at` (`status`, `processed_at`);
