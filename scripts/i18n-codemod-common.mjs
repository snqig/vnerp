// i18n P1-1 codemod：把高频通用 UI 字面量抽进 Common 命名空间。
//
// 设计原则（安全优先，绝不破坏构建）：
//  1) 位置级替换：用 TS 编译器解析拿节点位置，按 start 降序拼接文本，不重打印 AST，
//     保留原格式 / 注释 / 空行。
//  2) 作用域约束：仅当「字面量所在函数」内存在 `const X = useTranslations('Common')`
//     绑定，才用 X('key') 替换；否则该字面量跳过（留给 P2 模块工作补 hook）。
//  3) 整字面量匹配：只匹配「精确等于」目标串的 JSX 文本 / JSX 属性值 / JSX 表达式串，
//     绝不子串匹配（避开 `订单状态`、`共 {count} 条`、`删除失败` 等拼接上下文）。
//  4) 不碰 API 路由（src/app/api）、error-handler、messages、scripts、tests、node_modules。
//
// 用法：
//   node scripts/i18n-codemod-common.mjs --dry-run      # 仅统计，不改文件
//   node scripts/i18n-codemod-common.mjs               # 实际改写
//
// 幂等：改写后字面量消失，重跑不会再替换。

import ts from 'typescript';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, extname } from 'node:path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');

// 整字面量 -> Common key（仅选在 messages/zh-CN.json 已有对应 key 的纯 UI 标签）
// 排除子串风险串（共/条/失败/错误）与 API 错误消息（ID不能为空/缺少必要参数 等属 P1-2）
const ALLOW = {
  '取消': 'cancel',
  '操作失败': 'operationFailed',
  '物料名称': 'materialName',
  '上一页': 'prevPage',
  '下一页': 'nextPage',
  '备注': 'remark',
  '暂无记录': 'noRecords',
  '草稿': 'draft',
  '状态': 'status',
  '物料编码': 'materialCode',
  '加载中...': 'loading',
  '原材料': 'rawMaterial',
  '已取消': 'cancelled',
  '删除失败': 'deleteFailed',
  '操作': 'operation',
};

const EXCLUDE_DIR_RE = /(?:\/|\\)(?:node_modules|\.next|messages|scripts|tests|__tests__|\.workbuddy)(?:\/|\\)/;
const EXCLUDE_FILE_RE = /(?:\/|\\)src(?:\/|\\)lib(?:\/|\\)error-handler\.ts$/;
const TEST_RE = /\.test\.(t|j)sx?$|\/__tests__\//;
const API_RE = /(?:\/|\\)src(?:\/|\\)app(?:\/|\\)api(?:\/|\\)/;

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      const rel = relative(ROOT, p).replace(/\\/g, '/');
      if (EXCLUDE_DIR_RE.test('/' + rel + '/')) continue;
      walk(p, out);
    } else if (st.isFile()) {
      const rel = relative(ROOT, p).replace(/\\/g, '/');
      if (!/\.(ts|tsx|js|jsx)$/.test(name)) continue;
      if (EXCLUDE_FILE_RE.test(rel)) continue;
      if (TEST_RE.test(rel)) continue;
      if (API_RE.test(rel)) continue;
      out.push(p);
    }
  }
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

// 找文件内所有 `const X = useTranslations('Common')` 绑定，记录其所属函数作用域
function findCommonBindings(sf) {
  const bindings = []; // { name, scope }
  function visit(n, parent) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const init = n.initializer;
      if (
        ts.isCallExpression(init) &&
        ts.isIdentifier(init.expression) &&
        init.expression.text === 'useTranslations' &&
        init.arguments.length >= 1 &&
        (ts.isStringLiteral(init.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(init.arguments[0])) &&
        init.arguments[0].text === 'Common'
      ) {
        // 找到最近的函数作用域
        let scope = parent;
        while (scope && !isFunctionLike(scope)) scope = scope.parent;
        bindings.push({ name: n.name.text, scope });
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
      if (b.scope && cur === b.scope) return b.name;
    }
    cur = cur.parent;
  }
  // 退路：若字面量本身落在该函数的作用域范围内（按位置），也算命中
  cur = node;
  while (cur) {
    for (const b of bindings) {
      if (b.scope && node.pos >= b.scope.pos && node.end <= b.scope.end) return b.name;
    }
    cur = cur.parent;
  }
  return null;
}

// 跳过已在国际化调用内的字面量
function insideI18nCall(node) {
  let cur = node.parent;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const callee = cur.expression;
      if (ts.isIdentifier(callee) && (callee.text === 't' || callee.text === 'tc' || callee.text === 'useTranslations')) {
        return true;
      }
    }
    cur = cur.parent;
  }
  return false;
}

function main() {
  const files = [];
  walk(join(ROOT, 'src'), files);

  const stats = {}; // target -> { inScope, outScope, files:Set }
  for (const k of Object.keys(ALLOW)) stats[k] = { inScope: 0, outScope: 0, files: new Set() };

  let touchedFiles = 0;
  const changed = [];

  for (const file of files) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const bindings = findCommonBindings(sf);
    if (!bindings.length) continue; // 本文件无 Common t 绑定，整文件跳过（P2 处理）

    const edits = [];
    function visit(n) {
      // JSX 文本节点
      if (ts.isJsxText(n)) {
        const txt = n.text.trim();
        if (ALLOW[txt] && !insideI18nCall(n)) {
          const b = nearestBinding(n, bindings);
          const rec = stats[txt];
          if (b) {
            rec.inScope++;
            rec.files.add(relative(ROOT, file));
            edits.push({ start: n.getStart(sf), end: n.getEnd(), repl: `{${b}('${ALLOW[txt]}')}` });
          } else {
            rec.outScope++;
          }
        }
        ts.forEachChild(n, visit);
        return;
      }
      // 字符串字面量（含 JSX 属性值 / JSX 表达式串）
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        if (ALLOW[n.text] && !insideI18nCall(n)) {
          const parent = n.parent;
          // 仅处理 JSX 上下文：属性值 或 JSX 表达式容器
          const isJsxAttr = ts.isJsxAttribute(parent);
          const isJsxExpr = parent && ts.isJsxExpression(parent);
          if (isJsxAttr || isJsxExpr) {
            const b = nearestBinding(n, bindings);
            const rec = stats[n.text];
            if (b) {
              rec.inScope++;
              rec.files.add(relative(ROOT, file));
              edits.push({ start: n.getStart(sf), end: n.getEnd(), repl: `${b}('${ALLOW[n.text]}')` });
            } else {
              rec.outScope++;
            }
          }
        }
        ts.forEachChild(n, visit);
        return;
      }
      ts.forEachChild(n, visit);
    }
    visit(sf);

    if (!edits.length) continue;
    touchedFiles++;
    if (DRY) {
      changed.push(relative(ROOT, file));
      continue;
    }
    // 按 start 降序拼接，保证位置有效
    edits.sort((a, b) => b.start - a.start);
    let out = src;
    for (const e of edits) {
      out = out.slice(0, e.start) + e.repl + out.slice(e.end);
    }
    writeFileSync(file, out, 'utf8');
    changed.push(relative(ROOT, file));
  }

  // 报告
  console.log(`\n=== i18n P1-1 codemod ${DRY ? '(DRY-RUN)' : '(APPLIED)'} ===`);
  console.log(`扫描文件: ${files.length}  命中文件: ${touchedFiles}`);
  let totalIn = 0, totalOut = 0;
  for (const k of Object.keys(ALLOW)) {
    const s = stats[k];
    totalIn += s.inScope;
    totalOut += s.outScope;
    const flag = s.inScope ? '✓' : ' ';
    console.log(
      `  ${flag} "${k}" -> ${ALLOW[k].padEnd(16)} inScope=${String(s.inScope).padStart(3)}  outScope=${String(s.outScope).padStart(3)}  files=${s.files.size}`
    );
  }
  console.log(`\n合计可替换(inScope)=${totalIn}  跳过(outScope)=${totalOut}`);
  if (DRY) {
    console.log('\n命中文件列表（前 40）:');
    for (const f of changed.slice(0, 40)) console.log('   ' + f);
    if (changed.length > 40) console.log(`   ... 共 ${changed.length} 个`);
  } else {
    console.log(`\n已改写 ${changed.length} 个文件。`);
  }
}

// 自校验：改写后重新解析，断言每个注入的 `X('key')` 都落在对应绑定函数作用域内。
function checkMode() {
  const files = [];
  walk(join(ROOT, 'src'), files);
  const allowVals = new Set(Object.values(ALLOW));
  const violations = [];
  for (const file of files) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const bindings = findCommonBindings(sf);
    if (!bindings.length) continue;
    const names = new Set(bindings.map((b) => b.name));
    function visit(n) {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && names.has(n.expression.text)) {
        const arg0 = n.arguments[0];
        if (arg0 && (ts.isStringLiteral(arg0) || ts.isNoSubstitutionTemplateLiteral(arg0)) && allowVals.has(arg0.text)) {
          // 必须在某个绑定函数的作用域内（位置范围）
          const ok = bindings.some(
            (b) => b.scope && n.pos >= b.scope.pos && n.end <= b.scope.end
          );
          if (!ok) {
            violations.push({ file: relative(ROOT, file), line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, call: `${n.expression.text}('${arg0.text}')` });
          }
        }
      }
      ts.forEachChild(n, visit);
    }
    visit(sf);
  }
  if (!violations.length) {
    console.log('✅ check: 所有注入的 Common t() 调用均在绑定作用域内，无作用域错误。');
  } else {
    console.log(`❌ check: 发现 ${violations.length} 处作用域违规：`);
    for (const v of violations) console.log(`   ${v.file}:${v.line}  ${v.call}`);
    process.exitCode = 1;
  }
}

if (process.argv.includes('--check')) {
  checkMode();
} else {
  main();
}

