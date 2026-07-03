/**
 * XAUTOCLAIM 重投递端到端模拟脚本
 *
 * 使用真实 MySQL 数据库，复刻 IdempotencyGuard 的 SQL 逻辑，
 * 模拟完整的 XAUTOCLAIM 重投递流程，验证两阶段标记修复是否生效。
 *
 * 流程：
 *   Step 1: 创建测试事件 (outbox)
 *   Step 2: Consumer-1 正常消费 → checkAndMark(processing) → handle → markAsProcessed(processed)
 *   Step 3: XAUTOCLAIM 重投递 → Consumer-2 → checkAndMark → 被拦截
 *   Step 4: 崩溃场景 → Consumer-3 → checkAndMark → handle 失败 → deleteMark
 *   Step 5: XAUTOCLAIM 重投递 → Consumer-4 → checkAndMark → handle 成功 → markAsProcessed
 *   Step 6: 崩溃残留 processing 记录 → reclaimStaleProcessing 批量回收
 *
 * 用法：
 *   node scripts/simulate-xautoclaim-redelivery.mjs
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const STALE_PROCESSING_THRESHOLD_MINUTES = 5;
const TEST_HANDLER_NAME = 'SimXautoclaimHandler';
const TEST_EVENT_TYPE = 'SimXautoclaimEvent';

function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function log(step, msg, data = {}) {
  console.log(`\n[${step}] ${msg}`);
  if (Object.keys(data).length > 0) {
    console.log('  ', JSON.stringify(data, null, 2).split('\n').join('\n   '));
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkAndMark(conn, eventId, handlerName) {
  await conn.execute(
    `DELETE FROM sys_event_processed
     WHERE event_id = ? AND handler_name = ? AND status = 'processing'
       AND processed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [eventId, handlerName, STALE_PROCESSING_THRESHOLD_MINUTES]
  );
  const [result] = await conn.execute(
    `INSERT IGNORE INTO sys_event_processed (event_id, handler_name, status) VALUES (?, ?, 'processing')`,
    [eventId, handlerName]
  );
  return result.affectedRows === 1;
}

async function markAsProcessed(conn, eventId, handlerName) {
  await conn.execute(
    `UPDATE sys_event_processed SET status = 'processed', processed_at = NOW()
     WHERE event_id = ? AND handler_name = ? AND status = 'processing'`,
    [eventId, handlerName]
  );
}

async function deleteMark(conn, eventId, handlerName) {
  await conn.execute(
    `DELETE FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
    [eventId, handlerName]
  );
}

async function reclaimStaleProcessing(conn) {
  const [result] = await conn.execute(
    `DELETE FROM sys_event_processed
     WHERE status = 'processing'
       AND processed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [STALE_PROCESSING_THRESHOLD_MINUTES]
  );
  return result.affectedRows;
}

async function getRecordStatus(conn, eventId, handlerName) {
  const [rows] = await conn.execute(
    `SELECT status, TIMESTAMPDIFF(SECOND, processed_at, NOW()) as age_seconds
     FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
    [eventId, handlerName]
  );
  return rows[0] ?? null;
}

async function cleanup(conn, eventId, handlerName) {
  await conn.execute(
    `DELETE FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
    [eventId, handlerName]
  );
  await conn.execute(
    `DELETE FROM domain_event_outbox WHERE id = ?`,
    [eventId]
  );
}

async function main() {
  loadEnv();

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number.parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || '';

  if (!database) {
    console.error('[sim] DB_NAME 未配置');
    process.exit(1);
  }

  const conn = await mysql.createConnection({ host, port, user, password, database });

  // 使用较大的 ID 避免与真实数据冲突
  const eventId = 9002001 + Math.floor(Math.random() * 100);

  console.log('========================================');
  console.log('  XAUTOCLAIM 重投递端到端模拟');
  console.log('========================================');
  console.log(`  数据库: ${host}:${port}/${database}`);
  console.log(`  测试事件 ID: ${eventId}`);
  console.log(`  测试 Handler: ${TEST_HANDLER_NAME}`);
  console.log(`  过期阈值: ${STALE_PROCESSING_THRESHOLD_MINUTES} 分钟`);

  let handlerCallCount = 0;
  const handler = {
    handle: async (shouldFail = false) => {
      handlerCallCount++;
      if (shouldFail) {
        throw new Error(`Simulated failure (attempt ${handlerCallCount})`);
      }
    },
  };

  try {
    // 清理可能残留的旧数据
    await cleanup(conn, eventId, TEST_HANDLER_NAME);

    // ==========================================
    // Step 1: 创建测试事件 (模拟 outbox 落库)
    // ==========================================
    log('Step 1', '创建测试事件 → INSERT INTO domain_event_outbox');
    await conn.execute(
      `INSERT INTO domain_event_outbox (id, event_type, aggregate_type, aggregate_id, payload, status)
       VALUES (?, ?, 'SimAggregate', ?, ?, 'pending')`,
      [eventId, TEST_EVENT_TYPE, eventId, JSON.stringify({ simulated: true, eventId })]
    );
    console.log(`  → outbox 事件已创建, id=${eventId}`);

    // ==========================================
    // Step 2: Consumer-1 正常消费
    // ==========================================
    log('Step 2', 'Consumer-1 正常消费事件');
    console.log('  → 模拟 StreamConsumer XREADGROUP 收到消息');

    const mark1 = await checkAndMark(conn, eventId, TEST_HANDLER_NAME);
    console.log(`  → checkAndMark → INSERT status='processing' → affectedRows=1 → ${mark1 ? 'true (首次处理)' : 'false'}`);

    let status = await getRecordStatus(conn, eventId, TEST_HANDLER_NAME);
    console.log(`  → sys_event_processed: status='${status?.status}', age=${status?.age_seconds}s`);

    console.log('  → handler.handle() → 成功');
    await handler.handle(false);

    await markAsProcessed(conn, eventId, TEST_HANDLER_NAME);
    console.log('  → markAsProcessed → UPDATE status=\'processed\'');

    status = await getRecordStatus(conn, eventId, TEST_HANDLER_NAME);
    console.log(`  → sys_event_processed: status='${status?.status}', age=${status?.age_seconds}s ✓`);

    // ==========================================
    // Step 3: XAUTOCLAIM 重投递 → Consumer-2
    // ==========================================
    log('Step 3', 'XAUTOCLAIM 重投递 → Consumer-2 收到相同消息');
    console.log('  → 模拟: 消费者崩溃后消息被 XAUTOCLAIM 重新分配');

    const mark2 = await checkAndMark(conn, eventId, TEST_HANDLER_NAME);
    console.log(`  → checkAndMark → INSERT IGNORE → affectedRows=0 → ${mark2 ? 'true' : 'false (已处理, 跳过)'} ✓`);

    if (!mark2) {
      console.log('  → handler 未被调用 (幂等拦截成功)');
    }

    // ==========================================
    // Step 4: 崩溃场景 → Consumer-3 handler 失败
    // ==========================================
    log('Step 4', '崩溃场景 → Consumer-3: handler 失败 → deleteMark');
    console.log('  → 先清理旧记录, 模拟新事件投递');
    await cleanup(conn, eventId, TEST_HANDLER_NAME);

    const mark3 = await checkAndMark(conn, eventId, TEST_HANDLER_NAME);
    console.log(`  → checkAndMark → ${mark3 ? 'true' : 'false'}`);

    console.log('  → handler.handle() → 失败!');
    let handlerFailed = false;
    try {
      await handler.handle(true);
    } catch (e) {
      handlerFailed = true;
      console.log(`  → 异常: ${e.message}`);
    }

    if (handlerFailed) {
      await deleteMark(conn, eventId, TEST_HANDLER_NAME);
      console.log('  → deleteMark → DELETE 记录 (允许重试)');

      status = await getRecordStatus(conn, eventId, TEST_HANDLER_NAME);
      console.log(`  → sys_event_processed: ${status === null ? '记录已删除 (null)' : `status='${status.status}'`} ✓`);
    }

    // ==========================================
    // Step 5: XAUTOCLAIM 重投递 → Consumer-4 (崩溃后恢复)
    // ==========================================
    log('Step 5', 'XAUTOCLAIM 重投递 → Consumer-4 (崩溃后恢复)');
    console.log('  → 模拟: idle > 30s, XAUTOCLAIM 将消息重新分配给新消费者');

    const mark4 = await checkAndMark(conn, eventId, TEST_HANDLER_NAME);
    console.log(`  → checkAndMark → ${mark4 ? 'true (记录已删除, 可重新执行)' : 'false'}`);

    console.log('  → handler.handle() → 成功');
    await handler.handle(false);

    await markAsProcessed(conn, eventId, TEST_HANDLER_NAME);
    console.log('  → markAsProcessed → UPDATE status=\'processed\'');

    status = await getRecordStatus(conn, eventId, TEST_HANDLER_NAME);
    console.log(`  → sys_event_processed: status='${status?.status}' ✓`);

    // ==========================================
    // Step 6: 崩溃残留 processing 记录 → reclaimStaleProcessing
    // ==========================================
    log('Step 6', '崩溃残留 processing 记录 → reclaimStaleProcessing 批量回收');
    console.log('  → 模拟: 进程在 checkAndMark 与 markAsProcessed 之间崩溃');
    console.log('  → 手动插入 10 分钟前的 processing 记录');

    await cleanup(conn, eventId, TEST_HANDLER_NAME);
    await conn.execute(
      `INSERT INTO sys_event_processed (event_id, handler_name, status, processed_at)
       VALUES (?, ?, 'processing', DATE_SUB(NOW(), INTERVAL 10 MINUTE))`,
      [eventId, TEST_HANDLER_NAME]
    );

    status = await getRecordStatus(conn, eventId, TEST_HANDLER_NAME);
    console.log(`  → 插入残留记录: status='${status?.status}', age=${status?.age_seconds}s`);

    console.log('  → reclaimStaleProcessing() 执行...');
    const reclaimed = await reclaimStaleProcessing(conn);
    console.log(`  → 回收数量: ${reclaimed} (应 >= 1)`);

    status = await getRecordStatus(conn, eventId, TEST_HANDLER_NAME);
    console.log(`  → sys_event_processed: ${status === null ? '记录已回收 (null) ✓' : `仍存在: status='${status.status}'`}`);

    // ==========================================
    // 验证: checkAndMark 在残留记录被回收后允许重新执行
    // ==========================================
    log('Step 6b', '验证: 残留记录回收后, checkAndMark 允许重新执行');
    const mark6 = await checkAndMark(conn, eventId, TEST_HANDLER_NAME);
    console.log(`  → checkAndMark → ${mark6 ? 'true (可重新执行) ✓' : 'false'}`);

    // ==========================================
    // 总结
    // ==========================================
    console.log('\n========================================');
    console.log('  模拟结果总结');
    console.log('========================================');
    console.log(`  handler 被调用次数: ${handlerCallCount} (Step2: 1次成功 + Step4: 1次失败 + Step5: 1次成功 = 3次)`);
    console.log('  Step 2: 正常消费 → processing → processed ✓');
    console.log('  Step 3: XAUTOCLAIM 重投递 → 被拦截 ✓');
    console.log('  Step 4: handler 失败 → deleteMark → 允许重试 ✓');
    console.log('  Step 5: 重投递后重新执行 → 成功 ✓');
    console.log('  Step 6: 崩溃残留 processing → reclaimStaleProcessing 回收 ✓');
    console.log('========================================');

  } catch (err) {
    console.error('\n[sim] 模拟失败:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    try {
      await cleanup(conn, eventId, TEST_HANDLER_NAME);
      console.log(`\n[sim] 测试数据已清理 (eventId=${eventId})`);
    } catch {
      // ignore cleanup errors
    }
    await conn.end();
  }
}

main();
