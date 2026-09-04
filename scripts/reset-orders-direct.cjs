const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
});

async function main() {
  console.log('=== 重置订单域数据 ===\n');

  const deleteTables = [
    'sal_order_item', 'sal_order_detail', 'sal_order',
    'prd_bom_detail', 'prd_bom', 'mdm_product',
    'crm_customer', 'sal_sample_order',
  ];
  for (const t of deleteTables) {
    await db.execute(`SET FOREIGN_KEY_CHECKS=0`);
    await db.execute(`DELETE FROM \`${t}\``);
    await db.execute(`SET FOREIGN_KEY_CHECKS=1`);
    console.log(`  ✓ 清空 ${t}`);
  }

  const customers = [
    { code: 'CUS001', name: '美的集团', contact: '赵采购', phone: '0757-88880001', industry: '家电' },
    { code: 'CUS002', name: '格力电器', contact: '钱经理', phone: '0756-88880002', industry: '家电' },
    { code: 'CUS003', name: '华为技术', contact: '孙总监', phone: '0755-88880003', industry: '电子' },
    { code: 'CUS004', name: '比亚迪汽车', contact: '周经理', phone: '0755-88880004', industry: '汽车' },
    { code: 'CUS005', name: '迈瑞医疗', contact: '吴主任', phone: '0755-88880005', industry: '医疗' },
    { code: 'CUS006', name: '大疆创新', contact: '郑经理', phone: '0755-88880006', industry: '无人机' },
    { code: 'CUS007', name: '宁德时代', contact: '王总', phone: '0591-88880007', industry: '新能源' },
    { code: 'CUS008', name: '宁德时代科技', contact: '李工', phone: '0591-88880008', industry: '新能源' },
    { code: 'CUS009', name: '汇川技术', contact: '张经理', phone: '0755-88880009', industry: '自动化' },
    { code: 'CUS010', name: '联想集团', contact: '褚经理', phone: '010-88880010', industry: '电子' },
  ];
  const customerIds = [];
  for (const c of customers) {
    const [r] = await db.execute(
      `INSERT INTO crm_customer (customer_code, customer_name, customer_type, contact_name, contact_phone, industry, status) VALUES (?, ?, 1, ?, ?, ?, 1)`,
      [c.code, c.name, c.contact, c.phone, c.industry]
    );
    customerIds.push(r.insertId);
  }
  console.log(`\n✓ 生成 ${customerIds.length} 条客户`);

  const products = [
    { code: 'PRD001', name: '空调控制面板标签', spec: '120×80mm', unit: '张', category: '家电标签' },
    { code: 'PRD002', name: '洗衣机铭牌', spec: '100×60mm', unit: '张', category: '家电标签' },
    { code: 'PRD003', name: '手机电池标签', spec: '80×50mm', unit: '张', category: '电子标签' },
    { code: 'PRD004', name: '新能源汽车电池包标签', spec: '200×150mm', unit: '张', category: '汽车标签' },
    { code: 'PRD005', name: '医疗设备面板标签', spec: '150×100mm', unit: '张', category: '医疗标签' },
    { code: 'PRD006', name: '无人机外壳标识', spec: '90×70mm', unit: '张', category: '无人机标签' },
    { code: 'PRD007', name: '锂电池电芯标签', spec: '60×40mm', unit: '张', category: '新能源标签' },
    { code: 'PRD008', name: '工业自动化PLC标签', spec: '110×70mm', unit: '张', category: '工业标签' },
    { code: 'PRD009', name: '服务器机箱标签', spec: '130×90mm', unit: '张', category: '电子标签' },
    { code: 'PRD010', name: '充电桩标识牌', spec: '180×120mm', unit: '张', category: '新能源标签' },
  ];
  const productIds = [];
  for (const p of products) {
    const price = Math.round((5 + Math.random() * 20) * 100) / 100;
    const [r] = await db.execute(
      `INSERT INTO mdm_product (product_code, product_name, specification, unit, category_name, status, sale_price) VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [p.code, p.name, p.spec, p.unit, p.category, price]
    );
    productIds.push(r.insertId);
  }
  console.log(`✓ 生成 ${productIds.length} 条产品`);

  const [materials] = await db.execute(
    `SELECT id, material_name, unit FROM inv_material WHERE deleted = 0 AND status = 1 ORDER BY id LIMIT 20`
  );

  const saleOrderData = [
    { cid: 1, date: '2026-08-01', delivery: '2026-08-15', mid: 1, qty: 50000, price: 2.5 },
    { cid: 2, date: '2026-08-02', delivery: '2026-08-18', mid: 2, qty: 30000, price: 3.2 },
    { cid: 3, date: '2026-08-03', delivery: '2026-08-20', mid: 3, qty: 80000, price: 1.8 },
    { cid: 4, date: '2026-08-04', delivery: '2026-08-22', mid: 4, qty: 20000, price: 5.5 },
    { cid: 5, date: '2026-08-05', delivery: '2026-08-25', mid: 5, qty: 60000, price: 4.0 },
    { cid: 6, date: '2026-08-06', delivery: '2026-08-28', mid: 6, qty: 40000, price: 6.2 },
    { cid: 7, date: '2026-08-07', delivery: '2026-09-01', mid: 7, qty: 100000, price: 1.5 },
    { cid: 8, date: '2026-08-08', delivery: '2026-09-05', mid: 8, qty: 25000, price: 8.0 },
    { cid: 9, date: '2026-08-09', delivery: '2026-09-10', mid: 9, qty: 70000, price: 3.0 },
    { cid: 10, date: '2026-08-10', delivery: '2026-09-15', mid: 10, qty: 45000, price: 4.8 },
  ];
  const saleOrderIds = [];
  for (let i = 0; i < saleOrderData.length; i++) {
    const o = saleOrderData[i];
    const totalAmount = o.qty * o.price;
    const totalWithTax = Math.round(totalAmount * 1.13 * 100) / 100;
    const [r] = await db.execute(
      `INSERT INTO sal_order (order_no, order_date, customer_id, total_amount, total_with_tax, delivery_date, currency, status) VALUES (?, ?, ?, ?, ?, ?, 'CNY', 2)`,
      [`SO2026${String(i + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`, o.date, customerIds[o.cid - 1], totalAmount, totalWithTax, o.delivery]
    );
    const orderId = r.insertId;
    saleOrderIds.push(orderId);
    const mat = materials[i];
    const matName = mat?.material_name || '';
    const matUnit = mat?.unit || '张';
    await db.execute(
      `INSERT INTO sal_order_detail (order_id, material_id, material_name, quantity, unit, unit_price, amount, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, o.mid, matName, o.qty, matUnit, o.price, totalAmount, totalWithTax]
    );
    await db.execute(
      `INSERT INTO sal_order_item (order_id, material_name, quantity, unit, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, matName, o.qty, matUnit, o.price, totalAmount]
    );
  }
  console.log(`✓ 生成 ${saleOrderIds.length} 条销售订单`);

  const bomData = [
    { pid: 1, name: '空调控制面板标签BOM', items: [{ mid: 1, qty: 55000, unit: '张', loss: 10 }, { mid: 6, qty: 5, unit: 'kg', loss: 0 }] },
    { pid: 2, name: '洗衣机铭牌BOM', items: [{ mid: 2, qty: 33000, unit: '张', loss: 10 }, { mid: 7, qty: 4, unit: 'kg', loss: 0 }] },
    { pid: 3, name: '手机电池标签BOM', items: [{ mid: 3, qty: 220000, unit: '张', loss: 10 }, { mid: 8, qty: 0.5, unit: 'kg', loss: 0 }] },
    { pid: 4, name: '新能源电池包标签BOM', items: [{ mid: 4, qty: 15000, unit: '张', loss: 8 }, { mid: 9, qty: 3, unit: 'kg', loss: 0 }] },
    { pid: 5, name: '医疗设备面板标签BOM', items: [{ mid: 5, qty: 28000, unit: '张', loss: 10 }, { mid: 10, qty: 2, unit: 'kg', loss: 0 }] },
    { pid: 6, name: '无人机外壳标识BOM', items: [{ mid: 6, qty: 42000, unit: '张', loss: 12 }, { mid: 1, qty: 1, unit: 'kg', loss: 0 }] },
    { pid: 7, name: '锂电池电芯标签BOM', items: [{ mid: 7, qty: 150000, unit: '张', loss: 5 }, { mid: 2, qty: 0.3, unit: 'kg', loss: 0 }] },
    { pid: 8, name: '工业自动化PLC标签BOM', items: [{ mid: 8, qty: 35000, unit: '张', loss: 10 }, { mid: 3, qty: 2, unit: 'kg', loss: 0 }] },
    { pid: 9, name: '服务器机箱标签BOM', items: [{ mid: 9, qty: 60000, unit: '张', loss: 8 }, { mid: 4, qty: 1.5, unit: 'kg', loss: 0 }] },
    { pid: 10, name: '充电桩标识牌BOM', items: [{ mid: 10, qty: 18000, unit: '张', loss: 10 }, { mid: 5, qty: 3, unit: 'kg', loss: 0 }] },
  ];
  for (const bom of bomData) {
    let totalCost = 0;
    for (const item of bom.items) totalCost += item.qty * 0.5 + item.qty * (item.loss / 100) * 0.5;
    totalCost = Math.round(totalCost * 100) / 100;
    const [br] = await db.execute(
      `INSERT INTO prd_bom (bom_name, product_id, version, total_cost, status) VALUES (?, ?, '1.0', ?, 1)`,
      [bom.name, productIds[bom.pid - 1], totalCost]
    );
    const bomId = br.insertId;
    const unitCost = totalCost / bom.items.reduce((s, it) => s + it.qty, 0);
    for (const item of bom.items) {
      await db.execute(
        `INSERT INTO prd_bom_detail (bom_id, material_id, material_name, quantity, unit, loss_rate, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [bomId, item.mid, '', item.qty, item.unit, item.loss, unitCost, Math.round(item.qty * unitCost * 100) / 100]
      );
    }
  }
  console.log(`✓ 生成 ${bomData.length} 条 BOM`);

  const sampleData = [
    { cid: 1, pname: '空调面板打样(单色)', spec: '120×80mm', qty: 20, date: '2026-08-01', delivery: '2026-08-10', status: 1 },
    { cid: 2, pname: '洗衣机铭牌打样(双色)', spec: '100×60mm', qty: 15, date: '2026-08-02', delivery: '2026-08-12', status: 2 },
    { cid: 3, pname: '手机电池标签打样(四色)', spec: '80×50mm', qty: 30, date: '2026-08-03', delivery: '2026-08-14', status: 1 },
    { cid: 4, pname: '新能源电池包打样(单色)', spec: '200×150mm', qty: 10, date: '2026-08-04', delivery: '2026-08-16', status: 3 },
    { cid: 5, pname: '医疗设备面板打样(专色)', spec: '150×100mm', qty: 25, date: '2026-08-05', delivery: '2026-08-18', status: 1 },
    { cid: 6, pname: '无人机标识打样(多色)', spec: '90×70mm', qty: 20, date: '2026-08-06', delivery: '2026-08-20', status: 2 },
    { cid: 7, pname: '锂电电芯标签打样', spec: '60×40mm', qty: 50, date: '2026-08-07', delivery: '2026-08-22', status: 1 },
    { cid: 8, pname: 'PLC标签打样(耐高温)', spec: '110×70mm', qty: 15, date: '2026-08-08', delivery: '2026-08-25', status: 3 },
    { cid: 9, pname: '服务器机箱标签打样', spec: '130×90mm', qty: 20, date: '2026-08-09', delivery: '2026-08-28', status: 1 },
    { cid: 10, pname: '充电桩标识打样(户外耐候)', spec: '180×120mm', qty: 10, date: '2026-08-10', delivery: '2026-09-01', status: 1 },
  ];
  for (let i = 0; i < sampleData.length; i++) {
    const s = sampleData[i];
    await db.execute(
      `INSERT INTO sal_sample_order (order_no, notify_date, customer_id, customer_name, product_name, specification, quantity, order_date, delivery_date, status, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [`SMP2026${String(i + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`, null, customerIds[s.cid - 1], customers[s.cid - 1].name, s.pname, s.spec, s.qty, s.date, s.delivery, s.status, '']
    );
  }
  console.log(`✓ 生成 ${sampleData.length} 条打样订单`);

  console.log('\n=== 完成 ===');
  console.log('跳过了 sal_reconciliation / sal_return（按要求保留）');
  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
