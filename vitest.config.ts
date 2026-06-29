/**
 * 单元测试配置文件
 * 使用 Vitest 测试框架
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportOnFailure: true,
      // 渐进式卡点：以当前覆盖率为基线下浮 5% 作为防退化阈值
      // 目标：随补测试逐步提升至 lines/functions/statements 80、branches 70
      // 基线（2026-06）：lines 48.88%、branches 39.74%、functions 76.39%、statements 49.02%
      thresholds: {
        lines: 45,
        functions: 70,
        branches: 35,
        statements: 45,
      },
      include: [
        // lib 核心算法
        'src/lib/bom-expansion.ts',
        'src/lib/fifo-allocation.ts',
        'src/lib/warehouse-state-machine.ts',
        'src/lib/material-requisition.ts',
        'src/lib/state-machine.ts',
        'src/lib/inventory-sync.ts',
        'src/lib/warehouse-core.ts',
        // 领域层（8.2/8.3 补测目标）
        'src/domain/shared/**/*.ts',
        'src/domain/warehouse/**/*.ts',
        // 事件总线基础设施（1.5-1.7 已补全测试）
        'src/infrastructure/event-bus/EventBus.ts',
        'src/infrastructure/event-bus/OutboxPoller.ts',
        'src/infrastructure/event-bus/MemoryDomainEventOutbox.ts',
        'src/infrastructure/event-bus/DomainEventOutboxFactory.ts',
      ],
      exclude: [
        'node_modules/',
        'src/tests/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        '**/index.ts',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
