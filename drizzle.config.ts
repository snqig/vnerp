import { defineConfig } from 'drizzle-kit';

// Drizzle Kit 配置（MySQL dialect）
// 使用: pnpm db:generate 生成迁移 / pnpm db:push 推送 schema / pnpm db:studio 可视化
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
