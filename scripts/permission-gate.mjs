#!/usr/bin/env node
/**
 * @description API 权限登记静态卡点（fail-closed 守门人）。
 *
 * 规则：src/app/api 下每一个导出的 HTTP handler（GET/POST/PUT/PATCH/DELETE）
 * 都必须能解析出「该接口所需的权限码」，否则视为权限缺口。
 *
 * 豁免（视为已登记）：
 *   1. PUBLIC_ROUTES          —— 公开路由，本身不做权限校验（登录、公开品牌信息等）
 *   2. NO_PERMISSION_ROUTES   —— 需要登录态但不涉及业务数据的接口（刷新令牌、自身信息等）
 *
 * 同时校验：映射表里引用的 `API_PERMISSIONS.X` 必须真实存在于 permissions-catalog。
 *
 * 用法：
 *   node scripts/permission-gate.mjs          # 校验，存在缺口则 exit 1
 *   node scripts/permission-gate.mjs --json   # 输出机器可读结果
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const asJson = process.argv.includes('--json');

const readLines = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n').split('\n');
const braceDelta = (s) => {
  let d = 0;
  for (const ch of s) {
    if (ch === '{') d++;
    else if (ch === '}') d--;
  }
  return d;
};

/** 取出 `export const NAME = [ ... ];` 里的字符串字面量（按方括号配对截取整块） */
function extractStringArray(lines, name) {
  const start = lines.findIndex((l) => l.startsWith(`export const ${name}`));
  if (start < 0) throw new Error(`${name} not found`);
  const bracketDelta = (s) => {
    let d = 0;
    for (const ch of s) {
      if (ch === '[') d++;
      else if (ch === ']') d--;
    }
    return d;
  };
  let end = -1;
  let level = 0;
  for (let i = start; i < lines.length; i++) {
    const before = level;
    level += bracketDelta(lines[i]);
    if (before === 0 && level >= 1) {
      end = i;
      continue;
    }
    if (before > 0 && level === 0) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error(`${name} block not terminated`);
  const block = lines.slice(start, end + 1).join('\n');
  return Array.from(block.matchAll(/'([^']+)'/g)).map((m) => m[1]);
}

/** 取出 `export const ROUTE_PERMISSIONS... = { ... };` 对象，返回 Map<pattern, Map<method, code>> */
function extractPermissionMap(lines, name) {
  const start = lines.findIndex((l) => l.startsWith(`export const ${name}`));
  if (start < 0) throw new Error(`${name} not found`);
  let end = -1;
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    const before = depth;
    depth += braceDelta(lines[i]);
    if (before > 0 && depth === 0) {
      end = i;
      break;
    }
  }
  if (process.argv.includes('--debug')) console.error(`  [${name}] start=${start} end=${end}`);
  const map = new Map();
  const stack = [];
  let parseDepth = 0;
  for (let i = start; i <= end; i++) {
    const before = parseDepth;
    const after = parseDepth + braceDelta(lines[i]);
    const km = lines[i].match(/^ {2}'([^']+)': \{/);
    if (before === 1 && after >= 2 && km) stack.push(km[1]);
    else if (before === 1 && after === 1 && km && stack.length === 0) {
      const m = new Map();
      for (const mm of lines[i].matchAll(/(GET|POST|PUT|PATCH|DELETE)\s*:\s*(API_PERMISSIONS\.[A-Z0-9_]+)/g)) {
        m.set(mm[1], mm[2]);
      }
      map.set(km[1], m);
    } else if (before === 2 && after === 1 && stack.length) stack.pop();
    for (const k of stack) {
      for (const mm of lines[i].matchAll(/^ {4}(GET|POST|PUT|PATCH|DELETE)\s*:\s*(API_PERMISSIONS\.[A-Z0-9_]+)/gm)) {
        if (!(map.get(k) instanceof Map)) map.set(k, new Map());
        if (!map.get(k).has(mm[1])) map.get(k).set(mm[1], mm[2]);
      }
    }
    parseDepth = after;
  }
  return map;
}

const apiLines = readLines('src/lib/api-permissions.ts');
const extraLines = readLines('src/lib/route-permission-extra.ts');
const tableLines = readLines('src/lib/route-permissions-table.ts');
const publicLines = readLines('src/lib/route-permissions-public.ts');
const catSource = fs.readFileSync(path.join(root, 'src/lib/permissions-catalog.ts'), 'utf8');

const ROUTE_PERMISSIONS = extractPermissionMap(tableLines, 'ROUTE_PERMISSIONS');
const ROUTE_PERMISSIONS_EXTRA = extractPermissionMap(extraLines, 'ROUTE_PERMISSIONS_EXTRA');
const PUBLIC_ROUTES = extractStringArray(publicLines, 'PUBLIC_ROUTES');
const NO_PERMISSION_ROUTES = extractStringArray(extraLines, 'NO_PERMISSION_ROUTES');

// 逐方法合并（与 api-permissions.ts 的 ROUTE_PERMISSIONS_MERGED 保持一致）
const merged = new Map();
for (const [k, v] of ROUTE_PERMISSIONS) merged.set(k, new Map(v));
for (const [k, v] of ROUTE_PERMISSIONS_EXTRA) {
  const prev = merged.get(k) instanceof Map ? merged.get(k) : new Map();
  merged.set(k, new Map([...prev, ...v]));
}

if (process.argv.includes('--debug')) {
  console.error(
    `parsed: ROUTE_PERMISSIONS=${ROUTE_PERMISSIONS.size} EXTRA=${ROUTE_PERMISSIONS_EXTRA.size} merged=${merged.size} PUBLIC=${PUBLIC_ROUTES.length} NO_PERMISSION=${NO_PERMISSION_ROUTES.length}`
  );
  for (const [k, v] of merged) console.error(`  ${k} => ${JSON.stringify(Array.from(v instanceof Map ? v.keys() : []))}`);
}

// 权限码存在性
const catalogKeys = new Set(Array.from(catSource.matchAll(/^ {2}([A-Z][A-Z0-9_]*)\s*:\s*'/gm)).map((m) => m[1]));
const badCodes = [];
for (const [pattern, methods] of merged) {
  for (const [method, code] of methods) {
    const key = code.replace('API_PERMISSIONS.', '');
    if (!catalogKeys.has(key)) badCodes.push(`${method} ${pattern} -> API_PERMISSIONS.${key}`);
  }
}

// 扫描 handler
const HANDLER_RE = /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name === 'route.ts' || e.name === 'route.tsx') acc.push(p);
  }
  return acc;
}

const gaps = [];
let total = 0;
let covered = 0;
for (const file of walk(path.join(root, 'src/app/api'))) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const prefix = '/api/' + rel.replace(/^src\/app\/api\//, '').replace(/\/route\.tsx?$/, '');
  const src = fs.readFileSync(file, 'utf8');
  const methods = new Set();
  for (const m of src.matchAll(HANDLER_RE)) methods.add(m[1]);
  for (const method of methods) {
    total++;
    if (PUBLIC_ROUTES.some((p) => prefix.startsWith(p)) || NO_PERMISSION_ROUTES.some((p) => prefix.startsWith(p))) {
      covered++;
      continue;
    }
    let matched;
    for (const pattern of merged.keys()) if (prefix.startsWith(pattern) && (!matched || pattern.length > matched.length)) matched = pattern;
    const methods_ = matched ? merged.get(matched) : null;
    if (matched && methods_ instanceof Map && methods_.get(method)) covered++;
    else gaps.push({ method, prefix, matched, file: rel });
  }
}

if (asJson) {
  console.log(JSON.stringify({ total, covered, gaps, badCodes }, null, 2));
} else {
  console.log('API permission gate');
  console.log('  handlers scanned = ' + total);
  console.log('  permission configured = ' + covered);
  console.log('  gaps = ' + gaps.length);
  console.log('  invalid permission codes = ' + badCodes.length);
  if (gaps.length) {
    console.log('\n--- gaps ---');
    for (const g of gaps) {
      console.log(`  ${g.method} ${g.prefix}${g.matched ? '  (matched: ' + g.matched + ')' : '  (no matching prefix)'}`);
      console.log(`      ${g.file}`);
    }
  }
  if (badCodes.length) {
    console.log('\n--- invalid permission codes ---');
    for (const b of badCodes) console.log('  ' + b);
  }
}

process.exit(gaps.length || badCodes.length ? 1 : 0);
