#!/usr/bin/env node
/**
 * 扫描所有 src/ 下的 .tsx/.ts 文件，提取 i18n 键使用
 *
 * next-intl 的调用模式：
 *   const t = useTranslations('Purchase');  → t('key') 对应 Purchase.key
 *   const tc = useTranslations('Common');   → tc('key') 对应 Common.key
 *
 * 与 messages/zh-CN.json 对比，找出缺失的键
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

function getSrcFiles(dir, files = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'tests', 'scripts'].includes(entry)) continue;
      getSrcFiles(fullPath, files);
    } else {
      const ext = extname(fullPath);
      if (ext === '.tsx' || ext === '.ts') {
        files.push(fullPath);
      }
    }
  }
  return files;
}

/**
 * 从文件内容中提取 i18n 键
 * 返回 Set<string>，格式为 "Namespace.key"
 */
function extractI18nKeys(content) {
  const keys = new Set();

  // 1. 找出所有 useTranslations('Namespace') 调用，建立 变量名 → namespace 映射
  const varToNamespace = new Map();
  // 匹配: const t = useTranslations('Purchase');
  //       const tc = useTranslations("Common");
  //       const { t } = useTranslations('X');  (不常见)
  const useTransRegex =
    /(?:const|let|var)\s+(\w+)\s*=\s*useTranslations\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = useTransRegex.exec(content)) !== null) {
    varToNamespace.set(match[1], match[2]);
  }

  if (varToNamespace.size === 0) return keys;

  // 2. 对每个变量，扫描 变量名('key') 调用
  for (const [varName, namespace] of varToNamespace) {
    // 匹配: t('key'), t("key"), t(`key`)
    // key 只包含字母、数字、下划线、连字符
    // 不匹配包含 ${} 的模板字符串（动态键）
    const callRegex = new RegExp(
      `\\b${varName}\\(\\s*['"\`]([a-zA-Z][a-zA-Z0-9_-]*)['"\`](?:[^)]*)?\\)`,
      'g'
    );
    let callMatch;
    while ((callMatch = callRegex.exec(content)) !== null) {
      const key = callMatch[1];
      // 排除一些非 i18n 的调用（如 t('hello world') 含空格的情况已被正则排除）
      keys.add(`${namespace}.${key}`);
    }
  }

  return keys;
}

// 3. 加载 zh-CN.json 中已有的键
const zhCN = JSON.parse(readFileSync('messages/zh-CN.json', 'utf-8'));
const existingKeys = new Set();
for (const [namespace, obj] of Object.entries(zhCN)) {
  if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      existingKeys.add(`${namespace}.${key}`);
    }
  }
}

console.log(`=== Existing keys in zh-CN.json: ${existingKeys.size} ===\n`);

// 4. 扫描所有 src/ 文件
const srcFiles = getSrcFiles('src');
console.log(`=== Scanning ${srcFiles.length} source files ===\n`);

const usedKeys = new Map();
const missingKeys = new Map();

for (const filePath of srcFiles) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const keys = extractI18nKeys(content);
    for (const key of keys) {
      if (!usedKeys.has(key)) usedKeys.set(key, []);
      usedKeys.get(key).push(filePath);

      if (!existingKeys.has(key)) {
        if (!missingKeys.has(key)) missingKeys.set(key, []);
        missingKeys.get(key).push(filePath);
      }
    }
  } catch {
    // 读取失败，跳过
  }
}

console.log(`=== Total unique i18n keys used in source: ${usedKeys.size} ===`);
console.log(`=== Missing keys (not in zh-CN.json): ${missingKeys.size} ===\n`);

// 5. 按 namespace 分组输出缺失的键
const missingByNamespace = new Map();
for (const key of missingKeys.keys()) {
  const [namespace, ...rest] = key.split('.');
  const keyName = rest.join('.');
  if (!missingByNamespace.has(namespace)) missingByNamespace.set(namespace, new Map());
  missingByNamespace.get(namespace).set(keyName, missingKeys.get(key));
}

for (const [namespace, keys] of [...missingByNamespace.entries()].sort((a, b) =>
  a[0].localeCompare(b[0])
)) {
  console.log(`\n--- ${namespace} (${keys.size} missing) ---`);
  for (const [keyName, files] of [...keys.entries()].sort()) {
    const sampleFile = files[0].replace(/\\/g, '/').replace(/d:/i, '');
    console.log(`  ${namespace}.${keyName}  (used in ${files.length} files, e.g. ${sampleFile})`);
  }
}

// 6. 输出 JSON 格式的缺失键
const missingJson = {};
for (const [namespace, keys] of missingByNamespace) {
  missingJson[namespace] = {};
  for (const keyName of keys.keys()) {
    missingJson[namespace][keyName] = `TODO: ${namespace}.${keyName}`;
  }
}
console.log('\n\n=== JSON for补全 ===');
console.log(JSON.stringify(missingJson, null, 2));
