-- ============================================================
-- fin_payment_record 审计列补齐 migration
-- 2026-09-10 复盘驱动：采购到付款链路审计增强
-- 依据：finance-core.recordPayment 持有 operatorId 参数但无处落库；
--       全站软删/审计模式统一（对照 fin_payable 的 create_by/update_by/update_time）
-- 幂等性：MySQL 8.0 无 ADD COLUMN IF NOT EXISTS，重复执行会报 1060，属预期
-- ============================================================

ALTER TABLE `fin_payment_record`
  ADD COLUMN `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  ADD COLUMN `create_by` bigint unsigned DEFAULT NULL COMMENT '创建人ID',
  ADD COLUMN `update_by` bigint unsigned DEFAULT NULL COMMENT '更新人ID';
