#!/usr/bin/env node
/**
 * 导出 CI 用的完整库结构：database/ci_schema.sql
 *
 * 为什么单独一份，而不是补进 database/vnerpdacahng_schema.sql
 * -----------------------------------------------------------
 * 后者是 2026-07-07 的一份二手快照（162 张表），而真实库有 349 表 + 6 视图，
 * 结构只有 prod 的 45%。CI 用 setup:db 导入它之后（实测只建成 102 个对象、
 * 56 条外键失败），所有用 EXPLAIN 做判定的门禁都会把「引用了缺失表」的语句
 * 判成缺陷 —— validate:sql-ghost 单这一条就误报 2053 条。
 * 这份取代不了那份（后者仍有其它用途），只是给 CI 补一份与 prod 等价的结构。
 *
 * 什么情况下要重跑
 * ----------------
 * 每次库结构发生迁移/建表之后，CI 的门禁结论才有意义；否则门禁会静默地
 * 拿一份过期结构做判定。建议跟迁移一起提交。
 *
 * 用法：
 *   pnpm db:ci-schema
 *   MYSQLDUMP=/path/to/mysqldump.exe pnpm db:ci-schema   # 自定义 mysqldump 路径
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(process.cwd());
const OUT = path.join(ROOT, 'database', 'ci_schema.sql');
const MYSQLDUMP = process.env.MYSQLDUMP || 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe';

// 读库凭据（与 setup-db / 各门禁脚本同一套）
const CONF = {};
for (const f of ['.env.local', '.env']) {
  try {
    const raw = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (CONF[m[1]] !== undefined) continue;
      CONF[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}
const DB_NAME = CONF.DB_NAME || 'vnerpdacahng';

if (!fs.existsSync(MYSQLDUMP)) {
  console.error('找不到 mysqldump：' + MYSQLDUMP);
  console.error('可用 MYSQLDUMP=<路径> 指定，例如：MYSQLDUMP="/c/xampp/mysql/bin/mysqldump.exe"');
  process.exit(2);
}

const args = [
  // 显式给全连接参数：本机 my.ini 里可能配了其它默认账号（实测会取到 user=ODBC 而 1045）
  '--host=' + (CONF.DB_HOST || '127.0.0.1'),
  '--port=' + (CONF.DB_PORT || '3306'),
  '--user=' + (CONF.DB_USER || 'root'),
  '--no-data', // 只要结构
  '--skip-add-drop-table', // setup-db 用 IF NOT EXISTS 建表，不需要 DROP
  '--skip-triggers',
  '--skip-routines',
  '--skip-events',
  '--default-character-set=utf8mb4',
  '--no-tablespaces',
  '--column-statistics=0', // MySQL 8 的统计表导出会告警，与结构无关
  '--databases',
  DB_NAME,
  '--result-file=' + OUT,
];

// 密码走环境变量，不出现在命令行 / shell 历史里
const child = spawn(MYSQLDUMP, args, {
  cwd: ROOT,
  env: { ...process.env, MYSQL_PWD: CONF.DB_PASSWORD || '' },
});
child.stdout.on('data', (d) => process.stdout.write('[dump] ' + d));
child.stderr.on('data', (d) => process.stderr.write('[dump:err] ' + d));
const code = await new Promise((r) => child.on('close', r));
if (code !== 0) {
  console.error('mysqldump 退出码 =', code);
  process.exit(code);
}

const sql = fs.readFileSync(OUT, 'utf8');
const tables = new Set();
const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?[`"]?(\w+)/gi;
let m;
while ((m = re.exec(sql))) tables.add(m[1]);

console.log(`已导出 ${path.relative(ROOT, OUT)}：${(sql.length / 1024).toFixed(0)} KB，${tables.size} 个对象`);
console.log('提示：数据库结构变更后请随迁移一起提交这份文件，CI 门禁才不会拿过期结构做判定。');
