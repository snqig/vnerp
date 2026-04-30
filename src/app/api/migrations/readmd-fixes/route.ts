import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';
import type { NextRequest } from 'next/server';

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
  // 【1】标准物料主档 inv_material_std（三合一）
  // ============================================================
  if (step === 'all' || step === '1') {
    results.push('===== 【1】标准物料主档 inv_material_std =====');

    if (!(await tableExists('inv_material_std'))) {
      await execute(`
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
          created_by BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          updated_by BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
          deleted TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          UNIQUE KEY uk_material_code (material_code),
          INDEX idx_material_type (material_type),
          INDEX idx_category_id (category_id),
          INDEX idx_legacy (legacy_source, legacy_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准物料主档'
      `);
      results.push('Created inv_material_std');
    } else {
      results.push('Already exists: inv_material_std');
    }

    if (await tableExists('inv_material')) {
      const res = await execute(`
        INSERT IGNORE INTO inv_material_std (material_code, material_name, material_spec, unit, material_type, is_batch, is_expire, safe_stock, legacy_source, legacy_id)
        SELECT
          COALESCE(material_code, CONCAT('MAT-', im.id)),
          COALESCE(material_name, ''),
          COALESCE(specification, ''),
          COALESCE(unit, '个'),
          CASE
            WHEN material_type IN (1,2,3,4,5) THEN material_type
            WHEN category_id = 1 THEN 1
            WHEN category_id = 2 THEN 2
            WHEN category_id = 3 THEN 3
            ELSE 1
          END,
          COALESCE(is_batch_managed, 1),
          COALESCE(shelf_life, 0) > 0,
          COALESCE(safety_stock, 0),
          'inv_material',
          im.id
        FROM inv_material im
        WHERE im.deleted = 0
      `);
      results.push(`Migrated ${res.affectedRows} rows from inv_material`);
    }

    if (await tableExists('bom_material')) {
      const res = await execute(`
        INSERT IGNORE INTO inv_material_std (material_code, material_name, material_spec, unit, material_type, is_batch, is_expire, safe_stock, legacy_source, legacy_id)
        SELECT
          COALESCE(material_code, CONCAT('BMAT-', bm.id)),
          COALESCE(material_name, ''),
          COALESCE(material_spec, ''),
          COALESCE(unit, '个'),
          1,
          1,
          0,
          0,
          'bom_material',
          bm.id
        FROM bom_material bm
        WHERE bm.deleted = 0
      `);
      results.push(`Migrated ${res.affectedRows} rows from bom_material`);
    }

    if (await tableExists('mdm_material')) {
      try {
        const res = await execute(`
          INSERT IGNORE INTO inv_material_std (material_code, material_name, material_spec, unit, material_type, is_batch, is_expire, safe_stock, legacy_source, legacy_id)
          SELECT
            COALESCE(material_code, CONCAT('MMAT-', mm.id)),
            COALESCE(material_name, ''),
            COALESCE(material_spec, ''),
            COALESCE(unit, '个'),
            COALESCE(material_type, 1),
            1,
            0,
            0,
            'mdm_material',
            mm.id
          FROM mdm_material mm
          WHERE mm.deleted = 0
        `);
        results.push(`Migrated ${res.affectedRows} rows from mdm_material`);
      } catch (e: any) {
        results.push(`mdm_material migration skipped: ${e.message}`);
      }
    }
  }

  // ============================================================
  // 【2】标准BOM prd_bom_std + prd_bom_line_std（三合一）
  // ============================================================
  if (step === 'all' || step === '2') {
    results.push('===== 【2】标准BOM prd_bom_std + prd_bom_line_std =====');

    if (!(await tableExists('prd_bom_std'))) {
      await execute(`
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
          created_by BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
          updated_by BIGINT UNSIGNED DEFAULT NULL COMMENT '更新人ID',
          deleted TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
          PRIMARY KEY (id),
          UNIQUE KEY uk_bom_code (bom_code),
          INDEX idx_product_id (product_id),
          INDEX idx_status (status),
          INDEX idx_effective_date (effective_date),
          INDEX idx_legacy (legacy_source, legacy_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准BOM头'
      `);
      results.push('Created prd_bom_std');
    } else {
      results.push('Already exists: prd_bom_std');
    }

    if (!(await tableExists('prd_bom_line_std'))) {
      await execute(`
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
      `);
      results.push('Created prd_bom_line_std');
    } else {
      results.push('Already exists: prd_bom_line_std');
    }

    if (await tableExists('prd_bom')) {
      const res = await execute(`
        INSERT IGNORE INTO prd_bom_std (bom_code, product_id, product_name, version, effective_date, status, legacy_source, legacy_id)
        SELECT
          COALESCE(bom_name, CONCAT('BOM-', pb.id)),
          COALESCE(product_id, 0),
          '',
          COALESCE(version, 'V1.0'),
          CURDATE(),
          CASE
            WHEN status IN (0,1,2) THEN status
            ELSE 1
          END,
          'prd_bom',
          pb.id
        FROM prd_bom pb
        WHERE pb.deleted = 0
      `);
      results.push(`Migrated ${res.affectedRows} rows from prd_bom`);
    }

    if (await tableExists('prd_bom_detail')) {
      const res = await execute(`
        INSERT IGNORE INTO prd_bom_line_std (bom_id, line_no, material_id, material_code, material_name, consumption_qty, waste_rate, material_type)
        SELECT
          bs.id,
          ROW_NUMBER() OVER (PARTITION BY pbd.bom_id ORDER BY pbd.id),
          COALESCE(pbd.material_id, 0),
          '',
          COALESCE(pbd.material_name, ''),
          COALESCE(pbd.quantity, 0),
          COALESCE(pbd.loss_rate, 0),
          COALESCE(pbd.item_type, 1)
        FROM prd_bom_detail pbd
        JOIN prd_bom_std bs ON bs.legacy_source = 'prd_bom' AND bs.legacy_id = pbd.bom_id
      `);
      results.push(`Migrated ${res.affectedRows} rows from prd_bom_detail`);
    }

    if (await tableExists('bom_header')) {
      const res = await execute(`
        INSERT IGNORE INTO prd_bom_std (bom_code, product_id, product_name, version, effective_date, status, legacy_source, legacy_id)
        SELECT
          COALESCE(bom_no, CONCAT('BOMH-', bh.id)),
          COALESCE(product_id, 0),
          COALESCE(product_name, ''),
          COALESCE(version, 'V1.0'),
          COALESCE(publish_time, create_time, CURDATE()),
          CASE
            WHEN status IN (0,1,2) THEN status
            ELSE 1
          END,
          'bom_header',
          bh.id
        FROM bom_header bh
        WHERE bh.deleted = 0
      `);
      results.push(`Migrated ${res.affectedRows} rows from bom_header`);

      if (await tableExists('bom_line')) {
        const res2 = await execute(`
          INSERT IGNORE INTO prd_bom_line_std (bom_id, line_no, material_id, material_code, material_name, consumption_qty, waste_rate, material_type)
          SELECT
            bs.id,
            COALESCE(bl.line_no, ROW_NUMBER() OVER (PARTITION BY bl.bom_id ORDER BY bl.id)),
            COALESCE(bl.material_id, 0),
            COALESCE(bl.material_code, ''),
            COALESCE(bl.material_name, ''),
            COALESCE(bl.consumption_qty, 0),
            COALESCE(bl.loss_rate, 0),
            CASE
              WHEN bl.material_type = 'raw' THEN 1
              WHEN bl.material_type = 'semi' THEN 2
              WHEN bl.material_type = 'finished' THEN 3
              ELSE 1
            END
          FROM bom_line bl
          JOIN prd_bom_std bs ON bs.legacy_source = 'bom_header' AND bs.legacy_id = bl.bom_id
        `);
        results.push(`Migrated ${res2.affectedRows} rows from bom_line`);
      }
    }
  }

  // ============================================================
  // 【3】标准采购订单 pur_order_std + pur_order_line_std（二合一）
  // ============================================================
  if (step === 'all' || step === '3') {
    results.push('===== 【3】标准采购订单 pur_order_std + pur_order_line_std =====');

    if (!(await tableExists('pur_order_std'))) {
      await execute(`
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
      `);
      results.push('Created pur_order_std');
    } else {
      results.push('Already exists: pur_order_std');
    }

    if (!(await tableExists('pur_order_line_std'))) {
      await execute(`
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
      `);
      results.push('Created pur_order_line_std');
    } else {
      results.push('Already exists: pur_order_line_std');
    }

    if (await tableExists('pur_order')) {
      const res = await execute(`
        INSERT IGNORE INTO pur_order_std (po_code, request_id, supplier_id, supplier_name, order_date, delivery_date, total_amount, tax_amount, grand_total, status, payment_terms, delivery_address, contact_person, contact_phone, remark, legacy_source, legacy_id)
        SELECT
          COALESCE(order_no, CONCAT('PO-', po.id)),
          NULL,
          COALESCE(supplier_id, 0),
          '',
          COALESCE(order_date, CURDATE()),
          COALESCE(delivery_date, NULL),
          COALESCE(total_amount, 0),
          COALESCE(tax_amount, 0),
          COALESCE(total_with_tax, 0),
          CASE
            WHEN status IN (0,1,2,3,4,5,6,9) THEN status
            ELSE 0
          END,
          COALESCE(payment_terms, NULL),
          COALESCE(delivery_address, NULL),
          COALESCE(contact_name, NULL),
          COALESCE(contact_phone, NULL),
          COALESCE(remark, NULL),
          'pur_order',
          po.id
        FROM pur_order po
        WHERE po.deleted = 0
      `);
      results.push(`Migrated ${res.affectedRows} rows from pur_order`);

      if (await tableExists('pur_order_detail')) {
        const res2 = await execute(`
          INSERT IGNORE INTO pur_order_line_std (po_id, line_no, material_id, material_code, material_name, material_spec, order_qty, price, amount, received_qty)
          SELECT
            ps.id,
            ROW_NUMBER() OVER (PARTITION BY pod.order_id ORDER BY pod.id),
            COALESCE(pod.material_id, 0),
            '',
            '',
            '',
            COALESCE(pod.quantity, 0),
            COALESCE(pod.unit_price, 0),
            COALESCE(pod.amount, 0),
            COALESCE(pod.received_qty, 0)
          FROM pur_order_detail pod
          JOIN pur_order_std ps ON ps.legacy_source = 'pur_order' AND ps.legacy_id = pod.order_id
        `);
        results.push(`Migrated ${res2.affectedRows} rows from pur_order_detail`);
      }
    }

    if (await tableExists('pur_purchase_order')) {
      const res = await execute(`
        INSERT IGNORE INTO pur_order_std (po_code, request_id, supplier_id, supplier_name, order_date, delivery_date, total_amount, tax_amount, grand_total, status, payment_terms, delivery_address, contact_person, contact_phone, remark, legacy_source, legacy_id)
        SELECT
          COALESCE(po_no, CONCAT('PPO-', ppo.id)),
          NULL,
          COALESCE(supplier_id, 0),
          COALESCE(supplier_name, ''),
          COALESCE(order_date, CURDATE()),
          COALESCE(delivery_date, NULL),
          COALESCE(total_amount, 0),
          COALESCE(tax_amount, 0),
          COALESCE(grand_total, 0),
          CASE
            WHEN status IN (0,1,2,3,4,5,6,9) THEN status
            WHEN status = 10 THEN 0
            WHEN status = 20 THEN 2
            WHEN status = 30 THEN 3
            WHEN status = 40 THEN 5
            WHEN status = 50 THEN 6
            WHEN status = 90 THEN 9
            ELSE 0
          END,
          COALESCE(payment_terms, NULL),
          COALESCE(delivery_address, NULL),
          COALESCE(contact_person, NULL),
          COALESCE(contact_phone, NULL),
          COALESCE(remark, NULL),
          'pur_purchase_order',
          ppo.id
        FROM pur_purchase_order ppo
        WHERE ppo.deleted = 0
      `);
      results.push(`Migrated ${res.affectedRows} rows from pur_purchase_order`);

      if (await tableExists('pur_purchase_order_line')) {
        const res2 = await execute(`
          INSERT IGNORE INTO pur_order_line_std (po_id, line_no, material_id, material_code, material_name, material_spec, order_qty, price, amount, received_qty)
          SELECT
            ps.id,
            COALESCE(ppol.line_no, ROW_NUMBER() OVER (PARTITION BY ppol.po_id ORDER BY ppol.id)),
            COALESCE(ppol.material_id, 0),
            COALESCE(ppol.material_code, ''),
            COALESCE(ppol.material_name, ''),
            COALESCE(ppol.material_spec, ''),
            COALESCE(ppol.order_qty, 0),
            COALESCE(ppol.unit_price, 0),
            COALESCE(ppol.amount, 0),
            COALESCE(ppol.received_qty, 0)
          FROM pur_purchase_order_line ppol
          JOIN pur_order_std ps ON ps.legacy_source = 'pur_purchase_order' AND ps.legacy_id = ppol.po_id
        `);
        results.push(`Migrated ${res2.affectedRows} rows from pur_purchase_order_line`);
      }
    }
  }

  // ============================================================
  // 【4】HR考勤ID修复
  // ============================================================
  if (step === 'all' || step === '4') {
    results.push('===== 【4】HR考勤ID修复 =====');

    if (await tableExists('hr_attendance')) {
      const r1 = await addColumnSafe('hr_attendance', 'emp_id', 'INT UNSIGNED NULL COMMENT \'关联员工ID\'');
      results.push(r1);

      try {
        const res = await execute(`
          UPDATE hr_attendance a
          JOIN sys_employee e ON a.employee_id COLLATE utf8mb4_unicode_ci = CONCAT('EMP', LPAD(e.id, 3, '0')) COLLATE utf8mb4_unicode_ci
          SET a.emp_id = e.id
          WHERE a.emp_id IS NULL
        `);
        results.push(`Backfilled emp_id from sys_employee: ${res.affectedRows} rows`);
      } catch (e: any) {
        try {
          const res = await execute(`
            UPDATE hr_attendance a
            JOIN sys_employee e ON CAST(a.employee_id AS UNSIGNED) = e.id
            SET a.emp_id = e.id
            WHERE a.emp_id IS NULL
          `);
          results.push(`Backfilled emp_id (numeric match): ${res.affectedRows} rows`);
        } catch (e2: any) {
          results.push(`emp_id backfill skipped: ${e2.message}`);
        }
      }

      const r2 = await addIndexSafe('hr_attendance', 'idx_hr_attendance_emp_id', 'emp_id');
      results.push(r2);
    } else {
      await execute(`
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
      `);
      results.push('Created hr_attendance with emp_id');
    }
  }

  // ============================================================
  // 【5】出库批次分配表 inv_outbound_batch_allocation
  // ============================================================
  if (step === 'all' || step === '5') {
    results.push('===== 【5】出库批次分配表 =====');

    if (!(await tableExists('inv_outbound_batch_allocation'))) {
      await execute(`
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
      `);
      results.push('Created inv_outbound_batch_allocation');
    } else {
      results.push('Already exists: inv_outbound_batch_allocation');
    }
  }

  // ============================================================
  // 【6】巡检日志表 sys_daily_check_log
  // ============================================================
  if (step === 'all' || step === '6') {
    results.push('===== 【6】巡检日志表 =====');

    if (!(await tableExists('sys_daily_check_log'))) {
      await execute(`
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
      `);
      results.push('Created sys_daily_check_log');
    } else {
      results.push('Already exists: sys_daily_check_log');
    }
  }

  // ============================================================
  // 【7】请购单FK字段补充
  // ============================================================
  if (step === 'all' || step === '7') {
    results.push('===== 【7】请购单FK字段补充 =====');

    if (await tableExists('pur_request')) {
      const r1 = await addColumnSafe('pur_request', 'request_dept_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'申请部门ID\'');
      results.push(r1);
      const r2 = await addColumnSafe('pur_request', 'requester_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'申请人ID\'');
      results.push(r2);
      const r3 = await addColumnSafe('pur_request', 'reviewer_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'审校人ID\'');
      results.push(r3);
      const r4 = await addColumnSafe('pur_request', 'approver_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'批准人ID\'');
      results.push(r4);
    }

    if (await tableExists('pur_request_item')) {
      const r5 = await addColumnSafe('pur_request_item', 'material_id', 'BIGINT UNSIGNED DEFAULT NULL COMMENT \'物料ID\'');
      results.push(r5);

      try {
        const res = await execute(`
          UPDATE pur_request_item pri
          JOIN inv_material_std m ON pri.material_code = m.material_code
          SET pri.material_id = m.id
          WHERE pri.material_id IS NULL
        `);
        results.push(`Backfilled material_id from inv_material_std: ${res.affectedRows} rows`);
      } catch (e: any) {
        results.push(`material_id backfill skipped: ${e.message}`);
      }
    }
  }

  // ============================================================
  // 【8】菜单数据更新
  // ============================================================
  if (step === 'all' || step === '8') {
    results.push('===== 【8】菜单数据更新 =====');

    const newMenuItems = [
      { parent_code: 'purchase', menu_name: '请购单管理', menu_code: 'purchase_request_new', menu_type: 2, icon: null, path: '/purchase/request', component: '/purchase/request', permission: 'purchase:request:*', sort_order: 3 },
      { parent_code: 'finance', menu_name: '应付款管理', menu_code: 'finance_payable', menu_type: 2, icon: null, path: '/finance/payable', component: '/finance/payable', permission: 'finance:payable:*', sort_order: 2 },
      { parent_code: 'finance', menu_name: '付款管理', menu_code: 'finance_payment', menu_type: 2, icon: null, path: '/finance/payment', component: '/finance/payment', permission: 'finance:payment:*', sort_order: 3 },
      { parent_code: 'settings', menu_name: '数据巡检', menu_code: 'settings_daily_check', menu_type: 2, icon: null, path: '/settings/daily-check', component: '/settings/daily-check', permission: 'settings:daily-check:*', sort_order: 10 },
    ];

    for (const menu of newMenuItems) {
      const [parent]: any = await query('SELECT id FROM sys_menu WHERE menu_code = ? AND parent_id = 0', [menu.parent_code]);
      if (parent && parent.length > 0) {
        const [existing]: any = await query('SELECT id FROM sys_menu WHERE menu_code = ?', [menu.menu_code]);
        if (!existing || existing.length === 0) {
          await execute(
            'INSERT INTO sys_menu (parent_id, menu_name, menu_code, menu_type, icon, path, component, permission, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [parent[0].id, menu.menu_name, menu.menu_code, menu.menu_type, menu.icon, menu.path, menu.component, menu.permission, menu.sort_order, 1]
          );
          results.push(`Created menu: ${menu.menu_code}`);
        } else {
          results.push(`Menu already exists: ${menu.menu_code}`);
        }
      } else {
        results.push(`Parent menu not found: ${menu.parent_code}`);
      }
    }
  }

  return successResponse(results, '迁移完成');
});
