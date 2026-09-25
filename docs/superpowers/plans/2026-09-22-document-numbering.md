# 单据编号统一收敛 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 把全项目约 100 处单号生成统一到一个「模板串 + 统一序列表」引擎，并在 settings/config 中可配置、可预览。

**架构：** `src/lib/document-numbering.ts` 成为唯一编号入口：从 `sys_config.numbering.<docType>` 读模板 → 渲染日期/上下文占位符 → 从新表 `sys_document_sequence` 原子取流水。旧体系（`global-config.generateDocNo` + 15 个前缀 getter + 各模块本地生成函数）在一个发布周期后删除，期间保留前缀别名回退。

**技术栈：** Next.js App Router、TypeScript、MySQL（mysql2）、Vitest（`npm run test:unit:run`）、next-intl（4 语言）。

**规格：** `docs/superpowers/specs/2026-09-22-document-numbering-design.md`

---

## 范围检查

规格只有**一个子系统**（编号引擎），其余是机械化的调用点迁移。因此拆为**单个计划**，任务按「引擎 → 迁移 → UI → 清理」顺序排列。迁移任务按模块分组（对应规格第 13 节的 5 个批次），每组结束即可独立验证。

**不纳入**（规格第 1.3、7.11 节）：主数据编码（物料/客户/供应商/仓库/部门/角色）、种子脚本固定编号、存量单据号改写。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/lib/doc-types.ts`（新建） | 83 个 docType 的常量数组 + 默认模板表（纯 ASCII，无中文） |
| `src/lib/document-numbering.ts`（重写核心） | 模板解析/渲染/校验/周期推导/取号/预览/规则缓存/旧键别名回退 |
| `src/lib/document-numbering.test.ts`（新建） | 引擎单测（纯函数 + 取号） |
| `tests/unit/document-numbering-concurrency.test.ts`（新建） | 并发取号不重复 |
| `database/migrations/088_document_numbering.sql`（新建） | 建序列表 + 写 83 条规则种子 + 初始化 last_seq |
| `src/app/api/system/config/numbering-preview/route.ts`（新建） | 预览与模板校验只读接口 |
| `src/app/[locale]/settings/config/numbering-rules-panel.tsx`（新建） | 编号规则 Tab 的列表 + 编辑弹窗（独立组件，避免 page.tsx 继续膨胀） |
| `src/app/[locale]/settings/config/page.tsx`（修改） | 挂载新分组与面板 |
| `messages/{zh-CN,zh-TW,en,vi}.json`（修改） | 新增编号规则 UI 文案键 |
| 迁移目标文件（见任务 13-17） | 各模块的单号生成点改为调用引擎 |

`getConfig` 及非编号类 getter（`getMouldLifeDays`、`getInkOpenedShelfLife` 等）**保留**，`global-config.ts` 不删文件、只删编号相关导出。

---

## 任务 1：docType 常量与默认模板表

**文件：**
- 创建：`src/lib/doc-types.ts`

- [ ] **步骤 1：创建 docType 常量与默认模板**

```ts
/**
 * 编号规则的单据类型清单与默认模板。
 * 模板为纯 ASCII 占位符串，不含业务文案；中文名存放在 sys_config.config_name。
 */

export const DEFAULT_TEMPLATES: Record<string, string> = {
  // 销售
  sales_order: 'ORD{YYYYMMDD}{SEQ:6}',
  sample_order: 'SP{YYYYMMDD}{SEQ:4}',
  delivery: 'DL{YYYYMMDD}{SEQ:6}',
  shipment: 'SH{YYYYMMDD}{SEQ:4}',
  return_order: 'RT{YYYYMMDD}{SEQ:6}',
  reconciliation: 'RC{YYYYMMDD}{SEQ:6}',
  quote: 'QT{YYYYMMDD}{SEQ:5}',
  // 采购
  purchase_request: 'PR{YYYYMMDD}{SEQ:6}',
  purchase_order: 'PO{YYYYMMDD}{SEQ:6}',
  purchase_return: 'PRT{YYYYMMDD}{SEQ:6}',
  purchase_reconcile: 'RC{YYYYMMDD}{SEQ:6}',
  contract_review: 'CR{YYYYMMDD}{SEQ:4}',
  // 生产
  work_order: 'WO{YYYYMMDD}{SEQ:6}',
  sample_work_order: 'SWO{YYYYMMDD}{SEQ:5}',
  material_requisition: 'MR{YYYYMMDD}{SEQ:4}',
  material_issue: 'MI{YYYYMMDD}{SEQ:4}',
  material_pick: 'MP{YYYYMMDD}{SEQ:4}',
  material_return: 'MRT{YYYYMMDD}{SEQ:4}',
  process_report: 'WR{YYYYMMDD}{SEQ:4}',
  production_process: 'PCS{YYYYMMDD}{SEQ:4}',
  production_schedule: 'PS{YYYYMMDD}{SEQ:4}',
  finish_inbound: 'FI{YYYYMMDD}{SEQ:4}',
  mrp_run: 'MRP{YYYYMMDD}{SEQ:4}',
  bom: 'BOM{YYYYMMDD}{SEQ:3}',
  // 仓库
  inbound: 'INB{YYYYMMDD}{SEQ:6}',
  outbound: 'OTB{YYYYMMDD}{SEQ:6}',
  sales_outbound: 'SOB{YYYYMMDD}{SEQ:6}',
  production_inbound: 'PI{YYYYMMDD}{SEQ:4}',
  transfer: 'TR{YYYYMMDD}{SEQ:6}',
  stocktaking: 'ST{YYYYMMDD}{SEQ:6}',
  split_order: 'FJ{YYYYMMDD}{SEQ:4}',
  material_label: 'LBL-{YYYYMMDD}-{SEQ:4}',
  cutting_record: 'CUT{YYYYMMDD}{SEQ:4}',
  cutting_label: 'LBL{YYYYMMDD}{SEQ:4}',
  inbound_label: 'IL{YYYYMMDD}{SEQ:5}',
  // 批次与库存事务
  batch: 'B{YYMMDD}{SEQ:4}',
  batch_whole_split: 'SP{YYYYMMDD}{SEQ:4}',
  batch_slit: 'SC{YYYYMMDD}{SEQ:4}',
  batch_work_order: 'WO{WO_NO}{TS:6}',
  batch_finish_order: 'FN{FINISH_ORDER_ID}',
  batch_transfer: 'TRF-{TRANSFER_NO}-{MATERIAL_CODE}',
  batch_outsource: 'OR{RECEIVE_NO}{ID}',
  batch_ink_mixed: 'MIX{YYYYMMDD}{SEQ:4}',
  batch_ink_dispatch: 'INK{YYYYMMDD}{SEQ:4}',
  batch_small: 'SM-{PARENT_QR}-{TS}',
  batch_remainder: 'RM-{PARENT_QR}-{TS}',
  inventory_trans: 'TRX{YYYYMMDDHHmmss}{SEQ:4}',
  cost_trans: 'COST{WO_NO}{TS:6}{SEQ:2}',
  // 质检
  incoming_inspection: 'IQC{YYYYMMDD}{SEQ:3}',
  process_inspection: 'QI{YYYYMMDD}{SEQ:4}',
  final_inspection: 'FPR{YYYYMMDD}{SEQ:4}',
  unqualified: 'UQ-{YYYYMMDD}-{SEQ:4}',
  unqualified_handle: 'UNQ-{YYYY}-{MMDD}-{SEQ:3}',
  lab_test: 'LAB-{YYYYMMDD}-{SEQ:4}',
  // 财务
  receivable: 'REC{YYYYMMDD}{SEQ:6}',
  payable: 'PAY{YYYYMMDD}{SEQ:6}',
  receipt: 'RPT{YYYYMMDD}{SEQ:6}',
  payment: 'PMT{YYYYMMDD}{SEQ:6}',
  voucher: 'VCH{YYYYMMDD}{SEQ:6}',
  invoice_purchase: 'PI{YYYYMMDD}{SEQ:3}',
  invoice_sales: 'SI{YYYYMMDD}{SEQ:3}',
  expense: 'EXP{YYYYMMDD}{SEQ:3}',
  // 样品 / 标准卡 / 印前
  sample_process_card: 'SPC{YYYYMMDD}{SEQ:5}',
  sample_process_template: 'SPT{YYYYMMDD}{SEQ:5}',
  standard_card: '{SC_TYPE}{YYYYMMDD}{SEQ:4}',
  standard_card_version: '{CARD_NO}-V{VERSION}',
  mass_process_card: '{CARD_NO}-M',
  sample_to_mass: 'STM-{YYYYMMDD}-{SEQ:3}',
  process_card: 'PC{YYYYMMDD}{SEQ:4}',
  trace: 'TRC{YYYYMMDD}{SEQ:6}',
  material_qr: 'MAT{MATERIAL_ID}{TS}',
  ink_color: 'CLR{YYYYMMDD}{SEQ:4}',
  ink_formula_version: 'V{MAJOR}.{MINOR}',
  // 设备 / 人事
  equipment: 'EQ-{YYYYMMDD}-{SEQ:4}',
  maintenance_plan: 'MP{YYYYMMDD}{SEQ:4}',
  maintenance_record: 'EQMR{YYYYMMDD}{SEQ:4}',
  equipment_scrap: 'BF{YYYYMMDD}{SEQ:4}',
  equipment_repair: 'WX{YYYYMMDD}{SEQ:4}',
  equipment_calibration: 'JD{YYYYMMDD}{SEQ:4}',
  die: 'DIE{YYYYMMDD}{SEQ:4}',
  die_maintenance: 'MT{YYYYMMDD}{SEQ:4}',
  employee: 'EMP{YYYYMMDD}-{SEQ:4}',
};

export const NUMBERING_DOC_TYPES: string[] = Object.keys(DEFAULT_TEMPLATES);

export function getDefaultTemplate(docType: string): string | undefined {
  return DEFAULT_TEMPLATES[docType];
}
```

- [ ] **步骤 2：验证类型检查通过**

运行：`npm run ts-check`
预期：新增文件无报错（仓库其余存量报错与本次无关）

- [ ] **步骤 3：Commit**

```bash
git add src/lib/doc-types.ts
git commit -m "feat(numbering): 新增 docType 常量与默认模板表"
```

---

## 任务 2：模板解析、校验与周期推导（纯函数）

**文件：**
- 创建：`src/lib/document-numbering.test.ts`
- 修改：`src/lib/document-numbering.ts`（新增纯函数，暂不改动既有导出）

- [ ] **步骤 1：编写失败的测试**

```ts
import { describe, it, expect } from 'vitest';
import {
  validateDocumentNoTemplate,
  resolveResetPeriod,
  parseTemplate,
} from './document-numbering';

describe('validateDocumentNoTemplate', () => {
  it('合法模板返回 valid=true 并列出占位符', () => {
    const r = validateDocumentNoTemplate('UNQ-{YYYY}-{MMDD}-{SEQ:3}');
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.placeholders).toEqual(['YYYY', 'MMDD', 'SEQ:3']);
  });

  it('空模板报错', () => {
    expect(validateDocumentNoTemplate('').valid).toBe(false);
  });

  it('未闭合花括号报错', () => {
    const r = validateDocumentNoTemplate('ORD{YYYYMMDD');
    expect(r.valid).toBe(false);
  });

  it('未知占位符报错', () => {
    const r = validateDocumentNoTemplate('ORD{FOO-BAR}{SEQ:3}');
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('FOO-BAR');
  });

  it('多个 {SEQ:n} 报错', () => {
    const r = validateDocumentNoTemplate('X{SEQ:2}{SEQ:3}');
    expect(r.valid).toBe(false);
  });

  it('只有 {SEQ:n} 没有字面量报错', () => {
    const r = validateDocumentNoTemplate('{SEQ:3}');
    expect(r.valid).toBe(false);
  });

  it('派生模板（无 SEQ）合法', () => {
    expect(validateDocumentNoTemplate('{CARD_NO}-V{VERSION}').valid).toBe(true);
  });
});

describe('resolveResetPeriod', () => {
  it('含 MMDD 判定为按日', () => {
    expect(resolveResetPeriod('UNQ-{YYYY}-{MMDD}-{SEQ:3}')).toBe('daily');
  });
  it('含 YYMMDD 判定为按日', () => {
    expect(resolveResetPeriod('B{YYMMDD}{SEQ:4}')).toBe('daily');
  });
  it('含 TS 判定为按日', () => {
    expect(resolveResetPeriod('TRX{YYYYMMDDHHmmss}{SEQ:4}')).toBe('daily');
  });
  it('仅含 YYYYMM 判定为按月', () => {
    expect(resolveResetPeriod('V{YYYYMM}{SEQ:4}')).toBe('monthly');
  });
  it('仅含 YYYY 判定为按年', () => {
    expect(resolveResetPeriod('X{YYYY}{SEQ:4}')).toBe('yearly');
  });
  it('不含日期判定为不重置', () => {
    expect(resolveResetPeriod('DOC{SEQ:4}')).toBe('global');
  });
  it('含上下文变量不影响周期判定', () => {
    expect(resolveResetPeriod('{SC_TYPE}{YYYYMMDD}{SEQ:4}')).toBe('daily');
  });
});

describe('parseTemplate', () => {
  it('SEQ 位于中间时正确切分前后缀', () => {
    const p = parseTemplate('UQ-{YYYYMMDD}-{SEQ:4}-X');
    expect(p.seqLength).toBe(4);
    expect(p.prefix).toBe('UQ-{YYYYMMDD}-');
    expect(p.suffix).toBe('-X');
  });
  it('无 SEQ 时 seqLength 为 null', () => {
    const p = parseTemplate('{CARD_NO}-M');
    expect(p.seqLength).toBeNull();
    expect(p.variables).toEqual(['CARD_NO']);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm run test:unit:run -- src/lib/document-numbering.test.ts`
预期：FAIL，报错 `parseTemplate is not a function` / 导入失败

- [ ] **步骤 3：实现纯函数**

在 `src/lib/document-numbering.ts` **文件顶部**（现有内容之前）插入：

```ts
import { getDefaultTemplate } from './doc-types';

export type DocumentNumberContext = Record<string, string | number | null | undefined>;

export class DocumentNumberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentNumberError';
  }
}

/** 日期/时刻占位符（不含 TS:n，其带参数单独处理） */
const DATE_TOKENS = [
  'YYYYMMDDHHmmss',
  'YYYYMMDD',
  'YYMMDD',
  'YYYYMM',
  'MMDD',
  'HHmmss',
  'YYYY',
  'YY',
  'MM',
  'DD',
] as const;

const DAILY_TOKENS = ['DD', 'MMDD', 'YYMMDD', 'YYYYMMDD', 'HHmmss', 'YYYYMMDDHHmmss'];
const MONTHLY_TOKENS = ['MM', 'YYYYMM'];

const PLACEHOLDER_RE = /\{([^{}]*)\}/g;
const TS_RE = /^TS:\d+$/;
const SEQ_RE = /^SEQ:(\d+)$/;
const VAR_RE = /^[A-Z][A-Z0-9_]*$/;

export interface ParsedTemplate {
  prefix: string;
  suffix: string;
  seqLength: number | null;
  variables: string[];
}

function readTokens(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER_RE)].map((m) => m[1]);
}

export function validateDocumentNoTemplate(template: string): {
  valid: boolean;
  errors: string[];
  placeholders: string[];
} {
  const errors: string[] = [];
  const placeholders = readTokens(template);

  if (!template || !template.trim()) {
    return { valid: false, errors: ['模板不能为空'], placeholders: [] };
  }

  const opens = (template.match(/\{/g) || []).length;
  const closes = (template.match(/\}/g) || []).length;
  if (opens !== closes) {
    errors.push('模板中存在未闭合的花括号');
  }

  let seqCount = 0;
  for (const token of placeholders) {
    if ((DATE_TOKENS as readonly string[]).includes(token) || TS_RE.test(token)) continue;
    if (SEQ_RE.test(token)) {
      seqCount += 1;
      continue;
    }
    if (VAR_RE.test(token)) continue;
    errors.push(`无法识别的占位符 {${token}}`);
  }

  const seqMatch = SEQ_RE.exec(template.match(/\{SEQ:\d+\}/)?.[0]?.slice(1, -1) ?? '');
  if (seqMatch) {
    const len = Number(seqMatch[1]);
    if (len < 1 || len > 10) errors.push('{SEQ:n} 的 n 必须在 1-10 之间');
  }

  if (seqCount > 1) errors.push('模板最多只能包含一个 {SEQ:n}');

  const literal = template.replace(PLACEHOLDER_RE, '').trim();
  if (!literal && seqCount === 1) errors.push('模板至少需要包含一个非流水片段');

  return { valid: errors.length === 0, errors, placeholders };
}

export function resolveResetPeriod(template: string): 'daily' | 'monthly' | 'yearly' | 'global' {
  const tokens = readTokens(template);
  if (tokens.some((t) => DAILY_TOKENS.includes(t) || TS_RE.test(t))) return 'daily';
  if (tokens.some((t) => MONTHLY_TOKENS.includes(t))) return 'monthly';
  if (tokens.some((t) => t === 'YYYY' || t === 'YY')) return 'yearly';
  return 'global';
}

export function parseTemplate(template: string): ParsedTemplate {
  const seqTokenMatch = /\{(SEQ:\d+)\}/.exec(template);
  const variables = readTokens(template).filter(
    (t) =>
      !(DATE_TOKENS as readonly string[]).includes(t) &&
      !TS_RE.test(t) &&
      !SEQ_RE.test(t) &&
      VAR_RE.test(t)
  );
  if (!seqTokenMatch) {
    return { prefix: template, suffix: '', seqLength: null, variables };
  }
  const start = seqTokenMatch.index;
  const end = start + seqTokenMatch[0].length;
  const seqLength = Number(SEQ_RE.exec(seqTokenMatch[1])![1]);
  return {
    prefix: template.slice(0, start),
    suffix: template.slice(end),
    seqLength,
    variables,
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm run test:unit:run -- src/lib/document-numbering.test.ts`
预期：PASS（18 个用例全绿）

- [ ] **步骤 5：Commit**

```bash
git add src/lib/document-numbering.ts src/lib/document-numbering.test.ts
git commit -m "feat(numbering): 模板解析、校验与重置周期推导"
```

---

## 任务 3：渲染（日期 / 时刻 / 上下文变量）

**文件：**
- 修改：`src/lib/document-numbering.test.ts`
- 修改：`src/lib/document-numbering.ts`

- [ ] **步骤 1：编写失败的测试**

追加到 `src/lib/document-numbering.test.ts`：

```ts
import { renderTemplate } from './document-numbering';

describe('renderTemplate', () => {
  const now = new Date(2026, 8, 22, 14, 30, 12, 456); // 2026-09-22 14:30:12.456

  it('渲染全部日期片段', () => {
    const out = renderTemplate(
      '{YYYY}|{YY}|{MM}|{DD}|{MMDD}|{YYMMDD}|{YYYYMM}|{YYYYMMDD}|{HHmmss}|{YYYYMMDDHHmmss}',
      now,
      {}
    );
    expect(out).toBe('2026|26|09|22|0922|260922|202609|20260922|143012|20260922143012');
  });

  it('{TS:n} 取毫秒时间戳后 n 位', () => {
    const out = renderTemplate('{TS:6}', now, {});
    expect(out).toBe(String(now.getTime()).slice(-6));
  });

  it('上下文变量按大写匹配', () => {
    expect(renderTemplate('MAT{MATERIAL_ID}', now, { material_id: 11 })).toBe('MAT11');
  });

  it('缺少上下文变量时抛错', () => {
    expect(() => renderTemplate('MAT{MATERIAL_ID}', now, {})).toThrow(/MATERIAL_ID/);
  });

  it('非严格模式保留未解析占位符并返回缺失清单', () => {
    const r = renderTemplate('MAT{MATERIAL_ID}', now, {}, { strict: false });
    expect(r.text).toBe('MAT{MATERIAL_ID}');
    expect(r.missing).toEqual(['MATERIAL_ID']);
  });

  it('空字符串变量视为缺失', () => {
    expect(() => renderTemplate('X{WO_NO}', now, { wo_no: '' })).toThrow(/WO_NO/);
  });

  it('不替换 {SEQ:n}', () => {
    expect(renderTemplate('X{SEQ:3}', now, {})).toBe('X{SEQ:3}');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm run test:unit:run -- src/lib/document-numbering.test.ts`
预期：FAIL，`renderTemplate is not a function`

- [ ] **步骤 3：实现渲染**

追加到 `src/lib/document-numbering.ts`：

```ts
function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

function dateTokenValue(token: string, now: Date): string | null {
  const y = now.getFullYear();
  const mo = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const map: Record<string, string> = {
    YYYY: String(y),
    YY: pad(y % 100),
    MM: mo,
    DD: d,
    MMDD: `${mo}${d}`,
    YYMMDD: `${pad(y % 100)}${mo}${d}`,
    YYYYMM: `${y}${mo}`,
    YYYYMMDD: `${y}${mo}${d}`,
    HHmmss: `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
    YYYYMMDDHHmmss: `${y}${mo}${d}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  };
  return map[token] ?? null;
}

export function renderTemplate(
  template: string,
  now: Date,
  ctx: DocumentNumberContext,
  options: { strict?: boolean } = {}
): { text: string; missing: string[] } {
  const strict = options.strict !== false;
  const missing: string[] = [];
  const ctxUpper: Record<string, string> = {};
  Object.entries(ctx).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    const s = String(v);
    if (s === '') return;
    ctxUpper[k.toUpperCase()] = s;
  });

  const text = template.replace(PLACEHOLDER_RE, (full, token: string) => {
    const dateVal = dateTokenValue(token, now);
    if (dateVal !== null) return dateVal;
    const ts = /^TS:(\d+)$/.exec(token);
    if (ts) return String(now.getTime()).slice(-Number(ts[1]));
    if (SEQ_RE.test(token)) return full;
    const v = ctxUpper[token];
    if (v !== undefined) return v;
    missing.push(token);
    if (strict) throw new DocumentNumberError(`缺少编号上下文变量: ${token}`);
    return full;
  });

  return { text, missing };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm run test:unit:run -- src/lib/document-numbering.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/lib/document-numbering.ts src/lib/document-numbering.test.ts
git commit -m "feat(numbering): 模板渲染与上下文变量校验"
```

---

## 任务 4：规则读取、缓存与旧键别名回退

**文件：**
- 修改：`src/lib/document-numbering.ts`

- [ ] **步骤 1：实现规则读取**

在 `src/lib/document-numbering.ts` 中追加：

```ts
interface RuleCache {
  data: Record<string, string>;
  timestamp: number;
}

let ruleCache: RuleCache | null = null;
const RULE_CACHE_TTL = 60 * 1000;

export function clearNumberingRuleCache(): void {
  ruleCache = null;
}

/** 读取全部 numbering.* 规则（60s 缓存） */
export async function getNumberingRules(): Promise<Record<string, string>> {
  if (ruleCache && Date.now() - ruleCache.timestamp < RULE_CACHE_TTL) {
    return { ...ruleCache.data };
  }
  const rows = await query<DbRow>(
    'SELECT config_key, config_value FROM sys_config WHERE deleted = 0 AND config_key LIKE ?',
    ['numbering.%']
  );
  const data: Record<string, string> = {};
  rows.forEach((row) => {
    const key = String(row.config_key);
    data[key.slice('numbering.'.length)] = String(row.config_value);
  });
  ruleCache = { data, timestamp: Date.now() };
  return { ...data };
}

/** 旧前缀键 → docType（一个发布周期后删除） */
const LEGACY_PREFIX_KEY_TO_DOC_TYPE: Record<string, string> = {
  'order.prefix': 'sales_order',
  order_no_prefix: 'sales_order',
  'purchase.prefix': 'purchase_order',
  po_prefix: 'purchase_order',
  'inbound.prefix': 'inbound',
  'outbound.prefix': 'outbound',
  wo_prefix: 'work_order',
  sample_prefix: 'sample_order',
  mr_prefix: 'material_requisition',
  fpr_prefix: 'final_inspection',
  sh_prefix: 'shipment',
  qi_prefix: 'process_inspection',
  sc_prefix: 'standard_card',
  bf_prefix: 'equipment_scrap',
  jd_prefix: 'equipment_calibration',
  wx_prefix: 'equipment_repair',
  tr_prefix: 'transfer',
  wr_prefix: 'process_report',
  mp_prefix: 'maintenance_plan',
  ir_prefix: 'stocktaking',
};

let legacyKeysLoaded: string[] | null = null;

async function loadLegacyPrefixKeys(): Promise<string[]> {
  if (legacyKeysLoaded) return legacyKeysLoaded;
  const rows = await query<DbRow>(
    'SELECT config_key, config_value FROM sys_config WHERE deleted = 0 AND config_key IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [...Object.keys(LEGACY_PREFIX_KEY_TO_DOC_TYPE), 'serial_number_length', 'doc_date_format']
  );
  const found = new Map<string, string>();
  rows.forEach((row) => found.set(String(row.config_key), String(row.config_value)));

  const templates: Record<string, string> = {};
  const serialLen = Number(found.get('serial_number_length') || 6);
  const safeLen = Number.isFinite(serialLen) && serialLen >= 1 && serialLen <= 10 ? serialLen : 6;
  Object.entries(LEGACY_PREFIX_KEY_TO_DOC_TYPE).forEach(([key, docType]) => {
    const prefix = found.get(key);
    if (prefix) templates[docType] = `${prefix}{YYYYMMDD}{SEQ:${safeLen}}`;
  });
  if (found.get('doc_date_format') && found.get('doc_date_format') !== 'YYYYMMDD') {
    console.warn(
      `[numbering] 配置 doc_date_format=${found.get('doc_date_format')} 不被支持，已忽略并使用 YYYYMMDD`
    );
  }
  legacyKeysLoaded = [...found.keys()];
  legacyTemplateFallback = templates;
  return legacyKeysLoaded;
}

let legacyTemplateFallback: Record<string, string> = {};

/** 解析某 docType 的生效模板：numbering.<docType> > 旧键别名 > 代码默认 */
export async function resolveNumberingTemplate(docType: string): Promise<string> {
  const rules = await getNumberingRules();
  if (rules[docType]) return rules[docType];

  await loadLegacyPrefixKeys();
  const legacy = legacyTemplateFallback[docType];
  if (legacy) {
    console.warn(`[numbering] docType=${docType} 未配置 numbering.${docType}，回退旧前缀键`);
    return legacy;
  }

  const fallback = getDefaultTemplate(docType);
  if (!fallback) throw new DocumentNumberError(`未知的编号类型: ${docType}`);
  return fallback;
}
```

- [ ] **步骤 2：类型检查**

运行：`npm run ts-check`
预期：`document-numbering.ts` 无新增报错

- [ ] **步骤 3：Commit**

```bash
git add src/lib/document-numbering.ts
git commit -m "feat(numbering): 规则读取、缓存与旧前缀别名回退"
```

---

## 任务 5：统一序列表取号

**文件：**
- 创建：`database/migrations/088_document_numbering.sql`
- 修改：`src/lib/document-numbering.ts`

- [ ] **步骤 1：编写迁移脚本（先建表，保证测试可连库）**

```sql
-- ============================================================
-- Migration 088: 单据编号统一收敛
-- 日期: 2026-09-22
-- 内容:
--   1. 新建 sys_document_sequence（统一流水序列表）
--   2. 写入 numbering.<docType> 规则种子（83 条）
--   3. 初始化各 docType 的 last_seq
-- 说明:
--   旧前缀键（order.prefix / wo_prefix / serial_number_length 等）保留不删，
--   由 src/lib/document-numbering.ts 作为别名回退读取，一个发布周期后清理。
-- ============================================================

CREATE TABLE IF NOT EXISTS sys_document_sequence (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  doc_type VARCHAR(64) NOT NULL COMMENT '单据类型',
  period VARCHAR(16) NOT NULL COMMENT '周期标识: YYYYMMDD/YYYYMM/YYYY/GLOBAL',
  last_seq BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '该周期已使用的最大流水号',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_doc_period (doc_type, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单据编号流水序列表';
```

> 规则种子与 `last_seq` 初始化由任务 6 生成（脚本化产出，避免手写 83 条 SQL 出错）。

- [ ] **步骤 2：编写失败的测试**

追加到 `src/lib/document-numbering.test.ts`：

```ts
import { getNextSequence } from './document-numbering';
import { transaction } from './db';

describe('getNextSequence', () => {
  it('同一 (docType, period) 连续取号递增', async () => {
    const docType = '__test_seq_increment';
    const period = 'GLOBAL';
    const a = await transaction((c) => getNextSequence(c, docType, period));
    const b = await transaction((c) => getNextSequence(c, docType, period));
    const c2 = await transaction((c) => getNextSequence(c, docType, period));
    expect(b).toBe(a + 1);
    expect(c2).toBe(b + 1);
    await execute('DELETE FROM sys_document_sequence WHERE doc_type = ?', [docType]);
  });

  it('不同 period 独立计数', async () => {
    const docType = '__test_seq_period';
    const a = await transaction((c) => getNextSequence(c, docType, '20260101'));
    const b = await transaction((c) => getNextSequence(c, docType, '20260102'));
    expect(a).toBe(1);
    expect(b).toBe(1);
    await execute('DELETE FROM sys_document_sequence WHERE doc_type = ?', [docType]);
  });
});
```

（`execute` 需在测试文件顶部从 `./db` 一并导入。）

- [ ] **步骤 3：运行测试验证失败**

运行：`npm run test:unit:run -- src/lib/document-numbering.test.ts`
预期：FAIL，`getNextSequence is not a function`

- [ ] **步骤 4：实现取号**

追加到 `src/lib/document-numbering.ts`：

```ts
/** 事务内原子取号：GET_LOCK + ON DUPLICATE KEY UPDATE */
export async function getNextSequence(
  conn: DbConnection,
  docType: string,
  period: string
): Promise<number> {
  const lockName = `doc_no:${docType}:${period}`;
  const [lockRows] = await conn.query<mysql.RowDataPacket[]>('SELECT GET_LOCK(?, 10) AS locked', [
    lockName,
  ]);
  if (lockRows?.[0]?.locked !== 1) {
    throw new DocumentNumberError(`获取编号锁失败（${docType} ${period}），请稍后重试`);
  }
  try {
    await conn.execute(
      'INSERT INTO sys_document_sequence (doc_type, period, last_seq) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE last_seq = last_seq + 1',
      [docType, period]
    );
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      'SELECT last_seq FROM sys_document_sequence WHERE doc_type = ? AND period = ?',
      [docType, period]
    );
    const seq = Number(rows?.[0]?.last_seq ?? 0);
    if (!seq) throw new DocumentNumberError(`序号取值为空（${docType} ${period}）`);
    return seq;
  } finally {
    await conn.query('SELECT RELEASE_LOCK(?)', [lockName]);
  }
}

function periodOf(template: string, now: Date): string {
  const r = resolveResetPeriod(template);
  if (r === 'daily') return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  if (r === 'monthly') return `${now.getFullYear()}${pad(now.getMonth() + 1)}`;
  if (r === 'yearly') return String(now.getFullYear());
  return 'GLOBAL';
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`npm run test:unit:run -- src/lib/document-numbering.test.ts`
预期：PASS

- [ ] **步骤 6：Commit**

```bash
git add database/migrations/088_document_numbering.sql src/lib/document-numbering.ts src/lib/document-numbering.test.ts
git commit -m "feat(numbering): 统一序列表与原子取号"
```

---

## 任务 6：生成规则种子与 last_seq 初始化

**文件：**
- 修改：`database/migrations/088_document_numbering.sql`

- [ ] **步骤 1：用脚本生成 83 条规则种子与初始化 SQL**

创建临时脚本 `scripts/_gen_numbering_seed.js`（生成后删除，产物写入迁移文件）：

```js
const fs = require('fs');
const { DEFAULT_TEMPLATES } = require('../src/lib/doc-types.ts');
```

由于 `.ts` 不能被 node 直接 require，改为**从 `src/lib/doc-types.ts` 复制模板表到脚本内**，脚本只做 SQL 拼接：

```js
const fs = require('fs');
const TEMPLATES = {
  sales_order: 'ORD{YYYYMMDD}{SEQ:6}',
  // ... 与 src/lib/doc-types.ts 的 DEFAULT_TEMPLATES 完全一致
};
const NAMES = {
  sales_order: '销售订单',
  purchase_order: '采购订单',
  // ... 83 条中文名
};
// 落库表映射（用于 last_seq 初始化）；无单表落点的类型不列
const TABLE_MAP = {
  sales_order: { table: 'sal_order', field: 'order_no' },
  purchase_order: { table: 'pur_purchase_order', field: 'po_no' },
  work_order: { table: 'prod_work_order', field: 'work_order_no' },
  sample_order: { table: 'sal_sample_order', field: 'order_no' },
  purchase_request: { table: 'pur_request', field: 'request_no' },
  inbound: { table: 'inv_inbound_order', field: 'order_no' },
  outbound: { table: 'inv_outbound_order', field: 'order_no' },
  transfer: { table: 'inv_transfer_order', field: 'transfer_no' },
  stocktaking: { table: 'inv_stocktaking', field: 'check_no' },
  receivable: { table: 'fin_receivable', field: 'receivable_no' },
  payable: { table: 'fin_payable', field: 'payable_no' },
  voucher: { table: 'fin_voucher', field: 'voucher_no' },
  receipt: { table: 'fin_receipt_record', field: 'receipt_no' },
  payment: { table: 'fin_payment_record', field: 'payment_no' },
  delivery: { table: 'sal_delivery', field: 'delivery_no' },
  return_order: { table: 'sal_return', field: 'return_no' },
  reconciliation: { table: 'sal_reconciliation', field: 'reconciliation_no' },
  purchase_reconcile: { table: 'pur_purchase_reconciliation', field: 'reconciliation_no' },
};

const lines = [];
lines.push('');
lines.push('-- ============================================================');
lines.push('-- 2. 写入 numbering.<docType> 规则种子');
lines.push('-- ============================================================');
lines.push('');
for (const [docType, tpl] of Object.entries(TEMPLATES)) {
  const name = NAMES[docType] || docType;
  lines.push(
    `INSERT INTO sys_config (config_name, config_key, config_value, config_type, description) VALUES ('${name}', 'numbering.${docType}', '${tpl}', 1, '编号规则：${name}') ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), config_name = VALUES(config_name);`
  );
}
lines.push('');
lines.push('-- ============================================================');
lines.push('-- 3. 初始化各 docType 的 last_seq（按当前最大号）');
lines.push('-- ============================================================');
lines.push('');
for (const [docType, info] of Object.entries(TABLE_MAP)) {
  lines.push(
    `INSERT INTO sys_document_sequence (doc_type, period, last_seq) SELECT '${docType}', DATE_FORMAT(CURDATE(), '%Y%m%d'), COALESCE(MAX(CAST(REGEXP_REPLACE(${info.field}, '[^0-9]', '') AS UNSIGNED) % 1000000), 0) FROM ${info.table} WHERE ${info.field} IS NOT NULL ON DUPLICATE KEY UPDATE last_seq = GREATEST(last_seq, VALUES(last_seq));`
  );
}
fs.writeFileSync(process.argv[2], lines.join('\n'), 'utf8');
console.log('generated', Object.keys(TEMPLATES).length, 'rules,', Object.keys(TABLE_MAP).length, 'init statements');
```

- [ ] **步骤 2：执行脚本并合并进迁移文件**

运行：`node scripts/_gen_numbering_seed.js database/migrations/_numbering_seed.sql`
预期：输出 `generated 83 rules, 18 init statements`

把 `_numbering_seed.sql` 内容追加到 `database/migrations/088_document_numbering.sql`，然后删除两个临时文件：

```bash
git rm --cached scripts/_gen_numbering_seed.js database/migrations/_numbering_seed.sql 2>nul || true
```

（临时脚本与中间产物不进版本库；若已被 `git add`，用 `git reset` 撤回。）

- [ ] **步骤 3：在开发库执行迁移**

运行：`mysql -u root -p<密码> -h 127.0.0.1 vnerpdacahng < database/migrations/088_document_numbering.sql`
预期：无报错；`SELECT COUNT(*) FROM sys_config WHERE config_key LIKE 'numbering.%'` 返回 83

- [ ] **步骤 4：核对初始化结果**

```sql
SELECT doc_type, period, last_seq FROM sys_document_sequence ORDER BY doc_type;
SELECT config_key, config_value FROM sys_config WHERE config_key LIKE 'numbering.%' LIMIT 5;
```

预期：`sales_order` 的 `last_seq` 等于 `sal_order` 现有最大流水（而非 0）；规则值等于 `src/lib/doc-types.ts` 中的默认模板。

- [ ] **步骤 5：Commit**

```bash
git add database/migrations/088_document_numbering.sql
git commit -m "feat(numbering): 规则种子与 last_seq 初始化 SQL"
```

---

## 任务 7：generateDocumentNo 与预览

**文件：**
- 修改：`src/lib/document-numbering.ts`
- 修改：`src/lib/document-numbering.test.ts`

- [ ] **步骤 1：编写失败的测试**

追加：

```ts
import { generateDocumentNo, renderDocumentNoPreview } from './document-numbering';

describe('generateDocumentNo', () => {
  it('按模板生成并递增（sales_order）', async () => {
    const a = await generateDocumentNo('sales_order');
    const b = await generateDocumentNo('sales_order');
    expect(a).toMatch(/^ORD\d{8}\d{6}$/);
    expect(Number(b.slice(-6))).toBe(Number(a.slice(-6)) + 1);
  });

  it('派生模板不消费流水', async () => {
    const a = await generateDocumentNo('mass_process_card', { card_no: 'SCP202609220001' });
    expect(a).toBe('SCP202609220001-M');
    const b = await generateDocumentNo('mass_process_card', { card_no: 'SCP202609220001' });
    expect(b).toBe(a);
  });

  it('上下文变量参与渲染（standard_card）', async () => {
    const a = await generateDocumentNo('standard_card', { sc_type: 'SCP' });
    expect(a).toMatch(/^SCP\d{8}\d{4}$/);
  });

  it('未知 docType 抛错', async () => {
    await expect(generateDocumentNo('__not_a_type')).rejects.toThrow(/未知的编号类型/);
  });
});

describe('renderDocumentNoPreview', () => {
  it('预览不消费流水', async () => {
    const p1 = await renderDocumentNoPreview('sales_order');
    const p2 = await renderDocumentNoPreview('sales_order');
    expect(p1.preview).toBe(p2.preview);
    expect(p1.hasSequence).toBe(true);
    expect(p1.resetPeriod).toBe('daily');
  });

  it('缺失上下文变量时返回 missingVariables 而不抛错', async () => {
    const p = await renderDocumentNoPreview('standard_card');
    expect(p.missingVariables).toEqual(['SC_TYPE']);
    expect(p.preview).toContain('{SC_TYPE}');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm run test:unit:run -- src/lib/document-numbering.test.ts`
预期：FAIL（`generateDocumentNo` 仍是旧实现，断言不匹配）

- [ ] **步骤 3：替换 generateDocumentNo 实现并新增预览**

在 `src/lib/document-numbering.ts` 中，**删除旧的 `generateDocumentNo` 函数体**（原第 291-348 行的整段，含 `generateWithLock`、`DOCUMENT_PREFIX_MAP` 取号逻辑），替换为：

```ts
async function withConn<T>(conn: DbConnection | undefined, fn: (c: DbConnection) => Promise<T>): Promise<T> {
  if (conn) return fn(conn);
  return transaction((c) => fn(c as unknown as DbConnection));
}

/**
 * 生成单据编号。
 * @param docType 编号类型（见 src/lib/doc-types.ts）
 * @param ctx 模板上下文变量（如 { material_id: 11 } 供 {MATERIAL_ID}）
 * @param conn 可选事务连接；不传则内部开启短事务
 */
export async function generateDocumentNo(
  docType: string,
  ctx: DocumentNumberContext = {},
  conn?: DbConnection
): Promise<string> {
  const template = await resolveNumberingTemplate(docType);
  const check = validateDocumentNoTemplate(template);
  if (!check.valid) {
    throw new DocumentNumberError(`编号模板非法（${docType}）: ${check.errors.join('; ')}`);
  }
  const parsed = parseTemplate(template);

  return withConn(conn, async (c) => {
    const now = new Date();
    if (parsed.seqLength === null) {
      return renderTemplate(`${parsed.prefix}${parsed.suffix}`, now, ctx).text;
    }
    const seq = await getNextSequence(c, docType, periodOf(template, now));
    const head = renderTemplate(parsed.prefix, now, ctx).text;
    const tail = renderTemplate(parsed.suffix, now, ctx).text;
    return `${head}${String(seq).padStart(parsed.seqLength, '0')}${tail}`;
  });
}

/** 配置页预览：不消费流水；缺变量时保留占位符并返回缺失清单 */
export async function renderDocumentNoPreview(
  docType: string,
  ctx: DocumentNumberContext = {},
  templateOverride?: string
): Promise<{
  preview: string;
  resetPeriod: 'daily' | 'monthly' | 'yearly' | 'global';
  hasSequence: boolean;
  nextSeq: number;
  missingVariables: string[];
}> {
  const template = templateOverride ?? (await resolveNumberingTemplate(docType));
  const parsed = parseTemplate(template);
  const now = new Date();
  const hasSequence = parsed.seqLength !== null;
  let nextSeq = 1;
  if (hasSequence) {
    const row = await queryOne<{ last_seq: number }>(
      'SELECT last_seq FROM sys_document_sequence WHERE doc_type = ? AND period = ?',
      [docType, periodOf(template, now)]
    );
    nextSeq = Number(row?.last_seq ?? 0) + 1;
  }
  const head = renderTemplate(parsed.prefix, now, ctx, { strict: false });
  const tail = hasSequence
    ? renderTemplate(parsed.suffix, now, ctx, { strict: false })
    : { text: '', missing: [] as string[] };
  const seqText = hasSequence ? String(nextSeq).padStart(parsed.seqLength!, '0') : '';
  return {
    preview: `${head.text}${seqText}${tail.text}`,
    resetPeriod: resolveResetPeriod(template),
    hasSequence,
    nextSeq,
    missingVariables: [...new Set([...head.missing, ...tail.missing])],
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm run test:unit:run -- src/lib/document-numbering.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/lib/document-numbering.ts src/lib/document-numbering.test.ts
git commit -m "feat(numbering): generateDocumentNo 改为模板驱动并新增预览"
```

---

## 任务 8：并发取号测试

**文件：**
- 创建：`tests/unit/document-numbering-concurrency.test.ts`

- [ ] **步骤 1：编写失败的测试**

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { generateDocumentNo } from '@/lib/document-numbering';
import { execute } from '@/lib/db';

describe('编号并发取号', () => {
  const docType = '__test_concurrency';

  afterAll(async () => {
    await execute('DELETE FROM sys_document_sequence WHERE doc_type = ?', [docType]);
  });

  it('20 个并发取号不重复', async () => {
    await execute(
      "INSERT INTO sys_config (config_name, config_key, config_value, config_type) VALUES ('并发测试', 'numbering.__test_concurrency', 'T{YYYYMMDD}{SEQ:6}', 1) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)",
      []
    );
    const results = await Promise.all(
      Array.from({ length: 20 }, () => generateDocumentNo(docType))
    );
    expect(new Set(results).size).toBe(20);
    await execute('DELETE FROM sys_config WHERE config_key = ?', [
      'numbering.__test_concurrency',
    ]);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm run test:unit:run -- tests/unit/document-numbering-concurrency.test.ts`
预期：若缓存未命中会回退默认模板抛「未知的编号类型」→ FAIL（说明规则缓存需在写配置后清理）

- [ ] **步骤 3：在测试中清理缓存**

在测试文件的 `beforeAll` 前补：

```ts
import { clearNumberingRuleCache } from '@/lib/document-numbering';
```

并在插入 `sys_config` 之后、并发取号之前调用：

```ts
    clearNumberingRuleCache();
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm run test:unit:run -- tests/unit/document-numbering-concurrency.test.ts`
预期：PASS，20 个单号互不相同

- [ ] **步骤 5：Commit**

```bash
git add tests/unit/document-numbering-concurrency.test.ts
git commit -m "test(numbering): 并发取号不重复"
```

---

## 任务 9：保留既有导出以兼容现有调用方

**文件：**
- 修改：`src/lib/document-numbering.ts`

现有调用方依赖：`DocumentType` 类型、`validateDocumentNo`、`checkDocumentNoDuplicate`、`DOCUMENT_TABLE_MAP`（`src/app/api/document-number/route.ts:6`）。

- [ ] **步骤 1：调整类型与校验函数**

1. 保留 `export type DocumentType = ...` 联合类型定义**不变**（`/api/document-number` 仍在用）。
2. 把 `validateDocumentNoFormat` 改为模板匹配实现（保留导出名与三参签名，`docType` 类型放宽为 `string`）：

```ts
/** 把模板编译成正则，用于校验已有单号是否符合当前规则 */
export function compileTemplateRegExp(template: string): RegExp {
  const parsed = parseTemplate(template);
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dates = '\\d+';
  const seqPart = parsed.seqLength ? `\\d{${parsed.seqLength}}` : '';
  const prefix = escape(parsed.prefix).replace(/\{[^{}]+\}/g, dates);
  const suffix = escape(parsed.suffix).replace(/\{[^{}]+\}/g, dates);
  return new RegExp(`^${prefix}${seqPart}${suffix}$`);
}

export function validateDocumentNoFormat(
  docNo: string,
  docType: string,
  template: string
): { valid: boolean; error?: string } {
  if (!docNo) return { valid: false, error: '单据编号不能为空' };
  const re = compileTemplateRegExp(template);
  if (!re.test(docNo)) {
    return { valid: false, error: `单据编号不符合当前规则模板: ${template}` };
  }
  return { valid: true };
}
```

3. `DOCUMENT_TABLE_MAP` 与 `checkDocumentNoDuplicate` 保留，`checkDocumentNoDuplicate` 的 `docType` 类型放宽为 `string`。
4. `validateDocumentNo` 改为：

```ts
export async function validateDocumentNo(
  docNo: string,
  docType: string,
  excludeId?: number
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const template = await resolveNumberingTemplate(docType);
  const formatResult = validateDocumentNoFormat(docNo, docType, template);
  if (!formatResult.valid && formatResult.error) errors.push(formatResult.error);
  const dupResult = await checkDocumentNoDuplicate(docNo, docType, excludeId);
  if (dupResult.duplicate && dupResult.error) errors.push(dupResult.error);
  return { valid: errors.length === 0, errors };
}
```

5. 删除 `DocumentNumberingConfig` / `DEFAULT_CONFIG` / `getNumberingConfig` 中对 17 个扁平前缀键的依赖，`getNumberingConfig` 保留一个发布周期但标记 `@deprecated`，实现改为返回从 `getNumberingRules()` 推导的前缀视图；如无调用方则直接删除（先执行下方检索）。

- [ ] **步骤 2：确认 getNumberingConfig 已无调用方**

运行：`npm run ts-check`
预期：若删除 `getNumberingConfig` 后无报错，则确认无调用方；若有报错，保留函数并加 `@deprecated`

- [ ] **步骤 3：运行引擎全部单测**

运行：`npm run test:unit:run -- src/lib/document-numbering.test.ts tests/unit/document-numbering-concurrency.test.ts`
预期：PASS

- [ ] **步骤 4：Commit**

```bash
git add src/lib/document-numbering.ts
git commit -m "refactor(numbering): 兼容既有导出，格式校验改为模板匹配"
```

---

## 任务 10：i18n 文案键

**文件：**
- 修改：`messages/zh-CN.json`、`messages/zh-TW.json`、`messages/en.json`、`messages/vi.json`

- [ ] **步骤 1：在 Common 命名空间新增键**

在 `messages/zh-CN.json` 的 `Common` 对象内（紧邻 `configGroup_system` 之后）新增：

```json
    "configGroup_numbering": "编号规则",
    "numberingTitle": "编号规则",
    "numberingDesc": "维护各单据类型的编号生成规则，修改后立即生效",
    "numberingDocType": "单据类型",
    "numberingTemplate": "编号模板",
    "numberingResetPeriod": "重置周期",
    "numberingNextPreview": "下一号预览",
    "numberingStatus": "状态",
    "numberingResetDaily": "按日",
    "numberingResetMonthly": "按月",
    "numberingResetYearly": "按年",
    "numberingResetGlobal": "不重置",
    "numberingConfigured": "已配置",
    "numberingUsingDefault": "使用默认",
    "numberingValidate": "校验模板",
    "numberingRestoreDefault": "恢复默认",
    "numberingPreview": "实时预览",
    "numberingTemplateRequired": "编号模板不能为空",
    "numberingTemplateCodeOnly": "编号模板只能包含占位符与以下字符：A-Z a-z 0-9 - _ /",
    "numberingMissingVars": "该模板需要填写上下文变量：{vars}",
    "numberingDerived": "派生编号·不占流水",
    "numberingSaved": "编号规则已保存"
```

`messages/zh-TW.json` 同位置用繁体文案；`messages/en.json` 用英文文案；`messages/vi.json` 用越南语文案。四个文件的键名必须完全一致。

- [ ] **步骤 2：校验 JSON 与键一致性**

运行：`node -e "['zh-CN','zh-TW','en','vi'].forEach(f=>{const j=require('./messages/'+f+'.json');const keys=Object.keys(j.Common).filter(k=>k.startsWith('numbering')||k==='configGroup_numbering');console.log(f, keys.length)})"`
预期：四个文件都输出 `19`

- [ ] **步骤 3：Commit**

```bash
git add messages/zh-CN.json messages/zh-TW.json messages/en.json messages/vi.json
git commit -m "i18n: 新增编号规则界面的 19 个文案键（4 语言）"
```

---

## 任务 11：预览与校验接口

**文件：**
- 创建：`src/app/api/system/config/numbering-preview/route.ts`

- [ ] **步骤 1：实现接口**

```ts
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  renderDocumentNoPreview,
  validateDocumentNoTemplate,
  resolveResetPeriod,
  DocumentNumberError,
} from '@/lib/document-numbering';

export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.docType !== 'string' || !body.docType) {
      return errorResponse('缺少 docType 参数', 400);
    }
    const { docType, ctx, template } = body as {
      docType: string;
      ctx?: Record<string, string | number>;
      template?: string;
    };

    try {
      if (template !== undefined) {
        const check = validateDocumentNoTemplate(template);
        const preview = check.valid
          ? await renderDocumentNoPreview(docType, ctx ?? {}, template)
          : null;
        return successResponse({
          ...check,
          resetPeriod: check.valid ? resolveResetPeriod(template) : null,
          preview: preview?.preview ?? null,
          hasSequence: preview?.hasSequence ?? null,
          missingVariables: preview?.missingVariables ?? [],
        });
      }

      const result = await renderDocumentNoPreview(docType, ctx ?? {});
      return successResponse({ valid: true, errors: [], ...result });
    } catch (e) {
      if (e instanceof DocumentNumberError) {
        return errorResponse(e.message, 422);
      }
      throw e;
    }
  },
  { logTitle: '编号模板预览与校验' }
);
```

- [ ] **步骤 2：验证接口不消费流水**

启动 dev server 后，对同一 docType 连续调用两次，再取一次号：

```bash
curl -s -X POST http://localhost:3000/api/system/config/numbering-preview -H "Content-Type: application/json" -d "{\"docType\":\"sales_order\"}"
```

预期：两次返回的 `preview` 完全相同；随后调用 `generateDocumentNo('sales_order')` 得到的就是该 `preview` 值。

- [ ] **步骤 3：类型检查**

运行：`npm run ts-check`
预期：新文件无报错

- [ ] **步骤 4：Commit**

```bash
git add src/app/api/system/config/numbering-preview/route.ts
git commit -m "feat(numbering): 编号模板预览与校验接口"
```

---

## 任务 12：settings/config 编号规则面板

**文件：**
- 创建：`src/app/[locale]/settings/config/numbering-rules-panel.tsx`
- 修改：`src/app/[locale]/settings/config/page.tsx`

- [ ] **步骤 1：创建面板组件**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { Edit, RotateCcw } from 'lucide-react';
import { DEFAULT_TEMPLATES, NUMBERING_DOC_TYPES } from '@/lib/doc-types';

interface RuleRow {
  id: number;
  config_name: string;
  config_key: string;
  config_value: string;
}

interface PreviewResult {
  valid: boolean;
  errors: string[];
  preview: string | null;
  resetPeriod: 'daily' | 'monthly' | 'yearly' | 'global' | null;
  missingVariables: string[];
}

const TEMPLATE_CHARSET_RE = /^[A-Za-z0-9\-_/{}.]+$/;

export function NumberingRulesPanel() {
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const [rows, setRows] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RuleRow | null>(null);
  const [template, setTemplate] = useState('');
  const [ctxJson, setCtxJson] = useState('{}');
  const [result, setResult] = useState<PreviewResult | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/system/config?page=1&pageSize=500&configName=numbering.');
      const body = await res.json();
      if (body.success) {
        setRows((body.data.list || []) as RuleRow[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const ruleByDocType = new Map(
    rows.map((r) => [r.config_key.slice('numbering.'.length), r])
  );

  const resetPeriodLabel = (p: PreviewResult['resetPeriod']) => {
    if (p === 'daily') return tc('numberingResetDaily');
    if (p === 'monthly') return tc('numberingResetMonthly');
    if (p === 'yearly') return tc('numberingResetYearly');
    return tc('numberingResetGlobal');
  };

  const runPreview = useCallback(
    async (docType: string, tpl: string, ctxRaw: string) => {
      if (!TEMPLATE_CHARSET_RE.test(tpl)) {
        setResult({
          valid: false,
          errors: [tc('numberingTemplateCodeOnly')],
          preview: null,
          resetPeriod: null,
          missingVariables: [],
        });
        return;
      }
      let ctx: Record<string, string> = {};
      try {
        ctx = JSON.parse(ctxRaw || '{}');
      } catch {
        ctx = {};
      }
      const res = await authFetch('/api/system/config/numbering-preview', {
        method: 'POST',
        body: JSON.stringify({ docType, template: tpl, ctx }),
      });
      const body = await res.json();
      setResult(
        body.success
          ? (body.data as PreviewResult)
          : { valid: false, errors: [body.message || ''], preview: null, resetPeriod: null, missingVariables: [] }
      );
    },
    [tc]
  );

  useEffect(() => {
    if (!dialogOpen || !editing) return;
    const timer = setTimeout(() => {
      runPreview(editing.config_key.slice('numbering.'.length), template, ctxJson);
    }, 400);
    return () => clearTimeout(timer);
  }, [dialogOpen, editing, template, ctxJson, runPreview]);

  const openEdit = (docType: string) => {
    const row =
      ruleByDocType.get(docType) ??
      ({
        id: 0,
        config_name: docType,
        config_key: `numbering.${docType}`,
        config_value: DEFAULT_TEMPLATES[docType] ?? '',
      } as RuleRow);
    setEditing(row);
    setTemplate(row.config_value);
    setCtxJson('{}');
    setResult(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!template.trim()) {
      toast({ title: tc('numberingTemplateRequired'), variant: 'destructive' });
      return;
    }
    if (result && !result.valid) {
      toast({ title: result.errors[0] || tc('numberingTemplateRequired'), variant: 'destructive' });
      return;
    }
    const payload = {
      config_name: editing.config_name,
      config_key: editing.config_key,
      config_value: template,
      config_type: 1,
      description: editing.config_name,
    };
    const res = await authFetch('/api/system/config', {
      method: editing.id ? 'PUT' : 'POST',
      body: JSON.stringify(editing.id ? { id: editing.id, ...payload } : payload),
    });
    const body = await res.json();
    if (body.success) {
      toast({ title: tc('numberingSaved') });
      setDialogOpen(false);
      fetchRules();
    } else {
      toast({ title: body.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {loading && <div className="text-sm text-muted-foreground">{tc('loading')}</div>}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{tc('numberingDocType')}</TableHead>
                <TableHead className="text-xs">{tc('numberingTemplate')}</TableHead>
                <TableHead className="text-xs">{tc('numberingStatus')}</TableHead>
                <TableHead className="text-xs text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NUMBERING_DOC_TYPES.map((docType) => {
                const row = ruleByDocType.get(docType);
                return (
                  <TableRow key={docType}>
                    <TableCell className="text-sm">{row?.config_name || docType}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {row?.config_value || DEFAULT_TEMPLATES[docType]}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row ? tc('numberingConfigured') : tc('numberingUsingDefault')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => openEdit(docType)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.config_name}</DialogTitle>
            <DialogDescription>{editing?.config_key}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{tc('numberingTemplate')}</Label>
              <Input
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>{tc('numberingPreview')}</Label>
              <Input value={ctxJson} onChange={(e) => setCtxJson(e.target.value)} className="font-mono text-xs" />
            </div>
            {result && (
              <div className="text-xs space-y-1">
                {result.valid ? (
                  <>
                    <div className="font-mono">{result.preview}</div>
                    <div className="text-muted-foreground">
                      {tc('numberingResetPeriod')}: {resetPeriodLabel(result.resetPeriod)}
                    </div>
                    {result.missingVariables.length > 0 && (
                      <div className="text-amber-600">
                        {tc('numberingMissingVars', { vars: result.missingVariables.join(', ') })}
                      </div>
                    )}
                  </>
                ) : (
                  <ul className="text-red-600 list-disc pl-4">
                    {result.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!editing) return;
                const docType = editing.config_key.slice('numbering.'.length);
                setTemplate(DEFAULT_TEMPLATES[docType] ?? '');
              }}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              {tc('numberingRestoreDefault')}
            </Button>
            <Button onClick={handleSave}>{tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **步骤 2：在配置页挂载分组与面板**

在 `src/app/[locale]/settings/config/page.tsx` 做 3 处修改：

1. 顶部 import 增加：

```tsx
import { NumberingRulesPanel } from './numbering-rules-panel';
```

2. `configGroups` 常量（第 51-58 行）末尾增加一项：

```tsx
  { key: 'numbering', label: '编号规则', icon: '🔢' },
```

3. `getConfigGroup`（第 525-533 行）在 `return 'other';` 之前插入：

```tsx
  if (key.startsWith('numbering.')) return 'numbering';
```

4. `TabsContent`（第 770 行）内，把现有表格用条件包裹，编号规则分组渲染新面板：

```tsx
          <TabsContent value={activeGroup} className="mt-4">
            {activeGroup === 'numbering' ? (
              <NumberingRulesPanel />
            ) : (
            <Card>
```

并在该 `</Card>`（原第 844 行）之后闭合条件：

```tsx
            </Card>
            )}
          </TabsContent>
```

- [ ] **步骤 3：配置写接口清理编号规则缓存**

编号规则缓存在 Next.js 服务端进程内，客户端无法清理，必须由写接口负责。

修改 `src/app/api/system/config/route.ts`：在文件顶部 import 中增加

```ts
import { clearNumberingRuleCache } from '@/lib/document-numbering';
```

在 `POST` 与 `PUT` 处理函数中，**写入成功后**（返回 `successResponse` 之前）各加一行：

```ts
    clearNumberingRuleCache();
```

若该文件已有 `clearConfigCache()` 调用（清理 `global-config` 缓存），把新调用紧邻它放置。

- [ ] **步骤 4：类型检查与手测**

运行：`npm run ts-check`
预期：两个文件无报错

手测清单：
1. 打开 `/settings/config`，切到「编号规则」Tab，列出 83 种单据类型
2. 编辑 `sales_order`，模板改为 `ORD-{YYYYMMDD}-{SEQ:4}` → 预览应显示 `ORD-20260922-0001`，重置周期「按日」
3. 保存后新建一张销售订单，单号应为新格式（验证缓存已清）
4. 输入 `ORD{FOO-BAR}{SEQ:4}` → 校验应报「无法识别的占位符」
5. 编辑 `standard_card` 不填上下文 → 提示缺失 `SC_TYPE`

- [ ] **步骤 5：Commit**

```bash
git add src/app/api/system/config/route.ts src/app/[locale]/settings/config/numbering-rules-panel.tsx src/app/[locale]/settings/config/page.tsx
git commit -m "feat(numbering): settings/config 新增编号规则分组与编辑面板"
```

---

## 任务 13：迁移批次 2 —— 销售与采购

**文件（改动点均在现有单号生成行）：**
- 修改：`src/infrastructure/repositories/MysqlSalesOrderRepository.ts:150`
- 修改：`src/infrastructure/repositories/DrizzleSalesOrderRepository.ts:221`
- 修改：`src/app/api/orders/route.ts:253`
- 修改：`src/application/services/SampleOrderApplicationService.ts:250-291`
- 修改：`src/infrastructure/repositories/MysqlDeliveryRepository.ts:123`
- 修改：`src/app/api/sales/delivery/route.ts:118`
- 修改：`src/app/api/sales/delivery/partial/route.ts:59`
- 修改：`src/app/api/sales/delivery/re-ship/route.ts:36`
- 修改：`src/infrastructure/repositories/MysqlReturnOrderRepository.ts:130`
- 修改：`src/app/api/sales/return/route.ts:103`
- 修改：`src/infrastructure/repositories/MysqlReconciliationRepository.ts:150`
- 修改：`src/app/api/sales/reconciliation/route.ts:144`
- 修改：`src/application/services/SampleProcessCardService.ts:727-742`
- 修改：`src/infrastructure/repositories/MysqlSampleOrderRepository.ts:234-260`
- 修改：`src/app/api/purchase/request/route.ts:68-72,202`
- 修改：`src/app/[locale]/purchase/request/form/page.tsx:22-30`
- 修改：`src/infrastructure/repositories/MysqlPurchaseOrderRepository.ts:216`
- 修改：`src/infrastructure/repositories/DrizzlePurchaseOrderRepository.ts:281`
- 修改：`src/lib/services/purchase-request-service.ts:48`
- 修改：`src/infrastructure/repositories/MysqlPurchaseReturnRepository.ts:201`
- 修改：`src/infrastructure/repositories/MysqlPurchaseReconciliationRepository.ts:199`
- 修改：`src/application/services/PurchaseReturnApplicationService.ts:161,181`
- 修改：`src/app/api/business/contract-review/route.ts:81-88`
- 修改：`src/app/api/biz/contract-review/route.ts:62-68`

- [ ] **步骤 1：替换各生成点为引擎调用**

```ts
// MysqlSalesOrderRepository.ts / DrizzleSalesOrderRepository.ts / api/orders/route.ts
const orderNo = await generateDocumentNo('sales_order');

// SampleOrderApplicationService.ts（原 SO{YYYYMMDD}{COUNT+1} 与撞号重试逻辑整段删除）
const orderNo = await generateDocumentNo('sales_order', {}, conn);

// MysqlDeliveryRepository.ts / api/sales/delivery/route.ts
const deliveryNo = await generateDocumentNo('delivery');

// api/sales/delivery/partial/route.ts / re-ship/route.ts（原 getShPrefix()+generateDocNo 删除）
const shipmentNo = await generateDocumentNo('shipment');

// MysqlReturnOrderRepository.ts / api/sales/return/route.ts
const returnNo = await generateDocumentNo('return_order');

// MysqlReconciliationRepository.ts / api/sales/reconciliation/route.ts
const reconciliationNo = await generateDocumentNo('reconciliation');

// SampleProcessCardService.ts:generateQuoteNo（原函数体删除，调用处直接内联）
const quoteNo = await generateDocumentNo('quote');

// MysqlSampleOrderRepository.ts:getNextSequence（原函数与 GET_LOCK 整段删除）
const orderNo = await generateDocumentNo('sample_order', {}, conn);

// api/purchase/request/route.ts（同时删除 _generateRequestNoSync 死代码）
const requestNo = await generateDocumentNo('purchase_request');

// app/[locale]/purchase/request/form/page.tsx（删除前端随机号，改为提交时不带单号，由后端生成）
// 删除 generateDocNo 相关 import 与本地函数，提交 payload 中移除 request_no 字段

// MysqlPurchaseOrderRepository.ts / DrizzlePurchaseOrderRepository.ts / purchase-request-service.ts
const poNo = await generateDocumentNo('purchase_order');

// MysqlPurchaseReturnRepository.ts（原回退 DOC）
const returnNo = await generateDocumentNo('purchase_return');

// MysqlPurchaseReconciliationRepository.ts
const reconciliationNo = await generateDocumentNo('purchase_reconcile');

// PurchaseReturnApplicationService.ts
const outboundNo = await generateDocumentNo('outbound', {}, conn);
const payableNo = await generateDocumentNo('payable', {}, conn);

// api/business/contract-review/route.ts 与 api/biz/contract-review/route.ts
const reviewNo = await generateDocumentNo('contract_review');
```

- [ ] **步骤 2：删除不再使用的 import**

删除这些文件中 `import { generateDocNo } from '@/lib/global-config'`、`getShPrefix`、`getPoPrefix` 等前缀 getter 的引入与调用。

- [ ] **步骤 3：验证**

运行：`npm run ts-check`
预期：无报错

手测：
1. 新建销售订单 → 单号 `ORD20260922000001` 格式且递增
2. 新建采购申请 / 采购订单 / 采购退货 / 采购对账 → 前缀分别为 `PR` / `PO` / `PRT` / `RC`
3. 新建发货单 → `DL`；补发货 → `SH`
4. 新建销售退货 / 销售对账 → `RT` / `RC`
5. 新建采购申请页面（前端表单）不再自造单号

- [ ] **步骤 4：Commit**

```bash
git add src/infrastructure/repositories/MysqlSalesOrderRepository.ts src/infrastructure/repositories/DrizzleSalesOrderRepository.ts src/app/api/orders/route.ts src/application/services/SampleOrderApplicationService.ts src/infrastructure/repositories/MysqlDeliveryRepository.ts src/app/api/sales/delivery/route.ts src/app/api/sales/delivery/partial/route.ts src/app/api/sales/delivery/re-ship/route.ts src/infrastructure/repositories/MysqlReturnOrderRepository.ts src/app/api/sales/return/route.ts src/infrastructure/repositories/MysqlReconciliationRepository.ts src/app/api/sales/reconciliation/route.ts src/application/services/SampleProcessCardService.ts src/infrastructure/repositories/MysqlSampleOrderRepository.ts src/app/api/purchase/request/route.ts "src/app/[locale]/purchase/request/form/page.tsx" src/infrastructure/repositories/MysqlPurchaseOrderRepository.ts src/infrastructure/repositories/DrizzlePurchaseOrderRepository.ts src/lib/services/purchase-request-service.ts src/infrastructure/repositories/MysqlPurchaseReturnRepository.ts src/infrastructure/repositories/MysqlPurchaseReconciliationRepository.ts src/application/services/PurchaseReturnApplicationService.ts src/app/api/business/contract-review/route.ts src/app/api/biz/contract-review/route.ts
git commit -m "refactor(numbering): 销售与采购模块单号改由统一引擎生成"
```

---

## 任务 14：迁移批次 3 —— 生产与仓库（含批次与库存事务）

**文件：**
- 修改：`src/infrastructure/repositories/MysqlWorkOrderRepository.ts:117`、`src/app/api/workorders/route.ts:154`、`src/lib/services/sales-order-service.ts:54`
- 修改：`src/lib/multi-color-printing.ts:329`、`src/app/api/sample/orders/linkage/route.ts:27-39`、`src/application/handlers/SalesToWorkOrderHandler.ts:149-153`
- 修改：`src/application/services/SampleProcessCardService.ts:502,878-892`
- 修改：`src/application/services/ProductionApplicationService.ts:168,202,235`
- 修改：`src/app/api/material-requisitions/route.ts:14-15,127`、`src/lib/material-requisition.ts:88,192,267,458`、`src/app/api/material-returns/route.ts:15-16,96`、`src/app/api/production/material-return/route.ts:57`
- 修改：`src/app/api/production/work-report/route.ts:70`、`src/app/api/production/process/route.ts:102`
- 修改：`src/lib/production-scheduling-enhanced.ts:596`、`src/app/api/production/schedule/route.ts:167`
- 修改：`src/lib/mrp-engine.ts:876`、`src/lib/mrp-engine-v2.ts:444`、`src/app/api/orders/bom/route.ts:138`
- 修改：`src/infrastructure/repositories/MysqlInboundOrderRepository.ts:272`、`src/infrastructure/repositories/DrizzleInboundOrderRepository.ts:242`
- 修改：`src/infrastructure/repositories/MysqlOutboundOrderRepository.ts:155`、`src/app/api/warehouse/outbound/route.ts:165`、`src/app/api/warehouse/outbound/fifo/route.ts:154-162`
- 修改：`src/app/api/warehouse/batch-inventory/route.ts:143,166-168,259`
- 修改：`src/app/api/warehouse/production-inbound/route.ts:95-101`
- 修改：`src/infrastructure/repositories/MysqlTransferOrderRepository.ts:193`、`src/app/api/warehouse/transfer/route.ts:18-19,116`
- 修改：`src/app/api/warehouse/transfer/[id]/inbound/route.ts:85`
- 修改：`src/infrastructure/repositories/MysqlStocktakingOrderRepository.ts:183`、`src/app/api/warehouse/stocktaking/route.ts:18-19,97`
- 修改：`src/app/api/warehouse/split-order/route.ts:134-142,316-325`、`src/lib/fifo-width-slit.ts:298-307`
- 修改：`src/lib/warehouse-core.ts:258-260,270,296`
- 修改：`src/app/api/inventory/route.ts:178,179,276,557`
- 修改：`src/lib/label-service.ts:15-37`、`src/app/api/material-labels/route.ts:10-17,143,218`
- 修改：`src/app/api/warehouse/inbound/labels/route.ts:170-180`、`src/app/api/warehouse/inbound/cutting/route.ts:12-18,22-28,265,300,374`
- 修改：`src/app/api/warehouse/ink-mixing/route.ts:73,133`、`src/app/api/dcprint/ink-dispatch/route.ts:93`
- 修改：`src/app/api/outsource/receive/route.ts:126,147`、`src/app/api/outsource/issue/route.ts:172`
- 修改：`src/app/api/warehouse/stocktaking/diff-process/route.ts:156`
- 修改：`src/lib/inventory-ledger.ts:54-56`
- 修改：`src/application/handlers/{WorkOrderCompletedHandler.ts:26,88, FinishOrderInventoryHandler.ts:56,57, PurchaseReceivedHandler.ts:47, OutboundInventoryHandler.ts:54, ToolCostHandler.ts:57, ScreenPlateCostHandler.ts:194, InkCostHandler.ts:154}`
- 修改：`src/services/CostAmortizationService.ts:83`
- 修改：`src/lib/utils.ts:69,78`、`src/lib/utils.test.ts:9-10,130,134,140,144`

- [ ] **步骤 1：替换各生成点为引擎调用**

```ts
// 工单（含 multi-color-printing / sample linkage / SalesToWorkOrderHandler / 正式工单）
const workOrderNo = await generateDocumentNo('work_order', {}, conn);
// SampleProcessCardService.ts 打样工单
const swWorkOrderNo = await generateDocumentNo('sample_work_order', {}, conn);

// 领料 / 退料
const requisitionNo = await generateDocumentNo('material_requisition', {}, conn);
const issueNo = await generateDocumentNo('material_issue');
const pickNo = await generateDocumentNo('material_pick', {}, conn);
const returnNo = await generateDocumentNo('material_return', {}, conn);

// 工序汇报 / 工序流转 / 排产 / MRP / BOM
const reportNo = await generateDocumentNo('process_report', {}, conn);
const processNo = await generateDocumentNo('production_process', {}, conn);
const scheduleNo = await generateDocumentNo('production_schedule');
const runNo = await generateDocumentNo('mrp_run', {}, conn);
const bomNo = await generateDocumentNo('bom', {}, conn);

// 入出库 / 调拨 / 盘点
const inboundNo = await generateDocumentNo('inbound', {}, conn);
const outboundNo = await generateDocumentNo('outbound', {}, conn);
const salesOutboundNo = await generateDocumentNo('sales_outbound', {}, conn);
const productionInboundNo = await generateDocumentNo('production_inbound', {}, conn);
const transferNo = await generateDocumentNo('transfer', {}, conn);
const checkNo = await generateDocumentNo('stocktaking', {}, conn);

// 批次与派生标识
const batchNo = await generateDocumentNo('batch', {}, conn);
const splitNo = await generateDocumentNo('split_order', {}, conn);
const slitBatchNo = await generateDocumentNo('batch_slit', {}, conn);
const wholeSplitBatchNo = await generateDocumentNo('batch_whole_split', {}, conn);
const woBatchNo = await generateDocumentNo('batch_work_order', { wo_no: workOrderNo }, conn);
const finishBatchNo = await generateDocumentNo('batch_finish_order', { finish_order_id: finishOrderId }, conn);
const transferBatchNo = await generateDocumentNo(
  'batch_transfer',
  { transfer_no: transferNo, material_code: materialCode },
  conn
);
const outsourceBatchNo = await generateDocumentNo(
  'batch_outsource',
  { receive_no: receiveNo, id: recordId },
  conn
);
const mixedBatchNo = await generateDocumentNo('batch_ink_mixed', {}, conn);
const inkDispatchBatchNo = await generateDocumentNo('batch_ink_dispatch', {}, conn);
const smallQr = await generateDocumentNo('batch_small', { parent_qr: parentQr }, conn);
const remainderQr = await generateDocumentNo('batch_remainder', { parent_qr: parentQr }, conn);

// 库存事务（inventory-ledger.ts:54 为唯一入口，收口全部调用点）
const transNo = await generateDocumentNo('inventory_trans', {}, conn);
// 成本类事务
const costTransNo = await generateDocumentNo('cost_trans', { wo_no: workOrderNo }, conn);

// 标签
const labelNo = await generateDocumentNo('material_label', {}, conn);
const cuttingRecordNo = await generateDocumentNo('cutting_record');
const cuttingLabelNo = await generateDocumentNo('cutting_label');
const inboundLabelId = await generateDocumentNo('inbound_label');
```

- [ ] **步骤 2：删除被取代的本地实现与工具函数**

```ts
// 删除以下内容（调用点已改为引擎）：
// src/lib/utils.ts: generateBatchNo / generateTransNo
// src/lib/inventory-ledger.ts:54-56 内的本地拼接（改为调用引擎）
// src/app/api/inventory/route.ts: 对 generateTransNo/generateBatchNo 的 import
// src/lib/warehouse-core.ts:258-260,270,296 的本地拼接
// src/app/api/warehouse/{split-order,production-inbound,stocktaking,transfer}/route.ts 的本地 generateXxxNo
// src/app/api/warehouse/inbound/{labels,cutting}/route.ts 的本地生成函数
// src/lib/label-service.ts 的 generateLabelNo
// 以及这些文件里对 getTrPrefix / getIcPrefix / getMrPrefix / getWrPrefix / generateDocNo 的 import
```

同步删除 `src/lib/utils.test.ts` 中 `generateBatchNo` / `generateTransNo` 的导入（第 9-10 行）与用例（第 130、134、140、144 行）。

- [ ] **步骤 3：验证**

运行：`npm run ts-check && npm run test:unit:run`
预期：无报错，单测全绿（含 `tests/unit/warehouse-core.test.ts`、`src/lib/utils.test.ts` 更新后）

手测：
1. 新建工单 → `WO20260922000001`
2. 领料单 → `MR...`；领料出库 → `MI...`；退料 → `MRT...`
3. 入库单 → `INB...`；出库单 → `OTB...`；FIFO 出库 → 同为 `OTB...`（不再出现 `CK`）
4. 盘点单 → `ST...`，且落在 `check_no` 字段（不再写 `taking_no`）
5. 分切/横切 → 子批次 `SC...`；整料拆分 → `SP...`
6. 任意库存变动 → 事务号 `TRX202609221430120001`

- [ ] **步骤 4：Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts src/lib/inventory-ledger.ts src/lib/warehouse-core.ts src/lib/multi-color-printing.ts src/lib/production-scheduling-enhanced.ts src/lib/mrp-engine.ts src/lib/mrp-engine-v2.ts src/lib/label-service.ts src/lib/material-requisition.ts src/application src/infrastructure src/app/api
git commit -m "refactor(numbering): 生产与仓库模块单号改由统一引擎生成"
```

---

## 任务 15：迁移批次 4 —— 质检 / 财务 / 设备 / 人事 / 样品标准卡

**文件：**
- 修改：`src/app/api/quality/incoming/route.ts:171-180`、`src/app/api/quality/process/route.ts:175`、`src/app/api/quality/final/route.ts:134`
- 修改：`src/app/api/quality/lab-test/auto-request/route.ts:26-32`
- 修改：`src/infrastructure/repositories/MysqlUnqualifiedRepository.ts:94-117`
- 修改：`src/lib/spc-analysis.ts:355`
- 修改：`src/infrastructure/repositories/MysqlReceivableRepository.ts:78`、`src/infrastructure/repositories/MysqlPayableRepository.ts:78`、`src/infrastructure/repositories/MysqlVoucherRepository.ts:110`
- 修改：`src/application/services/FinanceApplicationService.ts:346,456`、`src/app/api/sales/delivery/[id]/ship/route.ts:155`
- 修改：`src/lib/finance-core.ts:40,112,185,253`、`src/lib/FinanceVoucherHandler.ts:331-346`
- 修改：`src/lib/general-ledger.ts:928`、`src/app/api/hr/finance-sync/salary-transfer/route.ts:61`
- 修改：`src/app/api/finance/invoice/route.ts:91-99`、`src/app/api/finance/expense/route.ts:64-71`
- 修改：`src/application/handlers/{SalesReceivableHandler.ts:25, DeliveryReceivableHandler.ts:25, OutboundReceivableHandler.ts:36, PurchasePayableHandler.ts:30,66, FinanceVoucherHandler.ts:70, ProductionFinanceHandler.ts:41}`
- 修改：`src/app/api/warehouse/outbound/confirm/route.ts:262`
- 修改：`src/infrastructure/repositories/MysqlEquipmentRepository.ts:172-181`
- 修改：`src/app/api/equipment/{plan:164-171, maintenance:163-170, scrap:53, repair:52, calibration:54}/route.ts`
- 修改：`src/application/services/DieApplicationService.ts:33`、`src/app/api/prepress/die-maintenance/route.ts:100`
- 修改：`src/infrastructure/repositories/{MysqlEmployeeRepository.ts:140-149, EmployeeRepository.ts:121-126}`
- 修改：`src/app/[locale]/hr/employee/page.tsx:243-248`
- 修改：`src/application/services/SampleProcessCardService.ts:113-127`、`src/application/services/SampleProcessTemplateService.ts:54-68`
- 修改：`src/infrastructure/repositories/MysqlStandardCardRepository.ts:335-354`、`src/app/api/standard-cards/route.ts:225`、`src/domain/standard-card/aggregates/StandardCard.ts:467-473`
- 修改：`src/infrastructure/repositories/PrintStandardCardRepository.ts:106`、`src/lib/standard-card-service.ts:647`
- 修改：`src/app/api/engineering/sample-to-mass/route.ts:145-151`、`src/app/api/dcprint/process-cards/route.ts:11-18`
- 修改：`src/app/api/dcprint/trace/route.ts:44-51`、`src/app/api/dcprint/ink-formula/route.ts:117`、`src/lib/qrcode-service.ts:157`
- 修改：`src/domain/dcprint/aggregates/InkFormulaVersion.ts:391-420`、`src/domain/sample/standard-card/utils.ts:16`

- [ ] **步骤 1：替换各生成点为引擎调用**

```ts
// 质检
const inspectionNo = await generateDocumentNo('incoming_inspection', {}, connection);
const processInspectionNo = await generateDocumentNo('process_inspection');
const finalInspectionNo = await generateDocumentNo('final_inspection');
const labTestNo = await generateDocumentNo('lab_test');
const unqualifiedNo = await generateDocumentNo('unqualified', {}, conn);
const handleNo = await generateDocumentNo('unqualified_handle');
// src/lib/spc-analysis.ts:355 → 与仓储层统一为 unqualified（消除 NQ- 格式）
const spcUnqualifiedNo = await generateDocumentNo('unqualified', {}, conn);

// 财务
const receivableNo = await generateDocumentNo('receivable', {}, conn);
const payableNo = await generateDocumentNo('payable', {}, conn);
const voucherNo = await generateDocumentNo('voucher', {}, conn);
const receiptNo = await generateDocumentNo('receipt', {}, conn);
const paymentNo = await generateDocumentNo('payment', {}, conn);
// api/finance/invoice/route.ts（按类型二选一）
const invoiceNo = await generateDocumentNo(isPurchase ? 'invoice_purchase' : 'invoice_sales');
const expenseNo = await generateDocumentNo('expense');
// 期末结转（原 SZ-{YYYYMM}-001 固定 001）→ 归入 voucher
const closingVoucherNo = await generateDocumentNo('voucher');
// 工资转账（原 TR{YYYYMM}{TS}）→ 归入 voucher
const salaryVoucherNo = await generateDocumentNo('voucher');

// 设备
const equipmentCode = await generateDocumentNo('equipment');
const maintenancePlanNo = await generateDocumentNo('maintenance_plan');
const maintenanceRecordNo = await generateDocumentNo('maintenance_record');
const scrapNo = await generateDocumentNo('equipment_scrap');
const repairNo = await generateDocumentNo('equipment_repair');
const calibrationNo = await generateDocumentNo('equipment_calibration');
const dieCode = await generateDocumentNo('die');
const dieMaintenanceNo = await generateDocumentNo('die_maintenance');

// 人事
const employeeNo = await generateDocumentNo('employee');
// app/[locale]/hr/employee/page.tsx：删除前端本地生成，改为提交时不带 employee_no，由后端生成

// 样品 / 标准卡 / 印前
const sampleProcessNo = await generateDocumentNo('sample_process_card');
const templateNo = await generateDocumentNo('sample_process_template');
const cardCode = await generateDocumentNo('standard_card', { sc_type: typePrefix });
const cardVersionNo = await generateDocumentNo('standard_card_version', {
  card_no: originalCardNo,
  version,
});
const massCardNo = await generateDocumentNo('mass_process_card', { card_no: sampleCardNo });
const sampleToMassNo = await generateDocumentNo('sample_to_mass', {}, conn);
const processCardNo = await generateDocumentNo('process_card');
const traceNo = await generateDocumentNo('trace');
const materialQr = await generateDocumentNo('material_qr', { material_id: materialId });
const inkColorCode = await generateDocumentNo('ink_color', {}, conn);
const inkVersionNo = await generateDocumentNo('ink_formula_version', { major, minor });
```

**注意**：`MysqlStandardCardRepository.getNextSequence` 原实现存在「无记录时返回 `{YYYYMMDD}0001`（丢前缀）」的缺陷（`src/infrastructure/repositories/MysqlStandardCardRepository.ts:347`），替换后该缺陷自动消失。

- [ ] **步骤 2：删除本地实现**

删除 `MysqlUnqualifiedRepository.generateUnqualifiedNo/generateHandleNo`、`FinanceVoucherHandler.generateVoucherNo`、`MysqlEquipmentRepository.generateEquipmentCode`、`MysqlEmployeeRepository.generateEmployeeNo`、`EmployeeRepository.generateEmployeeNo`、`MysqlStandardCardRepository.getNextSequence`、`SampleProcessCardService.generateSampleNo/generateQuoteNo`、`SampleProcessTemplateService.generateTemplateNo`、`StandardCard.generateCode`、`StandardCardRepository` 的版本号拼接（改为模板），及各 API 路由的本地 `generateXxxNo`。

- [ ] **步骤 3：处理 InkFormulaVersion 的语义版本**

`src/domain/dcprint/aggregates/InkFormulaVersion.ts:391-420` 的 `V{major}.{minor}` 是语义版本而非流水，改为调用引擎以统一入口：

```ts
const versionNo = await generateDocumentNo('ink_formula_version', { major, minor });
```

- [ ] **步骤 4：验证**

运行：`npm run ts-check && npm run test:unit:run`
预期：无报错，单测全绿

手测：
1. 来料检验 → `IQC20260922001`；过程检验 → `QI...`；终检 → `FPR...`
2. 新增不合格品 → 处理单号 `UNQ-2026-0922-001`；SPC 触发的不合格品单号为 `UQ-20260922-0001`（不再是 `NQ-...`）
3. 新增员工 → `EMP20260922-0001`
4. 新建标准卡 → 四种类型分别 `SCC/SCP/SCQ/SCZ` + 日期 + 4 位流水，且首条不再丢前缀
5. 生成应收/应付/凭证 → `REC` / `PAY` / `VCH`
6. 设备校准/维修/报废 → `JD` / `WX` / `BF`；保养记录为 `EQMR`（不再与领料单 `MR` 撞）

- [ ] **步骤 5：Commit**

```bash
git add src/app/api src/infrastructure src/application src/lib src/domain "src/app/[locale]/hr/employee/page.tsx"
git commit -m "refactor(numbering): 质检/财务/设备/人事/样品模块单号改由统一引擎生成"
```

---

## 任务 16：清理旧体系

**文件：**
- 修改：`src/lib/global-config.ts`
- 修改：`src/components/SystemConfigInitializer.tsx`
- 修改：`src/app/api/settings/system/route.ts`

- [ ] **步骤 1：删除编号相关导出**

从 `src/lib/global-config.ts` 删除：

```ts
// 删除以下导出（其余 getConfig / 非编号 getter 全部保留）：
// generateDocNo
// getWoPrefix / getSamplePrefix / getMrPrefix / getFprPrefix / getQiPrefix / getShPrefix
// getPoPrefix / getIcPrefix / getTrPrefix / getWrPrefix / getScPrefix / getMpPrefix
// getBfPrefix / getJdPrefix / getWxPrefix
```

- [ ] **步骤 2：确认无残留引用**

运行：`npm run ts-check`
预期：无 `has no exported member` 报错；若报错说明步骤 1 删除的导出仍被引用，回到任务 13-15 补齐替换

- [ ] **步骤 3：保留兼容别名逻辑**

`src/lib/document-numbering.ts` 中的 `LEGACY_PREFIX_KEY_TO_DOC_TYPE` 与 `loadLegacyPrefixKeys` **保留不动**（规格第 8.1 节：一个发布周期后清理）。`SystemConfigInitializer.tsx` 与 `/api/settings/system` 无需改动（它们只负责注入/清除非编号配置缓存）。

- [ ] **步骤 4：全量回归**

运行：`npm run ts-check && npm run lint && npm run test:unit:run`
预期：ts-check 无新增报错（存量报错除外）、lint 0 error、单测全绿

- [ ] **步骤 5：Commit**

```bash
git add src/lib/global-config.ts
git commit -m "refactor(numbering): 删除旧编号生成体系（前缀 getter 与 generateDocNo）"
```

---

## 任务 17：集成回归与文档更新

**文件：**
- 修改：`tests/integration/workorder-api.test.ts`
- 修改：`docs/03-技术规范/编码规范.md`（或新增 `docs/03-技术规范/编号规范.md`）

- [ ] **步骤 1：更新受影响的集成测试断言**

`tests/integration/workorder-api.test.ts` 中断言工单号格式的用例，改为匹配当前模板：

```ts
expect(workOrderNo).toMatch(/^WO\d{8}\d{6}$/);
```

- [ ] **步骤 2：运行集成测试**

运行：`npm run test:unit:run -- tests/integration/workorder-api.test.ts`
预期：PASS

- [ ] **步骤 3：补充编号规范文档**

在 `docs/03-技术规范/` 下新增 `编号规范.md`，内容包含：

1. 唯一入口：`generateDocumentNo(docType, ctx?, conn?)`
2. 占位符语法表（同规格第 3.2 节）
3. 新增单据类型的步骤：在 `src/lib/doc-types.ts` 的 `DEFAULT_TEMPLATES` 增一行 → 在 `database/migrations/088_document_numbering.sql` 补一条种子 → 调用引擎
4. **禁止**：在任何模块内自行拼接单号；禁止使用 `Math.random()` / `Date.now()` 作为单号
5. 旧前缀键别名在一个发布周期后清理的说明

- [ ] **步骤 4：最终全量验证**

运行：`npm run ts-check && npm run lint && npm run test:unit:run`
预期：全部通过

- [ ] **步骤 5：Commit**

```bash
git add tests/integration/workorder-api.test.ts docs/03-技术规范/编号规范.md
git commit -m "docs+test(numbering): 补充编号规范文档并更新工单号断言"
```

---

## 计划自检

### 规格覆盖度对照

| 规格章节 | 对应任务 |
|---|---|
| 3.1 存储（sys_config） | 任务 6（种子）、任务 4（读取） |
| 3.2 占位符语法 | 任务 2（解析）、任务 3（渲染） |
| 3.3 校验规则 | 任务 2 |
| 3.4 重置周期推导 | 任务 2 |
| 3.5 不消费流水的模板 | 任务 7（`seqLength === null` 分支） |
| 4.1 表结构 | 任务 5 |
| 4.2 取号算法 | 任务 5 |
| 4.3 首次启用初始化 | 任务 6 |
| 5 引擎 API | 任务 2-7、9 |
| 6 缓存与生效时机 | 任务 4（60s 缓存）、任务 12（保存后清缓存，由现有 `/api/system/config` 负责） |
| 7 docType 清单（83 个） | 任务 1（模板表）、任务 12（UI 清单）、任务 13-15（调用点） |
| 8.1 兼容别名 | 任务 4 |
| 8.2 迁移脚本 | 任务 5、6 |
| 8.3 存量数据不改写 | 任务 6（仅初始化 last_seq，不 UPDATE 业务表） |
| 9.1-9.4 配置界面 | 任务 10-12 |
| 10 收敛清单 | 任务 13-16 |
| 11 测试策略 | 任务 2-9、17 |
| 12 风险与回滚 | 任务 16（旧逻辑保留别名，可回滚） |
| 13 实施批次 | 任务 13-16 即批次 2-5；批次 1 为任务 1-12 |

### 缺口与修正

| 发现 | 处理 |
|---|---|
| 规格第 6 节说"保存后清缓存"，但缓存在 Next.js 服务端进程内、客户端组件无法清理 | 任务 4 实现独立的 `clearNumberingRuleCache()`；任务 12 步骤 3 在 `/api/system/config` 的 POST/PUT 写入成功后调用它 |
| 规格第 5 节的 `renderDocumentNoPreview` 返回值未含 `missingVariables` | 任务 7 已补充该字段，规格第 5 节需同步 |
| 规格第 9.2 节单据类型名来自 `config_name` | 任务 6 的种子 SQL 已写入 `config_name`，任务 12 直接读取 |
| `/api/document-number` 依赖 `DocumentType` / `validateDocumentNo` | 任务 9 保留导出并改实现 |
| `getConfig` 被 dashboard、warehouse-core 等广泛使用 | 任务 16 明确只删编号相关导出 |

### 占位符扫描

已检查：计划中无"待定""TODO""后续实现""添加适当的错误处理""类似任务 N"等表述；每个代码步骤均带完整代码块或精确的一行替换代码。

### 类型一致性

- `generateDocumentNo(docType: string, ctx?: DocumentNumberContext, conn?: DbConnection)` 在任务 7 定义，任务 13-15 的调用全部使用该三参签名。
- `getNextSequence(conn, docType, period)` 在任务 5 定义，被任务 7 的 `generateDocumentNo` 调用，签名一致。
- `renderTemplate(template, now, ctx, options)` 返回 `{ text, missing }`：任务 3 定义，任务 7 使用 `.text`，一致。
- `parseTemplate(template)` 返回 `{ prefix, suffix, seqLength, variables }`：任务 2 定义，任务 7、9 使用，一致。
- `DocumentNumberContext` 任务 2 定义，任务 3、7 使用，一致。
- `DEFAULT_TEMPLATES` / `NUMBERING_DOC_TYPES` 任务 1 定义，任务 6（种子）、任务 12（UI）、任务 4（回退）使用，一致。
