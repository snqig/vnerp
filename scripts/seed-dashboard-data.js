const mysql = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'vnerpdacahng',
  });

  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

  console.log('Seeding inv_outbound_order...');
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    await conn.query(
      `INSERT INTO inv_outbound_order (order_no, order_date, outbound_type, warehouse_id, warehouse_code, warehouse_name, total_qty, total_amount, currency, status, remark, operator_name, audit_status, create_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `OUT-${String(i).padStart(4, '0')}`,
        d.toISOString().slice(0, 10),
        ['sales', 'production', 'return'][i % 3],
        (i % 20) + 1,
        `WH-${String((i % 20) + 1).padStart(3, '0')}`,
        `仓库${(i % 20) + 1}`,
        Math.floor(Math.random() * 500) + 10,
        Math.floor(Math.random() * 50000) + 1000,
        'CNY',
        ['draft', 'confirmed', 'completed'][i % 3],
        `出库备注${i}`,
        `操作员${i}`,
        ['pending', 'approved'][i % 2],
        fmt(d),
        fmt(d),
        0,
      ]
    );
  }

  console.log('Seeding inv_inventory_transaction...');
  const types = ['in', 'out', 'transfer', 'adjust', 'return'];
  for (let i = 1; i <= 50; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    await conn.query(
      `INSERT INTO inv_inventory_transaction (trans_no, trans_type, source_type, source_id, source_line_id, material_id, material_code, batch_no, warehouse_id, location_id, quantity, unit_cost, total_cost, unit_price, total_amount, reference_no, remark, create_by, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `TRN-${String(i).padStart(5, '0')}`,
        types[i % 5],
        ['purchase', 'sales', 'production'][i % 3],
        i,
        i,
        (i % 20) + 1,
        `MAT-${String((i % 20) + 1).padStart(4, '0')}`,
        `BATCH-${String(i).padStart(4, '0')}`,
        (i % 20) + 1,
        (i % 10) + 1,
        (Math.random() * 100).toFixed(3),
        (Math.random() * 50).toFixed(4),
        (Math.random() * 5000).toFixed(2),
        (Math.random() * 80).toFixed(4),
        (Math.random() * 8000).toFixed(2),
        `REF-${i}`,
        `交易备注${i}`,
        1,
        fmt(d),
      ]
    );
  }

  console.log('Seeding sal_order_item...');
  for (let i = 1; i <= 100; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    await conn.query(
      `INSERT INTO sal_order_item (order_id, material_name, quantity, unit, unit_price, total_price, remark, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        (i % 50) + 1,
        `产品${String.fromCharCode(65 + (i % 26))}${i}`,
        (Math.random() * 1000).toFixed(3),
        ['个', '套', '张', '卷'][i % 4],
        (Math.random() * 100).toFixed(4),
        (Math.random() * 10000).toFixed(2),
        `明细备注${i}`,
        fmt(d),
      ]
    );
  }

  console.log('Seeding fin_payable...');
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(Math.random() * 90));
    const amount = Math.floor(Math.random() * 100000) + 5000;
    const paid = Math.floor(amount * Math.random());
    await conn.query(
      `INSERT INTO fin_payable (payable_no, source_type, source_no, supplier_id, amount, paid_amount, balance, due_date, status, remark, create_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `AP-${String(i).padStart(4, '0')}`,
        (i % 3) + 1,
        `PO-${String(i).padStart(4, '0')}`,
        (i % 10) + 1,
        amount,
        paid,
        amount - paid,
        new Date(now.getTime() + Math.random() * 30 * 86400000).toISOString().slice(0, 10),
        paid >= amount ? 2 : 1,
        `应付备注${i}`,
        fmt(d),
        fmt(d),
        0,
      ]
    );
  }

  console.log('Seeding fin_receipt_record...');
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    await conn.query(
      `INSERT INTO fin_receipt_record (receipt_no, receivable_id, customer_id, amount, payment_method, receipt_date, remark, create_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `RC-${String(i).padStart(4, '0')}`,
        (i % 20) + 1,
        (i % 30) + 1,
        Math.floor(Math.random() * 50000) + 1000,
        ['bank', 'cash', 'wechat', 'alipay'][i % 4],
        d.toISOString().slice(0, 10),
        `收款备注${i}`,
        fmt(d),
        0,
      ]
    );
  }

  console.log('Seeding fin_payment_record...');
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    await conn.query(
      `INSERT INTO fin_payment_record (payment_no, payable_id, supplier_id, amount, payment_method, payment_date, remark, create_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `PM-${String(i).padStart(4, '0')}`,
        (i % 30) + 1,
        (i % 10) + 1,
        Math.floor(Math.random() * 30000) + 500,
        ['bank', 'cash', 'wechat', 'alipay'][i % 4],
        d.toISOString().slice(0, 10),
        `付款备注${i}`,
        fmt(d),
        0,
      ]
    );
  }

  console.log('Seeding qc_inspection...');
  for (let i = 1; i <= 40; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    const result = Math.random() > 0.15 ? 1 : 2;
    await conn.query(
      `INSERT INTO qc_inspection (inspection_no, inspection_type, source_type, source_no, material_id, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector, inspection_date, remark, create_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `QC-${String(i).padStart(4, '0')}`,
        (i % 3) + 1,
        ['process_card', 'inbound', 'outbound'][i % 3],
        `SRC-${String(i).padStart(4, '0')}`,
        (i % 20) + 1,
        `BATCH-${String(i).padStart(4, '0')}`,
        Math.floor(Math.random() * 500) + 10,
        result === 1 ? Math.floor(Math.random() * 500) + 10 : Math.floor(Math.random() * 400) + 5,
        result === 2 ? Math.floor(Math.random() * 50) + 1 : 0,
        result,
        `检验员${(i % 5) + 1}`,
        d.toISOString().slice(0, 10),
        `检验备注${i}`,
        fmt(d),
        fmt(d),
        0,
      ]
    );
  }

  await conn.end();
  console.log('Done!');
}

seed().catch(console.error);
