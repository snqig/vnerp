#!/usr/bin/env node
/**
 * check-hardcode.mjs — 前端硬编码 / Mock 残留巡检（fail-closed 卡点候选）
 *
 * 用法：
 *   node scripts/check-hardcode.mjs              # 全量扫描 src/，发现违规退出码 1
 *   node scripts/check-hardcode.mjs --warn-only  # 只告警不阻断（退出码恒 0）
 *   node scripts/check-hardcode.mjs --root <dir> # 指定扫描根目录（默认 src）
 *
 * 背景：2026-10-20 第一轮排查发现 payslips / bank-report / organization 三处
 * 「接口失败 → mock 数据兜底」模式（详见 docs/testing-playbook.md）。本脚本把该
 * 模式固化为机器可检规则，防止复发。
 *
 * 跳过规则（有意为之）：
 *   - 测试文件（*.test.* / *.spec.* / __tests__/ / src/test/）：测试合法使用示例数据
 *   - src/app/api/init/：开发期种子路由，测试数据是其职责
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';

const args = process.argv.slice(2);
const warnOnly = args.includes('--warn-only');
const rootIdx = args.indexOf('--root');
const rootDir = rootIdx !== -1 && args[rootIdx + 1] ? args[rootIdx + 1] : 'src';
const root = join(process.cwd(), rootDir);

const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'dist', '.next', 'coverage', 'out']);
const SKIP_PATH_PARTS = [`${sep}test${sep}`, `${sep}api${sep}init${sep}`];
const isTestFile = (p) => /\.(test|spec)\.[jt]sx?$/.test(p);

/** 违规规则：level=error 时计入退出码 */
const RULES = [
  {
    name: 'mock-var-decl',
    level: 'error',
    re: /\b(?:const|let|var)\s+[Mm]ock\w*\s*[:=]/,
    hint: 'mock 变量声明，生产代码禁止',
  },
  {
    name: 'setstate-mock-fallback',
    level: 'error',
    re: /\bset[A-Z]\w*\(\s*\{\s*\.\.\.\s*[Mm]ock|\bset[A-Z]\w*\(\s*[Mm]ock\w*\s*[,)]/,
    hint: 'setState(mock...) 兜底，接口失败应走错误态而非假数据',
  },
  {
    name: 'mock-import',
    level: 'error',
    re: /from\s+['"][^'"]*[Mm]ock[^'"]*['"]/,
    hint: '从 mock 模块 import，生产代码禁止',
  },
  {
    name: 'mock-roster-cn',
    level: 'error',
    re: /张三|李四|王五|赵六|孙七|周八/,
    hint: '中文测试花名册，疑似 mock 数据残留',
  },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (SCAN_EXTS.has(extname(full))) {
      if (isTestFile(full)) continue;
      if (SKIP_PATH_PARTS.some((part) => full.includes(part))) continue;
      out.push(full);
    }
  }
  return out;
}

const files = walk(root);
const hits = [];
let scanned = 0;

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  scanned += 1;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        hits.push({
          file: relative(process.cwd(), file),
          line: i + 1,
          rule: rule.name,
          level: rule.level,
          hint: rule.hint,
          text: line.trim().slice(0, 120),
        });
      }
    }
  }
}

const rel = relative(process.cwd(), root) || rootDir;
console.log(`[check-hardcode] 扫描 ${rel}/：${scanned} 个文件，${RULES.length} 条规则`);

if (hits.length === 0) {
  console.log('[check-hardcode] ✓ 未发现硬编码 / Mock 残留');
  process.exit(0);
}

for (const h of hits) {
  const mark = h.level === 'error' ? '✗' : '⚠';
  console.log(`${mark} ${h.file}:${h.line} [${h.rule}] ${h.hint}`);
  console.log(`    ${h.text}`);
}
console.log(
  `[check-hardcode] 共 ${hits.length} 处违规（error=${hits.filter((h) => h.level === 'error').length}）`
);

if (warnOnly) {
  console.log('[check-hardcode] --warn-only：不阻断');
  process.exit(0);
}
process.exit(1);
