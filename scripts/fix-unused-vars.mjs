/**
 * Fix unused variable warnings:
 * 1. Remove unused `const t = useTranslations(...)` lines (created by tc() reversion)
 * 2. Rename unused catch (e) to catch (_e)
 * 3. Remove unused `useTranslations` imports when no longer referenced
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const projectRoot = resolve('.');

// Get eslint warnings
let eslintJson;
try {
  eslintJson = execSync('npx eslint src/ -f json', {
    cwd: projectRoot, encoding: 'utf8', timeout: 600000,
    maxBuffer: 50 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (err) {
  eslintJson = err.stdout || '';
}

const data = JSON.parse(eslintJson);

let totalFixed = 0;
const filesFixed = new Set();

for (const file of data) {
  const filePath = file.filePath;
  if (!file.messages.length) continue;

  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split('\n');
  let modified = false;
  const linesToRemove = new Set();

  // Collect unused vars for this file
  const unusedVars = file.messages.filter(
    m => m.ruleId === '@typescript-eslint/no-unused-vars'
  );

  for (const msg of unusedVars) {
    const lineIdx = msg.line - 1;
    const line = lines[lineIdx];
    if (!line) continue;

    // Pattern 1: const t = useTranslations(...); — t is unused
    // Remove the entire line
    if (/^\s*const\s+t\s*=\s*useTranslations\(/.test(line) &&
        msg.message.includes("'t' is assigned a value but never used")) {
      linesToRemove.add(lineIdx);
      modified = true;
      totalFixed++;
      continue;
    }

    // Pattern 2: catch (e) { — e is unused, rename to catch (_e)
    if (/catch\s*\(\s*e\s*\)/.test(line) &&
        msg.message.includes("'e' is defined but never used")) {
      lines[lineIdx] = line.replace(/catch\s*\(\s*e\s*\)/, 'catch (_e)');
      modified = true;
      totalFixed++;
      continue;
    }

    // Pattern 3: catch (e: SomeType) { — rename to catch (_e: SomeType)
    if (/catch\s*\(\s*e\s*:/.test(line) &&
        msg.message.includes("'e' is defined but never used")) {
      lines[lineIdx] = line.replace(/catch\s*\(\s*e\s*:/, 'catch (_e:');
      modified = true;
      totalFixed++;
      continue;
    }
  }

  if (!modified) continue;

  // Remove marked lines
  const newLines = lines.filter((_, i) => !linesToRemove.has(i));

  // Check if useTranslations import is still used after removing t assignments
  const newContent = newLines.join('\n');
  let finalContent = newContent;

  // If useTranslations is imported but no longer used, remove it from imports
  // Check if useTranslations appears anywhere besides the import
  const useTranslationsUsage = newContent.replace(/import\s*{[^}]*useTranslations[^}]*}\s*from\s*['"]next-intl['"]/, '');
  if (useTranslationsUsage.includes('useTranslations') === false) {
    // useTranslations is only in the import, remove it
    finalContent = newContent
      // Pattern: import { useTranslations, X } from 'next-intl'
      .replace(/import\s*\{\s*useTranslations\s*,\s*/g, 'import { ')
      // Pattern: import { X, useTranslations } from 'next-intl'
      .replace(/,\s*useTranslations\s*\}/g, ' }')
      // Pattern: import { useTranslations } from 'next-intl' (only import)
      .replace(/import\s*\{\s*useTranslations\s*\}\s*from\s*['"]next-intl['"]\s*;?\n/g, '');
  }

  writeFileSync(filePath, finalContent, 'utf8');
  filesFixed.add(filePath);
}

console.log(`Fixed ${totalFixed} unused variables in ${filesFixed.size} files`);
