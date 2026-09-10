#!/usr/bin/env node
/**
 * i18n key 缺失校验器 (i18n-key-check)
 *
 * 用途：扫描 src 下所有 .ts/.tsx 文件中的 tc('key') / t('key') 调用，
 *       根据文件内的 translations 绑定推断命名空间，
 *       与 messages/zh-CN.json 的实际 key 集合比对，输出「代码引用但 messages 缺失」的 key，
 *       防止 tc('xxx') 引用了不存在的 key（即本次批量修复 text_xxxxxx 占位符的回归防护）。
 *
 * 用法：node scripts/i18n-key-check.mjs [--json] [--strict] [--unused]
 *   --json    以 JSON 输出结果（便于 CI 解析）
 *   --strict  发现缺失 key 时退出码为 1（CI 卡点模式）；默认仅打印警告并退出 0
 *   --unused  同时报告 messages 中存在但代码中从未引用的「孤立 key」
 *
 * ── 扫描器修订说明（修掉三类系统性漏判，此前「未使用键」统计严重谎报）──
 *
 * 【漏判 1】绑定形态只认「同步 + 字符串字面量」。
 *   原 BINDING_RE = /const (\w+) = (?:use|get)Translations\('(Ns)'\)/ 要求 `=` 后紧跟
 *   useTranslations/getTranslations，因此以下两类写法被整体漏掉，
 *   连带这些文件里所有 t('k_xxx') 调用一起消失：
 *     ① `const ts = await getTranslations('Common')`            ← 391 个文件（服务端主流写法）
 *     ② `const t  = await getTranslations({ locale, namespace: 'Common' })`  ← 对象形态
 *   修法：拆成 BINDING_STR_RE / BINDING_OBJ_RE，两者都容忍可选的 `await`。
 *
 * 【漏判 2】动态拼接 / 模板键族被当成「无法解析」直接丢弃，其对应的 messages 键被误列为孤儿。
 *   修法：自动识别 `alias('前缀' + 变量)` 与 alias(`前缀${变量}后缀`) 两种形态，
 *   把模板还原成键正则（`${...}` → `[^.]*`），把 messages 中落在该族下的键全部视为「被引用」。
 *   注意：族的归属命名空间优先取别名绑定的命名空间，未命中则回退到全部命名空间
 *   （实证必要：PrepressReportsContent 里 t 绑定 PrepressReports，但 last*Days 键实际在 Reports）。
 *
 * 【漏判 3】Error.* 等「不走 t() 而以错误码字符串消费」的命名空间被静默列为孤儿。
 *   src/lib/error-handler.ts 经 translateError(code) / getErrorMessage 用裸错误码
 *   （'UNAUTHORIZED'、`HTTP_${status}`）查 messages.Error 表。
 *   修法：数据驱动识别「零 t() 引用 + 叶名大量以裸字符串出现」的命名空间为 code-consumed，
 *   在 --unused 中单列一类，而不是混进真实孤儿。
 *
 * 其它一致性修订：
 *   - 同名别名在同文件多次绑定到不同命名空间时，保留全部候选而非「最后一个覆盖」。
 *   - 未使用判定与缺失判定共用同一套「任意命名空间命中即有效」兜底语义，避免两头口径不一致
 *     导致的假孤儿（缺失侧早已宽容，未使用侧此前却严格，属于口径 bug）。
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const JSON_OUT = args.has('--json');
const STRICT = args.has('--strict');
const CHECK_UNUSED = args.has('--unused');

const MESSAGES_PATH = join(projectRoot, 'messages', 'zh-CN.json');
const SRC_DIR = join(projectRoot, 'src');

// ============================================================================
// 共享扫描逻辑（与 verify-codemod-consistency.mjs 保持逐字一致；
// 该脚本是 pre-commit / CI 门禁，刻意不 import 本文件以避免副作用与 argv 依赖）
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
// 裸标识符字符串字面量：错误码等「不走 t()」消费路径的证据
const BARE_STRING_RE = /(['"])([A-Za-z_][A-Za-z0-9_]{2,})\1/g;
// 代码族模板：任意 `PREFIX${...}` 形态（如 error-handler 的 `HTTP_${error.status}`）
const CODE_TPL_RE = /`([A-Za-z_][A-Za-z0-9_.]*\$\{[^`]*)`/g;
// 间接键调用：alias(表达式) —— 首参不是字符串/模板字面量，键在运行时才确定
// 例：tn(menu.code) / t(node.commentKey) / tc(PRODUCT_STATUS_KEYS[s] || 'unknown')
const INDIRECT_CALL_RE = /([A-Za-z_$][\w$]*)\(\s*(?!['"`]\s*\))(?!['"`])([A-Za-z_$][\w$]*(?:\.[\w$]+|\[[^\]]*\])*)/g;
// 表达式内联字面量：三元 / || 兜底里的键，如 td(x === 3 ? 'unlockSuccess' : 'lockSuccess')
// 仅在「键确实存在于 messages」时计为引用，绝不据此判缺失（避免新增假失败）
const EXPR_CALL_RE = /([A-Za-z_$][\w$]*)\(([^()\n]{0,240})\)/g;
const EXPR_LIT_RE = /(['"])([^'"\n]{2,120})\1/g;
// 键位字面量：属性名以 key/label/code 结尾时，其字符串值极可能是一个 i18n 键
// 例：commentKey: 'flowT_yjpuqz' / menu_code: 'dashboard_center' / labelKey: "statusDraft"
const KEYISH_LIT_RE = /\b([A-Za-z_$][\w$]*)\s*:\s*(['"])([^'"\n]{1,160})\2/g;
const KEYISH_PROP_RE = /(?:key|keys|label|labels|code|codes)$/;
// ALL_CAPS 键映射内的字面量：const CUSTOMER_TYPE_LABEL_KEYS = { 1: 'typeEnterprise', ... }
const KEYMAP_DECL_RE = /\b(?:const|let|var)\s+[A-Z][A-Z0-9_]*(?:KEY|KEYS|LABEL|LABELS)[A-Z0-9_]*\s*(?::[^=]*)?=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
const ANY_LIT_RE = /(['"])([^'"\n]{1,160})\1/g;

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
  // 拆分后仍残留 ${ 说明存在嵌套插值，放弃（宁可漏保护也不要过度保护）
  if (parts.some(p => p.includes('${') || p.includes('}'))) return null;
  if (!parts[0]) return null; // 无静态前缀 → 会退化成全表通配，拒绝
  return new RegExp('^' + parts.map(escapeRe).join('[^.]*') + '$');
}

/** 动态族前缀必须像键（足够长且限定字符），避免 t('' + x) 之类保护全表 */
function isUsablePrefix(prefix) {
  return typeof prefix === 'string' && prefix.length >= 2 && /^[A-Za-z_][A-Za-z0-9_.]*$/.test(prefix);
}

/**
 * 解析单个文件。
 * @returns {{relPath:string, aliasNs:Object<string,string[]>, usedByAlias:Array,
 *            dynFamilies:Array, unresolvableDyn:Array, hasBinding:boolean}}
 */
function analyzeFile(absPath, relPath, bareStrings, codeTemplates, keyishLiterals) {
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }

  // 全仓证据收集（与是否有绑定无关：错误码 / 键映射消费方通常没有 t() 绑定）
  if (bareStrings) {
    BARE_STRING_RE.lastIndex = 0;
    let sm;
    while ((sm = BARE_STRING_RE.exec(content)) !== null) bareStrings.add(sm[2]);
  }
  if (codeTemplates) {
    CODE_TPL_RE.lastIndex = 0;
    let tm;
    while ((tm = CODE_TPL_RE.exec(content)) !== null) {
      const re = templateToKeyRegex(tm[1]);
      if (re) codeTemplates.push(re);
    }
  }
  if (keyishLiterals) {
    // ① 属性名以 key/label/code 结尾的字符串值
    KEYISH_LIT_RE.lastIndex = 0;
    let km;
    while ((km = KEYISH_LIT_RE.exec(content)) !== null) {
      const prop = km[1].toLowerCase().replace(/_/g, '');
      if (KEYISH_PROP_RE.test(prop)) keyishLiterals.add(km[3]);
    }
    // ② ALL_CAPS 键映射字面量（值即键名）
    KEYMAP_DECL_RE.lastIndex = 0;
    let dm;
    while ((dm = KEYMAP_DECL_RE.exec(content)) !== null) {
      ANY_LIT_RE.lastIndex = 0;
      let lm;
      while ((lm = ANY_LIT_RE.exec(dm[1])) !== null) keyishLiterals.add(lm[2]);
    }
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
    return { relPath, aliasNs, usedByAlias: [], dynFamilies: [], unresolvableDyn: [], indirectAliases: new Set(), exprLits: [], hasBinding: false };
  }
  const aliasRe = new RegExp(`^(?:${aliasNames.map(a => escapeRe(a)).join('|')})$`);

  // 2. 静态调用（按 alias+key 在文件内去重，保持与原实现一致的「引用 key 数」口径）
  const usedByAlias = []; // { alias, key }
  const seenCall = new Set();
  const dynFamilies = []; // { alias, kind, raw, prefix, regex }
  const unresolvableDyn = []; // { alias, raw, reason }

  CALL_RE.lastIndex = 0;
  let cm;
  while ((cm = CALL_RE.exec(content)) !== null) {
    const alias = cm[1];
    if (!aliasRe.test(alias)) continue; // 不是翻译别名（如 toLocaleString / console.log）
    const key = cm[2];
    // 含插值 / 引号的键交给动态族识别处理
    if (key.includes('${') || /[+]|['"`]/.test(key)) continue;
    const sig = `${alias}\u0000${key}`;
    if (seenCall.has(sig)) continue;
    seenCall.add(sig);
    usedByAlias.push({ alias, key });
  }

  // 3. 动态族：模板字面量 alias(`前缀${x}后缀`)
  DYN_TPL_RE.lastIndex = 0;
  let tm2;
  while ((tm2 = DYN_TPL_RE.exec(content)) !== null) {
    const alias = tm2[1];
    if (!aliasRe.test(alias)) continue;
    const raw = tm2[2];
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

  // 5. 间接键调用：alias(表达式)。键在运行时决定 → 该别名绑定的命名空间被「动态索引」，
  //    其键无法静态证伪为未使用（实证：sidebar.tsx `tn(menu.code)`，tn→Nav，
  //    菜单码来自 DB，Nav 全部 109 个键都是活的却被旧扫描器整体误判为孤儿）。
  const indirectAliases = new Set();
  INDIRECT_CALL_RE.lastIndex = 0;
  let im;
  while ((im = INDIRECT_CALL_RE.exec(content)) !== null) {
    const alias = im[1];
    if (!aliasRe.test(alias)) continue;
    indirectAliases.add(alias);
  }

  // 6. 表达式内联字面量（三元 / || 兜底）——补回 CALL_RE 抓不到的静态键
  const exprLits = []; // { alias, key }
  const seenExpr = new Set();
  EXPR_CALL_RE.lastIndex = 0;
  let em;
  while ((em = EXPR_CALL_RE.exec(content)) !== null) {
    const alias = em[1];
    if (!aliasRe.test(alias)) continue;
    const argText = em[2];
    if (!/[?:|&]/.test(argText)) continue; // 只处理条件/兜底表达式，纯字面量已由 CALL_RE 覆盖
    EXPR_LIT_RE.lastIndex = 0;
    let lm;
    while ((lm = EXPR_LIT_RE.exec(argText)) !== null) {
      const sig = `${alias}\u0000${lm[2]}`;
      if (seenExpr.has(sig)) continue;
      seenExpr.add(sig);
      exprLits.push({ alias, key: lm[2] });
    }
  }

  return { relPath, aliasNs, usedByAlias, dynFamilies, unresolvableDyn, indirectAliases, exprLits, hasBinding: true };
}

// ---------- 递归扫描 src ----------
function walk(dir, rel, out, bareStrings, codeTemplates, keyishLiterals) {
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
      walk(full, rel ? `${rel}/${entry}` : entry, out, bareStrings, codeTemplates, keyishLiterals);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      const relPath = rel ? `${rel}/${entry}` : entry;
      const r = analyzeFile(full, relPath, bareStrings, codeTemplates, keyishLiterals);
      if (r) out.push(r);
    }
  }
}

/**
 * 归因单个静态调用到命名空间。
 * 优先别名绑定的候选命名空间；候选都没有该键时回退到「全局任意命名空间命中即有效」
 * （与门禁脚本的 globalKeyNs 兜底同语义，避免绑定推断偏差造成假失败 / 假孤儿）。
 */
function resolveCall(key, candidates, namespaces, globalKeyNs) {
  for (const ns of candidates) {
    if (namespaces[ns] && namespaces[ns].has(key)) return { nsList: [ns], mode: 'local' };
  }
  const owners = globalKeyNs.get(key);
  if (owners && owners.size > 0) return { nsList: [...owners], mode: 'cross-ns' };
  return { nsList: candidates.length ? [candidates[0]] : [], mode: 'missing' };
}

// ---------- 读取 messages ----------
function loadMessages() {
  const raw = readFileSync(MESSAGES_PATH, 'utf8');
  const data = JSON.parse(raw); // 若损坏会在此抛出
  const namespaces = {};
  for (const ns of Object.keys(data)) {
    // 扁平化为点键（支持嵌套），如 'consistency.typeLabels.workorder_completion'
    namespaces[ns] = new Set(flatten(data[ns] || {}, ''));
  }
  return { data, namespaces };
}

// ---------- 主流程 ----------
function main() {
  const { data, namespaces } = loadMessages();
  const allFiles = [];
  const bareStrings = new Set();
  const codeTemplates = [];
  const keyishLiterals = new Set();
  walk(SRC_DIR, '', allFiles, bareStrings, codeTemplates, keyishLiterals);

  // 全局 key 索引：key -> Set(命名空间)
  const globalKeyNs = new Map();
  for (const ns of Object.keys(namespaces)) {
    for (const k of namespaces[ns]) {
      if (!globalKeyNs.has(k)) globalKeyNs.set(k, new Set());
      globalKeyNs.get(k).add(ns);
    }
  }

  const missing = []; // { file, ns, key, reason? }
  const usedPair = new Set(); // `${ns}.${key}` 被引用
  let totalUsed = 0;
  let crossNsResolved = 0;
  let exprLitResolved = 0;
  let skippedCount = 0;
  let filesWithBinding = 0;

  // ---- 静态调用归因 ----
  for (const f of allFiles) {
    if (f.hasBinding) filesWithBinding++;
    skippedCount += f.unresolvableDyn.length;

    for (const { alias, key } of f.usedByAlias) {
      const candidates = f.aliasNs[alias] || [];
      // 候选命名空间在 messages 中全都不存在（拼写错误 / 整个命名空间被回退）
      if (candidates.length > 0 && candidates.every(ns => !namespaces[ns])) {
        if (!globalKeyNs.has(key)) {
          missing.push({ file: f.relPath, ns: candidates[0], key, reason: 'namespace-missing' });
          continue;
        }
      }
      totalUsed++;
      const { nsList, mode } = resolveCall(key, candidates, namespaces, globalKeyNs);
      if (mode === 'missing') {
        missing.push({ file: f.relPath, ns: nsList[0] || '(unbound)', key });
        continue;
      }
      if (mode === 'cross-ns') crossNsResolved++;
      for (const ns of nsList) usedPair.add(`${ns}.${key}`);
    }

    // 表达式内联字面量：命中即计为引用；未命中静默忽略（不判缺失，避免假失败）
    for (const { alias, key } of f.exprLits || []) {
      const candidates = f.aliasNs[alias] || [];
      const { nsList, mode } = resolveCall(key, candidates, namespaces, globalKeyNs);
      if (mode === 'missing') continue;
      for (const ns of nsList) {
        if (!usedPair.has(`${ns}.${key}`)) exprLitResolved++;
        usedPair.add(`${ns}.${key}`);
      }
    }
  }

  // ---- 动态族保护 ----
  // 族的命名空间优先取别名绑定；绑定命名空间内无命中则回退全部命名空间
  // （实证：t 绑定 PrepressReports，但 last*Days 键实际位于 Reports）
  const dynProtected = new Set(); // `${ns}.${key}`
  const dynFamilyReport = []; // { file, alias, prefix, raw, kind, nsHit, count }
  for (const f of allFiles) {
    for (const fam of f.dynFamilies) {
      const bound = f.aliasNs[fam.alias] || [];
      const hits = [];
      const collect = (nsArr) => {
        for (const ns of nsArr) {
          if (!namespaces[ns]) continue;
          for (const k of namespaces[ns]) {
            if (fam.regex.test(k)) hits.push([ns, k]);
          }
        }
      };
      collect(bound);
      if (hits.length === 0) collect(Object.keys(namespaces));
      for (const [ns, k] of hits) dynProtected.add(`${ns}.${k}`);
      dynFamilyReport.push({
        file: f.relPath, alias: fam.alias, prefix: fam.prefix, raw: fam.raw, kind: fam.kind,
        nsHit: [...new Set(hits.map(h => h[0]))], count: hits.length,
      });
    }
  }

  // ---- 间接索引命名空间识别 ----
  // 某命名空间只要存在一处 alias(表达式) 调用，其键就无法被静态证伪为未使用。
  const indirectNs = new Map(); // ns -> Set(证据文件)
  for (const f of allFiles) {
    for (const alias of f.indirectAliases || []) {
      for (const ns of f.aliasNs[alias] || []) {
        if (!namespaces[ns]) continue;
        if (!indirectNs.has(ns)) indirectNs.set(ns, new Set());
        indirectNs.get(ns).add(`${f.relPath} (${alias})`);
      }
    }
  }

  // ---- code-consumed 命名空间识别（数据驱动，非硬编码 'Error'）----
  // 判据：该命名空间没有任何 t() 引用，且其叶名大量以裸字符串 / 代码族模板出现在 src。
  const hasCodeEvidence = (flatKey) => {
    const leaf = flatKey.split('.').pop();
    if (bareStrings.has(leaf) || bareStrings.has(flatKey)) return true;
    return codeTemplates.some(re => re.test(flatKey) || re.test(leaf));
  };
  const codeConsumedNs = new Set();
  for (const ns of Object.keys(namespaces)) {
    const keys = [...namespaces[ns]];
    if (keys.length < 5) continue;
    const refCount = keys.filter(k => usedPair.has(`${ns}.${k}`)).length;
    if (refCount > 0) continue; // 存在 t() 引用 → 走正常链路，不算错误码消费
    const evidence = keys.filter(hasCodeEvidence).length;
    if (evidence / keys.length >= 0.3) codeConsumedNs.add(ns);
  }

  // ---- 孤立 key 分类 ----
  // 优先级：动态族保护 > 错误码消费 > 间接键消费 > 真实孤儿
  let unused = [];
  const unusedStats = { orphan: 0, dynamicFamily: 0, codeConsumed: 0, indirect: 0 };
  if (CHECK_UNUSED) {
    for (const ns of Object.keys(namespaces)) {
      for (const k of namespaces[ns]) {
        const pair = `${ns}.${k}`;
        if (usedPair.has(pair)) continue;
        let kind = 'orphan';
        let evidence;
        if (dynProtected.has(pair)) {
          kind = 'dynamic-family';
        } else if (codeConsumedNs.has(ns)) {
          kind = 'code-consumed';
          evidence = hasCodeEvidence(k) ? 'bare-string' : 'namespace-inferred';
        } else if (indirectNs.has(ns) && keyishLiterals.has(k)) {
          // 命名空间被 alias(表达式) 动态索引，且键名确实出现在「键位字面量」中
          // （属性名以 key/label/code 结尾，或 ALL_CAPS 键映射里的值）
          kind = 'indirect';
          evidence = 'keyish-literal';
        }
        if (kind === 'orphan') unusedStats.orphan++;
        else if (kind === 'dynamic-family') unusedStats.dynamicFamily++;
        else if (kind === 'code-consumed') unusedStats.codeConsumed++;
        else unusedStats.indirect++;
        unused.push({ ns, key: k, kind, evidence });
      }
    }
  }

  const totalKeys = Object.keys(namespaces).reduce((n, ns) => n + namespaces[ns].size, 0);

  // ---------- 输出 ----------
  if (JSON_OUT) {
    const payload = {
      ok: missing.length === 0,
      missing,
      unused,
      unusedStats,
      dynamicFamilies: dynFamilyReport,
      codeConsumedNamespaces: [...codeConsumedNs],
      indirectNamespaces: [...indirectNs.entries()].map(([ns, ev]) => ({ ns, evidence: [...ev].slice(0, 5) })),
      stats: {
        files: allFiles.length, filesWithBinding, totalUsed, distinctUsedKeys: usedPair.size,
        crossNsResolved, skipped: skippedCount,
        namespaces: Object.keys(namespaces).length, totalKeys,
        dynamicFamilies: dynFamilyReport.length, dynamicProtectedKeys: dynProtected.size,
      },
    };
    writeFileSync(join(projectRoot, 'scripts', 'i18n-key-check.result.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  }

  if (!JSON_OUT) {
    console.log('=== i18n key 校验 ===');
    console.log(`扫描文件: ${allFiles.length} (含绑定: ${filesWithBinding})`);
    console.log(`命名空间: ${Object.keys(namespaces).length} (扁平键总数: ${totalKeys})`);
    console.log(`引用 key 数: ${totalUsed} (跨命名空间归因: ${crossNsResolved}，跳过动态 key: ${skippedCount})`);
    console.log(`去重后命中 messages 的键: ${usedPair.size} / ${totalKeys}`);
    console.log(`动态键族: ${dynFamilyReport.length} 个，保护键 ${dynProtected.size} 个`);
    if (codeConsumedNs.size > 0) {
      console.log(`错误码消费命名空间（不走 t()）: ${[...codeConsumedNs].join(', ')}`);
    }
    if (indirectNs.size > 0) {
      console.log(`被 alias(表达式) 动态索引的命名空间: ${[...indirectNs.keys()].join(', ')}`);
    }
  }

  if (missing.length === 0) {
    if (!JSON_OUT) console.log('\n✓ 未发现缺失的 i18n key');
  } else {
    console.log(`\n✗ 发现 ${missing.length} 个缺失/无效 key：`);
    const byFile = {};
    for (const m of missing) (byFile[m.file] ||= []).push(m);
    for (const [file, items] of Object.entries(byFile)) {
      console.log(`\n  ${file}`);
      for (const it of items) {
        const tag = it.reason === 'namespace-missing' ? ' [命名空间不存在]' : '';
        console.log(`    ${it.ns}.${it.key}${tag}`);
      }
    }
  }

  if (CHECK_UNUSED) {
    console.log(`\n• 未被 t() 静态引用的 key: ${unused.length} 个，分类如下：`);
    console.log(`    [1] 真实孤儿              : ${unusedStats.orphan}`);
    console.log(`    [2] 动态族保护            : ${unusedStats.dynamicFamily}`);
    console.log(`    [3] 错误码消费(非 t())     : ${unusedStats.codeConsumed}`);
    console.log(`    [4] 间接键消费(alias(表达式)): ${unusedStats.indirect}`);

    if (!JSON_OUT) {
      if (unusedStats.dynamicFamily > 0) {
        console.log('\n  [2] 动态族保护明细（检出的动态键族）：');
        for (const d of dynFamilyReport) {
          console.log(`    ${d.kind === 'concat' ? "'" + d.raw : '`' + d.raw + '`'}  → 前缀 "${d.prefix}"  命中 ${d.count} 键 [${d.nsHit.join(',')}]`);
          console.log(`        ${d.file} (别名 ${d.alias})`);
        }
      }
      if (unusedStats.codeConsumed > 0) {
        console.log('\n  [3] 错误码消费明细（possibly-referenced without t()）：');
        for (const u of unused.filter(x => x.kind === 'code-consumed')) {
          console.log(`    ${u.ns}.${u.key}  [${u.evidence}]`);
        }
      }
      if (unusedStats.indirect > 0) {
        console.log('\n  [4] 间接键消费明细（命名空间被 alias(表达式) 动态索引，键名命中键位字面量）：');
        const byNsInd = {};
        for (const u of unused.filter(x => x.kind === 'indirect')) (byNsInd[u.ns] ||= []).push(u.key);
        for (const [ns, keys] of Object.entries(byNsInd).sort((a, b) => b[1].length - a[1].length)) {
          const ev = [...(indirectNs.get(ns) || [])].slice(0, 2).join('; ');
          console.log(`    ${ns}: ${keys.length} 个  ← ${ev}`);
        }
      }
      const orphans = unused.filter(x => x.kind === 'orphan');
      if (orphans.length > 0) {
        console.log('\n  [1] 真实孤儿（按命名空间聚合）：');
        const byNs = {};
        for (const o of orphans) (byNs[o.ns] ||= []).push(o.key);
        for (const [ns, keys] of Object.entries(byNs).sort((a, b) => b[1].length - a[1].length)) {
          console.log(`    ${ns}: ${keys.length}`);
        }
        console.log('  前 50 个：');
        for (const o of orphans.slice(0, 50)) console.log(`    ${o.ns}.${o.key}`);
        if (orphans.length > 50) console.log(`    ... 共 ${orphans.length} 个（完整清单用 --json）`);
      }
    }
  }

  if (STRICT && missing.length > 0) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error('校验脚本执行失败:', err && err.stack ? err.stack : err);
  process.exit(2);
}
