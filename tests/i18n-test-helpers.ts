/**
 * 测试用 i18n 辅助：与 tests/setup-env.ts 完全相同的 flatten 逻辑，
 * 从 messages/zh-CN.json 读取真实译文，使断言与实现返回的译文保持一致
 * （实现里 useTranslations 经 setup-env mock 也读同一份 messages）。
 *
 * 用法：import { t } from '@test/i18n-test-helpers';
 *   expect(toast.error).toHaveBeenCalledWith(t('selectCutLabel'));
 * 不要在测试里硬编码译文或 i18n key，保持 translation-independent。
 */
import fs from 'node:fs';
import path from 'node:path';

function flattenMessages(
  obj: Record<string, unknown>,
  prefix = '',
  out: Record<string, string> = {},
): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') {
      flattenMessages(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k, out);
    } else {
      out[k] = String(v);
    }
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

export function t(key: string, values?: Record<string, unknown>): string {
  let s = msgFlat[key] ?? key;
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
}
