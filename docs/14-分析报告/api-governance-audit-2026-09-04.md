# API/接口治理审计报告（2026-09-04）

> 范围：ERP（`vnERPNext`，Next.js App Router + Drizzle + MySQL 8.0）的 API 接口治理专项审计。
> 方法：静态扫描 + 真实库（`vnerpdacahng`，root）`information_schema` 探测 + 错误中间件源码核对。只读审计，未改动任何代码。
> 路由规模：约 130 个 `src/app/api/**/route.ts`；错误中间件集中在 `src/lib/api-auth.ts` + `src/lib/error-handling.ts`。

---

## 结论速览

| 级别 | 数量 | 是否 live 验证 | 是否可复现 |
| ---- | ---- | -------------- | ---------- |
| P0 真实 500 | 1 | ✅ 列缺失已验证 | ✅ 逻辑可复现（未发请求实测） |
| P1 逻辑 bug（返回错误数据） | 1 | ✅ 代码静态确认 | ✅ |
| P2 结构性风险 | 2 | ✅ 代码静态确认 | 视调用路径 |
| P3 误报已排除 | 1 | ✅ 抽样核实 | — |

**好消息**：错误分流机制本身**没有退化**——领域异常能正确映射到 4xx（`AppError.statusCode` 驱动），唯一约束冲突转 409。原记忆称的「`DomainError` 分支」实际以 `AppError` 子类实现，命名需校正，但功能正确。

---

## P0 — 真实 500：`freeze_reason` 列缺失导致 ink-query 500

- **位置**：`src/app/api/dcprint/ink-query/route.ts:277-283`（`SELECT ib.* FROM inv_inventory_batch ib ...`）+ `:300`（`freeze_reason: batch.freeze_reason`）。
- **根因**：live `inv_inventory_batch` **不存在** `freeze_reason` 列（`information_schema` 探测返回 `[]`）。`SELECT ib.*` 会展开该列 → MySQL 抛 `1054 Unknown column` → `queryInventoryExpiry` 抛错 → 被 `withAuthAndErrorHandler` 的 `catch` 吞成 500。
- **为什么列没有**：该列由 `init/data-logic` 迁移负责添加（`route.ts:178` 的 `safeExecute(ts('k_ghrsfu'), 'inv_inventory_batch.freeze_reason')`），但迁移未执行/未生效。
- **影响**：凡进入 `queryInventoryExpiry` 的 ink-query 追溯请求（带 `batch_no`）全部 500。
- **修复方向（二选一，推荐前者）**：
  1. 运行 `init/data-logic` 迁移补足 `freeze_reason` 列（与历史决策「需冻结原因须先跑 init/data-logic 迁移」一致）；
  2. 临时规避：把 `SELECT ib.*` 改为显式列名并剔除 `freeze_reason`（仅当暂不需要冻结原因时）。
- **验证证据**：`information_schema` 查询 `freeze_reason` → `[]`；`status`=tinyint、`alert_level`=varchar(20) 已坐实。

---

## P1 — 逻辑 bug：stocktaking 的 `searchParams.get() !== ''` 参数陷阱

- **位置**：`src/app/api/warehouse/stocktaking/route.ts:27-28`
  ```ts
  const status = searchParams.get('status') !== '' ? Number(searchParams.get('status')) : undefined;
  const type   = searchParams.get('type')   !== '' ? Number(searchParams.get('type'))   : undefined;
  ```
- **根因**：缺参时 `searchParams.get('status')` 返回 `null`，`null !== ''` 为 `true` → `Number(null) = 0` → 静默追加 `AND s.status = 0`（/ `s.taking_type = 0`）过滤条件。
- **影响**：前端不传 `status`/`type` 时，列表**只返回 status=0 的记录**，其余被错误过滤掉——返回的是错误数据而非报错，隐蔽性强。
- **修复方向**（与历史既定修法一致）：
  ```ts
  const raw = searchParams.get('status');
  const status = raw !== null && raw !== '' ? Number(raw) : undefined;
  // type 同理
  ```
- **验证**：代码静态确认，与记忆「`searchParams.get(x) !== ''` 陷阱：缺参返回 null，null!=='' 为真 → Number(null)=0 误当 status=0」完全吻合。

---

## P2 — 结构性风险：API 路由层 25 个文件直接 `throw new Error`（非 AppError）

- **位置**：全量 grep `throw new Error(` 命中 25 个 `route.ts`（workorders、warehouse/sales-outbound、warehouse/outbound/fifo、warehouse/outbound/confirm、warehouse/split-order、dcprint/ink-usage、dcprint/ink-surplus、sample/orders/linkage、linkage/validate、outsource/*、engineering/sample-to-mass、biz/contract-review、warehouse/stocktaking 等）。
- **根因**：这些 throw 是裸 `Error`，不是 `AppError` 子类。进入 `withAuthAndErrorHandler` 后落入 `else` 分支 → `errorResponse('服务器内部错误', 500)`，业务语义丢失，前端拿不到可读错误，也无法走 i18n 翻译。
- **影响**：参数/业务校验失败被当成 500，污染 500 治理基线，且错误不可消费。
- **修复方向**：校验类改用 `AppError.badRequest(...)` / `AppError.notFound()`；或在 application 层把领域异常统一包装为 `AppError` 再抛出。`BusinessError`（statusCode 400）已存在，可直接复用。
- **验证**：`src` 全量 grep 统计；路由层 25 文件命中。

---

## P2 — 文档/记忆校正：错误分流命名与记忆不符（非代码缺陷）

- 记忆称「`withAuthAndErrorHandler` 新增 `DomainError` 分支（NotFound→404 / VersionConflict / InvalidTransition→409）」。`src/lib` 全量 grep `DomainError|VersionConflict|InvalidTransition` → **无匹配**。
- **实际机制**（已读 `api-auth.ts:209-218` + `error-handling.ts:39-201`）：
  - `AppError` 及其子类携带 `statusCode`：`notFound()`→404、`conflict()`→409、`BusinessError`/`ValidationError`→400。
  - `withAuthAndErrorHandler` 的 `error instanceof AppError` 分支按 `statusCode` 正确分流；`isUniqueViolation`→409。
  - 功能**正确**，但后续维护者若按 `DomainError` 名称找分支会找不到。建议校正记忆/注释。

---

## P3 — 已抽样排除的误报：`query()`/`conn.query` 元组解构

- 初看 `const [x] = await conn.query(...)`（路由层 80+ 处）疑似「全局 `query` 返回 `T[]` 被当元组解构」陷阱。
- 抽样 `inventory/route.ts:305` 确认：`conn` 为**真实 mysql 连接**（与 `conn.execute`、事务 `FOR UPDATE` 同上下文），`conn.query` 返回 `[rows, fields]`，解构合法；后续 `fifoBatches.length` / `fifoBatches[0]` 正确。
- **结论**：路由层此类解构绝大多数为合法。仅当「全局 `query` 被别名当作连接 `query` 传入」时才触发 memory 所述 reduce 崩。建议保留为迁移补列后的回归关注项，**不计入当前缺陷**。

---

## 未验证项（诚实披露）

1. **API 500 基线复测未跑**：`scripts/smoke-apis.cjs` 需 dev server 在线；当前 `http://localhost:5000` 返回 `HTTP 000`（服务未运行）。按只读审计原则未擅自起服务（且本环境 `.next` 缓存有 EPERM 坑）。建议下一步：`npm run dev`（脚本自带 `-p 5000`）后跑 `node scripts/smoke-apis.cjs`，核对是否仍 0 个 500、有无因 `freeze_reason`/其他新增回归。
2. **ink-query 500 未发请求实测**：基于「live 列缺失 + `SELECT ib.*` 必含该列」的逻辑推导，置信度高但属推断非实测。起服务后可一键复现。

---

## 修复优先级建议

1. **立即**：补 `freeze_reason` 列（跑 `init/data-logic`）或临时改 ink-query 显式列名 → 消除 P0 500。
2. **本周**：修 stocktaking 参数陷阱（2 行）→ 消除 P1 数据错误。
3. **迭代**：把 25 个路由的裸 `throw new Error` 收敛为 `AppError` → 降低 500 噪音、错误可消费。
4. **文档**：校正 `DomainError` 记忆/注释为 `AppError.statusCode` 机制。

---

_审计遵循「审计-修复分离」：本轮仅产出分级问题清单与修复方向，未改动代码。修复需另行确认后执行。_
