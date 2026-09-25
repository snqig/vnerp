-- ============================================================
-- Migration: 清理空表和废弃表
-- 日期: 2026-09-23
-- 说明:
--   1. 删除明确废弃的表（deprecated）
--   2. 删除测试表（test_*）
--   3. 删除已统一的旧表关联（prd_work_order_bom 等）
--   4. 保留功能表（inv_location、inv_alert_rule 等，需要配置）
-- ============================================================

-- 1. 删除 deprecated 表
DROP TABLE IF EXISTS pur_order_deprecated;
DROP TABLE IF EXISTS pur_order_detail_deprecated;
DROP TABLE IF EXISTS pur_receipt_deprecated;
DROP TABLE IF EXISTS pur_receipt_detail_deprecated;

-- 2. 删除测试表
DROP TABLE IF EXISTS test_ba;
DROP TABLE IF EXISTS test_bvh;

-- 3. 删除已统一的旧表关联
DROP TABLE IF EXISTS prd_work_order_bom;
DROP TABLE IF EXISTS prd_work_order_color_seq;

-- 4. 删除确实为空且无业务意义的表
DROP TABLE IF EXISTS pur_request_line;
DROP TABLE IF EXISTS pur_return_order;
-- 注意：先删子表，再删主表（外键约束）
DROP TABLE IF EXISTS sal_quote_item;
DROP TABLE IF EXISTS sal_quote;
DROP TABLE IF EXISTS sal_delivery_order;
DROP TABLE IF EXISTS sal_return_order_item;
DROP TABLE IF EXISTS sal_sample_feedback;
DROP TABLE IF EXISTS sal_sample_order_history;
DROP TABLE IF EXISTS sal_sample_quotation;

-- 5. 保留的空表（功能表，需要配置）:
--   inv_location          -- 库位管理
--   inv_alert_rule        -- 库存预警规则
--   label_template        -- 标签模板
--   sys_announcement      -- 系统公告
--   sys_operate_log       -- 操作日志
--   wf_*                  -- 工作流相关表
