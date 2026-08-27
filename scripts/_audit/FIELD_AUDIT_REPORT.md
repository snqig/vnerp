# 前端列表 ↔ 后端字段一致性审计报告

生成日期：2026-08-24
审计范围：全部前端列表页（src/app/[locale]）与其调用的后端 GET 列表接口（src/app/api）
审计方法：静态分析 + 关键候选人工复核

## 一、方法

1. **后端字段提取（scan3.cjs）**：解析每个 `route.ts` 的 `GET` handler，提取
   - SQL `SELECT` 列（含 `*` / `t.*` / `table.*` 用真实库表结构 `database/vnerpdacahng_schema.sql` 展开）
   - `AS` 别名、`.map(item => ({...}))` 序列化字段、`serializedData` 映射
   - 包装字段（list/total/page/pageSize/pagination）已剔除
   - 输出 `scripts/_audit/be_fields.json`（281 个 GET 接口的真实返回字段集）
2. **前端字段提取（scan4.cjs）**：扫描页面目录（递归，但排除含自有 `page.tsx` 的子目录，避免跨页污染），提取表格行变量（`record/row/item/req/data/...`）的字段访问，以及模板字符串中的 `/api/...` 端点引用。
3. **差异比对**：对每个「页面引用的列表端点」，计算前端字段 − 后端字段；命中的候选再**人工读源码复核**，区分真 bug 与扫描器误报。

## 二、结论

**在已核查的范围内，未发现真实的前后端字段不对应（空白列 / undefined）问题。**
所有自动化命中的候选，经人工读源码后均判定为扫描器误报（原因见第三节）。

已核查清单：
- **仓库模块（全部一致）**：transfer / inbound / inbound/cutting / outbound / batch / inventory / split-order / stock-adjust / stocktaking / production-inbound / sales-outbound / cost / warehouse 总览 —— 之前会话已逐一读 GET handler 与前端组件核对，snake_case 与 camelCase 各自内部一致。
- **跨模块高信号候选（人工复核后均为误报）**：/qrcode、/warehouse/batch-inventory、/finance/receivables、/equipment、/customers、/purchase/suppliers、/qrcode/trace。
- **抽验**：/purchase/request（route 返回 `SELECT * FROM pur_request` + items，页面字段均为真实列）。

## 三、候选误报原因（供后续改进参考）

| 候选端点 | 真实情况 | 误报根因 |
|---|---|---|
| /qrcode | route `SELECT q.*`（qr_code/qr_type/ref_no/... 均真实返回） | 表 `qrcode_record` 不在 schema dump 中，`q.*` 无法展开 → 字段被错判缺失 |
| /warehouse/batch-inventory | route `SELECT bi.*` 返回 `inv_batch_inventory` 全部列 | schema dump 表名为 `inv_inventory_batch`（与 route 的 `inv_batch_inventory` 不一致），`bi.*` 未展开 |
| /finance/receivables | route `SELECT r.*` 返回 `fin_receivable` 全部列（amount/balance/due_date/received_amount/status/remark 均在） | r.* 展开不全；且页面内嵌收款子表导致 `payment_method/receipt_no` 等被误归因到此端点 |
| /equipment | `label` 来自前端状态映射 `EQUIPMENT_STATUS_LABEL`，非后端字段 | 前端计算字段被当成后端列 |
| /customers、/purchase/suppliers | "缺失" 的 `receivable_no/due_date/source_no` 等是页面内嵌财务子表字段 | 跨端点字段污染（同一页引用多个端点，字段被错误归因） |

## 四、扫描器固有局限（重要，影响"全量"覆盖）

1. **服务层 URL 不在页面子树**：列表接口 URL 多见于 `authFetch(\`/api/...\`)` 模板字符串，已修复正则匹配；但部分模块走统一 service 层时仍可能漏链。
2. **组件拆分渲染**：行字段散落在独立组件文件，行变量命名多样，仅能覆盖常见命名。
3. **schema dump 不完整 / 命名差异**：`qrcode_record`、`inv_batch_inventory` 等表在权威 schema dump 中的命名与 route SQL 不完全一致，导致 `*` 展开失败（属扫描器盲区，不代表运行态缺列）。
4. **`SELECT *` 跨多表**：单文件内多个 `SELECT *`（主表 + 明细表）会被并集成混合字段集，可能漏判真实返回列。

> 因此：自动化结果用于**缩小排查范围**，真正确认需以「读 route GET + 对应页面表格」或「运行态实际返回 JSON」为准。

## 五、两点值得留意（非字段错位，但建议确认）

1. **表名命名不一致**：route SQL 用 `inv_batch_inventory`，权威 schema dump 为 `inv_inventory_batch`。若 live 库确为后者，该 route 的 `FROM inv_batch_inventory` 会 500；若 live 库为前者则正常。建议以 live 库 `SHOW TABLES` 核实一次。
2. **`qrcode_record` 未纳入 schema dump**：dump 可能偏旧/不全，建议重新导出完整 schema 以保证后续分析准确。

## 六、若要 100% 确定（运行态验证路线）

启动 dev server（`npm run dev`，端口 5000），用 `auth.json` 中的会话 cookie 直接 `fetch('/api/<列表端点>?pageSize=1')`，以**真实返回 JSON 的 key 集合**作为后端字段真值，再与页面表格字段比对。此路线可彻底消除上述静态分析盲区。可复用 `scripts/_audit/scan3.cjs`（后端）与 `scan4.cjs`（前端）作为起点。

## 七、文件产出

- `scripts/_audit/scan3.cjs` —— 后端字段提取器（产出 be_fields.json）
- `scripts/_audit/scan4.cjs` —— 前端/后端字段差异扫描器
- `scripts/_audit/be_fields.json` —— 281 个 GET 接口的真实返回字段集
- `scripts/_audit/fe_be_candidates.json` —— 差异扫描原始候选结果
