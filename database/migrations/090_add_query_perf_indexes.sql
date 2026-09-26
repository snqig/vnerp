-- 090_add_query_perf_indexes.sql
--
-- 背景：P2-7「性能优化 + 可扩展性加固」。本轮把内联 SQL 里 `YEAR(col) / DATE(col)`
--       这类「函数套列」改写成半开区间 `col >= ? AND col < ?` 后，过滤条件才真正
--       能被索引命中；但库里大量业务表只有外键/唯一键索引，缺「软删除 + 创建时间」
--       组合索引，改写后的区间查询仍会退化成全表扫描（EXPLAIN type=ALL）。
--
-- 本迁移为这批改写后的高频查询路径补齐索引，全部走 information_schema 守卫，
-- 可重复执行。MySQL 不支持 `ADD INDEX IF NOT EXISTS`，故统一用计数守卫 + PREPARE。
--
-- 说明：当前库数据量很小（最大表不足 5k 行），实测统计 SQL p95 < 1ms，
--       索引不会产生可见收益；此处的目标是**上线后数据量放大时不退化**。
--       索引本身为在线 DDL，加完不影响读写。

-- ── 物料主档：列表「未删除 + 创建时间区间」筛选，另有按状态筛选 ──
SET @db=DATABASE(); SET @tbl='inv_material'; SET @idx='idx_inv_material_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @idx='idx_inv_material_status_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`status`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 库存 / 批次：FIFO 明细与「未删除 + 时间区间」列表 ──
SET @tbl='inv_inventory'; SET @idx='idx_inv_inventory_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @tbl='inv_inventory_batch'; SET @idx='idx_inv_batch_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 出入库单据 / 明细 ──
SET @tbl='inv_inbound_order'; SET @idx='idx_inbound_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @idx='idx_inbound_status_deleted';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`status`,`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @tbl='inv_outbound_order'; SET @idx='idx_outbound_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @tbl='inv_outbound_item'; SET @idx='idx_outbound_item_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 追溯：批次统计按 trace_time 区间（/api/dcprint/trace/stats 本月口径） ──
SET @tbl='inv_trace_record'; SET @idx='idx_trace_record_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @idx='idx_trace_record_trace_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`trace_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── SOP：eng_sop 没有审核状态列，统计口径落在 effective_date（已生效/待生效） ──
SET @tbl='eng_sop'; SET @idx='idx_eng_sop_effective_date';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`effective_date`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @idx='idx_eng_sop_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 标准卡：按物料查询明细 ──
SET @tbl='prd_standard_card'; SET @idx='idx_std_card_material';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`material_id`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 工单：关联物料改走 legacy_material_id，列表带软删除 + 时间区间 ──
SET @tbl='prod_work_order'; SET @idx='idx_wo_legacy_material';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`legacy_material_id`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @idx='idx_wo_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 盘点单：列表「未删除 + 时间区间」 ──
SET @tbl='inv_stocktaking'; SET @idx='idx_stocktaking_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 发料单 / 发料明细：明细表此前只有主键 ──
SET @tbl='prd_material_issue'; SET @idx='idx_material_issue_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @tbl='prd_material_issue_item'; SET @idx='idx_material_issue_item_material';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`material_id`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 日志表：按时间 + 操作人查询 ──
SET @tbl='sys_login_log'; SET @idx='idx_login_log_time_user';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`create_time`,`user_id`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @tbl='sys_operation_log'; SET @idx='idx_oper_log_time_user';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`create_time`,`user_id`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 二维码：列表「未删除 + 时间区间」 ──
SET @tbl='qrcode_record'; SET @idx='idx_qrcode_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 业务订单：表头列表 + 行项目按单号关联 ──
SET @tbl='biz_order_header'; SET @idx='idx_order_header_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @tbl='biz_order_line'; SET @idx='idx_order_line_order_id';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`order_id`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @tbl='sal_order'; SET @idx='idx_sal_order_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ── 采购单：列表 + 状态筛选 ──
SET @tbl='pur_purchase_order'; SET @idx='idx_purchase_deleted_time';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @idx='idx_purchase_status_deleted';
SELECT COUNT(*) INTO @cnt FROM information_schema.STATISTICS WHERE table_schema=@db AND table_name=@tbl AND index_name=@idx;
SET @sql=IF(@cnt=0,CONCAT('ALTER TABLE `',@tbl,'` ADD INDEX `',@idx,'` (`status`,`deleted`,`create_time`)'),'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
