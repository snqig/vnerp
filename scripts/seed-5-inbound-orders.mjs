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

// 5 条入库单的完整数据：物料编码/物料名称/规格/数量/单位/供应商/仓库/采购单号/批次号/币种/备注
const orders = [
  {
    order_no: 'IB-2026-08-25-SEED-01',
    warehouse_id: 1, warehouse_name: '原材料仓',
    supplier_name: '深圳油墨公司',
    po_no: 'PO-2026-08-25-01',
    inbound_date: '2026-08-25',
    currency: 'CNY', exchange_rate: 1.0,
    remark: '种子数据-油墨入库',
    item: {
      material_id: 6, material_code: 'MAT006', material_name: '丝印油墨-黑色',
      material_spec: '5kg/桶', batch_no: 'BAT-2026-08-25-01',
      quantity: 50, unit: '桶', unit_price: 280, total_price: 14000,
    },
  },
  {
    order_no: 'IB-2026-08-25-SEED-02',
    warehouse_id: 1, warehouse_name: '原材料仓',
    supplier_name: '广州不干胶厂',
    po_no: 'PO-2026-08-25-02',
    inbound_date: '2026-08-25',
    currency: 'CNY', exchange_rate: 1.0,
    remark: '种子数据-PET薄膜入库',
    item: {
      material_id: 1, material_code: 'MAT001', material_name: 'PET薄膜透明125μm',
      material_spec: '125μm×1200mm', batch_no: 'BAT-2026-08-25-02',
      quantity: 200, unit: '卷', unit_price: 85, total_price: 17000,
    },
  },
  {
    order_no: 'IB-2026-08-25-SEED-03',
    warehouse_id: 5, warehouse_name: '油墨仓',
    supplier_name: '东莞PET薄膜厂',
    po_no: 'PO-2026-08-25-03',
    inbound_date: '2026-08-25',
    currency: 'USD', exchange_rate: 7.15,
    remark: '种子数据-进口油墨入库',
    item: {
      material_id: 8, material_code: 'MAT008', material_name: '导电银浆',
      material_spec: '1kg/罐', batch_no: 'BAT-2026-08-25-03',
      quantity: 30, unit: '罐', unit_price: 120, total_price: 3600,
    },
  },
  {
    order_no: 'IB-2026-08-25-SEED-04',
    warehouse_id: 4, warehouse_name: '辅料仓',
    supplier_name: '深圳油墨公司',
    po_no: 'PO-2026-08-25-04',
    inbound_date: '2026-08-25',
    currency: 'CNY', exchange_rate: 1.0,
    remark: '种子数据-网版感光胶入库',
    item: {
      material_id: 10, material_code: 'MAT010', material_name: '网版感光胶',
      material_spec: '5kg/桶', batch_no: 'BAT-2026-08-25-04',
      quantity: 15, unit: '桶', unit_price: 320, total_price: 4800,
    },
  },
  {
    order_no: 'IB-2026-08-25-SEED-05',
    warehouse_id: 1, warehouse_name: '原材料仓',
    supplier_name: '广州不干胶厂',
    po_no: 'PO-2026-08-25-05',
    inbound_date: '2026-08-25',
    currency: 'CNY', exchange_rate: 1.0,
    remark: '种子数据-不干胶PET入库',
    item: {
      material_id: 4, material_code: 'MAT004', material_name: '不干胶PET银色',
      material_spec: '600mm×200m', batch_no: 'BAT-2026-08-25-05',
      quantity: 100, unit: '卷', unit_price: 95, total_price: 9500,
    },
  },
];

let success = 0;
for (const o of orders) {
  try {
    const [res] = await c.query(
      `INSERT INTO inv_inbound_order
       (order_no, order_type, warehouse_id, warehouse_name, supplier_name, po_no,
        currency, exchange_rate, total_amount, total_quantity,
        base_total_amount, status, inbound_date, remark, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        o.order_no,
        'purchase',
        o.warehouse_id,
        o.warehouse_name,
        o.supplier_name,
        o.po_no,
        o.currency,
        o.exchange_rate,
        o.item.total_price,
        o.item.quantity,
        o.item.total_price * o.exchange_rate,
        'draft',
        o.inbound_date,
        o.remark,
      ]
    );
    const orderId = res.insertId;

    await c.query(
      `INSERT INTO inv_inbound_item
       (order_id, material_id, material_code, material_name, material_spec, batch_no,
        quantity, unit, unit_price, total_price, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        orderId,
        o.item.material_id,
        o.item.material_code,
        o.item.material_name,
        o.item.material_spec,
        o.item.batch_no,
        o.item.quantity,
        o.item.unit,
        o.item.unit_price,
        o.item.total_price,
      ]
    );

    console.log(`OK: ${o.order_no} (id=${orderId}) - ${o.item.material_name}`);
    success++;
  } catch (e) {
    console.error(`FAIL: ${o.order_no} - ${e.message}`);
  }
}

console.log(`\n成功生成 ${success}/${orders.length} 条入库单`);

// 验证
const [r] = await c.query(
  `SELECT o.id, o.order_no, o.warehouse_name, o.supplier_name, o.po_no, o.currency, o.remark,
          i.material_code, i.material_name, i.batch_no, i.quantity, i.unit
   FROM inv_inbound_order o
   JOIN inv_inbound_item i ON i.order_id = o.id
   WHERE o.order_no LIKE 'IB-2026-08-25-SEED-%'
   ORDER BY o.id`
);
console.log('\n生成的 5 条入库单（含明细）:');
console.table(r);

await c.end();
