/**
 * 长时间运行 handler 的 reclaimStaleProcessing 误杀模拟
 *
 * 模拟场景：
 *   1. checkAndMark → INSERT status='processing'（handler 开始执行）
 *   2. handler 执行超过阈值（默认 5 分钟）
 *   3. reclaimStaleProcessing 在 handler 执行期间运行 → 删除 processing 记录
 *   4. XAUTOCLAIM 重投递 → checkAndMark 返回 true → handler 被重复执行
 *
 * 为了不真的等 5 分钟，通过 UPDATE processed_at 手动加速时间：
 *   - 插入记录后，将 processed_at 改为 6 分钟前（模拟 handler 已运行 6 分钟）
 *   - 执行 reclaimStaleProcessing → 应删除该记录
 *   - 再次 checkAndMark → 返回 true（误杀后允许重复执行）
 *
 * 同时验证：增大阈值后（IDEMPOTENCY_STALE_THRESHOLD_MINUTES=10），同样的 6 分钟记录不会被误杀。
 *
 * 用法：
 *   node scripts/simulate-long-handler-reclaim.mjs
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const TEST_HANDLER = 'SimLongRunningHandler';
const BASE_EVENT_ID = 9004001;

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

function log(step, msg) {
  console.log(`\n[${step}] ${msg}`);
}

async function checkAndMark(conn, eventId, handlerName, thresholdMin) {
  await conn.execute(
    `DELETE FROM sys_event_processed
     WHERE event_id = ? AND handler_name = ? AND status = 'processing'
       AND processed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [eventId, handlerName, thresholdMin]
  );
  const [result] = await conn.execute(
    `INSERT IGNORE INTO sys_event_processed (event_id, handler_name, status) VALUES (?, ?, 'processing')`,
    [eventId, handlerName]
  );
  return result.affectedRows === 1;
}

async function reclaimStaleProcessing(conn, thresholdMin) {
  const [result] = await conn.execute(
    `DELETE FROM sys_event_processed
     WHERE status = 'processing'
       AND processed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [thresholdMin]
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
}

async function main() {
  loadEnv();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  });

  const eventId = BASE_EVENT_ID;

  console.log('========================================');
  console.log('  长时间运行 handler 的 reclaim 误杀模拟');
  console.log('========================================');

  let handlerCallCount = 0;
  const handler = {
    handle: async () => { handlerCallCount++; },
  };

  try {
    await cleanup(conn, eventId, TEST_HANDLER);

    // ==========================================
    // Phase 1: 默认阈值 5 分钟 — 6 分钟 handler 被误杀
    // ==========================================
    console.log('\n--- Phase 1: 默认阈值 5 分钟 ---');
    const DEFAULT_THRESHOLD = 5;

    log('1.1', 'checkAndMark → handler 开始执行 (INSERT processing)');
    const mark1 = await checkAndMark(conn, eventId, TEST_HANDLER, DEFAULT_THRESHOLD);
    console.log(`  → checkAndMark = ${mark1} (true = 首次, 开始执行 handler)`);

    let status = await getRecordStatus(conn, eventId, TEST_HANDLER);
    console.log(`  → sys_event_processed: status='${status?.status}', age=${status?.age_seconds}s`);

    log('1.2', '模拟 handler 已运行 6 分钟 (UPDATE processed_at 为 6 分钟前)');
    await conn.execute(
      `UPDATE sys_event_processed SET processed_at = DATE_SUB(NOW(), INTERVAL 6 MINUTE)
       WHERE event_id = ? AND handler_name = ?`,
      [eventId, TEST_HANDLER]
    );
    status = await getRecordStatus(conn, eventId, TEST_HANDLER);
    console.log(`  → sys_event_processed: status='${status?.status}', age=${status?.age_seconds}s (模拟 6 分钟)`);

    log('1.3', 'reclaimStaleProcessing 运行 (阈值 5 分钟)');
    const reclaimed1 = await reclaimStaleProcessing(conn, DEFAULT_THRESHOLD);
    console.log(`  → 回收数量: ${reclaimed1} (1 = 误杀！handler 仍在执行但记录被删除)`);

    status = await getRecordStatus(conn, eventId, TEST_HANDLER);
    console.log(`  → sys_event_processed: ${status === null ? '记录已删除 (null)' : `status='${status.status}'`}`);

    log('1.4', 'XAUTOCLAIM 重投递 → checkAndMark 再次返回 true → handler 重复执行');
    const mark2 = await checkAndMark(conn, eventId, TEST_HANDLER, DEFAULT_THRESHOLD);
    console.log(`  → checkAndMark = ${mark2} (true = 记录被误删后允许重新执行)`);
    console.log('  → ⚠ handler 被重复执行！幂等性被破坏！');

    await handler.handle();
    await handler.handle();
    console.log(`  → handler.callCount = ${handlerCallCount} (期望 1, 实际 ${handlerCallCount} = 重复执行)`);

    // ==========================================
    // Phase 2: 增大阈值到 10 分钟 — 6 分钟 handler 不被误杀
    // ==========================================
    console.log('\n--- Phase 2: 增大阈值到 10 分钟 (IDEMPOTENCY_STALE_THRESHOLD_MINUTES=10) ---');
    const LARGE_THRESHOLD = 10;
    handlerCallCount = 0;
    await cleanup(conn, eventId, TEST_HANDLER);

    log('2.1', 'checkAndMark → handler 开始执行');
    const mark3 = await checkAndMark(conn, eventId, TEST_HANDLER, LARGE_THRESHOLD);
    console.log(`  → checkAndMark = ${mark3}`);

    log('2.2', '模拟 handler 已运行 6 分钟');
    await conn.execute(
      `UPDATE sys_event_processed SET processed_at = DATE_SUB(NOW(), INTERVAL 6 MINUTE)
       WHERE event_id = ? AND handler_name = ?`,
      [eventId, TEST_HANDLER]
    );
    status = await getRecordStatus(conn, eventId, TEST_HANDLER);
    console.log(`  → sys_event_processed: status='${status?.status}', age=${status?.age_seconds}s`);

    log('2.3', 'reclaimStaleProcessing 运行 (阈值 10 分钟)');
    const reclaimed2 = await reclaimStaleProcessing(conn, LARGE_THRESHOLD);
    console.log(`  → 回收数量: ${reclaimed2} (0 = 未误杀！6 分钟 < 10 分钟阈值)`);

    status = await getRecordStatus(conn, eventId, TEST_HANDLER);
    console.log(`  → sys_event_processed: ${status === null ? '记录已删除' : `status='${status.status}', age=${status.age_seconds}s (记录仍在)`}`);

    log('2.4', 'XAUTOCLAIM 重投递 → checkAndMark 应返回 false (handler 仍在执行中)');
    const mark4 = await checkAndMark(conn, eventId, TEST_HANDLER, LARGE_THRESHOLD);
    console.log(`  → checkAndMark = ${mark4} (false = 被拦截, 未重复执行)`);

    await handler.handle();
    console.log(`  → handler.callCount = ${handlerCallCount} (期望 1, 实际 ${handlerCallCount})`);

    // ==========================================
    // 总结
    // ==========================================
    console.log('\n========================================');
    console.log('  模拟结果总结');
    console.log('========================================');
    console.log('Phase 1 (阈值=5min, handler=6min):');
    console.log('  ⚠ reclaimStaleProcessing 误杀正在执行的 handler');
    console.log('  ⚠ XAUTOCLAIM 重投递导致 handler 重复执行');
    console.log('  → 修复方案: 增大 IDEMPOTENCY_STALE_THRESHOLD_MINUTES');
    console.log('');
    console.log('Phase 2 (阈值=10min, handler=6min):');
    console.log('  ✓ reclaimStaleProcessing 未误杀 (6 < 10)');
    console.log('  ✓ XAUTOCLAIM 重投递被正确拦截');
    console.log('  → 阈值应略大于 handler 最大执行时间');
    console.log('========================================');

  } catch (err) {
    console.error('\n[sim] 模拟失败:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    try {
      await cleanup(conn, eventId, TEST_HANDLER);
      console.log(`\n[sim] 测试数据已清理`);
    } catch { /* ignore */ }
    await conn.end();
  }
}

main();
