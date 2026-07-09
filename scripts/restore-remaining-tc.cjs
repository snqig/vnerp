#!/usr/bin/env node
/**
 * Restore remaining files with tc('text_xxx') calls from HEAD.
 *
 * After automated tc() fix, some files still have unmapped tc() calls because
 * the i18n migration also made other breaking changes (string swaps, JSX
 * corruption). For these files, restoring from HEAD is the safest fix since
 * ALL changes are broken migration artifacts.
 *
 * Safety check: only restore if HEAD version does NOT contain tc('text_') calls.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function findFilesWithTcCalls(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'dist', 'build', 'coverage', 'test-results', 'playwright-report'].includes(entry.name)) continue;
      findFilesWithTcCalls(fullPath, results);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes("tc('text_") || content.includes('tc("text_')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function getHeadContent(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  const nullDev = process.platform === 'win32' ? 'NUL' : '/dev/null';
  try {
    return execSync(`git show HEAD:${relativePath} 2>${nullDev}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    return null;
  }
}

console.log('=== Restore remaining files with tc() calls from HEAD ===\n');

const srcDir = path.join(PROJECT_ROOT, 'src');
const files = findFilesWithTcCalls(srcDir);
console.log(`Found ${files.length} files still containing tc('text_') calls.\n`);

let restored = 0;
let skipped = 0;
let noHead = 0;
const skippedFiles = [];

for (const file of files) {
  const relativePath = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
  const headContent = getHeadContent(file);

  if (!headContent) {
    console.log(`  NO HEAD: ${relativePath} (newly created file)`);
    noHead++;
    continue;
  }

  // Safety check: HEAD version must NOT have tc('text_') calls
  if (headContent.includes("tc('text_") || headContent.includes('tc("text_')) {
    console.log(`  SKIP (HEAD also has tc()): ${relativePath}`);
    skipped++;
    skippedFiles.push(relativePath);
    continue;
  }

  // Restore from HEAD
  fs.writeFileSync(file, headContent, 'utf8');
  console.log(`  RESTORED: ${relativePath}`);
  restored++;
}

console.log(`\n=== Summary ===`);
console.log(`Files restored from HEAD: ${restored}`);
console.log(`Files skipped (HEAD has tc()): ${skipped}`);
console.log(`Files with no HEAD version: ${noHead}`);

if (skippedFiles.length > 0) {
  console.log(`\nSkipped files need manual review:`);
  for (const f of skippedFiles) {
    console.log(`  ${f}`);
  }
}
