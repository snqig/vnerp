/**
 * 重置 dead_letter 事件 + 清理 stale 幂等记录，使事件可被重新处理。
 *
 * 用法：node scripts/reset-event-for-retry.mjs [event_id]
 * 默认 event_id = 9002107
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const EVENT_ID = Number(process.argv[2] || 9002107);

async function main() {
  const pool = mysql.createPool({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'vnerpdacahng',
  });

  // 1. 查看当前状态
  console.log(`[1] 查看事件 ${EVENT_ID} 当前状态...`);
  const [events] = await pool.query(
    'SELECT id, event_type, aggregate_type, aggregate_id, status, retry_count, error_message FROM domain_event_outbox WHERE id = ?',
    [EVENT_ID]
  );
  if (events.length === 0) {
    console.log('  ❌ 事件不存在');
    await pool.end();
    process.exit(1);
  }
  console.log('  ', JSON.stringify(events[0], null, 2));

  // 2. 重置事件为 pending，清除错误信息，重置重试计数
  console.log(`\n[2] 重置事件 ${EVENT_ID} 为 pending...`);
  await pool.execute(
    `UPDATE domain_event_outbox SET status = 'pending', retry_count = 0, error_message = NULL, next_execute_at = NULL WHERE id = ?`,
    [EVENT_ID]
  );
  console.log('  ✅ 事件已重置');

  // 3. 查看并清理 stale 幂等记录
  console.log(`\n[3] 查看事件 ${EVENT_ID} 的幂等记录...`);
  const [processed] = await pool.query(
    'SELECT id, event_id, handler_name, status, processed_at FROM sys_event_processed WHERE event_id = ?',
    [EVENT_ID]
  );
  if (processed.length > 0) {
    for (const p of processed) {
      console.log('  ', JSON.stringify(p));
    }
    console.log(`  删除 ${processed.length} 条幂等记录...`);
    await pool.execute('DELETE FROM sys_event_processed WHERE event_id = ?', [EVENT_ID]);
    console.log('  ✅ 幂等记录已清理');
  } else {
    console.log('  无幂等记录');
  }

  // 4. 确认最终状态
  console.log(`\n[4] 确认最终状态...`);
  const [final] = await pool.query(
    'SELECT id, event_type, status, retry_count FROM domain_event_outbox WHERE id = ?',
    [EVENT_ID]
  );
  console.log('  ', JSON.stringify(final[0]));

  await pool.end();
  console.log('\n✅ 完成。OutboxPoller 将在下次轮询时重新处理此事件。');
}

main().catch((err) => {
  console.error('异常:', err);
  process.exit(1);
});
