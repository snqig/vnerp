const fs = require('fs');
const schema = fs.readFileSync('database/vnerpdacahng_schema.sql', 'utf8');
const tables = {};
const re = /CREATE TABLE\s+`?(\w+)`?\s*\(([\s\S]*?)\)\s*(?:ENGINE|DEFAULT|;)/g;
let m;
while ((m = re.exec(schema))) {
  const name = m[1];
  const body = m[2];
  const cols = [];
  for (const line of body.split('\n')) {
    const t = line.trim();
    const cm = t.match(/^`?(\w+)`?\s+(?:tinyint|smallint|mediumint|int|bigint|decimal|float|double|char|varchar|text|longtext|date|datetime|timestamp|time|json|enum|blob)/i);
    if (cm) cols.push(cm[1]);
  }
  tables[name] = cols;
}
console.log('total tables parsed:', Object.keys(tables).length);
for (const t of ['fin_receivable','sys_announcement','quality_final','quality_process','quality_incoming','quality_complaint']) {
  console.log('\n=== '+t+' ('+(tables[t]?tables[t].length:0)+' cols) ===');
  console.log((tables[t]||[]).join(', '));
}
