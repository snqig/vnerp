/**
 * 清空 sample/* 全部数据库数据（硬删除）并依据 /orders/sales (sal_order) 生成 10 条打样单 + 10 张标准卡。
 * 运行：node scripts/regen-sample-data.cjs
 * 幂等：先 DELETE 再 INSERT，可重复运行。
 */
const mysql = require('mysql2/promise');
const fs = require('fs');

const env = {};
for (const line of fs.readFileSync('D:/dcprint/erp-project/.env', 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const d = (off) => { const x = new Date(); x.setDate(x.getDate() + off); return x.toISOString().slice(0, 10); };
const dt = (off) => { const x = new Date(); x.setDate(x.getDate() + off); return x.toISOString().slice(0, 19).replace('T', ' '); };

// 10 个销售订单(54-63) → 客户(61-70) → 物料(订单行材料)
const orders = [
  { soId: 54, soNo: 'SO202601001', custId: 61, custName: '美的集团',     custCode: 'CUS001', matName: 'PET薄膜透明125μm',     matCode: 'MAT001', qty: 50000 },
  { soId: 55, soNo: 'SO202602002', custId: 62, custName: '格力电器',     custCode: 'CUS002', matName: 'PET薄膜白色188μm',     matCode: 'MAT002', qty: 30000 },
  { soId: 56, soNo: 'SO202603003', custId: 63, custName: '华为技术',     custCode: 'CUS003', matName: 'PVC薄膜透明0.15mm',    matCode: 'MAT003', qty: 80000 },
  { soId: 57, soNo: 'SO202604004', custId: 64, custName: '比亚迪汽车',   custCode: 'CUS004', matName: '不干胶PET银色',        matCode: 'MAT004', qty: 20000 },
  { soId: 58, soNo: 'SO202605005', custId: 65, custName: '迈瑞医疗',     custCode: 'CUS005', matName: '不干胶PVC白色',       matCode: 'MAT005', qty: 60000 },
  { soId: 59, soNo: 'SO202606006', custId: 66, custName: '大疆创新',     custCode: 'CUS006', matName: '丝印油墨-黑色',        matCode: 'MAT006', qty: 40000 },
  { soId: 60, soNo: 'SO202607007', custId: 67, custName: '宁德时代',     custCode: 'CUS007', matName: '丝印油墨-白色',        matCode: 'MAT007', qty: 100000 },
  { soId: 61, soNo: 'SO202608008', custId: 68, custName: '宁德时代科技', custCode: 'CUS008', matName: '导电银浆',             matCode: 'MAT008', qty: 25000 },
  { soId: 62, soNo: 'SO202609009', custId: 69, custName: '汇川技术',     custCode: 'CUS009', matName: 'UV光油',               matCode: 'MAT009', qty: 70000 },
  { soId: 63, soNo: 'SO202610010', custId: 70, custName: '联想集团',     custCode: 'CUS010', matName: '网版感光胶',           matCode: 'MAT010', qty: 45000 },
];

async function count(conn, tb, where) {
  const [r] = await conn.query(`SELECT COUNT(*) AS n FROM ${tb}${where ? ' WHERE ' + where : ''}`);
  return r[0].n;
}

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'vnerpdacahng',
    multipleStatements: false,
  });

  console.log('=== BEFORE (non-deleted counts) ===');
  for (const tb of ['sal_sample_order', 'prd_standard_card', 'eng_sample_to_mass',
    'dcprint_sample_process_card', 'dcprint_sample_process_template',
    'dcprint_sample_process_item', 'dcprint_sample_process_step',
    'dcprint_sample_process_template_item', 'dcprint_sample_process_template_step',
    'sal_sample_feedback', 'sal_sample_inventory', 'sal_sample_quotation']) {
    console.log(' ', tb, '=', await count(conn, tb, tb === 'prd_standard_card' || tb === 'sal_sample_order' || tb === 'eng_sample_to_mass' ? 'deleted=0' : null));
  }

  // ---------- 1) 硬删除（FK 安全顺序：子表 → 父表） ----------
  console.log('\n=== DELETE (hard purge) ===');
  await conn.query('DELETE FROM dcprint_sample_process_item');
  await conn.query('DELETE FROM dcprint_sample_process_step');
  await conn.query('DELETE FROM dcprint_sample_process_card');
  await conn.query('DELETE FROM dcprint_sample_process_template_item');
  await conn.query('DELETE FROM dcprint_sample_process_template_step');
  await conn.query('DELETE FROM dcprint_sample_process_template');
  await conn.query('DELETE FROM eng_sample_to_mass');
  await conn.query('DELETE FROM sal_sample_feedback');
  await conn.query('DELETE FROM sal_sample_inventory');
  await conn.query('DELETE FROM sal_sample_quotation');
  await conn.query('DELETE FROM sal_sample_order');
  await conn.query('DELETE FROM prd_standard_card');
  console.log('  all sample tables purged.');

  // ---------- 2) 生成 10 条打样单 ----------
  console.log('\n=== INSERT 10 sal_sample_order (linked to sal_order) ===');
  const soStatus = ['1', '2', '3'];
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const soVals = [
      `SMP-SO${o.soId}`, o.custId, o.custName, `${o.matName}样品打样`, o.matCode, 'A',
      '100x150mm', o.matName, '打样规格', 1000, d(0),
      d(7), d(10), 'pending', soStatus[i % 3], `由销售订单 ${o.soNo} 生成`,
      o.soId, 0, 0, 0, 0,
      1, dt(0), dt(0), 1, 0,
    ];
    await conn.query(
      `INSERT INTO sal_sample_order
        (order_no, customer_id, customer_name, product_name, material_no, version,
         size_spec, material_spec, specification, quantity, order_date,
         customer_require_date, delivery_date, delivery_status, status, remark,
         sales_order_id, sample_fee, fee_charged, fee_deductible, fee_deducted,
         sample_version, create_time, update_time, create_by, deleted)
       VALUES (${soVals.map(() => '?').join(',')})`,
      soVals
    );
  }
  console.log('  inserted 10 sample orders.');

  // ---------- 3) 生成 10 张标准卡 ----------
  console.log('\n=== INSERT 10 prd_standard_card (linked to sal_order customers) ===');
  const scStatus = [1, 2, 3, 4];
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const scVals = [
      `SC-SO${o.soId}`, `${o.custName}标准卡`, o.custId, o.custName, o.custCode, o.matName,
      'A', 'standard', d(0), d(0), d(365), '100x150mm', '±0.2mm',
      o.matName, 'film', '3inch', 'four_color', 'roll', 'vertical',
      '200mm', '200mm', '300mm', '2mm', '2mm', JSON.stringify([]),
      '印刷', '模切', 'flexo', 'flat', 'M001',
      scStatus[i % 4], 'system', 'admin', dt(0), dt(0), 0,
    ];
    await conn.query(
      `INSERT INTO prd_standard_card
        (card_no, name, customer_id, customer_name, customer_code, product_name,
         version, type, date, effective_date, expiry_date, finished_size, tolerance,
         material_name, material_type, core_type, print_type, layout_type, paper_direction,
         roll_width, sheet_width, sheet_length, spacing, spacing_value, sequences,
         process_flow1, process_flow2, process_method, mold_type, mold_code,
         status, creator, reviewer, create_time, update_time, deleted)
       VALUES (${scVals.map(() => '?').join(',')})`,
      scVals
    );
  }
  console.log('  inserted 10 standard cards.');

  // ---------- 验证 ----------
  console.log('\n=== AFTER (non-deleted counts) ===');
  console.log('  sal_sample_order =', await count(conn, 'sal_sample_order', 'deleted=0'));
  console.log('  prd_standard_card =', await count(conn, 'prd_standard_card', 'deleted=0'));
  console.log('  eng_sample_to_mass =', await count(conn, 'eng_sample_to_mass'));
  console.log('  dcprint_sample_process_card =', await count(conn, 'dcprint_sample_process_card'));

  const [samples] = await conn.query('SELECT id, order_no, customer_id, sales_order_id, material_no, status FROM sal_sample_order WHERE deleted=0 ORDER BY id');
  console.log('\n  sample orders generated:');
  samples.forEach((s) => console.log('   ', JSON.stringify(s)));
  const [cards] = await conn.query('SELECT id, card_no, customer_id, product_name, status FROM prd_standard_card WHERE deleted=0 ORDER BY id');
  console.log('\n  standard cards generated:');
  cards.forEach((s) => console.log('   ', JSON.stringify(s)));

  await conn.end();
  console.log('\nDONE.');
})().catch((e) => { console.error('ERROR:', e); process.exit(1); });
