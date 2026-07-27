import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '127.0.0.1', port: 3306, user: 'root',
  password: 'Snqig521223', database: 'vnerpdacahng', charset: 'utf8mb4',
};

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ 数据库连接成功\n');

  const [suppliers] = await conn.execute('SELECT id, supplier_name FROM pur_supplier LIMIT 3');
  const [materials] = await conn.execute('SELECT id, material_code, material_name FROM inv_material LIMIT 8');
  const [warehouses] = await conn.execute('SELECT id FROM inv_warehouse LIMIT 3');
  const [purchaseOrders] = await conn.execute('SELECT id, po_no FROM pur_purchase_order LIMIT 3');
  const [outsourceOrders] = await conn.execute('SELECT id, order_no FROM outsource_order LIMIT 3');
  const [inspections] = await conn.execute('SELECT id FROM qc_inspection LIMIT 3');

  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  await conn.beginTransaction();

  try {
    // 补充 fin_period
    console.log('━━━ 补充 fin_period ━━━');
    await conn.execute('INSERT INTO fin_period (period_code, period_name, start_date, end_date, is_closed, status) VALUES (?, ?, ?, ?, ?, ?)', ['2026-08', '2026年08月', '2026-08-01', '2026-08-31', 0, 1]);
    await conn.execute('INSERT INTO fin_period (period_code, period_name, start_date, end_date, is_closed, status) VALUES (?, ?, ?, ?, ?, ?)', ['2026-09', '2026年09月', '2026-09-01', '2026-09-30', 0, 1]);

    // 补充 hr_salary_standard
    console.log('━━━ 补充 hr_salary_standard ━━━');
    await conn.execute('INSERT INTO hr_salary_standard (position_code, skill_level, base_salary, piece_rate_type, performance_base, effective_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)', ['OPERATOR', 1, 3000, 'fixed', 1000, '2026-01-01', 1]);
    await conn.execute('INSERT INTO hr_salary_standard (position_code, skill_level, base_salary, piece_rate_type, performance_base, effective_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)', ['TECHNICIAN', 2, 4500, 'fixed', 1500, '2026-01-01', 1]);

    // 补充 prd_bom
    console.log('━━━ 补充 prd_bom ━━━');
    await conn.execute('INSERT INTO prd_bom (bom_name, product_id, version, status) VALUES (?, ?, ?, ?)', ['洗衣机面板BOM', materials[6].id, 'V1.0', 1]);
    await conn.execute('INSERT INTO prd_bom (bom_name, product_id, version, status) VALUES (?, ?, ?, ?)', ['电池标签BOM', materials[7].id, 'V1.0', 1]);

    // 补充 pur_purchase_return
    console.log('━━━ 补充 pur_purchase_return ━━━');
    await conn.execute('INSERT INTO pur_purchase_return (return_no, order_id, order_no, supplier_id, supplier_name, warehouse_id, reason, return_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PR-2026-102', purchaseOrders[1].id, purchaseOrders[1].po_no, suppliers[1].id, suppliers[1].supplier_name, warehouses[0].id, '质量问题', '2026-07-15', 500, 2]);
    await conn.execute('INSERT INTO pur_purchase_return (return_no, order_id, order_no, supplier_id, supplier_name, warehouse_id, reason, return_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['PR-2026-103', purchaseOrders[2].id, purchaseOrders[2].po_no, suppliers[2].id, suppliers[2].supplier_name, warehouses[0].id, '规格不符', '2026-07-20', 200, 1]);

    // 补充 outsource_issue
    console.log('━━━ 补充 outsource_issue ━━━');
    if (outsourceOrders.length > 0) {
      await conn.execute('INSERT INTO outsource_issue (issue_no, outsource_order_id, outsource_order_no, warehouse_id, issue_date, status) VALUES (?, ?, ?, ?, ?, ?)', ['OSI-2026-103', outsourceOrders[2].id, outsourceOrders[2].order_no, warehouses[0].id, '2026-07-15', 2]);
    }

    // 补充 outsource_receive
    console.log('━━━ 补充 outsource_receive ━━━');
    if (outsourceOrders.length > 0) {
      await conn.execute('INSERT INTO outsource_receive (receive_no, outsource_order_id, outsource_order_no, warehouse_id, receive_date, status) VALUES (?, ?, ?, ?, ?, ?)', ['OSR-2026-103', outsourceOrders[2].id, outsourceOrders[2].order_no, warehouses[0].id, '2026-07-18', 2]);
    }

    // 补充 outsource_settlement
    console.log('━━━ 补充 outsource_settlement ━━━');
    if (outsourceOrders.length > 0) {
      await conn.execute('INSERT INTO outsource_settlement (settlement_no, outsource_order_id, outsource_order_no, supplier_id, supplier_name, settlement_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)', ['OSS-2026-103', outsourceOrders[2].id, outsourceOrders[2].order_no, suppliers[2].id, suppliers[2].supplier_name, '2026-07-25', 1]);
    }

    // 补充 qc_unqualified
    console.log('━━━ 补充 qc_unqualified ━━━');
    if (inspections.length > 0) {
      await conn.execute('INSERT INTO qc_unqualified (unqualified_no, inspection_id, material_id, material_code, material_name, quantity, defect_type, defect_desc, handle_type, handle_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['UQ-2026-103', inspections[2].id, materials[0].id, materials[0].material_code, materials[0].material_name, 50, '外观瑕疵', '表面划痕', 1, 2]);
    }

    await conn.commit();
    console.log('\n✅ 补充数据已提交！');
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
