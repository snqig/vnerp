/**
 * 历史采购单状态码迁移脚本
 *
 * 背景：
 *   pur_purchase_order 表中部分历史数据使用旧状态码 status=2（无对应领域映射），
 *   导致 DrizzlePurchaseOrderRepository.mapToProps 触发 fromDbCode 抛错并降级为 draft。
 *   新状态码体系（见 PurchaseOrderStatus.toDbCode）：
 *     10=draft, 20=submitted, 30=approved, 40=partially_received, 50=completed, 90=closed
 *
 * 本脚本做的事：
 *   1. 查询 pur_purchase_order 所有 distinct status 值，报告哪些是无效码
 *   2. 统计 status=2 的行数并展示 id 列表
 *   3. 将 status=2 迁移为 status=10 (draft)
 *   4. 二次校验：确认 status=2 已清零
 *
 * 用法：
 *   node scripts/migrate-purchase-status.mjs           # 预览（dry-run，只查不改）
 *   node scripts/migrate-purchase-status.mjs --apply    # 实际执行迁移
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(projectRoot, file);
    if (!fs.existsSync(envPath)) continue;
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
}

const VALID_STATUS_CODES = [10, 20, 30, 40, 50, 90];
const STATUS_LABELS = {
  10: 'draft (草稿)',
  20: 'submitted (已提交)',
  30: 'approved (已审核)',
  40: 'partially_received (部分入库)',
  50: 'completed (已完成)',
  90: 'closed (已关闭)',
};

async function main() {
  loadEnv();
  const isApply = process.argv.includes('--apply');

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number.parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || '';

  if (!database) {
    console.error('[migrate] DB_NAME 未配置');
    process.exit(1);
  }

  const conn = await mysql.createConnection({ host, port, user, password, database });

  console.log('========================================');
  console.log('  采购单状态码迁移: status=2 → status=10');
  console.log('========================================');
  console.log(`  数据库: ${host}:${port}/${database}`);
  console.log(`  模式: ${isApply ? 'APPLY (实际执行)' : 'DRY-RUN (预览，加 --apply 执行)'}`);
  console.log('');

  try {
    // ─── Step 1: 查询所有 distinct status 值 ───
    console.log('[Step 1] 查询 pur_purchase_order 所有 status 值分布');
    const [statusRows] = await conn.execute(
      `SELECT status, COUNT(*) as cnt FROM pur_purchase_order WHERE deleted = 0 GROUP BY status ORDER BY status`
    );
    console.log('  status | count | valid? | label');
    console.log('  ------ | ----- | ------ | -----');
    const invalidCodes = [];
    for (const row of statusRows) {
      const isValid = VALID_STATUS_CODES.includes(row.status);
      const label = STATUS_LABELS[row.status] || '(无效码)';
      if (!isValid) invalidCodes.push(row.status);
      console.log(
        `  ${String(row.status).padStart(6)} | ${String(row.cnt).padStart(5)} | ${isValid ? '  ✓   ' : '  ✗   '} | ${label}`
      );
    }
    console.log('');

    if (invalidCodes.length === 0) {
      console.log('[done] 所有状态码均有效，无需迁移。');
      return;
    }

    console.log(`[info] 发现 ${invalidCodes.length} 种无效状态码: ${invalidCodes.join(', ')}`);
    console.log('');

    // ─── Step 2: 统计 status=2 的行 ───
    console.log('[Step 2] 统计 status=2 的采购单');
    const [targetRows] = await conn.execute(
      `SELECT id, po_no, supplier_name, status, create_time FROM pur_purchase_order WHERE status = 2 AND deleted = 0 ORDER BY id`
    );
    console.log(`  共 ${targetRows.length} 条 status=2 的记录:`);
    for (const row of targetRows) {
      console.log(`    id=${row.id}, po_no=${row.po_no}, supplier=${row.supplier_name || 'N/A'}, create_time=${row.create_time}`);
    }
    console.log('');

    if (!isApply) {
      console.log('[dry-run] 预览完成。执行以下命令实际迁移:');
      console.log('  node scripts/migrate-purchase-status.mjs --apply');
      return;
    }

    // ─── Step 3: 执行迁移 status=2 → status=10 ───
    console.log('[Step 3] 执行迁移: UPDATE pur_purchase_order SET status=10 WHERE status=2 AND deleted=0');
    const [updateResult] = await conn.execute(
      `UPDATE pur_purchase_order SET status = 10, update_time = NOW() WHERE status = 2 AND deleted = 0`
    );
    const affected = updateResult.affectedRows;
    console.log(`  ✓ 迁移完成，affected rows = ${affected}`);
    console.log('');

    // ─── Step 4: 二次校验 ───
    console.log('[Step 4] 二次校验：确认 status=2 已清零');
    const [verifyRows] = await conn.execute(
      `SELECT COUNT(*) as cnt FROM pur_purchase_order WHERE status = 2 AND deleted = 0`
    );
    const remaining = verifyRows[0].cnt;
    if (remaining > 0) {
      console.error(`  ✗ 仍有 ${remaining} 条 status=2 记录未迁移！请检查。`);
      process.exitCode = 1;
    } else {
      console.log('  ✓ status=2 已清零，迁移成功。');
    }
    console.log('');

    // ─── Step 5: 迁移后状态分布 ───
    console.log('[Step 5] 迁移后 status 值分布');
    const [afterRows] = await conn.execute(
      `SELECT status, COUNT(*) as cnt FROM pur_purchase_order WHERE deleted = 0 GROUP BY status ORDER BY status`
    );
    for (const row of afterRows) {
      const label = STATUS_LABELS[row.status] || '(无效码)';
      console.log(`  status=${row.status}: ${row.cnt} 条 (${label})`);
    }

    console.log('\n========================================');
    console.log('  ✓ 采购单状态码迁移完成');
    console.log('========================================');
  } catch (err) {
    console.error('\n[ERROR]', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
