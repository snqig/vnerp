#!/usr/bin/env node
/**
 * 权限码「词汇表一致性」门槛
 * ---------------------------------------------------------------------------
 * 背景：系统里曾并存三套长得像、作用不同的权限码词汇表：
 *
 *   1. `src/lib/permissions-catalog.ts` 的 `API_PERMISSIONS`  —— 网关真正校验的精确码
 *   2. 同文件的 `PERMISSION_MODULES`                          —— 角色页勾选用的分组
 *   3. `sys_menu.permission`（库里的通配码 `模块:页面:*`）     —— 授权链路的主词汇
 *
 * 三者一旦不同步就会出现「界面上看不到某个权限」「勾了却不生效」「新增的 i18n 键没人用」
 * 这类难查的问题。本脚本在**提交前/CI** 卡住这些不一致。
 *
 * 解析采用“括号配对扫描”而非行正则：PERMISSION_MODULES 里不同模块的书写风格并不统一
 * （`audit` 模块把 permissions 写成了单行），行正则会漏匹配并让非贪婪回溯吞掉下一个模块。
 *
 * 用法：
 *   node scripts/validate-permissions.mjs
 * 退出码：0 = 通过；1 = 发现不一致；2 = 环境/解析异常（与 validate-api-sql.mjs 口径一致）。
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
// PERM_CATALOG 可覆盖 catalog 路径，便于拿副本做「故意改坏」的负向自测。
const CATALOG = process.env.PERM_CATALOG
  ? path.resolve(ROOT, process.env.PERM_CATALOG)
  : path.join(ROOT, 'src/lib/permissions-catalog.ts');
const LOCALES = ['zh-CN', 'zh-TW', 'en', 'vi'];

const problems = [];
const fail = (msg) => problems.push(msg);

// ---------------------------------------------------------------- 极简 TS 字面量解析
/**
 * 解析 `{ ... }` 内的顶层字段。
 *
 * 字段值可能是嵌套的 `{}` / `[]`（例如 permissions 数组），扫描时按括号深度跳过它们，
 * 只在 `depth === 1` 处切分。
 *
 * @param block  完整源码
 * @param pos    `{` 的下标
 * @returns `[{ key, start, end }]`（下标相对 block）
 */
function splitTopLevelFields(block, pos) {
  const out = [];
  let depth = 0;
  let segStart = pos + 1; // 当前字段区的起点
  let key = null;
  let valueStart = -1;

  const commit = (end) => {
    if (key !== null) out.push({ key, start: valueStart, end });
    key = null;
    valueStart = -1;
  };

  for (let i = pos; i < block.length; i += 1) {
    const ch = block[i];

    if (ch === '{' || ch === '[') {
      depth += 1;
      if (depth === 1) {
        segStart = i + 1;
        key = null; // 进入匿名对象，字段名不成立
      }
      continue;
    }
    if (ch === '}') {
      // depth === 1 的 `}` 只可能属于最外层，即字段区结束
      if (depth <= 1) {
        commit(i);
        return out;
      }
      depth -= 1;
      continue;
    }
    if (ch === ']') {
      if (depth === 1) {
        segStart = i + 1;
        continue;
      }
      depth -= 1;
      continue;
    }
    if (depth !== 1) continue;

    if (ch === ':') {
      // 字段名可能是裸标识符（`id`）或带引号的（`'id'`）；`before` 截断到冒号之前，
      // 所以这里要求的是「行首 + 缩进 + key + 行尾」，而不是匹配到冒号。
      // 必须锚在行首：两个字段之间可能夹着注释行（如 `A: 'x',` / `// 人力资源` / `B: 'y',`），
      // 只按 segStart 取会连带注释文本。
      const before = block.slice(segStart, i);
      const m = /(?:^|\n)[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[ \t]*$/.exec(before);
      if (m) {
        key = m[2];
        valueStart = i + 1;
      }
      continue;
    }
    if (ch === ',') {
      commit(i);
      segStart = i + 1;
    }
  }
  commit(block.length); // 未闭合（不该发生）
  return out;
}

/** 取对象字面量里某个字段的值片段（含 `{}[]`），找不到返回 null */
function fieldValue(block, pos, key) {
  const hit = splitTopLevelFields(block, pos).find((f) => f.key === key);
  return hit ? block.slice(hit.start, hit.end).trim() : null;
}

/** 找与 `openPos` 处的开括号配对的闭括号下标 */
function matchingClose(block, openPos) {
  let depth = 0;
  for (let i = openPos; i < block.length; i += 1) {
    const ch = block[i];
    if (ch === '[' || ch === '{') depth += 1;
    else if (ch === ']' || ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return block.length; // 未闭合
}

/**
 * 在 `[from, to)` 区间内找出所有「顶层」`{` 的下标。
 *
 * `[` / `]` 与 `{` / `}` 同层计数——这样在 `PERMISSION_MODULES = [ {...} ]` 里，
 * 模块对象的 `{` 才是 depth 1，而 permissions 数组内的权限项 `{` 是 depth 2（会被排除）。
 * 区间上界必须显式给：permissions 数组的 `]` 会让 depth 归零，靠 break 会漏掉后续模块。
 */
function allBracePositions(block, from = 0, to = block.length) {
  const out = [];
  let depth = 0;
  for (let i = from; i < to && i < block.length; i += 1) {
    const ch = block[i];
    if (ch === '{') {
      depth += 1;
      if (depth === 1) out.push(i);
    } else if (ch === '[') {
      depth += 1;
    } else if (ch === ']' || ch === '}') {
      depth -= 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------- 解析 catalog
const src = fs.readFileSync(CATALOG, 'utf8');

if (!src.includes('export const API_PERMISSIONS')) {
  console.error('✗ 未能在 permissions-catalog.ts 中找到 API_PERMISSIONS');
  process.exit(2);
}
if (!src.includes('export const PERMISSION_MODULES')) {
  console.error('✗ 未能在 permissions-catalog.ts 中找到 PERMISSION_MODULES');
  process.exit(2);
}

const apiDeclPos = src.indexOf('export const API_PERMISSIONS');
const modDeclPos = src.indexOf('export const PERMISSION_MODULES');
const apiBlock = src.slice(apiDeclPos, modDeclPos);
const modBlock = src.slice(modDeclPos);

/** 裁掉字符串字面量的前后空格与引号（字段值片段含前导空白，必须先 trim 再去引号） */
const unquote = (s) => s.trim().replace(/^['"]|['"]$/g, '');

/** API_PERMISSIONS 里的 `KEY: 'code'` */
const keyToCode = {};
const apiObjPos = apiBlock.indexOf('{'); // `= {` 处的对象（下标相对 apiBlock）
if (apiObjPos === -1) {
  fail('无法解析 API_PERMISSIONS 的对象字面量');
} else {
  for (const f of splitTopLevelFields(apiBlock, apiObjPos)) {
    if (!f.key) continue;
    if (f.key in keyToCode) fail(`API_PERMISSIONS 的常量名重复：${f.key}`);
    keyToCode[f.key] = unquote(apiBlock.slice(f.start, f.end));
  }
}

/** PERMISSION_MODULES 数组内每个模块对象（只取 `[` 之后的对象，避开类型声明） */
// 锚在 `=` 之后：声明形如 `export const PERMISSION_MODULES: PermissionModule[] = [ ... ]`，
// 第一个 `[` 属于类型注解里的空方括号，直接取会定位错。
const arrOpen = modBlock.indexOf('[', modBlock.indexOf('='));
if (arrOpen === -1) {
  fail('无法定位 PERMISSION_MODULES 的数组');
}
// 只取数组区间内的对象；区间上界用配对闭括号，别扫到文件末尾的其他声明
const modObjects =
  arrOpen === -1 ? [] : allBracePositions(modBlock, arrOpen + 1, matchingClose(modBlock, arrOpen));

/** PERMISSION_MODULES 里的模块及它引用的权限点（权限项一律写 `API_PERMISSIONS.KEY` 常量引用） */
const modules = [];
for (const absPos of modObjects) {
  const id = fieldValue(modBlock, absPos, 'id');
  // 只有 id 写成字符串字面量的才是模块对象；TS 类型声明（`id: string`）和权限项
  // （`id: API_PERMISSIONS.X`）都不是。
  if (id === null || !/^['"]/.test(id)) continue;
  const modId = unquote(id);
  const name = fieldValue(modBlock, absPos, 'name');
  const permsField = fieldValue(modBlock, absPos, 'permissions');

  if (permsField === null) {
    fail(`PERMISSION_MODULES 的模块 ${modId} 缺少 permissions 字段`);
    continue;
  }
  // from=1：跳过数组的开括号
  const ids = allBracePositions(permsField, 1)
    .map((p) => fieldValue(permsField, p, 'id'))
    .filter((pid) => pid !== null)
    .map((pid) => {
      if (!pid.startsWith('API_PERMISSIONS.')) {
        fail(
          `PERMISSION_MODULES 的模块 ${modId} 里有写死字符串（${pid}）：权限项必须写成 ` +
            '`API_PERMISSIONS.XXX` 常量引用，否则改码值时角色页不会跟着变。'
        );
        return null;
      }
      const key = pid.slice('API_PERMISSIONS.'.length);
      if (!(key in keyToCode)) {
        fail(`PERMISSION_MODULES 引用了 API_PERMISSIONS 里不存在的常量：${key}`);
        return null;
      }
      return keyToCode[key];
    })
    .filter((code) => code !== null);
  modules.push({ id: modId, name, ids });
}

const apiCodes = Object.values(keyToCode);
const apiSet = new Set(apiCodes);
const moduleIds = modules.map((m) => m.id);
const referenced = new Set(modules.flatMap((m) => m.ids));

// 1) 重复与孤儿
if (apiSet.size !== apiCodes.length) {
  fail(`API_PERMISSIONS 存在重复的权限码（共 ${apiCodes.length} 条 / 去重 ${apiSet.size} 条）`);
}

for (const code of apiCodes) {
  if (!referenced.has(code)) {
    fail(`孤儿权限码：${code} 未被 PERMISSION_MODULES 任何模块引用 → 角色页无法勾选。`);
  }
}
for (const code of referenced) {
  if (!apiSet.has(code)) fail(`PERMISSION_MODULES 引用了 API_PERMISSIONS 中不存在的码：${code}`);
}

// 2) 模块 id 重复
if (new Set(moduleIds).size !== moduleIds.length) {
  const dup = moduleIds.filter((id, i) => moduleIds.indexOf(id) !== i);
  fail(`PERMISSION_MODULES 存在重复的模块 id：${[...new Set(dup)].join('、')}`);
}

// 3) i18n 与 catalog 对齐
const localeData = {};
for (const locale of LOCALES) {
  const file = path.join(ROOT, `messages/${locale}.json`);
  if (!fs.existsSync(file)) {
    fail(`缺少语言包：messages/${locale}.json`);
    continue;
  }
  try {
    localeData[locale] = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`messages/${locale}.json 解析失败：${e.message}`);
  }
}

const permKeysByLocale = {};
for (const [locale, data] of Object.entries(localeData)) {
  permKeysByLocale[locale] = new Set(Object.keys(data.perm ?? {}));
}

// 3a) 每个权限码都要有四语文案
for (const code of apiCodes) {
  const key = code.replace(/[:_-]/g, '_');
  for (const locale of LOCALES) {
    const set = permKeysByLocale[locale];
    if (!set) continue;
    if (!set.has(key)) fail(`messages/${locale}.json 缺少 perm.${key}（权限码 ${code} 的文案键）`);
  }
}

// 3b) 四语之间 perm.* 键集合一致
const reference = permKeysByLocale[LOCALES[0]];
if (reference) {
  for (const locale of LOCALES.slice(1)) {
    const set = permKeysByLocale[locale];
    if (!set) continue;
    for (const k of reference) if (!set.has(k)) fail(`messages/${locale}.json 缺少 perm.${k}`);
    for (const k of set) if (!reference.has(k)) fail(`messages/${LOCALES[0]}.json 缺少 perm.${k}`);
  }
}

// 3c) permModule.* 与模块 id 一一对应
for (const locale of LOCALES) {
  const data = localeData[locale];
  if (!data) continue;
  const modKeys = new Set(Object.keys(data.permModule ?? {}));
  for (const id of moduleIds) {
    if (!modKeys.has(id)) fail(`messages/${locale}.json 缺少 permModule.${id}`);
  }
  for (const k of modKeys) {
    if (!moduleIds.includes(k)) fail(`messages/${locale}.json 多余的 permModule.${k}（catalog 里没有该模块）`);
  }
}

// 3d) 模块要有 name（角色页直接用来渲染分组标题）
for (const m of modules) {
  if (!m.name) fail(`PERMISSION_MODULES 的模块 ${m.id} 缺少 name 字段`);
}

// ---------------------------------------------------------------- 输出
console.log('权限码词汇表一致性检查');
console.log(`  API_PERMISSIONS      : ${apiCodes.length} 条`);
console.log(`  PERMISSION_MODULES   : ${modules.length} 个模块 / ${referenced.size} 个权限点`);
console.log(
  `  语言包               : ${LOCALES.join(' / ')}（各 ${
    Object.values(permKeysByLocale).reduce((n, s) => n + (s?.size ?? 0), 0) / LOCALES.length
  } 条 perm.*）`
);

if (problems.length > 0) {
  console.error(`\n✗ 发现 ${problems.length} 处不一致：`);
  for (const p of problems) console.error(`   - ${p}`);
  console.error(
    '\n新增权限码的正确顺序：① API_PERMISSIONS 加常量 ② PERMISSION_MODULES 里引用 ③ 四语 messages 补 perm.<code>'
  );
  process.exit(1);
}

console.log('\n✓ 权限码词汇表一致，未发现孤儿码 / 缺失文案 / 多余键');
