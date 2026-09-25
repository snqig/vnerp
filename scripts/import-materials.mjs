/**
 * 物料清单批量导入脚本（12 类分类体系）
 *
 * 用法：
 *   node scripts/import-materials.mjs [csvPath] [--dry]
 *
 * 说明：
 *   - 读 CSV（首行为表头），按 category_code 解析为 inv_material_category.id
 *     分类码支持一级 C01..C12 及其二级 C01-01..C12-xx
 *   - material_type 缺省为 1（原材料）；仓库/采购域用 category_id 表达用途细分
 *   - material_code 唯一；已存在则跳过（--dry 仅预览不写库）
 *   - 依赖 mysql2（项目已装）；直接连 vnerpdacahng，不走 Drizzle 以避免 ESM/CJS 陷阱
 *
 * 列：material_code,material_name,specification,category_code,material_type,unit,brand,is_splittable,remark
 */
import fs from 'fs';
import mysql from 'mysql2/promise';

const csvPath = process.argv[2] || 'docs/qa/物料导入模板-12类.csv';
const dry = process.argv.includes('--dry');

// ---- 极简 CSV 解析（支持引号包裹与字段内逗号）----
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

const conn = await mysql.createConnection({
  host: '127.0.0.1', port: 3306, user: 'root', password: 'Snqig521223', database: 'vnerpdacahng',
});

const [catRows] = await conn.query(
  `SELECT id, category_code FROM inv_material_category WHERE deleted=0`
);
const codeToId = {};
for (const r of catRows) codeToId[r.category_code] = Number(r.id);

const raw = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
const rows = parseCsv(raw);
const header = rows[0].map((h) => h.trim());
const idx = (name) => header.indexOf(name);
const dataRows = rows.slice(1);

const plan = [];
const errors = [];
for (const r of dataRows) {
  const get = (n) => (idx(n) >= 0 ? (r[idx(n)] || '').trim() : '');
  const code = get('material_code');
  const name = get('material_name');
  const catCode = get('category_code');
  if (!code || !name) { errors.push(`跳过：material_code/material_name 为空 -> ${r.join(',')}`); continue; }
  const catId = codeToId[catCode];
  if (!catId) { errors.push(`跳过：${code} 分类码 ${catCode} 不存在`); continue; }
  plan.push({
    material_code: code,
    material_name: name,
    specification: get('specification') || null,
    category_id: catId,
    material_type: get('material_type') ? Number(get('material_type')) : 1,
    unit: get('unit') || null,
    brand: get('brand') || null,
    is_splittable: get('is_splittable') === '1' ? 1 : 0,
    remark: get('remark') || null,
  });
}

// 查重
const [existing] = await conn.query(`SELECT material_code FROM inv_material WHERE deleted=0`);
const existSet = new Set(existing.map((e) => e.material_code));
const toInsert = plan.filter((p) => !existSet.has(p.material_code));
const skipped = plan.length - toInsert.length;

console.log(`CSV 数据行=${dataRows.length}, 解析有效=${plan.length}, 新增=${toInsert.length}, 跳过(已存在)=${skipped}, 错误=${errors.length}`);
for (const e of errors.slice(0, 20)) console.log('  ' + e);

if (dry) {
  console.log('--- DRY-RUN：拟插入前 10 条 ---');
  for (const p of toInsert.slice(0, 10)) console.log(`  ${p.material_code} | ${p.material_name} | cat=${p.category_id} | unit=${p.unit} | split=${p.is_splittable}`);
  await conn.end();
  process.exit(0);
}

if (toInsert.length === 0) {
  console.log('无新增，结束。');
  await conn.end();
  process.exit(0);
}

await conn.beginTransaction();
let n = 0;
for (const p of toInsert) {
  await conn.execute(
    `INSERT INTO inv_material
      (material_code, material_name, specification, category_id, material_type, unit, brand, is_splittable, status, create_time, update_time, deleted)
     VALUES (?,?,?,?,?,?,?,?,1,NOW(),NOW(),0)`,
    [p.material_code, p.material_name, p.specification, p.category_id, p.material_type, p.unit, p.brand, p.is_splittable]
  );
  n++;
}
await conn.commit();
console.log(`APPLIED：插入 ${n} 条物料；跳过 ${skipped} 条已存在。`);
await conn.end();
