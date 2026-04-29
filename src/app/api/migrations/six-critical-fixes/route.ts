import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

async function tableExists(name: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return (rows as any[]).length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return (rows as any[]).length > 0;
}

async function addColumnSafe(table: string, column: string, definition: string) {
  if (!(await columnExists(table, column))) {
    await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return `Added ${table}.${column}`;
  }
  return `Already exists: ${table}.${column}`;
}

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return (rows as any[]).length > 0;
}

async function addIndexSafe(table: string, indexName: string, columns: string) {
  if (!(await indexExists(table, indexName))) {
    await execute(`ALTER TABLE ${table} ADD INDEX ${indexName} (${columns})`);
    return `Added index ${indexName} on ${table}`;
  }
  return `Already exists: index ${indexName} on ${table}`;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const step = searchParams.get('step') || 'all';
  const results: string[] = [];

  // ============================================================
  // 【1】统一采购订单表
  // ============================================================
  if (step === 'all' || step === '1') {
    results.push('===== 【1】统一采购订单表 =====');

    if (!(await tableExists('std_purchase_order'))) {
      await execute(`
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
      `);
      results.push('Created std_purchase_order');
    } else {
      results.push('Already exists: std_purchase_order');
    }

    if (!(await tableExists('std_purchase_order_line'))) {
      await execute(`
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
      `);
      results.push('Created std_purchase_order_line');
    } else {
      results.push('Already exists: std_purchase_order_line');
    }

    try {
      const po1Count = await query('SELECT COUNT(*) as cnt FROM pur_order WHERE deleted = 0');
      const cnt1 = (po1Count as any[])[0]?.cnt || 0;
      if (cnt1 > 0) {
        await execute(`
          INSERT IGNORE INTO std_purchase_order (order_no, supplier_id, supplier_name, order_date, delivery_date, currency, exchange_rate, total_amount, tax_amount, grand_total, status, payment_terms, delivery_address, contact_person, contact_phone, remark, create_by, create_time, update_by, update_time, legacy_source, legacy_id)
          SELECT order_no, supplier_id, '', order_date, delivery_date, currency, exchange_rate, total_amount, tax_amount, total_with_tax,
            CASE status WHEN 1 THEN 0 WHEN 2 THEN 4 WHEN 3 THEN 5 WHEN 4 THEN 6 WHEN 5 THEN 8 ELSE 0 END,
            payment_terms, delivery_address, contact_name, contact_phone, remark, create_by, create_time, update_by, update_time, 'pur_order', id
          FROM pur_order WHERE deleted = 0
        `);
        results.push(`Migrated ${cnt1} rows from pur_order`);
      } else {
        results.push('No data in pur_order to migrate');
      }
    } catch (e: any) {
      results.push(`Migrate pur_order skipped: ${e.message}`);
    }

    try {
      const po2Count = await query('SELECT COUNT(*) as cnt FROM pur_purchase_order WHERE deleted = 0');
      const cnt2 = (po2Count as any[])[0]?.cnt || 0;
      if (cnt2 > 0) {
        await execute(`
          INSERT IGNORE INTO std_purchase_order (order_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total, status, over_receipt_tolerance, payment_terms, delivery_address, contact_person, contact_phone, remark, create_by, create_time, update_by, update_time, approve_by, approve_time, close_by, close_time, close_reason, legacy_source, legacy_id)
          SELECT po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, currency, exchange_rate, total_amount, total_quantity, tax_rate, tax_amount, grand_total,
            CASE status WHEN 10 THEN 0 WHEN 20 THEN 2 WHEN 30 THEN 4 WHEN 40 THEN 5 WHEN 50 THEN 6 WHEN 90 THEN 8 ELSE 0 END,
            over_receipt_tolerance, payment_terms, delivery_address, contact_person, contact_phone, remark, create_by, create_time, update_by, update_time, audit_by, audit_time, close_by, close_time, close_reason, 'pur_purchase_order', id
          FROM pur_purchase_order WHERE deleted = 0
        `);
        results.push(`Migrated ${cnt2} rows from pur_purchase_order`);
      } else {
        results.push('No data in pur_purchase_order to migrate');
      }
    } catch (e: any) {
      results.push(`Migrate pur_purchase_order skipped: ${e.message}`);
    }

    try {
      const pod1Count = await query('SELECT COUNT(*) as cnt FROM pur_order_detail');
      const cnt1 = (pod1Count as any[])[0]?.cnt || 0;
      if (cnt1 > 0) {
        await execute(`
          INSERT IGNORE INTO std_purchase_order_line (order_id, line_no, material_id, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, tax_rate, tax_amount, line_total, require_date, remark, create_time)
          SELECT spo.id, ROW_NUMBER() OVER(PARTITION BY pod.order_id ORDER BY pod.id), pod.material_id, im.material_code, im.material_name, im.specification, pod.unit, pod.quantity, pod.received_qty, pod.unit_price, pod.amount, pod.tax_rate, pod.tax_amount, pod.total_amount, pod.delivery_date, pod.remark, pod.create_time
          FROM pur_order_detail pod
          JOIN pur_order po ON pod.order_id = po.id AND po.deleted = 0
          JOIN std_purchase_order spo ON spo.legacy_source = 'pur_order' AND spo.legacy_id = po.id
          LEFT JOIN inv_material im ON pod.material_id = im.id
        `);
        results.push(`Migrated ${cnt1} rows from pur_order_detail`);
      }
    } catch (e: any) {
      results.push(`Migrate pur_order_detail skipped: ${e.message}`);
    }

    try {
      const pod2Count = await query('SELECT COUNT(*) as cnt FROM pur_purchase_order_line');
      const cnt2 = (pod2Count as any[])[0]?.cnt || 0;
      if (cnt2 > 0) {
        await execute(`
          INSERT IGNORE INTO std_purchase_order_line (order_id, line_no, material_id, material_code, material_name, material_spec, unit, order_qty, received_qty, returned_qty, unit_price, amount, tax_rate, tax_amount, line_total, require_date, closed_flag, closed_reason, remark, create_time, update_time)
          SELECT spo.id, pol.line_no, pol.material_id, pol.material_code, pol.material_name, pol.material_spec, pol.unit, pol.order_qty, pol.received_qty, pol.returned_qty, pol.unit_price, pol.amount, pol.tax_rate, pol.tax_amount, pol.line_total, pol.require_date, pol.closed_flag, pol.closed_reason, pol.remark, pol.create_time, pol.update_time
          FROM pur_purchase_order_line pol
          JOIN pur_purchase_order po ON pol.po_id = po.id AND po.deleted = 0
          JOIN std_purchase_order spo ON spo.legacy_source = 'pur_purchase_order' AND spo.legacy_id = po.id
        `);
        results.push(`Migrated ${cnt2} rows from pur_purchase_order_line`);
      }
    } catch (e: any) {
      results.push(`Migrate pur_purchase_order_line skipped: ${e.message}`);
    }
  }

  // ============================================================
  // 【2】统一BOM表
  // ============================================================
  if (step === 'all' || step === '2') {
    results.push('===== 【2】统一BOM表 =====');

    if (!(await tableExists('std_bom_header'))) {
      await execute(`
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
      `);
      results.push('Created std_bom_header');
    } else {
      results.push('Already exists: std_bom_header');
    }

    if (!(await tableExists('std_bom_line'))) {
      await execute(`
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
      `);
      results.push('Created std_bom_line');
    } else {
      results.push('Already exists: std_bom_line');
    }

    try {
      const bom1Count = await query('SELECT COUNT(*) as cnt FROM prd_bom WHERE deleted = 0');
      const cnt1 = (bom1Count as any[])[0]?.cnt || 0;
      if (cnt1 > 0) {
        await execute(`
          INSERT IGNORE INTO std_bom_header (bom_no, product_id, product_code, product_name, version, status, total_cost, remark, create_by, create_time, legacy_source, legacy_id)
          SELECT CONCAT('BOM-PRD-', pb.id), pb.product_id, '', pb.bom_name, pb.version,
            CASE pb.status WHEN 0 THEN 2 WHEN 1 THEN 1 ELSE 0 END,
            pb.total_cost, pb.remark, pb.create_by, pb.create_time, 'prd_bom', pb.id
          FROM prd_bom pb WHERE pb.deleted = 0
        `);
        results.push(`Migrated ${cnt1} rows from prd_bom`);
      }
    } catch (e: any) {
      results.push(`Migrate prd_bom skipped: ${e.message}`);
    }

    try {
      const bomDetailCount = await query('SELECT COUNT(*) as cnt FROM prd_bom_detail');
      const cnt = (bomDetailCount as any[])[0]?.cnt || 0;
      if (cnt > 0) {
        await execute(`
          INSERT IGNORE INTO std_bom_line (bom_id, line_no, material_id, material_code, material_name, unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost, material_type, remark, create_time)
          SELECT sbh.id, ROW_NUMBER() OVER(PARTITION BY pbd.bom_id ORDER BY pbd.id), pbd.material_id, '', pbd.material_name, pbd.unit, pbd.quantity, pbd.loss_rate, pbd.quantity, pbd.unit_cost, pbd.total_cost,
            CASE pbd.item_type WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 ELSE 5 END,
            pbd.remark, pbd.create_time
          FROM prd_bom_detail pbd
          JOIN prd_bom pb ON pbd.bom_id = pb.id AND pb.deleted = 0
          JOIN std_bom_header sbh ON sbh.legacy_source = 'prd_bom' AND sbh.legacy_id = pb.id
        `);
        results.push(`Migrated ${cnt} rows from prd_bom_detail`);
      }
    } catch (e: any) {
      results.push(`Migrate prd_bom_detail skipped: ${e.message}`);
    }

    try {
      const bom2Count = await query('SELECT COUNT(*) as cnt FROM bom_header WHERE deleted = 0');
      const cnt2 = (bom2Count as any[])[0]?.cnt || 0;
      if (cnt2 > 0) {
        await execute(`
          INSERT IGNORE INTO std_bom_header (bom_no, product_id, product_code, product_name, product_spec, version, is_default, status, unit, base_qty, total_material_count, total_cost, remark, create_by, create_time, update_by, update_time, approve_by, approve_time, publish_time, legacy_source, legacy_id)
          SELECT bh.bom_no, bh.product_id, bh.product_code, bh.product_name, bh.product_spec, bh.version, bh.is_default,
            CASE bh.status WHEN 10 THEN 0 WHEN 20 THEN 1 WHEN 30 THEN 2 ELSE 0 END,
            bh.unit, bh.base_qty, bh.total_material_count, bh.total_cost, bh.remark, bh.create_by, bh.create_time, bh.update_by, bh.update_time, bh.audit_by, bh.audit_time, bh.publish_time, 'bom_header', bh.id
          FROM bom_header bh WHERE bh.deleted = 0
        `);
        results.push(`Migrated ${cnt2} rows from bom_header`);
      }
    } catch (e: any) {
      results.push(`Migrate bom_header skipped: ${e.message}`);
    }

    try {
      const bomLineCount = await query('SELECT COUNT(*) as cnt FROM bom_line');
      const cnt = (bomLineCount as any[])[0]?.cnt || 0;
      if (cnt > 0) {
        await execute(`
          INSERT IGNORE INTO std_bom_line (bom_id, line_no, parent_line_id, level, material_id, material_code, material_name, material_spec, unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost, material_type, is_key_material, position_no, process_seq, process_name, remark, create_time, update_time)
          SELECT sbh.id, bl.line_no, bl.parent_line_id, bl.level, bl.material_id, bl.material_code, bl.material_name, bl.material_spec, bl.unit, bl.consumption_qty, bl.loss_rate, bl.actual_qty, bl.unit_cost, bl.total_cost,
            CASE bl.material_type WHEN 'RAW' THEN 1 WHEN 'SEMI' THEN 2 WHEN 'SUB' THEN 3 WHEN 'PKG' THEN 4 ELSE 5 END,
            bl.is_key_material, bl.position_no, bl.process_seq, bl.process_name, bl.remark, bl.create_time, bl.update_time
          FROM bom_line bl
          JOIN bom_header bh ON bl.bom_id = bh.id AND bh.deleted = 0
          JOIN std_bom_header sbh ON sbh.legacy_source = 'bom_header' AND sbh.legacy_id = bh.id
        `);
        results.push(`Migrated ${cnt} rows from bom_line`);
      }
    } catch (e: any) {
      results.push(`Migrate bom_line skipped: ${e.message}`);
    }

    try {
      const bom3Count = await query('SELECT COUNT(*) as cnt FROM mdm_product_bom');
      const cnt3 = (bom3Count as any[])[0]?.cnt || 0;
      if (cnt3 > 0) {
        results.push(`mdm_product_bom has ${cnt3} rows - requires manual mapping`);
      } else {
        results.push('No data in mdm_product_bom');
      }
    } catch (e: any) {
      results.push(`mdm_product_bom check skipped: ${e.message}`);
    }
  }

  // ============================================================
  // 【3】统一物料主档
  // ============================================================
  if (step === 'all' || step === '3') {
    results.push('===== 【3】统一物料主档 =====');

    if (!(await tableExists('std_material'))) {
      await execute(`
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
      `);
      results.push('Created std_material');
    } else {
      results.push('Already exists: std_material');
    }

    try {
      const invMatCount = await query('SELECT COUNT(*) as cnt FROM inv_material WHERE deleted = 0');
      const cnt = (invMatCount as any[])[0]?.cnt || 0;
      if (cnt > 0) {
        await execute(`
          INSERT IGNORE INTO std_material (material_code, material_name, specification, category_id, material_type, unit, barcode, brand, safety_stock, max_stock, min_stock, purchase_price, sale_price, cost_price, warehouse_id, shelf_life, warning_days, is_batch_managed, is_serial_managed, status, remark, create_by, create_time, update_by, update_time, legacy_source, legacy_id)
          SELECT material_code, material_name, specification, category_id, material_type, unit, barcode, brand, safety_stock, max_stock, min_stock, purchase_price, sale_price, cost_price, warehouse_id, shelf_life, warning_days, is_batch_managed, is_serial_managed, status, remark, create_by, create_time, update_by, update_time, 'inv_material', id
          FROM inv_material WHERE deleted = 0
        `);
        results.push(`Migrated ${cnt} rows from inv_material`);
      }
    } catch (e: any) {
      results.push(`Migrate inv_material skipped: ${e.message}`);
    }

    try {
      const bomMatCount = await query('SELECT COUNT(*) as cnt FROM bom_material WHERE deleted = 0');
      const cnt = (bomMatCount as any[])[0]?.cnt || 0;
      if (cnt > 0) {
        await execute(`
          INSERT IGNORE INTO std_material (material_code, material_name, specification, material_type, unit, cost_price, safety_stock, default_supplier_id, default_supplier_name, is_active, remark, create_time, update_time, legacy_source, legacy_id)
          SELECT material_code, material_name, material_spec,
            CASE material_type WHEN 'RAW' THEN 1 WHEN 'SEMI' THEN 2 WHEN 'FINISHED' THEN 3 WHEN 'SUB' THEN 4 WHEN 'PKG' THEN 5 ELSE 6 END,
            unit, unit_cost, safety_stock, default_supplier_id, default_supplier_name, is_active, remark, create_time, update_time, 'bom_material', id
          FROM bom_material WHERE deleted = 0
        `);
        results.push(`Migrated ${cnt} rows from bom_material`);
      }
    } catch (e: any) {
      results.push(`Migrate bom_material skipped: ${e.message}`);
    }

    try {
      const mdmMatCount = await query('SELECT COUNT(*) as cnt FROM mdm_material');
      const cnt = (mdmMatCount as any[])[0]?.cnt || 0;
      if (cnt > 0) {
        results.push(`mdm_material has ${cnt} rows - requires field mapping`);
      }
    } catch (e: any) {
      results.push(`mdm_material check skipped: ${e.message}`);
    }
  }

  // ============================================================
  // 【4】修复HRM考勤表员工ID
  // ============================================================
  if (step === 'all' || step === '4') {
    results.push('===== 【4】修复HRM考勤表员工ID =====');

    if (!(await tableExists('hr_attendance'))) {
      await execute(`
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
      `);
      results.push('Created hr_attendance with employee_id_int');
    } else {
      try {
        results.push(await addColumnSafe('hr_attendance', 'employee_id_int', "INT UNSIGNED DEFAULT NULL COMMENT '员工ID(标准INT)' AFTER employee_id"));

        await execute(`
          UPDATE hr_attendance ha
          LEFT JOIN sys_employee se ON ha.employee_id COLLATE utf8mb4_unicode_ci = CAST(se.id AS CHAR)
          SET ha.employee_id_int = se.id
          WHERE ha.employee_id_int IS NULL AND se.id IS NOT NULL
        `);
        results.push('Backfilled employee_id_int from sys_employee');

        const nullCount = await query('SELECT COUNT(*) as cnt FROM hr_attendance WHERE employee_id_int IS NULL AND employee_id IS NOT NULL AND deleted = 0');
        const nullCnt = (nullCount as any[])[0]?.cnt || 0;
        if (nullCnt > 0) {
          results.push(`WARNING: ${nullCnt} rows could not be matched to sys_employee`);
        }

        results.push(await addIndexSafe('hr_attendance', 'idx_hr_attendance_employee_id_int', 'employee_id_int'));
      } catch (e: any) {
        results.push(`Fix hr_attendance skipped: ${e.message}`);
      }
    }
  }

  // ============================================================
  // 【5】创建出库批次分配表
  // ============================================================
  if (step === 'all' || step === '5') {
    results.push('===== 【5】创建出库批次分配表 =====');

    if (!(await tableExists('inv_outbound_batch_allocation'))) {
      await execute(`
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
      `);
      results.push('Created inv_outbound_batch_allocation');
    } else {
      results.push('Already exists: inv_outbound_batch_allocation');
    }
  }

  return successResponse(results, '迁移完成');
}, '迁移失败');
