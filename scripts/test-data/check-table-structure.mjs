import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

const TABLES_TO_CHECK = [
  'base_ink', 'bom_line', 'dcprint_ink_formula_version', 'dcprint_ink_formula_item',
  'dcprint_sample_process_card', 'dcprint_sample_process_item', 'dcprint_sample_process_step',
  'dcprint_sample_process_template', 'dcprint_sample_process_template_item', 'dcprint_sample_process_template_step',
  'dcprint_tool', 'dcprint_tool_maintenance', 'dcprint_tool_usage',
  'eq_equipment', 'eq_maintenance_plan', 'eq_maintenance_record',
  'hr_payroll_snapshot', 'hr_piece_work_detail', 'hr_salary_calculation', 'hr_salary_profile',
  'hr_training', 'hr_training_participant',
  'mdm_product', 'work_order_costs',
  'domain_event_outbox', 'saga_log',
  'eqp_repair', 'eqp_scrap', 'eqp_maintenance_plan',
  'fin_account', 'fin_account_balance', 'fin_voucher', 'fin_voucher_line',
  'fin_payment_record', 'fin_receipt_record',
  'crm_customer_contact', 'crm_customer_analysis', 'crm_customer_follow_up', 'crm_follow_record',
  'pur_supplier_material', 'pur_purchase_reconciliation', 'pur_purchase_reconciliation_writeoff',
  'outsource_issue_item', 'srm_supplier_eval_item',
];

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  
  for (const table of TABLES_TO_CHECK) {
    try {
      const [cols] = await conn.execute(`SHOW COLUMNS FROM \`${table}\``);
      if (cols.length === 0) continue;
      
      console.log(`\n=== ${table} ===`);
      for (const col of cols) {
        console.log(`  ${col.Field} ${col.Type} ${col.Null === 'YES' ? '(NULL)' : ''} ${col.Key === 'PRI' ? '(PK)' : ''}`);
      }
    } catch (e) {
      console.log(`\n=== ${table} ===`);
      console.log(`  ❌ ${e.message}`);
    }
  }
  
  await conn.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
