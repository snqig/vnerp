const fs = require('fs');
const src = fs.readFileSync('src/lib/db/schemas/system.ts', 'utf8');
const exportName = 'sysUser';
const startRe = new RegExp('export\\s+const\\s+' + exportName + '\\s*=\\s*mysqlTable\\(');
const sm = startRe.exec(src);
const openParen = src.indexOf('(', sm.index);
let depth = 0, i = openParen, inStr = null;
for (; i < src.length; i++) {
  const c = src[i];
  if (inStr) { if (c === inStr && src[i - 1] !== '\\') inStr = null; continue; }
  if (c === "'" || c === '`') { inStr = c; continue; }
  if (c === '(') depth++;
  else if (c === ')') { depth--; if (depth === 0) break; }
}
console.log('openParen idx', openParen, 'closeParenIdx', i);
const tableText = src.slice(sm.index, i);
console.log('tableText length', tableText.length);
console.log('has "=> (":', tableText.includes('=> ('));
console.log('extraRe match:', /\n\s*\}\s*,\s*\(([a-zA-Z]+)\)\s*=>\s*\{/.exec(tableText));
// show last 80 chars of tableText
console.log('tableText tail:', JSON.stringify(tableText.slice(-90)));
