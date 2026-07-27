import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const missingTables = [
  // 生产工艺
  'prd_process_card_material',
  'prd_process_route',
  'prd_process_route_step',
  'prd_product_label',
  
  // 数码印刷
  'dcprint_ink_color',
  'dcprint_ink_formula_item',
  'dcprint_ink_formula_version',
  'dcprint_sample_process_item',
  'dcprint_sample_process_step',
  'dcprint_sample_process_template_item',
  'dcprint_sample_process_template_step',
  'dcprint_tool',
  'dcprint_tool_maintenance',
  'dcprint_tool_usage',
  'ink_opening_record',
  'ink_mixed_record',
  'ink_mixed_batch_detail',
  
  // 工程
  'prd_die_template',
  
  // PLM
  'plm_lifecycle',
  'plm_eco',
  
  // 质量管理
  'qms_sgs_cert',
  'qms_sgs_cert_item',
  'qms_complaint',
  'qms_lab_test',
  'qms_supplier_audit',
  
  // 二维码
  'qr_code_record',
  
  // 财务应收
  'fin_receivable_line',
  
  // HR
  'hr_organization',
  'hr_shifts',
  'hr_schedules',
  'hr_skills',
  'hr_certificates',
  'hr_mes_sync',
  'hr_payroll_snapshot',
  'hr_piece_work_detail',
  'hr_salary_calculation',
  'hr_salary_profile',
  'hr_training_participant',
];

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'vnerpdacahng',
    charset: 'utf8mb4',
  });

  for (const table of missingTables) {
    try {
      const [rows] = await conn.execute(`DESCRIBE ${table}`);
      console.log(`\n=== ${table} ===`);
      console.log(rows);
    } catch (err) {
      console.log(`\n=== ${table} ===`);
      console.log(`表不存在或查询失败: ${err.message}`);
    }
  }

  await conn.end();
}

main().catch(console.error);
