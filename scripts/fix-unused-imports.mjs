#!/usr/bin/env node
/**
 * 批量移除未使用的 imports 和前缀化未用局部变量。
 * 安全策略：
 * 1. 局部变量 (assigned but never used): 前缀 _ (不改行数)
 * 2. import 整行移除: 收集编辑，从底到顶应用
 * 3. import specifier 移除: 重建 import 行，收集编辑，从底到顶应用
 *
 * 基于 eslint_current_report.json 精确定位。
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const reportPath = resolve(projectRoot, 'eslint_current_report.json');

const report = JSON.parse(readFileSync(reportPath, 'utf8').replace(/^\uFEFF/, ''));

const stats = {
  importRemoved: 0,
  specifierRemoved: 0,
  defaultRemoved: 0,
  localVarPrefixed: 0,
  skipped: 0,
  filesModified: 0,
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 收集每个文件的未用变量
const fileUnused = new Map();
for (const file of report) {
  if (!file.messages) continue;
  const unused = new Map();
  for (const m of file.messages) {
    if (m.ruleId !== '@typescript-eslint/no-unused-vars' || m.severity !== 1) continue;
    const match = m.message.match(/'([^']+)'/);
    if (!match) continue;
    const varName = match[1];
    const kind = m.message.includes('defined but never used') ? 'defined'
               : m.message.includes('assigned a value but never used') ? 'assigned'
               : 'other';
    unused.set(varName, { kind, line: m.line, column: m.column });
  }
  if (unused.size > 0) fileUnused.set(file.filePath, unused);
}

for (const [filePath, unusedMap] of fileUnused) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }
  const lines = content.split('\n');
  const edits = []; // { startIdx, endIdx, newLines[] }
  let modified = false;

  // Pass 1: 前缀化局部变量 (assigned but never used) — 不改变行数
  // 排除翻译函数 (t, tc, td) — 它们当前未用，但 i18n 迁移后会用到
  const TRANSLATION_VARS = new Set(['t', 'tc', 'td', 'tFunc', 'translate']);
  for (const [varName, info] of unusedMap) {
    if (info.kind !== 'assigned') continue;
    if (TRANSLATION_VARS.has(varName)) continue;
    const lineIdx = info.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) continue;
    const line = lines[lineIdx];
    // 排除 useTranslations 赋值的变量
    if (line.includes('useTranslations')) continue;
    const declMatch = line.match(new RegExp(`^(\\s*)(const|let|var)\\s+${escapeRe(varName)}\\s*=`));
    if (declMatch && !line.includes('{') && !line.includes('}')) {
      // 单变量声明: const t = ...
      if (line.split(',').length > 1) continue; // 多变量声明跳过
      lines[lineIdx] = line.replace(
        new RegExp(`^(\\s*(?:const|let|var)\\s+)${escapeRe(varName)}(\\s*=)`),
        `$1_${varName}$2`
      );
      stats.localVarPrefixed++;
      modified = true;
    }
  }

  // Pass 2: 收集 import 编辑
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!/^(export\s+)?import\s/.test(trimmed)) continue;

    // 找完整 import 范围
    let importEnd = i;
    for (let j = i; j < lines.length && j <= i + 25; j++) {
      const l = lines[j];
      if (j > i && /^(import|export\s|const |let |var |function |class |interface |type |export default|async |\/\/)/.test(l.trim())) {
        importEnd = j - 1;
        break;
      }
      // 到 from 行且有分号或引号结尾
      if (/from\s+['"]/.test(l)) {
        importEnd = j;
        if (l.includes(';') || /['"]\s*$/.test(l.trim())) break;
      }
      importEnd = j;
    }
    const importText = lines.slice(i, importEnd + 1).join('\n');

    // 解析 specifiers
    const allSpecifiers = [];
    let hasDefault = false, hasNamed = false, hasNamespace = false;

    const defaultMatch = importText.match(/^((?:export\s+)?import\s+)(?:type\s+)?(\w+)\s*(?:,|from)/m);
    if (defaultMatch) {
      hasDefault = true;
      allSpecifiers.push({ importedName: defaultMatch[2], localName: defaultMatch[2], isDefault: true, isNamespace: false, isTypeOnly: false, isUnused: unusedMap.has(defaultMatch[2]) });
    }

    const nsMatch = importText.match(/\*\s+as\s+(\w+)/);
    if (nsMatch) {
      hasNamespace = true;
      allSpecifiers.push({ importedName: '*', localName: nsMatch[1], isDefault: false, isNamespace: true, isTypeOnly: false, isUnused: unusedMap.has(nsMatch[1]) });
    }

    const namedMatch = importText.match(/\{([^}]*)\}/);
    if (namedMatch) {
      hasNamed = true;
      for (const spec of namedMatch[1].split(',').map(s => s.trim()).filter(Boolean)) {
        const m = spec.match(/^(?:type\s+)?(\w+)(?:\s+as\s+(\w+))?$/);
        if (m) {
          const importedName = m[1];
          const localName = m[2] || m[1];
          allSpecifiers.push({ importedName, localName, isDefault: false, isNamespace: false, isTypeOnly: spec.startsWith('type '), isUnused: unusedMap.has(localName) });
        }
      }
    }

    if (allSpecifiers.length === 0) continue;

    const allUnused = allSpecifiers.every(s => s.isUnused);
    if (allUnused) {
      // 整行移除
      edits.push({ startIdx: i, endIdx: importEnd, newLines: [] });
      stats.importRemoved++;
      modified = true;
      continue;
    }

    const unusedSpecs = allSpecifiers.filter(s => s.isUnused);
    if (unusedSpecs.length === 0) continue;

    // 部分移除 — 重建 import
    const usedSpecs = allSpecifiers.filter(s => !s.isUnused);
    const fromIdx = importText.indexOf('from');
    if (fromIdx === -1) { stats.skipped++; continue; }
    const fromPart = importText.substring(fromIdx);
    const prefixMatch = importText.match(/^((?:export\s+)?import\s+)/);
    if (!prefixMatch) { stats.skipped++; continue; }
    const prefix = prefixMatch[1];
    const isTypeImport = /\bimport\s+type\b/.test(importText);
    const typePrefix = isTypeImport ? 'type ' : '';

    const buildSpec = (s) => {
      const typeP = s.isTypeOnly ? 'type ' : '';
      if (s.importedName && s.importedName !== s.localName) {
        return `${typeP}${s.importedName} as ${s.localName}`;
      }
      return `${typeP}${s.localName}`;
    };

    if (hasDefault && hasNamed) {
      const defaultSpec = allSpecifiers.find(s => s.isDefault);
      const namedUsed = usedSpecs.filter(s => !s.isDefault && !s.isNamespace);
      const namedUnused = unusedSpecs.filter(s => !s.isDefault && !s.isNamespace);

      if (defaultSpec.isUnused && namedUnused.length > 0) {
        // 移除 default + 部分 named
        const newImport = `${prefix}${typePrefix}{ ${namedUsed.map(buildSpec).join(', ')} } ${fromPart}`;
        edits.push({ startIdx: i, endIdx: importEnd, newLines: newImport.split('\n') });
        stats.defaultRemoved++;
        stats.specifierRemoved += namedUnused.length;
        modified = true;
      } else if (defaultSpec.isUnused && namedUnused.length === 0) {
        // 只移除 default
        const newImport = `${prefix}${typePrefix}{ ${namedUsed.map(buildSpec).join(', ')} } ${fromPart}`;
        edits.push({ startIdx: i, endIdx: importEnd, newLines: newImport.split('\n') });
        stats.defaultRemoved++;
        modified = true;
      } else if (!defaultSpec.isUnused && namedUnused.length > 0) {
        // 只移除部分 named
        const newImport = `${prefix}${defaultSpec.localName}, { ${namedUsed.map(buildSpec).join(', ')} } ${fromPart}`;
        edits.push({ startIdx: i, endIdx: importEnd, newLines: newImport.split('\n') });
        stats.specifierRemoved += namedUnused.length;
        modified = true;
      }
    } else if (hasNamed) {
      const namedUnused = unusedSpecs.filter(s => !s.isDefault && !s.isNamespace);
      const namedUsed = usedSpecs.filter(s => !s.isDefault && !s.isNamespace);
      if (namedUnused.length > 0 && namedUsed.length > 0) {
        const newImport = `${prefix}${typePrefix}{ ${namedUsed.map(buildSpec).join(', ')} } ${fromPart}`;
        edits.push({ startIdx: i, endIdx: importEnd, newLines: newImport.split('\n') });
        stats.specifierRemoved += namedUnused.length;
        modified = true;
      }
    }
  }

  // 从底到顶应用 import 编辑
  if (edits.length > 0) {
    edits.sort((a, b) => b.startIdx - a.startIdx);
    for (const edit of edits) {
      lines.splice(edit.startIdx, edit.endIdx - edit.startIdx + 1, ...edit.newLines);
    }
  }

  if (modified) {
    writeFileSync(filePath, lines.join('\n'));
    stats.filesModified++;
  }
}

console.log('=== unused imports/vars 批量修复结果 ===');
console.log(`整行 import 移除:   ${stats.importRemoved}`);
console.log(`specifier 移除:     ${stats.specifierRemoved}`);
console.log(`default 移除:       ${stats.defaultRemoved}`);
console.log(`局部变量前缀 _:     ${stats.localVarPrefixed}`);
console.log(`跳过:               ${stats.skipped}`);
console.log(`修改文件数:         ${stats.filesModified}`);
console.log(`总计修复:           ${stats.importRemoved + stats.specifierRemoved + stats.defaultRemoved + stats.localVarPrefixed}`);
