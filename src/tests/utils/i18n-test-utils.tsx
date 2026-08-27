/**
 * 国际化组件测试辅助工具
 *
 * 提供:
 * - 加载真实 messages 文件
 * - 创建可切换 locale 的 NextIntlClientProvider 包装器
 * - 提供常见 mock（fetch / useToast / clipboard）
 *
 * 注意: src/tests/setup.ts 全局 mock 了 next-intl 为简单 key 回显，
 * 在使用真实 provider 的测试中需通过 vi.unmock('next-intl') 还原。
 */

import React from 'react';
import { vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import fs from 'fs';
import path from 'path';

const messagesDir = path.join(process.cwd(), 'messages');

export type Locale = 'zh-CN' | 'en' | 'zh-TW' | 'vi';

const messagesCache: Record<string, Record<string, unknown>> = {};

export function loadMessages(locale: Locale): Record<string, unknown> {
  if (!messagesCache[locale]) {
    const file = path.join(messagesDir, `${locale}.json`);
    messagesCache[locale] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return messagesCache[locale];
}

/**
 * 创建指定 locale 的 IntlProvider 包装器
 */
export function renderWithIntl(
  ui: React.ReactElement,
  locale: Locale = 'zh-CN',
  messages?: Record<string, unknown>
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { render } = require('@testing-library/react');
  const msgs = messages ?? loadMessages(locale);
  return render(
    <NextIntlClientProvider locale={locale} messages={msgs}>
      {ui}
    </NextIntlClientProvider>
  );
}

/**
 * 创建 mock 的 toast 函数，返回 spy 用于断言
 */
export function createToastMock() {
  const toastSpy = vi.fn();
  return {
    toastSpy,
    useToastMock: () => ({
      toast: toastSpy,
      dismiss: vi.fn(),
      toasts: [],
    }),
  };
}

/**
 * mock fetch，可按 url + method 匹配返回不同响应
 */
export function mockFetch(handlers: Array<{
  matcher: (url: string, init?: RequestInit) => boolean;
  response: unknown;
}>): typeof fetch {
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    const handler = handlers.find((h) => h.matcher(urlStr, init));
    if (!handler) {
      throw new Error(`[mockFetch] 未匹配到 fetch 处理器: ${urlStr}`);
    }
    return {
      ok: true,
      status: 200,
      json: async () => handler.response,
    } as Response;
  });
  return fetchMock as unknown as typeof fetch;
}

/**
 * mock navigator.clipboard.writeText
 */
export function mockClipboard() {
  const writeTextSpy = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextSpy },
    configurable: true,
  });
  return writeTextSpy;
}
