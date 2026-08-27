import mysql from 'mysql2/promise';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const c = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

// 模拟 API 创建出库单的 SQL（与 route.ts POST 的 INSERT 完全一致）
const orderNo = 'TEST-OUT-' + Date.now();
const items = [{
  materialId: 6,
  materialName: '丝印油墨-黑色',
  specification: '5kg/桶',
  qty: 30,
  unit: '桶',
  unitPrice: 0,
  batchNo: 'BAT-2026-08-25-01',
}];

const totalQty = items.reduce((s, it) => s + parseFloat(it.qty), 0);
const totalAmount = items.reduce((s, it) => s + parseFloat(it.qty) * parseFloat(it.unitPrice), 0);

try {
  // 1. INSERT inv_outbound_order（与 route.ts L201-L220 完全一致）
  const [orderResult] = await c.query(
    `INSERT INTO inv_outbound_order (
      order_no, order_date, outbound_type,
      warehouse_id, warehouse_code, warehouse_name,
      total_qty, total_amount, currency, remark, operator_id, operator_name, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [orderNo, '2026-08-25', 'raw_material', 1, 'WH001', '原材料仓', totalQty, totalAmount, 'CNY', null, 1, 'admin']
  );
  console.log('OK: INSERT inv_outbound_order, id=', orderResult.insertId);

  // 2. INSERT inv_outbound_item（与 route.ts L241-L247 完全一致）
  const itemValues = items.map((it) => [
    orderResult.insertId,
    it.materialId,
    it.materialName,
    it.specification || '',
    it.qty,
    it.unit || '个',
    it.unitPrice || 0,
    parseFloat(it.qty) * parseFloat(it.unitPrice),
    it.batchNo || '',
    '', // remark
    null, // width
  ]);

  await c.query(
    `INSERT INTO inv_outbound_item (
      order_id, material_id, material_name,
      material_spec, quantity, unit, unit_price, amount,
      batch_no, remark, width
    ) VALUES ?`,
    [itemValues]
  );
  console.log('OK: INSERT inv_outbound_item');

  // 清理测试数据
  await c.query('DELETE FROM inv_outbound_item WHERE order_id = ?', [orderResult.insertId]);
  await c.query('DELETE FROM inv_outbound_order WHERE id = ?', [orderResult.insertId]);
  console.log('已清理测试数据');
  console.log('\n结论: DB 层 INSERT 完全正常，问题在 API 层（权限/CSRF/校验）');
} catch (e) {
  console.error('FAIL:', e.message);
  console.error('code:', e.code);
}

await c.end();
