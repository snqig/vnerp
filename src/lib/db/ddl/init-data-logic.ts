/**
 * src/app/api/init/data-logic/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** ALTER */
export const ALTER_TABLE_EQP_EQUIPMENT = `ALTER TABLE eqp_equipment ADD COLUMN oee_quality DECIMAL(5,2) DEFAULT 0 COMMENT '质量率OEE-Q%'`;

/** CREATE … */
export const CREATE_TABLE_INK_MIXED_BATCH_DETAIL = `CREATE TABLE IF NOT EXISTS ink_mixed_batch_detail (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      mixed_batch_id BIGINT UNSIGNED NOT NULL COMMENT '混合批次ID',
      source_batch_no VARCHAR(50) NOT NULL COMMENT '原墨批次号',
      source_label_no VARCHAR(50) COMMENT '原墨标签号',
      material_id BIGINT UNSIGNED COMMENT '原墨物料ID',
      material_name VARCHAR(100) COMMENT '原墨名称',
      used_qty DECIMAL(18,4) NOT NULL COMMENT '用量',
      unit VARCHAR(20) DEFAULT 'kg' COMMENT '单位',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_mixed (mixed_batch_id),
      KEY idx_source (source_batch_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='调色油墨批次明细表'`;

/** ALTER */
export const ALTER_TABLE_INV_OUTBOUND_ORDER = `ALTER TABLE inv_outbound_order ADD COLUMN voucher_no VARCHAR(50) COMMENT '财务凭证号'`;

/** CREATE … */
export const CREATE_TABLE_BIZ_CONTRACT_REVIEW = `CREATE TABLE IF NOT EXISTS biz_contract_review (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      review_no VARCHAR(50) NOT NULL COMMENT '评审编号',
      order_id BIGINT UNSIGNED NOT NULL COMMENT '销售订单ID',
      order_no VARCHAR(50) NOT NULL COMMENT '订单编号',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      total_amount DECIMAL(18,4) COMMENT '订单金额',
      delivery_date DATE COMMENT '交货日期',
      production_opinion TEXT COMMENT '生产部意见',
      production_reviewer VARCHAR(50) COMMENT '生产评审人',
      production_result TINYINT COMMENT '生产评审: 1-同意, 2-有条件同意, 3-不同意',
      purchase_opinion TEXT COMMENT '采购部意见',
      purchase_reviewer VARCHAR(50) COMMENT '采购评审人',
      purchase_result TINYINT COMMENT '采购评审结果',
      finance_opinion TEXT COMMENT '财务部意见',
      finance_reviewer VARCHAR(50) COMMENT '财务评审人',
      finance_result TINYINT COMMENT '财务评审结果',
      quality_opinion TEXT COMMENT '品质部意见',
      quality_reviewer VARCHAR(50) COMMENT '品质评审人',
      quality_result TINYINT COMMENT '品质评审结果',
      engineering_opinion TEXT COMMENT '工程部意见',
      engineering_reviewer VARCHAR(50) COMMENT '工程评审人',
      engineering_result TINYINT COMMENT '工程评审结果',
      final_result TINYINT COMMENT '最终评审: 1-通过, 2-有条件通过, 3-不通过',
      final_reviewer VARCHAR(50) COMMENT '最终评审人',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待评审, 2-评审中, 3-已通过, 4-已拒绝',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_review_no (review_no),
      KEY idx_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合同评审表'`;

/** CREATE … */
export const CREATE_TABLE_FIN_VOUCHER = `CREATE TABLE IF NOT EXISTS fin_voucher (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      voucher_no VARCHAR(50) NOT NULL COMMENT '凭证号',
      voucher_date DATE NOT NULL COMMENT '凭证日期',
      source_type VARCHAR(30) NOT NULL COMMENT '来源类型: inbound/outbound/material_issue/sales_outbound',
      source_id BIGINT UNSIGNED NOT NULL COMMENT '来源单据ID',
      source_no VARCHAR(50) COMMENT '来源单号',
      debit_account VARCHAR(50) NOT NULL COMMENT '借方科目',
      credit_account VARCHAR(50) NOT NULL COMMENT '贷方科目',
      amount DECIMAL(18,4) NOT NULL COMMENT '金额',
      cost_price DECIMAL(18,4) COMMENT '单位成本',
      quantity DECIMAL(18,4) COMMENT '数量',
      batch_no VARCHAR(50) COMMENT '批次号',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_name VARCHAR(100) COMMENT '物料名称',
      warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
      remark TEXT COMMENT '备注',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-已过账, 2-已冲销',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_voucher_no (voucher_no),
      KEY idx_source (source_type, source_id),
      KEY idx_date (voucher_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='财务凭证表'`;

/** ALTER */
export const ALTER_TABLE_INV_MATERIAL = `ALTER TABLE inv_material ADD COLUMN sgs_cert_required TINYINT DEFAULT 0 COMMENT '需要SGS认证: 0-否, 1-是'`;

/** CREATE … */
export const CREATE_TABLE_ENG_SAMPLE_TO_MASS = `CREATE TABLE IF NOT EXISTS eng_sample_to_mass (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sample_order_id BIGINT UNSIGNED NOT NULL COMMENT '打样订单ID',
      sample_order_no VARCHAR(50) NOT NULL COMMENT '打样订单号',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      product_name VARCHAR(100) COMMENT '产品名称',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      standard_card_id BIGINT UNSIGNED COMMENT '标准卡ID',
      standard_card_no VARCHAR(50) COMMENT '标准卡编号',
      process_card_id BIGINT UNSIGNED COMMENT '流程卡ID',
      process_card_no VARCHAR(50) COMMENT '流程卡编号',
      bom_id BIGINT UNSIGNED COMMENT '量产BOM ID',
      workorder_id BIGINT UNSIGNED COMMENT '量产工单ID',
      workorder_no VARCHAR(50) COMMENT '量产工单号',
      conversion_date DATE COMMENT '转量产日期',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待转产, 2-转产中, 3-已转产, 4-已取消',
      approved_by VARCHAR(50) COMMENT '审批人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_sample (sample_order_id),
      KEY idx_product (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='样品转量产记录表'`;

/** ALTER */
export const ALTER_TABLE_INV_INBOUND_ORDER = `ALTER TABLE inv_inbound_order ADD COLUMN purchase_order_id BIGINT UNSIGNED COMMENT '采购订单ID'`;

/** ALTER */
export const ALTER_TABLE_PROD_WORK_ORDER = `ALTER TABLE prod_work_order ADD COLUMN sales_order_no VARCHAR(50) COMMENT '销售订单号'`;

/** ALTER */
export const ALTER_TABLE_EQP_EQUIPMENT_2 = `ALTER TABLE eqp_equipment ADD COLUMN oee_overall DECIMAL(5,2) DEFAULT 0 COMMENT '综合OEE%'`;

/** ALTER */
export const ALTER_TABLE_INV_SALES_OUTBOUND = `ALTER TABLE inv_sales_outbound ADD COLUMN voucher_no VARCHAR(50) COMMENT '财务凭证号'`;

/** ALTER */
export const ALTER_TABLE_PUR_SUPPLIER = `ALTER TABLE pur_supplier ADD COLUMN quality_score DECIMAL(5,2) DEFAULT 0 COMMENT '质量评分(0-100)'`;

/** ALTER */
export const ALTER_TABLE_PROD_WORK_ORDER_2 = `ALTER TABLE prod_work_order ADD COLUMN process_card_id BIGINT UNSIGNED COMMENT '流程卡ID'`;

/** ALTER */
export const ALTER_TABLE_INV_INBOUND_ORDER_2 = `ALTER TABLE inv_inbound_order ADD COLUMN inspection_status TINYINT DEFAULT 0 COMMENT '质检状态: 0-未检, 1-合格, 2-不合格, 3-待检'`;

/** ALTER */
export const ALTER_TABLE_PUR_SUPPLIER_2 = `ALTER TABLE pur_supplier ADD COLUMN delivery_score DECIMAL(5,2) DEFAULT 0 COMMENT '交付评分(0-100)'`;

/** ALTER */
export const ALTER_TABLE_PROD_WORK_ORDER_3 = `ALTER TABLE prod_work_order ADD COLUMN standard_card_id BIGINT UNSIGNED COMMENT '标准卡ID'`;

/** CREATE … */
export const CREATE_TABLE_INK_OPENING_RECORD = `CREATE TABLE IF NOT EXISTS ink_opening_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      opening_no VARCHAR(50) NOT NULL COMMENT '开罐记录号',
      label_no VARCHAR(50) NOT NULL COMMENT '物料标签号',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_name VARCHAR(100) NOT NULL COMMENT '油墨名称',
      batch_no VARCHAR(50) COMMENT '批次号',
      original_expire_date DATE COMMENT '原有效期',
      opening_date DATETIME NOT NULL COMMENT '开罐日期',
      shelf_life_after_opening INT COMMENT '开罐后保质期(天)',
      new_expire_date DATE COMMENT '新有效期=MIN(原有效期, 开罐日期+开罐后保质期)',
      remaining_qty DECIMAL(18,4) COMMENT '剩余数量',
      unit VARCHAR(20) COMMENT '单位',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-使用中, 2-已用完, 3-已报废',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_opening_no (opening_no),
      KEY idx_label (label_no),
      KEY idx_batch (batch_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨开罐记录表'`;

/** ALTER */
export const ALTER_TABLE_CRM_CUSTOMER = `ALTER TABLE crm_customer ADD COLUMN credit_used DECIMAL(18,4) DEFAULT 0 COMMENT '已用信用额度'`;

/** ALTER */
export const ALTER_TABLE_INV_OUTBOUND_ORDER_2 = `ALTER TABLE inv_outbound_order ADD COLUMN finance_posted TINYINT DEFAULT 0 COMMENT '财务过账: 0-未过账, 1-已过账'`;

/** ALTER */
export const ALTER_TABLE_INV_MATERIAL_LABEL = `ALTER TABLE inv_material_label ADD COLUMN trace_link_id BIGINT UNSIGNED COMMENT '追溯链ID'`;

/** ALTER */
export const ALTER_TABLE_PUR_SUPPLIER_3 = `ALTER TABLE pur_supplier ADD COLUMN overall_score DECIMAL(5,2) DEFAULT 0 COMMENT '综合评分(0-100)'`;

/** ALTER */
export const ALTER_TABLE_INV_SALES_OUTBOUND_2 = `ALTER TABLE inv_sales_outbound ADD COLUMN finance_posted TINYINT DEFAULT 0 COMMENT '财务过账: 0-未过账, 1-已过账'`;

/** ALTER */
export const ALTER_TABLE_INV_INBOUND_ORDER_3 = `ALTER TABLE inv_inbound_order ADD COLUMN finance_posted TINYINT DEFAULT 0 COMMENT '财务过账: 0-未过账, 1-已过账'`;

/** ALTER */
export const ALTER_TABLE_INV_INBOUND_ORDER_4 = `ALTER TABLE inv_inbound_order ADD COLUMN inspection_id BIGINT UNSIGNED COMMENT '检验记录ID'`;

/** ALTER */
export const ALTER_TABLE_INV_INVENTORY_BATCH = `ALTER TABLE inv_inventory_batch ADD COLUMN freeze_reason VARCHAR(100) COMMENT '冻结原因'`;

/** ALTER */
export const ALTER_TABLE_INV_INBOUND_ORDER_5 = `ALTER TABLE inv_inbound_order ADD COLUMN purchase_order_no VARCHAR(50) COMMENT '采购订单号'`;

/** ALTER */
export const ALTER_TABLE_EQP_EQUIPMENT_3 = `ALTER TABLE eqp_equipment ADD COLUMN oee_performance DECIMAL(5,2) DEFAULT 0 COMMENT '表现率OEE-P%'`;

/** CREATE … */
export const CREATE_TABLE_INV_SCAN_LOG = `CREATE TABLE IF NOT EXISTS inv_scan_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      scan_type VARCHAR(30) NOT NULL COMMENT '扫码类型: material_issue/production_report/quality_inspection/sales_outbound/inbound',
      qr_content TEXT NOT NULL COMMENT '二维码内容',
      qr_type VARCHAR(20) COMMENT '二维码类型: PL/ML/PC/EQ/EMP',
      sn VARCHAR(100) COMMENT '序列号',
      batch_no VARCHAR(50) COMMENT '批次号',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_name VARCHAR(100) COMMENT '物料名称',
      workorder_id BIGINT UNSIGNED COMMENT '工单ID',
      workorder_no VARCHAR(50) COMMENT '工单号',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      scan_time DATETIME NOT NULL COMMENT '扫码时间',
      scan_result VARCHAR(20) COMMENT '扫码结果: success/fifo_violation/error',
      result_message TEXT COMMENT '结果消息',
      device_info VARCHAR(100) COMMENT '设备信息',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_scan_type (scan_type),
      KEY idx_sn (sn),
      KEY idx_batch (batch_no),
      KEY idx_time (scan_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='扫码日志表'`;

/** ALTER */
export const ALTER_TABLE_PUR_SUPPLIER_4 = `ALTER TABLE pur_supplier ADD COLUMN price_score DECIMAL(5,2) DEFAULT 0 COMMENT '价格评分(0-100)'`;

/** ALTER */
export const ALTER_TABLE_PROD_WORK_ORDER_4 = `ALTER TABLE prod_work_order ADD COLUMN sales_order_id BIGINT UNSIGNED COMMENT '销售订单ID'`;

/** CREATE … */
export const CREATE_TABLE_PRD_PRODUCT_TRACE_LINK = `CREATE TABLE IF NOT EXISTS prd_product_trace_link (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sn VARCHAR(100) NOT NULL COMMENT '成品序列号/标签号',
      parent_sn VARCHAR(100) COMMENT '父级SN(用于分切/组合)',
      material_batch VARCHAR(50) COMMENT '物料批次号',
      workorder_id BIGINT UNSIGNED COMMENT '生产工单ID',
      workorder_no VARCHAR(50) COMMENT '生产工单号',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      supplier_id BIGINT UNSIGNED COMMENT '供应商ID',
      supplier_name VARCHAR(100) COMMENT '供应商名称',
      inbound_date DATE COMMENT '入库日期',
      inbound_no VARCHAR(50) COMMENT '入库单号',
      inspection_id BIGINT UNSIGNED COMMENT '检验记录ID',
      inspection_result VARCHAR(20) COMMENT '检验结果: pass/fail/pending',
      trace_level INT DEFAULT 1 COMMENT '追溯层级',
      trace_type VARCHAR(20) DEFAULT 'product' COMMENT '追溯类型: product/material/process',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_sn (sn),
      KEY idx_parent_sn (parent_sn),
      KEY idx_batch (material_batch),
      KEY idx_workorder (workorder_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品追溯链表'`;

/** CREATE … */
export const CREATE_TABLE_INV_FIFO_OVERRIDE_LOG = `CREATE TABLE IF NOT EXISTS inv_fifo_override_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      source_type VARCHAR(30) NOT NULL COMMENT '来源类型: material_issue/sales_outbound',
      source_id BIGINT UNSIGNED NOT NULL COMMENT '来源单据ID',
      source_no VARCHAR(50) COMMENT '来源单号',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_name VARCHAR(100) COMMENT '物料名称',
      recommended_batch VARCHAR(50) COMMENT 'FIFO推荐批次号',
      actual_batch VARCHAR(50) NOT NULL COMMENT '实际使用批次号',
      reason TEXT COMMENT '跳过原因',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      approval_status TINYINT DEFAULT 0 COMMENT '审批状态: 0-待审批, 1-已批准, 2-已拒绝',
      approver_id BIGINT UNSIGNED COMMENT '审批人ID',
      approver_name VARCHAR(50) COMMENT '审批人',
      approval_time DATETIME COMMENT '审批时间',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_source (source_type, source_id),
      KEY idx_material (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='FIFO覆盖日志'`;

/** ALTER */
export const ALTER_TABLE_INV_MATERIAL_2 = `ALTER TABLE inv_material ADD COLUMN sgs_cert_id BIGINT UNSIGNED COMMENT 'SGS认证ID'`;

/** ALTER */
export const ALTER_TABLE_EQP_EQUIPMENT_4 = `ALTER TABLE eqp_equipment ADD COLUMN oee_availability DECIMAL(5,2) DEFAULT 0 COMMENT '可用率OEE-A%'`;

/** ALTER */
export const ALTER_TABLE_INV_INVENTORY_BATCH_2 = `ALTER TABLE inv_inventory_batch ADD COLUMN inspection_id BIGINT UNSIGNED COMMENT '关联检验ID'`;

/** CREATE … */
export const CREATE_TABLE_INK_MIXED_BATCH = `CREATE TABLE IF NOT EXISTS ink_mixed_batch (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      batch_no VARCHAR(50) NOT NULL COMMENT '混合批次号: MIX-YYYYMMDD-配方号-序号',
      formula_no VARCHAR(50) COMMENT '配方号',
      formula_name VARCHAR(100) COMMENT '配方名称',
      total_qty DECIMAL(18,4) NOT NULL COMMENT '混合总量',
      unit VARCHAR(20) DEFAULT 'kg' COMMENT '单位',
      mixed_date DATETIME NOT NULL COMMENT '混合日期',
      expire_date DATE COMMENT '有效期',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-可用, 2-已用完, 3-已过期',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_batch_no (batch_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='调色油墨批次表'`;

/** ALTER */
export const ALTER_TABLE_CRM_CUSTOMER_2 = `ALTER TABLE crm_customer ADD COLUMN credit_limit DECIMAL(18,4) DEFAULT 0 COMMENT '信用额度'`;

/** ALTER */
export const ALTER_TABLE_INV_INBOUND_ORDER_6 = `ALTER TABLE inv_inbound_order ADD COLUMN voucher_no VARCHAR(50) COMMENT '财务凭证号'`;
