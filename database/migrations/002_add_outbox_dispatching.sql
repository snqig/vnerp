-- ==========================================
-- 迁移: 002_add_outbox_dispatching
-- 用途: 支持 OutboxPoller 原子 claim（SELECT FOR UPDATE SKIP LOCKED）
-- 关联代码: src/infrastructure/repositories/MysqlDomainEventOutboxRepository.ts
-- 说明: 新增 dispatching 中间状态与 claim/dispatch 时间戳，
--       多实例并发时通过 SKIP LOCKED 避免重复消费
-- 执行: mysql -u root -p vnerpdacahng < 002_add_outbox_dispatching.sql
-- ==========================================

ALTER TABLE `domain_event_outbox`
  ADD COLUMN `claimed_at` DATETIME DEFAULT NULL COMMENT '最近一次被 claim 的时间（status=dispatching 时写入）' AFTER `processed_at`,
  ADD COLUMN `dispatched_at` DATETIME DEFAULT NULL COMMENT '成功分发到 Stream 的时间（status=processed 前置）' AFTER `claimed_at`;
