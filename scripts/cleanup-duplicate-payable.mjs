/**
 * 清理测试中产生的重复应付单记录（保留最早的一条）
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

async function main() {
  const pool = mysql.createPool({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'vnerpdacahng',
  });

  // 查找 IN20260709000003 的重复应付单
  const [payables] = await pool.query(
    `SELECT id, payable_no, source_no, amount, create_time FROM fin_payable WHERE source_no = 'IN20260709000003' ORDER BY id ASC`
  );

  console.log(`找到 ${payables.length} 条应付单记录:`);
  for (const p of payables) {
    console.log(`  id=${p.id} payable_no=${p.payable_no} amount=${p.amount} create_time=${p.create_time}`);
  }

  if (payables.length > 1) {
    // 保留第一条，删除其余
    const keepId = payables[0].id;
    const deleteIds = payables.slice(1).map((p) => p.id);
    console.log(`\n保留 id=${keepId}, 删除 id=[${deleteIds.join(', ')}]`);
    for (const id of deleteIds) {
      await pool.execute(`DELETE FROM fin_payable WHERE id = ?`, [id]);
    }
    console.log('✅ 重复记录已清理');
  } else {
    console.log('无重复记录');
  }

  await pool.end();
}

main().catch((err) => {
  console.error('异常:', err);
  process.exit(1);
});
