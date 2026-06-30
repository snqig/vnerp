/**
 * Warehouse 模块硬编码中文扫描 + key 匹配脚本
 *
 * 功能：
 *   1. 扫描 src/app/[locale]/warehouse 下所有 .ts/.tsx 文件
 *   2. 识别硬编码中文字符串（未被 t()/tc()/useTranslations 包裹）
 *   3. 尝试匹配 messages/zh-CN.json 中的现有 key（基于翻译值匹配）
 *   4. 输出报告：硬编码位置 + 推荐复用 key + 缺失 key 清单
 *
 * 用法：
 *   node scripts/scan-warehouse-i18n.js
 *   node scripts/scan-warehouse-i18n.js --json   # 输出 JSON 格式
 *
 * 输出示例：
 *   [stock-adjust/page.tsx:45] "新增调整" → 未找到匹配 key（建议新增 key: "addAdjust"）
 *   [inbound/page.tsx:120] "确认入库" → 已存在 key: "confirmInbound"
 */
const fs = require('fs');
const path = require('path');

const WAREHOUSE_DIR = path.resolve(__dirname, '../src/app/[locale]/warehouse');
const MESSAGES_FILE = path.resolve(__dirname, '../messages/zh-CN.json');

// 中文字符正则（连续 2 个及以上中文）
const CN_REGEX = /[\u4e00-\u9fa5]{2,}/g;

// 需要排除的上下文（注释、import 路径等）
const SKIP_PATTERNS = [
  /^\s*\/\//, // 单行注释
  /^\s*\*/, // 多行注释续行
  /^\s*\*\//, // 多行注释结束
  /import\s.*from\s/, // import 语句
  /^\s*\*\s/, // JSDOC
];

// 已包裹的判定（t() / tc() / useTranslations 调用内的中文不视为硬编码）
function isWrappedByTranslator(line, matchIndex) {
  // 回溯查找当前中文串之前最近的函数调用
  const before = line.slice(0, matchIndex);
  // 检测 t( / tc( / t(` / t(" 等
  if (/\b(tc?|useTranslations)\s*\([^)]*$/.test(before)) return true;
  // 检测在 JSX 表达式 {t(...)} 中
  if (/\{\s*tc?\s*\([^}]*$/.test(before)) return true;
  return false;
}

// 收集所有中文串（去重），用于反向匹配 key
function collectChineseStrings(fileContent) {
  const strings = new Set();
  const lines = fileContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (SKIP_PATTERNS.some((re) => re.test(line))) continue;
    let m;
    CN_REGEX.lastIndex = 0;
    while ((m = CN_REGEX.exec(line)) !== null) {
      const text = m[0];
      if (isWrappedByTranslator(line, m.index)) continue;
      strings.add(text);
    }
  }
  return strings;
}

// 构建 value → key 反向索引（递归遍历 messages 对象）
function buildReverseIndex(obj, prefix = '', index = new Map()) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') {
      buildReverseIndex(v, fullKey, index);
    } else if (typeof v === 'string') {
      // 取中文部分作为 key（支持模板变量 {xxx}）
      const cnParts = v.match(CN_REGEX);
      if (cnParts) {
        for (const part of cnParts) {
          if (!index.has(part)) index.set(part, []);
          index.get(part).push(fullKey);
        }
      }
      // 完整值也索引
      if (!index.has(v)) index.set(v, []);
      index.get(v).push(fullKey);
    }
  }
  return index;
}

// 为硬编码串推荐 key（值匹配优先，否则按拼音/语义建议）
function recommendKey(text, reverseIndex) {
  // 精确匹配
  if (reverseIndex.has(text)) {
    return { matched: true, keys: reverseIndex.get(text) };
  }
  // 模糊：硬编码串是某个翻译值的子串
  const fuzzy = [];
  for (const [val, keys] of reverseIndex.entries()) {
    if (typeof val === 'string' && val.includes(text)) {
      fuzzy.push(...keys);
    }
  }
  if (fuzzy.length) return { matched: true, keys: [...new Set(fuzzy)] };
  return { matched: false };
}

function scanFile(filePath, reverseIndex) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    if (SKIP_PATTERNS.some((re) => re.test(line))) continue;

    let m;
    CN_REGEX.lastIndex = 0;
    while ((m = CN_REGEX.exec(line)) !== null) {
      const text = m[0];
      const col = m.index + 1;
      if (isWrappedByTranslator(line, m.index)) continue;

      const rec = recommendKey(text, reverseIndex);
      findings.push({
        file: path.relative(process.cwd(), filePath),
        line: lineNo,
        col,
        text,
        matched: rec.matched,
        recommendKeys: rec.keys || [],
      });
    }
  }
  return findings;
}

function walkDir(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkDir(full, acc);
    } else if (/\.(tsx?|ts)$/.test(e.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function main() {
  if (!fs.existsSync(WAREHOUSE_DIR)) {
    console.error('warehouse 目录不存在:', WAREHOUSE_DIR);
    process.exit(1);
  }
  if (!fs.existsSync(MESSAGES_FILE)) {
    console.error('messages 文件不存在:', MESSAGES_FILE);
    process.exit(1);
  }

  const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
  const reverseIndex = buildReverseIndex(messages);
  const files = walkDir(WAREHOUSE_DIR);

  const allFindings = [];
  for (const f of files) {
    allFindings.push(...scanFile(f, reverseIndex));
  }

  // 按文件聚合
  const byFile = new Map();
  for (const f of allFindings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }

  // 统计
  const matchedCount = allFindings.filter((f) => f.matched).length;
  const unmatchedCount = allFindings.length - matchedCount;
  const unmatchedTexts = new Set(
    allFindings.filter((f) => !f.matched).map((f) => f.text)
  );

  if (process.argv.includes('--json')) {
    console.log(
      JSON.stringify(
        {
          scannedFiles: files.length,
          totalFindings: allFindings.length,
          matched: matchedCount,
          unmatched: unmatchedCount,
          unmatchedTexts: [...unmatchedTexts],
          findings: allFindings,
        },
        null,
        2
      )
    );
    return;
  }

  // 文本报告
  console.log('=== Warehouse 模块硬编码中文扫描报告 ===\n');
  console.log(`扫描目录: ${path.relative(process.cwd(), WAREHOUSE_DIR)}`);
  console.log(`扫描文件: ${files.length}`);
  console.log(`硬编码总数: ${allFindings.length}`);
  console.log(`  已有匹配 key: ${matchedCount}`);
  console.log(`  无匹配 key: ${unmatchedCount}（需新增 key 或手动确认）`);
  console.log('');

  for (const [file, items] of byFile.entries()) {
    console.log(`\n--- ${file} (${items.length} 处) ---`);
    for (const it of items) {
      const keyHint = it.matched
        ? `→ 复用 key: ${it.recommendKeys.join(' | ')}`
        : `→ 未匹配（建议新增 key）`;
      console.log(`  L${it.line}:${it.col}  "${it.text}"  ${keyHint}`);
    }
  }

  // 缺失 key 清单
  if (unmatchedTexts.size > 0) {
    console.log('\n=== 需新增的翻译 key 建议 ===');
    let idx = 1;
    for (const t of unmatchedTexts) {
      console.log(`  ${idx}. "${t}"`);
      idx++;
    }
  }

  // 若指定 --output，写入 UTF-8 文件（避免控制台编码问题）
  const outIdx = process.argv.indexOf('--output');
  if (outIdx !== -1 && process.argv[outIdx + 1]) {
    const outPath = path.resolve(process.argv[outIdx + 1]);
    const report = {
      scannedFiles: files.length,
      totalFindings: allFindings.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
      unmatchedTexts: [...unmatchedTexts],
      findings: allFindings,
    };
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n[报告已写入] ${outPath}`);
  }
}

main();
