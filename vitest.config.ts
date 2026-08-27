import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup-env.ts'],
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
  },
});
