// 增量 ESLint 守门脚本（git 无关，适用于无 HEAD 的损坏仓库）
//
// 策略：以 eslint-baseline.json 为"债务冻结线"。
//   - 已存在的文件：错误数/警告数不得超过 baseline（只能修，不能恶化）
//   - 新增文件：不允许引入 error 级债务（warning 允许但计入，便于后续跟踪）
//   - 已删除文件：视为改善，忽略
//
// 用法：
//   node scripts/lint-gate.mjs                 # 全量 lint 并比对 baseline（CI 默认）
//   node scripts/lint-gate.mjs --files a.ts b.tsx   # 仅 lint 指定文件（pre-commit / 改动集）
//
// 退出码：0 = 通过；1 = 发现 lint 回归（新增或恶化）。

import { ESLint } from 'eslint';
import { readFileSync } from 'node:fs';

const BASELINE_PATH = process.cwd() + '/eslint-baseline.json';

function buildCounts(results) {
  const map = new Map();
  for (const r of results) {
    let errors = 0;
    let warnings = 0;
    for (const m of r.messages) {
      if (m.severity === 2) errors++;
      else if (m.severity === 1) warnings++;
    }
    map.set(r.filePath, { errors, warnings });
  }
  return map;
}

function parseArgs(argv) {
  const files = [];
  const idx = argv.indexOf('--files');
  if (idx !== -1) {
    for (let i = idx + 1; i < argv.length; i++) {
      if (argv[i].startsWith('--')) break;
      files.push(argv[i]);
    }
  }
  return files.length ? files : ['src/'];
}

async function main() {
  let baselineRaw;
  try {
    baselineRaw = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch (e) {
    console.error(
      '❌ 找不到或无法解析 baseline 文件 eslint-baseline.json。\n' +
        '   请先运行 `pnpm lint:baseline` 生成基线。'
    );
    process.exit(2);
  }
  const baseline = buildCounts(baselineRaw);

  const eslint = new ESLint();
  const files = parseArgs(process.argv.slice(2));
  const results = await eslint.lintFiles(files);
  const current = buildCounts(results);

  const regressions = [];
  for (const [file, c] of current) {
    const b = baseline.get(file);
    if (!b) {
      if (c.errors > 0) {
        regressions.push({ file, kind: 'new-file-errors', errors: c.errors, warnings: c.warnings });
      }
      continue;
    }
    if (c.errors > b.errors || c.warnings > b.warnings) {
      regressions.push({
        file,
        kind: 'regression',
        baseline: { errors: b.errors, warnings: b.warnings },
        now: { errors: c.errors, warnings: c.warnings },
      });
    }
  }

  if (regressions.length) {
    console.error(`\n❌ Lint 守门失败 —— 发现 ${regressions.length} 处回归：`);
    for (const r of regressions) {
      console.error('  ' + JSON.stringify(r));
    }
    console.error(
      '\n处理建议：修复上述新增/恶化项；若属误报或需豁免，先 `pnpm lint:baseline` 重算基线。'
    );
    process.exit(1);
  }

  console.log('✅ Lint 守门通过 —— 存量债务已冻结在 baseline，无新增回归。');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
