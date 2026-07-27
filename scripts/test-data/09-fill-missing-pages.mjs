import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  // 查询现有主数据
  const [materials] = await conn.execute('SELECT id, material_code, material_name, specification FROM inv_material WHERE deleted=0 LIMIT 20');
  const [warehouses] = await conn.execute('SELECT id, warehouse_code, warehouse_name FROM inv_warehouse');
  const [customers] = await conn.execute('SELECT id, customer_code, customer_name FROM crm_customer');
  const [suppliers] = await conn.execute('SELECT id, supplier_code, supplier_name FROM pur_supplier');
  const [employees] = await conn.execute('SELECT id, name FROM sys_employee LIMIT 10');
  const [workOrders] = await conn.execute('SELECT id, work_order_no FROM prd_work_order');
  const [processCards] = await conn.execute('SELECT id, card_no FROM prd_process_card');
  const [inks] = await conn.execute('SELECT id, ink_code, ink_name FROM base_ink');
  const [mixedBatches] = await conn.execute('SELECT id, batch_no FROM ink_mixed_batch');
  const [trainings] = await conn.execute('SELECT id, training_name FROM hr_training LIMIT 3');
  const [products] = await conn.execute('SELECT id, product_code FROM mdm_product LIMIT 3');
  const [salesOrders] = await conn.execute('SELECT id, order_no FROM sal_order LIMIT 3');
  const [receivables] = await conn.execute('SELECT id FROM fin_receivable LIMIT 3');

  console.log('━━━ 查询现有主数据 ━━━');
  console.log(`物料: ${materials.length}, 仓库: ${warehouses.length}, 客户: ${customers.length}`);
  console.log(`供应商: ${suppliers.length}, 员工: ${employees.length}, 工单: ${workOrders.length}`);
  console.log(`工艺卡: ${processCards.length}, 油墨: ${inks.length}, 调色批次: ${mixedBatches.length}\n`);

  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  await conn.beginTransaction();

  try {
    // ═══════════════════════════════════════════════
    // 创建不存在的表
    // ═══════════════════════════════════════════════
    console.log('━━━ 创建不存在的表 ━━━');
    
    // PLM生命周期
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS plm_lifecycle (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        product_id BIGINT UNSIGNED,
        product_code VARCHAR(50),
        lifecycle_phase VARCHAR(20),
        phase_description VARCHAR(255),
        effective_date DATE,
        status TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // PLM变更订单
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS plm_eco (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        eco_no VARCHAR(50) NOT NULL,
        eco_title VARCHAR(200) NOT NULL,
        product_id BIGINT UNSIGNED,
        product_code VARCHAR(50),
        change_type VARCHAR(20),
        description TEXT,
        status TINYINT DEFAULT 0,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // SGS证书
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS qms_sgs_cert (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        cert_no VARCHAR(50) NOT NULL,
        material_id BIGINT UNSIGNED,
        material_code VARCHAR(50),
        material_name VARCHAR(200),
        supplier_id BIGINT UNSIGNED,
        supplier_name VARCHAR(200),
        cert_type VARCHAR(20),
        test_items VARCHAR(500),
        test_result VARCHAR(20),
        test_report_no VARCHAR(50),
        test_org VARCHAR(100),
        issue_date DATE,
        expire_date DATE,
        status TINYINT DEFAULT 1,
        file_url VARCHAR(500),
        remark TEXT,
        deleted TINYINT DEFAULT 0,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // SGS证书项
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS qms_sgs_cert_item (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        cert_id BIGINT UNSIGNED NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        limit_value VARCHAR(50),
        test_value VARCHAR(50),
        result VARCHAR(20),
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 质量投诉
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS qms_complaint (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        complaint_no VARCHAR(50) NOT NULL,
        customer_id BIGINT UNSIGNED,
        customer_name VARCHAR(100),
        material_id BIGINT UNSIGNED,
        material_code VARCHAR(50),
        material_name VARCHAR(200),
        complaint_type VARCHAR(20),
        complaint_desc TEXT,
        complaint_date DATE,
        status TINYINT DEFAULT 0,
        handler_id BIGINT UNSIGNED,
        handler_name VARCHAR(50),
        remark TEXT,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 实验室测试
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS qms_lab_test (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        test_no VARCHAR(50) NOT NULL,
        material_id BIGINT UNSIGNED,
        material_code VARCHAR(50),
        material_name VARCHAR(200),
        test_type VARCHAR(20),
        test_items VARCHAR(500),
        test_method VARCHAR(200),
        test_date DATE,
        test_result VARCHAR(20),
        status TINYINT DEFAULT 1,
        tester_id BIGINT UNSIGNED,
        tester_name VARCHAR(50),
        remark TEXT,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 供应商审核
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS qms_supplier_audit (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        audit_no VARCHAR(50) NOT NULL,
        supplier_id BIGINT UNSIGNED,
        supplier_code VARCHAR(50),
        supplier_name VARCHAR(200),
        audit_type VARCHAR(20),
        audit_date DATE,
        audit_result VARCHAR(20),
        status TINYINT DEFAULT 1,
        auditor_id BIGINT UNSIGNED,
        auditor_name VARCHAR(50),
        remark TEXT,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 二维码记录
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS qr_code_record (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        qr_code VARCHAR(100) NOT NULL,
        content_type VARCHAR(20),
        content_data TEXT,
        material_id BIGINT UNSIGNED,
        material_code VARCHAR(50),
        batch_no VARCHAR(50),
        status TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 应收明细
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS fin_receivable_line (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        receivable_id BIGINT UNSIGNED NOT NULL,
        line_no INT,
        sales_order_id BIGINT UNSIGNED,
        sales_order_no VARCHAR(50),
        invoice_no VARCHAR(50),
        amount DECIMAL(12,2),
        tax_amount DECIMAL(12,2),
        total_amount DECIMAL(12,2),
        status TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // HR组织架构
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS hr_organization (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        org_code VARCHAR(50) NOT NULL,
        org_name VARCHAR(100) NOT NULL,
        parent_id BIGINT UNSIGNED DEFAULT 0,
        org_type VARCHAR(20),
        status TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // HR班次
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS hr_shifts (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        shift_code VARCHAR(20) NOT NULL,
        shift_name VARCHAR(50) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration DECIMAL(4,1),
        status TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // HR排班
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS hr_schedules (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        schedule_date DATE NOT NULL,
        employee_id BIGINT UNSIGNED NOT NULL,
        employee_name VARCHAR(50),
        shift_id BIGINT UNSIGNED NOT NULL,
        shift_code VARCHAR(20),
        shift_name VARCHAR(50),
        status TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // HR技能
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS hr_skills (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        skill_code VARCHAR(50) NOT NULL,
        skill_name VARCHAR(100) NOT NULL,
        skill_type VARCHAR(20),
        description VARCHAR(255),
        status TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // HR证书
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS hr_certificates (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        employee_id BIGINT UNSIGNED NOT NULL,
        employee_name VARCHAR(50),
        cert_name VARCHAR(100) NOT NULL,
        cert_no VARCHAR(50),
        issue_date DATE,
        expire_date DATE,
        status TINYINT DEFAULT 1,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // HR MES同步
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS hr_mes_sync (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        employee_id BIGINT UNSIGNED NOT NULL,
        employee_name VARCHAR(50),
        sync_type VARCHAR(20),
        sync_data TEXT,
        sync_status TINYINT DEFAULT 1,
        last_sync_time DATETIME,
        remark VARCHAR(255),
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('表创建完成\n');

    // ═══════════════════════════════════════════════
    // 1. 生产工艺 /production/process
    // ═══════════════════════════════════════════════
    console.log('━━━ prd_process_card_material (工艺卡物料) ━━━');
    const [labels] = await conn.execute('SELECT id, label_no FROM inv_material_label LIMIT 10');
    for (let i = 0; i < processCards.length && i < labels.length; i++) {
      await conn.execute(
      'INSERT IGNORE INTO prd_process_card_material (card_id, card_no, label_id, label_no, material_type, material_code, material_name, specification, batch_no, quantity, unit, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [processCards[i].id, processCards[i].card_no, labels[i].id, labels[i].label_no, 1, materials[i].material_code, materials[i].material_name, materials[i].specification, 'BATCH-' + String(i + 1).padStart(6, '0'), 100, 'M', '工艺卡物料', new Date().toISOString().slice(0, 19).replace('T', ' ')]
    );
    }

    console.log('━━━ prd_process_route (工艺路线) ━━━');
    await conn.execute(
      'INSERT IGNORE INTO prd_process_route (route_code, route_name, product_id, version, is_default, status, remark, create_time, create_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['RT-001', '标准印刷工艺路线', products[0].id, 'V1.0', 1, 1, '适用于常规标签印刷', new Date().toISOString().slice(0, 19).replace('T', ' '), employees[0].id, 0]
    );
    await conn.execute(
      'INSERT IGNORE INTO prd_process_route (route_code, route_name, product_id, version, is_default, status, remark, create_time, create_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['RT-002', 'UV印刷工艺路线', products[1].id, 'V1.0', 0, 1, '适用于UV油墨印刷', new Date().toISOString().slice(0, 19).replace('T', ' '), employees[0].id, 0]
    );
    await conn.execute(
      'INSERT IGNORE INTO prd_process_route (route_code, route_name, product_id, version, is_default, status, remark, create_time, create_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['RT-003', '数码印刷工艺路线', products[2].id, 'V1.0', 0, 1, '适用于数码喷墨印刷', new Date().toISOString().slice(0, 19).replace('T', ' '), employees[0].id, 0]
    );

    const [routes] = await conn.execute('SELECT id FROM prd_process_route');
    console.log('━━━ prd_process_route_step (工艺路线步骤) ━━━');
    const steps = [
      { name: '印前准备', type: 1, eqType: 1, standardTime: 15, setupTime: 5, isKey: 0, firstPiece: 1, qualityCheck: 1 },
      { name: '上墨调试', type: 1, eqType: 1, standardTime: 10, setupTime: 0, isKey: 1, firstPiece: 1, qualityCheck: 1 },
      { name: '首件检验', type: 2, eqType: 0, standardTime: 5, setupTime: 0, isKey: 1, firstPiece: 0, qualityCheck: 1 },
      { name: '批量印刷', type: 1, eqType: 1, standardTime: 60, setupTime: 0, isKey: 1, firstPiece: 0, qualityCheck: 1 },
      { name: '质量抽检', type: 2, eqType: 0, standardTime: 10, setupTime: 0, isKey: 0, firstPiece: 0, qualityCheck: 1 },
      { name: '烘干固化', type: 1, eqType: 2, standardTime: 20, setupTime: 0, isKey: 0, firstPiece: 0, qualityCheck: 0 },
      { name: '成品检验', type: 2, eqType: 0, standardTime: 10, setupTime: 0, isKey: 1, firstPiece: 0, qualityCheck: 1 },
    ];
    for (const route of routes) {
      steps.forEach((step, index) => {
        conn.execute(
        'INSERT IGNORE INTO prd_process_route_step (route_id, step_seq, step_name, step_type, equipment_type, standard_time, setup_time, is_key_process, is_first_piece_required, quality_check, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [route.id, index + 1, step.name, step.type, step.eqType, step.standardTime, step.setupTime, step.isKey, step.firstPiece, step.qualityCheck, `${step.name}工序`, new Date().toISOString().slice(0, 19).replace('T', ' ')]
      );
      });
    }

    // ═══════════════════════════════════════════════
    // 2. 产品标签 /production/product-label
    // ═══════════════════════════════════════════════
    console.log('━━━ prd_product_label (产品标签) ━━━');
    const [inventoryBatches] = await conn.execute('SELECT id, batch_no FROM inv_inventory_batch LIMIT 3');
    for (let i = 0; i < workOrders.length && i < 3; i++) {
      await conn.execute(
        'INSERT IGNORE INTO prd_product_label (label_no, work_order_id, work_order_no, material_id, material_code, material_name, quantity, unit, batch_no, qc_result, remark, deleted, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['LB-20260701-' + String(i + 1).padStart(4, '0'), workOrders[i].id, workOrders[i].work_order_no, materials[i].id, materials[i].material_code, materials[i].material_name, 5000, '张', inventoryBatches[i]?.batch_no || 'BATCH-' + String(i + 1).padStart(6, '0'), '合格', `工单${workOrders[i].work_order_no}产品标签`, 0, new Date().toISOString().slice(0, 19).replace('T', ' ')]
      );
    }

    // ═══════════════════════════════════════════════
    // 3. 油墨开罐 /dcprint/ink-opening
    // ═══════════════════════════════════════════════
    console.log('━━━ ink_opening_record (油墨开罐记录) ━━━');
    for (let i = 0; i < inks.length; i++) {
      await conn.execute(
        'INSERT IGNORE INTO ink_opening_record (record_no, material_id, material_code, material_name, batch_no, label_id, ink_type, open_time, expire_hours, expire_time, remaining_qty, unit, status, operator_id, operator_name, remark, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['INK-OPEN-' + String(i + 1).padStart(6, '0'), inks[i].id, inks[i].ink_code, inks[i].ink_name, 'INK-BATCH-' + String(i + 1).padStart(6, '0'), labels[i]?.id || 1, 'solvent', '2026-07-' + String(i + 10).padStart(2, '0') + ' 08:00:00', 48, '2026-07-' + String(i + 12).padStart(2, '0') + ' 08:00:00', 15, 'kg', 1, employees[0].id, employees[0].name, `${inks[i].ink_name}开罐使用`, new Date().toISOString().slice(0, 19).replace('T', ' '), 0]
      );
    }

    // ═══════════════════════════════════════════════
    // 4. 油墨调色 /dcprint/ink-mixed
    // ═══════════════════════════════════════════════
    console.log('━━━ ink_mixed_record (油墨调色记录) ━━━');
    await conn.execute(
      'INSERT IGNORE INTO ink_mixed_record (record_no, base_ink_id, base_ink_code, base_ink_name, mix_ratio, color_name, color_code, mix_time, operator_id, operator_name, quantity, unit, warehouse_id, status, expire_time, remark, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['MIX-20260701-001', inks[0].id, inks[0].ink_code, inks[0].ink_name, '50:30:20', '深黑色', 'BLK-D', '2026-07-05 10:00:00', employees[0].id, employees[0].name, 30, 'kg', warehouses[0].id, 1, '2026-07-15 10:00:00', '调色记录', new Date().toISOString().slice(0, 19).replace('T', ' '), 0]
    );
    await conn.execute(
      'INSERT IGNORE INTO ink_mixed_record (record_no, base_ink_id, base_ink_code, base_ink_name, mix_ratio, color_name, color_code, mix_time, operator_id, operator_name, quantity, unit, warehouse_id, status, expire_time, remark, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['MIX-20260701-002', inks[1].id, inks[1].ink_code, inks[1].ink_name, '40:40:20', '特青色', 'CYN-S', '2026-07-10 14:00:00', employees[1].id, employees[1].name, 25, 'kg', warehouses[0].id, 1, '2026-07-20 14:00:00', '调色记录', new Date().toISOString().slice(0, 19).replace('T', ' '), 0]
    );
    await conn.execute(
      'INSERT IGNORE INTO ink_mixed_record (record_no, base_ink_id, base_ink_code, base_ink_name, mix_ratio, color_name, color_code, mix_time, operator_id, operator_name, quantity, unit, warehouse_id, status, expire_time, remark, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['MIX-20260701-003', inks[2].id, inks[2].ink_code, inks[2].ink_name, '30:30:40', '玫红色', 'MAG-R', '2026-07-15 09:00:00', employees[0].id, employees[0].name, 20, 'kg', warehouses[0].id, 1, '2026-07-25 09:00:00', '调色记录', new Date().toISOString().slice(0, 19).replace('T', ' '), 0]
    );

    console.log('━━━ ink_mixed_batch_detail (调色批次明细) ━━━');
    for (const batch of mixedBatches) {
      await conn.execute(
        'INSERT IGNORE INTO ink_mixed_batch_detail (mixed_batch_id, source_batch_no, source_label_no, material_id, material_name, used_qty, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [batch.id, 'INK-BATCH-' + String(mixedBatches.indexOf(batch) + 1).padStart(6, '0'), labels[0]?.label_no || 'LBL-001', inks[0].id, inks[0].ink_name, 15, 'kg']
      );
      await conn.execute(
        'INSERT IGNORE INTO ink_mixed_batch_detail (mixed_batch_id, source_batch_no, source_label_no, material_id, material_name, used_qty, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [batch.id, 'INK-BATCH-' + String(mixedBatches.indexOf(batch) + 2).padStart(6, '0'), labels[1]?.label_no || 'LBL-002', inks[1].id, inks[1].ink_name, 10, 'kg']
      );
    }

    // ═══════════════════════════════════════════════
    // 5. 数码印刷追溯 /dcprint/trace
    // ═══════════════════════════════════════════════
    console.log('━━━ dcprint_ink_color (油墨颜色) ━━━');
    await conn.execute('INSERT IGNORE INTO dcprint_ink_color (color_code, color_name, color_series, base_ink_type, pantone_code, remark, status, create_by, create_time, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['BLK', '黑色', '基础色', 'solvent', 'Black C', '标准黑色油墨', 1, employees[0].id, new Date().toISOString().slice(0, 19).replace('T', ' '), 0]);
    await conn.execute('INSERT IGNORE INTO dcprint_ink_color (color_code, color_name, color_series, base_ink_type, pantone_code, remark, status, create_by, create_time, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CYN', '青色', '基础色', 'solvent', 'Cyan C', '标准青色油墨', 1, employees[0].id, new Date().toISOString().slice(0, 19).replace('T', ' '), 0]);
    await conn.execute('INSERT IGNORE INTO dcprint_ink_color (color_code, color_name, color_series, base_ink_type, pantone_code, remark, status, create_by, create_time, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['MAG', '品红', '基础色', 'solvent', 'Magenta C', '标准品红油墨', 1, employees[0].id, new Date().toISOString().slice(0, 19).replace('T', ' '), 0]);

    const [inkColors] = await conn.execute('SELECT id FROM dcprint_ink_color');
    console.log('━━━ dcprint_ink_formula_version (油墨配方版本) ━━━');
    for (let i = 0; i < inkColors.length; i++) {
      await conn.execute(
        'INSERT IGNORE INTO dcprint_ink_formula_version (color_id, version_no, version_name, status, change_reason, process_note, total_weight, unit, shelf_life_hours, theoretical_cost, cost_calc_status, activate_by, activate_time, create_by, create_time, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [inkColors[i].id, `V${i + 1}.0`, `${inkColors[i].id}号颜色配方V${i + 1}`, 1, '初始版本', '标准调色流程', 100, 'kg', 48, 500, 1, employees[0].id, new Date().toISOString().slice(0, 19).replace('T', ' '), employees[0].id, new Date().toISOString().slice(0, 19).replace('T', ' '), 0]
      );
    }

    const [formulaVersions] = await conn.execute('SELECT id FROM dcprint_ink_formula_version');
    console.log('━━━ dcprint_ink_formula_item (油墨配方项) ━━━');
    for (let i = 0; i < formulaVersions.length; i++) {
      await conn.execute(
        'INSERT IGNORE INTO dcprint_ink_formula_item (version_id, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, add_order, sort, is_base, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [formulaVersions[i].id, inks[0].id, inks[0].ink_code, inks[0].ink_name, 'solvent', '进口', 50, 50, 'kg', 1, 1, 1, new Date().toISOString().slice(0, 19).replace('T', ' ')]
      );
      await conn.execute(
        'INSERT IGNORE INTO dcprint_ink_formula_item (version_id, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, add_order, sort, is_base, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [formulaVersions[i].id, inks[1].id, inks[1].ink_code, inks[1].ink_name, 'solvent', '进口', 30, 30, 'kg', 2, 2, 0, new Date().toISOString().slice(0, 19).replace('T', ' ')]
      );
      await conn.execute(
        'INSERT IGNORE INTO dcprint_ink_formula_item (version_id, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, add_order, sort, is_base, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [formulaVersions[i].id, inks[2].id, inks[2].ink_code, inks[2].ink_name, 'solvent', '进口', 20, 20, 'kg', 3, 3, 0, new Date().toISOString().slice(0, 19).replace('T', ' ')]
      );
    }

    // ═══════════════════════════════════════════════
    // 6. 刀模模板 /prepress/die-template
    // ═══════════════════════════════════════════════
    console.log('━━━ prd_die_template (刀模模板) ━━━');
    await conn.execute('INSERT IGNORE INTO prd_die_template (template_code, template_name, asset_type, layout_type, pieces_per_impression, template_type, specification, material, max_usage, current_usage, remaining_usage, warning_usage, max_impressions, cumulative_impressions, warning_threshold, maintenance_interval, maintenance_count, last_maintenance_date, last_used_date, status, die_status, storage_location, purchase_date, supplier_id, unit_price, qr_code, remark, create_time, create_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['DT-001', '标准刀模模板', 'die', 'single', 1, 1, '300x200mm', '钢刀', 10000, 1000, 9000, 1000, 500000, 50000, 50000, 50000, 1, '2026-01-01', '2026-07-01', 1, 'normal', 'A区-001', '2026-01-01', suppliers[0].id, 5000, 'QR-DT-001', '适用于常规标签', new Date().toISOString().slice(0, 19).replace('T', ' '), employees[0].id, 0]);
    await conn.execute('INSERT IGNORE INTO prd_die_template (template_code, template_name, asset_type, layout_type, pieces_per_impression, template_type, specification, material, max_usage, current_usage, remaining_usage, warning_usage, max_impressions, cumulative_impressions, warning_threshold, maintenance_interval, maintenance_count, last_maintenance_date, last_used_date, status, die_status, storage_location, purchase_date, supplier_id, unit_price, qr_code, remark, create_time, create_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['DT-002', '异形刀模模板', 'die', 'special', 1, 2, '250x250mm', '钢刀', 8000, 500, 7500, 800, 400000, 20000, 40000, 40000, 1, '2026-02-01', '2026-07-05', 1, 'normal', 'A区-002', '2026-02-01', suppliers[1].id, 8000, 'QR-DT-002', '适用于异形标签', new Date().toISOString().slice(0, 19).replace('T', ' '), employees[0].id, 0]);
    await conn.execute('INSERT IGNORE INTO prd_die_template (template_code, template_name, asset_type, layout_type, pieces_per_impression, template_type, specification, material, max_usage, current_usage, remaining_usage, warning_usage, max_impressions, cumulative_impressions, warning_threshold, maintenance_interval, maintenance_count, last_maintenance_date, last_used_date, status, die_status, storage_location, purchase_date, supplier_id, unit_price, qr_code, remark, create_time, create_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['DT-003', '烫金刀模模板', 'die', 'hot-stamp', 1, 3, '350x250mm', '铜模', 5000, 300, 4700, 500, 200000, 10000, 20000, 20000, 1, '2026-03-01', '2026-07-10', 1, 'normal', 'B区-001', '2026-03-01', suppliers[2].id, 12000, 'QR-DT-003', '适用于烫金工艺', new Date().toISOString().slice(0, 19).replace('T', ' '), employees[0].id, 0]);

    // ═══════════════════════════════════════════════
    // 7. PLM生命周期 /plm/lifecycle
    // ═══════════════════════════════════════════════
    console.log('━━━ plm_lifecycle (产品生命周期) ━━━');
    for (let i = 0; i < products.length; i++) {
      await conn.execute('INSERT IGNORE INTO plm_lifecycle (product_id, product_code, lifecycle_phase, phase_description, effective_date, status) VALUES (?, ?, ?, ?, ?, ?)', [products[i].id, products[i].product_code, 'design', '设计阶段', '2026-01-01', 1]);
      await conn.execute('INSERT IGNORE INTO plm_lifecycle (product_id, product_code, lifecycle_phase, phase_description, effective_date, status) VALUES (?, ?, ?, ?, ?, ?)', [products[i].id, products[i].product_code, 'production', '生产阶段', '2026-04-01', 1]);
      await conn.execute('INSERT IGNORE INTO plm_lifecycle (product_id, product_code, lifecycle_phase, phase_description, effective_date, status) VALUES (?, ?, ?, ?, ?, ?)', [products[i].id, products[i].product_code, 'maintenance', '维护阶段', '2026-07-01', 1]);
    }

    // ═══════════════════════════════════════════════
    // 8. PLM变更管理 /plm/eco
    // ═══════════════════════════════════════════════
    console.log('━━━ plm_eco (工程变更订单) ━━━');
    await conn.execute('INSERT IGNORE INTO plm_eco (eco_no, eco_title, product_id, product_code, change_type, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)', ['ECO-2026-001', '产品规格变更', products[0].id, products[0].product_code, 'spec_change', '调整产品尺寸规格', 1]);
    await conn.execute('INSERT IGNORE INTO plm_eco (eco_no, eco_title, product_id, product_code, change_type, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)', ['ECO-2026-002', '材料变更', products[1].id, products[1].product_code, 'material_change', '更换原材料供应商', 2]);
    await conn.execute('INSERT IGNORE INTO plm_eco (eco_no, eco_title, product_id, product_code, change_type, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)', ['ECO-2026-003', '工艺变更', products[2].id, products[2].product_code, 'process_change', '优化生产工艺流程', 3]);

    // ═══════════════════════════════════════════════
    // 9. 销售出库 /warehouse/sales-outbound
    // ═══════════════════════════════════════════════
    console.log('━━━ inv_sales_outbound (销售出库) ━━━');
    for (let i = 0; i < salesOrders.length; i++) {
      await conn.execute('INSERT IGNORE INTO inv_sales_outbound (outbound_no, order_id, order_no, customer_id, customer_name, warehouse_id, outbound_date, delivery_person, status, finance_posted, remark, create_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SOB-' + String(i + 1).padStart(6, '0'), salesOrders[i].id, salesOrders[i].order_no, customers[i].id, customers[i].customer_name, warehouses[0].id, '2026-07-' + String(i + 5).padStart(2, '0'), employees[0].name, 2, 1, `销售订单${salesOrders[i].order_no}出库`, employees[0].id, 0]);
    }

    console.log('━━━ inv_sales_outbound_item (销售出库明细) ━━━');
    const [outbounds] = await conn.execute('SELECT id, outbound_no FROM inv_sales_outbound LIMIT 3');
    for (let i = 0; i < outbounds.length; i++) {
      await conn.execute('INSERT IGNORE INTO inv_sales_outbound_item (outbound_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)', [outbounds[i].id, materials[i].id, materials[i].material_code, materials[i].material_name, 1000, '张', 'BATCH-' + String(i + 1).padStart(6, '0')]);
    }

    // ═══════════════════════════════════════════════
    // 10. 质量SGS /quality/sgs
    // ═══════════════════════════════════════════════
    console.log('━━━ qms_sgs_cert (SGS证书) ━━━');
    await conn.execute('INSERT IGNORE INTO qms_sgs_cert (cert_no, material_id, material_code, material_name, supplier_id, supplier_name, cert_type, test_items, test_result, test_report_no, test_org, issue_date, expire_date, status, file_url, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SGS-2026-001', materials[0].id, materials[0].material_code, materials[0].material_name, suppliers[0].id, suppliers[0].supplier_name, 'ROHS', '重金属含量检测', '合格', 'REP-2026-001', 'SGS上海', '2026-01-01', '2027-01-01', 1, '/uploads/sgs/sgs-2026-001.pdf', 'ROHS检测合格']);
    await conn.execute('INSERT IGNORE INTO qms_sgs_cert (cert_no, material_id, material_code, material_name, supplier_id, supplier_name, cert_type, test_items, test_result, test_report_no, test_org, issue_date, expire_date, status, file_url, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SGS-2026-002', materials[1].id, materials[1].material_code, materials[1].material_name, suppliers[1].id, suppliers[1].supplier_name, 'REACH', '有害物质检测', '合格', 'REP-2026-002', 'SGS深圳', '2026-03-01', '2027-03-01', 1, '/uploads/sgs/sgs-2026-002.pdf', 'REACH检测合格']);
    await conn.execute('INSERT IGNORE INTO qms_sgs_cert (cert_no, material_id, material_code, material_name, supplier_id, supplier_name, cert_type, test_items, test_result, test_report_no, test_org, issue_date, expire_date, status, file_url, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SGS-2026-003', materials[2].id, materials[2].material_code, materials[2].material_name, suppliers[2].id, suppliers[2].supplier_name, 'FDA', '食品接触检测', '合格', 'REP-2026-003', 'SGS广州', '2026-06-01', '2027-06-01', 1, '/uploads/sgs/sgs-2026-003.pdf', 'FDA检测合格']);

    console.log('━━━ qms_sgs_cert_item (SGS证书项) ━━━');
    const [sgsCerts] = await conn.execute('SELECT id FROM qms_sgs_cert');
    const testItems = [['铅', '<10mg/kg', '<5mg/kg', '合格'], ['镉', '<100mg/kg', '<10mg/kg', '合格'], ['汞', '<1000mg/kg', '<100mg/kg', '合格'], ['六价铬', '<1000mg/kg', '<100mg/kg', '合格'], ['多溴联苯', '<1000mg/kg', '<100mg/kg', '合格']];
    for (const cert of sgsCerts) {
      for (const [itemName, limitValue, testValue, result] of testItems) {
        await conn.execute('INSERT IGNORE INTO qms_sgs_cert_item (cert_id, item_name, limit_value, test_value, result) VALUES (?, ?, ?, ?, ?)', [cert.id, itemName, limitValue, testValue, result]);
      }
    }

    // ═══════════════════════════════════════════════
    // 11. 质量投诉 /quality/complaint
    // ═══════════════════════════════════════════════
    console.log('━━━ qms_complaint (质量投诉) ━━━');
    await conn.execute('INSERT IGNORE INTO qms_complaint (complaint_no, customer_id, customer_name, material_id, material_code, material_name, complaint_type, complaint_desc, complaint_date, status, handler_id, handler_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['COMP-2026-001', customers[0].id, customers[0].customer_name, materials[0].id, materials[0].material_code, materials[0].material_name, 'quality', '印刷颜色偏差', '2026-07-01', 2, employees[0].id, employees[0].name, '已处理']);
    await conn.execute('INSERT IGNORE INTO qms_complaint (complaint_no, customer_id, customer_name, material_id, material_code, material_name, complaint_type, complaint_desc, complaint_date, status, handler_id, handler_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['COMP-2026-002', customers[1].id, customers[1].customer_name, materials[1].id, materials[1].material_code, materials[1].material_name, 'delivery', '交货延迟', '2026-07-05', 1, employees[1].id, employees[1].name, '处理中']);
    await conn.execute('INSERT IGNORE INTO qms_complaint (complaint_no, customer_id, customer_name, material_id, material_code, material_name, complaint_type, complaint_desc, complaint_date, status, handler_id, handler_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['COMP-2026-003', customers[2].id, customers[2].customer_name, materials[2].id, materials[2].material_code, materials[2].material_name, 'service', '服务态度问题', '2026-07-10', 0, employees[2].id, employees[2].name, '待处理']);

    // ═══════════════════════════════════════════════
    // 12. 实验室测试 /quality/lab-test
    // ═══════════════════════════════════════════════
    console.log('━━━ qms_lab_test (实验室测试) ━━━');
    await conn.execute('INSERT IGNORE INTO qms_lab_test (test_no, material_id, material_code, material_name, test_type, test_items, test_method, test_date, test_result, status, tester_id, tester_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['LAB-2026-001', materials[0].id, materials[0].material_code, materials[0].material_name, 'physical', '拉伸强度、断裂伸长率', 'GB/T 1040', '2026-07-01', '合格', 1, employees[0].id, employees[0].name, '物理性能测试']);
    await conn.execute('INSERT IGNORE INTO qms_lab_test (test_no, material_id, material_code, material_name, test_type, test_items, test_method, test_date, test_result, status, tester_id, tester_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['LAB-2026-002', materials[1].id, materials[1].material_code, materials[1].material_name, 'chemical', '成分分析', 'GC-MS', '2026-07-05', '合格', 1, employees[1].id, employees[1].name, '化学成分测试']);
    await conn.execute('INSERT IGNORE INTO qms_lab_test (test_no, material_id, material_code, material_name, test_type, test_items, test_method, test_date, test_result, status, tester_id, tester_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['LAB-2026-003', materials[2].id, materials[2].material_code, materials[2].material_name, 'environmental', '耐候性测试', 'UV老化', '2026-07-10', '合格', 1, employees[2].id, employees[2].name, '环境测试']);

    // ═══════════════════════════════════════════════
    // 13. 供应商审核 /quality/supplier-audit
    // ═══════════════════════════════════════════════
    console.log('━━━ qms_supplier_audit (供应商审核) ━━━');
    for (let i = 0; i < suppliers.length && i < 3; i++) {
      await conn.execute('INSERT IGNORE INTO qms_supplier_audit (audit_no, supplier_id, supplier_code, supplier_name, audit_type, audit_date, audit_result, status, auditor_id, auditor_name, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SA-' + String(i + 1).padStart(6, '0'), suppliers[i].id, suppliers[i].supplier_code, suppliers[i].supplier_name, 'annual', '2026-07-' + String(i + 1).padStart(2, '0'), '合格', 1, employees[0].id, employees[0].name, `年度审核通过`]);
    }

    // ═══════════════════════════════════════════════
    // 14. 二维码 /qrcode
    // ═══════════════════════════════════════════════
    console.log('━━━ qr_code_record (二维码记录) ━━━');
    for (let i = 0; i < materials.length && i < 3; i++) {
      await conn.execute('INSERT IGNORE INTO qr_code_record (qr_code, content_type, content_data, material_id, material_code, batch_no, status) VALUES (?, ?, ?, ?, ?, ?, ?)', ['QR-' + String(Date.now()).slice(-10) + String(i), 'material', JSON.stringify({ materialId: materials[i].id, batchNo: 'BATCH-' + String(i + 1).padStart(6, '0') }), materials[i].id, materials[i].material_code, 'BATCH-' + String(i + 1).padStart(6, '0'), 1]);
    }

    // ═══════════════════════════════════════════════
    // 15. 财务应收明细 /finance/receivable
    // ═══════════════════════════════════════════════
    console.log('━━━ fin_receivable_line (应收明细) ━━━');
    for (let i = 0; i < receivables.length; i++) {
      await conn.execute('INSERT IGNORE INTO fin_receivable_line (receivable_id, line_no, sales_order_id, sales_order_no, invoice_no, amount, tax_amount, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [receivables[i].id, i + 1, salesOrders[i]?.id || 1, salesOrders[i]?.order_no || 'SO-000', 'INV-' + String(i + 1).padStart(6, '0'), 10000, 1300, 11300, 1]);
    }

    // ═══════════════════════════════════════════════
    // 16. HR培训参与 /hr/training
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_training_participant (培训参与) ━━━');
    for (const training of trainings) {
      for (let i = 0; i < 3 && i < employees.length; i++) {
        await conn.execute('INSERT IGNORE INTO hr_training_participant (training_id, employee_id, employee_name, score, is_qualified) VALUES (?, ?, ?, ?, ?)', [training.id, String(employees[i].id), employees[i].name, 90 + i * 2, 1]);
      }
    }

    // ═══════════════════════════════════════════════
    // 17. HR组织架构 /hr/organization
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_organization (组织架构) ━━━');
    await conn.execute('INSERT IGNORE INTO hr_organization (org_code, org_name, parent_id, org_type, status) VALUES (?, ?, ?, ?, ?)', ['ORG-001', '总公司', 0, 'company', 1]);
    await conn.execute('INSERT IGNORE INTO hr_organization (org_code, org_name, parent_id, org_type, status) VALUES (?, ?, ?, ?, ?)', ['ORG-002', '生产部', 1, 'department', 1]);
    await conn.execute('INSERT IGNORE INTO hr_organization (org_code, org_name, parent_id, org_type, status) VALUES (?, ?, ?, ?, ?)', ['ORG-003', '质检部', 1, 'department', 1]);

    // ═══════════════════════════════════════════════
    // 18. HR班次 /hr/shifts
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_shifts (班次) ━━━');
    await conn.execute('INSERT IGNORE INTO hr_shifts (shift_code, shift_name, start_time, end_time, duration, status) VALUES (?, ?, ?, ?, ?, ?)', ['S1', '早班', '08:00:00', '16:00:00', 8, 1]);
    await conn.execute('INSERT IGNORE INTO hr_shifts (shift_code, shift_name, start_time, end_time, duration, status) VALUES (?, ?, ?, ?, ?, ?)', ['S2', '中班', '16:00:00', '24:00:00', 8, 1]);
    await conn.execute('INSERT IGNORE INTO hr_shifts (shift_code, shift_name, start_time, end_time, duration, status) VALUES (?, ?, ?, ?, ?, ?)', ['S3', '夜班', '00:00:00', '08:00:00', 8, 1]);

    // ═══════════════════════════════════════════════
    // 19. HR排班 /hr/schedules
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_schedules (排班) ━━━');
    const [shifts] = await conn.execute('SELECT id, shift_code FROM hr_shifts');
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      for (let j = 0; j < employees.length && j < 3; j++) {
        const shift = shifts[j % shifts.length];
        await conn.execute('INSERT IGNORE INTO hr_schedules (schedule_date, employee_id, employee_name, shift_id, shift_code, shift_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [date.toISOString().slice(0, 10), employees[j].id, employees[j].name, shift.id, shift.shift_code, shift.shift_code === 'S1' ? '早班' : shift.shift_code === 'S2' ? '中班' : '夜班', 1]);
      }
    }

    // ═══════════════════════════════════════════════
    // 20. HR技能 /hr/skills
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_skills (技能) ━━━');
    await conn.execute('INSERT IGNORE INTO hr_skills (skill_code, skill_name, skill_type, description, status) VALUES (?, ?, ?, ?, ?)', ['SK-001', '印刷操作', 'technical', '熟练操作印刷机', 1]);
    await conn.execute('INSERT IGNORE INTO hr_skills (skill_code, skill_name, skill_type, description, status) VALUES (?, ?, ?, ?, ?)', ['SK-002', '质量检测', 'quality', '掌握质量检测方法', 1]);
    await conn.execute('INSERT IGNORE INTO hr_skills (skill_code, skill_name, skill_type, description, status) VALUES (?, ?, ?, ?, ?)', ['SK-003', '设备维护', 'maintenance', '设备日常维护保养', 1]);

    // ═══════════════════════════════════════════════
    // 21. HR证书 /hr/certificates
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_certificates (证书) ━━━');
    for (let i = 0; i < employees.length && i < 3; i++) {
      await conn.execute('INSERT IGNORE INTO hr_certificates (employee_id, employee_name, cert_name, cert_no, issue_date, expire_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [employees[i].id, employees[i].name, '印刷操作工证', 'CERT-' + String(i + 1).padStart(6, '0'), '2026-01-01', '2031-01-01', 1]);
    }

    // ═══════════════════════════════════════════════
    // 22. HR薪资快照 /hr/payroll
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_payroll_snapshot (薪资快照) ━━━');
    for (let i = 0; i < employees.length && i < 3; i++) {
      await conn.execute('INSERT IGNORE INTO hr_payroll_snapshot (payroll_id, employee_id, period_month, source_type, source_id, payload) VALUES (?, ?, ?, ?, ?, ?)', [i + 1, employees[i].id, '2026-06', 'manual', i + 1, JSON.stringify({ basic: 5000 + i * 500, bonus: 1000 + i * 200, deductions: 500 + i * 50 })]);
    }

    // ═══════════════════════════════════════════════
    // 23. HR计件明细 /hr/piece-work
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_piece_work_detail (计件明细) ━━━');
    for (let i = 0; i < employees.length && i < 3; i++) {
      await conn.execute('INSERT IGNORE INTO hr_piece_work_detail (employee_id, work_date, process_code, product_code, quantity, defective_quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [employees[i].id, '2026-07-' + String(i + 1).padStart(2, '0'), 'PRINT', materials[i].material_code, 1000, 5, 0.1, 100]);
    }

    // ═══════════════════════════════════════════════
    // 24. HR薪资计算 /hr/salary
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_salary_calculation (薪资计算) ━━━');
    for (let i = 0; i < employees.length && i < 3; i++) {
      const base = 5000 + i * 500;
      const piece = 1000 + i * 200;
      const overtime = 500 + i * 100;
      const performance = 500;
      const allowances = 300;
      const gross = base + piece + overtime + performance + allowances;
      const deductions = 200 + i * 50;
      const tax = 200;
      const net = gross - deductions - tax;
      await conn.execute('INSERT IGNORE INTO hr_salary_calculation (employee_id, calc_month, base_salary, piece_salary, overtime_salary, performance_salary, allowances, social_insurance_personal, housing_fund_personal, individual_tax, attendance_deduction, gross_pay, total_deduction, net_pay, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [employees[i].id, '2026-06', base, piece, overtime, performance, allowances, 400, 200, tax, 50, gross, deductions + tax, net, 'confirmed']);
    }

    // ═══════════════════════════════════════════════
    // 25. HR薪资档案 /hr/salary-profile
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_salary_profile (薪资档案) ━━━');
    for (let i = 0; i < employees.length && i < 3; i++) {
      await conn.execute('INSERT IGNORE INTO hr_salary_profile (employee_id, salary_type, base_salary, social_insurance_base, housing_fund_rate, tax_deduction, bank_account, bank_name, effective_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [employees[i].id, 'piece', 5000 + i * 500, 6000, 12.00, 5000, '622202******1234', '工商银行', '2026-01-01', 1]);
    }

    // ═══════════════════════════════════════════════
    // 26. HR MES同步 /hr/mes-sync
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_mes_sync (MES同步) ━━━');
    for (let i = 0; i < employees.length && i < 3; i++) {
      await conn.execute('INSERT IGNORE INTO hr_mes_sync (employee_id, employee_name, sync_type, sync_data, sync_status, last_sync_time, remark) VALUES (?, ?, ?, ?, ?, ?, ?)', [employees[i].id, employees[i].name, 'attendance', JSON.stringify({ date: '2026-07-' + String(i + 1).padStart(2, '0'), checkIn: '08:00', checkOut: '18:00' }), 1, '2026-07-' + String(i + 1).padStart(2, '0') + ' 18:00:00', '考勤数据同步']);
    }

    await conn.commit();
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✅ 所有数据插入成功！');

    // 验证数据量
    const tablesToVerify = [
      'prd_process_card_material', 'prd_process_route', 'prd_process_route_step',
      'prd_product_label', 'ink_opening_record', 'ink_mixed_record', 'ink_mixed_batch_detail',
      'dcprint_ink_color', 'dcprint_ink_formula_item', 'dcprint_ink_formula_version',
      'prd_die_template', 'plm_lifecycle', 'plm_eco',
      'inv_sales_outbound', 'inv_sales_outbound_item',
      'qms_sgs_cert', 'qms_sgs_cert_item', 'qms_complaint', 'qms_lab_test', 'qms_supplier_audit',
      'qr_code_record', 'fin_receivable_line',
      'hr_training_participant', 'hr_organization', 'hr_shifts', 'hr_schedules',
      'hr_skills', 'hr_certificates', 'hr_payroll_snapshot', 'hr_piece_work_detail',
      'hr_salary_calculation', 'hr_salary_profile', 'hr_mes_sync'
    ];

    console.log('\n━━━ 数据量验证 ━━━');
    for (const table of tablesToVerify) {
      const [result] = await conn.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${result[0]?.count || 0} 条`);
    }

    await conn.end();
  } catch (error) {
    await conn.rollback();
    console.error('❌ 数据插入失败:', error);
    process.exit(1);
  }
}

main().catch(console.error);
