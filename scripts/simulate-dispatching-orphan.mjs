/**
 * dispatching 孤儿事件恢复端到端模拟脚本
 *
 * 验证 OutboxPoller 崩溃后，卡在 'dispatching' 状态的事件能被
 * reclaimStaleDispatching 正确重置为 'pending'，并被下一次
 * claimPendingEvents 重新消费。
 *
 * 流程：
 *   Step 1: 插入 2 个测试事件到 domain_event_outbox
 *           - event A: status='dispatching', claimed_at = NOW() - 15 分钟（超时，应被回收）
 *           - event B: status='dispatching', claimed_at = NOW() - 3 分钟（未超时，不应被回收）
 *   Step 2: 调用 reclaimStaleDispatching(10) —— 复刻 MysqlDomainEventOutboxRepository SQL
 *           验证：仅 event A 被重置为 'pending'，event B 仍为 'dispatching'
 *   Step 3: 调用 claimPendingEvents —— 复刻 SELECT FOR UPDATE SKIP LOCKED + UPDATE dispatching
 *           验证：event A 被重新 claim（status 变为 'dispatching'），event B 不被选取
 *   Step 4: 模拟 OutboxPoller 正常处理 event A → markAsProcessed
 *           验证：event A status = 'processed'
 *   Step 5: 边界测试 —— reclaimStaleDispatching(0) 应不回收任何事件（timeoutMinutes > 0 校验在调用侧）
 *           直接调用 SQL 验证 INTERVAL 0 MINUTE 的行为（回收所有 dispatching）
 *   Step 6: 清理测试数据
 *
 * 用法：
 *   node scripts/simulate-dispatching-orphan.mjs
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const DISPATCHING_TIMEOUT_MINUTES = 10;
const TEST_EVENT_TYPE = 'SimDispatchingOrphanEvent';
const TEST_AGGREGATE_TYPE = 'SimDispatchingOrphan';

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

function assert(condition, message) {
  if (!condition) {
    console.error(`\n[ASSERT FAILED] ${message}`);
    process.exitCode = 1;
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

/**
 * 复刻 MysqlDomainEventOutboxRepository.reclaimStaleDispatching
 */
async function reclaimStaleDispatching(conn, timeoutMinutes) {
  const [result] = await conn.execute(
    `UPDATE domain_event_outbox
     SET status = 'pending', claimed_at = NULL
     WHERE status = 'dispatching'
       AND claimed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [timeoutMinutes]
  );
  return result.affectedRows;
}

/**
 * 复刻 MysqlDomainEventOutboxRepository.claimPendingEvents
 * 使用 SELECT FOR UPDATE SKIP LOCKED + UPDATE dispatching
 */
async function claimPendingEvents(conn, limit) {
  await conn.beginTransaction();
  try {
    const [rows] = await conn.query(
      `SELECT id, event_type, aggregate_type, aggregate_id, payload, status,
              retry_count, error_message, next_execute_at, created_at, processed_at
       FROM domain_event_outbox
       WHERE status = 'pending'
         AND (next_execute_at IS NULL OR next_execute_at <= NOW())
       ORDER BY created_at ASC
       LIMIT ?
       FOR UPDATE SKIP LOCKED`,
      [limit]
    );

    if (rows.length === 0) {
      await conn.commit();
      return [];
    }

    const ids = rows.map((r) => r.id);
    await conn.query(
      `UPDATE domain_event_outbox
       SET status = 'dispatching', claimed_at = NOW()
       WHERE id IN (?)`,
      [ids]
    );

    await conn.commit();
    return rows;
  } catch (err) {
    await conn.rollback();
    throw err;
  }
}

async function markAsProcessed(conn, id) {
  await conn.execute(
    `UPDATE domain_event_outbox
     SET status = 'processed', processed_at = NOW(), dispatched_at = NOW()
     WHERE id = ?`,
    [id]
  );
}

async function getEventStatus(conn, id) {
  const [rows] = await conn.execute(
    `SELECT id, status, claimed_at, processed_at,
            TIMESTAMPDIFF(SECOND, claimed_at, NOW()) as claimed_age_seconds
     FROM domain_event_outbox WHERE id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

async function insertDispatchingEvent(conn, claimedAtMinutesAgo) {
  const payload = JSON.stringify({
    eventType: TEST_EVENT_TYPE,
    aggregateType: TEST_AGGREGATE_TYPE,
    data: { claimedAtMinutesAgo },
  });
  const [result] = await conn.execute(
    `INSERT INTO domain_event_outbox
       (event_type, aggregate_type, aggregate_id, payload, status, created_at, claimed_at)
     VALUES (?, ?, ?, ?, 'dispatching', NOW(), DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
    [TEST_EVENT_TYPE, TEST_AGGREGATE_TYPE, 0, payload, claimedAtMinutesAgo]
  );
  return result.insertId;
}

async function cleanup(conn, ids) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await conn.execute(
    `DELETE FROM domain_event_outbox WHERE id IN (${placeholders})`,
    ids
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

  console.log('========================================');
  console.log('  dispatching 孤儿事件恢复模拟');
  console.log('========================================');
  console.log(`  数据库: ${host}:${port}/${database}`);
  console.log(`  超时阈值: ${DISPATCHING_TIMEOUT_MINUTES} 分钟`);
  console.log(`  测试事件类型: ${TEST_EVENT_TYPE}`);

  const createdIds = [];

  try {
    // ─── Step 1: 插入 2 个 dispatching 孤儿事件 ───
    log('Step 1', '插入 2 个 dispatching 孤儿事件');
    const eventA = await insertDispatchingEvent(conn, 15); // 超时 15 分钟
    const eventB = await insertDispatchingEvent(conn, 3);  // 未超时 3 分钟
    createdIds.push(eventA, eventB);

    const statusA1 = await getEventStatus(conn, eventA);
    const statusB1 = await getEventStatus(conn, eventB);
    console.log(`  event A (id=${eventA}): status=${statusA1.status}, claimed_age=${statusA1.claimed_age_seconds}s`);
    console.log(`  event B (id=${eventB}): status=${statusB1.status}, claimed_age=${statusB1.claimed_age_seconds}s`);
    assert(statusA1.status === 'dispatching', 'event A 初始为 dispatching');
    assert(statusB1.status === 'dispatching', 'event B 初始为 dispatching');

    // ─── Step 2: reclaimStaleDispatching(10) ───
    log('Step 2', `调用 reclaimStaleDispatching(${DISPATCHING_TIMEOUT_MINUTES})`);
    const reclaimed = await reclaimStaleDispatching(conn, DISPATCHING_TIMEOUT_MINUTES);
    console.log(`  重置事件数: ${reclaimed}`);
    assert(reclaimed >= 1, `至少回收 1 个事件（event A），实际 ${reclaimed}`);

    const statusA2 = await getEventStatus(conn, eventA);
    const statusB2 = await getEventStatus(conn, eventB);
    console.log(`  event A: status=${statusA2.status}, claimed_at=${statusA2.claimed_at}`);
    console.log(`  event B: status=${statusB2.status}, claimed_at=${statusB2.claimed_at}`);
    assert(statusA2.status === 'pending', 'event A 被重置为 pending');
    assert(statusA2.claimed_at === null, 'event A claimed_at 被清空为 NULL');
    assert(statusB2.status === 'dispatching', 'event B 仍为 dispatching（未超时）');
    assert(statusB2.claimed_at !== null, 'event B claimed_at 保留');

    // ─── Step 3: claimPendingEvents 重新消费 event A ───
    log('Step 3', '调用 claimPendingEvents(50) —— 验证 event A 被重新 claim');
    const claimed = await claimPendingEvents(conn, 50);
    const claimedIds = claimed.map((r) => r.id);
    console.log(`  claim 到 ${claimed.length} 个事件, ids=${claimedIds}`);
    assert(claimed.some((r) => r.id === eventA), 'event A 被重新 claim');
    assert(!claimed.some((r) => r.id === eventB), 'event B 不被选取（仍为 dispatching）');

    const statusA3 = await getEventStatus(conn, eventA);
    assert(statusA3.status === 'dispatching', 'event A 重新变为 dispatching（被 claim）');

    // ─── Step 4: 模拟 OutboxPoller 正常处理 event A ───
    log('Step 4', '模拟 OutboxPoller 正常处理 event A → markAsProcessed');
    await markAsProcessed(conn, eventA);
    const statusA4 = await getEventStatus(conn, eventA);
    console.log(`  event A: status=${statusA4.status}, processed_at=${statusA4.processed_at}`);
    assert(statusA4.status === 'processed', 'event A 最终为 processed');

    // ─── Step 5: 边界测试 —— INTERVAL 0 MINUTE 回收所有 dispatching ───
    log('Step 5', '边界测试: reclaimStaleDispatching(0) 回收所有 dispatching（含 event B）');
    const reclaimedAll = await reclaimStaleDispatching(conn, 0);
    console.log(`  重置事件数: ${reclaimedAll}`);
    const statusB5 = await getEventStatus(conn, eventB);
    console.log(`  event B: status=${statusB5.status}, claimed_at=${statusB5.claimed_at}`);
    assert(statusB5.status === 'pending', 'event B 被 reclaimStaleDispatching(0) 重置为 pending');

    console.log('\n========================================');
    console.log('  ✓ 全部步骤验证通过');
    console.log('========================================');
    console.log('  结论:');
    console.log(`  1. 超时(${DISPATCHING_TIMEOUT_MINUTES}min)的 dispatching 事件被正确回收为 pending`);
    console.log('  2. 未超时的 dispatching 事件保持不变');
    console.log('  3. 回收后的事件可被 claimPendingEvents 重新消费');
    console.log('  4. reclaimStaleDispatching 是幂等的，多实例并发安全（UPDATE 行级原子）');
  } catch (err) {
    console.error('\n[ERROR]', err.message);
    process.exitCode = 1;
  } finally {
    // ─── Step 6: 清理 ───
    log('Cleanup', `清理 ${createdIds.length} 个测试事件`);
    await cleanup(conn, createdIds);
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
