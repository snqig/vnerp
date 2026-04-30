const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
  });

  const [emps] = await c.execute('SELECT id, employee_no, name, dept_name, position FROM sys_employee WHERE status = 1');
  const [customers] = await c.execute('SELECT id, customer_name FROM crm_customer WHERE deleted = 0');
  const [products] = await c.execute('SELECT id, product_code, product_name FROM mdm_product WHERE deleted = 0');
  const [workOrders] = await c.execute('SELECT id, order_no, product_name FROM prod_work_order WHERE deleted = 0');
  const [depts] = await c.execute('SELECT id, dept_name FROM sys_department WHERE deleted = 0');

  console.log(`Employees: ${emps.length}, Customers: ${customers.length}, Products: ${products.length}, WorkOrders: ${workOrders.length}`);

  // ===== 1. Fix hr_attendance - use sys_employee names =====
  console.log('\n--- Fixing hr_attendance employee names ---');
  await c.execute('DELETE FROM hr_attendance');

  const today = new Date();
  const attRecords = [];
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().slice(0, 10);

    for (const emp of emps) {
      const rand = Math.random();
      let status, checkIn, checkOut, workingHours, overtimeHours, remark;
      if (rand < 0.75) {
        status = 'normal';
        const inMin = 7 * 60 + 45 + Math.floor(Math.random() * 15);
        const outMin = 17 * 60 + 25 + Math.floor(Math.random() * 15);
        checkIn = `${String(Math.floor(inMin / 60)).padStart(2, '0')}:${String(inMin % 60).padStart(2, '0')}`;
        checkOut = `${String(Math.floor(outMin / 60)).padStart(2, '0')}:${String(outMin % 60).padStart(2, '0')}`;
        workingHours = Math.round(((outMin - inMin) / 60) * 100) / 100;
        overtimeHours = outMin > 17 * 60 + 30 ? Math.round(((outMin - 17 * 60 - 30) / 60) * 100) / 100 : 0;
        remark = '';
      } else if (rand < 0.88) {
        status = 'late';
        const inMin = 8 * 60 + 31 + Math.floor(Math.random() * 30);
        const outMin = 17 * 60 + 25 + Math.floor(Math.random() * 15);
        checkIn = `${String(Math.floor(inMin / 60)).padStart(2, '0')}:${String(inMin % 60).padStart(2, '0')}`;
        checkOut = `${String(Math.floor(outMin / 60)).padStart(2, '0')}:${String(outMin % 60).padStart(2, '0')}`;
        workingHours = Math.round(((outMin - inMin) / 60) * 100) / 100;
        overtimeHours = 0;
        remark = '迟到';
      } else if (rand < 0.95) {
        status = 'absent';
        checkIn = null; checkOut = null; workingHours = 0; overtimeHours = 0; remark = '缺勤';
      } else {
        status = 'leave';
        checkIn = null; checkOut = null; workingHours = 0; overtimeHours = 0;
        remark = ['年假', '事假', '病假'][Math.floor(Math.random() * 3)];
      }
      attRecords.push([dateStr, emp.employee_no, emp.id, emp.name, emp.dept_name, checkIn, checkOut, status, workingHours, overtimeHours, remark]);
    }
  }

  const batchSize = 100;
  for (let i = 0; i < attRecords.length; i += batchSize) {
    const batch = attRecords.slice(i, i + batchSize);
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    await c.execute(
      `INSERT INTO hr_attendance (attendance_date, employee_id, employee_id_int, employee_name, department_name, check_in_time, check_out_time, status, working_hours, overtime_hours, remark) VALUES ${placeholders}`,
      batch.flat()
    );
  }
  const [attCnt] = await c.execute('SELECT COUNT(*) as cnt FROM hr_attendance');
  console.log(`hr_attendance: ${attCnt[0].cnt} records inserted`);

  // ===== 2. Fix plm_eco - use sys_employee names =====
  console.log('\n--- Fixing plm_eco applicant/approver names ---');
  await c.execute('DELETE FROM plm_eco');

  const ecoTypes = ['design_change', 'process_change', 'material_change', 'bom_change'];
  const ecoStatuses = [1, 2, 3];
  for (let i = 0; i < 5; i++) {
    const product = products[i % products.length];
    const applicant = emps[Math.floor(Math.random() * emps.length)];
    const approver = emps[Math.floor(Math.random() * emps.length)];
    const oldV = `V${i + 1}.0`;
    const newV = `V${i + 2}.0`;
    await c.execute(
      `INSERT INTO plm_eco (eco_no, eco_type, product_id, product_code, product_name, old_version, new_version, change_reason, change_content, impact_analysis, status, applicant, apply_time, approver, approve_time, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `ECO2026040${i + 11}`,
        ecoTypes[i % ecoTypes.length],
        product.id,
        product.product_code,
        product.product_name,
        oldV,
        newV,
        `${product.product_name}设计优化升级`,
        `修改${product.product_name}的工艺参数和材料规格`,
        '需更新BOM和SOP，影响生产排程',
        ecoStatuses[i % ecoStatuses.length],
        applicant.name,
        new Date(today.getTime() - (5 - i) * 86400000),
        approver.name,
        new Date(today.getTime() - (4 - i) * 86400000),
        `${ecoTypes[i % ecoTypes.length]}变更`,
      ]
    );
  }
  const [ecoCnt] = await c.execute('SELECT COUNT(*) as cnt FROM plm_eco');
  console.log(`plm_eco: ${ecoCnt[0].cnt} records inserted`);

  // ===== 3. sal_sample_order (sample/management + sample/orders) =====
  console.log('\n--- Generating sal_sample_order ---');
  await c.execute('DELETE FROM sal_sample_order');

  const sampleTypes = ['设变', '测试', '新规', '改良', '确认'];
  const printMethods = ['卷料丝印', '片料丝印', '卷料彩印', '模切', '烫金'];
  const progressStatuses = ['待审批', '进行中', '已完成', '已取消', '待审批'];
  for (let i = 0; i < 5; i++) {
    const customer = customers[i % customers.length];
    const product = products[i % products.length];
    const tracker = emps[i % emps.length];
    const orderDate = new Date(today.getTime() - (10 - i) * 86400000);
    const reqDate = new Date(orderDate.getTime() + 7 * 86400000);
    await c.execute(
      `INSERT INTO sal_sample_order (order_no, notify_date, customer_id, customer_name, product_name, material_no, version, size_spec, material_spec, specification, quantity, order_date, customer_require_date, delivery_date, actual_delivery_date, delivery_status, status, remark, create_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `SMP202604${String(i + 1).padStart(3, '0')}`,
        orderDate,
        customer.id,
        customer.customer_name,
        `${product.product_name}-样品${i + 1}`,
        `MAT-${String(i + 1).padStart(3, '0')}`,
        'A',
        `${200 + i * 10}×${80 + i * 5}mm`,
        `0.036BH-2抗噪+3M7533`,
        `${200 + i * 10}×${80 + i * 5}mm`,
        10 + i * 5,
        orderDate,
        reqDate,
        reqDate,
        i < 2 ? reqDate : null,
        i < 2 ? 'delivered' : 'pending',
        progressStatuses[i],
        `${sampleTypes[i]}样品，${printMethods[i]}工艺`,
        tracker.id,
      ]
    );
  }
  const [smpCnt] = await c.execute('SELECT COUNT(*) as cnt FROM sal_sample_order');
  console.log(`sal_sample_order: ${smpCnt[0].cnt} records inserted`);

  // ===== 4. prd_standard_card (sample/standard-card) =====
  console.log('\n--- Generating prd_standard_card ---');
  await c.execute('DELETE FROM prd_standard_card');

  const cardStatuses = [1, 2, 3, 4, 1];
  for (let i = 0; i < 5; i++) {
    const customer = customers[i % customers.length];
    const product = products[i % products.length];
    const creator = emps[i % emps.length];
    await c.execute(
      `INSERT INTO prd_standard_card (card_no, customer_name, customer_code, product_name, version, date, finished_size, material_name, material_type, print_type, process_method, creator, reviewer, status, creator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `SC202604${String(i + 1).padStart(3, '0')}`,
        customer.customer_name,
        `CUS${String(customer.id).padStart(3, '0')}`,
        product.product_name,
        `V${i + 1}.0`,
        new Date(today.getTime() - i * 86400000),
        `${200 + i * 10}×${80 + i * 5}mm`,
        ['PET膜', 'BOPP膜', 'PA膜', '铝箔膜', '铜版纸'][i],
        ['薄膜', '纸张', '复合材料', '金属膜', '特种材料'][i],
        ['丝印', '胶印', '凹印', '柔印', '数码'][i],
        ['模切+丝印', '烫金+丝印', '复合+分切', '模切+贴合', '丝印+冲压'][i],
        creator.name,
        emps[(i + 1) % emps.length].name,
        cardStatuses[i],
        creator.id,
      ]
    );
  }
  const [scCnt] = await c.execute('SELECT COUNT(*) as cnt FROM prd_standard_card');
  console.log(`prd_standard_card: ${scCnt[0].cnt} records inserted`);

  // ===== 5. eng_sample_to_mass (engineering/sample-to-mass) =====
  console.log('\n--- Generating eng_sample_to_mass ---');
  try {
    await c.execute('SELECT 1 FROM eng_sample_to_mass LIMIT 1');
    await c.execute('DELETE FROM eng_sample_to_mass');
    const massStatuses = ['pending', 'approved', 'in_progress', 'completed', 'pending'];
    for (let i = 0; i < 5; i++) {
      const customer = customers[i % customers.length];
      const product = products[i % products.length];
      await c.execute(
        `INSERT INTO eng_sample_to_mass (sample_order_id, sample_order_no, product_id, product_name, customer_id, customer_name, standard_card_id, standard_card_no, process_card_id, process_card_no, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          i + 1,
          `SMP202604${String(i + 1).padStart(3, '0')}`,
          product.id,
          product.product_name,
          customer.id,
          customer.customer_name,
          i + 1,
          `SC202604${String(i + 1).padStart(3, '0')}`,
          null,
          null,
          massStatuses[i],
        ]
      );
    }
    const [stmCnt] = await c.execute('SELECT COUNT(*) as cnt FROM eng_sample_to_mass');
    console.log(`eng_sample_to_mass: ${stmCnt[0].cnt} records inserted`);
  } catch (e) {
    console.log(`eng_sample_to_mass: ${e.message}`);
    console.log('Creating table...');
    await c.execute(`CREATE TABLE eng_sample_to_mass (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      sample_order_id BIGINT,
      sample_order_no VARCHAR(50),
      product_id BIGINT,
      product_name VARCHAR(200),
      customer_id BIGINT,
      customer_name VARCHAR(200),
      standard_card_id BIGINT,
      standard_card_no VARCHAR(50),
      process_card_id BIGINT,
      process_card_no VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      remark TEXT,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT,
      deleted TINYINT DEFAULT 0
    )`);
    const massStatuses = ['pending', 'approved', 'in_progress', 'completed', 'pending'];
    for (let i = 0; i < 5; i++) {
      const customer = customers[i % customers.length];
      const product = products[i % products.length];
      await c.execute(
        `INSERT INTO eng_sample_to_mass (sample_order_id, sample_order_no, product_id, product_name, customer_id, customer_name, standard_card_id, standard_card_no, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [i + 1, `SMP202604${String(i + 1).padStart(3, '0')}`, product.id, product.product_name, customer.id, customer.customer_name, i + 1, `SC202604${String(i + 1).padStart(3, '0')}`, massStatuses[i]]
      );
    }
    const [stmCnt] = await c.execute('SELECT COUNT(*) as cnt FROM eng_sample_to_mass');
    console.log(`eng_sample_to_mass: ${stmCnt[0].cnt} records inserted (table created)`);
  }

  // ===== 6. eng_sop (engineering/sop) =====
  console.log('\n--- Generating eng_sop ---');
  try {
    await c.execute('SELECT 1 FROM eng_sop LIMIT 1');
    await c.execute('DELETE FROM eng_sop');
  } catch (e) {
    console.log('Creating eng_sop table...');
    await c.execute(`CREATE TABLE eng_sop (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      sop_no VARCHAR(50) NOT NULL,
      sop_name VARCHAR(200),
      product_id BIGINT,
      product_code VARCHAR(50),
      product_name VARCHAR(200),
      process_code VARCHAR(50),
      process_name VARCHAR(100),
      version VARCHAR(20),
      sop_type VARCHAR(50),
      content TEXT,
      file_url VARCHAR(500),
      workshop VARCHAR(100),
      equipment_type VARCHAR(100),
      effective_date DATE,
      remark TEXT,
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      create_by BIGINT,
      deleted TINYINT DEFAULT 0
    )`);
  }

  const sopTypes = ['standard', 'special', 'temporary'];
  const workshops = ['印刷车间', '模切车间', '后道车间', '复合车间', '分切车间'];
  for (let i = 0; i < 5; i++) {
    const product = products[i % products.length];
    await c.execute(
      `INSERT INTO eng_sop (sop_no, sop_name, product_id, product_code, product_name, process_code, process_name, version, sop_type, content, workshop, equipment_type, effective_date, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `SOP202604${String(i + 1).padStart(3, '0')}`,
        `${product.product_name}标准作业指导书`,
        product.id,
        product.product_code,
        product.product_name,
        `PROC${String(i + 1).padStart(3, '0')}`,
        ['丝印工序', '模切工序', '复合工序', '分切工序', '检验工序'][i],
        `V${i + 1}.0`,
        sopTypes[i % sopTypes.length],
        `${product.product_name}的${['丝印', '模切', '复合', '分切', '检验'][i]}标准操作流程`,
        workshops[i],
        ['全自动丝印机', '模切机', '复合机', '分切机', '检测仪'][i],
        new Date(today.getTime() - i * 86400000),
        `${sopTypes[i % sopTypes.length]}类型SOP`,
      ]
    );
  }
  const [sopCnt] = await c.execute('SELECT COUNT(*) as cnt FROM eng_sop');
  console.log(`eng_sop: ${sopCnt[0].cnt} records inserted`);

  // ===== 7. prd_die_template (prepress/die-template) =====
  console.log('\n--- Generating prd_die_template ---');
  await c.execute('DELETE FROM prd_die_template');

  const templateTypes = [1, 2, 1, 2, 1];
  const dieStatuses = [1, 1, 2, 3, 1];
  for (let i = 0; i < 5; i++) {
    const maxUsage = 5000 + i * 1000;
    const currentUsage = Math.floor(maxUsage * (0.3 + Math.random() * 0.5));
    await c.execute(
      `INSERT INTO prd_die_template (template_code, template_name, template_type, specification, material, max_usage, current_usage, remaining_usage, warning_usage, status, storage_location, purchase_date, supplier_id, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `DT202604${String(i + 1).padStart(3, '0')}`,
        templateTypes[i] === 1 ? `刀模-${products[i % products.length].product_name}` : `网版-${products[i % products.length].product_name}`,
        templateTypes[i],
        `${200 + i * 10}×${80 + i * 5}mm`,
        templateTypes[i] === 1 ? '钢材' : '尼龙网',
        maxUsage,
        currentUsage,
        maxUsage - currentUsage,
        Math.floor(maxUsage * 0.2),
        dieStatuses[i],
        ['A区-01架', 'B区-02架', 'C区-03架', 'A区-04架', 'B区-05架'][i],
        new Date(today.getTime() - (30 + i * 10) * 86400000),
        null,
        templateTypes[i] === 1 ? '精密刀模' : '高张力网版',
      ]
    );
  }
  const [dtCnt] = await c.execute('SELECT COUNT(*) as cnt FROM prd_die_template');
  console.log(`prd_die_template: ${dtCnt[0].cnt} records inserted`);

  // ===== 8. inv_material_label (dcprint/labels) =====
  console.log('\n--- Generating inv_material_label ---');
  await c.execute('DELETE FROM inv_material_label');

  const labelMaterials = [
    { code: 'MAT-PET-001', name: 'PET薄膜', spec: '0.036mm', unit: '卷' },
    { code: 'MAT-BOPP-002', name: 'BOPP膜', spec: '0.05mm', unit: '卷' },
    { code: 'MAT-PA-003', name: 'PA尼龙膜', spec: '0.05mm', unit: '卷' },
    { code: 'MAT-ALU-004', name: '铝箔膜', spec: '0.02mm', unit: '卷' },
    { code: 'MAT-PAPER-005', name: '铜版纸', spec: '80g', unit: '张' },
  ];
  for (let i = 0; i < 5; i++) {
    const mat = labelMaterials[i];
    const width = 300 + i * 50;
    const length = 500 + i * 100;
    await c.execute(
      `INSERT INTO inv_material_label (label_no, qr_code, purchase_order_no, supplier_name, receive_date, material_code, material_name, specification, unit, batch_no, quantity, package_qty, width, length_per_roll, remark, color_code, is_main_material, is_used, is_cut, label_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `LBL202604${String(i + 1).padStart(3, '0')}`,
        `QR-LBL-${String(i + 1).padStart(5, '0')}`,
        `PO202604${String(i + 1).padStart(3, '0')}`,
        ['越南材料供应商', '东莞恒通', '深圳伟业', '广州华达', '上海精工'][i],
        new Date(today.getTime() - i * 86400000),
        mat.code,
        mat.name,
        mat.spec,
        mat.unit,
        `B202604${String(i + 1).padStart(2, '0')}`,
        100 + i * 20,
        10 + i * 2,
        width,
        length,
        '',
        `C${String(i + 1).padStart(3, '0')}`,
        i < 3 ? 1 : 0,
        0,
        0,
        1,
        1,
      ]
    );
  }
  const [mlCnt] = await c.execute('SELECT COUNT(*) as cnt FROM inv_material_label');
  console.log(`inv_material_label: ${mlCnt[0].cnt} records inserted`);

  // ===== 9. prd_process_card (dcprint/process-cards) =====
  console.log('\n--- Generating prd_process_card ---');
  await c.execute('DELETE FROM prd_process_card');
  await c.execute('DELETE FROM prd_process_card_material');

  for (let i = 0; i < 5; i++) {
    const wo = workOrders[i % workOrders.length];
    const creator = emps[i % emps.length];
    const [allLabels] = await c.execute('SELECT id, label_no FROM inv_material_label');
    const labelRow = allLabels[i] || allLabels[0];
    await c.execute(
      `INSERT INTO prd_process_card (card_no, qr_code, work_order_id, work_order_no, product_code, product_name, material_spec, work_order_date, plan_qty, main_label_id, main_label_no, burdening_status, lock_status, create_user_id, create_user_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `PC202604${String(i + 1).padStart(3, '0')}`,
        `QR-PC-${String(i + 1).padStart(5, '0')}`,
        wo.id,
        wo.order_no,
        `P${String(i + 1).padStart(3, '0')}`,
        wo.product_name,
        `${200 + i * 10}×${80 + i * 5}mm`,
        new Date(today.getTime() - i * 86400000),
        100 + i * 50,
        labelRow ? labelRow.id : null,
        labelRow ? labelRow.label_no : null,
        i < 2 ? 1 : 0,
        0,
        creator.id,
        creator.name,
      ]
    );
  }
  const [pcCnt] = await c.execute('SELECT COUNT(*) as cnt FROM prd_process_card');
  console.log(`prd_process_card: ${pcCnt[0].cnt} records inserted`);

  // ===== Summary =====
  console.log('\n===== DATA GENERATION COMPLETE =====');
  const summaryTables = [
    'hr_attendance', 'plm_eco', 'sal_sample_order', 'prd_standard_card',
    'eng_sample_to_mass', 'eng_sop', 'prd_die_template', 'inv_material_label', 'prd_process_card'
  ];
  for (const t of summaryTables) {
    try {
      const [r] = await c.execute(`SELECT COUNT(*) as cnt FROM ${t}`);
      console.log(`  ${t}: ${r[0].cnt} rows`);
    } catch (e) {
      console.log(`  ${t}: ERROR`);
    }
  }

  await c.end();
}

main().catch(console.error);
