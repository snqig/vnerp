# i18n 硬编码中文详细分析报告

**报告生成时间**: 2026-08-27
**数据来源**: `pnpm lint --format json` 输出 → 4384 条 `i18n/no-chinese-hardcode` 告警
**分析脚本**: `scripts/analyze-hardcode-detail.mjs`
**原始数据**: `eslint-baseline.json`, `i18n-hardcode-detail.json`

---

## 1. 总体概览

| 指标 | 数值 |
|------|------|
| **硬编码中文条目总数** | **4384** |
| **涉及文件数** | **417** |
| **涉及模块数** | **26** |
| **重复字符串种类** | 292 |
| **重复出现总次数** | 1516 |
| **重复占比** | 34.6% |

**核心问题**:近三分之一硬编码中文是同一字符串在多个文件中重复出现,说明存在大量可抽取到公共命名空间的 UI 文案。

---

## 2. 模块分布 Top 20

| 排名 | 模块 | 条目数 | 占比 | 可视化 |
|------|------|--------|------|--------|
| 1 | other(API + 组件库) | 1739 | 39.7% | ████████████████████████████████████████████████████ |
| 2 | sample(样品管理) | 600 | 13.7% | ████████████████████████████ |
| 3 | dcprint(印刷工艺) | 455 | 10.4% | ███████████████████████ |
| 4 | warehouse(仓储) | 323 | 7.4% | ████████████ |
| 5 | settings(系统设置) | 302 | 6.9% | ███████████ |
| 6 | purchase(采购) | 171 | 3.9% | ██████ |
| 7 | quality(质量管理) | 155 | 3.5% | ██████ |
| 8 | equipment(设备) | 148 | 3.4% | █████ |
| 9 | modules(模块管理) | 124 | 2.8% | ████ |
| 10 | dashboard(仪表盘) | 105 | 2.4% | ███ |
| 11 | hr(人力资源) | 86 | 2.0% | ██ |
| 12 | orders(订单) | 56 | 1.3% | █ |
| 13 | business(业务) | 40 | 0.9% | |
| 14 | production(生产) | 29 | 0.7% | |
| 15 | advanced(高级功能) | 18 | 0.4% | |
| 16 | sales(销售) | 9 | 0.2% | |
| 17 | base-data(基础数据) | 7 | 0.2% | |
| 18 | finance(财务) | 6 | 0.1% | |
| 19 | not-found | 3 | 0.1% | |
| 20 | srm | 2 | 0.05% | |

**关键发现**:
- `other` 模块占 39.7%,全部是 API 路由(`src/app/api/**`)和共享组件库中的硬编码。
- `sample`(样品管理)模块 600 处,是问题最集中的业务模块之一。
- 高频业务模块(`warehouse`、`purchase`、`quality`、`equipment`)合计 749 处,占总量的 17.1%。

---

## 3. 问题文件 Top 30

| 条数 | 文件路径 |
|------|----------|
| 201 | `src/app/api/settings/system/route.ts` |
| 142 | `src/app/[locale]/settings/config/page.tsx` |
| 124 | `src/app/[locale]/modules/page.tsx` |
| 121 | `src/app/[locale]/sample/standard-card/InputV2Form.tsx` |
| 104 | `src/app/[locale]/sample/standard-card/input-card/page.tsx` |
| 90 | `src/app/[locale]/sample/standard-card/print/page.tsx` |
| 87 | `src/app/[locale]/quality/process/page.tsx` |
| 85 | `src/app/[locale]/sample/standard-card/input/page.tsx` |
| 82 | `src/app/api/system/config/route.ts` |
| 73 | `src/app/[locale]/warehouse/split-order/page.tsx` |
| 67 | `src/app/[locale]/dashboard/flow/page.tsx` |
| 67 | `src/app/[locale]/warehouse/outbound/page.tsx` |
| 66 | `src/app/[locale]/dcprint/ink-opening/page.tsx` |
| 65 | `src/app/[locale]/dcprint/tool/page.tsx` |
| 64 | `src/app/[locale]/sample/standard-card/input-v2/page.tsx` |
| 58 | `src/app/[locale]/dcprint/screen-plate/page.tsx` |
| 54 | `src/app/[locale]/sample/orders/[id]/edit/page.tsx` |
| 50 | `src/app/[locale]/equipment/maintenance/page.tsx` |
| 49 | `src/app/[locale]/dcprint/ink-formula/page.tsx` |
| 49 | `src/app/[locale]/settings/seed-data/page.tsx` |
| 42 | `src/app/[locale]/dcprint/tool-manage/page.tsx` |
| 42 | `src/app/[locale]/hr/employee/page.tsx` |
| 40 | `src/app/[locale]/business/contract-review/page.tsx` |
| 38 | `src/app/[locale]/quality/spc/page.tsx` |
| 36 | `src/app/[locale]/dcprint/trace/page.tsx` |
| 36 | `src/app/api/system/user/fix-names/route.ts` |
| 36 | `src/lib/error-handler.ts` |
| 35 | `src/app/[locale]/purchase/request/new/page.tsx` |
| 34 | `src/app/[locale]/dashboard/ceo/page.tsx` |
| 34 | `src/app/[locale]/purchase/request/form/page.tsx` |

**关键发现**:
- Top 1 文件 (`route.ts:201`) 是系统配置 API,所有错误消息硬编码,应统一到一个错误码映射表。
- **样卡输入表单组件** `InputV2Form.tsx` 单独贡献 121 处,是单文件硬编码最多的文件。
- sample 模块有 4 个文件进入 Top 30(`InputV2Form.tsx`、`input-card/page.tsx`、`print/page.tsx`、`input/page.tsx`),合计 400 处,占 sample 模块总量的 66.7%。

---

## 4. 重复硬编码字符串 Top 30

以下字符串在同一项目中多次出现,建议提取到 `Common` 命名空间统一管理:

| 次数 | 字符串 | 涉及文件数 |
|------|--------|------------|
| 39 | **取消** | 32 |
| 36 | **ID不能为空** | 19 |
| 19 | 操作失败 | 7 |
| 18 | 错误 | 3 |
| 17 | 共 | 16 |
| 16 | 物料名称 | 14 |
| 16 | 没有需要更新的字段 | 15 |
| 15 | 失败 | 5 |
| 15 | 上一页 | 14 |
| 15 | 下一页 | 14 |
| 14 | 条 | 12 |
| 13 | 备注 | 11 |
| 13 | 单据编码规则 | 2 |
| 12 | 暂无记录 | 10 |
| 12 | 草稿 | 11 |
| 12 | 状态 | 9 |
| 12 | 物料编码 | 11 |
| 12 | 加载中... | 12 |
| 12 | 仓库管理规则 | 2 |
| 11 | 原材料 | 4 |
| 11 | 无效的操作类型 | 9 |
| 10 | 网版 | 7 |
| 10 | 设备编码 | 5 |
| 10 | 设备名称 | 5 |
| 10 | 件 | 9 |
| 10 | 已取消 | 10 |
| 10 | 缺少必要参数 | 7 |
| 10 | 系统基础配置 | 1 |
| 9 | 删除失败 | 6 |
| 9 | 操作 | 9 |

**关键发现**:
- **通用 UI 控件文案**(取消、上一页、下一页、共、条)应统一到 `Common` 命名空间。
- **API 错误消息**(ID不能为空、操作失败、缺少必要参数、无效的操作类型)应从 API 层统一返回错误码,前端按码翻译。
- **物料/设备相关文案**(物料名称、物料编码、设备名称、设备编码)属于实体属性标签,应在对应业务命名空间中统一管理。

---

## 5. 根因分析

### 5.1 自动化改写机制缺失

虽然 `scripts/i18n-extract.mjs` 已在 2026-08-10 产出脚手架(4042 条,2483 个去重 key),但**从未持续推进实际迁移**。脚手架只产出,不自动改写源码。

### 5.2 ESLint 规则级别为 warn,CI 不阻塞

`eslint.config.mjs` 中配置为 `'warn'`:
```js
'i18n/no-chinese-hardcode': ['warn', { /* ... */ }]
```
新功能/页面提交时不会报错,导致问题持续累积。

### 5.3 命名空间划分规则不细

当前规范仅定义了 23 个命名空间:`Common`、`Nav`、`Auth`、`Dashboard`、`Orders`、`Warehouse`、`Production`、`Dcprint`、`QRCode`、`Purchase`、`Sales`、`Finance`、`Quality`、`Equipment`、`Outsource`、`Srm`、`Crm`、`Hr`、`System`、`Engineering`、`Delivery`、`Business`、`Theme`。

但 API 错误消息未归入任何命名空间,暂存为 `other`,造成命名空间管理混乱。

### 5.4 大型组件缺乏 i18n wrapper

`InputV2Form.tsx` 等 121 处硬编码的核心原因是:组件库层未提供 i18n wrapper,开发人员必须逐行替换,工作量巨大。

---

## 6. 修复优先级建议

### P0:建立红线(立即执行)

| 序号 | 行动 | 预期效果 |
|------|------|----------|
| P0-1 | 将 `i18n/no-chinese-hardcode` 从 `warn` 提升为 `error` | CI 阻塞含硬编码的 PR |
| P0-2 | 新增 `lint:gate` 脚本,CI 阶段运行 `pnpm lint:i18n` | 防止回潮 |

### P1:迁移通用 UI 字符串(本周)

| 序号 | 行动 | 预期效果 |
|------|------|----------|
| P1-1 | 将 Top10 重复字符串(~150 次)提取到 `Common` 命名空间 | 消除 150 处硬编码 |
| P1-2 | API 错误消息改为错误码,前端按码翻译 | 解决 API 层 1739 处硬编码 |

### P2:分模块增量迁移(分月消化)

| 月份 | 目标模块 | 预估条目 |
|------|----------|----------|
| 本月 | `sample` 模块(4 个核心文件) | 400 |
| 下月 | `dcprint` 模块 | 455 |
| 下下月 | `settings` + `warehouse` 模块 | 625 |

### P3:长期治理

| 序号 | 行动 | 预期效果 |
|------|------|----------|
| P3-1 | 封装组件 i18n wrapper(`<InputV2Form t={...} />`) | 减少 60% 以上手动替换 |
| P3-2 | 建立译员协作流程 | en/vi/zh-TW 翻译及时补齐 |
| P3-3 | 定期扫描(`pnpm i18n:check`) | 每月监控进展 |

---

## 7. 技术实现参考

### 7.1 提升 ESLint 规则级别

修改 `eslint.config.mjs`:
```js
// 从 warn 提升到 error
'i18n/no-chinese-hardcode': ['error', { /* ... */ }],
```

### 7.2 通用 UI 字符串迁移示例

以 `取消`(39 处)为例:
```tsx
// 之前
<button>{'取消'}</button>

// 之后
import { useTranslations } from 'next-intl';
const t = useTranslations('Common');
<button>{t('cancel')}</button>
```

语言包补充(`messages/zh-CN.json`):
```json
{
  "Common": {
    "cancel": "取消",
    "previousPage": "上一页",
    "nextPage": "下一页",
    "totalCount": "共"
  }
}
```

### 7.3 API 错误码统一方案

修改 `src/lib/error-handler.ts`:
```ts
// 错误码定义
export enum ErrorCode {
  MISSING_ID = 'MISSING_ID',
  OPERATION_FAILED = 'OPERATION_FAILED',
  INVALID_PARAMS = 'INVALID_PARAMS',
}

// API 响应格式
export interface ApiResponse<T> {
  code: string;      // 错误码
  message: string;   // 前端按错误码显示
  data?: T;
}
```

---

## 8. 产出物

| 文件 | 用途 |
|------|------|
| `i18n-hardcode-detail.json` | 完整结构化数据(用于后续工具处理) |
| `i18n-report.txt` | 控制台可读摘要 |
| `eslint-baseline.json` | 原始 ESLint JSON 输出(15MB) |
| `scripts/analyze-hardcode-detail.mjs` | 本分析报告的分析脚本 |

---

## 9. 附录:相关资源链接

- [i18n 规范文档](./docs/11-开发指南/i18n规范.md)
- [项目审计报告(P2-F)](./docs/project-audit-2026-08-10.md)
- [ESLint 自定义规则源码](./eslint-rules/no-chinese-hardcode.js)
- [语言包文件](./messages/)

---

*报告由 `scripts/analyze-hardcode-detail.mjs` 自动生成*
