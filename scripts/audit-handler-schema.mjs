import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
});

async function getTables(conn) {
  const [rows] = await conn.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'vnerpdacahng' ORDER BY TABLE_NAME"
  );
  return new Set(rows.map((r) => r.TABLE_NAME.toLowerCase()));
}

async function getColumns(conn, table) {
  const [rows] = await conn.execute(
    "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'vnerpdacahng' AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
    [table]
  );
  return rows.map((r) => ({ name: r.COLUMN_NAME.toLowerCase(), type: r.DATA_TYPE }));
}

// Extract table.column references from SQL in handler files
function extractSqlRefs(content) {
  const refs = [];
  // Match: INSERT INTO table, UPDATE table, FROM table, JOIN table, DELETE FROM table
  const tableRegex = /(?:INSERT\s+INTO|UPDATE|FROM|JOIN|DELETE\s+FROM)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi;
  let m;
  const tables = new Set();
  while ((m = tableRegex.exec(content)) !== null) {
    tables.add(m[1].toLowerCase());
  }
  // Match column lists in INSERT INTO table (col1, col2, ...)
  const insertRegex = /INSERT\s+INTO\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s*\(([^)]+)\)/gi;
  while ((m = insertRegex.exec(content)) !== null) {
    const table = m[1].toLowerCase();
    const cols = m[2].split(',').map((c) => c.trim().replace(/`/g, '').toLowerCase());
    refs.push({ table, columns: cols, line: getLineNum(content, m.index) });
  }
  // Match SET col = ... in UPDATE
  const setRegex = /UPDATE\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+SET\s+([^W]+?)(?:\s+WHERE)/gi;
  while ((m = setRegex.exec(content)) !== null) {
    const table = m[1].toLowerCase();
    const cols = m[2].split(',').map((c) => c.trim().replace(/`/g, '').split(/\s*=/)[0].trim().toLowerCase()).filter(Boolean);
    refs.push({ table, columns: cols, line: getLineNum(content, m.index) });
  }
  return { tables, refs };
}

function getLineNum(content, index) {
  return content.substring(0, index).split('\n').length;
}

async function main() {
  const conn = await pool.getConnection();
  try {
    const dbTables = await getTables(conn);
    const handlersDir = path.resolve('src/application/handlers');
    const files = fs.readdirSync(handlersDir).filter((f) => f.endsWith('.ts'));

    console.log('=== Event Handler Schema Audit ===\n');
    console.log(`DB has ${dbTables.size} tables. Scanning ${files.length} handlers.\n`);

    const tableColCache = new Map();
    async function getCols(table) {
      if (tableColCache.has(table)) return tableColCache.get(table);
      if (!dbTables.has(table)) {
        tableColCache.set(table, null);
        return null;
      }
      const cols = await getColumns(conn, table);
      const set = new Map();
      for (const c of cols) set.set(c.name, c.type);
      tableColCache.set(table, set);
      return set;
    }

    let totalIssues = 0;
    for (const file of files) {
      const content = fs.readFileSync(path.join(handlersDir, file), 'utf8');
      if (!content.match(/INSERT|UPDATE|SELECT|DELETE/i)) continue;
      const { tables, refs } = extractSqlRefs(content);

      const issues = [];
      // Check table existence
      for (const t of tables) {
        if (!dbTables.has(t)) {
          issues.push(`❌ Table does not exist: ${t}`);
        }
      }
      // Check column existence for INSERT/UPDATE refs
      for (const ref of refs) {
        const cols = await getCols(ref.table);
        if (!cols) continue; // already flagged table missing
        for (const col of ref.columns) {
          if (!cols.has(col) && !col.match(/^\?$/) && col !== 'now()') {
            issues.push(`❌ ${ref.table} has no column "${col}" (line ${ref.line})`);
          }
        }
      }

      if (issues.length > 0) {
        console.log(`📄 ${file}:`);
        for (const i of issues) console.log(`   ${i}`);
        console.log('');
        totalIssues += issues.length;
      }
    }

    console.log(`\n=== Total issues found: ${totalIssues} ===`);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
