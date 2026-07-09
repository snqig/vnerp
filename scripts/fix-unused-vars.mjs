#!/usr/bin/env node
/**
 * 批量修复 no-unused-vars 警告：
 * 1. catch (e/error/err) 未使用 → catch（移除绑定）
 * 2. withPermission 回调的 userInfo 未使用 → _userInfo
 * 3. 函数参数 request 未使用 → _request
 *
 * 基于 eslint_full_report.json 的精确行号定位，仅修改 eslint 标记的行。
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const reportPath = resolve(projectRoot, 'eslint_full_report.json');

const rawContent = readFileSync(reportPath, 'utf8').replace(/^\uFEFF/, '');
const report = JSON.parse(rawContent);

const CATCH_VARS = new Set(['e', 'error', 'err', 'ex', 'exception']);
const PARAM_RENAME = { userInfo: '_userInfo', request: '_request' };

let stats = {
  catchFixed: 0,
  paramRenamed: 0,
  skipped: 0,
  filesModified: 0,
};

// Collect warnings grouped by file
const fileWarnings = new Map();

for (const file of report) {
  if (!file.messages) continue;
  const filePath = file.filePath;
  const warnings = file.messages.filter(
    m => m.ruleId === '@typescript-eslint/no-unused-vars' && m.severity === 1
  );
  if (warnings.length === 0) continue;
  fileWarnings.set(filePath, warnings);
}

for (const [filePath, warnings] of fileWarnings) {
  let content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;

  // Sort warnings by line descending so we modify from bottom to top
  // (avoids line number shifting)
  const sorted = [...warnings].sort((a, b) => b.line - a.line);

  for (const w of sorted) {
    const match = w.message.match(/'([^']+)'/);
    if (!match) { stats.skipped++; continue; }
    const varName = match[1];
    const lineIdx = w.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) { stats.skipped++; continue; }
    const line = lines[lineIdx];

    // Case 1: catch block variable
    if (CATCH_VARS.has(varName)) {
      // Match: catch (varName) or catch(varName)
      const catchRegex = new RegExp(`catch\\s*\\(\\s*${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\)`);
      if (catchRegex.test(line)) {
        lines[lineIdx] = line.replace(catchRegex, 'catch');
        modified = true;
        stats.catchFixed++;
        continue;
      }
      // Maybe the catch is on a different line — skip
      stats.skipped++;
      continue;
    }

    // Case 2: function param rename (userInfo, request)
    if (varName in PARAM_RENAME) {
      const newName = PARAM_RENAME[varName];
      // Only rename if it's a parameter (not an import or local var)
      // Pattern: (request: NextRequest, userInfo) or (request: NextRequest, userInfo: SomeType)
      // We need to be precise: only rename the parameter, not any usage in the body
      // Since eslint says it's unused, renaming in the signature is safe
      const paramRegex = new RegExp(
        `(\\(|,\\s*)${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*[,):])`
      );
      if (paramRegex.test(line)) {
        lines[lineIdx] = line.replace(
          new RegExp(`(^|\\(|,\\s*)${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*[,):])`),
          `$1${newName}$2`
        );
        modified = true;
        stats.paramRenamed++;
        continue;
      }
      // Try: the variable might be on this line as a standalone param
      // e.g., "async (request: NextRequest, userInfo) =>"
      const simpleRegex = new RegExp(`\\b${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (simpleRegex.test(line) && !line.includes('import')) {
        // Check if it looks like a function parameter
        if (line.includes('async') || line.includes('=>') || line.includes('function')) {
          lines[lineIdx] = line.replace(
            new RegExp(`\\b${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
            newName
          );
          modified = true;
          stats.paramRenamed++;
          continue;
        }
      }
      stats.skipped++;
      continue;
    }

    stats.skipped++;
  }

  if (modified) {
    writeFileSync(filePath, lines.join('\n'));
    stats.filesModified++;
  }
}

console.log('=== no-unused-vars 批量修复结果 ===');
console.log(`catch 绑定移除:  ${stats.catchFixed}`);
console.log(`参数重命名:      ${stats.paramRenamed}`);
console.log(`跳过（需手动）:  ${stats.skipped}`);
console.log(`修改文件数:      ${stats.filesModified}`);
console.log(`总计修复:        ${stats.catchFixed + stats.paramRenamed}`);
