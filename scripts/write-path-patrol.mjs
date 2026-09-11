#!/usr/bin/env node
/**
 * 写路径巡检（防回退门）
 *
 * 覆盖 2026-09-10 已修复闭环的四类写路径缺陷，防止回归：
 *   1. 幽灵表代码引用 —— src 内不得再引用已删除的幽灵表（静态，恒跑）
 *   2. inv_inventory 裸 INSERT —— 业务代码必须 UPSERT（uk_material_warehouse 不含 deleted，
 *      软删行占位下裸 INSERT 撞 ER_DUP_ENTRY 1062）（静态，恒跑）
 *   3. fin_payable.source_type 字符串注入 —— 该列为 tinyint，塞字符串在
 *      STRICT_TRANS_TABLES 下抛 1366（静态，恒跑）
 *   4. 幽灵表 DB 残留 —— live 库不得存在幽灵表/_bak_* 表（需 mysql2，缺依赖则跳过）
 *   5. 出库确认假成功探针 —— 不存在的订单 id 必须返 404 而非 200
 *      （需 dev server 在线，不可达则跳过）
 *
 * 用法：node scripts/write-path-patrol.mjs
 *   SERVER_URL=http://127.0.0.1:5000  运行时探针目标（默认本机 5000）
 *   DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME  DB 检查连接参数（缺省读 .env.local）
 *
 * 退出码：0=全部通过（或跳过）；1=存在失败项。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync } from 'node:fs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SRC = join(ROOT, 'src');

const results = [];
const record = (name, status, detail) => {
  results.push({ name, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'SKIP' ? '⏭️' : '❌';
  console.log(`${icon} [${status}] ${name}`);
  if (detail) console.log(`   ${detail}`);
};

// ---------- 工具 ----------

/** 递归收集 src 下代码文件 */
function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

/** 读取 .env / .env.local 的 KEY=VALUE（.env 先加载，.env.local 优先覆盖） */
function loadDotEnvLocal() {
  for (const name of ['.env', '.env.local']) {
    const p = join(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

// ---------- 静态检查 1：幽灵表代码引用 ----------

const PHANTOM_TABLES = [
  'bas_material',
  'stock',
  'sales_order',
  'sales_order_item',
  'inventory_checks',
  'inventory_check_items',
  'material_splits',
  'wh_inventory_log',
  'inv_qr_code',
];

function checkPhantomCodeRefs() {
  const files = walk(SRC, ['.ts', '.tsx']);
  const hits = [];
  const patterns = [
    /(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+(?:`|")?(bas_material|sales_order_item|inventory_checks|inventory_check_items|material_splits|wh_inventory_log|inv_qr_code)(?:`|")?\b/gi,
    // stock / sales_order 太通用，只在表操作语句上下文里匹配
    /(?:FROM|INTO|UPDATE)\s+(?:`|")?(stock|sales_order)(?:`|")?\b(?=\s*(?:SET|WHERE|\(|\)|;|,|$))/gim,
  ];
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    for (const re of patterns) {
      let m;
      while ((m = re.exec(content))) {
        hits.push(`${f.replace(ROOT + '\\', '').replace(/\\/g, '/')}: ${m[0]}`);
      }
    }
  }
  if (hits.length > 0) {
    record('幽灵表代码引用', 'FAIL', `发现 ${hits.length} 处引用已删除的幽灵表：\n   ${hits.slice(0, 10).join('\n   ')}`);
  } else {
    record('幽灵表代码引用', 'PASS', `扫描 src ${files.length} 个文件，无幽灵表引用`);
  }
}

// ---------- 静态检查 2：inv_inventory 裸 INSERT ----------

function checkInventoryBareInsert() {
  const files = walk(SRC, ['.ts', '.tsx']);
  const hits = [];
  // 允许清单：仓库盘点域业务写入必须全部 UPSERT 化；种子/迁移脚本同样要求幂等
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    const re = /INSERT\s+INTO\s+(?:`|")?inv_inventory(?:`|")?\s*\(/gi;
    let m;
    while ((m = re.exec(content))) {
      const stmt = content.slice(m.index, m.index + 1200);
      const isUpsert = /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(stmt);
      if (!isUpsert) {
        hits.push(`${f.replace(ROOT + '\\', '').replace(/\\/g, '/')}: 裸 INSERT 无 ON DUPLICATE KEY UPDATE`);
      }
    }
  }
  if (hits.length > 0) {
    record('inv_inventory UPSERT 化', 'FAIL', `发现 ${hits.length} 处裸 INSERT（uk_material_warehouse 不含 deleted，软删行占位将撞 1062）：\n   ${hits.slice(0, 10).join('\n   ')}`);
  } else {
    record('inv_inventory UPSERT 化', 'PASS', '全部 INSERT 均带 ON DUPLICATE KEY UPDATE');
  }
}

// ---------- 静态检查 3：fin_payable source_type 字符串注入 ----------

function checkPayableSourceType() {
  const files = walk(SRC, ['.ts', '.tsx']);
  const hits = [];
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    const re = /INSERT\s+INTO\s+(?:`|")?fin_payable(?:`|")?\b/gi;
    let m;
    while ((m = re.exec(content))) {
      // 截取单条 SQL 模板字面量（到收尾反引号），避免窗口误伤无关字符串
      const tail = content.slice(m.index);
      const endBacktick = tail.indexOf('`', 10);
      if (endBacktick === -1) continue;
      const stmt = tail.slice(0, endBacktick);
      if (!/source_type/i.test(stmt)) continue;

      // 解析列清单，定位 source_type 的序号
      const colsMatch = stmt.match(/\(([^)]*)\)\s*VALUES/i);
      if (!colsMatch) continue;
      const cols = colsMatch[1].split(',').map((c) => c.trim().replace(/[`"]/g, ''));
      const idx = cols.indexOf('source_type');
      if (idx === -1) continue;

      // 提取 VALUES 元组，检查 source_type 位置的值是否为字符串字面量
      const valuesMatch = stmt.match(/VALUES\s*\(([^)]*)\)/i);
      if (!valuesMatch) continue;
      const values = valuesMatch[1].split(',').map((v) => v.trim());
      const val = values[idx];
      if (val && /^'[^']*'$/.test(val) && !/^\?$/.test(val)) {
        hits.push(`${f.replace(ROOT + '\\', '').replace(/\\/g, '/')}: source_type 值为字符串字面量 ${val}`);
      }
    }
    // 直接历史违例字面量（仅在 SQL 上下文内才算）
    if (/'purchase_return'/.test(content) && /INSERT\s+INTO\s+(?:`|")?fin_payable\b/i.test(content)) {
      hits.push(`${f.replace(ROOT + '\\', '').replace(/\\/g, '/')}: 含 'purchase_return' 字面量注入`);
    }
  }
  if (hits.length > 0) {
    record('fin_payable source_type 类型安全', 'FAIL', `发现 ${hits.length} 处字符串注入 tinyint 列（STRICT 模式抛 1366）：\n   ${[...new Set(hits)].slice(0, 10).join('\n   ')}`);
  } else {
    record('fin_payable source_type 类型安全', 'PASS', '无字符串字面量注入 source_type(tinyint)');
  }
}

// ---------- DB 检查 4：幽灵表 DB 残留 ----------

async function checkPhantomTablesInDb() {
  let mysql;
  try {
    mysql = (await import('mysql2/promise')).default;
  } catch {
    record('幽灵表 DB 残留', 'SKIP', 'mysql2 不可用（CI 无依赖安装时跳过 DB 检查）');
    return;
  }
  loadDotEnvLocal();
  const cfg = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
  };
  try {
    const conn = await mysql.createConnection(cfg);
    const patterns = [...PHANTOM_TABLES, '\\_bak\\_%'];
    const placeholders = patterns.map(() => 'TABLE_NAME LIKE ?').join(' OR ');
    const [rows] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' AND (${placeholders})`,
      [cfg.database, ...patterns]
    );
    await conn.end();
    if (rows.length > 0) {
      record('幽灵表 DB 残留', 'FAIL', `live 库存在 ${rows.length} 张幽灵/备份表：${rows.map((r) => r.TABLE_NAME).join(', ')}`);
    } else {
      record('幽灵表 DB 残留', 'PASS', `库 ${cfg.database} 无幽灵表与 _bak_* 表`);
    }
  } catch (e) {
    record('幽灵表 DB 残留', 'SKIP', `DB 不可达（${e.code || e.message}），跳过`);
  }
}

// ---------- 运行时探针 5：出库确认假成功 ----------

async function checkOutboundConfirmProbe() {
  const base = process.env.SERVER_URL || 'http://127.0.0.1:5000';
  let reachable = false;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 3000);
    await fetch(`${base}/api/auth/login`, { method: 'HEAD', signal: ac.signal }).catch(() => {});
    clearTimeout(t);
    // HEAD 可能 404/405，但能通到 HTTP 层即视为可达；再探 login
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: process.env.PATROL_USER || 'admin', password: process.env.PATROL_PASS || 'admin123' }),
    });
    if (!res.ok) {
      record('出库确认假成功探针', 'SKIP', `登录失败 HTTP ${res.status}，跳过`);
      return;
    }
    reachable = true;
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || ''];
    const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
    const csrf = decodeURIComponent(((setCookies.find((c) => c.startsWith('csrf_token=')) || '').split('=')[1] || '').split(';')[0]);
    const token = ((await res.json()).data || {}).token || '';

    for (const method of ['POST', 'PUT']) {
      const probe = await fetch(`${base}/api/warehouse/outbound/confirm`, {
        method,
        headers: { 'Content-Type': 'application/json', Cookie: cookie, 'x-csrf-token': csrf, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: 987654321987 }),
      });
      if (probe.status === 404) {
        record(`出库确认 ${method} 假成功探针`, 'PASS', `不存在订单返回 404（期望行为）`);
      } else {
        const body = await probe.text().catch(() => '');
        record(`出库确认 ${method} 假成功探针`, 'FAIL', `期望 404，实际 HTTP ${probe.status}：${body.slice(0, 120)}`);
      }
    }
  } catch {
    if (!reachable) {
      record('出库确认假成功探针', 'SKIP', `server ${base} 不可达，跳过运行时探针`);
    }
  }
}

// ---------- 主流程 ----------

console.log('🔍 写路径巡检（防回退门）\n');

checkPhantomCodeRefs();
checkInventoryBareInsert();
checkPayableSourceType();
await checkPhantomTablesInDb();
await checkOutboundConfirmProbe();

const failed = results.filter((r) => r.status === 'FAIL');
const skipped = results.filter((r) => r.status === 'SKIP');

console.log(`\n结果：${results.length - failed.length - skipped.length} 通过 / ${failed.length} 失败 / ${skipped.length} 跳过`);
if (failed.length > 0) {
  console.error('\n❌ 巡检未通过 —— 存在写路径缺陷回退，禁止合并。');
  process.exit(1);
}
console.log('✅ 写路径巡检通过。');
