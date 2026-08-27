// i18n 硬编码中文提取脚手架（审计 P2-F 基础设施）
//
// 复用 ESLint `i18n/no-chinese-hardcode` 的产出（eslint-baseline.json）——
// 该规则已内置白名单（tc/t/useTranslations/formatMessage、messages/ 等目录、注释），
// 且每条都直接给出建议 key（如 tc('text_1j3gks')）。本脚本把告警解析成：
//   1) i18n-extraction-report.json  —— 每条硬编码中文的 文件/行/原文/建议 key
//   2) messages/zh-CN.extracted.json —— 可直接 merge 的 zh-CN 词条（key→中文）
//   3) messages/en.extracted.json 等 —— 待翻译的占位副本（默认复制中文）
//
// 注意：本脚本只“产出脚手架”，不自动改写源码。把 4125 处中文自动替换会瞬间
// 改动 200+ 文件并极易破坏构建；正确做法是按模块/页面增量外置，逐步消化。
//
// 用法：node scripts/i18n-extract.mjs  [--baseline eslint-baseline.json]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const baselineFile = process.argv.includes('--baseline')
  ? process.argv[process.argv.indexOf('--baseline') + 1]
  : 'eslint-baseline.json';

const MSG = /硬编码中文(?:文本|参数):\s*"(.*?)"\s*。.*?tc\('([^']+)'\)/;

function main() {
  let baseline;
  try {
    baseline = JSON.parse(readFileSync(join(ROOT, baselineFile), 'utf8'));
  } catch (e) {
    console.error('❌ 找不到 eslint-baseline.json，请先运行 `pnpm lint:baseline`。');
    process.exit(2);
  }

  const report = [];
  const keyToText = new Map();
  const byFile = new Map();

  for (const f of baseline) {
    const rel = f.filePath.replace(ROOT, '').replace(/\\/g, '/');
    for (const m of f.messages) {
      if (m.ruleId !== 'i18n/no-chinese-hardcode') continue;
      const hit = MSG.exec(m.message);
      if (!hit) continue;
      const text = hit[1];
      const key = hit[2];
      keyToText.set(key, text);
      report.push({ file: rel, line: m.line, text, key });
      byFile.set(rel, (byFile.get(rel) || 0) + 1);
    }
  }

  // 1) 报告
  writeFileSync(
    join(ROOT, 'i18n-extraction-report.json'),
    JSON.stringify(report, null, 2)
  );

  // 2) zh-CN 词条（key 落在 Common 命名空间，因 tc = useTranslations('Common')）
  const zhCN = { Common: {} };
  for (const [key, text] of keyToText) zhCN.Common[key] = text;
  writeFileSync(
    join(ROOT, 'messages/zh-CN.extracted.json'),
    JSON.stringify(zhCN, null, 2)
  );

  // 3) 待翻译占位副本（默认复制中文，供译员替换）
  for (const locale of ['en', 'vi', 'zh-TW']) {
    writeFileSync(
      join(ROOT, `messages/${locale}.extracted.json`),
      JSON.stringify(zhCN, null, 2)
    );
  }

  console.log(`✅ i18n 提取完成`);
  console.log(`   硬编码中文条目: ${report.length}`);
  console.log(`   去重后 key 数: ${keyToText.size}`);
  console.log(`   涉及文件数: ${byFile.size}`);
  console.log(`   产出文件:`);
  console.log(`     - i18n-extraction-report.json (逐条定位)`);
  console.log(`     - messages/zh-CN.extracted.json (merge 就绪)`);
  console.log(`     - messages/{en,vi,zh-TW}.extracted.json (待翻译)`);
  console.log(`\n下一步：挑选一个页面，按 report 把硬编码中文改为 tc('text_xxx')，`);
  console.log(`         并将 messages/zh-CN.extracted.json 的 Common 段合并进 messages/zh-CN.json。`);
}

main();
