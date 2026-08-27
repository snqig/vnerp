// T7 注入器：把 t7_missing_fks.json 中的缺失跨域/自引用 FK 实写为 Drizzle foreignKey()
// 幂等：若约束名已存在于文件中则跳过。不改数据库，仅改 schema TS。
const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = path.resolve(__dirname, '..', '..', 'src', 'lib', 'db', 'schemas');
const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 't7_missing_fks.json'), 'utf8'));

const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
function onClause(rule, method) {
  if (rule === 'CASCADE') return `.${method}('cascade')`;
  if (rule === 'SET NULL') return `.${method}('set null')`;
  if (rule === 'RESTRICT') return `.${method}('restrict')`;
  return ''; // NO ACTION 为默认，省略
}

// ── 全局注册表 ──
const reg = { tableNameToExport: {}, exportNameToFile: {} };
const files = fs.readdirSync(SCHEMAS_DIR).filter(f => f.endsWith('.ts'));
for (const f of files) {
  const file = f.replace(/\.ts$/, '');
  const src = fs.readFileSync(path.join(SCHEMAS_DIR, f), 'utf8');
  const re = /export\s+const\s+(\w+)\s*=\s*mysqlTable\(\s*'([\w]+)'/g;
  let m;
  while ((m = re.exec(src))) { reg.tableNameToExport[m[2]] = m[1]; reg.exportNameToFile[m[1]] = './' + file; }
}

// 按 childTable 分组
const byTable = {};
for (const fk of missing) (byTable[fk.childTable] = byTable[fk.childTable] || []).push(fk);

function locateTable(src, childTable) {
  const exportName = reg.tableNameToExport[childTable];
  if (!exportName) throw new Error('无法定位导出名: ' + childTable);
  const startRe = new RegExp('export\\s+const\\s+' + exportName + '\\s*=\\s*mysqlTable\\(');
  const sm = startRe.exec(src);
  if (!sm) throw new Error('未找到表定义: ' + childTable);
  const startIdx = sm.index;
  // 找 mysqlTable( 的 '(' 位置
  const openParen = src.indexOf('(', sm.index);
  // 平衡括号扫描（忽略字符串/反引号内的括号）
  let depth = 0, i = openParen, inStr = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (c === inStr && src[i - 1] !== '\\') inStr = null; continue; }
    if (c === "'" || c === '`') { inStr = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) break; }
  }
  const closeParenIdx = i; // mysqlTable 的闭合 ')'
  const tableText = src.slice(startIdx, closeParenIdx); // 不含结尾 ')'
  // 用箭头函数 (param) => ( 检测是否存在 extra block（格式无关，兼容 `},`/`},\n ` 与 `({` 写法）
  const arrowRe = /\(([a-zA-Z]+)\)\s*=>\s*\(\s*\{/;
  const am = arrowRe.exec(tableText);
  let param, hasExtra;
  if (am) { param = am[1]; hasExtra = true; }
  else { param = src.includes('(table) => (') ? 'table' : 't'; hasExtra = false; }
  return { startIdx, closeParenIdx, tableText, param, hasExtra };
}

function getTableParam(src, childTable) {
  return locateTable(src, childTable).param;
}

function injectIntoTable(src, childTable, fkLines) {
  const { startIdx, closeParenIdx, tableText, param, hasExtra } = locateTable(src, childTable);
  let newTableText;
  if (hasExtra) {
    const lastClose = tableText.lastIndexOf('})');
    const before = tableText.slice(0, lastClose);
    const after = tableText.slice(lastClose);
    newTableText = before + '\n' + fkLines.map(l => '  ' + l).join('\n') + '\n' + after;
  } else {
    // tableText 已以列对象 '}' 结尾，仅追加 ", (param) => ({ ... })"
    newTableText = tableText + '\n, (' + param + ') => ({\n' + fkLines.map(l => '  ' + l).join('\n') + '\n})';
  }
  return src.slice(0, startIdx) + newTableText + ')' + src.slice(closeParenIdx + 1);
}

let totalInjected = 0, totalSkipped = 0;
const changedFiles = new Set();

// 确保文件已 import foreignKey（手写文件可能缺少）
function ensureForeignKeyImport(src) {
  if (!src.includes('foreignKey(')) return src;
  const re = /import\s*\{([^}]*)\}\s*from\s*'drizzle-orm\/mysql-core'/;
  const m = re.exec(src);
  if (!m) {
    return "import { foreignKey } from 'drizzle-orm/mysql-core';\n" + src;
  }
  if (/\bforeignKey\b/.test(m[1])) return src;
  const trimmed = m[1].trim().replace(/,\s*$/, '');
  const newImports = trimmed + (trimmed ? ', ' : '') + 'foreignKey';
  return src.replace(re, `import { ${newImports} } from 'drizzle-orm/mysql-core'`);
}

for (const [childTable, fks] of Object.entries(byTable)) {
  const exportName = reg.tableNameToExport[childTable];
  const childFile = reg.exportNameToFile[exportName];
  const filePath = path.join(SCHEMAS_DIR, childFile.replace('./', '') + '.ts');
  let src = fs.readFileSync(filePath, 'utf8');

  // 已存在于文件的约束名
  const existingNames = new Set([...src.matchAll(/foreignKey\(\{\s*name:\s*'([^']+)'/g)].map(x => x[1]));

  const fkLines = [];
  const neededImports = new Set();
  const param = getTableParam(src, childTable);
  for (const fk of fks) {
    if (existingNames.has(fk.cname)) { totalSkipped++; continue; }
    const parentExport = reg.tableNameToExport[fk.parentTable];
    if (!parentExport) { console.warn(`  ⚠ 父表未建模，跳过 ${fk.cname}: ${fk.parentTable}`); continue; }
    if (parentExport !== exportName && reg.exportNameToFile[parentExport] !== childFile) neededImports.add(parentExport); // 仅跨文件且不同文件才需 import（自引用/同文件不需）
    const fkProp = `fk_${camel(fk.parentTable)}_${camel(fk.childCols[0])}`;
    const childRef = `${param}.${camel(fk.childCols[0])}`;
    const line = `${fkProp}: foreignKey({ name: '${fk.cname}', columns: [${childRef}], foreignColumns: [${parentExport}.${camel(fk.parentCols[0])}] })${onClause(fk.onDel, 'onDelete')}${onClause(fk.onUpd, 'onUpdate')},`;
    fkLines.push(line);
  }

  if (fkLines.length === 0) continue;

  src = injectIntoTable(src, childTable, fkLines);
  src = ensureForeignKeyImport(src);
  totalInjected += fkLines.length;
  changedFiles.add(filePath);

  // 补 import
  for (const pe of neededImports) {
    const impRe = new RegExp("import\\s*\\{\\s*[^}]*\\b" + pe + "\\b");
    if (impRe.test(src)) continue;
    const parentFile = reg.exportNameToFile[pe];
    const impLine = `import { ${pe} } from '${parentFile}';`;
    // 插在最后一个 import 行之后
    const lastImp = src.lastIndexOf('import ');
    const nl = src.indexOf('\n', lastImp);
    src = src.slice(0, nl + 1) + impLine + '\n' + src.slice(nl + 1);
  }

  fs.writeFileSync(filePath, src, 'utf8');
  console.log(`✓ ${childTable} (${childFile}) +${fkLines.length} FK`);
}

console.log(`\n注入完成：新增 ${totalInjected} 条，跳过(已存在) ${totalSkipped}，改动文件 ${changedFiles.size}`);
