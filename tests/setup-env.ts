/**
 * Vitest 全局 setup — 加载 .env 环境变量 + 注册测试基建
 *
 * Vitest 不自动加载 .env（不同于 Next.js dev server），
 * 集成测试依赖 DB_PASSWORD / REDIS_URL 等环境变量，
 * 缺失时 MySQL 连接报 "Access denied (using password: NO)"。
 */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// next-intl 在测试环境无 request 上下文：client 组件调 useTranslations 报
// "context from NextIntlClientProvider was not found"，service 层调 getTranslations
// 报 "is not supported in Client Components"。这些 i18n 调用并非被测目标，
// 全局 mock 返回 key 占位，消除 ~150 处测试失败（i18n 行为由 messages 测试覆盖）。
import fs from 'node:fs';
import path from 'node:path';

// 加载中文文案，使 mock 的 t() 返回真实译文（而非 key），满足断言译文文本的测试
function flattenMessages(
  obj: Record<string, unknown>,
  prefix = '',
  out: Record<string, string> = {},
): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') flattenMessages(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k, out);
    else out[k] = String(v);
  }
  return out;
}
let msgFlat: Record<string, string> = {};
try {
  const raw = fs.readFileSync(path.join(process.cwd(), 'messages', 'zh-CN.json'), 'utf-8');
  msgFlat = flattenMessages(JSON.parse(raw));
} catch {
  // 文案缺失时回退为 key
}

const makeT = () => {
  const fn = ((key: string, values?: Record<string, unknown>) => {
    let s = msgFlat[key] ?? key;
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return s;
  }) as unknown as ((k: string, v?: Record<string, unknown>) => string) & {
    rich: (k: string, v?: Record<string, unknown>) => string;
    markup: (k: string, v?: Record<string, unknown>) => string;
    raw: (k: string, v?: Record<string, unknown>) => string;
  };
  fn.rich = (key: string, _values?: Record<string, unknown>) => msgFlat[key] ?? key;
  fn.markup = (key: string, _values?: Record<string, unknown>) => msgFlat[key] ?? key;
  fn.raw = (key: string, _values?: Record<string, unknown>) => msgFlat[key] ?? key;
  return fn;
};

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  return {
    ...actual,
    useTranslations: () => makeT(),
    useLocale: () => 'zh-CN',
    useFormatter: () => (value: unknown) => String(value),
    NextIntlClientProvider: ({ children }: { children: unknown }) => children,
  };
});

vi.mock('next-intl/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl/server')>();
  return {
    ...actual,
    getTranslations: async () => makeT(),
    getLocale: async () => 'zh-CN',
    getMessages: async () => ({}),
  };
});

try {
  process.loadEnvFile();
} catch {
  // .env 不存在时静默跳过（CI 环境可能用 secrets 注入）
}
