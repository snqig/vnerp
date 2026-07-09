#!/usr/bin/env node
/**
 * Fix broken tc('text_xxx') calls by restoring original Chinese strings.
 *
 * The tc() calls are UNCOMMITTED changes in the working tree. The committed
 * version at HEAD has the original Chinese strings. This script:
 *
 * 1. Finds all files with tc('text_xxx') calls in the working tree
 * 2. For each file, gets the HEAD version (which has Chinese strings)
 * 3. For each working tree line with tc('text_xxx'), finds the matching
 *    HEAD line by structural similarity and extracts the string mapping
 * 4. Applies the global mapping to all files
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

// Extract tc() call keys and their string literal replacements from a line pair
function extractFromLinePair(workLine, headLine) {
  const mapping = {};
  const tcPattern = /tc\(['"]text_([a-z0-9]+)['"]\)/g;
  const tcMatches = [...workLine.matchAll(tcPattern)];
  if (tcMatches.length === 0) return mapping;

  const stringMatches = [...headLine.matchAll(/(['"])((?:[^'"\\]|\\.)*)\1/g)];
  if (stringMatches.length === 0) return mapping;

  // Strategy: Replace each tc('text_xxx') in the work line with a placeholder,
  // then find what strings from the head line would make the lines match.
  // Match by prefix: for each tc() call, the text before it in the work line
  // should match the text before the corresponding string in the head line.

  if (tcMatches.length === stringMatches.length) {
    // Same count — pair in order
    for (let k = 0; k < tcMatches.length; k++) {
      const key = 'text_' + tcMatches[k][1];
      const str = stringMatches[k][2];
      if (!mapping[key]) mapping[key] = str;
    }
  } else {
    // Different counts — match by prefix alignment
    let lastHeadEnd = 0;
    for (let k = 0; k < tcMatches.length; k++) {
      const tcPos = tcMatches[k].index;
      const prefix = workLine.slice(0, tcPos);

      // Find the string in headLine whose prefix matches
      let found = false;
      for (let j = 0; j < stringMatches.length; j++) {
        const sm = stringMatches[j];
        if (sm.index < lastHeadEnd) continue; // already used
        const headPrefix = headLine.slice(0, sm.index);

        // Check if prefixes match (accounting for the fact that earlier tc() calls
        // have been replaced with strings, changing the length)
        // Simple heuristic: check if the non-string, non-tc parts of the prefix match
        // by normalizing both prefixes (removing quoted strings)
        const normalizePrefix = (s) => s.replace(/(['"])(?:[^'"\\]|\\.)*\1/g, '""');
        if (normalizePrefix(prefix) === normalizePrefix(headPrefix)) {
          const key = 'text_' + tcMatches[k][1];
          if (!mapping[key]) mapping[key] = sm[2];
          lastHeadEnd = sm.index + sm[0].length;
          found = true;
          break;
        }
      }

      if (!found) {
        // Fallback: try positional matching with normalization
        const normalizePos = (s) => s.replace(/(['"])(?:[^'"\\]|\\.)*\1/g, 'S');
        const workNorm = normalizePos(workLine);
        const headNorm = normalizePos(headLine);
        if (workNorm === headNorm) {
          // Lines have same structure — pair in order, skipping non-tc strings
          let tcIdx = 0;
          let strIdx = 0;
          while (tcIdx < tcMatches.length && strIdx < stringMatches.length) {
            const key = 'text_' + tcMatches[tcIdx][1];
            if (!mapping[key]) mapping[key] = stringMatches[strIdx][2];
            tcIdx++;
            strIdx++;
          }
        }
      }
    }
  }

  return mapping;
}

// Build mapping by searching ALL head lines for each work line with tc() calls
function extractMappingFromContent(headContent, workContent) {
  const mapping = {};
  if (!headContent) return mapping;

  const headLines = headContent.split('\n');
  const workLines = workContent.split('\n');
  const tcPattern = /tc\(['"]text_([a-z0-9]+)['"]\)/g;

  // Build a lookup of head lines by their "skeleton" (line with all strings replaced by placeholder)
  const headLineSkeletons = headLines.map(line => ({
    line,
    skeleton: line.replace(/(['"])((?:[^'"\\]|\\.)*)\1/g, '§').trim(),
  }));

  for (const workLine of workLines) {
    const tcMatches = [...workLine.matchAll(tcPattern)];
    if (tcMatches.length === 0) continue;

    // Build the work line's skeleton (replace tc() calls and strings with placeholder)
    const workSkeleton = workLine.replace(/tc\(['"]text_[a-z0-9]+['"]\)/g, '§').replace(/(['"])((?:[^'"\\]|\\.)*)\1/g, '§').trim();

    // Find the best matching head line by skeleton similarity
    let bestMatch = null;
    let bestScore = 0;

    for (const { line: headLine, skeleton: headSkeleton } of headLineSkeletons) {
      if (headSkeleton === workSkeleton) {
        // Perfect skeleton match
        const result = extractFromLinePair(workLine, headLine);
        const keys = Object.keys(result);
        if (keys.length > 0) {
          Object.assign(mapping, result);
          bestMatch = null; // already applied
          break;
        }
      }

      // Calculate similarity score (number of matching characters in skeleton)
      if (headSkeleton.length > 0 && workSkeleton.length > 0) {
        let score = 0;
        const minLen = Math.min(headSkeleton.length, workSkeleton.length);
        for (let i = 0; i < minLen; i++) {
          if (headSkeleton[i] === workSkeleton[i]) score++;
        }
        const sim = score / Math.max(headSkeleton.length, workSkeleton.length);
        if (sim > bestScore && sim > 0.5) {
          bestScore = sim;
          bestMatch = headLine;
        }
      }
    }

    // If no perfect match found, try the best fuzzy match
    if (bestMatch) {
      const result = extractFromLinePair(workLine, bestMatch);
      Object.assign(mapping, result);
    }
  }

  return mapping;
}

function replaceTcCalls(content, mapping) {
  let replaced = 0;
  const newContent = content.replace(/tc\(['"]text_([a-z0-9]+)['"]\)/g, (match, key) => {
    const fullKey = 'text_' + key;
    const originalString = mapping[fullKey];
    if (originalString !== undefined) {
      replaced++;
      const escaped = originalString.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `'${escaped}'`;
    }
    return match;
  });
  return { content: newContent, replaced };
}

// Main
console.log('=== Fix broken tc() calls (skeleton matching) ===\n');

const srcDir = path.join(PROJECT_ROOT, 'src');
console.log('Scanning for files with tc(\'text_...\') calls...');
const files = findFilesWithTcCalls(srcDir);
console.log(`Found ${files.length} files with broken tc() calls.\n`);

// Phase 1: Build global mapping
console.log('Phase 1: Building text_xxx → original string mapping...');
const globalMapping = {};
let filesWithMapping = 0;
let filesNoMapping = 0;
const filesNoHead = [];

for (const file of files) {
  const workContent = fs.readFileSync(file, 'utf8');
  const headContent = getHeadContent(file);

  if (!headContent) {
    filesNoHead.push(path.relative(PROJECT_ROOT, file));
    filesNoMapping++;
    continue;
  }

  const fileMapping = extractMappingFromContent(headContent, workContent);
  const newKeys = Object.keys(fileMapping).length;
  if (newKeys > 0) {
    filesWithMapping++;
    Object.assign(globalMapping, fileMapping);
  } else {
    filesNoMapping++;
  }
}

console.log(`  Files with mapping: ${filesWithMapping}`);
console.log(`  Files without mapping: ${filesNoMapping}`);
console.log(`  Files without HEAD version: ${filesNoHead.length}`);
console.log(`  Built mapping for ${Object.keys(globalMapping).length} unique text_xxx keys\n`);

// Phase 2: Apply replacements
console.log('Phase 2: Replacing tc(\'text_xxx\') with original strings...');
let filesModified = 0;
let totalReplacements = 0;
const stillBroken = new Map();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const { content: newContent, replaced } = replaceTcCalls(content, globalMapping);

  if (replaced > 0) {
    fs.writeFileSync(file, newContent, 'utf8');
    filesModified++;
    totalReplacements += replaced;
  }

  const remaining = (newContent.match(/tc\(['"]text_[a-z0-9]+['"]\)/g) || []).length;
  if (remaining > 0) {
    stillBroken.set(path.relative(PROJECT_ROOT, file), remaining);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Files modified: ${filesModified}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log(`Unique keys mapped: ${Object.keys(globalMapping).length}`);

if (stillBroken.size > 0) {
  console.log(`\nWARNING: ${stillBroken.size} files still have unmapped tc('text_') calls (total: ${[...stillBroken.values()].reduce((a,b)=>a+b,0)}):`);
  for (const [file, count] of [...stillBroken.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
    console.log(`  ${count} calls: ${file}`);
  }
  if (stillBroken.size > 30) {
    console.log(`  ... and ${stillBroken.size - 30} more files`);
  }
}

if (filesNoHead.length > 0) {
  console.log(`\nFiles without HEAD version (newly created):`);
  for (const f of filesNoHead.slice(0, 20)) {
    console.log(`  ${f}`);
  }
}
