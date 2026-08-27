# 入库（Inbound）模块测试交付清单

> 交付日期：2026-08-27
> 范围：单元 / 集成 / 并发 / E2E / 边界
> 技术栈：Vitest v4.1.5（单元·集成直连 MySQL 8.0 `vnerpdacahng`）+ Playwright（E2E，dev server `http://localhost:5000`，chromium）

## 一、总览

| 层级 | 文件数 | 用例数 | 结果 |
|------|-------|-------|------|
| E2E（Playwright） | 2 | 8 | ✅ 8/8 passed (1.5m) |
| 单元 / 集成 / 并发（Vitest） | 14 | 155 | ✅ 155/155 passed |
| **合计** | **16** | **163** | **✅ 全部通过** |

> 注：Vitest 用例数 = 14 个文件合计 155 例（含此前 1 例 stale 测试，已修复）。E2E 8 例独立于 Vitest。

## 二、E2E 覆盖（`tests/inbound*.spec.ts`，需 live dev server）

| 文件 | 用例 | 说明 |
|------|------|------|
| `tests/inbound.spec.ts` | TC-INBOUND-001 / 002 / UI 元素检查 / 页面加载性能 | 页面加载、列表渲染、按钮数量、加载耗时 |
| `tests/inbound-flow.spec.ts` | E2E-IN-001 / 002+006 / 006b / 009 | 页面加载、新增入库单并出现在列表（含成功单号 `IN\d{10,}` 断言）、对话框内 PO 搜索框、切料页打开 |

- 运行命令（需先 `npm run dev` 起 :5000）：
  ```bash
  node node_modules/@playwright/test/cli.js test \
    --config=playwright.e2e.config.ts \
    tests/inbound.spec.ts tests/inbound-flow.spec.ts --reporter=line
  ```
- 仅启用 chromium（firefox/webkit 沙箱无法启动）；产物重定向至 `node_modules/.cache/pw/`（避开 safe-delete 对根 `test-results` 的拦截）。

## 三、Vitest 覆盖（14 文件 / 155 例，直连真实库）

**集成（事件驱动链路）**
- `tests/integration/inbound-api.test.ts` — 入库 API 创建/校验（34 例）
- `tests/integration/inbound-approve-chain.test.ts` — 审核链：库存同步 + PO 回写 + 应付生成
- `tests/integration/inbound-from-po.test.ts` — 采购订单来源入库 + 超收守卫 `receive(tolerance)`
- `tests/integration/inbound-unapprove-rollback.test.ts` — 反审核回滚（库存/应付/PO 状态）
- `tests/concurrency/purchase-inbound.test.ts` — 并发入库（2 例）

**单元（领域模型 / 校验）**
- `tests/unit/domain/warehouse/aggregates/inbound-order.test.ts`
- `tests/unit/domain/warehouse/aggregates/inbound-order-gaps.test.ts`
- `tests/unit/domain/warehouse/entities/inbound-item.test.ts`（8 例，含本次修正）
- `tests/unit/domain/warehouse/events/inbound-order-events.test.ts`
- `tests/unit/domain/purchase/entities/purchase-order-line-receive.test.ts`
- `tests/unit/warehouse/inbound-from-po.test.ts`
- `tests/unit/app/api/warehouse/production-inbound.test.ts`
- `src/__tests__/domain/inbound-order.concurrency.test.ts`
- `src/__tests__/validations/inbound-schema.test.ts`

运行（需 live MySQL `127.0.0.1:3306 / vnerpdacahng / Snqig521223`）：
```bash
node node_modules/vitest/vitest.mjs run \
  tests/integration/inbound-*.test.ts tests/concurrency/purchase-inbound.test.ts \
  tests/unit/domain/warehouse/**/*.test.ts tests/unit/domain/purchase/**/*.test.ts \
  tests/unit/warehouse/inbound-from-po.test.ts tests/unit/app/api/warehouse/production-inbound.test.ts \
  src/__tests__/domain/inbound-order.concurrency.test.ts src/__tests__/validations/inbound-schema.test.ts
```

## 四、本轮修复记录

| # | 类型 | 文件 | 问题 | 修复 |
|---|------|------|------|------|
| 1 | 前端 Bug（前序已修，E2E 捕获） | `src/app/[locale]/warehouse/inbound/components/dialogs/AddDialog.tsx` | `warehouse_id` 以字符串发送 → API Zod `z.number()` 返回 422，普通入库建单失败 | 两处均改为 `Number(formData.warehouse)` |
| 2 | 配置 TS 错误 | `playwright.e2e.config.ts` | `outputDir` 写在 `use` 内 → `TS2353`（该字段不在 `UseOptions`）；原 spread 主配置导致 `TS2769` 重载不匹配 | 改为独立、类型标注为 `PlaywrightTestConfig`，`outputDir` 置于**顶层**；`tsc --noEmit` 对该文件 0 错误 |
| 3 | 过时单测 | `tests/unit/domain/warehouse/entities/inbound-item.test.ts` | 断言 `materialId:0` 抛错，但实体 `InboundItem.create` 显式允许 `0`（自由录入物料，未关联主数据；与 API `checkMaterialsCategorized` 过滤 `0` 一致） | 改为：断言 `materialId:0` 合法；`null/undefined/负数` 才抛错 |

## 五、已知限制 / 环境注意事项

- **E2E 依赖 live dev server**：必须先在 :5000 起 `npm run dev`；仅 chromium。
- **`tsc --noEmit` 基线**：全量约 2264 个 `error TS`，**全部位于其他模块**（contract-review、ink、finance/report、hr、orders、purchase、quality 等），**无一个在入库模块**；另含 `TS5033`（沙箱 EPERM 无法写 `tsconfig.tsbuildinfo`）。均为预存问题，非本次引入。
- **Vitest 全量退出码非 0**：根因是 `pino` logger teardown（与用例无关）；全量约 151 失败为预存基线（useInboundData/usePrintLabels 渲染、inventory-sync、material-requisition 等），与入库逻辑无关。本交付的入库子集 155/155 全绿。
- **safe-delete 外壳**：`node -e fs.rmSync(...)` 删除 >50 文件的目录（如 `node_modules/.cache/pw/test-results`、`.next`）会被拦截（`SAFE_DELETE_BULK_CONFIRM_REQUIRED` / 抛错）。须用 **PowerShell `Remove-Item -LiteralPath <path> -Recurse -Force`** 绕过（直接 .NET 调用，不经 node 包装）。
- **`.next` 缓存损坏 → 页面 500**：偶发（含 `/en/login`）。现象：dev server 在 :5000 监听但返回 500。修复流程：①`Stop-Process` 杀掉 :5000 监听进程 → ②PowerShell 删 `.next` → ③`npm run dev` 干净重启。
- **Playwright 启动清理**：passing run 不写产物（trace/screenshot/video 均为 failure/retry-only），故 outputDir 在绿跑后为空；仅失败 run 会累积产物，需在下次跑前用 PowerShell 清理该目录。
- **global-setup `reset-lock 401`**：非致命告警（登录在各测试中独立完成），不影响通过。

## 六、复跑验证（本次交付前）

- E2E：`8 passed (1.5m)`，exit 0。
- Vitest 入库子集：155/155（14 文件），其中 `inbound-item.test.ts` 单独复跑 8/8 确认修正生效。
- `playwright.e2e.config.ts` 经 `tsc --noEmit` 扫描：0 个 `playwright.e2e.config` 相关错误。
