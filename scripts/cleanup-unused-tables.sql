-- ========================================================-- ERP 系统数据库清理脚本-- 删除未使用的表以优化数据库结构-- 执行前请务必备份数据库！-- ========================================================
-- 请根据实际业务需求选择要删除的表-- 建议先执行查询确认数据量后再删除-- ========================================================

-- 1. 客户管理模块 (2个表)
-- 这些表用于客户联系人和跟进记录，如果不需要完整CRM功能可以删除
-- SELECT COUNT(*) FROM crm_customer_contact;-- SELECT COUNT(*) FROM crm_customer_follow_up;
-- DROP TABLE IF EXISTS crm_customer_contact;-- DROP TABLE IF EXISTS crm_customer_follow_up;

-- 2. 供应商管理模块 (2个表)
-- 如果不需要完整的供应商管理功能可以删除
-- SELECT COUNT(*) FROM pur_supplier;-- SELECT COUNT(*) FROM pur_supplier_material;
-- DROP TABLE IF EXISTS pur_supplier;-- DROP TABLE IF EXISTS pur_supplier_material;

-- 3. 物料管理模块 (4个表)
-- 注意：这些表与库存管理相关，删除前请确认业务需求
-- SELECT COUNT(*) FROM inv_material_category;-- SELECT COUNT(*) FROM inv_material;-- SELECT COUNT(*) FROM inv_inventory;-- SELECT COUNT(*) FROM inv_inventory_log;
-- DROP TABLE IF EXISTS inv_material_category;-- DROP TABLE IF EXISTS inv_material;-- DROP TABLE IF EXISTS inv_inventory;-- DROP TABLE IF EXISTS inv_inventory_log;

-- 4. 采购管理模块 (5个表)
-- 完整的采购流程表，如果不需要采购管理可以删除
-- SELECT COUNT(*) FROM pur_request_detail;-- SELECT COUNT(*) FROM pur_order;-- SELECT COUNT(*) FROM pur_order_detail;-- SELECT COUNT(*) FROM pur_receipt;-- SELECT COUNT(*) FROM pur_receipt_detail;
-- DROP TABLE IF EXISTS pur_request_detail;-- DROP TABLE IF EXISTS pur_order;-- DROP TABLE IF EXISTS pur_order_detail;-- DROP TABLE IF EXISTS pur_receipt;-- DROP TABLE IF EXISTS pur_receipt_detail;

-- 5. 销售管理模块 (4个表)
-- 完整的销售流程表，如果不需要销售管理可以删除
-- SELECT COUNT(*) FROM sal_order;-- SELECT COUNT(*) FROM sal_order_detail;-- SELECT COUNT(*) FROM sal_delivery;-- SELECT COUNT(*) FROM sal_delivery_detail;
-- DROP TABLE IF EXISTS sal_order;-- DROP TABLE IF EXISTS sal_order_detail;-- DROP TABLE IF EXISTS sal_delivery;-- DROP TABLE IF EXISTS sal_delivery_detail;

-- 6. 生产管理模块 (3个表)
-- 生产工单和BOM管理，如果不需要生产管理可以删除
-- SELECT COUNT(*) FROM prd_work_order;-- SELECT COUNT(*) FROM prd_bom;-- SELECT COUNT(*) FROM prd_bom_detail;
-- DROP TABLE IF EXISTS prd_work_order;-- DROP TABLE IF EXISTS prd_bom;-- DROP TABLE IF EXISTS prd_bom_detail;

-- 7. 财务管理模块 (4个表)
-- 应收应付管理，如果不需要财务管理可以删除
-- SELECT COUNT(*) FROM fin_receivable;-- SELECT COUNT(*) FROM fin_payable;-- SELECT COUNT(*) FROM fin_receipt_record;-- SELECT COUNT(*) FROM fin_payment_record;
-- DROP TABLE IF EXISTS fin_receivable;-- DROP TABLE IF EXISTS fin_payable;-- DROP TABLE IF EXISTS fin_receipt_record;-- DROP TABLE IF EXISTS fin_payment_record;

-- 8. 质量管理模块 (2个表)
-- 质检记录，如果不需要质量管理可以删除
-- SELECT COUNT(*) FROM qc_inspection;-- SELECT COUNT(*) FROM qc_unqualified;
-- DROP TABLE IF EXISTS qc_inspection;-- DROP TABLE IF EXISTS qc_unqualified;

-- ========================================================-- 安全清理脚本（推荐先执行以下查询查看数据量）-- ========================================================

-- 查看所有表的数据量统计
SELECT 
    TABLE_NAME as table_name,
    TABLE_ROWS as row_count,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) as data_size_mb,
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) as index_size_mb,
    TABLE_COMMENT as description
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY DATA_LENGTH DESC;

-- 查看未使用表的详细统计（根据API分析结果）
SELECT 
    'crm_customer_contact' as table_name, 
    '客户联系人表' as description, 
    COUNT(*) as row_count 
FROM crm_customer_contact
UNION ALL
SELECT 'crm_customer_follow_up', '客户跟进记录表', COUNT(*) FROM crm_customer_follow_up
UNION ALL
SELECT 'pur_supplier', '供应商表', COUNT(*) FROM pur_supplier
UNION ALL
SELECT 'pur_supplier_material', '供应商物料关联表', COUNT(*) FROM pur_supplier_material
UNION ALL
SELECT 'inv_material_category', '物料分类表', COUNT(*) FROM inv_material_category
UNION ALL
SELECT 'inv_material', '物料表', COUNT(*) FROM inv_material
UNION ALL
SELECT 'inv_inventory', '库存表', COUNT(*) FROM inv_inventory
UNION ALL
SELECT 'inv_inventory_log', '库存日志表', COUNT(*) FROM inv_inventory_log
UNION ALL
SELECT 'pur_request_detail', '采购申请明细表', COUNT(*) FROM pur_request_detail
UNION ALL
SELECT 'pur_order', '采购订单表', COUNT(*) FROM pur_order
UNION ALL
SELECT 'pur_order_detail', '采购订单明细表', COUNT(*) FROM pur_order_detail
UNION ALL
SELECT 'pur_receipt', '采购入库单表', COUNT(*) FROM pur_receipt
UNION ALL
SELECT 'pur_receipt_detail', '采购入库明细表', COUNT(*) FROM pur_receipt_detail
UNION ALL
SELECT 'sal_order', '销售订单表', COUNT(*) FROM sal_order
UNION ALL
SELECT 'sal_order_detail', '销售订单明细表', COUNT(*) FROM sal_order_detail
UNION ALL
SELECT 'sal_delivery', '销售出库单表', COUNT(*) FROM sal_delivery
UNION ALL
SELECT 'sal_delivery_detail', '销售出库明细表', COUNT(*) FROM sal_delivery_detail
UNION ALL
SELECT 'prd_work_order', '生产工单表', COUNT(*) FROM prd_work_order
UNION ALL
SELECT 'prd_bom', 'BOM表', COUNT(*) FROM prd_bom
UNION ALL
SELECT 'prd_bom_detail', 'BOM明细表', COUNT(*) FROM prd_bom_detail
UNION ALL
SELECT 'fin_receivable', '应收款表', COUNT(*) FROM fin_receivable
UNION ALL
SELECT 'fin_payable', '应付款表', COUNT(*) FROM fin_payable
UNION ALL
SELECT 'fin_receipt_record', '收款记录表', COUNT(*) FROM fin_receipt_record
UNION ALL
SELECT 'fin_payment_record', '付款记录表', COUNT(*) FROM fin_payment_record
UNION ALL
SELECT 'qc_inspection', '质检记录表', COUNT(*) FROM qc_inspection
UNION ALL
SELECT 'qc_unqualified', '不合格品记录表', COUNT(*) FROM qc_unqualified;

-- ========================================================-- 归档方案（推荐用于有数据的表）-- ========================================================

-- 创建归档表（以库存日志为例）
-- CREATE TABLE inv_inventory_log_archive LIKE inv_inventory_log;

-- 归档历史数据（保留最近1年的数据）
-- INSERT INTO inv_inventory_log_archive 
-- SELECT * FROM inv_inventory_log 
-- WHERE create_time < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- 删除已归档的原始数据
-- DELETE FROM inv_inventory_log 
-- WHERE create_time < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- ========================================================-- 使用说明：-- 1. 先执行查询部分查看各表数据量-- 2. 根据业务需求决定删除哪些表-- 3. 对于包含数据的表，建议先归档再删除-- 4. 删除表前先备份：mysqldump -u root -p vnerpdacahng > backup.sql-- 5. 逐个取消注释执行 DROP TABLE 语句-- ========================================================
