/**
 * Fix remaining unused variable warnings:
 * - Remove remaining unused `const tc = useTranslations(...)` lines
 * - Prefix `userInfo` → `_userInfo`, `user` → `_user`
 * - Remove unused imports (Download, CardDescription, ExportColumn, TableExportToolbar)
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const projectRoot = resolve('.');

let eslintJson;
try {
  eslintJson = execSync('npx eslint src/ -f json', {
    cwd: projectRoot, encoding: 'utf8', timeout: 600000,
    maxBuffer: 100 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (err) {
  eslintJson = err.stdout || '';
}

const data = JSON.parse(eslintJson);

let totalFixed = 0;
const filesFixed = new Set();

// Variables to prefix with _ (rename)
const prefixMap = {
  'userInfo': '_userInfo',
  'user': '_user',
};

// Imports to remove (unused)
const importsToRemove = ['Download', 'CardDescription', 'ExportColumn', 'TableExportToolbar'];

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
  const replacements = []; // {lineIdx, oldText, newText}

  const unusedVars = file.messages.filter(
    m => m.ruleId === '@typescript-eslint/no-unused-vars'
  );

  for (const msg of unusedVars) {
    const lineIdx = msg.line - 1;
    const line = lines[lineIdx];
    if (!line) continue;
    const varName = msg.message.match(/'([^']+)'/)?.[1];

    if (!varName) continue;

    // Remove unused `const tc = useTranslations(...)` lines
    if (varName === 'tc' && /const\s+tc\s*=\s*useTranslations\(/.test(line)) {
      linesToRemove.add(lineIdx);
      modified = true;
      totalFixed++;
      continue;
    }

    // Rename userInfo → _userInfo, user → _user
    if (prefixMap[varName]) {
      // Only rename the declaration, not all occurrences on this line
      // For destructuring like `const { user } = ...`, rename to `const { user: _user } = ...`
      // For `const user = ...`, rename to `const _user = ...`
      // For function params, rename the param
      // Simple approach: rename on this line only
      const renamed = prefixMap[varName];
      // For `const user =` or `const { user } =` or `user,` in params
      let newLine = line;

      // Pattern: const user = ... or let user = ...
      newLine = newLine.replace(
        new RegExp(`(const|let|var)\\s+${varName}\\b`),
        `$1 ${renamed}`
      );
      // Pattern: const { user } = ... → const { user: _user } = ...
      newLine = newLine.replace(
        new RegExp(`\\{\\s*${varName}\\s*\\}`),
        `{ ${varName}: ${renamed} }`
      );
      // Pattern: const { x, user, y } = ... → const { x, user: _user, y } = ...
      newLine = newLine.replace(
        new RegExp(`,\\s*${varName}\\s*,`),
        `, ${varName}: ${renamed},`
      );
      newLine = newLine.replace(
        new RegExp(`,\\s*${varName}\\s*\\}`),
        `, ${varName}: ${renamed} }`
      );
      newLine = newLine.replace(
        new RegExp(`\\{\\s*${varName}\\s*,`),
        `{ ${varName}: ${renamed},`
      );
      // Pattern: function foo(user, → function foo(_user,
      newLine = newLine.replace(
        new RegExp(`\\(\\s*${varName}\\b(?!\\s*:)`),
        `(${renamed}`
      );
      newLine = newLine.replace(
        new RegExp(`,\\s*${varName}\\b(?!\\s*[:.])`),
        `, ${renamed}`
      );

      if (newLine !== line) {
        lines[lineIdx] = newLine;
        modified = true;
        totalFixed++;
      }
      continue;
    }

    // Remove unused imports
    if (importsToRemove.includes(varName)) {
      // Check if this is an import line
      if (line.includes('import') && line.includes('from')) {
        // Remove the specific import from the import statement
        let newLine = line;

        // Pattern: import { X, Download, Y } from '...'
        newLine = newLine.replace(
          new RegExp(`,\\s*${varName}\\b`),
          ''
        );
        newLine = newLine.replace(
          new RegExp(`\\{\\s*${varName}\\s*,\\s*`),
          '{ '
        );
        newLine = newLine.replace(
          new RegExp(`,\\s*${varName}\\s*\\}`),
          ' }'
        );
        // Pattern: import { Download } from '...' — remove entire line
        if (new RegExp(`import\\s*\\{\\s*${varName}\\s*\\}`).test(newLine)) {
          linesToRemove.add(lineIdx);
        } else {
          lines[lineIdx] = newLine;
        }
        modified = true;
        totalFixed++;
        continue;
      }
    }
  }

  if (!modified) continue;

  const newLines = lines.filter((_, i) => !linesToRemove.has(i));
  let finalContent = newLines.join('\n');

  // Check if useTranslations import is still used after removing tc assignments
  if (linesToRemove.size > 0) {
    const useTranslationsUsage = finalContent.replace(
      /import\s*{[^}]*useTranslations[^}]*}\s*from\s*['"]next-intl['"]/, ''
    );
    if (!useTranslationsUsage.includes('useTranslations')) {
      finalContent = finalContent
        .replace(/import\s*\{\s*useTranslations\s*,\s*/g, 'import { ')
        .replace(/,\s*useTranslations\s*\}/g, ' }')
        .replace(/import\s*\{\s*useTranslations\s*\}\s*from\s*['"]next-intl['"]\s*;?\n/g, '');
    }
  }

  writeFileSync(filePath, finalContent, 'utf8');
  filesFixed.add(filePath);
}

console.log(`Fixed ${totalFixed} unused variables in ${filesFixed.size} files`);
