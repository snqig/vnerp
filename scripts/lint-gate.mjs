#!/usr/bin/env node
/**
 * i18n 硬编码红线守门（P0 根因修复）
 *
 * 策略：以 eslint-baseline.json（债务冻结线快照）为基准，只查「改动文件」，
 * 阻断"新增的硬编码中文"，完全容忍 4384 处存量。
 *   - 存量文件：当前硬编码文本集合 ⊆ 基线 → 通过（即使仍未迁移）
 *   - 存量文件：新增了一个之前没有的中文短语 / 或某短语出现次数变多 → 失败
 *   - 新增文件：任何硬编码中文 → 失败
 *
 * 与旧版（全量 warning 数比对）的区别：
 *   - 只 lint 改动文件（git diff），快；不扫描整个 src/
 *   - 按"中文短语"集合 diff，而非总 warning 数 → 不会被"删一个加一个"绕过
 *   - 只关心 i18n/no-chinese-hardcode 这一条红线，不误伤其他 lint 规则
 *
 * 依赖：eslint-baseline.json 必须由 `pnpm lint:baseline` 预先生成。
 *       每次批量迁移减少硬编码后，记得重跑 `pnpm lint:baseline` 刷新冻结线。
 *
 * 用法：
 *   node scripts/lint-gate.mjs                  # 自动取 git 改动文件（CI / pre-commit）
 *   node scripts/lint-gate.mjs --files a.tsx b.tsx   # 仅查指定文件
 *   node scripts/lint-gate.mjs --self-test     # 自测拦截逻辑
 *
 * 退出码：0 = 通过；1 = 发现新增硬编码；2 = 环境/脚本错误。
 */

import { ESLint } from 'eslint';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, 'eslint-baseline.json');

// 从规则消息中提取「被硬编码的中文文本」
// 格式：禁止[在JSX中]硬编码中文(文本|参数): "文本"。建议使用: {tc('...')}
const TEXT_RES = [
  /禁止[^"]*?硬编码中文(?:文本|参数):\s*"([^"]+)"/,
  /硬编码中文(?:文本|参数):\s*"([^"]+)"/,
];
function extractText(msg) {
  for (const re of TEXT_RES) {
    const m = re.exec(msg || '');
    if (m) return m[1];
  }
  return null;
}

// 基线：file(绝对路径) -> Map(中文文本 -> 出现次数)
function buildBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(
      '❌ 找不到 eslint-baseline.json，请先运行 `pnpm lint:baseline` 生成冻结线快照。'
    );
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const map = new Map();
  for (const f of raw) {
    const counts = new Map();
    for (const m of f.messages || []) {
      if (m.ruleId !== 'i18n/no-chinese-hardcode') continue;
      const t = extractText(m.message);
      if (t) counts.set(t, (counts.get(t) || 0) + 1);
    }
    if (counts.size) map.set(f.filePath, counts);
  }
  return map;
}

// 取 git 改动文件（相对仓库根），多种来源合并去重
function getChangedFiles() {
  const out = new Set();
  const tryRun = (args) => {
    try {
      const s = execFileSync('git', args, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      s.split('\n')
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((f) => out.add(f));
    } catch {
      /* 忽略单次失败，尝试下一个来源 */
    }
  };
  tryRun(['diff', '--name-only', '--diff-filter=ACMR', 'origin/main...HEAD']); // PR 视角
  tryRun(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']); // 工作树 vs HEAD
  tryRun(['diff', '--cached', '--name-only', '--diff-filter=ACMR']); // 已暂存
  return [...out];
}

const SRC_RE = /\.(ts|tsx|js|jsx)$/;
const IGNORE_RE = /^(?:node_modules|\.next|messages|locales|scripts|dist|build|\.workbuddy)\//;
// 生成的 API 错误码→消息映射（i18n 规范来源），等同 messages/，红线豁免
const GENERATED_I18N_RE = /(?:^|[\\/])api-error-i18n\.ts$/;
function filterFiles(files) {
  return files
    .map((f) => relative(ROOT, resolve(ROOT, f)))
    .filter(
      (f) =>
        SRC_RE.test(f) &&
        !IGNORE_RE.test(f) &&
        !GENERATED_I18N_RE.test(f) &&
        existsSync(join(ROOT, f))
    );
}

// 用 lintText（而非 lintFiles）逐文件 lint，避免 [locale] 等路径被当作 glob
async function lintFile(eslint, absPath) {
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    return new Map();
  }
  let results;
  try {
    results = await eslint.lintText(content, { filePath: absPath });
  } catch (e) {
    // 无法 lint（如文件不在 TS project 内）→ 失败关闭，绝不静默放行
    console.error(`\n❌ 无法 lint ${absPath}（红线检查无法验证该文件）：${e.message}`);
    process.exit(2);
  }
  const counts = new Map();
  for (const r of results) {
    for (const m of r.messages || []) {
      if (m.fatal) {
        console.error(`\n❌ ${absPath} 存在解析错误，红线检查无法验证：${m.message}`);
        process.exit(2);
      }
      if (m.ruleId !== 'i18n/no-chinese-hardcode') continue;
      const t = extractText(m.message);
      if (t) counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return counts;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) return selfTest();

  const baseline = buildBaseline();

  let files;
  const fi = args.indexOf('--files');
  if (fi !== -1) {
    files = args.slice(fi + 1).filter((a) => !a.startsWith('--'));
  } else {
    files = getChangedFiles();
  }
  const targets = filterFiles(files);
  if (!targets.length) {
    console.log('ℹ️ 无改动源码文件，跳过 i18n 红线检查。');
    process.exit(0);
  }

  const eslint = new ESLint();
  console.log(`🔍 i18n 红线检查 ${targets.length} 个改动文件…`);

  const violations = [];
  for (const rel of targets) {
    const abs = join(ROOT, rel);
    const cur = await lintFile(eslint, abs);
    const base = baseline.get(abs) || baseline.get(rel) || new Map();
    for (const [text, cnt] of cur) {
      const baseCnt = base.get(text) || 0;
      if (cnt > baseCnt) {
        violations.push({ file: rel, text, added: cnt - baseCnt });
      }
    }
  }

  if (violations.length) {
    console.error(
      `\n❌ i18n 红线失败 —— 发现 ${violations.length} 处新增硬编码中文：`
    );
    const byFile = {};
    for (const v of violations) (byFile[v.file] ||= []).push(v);
    for (const [file, items] of Object.entries(byFile)) {
      console.error(`  ${file}`);
      for (const it of items)
        console.error(`    + "${it.text}"  (新增 ${it.added})`);
    }
    console.error(
      '\n处理建议：改用 t(\'Common.xxx\') 等国际化函数；若确需豁免，先 `pnpm lint:baseline` 刷新冻结线。'
    );
    process.exit(1);
  }

  console.log(
    '✅ i18n 红线通过 —— 仅查改动文件，存量 4384 处硬编码不受影响。'
  );
  process.exit(0);
}

// 自测：验证「新增短语被拦截、存量短语被容忍」的 diff 逻辑
async function selfTest() {
  console.log('🧪 自测 i18n 红线拦截逻辑…');
  const fakeBase = new Map([['/repo/src/x.tsx', new Map([['取消', 2]])]]);
  const fakeCur = new Map([
    ['取消', 2],
    ['测试门口拦截唯一词', 1],
  ]);
  const found = [];
  for (const [text, cnt] of fakeCur) {
    const baseCnt = (fakeBase.get('/repo/src/x.tsx') || new Map()).get(text) || 0;
    if (cnt > baseCnt) found.push(text);
  }
  const ok =
    found.includes('测试门口拦截唯一词') && !found.includes('取消');
  console.log(
    ok
      ? '✅ 自测通过：新增短语被拦截，存量短语被容忍。'
      : '❌ 自测失败：diff 逻辑异常'
  );
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
