-- ==========================================
-- 迁移: 001_create_domain_event_outbox
-- 用途: 领域事件持久化表（Outbox 模式）
-- 关联代码: src/infrastructure/event-bus/DomainEventOutbox.ts
-- 说明: 保证领域事件与业务数据在同一事务内落库，
--       由 OutboxPoller 异步消费分发，解决事件丢失与数据不一致问题
-- 执行: mysql -u root -p vnerpdacahng < 001_create_domain_event_outbox.sql
-- ==========================================

CREATE TABLE IF NOT EXISTS `domain_event_outbox` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '事件主键ID',
  `event_type` VARCHAR(100) NOT NULL COMMENT '事件类型（如 InboundOrderCreated/SalesOrderApproved）',
  `aggregate_type` VARCHAR(50) DEFAULT NULL COMMENT '聚合根类型（如 InboundOrder/SalesOrder）',
  `aggregate_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '聚合根ID',
  `payload` JSON NOT NULL COMMENT '事件完整内容（JSON 序列化的 DomainEvent 对象）',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态: pending-待处理, processed-已处理, failed-失败',
  `retry_count` INT NOT NULL DEFAULT 0 COMMENT '已重试次数（最大3次，超过标记死信）',
  `error_message` TEXT COMMENT '最近一次失败的错误信息（截断500字符）',
  `next_execute_at` DATETIME DEFAULT NULL COMMENT '下次执行时间（指数退避: 1s/3s/9s；NULL 表示立即可执行）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '事件创建时间',
  `processed_at` DATETIME DEFAULT NULL COMMENT '处理完成时间（status=processed 时写入）',
  PRIMARY KEY (`id`),
  KEY `idx_status_created` (`status`, `created_at`) COMMENT '待处理事件查询索引',
  KEY `idx_status_next_execute` (`status`, `next_execute_at`) COMMENT '指数退避消费索引',
  KEY `idx_aggregate` (`aggregate_type`, `aggregate_id`) COMMENT '聚合根溯源索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='领域事件持久化表（Outbox 模式）';
