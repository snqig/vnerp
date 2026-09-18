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
 * 依赖：eslint-baseline.json 必须由 `pnpm lint:baseline` 预先生成（已入库，勿加入 .gitignore）。
 *       每次批量迁移减少硬编码后，记得重跑 `pnpm lint:baseline` 刷新冻结线。
 *
 * CI 注意：改动集合取自 `git diff <base>...HEAD`。actions/checkout 默认 fetch-depth: 1
 *       会让基线 ref 不可解析 → 改动集合为空 → 红线静默放行。因此 CI 必须
 *       fetch-depth: 0，否则脚本在 CI=1 且无基线时以 exit 2 失败关闭。
 *
 * 用法：
 *   node scripts/lint-gate.mjs                  # 自动取 git 改动文件（CI / pre-commit）
 *   node scripts/lint-gate.mjs --files a.tsx b.tsx   # 仅查指定文件
 *   node scripts/lint-gate.mjs --self-test     # 自测拦截逻辑
 *   node scripts/lint-gate.mjs --update-baseline  # 生成/刷新债务冻结线（= pnpm lint:baseline）
 *
 * 退出码：0 = 通过；1 = 发现新增硬编码；2 = 环境/脚本错误。
 */

import { ESLint } from 'eslint';
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, 'eslint-baseline.json');

// 冻结线 key：**仓库相对路径 + POSIX 分隔符**。
// 绝不存绝对路径 —— 冻结线要跨机器（本地 Windows / CI Linux runner）使用，
// 绝对路径一换环境就对不上，会让每个改动文件都被当成新文件 → 整片误报。
function toRelKey(p) {
  const r = relative(ROOT, resolve(ROOT, p));
  return (r.startsWith('..') ? p : r).replace(/\\/g, '/');
}

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

// 基线：file(仓库相对路径，POSIX 分隔符) -> Map(中文文本 -> 出现次数)
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
    // toRelKey 同时兼容历史遗留的绝对路径条目（会归一成相对路径）
    if (counts.size) map.set(toRelKey(f.filePath), counts);
  }
  return map;
}

// 遍历 src/ 下所有源码文件（跳过 node_modules/.next），返回绝对路径
function walkSrc(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      walkSrc(p, acc);
    } else if (SRC_RE.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

/**
 * 生成 / 刷新 i18n 硬编码冻结线快照（--update-baseline）。
 *
 * 为什么由本脚本生成、而不是 `eslint --format json`：
 *   冻结线必须与 gate 的**同一代码路径**（lintText + 本文件的 extractText）产出，
 *   否则格式/口径差异会让 gate 误报或漏报。此处直接保存原始 ESLint 消息，
 *   buildBaseline 反解后与 gate 逐文件比对的结果完全一致。
 *
 * 产物 eslint-baseline.json 必须**入库**：它是「债务冻结线快照」，
 * 只在显式刷新（批量迁移收敛硬编码后）时变更；CI 依赖它的历史版本做增量比对。
 */
async function updateBaseline() {
  const eslint = new ESLint();
  const files = walkSrc(join(ROOT, 'src'));
  const out = [];
  let total = 0;
  for (const abs of files) {
    let content;
    try {
      content = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    let results;
    try {
      results = await eslint.lintText(content, { filePath: abs });
    } catch (e) {
      console.error(`\n❌ 无法 lint ${abs}（冻结线无法生成该文件）：${e.message}`);
      process.exit(2);
    }
    const messages = [];
    for (const r of results) {
      for (const m of r.messages || []) {
        if (m.ruleId !== 'i18n/no-chinese-hardcode') continue;
        messages.push({ ruleId: m.ruleId, message: m.message });
      }
    }
    if (messages.length) {
      out.push({ filePath: toRelKey(abs), messages });
      total += messages.length;
    }
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(
    `✅ 冻结线已刷新：${out.length} 个文件 / ${total} 处硬编码中文 → ${relative(ROOT, BASELINE_PATH)}`
  );
  process.exit(0);
}

// 候选基线 ref：优先 CI 提供的 GITHUB_BASE_REF，其次 main/develop
function candidateBaseRefs() {
  const refs = [];
  const ghBase = process.env.GITHUB_BASE_REF;
  if (ghBase) refs.push(`origin/${ghBase}`, ghBase);
  refs.push('origin/main', 'origin/develop', 'main', 'develop');
  return refs;
}

// 取 git 改动文件（相对仓库根），多种来源合并去重。
// 额外返回 baseResolved：是否成功解析出基线 ref（CI 下为 false 时必须失败关闭，
// 否则浅克隆会让改动集合为空 → 红线检查静默放行）。
function getChangedFiles() {
  const out = new Set();
  let baseResolved = false;
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
      return true;
    } catch {
      return false;
    }
  };
  // PR 视角：命中第一个可解析的基线即止
  for (const ref of candidateBaseRefs()) {
    if (tryRun(['diff', '--name-only', '--diff-filter=ACMR', `${ref}...HEAD`])) {
      baseResolved = true;
      break;
    }
  }
  tryRun(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']); // 工作树 vs HEAD
  tryRun(['diff', '--cached', '--name-only', '--diff-filter=ACMR']); // 已暂存
  return { files: [...out], baseResolved };
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
  if (args.includes('--update-baseline')) return updateBaseline();

  const baseline = buildBaseline();

  let files;
  let baseResolved = true;
  const fi = args.indexOf('--files');
  if (fi !== -1) {
    files = args.slice(fi + 1).filter((a) => !a.startsWith('--'));
  } else {
    const r = getChangedFiles();
    files = r.files;
    baseResolved = r.baseResolved;
  }
  const targets = filterFiles(files);
  if (!targets.length) {
    // CI 下拿不到基线 ref（如 actions/checkout 默认 fetch-depth: 1）会让改动集合
    // 恒为空 → 静默放行。这里失败关闭，逼出「补 fetch-depth: 0」或显式 --files。
    if (!baseResolved && process.env.CI) {
      console.error(
        '\n❌ i18n 红线无法验证：解析不到基线 ref（origin/main / origin/develop / GITHUB_BASE_REF）。'
      );
      console.error(
        '   修复：在 actions/checkout 设置 fetch-depth: 0，或改用 `--files <路径…>` 显式指定待检文件。'
      );
      process.exit(2);
    }
    console.log('ℹ️ 无改动源码文件，跳过 i18n 红线检查。');
    process.exit(0);
  }

  const eslint = new ESLint();
  console.log(`🔍 i18n 红线检查 ${targets.length} 个改动文件…`);

  const violations = [];
  for (const rel of targets) {
    const abs = join(ROOT, rel);
    const cur = await lintFile(eslint, abs);
    const base = baseline.get(toRelKey(rel)) || new Map();
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
