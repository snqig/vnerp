// i18n P2 codemod：分模块把客户端组件里的硬编码中文字面量外置到 i18n。
//
// 与 P1-1 的区别：P1-1 只替换「已有 useTranslations('Common') 绑定」函数内的 15 个固定串；
// 本脚本负责 P2 的「缺 hook 的组件」——自动注入 useTranslations 并外置全部中文字面量。
//
// 安全设计：
//  1) 位置级改写（TS 编译器拿节点位置，按 start 降序拼接），保留原格式/注释/空行。
//  2) 仅处理含 JSX 的 .tsx 文件（客户端组件），不碰 src/app/api、scripts、tests、node_modules。
//  3) 仅外置：JSX 文本、JSX 属性串、JSX 表达式串，以及「含 CJK 的普通字符串字面量」
//     （覆盖 table column 的 title/label 等）；排除：对象 key、import/require、已有的 i18n 调用参数。
//  4) 键复用：先查 zh-CN.json 全命名空间「值→键」反查，命中 Common 则复用 tc('key')；
//     否则用确定性键 k_<hash> 落到模块命名空间（跨文件同串同键，幂等无冲突）。
//  5) 自动注入：`import { useTranslations } from 'next-intl'`（缺失时放在 'use client' 之后）；
//     在「含中文字面量且无绑定」的函数顶部注入 `const ts = useTranslations('<NS>')`（按需再加 tc）。
//
// 用法：
//   node scripts/i18n-codemod-p2.cjs --dir "src/app/[locale]/dcprint"   # 实际改写该模块
//   node scripts/i18n-codemod-p2.cjs --dir "src/app/[locale]/dcprint" --dry-run
//   node scripts/i18n-codemod-p2.cjs --dir "src/app/[locale]/dcprint" --check
//
// 幂等：改写后字面量变为 ts('k_..')/tc('..')，重跑不再替换；绑定已存在则跳过注入。
//
// ⚠️ 提交约束（防中文丢失回归 / 裸 key，对应审计报告 P0-2）：
//   本 codemod 对单个文件做两次「独立、非原子」写——
//     ① 改写 .tsx（中文 → ts('k_xxx')）；
//     ② 把 k_xxx: '中文' 写入全部 4 个 locale 文件（messages/{zh-CN,en,vi,zh-TW}.json）。
//   两步无共校验。若仅提交了 .tsx 而 messages 被回退 / 漏提，调用点会引用 messages 中
//   不存在的键 → 中文丢失；zh-CN 作为 fallback 基被回退时全语言裸 key。
//   因此：源文件改动 + 4 个 locale 文件改动 必须纳入【同一次提交】，
//   严禁只提交 .tsx 而回退 / 漏提 messages。提交前务必跑
//   scripts/verify-codemod-consistency.mjs 校验「代码引用的键均存在于 zh-CN」。

const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const CHECK = args.includes('--check');
let DIR_ARG = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) {
    DIR_ARG = args[i + 1];
    break;
  }
  if (args[i].startsWith('--dir=')) {
    DIR_ARG = args[i].slice(6);
    break;
  }
}

const CJK = /[一-鿿㐀-䶿]/;
const EXCLUDE_DIR_RE = /(?:[/\\])(?:node_modules|\.next|messages|scripts|tests|__tests__|\.workbuddy)(?:[/\\])/;
const TEST_RE = /\.test\.(t|j)sx?$|[/\\]__tests__[/\\]/;
const API_RE = /(?:[/\\])src[/\\]app[/\\]api[/\\]/;

// 模块顶层目录 -> 命名空间
const NS_MAP = {
  dcprint: 'Dcprint',
  warehouse: 'Warehouse',
  quality: 'Quality',
  settings: 'Settings',
  equipment: 'Equipment',
  orders: 'Orders',
  purchase: 'Purchase',
  sales: 'Sales',
  dashboard: 'Dashboard',
  business: 'Business',
  sample: 'SampleManagement',
  'sample/standard-card': 'StandardCard',
};

function namespaceFor(rel) {
  // rel: src/app/[locale]/<mod>/... 或 src/components/...
  const segs = rel.split('/').filter(Boolean);
  let i = segs.indexOf('[locale]');
  let modSegs;
  if (i >= 0) modSegs = segs.slice(i + 1);
  else if (segs[0] === 'src' && segs[1] === 'components') modSegs = segs.slice(2);
  else modSegs = segs.slice(1);
  if (!modSegs.length) return 'Common';
  const two = modSegs.slice(0, 2).join('/');
  if (NS_MAP[two]) return NS_MAP[two];
  if (NS_MAP[modSegs[0]]) return NS_MAP[modSegs[0]];
  // 默认 PascalCase 首段
  return modSegs[0].replace(/(^|[/\\-])([a-z])/g, (_, __, c) => c.toUpperCase()).replace(/[/\\-]/g, '');
}

function keyFor(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'k_' + (h >>> 0).toString(36);
}

// 构建「值 -> {ns,key}」反查（Common 优先）
function buildReverseIndex() {
  const idx = {};
  const file = path.join(ROOT, 'messages/zh-CN.json');
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  const nsOrder = Object.keys(obj);
  // 先放非 Common，再放 Common（Common 覆盖，优先复用）
  const ordered = nsOrder.filter((n) => n !== 'Common').concat(['Common']);
  for (const ns of ordered) {
    const dict = obj[ns];
    if (!dict || typeof dict !== 'object') continue;
    for (const k of Object.keys(dict)) {
      const v = dict[k];
      if (typeof v !== 'string') continue;
      if (!idx[v]) idx[v] = { ns, key: k };
    }
  }
  return { idx, obj };
}

function isFunctionLike(n) {
  return (
    ts.isFunctionDeclaration(n) ||
    ts.isFunctionExpression(n) ||
    ts.isArrowFunction(n) ||
    ts.isMethodDeclaration(n) ||
    ts.isGetAccessor(n) ||
    ts.isConstructorDeclaration(n) ||
    ts.isSetAccessor(n)
  );
}

// 找文件内所有 useTranslations 绑定（含已注入的），记录所属函数作用域
function findBindings(sf) {
  const bindings = [];
  function visit(n, parent) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const init = n.initializer;
      if (
        ts.isCallExpression(init) &&
        ts.isIdentifier(init.expression) &&
        init.expression.text === 'useTranslations' &&
        init.arguments.length >= 1 &&
        (ts.isStringLiteral(init.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(init.arguments[0]))
      ) {
        let scope = parent;
        while (scope && !isFunctionLike(scope)) scope = scope.parent;
        bindings.push({ name: n.name.text, ns: init.arguments[0].text, scope });
      }
    }
    ts.forEachChild(n, (c) => visit(c, n));
  }
  visit(sf, null);
  return bindings;
}

function nearestBinding(node, bindings) {
  let cur = node;
  while (cur) {
    for (const b of bindings) {
      if (b.scope && (cur === b.scope || (node.pos >= b.scope.pos && node.end <= b.scope.end))) return b;
    }
    cur = cur.parent;
  }
  return null;
}

function insideI18nCall(node) {
  let cur = node.parent;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const callee = cur.expression;
      if (ts.isIdentifier(callee) && (callee.text === 't' || callee.text === 'tc' || callee.text === 'ts' || callee.text === 'useTranslations')) {
        return true;
      }
    }
    cur = cur.parent;
  }
  return false;
}

// 字面量是否为对象 key / import 等，需跳过
function isObjectKey(n) {
  const p = n.parent;
  if (!p) return false;
  if (ts.isPropertyAssignment(p) && p.name === n) return true;
  if (ts.isPropertySignature(p) && p.name === n) return true;
  if (ts.isShorthandPropertyAssignment(p)) return false;
  if (ts.isImportSpecifier(p) || ts.isImportClause(p)) return true;
  if (ts.isModuleDeclaration(p)) return true;
  return false;
}

// 收集文件中所有待外置的中文字面量节点
function collectLiterals(sf) {
  const out = [];
  function visit(n) {
    if (insideI18nCall(n)) {
      ts.forEachChild(n, visit);
      return;
    }
    // JSX 文本
    if (ts.isJsxText(n)) {
      const txt = n.text.trim();
      if (txt && CJK.test(txt)) out.push({ node: n, text: txt, kind: 'jsx-text' });
      ts.forEachChild(n, visit);
      return;
    }
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const txt = n.text;
      if (!CJK.test(txt)) {
        ts.forEachChild(n, visit);
        return;
      }
      const p = n.parent;
      const isJsxAttr = ts.isJsxAttribute(p);
      const isJsxExpr = p && ts.isJsxExpression(p);
      if (isJsxAttr || isJsxExpr) {
        out.push({ node: n, text: txt, kind: 'jsx', ctx: isJsxAttr ? 'attr' : 'expr' });
      } else if (!isObjectKey(n)) {
        // 含 CJK 的普通串（table column title / label 等），排除对象 key
        out.push({ node: n, text: txt, kind: 'plain' });
      }
      ts.forEachChild(n, visit);
      return;
    }
    ts.forEachChild(n, visit);
  }
  visit(sf);
  return out;
}

// 取函数体起始插入位置（其 `{` 之后，或箭头表达式体前）
function injectionEdits(fnNode, bindName, ns, sf) {
  const edits = [];
  let insertAt;
  if (ts.isArrowFunction(fnNode) && !ts.isBlock(fnNode.body)) {
    // () => <jsx/>  ->  () => {\n  const ts=useTranslations('NS');\n  return <jsx/>;\n}
    const gt = fnNode.equalsGreaterThanToken;
    insertAt = gt.end;
    edits.push({ start: insertAt, end: insertAt, repl: ` {\n  const ${bindName} = useTranslations('${ns}');\n  return ` });
    edits.push({ start: fnNode.body.end, end: fnNode.body.end, repl: ';\n}' });
  } else if (fnNode.body && ts.isBlock(fnNode.body)) {
    const brace = fnNode.body.getStart(sf); // position of '{'
    insertAt = brace + 1;
    edits.push({ start: insertAt, end: insertAt, repl: `\n  const ${bindName} = useTranslations('${ns}');` });
  }
  return edits;
}

function ensureImport(sf, src) {
  // 返回需要插入 import 的位置（在 'use client' 之后；否则文件顶部）
  let hasImport = /from\s+['"]next-intl['"]/.test(src) && /useTranslations/.test(src);
  if (hasImport) return null;
  // 找 'use client' 指令节点
  let afterClient = null;
  function findClient(n) {
    if (ts.isStringLiteral(n) && n.text === 'use client' && n.parent && ts.isExpressionStatement(n.parent)) {
      afterClient = n.parent.end;
    }
    ts.forEachChild(n, findClient);
  }
  findClient(sf);
  const IMPORT = `\nimport { useTranslations } from 'next-intl';`;
  if (afterClient != null) return { start: afterClient, end: afterClient, repl: IMPORT };
  return { start: 0, end: 0, repl: IMPORT + '\n' };
}

function enclosingFunction(node) {
  let cur = node;
  while (cur) {
    if (isFunctionLike(cur)) return cur;
    cur = cur.parent;
  }
  return null;
}

function processFile(file, reverse, MODULE_NS) {
  // 安全护栏：本脚本只处理「客户端组件」(.tsx 且带 'use client'，或已使用 useTranslations)。
  // 严禁对 .ts 服务端模块 / 服务端组件注入 React Hook —— 那会破坏构建（hook 只能在客户端组件内调用）。
  if (!/\.tsx$/.test(file)) return null;
  let src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const isClient =
    /'use client'/.test(src) ||
    (/from\s+['"]next-intl['"]/.test(src) && /useTranslations/.test(src));
  if (!isClient) return null;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const literals = collectLiterals(sf).filter((l) => enclosingFunction(l.node) != null);
  if (!literals.length) return null;

  const existingBindings = findBindings(sf);
  const existingNames = new Set(existingBindings.map((b) => b.name));

  // 决定每个字面量的 (bind, key, ns)
  const plan = literals.map((l) => {
    const hit = reverse.idx[l.text];
    if (hit && hit.ns === 'Common') {
      return { lit: l, bind: 'tc', key: hit.key, ns: 'Common', newModuleKey: false };
    }
    const k = keyFor(l.text);
    return { lit: l, bind: 'ts', key: k, ns: MODULE_NS, newModuleKey: !reverse.idx[l.text] || reverse.idx[l.text].ns !== MODULE_NS };
  });

  const needTc = plan.some((p) => p.bind === 'tc');
  const needTs = plan.some((p) => p.bind === 'ts');

  // 注入绑定：找出「含字面量且无绑定」的函数，自顶向下注入
  const literalFns = new Set();
  for (const l of literals) {
    let cur = l.node;
    while (cur && !isFunctionLike(cur)) cur = cur.parent;
    if (cur) literalFns.add(cur);
  }
  const fns = Array.from(literalFns).sort((a, b) => a.getStart(sf) - b.getStart(sf));
  // 已存在的绑定 + 本轮已注入的绑定，统一用于「本函数/祖先是否已有某 name 绑定」判定
  const allBindings = existingBindings.map((b) => ({ name: b.name, scope: b.scope }));
  function hasBindingInScope(fn, name) {
    // fn 自身或任一祖先函数已有该 name 的 useTranslations 绑定
    let cur = fn;
    while (cur) {
      if (isFunctionLike(cur) && allBindings.some((b) => b.name === name && b.scope === cur)) return true;
      cur = cur.parent;
    }
    return false;
  }
  const covered = new Set(); // 已被自身或祖先绑定覆盖的函数
  for (const b of existingBindings) if (b.scope) covered.add(b.scope);
  const injectEdits = [];
  for (const fn of fns) {
    // 祖先是否已被覆盖（含已有绑定或已注入绑定）
    let anc = fn.parent;
    let coveredByAncestor = false;
    while (anc) {
      if (covered.has(anc)) { coveredByAncestor = true; break; }
      anc = anc.parent;
    }
    if (coveredByAncestor) { covered.add(fn); continue; }
    // 本函数内字面量需求
    const fnLits = plan.filter((p) => {
      let cur = p.lit.node;
      while (cur && cur !== fn) cur = cur.parent;
      return cur === fn;
    });
    const fnNeedTc = fnLits.some((p) => p.bind === 'tc');
    const fnNeedTs = fnLits.some((p) => p.bind === 'ts');
    if (fnNeedTs && !hasBindingInScope(fn, 'ts')) {
      injectEdits.push(...injectionEdits(fn, 'ts', MODULE_NS, sf));
      allBindings.push({ name: 'ts', scope: fn });
    }
    if (fnNeedTc && !hasBindingInScope(fn, 'tc')) {
      injectEdits.push(...injectionEdits(fn, 'tc', 'Common', sf));
      allBindings.push({ name: 'tc', scope: fn });
    }
    covered.add(fn);
  }

  // 字面量替换编辑
  const litEdits = plan.map((p) => {
    const n = p.lit.node;
    const replText = `${p.bind}('${p.key}')`;
    if (process.env.DEBUG_LIT && p.lit.text.includes(process.env.DEBUG_LIT)) {
      console.error('DEBUG lit:', JSON.stringify({ text: p.lit.text, kind: p.lit.kind, ctx: p.lit.ctx, bind: p.bind, key: p.key, start: n.getStart(sf), end: n.getEnd(sf) }));
    }
    if (p.lit.kind === 'jsx-text') {
      return { start: n.getStart(sf), end: n.getEnd(), repl: `{${replText}}` };
    }
    if (p.lit.kind === 'jsx' && p.lit.ctx === 'attr') {
      // JSX 属性值（placeholder="..."）→ 必须包成 {ts('k')}
      return { start: n.getStart(sf), end: n.getEnd(), repl: `{${replText}}` };
    }
    return { start: n.getStart(sf), end: n.getEnd(), repl: replText };
  });

  const importEdit = ensureImport(sf, src);
  const allEdits = [...injectEdits, ...litEdits];
  if (importEdit) allEdits.push(importEdit);

  // 统计需要在模块命名空间新增的键
  const newModuleKeys = {};
  for (const p of plan) {
    if (p.bind === 'ts' && p.newModuleKey) newModuleKeys[p.key] = p.lit.text;
  }

  if (DRY) {
    return { file, count: literals.length, needTc, needTs, newModuleKeys, injectCount: injectEdits.length };
  }

  // 应用：按 start 降序
  allEdits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of allEdits) {
    out = out.slice(0, e.start) + e.repl + out.slice(e.end);
  }
  fs.writeFileSync(file, out, 'utf8');

  // 写回 messages：把新模块键落到 4 个 locale 文件
  if (Object.keys(newModuleKeys).length) {
    writeModuleKeys(MODULE_NS, newModuleKeys);
  }

  return { file, count: literals.length, needTc, needTs, newModuleKeys, injectCount: injectEdits.length };
}

const LOCALES = ['zh-CN', 'zh-TW', 'en', 'vi'];
function writeModuleKeys(ns, keys) {
  for (const loc of LOCALES) {
    const fp = path.join(ROOT, `messages/${loc}.json`);
    let obj;
    try {
      obj = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch {
      continue;
    }
    if (!obj[ns] || typeof obj[ns] !== 'object') obj[ns] = {};
    for (const k of Object.keys(keys)) {
      if (!(k in obj[ns])) obj[ns][k] = keys[k]; // 非 zh 也先填中文占位，翻译后续补
    }
    fs.writeFileSync(fp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  }
}

function listFiles(dir) {
  const out = [];
  let stat;
  try {
    stat = fs.statSync(dir);
  } catch {
    return out;
  }
  if (stat.isFile()) {
    const rel = path.relative(ROOT, dir).replace(/\\/g, '/');
    if (/\.tsx?$/.test(dir) && !TEST_RE.test(rel) && !API_RE.test(rel)) out.push(dir);
    return out;
  }
  function walk(d) {
    let ents;
    try {
      ents = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        const rel = path.relative(ROOT, p).replace(/\\/g, '/');
        if (EXCLUDE_DIR_RE.test('/' + rel + '/')) continue;
        walk(p);
      } else if (e.isFile()) {
        const rel = path.relative(ROOT, p).replace(/\\/g, '/');
        if (!/\.tsx?$/.test(e.name)) continue;
        if (TEST_RE.test(rel)) continue;
        if (API_RE.test(rel)) continue;
        out.push(p);
      }
    }
  }
  walk(dir);
  return out;
}

function main() {
  const { idx, obj } = buildReverseIndex();
  const MODULE_NS = DIR_ARG ? namespaceFor(DIR_ARG.replace(/\\/g, '/')) : 'Common';
  const targetDir = DIR_ARG ? path.join(ROOT, DIR_ARG) : path.join(ROOT, 'src');
  const files = listFiles(targetDir);
  console.log(`\n=== i18n P2 codemod ${DRY ? '(DRY-RUN)' : '(APPLIED)'} | module ns=${MODULE_NS} | dir=${DIR_ARG || 'src'} ===`);
  console.log(`扫描文件: ${files.length}`);

  let total = 0;
  const newKeysAll = {};
  const changedFiles = [];
  for (const f of files) {
    const r = processFile(f, { idx, obj }, MODULE_NS);
    if (!r) continue;
    total += r.count;
    changedFiles.push(r.file);
    Object.assign(newKeysAll, r.newModuleKeys);
  }
  console.log(`外置字面量: ${total}  改写文件: ${changedFiles.length}  新增模块键: ${Object.keys(newKeysAll).length}`);
  if (DRY) {
    console.log('（dry-run：未改文件）');
  } else {
    console.log(`已写回 messages/*.json 新增键 ${Object.keys(newKeysAll).length} 个到命名空间 ${MODULE_NS}`);
  }
}

function checkMode() {
  const targetDir = DIR_ARG ? path.join(ROOT, DIR_ARG) : path.join(ROOT, 'src');
  const files = listFiles(targetDir);
  const violations = [];
  for (const f of files) {
    let src;
    try {
      src = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const bindings = findBindings(sf);
    if (!bindings.length) continue;
    const names = new Set(bindings.map((b) => b.name));
    // 某标识符是否被「最近的函数参数」遮蔽（如模块级 helper 把 t 作为入参）：
    // 这种 t('k') 是普通函数调用，不是 useTranslations 钩子用法，跳过避免误报。
    function paramShadows(node, name) {
      let cur = node;
      while (cur) {
        if (isFunctionLike(cur) && cur.parameters) {
          for (const p of cur.parameters) {
            if (ts.isIdentifier(p.name) && p.name.text === name) return true;
            if (ts.isBindingElement(p.name) && ts.isIdentifier(p.name.name) && p.name.name.text === name) return true;
          }
        }
        cur = cur.parent;
      }
      return false;
    }
    function visit(n) {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && names.has(n.expression.text)) {
        if (paramShadows(n, n.expression.text)) {
          ts.forEachChild(n, visit);
          return;
        }
        const arg0 = n.arguments[0];
        if (arg0 && (ts.isStringLiteral(arg0) || ts.isNoSubstitutionTemplateLiteral(arg0))) {
          const ok = bindings.some((b) => b.name === n.expression.text && b.scope && n.pos >= b.scope.pos && n.end <= b.scope.end);
          if (!ok) {
            violations.push({ file: path.relative(ROOT, f), line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, call: `${n.expression.text}('${arg0.text}')` });
          }
        }
      }
      ts.forEachChild(n, visit);
    }
    visit(sf);
  }
  if (!violations.length) {
    console.log('✅ check: 所有注入的 t()/tc()/ts() 调用均在绑定作用域内，无作用域错误。');
  } else {
    console.log(`❌ check: 发现 ${violations.length} 处作用域违规：`);
    for (const v of violations) console.log(`   ${v.file}:${v.line}  ${v.call}`);
    process.exitCode = 1;
  }
}

if (CHECK) checkMode();
else main();
