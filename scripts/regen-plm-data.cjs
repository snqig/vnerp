/**
 * 依据 /orders/* (sal_order) 与 sample/* (sal_sample_order) 重生 /plm/* 数据。
 * 关联逻辑：mdm_product(10) 与 customer 61..70、各客户 1 张销售订单 + 1 张打样单
 * 形成索引对齐的 1:1:1 关系；每个 PLM ECO 记录用其产品对应客户的真实
 * order_no / sample order_no 做业务关联（PLM 为 product 维度表，无 order_id 列，
 * 故关联体现在 eco_title/description 文本与共享 customer 上）。
 * 幂等：先 DELETE 三个 PLM 表，再 INSERT。
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

const P = (dt, days = 0) => {
  const d = new Date(dt);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};
const D = (dt, days = 0) => {
  const d = new Date(dt);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'vnerpdacahng',
  });

  // 1) 源数据
  const [products] = await conn.query(
    'SELECT id, product_code, product_name FROM mdm_product WHERE deleted=0 ORDER BY id'
  );
  const [ords] = await conn.query(
    'SELECT customer_id, GROUP_CONCAT(order_no ORDER BY id) nos FROM sal_order WHERE deleted=0 GROUP BY customer_id'
  );
  const [smps] = await conn.query(
    'SELECT customer_id, GROUP_CONCAT(order_no ORDER BY id) nos FROM sal_sample_order WHERE deleted=0 GROUP BY customer_id'
  );
  const ordMap = {};
  for (const r of ords) ordMap[r.customer_id] = r.nos.split(',')[0];
  const smpMap = {};
  for (const r of smps) smpMap[r.customer_id] = r.nos.split(',')[0];

  if (products.length === 0) throw new Error('mdm_product 无数据，无法生成 PLM');
  console.log(`源: products=${products.length}, 订单客户=${ords.length}, 打样客户=${smps.length}`);

  // 2) 清空（幂等）
  await conn.query('DELETE FROM plm_eco');
  await conn.query('DELETE FROM plm_lifecycle');
  await conn.query('DELETE FROM plm_product_lifecycle');

  const now = new Date();
  const changeTypes = ['design', 'process', 'material'];
  const phases = [
    { phase: 'design', desc: '设计评审阶段' },
    { phase: 'production', desc: '量产阶段' },
  ];
  const stages = ['试产', '量产'];

  let ecoN = 0, lifeN = 0, plN = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const custId = 61 + i;
    const orderNo = ordMap[custId] || '';
    const sampleNo = smpMap[custId] || '';

    // --- plm_eco: 1 / product ---
    const ecoCols = ['eco_no', 'eco_title', 'product_id', 'product_code', 'change_type', 'description', 'status', 'create_time'];
    const ecoVals = [
      `ECO-${p.product_code}`,
      `产品「${p.product_name}」工程变更（关联订单 ${orderNo} / 打样单 ${sampleNo}）`,
      p.id,
      p.product_code,
      changeTypes[i % changeTypes.length],
      `由销售订单 ${orderNo} 与打样单 ${sampleNo} 触发，针对产品 ${p.product_name}(${p.product_code}) 的工艺/材料工程变更。`,
      (i % 3 === 0) ? 2 : 1, // 部分已批准
      P(now, -30 + i),
    ];
    await conn.query(
      `INSERT INTO plm_eco (${ecoCols.join(',')}) VALUES (${ecoCols.map(() => '?').join(',')})`,
      ecoVals
    );
    ecoN++;

    // --- plm_lifecycle: 2 phases / product ---
    for (let j = 0; j < phases.length; j++) {
      const ph = phases[j];
      const lCols = ['product_id', 'product_code', 'lifecycle_phase', 'phase_description', 'effective_date', 'status', 'create_time'];
      const lVals = [
        p.id,
        p.product_code,
        ph.phase,
        `${ph.desc}（产品 ${p.product_name}，客户订单 ${orderNo}）`,
        D(now, -20 + i * 2 + j * 5),
        1,
        P(now, -20 + i * 2 + j * 5),
      ];
      await conn.query(
        `INSERT INTO plm_lifecycle (${lCols.join(',')}) VALUES (${lCols.map(() => '?').join(',')})`,
        lVals
      );
      lifeN++;
    }

    // --- plm_product_lifecycle: 1 / product ---
    const plCols = ['product_id', 'product_code', 'product_name', 'lifecycle_stage', 'stage_status', 'version', 'change_type', 'change_reason', 'change_desc', 'effective_date', 'remark', 'create_time', 'deleted'];
    const plVals = [
      p.id,
      p.product_code,
      p.product_name,
      stages[i % stages.length],
      (i % 2 === 0) ? 1 : 2,
      'A',
      changeTypes[i % changeTypes.length],
      `订单 ${orderNo} 与打样单 ${sampleNo} 驱动的产品生命周期更新`,
      `产品 ${p.product_name} 进入${stages[i % stages.length]}阶段，关联销售订单 ${orderNo}、打样单 ${sampleNo}。`,
      D(now, -15 + i),
      `来源: orders=${orderNo}, sample=${sampleNo}`,
      P(now, -15 + i),
      0,
    ];
    await conn.query(
      `INSERT INTO plm_product_lifecycle (${plCols.join(',')}) VALUES (${plCols.map(() => '?').join(',')})`,
      plVals
    );
    plN++;
  }

  // 3) 校验
  const [e] = await conn.query('SELECT COUNT(*) n FROM plm_eco');
  const [l] = await conn.query('SELECT COUNT(*) n FROM plm_lifecycle');
  const [pp] = await conn.query('SELECT COUNT(*) n FROM plm_product_lifecycle');
  console.log(`PLM 重生完成: plm_eco=${e[0].n}(插入${ecoN}), plm_lifecycle=${l[0].n}(插入${lifeN}), plm_product_lifecycle=${pp[0].n}(插入${plN})`);

  await conn.end();
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
