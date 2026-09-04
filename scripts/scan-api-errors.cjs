#!/usr/bin/env node
/**
 * 枚举 src/app/api 下的中文硬编码，区分「真实错误消息」与「配置/种子数据标签」。
 * 数据源：eslint-baseline.json（i18n/no-chinese-hardcode 存量冻结线）。
 * 输出：按文件统计 + 错误消息去重清单（供 P1-2 路由级 code 化 codemod 设计）。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const BASE = path.join(ROOT, 'eslint-baseline.json');
const raw = JSON.parse(fs.readFileSync(BASE, 'utf8'));

// 从规则消息提取被硬编码的中文文本
const TEXT_RE = [
  /禁止[^"]*?硬编码中文(?:文本|参数):\s*"([^"]+)"/,
  /硬编码中文(?:文本|参数):\s*"([^"]+)"/,
];
function extractText(msg) {
  for (const re of TEXT_RE) {
    const m = re.exec(msg || '');
    if (m) return m[1];
  }
  return null;
}

const API_RE = /[\\/]src[\\/]app[\\/]api[\\/]/i;
// 真实错误消息特征词（命中其一即视为错误消息，而非配置/种子标签）
const ERR_RE =
  /(失败|错误|异常|不能为空|缺少|无效|不存在|已存在|超出|超时|拒绝|未授权|违规|冲突|格式|必填|重复|过期|不足|不允许|无法|有误|不正确|不合法|已过期|必须|不可|不能|没有|无权限|校验|被占用|不存在的|已删除|已被|受限|不正确|不通过|驳回|失败)/;
// 显式已知「配置/种子数据」文件（非错误，P1-2 排除）
const CONFIG_FILE_RE =
  /[\\/](settings[\\/]system|system[\\/]config|system[\\/]user[\\/]fix-names|init[\\/]warehouse|init[\\/]data|seed[\\/]|system[\\/]dict|system[\\/]menu|system[\\/]role[\\/]init)[\\/]/i;

const apiFiles = raw.filter((f) => f.filePath && API_RE.test(f.filePath));

const perFile = []; // {file, total, err, cfg, errMsgs:[]}
const errMsgSet = new Map(); // msg -> Set(files)
let totalHard = 0,
  totalErr = 0,
  totalCfg = 0;

for (const f of apiFiles) {
  const rel = f.filePath.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, '');
  const isCfgFile = CONFIG_FILE_RE.test(f.filePath);
  const msgs = new Set();
  let e = 0,
    c = 0;
  for (const m of f.messages || []) {
    if (m.ruleId !== 'i18n/no-chinese-hardcode') continue;
    const t = extractText(m.message);
    if (!t) continue;
    totalHard++;
    msgs.add(t);
    const isErr = ERR_RE.test(t);
    if (isCfgFile && !isErr) {
      c++;
      totalCfg++;
    } else if (isErr) {
      e++;
      totalErr++;
      if (!errMsgSet.has(t)) errMsgSet.set(t, new Set());
      errMsgSet.get(t).add(rel);
    } else {
      // 非配置文件、也非明显错误词的（UI 标签等）—— 归为 other，计 cfg 侧但不算 error
      c++;
      totalCfg++;
    }
  }
  if (msgs.size) {
    perFile.push({ file: rel, total: msgs.size, err: e, cfg: c });
  }
}

// 排序输出
perFile.sort((a, b) => b.err - a.err);
console.log('=== API 路由中文硬编码概览 ===');
console.log('api 文件数(含硬编码):', perFile.length);
console.log('api 硬编码中文短语总数:', totalHard);
console.log('  ├ 真实错误消息(估算):', totalErr);
console.log('  └ 配置/种子/其他标签(估算):', totalCfg);
console.log('错误消息去重条数:', errMsgSet.size);

console.log('\n=== 按错误消息数排序的文件 Top 30 ===');
perFile.slice(0, 30).forEach((p) => {
  console.log(`  ${String(p.err).padStart(4)} err / ${String(p.cfg).padStart(4)} cfg  ${p.file}`);
});

// 输出去重错误消息清单（带文件数）
console.log('\n=== 去重错误消息清单（按出现文件数降序）===');
const sorted = [...errMsgSet.entries()].sort((a, b) => b[1].size - a[1].size);
sorted.forEach(([msg, files], i) => {
  console.log(`${String(i + 1).padStart(4)}. [${files.size} file(s)] ${msg}`);
});

// 落盘报告
const report = {
  generatedAt: new Date().toISOString(),
  apiFileCount: perFile.length,
  totalHard,
  totalErr,
  totalCfg,
  uniqueErrMsg: errMsgSet.size,
  perFile,
  uniqueErrMsgs: sorted.map(([msg, files]) => ({ msg, files: [...files] })),
};
fs.writeFileSync(path.join(ROOT, 'scripts', 'api-errors-report.json'), JSON.stringify(report, null, 2));
console.log('\n报告已写入 scripts/api-errors-report.json');
