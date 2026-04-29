import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const results: string[] = [];

    // ========================================
    // 0. 清理可能存在的不一致表（其他init路由创建的表列名可能不同）
    // ========================================
    await conn.execute(`SET FOREIGN_KEY_CHECKS = 0`);
    const dropTables = [
      'fin_payment_record', 'fin_receipt_record', 'fin_payable', 'fin_receivable',
      'qc_unqualified', 'qc_inspection',
      'prd_work_report',
      'prod_work_order_material_req', 'prod_work_order_item', 'prod_work_order',
      'prd_bom_detail', 'prd_bom',
      'sal_reconciliation_detail', 'sal_reconciliation',
      'sal_return_order_item', 'sal_return_order',
      'sal_delivery_order_item', 'sal_delivery_order',
      'inv_inventory_transaction',
      'inv_outbound_item', 'inv_outbound_order',
      'inv_inventory_log', 'inv_inventory_batch', 'inv_inventory',
      'inv_inbound_item', 'inv_inbound_order',
      'sal_order_detail', 'sal_order_item', 'sal_order',
      'sal_sample_order',
      'pur_receipt_detail', 'pur_receipt',
      'pur_purchase_order_line', 'pur_purchase_order',
      'pur_request_item', 'pur_request',
      'pur_order_detail', 'pur_order',
      'prd_process_route_step', 'prd_process_route',
      'prd_die_template',
      'eqp_maintenance_record', 'eqp_maintenance_plan', 'eqp_equipment',
      'inv_material',
      'pur_supplier',
      'crm_customer_contact', 'crm_customer',
      'inv_location', 'inv_warehouse',
      'inv_material_label', 'inv_cutting_record', 'inv_cutting_detail',
      'prd_process_card', 'prd_process_card_material',
      'inv_trace_record', 'inv_trace_detail', 'inv_scan_log',
      'ink_opening_record',
    ];
    for (const table of dropTables) {
      try {
        await conn.execute(`DROP TABLE IF EXISTS ${table}`);
      } catch (e: any) {}
    }
    await conn.execute(`SET FOREIGN_KEY_CHECKS = 1`);
    results.push('已清理旧表');

    // ========================================
    // 1. 核心基础表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_warehouse (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      warehouse_code VARCHAR(50) NOT NULL COMMENT '仓库编码',
      warehouse_name VARCHAR(100) NOT NULL COMMENT '仓库名称',
      warehouse_type TINYINT COMMENT '仓库类型: 1-原材料仓, 2-半成品仓, 3-成品仓, 4-辅料仓',
      province VARCHAR(50) COMMENT '省份',
      city VARCHAR(50) COMMENT '城市',
      address VARCHAR(255) COMMENT '详细地址',
      manager_id BIGINT UNSIGNED COMMENT '仓库负责人ID',
      contact_phone VARCHAR(20) COMMENT '联系电话',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_warehouse_code (warehouse_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='仓库表'`);
    results.push('inv_warehouse');

    await conn.execute(`CREATE TABLE IF NOT EXISTS pur_supplier (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      supplier_code VARCHAR(50) NOT NULL COMMENT '供应商编码',
      supplier_name VARCHAR(100) NOT NULL COMMENT '供应商名称',
      short_name VARCHAR(50) COMMENT '供应商简称',
      supplier_type TINYINT COMMENT '供应商类型: 1-原材料, 2-辅料, 3-设备, 4-服务',
      province VARCHAR(50) COMMENT '省份',
      city VARCHAR(50) COMMENT '城市',
      address VARCHAR(255) COMMENT '详细地址',
      contact_name VARCHAR(50) COMMENT '联系人',
      contact_phone VARCHAR(20) COMMENT '联系电话',
      contact_email VARCHAR(100) COMMENT '联系邮箱',
      business_license VARCHAR(50) COMMENT '营业执照号',
      tax_number VARCHAR(50) COMMENT '税号',
      bank_name VARCHAR(100) COMMENT '开户银行',
      bank_account VARCHAR(50) COMMENT '银行账号',
      credit_level VARCHAR(20) COMMENT '信用等级',
      cooperation_status TINYINT DEFAULT 1 COMMENT '合作状态: 1-合作中, 2-暂停合作, 3-终止合作',
      settlement_method VARCHAR(50) COMMENT '结算方式',
      payment_terms VARCHAR(100) COMMENT '付款条件',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      update_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_supplier_code (supplier_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商表'`);
    results.push('pur_supplier');

    await conn.execute(`CREATE TABLE IF NOT EXISTS crm_customer (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      customer_code VARCHAR(50) NOT NULL COMMENT '客户编码',
      customer_name VARCHAR(100) NOT NULL COMMENT '客户名称',
      short_name VARCHAR(50) COMMENT '客户简称',
      customer_type TINYINT COMMENT '客户类型: 1-企业, 2-个人',
      industry VARCHAR(50) COMMENT '所属行业',
      scale VARCHAR(50) COMMENT '企业规模',
      credit_level VARCHAR(20) COMMENT '信用等级',
      province VARCHAR(50) COMMENT '省份',
      city VARCHAR(50) COMMENT '城市',
      district VARCHAR(50) COMMENT '区县',
      address VARCHAR(255) COMMENT '详细地址',
      contact_name VARCHAR(50) COMMENT '联系人姓名',
      contact_phone VARCHAR(20) COMMENT '联系人电话',
      contact_email VARCHAR(100) COMMENT '联系人邮箱',
      fax VARCHAR(20) COMMENT '传真',
      website VARCHAR(100) COMMENT '网站',
      business_license VARCHAR(50) COMMENT '营业执照号',
      tax_number VARCHAR(50) COMMENT '税号',
      bank_name VARCHAR(100) COMMENT '开户银行',
      bank_account VARCHAR(50) COMMENT '银行账号',
      salesman_id BIGINT UNSIGNED COMMENT '业务员ID',
      follow_up_status TINYINT DEFAULT 1 COMMENT '跟进状态: 1-潜在客户, 2-意向客户, 3-成交客户, 4-流失客户',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      update_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_customer_code (customer_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户表'`);
    results.push('crm_customer');

    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_material (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
      material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
      specification VARCHAR(255) COMMENT '规格型号',
      category_id BIGINT UNSIGNED COMMENT '分类ID',
      material_type TINYINT COMMENT '物料类型: 1-原材料, 2-半成品, 3-成品, 4-辅料, 5-包材',
      unit VARCHAR(20) COMMENT '计量单位',
      barcode VARCHAR(50) COMMENT '条形码',
      brand VARCHAR(50) COMMENT '品牌',
      safety_stock DECIMAL(18,4) DEFAULT 0 COMMENT '安全库存',
      max_stock DECIMAL(18,4) COMMENT '最大库存',
      min_stock DECIMAL(18,4) COMMENT '最小库存',
      purchase_price DECIMAL(18,4) COMMENT '采购单价',
      sale_price DECIMAL(18,4) COMMENT '销售单价',
      cost_price DECIMAL(18,4) COMMENT '成本单价',
      warehouse_id BIGINT UNSIGNED COMMENT '默认仓库ID',
      shelf_life INT COMMENT '保质期(天)',
      warning_days INT COMMENT '预警天数',
      is_batch_managed TINYINT DEFAULT 0 COMMENT '是否批次管理: 0-否, 1-是',
      is_serial_managed TINYINT DEFAULT 0 COMMENT '是否序列号管理: 0-否, 1-是',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      update_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_material_code (material_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料表'`);
    results.push('inv_material');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sal_order (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_no VARCHAR(50) NOT NULL COMMENT '订单编号',
      order_date DATE COMMENT '订单日期',
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      contact_name VARCHAR(50) COMMENT '联系人',
      contact_phone VARCHAR(20) COMMENT '联系电话',
      delivery_address VARCHAR(255) COMMENT '送货地址',
      salesman_id BIGINT UNSIGNED COMMENT '业务员ID',
      total_amount DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
      tax_amount DECIMAL(18,4) DEFAULT 0 COMMENT '税额',
      total_with_tax DECIMAL(18,4) DEFAULT 0 COMMENT '含税总额',
      discount_amount DECIMAL(18,4) DEFAULT 0 COMMENT '折扣金额',
      currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
      exchange_rate DECIMAL(10,4) DEFAULT 1 COMMENT '汇率',
      payment_terms VARCHAR(100) COMMENT '付款条件',
      delivery_date DATE COMMENT '交货日期',
      contract_no VARCHAR(50) COMMENT '合同编号',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待确认, 2-已确认, 3-部分发货, 4-已完成, 5-已取消',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      update_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_order_no (order_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售订单表'`);
    results.push('sal_order');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sal_order_detail (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      quantity DECIMAL(18,4) NOT NULL COMMENT '销售数量',
      unit VARCHAR(20) COMMENT '单位',
      unit_price DECIMAL(18,4) COMMENT '单价',
      tax_rate DECIMAL(5,2) DEFAULT 0 COMMENT '税率(%)',
      amount DECIMAL(18,4) COMMENT '金额',
      tax_amount DECIMAL(18,4) COMMENT '税额',
      total_amount DECIMAL(18,4) COMMENT '含税金额',
      delivered_qty DECIMAL(18,4) DEFAULT 0 COMMENT '已发货数量',
      delivery_date DATE COMMENT '交货日期',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售订单明细表'`);
    results.push('sal_order_detail');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sal_order_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
      material_name VARCHAR(200) COMMENT '物料名称',
      quantity DECIMAL(14,3) DEFAULT 0 COMMENT '数量',
      unit VARCHAR(20) COMMENT '单位',
      unit_price DECIMAL(14,4) DEFAULT 0 COMMENT '单价',
      total_price DECIMAL(14,2) DEFAULT 0 COMMENT '总价',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售订单明细表(API)'`);
    results.push('sal_order_item');

    await conn.execute(`CREATE TABLE IF NOT EXISTS pur_order (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_no VARCHAR(50) NOT NULL COMMENT '订单编号',
      order_date DATE COMMENT '订单日期',
      supplier_id BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
      contact_name VARCHAR(50) COMMENT '联系人',
      contact_phone VARCHAR(20) COMMENT '联系电话',
      delivery_address VARCHAR(255) COMMENT '送货地址',
      total_amount DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
      tax_amount DECIMAL(18,4) DEFAULT 0 COMMENT '税额',
      total_with_tax DECIMAL(18,4) DEFAULT 0 COMMENT '含税总额',
      currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
      exchange_rate DECIMAL(10,4) DEFAULT 1 COMMENT '汇率',
      payment_terms VARCHAR(100) COMMENT '付款条件',
      delivery_date DATE COMMENT '交货日期',
      settlement_method VARCHAR(50) COMMENT '结算方式',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待确认, 2-已确认, 3-部分到货, 4-已完成, 5-已取消',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      update_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_order_no (order_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购订单表'`);
    results.push('pur_order');

    await conn.execute(`CREATE TABLE IF NOT EXISTS pur_order_detail (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      quantity DECIMAL(18,4) NOT NULL COMMENT '采购数量',
      unit VARCHAR(20) COMMENT '单位',
      unit_price DECIMAL(18,4) COMMENT '单价',
      tax_rate DECIMAL(5,2) DEFAULT 0 COMMENT '税率(%)',
      amount DECIMAL(18,4) COMMENT '金额',
      tax_amount DECIMAL(18,4) COMMENT '税额',
      total_amount DECIMAL(18,4) COMMENT '含税金额',
      received_qty DECIMAL(18,4) DEFAULT 0 COMMENT '已到货数量',
      delivery_date DATE COMMENT '交货日期',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购订单明细表'`);
    results.push('pur_order_detail');

    await conn.execute(`CREATE TABLE IF NOT EXISTS pur_purchase_order (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
      po_no VARCHAR(50) NOT NULL COMMENT '采购单号',
      supplier_id INT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
      supplier_name VARCHAR(100) NOT NULL COMMENT '供应商名称',
      supplier_code VARCHAR(50) DEFAULT NULL COMMENT '供应商编码',
      order_date DATE NOT NULL COMMENT '订单日期',
      delivery_date DATE DEFAULT NULL COMMENT '预计交货日期',
      currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
      exchange_rate DECIMAL(10,4) DEFAULT 1.0000 COMMENT '汇率',
      total_amount DECIMAL(14,2) DEFAULT 0 COMMENT '订单总金额',
      total_quantity DECIMAL(14,3) DEFAULT 0 COMMENT '订单总数量',
      tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%',
      tax_amount DECIMAL(14,2) DEFAULT 0 COMMENT '税额',
      grand_total DECIMAL(14,2) DEFAULT 0 COMMENT '含税总金额',
      status TINYINT UNSIGNED DEFAULT 10 COMMENT '状态: 10-草稿,20-待审批,30-已审批,40-部分收货,50-已完成,90-已关闭',
      over_receipt_tolerance DECIMAL(5,2) DEFAULT 5.00 COMMENT '超收容差率%',
      payment_terms VARCHAR(100) DEFAULT NULL COMMENT '付款条款',
      delivery_address TEXT DEFAULT NULL COMMENT '送货地址',
      contact_person VARCHAR(50) DEFAULT NULL COMMENT '联系人',
      contact_phone VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
      remark TEXT DEFAULT NULL COMMENT '备注',
      create_by INT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      update_by INT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      audit_by INT UNSIGNED DEFAULT NULL COMMENT '审批人ID',
      audit_time DATETIME DEFAULT NULL COMMENT '审批时间',
      close_by INT UNSIGNED DEFAULT NULL COMMENT '关闭人ID',
      close_time DATETIME DEFAULT NULL COMMENT '关闭时间',
      close_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
      deleted TINYINT(1) DEFAULT 0 COMMENT '是否删除',
      UNIQUE KEY uk_po_no (po_no),
      INDEX idx_supplier (supplier_id),
      INDEX idx_status (status),
      INDEX idx_order_date (order_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购单主表'`);
    results.push('pur_purchase_order');

    await conn.execute(`CREATE TABLE IF NOT EXISTS pur_purchase_order_line (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
      po_id INT UNSIGNED NOT NULL COMMENT '采购单ID',
      line_no INT UNSIGNED NOT NULL COMMENT '行号',
      material_id INT UNSIGNED DEFAULT NULL COMMENT '物料ID',
      material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
      material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
      material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
      unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
      order_qty DECIMAL(14,3) NOT NULL DEFAULT 0 COMMENT '订购数量',
      received_qty DECIMAL(14,3) DEFAULT 0 COMMENT '累计入库数量',
      returned_qty DECIMAL(14,3) DEFAULT 0 COMMENT '累计退货数量',
      unit_price DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '单价',
      amount DECIMAL(14,2) DEFAULT 0 COMMENT '金额',
      tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%',
      tax_amount DECIMAL(14,2) DEFAULT 0 COMMENT '税额',
      line_total DECIMAL(14,2) DEFAULT 0 COMMENT '行合计',
      require_date DATE DEFAULT NULL COMMENT '需求日期',
      closed_flag TINYINT(1) DEFAULT 0 COMMENT '行关闭标志',
      closed_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
      remark TEXT DEFAULT NULL COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      UNIQUE KEY uk_po_line (po_id, line_no),
      INDEX idx_material (material_id),
      FOREIGN KEY (po_id) REFERENCES pur_purchase_order(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购单行表'`);
    results.push('pur_purchase_order_line');

    await conn.execute(`CREATE TABLE IF NOT EXISTS pur_request (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      request_no VARCHAR(50) NOT NULL COMMENT '申请单号',
      request_date DATE COMMENT '申请日期',
      request_type VARCHAR(20) DEFAULT 'material' COMMENT '申请类型',
      request_dept VARCHAR(100) COMMENT '申请部门',
      requester_name VARCHAR(50) COMMENT '申请人',
      total_amount DECIMAL(14,2) DEFAULT 0 COMMENT '总金额',
      currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
      status TINYINT DEFAULT 0 COMMENT '状态: 0-草稿, 1-待审批, 2-已审批, 3-已转采购, 9-已关闭',
      priority TINYINT DEFAULT 1 COMMENT '优先级',
      expected_date DATE COMMENT '期望交期',
      supplier_name VARCHAR(100) COMMENT '供应商名称',
      remark TEXT COMMENT '备注',
      create_by INT UNSIGNED DEFAULT NULL,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_by INT UNSIGNED DEFAULT NULL,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT(1) DEFAULT 0,
      UNIQUE KEY uk_request_no (request_no),
      INDEX idx_status (status),
      INDEX idx_request_date (request_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请主表'`);
    results.push('pur_request');

    await conn.execute(`CREATE TABLE IF NOT EXISTS pur_request_item (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      request_id INT UNSIGNED NOT NULL COMMENT '申请ID',
      line_no INT UNSIGNED NOT NULL COMMENT '行号',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(200) COMMENT '物料名称',
      material_spec VARCHAR(500) COMMENT '物料规格',
      material_unit VARCHAR(20) COMMENT '单位',
      quantity DECIMAL(14,3) DEFAULT 0 COMMENT '数量',
      price DECIMAL(14,4) DEFAULT 0 COMMENT '单价',
      amount DECIMAL(14,2) DEFAULT 0 COMMENT '金额',
      supplier_name VARCHAR(100) COMMENT '供应商名称',
      expected_date DATE COMMENT '期望交期',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT(1) DEFAULT 0,
      INDEX idx_request (request_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请明细表'`);
    results.push('pur_request_item');

    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_inbound_order (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_no VARCHAR(50) NOT NULL COMMENT '入库单号',
      order_type ENUM('purchase', 'return', 'transfer', 'other') DEFAULT 'purchase' COMMENT '入库类型',
      warehouse_id INT UNSIGNED NOT NULL COMMENT '仓库ID',
      supplier_id INT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
      supplier_name VARCHAR(100) DEFAULT NULL COMMENT '供应商名称',
      po_id INT UNSIGNED DEFAULT NULL COMMENT '关联采购单ID',
      po_no VARCHAR(50) DEFAULT NULL COMMENT '采购单号',
      grn_type ENUM('po', 'blind', 'return') DEFAULT 'po' COMMENT '入库类型',
      total_amount DECIMAL(12,2) DEFAULT 0 COMMENT '总金额',
      total_quantity DECIMAL(12,3) DEFAULT 0 COMMENT '总数量',
      status ENUM('draft', 'pending', 'approved', 'completed', 'cancelled') DEFAULT 'draft' COMMENT '状态',
      qc_status ENUM('pending', 'pass', 'fail', 'partial') DEFAULT 'pending' COMMENT '质检状态',
      inbound_date DATE DEFAULT NULL COMMENT '入库日期',
      remark TEXT COMMENT '备注',
      create_by INT UNSIGNED DEFAULT NULL,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_by INT UNSIGNED DEFAULT NULL,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT(1) DEFAULT 0,
      INDEX idx_order_no (order_no),
      INDEX idx_warehouse (warehouse_id),
      INDEX idx_status (status),
      INDEX idx_po_id (po_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库订单主表'`);
    results.push('inv_inbound_order');

    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_inbound_item (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_id INT UNSIGNED NOT NULL COMMENT '入库订单ID',
      material_id INT UNSIGNED NOT NULL COMMENT '物料ID',
      material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
      material_spec VARCHAR(200) DEFAULT NULL COMMENT '物料规格',
      batch_no VARCHAR(50) DEFAULT NULL COMMENT '批次号',
      quantity DECIMAL(12,3) DEFAULT 0 COMMENT '入库数量',
      unit VARCHAR(20) COMMENT '单位',
      unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
      total_price DECIMAL(12,2) DEFAULT 0 COMMENT '总价',
      warehouse_location VARCHAR(50) DEFAULT NULL COMMENT '库位',
      produce_date DATE DEFAULT NULL COMMENT '生产日期',
      expire_date DATE DEFAULT NULL COMMENT '过期日期',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_order (order_id),
      INDEX idx_material (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库订单明细表'`);
    results.push('inv_inbound_item');

    // ========================================
    // 1. 送货单表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS sal_delivery_order (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      delivery_no VARCHAR(50) NOT NULL COMMENT '送货单号',
      order_id BIGINT UNSIGNED COMMENT '销售订单ID',
      order_no VARCHAR(50) COMMENT '销售订单编号',
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      delivery_date DATE COMMENT '送货日期',
      contact_name VARCHAR(50) COMMENT '收货联系人',
      contact_phone VARCHAR(20) COMMENT '联系电话',
      delivery_address VARCHAR(255) COMMENT '送货地址',
      warehouse_id BIGINT UNSIGNED COMMENT '发货仓库ID',
      logistics_company VARCHAR(100) COMMENT '物流公司',
      tracking_no VARCHAR(50) COMMENT '物流单号',
      driver_name VARCHAR(50) COMMENT '司机姓名',
      vehicle_no VARCHAR(20) COMMENT '车牌号',
      total_qty DECIMAL(18,4) DEFAULT 0 COMMENT '总数量',
      total_amount DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
      sign_status TINYINT DEFAULT 0 COMMENT '签收状态: 0-未签收, 1-已签收, 2-部分签收, 3-拒收',
      sign_person VARCHAR(50) COMMENT '签收人',
      sign_time DATETIME COMMENT '签收时间',
      sign_remark VARCHAR(255) COMMENT '签收备注',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待发货, 2-已发货, 3-已签收, 4-已取消',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_delivery_no (delivery_no),
      KEY idx_order (order_id),
      KEY idx_customer (customer_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='送货单表'`);
    results.push('sal_delivery_order');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sal_delivery_order_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      delivery_id BIGINT UNSIGNED NOT NULL COMMENT '送货单ID',
      order_detail_id BIGINT UNSIGNED COMMENT '订单明细ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_name VARCHAR(100) COMMENT '物料名称',
      material_spec VARCHAR(255) COMMENT '规格型号',
      quantity DECIMAL(18,4) NOT NULL COMMENT '送货数量',
      unit VARCHAR(20) COMMENT '单位',
      unit_price DECIMAL(18,4) COMMENT '单价',
      amount DECIMAL(18,4) COMMENT '金额',
      batch_no VARCHAR(50) COMMENT '批次号',
      sign_qty DECIMAL(18,4) DEFAULT 0 COMMENT '签收数量',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_delivery (delivery_id),
      KEY idx_material (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='送货单明细表'`);
    results.push('sal_delivery_order_item');

    // ========================================
    // 2. 退货单表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS sal_return_order (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      return_no VARCHAR(50) NOT NULL COMMENT '退货单号',
      order_id BIGINT UNSIGNED COMMENT '原销售订单ID',
      order_no VARCHAR(50) COMMENT '原销售订单编号',
      delivery_id BIGINT UNSIGNED COMMENT '原送货单ID',
      delivery_no VARCHAR(50) COMMENT '原送货单号',
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      return_date DATE COMMENT '退货日期',
      return_type TINYINT DEFAULT 1 COMMENT '退货类型: 1-质量退货, 2-数量差异, 3-规格不符, 4-其他',
      return_reason TEXT COMMENT '退货原因',
      total_qty DECIMAL(18,4) DEFAULT 0 COMMENT '退货总数量',
      total_amount DECIMAL(18,4) DEFAULT 0 COMMENT '退货总金额',
      inspection_status TINYINT DEFAULT 0 COMMENT '质检状态: 0-未质检, 1-质检中, 2-已质检',
      inspection_result TINYINT COMMENT '质检结果: 1-合格, 2-不合格, 3-部分合格',
      warehouse_id BIGINT UNSIGNED COMMENT '退货入库仓库ID',
      inbound_status TINYINT DEFAULT 0 COMMENT '入库状态: 0-未入库, 1-已入库',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待审核, 2-已审核, 3-已退货, 4-已拒绝',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_return_no (return_no),
      KEY idx_order (order_id),
      KEY idx_customer (customer_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退货单表'`);
    results.push('sal_return_order');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sal_return_order_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      return_id BIGINT UNSIGNED NOT NULL COMMENT '退货单ID',
      delivery_item_id BIGINT UNSIGNED COMMENT '送货单明细ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_name VARCHAR(100) COMMENT '物料名称',
      material_spec VARCHAR(255) COMMENT '规格型号',
      quantity DECIMAL(18,4) NOT NULL COMMENT '退货数量',
      unit VARCHAR(20) COMMENT '单位',
      unit_price DECIMAL(18,4) COMMENT '单价',
      amount DECIMAL(18,4) COMMENT '金额',
      batch_no VARCHAR(50) COMMENT '批次号',
      inspection_qty DECIMAL(18,4) DEFAULT 0 COMMENT '质检数量',
      qualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '合格数量',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_return (return_id),
      KEY idx_material (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退货单明细表'`);
    results.push('sal_return_order_item');

    // ========================================
    // 3. 销售对账表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS sal_reconciliation (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      reconciliation_no VARCHAR(50) NOT NULL COMMENT '对账单号',
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      period_start DATE NOT NULL COMMENT '对账期间开始',
      period_end DATE NOT NULL COMMENT '对账期间结束',
      delivery_amount DECIMAL(18,4) DEFAULT 0 COMMENT '送货金额',
      return_amount DECIMAL(18,4) DEFAULT 0 COMMENT '退货金额',
      discount_amount DECIMAL(18,4) DEFAULT 0 COMMENT '折扣金额',
      net_amount DECIMAL(18,4) DEFAULT 0 COMMENT '对账净额',
      received_amount DECIMAL(18,4) DEFAULT 0 COMMENT '已收金额',
      balance_amount DECIMAL(18,4) DEFAULT 0 COMMENT '未收余额',
      confirm_status TINYINT DEFAULT 0 COMMENT '客户确认: 0-未确认, 1-已确认, 2-有异议',
      confirm_person VARCHAR(50) COMMENT '确认人',
      confirm_time DATETIME COMMENT '确认时间',
      confirm_remark VARCHAR(255) COMMENT '确认备注',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-草稿, 2-已发送, 3-已确认, 4-已关闭',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_reconciliation_no (reconciliation_no),
      KEY idx_customer (customer_id),
      KEY idx_period (period_start, period_end),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售对账表'`);
    results.push('sal_reconciliation');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sal_reconciliation_detail (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      reconciliation_id BIGINT UNSIGNED NOT NULL COMMENT '对账单ID',
      source_type TINYINT NOT NULL COMMENT '来源类型: 1-送货单, 2-退货单',
      source_id BIGINT UNSIGNED COMMENT '来源单据ID',
      source_no VARCHAR(50) COMMENT '来源单号',
      source_date DATE COMMENT '单据日期',
      amount DECIMAL(18,4) NOT NULL COMMENT '金额',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_reconciliation (reconciliation_id),
      KEY idx_source (source_type, source_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售对账明细表'`);
    results.push('sal_reconciliation_detail');

    // ========================================
    // 4. 设备管理表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS eqp_equipment (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      equipment_code VARCHAR(50) NOT NULL COMMENT '设备编码',
      equipment_name VARCHAR(100) NOT NULL COMMENT '设备名称',
      equipment_type TINYINT COMMENT '设备类型: 1-印刷机, 2-覆膜机, 3-模切机, 4-全检机, 5-其他',
      brand VARCHAR(50) COMMENT '品牌',
      model VARCHAR(50) COMMENT '型号',
      serial_no VARCHAR(50) COMMENT '序列号',
      workshop_id BIGINT UNSIGNED COMMENT '车间ID',
      location VARCHAR(100) COMMENT '安装位置',
      purchase_date DATE COMMENT '购入日期',
      manufacturer VARCHAR(100) COMMENT '制造商',
      supplier_id BIGINT UNSIGNED COMMENT '供应商ID',
      warranty_expire DATE COMMENT '质保到期日',
      rated_capacity DECIMAL(18,4) COMMENT '额定产能',
      current_status TINYINT DEFAULT 1 COMMENT '当前状态: 1-运行, 2-待机, 3-维修, 4-停机',
      oee DECIMAL(5,2) DEFAULT 0 COMMENT 'OEE综合效率(%)',
      availability DECIMAL(5,2) DEFAULT 0 COMMENT '可用率(%)',
      performance DECIMAL(5,2) DEFAULT 0 COMMENT '性能率(%)',
      quality_rate DECIMAL(5,2) DEFAULT 0 COMMENT '质量率(%)',
      total_run_hours DECIMAL(10,2) DEFAULT 0 COMMENT '累计运行时长',
      last_maintenance_date DATE COMMENT '上次维护日期',
      next_maintenance_date DATE COMMENT '下次维护日期',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-停用, 1-启用',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_equipment_code (equipment_code),
      KEY idx_type (equipment_type),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备台账表'`);
    results.push('eqp_equipment');

    await conn.execute(`CREATE TABLE IF NOT EXISTS eqp_maintenance_plan (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      plan_no VARCHAR(50) NOT NULL COMMENT '计划编号',
      equipment_id BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
      maintenance_type TINYINT COMMENT '维护类型: 1-日常保养, 2-定期保养, 3-大修',
      cycle_type TINYINT COMMENT '周期类型: 1-按天, 2-按周, 3-按月, 4-按运行时长',
      cycle_value INT COMMENT '周期值',
      plan_date DATE COMMENT '计划日期',
      responsible_id BIGINT UNSIGNED COMMENT '负责人ID',
      content TEXT COMMENT '维护内容',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待执行, 2-执行中, 3-已完成, 4-已逾期',
      complete_date DATE COMMENT '完成日期',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_plan_no (plan_no),
      KEY idx_equipment (equipment_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备维护计划表'`);
    results.push('eqp_maintenance_plan');

    await conn.execute(`CREATE TABLE IF NOT EXISTS eqp_maintenance_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      record_no VARCHAR(50) NOT NULL COMMENT '记录编号',
      plan_id BIGINT UNSIGNED COMMENT '维护计划ID',
      equipment_id BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
      maintenance_type TINYINT COMMENT '维护类型: 1-日常保养, 2-定期保养, 3-大修, 4-故障维修',
      fault_desc TEXT COMMENT '故障描述',
      maintenance_content TEXT COMMENT '维护内容',
      start_time DATETIME COMMENT '开始时间',
      end_time DATETIME COMMENT '结束时间',
      downtime_hours DECIMAL(10,2) DEFAULT 0 COMMENT '停机时长',
      cost DECIMAL(18,4) DEFAULT 0 COMMENT '维护费用',
      responsible_id BIGINT UNSIGNED COMMENT '负责人ID',
      result TINYINT COMMENT '结果: 1-正常, 2-需跟踪',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_record_no (record_no),
      KEY idx_equipment (equipment_id),
      KEY idx_plan (plan_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备维护记录表'`);
    results.push('eqp_maintenance_record');

    // ========================================
    // 5. 印前管理表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS prd_die_template (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      template_code VARCHAR(50) NOT NULL COMMENT '刀模板编号',
      template_name VARCHAR(100) NOT NULL COMMENT '刀模板名称',
      template_type TINYINT COMMENT '类型: 1-刀模, 2-丝网版',
      specification VARCHAR(255) COMMENT '规格尺寸',
      material VARCHAR(50) COMMENT '材质',
      max_usage INT COMMENT '最大使用次数',
      current_usage INT DEFAULT 0 COMMENT '当前使用次数',
      remaining_usage INT COMMENT '剩余使用次数',
      warning_usage INT COMMENT '预警使用次数',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-在用, 2-待更换, 3-已报废',
      storage_location VARCHAR(100) COMMENT '存放位置',
      purchase_date DATE COMMENT '购入日期',
      supplier_id BIGINT UNSIGNED COMMENT '供应商ID',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_template_code (template_code),
      KEY idx_type (template_type),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='刀模板/网版管理表'`);
    results.push('prd_die_template');

    // ========================================
    // 6. 生产报工表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS prd_work_report (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      report_no VARCHAR(50) NOT NULL COMMENT '报工单号',
      work_order_id BIGINT UNSIGNED NOT NULL COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单编号',
      process_name VARCHAR(50) COMMENT '工序名称',
      process_seq INT COMMENT '工序序号',
      equipment_id BIGINT UNSIGNED COMMENT '设备ID',
      operator_id BIGINT UNSIGNED COMMENT '操作员ID',
      operator_name VARCHAR(50) COMMENT '操作员姓名',
      plan_qty DECIMAL(18,4) COMMENT '计划数量',
      completed_qty DECIMAL(18,4) DEFAULT 0 COMMENT '完成数量',
      qualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '合格数量',
      defective_qty DECIMAL(18,4) DEFAULT 0 COMMENT '不良数量',
      scrap_qty DECIMAL(18,4) DEFAULT 0 COMMENT '报废数量',
      start_time DATETIME COMMENT '开始时间',
      end_time DATETIME COMMENT '结束时间',
      work_hours DECIMAL(10,2) DEFAULT 0 COMMENT '工时',
      is_first_piece TINYINT DEFAULT 0 COMMENT '是否首件: 0-否, 1-是',
      first_piece_status TINYINT COMMENT '首件签样: 1-待签样, 2-已签样, 3-不合格',
      first_piece_inspector VARCHAR(50) COMMENT '首件签样人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_report_no (report_no),
      KEY idx_work_order (work_order_id),
      KEY idx_operator (operator_id),
      KEY idx_create_time (create_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产报工表'`);
    results.push('prd_work_report');

    // ========================================
    // 7. 工艺路线表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS prd_process_route (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      route_code VARCHAR(50) NOT NULL COMMENT '工艺路线编码',
      route_name VARCHAR(100) NOT NULL COMMENT '工艺路线名称',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      version VARCHAR(10) DEFAULT '1.0' COMMENT '版本号',
      is_default TINYINT DEFAULT 1 COMMENT '是否默认',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_route_code (route_code),
      KEY idx_product (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工艺路线表'`);
    results.push('prd_process_route');

    await conn.execute(`CREATE TABLE IF NOT EXISTS prd_process_route_step (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      route_id BIGINT UNSIGNED NOT NULL COMMENT '工艺路线ID',
      step_seq INT NOT NULL COMMENT '工序序号',
      step_name VARCHAR(50) NOT NULL COMMENT '工序名称',
      step_type TINYINT COMMENT '工序类型: 1-印刷, 2-覆膜, 3-模切, 4-全检, 5-包装, 6-其他',
      equipment_type TINYINT COMMENT '所需设备类型',
      standard_time DECIMAL(10,2) COMMENT '标准工时(分钟)',
      setup_time DECIMAL(10,2) COMMENT '准备时间(分钟)',
      is_key_process TINYINT DEFAULT 0 COMMENT '是否关键工序',
      is_first_piece_required TINYINT DEFAULT 0 COMMENT '是否需要首件签样',
      quality_check TINYINT DEFAULT 0 COMMENT '是否质检: 0-否, 1-是',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_route (route_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工艺路线工序表'`);
    results.push('prd_process_route_step');

    // ========================================
    // 8. 生产工单表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS prod_work_order (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      work_order_no VARCHAR(50) NOT NULL COMMENT '工单号',
      order_id BIGINT UNSIGNED COMMENT '关联销售订单ID',
      order_no VARCHAR(50) COMMENT '关联销售订单号',
      bom_id BIGINT UNSIGNED COMMENT '关联BOM ID',
      customer_name VARCHAR(200) COMMENT '客户名称',
      product_name VARCHAR(200) COMMENT '产品名称',
      quantity DECIMAL(15,2) DEFAULT 0 COMMENT '生产数量',
      unit VARCHAR(20) COMMENT '单位',
      status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/confirmed/producing/completed/cancelled',
      priority VARCHAR(20) DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
      plan_start_date DATE COMMENT '计划开始日期',
      plan_end_date DATE COMMENT '计划完成日期',
      actual_start_date DATE COMMENT '实际开始日期',
      actual_end_date DATE COMMENT '实际完成日期',
      remark TEXT COMMENT '备注',
      create_by BIGINT UNSIGNED COMMENT '创建人ID',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      update_by BIGINT UNSIGNED COMMENT '更新人ID',
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      deleted TINYINT DEFAULT 0 COMMENT '删除标记',
      PRIMARY KEY (id),
      UNIQUE KEY uk_work_order_no (work_order_no),
      KEY idx_order_no (order_no),
      KEY idx_status (status),
      KEY idx_create_time (create_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产工单主表'`);
    results.push('prod_work_order');

    await conn.execute(`CREATE TABLE IF NOT EXISTS prod_work_order_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      work_order_id BIGINT UNSIGNED NOT NULL COMMENT '工单ID',
      line_no INT DEFAULT 0 COMMENT '行号',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_name VARCHAR(200) COMMENT '物料名称',
      quantity DECIMAL(15,2) DEFAULT 0 COMMENT '数量',
      unit VARCHAR(20) COMMENT '单位',
      unit_price DECIMAL(15,2) DEFAULT 0 COMMENT '单价',
      total_price DECIMAL(15,2) DEFAULT 0 COMMENT '总价',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      PRIMARY KEY (id),
      KEY idx_work_order_id (work_order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产工单明细表'`);
    results.push('prod_work_order_item');

    await conn.execute(`CREATE TABLE IF NOT EXISTS prod_work_order_material_req (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      work_order_id BIGINT UNSIGNED NOT NULL COMMENT '工单ID',
      bom_line_id BIGINT UNSIGNED COMMENT 'BOM行ID',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_name VARCHAR(200) COMMENT '物料名称',
      required_qty DECIMAL(14,3) DEFAULT 0 COMMENT '需求数量',
      unit VARCHAR(20) COMMENT '单位',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_work_order (work_order_id),
      KEY idx_material (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单物料需求表'`);
    results.push('prod_work_order_material_req');

    // ========================================
    // 9. 库存表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_inventory (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_name VARCHAR(100) COMMENT '物料名称',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
      warehouse_name VARCHAR(100) COMMENT '仓库名称',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '库存数量',
      available_qty DECIMAL(18,4) DEFAULT 0 COMMENT '可用数量',
      locked_qty DECIMAL(18,4) DEFAULT 0 COMMENT '锁定数量',
      unit VARCHAR(20) COMMENT '单位',
      unit_cost DECIMAL(18,4) DEFAULT 0 COMMENT '单位成本',
      total_cost DECIMAL(18,4) DEFAULT 0 COMMENT '总成本',
      safety_stock DECIMAL(18,4) DEFAULT 0 COMMENT '安全库存',
      version INT UNSIGNED DEFAULT 1 COMMENT '乐观锁版本号',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_material_warehouse (material_id, warehouse_id),
      KEY idx_material (material_id),
      KEY idx_warehouse (warehouse_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存表'`);
    results.push('inv_inventory');

    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_inventory_batch (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      batch_no VARCHAR(50) NOT NULL COMMENT '批次号',
      material_id INT UNSIGNED NOT NULL COMMENT '物料ID',
      material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
      warehouse_id INT UNSIGNED NOT NULL COMMENT '仓库ID',
      warehouse_name VARCHAR(100) DEFAULT NULL COMMENT '仓库名称',
      quantity DECIMAL(12,3) DEFAULT 0 COMMENT '总数量',
      available_qty DECIMAL(12,3) DEFAULT 0 COMMENT '可用数量',
      locked_qty DECIMAL(12,3) DEFAULT 0 COMMENT '锁定数量',
      unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
      unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
      produce_date DATE DEFAULT NULL COMMENT '生产日期',
      expire_date DATE DEFAULT NULL COMMENT '有效期至',
      inbound_date DATE DEFAULT NULL COMMENT '入库日期',
      status ENUM('normal', 'frozen', 'expired') DEFAULT 'normal' COMMENT '状态',
      version INT UNSIGNED DEFAULT 1 COMMENT '乐观锁版本号',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT(1) DEFAULT 0,
      UNIQUE KEY uk_batch_no (batch_no),
      INDEX idx_material (material_id),
      INDEX idx_warehouse (warehouse_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存批次表'`);
    results.push('inv_inventory_batch');

    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_inventory_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      warehouse_id INT UNSIGNED COMMENT '仓库ID',
      material_id INT UNSIGNED COMMENT '物料ID',
      change_type VARCHAR(20) COMMENT '变动类型',
      change_qty DECIMAL(12,3) DEFAULT 0 COMMENT '变动数量',
      order_no VARCHAR(50) COMMENT '关联单号',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_warehouse (warehouse_id),
      KEY idx_material (material_id),
      KEY idx_create_time (create_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存变动日志表'`);
    results.push('inv_inventory_log');

    // ========================================
    // 10. 出库单表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_outbound_order (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_no VARCHAR(50) NOT NULL COMMENT '出库单号',
      order_date DATE COMMENT '出库日期',
      outbound_type VARCHAR(20) DEFAULT 'sale' COMMENT '出库类型: sale/transfer/production/other',
      warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
      warehouse_code VARCHAR(50) COMMENT '仓库编码',
      warehouse_name VARCHAR(100) COMMENT '仓库名称',
      total_qty DECIMAL(18,4) DEFAULT 0 COMMENT '总数量',
      total_amount DECIMAL(18,4) DEFAULT 0 COMMENT '总金额',
      currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
      status VARCHAR(20) DEFAULT 'draft' COMMENT '状态: draft/pending/approved/completed/cancelled',
      remark TEXT COMMENT '备注',
      operator_name VARCHAR(50) COMMENT '操作人',
      audit_status VARCHAR(20) DEFAULT 'pending' COMMENT '审核状态',
      auditor_name VARCHAR(50) COMMENT '审核人',
      audit_time DATETIME COMMENT '审核时间',
      create_by BIGINT UNSIGNED,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_order_no (order_no),
      KEY idx_warehouse (warehouse_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单表'`);
    results.push('inv_outbound_order');

    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_outbound_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id BIGINT UNSIGNED NOT NULL COMMENT '出库单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_name VARCHAR(100) COMMENT '物料名称',
      material_spec VARCHAR(255) COMMENT '规格型号',
      quantity DECIMAL(18,4) NOT NULL COMMENT '出库数量',
      unit VARCHAR(20) COMMENT '单位',
      unit_price DECIMAL(18,4) COMMENT '单价',
      amount DECIMAL(18,4) COMMENT '金额',
      batch_no VARCHAR(50) COMMENT '批次号',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_order (order_id),
      KEY idx_material (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单明细表'`);
    results.push('inv_outbound_item');

    // ========================================
    // 11. 库存事务表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_inventory_transaction (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      trans_no VARCHAR(50) NOT NULL COMMENT '事务单号',
      trans_type ENUM('in', 'out', 'transfer', 'adjust', 'return') NOT NULL COMMENT '事务类型',
      source_type VARCHAR(20) COMMENT '来源类型',
      source_id BIGINT UNSIGNED COMMENT '来源单据ID',
      source_line_id BIGINT UNSIGNED COMMENT '来源单据行ID',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      batch_no VARCHAR(50) COMMENT '批次号',
      warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
      location_id BIGINT UNSIGNED COMMENT '库位ID',
      quantity DECIMAL(14,3) DEFAULT 0 COMMENT '数量',
      unit_cost DECIMAL(14,4) DEFAULT 0 COMMENT '单位成本',
      total_cost DECIMAL(14,2) DEFAULT 0 COMMENT '总成本',
      unit_price DECIMAL(14,4) DEFAULT 0 COMMENT '单价',
      total_amount DECIMAL(14,2) DEFAULT 0 COMMENT '总金额',
      reference_no VARCHAR(100) COMMENT '参考单号',
      remark TEXT COMMENT '备注',
      create_by BIGINT UNSIGNED,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_trans_no (trans_no),
      KEY idx_trans_type (trans_type),
      KEY idx_source (source_type, source_id),
      KEY idx_material (material_id),
      KEY idx_batch (batch_no),
      KEY idx_warehouse (warehouse_id),
      KEY idx_create_time (create_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存事务表'`);
    results.push('inv_inventory_transaction');

    // ========================================
    // 12. 质检表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS qc_inspection (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      inspection_no VARCHAR(50) NOT NULL COMMENT '质检单号',
      inspection_type TINYINT COMMENT '质检类型: 1-来料检验, 2-过程检验, 3-成品检验, 4-出货检验',
      source_type VARCHAR(50) COMMENT '来源类型',
      source_no VARCHAR(50) COMMENT '来源单号',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      batch_no VARCHAR(50) COMMENT '批次号',
      inspection_qty DECIMAL(18,4) DEFAULT 0 COMMENT '检验数量',
      qualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '合格数量',
      unqualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '不合格数量',
      inspection_result TINYINT COMMENT '检验结果: 1-合格, 2-不合格, 3-让步接收',
      inspector VARCHAR(50) COMMENT '检验员',
      inspection_date DATE COMMENT '检验日期',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_inspection_no (inspection_no),
      KEY idx_source (source_no),
      KEY idx_material (material_id),
      KEY idx_type (inspection_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='质检记录表'`);
    results.push('qc_inspection');

    await conn.execute(`CREATE TABLE IF NOT EXISTS qc_unqualified (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      unqualified_no VARCHAR(50) NOT NULL COMMENT '不合格品单号',
      inspection_id BIGINT UNSIGNED COMMENT '关联质检ID',
      source_type VARCHAR(50) COMMENT '来源类型',
      source_no VARCHAR(50) COMMENT '来源单号',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_name VARCHAR(100) COMMENT '物料名称',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '不合格数量',
      defect_type VARCHAR(50) COMMENT '缺陷类型',
      defect_desc TEXT COMMENT '缺陷描述',
      handle_type TINYINT COMMENT '处理方式: 1-返工, 2-报废, 3-特采',
      handle_result TINYINT COMMENT '处理结果: 1-已处理, 2-处理中',
      handler VARCHAR(50) COMMENT '处理人',
      handle_date DATE COMMENT '处理日期',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_unqualified_no (unqualified_no),
      KEY idx_inspection (inspection_id),
      KEY idx_material (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='不合格品处理表'`);
    results.push('qc_unqualified');

    // ========================================
    // 13. 财务应收/应付表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS fin_receivable (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      receivable_no VARCHAR(50) NOT NULL COMMENT '应收单号',
      source_type TINYINT DEFAULT 1 COMMENT '来源类型: 1-销售订单',
      source_no VARCHAR(50) COMMENT '来源单号',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      amount DECIMAL(18,4) DEFAULT 0 COMMENT '应收金额',
      received_amount DECIMAL(18,4) DEFAULT 0 COMMENT '已收金额',
      balance DECIMAL(18,4) DEFAULT 0 COMMENT '未收余额',
      due_date DATE COMMENT '到期日期',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-未收款, 2-部分收款, 3-已收款',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_receivable_no (receivable_no),
      KEY idx_customer (customer_id),
      KEY idx_source (source_no),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应收账款表'`);
    results.push('fin_receivable');

    await conn.execute(`CREATE TABLE IF NOT EXISTS fin_payable (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      payable_no VARCHAR(50) NOT NULL COMMENT '应付单号',
      source_type TINYINT DEFAULT 1 COMMENT '来源类型: 1-采购订单',
      source_no VARCHAR(50) COMMENT '来源单号',
      supplier_id BIGINT UNSIGNED COMMENT '供应商ID',
      amount DECIMAL(18,4) DEFAULT 0 COMMENT '应付金额',
      paid_amount DECIMAL(18,4) DEFAULT 0 COMMENT '已付金额',
      balance DECIMAL(18,4) DEFAULT 0 COMMENT '未付余额',
      due_date DATE COMMENT '到期日期',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-未付款, 2-部分付款, 3-已付款',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_payable_no (payable_no),
      KEY idx_supplier (supplier_id),
      KEY idx_source (source_no),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应付账款表'`);
    results.push('fin_payable');

    await conn.execute(`CREATE TABLE IF NOT EXISTS fin_receipt_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      receipt_no VARCHAR(50) NOT NULL COMMENT '收款单号',
      receivable_id BIGINT UNSIGNED COMMENT '应收ID',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      amount DECIMAL(18,4) DEFAULT 0 COMMENT '收款金额',
      payment_method VARCHAR(20) COMMENT '付款方式',
      receipt_date DATE COMMENT '收款日期',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_receivable (receivable_id),
      KEY idx_customer (customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收款记录表'`);
    results.push('fin_receipt_record');

    await conn.execute(`CREATE TABLE IF NOT EXISTS fin_payment_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      payment_no VARCHAR(50) NOT NULL COMMENT '付款单号',
      payable_id BIGINT UNSIGNED COMMENT '应付ID',
      supplier_id BIGINT UNSIGNED COMMENT '供应商ID',
      amount DECIMAL(18,4) DEFAULT 0 COMMENT '付款金额',
      payment_method VARCHAR(20) COMMENT '付款方式',
      payment_date DATE COMMENT '付款日期',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_payable (payable_id),
      KEY idx_supplier (supplier_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='付款记录表'`);
    results.push('fin_payment_record');

    await conn.execute(`CREATE TABLE IF NOT EXISTS prd_bom (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      bom_name VARCHAR(200) NOT NULL COMMENT 'BOM名称',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      version VARCHAR(20) DEFAULT '1.0' COMMENT '版本号',
      total_cost DECIMAL(18,4) DEFAULT 0 COMMENT '总成本',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_product (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM表'`);
    results.push('prd_bom');

    await conn.execute(`CREATE TABLE IF NOT EXISTS prd_bom_detail (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      bom_id BIGINT UNSIGNED NOT NULL COMMENT 'BOM ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_name VARCHAR(200) COMMENT '物料名称',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '数量',
      unit VARCHAR(20) COMMENT '单位',
      loss_rate DECIMAL(5,2) DEFAULT 0 COMMENT '损耗率(%)',
      unit_cost DECIMAL(18,4) DEFAULT 0 COMMENT '单位成本',
      total_cost DECIMAL(18,4) DEFAULT 0 COMMENT '总成本',
      item_type TINYINT DEFAULT 1 COMMENT '物料类型: 1-原材料, 2-半成品, 3-辅料',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_bom (bom_id),
      KEY idx_material (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='BOM明细表'`);
    results.push('prd_bom_detail');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sal_sample_order (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_no VARCHAR(50) NOT NULL COMMENT '打样订单号',
      notify_date DATE COMMENT '通知日期',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      product_name VARCHAR(200) COMMENT '产品名称',
      material_no VARCHAR(50) COMMENT '物料编号',
      version VARCHAR(20) DEFAULT 'A' COMMENT '版本',
      size_spec VARCHAR(200) COMMENT '尺寸规格',
      material_spec VARCHAR(200) COMMENT '材料规格',
      specification VARCHAR(200) COMMENT '规格型号',
      quantity INT DEFAULT 0 COMMENT '数量',
      order_date DATE COMMENT '订单日期',
      customer_require_date DATE COMMENT '客户需求日期',
      delivery_date DATE COMMENT '交付日期',
      actual_delivery_date DATE COMMENT '实际交付日期',
      delivery_status VARCHAR(20) DEFAULT 'pending' COMMENT '交付状态',
      status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/producing/completed/cancelled',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_order_no (order_no),
      KEY idx_customer (customer_id),
      KEY idx_status (status),
      KEY idx_notify_date (notify_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打样订单表'`);
    results.push('sal_sample_order');

    // ========================================
    // 库位表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_location (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      location_code VARCHAR(50) NOT NULL COMMENT '库位编码',
      location_name VARCHAR(100) NOT NULL COMMENT '库位名称',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
      zone VARCHAR(50) COMMENT '区域',
      row_no VARCHAR(20) COMMENT '排',
      column_no VARCHAR(20) COMMENT '列',
      layer_no VARCHAR(20) COMMENT '层',
      location_type TINYINT DEFAULT 1 COMMENT '库位类型: 1-原料, 2-成品, 3-半成品, 4-余料, 5-网版/刀模专用',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_location_code (location_code),
      KEY idx_warehouse (warehouse_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库位表'`);
    results.push('inv_location');

    // ========================================
    // 客户联系人表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS crm_customer_contact (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      contact_name VARCHAR(50) NOT NULL COMMENT '联系人姓名',
      position VARCHAR(50) COMMENT '职位',
      phone VARCHAR(20) COMMENT '电话',
      email VARCHAR(100) COMMENT '邮箱',
      is_primary TINYINT DEFAULT 0 COMMENT '是否主联系人: 0-否, 1-是',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_customer (customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户联系人表'`);
    results.push('crm_customer_contact');

    // ========================================
    // 物料标签表（二维码追溯核心）
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_material_label (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      label_no VARCHAR(50) NOT NULL COMMENT '标签编号',
      qr_code VARCHAR(255) COMMENT '二维码内容',
      purchase_order_no VARCHAR(50) COMMENT '采购单号',
      supplier_name VARCHAR(200) COMMENT '供应商名称',
      receive_date DATE COMMENT '进料日期',
      material_code VARCHAR(50) NOT NULL COMMENT '物料代号',
      material_name VARCHAR(200) COMMENT '品名',
      specification VARCHAR(200) COMMENT '进料规格',
      unit VARCHAR(20) COMMENT '单位',
      batch_no VARCHAR(50) COMMENT '批号',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '数量',
      package_qty DECIMAL(18,4) DEFAULT 0 COMMENT '包装量',
      width DECIMAL(18,2) COMMENT '宽幅',
      length_per_roll DECIMAL(18,2) COMMENT '每卷米数',
      remark VARCHAR(500) COMMENT '备注',
      color_code VARCHAR(50) COMMENT '颜色代号',
      mix_remark VARCHAR(500) COMMENT '混料备注',
      warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
      location_id BIGINT UNSIGNED COMMENT '库位ID',
      is_main_material TINYINT DEFAULT 0 COMMENT '是否母材: 0-否, 1-是',
      is_used TINYINT DEFAULT 0 COMMENT '是否已使用: 0-否, 1-是',
      is_cut TINYINT DEFAULT 0 COMMENT '是否已分切: 0-否, 1-是',
      parent_label_id BIGINT UNSIGNED COMMENT '父标签ID（分切来源）',
      label_type TINYINT DEFAULT 1 COMMENT '标签类型: 1-原材料, 2-分切子批, 3-余料',
      remaining_width DECIMAL(18,2) COMMENT '剩余宽幅（余料）',
      remaining_length DECIMAL(18,2) COMMENT '剩余长度（余料）',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用, 2-冻结, 3-已过期',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_label_no (label_no),
      KEY idx_material_code (material_code),
      KEY idx_batch_no (batch_no),
      KEY idx_warehouse (warehouse_id),
      KEY idx_parent_label (parent_label_id),
      KEY idx_label_type (label_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料标签表'`);
    results.push('inv_material_label');

    // ========================================
    // 分切记录表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_cutting_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      record_no VARCHAR(50) NOT NULL COMMENT '分切单号',
      source_label_id BIGINT UNSIGNED NOT NULL COMMENT '源标签ID',
      source_label_no VARCHAR(50) NOT NULL COMMENT '源标签编号',
      cut_width_str VARCHAR(200) COMMENT '分切宽幅（如：10+20+30）',
      original_width DECIMAL(18,2) COMMENT '原宽幅',
      cut_total_width DECIMAL(18,2) COMMENT '分切总宽幅',
      remain_width DECIMAL(18,2) COMMENT '剩余宽幅',
      operator_id BIGINT UNSIGNED COMMENT '操作员ID',
      operator_name VARCHAR(50) COMMENT '操作员名称',
      cut_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '分切时间',
      remark VARCHAR(500) COMMENT '备注',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-作废, 1-正常',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_record_no (record_no),
      KEY idx_source_label (source_label_id),
      KEY idx_cut_time (cut_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分切记录表'`);
    results.push('inv_cutting_record');

    // ========================================
    // 分切明细表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_cutting_detail (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      record_id BIGINT UNSIGNED NOT NULL COMMENT '分切记录ID',
      new_label_id BIGINT UNSIGNED NOT NULL COMMENT '新标签ID',
      new_label_no VARCHAR(50) NOT NULL COMMENT '新标签编号',
      cut_width DECIMAL(18,2) COMMENT '分切宽幅',
      sequence INT DEFAULT 0 COMMENT '分切序号',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_record_id (record_id),
      KEY idx_new_label (new_label_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分切明细表'`);
    results.push('inv_cutting_detail');

    // ========================================
    // 生产流程卡表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS prd_process_card (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      card_no VARCHAR(50) NOT NULL COMMENT '流程卡卡号',
      qr_code VARCHAR(255) COMMENT '二维码内容',
      work_order_id BIGINT UNSIGNED COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单号',
      product_code VARCHAR(50) COMMENT '成品料号',
      product_name VARCHAR(200) COMMENT '成品品名',
      material_spec VARCHAR(200) COMMENT '材料规格',
      work_order_date DATE COMMENT '工单日期',
      plan_qty DECIMAL(18,4) DEFAULT 0 COMMENT '计划生产数量',
      main_label_id BIGINT UNSIGNED COMMENT '主材标签ID',
      main_label_no VARCHAR(50) COMMENT '主材标签编号',
      burdening_status TINYINT DEFAULT 0 COMMENT '配料状态: 0-未配料, 1-已配料',
      lock_status TINYINT DEFAULT 0 COMMENT '锁住状态: 0-未锁, 1-已锁',
      create_user_id BIGINT UNSIGNED COMMENT '创建人ID',
      create_user_name VARCHAR(50) COMMENT '创建人名称',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_card_no (card_no),
      KEY idx_work_order (work_order_id),
      KEY idx_main_label (main_label_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产流程卡表'`);
    results.push('prd_process_card');

    // ========================================
    // 流程卡物料关联表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS prd_process_card_material (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      card_id BIGINT UNSIGNED NOT NULL COMMENT '流程卡ID',
      card_no VARCHAR(50) COMMENT '流程卡卡号',
      label_id BIGINT UNSIGNED NOT NULL COMMENT '物料标签ID',
      label_no VARCHAR(50) NOT NULL COMMENT '物料标签编号',
      material_type TINYINT DEFAULT 1 COMMENT '物料类型: 1-主材, 2-辅料',
      material_code VARCHAR(50) COMMENT '物料代号',
      material_name VARCHAR(200) COMMENT '物料名称',
      specification VARCHAR(200) COMMENT '规格',
      batch_no VARCHAR(50) COMMENT '批号',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '用量',
      unit VARCHAR(20) COMMENT '单位',
      remark VARCHAR(500) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_card_id (card_id),
      KEY idx_label_id (label_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程卡物料关联表'`);
    results.push('prd_process_card_material');

    // ========================================
    // 追溯记录表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_trace_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      trace_no VARCHAR(50) NOT NULL COMMENT '追溯单号',
      card_id BIGINT UNSIGNED COMMENT '流程卡ID',
      card_no VARCHAR(50) COMMENT '流程卡卡号',
      work_order_no VARCHAR(50) COMMENT '工单号',
      product_code VARCHAR(50) COMMENT '成品料号',
      main_label_id BIGINT UNSIGNED COMMENT '主材标签ID',
      trace_type TINYINT DEFAULT 1 COMMENT '追溯类型: 1-正向追溯, 2-反向追溯',
      operator_id BIGINT UNSIGNED COMMENT '操作员ID',
      operator_name VARCHAR(50) COMMENT '操作员名称',
      trace_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '追溯时间',
      remark VARCHAR(500) COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_trace_no (trace_no),
      KEY idx_card_id (card_id),
      KEY idx_main_label (main_label_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='追溯记录表'`);
    results.push('inv_trace_record');

    // ========================================
    // 追溯明细表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_trace_detail (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      trace_id BIGINT UNSIGNED NOT NULL COMMENT '追溯记录ID',
      label_id BIGINT UNSIGNED NOT NULL COMMENT '物料标签ID',
      label_no VARCHAR(50) NOT NULL COMMENT '物料标签编号',
      material_code VARCHAR(50) COMMENT '物料代号',
      material_name VARCHAR(200) COMMENT '物料名称',
      specification VARCHAR(200) COMMENT '规格',
      batch_no VARCHAR(50) COMMENT '批号',
      supplier_name VARCHAR(200) COMMENT '供应商名称',
      receive_date DATE COMMENT '进料日期',
      material_type TINYINT DEFAULT 2 COMMENT '物料类型: 1-主材, 2-辅料',
      remark VARCHAR(500) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_trace_id (trace_id),
      KEY idx_label_id (label_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='追溯明细表'`);
    results.push('inv_trace_detail');

    // ========================================
    // 扫码操作日志表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS inv_scan_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      scan_type VARCHAR(50) NOT NULL COMMENT '扫码类型: cutting-分切, process-流程卡, trace-追溯',
      qr_content VARCHAR(500) COMMENT '二维码内容',
      label_no VARCHAR(50) COMMENT '标签编号',
      operation VARCHAR(50) COMMENT '操作类型',
      result TINYINT DEFAULT 1 COMMENT '结果: 0-失败, 1-成功',
      message VARCHAR(500) COMMENT '结果消息',
      operator_id BIGINT UNSIGNED COMMENT '操作员ID',
      operator_name VARCHAR(50) COMMENT '操作员名称',
      scan_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '扫码时间',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_scan_type (scan_type),
      KEY idx_label_no (label_no),
      KEY idx_scan_time (scan_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='扫码操作日志表'`);
    results.push('inv_scan_log');

    // ========================================
    // 油墨开罐记录表
    // ========================================
    await conn.execute(`CREATE TABLE IF NOT EXISTS ink_opening_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      record_no VARCHAR(50) NOT NULL COMMENT '记录单号',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(200) COMMENT '物料名称',
      batch_no VARCHAR(50) COMMENT '批次号',
      label_id BIGINT UNSIGNED COMMENT '标签ID',
      ink_type VARCHAR(20) COMMENT '油墨类型: solvent-溶剂型, uv-UV型, water-水性',
      open_time DATETIME NOT NULL COMMENT '开罐时间',
      expire_hours INT NOT NULL COMMENT '有效时长(小时)',
      expire_time DATETIME COMMENT '过期时间',
      remaining_qty DECIMAL(18,4) COMMENT '剩余数量',
      unit VARCHAR(20) COMMENT '单位',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-使用中, 2-已过期, 3-已报废',
      operator_id BIGINT UNSIGNED COMMENT '操作员ID',
      operator_name VARCHAR(50) COMMENT '操作员名称',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_record_no (record_no),
      KEY idx_material (material_id),
      KEY idx_batch (batch_no),
      KEY idx_status (status),
      KEY idx_expire_time (expire_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨开罐记录表'`);
    results.push('ink_opening_record');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sys_dict_type (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      dict_name VARCHAR(100) NOT NULL COMMENT '字典名称',
      dict_type VARCHAR(100) NOT NULL COMMENT '字典类型',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-停用, 1-启用',
      remark VARCHAR(500) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_dict_type (dict_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典类型表'`);
    results.push('sys_dict_type');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sys_dict_data (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      dict_type VARCHAR(100) NOT NULL COMMENT '字典类型',
      dict_label VARCHAR(200) NOT NULL COMMENT '字典标签',
      dict_value VARCHAR(200) NOT NULL COMMENT '字典值',
      dict_sort INT DEFAULT 0 COMMENT '排序',
      css_class VARCHAR(100) COMMENT '样式属性',
      list_class VARCHAR(100) COMMENT '表格回显样式',
      is_default TINYINT DEFAULT 0 COMMENT '是否默认: 0-否, 1-是',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-停用, 1-启用',
      remark VARCHAR(500) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_dict_type (dict_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典数据表'`);
    results.push('sys_dict_data');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sys_config (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      config_name VARCHAR(100) NOT NULL COMMENT '参数名称',
      config_key VARCHAR(100) NOT NULL COMMENT '参数键名',
      config_value VARCHAR(500) NOT NULL COMMENT '参数键值',
      config_type TINYINT DEFAULT 1 COMMENT '系统内置: 1-是, 0-否',
      remark VARCHAR(500) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_config_key (config_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统参数配置表'`);
    results.push('sys_config');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sys_oper_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(50) COMMENT '操作模块',
      business_type TINYINT DEFAULT 0 COMMENT '业务类型: 0-其它, 1-新增, 2-修改, 3-删除',
      method VARCHAR(200) COMMENT '方法名称',
      request_method VARCHAR(10) COMMENT '请求方式',
      operator_type TINYINT DEFAULT 0 COMMENT '操作类别: 0-其它, 1-后台用户',
      oper_name VARCHAR(50) COMMENT '操作人员',
      oper_url VARCHAR(500) COMMENT '请求URL',
      oper_ip VARCHAR(128) COMMENT '主机地址',
      oper_param TEXT COMMENT '请求参数',
      json_result TEXT COMMENT '返回参数',
      status TINYINT DEFAULT 1 COMMENT '操作状态: 1-正常, 0-异常',
      error_msg TEXT COMMENT '错误消息',
      oper_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
      cost_time BIGINT DEFAULT 0 COMMENT '消耗时间(毫秒)',
      PRIMARY KEY (id),
      KEY idx_business_type (business_type),
      KEY idx_oper_time (oper_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志记录表'`);
    results.push('sys_oper_log');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sys_login_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_name VARCHAR(50) COMMENT '用户账号',
      ipaddr VARCHAR(128) COMMENT '登录IP地址',
      login_location VARCHAR(255) COMMENT '登录地点',
      browser VARCHAR(50) COMMENT '浏览器类型',
      os VARCHAR(50) COMMENT '操作系统',
      status TINYINT DEFAULT 1 COMMENT '登录状态: 1-成功, 0-失败',
      msg VARCHAR(255) COMMENT '提示消息',
      login_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
      PRIMARY KEY (id),
      KEY idx_login_time (login_time),
      KEY idx_user_name (user_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统访问记录表'`);
    results.push('sys_login_log');

    await conn.execute(`CREATE TABLE IF NOT EXISTS sys_notice (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      notice_title VARCHAR(200) NOT NULL COMMENT '公告标题',
      notice_type TINYINT NOT NULL COMMENT '公告类型: 1-通知, 2-公告',
      notice_content TEXT COMMENT '公告内容',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-关闭, 1-正常',
      create_by BIGINT UNSIGNED COMMENT '创建者',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      remark VARCHAR(500) COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知公告表'`);
    results.push('sys_notice');

    await conn.execute(`CREATE TABLE IF NOT EXISTS ink_mixed_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      record_no VARCHAR(50) NOT NULL COMMENT '记录单号',
      base_ink_id BIGINT UNSIGNED NOT NULL COMMENT '原油墨ID',
      base_ink_code VARCHAR(50) COMMENT '原油墨编号',
      base_ink_name VARCHAR(200) COMMENT '原油墨名称',
      mix_ratio VARCHAR(100) COMMENT '调色比例',
      color_name VARCHAR(100) COMMENT '色彩名称',
      color_code VARCHAR(50) COMMENT '色彩编码',
      company_id BIGINT UNSIGNED COMMENT '使用公司/客户ID',
      company_name VARCHAR(200) COMMENT '使用公司/客户名称',
      mix_time DATETIME NOT NULL COMMENT '调色时间',
      operator_id BIGINT UNSIGNED COMMENT '操作员ID',
      operator_name VARCHAR(50) COMMENT '操作员名称',
      quantity DECIMAL(18,4) COMMENT '入库数量',
      unit VARCHAR(20) COMMENT '单位',
      warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
      location_id BIGINT UNSIGNED COMMENT '库位ID',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-已入库, 2-已使用, 3-已过期',
      expire_time DATETIME COMMENT '过期时间',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_record_no (record_no),
      KEY idx_base_ink (base_ink_id),
      KEY idx_company (company_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='调色后油墨入库记录表'`);
    results.push('ink_mixed_record');

    await conn.execute(`CREATE TABLE IF NOT EXISTS base_ink (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ink_code VARCHAR(50) NOT NULL COMMENT '油墨编号',
      ink_name VARCHAR(200) NOT NULL COMMENT '油墨名称',
      color_code VARCHAR(50) COMMENT '色号',
      color_name VARCHAR(100) COMMENT '颜色名称',
      ink_type VARCHAR(20) COMMENT '油墨类型: solvent-溶剂型, uv-UV型, water-水性',
      supplier_id BIGINT UNSIGNED COMMENT '供应商ID',
      supplier_name VARCHAR(200) COMMENT '供应商名称',
      specification VARCHAR(200) COMMENT '规格',
      unit VARCHAR(20) COMMENT '单位',
      unit_price DECIMAL(18,4) COMMENT '单价',
      stock_qty DECIMAL(18,4) DEFAULT 0 COMMENT '库存数量',
      min_stock DECIMAL(18,4) DEFAULT 0 COMMENT '最低库存',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-停用, 1-启用',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_ink_code (ink_code),
      KEY idx_ink_type (ink_type),
      KEY idx_supplier (supplier_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='原油墨基础信息表'`);
    results.push('base_ink');

    return { tablesCreated: true, tables: results };
  });

  return successResponse(result, '数据库表创建成功');
}, '创建数据库表失败');

export const GET = withErrorHandler(async (request: NextRequest) => {
  const tables = [
    'sal_delivery_order', 'sal_delivery_order_item',
    'sal_return_order', 'sal_return_order_item',
    'sal_reconciliation', 'sal_reconciliation_detail',
    'eqp_equipment', 'eqp_maintenance_plan', 'eqp_maintenance_record',
    'prd_die_template', 'prd_work_report',
    'prd_process_route', 'prd_process_route_step',
    'prod_work_order', 'prod_work_order_item',
    'inv_inventory', 'inv_outbound_order', 'inv_outbound_item',
    'inv_inventory_transaction',
    'qc_inspection', 'qc_unqualified',
    'fin_receivable', 'fin_payable', 'fin_receipt_record', 'fin_payment_record',
    'prd_bom', 'prd_bom_detail', 'sal_sample_order',
  ];

  const existing: string[] = [];
  const missing: string[] = [];

  for (const table of tables) {
    try {
      await query(`SELECT 1 FROM ${table} LIMIT 1`);
      existing.push(table);
    } catch {
      missing.push(table);
    }
  }

  return successResponse({ existing, missing, total: tables.length });
}, '检查表状态失败');
