import { defineConfig, configDefaults } from 'vitest/config';
import { resolve } from 'path';

/**
 * Vitest 配置 — projects 拆分（vitest 4）
 *
 * - unit：既有单测/集成测试（排除 concurrency），连主库只读或 mock。
 * - concurrency：tests/concurrency/* 并发集成测试，专属 setupFile
 *   `tests/concurrency/env-isolation.ts` 把 DB_NAME 切到独立测试库
 *   （vnerpdacahng_test），写读全闭环，不再污染主库。
 *   建库：DB_NAME=vnerpdacahng_test node scripts/setup-db.mjs --schema=database/ci_schema.sql
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@test': resolve(__dirname, 'tests'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8', // 优先使用 v8，性能更好
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/__mocks__/**',
        'src/**/types/**',
        'src/**/index.ts', // 桶文件
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70, // 分支覆盖率宽松一些
        statements: 80,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, 'tests/concurrency/**'],
          setupFiles: ['tests/setup-env.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'concurrency',
          include: ['tests/concurrency/**/*.test.ts'],
          setupFiles: ['tests/setup-env.ts', 'tests/concurrency/env-isolation.ts'],
          // 并发/集成链路耗时长，独立超时由用例内 TEST_CONFIG 控制
        },
      },
    ],
  },
});
