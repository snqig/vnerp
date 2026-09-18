/**
 * src/app/api/migrations/six-critical-fixes/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** CREATE … */
export const CREATE_TABLE_STD_BOM_HEADER = `
        CREATE TABLE std_bom_header (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
          bom_no VARCHAR(50) NOT NULL COMMENT 'BOM编号',
          product_id BIGINT UNSIGNED NOT NULL COMMENT '产品ID',
          product_code VARCHAR(50) NOT NULL COMMENT '产品编码',
          product_name VARCHAR(200) NOT NULL COMMENT '产品名称',
          product_spec VARCHAR(500) DEFAULT NULL COMMENT '产品规格',
          version VARCHAR(20) DEFAULT 'V1.0' COMMENT '版本号',
          is_default TINYINT DEFAULT 1 COMMENT '是否默认版本',
          status TINYINT DEFAULT 0 COMMENT '状态: 0-草稿,1-已发布,2-已停用',
          unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
          base_qty DECIMAL(18,4) DEFAULT 1 COMMENT '基础数量',
          total_material_count INT UNSIGNED DEFAULT 0 COMMENT '物料总数',
          total_cost DECIMAL(18,4) DEFAULT 0 COMMENT '总成本',
          effective_date DATE DEFAULT NULL COMMENT '生效日期',
          obsolete_date DATE DEFAULT NULL COMMENT '失效日期',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_by BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_by BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          approve_by BIGINT UNSIGNED DEFAULT NULL COMMENT '审核人ID',
          approve_time DATETIME DEFAULT NULL COMMENT '审核时间',
          publish_time DATETIME DEFAULT NULL COMMENT '发布时间',
          legacy_source VARCHAR(30) DEFAULT NULL COMMENT '旧表来源',
          legacy_id BIGINT UNSIGNED DEFAULT NULL COMMENT '旧表原始ID',
          deleted TINYINT DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          UNIQUE KEY uk_bom_no (bom_no),
          UNIQUE KEY uk_product_version (product_id, version),
          INDEX idx_product_code (product_code),
          INDEX idx_status (status),
          INDEX idx_is_default (is_default),
          INDEX idx_effective (effective_date, obsolete_date),
          INDEX idx_legacy (legacy_source, legacy_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准BOM主表'
      `;

/** CREATE … */
export const CREATE_TABLE_STD_PURCHASE_ORDER = `
        CREATE TABLE std_purchase_order (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
          order_no VARCHAR(50) NOT NULL COMMENT '采购单号',
          source_request_id BIGINT UNSIGNED DEFAULT NULL COMMENT '来源请购单ID',
          source_request_no VARCHAR(50) DEFAULT NULL COMMENT '来源请购单号',
          supplier_id BIGINT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
          supplier_name VARCHAR(100) NOT NULL COMMENT '供应商名称',
          supplier_code VARCHAR(50) DEFAULT NULL COMMENT '供应商编码',
          order_date DATE NOT NULL COMMENT '订单日期',
          delivery_date DATE DEFAULT NULL COMMENT '预计交货日期',
          currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
          exchange_rate DECIMAL(10,4) DEFAULT 1.0000 COMMENT '汇率',
          total_amount DECIMAL(18,4) DEFAULT 0 COMMENT '订单总金额',
          total_quantity DECIMAL(18,4) DEFAULT 0 COMMENT '订单总数量',
          tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%',
          tax_amount DECIMAL(18,4) DEFAULT 0 COMMENT '税额',
          grand_total DECIMAL(18,4) DEFAULT 0 COMMENT '含税总金额',
          status TINYINT DEFAULT 0 COMMENT '状态: 0-草稿,1-已提交,2-审校中,3-审校通过,4-已批准,5-部分收货,6-已完成,7-已取消,8-已关闭',
          over_receipt_tolerance DECIMAL(5,2) DEFAULT 5.00 COMMENT '超收容差率%',
          payment_terms VARCHAR(100) DEFAULT NULL COMMENT '付款条款',
          delivery_address TEXT DEFAULT NULL COMMENT '送货地址',
          contact_person VARCHAR(50) DEFAULT NULL COMMENT '联系人',
          contact_phone VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_by BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_by BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          approve_by BIGINT UNSIGNED DEFAULT NULL COMMENT '批准人ID',
          approve_time DATETIME DEFAULT NULL COMMENT '批准时间',
          close_by BIGINT UNSIGNED DEFAULT NULL COMMENT '关闭人ID',
          close_time DATETIME DEFAULT NULL COMMENT '关闭时间',
          close_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
          legacy_source VARCHAR(30) DEFAULT NULL COMMENT '旧表来源: pur_order / pur_purchase_order',
          legacy_id BIGINT UNSIGNED DEFAULT NULL COMMENT '旧表原始ID',
          deleted TINYINT DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          UNIQUE KEY uk_order_no (order_no),
          INDEX idx_supplier (supplier_id),
          INDEX idx_status (status),
          INDEX idx_order_date (order_date),
          INDEX idx_source_request (source_request_id),
          INDEX idx_legacy (legacy_source, legacy_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准采购订单主表'
      `;

/** CREATE … */
export const CREATE_TABLE_STD_BOM_LINE = `
        CREATE TABLE std_bom_line (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
          bom_id BIGINT UNSIGNED NOT NULL COMMENT 'BOM主表ID',
          line_no INT UNSIGNED NOT NULL COMMENT '行号',
          parent_line_id BIGINT UNSIGNED DEFAULT NULL COMMENT '父行ID',
          level INT UNSIGNED DEFAULT 1 COMMENT '层级',
          material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
          material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
          material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
          material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
          unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
          consumption_qty DECIMAL(18,6) NOT NULL DEFAULT 0 COMMENT '消耗数量',
          loss_rate DECIMAL(5,2) DEFAULT 0 COMMENT '损耗率',
          actual_qty DECIMAL(18,6) DEFAULT 0 COMMENT '实际用量',
          unit_cost DECIMAL(18,4) DEFAULT 0 COMMENT '单位成本',
          total_cost DECIMAL(18,4) DEFAULT 0 COMMENT '总成本',
          material_type TINYINT DEFAULT 1 COMMENT '物料类型: 1-原材料,2-半成品,3-辅料,4-包材,5-其他',
          is_key_material TINYINT DEFAULT 0 COMMENT '是否关键物料',
          position_no VARCHAR(50) DEFAULT NULL COMMENT '位号',
          process_seq INT UNSIGNED DEFAULT NULL COMMENT '工序序号',
          process_name VARCHAR(100) DEFAULT NULL COMMENT '工序名称',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          PRIMARY KEY (id),
          UNIQUE KEY uk_bom_line (bom_id, line_no),
          INDEX idx_parent_line (parent_line_id),
          INDEX idx_material (material_id),
          INDEX idx_material_code (material_code),
          INDEX idx_material_type (material_type),
          CONSTRAINT fk_std_bom_line_header FOREIGN KEY (bom_id) REFERENCES std_bom_header(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准BOM行表'
      `;

/** CREATE … */
export const CREATE_TABLE_STD_PURCHASE_ORDER_LINE = `
        CREATE TABLE std_purchase_order_line (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
          order_id BIGINT UNSIGNED NOT NULL COMMENT '采购单ID',
          line_no INT UNSIGNED NOT NULL COMMENT '行号',
          material_id BIGINT UNSIGNED DEFAULT NULL COMMENT '物料ID',
          material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
          material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
          material_spec VARCHAR(500) DEFAULT NULL COMMENT '物料规格',
          unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
          order_qty DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '订购数量',
          received_qty DECIMAL(18,4) DEFAULT 0 COMMENT '累计入库数量',
          returned_qty DECIMAL(18,4) DEFAULT 0 COMMENT '累计退货数量',
          unit_price DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '单价',
          amount DECIMAL(18,4) DEFAULT 0 COMMENT '金额',
          tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%',
          tax_amount DECIMAL(18,4) DEFAULT 0 COMMENT '税额',
          line_total DECIMAL(18,4) DEFAULT 0 COMMENT '行合计',
          require_date DATE DEFAULT NULL COMMENT '需求日期',
          closed_flag TINYINT DEFAULT 0 COMMENT '行关闭标志',
          closed_reason VARCHAR(200) DEFAULT NULL COMMENT '关闭原因',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          PRIMARY KEY (id),
          UNIQUE KEY uk_order_line (order_id, line_no),
          INDEX idx_material (material_id),
          INDEX idx_material_code (material_code),
          INDEX idx_require_date (require_date),
          CONSTRAINT fk_std_po_line_order FOREIGN KEY (order_id) REFERENCES std_purchase_order(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准采购订单行表'
      `;

/** CREATE … */
export const CREATE_TABLE_STD_MATERIAL = `
        CREATE TABLE std_material (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
          material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
          material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
          specification VARCHAR(500) DEFAULT NULL COMMENT '规格型号',
          category_id BIGINT UNSIGNED DEFAULT NULL COMMENT '分类ID',
          material_type TINYINT DEFAULT 1 COMMENT '物料类型: 1-原材料,2-半成品,3-成品,4-辅料,5-包材,6-其他',
          unit VARCHAR(20) DEFAULT NULL COMMENT '计量单位',
          barcode VARCHAR(50) DEFAULT NULL COMMENT '条形码',
          brand VARCHAR(50) DEFAULT NULL COMMENT '品牌',
          safety_stock DECIMAL(18,4) DEFAULT 0 COMMENT '安全库存',
          max_stock DECIMAL(18,4) DEFAULT NULL COMMENT '最大库存',
          min_stock DECIMAL(18,4) DEFAULT NULL COMMENT '最小库存',
          purchase_price DECIMAL(18,4) DEFAULT NULL COMMENT '采购单价',
          sale_price DECIMAL(18,4) DEFAULT NULL COMMENT '销售单价',
          cost_price DECIMAL(18,4) DEFAULT NULL COMMENT '成本单价',
          unit_cost DECIMAL(18,4) DEFAULT NULL COMMENT '参考成本',
          warehouse_id BIGINT UNSIGNED DEFAULT NULL COMMENT '默认仓库ID',
          default_supplier_id BIGINT UNSIGNED DEFAULT NULL COMMENT '默认供应商ID',
          default_supplier_name VARCHAR(100) DEFAULT NULL COMMENT '默认供应商',
          shelf_life INT DEFAULT NULL COMMENT '保质期(天)',
          warning_days INT DEFAULT NULL COMMENT '预警天数',
          is_batch_managed TINYINT DEFAULT 0 COMMENT '是否批次管理: 0-否,1-是',
          is_serial_managed TINYINT DEFAULT 0 COMMENT '是否序列号管理: 0-否,1-是',
          is_active TINYINT DEFAULT 1 COMMENT '是否启用',
          status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用,1-启用',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_by BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_by BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          legacy_source VARCHAR(30) DEFAULT NULL COMMENT '旧表来源: inv_material/bom_material/mdm_material',
          legacy_id BIGINT UNSIGNED DEFAULT NULL COMMENT '旧表原始ID',
          deleted TINYINT DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          UNIQUE KEY uk_material_code (material_code),
          INDEX idx_material_name (material_name),
          INDEX idx_material_type (material_type),
          INDEX idx_category (category_id),
          INDEX idx_is_active (is_active),
          INDEX idx_legacy (legacy_source, legacy_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准物料主档'
      `;

/** CREATE … */
export const CREATE_TABLE_HR_ATTENDANCE = `
        CREATE TABLE hr_attendance (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
          attendance_date DATE NOT NULL COMMENT '考勤日期',
          employee_id VARCHAR(50) DEFAULT NULL COMMENT '员工ID(旧VARCHAR)',
          employee_id_int INT UNSIGNED DEFAULT NULL COMMENT '员工ID(标准INT)',
          employee_name VARCHAR(50) DEFAULT NULL COMMENT '员工姓名',
          department_name VARCHAR(100) DEFAULT NULL COMMENT '部门名称',
          check_in_time VARCHAR(10) DEFAULT NULL COMMENT '上班时间',
          check_out_time VARCHAR(10) DEFAULT NULL COMMENT '下班时间',
          status VARCHAR(20) DEFAULT 'normal' COMMENT '状态: normal/late/absent/leave',
          working_hours DECIMAL(5,2) DEFAULT 0 COMMENT '工作时长',
          overtime_hours DECIMAL(5,2) DEFAULT 0 COMMENT '加班时长',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          deleted TINYINT DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          INDEX idx_attendance_date (attendance_date),
          INDEX idx_employee_id_int (employee_id_int),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考勤记录表'
      `;

/** CREATE … */
export const CREATE_TABLE_INV_OUTBOUND_BATCH_ALLOCATION = `
        CREATE TABLE inv_outbound_batch_allocation (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
          source_type VARCHAR(30) NOT NULL COMMENT '来源类型: outbound_order/material_issue/outsource_issue',
          source_id BIGINT UNSIGNED NOT NULL COMMENT '来源单据ID',
          source_no VARCHAR(50) NOT NULL COMMENT '来源单据号',
          warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
          material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
          batch_id BIGINT UNSIGNED NOT NULL COMMENT '批次ID',
          batch_no VARCHAR(50) NOT NULL COMMENT '批次号',
          allocated_qty DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '分配数量',
          unit_cost DECIMAL(18,4) DEFAULT 0 COMMENT '单位成本',
          total_cost DECIMAL(18,4) DEFAULT 0 COMMENT '总成本',
          fifo_mode VARCHAR(20) DEFAULT 'fifo_auto' COMMENT 'FIFO模式: fifo_auto/specified_batch/manual_override',
          operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
          operator_name VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          PRIMARY KEY (id),
          INDEX idx_source (source_type, source_id),
          INDEX idx_source_no (source_no),
          INDEX idx_warehouse (warehouse_id),
          INDEX idx_material (material_id),
          INDEX idx_batch (batch_id),
          INDEX idx_fifo_mode (fifo_mode),
          INDEX idx_create_time (create_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库批次分配明细表'
      `;
