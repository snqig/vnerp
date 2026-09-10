#!/usr/bin/env node
/**
 * codemod 一致性校验器 (verify-codemod-consistency)
 *
 * 用途（P0-2 防护）：i18n-codemod-p2.cjs 对单个文件做「两次独立写」——
 *   ① 改写 .tsx（中文 → ts('k_xxx')）；
 *   ② 把 k_xxx: '中文' 写入全部 4 个 locale 文件（messages/{zh-CN,en,vi,zh-TW}.json）。
 * 两步「非原子、非共校验」。若 messages 被回退而 .tsx 保留，调用点会引用 messages 中
 * 不存在的键 → 中文丢失（zh-CN 作为 fallback 基被回退时全语言裸 key）。
 *
 * 本脚本扫描 src 下所有 t()/tc()/ts('key') 调用，扁平化 messages/zh-CN.json，
 * 断言「每个被代码引用的键都存在于 zh-CN」；缺失即视为 messages 被回退的信号 → 退出码 1。
 *
 * 复用 i18n-key-check.mjs 的扫描逻辑（此处直接复制正则与辅助函数，
 * 不 import 主脚本，避免其副作用 / 额外输出 / 依赖 argv 解析）。
 * ⚠ 两处扫描块必须逐字同步修改，否则门禁与报表口径会漂移。
 *
 * 用法：node scripts/verify-codemod-consistency.mjs [messagesPath]
 *   messagesPath  可选，默认 messages/zh-CN.json；破坏性自检时可传临时副本路径。
 *
 * 退出码：0 = 一致（代码引用的键均存在于 zh-CN）；1 = 存在缺失（疑似 messages 被回退）；2 = 脚本异常。
 * 纯扫描 + 断言，不写任何文件。
 *
 * ── 扫描器修订说明 ──
 * 原 BINDING_RE 要求 `=` 后紧跟 useTranslations/getTranslations，导致服务端主流写法
 * `const ts = await getTranslations('Common')`（391 个文件）与对象形态
 * `await getTranslations({ locale, namespace: 'Common' })`（3 个文件）整体漏扫——
 * 这些文件里所有 t('k_xxx') 调用都未纳入门禁断言，等于 P0-2 防护对后端/服务层完全失效。
 * 本次拆成 BINDING_STR_RE / BINDING_OBJ_RE 并容忍可选 `await`，把门禁覆盖面
 * 从 239 个文件扩到 633 个文件（断言的引用键 9490 → 13861）。
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const MESSAGES_PATH = process.argv[2] || join(projectRoot, 'messages', 'zh-CN.json');
const SRC_DIR = join(projectRoot, 'src');

// ============================================================================
// 共享扫描逻辑（与 i18n-key-check.mjs 保持逐字一致）
// ============================================================================

// ---------- 绑定形态 ----------
// ① const t = useTranslations('Ns')            ② const t = await getTranslations('Ns')
// ③ const t = getTranslations('Ns')            （await 可选，这是原正则最大的漏判点）
const BINDING_STR_RE =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:use|get)Translations\s*\(\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]\s*\)/g;
// ④ const t = await getTranslations({ locale, namespace: 'Ns' })  （对象形态，键顺序任意）
const BINDING_OBJ_RE =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:use|get)Translations\s*\(\s*\{[^{}]*?\bnamespace\s*:\s*['"]([A-Za-z][A-Za-z0-9_]*)['"][^{}]*?\}\s*\)/g;

// ---------- 调用形态 ----------
// 静态键：alias('key') / alias("key") / alias(`key`)
const CALL_RE = /([A-Za-z_$][\w$]*)\(\s*['"`]([^'"`]+)['"`]\s*(?:,[^)]*)?\)/g;
// 动态键 ①模板字面量：alias(`前缀${expr}后缀`)
const DYN_TPL_RE = /([A-Za-z_$][\w$]*)\(\s*`([^`]*\$\{[^`]*)`/g;
// 动态键 ②字符串拼接：alias('前缀' + expr)
const DYN_CONCAT_RE = /([A-Za-z_$][\w$]*)\(\s*(['"])([^'"]*)\2\s*\+/g;

// 扁平化对象为点键集合（不含命名空间前缀，与调用点相对键一致）
function flatten(obj, prefix, out = new Set()) {
  if (obj === null || typeof obj !== 'object') { if (prefix) out.add(prefix); return out; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : `${i}`, out)); return out; }
  for (const k of Object.keys(obj)) flatten(obj[k], prefix ? `${prefix}.${k}` : k, out);
  return out;
}

/** 正则元字符转义 */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 把动态键模板还原成键匹配正则。
 * `${...}` 占位替换为 [^.]*（不跨点段，避免 `a.${x}` 误吞 `a.b.c`）。
 * 返回 null 表示无法安全还原（嵌套模板 / 纯动态无前缀）。
 */
function templateToKeyRegex(tpl) {
  if (!tpl.includes('${')) return null;
  const parts = tpl.split(/\$\{[^{}]*\}/);
  if (parts.some(p => p.includes('${') || p.includes('}'))) return null;
  if (!parts[0]) return null; // 无静态前缀 → 会退化成全表通配，拒绝
  return new RegExp('^' + parts.map(escapeRe).join('[^.]*') + '$');
}

/** 动态族前缀必须像键（足够长且限定字符），避免 t('' + x) 之类保护全表 */
function isUsablePrefix(prefix) {
  return typeof prefix === 'string' && prefix.length >= 2 && /^[A-Za-z_][A-Za-z0-9_.]*$/.test(prefix);
}

// ---------- 解析单个文件 ----------
function analyzeFile(absPath, relPath) {
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }

  // 1. 别名 -> 命名空间候选列表（同名别名多次绑定时全部保留，不再「后者覆盖」）
  const aliasNs = {};
  const addBinding = (alias, ns) => {
    const list = (aliasNs[alias] ||= []);
    if (!list.includes(ns)) list.push(ns);
  };
  for (const re of [BINDING_STR_RE, BINDING_OBJ_RE]) {
    re.lastIndex = 0;
    let bm;
    while ((bm = re.exec(content)) !== null) addBinding(bm[1], bm[2]);
  }

  const aliasNames = Object.keys(aliasNs);
  if (aliasNames.length === 0) {
    return { relPath, aliasNs, usedByAlias: [], dynFamilies: [], unresolvableDyn: [], hasBinding: false };
  }
  const aliasRe = new RegExp(`^(?:${aliasNames.map(a => escapeRe(a)).join('|')})$`);

  // 2. 静态调用（按 alias+key 在文件内去重，保持与原实现一致的「引用 key 数」口径）
  const usedByAlias = [];
  const seenCall = new Set();
  const dynFamilies = [];
  const unresolvableDyn = [];

  CALL_RE.lastIndex = 0;
  let cm;
  while ((cm = CALL_RE.exec(content)) !== null) {
    const alias = cm[1];
    if (!aliasRe.test(alias)) continue; // 不是翻译别名（如 toLocaleString / console.log）
    const key = cm[2];
    // 含插值 / 引号的键交给动态族识别处理（动态键无法静态断言，不纳入缺失判定）
    if (key.includes('${') || /[+]|['"`]/.test(key)) continue;
    const sig = `${alias}\u0000${key}`;
    if (seenCall.has(sig)) continue;
    seenCall.add(sig);
    usedByAlias.push({ alias, key });
  }

  // 3. 动态族：模板字面量 alias(`前缀${x}后缀`)
  DYN_TPL_RE.lastIndex = 0;
  let tm;
  while ((tm = DYN_TPL_RE.exec(content)) !== null) {
    const alias = tm[1];
    if (!aliasRe.test(alias)) continue;
    const raw = tm[2];
    const prefix = raw.split('${')[0];
    const regex = templateToKeyRegex(raw);
    if (!regex || !isUsablePrefix(prefix)) {
      unresolvableDyn.push({ alias, raw, reason: regex ? 'prefix-too-weak' : 'unparsable-template' });
      continue;
    }
    dynFamilies.push({ alias, kind: 'template', raw, prefix, regex });
  }

  // 4. 动态族：字符串拼接 alias('前缀' + x)
  DYN_CONCAT_RE.lastIndex = 0;
  let ccm;
  while ((ccm = DYN_CONCAT_RE.exec(content)) !== null) {
    const alias = ccm[1];
    if (!aliasRe.test(alias)) continue;
    const prefix = ccm[3];
    if (!isUsablePrefix(prefix)) {
      unresolvableDyn.push({ alias, raw: `${prefix} + …`, reason: 'prefix-too-weak' });
      continue;
    }
    dynFamilies.push({
      alias, kind: 'concat', raw: `${prefix}' + …`, prefix,
      regex: new RegExp('^' + escapeRe(prefix) + '.*$'),
    });
  }

  return { relPath, aliasNs, usedByAlias, dynFamilies, unresolvableDyn, hasBinding: true };
}

// ---------- 递归扫描 src ----------
function walk(dir, rel, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, rel ? `${rel}/${entry}` : entry, out);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      const relPath = rel ? `${rel}/${entry}` : entry;
      const r = analyzeFile(full, relPath);
      if (r) out.push(r);
    }
  }
}

/**
 * 归因单个静态调用到命名空间。
 * 优先别名绑定的候选命名空间；候选都没有该键时回退到「全局任意命名空间命中即有效」
 * （原 globalKeyNs 兜底语义，避免绑定推断偏差造成假失败）。
 */
function resolveCall(key, candidates, namespaces, globalKeyNs) {
  for (const ns of candidates) {
    if (namespaces[ns] && namespaces[ns].has(key)) return { nsList: [ns], mode: 'local' };
  }
  const owners = globalKeyNs.get(key);
  if (owners && owners.size > 0) return { nsList: [...owners], mode: 'cross-ns' };
  return { nsList: candidates.length ? [candidates[0]] : [], mode: 'missing' };
}

// ---------- 读取 zh-CN 并扁平化 ----------
function loadZhCN() {
  const raw = readFileSync(MESSAGES_PATH, 'utf8');
  const data = JSON.parse(raw); // 损坏会在此抛出
  const namespaces = {};
  for (const ns of Object.keys(data)) {
    // 扁平化为点键（支持嵌套），如 'consistency.typeLabels.workorder_completion'
    namespaces[ns] = new Set(flatten(data[ns] || {}, ''));
  }
  return { data, namespaces };
}

// ---------- 主流程 ----------
function main() {
  const { namespaces } = loadZhCN();
  const allFiles = [];
  walk(SRC_DIR, '', allFiles);

  // 全局 key 索引：key -> Set(命名空间)，用于"任意空间存在即有效"回退
  const globalKeyNs = new Map();
  for (const ns of Object.keys(namespaces)) {
    for (const k of namespaces[ns]) {
      if (!globalKeyNs.has(k)) globalKeyNs.set(k, new Set());
      globalKeyNs.get(k).add(ns);
    }
  }

  const missing = []; // { file, ns, key, reason? }
  let totalUsed = 0;
  let crossNsResolved = 0;
  let skippedCount = 0;
  let filesWithBinding = 0;
  let dynFamilyCount = 0;
  const dynProtected = new Set();

  for (const f of allFiles) {
    if (f.hasBinding) filesWithBinding++;
    skippedCount += f.unresolvableDyn.length;

    for (const { alias, key } of f.usedByAlias) {
      const candidates = f.aliasNs[alias] || [];
      // 候选命名空间在 messages 中全都不存在（拼写错误 / 整个命名空间被回退）
      if (candidates.length > 0 && candidates.every(ns => !namespaces[ns]) && !globalKeyNs.has(key)) {
        missing.push({ file: f.relPath, ns: candidates[0], key, reason: 'namespace-missing' });
        continue;
      }
      totalUsed++;
      const { nsList, mode } = resolveCall(key, candidates, namespaces, globalKeyNs);
      if (mode === 'missing') {
        missing.push({ file: f.relPath, ns: nsList[0] || '(unbound)', key });
        continue;
      }
      if (mode === 'cross-ns') crossNsResolved++;
    }

    // 动态键族：断言「该族在 zh-CN 至少有一个键存在」，族整体消失同样是 messages 被回退的信号
    for (const fam of f.dynFamilies) {
      dynFamilyCount++;
      const bound = f.aliasNs[fam.alias] || [];
      const hits = [];
      const collect = (nsArr) => {
        for (const ns of nsArr) {
          if (!namespaces[ns]) continue;
          for (const k of namespaces[ns]) if (fam.regex.test(k)) hits.push(`${ns}.${k}`);
        }
      };
      collect(bound);
      if (hits.length === 0) collect(Object.keys(namespaces));
      if (hits.length === 0) {
        missing.push({ file: f.relPath, ns: bound[0] || '(unbound)', key: `${fam.prefix}*`, reason: 'dynamic-family-empty' });
        continue;
      }
      for (const h of hits) dynProtected.add(h);
    }
  }

  console.log('=== codemod 一致性校验（代码引用键 vs zh-CN） ===');
  console.log(`扫描文件: ${allFiles.length} (含绑定: ${filesWithBinding})`);
  console.log(`命名空间: ${Object.keys(namespaces).length} (messages: ${MESSAGES_PATH})`);
  console.log(`引用 key 数: ${totalUsed} (跨命名空间归因: ${crossNsResolved}，跳过动态 key: ${skippedCount})`);
  console.log(`动态键族: ${dynFamilyCount} 个，覆盖键 ${dynProtected.size} 个`);

  if (missing.length === 0) {
    console.log('\n✓ 一致性校验通过：所有代码引用的 i18n key 均存在于 zh-CN（无 messages 被回退迹象）');
    process.exit(0);
  }

  console.log(`\n✗ 发现 ${missing.length} 个「代码引用但 zh-CN 缺失」的 key（疑似 messages 被回退）：`);
  const byFile = {};
  for (const m of missing) (byFile[m.file] ||= []).push(m);
  for (const [file, items] of Object.entries(byFile)) {
    console.log(`\n  ${file}`);
    for (const it of items) {
      const tag = it.reason === 'namespace-missing' ? ' [命名空间不存在]'
        : it.reason === 'dynamic-family-empty' ? ' [动态键族在 zh-CN 整族缺失]' : '';
      console.log(`    ${it.ns}.${it.key}${tag}`);
    }
  }
  process.exit(1);
}

try {
  main();
} catch (err) {
  console.error('一致性校验执行失败:', err && err.stack ? err.stack : err);
  process.exit(2);
}
