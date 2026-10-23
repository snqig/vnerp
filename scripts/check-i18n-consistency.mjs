#!/usr/bin/env node
/**
 * check-i18n-consistency.mjs — 四语 i18n key 一致性门槛（fail-closed 卡点）
 *
 * 用途：以 messages/zh-CN.json 为权威源，校验 en / vi / zh-TW 三语的文件 key 集合
 *       与之完全一致。任何翻译语言缺失 zh-CN 已有 key → 该语言下界面会露原始 key，
 *       故视为阻断级缺陷（exit 1）。
 *
 * 用法：
 *   node scripts/check-i18n-consistency.mjs            # 缺失即阻断（exit 1）
 *   node scripts/check-i18n-consistency.mjs --warn-only # 只告警不阻断（exit 0）
 *
 * 设计：
 *   - 展平点号路径后比较集合，避免把嵌套 key 误判。
 *   - 翻译语言中「多余」的 key（zh-CN 没有）只告警不阻断：多余 key 是死 key，
 *     删除有风险（可能由其它命名空间或动态用法引用），交给人工审计，不在此卡点删。
 *   - 解析/读取异常时 exit 2（fail-closed）：宁可拦下提交，也不放过潜在问题。
 *
 * 与 check-hardcode.mjs 互为补充：前者防「前端硬编码/Mock 残留」，
 * 后者防「新增文案只写了 zh-CN、忘了补其他三语」。
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SOURCE = 'zh-CN';
const TARGETS = ['en', 'vi', 'zh-TW'];

const WARN_ONLY = process.argv.includes('--warn-only');

function flatten(obj, prefix = '', acc = new Set()) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, acc);
    else acc.add(key);
  }
  return acc;
}

function loadKeys(locale) {
  const raw = readFileSync(join(root, 'messages', `${locale}.json`), 'utf8');
  const data = JSON.parse(raw);
  return flatten(data);
}

try {
  const sourceKeys = loadKeys(SOURCE);
  let missingTotal = 0;
  const report = [];

  for (const locale of TARGETS) {
    const targetKeys = loadKeys(locale);
    const missing = [...sourceKeys].filter((k) => !targetKeys.has(k)).sort();
    const extra = [...targetKeys].filter((k) => !sourceKeys.has(k)).sort();

    report.push({ locale, missingCount: missing.length, extraCount: extra.length, missing, extra });
    missingTotal += missing.length;

    if (extra.length > 0) {
      console.log(`⚠ ${locale}: ${extra.length} 个多余 key（zh-CN 无对应，建议人工审计是否为死 key）`);
      for (const k of extra.slice(0, 10)) console.log(`    + ${k}`);
      if (extra.length > 10) console.log(`    ... 共 ${extra.length} 个`);
    }
  }

  const blocked = report.filter((r) => r.missingCount > 0);
  if (blocked.length > 0) {
    console.log('\n✗ 四语 i18n key 一致性校验未通过（以下语言缺失 zh-CN 已有 key）：');
    for (const r of blocked) {
      console.log(`\n  ${r.locale}: 缺失 ${r.missingCount} 个`);
      for (const k of r.missing.slice(0, 20)) console.log(`    - ${k}`);
      if (r.missing.length > 20) console.log(`    ... 共 ${r.missing.length} 个`);
    }
    console.log('\n修复：在对应 messages/<locale>.json 补上缺失 key，或运行 pnpm i18n:check 辅助排查。');
    process.exit(WARN_ONLY ? 0 : 1);
  }

  console.log(`✓ 四语 i18n key 一致性校验通过（source=zh-CN ${sourceKeys.size} keys；${TARGETS.join('/')} 均对齐）`);
  process.exit(0);
} catch (err) {
  console.error('[check-i18n-consistency] 校验脚本执行失败（fail-closed）：', err && err.stack ? err.stack : err);
  process.exit(2);
}
