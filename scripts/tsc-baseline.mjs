#!/usr/bin/env node
/**
 * TypeScript 错误数基线守门（Phase 0 止血）
 *
 * 策略：以 tsc-baseline.json 中的 errorCount 为冻结线（默认 1204，2026-09-11 实测）。
 *   - 当前 `tsc --noEmit` 的 error TS 数量 ≤ 基线 → 通过（允许渐进下降）
 *   - 当前数量 > 基线 → 失败（阻断类型债回涨；任何改动不得引入新 TS 错误）
 *
 * 与 lint-gate.mjs 的区别：
 *   - lint-gate 只查「改动文件」的 i18n 红线，因为 eslint 可按文件隔离；
 *   - tsc 是全局检查，无法按改动文件隔离（一个文件的类型错误可能牵动其他文件），
 *     因此采用「全局错误数不回涨」的冻结线策略。
 *
 * 每次批量修复降低错误数后，运行 `pnpm tsc:baseline:update` 刷新冻结线，
 * 使 CI 逐步收紧。目标是把冻结线一路降到 0。
 *
 * 用法：
 *   pnpm ts-check            # 仅看当前错误数（原有命令）
 *   pnpm tsc:baseline        # 比对基线（CI / pre-commit 守门）
 *   pnpm tsc:baseline:update # 以当前错误数刷新基线
 *
 * 退出码：0 = 通过；1 = 类型债回涨；2 = 环境/脚本错误。
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, 'tsc-baseline.json');
const DEFAULT_BASELINE = 1204; // 2026-09-11 实测（HEAD 3a7d1499 + 测试/门禁止血），待逐步下调

function getBaseline() {
  if (existsSync(BASELINE_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
      if (typeof raw.errorCount === 'number') return raw.errorCount;
    } catch {
      /* 解析失败则回退默认值 */
    }
  }
  return DEFAULT_BASELINE;
}

function runTsc() {
  const tscBin = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  try {
    // tsc 退出码 0 = 无错误；非 0 = 有错误。错误输出在 stdout。
    return execFileSync(process.execPath, [tscBin, '--noEmit'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    // tsc 有错误时 execFileSync 抛错，stderr/stdout 在异常对象上
    return (e.stdout || '') + '\n' + (e.stderr || '');
  }
}

function countErrors(output) {
  // tsc 错误行形如：  src/foo.ts(260,39): error TS2769: message
  let n = 0;
  for (const l of output.split('\n')) {
    if (/\(\d+,\s*\d+\):\s*error TS\d+/.test(l)) n++;
  }
  return n;
}

function main() {
  const args = process.argv.slice(2);
  const baseline = getBaseline();
  const output = runTsc();
  const current = countErrors(output);

  if (args.includes('--update')) {
    writeFileSync(
      BASELINE_PATH,
      JSON.stringify(
        { errorCount: current, updatedAt: new Date().toISOString().slice(0, 10) },
        null,
        2,
      ) + '\n',
      'utf8',
    );
    console.log(`✅ 基线已刷新为 ${current} 个 TS 错误（tsc-baseline.json）。`);
    process.exit(0);
  }

  const delta = current - baseline;
  if (current <= baseline) {
    if (delta < 0) {
      console.log(
        `✅ tsc 错误数 ${current} ≤ 基线 ${baseline}（下降 ${-delta}）— 类型债未回涨。`,
      );
      console.log(
        `   🎉 较基线减少 ${-delta} 个错误，记得 \`pnpm tsc:baseline:update\` 刷新冻结线。`,
      );
    } else {
      console.log(`✅ tsc 错误数 ${current} == 基线 ${baseline} — 类型债持平，未回涨。`);
    }
    process.exit(0);
  }

  console.error(
    `\n❌ tsc 错误数 ${current} > 基线 ${baseline}（回涨 +${delta}）— 类型债不允许增加！`,
  );
  console.error('   请修复新增的 TS 错误，或将基线刷新为当前值（仅当确认是一次性必然大改）：');
  console.error('   pnpm tsc:baseline:update');
  process.exit(1);
}

main();
