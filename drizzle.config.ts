import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit 配置（MySQL dialect）
 *
 * 作用域与约束（2026-08-26 校正）：
 * - Drizzle schema（src/lib/db/schema.ts）仍在逐步补全以覆盖真实库表；
 *   截至本提交仅建模约 140 / 327 张表，远未全覆盖。
 * - db:push 已被 scripts/safe-db-push.cjs 包裹：任何会 DROP 未建模
 *   表 / 列 / 外键的操作都会直接 ABORT（exit 1）。
 *   ⚠️ 严禁 db:push-raw / 直接 drizzle-kit push：会 DROP 真实库 129 外键。schema 变更走 pnpm migrate。
 * - db:generate / db:migrate 仍可直接运行，但同样基于（不完整的）
 *   Drizzle schema；从残缺 schema 生成迁移亦可能产出 DROP 语句，需人工复核。
 * - db:studio 仅用于可视化查看，安全。
 *
 * 全库覆盖率提升见 docs/ 中的「全库 Drizzle 覆盖率」专项计划。
 */
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
  },
  verbose: true,
  strict: true,
});
