#!/usr/bin/env node
/**
 * guard-drizzle-kit.cjs — Drizzle Kit 调用护栏（Phase 0 / 风险 R1 防护）
 *
 * 背景：真实库 vnerpdacahng 实测 229 表 / 129 外键，Drizzle schema
 * （src/lib/db/schema.ts 及 src/lib/db/schemas/）远未全覆盖。直接运行
 * drizzle-kit push / generate / migrate 会基于残缺 schema 产出
 * DROP 未建模外键/表/列的语句，误执行将破坏引用完整性（灾难级）。
 *
 * 正确做法：schema 结构变更一律走增量迁移 pnpm migrate（scripts/migrate.ts，
 * database/migrations/*.sql），且迁移须幂等。
 *
 * 子命令：
 *   check                   校验 package.json 的 scripts 不含禁用 drizzle-kit 调用
 *   studio                  放行（只读可视化，安全）
 *   generate|migrate|push    拦截并以退出码 1 拒绝执行
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// 禁用的 drizzle-kit 子命令：命中即可能产出 DROP 未建模对象的 SQL
const FORBIDDEN_RE = /drizzle-kit\s+(push|generate|migrate)/;
// 显式绕过通道（脚枪），不得存在
const FORBIDDEN_SCRIPT_NAMES = new Set(['db:push-raw']);

function guardMessage(detail) {
  return (
    '\n[DRIZZLE-GUARD] ' + detail + '\n' +
    '[DRIZZLE-GUARD] 真实库 vnerpdacahng 含 129 个外键，Drizzle schema 未全覆盖；\n' +
    '[DRIZZLE-GUARD] schema 变更请走 `pnpm migrate`（scripts/migrate.ts），不要 drizzle-kit push/generate/migrate。\n'
  );
}

function fail(detail) {
  process.stderr.write(guardMessage(detail));
  process.exit(1);
}

function runCheck() {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = pkg.scripts || {};
  const bad = [];
  for (const [name, cmd] of Object.entries(scripts)) {
    if (FORBIDDEN_SCRIPT_NAMES.has(name)) bad.push(`script "${name}": ${cmd}`);
    if (FORBIDDEN_RE.test(cmd)) bad.push(`script "${name}": ${cmd}`);
  }
  if (bad.length) {
    fail('package.json 检测到禁用 drizzle-kit 调用：\n  - ' + bad.join('\n  - '));
  }
  process.stdout.write('[DRIZZLE-GUARD] OK：package.json 未含禁用的 drizzle-kit push/generate/migrate 调用。\n');
  process.exit(0);
}

function main() {
  const sub = process.argv[2];
  if (sub === 'check') return runCheck();
  if (!sub) fail('缺少子命令。仅允许 studio；禁止 push/generate/migrate。');

  if (sub === 'studio') {
    try {
      const res = execFileSync('pnpm', ['dlx', 'drizzle-kit', ...process.argv.slice(2)], { stdio: 'inherit' });
      process.exit(res.status ?? 0);
    } catch (e) {
      process.exit(e.status ?? 1);
    }
  }

  fail(`禁止 drizzle-kit ${sub}：会基于残缺 schema 破坏真实库外键与表结构。`);
}

main();
