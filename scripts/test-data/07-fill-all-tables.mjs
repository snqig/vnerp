import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  const [materials] = await conn.execute('SELECT id, material_code, material_name, specification FROM inv_material WHERE deleted=0 LIMIT 10');
  const [warehouses] = await conn.execute('SELECT id, warehouse_code, warehouse_name FROM inv_warehouse');
  const [customers] = await conn.execute('SELECT id, customer_code, customer_name FROM crm_customer');
  const [suppliers] = await conn.execute('SELECT id, supplier_code, supplier_name FROM pur_supplier');
  const [employees] = await conn.execute('SELECT id, name FROM sys_employee LIMIT 5');
  const [workOrders] = await conn.execute('SELECT id, work_order_no FROM prd_work_order');
  const [salesOrders] = await conn.execute('SELECT id, order_no FROM sal_order');
  const [equipments] = await conn.execute('SELECT id, equipment_code, equipment_name FROM eqp_equipment');
  const [boms] = await conn.execute('SELECT id FROM bom_header LIMIT 3');
  const [evals] = await conn.execute('SELECT id FROM srm_supplier_eval');
  const [outIssues] = await conn.execute('SELECT id FROM outsource_issue');
  const [payables] = await conn.execute('SELECT id FROM fin_payable');
  const [receivables] = await conn.execute('SELECT id FROM fin_receivable');

  console.log('━━━ 查询现有主数据 ━━━');
  console.log(`物料: ${materials.length}, 仓库: ${warehouses.length}, 客户: ${customers.length}`);
  console.log(`供应商: ${suppliers.length}, 员工: ${employees.length}, 工单: ${workOrders.length}\n`);

  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  await conn.beginTransaction();

  try {
    // ═══════════════════════════════════════════════
    // 1. base_ink 基础油墨
    // ═══════════════════════════════════════════════
    console.log('━━━ base_ink ━━━');
    await conn.execute('INSERT INTO base_ink (ink_code, ink_name, color_code, color_name, ink_type, supplier_id, supplier_name, unit, stock_qty, min_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['INK-BLK-001', '黑色油墨', 'BLK', '黑色', 'solvent', suppliers[2].id, suppliers[2].supplier_name, 'kg', 80, 20, 1]);
    await conn.execute('INSERT INTO base_ink (ink_code, ink_name, color_code, color_name, ink_type, supplier_id, supplier_name, unit, stock_qty, min_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['INK-CYN-001', '青色油墨', 'CYN', '青色', 'solvent', suppliers[2].id, suppliers[2].supplier_name, 'kg', 45, 15, 1]);
    await conn.execute('INSERT INTO base_ink (ink_code, ink_name, color_code, color_name, ink_type, supplier_id, supplier_name, unit, stock_qty, min_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['INK-MAG-001', '品红油墨', 'MAG', '品红', 'solvent', suppliers[2].id, suppliers[2].supplier_name, 'kg', 50, 15, 1]);
    const [inks] = await conn.execute('SELECT id FROM base_ink');

    // ═══════════════════════════════════════════════
    // 2. bom_line BOM行
    // ═══════════════════════════════════════════════
    console.log('━━━ bom_line ━━━');
    for (let i = 0; i < boms.length && i < materials.length; i++) {
      await conn.execute('INSERT INTO bom_line (bom_id, line_no, material_id, material_code, material_name, material_spec, material_unit, usage_qty, loss_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [boms[i].id, 1, materials[0].id, materials[0].material_code, materials[0].material_name, materials[0].specification, 'M', 0.04, 3]);
      await conn.execute('INSERT INTO bom_line (bom_id, line_no, material_id, material_code, material_name, material_spec, material_unit, usage_qty, loss_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [boms[i].id, 2, materials[1].id, materials[1].material_code, materials[1].material_name, materials[1].specification, 'M', 0.03, 2]);
    }

    // ═══════════════════════════════════════════════
    // 3. dcprint 打样管理
    // ═══════════════════════════════════════════════
    console.log('━━━ dcprint_ink_formula_version ━━━');
    await conn.execute('INSERT INTO dcprint_ink_formula_version (color_id, version_no, version_name, status, cost_calc_status, is_deleted, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)', [inks[0].id, 'V1.0', '标准黑色配方V1', 1, 1, 0, '2026-07-01 00:00:00']);
    await conn.execute('INSERT INTO dcprint_ink_formula_version (color_id, version_no, version_name, status, cost_calc_status, is_deleted, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)', [inks[1].id, 'V1.0', '标准青色配方V1', 1, 1, 0, '2026-07-01 00:00:00']);
    await conn.execute('INSERT INTO dcprint_ink_formula_version (color_id, version_no, version_name, status, cost_calc_status, is_deleted, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)', [inks[2].id, 'V1.0', '标准品红配方V1', 1, 1, 0, '2026-07-01 00:00:00']);
    const [fv] = await conn.execute('SELECT id FROM dcprint_ink_formula_version');

    console.log('━━━ dcprint_ink_formula_item ━━━');
    await conn.execute('INSERT INTO dcprint_ink_formula_item (version_id, material_id, material_code, material_name, ratio, weight, unit, add_order, sort, is_base) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [fv[0].id, materials[4].id, materials[4].material_code, materials[4].material_name, 100.0000, 100.000, 'g', 1, 1, 1]);
    await conn.execute('INSERT INTO dcprint_ink_formula_item (version_id, material_id, material_code, material_name, ratio, weight, unit, add_order, sort, is_base) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [fv[1].id, materials[4].id, materials[4].material_code, materials[4].material_name, 100.0000, 100.000, 'g', 1, 1, 1]);
    await conn.execute('INSERT INTO dcprint_ink_formula_item (version_id, material_id, material_code, material_name, ratio, weight, unit, add_order, sort, is_base) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [fv[2].id, materials[4].id, materials[4].material_code, materials[4].material_name, 100.0000, 100.000, 'g', 1, 1, 1]);

    console.log('━━━ dcprint_tool ━━━');
    await conn.execute('INSERT INTO dcprint_tool (tool_type, tool_code, tool_name, spec, total_life, warning_threshold, used_count, remain_life, original_cost, accumulated_cost, net_value, unit_cost, status, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [1, 'TOOL-001', '刮刀', '标准', 10000, 1000, 5000, 5000, 500.00, 250.00, 250.00, 0.0500, 1, 0]);
    await conn.execute('INSERT INTO dcprint_tool (tool_type, tool_code, tool_name, spec, total_life, warning_threshold, used_count, remain_life, original_cost, accumulated_cost, net_value, unit_cost, status, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [1, 'TOOL-002', '刮板', '标准', 8000, 800, 2000, 6000, 300.00, 75.00, 225.00, 0.0375, 1, 0]);
    await conn.execute('INSERT INTO dcprint_tool (tool_type, tool_code, tool_name, spec, total_life, warning_threshold, used_count, remain_life, original_cost, accumulated_cost, net_value, unit_cost, status, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [2, 'TOOL-003', '定位销', '标准', 50000, 5000, 5000, 45000, 200.00, 20.00, 180.00, 0.0040, 1, 0]);
    const [tools] = await conn.execute('SELECT id FROM dcprint_tool');

    console.log('━━━ dcprint_tool_maintenance ━━━');
    await conn.execute('INSERT INTO dcprint_tool_maintenance (tool_id, maintenance_type, maintenance_cost, life_before, life_after, life_adjustment, status, start_time, end_time, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [tools[0].id, 1, 100.00, 5000, 5000, 0, 2, '2026-07-01 08:00:00', '2026-07-01 12:00:00', employees[0].id]);
    await conn.execute('INSERT INTO dcprint_tool_maintenance (tool_id, maintenance_type, maintenance_cost, life_before, life_after, life_adjustment, status, start_time, end_time, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [tools[1].id, 1, 50.00, 6000, 6000, 0, 2, '2026-07-05 08:00:00', '2026-07-05 10:00:00', employees[0].id]);
    await conn.execute('INSERT INTO dcprint_tool_maintenance (tool_id, maintenance_type, maintenance_cost, life_before, life_after, life_adjustment, status, start_time, end_time, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [tools[2].id, 2, 30.00, 45000, 45000, 0, 1, '2026-07-10 08:00:00', null, employees[0].id]);

    console.log('━━━ dcprint_tool_usage ━━━');
    await conn.execute('INSERT INTO dcprint_tool_usage (tool_id, work_order_id, work_order_no, use_count, operator_id, amortized_cost, use_time) VALUES (?, ?, ?, ?, ?, ?, ?)', [tools[0].id, workOrders[0].id, workOrders[0].work_order_no, 5000, employees[0].id, 250.0000, '2026-07-05 08:00:00']);
    await conn.execute('INSERT INTO dcprint_tool_usage (tool_id, work_order_id, work_order_no, use_count, operator_id, amortized_cost, use_time) VALUES (?, ?, ?, ?, ?, ?, ?)', [tools[1].id, workOrders[1].id, workOrders[1].work_order_no, 2000, employees[0].id, 75.0000, '2026-07-12 08:00:00']);
    await conn.execute('INSERT INTO dcprint_tool_usage (tool_id, work_order_id, work_order_no, use_count, operator_id, amortized_cost, use_time) VALUES (?, ?, ?, ?, ?, ?, ?)', [tools[2].id, workOrders[0].id, workOrders[0].work_order_no, 5000, employees[0].id, 20.0000, '2026-07-08 08:00:00']);

    console.log('━━━ dcprint_sample_process_card ━━━');
    await conn.execute('INSERT INTO dcprint_sample_process_card (sample_no, sample_name, customer_id, customer_name, version_no, status, spec, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SP-2026-001', '空调标签打样', customers[0].id, customers[0].customer_name, 'V1.0', 1, '120×80mm', '2026-07-01 00:00:00', 0]);
    await conn.execute('INSERT INTO dcprint_sample_process_card (sample_no, sample_name, customer_id, customer_name, version_no, status, spec, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SP-2026-002', '洗衣机面板打样', customers[1].id, customers[1].customer_name, 'V1.0', 1, '180×100mm', '2026-07-05 00:00:00', 0]);
    await conn.execute('INSERT INTO dcprint_sample_process_card (sample_no, sample_name, customer_id, customer_name, version_no, status, spec, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SP-2026-003', '电池标签打样', customers[2].id, customers[2].customer_name, 'V1.0', 1, '50×30mm', '2026-07-10 00:00:00', 0]);
    const [cards] = await conn.execute('SELECT id FROM dcprint_sample_process_card');

    console.log('━━━ dcprint_sample_process_item ━━━');
    await conn.execute('INSERT INTO dcprint_sample_process_item (card_id, item_type, material_id, material_code, material_name, unit_dosage, unit) VALUES (?, ?, ?, ?, ?, ?, ?)', [cards[0].id, 1, materials[0].id, materials[0].material_code, materials[0].material_name, 200.0000, 'M']);
    await conn.execute('INSERT INTO dcprint_sample_process_item (card_id, item_type, material_id, material_code, material_name, unit_dosage, unit) VALUES (?, ?, ?, ?, ?, ?, ?)', [cards[0].id, 3, materials[4].id, materials[4].material_code, materials[4].material_name, 10.0000, 'kg']);
    await conn.execute('INSERT INTO dcprint_sample_process_item (card_id, item_type, material_id, material_code, material_name, unit_dosage, unit) VALUES (?, ?, ?, ?, ?, ?, ?)', [cards[1].id, 1, materials[1].id, materials[1].material_code, materials[1].material_name, 150.0000, 'M']);

    console.log('━━━ dcprint_sample_process_step ━━━');
    await conn.execute('INSERT INTO dcprint_sample_process_step (card_id, process_name, work_hour, sort) VALUES (?, ?, ?, ?)', [cards[0].id, '印刷', 8.00, 1]);
    await conn.execute('INSERT INTO dcprint_sample_process_step (card_id, process_name, work_hour, sort) VALUES (?, ?, ?, ?)', [cards[0].id, '模切', 4.00, 2]);
    await conn.execute('INSERT INTO dcprint_sample_process_step (card_id, process_name, work_hour, sort) VALUES (?, ?, ?, ?)', [cards[1].id, '印刷', 6.00, 1]);

    console.log('━━━ dcprint_sample_process_template ━━━');
    await conn.execute('INSERT INTO dcprint_sample_process_template (template_no, template_name, category, status, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?)', ['TEMP-001', '标准标签打样模板', 'label', 1, '2026-07-01 00:00:00', 0]);
    await conn.execute('INSERT INTO dcprint_sample_process_template (template_no, template_name, category, status, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?)', ['TEMP-002', '面板打样模板', 'panel', 1, '2026-07-01 00:00:00', 0]);
    await conn.execute('INSERT INTO dcprint_sample_process_template (template_no, template_name, category, status, create_time, deleted) VALUES (?, ?, ?, ?, ?, ?)', ['TEMP-003', '小标签打样模板', 'small_label', 1, '2026-07-01 00:00:00', 0]);
    const [templates] = await conn.execute('SELECT id FROM dcprint_sample_process_template');

    console.log('━━━ dcprint_sample_process_template_item ━━━');
    await conn.execute('INSERT INTO dcprint_sample_process_template_item (template_id, item_type, material_code, material_name, unit_dosage, unit) VALUES (?, ?, ?, ?, ?, ?)', [templates[0].id, 1, 'MAT030', 'PVC薄膜', 0.0400, 'M']);
    await conn.execute('INSERT INTO dcprint_sample_process_template_item (template_id, item_type, material_code, material_name, unit_dosage, unit) VALUES (?, ?, ?, ?, ?, ?)', [templates[0].id, 3, 'MAT035', '油墨', 0.0010, 'kg']);
    await conn.execute('INSERT INTO dcprint_sample_process_template_item (template_id, item_type, material_code, material_name, unit_dosage, unit) VALUES (?, ?, ?, ?, ?, ?)', [templates[1].id, 1, 'MAT031', 'PE薄膜', 0.0300, 'M']);

    console.log('━━━ dcprint_sample_process_template_step ━━━');
    await conn.execute('INSERT INTO dcprint_sample_process_template_step (template_id, process_name, work_hour, sort) VALUES (?, ?, ?, ?)', [templates[0].id, '印刷', 8.00, 1]);
    await conn.execute('INSERT INTO dcprint_sample_process_template_step (template_id, process_name, work_hour, sort) VALUES (?, ?, ?, ?)', [templates[0].id, '模切', 4.00, 2]);
    await conn.execute('INSERT INTO dcprint_sample_process_template_step (template_id, process_name, work_hour, sort) VALUES (?, ?, ?, ?)', [templates[1].id, '印刷', 6.00, 1]);

    // ═══════════════════════════════════════════════
    // 4. eq 设备
    // ═══════════════════════════════════════════════
    console.log('━━━ eq_equipment ━━━');
    await conn.execute('INSERT INTO eq_equipment (equipment_code, equipment_name, equipment_type, model, workshop, location, purchase_date, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['EQ-001', '丝印机', 'print', 'SP-2000', '印刷车间', 'A区-01', '2024-01-15', 1, 0]);
    await conn.execute('INSERT INTO eq_equipment (equipment_code, equipment_name, equipment_type, model, workshop, location, purchase_date, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['EQ-002', '模切机', 'die', 'MQ-1500', '后道车间', 'B区-02', '2024-03-20', 1, 0]);
    await conn.execute('INSERT INTO eq_equipment (equipment_code, equipment_name, equipment_type, model, workshop, location, purchase_date, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['EQ-003', '分切机', 'cut', 'CQ-1000', '原料车间', 'C区-01', '2024-06-10', 1, 0]);
    const [eq] = await conn.execute('SELECT id FROM eq_equipment');

    console.log('━━━ eq_maintenance_plan ━━━');
    await conn.execute('INSERT INTO eq_maintenance_plan (plan_no, equipment_id, plan_name, maintenance_type, cycle_type, cycle_days, next_execute_date, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['EMP-001', eq[0].id, '丝印机月度保养', 'routine', 'monthly', 30, '2026-08-01', 1, 0]);
    await conn.execute('INSERT INTO eq_maintenance_plan (plan_no, equipment_id, plan_name, maintenance_type, cycle_type, cycle_days, next_execute_date, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['EMP-002', eq[1].id, '模切机季度保养', 'routine', 'quarterly', 90, '2026-10-01', 1, 0]);
    await conn.execute('INSERT INTO eq_maintenance_plan (plan_no, equipment_id, plan_name, maintenance_type, cycle_type, cycle_days, next_execute_date, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['EMP-003', eq[2].id, '分切机年度保养', 'routine', 'yearly', 365, '2027-07-01', 1, 0]);
    const [eqPlans] = await conn.execute('SELECT id FROM eq_maintenance_plan');

    console.log('━━━ eq_maintenance_record ━━━');
    await conn.execute('INSERT INTO eq_maintenance_record (record_no, equipment_id, plan_id, maintenance_type, maintenance_date, start_time, end_time, actual_hours, actual_cost, result, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['EMR-001', eq[0].id, eqPlans[0].id, 'routine', '2026-07-01', '2026-07-01 08:00:00', '2026-07-01 12:00:00', 4.00, 300.00, 'success', 2, 0]);
    await conn.execute('INSERT INTO eq_maintenance_record (record_no, equipment_id, plan_id, maintenance_type, maintenance_date, start_time, end_time, actual_hours, actual_cost, result, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['EMR-002', eq[1].id, eqPlans[1].id, 'routine', '2026-07-05', '2026-07-05 08:00:00', '2026-07-05 16:00:00', 8.00, 500.00, 'success', 2, 0]);
    await conn.execute('INSERT INTO eq_maintenance_record (record_no, equipment_id, plan_id, maintenance_type, maintenance_date, start_time, end_time, actual_hours, actual_cost, result, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['EMR-003', eq[2].id, eqPlans[2].id, 'routine', '2026-07-10', '2026-07-10 08:00:00', '2026-07-10 10:00:00', 2.00, 100.00, 'success', 2, 0]);

    // ═══════════════════════════════════════════════
    // 5. hr 人力资源
    // ═══════════════════════════════════════════════
    console.log('━━━ hr_salary_profile ━━━');
    await conn.execute('INSERT INTO hr_salary_profile (employee_id, salary_type, base_salary, social_insurance_base, housing_fund_rate, bank_account, bank_name, effective_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [employees[0].id, 'monthly', 5000.00, 5000.00, 12.00, '6222021234567890123', '工商银行', '2026-01-01', 1]);
    await conn.execute('INSERT INTO hr_salary_profile (employee_id, salary_type, base_salary, social_insurance_base, housing_fund_rate, bank_account, bank_name, effective_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [employees[1].id, 'monthly', 4000.00, 4000.00, 12.00, '6222021234567890456', '工商银行', '2026-01-01', 1]);
    await conn.execute('INSERT INTO hr_salary_profile (employee_id, salary_type, base_salary, social_insurance_base, housing_fund_rate, bank_account, bank_name, effective_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [employees[2].id, 'piece', 2000.00, 2000.00, 5.00, '6222021234567890789', '工商银行', '2026-01-01', 1]);

    console.log('━━━ hr_salary_calculation ━━━');
    await conn.execute('INSERT INTO hr_salary_calculation (employee_id, calc_month, base_salary, piece_salary, performance_salary, allowances, gross_pay, total_deduction, net_pay, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [employees[0].id, '2026-07', 5000.00, 0.00, 2000.00, 500.00, 7500.00, 700.00, 6800.00, 'confirmed']);
    await conn.execute('INSERT INTO hr_salary_calculation (employee_id, calc_month, base_salary, piece_salary, performance_salary, allowances, gross_pay, total_deduction, net_pay, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [employees[1].id, '2026-07', 4000.00, 0.00, 1500.00, 300.00, 5800.00, 650.00, 5150.00, 'confirmed']);
    await conn.execute('INSERT INTO hr_salary_calculation (employee_id, calc_month, base_salary, piece_salary, performance_salary, allowances, gross_pay, total_deduction, net_pay, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [employees[2].id, '2026-07', 2000.00, 2600.00, 0.00, 200.00, 4800.00, 200.00, 4600.00, 'confirmed']);

    console.log('━━━ hr_payroll_snapshot ━━━');
    await conn.execute('INSERT INTO hr_payroll_snapshot (payroll_id, employee_id, period_month, source_type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)', [1, employees[0].id, '2026-07', 'salary', '{}', '2026-07-15 00:00:00']);
    await conn.execute('INSERT INTO hr_payroll_snapshot (payroll_id, employee_id, period_month, source_type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)', [2, employees[1].id, '2026-07', 'salary', '{}', '2026-07-15 00:00:00']);
    await conn.execute('INSERT INTO hr_payroll_snapshot (payroll_id, employee_id, period_month, source_type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)', [3, employees[2].id, '2026-07', 'salary', '{}', '2026-07-15 00:00:00']);

    console.log('━━━ hr_piece_work_detail ━━━');
    await conn.execute('INSERT INTO hr_piece_work_detail (employee_id, work_date, process_code, product_code, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)', [employees[0].id, '2026-07-05', 'print', 'MAT011', 5000, 0.0200, 100.00]);
    await conn.execute('INSERT INTO hr_piece_work_detail (employee_id, work_date, process_code, product_code, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)', [employees[1].id, '2026-07-08', 'die', 'MAT011', 5000, 0.0100, 50.00]);
    await conn.execute('INSERT INTO hr_piece_work_detail (employee_id, work_date, process_code, product_code, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?)', [employees[2].id, '2026-07-12', 'print', 'MAT012', 1500, 0.0200, 30.00]);

    console.log('━━━ hr_training ━━━');
    await conn.execute('INSERT INTO hr_training (training_no, training_name, training_type, training_date, training_hours, trainer, training_content, training_place, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['TR-001', '安全生产培训', 1, '2026-07-01', 8.0, '安全主管', '安全生产规范学习', '培训室A', 2, 0]);
    await conn.execute('INSERT INTO hr_training (training_no, training_name, training_type, training_date, training_hours, trainer, training_content, training_place, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['TR-002', '印刷技术提升', 2, '2026-07-10', 16.0, '技术总监', '印刷工艺优化', '车间现场', 1, 0]);
    await conn.execute('INSERT INTO hr_training (training_no, training_name, training_type, training_date, training_hours, trainer, training_content, training_place, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['TR-003', '质量管理体系', 3, '2026-07-15', 8.0, '质量经理', 'ISO9001标准', '培训室B', 0, 0]);
    const [trainings] = await conn.execute('SELECT id FROM hr_training');

    console.log('━━━ hr_training_participant ━━━');
    await conn.execute('INSERT INTO hr_training_participant (training_id, employee_id, employee_name, score, is_qualified) VALUES (?, ?, ?, ?, ?)', [trainings[0].id, employees[0].id.toString(), employees[0].name, 95.0, 1]);
    await conn.execute('INSERT INTO hr_training_participant (training_id, employee_id, employee_name, score, is_qualified) VALUES (?, ?, ?, ?, ?)', [trainings[0].id, employees[1].id.toString(), employees[1].name, 90.0, 1]);
    await conn.execute('INSERT INTO hr_training_participant (training_id, employee_id, employee_name, score, is_qualified) VALUES (?, ?, ?, ?, ?)', [trainings[1].id, employees[0].id.toString(), employees[0].name, 88.0, 1]);

    // ═══════════════════════════════════════════════
    // 6. mdm 主数据管理
    // ═══════════════════════════════════════════════
    console.log('━━━ mdm_product ━━━');
    await conn.execute('INSERT INTO mdm_product (product_code, product_name, short_name, specification, unit, customer_id, customer_name, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PROD-001', '空调控制面板标签', '空调标签', '120×80mm', '张', customers[0].id, customers[0].customer_name, 'active', 0]);
    await conn.execute('INSERT INTO mdm_product (product_code, product_name, short_name, specification, unit, customer_id, customer_name, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PROD-002', '洗衣机控制面板', '洗衣机面板', '180×100mm', '张', customers[1].id, customers[1].customer_name, 'active', 0]);
    await conn.execute('INSERT INTO mdm_product (product_code, product_name, short_name, specification, unit, customer_id, customer_name, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PROD-003', '手机电池标签', '电池标签', '50×30mm', '张', customers[2].id, customers[2].customer_name, 'active', 0]);

    // ═══════════════════════════════════════════════
    // 7. work 工单成本
    // ═══════════════════════════════════════════════
    console.log('━━━ work_order_costs ━━━');
    await conn.execute('INSERT INTO work_order_costs (work_order_id, work_order_no, material_cost, labor_cost, manufacturing_cost, total_cost, quantity, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [workOrders[0].id, workOrders[0].work_order_no, 1250.0000, 800.0000, 450.0000, 2500.0000, 5000.0000, 2, 0]);
    await conn.execute('INSERT INTO work_order_costs (work_order_id, work_order_no, material_cost, labor_cost, manufacturing_cost, total_cost, quantity, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [workOrders[1].id, workOrders[1].work_order_no, 750.0000, 480.0000, 270.0000, 1500.0000, 3000.0000, 1, 0]);
    await conn.execute('INSERT INTO work_order_costs (work_order_id, work_order_no, material_cost, labor_cost, manufacturing_cost, total_cost, quantity, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [workOrders[2].id, workOrders[2].work_order_no, 0.0000, 0.0000, 0.0000, 0.0000, 10000.0000, 0, 0]);

    // ═══════════════════════════════════════════════
    // 8. 补充已有表到3条
    // ═══════════════════════════════════════════════
    console.log('━━━ 补充 eqp_calibration ━━━');
    await conn.execute('INSERT INTO eqp_calibration (calibration_no, equipment_id, equipment_code, equipment_name, calibration_date, next_calibration_date, calibration_org, calibration_result, certificate_no, calibration_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CAL-2026-102', equipments[1].id, equipments[1].equipment_code, equipments[1].equipment_name, '2026-03-15', '2027-03-15', '第三方计量机构', 'qualified', 'CAL-2026-002', 600.00]);
    await conn.execute('INSERT INTO eqp_calibration (calibration_no, equipment_id, equipment_code, equipment_name, calibration_date, next_calibration_date, calibration_org, calibration_result, certificate_no, calibration_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['CAL-2026-103', equipments[2].id, equipments[2].equipment_code, equipments[2].equipment_name, '2026-05-20', '2027-05-20', '第三方计量机构', 'qualified', 'CAL-2026-003', 400.00]);

    console.log('━━━ 补充 eqp_maintenance_record ━━━');
    await conn.execute('INSERT INTO eqp_maintenance_record (record_no, equipment_id, maintenance_type, fault_desc, maintenance_content, start_time, end_time, downtime_hours, cost, responsible_id, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['MTN-2026-102', equipments[0].id, 1, '定期保养', '润滑检查', '2026-07-01 08:00:00', '2026-07-01 12:00:00', 4.00, 300.00, employees[0].id, 2]);
    await conn.execute('INSERT INTO eqp_maintenance_record (record_no, equipment_id, maintenance_type, fault_desc, maintenance_content, start_time, end_time, downtime_hours, cost, responsible_id, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['MTN-2026-103', equipments[2].id, 3, '分切刀片磨损', '刀片更换', '2026-07-15 08:00:00', '2026-07-15 16:00:00', 8.00, 800.00, employees[0].id, 2]);

    console.log('━━━ eqp_repair ━━━');
    await conn.execute('INSERT INTO eqp_repair (repair_no, equipment_id, equipment_code, equipment_name, fault_date, fault_desc, repair_type, repair_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['RPR-2026-101', equipments[0].id, equipments[0].equipment_code, equipments[0].equipment_name, '2026-07-03', '丝印头堵塞', 'repair', '维修员A']);
    await conn.execute('INSERT INTO eqp_repair (repair_no, equipment_id, equipment_code, equipment_name, fault_date, fault_desc, repair_type, repair_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['RPR-2026-102', equipments[1].id, equipments[1].equipment_code, equipments[1].equipment_name, '2026-07-08', '液压系统漏油', 'repair', '维修员B']);
    await conn.execute('INSERT INTO eqp_repair (repair_no, equipment_id, equipment_code, equipment_name, fault_date, fault_desc, repair_type, repair_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['RPR-2026-103', equipments[2].id, equipments[2].equipment_code, equipments[2].equipment_name, '2026-07-12', '电机过热', 'repair', '维修员A']);

    console.log('━━━ eqp_scrap ━━━');
    await conn.execute('INSERT INTO eqp_scrap (scrap_no, equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SCRAP-2026-101', equipments[0].id, equipments[0].equipment_code, equipments[0].equipment_name, '2026-07-01', '使用年限到期', 50000.00, 500.00, '管理员']);
    await conn.execute('INSERT INTO eqp_scrap (scrap_no, equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SCRAP-2026-102', equipments[1].id, equipments[1].equipment_code, equipments[1].equipment_name, '2026-07-05', '故障无法修复', 30000.00, 300.00, '管理员']);
    await conn.execute('INSERT INTO eqp_scrap (scrap_no, equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SCRAP-2026-103', equipments[2].id, equipments[2].equipment_code, equipments[2].equipment_name, '2026-07-10', '技术淘汰', 20000.00, 200.00, '管理员']);

    console.log('━━━ eqp_maintenance_plan ━━━');
    await conn.execute('INSERT INTO eqp_maintenance_plan (plan_no, equipment_id, maintenance_type, cycle_type, cycle_value, plan_date, responsible_id, content, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['MP-2026-101', equipments[0].id, 1, 1, 30, '2026-08-01', employees[0].id, '月度保养', 1]);
    await conn.execute('INSERT INTO eqp_maintenance_plan (plan_no, equipment_id, maintenance_type, cycle_type, cycle_value, plan_date, responsible_id, content, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['MP-2026-102', equipments[1].id, 2, 2, 90, '2026-10-01', employees[0].id, '季度保养', 1]);
    await conn.execute('INSERT INTO eqp_maintenance_plan (plan_no, equipment_id, maintenance_type, cycle_type, cycle_value, plan_date, responsible_id, content, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['MP-2026-103', equipments[2].id, 3, 3, 365, '2027-07-01', employees[0].id, '年度保养', 1]);

    console.log('━━━ fin_account ━━━');
    await conn.execute('INSERT INTO fin_account (account_code, account_name, account_type, balance_direction, status, deleted) VALUES (?, ?, ?, ?, ?, ?)', ['1001', '银行存款', 1, 1, 1, 0]);
    await conn.execute('INSERT INTO fin_account (account_code, account_name, account_type, balance_direction, status, deleted) VALUES (?, ?, ?, ?, ?, ?)', ['1002', '库存现金', 1, 1, 1, 0]);
    await conn.execute('INSERT INTO fin_account (account_code, account_name, account_type, balance_direction, status, deleted) VALUES (?, ?, ?, ?, ?, ?)', ['1122', '应收账款', 1, 1, 1, 0]);
    await conn.execute('INSERT INTO fin_account (account_code, account_name, account_type, balance_direction, status, deleted) VALUES (?, ?, ?, ?, ?, ?)', ['2202', '应付账款', 2, 2, 1, 0]);
    await conn.execute('INSERT INTO fin_account (account_code, account_name, account_type, balance_direction, status, deleted) VALUES (?, ?, ?, ?, ?, ?)', ['5001', '生产成本', 5, 1, 1, 0]);
    await conn.execute('INSERT INTO fin_account (account_code, account_name, account_type, balance_direction, status, deleted) VALUES (?, ?, ?, ?, ?, ?)', ['1403', '原材料', 1, 1, 1, 0]);
    const [accounts] = await conn.execute('SELECT id, account_code FROM fin_account');

    console.log('━━━ fin_account_balance ━━━');
    await conn.execute('INSERT INTO fin_account_balance (period_code, account_id, account_code, begin_debit, begin_credit, current_debit, current_credit, end_debit, end_credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['2026-07', accounts[0].id, accounts[0].account_code, 950000.0000, 0.0000, 100000.0000, 50000.0000, 1000000.0000, 0.0000]);
    await conn.execute('INSERT INTO fin_account_balance (period_code, account_id, account_code, begin_debit, begin_credit, current_debit, current_credit, end_debit, end_credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['2026-07', accounts[1].id, accounts[1].account_code, 45000.0000, 0.0000, 10000.0000, 5000.0000, 50000.0000, 0.0000]);
    await conn.execute('INSERT INTO fin_account_balance (period_code, account_id, account_code, begin_debit, begin_credit, current_debit, current_credit, end_debit, end_credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['2026-07', accounts[2].id, accounts[2].account_code, 0.0000, 0.0000, 2500.0000, 1500.0000, 1000.0000, 0.0000]);

    console.log('━━━ fin_voucher ━━━');
    await conn.execute('INSERT INTO fin_voucher (voucher_no, period_code, voucher_date, voucher_type, total_debit, total_credit, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['VOU-2026-101', '2026-07', '2026-07-05', 1, 1500.0000, 1500.0000, 2, 0]);
    await conn.execute('INSERT INTO fin_voucher (voucher_no, period_code, voucher_date, voucher_type, total_debit, total_credit, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['VOU-2026-102', '2026-07', '2026-07-08', 2, 8500.0000, 8500.0000, 2, 0]);
    await conn.execute('INSERT INTO fin_voucher (voucher_no, period_code, voucher_date, voucher_type, total_debit, total_credit, status, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['VOU-2026-103', '2026-07', '2026-07-10', 3, 2500.0000, 2500.0000, 2, 0]);
    const [vouchers] = await conn.execute('SELECT id FROM fin_voucher');

    console.log('━━━ fin_voucher_line ━━━');
    await conn.execute('INSERT INTO fin_voucher_line (voucher_id, line_no, account_id, account_code, debit_amount, credit_amount) VALUES (?, ?, ?, ?, ?, ?)', [vouchers[0].id, 1, accounts[0].id, accounts[0].account_code, 1500.0000, 0.0000]);
    await conn.execute('INSERT INTO fin_voucher_line (voucher_id, line_no, account_id, account_code, debit_amount, credit_amount) VALUES (?, ?, ?, ?, ?, ?)', [vouchers[0].id, 2, accounts[2].id, accounts[2].account_code, 0.0000, 1500.0000]);
    await conn.execute('INSERT INTO fin_voucher_line (voucher_id, line_no, account_id, account_code, debit_amount, credit_amount) VALUES (?, ?, ?, ?, ?, ?)', [vouchers[1].id, 1, accounts[3].id, accounts[3].account_code, 8500.0000, 0.0000]);
    await conn.execute('INSERT INTO fin_voucher_line (voucher_id, line_no, account_id, account_code, debit_amount, credit_amount) VALUES (?, ?, ?, ?, ?, ?)', [vouchers[1].id, 2, accounts[0].id, accounts[0].account_code, 0.0000, 8500.0000]);
    await conn.execute('INSERT INTO fin_voucher_line (voucher_id, line_no, account_id, account_code, debit_amount, credit_amount) VALUES (?, ?, ?, ?, ?, ?)', [vouchers[2].id, 1, accounts[4].id, accounts[4].account_code, 2500.0000, 0.0000]);
    await conn.execute('INSERT INTO fin_voucher_line (voucher_id, line_no, account_id, account_code, debit_amount, credit_amount) VALUES (?, ?, ?, ?, ?, ?)', [vouchers[2].id, 2, accounts[5].id, accounts[5].account_code, 0.0000, 2500.0000]);

    console.log('━━━ fin_payment_record ━━━');
    await conn.execute('INSERT INTO fin_payment_record (payment_no, payable_id, supplier_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?, ?, ?)', ['PAY-2026-101', payables[0].id, suppliers[0].id, 8500.0000, 'bank', '2026-07-08']);
    await conn.execute('INSERT INTO fin_payment_record (payment_no, payable_id, supplier_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?, ?, ?)', ['PAY-2026-102', payables[1].id, suppliers[1].id, 4960.0000, 'bank', '2026-07-10']);
    await conn.execute('INSERT INTO fin_payment_record (payment_no, payable_id, supplier_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?, ?, ?)', ['PAY-2026-103', payables[2].id, suppliers[2].id, 1750.0000, 'bank', '2026-08-10']);

    console.log('━━━ fin_receipt_record ━━━');
    await conn.execute('INSERT INTO fin_receipt_record (receipt_no, receivable_id, customer_id, amount, payment_method, receipt_date) VALUES (?, ?, ?, ?, ?, ?)', ['RCP-2026-101', receivables[0].id, customers[0].id, 1500.0000, 'bank', '2026-07-05']);
    await conn.execute('INSERT INTO fin_receipt_record (receipt_no, receivable_id, customer_id, amount, payment_method, receipt_date) VALUES (?, ?, ?, ?, ?, ?)', ['RCP-2026-102', receivables[1].id, customers[1].id, 3600.0000, 'bank', '2026-08-01']);
    await conn.execute('INSERT INTO fin_receipt_record (receipt_no, receivable_id, customer_id, amount, payment_method, receipt_date) VALUES (?, ?, ?, ?, ?, ?)', ['RCP-2026-103', receivables[2].id, customers[2].id, 1500.0000, 'bank', '2026-08-15']);

    console.log('━━━ crm_customer_contact ━━━');
    await conn.execute('INSERT INTO crm_customer_contact (customer_id, contact_name, position, phone, email, is_primary) VALUES (?, ?, ?, ?, ?, ?)', [customers[0].id, '赵经理', '采购主管', '13800138001', 'zhao@midea.com', 1]);
    await conn.execute('INSERT INTO crm_customer_contact (customer_id, contact_name, position, phone, email, is_primary) VALUES (?, ?, ?, ?, ?, ?)', [customers[1].id, '李经理', '采购经理', '13800138002', 'li@gree.com', 1]);
    await conn.execute('INSERT INTO crm_customer_contact (customer_id, contact_name, position, phone, email, is_primary) VALUES (?, ?, ?, ?, ?, ?)', [customers[2].id, '王经理', '采购专员', '13800138003', 'wang@haier.com', 1]);

    console.log('━━━ crm_customer_analysis ━━━');
    await conn.execute('INSERT INTO crm_customer_analysis (customer_id, customer_name, analysis_period, period_start, period_end, order_count, order_amount, on_time_rate, satisfaction_score, customer_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [customers[0].id, customers[0].customer_name, '2026-07', '2026-07-01', '2026-07-31', 1, 2500.00, 100.00, 95.0, 'A']);
    await conn.execute('INSERT INTO crm_customer_analysis (customer_id, customer_name, analysis_period, period_start, period_end, order_count, order_amount, on_time_rate, satisfaction_score, customer_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [customers[1].id, customers[1].customer_name, '2026-07', '2026-07-01', '2026-07-31', 1, 3600.00, 100.00, 90.0, 'A']);
    await conn.execute('INSERT INTO crm_customer_analysis (customer_id, customer_name, analysis_period, period_start, period_end, order_count, order_amount, on_time_rate, satisfaction_score, customer_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [customers[2].id, customers[2].customer_name, '2026-07', '2026-07-01', '2026-07-31', 1, 1500.00, 100.00, 88.0, 'B']);

    console.log('━━━ crm_customer_follow_up ━━━');
    await conn.execute('INSERT INTO crm_customer_follow_up (customer_id, follow_up_type, follow_up_content, follow_up_time, follow_up_by) VALUES (?, ?, ?, ?, ?)', [customers[0].id, 1, '确认订单交期', '2026-07-05 10:00:00', employees[0].id]);
    await conn.execute('INSERT INTO crm_customer_follow_up (customer_id, follow_up_type, follow_up_content, follow_up_time, follow_up_by) VALUES (?, ?, ?, ?, ?)', [customers[1].id, 2, '客户工厂拜访', '2026-07-10 14:00:00', employees[1].id]);
    await conn.execute('INSERT INTO crm_customer_follow_up (customer_id, follow_up_type, follow_up_content, follow_up_time, follow_up_by) VALUES (?, ?, ?, ?, ?)', [customers[2].id, 1, '报价确认', '2026-07-15 09:00:00', employees[0].id]);

    console.log('━━━ crm_follow_record ━━━');
    await conn.execute('INSERT INTO crm_follow_record (customer_id, customer_name, follow_type, follow_content, contact_name, salesman_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [customers[0].id, customers[0].customer_name, 'phone', '客户确认接受原定交期', '赵经理', '张三', 2]);
    await conn.execute('INSERT INTO crm_follow_record (customer_id, customer_name, follow_type, follow_content, contact_name, salesman_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [customers[1].id, customers[1].customer_name, 'visit', '客户提出新需求', '李经理', '李四', 1]);
    await conn.execute('INSERT INTO crm_follow_record (customer_id, customer_name, follow_type, follow_content, contact_name, salesman_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [customers[2].id, customers[2].customer_name, 'email', '客户确认报价', '王经理', '张三', 2]);

    console.log('━━━ pur_supplier_material ━━━');
    await conn.execute('INSERT INTO pur_supplier_material (supplier_id, material_id, supply_price, min_order_qty, lead_time, is_default, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [suppliers[0].id, materials[0].id, 8.5000, 100.0000, 7, 1, 1]);
    await conn.execute('INSERT INTO pur_supplier_material (supplier_id, material_id, supply_price, min_order_qty, lead_time, is_default, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [suppliers[1].id, materials[1].id, 6.2000, 80.0000, 5, 1, 1]);
    await conn.execute('INSERT INTO pur_supplier_material (supplier_id, material_id, supply_price, min_order_qty, lead_time, is_default, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [suppliers[2].id, materials[4].id, 35.0000, 10.0000, 10, 1, 1]);

    console.log('━━━ pur_purchase_reconciliation ━━━');
    await conn.execute('INSERT INTO pur_purchase_reconciliation (reconciliation_no, status, supplier_id, supplier_name, period_start, period_end, receipt_amount, return_amount, net_amount, discount_amount, paid_amount, balance_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PRC-2026-101', 2, suppliers[0].id, suppliers[0].supplier_name, '2026-07-01', '2026-07-31', 8500.00, 0.00, 8500.00, 0.00, 8500.00, 0.00]);
    await conn.execute('INSERT INTO pur_purchase_reconciliation (reconciliation_no, status, supplier_id, supplier_name, period_start, period_end, receipt_amount, return_amount, net_amount, discount_amount, paid_amount, balance_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PRC-2026-102', 2, suppliers[1].id, suppliers[1].supplier_name, '2026-07-01', '2026-07-31', 4960.00, 0.00, 4960.00, 0.00, 4960.00, 0.00]);
    await conn.execute('INSERT INTO pur_purchase_reconciliation (reconciliation_no, status, supplier_id, supplier_name, period_start, period_end, receipt_amount, return_amount, net_amount, discount_amount, paid_amount, balance_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PRC-2026-103', 1, suppliers[2].id, suppliers[2].supplier_name, '2026-07-01', '2026-07-31', 1750.00, 0.00, 1750.00, 0.00, 0.00, 1750.00]);
    const [prc] = await conn.execute('SELECT id FROM pur_purchase_reconciliation');

    console.log('━━━ pur_purchase_reconciliation_writeoff ━━━');
    await conn.execute('INSERT INTO pur_purchase_reconciliation_writeoff (reconciliation_id, payable_id, amount, write_off_date) VALUES (?, ?, ?, ?)', [prc[0].id, payables[0].id, 8500.00, '2026-07-08']);
    await conn.execute('INSERT INTO pur_purchase_reconciliation_writeoff (reconciliation_id, payable_id, amount, write_off_date) VALUES (?, ?, ?, ?)', [prc[1].id, payables[1].id, 4960.00, '2026-07-10']);
    await conn.execute('INSERT INTO pur_purchase_reconciliation_writeoff (reconciliation_id, payable_id, amount, write_off_date) VALUES (?, ?, ?, ?)', [prc[2].id, payables[2].id, 0.00, '2026-08-10']);

    console.log('━━━ outsource_issue_item ━━━');
    if (outIssues.length > 0) {
      await conn.execute('INSERT INTO outsource_issue_item (issue_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)', [outIssues[0].id, materials[0].id, materials[0].material_code, materials[0].material_name, 100.00, 'M', 'B20260701-PVC']);
      await conn.execute('INSERT INTO outsource_issue_item (issue_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)', [outIssues[0].id, materials[1].id, materials[1].material_code, materials[1].material_name, 80.00, 'M', 'B20260703-PE']);
      await conn.execute('INSERT INTO outsource_issue_item (issue_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)', [outIssues[0].id, materials[4].id, materials[4].material_code, materials[4].material_name, 10.00, 'kg', 'B20260705-INK']);
    }

    console.log('━━━ srm_supplier_eval_item ━━━');
    for (const e of evals) {
      await conn.execute('INSERT INTO srm_supplier_eval_item (eval_id, category, item_name, weight, score, remark) VALUES (?, ?, ?, ?, ?, ?)', [e.id, 'quality', '产品质量', 30.00, 95.00, '质量稳定']);
      await conn.execute('INSERT INTO srm_supplier_eval_item (eval_id, category, item_name, weight, score, remark) VALUES (?, ?, ?, ?, ?, ?)', [e.id, 'delivery', '交货准时率', 25.00, 90.00, '交期准时']);
    }

    // ═══════════════════════════════════════════════
    // 9. 补充业务表到3条
    // ═══════════════════════════════════════════════
    console.log('━━━ 补充 prd_material_return ━━━');
    await conn.execute('INSERT INTO prd_material_return (return_no, work_order_id, work_order_no, warehouse_id, return_date, operator_name, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['RT-2026-102', workOrders[1].id, workOrders[1].work_order_no, warehouses[0].id, '2026-07-15', '张三', 2, '余料退回']);
    await conn.execute('INSERT INTO prd_material_return (return_no, work_order_id, work_order_no, warehouse_id, return_date, operator_name, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['RT-2026-103', workOrders[2].id, workOrders[2].work_order_no, warehouses[0].id, '2026-07-20', '张三', 1, '余料退回']);

    console.log('━━━ 补充 prd_finish_order ━━━');
    await conn.execute('INSERT INTO prd_finish_order (finish_no, work_order_id, warehouse_id, qualified_qty, defective_qty, status) VALUES (?, ?, ?, ?, ?, ?)', ['FIN-2026-103', workOrders[2].id, warehouses[2].id, 0, 0, 1]);

    console.log('━━━ 补充 prd_work_report ━━━');
    await conn.execute('INSERT INTO prd_work_report (report_no, work_order_id, work_order_no, process_name, plan_qty, completed_qty, qualified_qty, defective_qty, operator_id, operator_name, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['WR-2026-103', workOrders[2].id, workOrders[2].work_order_no, '印刷', 10000, 0, 0, 0, employees[0].id, employees[0].name, '2026-07-20 08:00:00', '2026-07-25 17:00:00']);

    console.log('━━━ 补充 prd_process_card ━━━');
    await conn.execute('INSERT INTO prd_process_card (card_no, work_order_id, work_order_no, product_code, product_name, material_spec, work_order_date, plan_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['PC-102', workOrders[1].id, workOrders[1].work_order_no, materials[6].material_code, materials[6].material_name, '180×100mm', '2026-07-12', 3000]);
    await conn.execute('INSERT INTO prd_process_card (card_no, work_order_id, work_order_no, product_code, product_name, material_spec, work_order_date, plan_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['PC-103', workOrders[2].id, workOrders[2].work_order_no, materials[7].material_code, materials[7].material_name, '50×30mm', '2026-07-20', 10000]);

    console.log('━━━ 补充 sal_return_order ━━━');
    await conn.execute('INSERT INTO sal_return_order (return_no, order_id, order_no, customer_id, customer_name, return_date, return_type, return_reason, total_qty, total_amount, warehouse_id, inbound_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SR-2026-102', salesOrders[1].id, salesOrders[1].order_no, customers[1].id, customers[1].customer_name, '2026-07-18', 1, '规格不符', 50, 60, warehouses[2].id, 1, 2]);
    await conn.execute('INSERT INTO sal_return_order (return_no, order_id, order_no, customer_id, customer_name, return_date, return_type, return_reason, total_qty, total_amount, warehouse_id, inbound_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['SR-2026-103', salesOrders[2].id, salesOrders[2].order_no, customers[2].id, customers[2].customer_name, '2026-07-25', 1, '数量不符', 200, 30, warehouses[2].id, 1, 2]);

    console.log('━━━ 补充 sal_reconciliation ━━━');
    await conn.execute('INSERT INTO sal_reconciliation (reconciliation_no, customer_id, customer_name, period_start, period_end, delivery_amount, return_amount, discount_amount, net_amount, received_amount, balance_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['REC-2026-102', customers[1].id, customers[1].customer_name, '2026-07-01', '2026-07-31', 3600.00, 60.00, 0.00, 3540.00, 0.00, 3540.00, 1]);
    await conn.execute('INSERT INTO sal_reconciliation (reconciliation_no, customer_id, customer_name, period_start, period_end, delivery_amount, return_amount, discount_amount, net_amount, received_amount, balance_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['REC-2026-103', customers[2].id, customers[2].customer_name, '2026-07-01', '2026-07-31', 1500.00, 30.00, 0.00, 1470.00, 0.00, 1470.00, 1]);

    // ═══════════════════════════════════════════════
    // 10. 事件表
    // ═══════════════════════════════════════════════
    console.log('━━━ domain_event_outbox ━━━');
    await conn.execute('INSERT INTO domain_event_outbox (event_type, aggregate_type, aggregate_id, payload, status, retry_count, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)', ['OrderCreated', 'SalesOrder', salesOrders[0].id, JSON.stringify({ orderNo: salesOrders[0].order_no }), 'published', 0, '2026-07-01 00:00:00']);
    await conn.execute('INSERT INTO domain_event_outbox (event_type, aggregate_type, aggregate_id, payload, status, retry_count, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)', ['OrderCreated', 'SalesOrder', salesOrders[1].id, JSON.stringify({ orderNo: salesOrders[1].order_no }), 'published', 0, '2026-07-08 00:00:00']);
    await conn.execute('INSERT INTO domain_event_outbox (event_type, aggregate_type, aggregate_id, payload, status, retry_count, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)', ['OrderCreated', 'SalesOrder', salesOrders[2].id, JSON.stringify({ orderNo: salesOrders[2].order_no }), 'pending', 0, '2026-07-14 00:00:00']);

    console.log('━━━ saga_log ━━━');
    await conn.execute('INSERT INTO saga_log (saga_id, saga_type, status, payload, created_at) VALUES (?, ?, ?, ?, ?)', ['saga-001', 'OrderProcessing', 'completed', JSON.stringify({ orderNo: salesOrders[0].order_no }), '2026-07-01 00:00:00']);
    await conn.execute('INSERT INTO saga_log (saga_id, saga_type, status, payload, created_at) VALUES (?, ?, ?, ?, ?)', ['saga-002', 'OrderProcessing', 'in_progress', JSON.stringify({ orderNo: salesOrders[1].order_no }), '2026-07-08 00:00:00']);
    await conn.execute('INSERT INTO saga_log (saga_id, saga_type, status, payload, created_at) VALUES (?, ?, ?, ?, ?)', ['saga-003', 'OrderProcessing', 'pending', JSON.stringify({ orderNo: salesOrders[2].order_no }), '2026-07-14 00:00:00']);

    await conn.commit();
    console.log('\n✅ 所有数据已提交！');

  } catch (e) {
    await conn.rollback();
    console.error('\n❌ 事务已回滚:', e.message);
    throw e;
  } finally {
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    await conn.end();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });