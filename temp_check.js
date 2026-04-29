const mysql = require('mysql2/promise');
async function main() {
  const conn = await mysql.createConnection({host:'127.0.0.1',user:'root',password:'Snqig521223',database:'vnerpdacahng'});
  
  const tables = ['base_ink', 'bom_alternative', 'crm_customer_analysis', 'crm_follow_record', 'delivery_vehicle_cost', 'delivery_vehicle_repair', 'delivery_vehicle', 'fin_cost_record', 'hr_training', 'hr_training_participant', 'ink_mixed_record', 'qms_sgs_cert', 'qms_sgs_cert_item', 'srm_supplier_eval', 'srm_supplier_eval_item', 'sys_notice', 'sys_oper_log', 'sys_operation_log', 'eqp_calibration', 'eqp_repair', 'eqp_scrap'];
  
  for (const table of tables) {
    try {
      const [cols] = await conn.execute('SHOW COLUMNS FROM `' + table + '`');
      const colInfo = cols.map(c => `${c.Field}(${c.Type})`).join(', ');
      console.log(table + ': ' + colInfo);
    } catch(e) {
      console.log(table + ': ERROR - ' + e.message);
    }
  }
  
  await conn.end();
}
main().catch(e => console.error(e));
