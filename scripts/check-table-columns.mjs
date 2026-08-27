/**
 * 检查相关表的实际列结构
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const TABLES = ['inv_inventory', 'inv_inventory_batch', 'pur_purchase_order_line', 'pur_purchase_order'];

async function main() {
  const pool = mysql.createPool({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'vnerpdacahng',
  });

  for (const table of TABLES) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`表: ${table}`);
    console.log('='.repeat(50));
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [env.DB_NAME, table]
    );
    for (const c of cols) {
      console.log(`  ${c.COLUMN_NAME.padEnd(25)} ${c.DATA_TYPE.padEnd(15)} nullable=${c.IS_NULLABLE}  default=${c.COLUMN_DEFAULT ?? 'NULL'}`);
    }
  }

  // Also check if the dead-lettered event exists
  console.log(`\n${'='.repeat(50)}`);
  console.log('domain_event_outbox: 最新事件状态');
  console.log('='.repeat(50));
  const [events] = await pool.query(
    `SELECT id, event_type, aggregate_id, status, retry_count, LEFT(error_message, 200) as error_preview FROM domain_event_outbox WHERE aggregate_type = 'InboundOrder' ORDER BY id DESC LIMIT 5`
  );
  for (const e of events) {
    console.log(`  id=${e.id} type=${e.event_type} status=${e.status} retry=${e.retry_count}`);
    if (e.error_preview) console.log(`    error: ${e.error_preview}`);
  }

  // Check stale idempotency records
  console.log(`\n${'='.repeat(50)}`);
  console.log('sys_event_processed: 事件 9002107 的幂等记录');
  console.log('='.repeat(50));
  const [processed] = await pool.query(
    `SELECT * FROM sys_event_processed WHERE event_id = 9002107`
  );
  if (processed.length > 0) {
    for (const p of processed) {
      console.log(`  ${JSON.stringify(p)}`);
    }
  } else {
    console.log('  无记录');
  }

  await pool.end();
}

main().catch((err) => {
  console.error('异常:', err);
  process.exit(1);
});
