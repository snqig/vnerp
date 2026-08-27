// T2 路径B 清理执行：全库备份 + RENAME 88 张备份表到 vnerp_archive 归档库（可逆）
// 用法：
//   node scripts/_audit/t2_archive_cleanup.cjs backup   # 仅全库 mysqldump 到仓库外目录
//   node scripts/_audit/t2_archive_cleanup.cjs rename   # 建归档库 + RENAME 88 张表
//   node scripts/_audit/t2_archive_cleanup.cjs verify   # 校验移动结果
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');

const envPath = path.resolve(__dirname, '..', '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const SRC = env.DB_NAME;            // vnerpdacahng
const ARCHIVE = 'vnerp_archive';
const disc = require('./coverage_discovery.json');
const backupTables = disc.backupTables;
const BACKUP_DIR = 'D:/dcprint/db_backups';
const ts = new Date().toISOString().replace(/[:T]/g, '').slice(0, 14);
const DUMP_FILE = path.join(BACKUP_DIR, `${SRC}_${ts}_before_bak_cleanup.sql`);
const MYSQLDUMP = 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe';

async function phaseBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`→ mysqldump ${SRC} → ${DUMP_FILE}`);
  await new Promise((resolve, reject) => {
    const args = ['-h', env.DB_HOST, '-P', String(env.DB_PORT), '-u', env.DB_USER,
      '-p', '--no-tablespaces', '--single-transaction', '--routines', '--triggers',
      '--default-character-set=utf8mb4', SRC];
    const child = spawn(MYSQLDUMP, args, {
      env: { ...process.env, MYSQL_PWD: env.DB_PASSWORD },
      stdio: ['ignore', fs.openSync(DUMP_FILE, 'w'), 'pipe'],
    });
    let err = '';
    child.stderr.on('data', d => { err += d; });
    child.on('close', code => {
      if (code !== 0) {
        console.error('--- mysqldump stderr ---\n' + err);
        return reject(new Error('mysqldump exit ' + code));
      }
      const sz = fs.statSync(DUMP_FILE).size;
      console.log(`✅ 备份完成：${DUMP_FILE} (${Math.round(sz / 1024)} KB)`);
      resolve();
    });
  });
}

async function phaseRename() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: SRC,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${ARCHIVE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
  const renames = backupTables.map(t => `\`${SRC}\`.\`${t}\` TO \`${ARCHIVE}\`.\`${t}\``).join(', ');
  console.log(`→ RENAME ${backupTables.length} 张表到 ${ARCHIVE} ...`);
  try {
    await conn.query(`RENAME TABLE ${renames}`);
    console.log(`✅ RENAME 成功：${backupTables.length} 张`);
  } catch (e) {
    console.error('❌ RENAME 失败（已回滚，未移动任何表）：', e.message);
    await conn.end();
    process.exit(1);
  }
  await conn.end();
}

async function phaseVerify() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: SRC,
  });
  const [inArc] = await conn.query(`SELECT COUNT(*) c FROM information_schema.TABLES WHERE TABLE_SCHEMA=?`, [ARCHIVE]);
  const [stillSrc] = await conn.query(
    `SELECT COUNT(*) c FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (${backupTables.map(() => '?').join(',')})`,
    [SRC, ...backupTables]);
  console.log(`归档库 ${ARCHIVE} 表数: ${inArc[0].c} (期望 ${backupTables.length})`);
  console.log(`源库 ${SRC} 残留备份表数: ${stillSrc[0].c} (期望 0)`);
  await conn.end();
  if (inArc[0].c === backupTables.length && stillSrc[0].c === 0) {
    console.log('✅ T2 校验通过：88 张备份表已全部移至归档库，活动库零残留。');
  } else {
    console.log('⚠️ 校验异常，请检查。');
  }
}

const phase = process.argv[2] || 'all';
(async () => {
  if (phase === 'backup' || phase === 'all') await phaseBackup();
  if (phase === 'rename' || phase === 'all') await phaseRename();
  if (phase === 'verify' || phase === 'all') await phaseVerify();
})().catch(e => { console.error(e); process.exit(1); });
