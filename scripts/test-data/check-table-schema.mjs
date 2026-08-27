import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

const tablesToCheck = [
  'prd_process_card_material',
  'prd_process_route',
  'prd_process_route_step',
  'prd_product_label',
  'ink_opening_record',
  'ink_mixed_record',
  'ink_mixed_batch_detail',
  'dcprint_ink_color',
  'dcprint_ink_formula_item',
  'dcprint_ink_formula_version',
  'prd_die_template',
  'plm_lifecycle',
  'plm_eco',
  'inv_sales_outbound',
  'inv_sales_outbound_item',
  'qms_sgs_cert',
  'qms_sgs_cert_item',
  'qms_complaint',
  'qms_lab_test',
  'qms_supplier_audit',
  'qr_code_record',
  'fin_receivable_line',
  'hr_training_participant',
  'hr_organization',
  'hr_shifts',
  'hr_schedules',
  'hr_skills',
  'hr_certificates',
  'hr_payroll_snapshot',
  'hr_piece_work_detail',
  'hr_salary_calculation',
  'hr_salary_profile',
  'hr_mes_sync',
];

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  
  for (const table of tablesToCheck) {
    try {
      const [columns] = await conn.execute(`DESCRIBE ${table}`);
      console.log(`\n=== ${table} ===`);
      for (const col of columns) {
        console.log(`  ${col.Field} ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''}`);
      }
    } catch (err) {
      console.log(`\n=== ${table} ===`);
      console.log(`  表不存在或查询失败: ${err.message}`);
    }
  }
  
  await conn.end();
}

main().catch(console.error);
