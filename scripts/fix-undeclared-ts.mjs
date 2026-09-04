/**
 * 修复 "@/warehouse/inbound" 暴露出的系统性缺陷：
 *   文件里调用了 ts('k_xxx')，但从未声明过 `const ts = useTranslations('<NS>')`，
 *   运行时抛 ReferenceError: ts is not defined。
 *
 * 本脚本用 TypeScript 编译器 API 做「作用域精确」修复：
 *   1. 找到所有未绑定的 ts(...) 调用
 *   2. 向上找到它所在的**函数/组件作用域**（不是文件顶部，因为可能嵌套在子组件里）
 *   3. 根据 ts('k_xxx') 用到的 key，从 messages/zh-CN.json 反查它属于哪个 namespace
 *   4. 在该作用域的**首行**插入 const ts = useTranslations('<NS>');  （hooks 规则下首行最安全）
 *   5. 若文件未 import useTranslations，自动补 import
 *
 * 幂等：已声明 ts 的文件会被跳过。
 * 用法：
 *   node scripts/fix-undeclared-ts.mjs            # 仅报告（dry-run）
 *   node scripts/fix-undeclared-ts.mjs --apply    # 实际写入
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');

// 1) 构建 key -> Set(namespace) 反查表
const messages = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages/zh-CN.json'), 'utf8'));
const keyToNs = new Map();
for (const [ns, dict] of Object.entries(messages)) {
  if (!dict || typeof dict !== 'object') continue;
  for (const key of Object.keys(dict)) {
    if (!keyToNs.has(key)) keyToNs.set(key, new Set());
    keyToNs.get(key).add(ns);
  }
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.workbuddy', '.git'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 文件是否声明过 ts（任何形式） */
function declaresTs(src) {
  return (
    /(const|let|var)\s+ts\s*=/.test(src) ||
    /function\s+ts\s*\(/.test(src) ||
    /import\s+[^;]*\bts\b[^;]*from/.test(src)
  );
}

/** 文件是否把 ts 当作参数（不做修复，避免误判） */
function tsIsParam(src) {
  return /\([^)]*\bts\b[^)]*\)\s*=>/.test(src) || /function\s*\w*\s*\([^)]*\bts\b/.test(src);
}

const targets = [];
for (const file of walk(path.join(ROOT, 'src'))) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/(?<![\w.])ts\(/.test(src)) continue; // 没有 ts( 调用
  if (declaresTs(src)) continue; // 已声明，跳过（幂等）
  if (tsIsParam(src)) {
    console.log(`SKIP(疑似参数) ${path.relative(ROOT, file)}`);
    continue;
  }
  targets.push(file);
}

const results = [];

for (const file of targets) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);

  // 收集：作用域 -> 该作用域内 ts(...) 用到的 key 集合
  const scopeKeys = new Map(); // block node -> Set(key)
  const scopeNodes = [];

  // 取「最近的外层组件/自定义 Hook」作用域，而不是最内层的回调。
  // 关键：useTranslations 是 Hook，绝不能插进 useEffect(async () => {...}) / .map(() => {...})
  // 这类回调里（违反 hooks 规则）。因此只在「名字像组件(大写开头)或 Hook(use 开头)」的函数体内插入。
  const nameOfFn = (fn) => {
    if (ts.isFunctionDeclaration(fn) || ts.isFunctionExpression(fn)) return fn.name?.text || '';
    if (ts.isArrowFunction(fn)) {
      const v = fn.parent;
      if (v && ts.isVariableDeclaration(v) && ts.isIdentifier(v.name)) return v.name.text;
      return '';
    }
    if (ts.isMethodDeclaration(fn)) return ts.isIdentifier(fn.name) ? fn.name.text : '';
    return '';
  };
  const isComponentish = (fn) => {
    const n = nameOfFn(fn);
    return /^[A-Z]/.test(n) || /^use/.test(n);
  };
  const findEnclosingBlock = (node) => {
    const chain = []; // 由内到外
    let cur = node.parent;
    while (cur) {
      if (ts.isBlock(cur) && cur.parent && ts.isFunctionLike(cur.parent)) chain.push(cur);
      cur = cur.parent;
    }
    if (chain.length === 0) return null;
    const pick = chain.find((b) => isComponentish(b.parent));
    return pick || chain[chain.length - 1]; // 兜底：最外层函数
  };

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'ts' &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const block = findEnclosingBlock(node);
      if (!block) {
        console.log(`SKIP(无函数作用域) ${rel}: ${node.arguments[0].text}`);
      } else {
        if (!scopeKeys.has(block)) {
          scopeKeys.set(block, new Set());
          scopeNodes.push(block);
        }
        scopeKeys.get(block).add(node.arguments[0].text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (scopeNodes.length === 0) continue;

  // 该文件里 useTranslations 用过的 namespace（用于消歧）
  const nsUsedInFile = [...src.matchAll(/useTranslations\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);

  const insertions = []; // {pos, text}
  let unresolved = false;

  for (const block of scopeNodes) {
    const keys = [...scopeKeys.get(block)];

    // 反查：同时包含所有 key 的 namespace
    let candidates = null;
    for (const k of keys) {
      const set = keyToNs.get(k);
      if (!set || set.size === 0) {
        console.log(`WARN key 不在 zh-CN: ${rel} -> ${k}`);
        candidates = new Set();
        break;
      }
      candidates = candidates === null ? new Set(set) : new Set([...candidates].filter((n) => set.has(n)));
    }
    if (candidates && candidates.size === 0 && keys.length) {
      // 没有 namespace 同时包含所有 key -> 退化为逐个 key 的多数派
      const tally = new Map();
      for (const k of keys) for (const n of keyToNs.get(k) || []) tally.set(n, (tally.get(n) || 0) + 1);
      candidates = new Set([...tally.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n));
    }

    let ns = null;
    if (candidates && candidates.size) {
      // 优先：该文件/作用域已经用过的 namespace
      const preferred = nsUsedInFile.find((n) => candidates.has(n));
      ns = preferred || [...candidates][0];
    }
    if (!ns) {
      console.log(`UNRESOLVED namespace: ${rel} keys=${keys.join(',')}`);
      unresolved = true;
      continue;
    }

    // 在该 block 的首个语句前插入（hooks 必须无条件在顶部调用，首行最安全）
    const firstStmt = block.statements[0];
    const insertPos = firstStmt ? firstStmt.getStart(sf) : block.getStart(sf) + 1;
    const indent = '  ';
    insertions.push({
      pos: insertPos,
      text: `const ts = useTranslations('${ns}');\n${indent}${indent}`,
      ns,
      keys,
    });
  }

  if (unresolved && insertions.length === 0) continue;

  // 需要补 import 吗
  const needsImport = !/import\s*\{[^}]*useTranslations[^}]*\}\s*from\s*'next-intl'/.test(src);

  results.push({ file: rel, insertions, needsImport, src });
}

// 输出报告
console.log('\n================ 修复计划 ================');
for (const r of results) {
  console.log(`\n${r.file}`);
  for (const i of r.insertions) {
    console.log(`   + const ts = useTranslations('${i.ns}');   (keys: ${i.keys.join(', ')})`);
  }
  if (r.needsImport) console.log('   + import { useTranslations } from "next-intl";');
}
console.log(`\n合计 ${results.length} 个文件待修复`);

if (!APPLY) {
  console.log('\n[dry-run] 未写入。加 --apply 执行。');
  process.exit(0);
}

// 写入
let changed = 0;
for (const r of results) {
  let src = r.src;
  if (r.needsImport) {
    // 插到最后一个 import 之后
    const lines = src.split('\n');
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) if (/^import\s/.test(lines[i])) lastImport = i;
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, "import { useTranslations } from 'next-intl';");
      src = lines.join('\n');
    }
  }
  // 从后往前插入，避免位置偏移
  const sorted = [...r.insertions].sort((a, b) => b.pos - a.pos);
  for (const ins of sorted) {
    src = src.slice(0, ins.pos) + ins.text + src.slice(ins.pos);
  }
  fs.writeFileSync(path.join(ROOT, r.file), src, 'utf8');
  changed++;
}
console.log(`\n已写入 ${changed} 个文件。`);
