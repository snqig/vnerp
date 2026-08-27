const fs = require('fs');
const content = fs.readFileSync('src/lib/db/schema.ts', 'utf8');
const allLines = content.split('\n');

function findTableBlocks(lines) {
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('export const ') && trimmed.includes('mysqlTable')) {
      const nameMatch = trimmed.match(/export const (\w+)/);
      const name = nameMatch[1];
      let start = i;
      let parenDepth = 0, braceDepth = 0, bracketDepth = 0;
      let inString = false, stringChar = '', foundOpen = false, end = start;
      for (let j = start; j < lines.length; j++) {
        const line = lines[j];
        let k = 0;
        while (k < line.length) {
          const ch = line[k];
          if (inString) {
            if (ch === '\\') { k += 2; continue; }
            if (ch === stringChar) inString = false;
            k++; continue;
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
        const lt = line.trim();
        if (foundOpen && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0 && lt.endsWith(');')) {
          end = j; i = j + 1; break;
        }
      }
      tables.push({ name, start, end, text: lines.slice(start, end + 1).join('\n') });
    } else { i++; }
  }
  return tables;
}

function findTypeAliases(lines) {
  const aliases = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^export type (\w+) = typeof (\w+)\$inferSelect;/);
    if (m) aliases.push({ typeName: m[1], tableName: m[2], line: i });
  }
  return aliases;
}

function categorize(tables) {
  const domains = {};
  ['warehouse','sales','procurement','finance','production','workorder','quote','process','sample','prepress','tooling','hr','crm','common'].forEach(d => domains[d] = []);

  for (const t of tables) {
    const n = t.name;
    if (/^inv/.test(n)) domains.warehouse.push(t);
    else if (/^salQuote/.test(n)) domains.quote.push(t);
    else if (/^sal/.test(n) && !/^salSample/.test(n) && n !== 'sampleOrder') domains.sales.push(t);
    else if (/^pur/.test(n)) domains.procurement.push(t);
    else if (/^fin/.test(n)) domains.finance.push(t);
    else if (/^prd/.test(n) && !/^prdDie/.test(n) && !/^prdScreen/.test(n) && !/^prdInk/.test(n)) domains.production.push(t);
    else if (/^prod/.test(n)) domains.workorder.push(t);
    else if (/^sampleProcessTemplate/.test(n)) domains.process.push(t);
    else if (/^dcprintSampleProcess/.test(n) || n === 'sampleOrder' || /^salSample/.test(n)) domains.sample.push(t);
    else if (/^dcprintInk/.test(n)) domains.prepress.push(t);
    else if (/^dcprintTool/.test(n)) domains.tooling.push(t);
    else if (/^prdDie/.test(n) || /^prdScreen/.test(n) || /^prdInk/.test(n)) domains.tooling.push(t);
    else if (/^hr/.test(n) || /^org/.test(n)) domains.hr.push(t);
    else domains.common.push(t);
  }
  return domains;
}

const tables = findTableBlocks(allLines);
const aliases = findTypeAliases(allLines);
const domains = categorize(tables);

console.log('Table counts per domain:');
for (const [d, tbls] of Object.entries(domains)) {
  console.log(`  ${d}: ${tbls.length} tables`);
  tbls.forEach(t => console.log(`    - ${t.name}`));
}
const total = Object.values(domains).reduce((s, a) => s + a.length, 0);
console.log('\nTotal:', total, '(expected 95)');

// Write plan
fs.writeFileSync('split_plan.json', JSON.stringify({
  domains: Object.fromEntries(
    Object.entries(domains).map(([d, tbls]) => [d, tbls.map(t => ({ name: t.name, start: t.start+1, end: t.end+1 }))])
  )
}, null, 2));
console.log('Plan written to split_plan.json');
