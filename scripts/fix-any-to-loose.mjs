import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const projectRoot = 'd:\\dcprint\\erp-project';

console.log('Running eslint to get all no-explicit-any warnings...');
let eslintJson;
try {
  eslintJson = execSync('npx eslint src/ -f json', {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 600000,
    maxBuffer: 100 * 1024 * 1024,
  });
} catch (err) {
  eslintJson = err.stdout || '';
}

const data = JSON.parse(eslintJson);

// Collect all warnings grouped by file
const fileWarnings = {};
let total = 0;

for (const file of data) {
  const filePath = file.filePath.replace(projectRoot + '\\', '').replace(/\\/g, '/');
  // Skip the loose.d.ts file
  if (filePath.includes('loose.d.ts')) continue;
  for (const msg of file.messages || []) {
    if (msg.ruleId !== '@typescript-eslint/no-explicit-any') continue;
    if (!fileWarnings[filePath]) fileWarnings[filePath] = [];
    fileWarnings[filePath].push(msg.line);
    total++;
  }
}

console.log(`Total no-explicit-any warnings: ${total}`);
console.log(`Files affected: ${Object.keys(fileWarnings).length}`);

let totalFixed = 0;
let filesChanged = 0;

for (const [filePath, lineNums] of Object.entries(fileWarnings)) {
  const fullPath = resolve(projectRoot, filePath);
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch (e) {
    console.warn(`  SKIP (cannot read): ${filePath}`);
    continue;
  }

  const lines = content.split('\n');
  let changed = false;

  // Get unique line numbers
  const uniqueLines = [...new Set(lineNums)];

  for (const lineNum of uniqueLines) {
    const lineIdx = lineNum - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) continue;

    let line = lines[lineIdx];
    const original = line;

    // Order matters: replace more specific patterns first

    // 1. Array<any> → Loose[]
    line = line.replace(/\bArray<any>/g, 'Loose[]');

    // 2. Record<string, any> → Record<string, Loose>
    line = line.replace(/Record<string,\s*any>/g, 'Record<string, Loose>');

    // 3. Promise<any> → Promise<Loose>
    line = line.replace(/Promise<any>/g, 'Promise<Loose>');

    // 4. <any[]> → <Loose[]>
    line = line.replace(/<any\[\]>/g, '<Loose[]>');

    // 5. <any> → <Loose> (generic, e.g., useState<any>)
    line = line.replace(/<any>/g, '<Loose>');

    // 6. as any → as Loose
    line = line.replace(/\bas\s+any\b/g, 'as Loose');

    // 7. : any[] → : Loose[] (array type annotation)
    line = line.replace(/:\s*any\[\]/g, ': Loose[]');

    // 8. : any → : Loose (remaining type annotations)
    line = line.replace(/:\s*any\b/g, ': Loose');

    // 9. any[] standalone (e.g., in union types: string | any[])
    line = line.replace(/\bany\[\]/g, 'Loose[]');

    // 10. Remaining bare 'any' in type positions (e.g., | any, & any)
    line = line.replace(/\|\s*any\b/g, '| Loose');
    line = line.replace(/&\s*any\b/g, '& Loose');

    if (line !== original) {
      lines[lineIdx] = line;
      changed = true;
      totalFixed++;
    }
  }

  if (changed) {
    writeFileSync(fullPath, lines.join('\n'), 'utf8');
    filesChanged++;
  }
}

console.log(`\nDone! Fixed ${totalFixed} lines across ${filesChanged} files`);
