import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const results: string[] = [];

  // 1. mdm_product
  await execute(`
    CREATE TABLE IF NOT EXISTS mdm_product (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_code VARCHAR(50) NOT NULL COMMENT '产品编码',
      product_name VARCHAR(200) NOT NULL COMMENT '产品名称',
      short_name VARCHAR(100) DEFAULT '' COMMENT '简称',
      specification VARCHAR(200) DEFAULT '' COMMENT '规格型号',
      unit VARCHAR(20) DEFAULT '件' COMMENT '计量单位',
      category_id BIGINT UNSIGNED DEFAULT NULL COMMENT '分类ID',
      category_name VARCHAR(100) DEFAULT '' COMMENT '分类名称',
      customer_id BIGINT UNSIGNED DEFAULT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) DEFAULT '' COMMENT '客户名称',
      bom_version VARCHAR(20) DEFAULT 'V1.0' COMMENT 'BOM版本',
      description TEXT COMMENT '描述',
      status VARCHAR(20) DEFAULT 'active' COMMENT '状态',
      cost_price DECIMAL(12,2) DEFAULT 0 COMMENT '成本价',
      sale_price DECIMAL(12,2) DEFAULT 0 COMMENT '销售价',
      min_stock DECIMAL(12,2) DEFAULT 0 COMMENT '最小库存',
      max_stock DECIMAL(12,2) DEFAULT 0 COMMENT '最大库存',
      safety_stock DECIMAL(12,2) DEFAULT 0 COMMENT '安全库存',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_product_code (product_code),
      INDEX idx_category (category_id),
      INDEX idx_customer (customer_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品主数据表'
  `);
  results.push('mdm_product created');

  // 2. biz_contract_review
  await execute(`
    CREATE TABLE IF NOT EXISTS biz_contract_review (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      review_no VARCHAR(50) NOT NULL COMMENT '评审编号',
      order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '订单ID',
      order_no VARCHAR(50) DEFAULT NULL COMMENT '订单编号',
      customer_id BIGINT UNSIGNED DEFAULT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) DEFAULT '' COMMENT '客户名称',
      product_id BIGINT UNSIGNED DEFAULT NULL COMMENT '产品ID',
      product_code VARCHAR(50) DEFAULT NULL COMMENT '产品编码',
      product_name VARCHAR(200) DEFAULT '' COMMENT '产品名称',
      quantity DECIMAL(12,2) DEFAULT 0 COMMENT '数量',
      amount DECIMAL(12,2) DEFAULT 0 COMMENT '金额',
      delivery_date DATE DEFAULT NULL COMMENT '交货日期',
      sample_status VARCHAR(20) DEFAULT 'pending' COMMENT '样品状态',
      quality_requirement TEXT COMMENT '质量要求',
      production_capacity TEXT COMMENT '产能评估',
      material_availability TEXT COMMENT '物料可用性',
      engineering_feasibility TEXT COMMENT '工程可行性',
      biz_opinion TEXT COMMENT '商务意见',
      eng_opinion TEXT COMMENT '工程意见',
      quality_opinion TEXT COMMENT '质量意见',
      prod_opinion TEXT COMMENT '生产意见',
      purchase_opinion TEXT COMMENT '采购意见',
      review_date DATE DEFAULT NULL COMMENT '评审日期',
      status TINYINT DEFAULT 0 COMMENT '状态',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_review_no (review_no),
      INDEX idx_customer (customer_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合同评审表'
  `);
  results.push('biz_contract_review created');

  // 3. crm_follow_record
  await execute(`
    CREATE TABLE IF NOT EXISTS crm_follow_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) DEFAULT '' COMMENT '客户名称',
      follow_type VARCHAR(20) DEFAULT 'phone' COMMENT '跟进方式',
      follow_content TEXT COMMENT '跟进内容',
      contact_name VARCHAR(100) DEFAULT NULL COMMENT '联系人',
      salesman_name VARCHAR(100) DEFAULT NULL COMMENT '业务员',
      next_follow_date DATE DEFAULT NULL COMMENT '下次跟进日期',
      opportunity VARCHAR(200) DEFAULT NULL COMMENT '商机',
      status TINYINT DEFAULT 1 COMMENT '状态',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_customer (customer_id),
      INDEX idx_follow_type (follow_type),
      INDEX idx_create_time (create_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户跟进记录表'
  `);
  results.push('crm_follow_record created');

  // 4. crm_customer_analysis
  await execute(`
    CREATE TABLE IF NOT EXISTS crm_customer_analysis (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID',
      customer_name VARCHAR(100) DEFAULT '' COMMENT '客户名称',
      analysis_period VARCHAR(20) DEFAULT 'month' COMMENT '分析周期',
      period_start DATE DEFAULT NULL COMMENT '周期开始',
      period_end DATE DEFAULT NULL COMMENT '周期结束',
      order_count INT DEFAULT 0 COMMENT '订单数',
      order_amount DECIMAL(12,2) DEFAULT 0 COMMENT '订单金额',
      delivery_count INT DEFAULT 0 COMMENT '交付数',
      return_count INT DEFAULT 0 COMMENT '退货数',
      complaint_count INT DEFAULT 0 COMMENT '投诉数',
      on_time_rate DECIMAL(5,2) DEFAULT NULL COMMENT '准时率',
      satisfaction_score DECIMAL(3,1) DEFAULT NULL COMMENT '满意度',
      customer_level VARCHAR(5) DEFAULT 'C' COMMENT '客户等级',
      growth_rate DECIMAL(5,2) DEFAULT NULL COMMENT '增长率',
      remark TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_customer (customer_id),
      INDEX idx_period (analysis_period),
      INDEX idx_level (customer_level)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户分析表'
  `);
  results.push('crm_customer_analysis created');

  // Insert test data - mdm_product
  const pc: any = await query('SELECT COUNT(*) as cnt FROM mdm_product');
  if (pc[0]?.cnt === 0) {
    const products = [
      ['P001', 'PET薄膜标签', 'PET标签', '100mm×50mm', '件', 1, '薄膜标签', 1, '越南达昌', 0.85, 1.20, 1000, 5000, 500],
      ['P002', 'PVC薄膜标签', 'PVC标签', '80mm×40mm', '件', 1, '薄膜标签', 2, '胡志明印刷', 0.65, 0.95, 2000, 8000, 800],
      ['P003', '不干胶标签', '胶标签', '120mm×60mm', '件', 2, '不干胶标签', 1, '越南达昌', 0.45, 0.75, 3000, 10000, 1000],
      ['P004', '丝印面板', '面板', '200mm×150mm', '件', 3, '丝印产品', 3, '河内电子', 2.50, 4.00, 500, 2000, 200],
      ['P005', 'UV油墨标签', 'UV标签', '90mm×45mm', '件', 1, '薄膜标签', 1, '越南达昌', 0.95, 1.50, 1500, 6000, 600],
      ['P006', '模切标签', '模切', '150mm×80mm', '件', 2, '不干胶标签', 2, '胡志明印刷', 0.55, 0.90, 2000, 8000, 800],
    ];
    for (const p of products) {
      await execute(
        `INSERT INTO mdm_product (product_code, product_name, short_name, specification, unit, category_id, category_name, customer_id, customer_name, cost_price, sale_price, min_stock, max_stock, safety_stock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        p
      );
    }
    results.push('mdm_product: 6 records');
  }

  // Insert test data - biz_contract_review
  const crc: any = await query('SELECT COUNT(*) as cnt FROM biz_contract_review');
  if (crc[0]?.cnt === 0) {
    const reviews = [
      ['CR20260601001', 1, 'ORD001', 1, '越南达昌', 1, 'P001', 'PET薄膜标签', 5000, 6000, '2026-06-15', 'approved', '满足要求', '产能充足', '物料齐备', '可行', '同意', '同意', '同意', '同意', '同意', '2026-06-01', 2],
      ['CR20260601002', 2, 'ORD002', 2, '胡志明印刷', 2, 'P002', 'PVC薄膜标签', 8000, 7600, '2026-06-20', 'approved', '标准要求', '需加班', '部分缺料', '可行', '同意', '同意', '需确认', '需采购', '同意', '2026-06-01', 1],
      ['CR20260602001', 3, 'ORD003', 1, '越南达昌', 3, 'P003', '不干胶标签', 10000, 7500, '2026-06-25', 'pending', '常规质量', '产能紧张', '物料齐备', '需评估', null, null, null, null, null, '2026-06-02', 0],
      ['CR20260602002', null, null, 3, '河内电子', 4, 'P004', '丝印面板', 2000, 8000, '2026-07-01', 'pending', '高精度要求', null, null, null, null, null, null, null, null, '2026-06-02', 0],
      ['CR20260603001', 4, 'ORD004', 2, '胡志明印刷', 5, 'P005', 'UV油墨标签', 6000, 9000, '2026-06-30', 'approved', 'UV固化要求', '产能充足', '物料齐备', '可行', '同意', '同意', '同意', '同意', '同意', '2026-06-03', 2],
    ];
    for (const r of reviews) {
      await execute(
        `INSERT INTO biz_contract_review (review_no, order_id, order_no, customer_id, customer_name, product_id, product_code, product_name, quantity, amount, delivery_date, sample_status, quality_requirement, production_capacity, material_availability, engineering_feasibility, biz_opinion, eng_opinion, quality_opinion, prod_opinion, purchase_opinion, review_date, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        r
      );
    }
    results.push('biz_contract_review: 5 records');
  }

  // Insert test data - crm_follow_record
  const frc: any = await query('SELECT COUNT(*) as cnt FROM crm_follow_record');
  if (frc[0]?.cnt === 0) {
    const follows = [
      [1, '越南达昌', 'visit', '实地拜访客户，讨论Q3订单计划', '阮文强', '陈经理', '2026-06-15', 'Q3大单机会', 1, '客户预算充足'],
      [1, '越南达昌', 'phone', '电话确认样品交付时间', '阮文强', '陈经理', '2026-06-08', '样品确认', 1, ''],
      [2, '胡志明印刷', 'email', '发送最新产品目录和报价单', '黎氏花', '王经理', '2026-06-12', 'PVC标签需求', 1, '价格敏感'],
      [2, '胡志明印刷', 'visit', '拜访客户工厂，了解生产需求', '黎氏花', '王经理', '2026-06-20', '扩产需求', 1, '需跟进报价'],
      [3, '河内电子', 'phone', '电话沟通丝印面板技术要求', '范文东', '李经理', '2026-06-10', '高精度面板', 1, '技术要求高'],
      [3, '河内电子', 'visit', '技术交流会议，确认丝印工艺方案', '范文东', '李经理', '2026-06-18', '技术合作', 1, ''],
      [1, '越南达昌', 'phone', '回访客户满意度，反馈良好', '阮文强', '陈经理', '2026-06-25', '续签机会', 1, '满意度高'],
    ];
    for (const f of follows) {
      await execute(
        `INSERT INTO crm_follow_record (customer_id, customer_name, follow_type, follow_content, contact_name, salesman_name, next_follow_date, opportunity, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        f
      );
    }
    results.push('crm_follow_record: 7 records');
  }

  // Insert test data - crm_customer_analysis
  const cac: any = await query('SELECT COUNT(*) as cnt FROM crm_customer_analysis');
  if (cac[0]?.cnt === 0) {
    const analyses = [
      [1, '越南达昌', 'month', '2026-05-01', '2026-05-31', 15, 180000, 14, 0, 0, 95.5, 4.5, 'A', 12.5, '核心客户'],
      [2, '胡志明印刷', 'month', '2026-05-01', '2026-05-31', 8, 76000, 8, 1, 0, 87.5, 3.8, 'B', 5.2, '需提升服务'],
      [3, '河内电子', 'month', '2026-05-01', '2026-05-31', 3, 24000, 3, 0, 1, 66.7, 3.2, 'C', -8.3, '投诉需关注'],
      [1, '越南达昌', 'quarter', '2026-04-01', '2026-06-30', 42, 520000, 40, 0, 0, 95.2, 4.6, 'A', 15.8, '季度增长稳定'],
      [2, '胡志明印刷', 'quarter', '2026-04-01', '2026-06-30', 22, 210000, 21, 2, 1, 86.4, 3.9, 'B', 8.3, ''],
      [3, '河内电子', 'quarter', '2026-04-01', '2026-06-30', 9, 72000, 8, 1, 2, 77.8, 3.4, 'C', -3.2, '需改善'],
    ];
    for (const a of analyses) {
      await execute(
        `INSERT INTO crm_customer_analysis (customer_id, customer_name, analysis_period, period_start, period_end, order_count, order_amount, delivery_count, return_count, complaint_count, on_time_rate, satisfaction_score, customer_level, growth_rate, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        a
      );
    }
    results.push('crm_customer_analysis: 6 records');
  }

  // Insert test data - BOM
  const bomCount: any = await query('SELECT COUNT(*) as cnt FROM bom_header');
  if (bomCount[0]?.cnt === 0) {
    // BOM headers
    const bomHeaders = [
      ['BOM20260601A1B', 1, 'P001', 'PET薄膜标签', '100mm×50mm', 'V1.0', 1, 30, '件', 1, 2, 1.70, '标准BOM'],
      ['BOM20260602C3D', 2, 'P002', 'PVC薄膜标签', '80mm×40mm', 'V1.0', 1, 30, '件', 1, 3, 1.30, '标准BOM'],
      ['BOM20260603E5F', 3, 'P003', '不干胶标签', '120mm×60mm', 'V1.0', 1, 30, '件', 1, 2, 0.90, '标准BOM'],
      ['BOM20260603G7H', 4, 'P004', '丝印面板', '200mm×150mm', 'V1.0', 1, 10, '件', 1, 3, 5.00, '丝印BOM'],
      ['BOM20260603I9J', 5, 'P005', 'UV油墨标签', '90mm×45mm', 'V2.0', 0, 10, '件', 1, 2, 1.90, '升级版BOM'],
    ];
    for (const h of bomHeaders) {
      await execute(
        `INSERT INTO bom_header (bom_no, product_id, product_code, product_name, product_spec, version, is_default, status, unit, base_qty, total_material_count, total_cost, remark, create_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        h
      );
    }

    // BOM lines - matching actual table columns: material_unit, usage_qty (not unit, consumption_qty)
    const bomLines = [
      [1, 1, 1, 'M001', 'PET薄膜材料', '100mm×50mm', '件', 1.0, 5, 0.50, 0.525, ''],
      [1, 2, 2, 'M002', '胶水', '通用型', 'kg', 0.01, 2, 50.00, 0.51, ''],
      [2, 1, 3, 'M003', 'PVC薄膜材料', '80mm×40mm', '件', 1.0, 5, 0.35, 0.3675, ''],
      [2, 2, 4, 'M004', '油墨-彩色', '标准色', 'kg', 0.005, 3, 80.00, 0.412, ''],
      [2, 3, 2, 'M002', '胶水', '通用型', 'kg', 0.01, 2, 50.00, 0.51, ''],
      [3, 1, 5, 'M005', '不干胶底纸', '120mm×60mm', '件', 1.0, 3, 0.25, 0.2575, ''],
      [3, 2, 6, 'M006', '面材', '120mm×60mm', '件', 1.0, 3, 0.30, 0.309, ''],
      [4, 1, 7, 'M007', 'PC面板', '200mm×150mm', '件', 1.0, 5, 1.50, 1.575, ''],
      [4, 2, 4, 'M004', '油墨-丝印', '丝印专用', 'kg', 0.02, 5, 80.00, 1.68, ''],
      [4, 3, 8, 'M008', '保护膜', '200mm×150mm', '件', 1.0, 3, 0.80, 0.824, ''],
      [5, 1, 9, 'M009', 'UV薄膜材料', '90mm×45mm', '件', 1.0, 5, 0.60, 0.63, ''],
      [5, 2, 10, 'M010', 'UV油墨', 'UV固化型', 'kg', 0.008, 5, 120.00, 1.008, ''],
    ];
    for (const l of bomLines) {
      await execute(
        `INSERT INTO bom_line (bom_id, line_no, material_id, material_code, material_name, material_spec, material_unit, usage_qty, loss_rate, unit_cost, total_cost, remark, create_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        l
      );
    }

    // Create bom_version_history if not exists
    await execute(`
      CREATE TABLE IF NOT EXISTS bom_version_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        bom_id INT NOT NULL COMMENT 'BOM ID',
        version VARCHAR(20) DEFAULT 'V1.0' COMMENT '版本',
        change_type VARCHAR(20) DEFAULT 'CREATE' COMMENT '变更类型',
        change_content TEXT COMMENT '变更内容',
        change_reason VARCHAR(500) DEFAULT NULL COMMENT '变更原因',
        operate_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
        INDEX idx_bom_id (bom_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BOM版本历史'
    `);

    // bom_version_history - skip if actual table structure differs from expected
    try {
      const bvhCols: any = await query(`SHOW COLUMNS FROM bom_version_history LIKE 'version'`);
      if (bvhCols.length > 0) {
        for (let i = 1; i <= 5; i++) {
          await execute(
            `INSERT INTO bom_version_history (bom_id, version, change_type, change_content, change_reason, operate_time) VALUES (?,?, 'CREATE', ?, '新建BOM', NOW())`,
            [i, i <= 4 ? 'V1.0' : 'V2.0', '创建BOM']
          );
        }
      }
    } catch (e: any) {
      results.push('bom_version_history insert skipped: ' + (e.message || ''));
    }

    results.push('bom: 5 headers + 12 lines + version history');
  }

  // ===== 新增缺失表 =====

  // 5. prd_schedule (生产排程)
  await execute(`
    CREATE TABLE IF NOT EXISTS prd_schedule (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      schedule_no VARCHAR(50) NOT NULL COMMENT '排程编号',
      order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '订单ID',
      order_no VARCHAR(50) DEFAULT NULL COMMENT '订单编号',
      product_id BIGINT UNSIGNED DEFAULT NULL COMMENT '产品ID',
      product_code VARCHAR(50) DEFAULT NULL COMMENT '产品编码',
      product_name VARCHAR(200) DEFAULT '' COMMENT '产品名称',
      workshop VARCHAR(100) DEFAULT '' COMMENT '车间',
      planned_qty DECIMAL(12,2) DEFAULT 0 COMMENT '计划数量',
      planned_start DATE DEFAULT NULL COMMENT '计划开始',
      planned_end DATE DEFAULT NULL COMMENT '计划结束',
      priority INT DEFAULT 5 COMMENT '优先级',
      scheduler VARCHAR(100) DEFAULT '' COMMENT '排程人',
      status TINYINT DEFAULT 0 COMMENT '状态',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_schedule_no (schedule_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产排程表'
  `);
  results.push('prd_schedule created');

  // 6. prd_material_issue (生产领料)
  await execute(`
    CREATE TABLE IF NOT EXISTS prd_material_issue (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      issue_no VARCHAR(50) NOT NULL COMMENT '领料单号',
      work_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '工单ID',
      work_order_no VARCHAR(50) DEFAULT NULL COMMENT '工单编号',
      warehouse_id BIGINT UNSIGNED DEFAULT NULL COMMENT '仓库ID',
      issue_date DATE DEFAULT NULL COMMENT '领料日期',
      issue_type VARCHAR(20) DEFAULT 'normal' COMMENT '领料类型',
      operator_name VARCHAR(100) DEFAULT '' COMMENT '操作人',
      status TINYINT DEFAULT 1 COMMENT '状态',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_issue_no (issue_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产领料单'
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS prd_material_issue_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      issue_id BIGINT UNSIGNED NOT NULL COMMENT '领料单ID',
      material_id BIGINT UNSIGNED DEFAULT NULL COMMENT '物料ID',
      material_code VARCHAR(50) DEFAULT '' COMMENT '物料编码',
      material_name VARCHAR(200) DEFAULT '' COMMENT '物料名称',
      required_qty DECIMAL(12,2) DEFAULT 0 COMMENT '需求数量',
      issued_qty DECIMAL(12,2) DEFAULT 0 COMMENT '已领数量',
      unit VARCHAR(20) DEFAULT '' COMMENT '单位',
      batch_no VARCHAR(50) DEFAULT '' COMMENT '批次号'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='领料明细'
  `);
  results.push('prd_material_issue created');

  // 7. prd_material_return (生产退料)
  await execute(`
    CREATE TABLE IF NOT EXISTS prd_material_return (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      return_no VARCHAR(50) NOT NULL COMMENT '退料单号',
      work_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '工单ID',
      work_order_no VARCHAR(50) DEFAULT NULL COMMENT '工单编号',
      warehouse_id BIGINT UNSIGNED DEFAULT NULL COMMENT '仓库ID',
      return_date DATE DEFAULT NULL COMMENT '退料日期',
      operator_name VARCHAR(100) DEFAULT '' COMMENT '操作人',
      status TINYINT DEFAULT 1 COMMENT '状态',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_return_no (return_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产退料单'
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS prd_material_return_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      return_id BIGINT UNSIGNED NOT NULL COMMENT '退料单ID',
      material_id BIGINT UNSIGNED DEFAULT NULL COMMENT '物料ID',
      material_code VARCHAR(50) DEFAULT '' COMMENT '物料编码',
      material_name VARCHAR(200) DEFAULT '' COMMENT '物料名称',
      return_qty DECIMAL(12,2) DEFAULT 0 COMMENT '退料数量',
      unit VARCHAR(20) DEFAULT '' COMMENT '单位',
      batch_no VARCHAR(50) DEFAULT '' COMMENT '批次号'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退料明细'
  `);
  results.push('prd_material_return created');

  // 8. prd_product_label (产品标签)
  await execute(`
    CREATE TABLE IF NOT EXISTS prd_product_label (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      label_no VARCHAR(50) NOT NULL COMMENT '标签编号',
      work_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '工单ID',
      work_order_no VARCHAR(50) DEFAULT NULL COMMENT '工单编号',
      material_id BIGINT UNSIGNED DEFAULT NULL COMMENT '物料ID',
      material_code VARCHAR(50) DEFAULT '' COMMENT '物料编码',
      material_name VARCHAR(200) DEFAULT '' COMMENT '物料名称',
      quantity DECIMAL(12,2) DEFAULT 0 COMMENT '数量',
      unit VARCHAR(20) DEFAULT '' COMMENT '单位',
      batch_no VARCHAR(50) DEFAULT '' COMMENT '批次号',
      qc_result VARCHAR(20) DEFAULT 'pending' COMMENT '质检结果',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_label_no (label_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品标签表'
  `);
  results.push('prd_product_label created');

  // 9. ink_opening_record (开墨记录)
  await execute(`
    CREATE TABLE IF NOT EXISTS ink_opening_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      record_no VARCHAR(50) NOT NULL COMMENT '开罐单号',
      material_id BIGINT UNSIGNED DEFAULT NULL COMMENT '物料ID',
      material_code VARCHAR(50) DEFAULT '' COMMENT '物料编码',
      material_name VARCHAR(200) DEFAULT '' COMMENT '物料名称',
      batch_no VARCHAR(50) DEFAULT '' COMMENT '批次号',
      label_id BIGINT UNSIGNED DEFAULT NULL COMMENT '标签ID',
      ink_type VARCHAR(20) DEFAULT '' COMMENT '油墨类型(solvent/uv/water)',
      open_time DATETIME DEFAULT NULL COMMENT '开罐时间',
      expire_hours INT DEFAULT 0 COMMENT '有效时长(小时)',
      expire_time DATETIME DEFAULT NULL COMMENT '过期时间',
      remaining_qty DECIMAL(12,2) DEFAULT 0 COMMENT '剩余数量',
      unit VARCHAR(20) DEFAULT '' COMMENT '单位',
      operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
      operator_name VARCHAR(100) DEFAULT '' COMMENT '操作人',
      status TINYINT DEFAULT 1 COMMENT '状态(1使用中/2已过期/3已报废)',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_record_no (record_no),
      INDEX idx_ink_type (ink_type),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='油墨开罐记录'
  `);
  results.push('ink_opening_record created');

  // 10. ink_mixed_batch (调墨记录)
  await execute(`
    CREATE TABLE IF NOT EXISTS ink_mixed_batch (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      batch_no VARCHAR(50) NOT NULL COMMENT '调墨批次号',
      formula_no VARCHAR(50) DEFAULT '' COMMENT '配方编号',
      formula_name VARCHAR(200) DEFAULT '' COMMENT '配方名称',
      total_qty DECIMAL(12,2) DEFAULT 0 COMMENT '总数量',
      unit VARCHAR(20) DEFAULT '' COMMENT '单位',
      mixed_date DATE DEFAULT NULL COMMENT '调墨日期',
      expire_date DATE DEFAULT NULL COMMENT '有效期',
      operator_id BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人ID',
      operator_name VARCHAR(100) DEFAULT '' COMMENT '操作人',
      status TINYINT DEFAULT 1 COMMENT '状态',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_batch_no (batch_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调墨批次表'
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS ink_mixed_batch_detail (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      mixed_batch_id BIGINT UNSIGNED NOT NULL COMMENT '调墨批次ID',
      source_batch_no VARCHAR(50) DEFAULT '' COMMENT '来源批次号',
      source_label_no VARCHAR(50) DEFAULT '' COMMENT '来源标签号',
      material_id BIGINT UNSIGNED DEFAULT NULL COMMENT '物料ID',
      material_name VARCHAR(200) DEFAULT '' COMMENT '物料名称',
      used_qty DECIMAL(12,2) DEFAULT 0 COMMENT '使用数量',
      unit VARCHAR(20) DEFAULT '' COMMENT '单位'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调墨明细'
  `);
  results.push('ink_mixed_batch created');

  // 11. eqp_scrap (设备报废)
  await execute(`
    CREATE TABLE IF NOT EXISTS eqp_scrap (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      scrap_no VARCHAR(50) NOT NULL COMMENT '报废单号',
      equipment_id BIGINT UNSIGNED DEFAULT NULL COMMENT '设备ID',
      equipment_code VARCHAR(50) DEFAULT '' COMMENT '设备编码',
      equipment_name VARCHAR(200) DEFAULT '' COMMENT '设备名称',
      scrap_date DATE DEFAULT NULL COMMENT '报废日期',
      scrap_reason TEXT COMMENT '报废原因',
      original_value DECIMAL(12,2) DEFAULT 0 COMMENT '原值',
      net_value DECIMAL(12,2) DEFAULT 0 COMMENT '净值',
      approval_person VARCHAR(100) DEFAULT '' COMMENT '审批人',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_scrap_no (scrap_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备报废表'
  `);
  results.push('eqp_scrap created');

  // 12. eqp_repair (设备维修)
  await execute(`
    CREATE TABLE IF NOT EXISTS eqp_repair (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      repair_no VARCHAR(50) NOT NULL COMMENT '维修单号',
      equipment_id BIGINT UNSIGNED DEFAULT NULL COMMENT '设备ID',
      equipment_code VARCHAR(50) DEFAULT '' COMMENT '设备编码',
      equipment_name VARCHAR(200) DEFAULT '' COMMENT '设备名称',
      fault_date DATE DEFAULT NULL COMMENT '故障日期',
      fault_desc TEXT COMMENT '故障描述',
      repair_type VARCHAR(20) DEFAULT 'corrective' COMMENT '维修类型',
      repair_person VARCHAR(100) DEFAULT '' COMMENT '维修人',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_repair_no (repair_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备维修表'
  `);
  results.push('eqp_repair created');

  // 13. eqp_calibration (设备校准)
  await execute(`
    CREATE TABLE IF NOT EXISTS eqp_calibration (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      calibration_no VARCHAR(50) NOT NULL COMMENT '校准单号',
      equipment_id BIGINT UNSIGNED DEFAULT NULL COMMENT '设备ID',
      equipment_code VARCHAR(50) DEFAULT '' COMMENT '设备编码',
      equipment_name VARCHAR(200) DEFAULT '' COMMENT '设备名称',
      calibration_date DATE DEFAULT NULL COMMENT '校准日期',
      next_calibration_date DATE DEFAULT NULL COMMENT '下次校准日期',
      calibration_org VARCHAR(200) DEFAULT '' COMMENT '校准机构',
      calibration_result VARCHAR(20) DEFAULT 'qualified' COMMENT '校准结果',
      certificate_no VARCHAR(50) DEFAULT '' COMMENT '证书编号',
      calibration_cost DECIMAL(12,2) DEFAULT 0 COMMENT '校准费用',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_calibration_no (calibration_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备校准表'
  `);
  results.push('eqp_calibration created');

  // 14. srm_supplier_eval (供应商评估)
  await execute(`
    CREATE TABLE IF NOT EXISTS srm_supplier_eval (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      eval_no VARCHAR(50) NOT NULL COMMENT '评估编号',
      supplier_id BIGINT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
      supplier_name VARCHAR(200) DEFAULT '' COMMENT '供应商名称',
      eval_period VARCHAR(20) DEFAULT 'month' COMMENT '评估周期',
      period_start DATE DEFAULT NULL COMMENT '周期开始',
      period_end DATE DEFAULT NULL COMMENT '周期结束',
      quality_score DECIMAL(5,2) DEFAULT 0 COMMENT '质量分',
      delivery_score DECIMAL(5,2) DEFAULT 0 COMMENT '交付分',
      price_score DECIMAL(5,2) DEFAULT 0 COMMENT '价格分',
      service_score DECIMAL(5,2) DEFAULT 0 COMMENT '服务分',
      total_score DECIMAL(5,2) DEFAULT 0 COMMENT '总分',
      quality_rate DECIMAL(5,2) DEFAULT 0 COMMENT '合格率',
      on_time_rate DECIMAL(5,2) DEFAULT 0 COMMENT '准时率',
      order_count INT DEFAULT 0 COMMENT '订单数',
      defect_count INT DEFAULT 0 COMMENT '缺陷数',
      supplier_level VARCHAR(5) DEFAULT 'C' COMMENT '供应商等级',
      status TINYINT DEFAULT 0 COMMENT '状态',
      evaluator VARCHAR(100) DEFAULT '' COMMENT '评估人',
      eval_time DATETIME DEFAULT NULL COMMENT '评估时间',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_eval_no (eval_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商评估表'
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS srm_supplier_eval_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      eval_id BIGINT UNSIGNED NOT NULL COMMENT '评估ID',
      category VARCHAR(50) DEFAULT '' COMMENT '分类',
      item_name VARCHAR(200) DEFAULT '' COMMENT '项目名称',
      weight DECIMAL(5,2) DEFAULT 0 COMMENT '权重',
      score DECIMAL(5,2) DEFAULT 0 COMMENT '得分',
      actual_value VARCHAR(100) DEFAULT '' COMMENT '实际值',
      target_value VARCHAR(100) DEFAULT '' COMMENT '目标值',
      remark TEXT COMMENT '备注',
      sort_order INT DEFAULT 0 COMMENT '排序'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商评估明细'
  `);
  results.push('srm_supplier_eval created');

  // 15. outsource_order (委外订单)
  await execute(`
    CREATE TABLE IF NOT EXISTS outsource_order (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_no VARCHAR(50) NOT NULL COMMENT '委外单号',
      work_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '工单ID',
      work_order_no VARCHAR(50) DEFAULT NULL COMMENT '工单编号',
      supplier_id BIGINT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
      supplier_name VARCHAR(200) DEFAULT '' COMMENT '供应商名称',
      product_id BIGINT UNSIGNED DEFAULT NULL COMMENT '产品ID',
      product_code VARCHAR(50) DEFAULT '' COMMENT '产品编码',
      product_name VARCHAR(200) DEFAULT '' COMMENT '产品名称',
      plan_qty DECIMAL(12,2) DEFAULT 0 COMMENT '计划数量',
      unit VARCHAR(20) DEFAULT '' COMMENT '单位',
      unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
      total_amount DECIMAL(12,2) DEFAULT 0 COMMENT '总金额',
      delivery_date DATE DEFAULT NULL COMMENT '交货日期',
      outsource_type VARCHAR(20) DEFAULT 'process' COMMENT '委外类型',
      process_name VARCHAR(200) DEFAULT '' COMMENT '工序名称',
      status TINYINT DEFAULT 0 COMMENT '状态',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_order_no (order_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外订单表'
  `);
  results.push('outsource_order created');

  // 16. outsource_issue (委外发料)
  await execute(`
    CREATE TABLE IF NOT EXISTS outsource_issue (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      issue_no VARCHAR(50) NOT NULL COMMENT '发料单号',
      outsource_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '委外订单ID',
      outsource_order_no VARCHAR(50) DEFAULT NULL COMMENT '委外单号',
      warehouse_id BIGINT UNSIGNED DEFAULT NULL COMMENT '仓库ID',
      issue_date DATE DEFAULT NULL COMMENT '发料日期',
      status TINYINT DEFAULT 1 COMMENT '状态',
      operator_name VARCHAR(100) DEFAULT '' COMMENT '操作人',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_issue_no (issue_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外发料表'
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS outsource_issue_item (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      issue_id BIGINT UNSIGNED NOT NULL COMMENT '发料单ID',
      material_id BIGINT UNSIGNED DEFAULT NULL COMMENT '物料ID',
      material_code VARCHAR(50) DEFAULT '' COMMENT '物料编码',
      material_name VARCHAR(200) DEFAULT '' COMMENT '物料名称',
      quantity DECIMAL(12,2) DEFAULT 0 COMMENT '数量',
      unit VARCHAR(20) DEFAULT '' COMMENT '单位',
      batch_no VARCHAR(50) DEFAULT '' COMMENT '批次号'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外发料明细'
  `);
  results.push('outsource_issue created');

  // 17. outsource_receive (委外收货)
  await execute(`
    CREATE TABLE IF NOT EXISTS outsource_receive (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      receive_no VARCHAR(50) NOT NULL COMMENT '收货单号',
      outsource_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '委外订单ID',
      outsource_order_no VARCHAR(50) DEFAULT NULL COMMENT '委外单号',
      warehouse_id BIGINT UNSIGNED DEFAULT NULL COMMENT '仓库ID',
      receive_date DATE DEFAULT NULL COMMENT '收货日期',
      receive_qty DECIMAL(12,2) DEFAULT 0 COMMENT '收货数量',
      qualified_qty DECIMAL(12,2) DEFAULT 0 COMMENT '合格数量',
      defective_qty DECIMAL(12,2) DEFAULT 0 COMMENT '不良数量',
      qc_status VARCHAR(20) DEFAULT 'pending' COMMENT '质检状态',
      status TINYINT DEFAULT 1 COMMENT '状态',
      operator_name VARCHAR(100) DEFAULT '' COMMENT '操作人',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_receive_no (receive_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外收货表'
  `);
  results.push('outsource_receive created');

  // 18. outsource_settlement (委外结算)
  await execute(`
    CREATE TABLE IF NOT EXISTS outsource_settlement (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      settlement_no VARCHAR(50) NOT NULL COMMENT '结算单号',
      outsource_order_id BIGINT UNSIGNED DEFAULT NULL COMMENT '委外订单ID',
      outsource_order_no VARCHAR(50) DEFAULT NULL COMMENT '委外单号',
      supplier_id BIGINT UNSIGNED DEFAULT NULL COMMENT '供应商ID',
      supplier_name VARCHAR(200) DEFAULT '' COMMENT '供应商名称',
      settlement_date DATE DEFAULT NULL COMMENT '结算日期',
      settlement_qty DECIMAL(12,2) DEFAULT 0 COMMENT '结算数量',
      unit_price DECIMAL(12,2) DEFAULT 0 COMMENT '单价',
      settlement_amount DECIMAL(12,2) DEFAULT 0 COMMENT '结算金额',
      deduct_amount DECIMAL(12,2) DEFAULT 0 COMMENT '扣款金额',
      actual_amount DECIMAL(12,2) DEFAULT 0 COMMENT '实付金额',
      payment_status VARCHAR(20) DEFAULT 'unpaid' COMMENT '付款状态',
      status TINYINT DEFAULT 0 COMMENT '状态',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_settlement_no (settlement_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='委外结算表'
  `);
  results.push('outsource_settlement created');

  // 19. fin_cost_record (财务成本记录)
  await execute(`
    CREATE TABLE IF NOT EXISTS fin_cost_record (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      cost_no VARCHAR(50) NOT NULL COMMENT '成本编号',
      cost_type VARCHAR(50) DEFAULT '' COMMENT '成本类型',
      cost_category VARCHAR(50) DEFAULT '' COMMENT '成本分类',
      cost_date DATE DEFAULT NULL COMMENT '成本日期',
      amount DECIMAL(12,2) DEFAULT 0 COMMENT '金额',
      order_no VARCHAR(50) DEFAULT '' COMMENT '关联订单',
      product_name VARCHAR(200) DEFAULT '' COMMENT '产品名称',
      department VARCHAR(100) DEFAULT '' COMMENT '部门',
      description TEXT COMMENT '描述',
      status TINYINT DEFAULT 0 COMMENT '状态',
      remark TEXT COMMENT '备注',
      deleted TINYINT DEFAULT 0,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_cost_no (cost_no),
      INDEX idx_cost_type (cost_type),
      INDEX idx_cost_date (cost_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='财务成本记录表'
  `);
  results.push('fin_cost_record created');

  // ===== 插入测试数据 =====

  // prd_schedule 测试数据
  const scCnt: any = await query('SELECT COUNT(*) as cnt FROM prd_schedule');
  if (scCnt[0]?.cnt === 0) {
    const schedules = [
      ['PS20260601001', 1, 'ORD001', 1, 'P001', 'PET薄膜标签', '印刷车间', 5000, '2026-06-05', '2026-06-10', 8, '张调度', 2, ''],
      ['PS20260601002', 2, 'ORD002', 2, 'P002', 'PVC薄膜标签', '印刷车间', 8000, '2026-06-08', '2026-06-15', 6, '张调度', 1, '常规排产'],
      ['PS20260602001', 3, 'ORD003', 3, 'P003', '不干胶标签', '模切车间', 10000, '2026-06-10', '2026-06-18', 5, '李调度', 0, ''],
      ['PS20260602002', null, null, 4, 'P004', '丝印面板', '丝印车间', 2000, '2026-06-12', '2026-06-20', 7, '张调度', 0, '高精度'],
      ['PS20260603001', 4, 'ORD004', 5, 'P005', 'UV油墨标签', '印刷车间', 6000, '2026-06-15', '2026-06-22', 4, '李调度', 2, ''],
    ];
    for (const s of schedules) {
      await execute(
        `INSERT INTO prd_schedule (schedule_no, order_id, order_no, product_id, product_code, product_name, workshop, planned_qty, planned_start, planned_end, priority, scheduler, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        s
      );
    }
    results.push('prd_schedule: 5 records');
  }

  // prd_material_issue 测试数据
  const miCnt: any = await query('SELECT COUNT(*) as cnt FROM prd_material_issue');
  if (miCnt[0]?.cnt === 0) {
    const issues = [
      ['MI20260601001', 1, 'WO001', 1, '2026-06-05', 'normal', '王操作', 2, ''],
      ['MI20260601002', 2, 'WO002', 1, '2026-06-08', 'normal', '李操作', 2, ''],
      ['MI20260602001', 3, 'WO003', 2, '2026-06-10', 'normal', '王操作', 1, ''],
      ['MI20260602002', 4, 'WO004', 1, '2026-06-12', 'supplement', '李操作', 1, '补料'],
    ];
    for (const i of issues) {
      await execute(
        `INSERT INTO prd_material_issue (issue_no, work_order_id, work_order_no, warehouse_id, issue_date, issue_type, operator_name, status, remark) VALUES (?,?,?,?,?,?,?,?,?)`,
        i
      );
    }
    results.push('prd_material_issue: 4 records');
  }

  // prd_material_return 测试数据
  const mrCnt: any = await query('SELECT COUNT(*) as cnt FROM prd_material_return');
  if (mrCnt[0]?.cnt === 0) {
    const returns = [
      ['MR20260601001', 1, 'WO001', 1, '2026-06-06', '王操作', 2, '余料退回'],
      ['MR20260602001', 2, 'WO002', 1, '2026-06-09', '李操作', 1, ''],
      ['MR20260603001', 3, 'WO003', 2, '2026-06-12', '王操作', 1, ''],
    ];
    for (const r of returns) {
      await execute(
        `INSERT INTO prd_material_return (return_no, work_order_id, work_order_no, warehouse_id, return_date, operator_name, status, remark) VALUES (?,?,?,?,?,?,?,?)`,
        r
      );
    }
    results.push('prd_material_return: 3 records');
  }

  // prd_product_label 测试数据
  const plCnt: any = await query('SELECT COUNT(*) as cnt FROM prd_product_label');
  if (plCnt[0]?.cnt === 0) {
    const labels = [
      ['LB20260601001', 1, 'WO001', 1, 'P001', 'PET薄膜标签', 5000, '件', 'B20260601', 'qualified', ''],
      ['LB20260601002', 2, 'WO002', 2, 'P002', 'PVC薄膜标签', 8000, '件', 'B20260602', 'qualified', ''],
      ['LB20260602001', 3, 'WO003', 3, 'P003', '不干胶标签', 10000, '件', 'B20260603', 'pending', '待检'],
      ['LB20260602002', 4, 'WO004', 4, 'P004', '丝印面板', 2000, '件', 'B20260604', 'qualified', ''],
      ['LB20260603001', 5, 'WO005', 5, 'P005', 'UV油墨标签', 6000, '件', 'B20260605', 'unqualified', '色差'],
    ];
    for (const l of labels) {
      await execute(
        `INSERT INTO prd_product_label (label_no, work_order_id, work_order_no, material_id, material_code, material_name, quantity, unit, batch_no, qc_result, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        l
      );
    }
    results.push('prd_product_label: 5 records');
  }

  // ink_opening_record 测试数据
  const ioCnt: any = await query('SELECT COUNT(*) as cnt FROM ink_opening_record');
  if (ioCnt[0]?.cnt === 0) {
    const openings = [
      ['INK001', 1, 'INK-C001', 'UV油墨-青色', 'B20260601', null, 'uv', '2026-06-01 08:00:00', 168, '2026-06-08 08:00:00', 5.0, 'kg', 1, '陈师傅', 1, ''],
      ['INK002', 2, 'INK-C002', 'UV油墨-品红', 'B20260602', null, 'uv', '2026-06-01 09:00:00', 168, '2026-06-08 09:00:00', 3.5, 'kg', 1, '陈师傅', 1, ''],
      ['INK003', 3, 'INK-C003', '丝印油墨-白色', 'B20260603', null, 'solvent', '2026-06-02 10:00:00', 72, '2026-06-05 10:00:00', 8.0, 'kg', 1, '李师傅', 1, ''],
      ['INK004', 4, 'INK-C004', '水性油墨-黑色', 'B20260604', null, 'water', '2026-05-20 08:00:00', 48, '2026-05-22 08:00:00', 10.0, 'kg', 1, '李师傅', 2, '已过期'],
    ];
    for (const o of openings) {
      await execute(
        `INSERT INTO ink_opening_record (record_no, material_id, material_code, material_name, batch_no, label_id, ink_type, open_time, expire_hours, expire_time, remaining_qty, unit, operator_id, operator_name, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        o
      );
    }
    results.push('ink_opening_record: 4 records');
  }

  // ink_mixed_batch 测试数据
  const imCnt: any = await query('SELECT COUNT(*) as cnt FROM ink_mixed_batch');
  if (imCnt[0]?.cnt === 0) {
    const mixings = [
      ['IM20260601001', 'F001', 'PET标签专色蓝', 2.5, 'kg', '2026-06-01', '2026-06-08', 1, '陈师傅', 2, ''],
      ['IM20260601002', 'F002', 'PVC标签专色红', 3.0, 'kg', '2026-06-01', '2026-06-08', 1, '陈师傅', 2, ''],
      ['IM20260602001', 'F003', '丝印白色调配', 5.0, 'kg', '2026-06-02', '2026-06-09', 1, '李师傅', 1, ''],
    ];
    for (const m of mixings) {
      await execute(
        `INSERT INTO ink_mixed_batch (batch_no, formula_no, formula_name, total_qty, unit, mixed_date, expire_date, operator_id, operator_name, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        m
      );
    }
    results.push('ink_mixed_batch: 3 records');
  }

  // ink_mixed_record 测试数据 (调墨记录 - 前端使用此表)
  const imrCnt: any = await query('SELECT COUNT(*) as cnt FROM ink_mixed_record');
  if (imrCnt[0]?.cnt === 0) {
    const mixedRecords = [
      ['IMR20260601001', 1, 'INK-C001', 'UV油墨-青色', '1:0.5:0.3', 'PET标签专色蓝', 'BLUE-001', null, null, '2026-06-01 10:00:00', 1, '陈师傅', 2.5, 'kg', null, null, 2, '2026-06-08 10:00:00', ''],
      ['IMR20260601002', 2, 'INK-C002', 'UV油墨-品红', '1:0.3:0.2', 'PVC标签专色红', 'RED-001', null, null, '2026-06-01 14:00:00', 1, '陈师傅', 3.0, 'kg', null, null, 2, '2026-06-08 14:00:00', ''],
      ['IMR20260602001', 3, 'INK-C003', '丝印油墨-白色', '1:0.1', '丝印白色调配', 'WHITE-001', null, null, '2026-06-02 09:00:00', 1, '李师傅', 5.0, 'kg', null, null, 1, '2026-06-09 09:00:00', ''],
    ];
    for (const mr of mixedRecords) {
      await execute(
        `INSERT INTO ink_mixed_record (record_no, base_ink_id, base_ink_code, base_ink_name, mix_ratio, color_name, color_code, company_id, company_name, mix_time, operator_id, operator_name, quantity, unit, warehouse_id, location_id, status, expire_time, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        mr
      );
    }
    results.push('ink_mixed_record: 3 records');
  }

  // eqp_scrap 测试数据
  const esCnt: any = await query('SELECT COUNT(*) as cnt FROM eqp_scrap');
  if (esCnt[0]?.cnt === 0) {
    const scraps = [
      ['ES20260601001', 1, 'EQ001', '旧式印刷机A', '2026-06-01', '设备老化，维修成本过高', 500000, 50000, '张总', ''],
      ['ES20260602001', 2, 'EQ002', '切纸机B', '2026-06-02', '精度不达标', 80000, 10000, '张总', ''],
    ];
    for (const s of scraps) {
      await execute(
        `INSERT INTO eqp_scrap (scrap_no, equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person, remark) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        s
      );
    }
    results.push('eqp_scrap: 2 records');
  }

  // eqp_repair 测试数据
  const erCnt: any = await query('SELECT COUNT(*) as cnt FROM eqp_repair');
  if (erCnt[0]?.cnt === 0) {
    const repairs = [
      ['ER20260601001', 3, 'EQ003', 'UV印刷机C', '2026-06-01', 'UV灯管故障，需更换', 'corrective', '赵师傅', ''],
      ['ER20260602001', 4, 'EQ004', '模切机D', '2026-06-02', '模具磨损', 'preventive', '钱师傅', '定期维护'],
      ['ER20260603001', 5, 'EQ005', '复卷机E', '2026-06-03', '传动带松动', 'corrective', '赵师傅', ''],
    ];
    for (const r of repairs) {
      await execute(
        `INSERT INTO eqp_repair (repair_no, equipment_id, equipment_code, equipment_name, fault_date, fault_desc, repair_type, repair_person, remark) VALUES (?,?,?,?,?,?,?,?,?)`,
        r
      );
    }
    results.push('eqp_repair: 3 records');
  }

  // eqp_calibration 测试数据
  const ecCnt: any = await query('SELECT COUNT(*) as cnt FROM eqp_calibration');
  if (ecCnt[0]?.cnt === 0) {
    const calibrations = [
      ['EC20260601001', 6, 'EQ006', '色差仪F', '2026-06-01', '2026-12-01', '国家计量院', 'qualified', 'CERT20260601', 500, ''],
      ['EC20260602001', 7, 'EQ007', '厚度仪G', '2026-06-02', '2026-12-02', '省计量所', 'qualified', 'CERT20260602', 300, ''],
      ['EC20260603001', 8, 'EQ008', '电子秤H', '2026-06-03', '2026-09-03', '市计量站', 'unqualified', 'CERT20260603', 200, '需重新校准'],
    ];
    for (const c of calibrations) {
      await execute(
        `INSERT INTO eqp_calibration (calibration_no, equipment_id, equipment_code, equipment_name, calibration_date, next_calibration_date, calibration_org, calibration_result, certificate_no, calibration_cost, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        c
      );
    }
    results.push('eqp_calibration: 3 records');
  }

  // srm_supplier_eval 测试数据
  const seCnt: any = await query('SELECT COUNT(*) as cnt FROM srm_supplier_eval');
  if (seCnt[0]?.cnt === 0) {
    const evals = [
      ['SE20260601001', 1, '越南材料公司', 'month', '2026-05-01', '2026-05-31', 92, 88, 85, 90, 88.8, 96.5, 92.0, 12, 1, 'A', 2, '李评估', '2026-06-01', ''],
      ['SE20260601002', 2, '胡志明油墨厂', 'month', '2026-05-01', '2026-05-31', 85, 78, 90, 82, 83.8, 90.0, 85.0, 8, 2, 'B', 1, '李评估', '2026-06-01', '交付需改善'],
      ['SE20260602001', 3, '河内设备商', 'month', '2026-05-01', '2026-05-31', 70, 65, 80, 75, 72.5, 82.0, 70.0, 3, 3, 'C', 0, '王评估', '2026-06-02', '需重点跟进'],
    ];
    for (const e of evals) {
      await execute(
        `INSERT INTO srm_supplier_eval (eval_no, supplier_id, supplier_name, eval_period, period_start, period_end, quality_score, delivery_score, price_score, service_score, total_score, quality_rate, on_time_rate, order_count, defect_count, supplier_level, status, evaluator, eval_time, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        e
      );
    }
    results.push('srm_supplier_eval: 3 records');
  }

  // outsource_order 测试数据
  const ooCnt: any = await query('SELECT COUNT(*) as cnt FROM outsource_order');
  if (ooCnt[0]?.cnt === 0) {
    const oorders = [
      ['OO20260601001', 1, 'WO001', 1, '越南材料公司', 1, 'P001', 'PET薄膜标签', 2000, '件', 0.50, 1000, '2026-06-15', 'process', '丝印工序', 2, ''],
      ['OO20260601002', 2, 'WO002', 2, '胡志明油墨厂', 2, 'P002', 'PVC薄膜标签', 3000, '件', 0.35, 1050, '2026-06-18', 'process', '模切工序', 1, ''],
      ['OO20260602001', 3, 'WO003', 1, '越南材料公司', 3, 'P003', '不干胶标签', 5000, '件', 0.25, 1250, '2026-06-20', 'process', '覆膜工序', 0, ''],
    ];
    for (const o of oorders) {
      await execute(
        `INSERT INTO outsource_order (order_no, work_order_id, work_order_no, supplier_id, supplier_name, product_id, product_code, product_name, plan_qty, unit, unit_price, total_amount, delivery_date, outsource_type, process_name, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        o
      );
    }
    results.push('outsource_order: 3 records');
  }

  // outsource_issue 测试数据
  const oiCnt: any = await query('SELECT COUNT(*) as cnt FROM outsource_issue');
  if (oiCnt[0]?.cnt === 0) {
    const oissues = [
      ['OIS20260601001', 1, 'OO20260601001', 1, '2026-06-05', 2, '王操作', ''],
      ['OIS20260601002', 2, 'OO20260601002', 1, '2026-06-06', 1, '李操作', ''],
    ];
    for (const i of oissues) {
      await execute(
        `INSERT INTO outsource_issue (issue_no, outsource_order_id, outsource_order_no, warehouse_id, issue_date, status, operator_name, remark) VALUES (?,?,?,?,?,?,?,?)`,
        i
      );
    }
    results.push('outsource_issue: 2 records');
  }

  // outsource_receive 测试数据
  const orCnt: any = await query('SELECT COUNT(*) as cnt FROM outsource_receive');
  if (orCnt[0]?.cnt === 0) {
    const oreceives = [
      ['ORC20260615001', 1, 'OO20260601001', 1, '2026-06-15', 2000, 1980, 20, 'qualified', 2, '王操作', ''],
      ['ORC20260618001', 2, 'OO20260601002', 1, '2026-06-18', 3000, 2950, 50, 'partial', 1, '李操作', '部分不良'],
    ];
    for (const r of oreceives) {
      await execute(
        `INSERT INTO outsource_receive (receive_no, outsource_order_id, outsource_order_no, warehouse_id, receive_date, receive_qty, qualified_qty, defective_qty, qc_status, status, operator_name, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        r
      );
    }
    results.push('outsource_receive: 2 records');
  }

  // outsource_settlement 测试数据
  const osCnt: any = await query('SELECT COUNT(*) as cnt FROM outsource_settlement');
  if (osCnt[0]?.cnt === 0) {
    const osettlements = [
      ['OS20260620001', 1, 'OO20260601001', 1, '越南材料公司', '2026-06-20', 1980, 0.50, 990, 20, 970, 'paid', 2, ''],
      ['OS20260625001', 2, 'OO20260601002', 2, '胡志明油墨厂', '2026-06-25', 2950, 0.35, 1032.5, 50, 982.5, 'unpaid', 1, ''],
    ];
    for (const s of osettlements) {
      await execute(
        `INSERT INTO outsource_settlement (settlement_no, outsource_order_id, outsource_order_no, supplier_id, supplier_name, settlement_date, settlement_qty, unit_price, settlement_amount, deduct_amount, actual_amount, payment_status, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        s
      );
    }
    results.push('outsource_settlement: 2 records');
  }

  // fin_cost_record 测试数据
  const fcCnt: any = await query('SELECT COUNT(*) as cnt FROM fin_cost_record');
  if (fcCnt[0]?.cnt === 0) {
    const costs = [
      ['FC20260601001', 'material', '原材料', '2026-06-01', 25000, 'ORD001', 'PET薄膜标签', '印刷车间', 'PET材料采购', 1, ''],
      ['FC20260601002', 'material', '原材料', '2026-06-01', 18000, 'ORD002', 'PVC薄膜标签', '印刷车间', 'PVC材料采购', 1, ''],
      ['FC20260602001', 'labor', '人工', '2026-06-02', 15000, null, '', '印刷车间', '6月工资', 1, ''],
      ['FC20260602002', 'overhead', '制造费用', '2026-06-02', 8000, null, '', '全厂', '电费分摊', 1, ''],
      ['FC20260603001', 'material', '原材料', '2026-06-03', 12000, 'ORD003', '不干胶标签', '模切车间', '不干胶材料采购', 1, ''],
      ['FC20260603002', 'outsource', '委外费用', '2026-06-03', 990, 'OO20260601001', 'PET薄膜标签', '外协', '委外丝印', 1, ''],
    ];
    for (const c of costs) {
      await execute(
        `INSERT INTO fin_cost_record (cost_no, cost_type, cost_category, cost_date, amount, order_no, product_name, department, description, status, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        c
      );
    }
    results.push('fin_cost_record: 6 records');
  }

  // purchase_request 测试数据 - 使用实际表名 pur_request
  const prCnt: any = await query('SELECT COUNT(*) as cnt FROM pur_request');
  if (prCnt[0]?.cnt === 0) {
    const requests = [
      ['PR20260601001', '2026-06-01', 'material', '印刷车间', '张采购', 25000, 'CNY', 2, 1, '2026-06-10', '越南材料公司', '库存不足，需补货'],
      ['PR20260601002', '2026-06-01', 'material', '印刷车间', '张采购', 5000, 'CNY', 1, 2, '2026-06-12', '胡志明油墨厂', '生产需求'],
      ['PR20260602001', '2026-06-02', 'material', '模切车间', '李采购', 4000, 'CNY', 0, 1, '2026-06-15', '', 'UV油墨库存预警'],
    ];
    for (const r of requests) {
      await execute(
        `INSERT INTO pur_request (request_no, request_date, request_type, request_dept, requester_name, total_amount, currency, status, priority, expected_date, supplier_name, remark) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        r
      );
    }
    results.push('pur_request: 3 records');
  }

  return successResponse(results, 'Tables created successfully');
});
