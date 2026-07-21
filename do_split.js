const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('src/lib/db/schema.ts', 'utf8');
const allLines = content.split('\n');

// ── Table extraction ─────────────────────────────────────────────────────────
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
    const m = lines[i].match(/^export type (\w+) = typeof (\w+)\.\$inferSelect;/);
    if (m) aliases.push({ typeName: m[1], tableName: m[2], line: i });
  }
  return aliases;
}

// ── Categorization ───────────────────────────────────────────────────────────
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

// ── Imports needed per domain ────────────────────────────────────────────────
const sharedImports = `import { mysqlTable, varchar, datetime, date, timestamp, decimal, int, bigint, tinyint, text, boolean, serial, index, uniqueIndex } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';`;

function getImports(tables) {
  // Determine which drizzle-orm types are used
  const textSet = new Set();
  tables.forEach(t => {
    const re = /(?:mysqlTable|varchar|datetime|date|timestamp|decimal|int|bigint|tinyint|text|boolean|serial|index|uniqueIndex|sql)\b/g;
    let m;
    while ((m = re.exec(t.text)) !== null) textSet.add(m[0]);
  });
  const needsSql = textSet.has('sql');
  const base = "import { " + [...textSet].filter(x => x !== 'sql').sort().join(', ') + " } from 'drizzle-orm/mysql-core';";
  const sqlImport = needsSql ? "import { sql } from 'drizzle-orm';" : '';
  return [base, sqlImport].filter(Boolean).join('\n');
}

// ── Build domain files ───────────────────────────────────────────────────────
const tables = findTableBlocks(allLines);
const aliases = findTypeAliases(allLines);
const domains = categorize(tables);

const schemasDir = 'src/lib/db/schemas';
if (!fs.existsSync(schemasDir)) fs.mkdirSync(schemasDir, { recursive: true });

const domainOrder = ['warehouse','sales','procurement','finance','production','workorder','quote','process','sample','prepress','tooling','hr','crm','common'];
const allExportNames = []; // for the re-export file

for (const domain of domainOrder) {
  const tbls = domains[domain];
  if (tbls.length === 0 && domain !== 'crm' && domain !== 'common') continue;

  const filePath = path.join(schemasDir, `${domain}.ts`);

  // Gather imports
  const importSet = new Set();
  let needsSql = false;
  tbls.forEach(t => {
    const re = /(?:mysqlTable|varchar|datetime|date|timestamp|decimal|int|bigint|tinyint|text|boolean|serial|index|uniqueIndex)\b/g;
    let m;
    while ((m = re.exec(t.text)) !== null) importSet.add(m[0]);
    if (t.text.includes('sql`')) needsSql = true;
  });
  const imports = [...importSet].sort().join(', ');
  const sqlLine = needsSql ? "import { sql } from 'drizzle-orm';\n" : '';

  // Table definitions
  const tableDefs = tbls.map(t => t.text).join('\n\n');

  // Type aliases for this domain
  const tableNames = new Set(tbls.map(t => t.name));
  const typeAliases = aliases
    .filter(a => tableNames.has(a.tableName))
    .map(a => `export type ${a.typeName} = typeof ${a.tableName}.$inferSelect;`)
    .join('\n');

  let fileContent = '';
  if (tbls.length > 0) {
    fileContent = `import { ${imports} } from 'drizzle-orm/mysql-core';\n${sqlLine}${tableDefs}`;
    if (typeAliases) fileContent += `\n\n${typeAliases}`;
  } else {
    // Empty domain (crm)
    fileContent = `// No tables in this domain yet\n`;
  }

  fs.writeFileSync(filePath, fileContent);
  tbls.forEach(t => allExportNames.push({ domain, name: t.name }));
  console.log(`Created ${filePath} (${tbls.length} tables)`);
}

// ── Build new schema.ts ───────────────────────────────────────────────────────
const schemaPath = 'src/lib/db/schema.ts';
let reexports = domainOrder
  .filter(d => domains[d].length > 0)
  .map(d => `export { ${domains[d].map(t => t.name).join(', ')} } from './schemas/${d}';`)
  .join('\n');

// Also re-export types
const typeReexports = [];
for (const domain of domainOrder) {
  if (domains[domain].length === 0) continue;
  const tableNames = new Set(domains[domain].map(t => t.name));
  const domainTypes = aliases.filter(a => tableNames.has(a.tableName));
  if (domainTypes.length > 0) {
    typeReexports.push(`export type { ${domainTypes.map(a => a.typeName).join(', ')} } from './schemas/${domain}';`);
  }
}

const newSchemaContent = `/**
 * Drizzle ORM Schema 映射
 *
 * 权威 schema 来源：database/vnerpdacahng_schema.sql（从目标数据库 SHOW CREATE TABLE 导出）
 * 本文件包含被 Drizzle ORM 构建器实际消费的表定义。
 * 新增 ORM 消费表时，从 SQL DDL 对应翻译并在对应 domain 文件中追加。
 *
 * 覆盖范围：95 张核心业务表
 * drizzle-kit 迁移路径已废弃（drizzle/ 目录已清理），ORM 查询构建器活跃使用中。
 *
 * 表定义按 domain 拆分在 src/lib/db/schemas/ 目录下，本文件负责统一 re-export。
 */

${reexports}

${typeReexports.join('\n')}
`;

fs.writeFileSync(schemaPath, newSchemaContent);
console.log(`\nCreated new ${schemaPath}`);
console.log('All files generated successfully!');

// Verify
const finalCount = Object.values(domains).reduce((s, a) => s + a.length, 0);
console.log(`Total tables: ${finalCount}`);
