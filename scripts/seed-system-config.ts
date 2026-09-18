/**
 * 系统配置种子 —— 手工执行入口（BUG-SET-002 的正式路径之一）
 *
 * 为什么需要它：
 *   默认配置种子原先挂在 `GET /api/settings/system` 上，让读接口每次都做
 *   「SHOW COLUMNS + 8 次 ALTER 尝试 + 10 条旧键 UPDATE + 127 键 upsert」。
 *   现在种子由两条正式路径承担：
 *     1) 进程启动任务：src/instrumentation.ts → bootstrapSystemConfig()（非致命）
 *     2) 本脚本：部署 / 排障时手工执行
 *
 * 用法：
 *   npx tsx scripts/seed-system-config.ts
 *   npx tsx scripts/seed-system-config.ts --dry-run   # 只报告差异，不写库
 *
 * 幂等：按 config_key 逐键 upsert；**不覆盖**已存在键的 config_value。
 * 结构变更不在这里做，见 database/migrations/079_settings_config_schema.sql。
 *
 * 注意（踩坑记录）：
 *   独立 CLI 不像 Next.js 那样自动注入 .env。而且 `src/lib/db` 是在**模块求值期**
 *   就 `createPool()` 的 —— 因此即使把 loadEnv() 写在 main() 开头，静态 import
 *   仍在它之前执行，连接池照样拿到空密码（ER_ACCESS_DENIED_ERROR）。
 *   所以 db / seed 两个模块必须用**动态 import**，放在 loadEnv() 之后。
 */

import fs from 'fs';
import path from 'path';

type DbModule = typeof import('../src/lib/db');
let db: DbModule | null = null;

/**
 * 独立 CLI 不会像 Next.js 那样自动注入 .env，
 * 必须自行加载，否则会以空密码连库并报 ER_ACCESS_DENIED_ERROR。
 */
function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadEnv();

  // 动态 import：必须在 loadEnv() 之后，连接池才会读到 DB_* 环境变量
  db = await import('../src/lib/db');
  const { initDefaultConfigs } = await import('../src/lib/system-config-seed');
  const { query } = db;
  type DbRow = import('../src/types/db').DbRow;

  const dryRun = process.argv.includes('--dry-run');

  console.log('=== 系统配置种子 ===');
  console.log(`模式: ${dryRun ? 'DRY-RUN（只读）' : '写入'}`);

  if (dryRun) {
    const rows = (await query(
      `SELECT config_key, category, display_name FROM sys_config ORDER BY config_key`
    )) as DbRow[];
    console.log(`sys_config 现有 ${rows.length} 个键：`);
    for (const r of rows) console.log(`  - ${r.config_key}  [${r.category}] ${r.display_name}`);
    return;
  }

  const result = await initDefaultConfigs();

  console.log(`完成：当前 ${result.total} 个键；新增 ${result.inserted.length} 个；同步元数据 ${result.updated} 个`);
  if (result.inserted.length > 0) {
    console.log('新增键：');
    for (const k of result.inserted) console.log(`  + ${k}`);
  }
  console.log('提示：凭证类键（如 sys.default.password）每次新增时都会现场生成随机强口令。');
}

async function shutdown(code: number): Promise<never> {
  try {
    await db?.getPool().end();
  } catch {
    /* ignore */
  }
  process.exit(code);
}

main()
  .then(() => shutdown(0))
  .catch(async (e) => {
    console.error('种子执行失败:', e);
    await shutdown(1);
  });
