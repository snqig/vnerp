/**
 * 回归测试：无参 tc('total') 缺陷修复（Read.md ⑭）
 * - Common.total 是 ICU 消息「共 {count} 条」，必须传 count，否则回退显示原始 key 路径
 * - suppliers 统计卡改用 Purchase.totalSuppliers；打印行传 count
 * - piece-work / bank-report 合计行改用 Hr.total（「合计」）
 * 四语文件必须同时具备上述 key，防止再次回退为原始 key 显示。
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['zh-CN', 'zh-TW', 'en', 'vi'] as const;

function loadNs(locale: string, ns: string): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(process.cwd(), 'messages', `${locale}.json`), 'utf-8');
  const all = JSON.parse(raw) as Record<string, Record<string, unknown>>;
  return all[ns] ?? {};
}

describe('total 文案四语 key 完整性', () => {
  it.each(LOCALES)('Purchase.totalSuppliers 存在于 %s（suppliers 统计卡）', (locale) => {
    expect(String(loadNs(locale, 'Purchase').totalSuppliers ?? '')).not.toBe('');
  });

  it.each(LOCALES)('Hr.total 存在于 %s（piece-work / bank-report 合计行）', (locale) => {
    expect(String(loadNs(locale, 'Hr').total ?? '')).not.toBe('');
  });

  it.each(LOCALES)('Common.total 在 %s 为带 {count} 的 ICU 消息（打印行传参前提）', (locale) => {
    expect(String(loadNs(locale, 'Common').total ?? '')).toContain('{count}');
  });
});
