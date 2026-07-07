import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit 配置（MySQL dialect）
 *
 * [DEPRECATED] 迁移生成已废弃。
 * - db:generate / db:push / db:migrate 已在 package.json 中改为警告提示
 * - 权威 schema 来源：database/vnerpdacahng_schema.sql
 * - 增量迁移：database/migrations/（通过 scripts/migrate.ts 执行）
 * - 此配置仅保留 db:studio（可视化工具）用途
 *
 * 使用: pnpm db:studio 可视化查看数据库
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
