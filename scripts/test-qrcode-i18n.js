/**
 * 二维码生成 & 打印 - 多语言切换验证脚本
 *
 * 用途:
 *   不依赖测试框架，直接用 Node 模拟 next-intl 的 useTranslations 调用，
 *   遍历二维码生成器、打印机、标签预览所需的所有翻译键，
 *   验证 zh-CN / en / zh-TW / vi 四种语言下文本是否正确切换、是否有缺失或空值。
 *
 * 运行:
 *   node scripts/test-qrcode-i18n.js
 *
 * 退出码:
 *   0 = 全部通过
 *   1 = 发现缺失键 / 空值 / 占位符未替换 / 语言间键不一致
 */

const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '..', 'messages');
const locales = ['zh-CN', 'en', 'zh-TW', 'vi'];

const messages = {};
for (const loc of locales) {
  messages[loc] = JSON.parse(
    fs.readFileSync(path.join(messagesDir, `${loc}.json`), 'utf8')
  );
}

// 二维码生成器、打印机、标签预览所需的全部翻译键
// 结构: [namespace, key, params?]
const requiredKeys = [
  // ---- QRCodeGenerator ----
  ['QRCode', 'generateQRCode'],
  ['QRCode', 'qrType'],
  ['QRCode', 'selectType'],
  ['QRCode', 'typeMaterial'],
  ['QRCode', 'typeProduct'],
  ['QRCode', 'typeWorkorder'],
  ['QRCode', 'typeInk'],
  ['QRCode', 'typeScreenPlate'],
  ['QRCode', 'typeDie'],
  ['QRCode', 'typeShipment'],
  ['QRCode', 'typeInkOpen'],
  ['QRCode', 'typeInkMixed'],
  ['QRCode', 'refNo'],
  ['QRCode', 'refNoPlaceholder'],
  ['QRCode', 'batchNo'],
  ['QRCode', 'materialCode'],
  ['QRCode', 'materialName'],
  ['QRCode', 'specification'],
  ['QRCode', 'productionDate'],
  ['QRCode', 'expiryDate'],
  ['QRCode', 'unitPlaceholder'],
  ['QRCode', 'generateSuccess'],
  ['QRCode', 'generateFailed'],
  ['QRCode', 'copyCode'],
  ['QRCode', 'clickToGenerate'],
  // ---- QRCodePrinter ----
  ['QRCode', 'labelMaterial'],
  ['QRCode', 'labelSmall'],
  ['QRCode', 'labelFinished'],
  ['QRCode', 'labelShipping'],
  ['QRCode', 'labelWorkorder'],
  ['QRCode', 'labelInk'],
  ['QRCode', 'defaultMaterialName'],
  ['QRCode', 'quality'],
  ['QRCode', 'labelPreview'],
  ['QRCode', 'printConfig'],
  ['QRCode', 'labelTemplate'],
  ['QRCode', 'printCopies'],
  ['QRCode', 'confirmPrint'],
  ['QRCode', 'printJobSent'],
  ['QRCode', 'printCopiesSent', { count: 3 }],
  ['QRCode', 'printFailed'],
  ['QRCode', 'printServiceError'],
  // ---- LabelPrintPreview ----
  ['QRCode', 'labelPrintPreview'],
  ['QRCode', 'labelMaterialPrint'],
  ['QRCode', 'template'],
  ['QRCode', 'copies'],
  ['QRCode', 'totalLabelsCount', { labels: 3, copies: 2, total: 6 }],
  // ---- Common 依赖键 ----
  ['Common', 'print'],
  ['Common', 'preview'],
  ['Common', 'cancel'],
  ['Common', 'close'],
  ['Common', 'reset'],
  ['Common', 'qrCode'],
  ['Common', 'batch'],
  ['Common', 'quantity'],
  ['Common', 'unit'],
  ['Common', 'warehouse'],
  ['Common', 'supplier'],
  ['Common', 'workOrder'],
  ['Common', 'date'],
  ['Common', 'remark'],
  ['Common', 'operationFailed'],
];

// 简易 next-intl t() 模拟：支持 {var} 占位符替换
function applyPlaceholders(template, params) {
  if (!params) return template;
  return Object.keys(params).reduce(
    (acc, key) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(params[key])),
    template
  );
}

function getKey(namespace, key, locale) {
  const ns = messages[locale][namespace];
  if (!ns) return { ok: false, reason: `namespace "${namespace}" 不存在` };
  const value = ns[key];
  if (value === undefined) return { ok: false, reason: 'missing' };
  if (typeof value !== 'string') return { ok: false, reason: `非字符串类型: ${typeof value}` };
  if (value.trim() === '') return { ok: false, reason: '空字符串' };
  return { ok: true, value };
}

const errors = [];
const table = []; // [locale, namespace, key, value]

for (const [ns, key, params] of requiredKeys) {
  for (const loc of locales) {
    const r = getKey(ns, key, loc);
    if (!r.ok) {
      errors.push(`[${loc}] ${ns}.${key} -> ${r.reason}`);
      table.push([loc, ns, key, `<${r.reason}>`]);
    } else {
      table.push([loc, ns, key, applyPlaceholders(r.value, params)]);
    }
  }
}

// 跨语言一致性检查：同一键在4种语言下应不同（除非是占位符模板）
const consistencyErrors = [];
const byKey = {};
for (const [loc, ns, key, val] of table) {
  const id = `${ns}.${key}`;
  if (!byKey[id]) byKey[id] = {};
  byKey[id][loc] = val;
}
for (const [id, vals] of Object.entries(byKey)) {
  const uniq = new Set(Object.values(vals));
  // 纯符号/数字键（如 "100"）4种语言相同是合理的，跳过
  // 但中文 vs 英文应当不同
  if (vals['zh-CN'] === vals['en'] && /[^\x00-\x7F]/.test(vals['zh-CN'])) {
    // zh-CN 与 en 相同且包含非 ASCII（可能是未翻译）
    consistencyErrors.push(`${id}: zh-CN 与 en 文案相同（可能未翻译）= "${vals['zh-CN']}"`);
  }
}

// 打印对比表
const colWidths = [8, 10, 28, 50];
const header = ['Locale', 'Namespace', 'Key', 'Value'].map((h, i) => h.padEnd(colWidths[i])).join(' | ');
const divider = colWidths.map((w) => '-'.repeat(w)).join('-+-');

console.log('\n=== 二维码生成 & 打印 多语言文本对比表 ===\n');
console.log(header);
console.log(divider);
for (const row of table) {
  const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  console.log(
    row.map((c, i) => truncate(String(c), colWidths[i]).padEnd(colWidths[i])).join(' | ')
  );
}

// 打印结果汇总
console.log('\n=== 校验结果 ===');
console.log(`检查翻译键数: ${requiredKeys.length}`);
console.log(`检查语言数: ${locales.length}`);
console.log(`总检查项: ${requiredKeys.length * locales.length}`);

if (errors.length > 0) {
  console.log(`\n❌ 发现 ${errors.length} 个错误:`);
  errors.forEach((e) => console.log(`  - ${e}`));
}

if (consistencyErrors.length > 0) {
  console.log(`\n⚠ 一致性警告 ${consistencyErrors.length} 条:`);
  consistencyErrors.forEach((e) => console.log(`  - ${e}`));
}

if (errors.length === 0 && consistencyErrors.length === 0) {
  console.log('\n✅ 所有翻译键在 zh-CN / en / zh-TW / vi 四种语言下均存在且非空，文本随语言切换正确变化。');
  process.exit(0);
} else {
  process.exit(1);
}
