/**
 * src/app/api/migrations/readmd-fixes/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** CREATE … */
export const CREATE_TABLE_HR_ATTENDANCE = `
        CREATE TABLE IF NOT EXISTS hr_attendance (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          attendance_date DATE NOT NULL COMMENT '考勤日期',
          employee_id VARCHAR(50) DEFAULT NULL COMMENT '员工编号(旧)',
          emp_id INT UNSIGNED DEFAULT NULL COMMENT '关联员工ID',
          employee_name VARCHAR(50) DEFAULT NULL COMMENT '员工姓名',
          department_name VARCHAR(100) DEFAULT NULL COMMENT '部门名称',
          check_in_time DATETIME DEFAULT NULL COMMENT '上班打卡时间',
          check_out_time DATETIME DEFAULT NULL COMMENT '下班打卡时间',
          status TINYINT DEFAULT 0 COMMENT '0正常 1迟到 2早退 3缺勤 4请假 5加班',
          working_hours DECIMAL(5,2) DEFAULT 0 COMMENT '工作时长',
          overtime_hours DECIMAL(5,2) DEFAULT 0 COMMENT '加班时长',
          remark TEXT DEFAULT NULL COMMENT '备注',
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted TINYINT DEFAULT 0,
          PRIMARY KEY (id),
          INDEX idx_attendance_date (attendance_date),
          INDEX idx_hr_attendance_emp_id (emp_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考勤记录表'
      `;

/** CREATE … */
export const CREATE_TABLE_INV_OUTBOUND_BATCH_ALLOCATION = `
        CREATE TABLE inv_outbound_batch_allocation (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分配ID',
          source_type VARCHAR(30) NOT NULL COMMENT '来源类型: outbound_order/material_issue/outsource_issue',
          source_id BIGINT UNSIGNED NOT NULL COMMENT '来源单ID',
          source_no VARCHAR(50) DEFAULT NULL COMMENT '来源单号',
          warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
          material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
          material_code VARCHAR(50) DEFAULT NULL COMMENT '物料编码',
          material_name VARCHAR(100) DEFAULT NULL COMMENT '物料名称',
          batch_id BIGINT UNSIGNED NOT NULL COMMENT '批次ID',
          batch_no VARCHAR(50) NOT NULL COMMENT '批次号',
          allocate_qty DECIMAL(18,4) NOT NULL COMMENT '分配数量',
          unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '单位成本',
          total_cost DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '总成本',
          available_qty_before DECIMAL(18,4) DEFAULT NULL COMMENT '分配前可用量',
          fifo_mode VARCHAR(20) NOT NULL DEFAULT 'FIFO' COMMENT 'FIFO/specified_batch/manual_override',
          remark VARCHAR(200) DEFAULT NULL COMMENT '备注',
          operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
          operator_name VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
          create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          PRIMARY KEY (id),
          INDEX idx_outbound_batch_allocation_source (source_type, source_id),
          INDEX idx_outbound_batch_allocation_batch (batch_id),
          INDEX idx_outbound_batch_allocation_material (material_id),
          INDEX idx_outbound_batch_allocation_warehouse (warehouse_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库批次分配明细表'
      `;

/** CREATE … */
export const CREATE_TABLE_PUR_ORDER_LINE_STD = `
        CREATE TABLE pur_order_line_std (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '采购订单行ID',
          po_id BIGINT UNSIGNED NOT NULL COMMENT '采购订单头ID',
          line_no INT NOT NULL COMMENT '行号',
          material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
          material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
          material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
          material_spec VARCHAR(200) DEFAULT NULL COMMENT '规格型号',
          order_qty DECIMAL(18,4) NOT NULL COMMENT '订购数量',
          price DECIMAL(18,4) NOT NULL COMMENT '单价',
          amount DECIMAL(18,2) NOT NULL COMMENT '金额',
          received_qty DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '已收数量',
          remark VARCHAR(200) DEFAULT NULL COMMENT '备注',
          create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          deleted TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          INDEX idx_po_id (po_id),
          INDEX idx_material_id (material_id),
          CONSTRAINT fk_po_line_std_po FOREIGN KEY (po_id) REFERENCES pur_order_std(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准采购订单行'
      `;

/** CREATE … */
export const CREATE_TABLE_PUR_ORDER_STD = `
        CREATE TABLE pur_order_std (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '采购订单ID',
          po_code VARCHAR(50) NOT NULL COMMENT '采购单号',
          request_id BIGINT UNSIGNED NULL COMMENT '请购单ID',
          supplier_id BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
          supplier_name VARCHAR(100) DEFAULT NULL COMMENT '供应商名称',
          order_date DATE NOT NULL COMMENT '订单日期',
          delivery_date DATE DEFAULT NULL COMMENT '预计交货日期',
          currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
          exchange_rate DECIMAL(10,4) DEFAULT 1.0000 COMMENT '汇率',
          total_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00 COMMENT '订单总金额',
          tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率%',
          tax_amount DECIMAL(18,2) DEFAULT 0.00 COMMENT '税额',
          grand_total DECIMAL(18,2) DEFAULT 0.00 COMMENT '含税总金额',
          status TINYINT NOT NULL DEFAULT 0 COMMENT '0草稿 1已提交 2审批中 3通过 4驳回 5部分入库 6全部入库 9关闭',
          payment_terms VARCHAR(100) DEFAULT NULL COMMENT '付款条款',
          delivery_address TEXT DEFAULT NULL COMMENT '送货地址',
          contact_person VARCHAR(50) DEFAULT NULL COMMENT '联系人',
          contact_phone VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
          remark TEXT DEFAULT NULL COMMENT '备注',
          legacy_source VARCHAR(30) DEFAULT NULL COMMENT '旧表来源: pur_order/pur_purchase_order',
          legacy_id BIGINT UNSIGNED DEFAULT NULL COMMENT '旧表原始ID',
          create_by BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_by BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
          update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          approve_by BIGINT UNSIGNED DEFAULT NULL COMMENT '批准人ID',
          approve_time DATETIME DEFAULT NULL COMMENT '批准时间',
          deleted TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          UNIQUE KEY uk_po_code (po_code),
          INDEX idx_request_id (request_id),
          INDEX idx_supplier_id (supplier_id),
          INDEX idx_status (status),
          INDEX idx_order_date (order_date),
          INDEX idx_legacy (legacy_source, legacy_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准采购订单'
      `;

/** CREATE … */
export const CREATE_TABLE_PRD_BOM_STD = `
        CREATE TABLE prd_bom_std (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'BOM ID',
          bom_code VARCHAR(50) NOT NULL COMMENT 'BOM编码',
          product_id BIGINT UNSIGNED NOT NULL COMMENT '成品ID',
          product_name VARCHAR(100) DEFAULT NULL COMMENT '成品名称',
          version VARCHAR(20) NOT NULL DEFAULT 'V1.0' COMMENT '版本',
          effective_date DATE NOT NULL COMMENT '生效日期',
          obsolete_date DATE NULL COMMENT '失效日期',
          status TINYINT NOT NULL DEFAULT 1 COMMENT '0草稿 1生效 2作废',
          remark TEXT DEFAULT NULL COMMENT '备注',
          legacy_source VARCHAR(30) DEFAULT NULL COMMENT '旧表来源',
          legacy_id BIGINT UNSIGNED DEFAULT NULL COMMENT '旧表原始ID',
          create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          create_by BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          update_by BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
          deleted TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          UNIQUE KEY uk_bom_code (bom_code),
          INDEX idx_product_id (product_id),
          INDEX idx_status (status),
          INDEX idx_effective_date (effective_date),
          INDEX idx_legacy (legacy_source, legacy_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准BOM头'
      `;

/** CREATE … */
export const CREATE_TABLE_INV_MATERIAL_STD = `
        CREATE TABLE inv_material_std (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '物料ID',
          material_code VARCHAR(50) NOT NULL COMMENT '物料编码',
          material_name VARCHAR(100) NOT NULL COMMENT '物料名称',
          material_spec VARCHAR(200) NULL COMMENT '规格型号',
          unit VARCHAR(20) NOT NULL COMMENT '计量单位',
          material_type TINYINT NOT NULL DEFAULT 1 COMMENT '1原材料 2半成品 3成品 4辅料 5包材',
          category_id BIGINT UNSIGNED DEFAULT NULL COMMENT '分类ID',
          is_batch TINYINT NOT NULL DEFAULT 1 COMMENT '是否批次管理',
          is_expire TINYINT NOT NULL DEFAULT 0 COMMENT '是否效期管理',
          safe_stock DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '安全库存',
          standard_cost DECIMAL(18,4) DEFAULT 0 COMMENT '标准成本',
          shelf_life_days INT DEFAULT NULL COMMENT '保质期天数',
          remark TEXT DEFAULT NULL COMMENT '备注',
          legacy_source VARCHAR(30) DEFAULT NULL COMMENT '旧表来源: inv_material/bom_material/mdm_material',
          legacy_id BIGINT UNSIGNED DEFAULT NULL COMMENT '旧表原始ID',
          create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          create_by BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          update_by BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
          deleted TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          UNIQUE KEY uk_material_code (material_code),
          INDEX idx_material_type (material_type),
          INDEX idx_category_id (category_id),
          INDEX idx_legacy (legacy_source, legacy_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准物料主档'
      `;

/** CREATE … */
export const CREATE_TABLE_SYS_DAILY_CHECK_LOG = `
        CREATE TABLE sys_daily_check_log (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '巡检ID',
          check_date DATE NOT NULL COMMENT '巡检日期',
          check_type VARCHAR(50) NOT NULL COMMENT '巡检类型',
          error_count INT NOT NULL DEFAULT 0 COMMENT '异常数量',
          error_detail TEXT NULL COMMENT '异常明细',
          status TINYINT DEFAULT 0 COMMENT '0待处理 1已处理',
          create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          PRIMARY KEY (id),
          INDEX idx_check_date (check_date),
          INDEX idx_check_type (check_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统每日巡检日志'
      `;

/** CREATE … */
export const CREATE_TABLE_PRD_BOM_LINE_STD = `
        CREATE TABLE prd_bom_line_std (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'BOM行ID',
          bom_id BIGINT UNSIGNED NOT NULL COMMENT 'BOM头ID',
          line_no INT NOT NULL DEFAULT 1 COMMENT '行号',
          material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
          material_code VARCHAR(50) DEFAULT NULL COMMENT '物料编码',
          material_name VARCHAR(100) DEFAULT NULL COMMENT '物料名称',
          consumption_qty DECIMAL(18,4) NOT NULL COMMENT '单耗',
          waste_rate DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '损耗率%',
          material_type TINYINT DEFAULT 1 COMMENT '1原材料 2半成品 3辅料 4包材 5其他',
          remark VARCHAR(200) DEFAULT NULL COMMENT '备注',
          create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          deleted TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          INDEX idx_bom_id (bom_id),
          INDEX idx_material_id (material_id),
          CONSTRAINT fk_bom_line_std_bom FOREIGN KEY (bom_id) REFERENCES prd_bom_std(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准BOM行'
      `;
