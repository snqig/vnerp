// 接线脚本（修正版）：仅接线 gen_misc 新生成的域，排除已手工接线的 _gen_sys/_gen_pur/_gen_sal/_gen_fin。
// 幂等：若 schema.ts 已含 AUTO-WIRED-MISC 块，先整块移除再重插。
const fs = require('fs');
const path = require('path');
const SCHEMAS_DIR = path.resolve(__dirname, '..', '..', 'src', 'lib', 'db', 'schemas');
const SCHEMA_TS = path.resolve(__dirname, '..', '..', 'src', 'lib', 'db', 'schema.ts');

// 已手工接线的文件（不重复接线）
const EXCLUDE = new Set(['_gen_warehouse_missing.ts', '_gen_sys.ts', '_gen_pur.ts', '_gen_sal.ts', '_gen_fin.ts']);

const files = fs.readdirSync(SCHEMAS_DIR)
  .filter(f => /^_gen_.*\.ts$/.test(f) && !EXCLUDE.has(f))
  .sort();
const blocks = [];
for (const f of files) {
  const dom = f.replace(/^_gen_/, '').replace(/\.ts$/, '');
  const src = fs.readFileSync(path.join(SCHEMAS_DIR, f), 'utf8');
  const names = [...src.matchAll(/export\s+const\s+(\w+)\s*=/g)].map(m => m[1]);
  if (names.length === 0) continue;
  blocks.push(`// ${dom}_ 域补全（由 scripts/_audit/gen_misc.cjs 生成）\nexport {\n  ${names.join(',\n  ')},\n} from './schemas/${f.replace(/\.ts$/, '')}';`);
}
const blockText = '\n' + blocks.join('\n') + '\n';

let schema = fs.readFileSync(SCHEMA_TS, 'utf8');
// 幂等：移除旧 AUTO-WIRED-MISC 块
const startMarker = '// AUTO-WIRED-MISC 起点（批处理生成域）';
const endMarker = '// AUTO-WIRED-MISC 终点';
const sIdx = schema.indexOf(startMarker);
const eIdx = schema.indexOf(endMarker);
if (sIdx >= 0 && eIdx >= 0) {
  schema = schema.slice(0, sIdx) + schema.slice(eIdx + endMarker.length);
  console.log('已移除旧 AUTO-WIRED-MISC 块');
}

const anchor = `} from './schemas/_gen_fin';`;
const idx = schema.indexOf(anchor);
if (idx < 0) { console.error('未找到 _gen_fin 锚点'); process.exit(1); }
const insertAt = idx + anchor.length;
schema = schema.slice(0, insertAt) + '\n\n// AUTO-WIRED-MISC 起点（批处理生成域）' + blockText + '// AUTO-WIRED-MISC 终点' + schema.slice(insertAt);
fs.writeFileSync(SCHEMA_TS, schema, 'utf8');
console.log(`已接线 ${files.length} 个 _gen 文件，导出块数 ${blocks.length}`);
