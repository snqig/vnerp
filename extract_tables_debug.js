const fs = require('fs');
const content = fs.readFileSync('src/lib/db/schema.ts', 'utf8');
const lines = content.split('\n');

function findTableBlocks(lines) {
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('export const ') && trimmed.includes('mysqlTable')) {
      const nameMatch = trimmed.match(/export const (\w+)/);
      const name = nameMatch[1];
      let start = i;

      let parenDepth = 0;
      let braceDepth = 0;
      let bracketDepth = 0;
      let inString = false;
      let stringChar = '';
      let foundOpen = false;
      let end = start;

      for (let j = start; j < lines.length; j++) {
        const line = lines[j];
        let k = 0;
        while (k < line.length) {
          const ch = line[k];
          if (inString) {
            if (ch === '\\') { k += 2; continue; }
            if (ch === stringChar) inString = false;
            k++;
            continue;
          }
          if (ch === "'" || ch === '"' || ch === '`') { inString = true; stringChar = ch; k++; continue; }
          if (ch === '(') { parenDepth++; foundOpen = true; }
          else if (ch === ')') parenDepth--;
          else if (ch === '{') braceDepth++;
          else if (ch === '}') braceDepth--;
          else if (ch === '[') bracketDepth++;
          else if (ch === ']') bracketDepth--;
          k++;
        }

        const lineTrimmed = line.trim();
        if (foundOpen && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0 && lineTrimmed === ');') {
          console.log(`  ${name} foundOpen=${foundOpen} p=${parenDepth} b=${braceDepth} bk=${bracketDepth} at line ${j+1}`);
          end = j;
          i = j + 1;
          break;
        }
      }
      tables.push({ name, start, end, text: lines.slice(start, end + 1).join('\n') });
    } else {
      i++;
    }
  }
  return tables;
}

const tables = findTableBlocks(lines);
console.log('Found', tables.length, 'tables');
tables.forEach(t => console.log(t.name, '->', t.start+1, '-', t.end+1));
