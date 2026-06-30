/**
 * 测试设置文件
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 加载 .env 到 process.env（Vitest 默认不加载 .env，导致 DB_PASSWORD 等配置缺失）
try {
  readFileSync(resolve(process.cwd(), '.env'), 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) {
        process.env[m[1]] = m[2];
      }
    });
} catch {
  // .env 不存在时忽略
}

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 模拟 next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({
    number: (value: number) => value.toLocaleString(),
    dateTime: (value: Date) => value.toLocaleDateString(),
  }),
}));

// 模拟 next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useLocale: () => 'zh-CN',
}));

// 模拟 localStorage / sessionStorage（仅 jsdom 环境有 window；node 环境跳过）
if (typeof window !== 'undefined') {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
}
