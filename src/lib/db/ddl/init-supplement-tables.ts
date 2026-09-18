/**
 * src/app/api/init/supplement-tables/route.ts 使用的 SQL 常量。
 *
 * 由 2026-09-18 的 P0 治理从 messages/*.json 的 i18n 合成键还原而来——
 * 这些值原先被 i18n codemod 当成「硬编码中文」抽成 k_xxxxxxxx 键，
 * 导致「改翻译文件 = 改实际执行的 DDL」。现回归为代码常量，禁止再写入 i18n。
 */

/** CREATE … */
export const CREATE_TABLE_HR_TRAINING = `CREATE TABLE IF NOT EXISTS hr_training (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      training_no VARCHAR(50) NOT NULL COMMENT '培训编号',
      training_name VARCHAR(100) NOT NULL COMMENT '培训名称',
      training_type TINYINT COMMENT '培训类型: 1-入职培训, 2-岗位培训, 3-安全培训, 4-技能培训, 5-ISO培训',
      training_date DATE COMMENT '培训日期',
      training_hours DECIMAL(5,1) COMMENT '培训学时',
      trainer VARCHAR(50) COMMENT '培训讲师',
      training_content TEXT COMMENT '培训内容',
      training_place VARCHAR(100) COMMENT '培训地点',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-计划中, 2-进行中, 3-已完成, 4-已取消',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_training_no (training_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='培训管理表'`;

/** CREATE … */
export const CREATE_TABLE_SYS_OPERATION_LOG = `CREATE TABLE IF NOT EXISTS sys_operation_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(100) COMMENT '操作标题',
      oper_name VARCHAR(50) COMMENT '操作人',
      oper_type VARCHAR(30) COMMENT '操作类型',
      oper_method VARCHAR(10) COMMENT '请求方式',
      oper_url VARCHAR(255) COMMENT '操作URL',
      oper_ip VARCHAR(128) COMMENT 'IP地址',
      oper_param TEXT COMMENT '请求参数',
      oper_result TEXT COMMENT '返回结果',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-成功, 0-失败',
      oper_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_oper_time (oper_time),
      KEY idx_oper_name (oper_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表'`;

/** CREATE … */
export const CREATE_TABLE_LABEL_TEMPLATE = `CREATE TABLE IF NOT EXISTS label_template (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL COMMENT '模板名称',
      scenario VARCHAR(30) NOT NULL COMMENT '使用场景: inbound-入库, split-分切, finished-成品',
      html_template TEXT NOT NULL COMMENT 'HTML模板内容',
      width_mm INT DEFAULT 60 COMMENT '标签宽度(mm)',
      height_mm INT DEFAULT 40 COMMENT '标签高度(mm)',
      qr_size_mm INT DEFAULT 20 COMMENT '二维码尺寸(mm)',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_scenario (scenario)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签模板表'`;

/** CREATE … */
export const CREATE_TABLE_QMS_SGS_CERT_ITEM = `CREATE TABLE IF NOT EXISTS qms_sgs_cert_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cert_id BIGINT UNSIGNED NOT NULL COMMENT 'SGS证书ID',
      test_item_name VARCHAR(200) COMMENT '检测项目名称',
      test_standard VARCHAR(200) COMMENT '检测标准',
      limit_value VARCHAR(100) COMMENT '限值',
      test_value VARCHAR(100) COMMENT '检测值',
      unit VARCHAR(30) COMMENT '单位',
      result VARCHAR(20) COMMENT '结果: PASS, FAIL, N/A',
      sort_order INT DEFAULT 0 COMMENT '排序',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_cert (cert_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SGS检测项目明细表'`;

/** CREATE … */
export const CREATE_TABLE_SRM_SUPPLIER_EVAL_ITEM = `CREATE TABLE IF NOT EXISTS srm_supplier_eval_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      eval_id BIGINT UNSIGNED NOT NULL COMMENT '评估ID',
      category VARCHAR(30) COMMENT '评估类别: quality-质量, delivery-交付, price-价格, service-服务',
      item_name VARCHAR(100) COMMENT '评估项目名称',
      weight DECIMAL(5,2) COMMENT '权重%',
      score DECIMAL(5,1) COMMENT '评分',
      actual_value VARCHAR(100) COMMENT '实际值',
      target_value VARCHAR(100) COMMENT '目标值',
      remark VARCHAR(255) COMMENT '备注',
      sort_order INT DEFAULT 0 COMMENT '排序',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_eval (eval_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商评估明细表'`;

/** CREATE … */
export const CREATE_TABLE_ENG_SOP = `CREATE TABLE IF NOT EXISTS eng_sop (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sop_no VARCHAR(50) NOT NULL COMMENT 'SOP编号',
      sop_name VARCHAR(100) NOT NULL COMMENT 'SOP名称',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      product_code VARCHAR(50) COMMENT '产品编码',
      product_name VARCHAR(100) COMMENT '产品名称',
      process_code VARCHAR(50) COMMENT '工序编码',
      process_name VARCHAR(100) COMMENT '工序名称',
      version VARCHAR(20) DEFAULT 'V1.0' COMMENT '版本号',
      sop_type VARCHAR(20) COMMENT 'SOP类型: printing-丝印, cutting-模切, inspection-检验, packaging-包装',
      content TEXT COMMENT 'SOP内容(JSON)',
      file_url VARCHAR(500) COMMENT 'SOP文件路径',
      workshop VARCHAR(50) COMMENT '适用车间',
      equipment_type VARCHAR(50) COMMENT '适用设备类型',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-停用, 1-启用',
      effective_date DATE COMMENT '生效日期',
      expire_date DATE COMMENT '失效日期',
      approver VARCHAR(50) COMMENT '审批人',
      approve_time DATETIME COMMENT '审批时间',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_sop_no (sop_no),
      KEY idx_product (product_id),
      KEY idx_process (process_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准作业指导书表'`;

/** CREATE … */
export const CREATE_TABLE_QC_INCOMING_INSPECTION_ITEM = `CREATE TABLE IF NOT EXISTS qc_incoming_inspection_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      inspection_id BIGINT UNSIGNED NOT NULL COMMENT '检验单ID',
      item_name VARCHAR(100) COMMENT '检验项目',
      standard VARCHAR(200) COMMENT '检验标准',
      actual_value VARCHAR(200) COMMENT '实际值',
      result TINYINT DEFAULT 0 COMMENT '检验结果: 0-待检, 1-合格, 2-不合格',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_inspection (inspection_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='来料检验明细'`;

/** CREATE … */
export const CREATE_TABLE_QRCODE_SCAN_LOG = `CREATE TABLE IF NOT EXISTS qrcode_scan_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      qr_code VARCHAR(100) NOT NULL COMMENT '二维码编码',
      qr_type VARCHAR(30) COMMENT '二维码类型',
      scan_type VARCHAR(30) NOT NULL COMMENT '扫描类型: inbound-入库, outbound-出库, issue-领料, report-报工, check-检验, inventory-盘点, ink_open-开罐, ink_use-使用, plate_use-领用, plate_clean-清洗, die_use-使用, die_sharpen-刃磨, trace-追溯',
      ref_id BIGINT UNSIGNED COMMENT '关联业务ID',
      ref_no VARCHAR(50) COMMENT '关联业务单号',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      scan_result VARCHAR(20) COMMENT '扫描结果: success-成功, fail-失败',
      scan_message VARCHAR(255) COMMENT '扫描消息',
      scan_data JSON COMMENT '扫描数据',
      device_info VARCHAR(100) COMMENT '设备信息',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_qr_code (qr_code),
      KEY idx_scan_type (scan_type),
      KEY idx_create_time (create_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='二维码扫描日志表'`;

/** CREATE … */
export const CREATE_TABLE_INV_SALES_OUTBOUND_ITEM = `CREATE TABLE IF NOT EXISTS inv_sales_outbound_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      outbound_id BIGINT UNSIGNED NOT NULL COMMENT '出库单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '出库数量',
      unit VARCHAR(20) COMMENT '单位',
      batch_no VARCHAR(50) COMMENT '批次号',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_outbound (outbound_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售出库单明细'`;

/** CREATE … */
export const CREATE_TABLE_OUTSOURCE_ISSUE_ITEM = `CREATE TABLE IF NOT EXISTS outsource_issue_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      issue_id BIGINT UNSIGNED NOT NULL COMMENT '发料单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '发料数量',
      unit VARCHAR(20) COMMENT '单位',
      batch_no VARCHAR(50) COMMENT '批次号',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_issue (issue_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='委外发料单明细'`;

/** CREATE … */
export const CREATE_TABLE_INV_MATERIAL_CATEGORY = `CREATE TABLE IF NOT EXISTS inv_material_category (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      category_code VARCHAR(50) NOT NULL COMMENT '分类编码',
      category_name VARCHAR(100) NOT NULL COMMENT '分类名称',
      parent_id BIGINT UNSIGNED DEFAULT 0 COMMENT '父分类ID',
      category_type TINYINT COMMENT '分类类型: 1-原材料, 2-半成品, 3-成品, 4-辅料, 5-包材',
      sort_order INT DEFAULT 0 COMMENT '排序',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_category_code (category_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料分类表'`;

/** CREATE … */
export const CREATE_TABLE_HR_TRAINING_PARTICIPANT = `CREATE TABLE IF NOT EXISTS hr_training_participant (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      training_id BIGINT UNSIGNED NOT NULL COMMENT '培训ID',
      employee_id BIGINT UNSIGNED NOT NULL COMMENT '员工ID',
      employee_name VARCHAR(50) COMMENT '员工姓名',
      score DECIMAL(5,1) COMMENT '考核成绩',
      is_qualified TINYINT COMMENT '是否合格: 0-否, 1-是',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_training (training_id),
      KEY idx_employee (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='培训参与人员表'`;

/** CREATE … */
export const CREATE_TABLE_PRD_PRODUCT_LABEL = `CREATE TABLE IF NOT EXISTS prd_product_label (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      label_no VARCHAR(50) NOT NULL COMMENT '标签编号',
      work_order_id BIGINT UNSIGNED COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单编号',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '数量',
      unit VARCHAR(20) COMMENT '单位',
      batch_no VARCHAR(50) COMMENT '批次号',
      qc_result TINYINT COMMENT '质检结果: 1-合格, 2-不合格',
      print_time DATETIME COMMENT '打印时间',
      print_count INT DEFAULT 0 COMMENT '打印次数',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-已生成, 2-已打印, 3-已使用',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_label_no (label_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成品标签表'`;

/** CREATE … */
export const CREATE_TABLE_INV_PRODUCTION_INBOUND_ITEM = `CREATE TABLE IF NOT EXISTS inv_production_inbound_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      inbound_id BIGINT UNSIGNED NOT NULL COMMENT '入库单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '入库数量',
      unit VARCHAR(20) COMMENT '单位',
      batch_no VARCHAR(50) COMMENT '批次号',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_inbound (inbound_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产入库单明细'`;

/** CREATE … */
export const CREATE_TABLE_PRD_DIE = `CREATE TABLE IF NOT EXISTS prd_die (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      die_code VARCHAR(50) NOT NULL COMMENT '刀具编码',
      die_name VARCHAR(100) NOT NULL COMMENT '刀具名称',
      die_type TINYINT COMMENT '刀具类型: 1-刀模, 2-冲模, 3-切刀',
      size_spec VARCHAR(50) COMMENT '尺寸规格',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      product_name VARCHAR(100) COMMENT '产品名称',
      max_use_count INT DEFAULT 0 COMMENT '最大使用次数',
      used_count INT DEFAULT 0 COMMENT '已使用次数',
      remaining_count INT DEFAULT 0 COMMENT '剩余次数',
      maintenance_days INT DEFAULT 180 COMMENT '维护周期(天)',
      last_maintenance_date DATE COMMENT '上次维护日期',
      next_maintenance_date DATE COMMENT '下次维护日期',
      warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
      location_id BIGINT UNSIGNED COMMENT '库位ID',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-在库, 2-领用中, 3-维护中, 4-已报废, 5-预警',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_die_code (die_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='刀具管理表'`;

/** CREATE … */
export const CREATE_TABLE_PRD_SCREEN_PLATE = `CREATE TABLE IF NOT EXISTS prd_screen_plate (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      plate_code VARCHAR(50) NOT NULL COMMENT '网版编码',
      plate_name VARCHAR(100) NOT NULL COMMENT '网版名称',
      plate_type TINYINT COMMENT '网版类型: 1-丝网版, 2-移印版',
      mesh_count VARCHAR(20) COMMENT '目数',
      size_spec VARCHAR(50) COMMENT '尺寸规格',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      product_name VARCHAR(100) COMMENT '产品名称',
      max_use_count INT DEFAULT 0 COMMENT '最大使用次数',
      used_count INT DEFAULT 0 COMMENT '已使用次数',
      remaining_count INT DEFAULT 0 COMMENT '剩余次数',
      maintenance_days INT DEFAULT 360 COMMENT '维护周期(天)',
      last_maintenance_date DATE COMMENT '上次维护日期',
      next_maintenance_date DATE COMMENT '下次维护日期',
      warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
      location_id BIGINT UNSIGNED COMMENT '库位ID',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-在库, 2-领用中, 3-维护中, 4-已报废, 5-预警',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_plate_code (plate_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网版管理表'`;

/** CREATE … */
export const CREATE_TABLE_QC_PROCESS_INSPECTION = `CREATE TABLE IF NOT EXISTS qc_process_inspection (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      inspection_no VARCHAR(50) NOT NULL COMMENT '检验单号',
      inspection_date DATE COMMENT '检验日期',
      work_order_id BIGINT UNSIGNED COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单编号',
      process_name VARCHAR(100) COMMENT '工序名称',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      product_code VARCHAR(50) COMMENT '产品编码',
      product_name VARCHAR(100) COMMENT '产品名称',
      inspection_qty DECIMAL(18,4) DEFAULT 0 COMMENT '检验数量',
      qualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '合格数量',
      unqualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '不合格数量',
      inspection_result TINYINT DEFAULT 0 COMMENT '检验结果: 0-待检, 1-合格, 2-不合格',
      inspector_name VARCHAR(50) COMMENT '检验员',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_inspection_no (inspection_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='过程检验单'`;

/** CREATE … */
export const CREATE_TABLE_EQP_CALIBRATION = `CREATE TABLE IF NOT EXISTS eqp_calibration (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      calibration_no VARCHAR(50) NOT NULL COMMENT '检定单号',
      equipment_id BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
      equipment_code VARCHAR(50) COMMENT '设备编码',
      equipment_name VARCHAR(100) COMMENT '设备名称',
      calibration_date DATE COMMENT '检定日期',
      next_calibration_date DATE COMMENT '下次检定日期',
      calibration_org VARCHAR(100) COMMENT '检定机构',
      calibration_result TINYINT COMMENT '检定结果: 1-合格, 2-不合格',
      certificate_no VARCHAR(50) COMMENT '证书编号',
      calibration_cost DECIMAL(18,4) DEFAULT 0 COMMENT '检定费用',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待检定, 2-已检定, 3-已过期',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_calibration_no (calibration_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备检定/校准单'`;

/** CREATE … */
export const CREATE_TABLE_CRM_FOLLOW_RECORD = `CREATE TABLE IF NOT EXISTS crm_follow_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      follow_type VARCHAR(20) COMMENT '跟进方式: visit-拜访, phone-电话, email-邮件, wechat-微信, other-其他',
      follow_content TEXT COMMENT '跟进内容',
      contact_name VARCHAR(50) COMMENT '联系人',
      salesman_name VARCHAR(50) COMMENT '业务员',
      next_follow_date DATE COMMENT '下次跟进日期',
      opportunity VARCHAR(100) COMMENT '商机描述',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待跟进, 2-已跟进, 3-已转化',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_customer (customer_id),
      KEY idx_follow_date (create_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户跟进记录表'`;

/** CREATE … */
export const CREATE_TABLE_OUTSOURCE_ORDER = `CREATE TABLE IF NOT EXISTS outsource_order (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_no VARCHAR(50) NOT NULL COMMENT '委外订单号',
      work_order_id BIGINT UNSIGNED COMMENT '关联工单ID',
      work_order_no VARCHAR(50) COMMENT '关联工单编号',
      supplier_id BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
      supplier_name VARCHAR(100) COMMENT '供应商名称',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      product_code VARCHAR(50) COMMENT '产品编码',
      product_name VARCHAR(100) COMMENT '产品名称',
      plan_qty DECIMAL(18,4) DEFAULT 0 COMMENT '委外数量',
      unit VARCHAR(20) COMMENT '单位',
      unit_price DECIMAL(18,4) DEFAULT 0 COMMENT '单价(分)',
      total_amount DECIMAL(18,4) DEFAULT 0 COMMENT '总金额(分)',
      delivery_date DATE COMMENT '交货日期',
      outsource_type TINYINT DEFAULT 1 COMMENT '委外类型: 1-工序委外, 2-成品委外',
      process_name VARCHAR(100) COMMENT '委外工序名称',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待发料, 2-已发料, 3-部分收货, 4-已完工, 5-已结算, 9-已取消',
      issued_qty DECIMAL(18,4) DEFAULT 0 COMMENT '已发料数量',
      received_qty DECIMAL(18,4) DEFAULT 0 COMMENT '已收货数量',
      qualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '合格数量',
      settled_amount DECIMAL(18,4) DEFAULT 0 COMMENT '已结算金额(分)',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_order_no (order_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='委外订单'`;

/** CREATE … */
export const CREATE_TABLE_PRINT_LOG = `CREATE TABLE IF NOT EXISTS print_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      qr_id BIGINT UNSIGNED NOT NULL COMMENT '二维码ID',
      template_id BIGINT UNSIGNED COMMENT '标签模板ID',
      print_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '打印时间',
      operator VARCHAR(50) COMMENT '操作人',
      paper_type VARCHAR(20) DEFAULT 'thermal' COMMENT '纸张类型',
      print_count INT DEFAULT 1 COMMENT '打印次数',
      PRIMARY KEY (id),
      KEY idx_qr_id (qr_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打印日志表'`;

/** CREATE … */
export const CREATE_TABLE_PLM_PRODUCT_LIFECYCLE = `CREATE TABLE IF NOT EXISTS plm_product_lifecycle (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      product_id BIGINT UNSIGNED NOT NULL COMMENT '产品ID',
      product_code VARCHAR(50) COMMENT '产品编码',
      product_name VARCHAR(100) COMMENT '产品名称',
      lifecycle_stage VARCHAR(20) NOT NULL COMMENT '生命周期阶段: concept-概念, design-设计, prototype-打样, pilot-试产, mass-量产, eol-退市',
      stage_status TINYINT DEFAULT 1 COMMENT '阶段状态: 1-进行中, 2-已完成, 3-暂停, 4-取消',
      version VARCHAR(20) DEFAULT 'V1.0' COMMENT '版本号',
      change_type VARCHAR(20) COMMENT '变更类型: new-新建, revision-修订, upgrade-升级, downgrade-降级',
      change_reason TEXT COMMENT '变更原因',
      change_desc TEXT COMMENT '变更描述',
      approver VARCHAR(50) COMMENT '审批人',
      approve_time DATETIME COMMENT '审批时间',
      effective_date DATE COMMENT '生效日期',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      KEY idx_product (product_id),
      KEY idx_stage (lifecycle_stage)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品生命周期管理表'`;

/** CREATE … */
export const CREATE_TABLE_INV_PRODUCTION_INBOUND = `CREATE TABLE IF NOT EXISTS inv_production_inbound (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      inbound_no VARCHAR(50) NOT NULL COMMENT '入库单号',
      work_order_id BIGINT UNSIGNED COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单编号',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
      inbound_date DATE COMMENT '入库日期',
      qc_status TINYINT DEFAULT 0 COMMENT '质检状态: 0-未检, 1-合格, 2-不合格',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待入库, 2-已入库, 3-已取消',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_inbound_no (inbound_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产入库单'`;

/** CREATE … */
export const CREATE_TABLE_PRD_SCHEDULE = `CREATE TABLE IF NOT EXISTS prd_schedule (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      schedule_no VARCHAR(50) NOT NULL COMMENT '排产单号',
      order_id BIGINT UNSIGNED COMMENT '销售订单ID',
      order_no VARCHAR(50) COMMENT '销售订单号',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      product_code VARCHAR(50) COMMENT '产品编码',
      product_name VARCHAR(100) COMMENT '产品名称',
      workshop VARCHAR(30) COMMENT '车间: die_cut-模切, trademark-商标',
      planned_qty DECIMAL(12,3) COMMENT '计划数量',
      completed_qty DECIMAL(12,3) DEFAULT 0 COMMENT '完成数量',
      planned_start DATETIME COMMENT '计划开始时间',
      planned_end DATETIME COMMENT '计划结束时间',
      actual_start DATETIME COMMENT '实际开始时间',
      actual_end DATETIME COMMENT '实际结束时间',
      priority TINYINT DEFAULT 2 COMMENT '优先级: 1-紧急, 2-正常, 3-低',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待排产, 2-已排产, 3-生产中, 4-已完成, 5-已取消',
      scheduler VARCHAR(50) COMMENT '排产人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_schedule_no (schedule_no),
      KEY idx_order (order_id),
      KEY idx_workshop (workshop),
      KEY idx_status (status),
      KEY idx_planned_start (planned_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产排产计划表'`;

/** CREATE … */
export const CREATE_TABLE_OUTSOURCE_RECEIVE = `CREATE TABLE IF NOT EXISTS outsource_receive (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      receive_no VARCHAR(50) NOT NULL COMMENT '委外收货单号',
      outsource_order_id BIGINT UNSIGNED NOT NULL COMMENT '委外订单ID',
      outsource_order_no VARCHAR(50) COMMENT '委外订单号',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '入库仓库ID',
      receive_date DATE COMMENT '收货日期',
      receive_qty DECIMAL(18,4) DEFAULT 0 COMMENT '收货数量',
      qualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '合格数量',
      defective_qty DECIMAL(18,4) DEFAULT 0 COMMENT '不良数量',
      qc_status TINYINT COMMENT '质检状态: 1-待检, 2-合格, 3-不合格',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待审核, 2-已审核, 3-已入库, 9-已取消',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_receive_no (receive_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='委外收货单'`;

/** CREATE … */
export const CREATE_TABLE_QMS_SGS_CERT = `CREATE TABLE IF NOT EXISTS qms_sgs_cert (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cert_no VARCHAR(50) NOT NULL COMMENT 'SGS证书编号',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      supplier_id BIGINT UNSIGNED COMMENT '供应商ID',
      supplier_name VARCHAR(100) COMMENT '供应商名称',
      cert_type VARCHAR(30) COMMENT '认证类型: RoHS, REACH, FDA, EN71-3, 其他',
      test_items TEXT COMMENT '检测项目',
      test_result VARCHAR(20) COMMENT '检测结果: PASS, FAIL, PENDING',
      test_report_no VARCHAR(100) COMMENT '测试报告编号',
      test_org VARCHAR(100) COMMENT '检测机构',
      issue_date DATE COMMENT '发证日期',
      expire_date DATE COMMENT '有效期至',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-失效, 1-有效, 2-待检测, 3-已过期',
      file_url VARCHAR(500) COMMENT '证书文件路径',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_cert_no (cert_no),
      KEY idx_material (material_id),
      KEY idx_supplier (supplier_id),
      KEY idx_expire (expire_date),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SGS认证管理表'`;

/** CREATE … */
export const CREATE_TABLE_PRD_MATERIAL_RETURN = `CREATE TABLE IF NOT EXISTS prd_material_return (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      return_no VARCHAR(50) NOT NULL COMMENT '退料单号',
      work_order_id BIGINT UNSIGNED COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单编号',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
      return_date DATE COMMENT '退料日期',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待审核, 2-已审核, 3-已完成, 4-已取消',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_return_no (return_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产退料单'`;

/** CREATE … */
export const CREATE_TABLE_CRM_CUSTOMER_ANALYSIS = `CREATE TABLE IF NOT EXISTS crm_customer_analysis (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      analysis_period VARCHAR(20) COMMENT '分析周期: month-月度, quarter-季度, year-年度',
      period_start DATE COMMENT '周期开始',
      period_end DATE COMMENT '周期结束',
      order_count INT DEFAULT 0 COMMENT '订单数量',
      order_amount DECIMAL(18,2) DEFAULT 0 COMMENT '订单金额',
      delivery_count INT DEFAULT 0 COMMENT '发货次数',
      return_count INT DEFAULT 0 COMMENT '退货次数',
      complaint_count INT DEFAULT 0 COMMENT '投诉次数',
      on_time_rate DECIMAL(5,2) COMMENT '准时交付率%',
      satisfaction_score DECIMAL(3,1) COMMENT '满意度评分',
      customer_level VARCHAR(10) COMMENT '客户等级: A-战略, B-重要, C-一般, D-潜在',
      growth_rate DECIMAL(5,2) COMMENT '增长率%',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_customer (customer_id),
      KEY idx_period (analysis_period, period_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户分析统计表'`;

/** CREATE … */
export const CREATE_TABLE_PLM_ECO = `CREATE TABLE IF NOT EXISTS plm_eco (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      eco_no VARCHAR(50) NOT NULL COMMENT '工程变更单号',
      eco_type VARCHAR(20) NOT NULL COMMENT '变更类型: bom-BOM变更, process-工艺变更, material-物料变更, design-设计变更',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      product_code VARCHAR(50) COMMENT '产品编码',
      product_name VARCHAR(100) COMMENT '产品名称',
      old_version VARCHAR(20) COMMENT '原版本',
      new_version VARCHAR(20) COMMENT '新版本',
      change_reason TEXT COMMENT '变更原因',
      change_content TEXT COMMENT '变更内容',
      impact_analysis TEXT COMMENT '影响分析',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-草稿, 2-审核中, 3-已批准, 4-已执行, 5-已关闭, 6-已拒绝',
      applicant VARCHAR(50) COMMENT '申请人',
      apply_time DATETIME COMMENT '申请时间',
      approver VARCHAR(50) COMMENT '审批人',
      approve_time DATETIME COMMENT '审批时间',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_eco_no (eco_no),
      KEY idx_product (product_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工程变更单表'`;

/** CREATE … */
export const CREATE_TABLE_QC_FINAL_INSPECTION = `CREATE TABLE IF NOT EXISTS qc_final_inspection (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      inspection_no VARCHAR(50) NOT NULL COMMENT '检验单号',
      inspection_date DATE COMMENT '检验日期',
      work_order_id BIGINT UNSIGNED COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单编号',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      product_code VARCHAR(50) COMMENT '产品编码',
      product_name VARCHAR(100) COMMENT '产品名称',
      batch_no VARCHAR(50) COMMENT '批次号',
      inspection_qty DECIMAL(18,4) DEFAULT 0 COMMENT '检验数量',
      qualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '合格数量',
      unqualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '不合格数量',
      inspection_result TINYINT DEFAULT 0 COMMENT '检验结果: 0-待检, 1-合格, 2-不合格',
      inspector_name VARCHAR(50) COMMENT '检验员',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_inspection_no (inspection_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='终检单'`;

/** CREATE … */
export const CREATE_TABLE_INV_STOCKTAKING = `CREATE TABLE IF NOT EXISTS inv_stocktaking (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      taking_no VARCHAR(50) NOT NULL COMMENT '盘点单号',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
      taking_date DATE COMMENT '盘点日期',
      taking_type TINYINT DEFAULT 1 COMMENT '盘点类型: 1-全面盘点, 2-抽样盘点, 3-循环盘点',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待盘点, 2-盘点中, 3-待审核, 4-已完成, 5-已取消',
      operator_id BIGINT UNSIGNED COMMENT '盘点人ID',
      operator_name VARCHAR(50) COMMENT '盘点人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_taking_no (taking_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存盘点单'`;

/** CREATE … */
export const CREATE_TABLE_PRD_INK = `CREATE TABLE IF NOT EXISTS prd_ink (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ink_code VARCHAR(50) NOT NULL COMMENT '油墨编码',
      ink_name VARCHAR(100) NOT NULL COMMENT '油墨名称',
      ink_type TINYINT COMMENT '油墨类型: 1-丝印油墨, 2-移印油墨, 3-UV油墨, 4-水性油墨',
      color_name VARCHAR(50) COMMENT '颜色名称',
      color_code VARCHAR(20) COMMENT '颜色编码',
      brand VARCHAR(50) COMMENT '品牌',
      supplier_id BIGINT UNSIGNED COMMENT '供应商ID',
      unit VARCHAR(20) DEFAULT 'kg' COMMENT '单位',
      specification VARCHAR(100) COMMENT '规格',
      stock_qty DECIMAL(18,4) DEFAULT 0 COMMENT '库存数量',
      safety_stock DECIMAL(18,4) DEFAULT 0 COMMENT '安全库存',
      shelf_life INT COMMENT '保质期(天)',
      status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_ink_code (ink_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='油墨管理表'`;

/** CREATE … */
export const CREATE_TABLE_INV_STOCKTAKING_ITEM = `CREATE TABLE IF NOT EXISTS inv_stocktaking_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      taking_id BIGINT UNSIGNED NOT NULL COMMENT '盘点单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      system_qty DECIMAL(18,4) DEFAULT 0 COMMENT '系统数量',
      actual_qty DECIMAL(18,4) DEFAULT 0 COMMENT '实盘数量',
      diff_qty DECIMAL(18,4) DEFAULT 0 COMMENT '差异数量',
      unit VARCHAR(20) COMMENT '单位',
      batch_no VARCHAR(50) COMMENT '批次号',
      location_id BIGINT UNSIGNED COMMENT '库位ID',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_taking (taking_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盘点单明细'`;

/** CREATE … */
export const CREATE_TABLE_INV_TRANSFER_ITEM = `CREATE TABLE IF NOT EXISTS inv_transfer_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      transfer_id BIGINT UNSIGNED NOT NULL COMMENT '调拨单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      quantity DECIMAL(18,4) NOT NULL COMMENT '调拨数量',
      unit VARCHAR(20) COMMENT '单位',
      batch_no VARCHAR(50) COMMENT '批次号',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_transfer (transfer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='调拨单明细'`;

/** CREATE … */
export const CREATE_TABLE_SRM_SUPPLIER_EVAL = `CREATE TABLE IF NOT EXISTS srm_supplier_eval (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      eval_no VARCHAR(50) NOT NULL COMMENT '评估编号',
      supplier_id BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
      supplier_name VARCHAR(100) COMMENT '供应商名称',
      eval_period VARCHAR(20) COMMENT '评估周期: month-月度, quarter-季度, year-年度',
      period_start DATE COMMENT '周期开始',
      period_end DATE COMMENT '周期结束',
      quality_score DECIMAL(5,1) COMMENT '质量评分(0-100)',
      delivery_score DECIMAL(5,1) COMMENT '交付评分(0-100)',
      price_score DECIMAL(5,1) COMMENT '价格评分(0-100)',
      service_score DECIMAL(5,1) COMMENT '服务评分(0-100)',
      total_score DECIMAL(5,1) COMMENT '综合评分(0-100)',
      quality_rate DECIMAL(5,2) COMMENT '来料合格率%',
      on_time_rate DECIMAL(5,2) COMMENT '准时交付率%',
      order_count INT DEFAULT 0 COMMENT '订单数量',
      defect_count INT DEFAULT 0 COMMENT '不良次数',
      supplier_level VARCHAR(10) COMMENT '供应商等级: A-优秀, B-良好, C-合格, D-待改进',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待评估, 2-已评估, 3-已审核',
      evaluator VARCHAR(50) COMMENT '评估人',
      eval_time DATETIME COMMENT '评估时间',
      approver VARCHAR(50) COMMENT '审批人',
      approve_time DATETIME COMMENT '审批时间',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_eval_no (eval_no),
      KEY idx_supplier (supplier_id),
      KEY idx_period (eval_period, period_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商评估表'`;

/** CREATE … */
export const CREATE_TABLE_INV_STOCK_ADJUST_ITEM = `CREATE TABLE IF NOT EXISTS inv_stock_adjust_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      adjust_id BIGINT UNSIGNED NOT NULL COMMENT '调整单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      before_qty DECIMAL(18,4) DEFAULT 0 COMMENT '调整前数量',
      adjust_qty DECIMAL(18,4) DEFAULT 0 COMMENT '调整数量',
      after_qty DECIMAL(18,4) DEFAULT 0 COMMENT '调整后数量',
      unit VARCHAR(20) COMMENT '单位',
      batch_no VARCHAR(50) COMMENT '批次号',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_adjust (adjust_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='调整单明细'`;

/** CREATE … */
export const CREATE_TABLE_QMS_LAB_TEST = `CREATE TABLE IF NOT EXISTS qms_lab_test (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      test_no VARCHAR(50) NOT NULL COMMENT '测试编号',
      test_type VARCHAR(20) COMMENT '测试类型: color_diff-色差, adhesion-附着力, wear-耐磨, thickness-厚度, tension-张力, viscosity-粘度, other-其他',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      product_code VARCHAR(50) COMMENT '产品编码',
      product_name VARCHAR(100) COMMENT '产品名称',
      batch_no VARCHAR(50) COMMENT '批次号',
      sample_source VARCHAR(30) COMMENT '样品来源: incoming-来料, process-过程, final-成品, complaint-客诉',
      test_items TEXT COMMENT '测试项目(JSON)',
      test_result TEXT COMMENT '测试结果(JSON)',
      overall_result VARCHAR(20) COMMENT '综合结果: PASS-合格, FAIL-不合格, PENDING-待判定',
      tester VARCHAR(50) COMMENT '测试人',
      test_time DATETIME COMMENT '测试时间',
      reviewer VARCHAR(50) COMMENT '审核人',
      review_time DATETIME COMMENT '审核时间',
      equipment_used VARCHAR(200) COMMENT '使用设备',
      test_env TEXT COMMENT '测试环境(温湿度等)',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_test_no (test_no),
      KEY idx_product (product_id),
      KEY idx_type (test_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实验室测试记录表'`;

/** CREATE … */
export const CREATE_TABLE_PRD_MATERIAL_ISSUE = `CREATE TABLE IF NOT EXISTS prd_material_issue (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      issue_no VARCHAR(50) NOT NULL COMMENT '发料单号',
      work_order_id BIGINT UNSIGNED COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单编号',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
      issue_date DATE COMMENT '发料日期',
      issue_type TINYINT DEFAULT 1 COMMENT '发料类型: 1-生产发料, 2-扫码配料',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待审核, 2-已审核, 3-已完成, 4-已取消',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_issue_no (issue_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产发料单'`;

/** CREATE … */
export const CREATE_TABLE_OUTSOURCE_SETTLEMENT = `CREATE TABLE IF NOT EXISTS outsource_settlement (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      settlement_no VARCHAR(50) NOT NULL COMMENT '结算单号',
      outsource_order_id BIGINT UNSIGNED NOT NULL COMMENT '委外订单ID',
      outsource_order_no VARCHAR(50) COMMENT '委外订单号',
      supplier_id BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
      supplier_name VARCHAR(100) COMMENT '供应商名称',
      settlement_date DATE COMMENT '结算日期',
      settlement_qty DECIMAL(18,4) DEFAULT 0 COMMENT '结算数量',
      unit_price DECIMAL(18,4) DEFAULT 0 COMMENT '单价(分)',
      settlement_amount DECIMAL(18,4) DEFAULT 0 COMMENT '结算金额(分)',
      deduct_amount DECIMAL(18,4) DEFAULT 0 COMMENT '扣款金额(分)',
      actual_amount DECIMAL(18,4) DEFAULT 0 COMMENT '实付金额(分)',
      payment_status TINYINT DEFAULT 1 COMMENT '付款状态: 1-未付款, 2-部分付款, 3-已付款',
      payment_date DATE COMMENT '付款日期',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待审核, 2-已审核, 3-已完成, 9-已取消',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_settlement_no (settlement_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='委外结算单'`;

/** CREATE … */
export const CREATE_TABLE_FIN_COST_RECORD = `CREATE TABLE IF NOT EXISTS fin_cost_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cost_no VARCHAR(50) NOT NULL COMMENT '成本单号',
      cost_type VARCHAR(20) NOT NULL COMMENT '成本类型: material-材料, labor-人工, overhead-制造费用, outsource-委外, other-其他',
      source_type VARCHAR(30) COMMENT '来源类型: purchase-采购, workorder-工单, outsource-委外',
      source_no VARCHAR(50) COMMENT '来源单号',
      source_id BIGINT UNSIGNED COMMENT '来源ID',
      department VARCHAR(50) COMMENT '部门',
      amount DECIMAL(18,4) DEFAULT 0 COMMENT '金额(分)',
      cost_date DATE COMMENT '成本日期',
      description VARCHAR(255) COMMENT '描述',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待确认, 2-已确认',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_cost_no (cost_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成本记录表'`;

/** CREATE … */
export const CREATE_TABLE_INV_TRANSFER_ORDER = `CREATE TABLE IF NOT EXISTS inv_transfer_order (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      transfer_no VARCHAR(50) NOT NULL COMMENT '调拨单号',
      from_warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '源仓库ID',
      to_warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '目标仓库ID',
      transfer_date DATE COMMENT '调拨日期',
      transfer_type TINYINT DEFAULT 1 COMMENT '调拨类型: 1-普通调拨, 2-紧急调拨',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待审核, 2-已审核, 3-已完成, 4-已取消',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_transfer_no (transfer_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存调拨单'`;

/** CREATE … */
export const CREATE_TABLE_QMS_COMPLAINT = `CREATE TABLE IF NOT EXISTS qms_complaint (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      complaint_no VARCHAR(50) NOT NULL COMMENT '客诉编号',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      order_no VARCHAR(50) COMMENT '关联订单号',
      product_code VARCHAR(50) COMMENT '产品编码',
      product_name VARCHAR(100) COMMENT '产品名称',
      complaint_type VARCHAR(20) COMMENT '客诉类型: quality-质量, delivery-交付, service-服务, other-其他',
      complaint_level VARCHAR(10) COMMENT '严重等级: A-严重, B-一般, C-轻微',
      defect_desc TEXT COMMENT '缺陷描述',
      defect_qty INT COMMENT '缺陷数量',
      total_qty INT COMMENT '总数量',
      defect_rate DECIMAL(5,2) COMMENT '不良率%',
      reporter VARCHAR(50) COMMENT '登记人',
      report_time DATETIME COMMENT '登记时间',
      handler VARCHAR(50) COMMENT '处理人(QE)',
      contain_action TEXT COMMENT '临时围堵措施',
      root_cause TEXT COMMENT '根本原因',
      corrective_action TEXT COMMENT '纠正措施',
      preventive_action TEXT COMMENT '预防措施',
      verify_result VARCHAR(20) COMMENT '验证结果: effective-有效, ineffective-无效',
      verifier VARCHAR(50) COMMENT '验证人',
      verify_time DATETIME COMMENT '验证时间',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-已登记, 2-分析中, 3-对策中, 4-验证中, 5-已关闭',
      close_time DATETIME COMMENT '关闭时间',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_complaint_no (complaint_no),
      KEY idx_customer (customer_id),
      KEY idx_status (status),
      KEY idx_level (complaint_level)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客诉8D处理表'`;

/** CREATE … */
export const CREATE_TABLE_QC_INCOMING_INSPECTION = `CREATE TABLE IF NOT EXISTS qc_incoming_inspection (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      inspection_no VARCHAR(50) NOT NULL COMMENT '检验单号',
      inspection_date DATE COMMENT '检验日期',
      supplier_id BIGINT UNSIGNED COMMENT '供应商ID',
      supplier_name VARCHAR(100) COMMENT '供应商名称',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      specification VARCHAR(200) COMMENT '规格型号',
      batch_no VARCHAR(50) COMMENT '批次号',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '送检数量',
      unit VARCHAR(20) COMMENT '单位',
      inspection_type TINYINT DEFAULT 1 COMMENT '检验类型: 1-来料检验, 2-常规检验',
      inspection_result TINYINT DEFAULT 0 COMMENT '检验结果: 0-待检, 1-合格, 2-不合格, 3-让步接收',
      qualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '合格数量',
      unqualified_qty DECIMAL(18,4) DEFAULT 0 COMMENT '不合格数量',
      inspector_id BIGINT UNSIGNED COMMENT '检验员ID',
      inspector_name VARCHAR(50) COMMENT '检验员',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_inspection_no (inspection_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='来料检验单'`;

/** CREATE … */
export const CREATE_TABLE_ENG_SAMPLE_TO_MASS = `CREATE TABLE IF NOT EXISTS eng_sample_to_mass (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      transfer_no VARCHAR(50) NOT NULL COMMENT '转移单号',
      sample_order_id BIGINT UNSIGNED COMMENT '样品订单ID',
      sample_order_no VARCHAR(50) COMMENT '样品订单号',
      product_id BIGINT UNSIGNED COMMENT '产品ID',
      product_code VARCHAR(50) COMMENT '产品编码',
      product_name VARCHAR(100) COMMENT '产品名称',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      sample_params TEXT COMMENT '打样参数(JSON)',
      mass_params TEXT COMMENT '量产参数(JSON)',
      sop_file VARCHAR(500) COMMENT 'SOP文件路径',
      bom_version VARCHAR(20) COMMENT 'BOM版本',
      process_route VARCHAR(500) COMMENT '工艺路线',
      check_standard TEXT COMMENT '检验标准',
      special_note TEXT COMMENT '特别注意事项',
      sample_confirmer VARCHAR(50) COMMENT '打样确认人',
      sample_confirm_date DATE COMMENT '打样确认日期',
      eng_confirmer VARCHAR(50) COMMENT '工程确认人',
      eng_confirm_date DATE COMMENT '工程确认日期',
      prod_confirmer VARCHAR(50) COMMENT '生产确认人',
      prod_confirm_date DATE COMMENT '生产确认日期',
      quality_confirmer VARCHAR(50) COMMENT '品质确认人',
      quality_confirm_date DATE COMMENT '品质确认日期',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-草稿, 2-打样确认, 3-工程确认, 4-生产确认, 5-品质确认, 6-已转量产, 7-已退回',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_transfer_no (transfer_no),
      KEY idx_product (product_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='样品转量产交接表'`;

/** CREATE … */
export const CREATE_TABLE_INV_SALES_OUTBOUND = `CREATE TABLE IF NOT EXISTS inv_sales_outbound (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      outbound_no VARCHAR(50) NOT NULL COMMENT '出库单号',
      order_id BIGINT UNSIGNED COMMENT '销售订单ID',
      order_no VARCHAR(50) COMMENT '销售订单编号',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
      outbound_date DATE COMMENT '出库日期',
      delivery_person VARCHAR(50) COMMENT '发货人',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待出库, 2-已出库, 3-已取消',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_outbound_no (outbound_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售出库单'`;

/** CREATE … */
export const CREATE_TABLE_PRD_MATERIAL_RETURN_ITEM = `CREATE TABLE IF NOT EXISTS prd_material_return_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      return_id BIGINT UNSIGNED NOT NULL COMMENT '退料单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      return_qty DECIMAL(18,4) DEFAULT 0 COMMENT '退料数量',
      unit VARCHAR(20) COMMENT '单位',
      batch_no VARCHAR(50) COMMENT '批次号',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_return (return_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退料单明细'`;

/** CREATE … */
export const CREATE_TABLE_BIZ_CONTRACT_REVIEW = `CREATE TABLE IF NOT EXISTS biz_contract_review (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      review_no VARCHAR(50) NOT NULL COMMENT '评审编号',
      order_id BIGINT UNSIGNED COMMENT '订单ID',
      order_no VARCHAR(50) COMMENT '订单号',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      product_name VARCHAR(100) COMMENT '产品名称',
      quantity DECIMAL(12,3) COMMENT '数量',
      delivery_date DATE COMMENT '交期',
      special_requirement TEXT COMMENT '特殊要求',
      biz_opinion TEXT COMMENT '业务部意见',
      eng_opinion TEXT COMMENT '工程技术部意见',
      quality_opinion TEXT COMMENT '品质部意见',
      prod_opinion TEXT COMMENT '生产部意见',
      purchase_opinion TEXT COMMENT '采购部意见',
      biz_signer VARCHAR(50) COMMENT '业务部签字',
      eng_signer VARCHAR(50) COMMENT '工程技术部签字',
      quality_signer VARCHAR(50) COMMENT '品质部签字',
      prod_signer VARCHAR(50) COMMENT '生产部签字',
      purchase_signer VARCHAR(50) COMMENT '采购部签字',
      result VARCHAR(20) COMMENT '评审结果: approved-通过, conditional-有条件通过, rejected-不通过',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待评审, 2-评审中, 3-已评审',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_review_no (review_no),
      KEY idx_order (order_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合同评审表'`;

/** CREATE … */
export const CREATE_TABLE_EQP_SCRAP = `CREATE TABLE IF NOT EXISTS eqp_scrap (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      scrap_no VARCHAR(50) NOT NULL COMMENT '报废单号',
      equipment_id BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
      equipment_code VARCHAR(50) COMMENT '设备编码',
      equipment_name VARCHAR(100) COMMENT '设备名称',
      scrap_date DATE COMMENT '报废日期',
      scrap_reason TEXT COMMENT '报废原因',
      original_value DECIMAL(18,4) DEFAULT 0 COMMENT '原值',
      net_value DECIMAL(18,4) DEFAULT 0 COMMENT '净值',
      approval_person VARCHAR(50) COMMENT '审批人',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待审批, 2-已审批, 3-已取消',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_scrap_no (scrap_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备报废单'`;

/** CREATE … */
export const CREATE_TABLE_QMS_SUPPLIER_AUDIT = `CREATE TABLE IF NOT EXISTS qms_supplier_audit (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      audit_no VARCHAR(50) NOT NULL COMMENT '审核编号',
      supplier_id BIGINT UNSIGNED NOT NULL COMMENT '供应商ID',
      supplier_name VARCHAR(100) COMMENT '供应商名称',
      audit_type VARCHAR(20) COMMENT '审核类型: initial-初评, routine-例行, follow-跟踪, special-专项',
      audit_scope TEXT COMMENT '审核范围',
      audit_date DATE COMMENT '审核日期',
      auditor VARCHAR(50) COMMENT '审核人(QE)',
      audit_items TEXT COMMENT '审核项目(JSON)',
      audit_scores TEXT COMMENT '审核评分(JSON)',
      total_score DECIMAL(5,1) COMMENT '总评分',
      conclusion VARCHAR(20) COMMENT '结论: approved-批准, conditional-有条件批准, rejected-不批准',
      nonconformities TEXT COMMENT '不符合项',
      corrective_request TEXT COMMENT '整改要求',
      deadline DATE COMMENT '整改截止日期',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-计划中, 2-审核中, 3-已审核, 4-整改中, 5-已关闭',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_audit_no (audit_no),
      KEY idx_supplier (supplier_id),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商质量审核表'`;

/** CREATE … */
export const CREATE_TABLE_QRCODE_RECORD = `CREATE TABLE IF NOT EXISTS qrcode_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      qr_code VARCHAR(100) NOT NULL COMMENT '二维码编码(UUID)',
      qr_type VARCHAR(30) NOT NULL COMMENT '二维码类型: material-原料, product-成品, workorder-工单, ink-油墨, screen_plate-网版, die-刀具, shipment-出货, ink_open-开罐, ink_mixed-调色',
      ref_id BIGINT UNSIGNED COMMENT '关联业务ID',
      ref_no VARCHAR(50) COMMENT '关联业务单号',
      batch_no VARCHAR(50) COMMENT '批次号',
      material_id BIGINT UNSIGNED COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      specification VARCHAR(200) COMMENT '规格型号',
      quantity DECIMAL(18,4) DEFAULT 0 COMMENT '数量',
      unit VARCHAR(20) COMMENT '单位',
      warehouse_id BIGINT UNSIGNED COMMENT '仓库ID',
      warehouse_name VARCHAR(100) COMMENT '仓库名称',
      location VARCHAR(50) COMMENT '库位',
      supplier_id BIGINT UNSIGNED COMMENT '供应商ID',
      supplier_name VARCHAR(100) COMMENT '供应商名称',
      customer_id BIGINT UNSIGNED COMMENT '客户ID',
      customer_name VARCHAR(100) COMMENT '客户名称',
      work_order_id BIGINT UNSIGNED COMMENT '工单ID',
      work_order_no VARCHAR(50) COMMENT '工单编号',
      production_date DATE COMMENT '生产日期',
      expiry_date DATE COMMENT '有效期',
      print_count INT DEFAULT 0 COMMENT '打印次数',
      last_print_time DATETIME COMMENT '最后打印时间',
      scan_count INT DEFAULT 0 COMMENT '扫描次数',
      last_scan_time DATETIME COMMENT '最后扫描时间',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-有效, 2-已使用, 3-已失效, 9-已作废',
      extra_data JSON COMMENT '扩展数据',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_qr_code (qr_code),
      KEY idx_qr_type (qr_type),
      KEY idx_ref (qr_type, ref_id),
      KEY idx_batch (batch_no),
      KEY idx_material (material_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='二维码记录表'`;

/** CREATE … */
export const CREATE_TABLE_OUTSOURCE_ISSUE = `CREATE TABLE IF NOT EXISTS outsource_issue (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      issue_no VARCHAR(50) NOT NULL COMMENT '委外发料单号',
      outsource_order_id BIGINT UNSIGNED NOT NULL COMMENT '委外订单ID',
      outsource_order_no VARCHAR(50) COMMENT '委外订单号',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
      issue_date DATE COMMENT '发料日期',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待审核, 2-已审核, 3-已发料, 9-已取消',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_issue_no (issue_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='委外发料单'`;

/** CREATE … */
export const CREATE_TABLE_PRD_MATERIAL_ISSUE_ITEM = `CREATE TABLE IF NOT EXISTS prd_material_issue_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      issue_id BIGINT UNSIGNED NOT NULL COMMENT '发料单ID',
      material_id BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
      material_code VARCHAR(50) COMMENT '物料编码',
      material_name VARCHAR(100) COMMENT '物料名称',
      required_qty DECIMAL(18,4) DEFAULT 0 COMMENT '需求数量',
      issued_qty DECIMAL(18,4) DEFAULT 0 COMMENT '实发数量',
      unit VARCHAR(20) COMMENT '单位',
      batch_no VARCHAR(50) COMMENT '批次号',
      remark VARCHAR(255) COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_issue (issue_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发料单明细'`;

/** CREATE … */
export const CREATE_TABLE_EQP_REPAIR = `CREATE TABLE IF NOT EXISTS eqp_repair (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      repair_no VARCHAR(50) NOT NULL COMMENT '维修单号',
      equipment_id BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
      equipment_code VARCHAR(50) COMMENT '设备编码',
      equipment_name VARCHAR(100) COMMENT '设备名称',
      fault_date DATE COMMENT '故障日期',
      fault_desc TEXT COMMENT '故障描述',
      repair_type TINYINT DEFAULT 1 COMMENT '维修类型: 1-计划维修, 2-紧急维修',
      repair_person VARCHAR(50) COMMENT '维修人员',
      repair_start_time DATETIME COMMENT '维修开始时间',
      repair_end_time DATETIME COMMENT '维修结束时间',
      repair_cost DECIMAL(18,4) DEFAULT 0 COMMENT '维修费用',
      repair_result TEXT COMMENT '维修结果',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待维修, 2-维修中, 3-已完成, 4-已取消',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_repair_no (repair_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备维修单'`;

/** CREATE … */
export const CREATE_TABLE_INV_STOCK_ADJUST = `CREATE TABLE IF NOT EXISTS inv_stock_adjust (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      adjust_no VARCHAR(50) NOT NULL COMMENT '调整单号',
      warehouse_id BIGINT UNSIGNED NOT NULL COMMENT '仓库ID',
      adjust_date DATE COMMENT '调整日期',
      adjust_type TINYINT DEFAULT 1 COMMENT '调整类型: 1-盘盈, 2-盘亏, 3-其他调整',
      status TINYINT DEFAULT 1 COMMENT '状态: 1-待审核, 2-已审核, 3-已完成, 4-已取消',
      operator_id BIGINT UNSIGNED COMMENT '操作人ID',
      operator_name VARCHAR(50) COMMENT '操作人',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT UNSIGNED,
      deleted TINYINT DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uk_adjust_no (adjust_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存调整单'`;
