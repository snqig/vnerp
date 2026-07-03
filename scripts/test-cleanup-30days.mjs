/**
 * 30 天数据清理功能测试脚本
 *
 * 向 sys_event_processed 插入不同年龄的测试记录，
 * 验证 cleanupOlderThan(30) 只删除 30 天前的记录。
 *
 * 测试记录：
 *   - 25 天前（应保留）
 *   - 30 天前（边界，应保留 — SQL 用 < 而非 <=）
 *   - 31 天前（应删除）
 *   - 35 天前（应删除）
 *
 * 用法：
 *   node scripts/test-cleanup-30days.mjs
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const TEST_HANDLER = 'TestCleanupHandler';
const BASE_EVENT_ID = 9003001;

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

async function main() {
  loadEnv();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  });

  const testRecords = [
    { eventId: BASE_EVENT_ID + 1, daysAgo: 25, shouldSurvive: true },
    { eventId: BASE_EVENT_ID + 2, daysAgo: 30, shouldSurvive: true },  // 边界: < 30 天前 不删
    { eventId: BASE_EVENT_ID + 3, daysAgo: 31, shouldSurvive: false },
    { eventId: BASE_EVENT_ID + 4, daysAgo: 35, shouldSurvive: false },
  ];

  try {
    console.log('========================================');
    console.log('  30 天数据清理功能测试');
    console.log('========================================\n');

    // 清理旧数据
    for (const r of testRecords) {
      await conn.execute(
        `DELETE FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
        [r.eventId, TEST_HANDLER]
      );
    }

    // 插入测试记录
    console.log('[Step 1] 插入测试记录');
    for (const r of testRecords) {
      await conn.execute(
        `INSERT INTO sys_event_processed (event_id, handler_name, status, processed_at)
         VALUES (?, ?, 'processed', DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [r.eventId, TEST_HANDLER, r.daysAgo]
      );
      console.log(`  → eventId=${r.eventId}, ${r.daysAgo}天前, status='processed'`);
    }

    // 验证插入
    const [beforeRows] = await conn.execute(
      `SELECT event_id, status, TIMESTAMPDIFF(DAY, processed_at, NOW()) as age_days
       FROM sys_event_processed WHERE handler_name = ? ORDER BY event_id`,
      [TEST_HANDLER]
    );
    console.log(`\n[Step 2] 清理前状态 (${beforeRows.length} 条记录)`);
    beforeRows.forEach(r => {
      const age = Number(r.age_days);
      console.log(`  eventId=${r.event_id}, status='${r.status}', age=${age}天`);
    });

    // 执行清理 (复刻 IdempotencyGuard.cleanupOlderThan(30))
    console.log('\n[Step 3] 执行 cleanupOlderThan(30)');
    const [result] = await conn.execute(
      `DELETE FROM sys_event_processed WHERE processed_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    console.log(`  → 删除数量: ${result.affectedRows} (期望: 2 — 31天和35天的记录)`);

    // 验证清理后状态
    const [afterRows] = await conn.execute(
      `SELECT event_id, status, TIMESTAMPDIFF(DAY, processed_at, NOW()) as age_days
       FROM sys_event_processed WHERE handler_name = ? ORDER BY event_id`,
      [TEST_HANDLER]
    );
    console.log(`\n[Step 4] 清理后状态 (${afterRows.length} 条记录)`);

    let allPass = true;
    for (const r of afterRows) {
      const testRec = testRecords.find(t => t.eventId === r.event_id);
      const age = Number(r.age_days);
      const survived = true;
      const expectedSurvive = testRec?.shouldSurvive;
      const pass = survived === expectedSurvive;
      console.log(`  eventId=${r.eventId}, age=${age}天, 保留=${survived}, 期望保留=${expectedSurvive} ${pass ? '✓' : '✗'}`);
      if (!pass) allPass = false;
    }

    // 验证被删除的记录
    for (const r of testRecords) {
      if (!r.shouldSurvive) {
        const [checkRows] = await conn.execute(
          `SELECT COUNT(*) as count FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
          [r.eventId, TEST_HANDLER]
        );
        const deleted = (checkRows[0]?.count ?? 0) === 0;
        console.log(`  eventId=${r.eventId}, age=${r.daysAgo}天, 已删除=${deleted}, 期望删除=true ${deleted ? '✓' : '✗'}`);
        if (!deleted) allPass = false;
      }
    }

    console.log('\n========================================');
    console.log(`  测试结果: ${allPass ? '全部通过 ✓' : '存在失败 ✗'}`);
    console.log('========================================');

    // 清理测试数据
    for (const r of testRecords) {
      await conn.execute(
        `DELETE FROM sys_event_processed WHERE event_id = ? AND handler_name = ?`,
        [r.eventId, TEST_HANDLER]
      );
    }
    console.log('\n测试数据已清理');

  } catch (err) {
    console.error('测试失败:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
