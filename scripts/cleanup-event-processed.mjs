/**
 * sys_event_processed 表清理脚本
 *
 * 用途：
 *   定期或手动清理 sys_event_processed 表中的过期记录，控制表膨胀。
 *   - 默认清理 30 天前的已处理记录（status='processed'）
 *   - 可选清理过期的 'processing' 记录（崩溃残留，超过 5 分钟）
 *   - 支持 --days N 自定义清理窗口
 *   - 支持 --dry-run 预览待清理数量（不执行删除）
 *
 * 用法：
 *   node scripts/cleanup-event-processed.mjs                  # 清理 30 天前记录
 *   node scripts/cleanup-event-processed.mjs --days 7         # 清理 7 天前记录
 *   node scripts/cleanup-event-processed.mjs --dry-run        # 仅预览，不删除
 *   node scripts/cleanup-event-processed.mjs --reclaim-stale  # 同时清理过期 processing 记录
 *
 * 前置条件：
 *   1. .env 中配置 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
 *   2. MySQL 服务已启动
 *   3. sys_event_processed 表已通过 003_create_event_processed.sql + 004_add_status_to_event_processed.sql 创建
 *
 * 退出码：
 *   0 - 成功
 *   1 - 配置错误或执行异常
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const STALE_PROCESSING_THRESHOLD_MINUTES = 5;
const DEFAULT_OLDER_THAN_DAYS = 30;

function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('[cleanup] ! 未找到 .env 文件，将使用默认值或环境变量');
    return;
  }
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

function parseArgs() {
  const args = { days: DEFAULT_OLDER_THAN_DAYS, dryRun: false, reclaimStale: false };
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--reclaim-stale') {
      args.reclaimStale = true;
    } else if (arg === '--days') {
      const next = raw[i + 1];
      const n = Number.parseInt(next, 10);
      if (Number.isNaN(n) || n < 0) {
        console.error(`[cleanup] 无效的 --days 值: ${next}`);
        process.exit(1);
      }
      args.days = n;
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log('用法: node scripts/cleanup-event-processed.mjs [--days N] [--dry-run] [--reclaim-stale]');
      process.exit(0);
    } else {
      console.error(`[cleanup] 未知参数: ${arg}（使用 --help 查看用法）`);
      process.exit(1);
    }
  }
  return args;
}

async function main() {
  loadEnv();
  const args = parseArgs();

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number.parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || '';

  if (!database) {
    console.error('[cleanup] DB_NAME 未配置，请检查 .env');
    process.exit(1);
  }

  const conn = await mysql.createConnection({ host, port, user, password, database });

  try {
    console.log('[cleanup] 连接数据库成功:', `${host}:${port}/${database}`);
    console.log(`[cleanup] 配置: days=${args.days}, dryRun=${args.dryRun}, reclaimStale=${args.reclaimStale}`);

    // 预览：统计待清理记录数
    const [oldCountRows] = await conn.execute(
      `SELECT COUNT(*) as count FROM sys_event_processed WHERE processed_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [args.days]
    );
    const oldCount = oldCountRows[0]?.count ?? 0;
    console.log(`[cleanup] 待清理 ${args.days} 天前记录: ${oldCount} 条`);

    let staleCount = 0;
    if (args.reclaimStale) {
      const [staleCountRows] = await conn.execute(
        `SELECT COUNT(*) as count FROM sys_event_processed WHERE status = 'processing' AND processed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [STALE_PROCESSING_THRESHOLD_MINUTES]
      );
      staleCount = staleCountRows[0]?.count ?? 0;
      console.log(`[cleanup] 待清理过期 processing 记录（>${STALE_PROCESSING_THRESHOLD_MINUTES}min）: ${staleCount} 条`);
    }

    if (args.dryRun) {
      console.log('[cleanup] --dry-run 模式，不执行删除。退出。');
      return;
    }

    // 执行清理
    let deletedOld = 0;
    if (oldCount > 0) {
      const [result] = await conn.execute(
        `DELETE FROM sys_event_processed WHERE processed_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [args.days]
      );
      deletedOld = result.affectedRows;
      console.log(`[cleanup] 已删除 ${args.days} 天前记录: ${deletedOld} 条`);
    }

    let deletedStale = 0;
    if (args.reclaimStale && staleCount > 0) {
      const [result] = await conn.execute(
        `DELETE FROM sys_event_processed WHERE status = 'processing' AND processed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [STALE_PROCESSING_THRESHOLD_MINUTES]
      );
      deletedStale = result.affectedRows;
      console.log(`[cleanup] 已回收过期 processing 记录: ${deletedStale} 条`);
    }

    // 统计剩余记录
    const [remainingRows] = await conn.execute(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
         SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) as processed
       FROM sys_event_processed`
    );
    const r = remainingRows[0] ?? {};
    console.log(`[cleanup] 完成。剩余记录: total=${r.total ?? 0}, processing=${r.processing ?? 0}, processed=${r.processed ?? 0}`);
  } catch (err) {
    console.error('[cleanup] 执行失败:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
