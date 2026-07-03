-- ==========================================
-- 迁移: 003_create_event_processed
-- 用途: 事件处理器幂等性保障（防止 OutboxPoller 重试或 Stream 消费者重启时重复执行）
-- 关联代码: src/infrastructure/event-bus/IdempotencyGuard.ts
-- 说明: event_id + handler_name 联合唯一，同一事件同一处理器只成功记录一次
-- 执行: mysql -u root -p vnerpdacahng < 003_create_event_processed.sql
-- ==========================================

CREATE TABLE IF NOT EXISTS `sys_event_processed` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `event_id` BIGINT NOT NULL COMMENT 'domain_event_outbox.id',
  `handler_name` VARCHAR(255) NOT NULL COMMENT '处理器类名',
  `processed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_event_handler` (`event_id`, `handler_name`),
  INDEX `idx_processed_at` (`processed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='事件幂等表';
