import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const projectRoot = 'd:\\dcprint\\erp-project';

// Parse the catch pattern file to get all locations
const catchFile = readFileSync(resolve(projectRoot, 'scripts/any-pattern-catch__X__any_.txt'), 'utf8');
const locations = [];
for (const line of catchFile.trim().split('\n')) {
  // Format: src/path/to/file.ts:123  } catch (X: any) {
  const match = line.match(/^(.+?):(\d+)\s+.*catch\s*\(\s*(\w+)\s*:\s*any/);
  if (match) {
    locations.push({
      file: match[1],
      line: parseInt(match[2]),
      varName: match[3],
    });
  }
}

console.log(`Found ${locations.length} catch blocks to fix`);

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
  let content = readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  let changed = false;

  // Process each catch location
  for (const loc of locs.sort((a, b) => b.line - a.line)) {
    const lineIdx = loc.line - 1; // 0-indexed
    const line = lines[lineIdx];
    const varName = loc.varName;

    // Pattern 1: Empty catch with unused var: catch (_e: any) {}
    // → just remove : any → catch (_e) {}
    if (line.includes(`catch (${varName}: any) {}`) ||
        line.includes(`catch (${varName}: any){}`)) {
      lines[lineIdx] = line.replace(
        new RegExp(`catch\\s*\\(\\s*${varName}\\s*:\\s*any\\s*\\)`),
        `catch (${varName})`
      );
      changed = true;
      totalFixed++;
      continue;
    }

    // Pattern 2: catch (X: any) { ... } — need to find the catch body
    // Remove : any from the catch parameter
    const catchRegex = new RegExp(`catch\\s*\\(\\s*${varName}\\s*:\\s*any\\s*\\)`);
    if (!catchRegex.test(line)) {
      console.warn(`  SKIP: ${filePath}:${loc.line} — pattern not found`);
      continue;
    }

    lines[lineIdx] = line.replace(catchRegex, `catch (${varName})`);

    // Find the catch body (from this line to matching closing brace)
    let braceDepth = 0;
    let catchBodyStart = lineIdx;
    let catchBodyEnd = -1;

    // Find the opening brace
    for (let i = lineIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
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
      console.warn(`  WARN: ${filePath}:${loc.line} — could not find catch body end`);
      changed = true;
      totalFixed++;
      continue;
    }

    // Within the catch body, replace varName.message and varName.stack
    // with (varName as Error).message and (varName as Error).stack
    for (let i = catchBodyStart; i <= catchBodyEnd; i++) {
      const original = lines[i];
      // Replace X.message → (X as Error).message (but not if already (X as Error))
      // Use word boundary to avoid partial matches
      const msgRegex = new RegExp(`(?<!\\.)\\b${varName}\\.message\\b(?!\\s*\\))`, 'g');
      lines[i] = lines[i].replace(msgRegex, `(${varName} as Error).message`);

      const stackRegex = new RegExp(`(?<!\\.)\\b${varName}\\.stack\\b(?!\\s*\\))`, 'g');
      lines[i] = lines[i].replace(stackRegex, `(${varName} as Error).stack`);

      // Replace X.code → (X as Error & { code: string }).code (for DB errors)
      // Skip this — too risky

      if (lines[i] !== original) changed = true;
    }

    changed = true;
    totalFixed++;
  }

  if (changed) {
    writeFileSync(fullPath, lines.join('\n'), 'utf8');
    filesChanged++;
    console.log(`  Fixed: ${filePath}`);
  }
}

console.log(`\nDone! Fixed ${totalFixed} catch blocks across ${filesChanged} files`);
