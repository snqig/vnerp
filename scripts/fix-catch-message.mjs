import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const projectRoot = 'd:\\dcprint\\erp-project';

// Read the original catch pattern file to get all locations
const catchFile = readFileSync(resolve(projectRoot, 'scripts/any-pattern-catch__X__any_.txt'), 'utf8');
const locations = [];
for (const line of catchFile.trim().split('\n')) {
  const match = line.match(/^(.+?):(\d+)\s+.*catch\s*\(\s*(\w+)\s*:\s*any/);
  if (match) {
    locations.push({
      file: match[1],
      line: parseInt(match[2]),
      varName: match[3],
    });
  }
}

// Group by file
const byFile = {};
for (const loc of locations) {
  if (!byFile[loc.file]) byFile[loc.file] = [];
  byFile[loc.file].push(loc);
}

let totalFixed = 0;
let filesChanged = 0;

for (const [filePath, locs] of Object.entries(byFile)) {
  const fullPath = resolve(projectRoot, filePath);
  const content = readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  let changed = false;

  // Process each catch location (in order, top to bottom)
  for (const loc of locs.sort((a, b) => a.line - b.line)) {
    const lineIdx = loc.line - 1;
    const varName = loc.varName;

    // The catch line should now be: } catch (X) {
    // Find the catch body by counting braces starting from the { after )
    const catchLine = lines[lineIdx];
    const catchParenEnd = catchLine.indexOf(')', catchLine.indexOf('catch'));
    if (catchParenEnd < 0) continue;

    const bodyBraceStart = catchLine.indexOf('{', catchParenEnd);
    if (bodyBraceStart < 0) continue;

    // Count braces starting from bodyBraceStart
    let braceDepth = 0;
    let catchBodyEnd = -1;

    for (let i = lineIdx; i < lines.length; i++) {
      const startCol = (i === lineIdx) ? bodyBraceStart : 0;
      const lineContent = lines[i].substring(startCol);
      for (const ch of lineContent) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') {
          braceDepth--;
          if (braceDepth === 0) {
            catchBodyEnd = i;
            break;
          }
        }
      }
      if (catchBodyEnd >= 0) break;
    }

    if (catchBodyEnd < 0) {
      // Fallback: search next 30 lines for varName.message
      catchBodyEnd = Math.min(lines.length - 1, lineIdx + 30);
    }

    // Within the catch body, replace varName.message → (varName as Error).message
    for (let i = lineIdx; i <= catchBodyEnd; i++) {
      const original = lines[i];
      // Replace X.message → (X as Error).message (not if already wrapped)
      const msgRegex = new RegExp(`(?<!\\.)\\b${varName}\\.message\\b(?!\\s*\\))`, 'g');
      lines[i] = lines[i].replace(msgRegex, `(${varName} as Error).message`);

      const stackRegex = new RegExp(`(?<!\\.)\\b${varName}\\.stack\\b(?!\\s*\\))`, 'g');
      lines[i] = lines[i].replace(stackRegex, `(${varName} as Error).stack`);

      if (lines[i] !== original) {
        changed = true;
        totalFixed++;
      }
    }
  }

  if (changed) {
    writeFileSync(fullPath, lines.join('\n'), 'utf8');
    filesChanged++;
    console.log(`  Fixed: ${filePath}`);
  }
}

console.log(`\nDone! Fixed ${totalFixed} .message/.stack references across ${filesChanged} files`);
