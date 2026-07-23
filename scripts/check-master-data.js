// 检查现有主数据与配置，供测试数据生成脚本参考
const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Snqig521223',
    database: 'vnerpdacahng',
    charset: 'utf8mb4',
  });

  const run = async (label, sql) => {
    try {
      const [rows] = await c.execute(sql);
      console.log(`\n===== ${label} (${rows.length} rows) =====`);
      console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
      console.log(`\n===== ${label} ERROR: ${e.message} =====`);
    }
  };

  // 1. 系统配置
  await run('sys_config (currency/tax/exchange)', `SELECT config_key, config_value FROM sys_config WHERE config_key IN ('currency','tax_rate','default_currency','default_exchange_rate','exchange_rate') AND deleted = 0`);

  // 2. 汇率表
  await run('sys_exchange_rate', `SELECT from_currency, to_currency, rate, rate_date FROM sys_exchange_rate ORDER BY rate_date DESC LIMIT 10`);

  // 3. HR 配置相关 - 薪资标准 / 计件单价
  await run('hr_salary_standard', `SELECT id, position_code, skill_level, base_salary, performance_base, effective_date, status FROM hr_salary_standard WHERE deleted=0 LIMIT 10`);
  await run('hr_piece_rate', `SELECT id, process_code, product_type, unit_price, unit, effective_date, status FROM hr_piece_rate WHERE deleted=0 LIMIT 10`);

  // 4. 供应商
  await run('pur_supplier', `SELECT id, supplier_code, supplier_name, default_currency, status FROM pur_supplier WHERE deleted=0 ORDER BY id LIMIT 10`);

  // 5. 物料
  await run('inv_material', `SELECT id, material_code, material_name, specification, unit, is_batch_managed, purchase_price, warehouse_id, status FROM inv_material WHERE deleted=0 ORDER BY id LIMIT 20`);

  // 6. 员工
  await run('sys_employee', `SELECT id, employee_no, name, dept_name, position, skill_level, status FROM sys_employee WHERE deleted=0 ORDER BY id LIMIT 10`);

  // 7. 仓库
  await run('inv_warehouse', `SELECT id, warehouse_code, warehouse_name, warehouse_type, status FROM inv_warehouse WHERE deleted=0 ORDER BY id LIMIT 10`);

  // 8. 客户
  await run('crm_customer', `SELECT id, customer_code, customer_name, status FROM crm_customer WHERE deleted=0 ORDER BY id LIMIT 5`);

  // 9. 组织架构 - 工厂/车间
  await run('org_factory', `SELECT id, code, name FROM org_factory WHERE deleted=0 LIMIT 5`);
  await run('org_workshop', `SELECT id, code, name, factory_id FROM org_workshop WHERE deleted=0 LIMIT 5`);

  // 10. 检查业务表是否已有数据
  await run('pur_purchase_order count', `SELECT COUNT(*) as cnt FROM pur_purchase_order`);
  await run('inv_inventory_batch count', `SELECT COUNT(*) as cnt FROM inv_inventory_batch`);
  await run('prd_work_order count', `SELECT COUNT(*) as cnt FROM prd_work_order`);
  await run('hr_salary_profile count', `SELECT COUNT(*) as cnt FROM hr_salary_profile`);
  await run('hr_piece_work_detail count', `SELECT COUNT(*) as cnt FROM hr_piece_work_detail`);

  // 11. 检查外键约束
  await run('foreign_keys', `SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='vnerpdacahng' AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_NAME IN ('pur_purchase_order_line','inv_inbound_item','inv_inventory_batch','prd_schedule','prd_material_issue','prd_material_issue_item','hr_piece_work_detail','hr_salary_profile','hr_salary_calculation') ORDER BY TABLE_NAME`);

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
