# 单据编号统一收敛设计文档

> 日期：2026-09-22
> 状态：已批准（待实现）
> 范围：全项目单号/编号生成统一为「模板串 + 统一序列表」，并在 settings/config 中集中管理

## 1. 背景与目标

### 1.1 业务背景

系统里同一张单据存在多套编号生成逻辑，且大部分不读配置：

- **三套并行体系**：统一体系 `document-numbering.ts`（读 sys_config、有命名锁）、旧体系 `global-config.ts`（流水号是随机数）、各模块硬编码（约 100 处）。
- **配置形同虚设**：`document-numbering.ts` 查询的 `sales_order_prefix` / `work_order_prefix` / `delivery_prefix` 等键**在 sys_config 中并不存在**，实际只有 4 个命名空间键被播种，其余全部落到代码内默认值。
- **双键打架**：`global-config` 读 `serial_number_length`（DB 实际值 `4`），`document-numbering` 读 `serial_length`（不存在，回退 `6`），两套体系流水位数不一致；`doc_date_format` 配置存在但无人读取。
- **同物多号**：工单有 6 套格式、批次号有 8 套、应收单有 4 套、员工号有 3 套，甚至出现同表不同字段（盘点单 `check_no` vs `taking_no`）与同字段互相覆盖（`spc-analysis.ts` 与仓储层都写 `qc_unqualified.unqualified_no`）。
- **随机数取号**：约 20 处用 `Math.random()`，无唯一性保证。

### 1.2 目标

1. 建立**唯一**的编号生成入口：模板串 + 统一序列表。
2. 所有单据编号（含派生标识）的格式可在 **settings/config** 中查看、修改、预览，改完立即生效。
3. 消除「同物多号」与随机取号，编号由配置决定且在并发下不重复。
4. 删除旧体系（`generateDocNo`、15 个 `getXxxPrefix`、各模块本地生成函数）。

### 1.3 非目标（YAGNI）

- **主数据编码**不在本次范围：物料编码（`inv_material.material_code`）、客户/供应商编码、仓库编码、部门/角色编码。原因：由人工维护、已有唯一约束、历史数据量大且被大量外键引用，改造收益低于风险。
- **种子/初始化脚本**中的固定编号（如 `init/core-flow-seed/route.ts` 的 `WO-00001`、`INB-00001`）不在范围，保持原样。
- 编号**按公司主体分租户**（多组织隔离取号）不在范围。
- 存量单据号**不做追溯改写**。
- 不做编号回收/重用（软删除占用的号永久跳过，沿用现有约束）。

## 2. 现状分析

### 2.1 现有基础设施

| 资产 | 位置 | 状态 |
|------|------|------|
| `generateDocumentNo(docType, conn?)` | `src/lib/document-numbering.ts:291-348` | 有命名锁（GET_LOCK）+ 扫业务表取 max，但只覆盖 18 类 |
| `DOCUMENT_PREFIX_MAP` / `DOCUMENT_TABLE_MAP` | `src/lib/document-numbering.ts:153-194` | 18 类前缀与落库映射；11 个已声明 docType 无映射 → 回退前缀 `DOC` |
| `generateDocNo(prefix)` | `src/lib/global-config.ts:312-321` | 流水号随机，读 `serial_number_length` |
| 15 个 `getXxxPrefix()` | `src/lib/global-config.ts:128-266` | 前缀读取，缓存由 `SystemConfigInitializer.tsx:60` 注入 |
| 序号生成 | `src/lib/document-numbering.ts:319-338` | 扫业务表 max+1（含软删除行，避免唯一键冲突） |
| 配置表 | `sys_config` | `config_key UNIQUE`、`config_value VARCHAR(500)`、`config_type TINYINT(1-文本,2-开关)`、`deleted` |
| 配置读写 | `src/app/api/system/config/route.ts`、`src/lib/system-config.ts:106-126` | CRUD + 60s 缓存 |
| 配置审计 | `database/migrations/079_settings_config_schema.sql` | `sys_config_change_log` / `sys_config_change_request` |
| 配置种子 | `src/lib/system-config-seed.ts` | 127 键 |
| 盘点结论 | 全仓无 `sys_numbering_rule` / `sys_serial` / `sys_document_rule` 等规则表 | 需新建序列表 |

### 2.2 数据库现有编号配置（实测）

```
order.prefix = ORD        purchase.prefix = PO       inbound.prefix = INB     outbound.prefix = OTB
wo_prefix = WO            sample_prefix = SAMPLE     mr_prefix = MR           fpr_prefix = FPR
sh_prefix = SH            po_prefix = PO             qc_prefix = QC           sc_prefix = SC
batch_no_prefix = B       order_no_prefix = ORD      doc_date_format = YYYYMMDD
serial_number_length = 4
```

关键结论：**销售订单实际前缀是 `ORD`**（`order.prefix` 覆盖了代码默认 `SO`），入库 `INB`、出库 `OTB`、采购 `PO`。因此「默认模板 = 现有行为」时，销售订单默认模板是 `ORD{YYYYMMDD}{SEQ:6}` 而非 `SO...`。

### 2.3 冲突规模

调研产出 14 组「同物多号」冲突，详见第 7 节的归一决策列。典型：工单 6 套、批次号 8 套、应收 4 套、员工号 3 套、盘点单同表双字段、`qc_unqualified.unqualified_no` 同字段两套格式。

## 3. 规则模型（模板串）

### 3.1 存储

规则存放于 `sys_config`，键名 `numbering.<docType>`，值即模板串：

```sql
INSERT INTO sys_config (config_name, config_key, config_value, config_type, description)
VALUES ('编号规则-销售订单', 'numbering.sales_order', 'ORD{YYYYMMDD}{SEQ:6}', 1, '销售订单编号生成规则');
```

`config_type` 固定为 `1`（文本）；规则是纯文本，编辑走现有通用配置 CRUD 接口。

### 3.2 占位符语法

| 类别 | 占位符 | 说明 |
|------|--------|------|
| 日期 | `{YYYY}` `{YY}` `{MM}` `{DD}` `{MMDD}` `{YYMMDD}` `{YYYYMM}` `{YYYYMMDD}` | 生成时刻的日期片段 |
| 时刻 | `{HHmmss}` `{YYYYMMDDHHmmss}` `{TS:n}` | `{TS:n}` = 毫秒时间戳字符串的后 n 位 |
| 流水 | `{SEQ:n}` | `n ∈ [1,10]`，左侧补零 |
| 上下文变量 | `{KEY}` | `KEY` 匹配 `[A-Z][A-Z0-9_]*`，取值来自调用方 `ctx`：`ctx` 的键按大写匹配，即 `ctx.sc_type` 供 `{SC_TYPE}` 取值 |

字面量（含 `-`、`_` 等分隔符）原样输出。`{` `}` 为保留字符，模板中不允许出现未闭合括号。

### 3.3 校验规则

1. `{SEQ:n}` 数量为 0 或 1；多于 1 个视为非法。
2. 模板中不得出现无法识别的占位符（即不在类别表、也不符合 `[A-Z][A-Z0-9_]*` 形式的）。
3. 模板渲染结果长度上限 100 字符（受落库字段长度约束，取最严格值）。
4. 模板不得为空串，且至少包含一个非 `{SEQ:n}` 片段（纯流水号无法定位业务）。
5. 上下文变量在渲染时必须由 `ctx` 提供且非空，否则抛 `DocumentNumberError`；**禁止**把未解析占位符写进单号。

### 3.4 重置周期推导（不单独配置）

| 模板中最细粒度的日期/时刻占位符 | 推导出的重置周期 | 序列表 `period` 取值 |
|---|---|---|
| 含 `{DD}` / `{MMDD}` / `{YYMMDD}` / `{YYYYMMDD}` / `{HHmmss}` / `{YYYYMMDDHHmmss}` / `{TS:n}` | 按日 | `YYYYMMDD` |
| 仅含 `{MM}` / `{YYYYMM}`（无上述按日片段） | 按月 | `YYYYMM` |
| 仅含 `{YYYY}` / `{YY}`（无上述月/日片段） | 按年 | `YYYY` |
| 不含任何日期/时刻占位符 | 不重置 | `GLOBAL` |

判定顺序自上而下取第一个命中项（即「最细粒度优先」）。推导结果在配置页只读展示，避免"模板按月、周期配置按日"的矛盾。

### 3.5 不消费流水的模板

模板不含 `{SEQ:n}` 时（如 `{CARD_NO}-V{VERSION}`、`TRF-{TRANSFER_NO}-{MATERIAL_CODE}`），引擎只做渲染、不访问序列表，唯一性由模板自身保证。此类模板在配置页标注「派生编号·不占流水」。

## 4. 统一序列表

### 4.1 表结构

```sql
CREATE TABLE IF NOT EXISTS sys_document_sequence (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  doc_type VARCHAR(64) NOT NULL COMMENT '单据类型',
  period VARCHAR(16) NOT NULL COMMENT '周期标识: YYYYMMDD/YYYYMM/GLOBAL',
  last_seq BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '该周期已使用的最大流水号',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_doc_period (doc_type, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单据编号流水序列表';
```

### 4.2 取号算法

```text
1. 读规则（带 60s 缓存）→ 渲染模板的日期/时刻/上下文部分，得到 prefix（即 {SEQ:n} 之前的所有内容）
2. 推导 resetPeriod → period 值
3. GET_LOCK('doc_no:{docType}:{period}', 10)
4. INSERT INTO sys_document_sequence (doc_type, period, last_seq) VALUES (?, ?, 1)
   ON DUPLICATE KEY UPDATE last_seq = last_seq + 1
5. SELECT last_seq ... WHERE doc_type=? AND period=?
6. RELEASE_LOCK
7. 拼接：prefix + 补零(last_seq, n) + suffix（{SEQ:n} 之后的字面量）
```

- 由于 `{SEQ:n}` 允许出现在模板中间（如 `UNQ-{YYYY}-{MMDD}-{SEQ:3}` 的 suffix 为空，但理论上后缀可存在），渲染需按 `{SEQ:n}` 切分为前、后两段。
- **`ON DUPLICATE KEY UPDATE` + 唯一键保证原子性**，`GET_LOCK` 用于避免同类型同日并发下的自增空转与顺序错乱，两者叠加。
- 取值失败（锁超时）抛 `DocumentNumberError`，调用方回滚事务。

### 4.3 首次启用初始化

迁移脚本对每个有单表落点的 docType，扫描现有最大号写入 `last_seq`：

```sql
INSERT INTO sys_document_sequence (doc_type, period, last_seq)
SELECT 'sales_order', ?, COALESCE(MAX(CAST(SUBSTRING(order_no, 12) AS UNSIGNED)), 0)
  FROM sal_order WHERE order_no LIKE CONCAT('ORD', ?, '%')
ON DUPLICATE KEY UPDATE last_seq = GREATEST(last_seq, VALUES(last_seq));
```

无单表落点的派生编号（如 `batch_work_order`）不初始化，从 0 开始。

## 5. 引擎 API

全部位于 `src/lib/document-numbering.ts`，不新建平行体系。

```ts
export type DocumentNumberContext = Record<string, string | number | null | undefined>;

/** 正式取号：渲染模板；含 {SEQ:n} 时消费流水。并发安全。 */
export async function generateDocumentNo(
  docType: string,
  ctx?: DocumentNumberContext,
  conn?: DbConnection
): Promise<string>;

/** 配置页预览：返回下一号示例，不消费流水。 */
export async function renderDocumentNoPreview(
  docType: string,
  ctx?: DocumentNumberContext,
  templateOverride?: string
): Promise<{
  preview: string;
  resetPeriod: 'daily' | 'monthly' | 'yearly' | 'global';
  hasSequence: boolean;
  nextSeq: number;
  /** 模板需要但 ctx 未提供的变量；预览时保留占位符而不是抛错 */
  missingVariables: string[];
}>;

/** 模板校验：返回错误清单，空数组表示合法。 */
export function validateDocumentNoTemplate(
  template: string
): { valid: boolean; errors: string[]; placeholders: string[] };

/** 供 UI 只读展示重置周期。 */
export function resolveResetPeriod(template: string): 'daily' | 'monthly' | 'yearly' | 'global';

/** 读取全部规则（带缓存），供 UI 列表。 */
export async function getNumberingRules(): Promise<Record<string, string>>;
```

变化点说明：

- `docType` 由 `DocumentType` 联合类型放宽为 `string`，实际取值受 `NUMBERING_DOC_TYPES` 常量约束（第 7 节清单），未知 docType 抛错而不是静默回退 `DOC`。
- 原 `generateDocumentNo(docType, conn?)` 的调用方需把 `conn` 从第二参数改为第三参数（共 1 处传 conn：`src/app/api/sales/delivery/[id]/ship/route.ts:155`）。
- 原 `DOCUMENT_TABLE_MAP` 不再用于取号，改为在迁移脚本中用于「首次初始化」，保留常量但移出运行期路径。
- `getNumberingConfig()` 与 17 个扁平前缀键**保留一个发布周期**作为兼容别名（第 8 节），随后删除。

## 6. 配置缓存与生效时机

- 规则读取走 `src/lib/document-numbering.ts` 内的 60s 内存缓存（`clearNumberingRuleCache()` 清理）；缓存在 Next.js 服务端进程内，客户端组件无法清理，因此清缓存由写接口负责：`/api/system/config` 的 `POST`/`PUT` 在写入成功后调用 `clearNumberingRuleCache()`，保证「保存后立即生效」。
- 配置页预览接口每次直读数据库（绕过缓存），避免缓存导致预览与实际不一致。

## 7. docType 全量清单与默认模板

> 「归一决策」列说明该 docType 收敛了哪些原有格式。标注 **变更** 的是与现有行为不同的部分（除「随机→递增」这一全局变更，该变更不再逐行标注）。

### 7.1 销售

| docType | 默认模板 | 落库 | 归一决策 |
|---|---|---|---|
| `sales_order` | `ORD{YYYYMMDD}{SEQ:6}` | `sal_order.order_no` | 合并仓储/API/Drizzle/样品转销售 4 处；样品转销售的 `SO{...}{SEQ:4}` 归一 |
| `sample_order` | `SP{YYYYMMDD}{SEQ:4}` | `sal_sample_order.order_no` | 合并仓储 `getNextSequence` 与域静态 `generateCode` |
| `delivery` | `DL{YYYYMMDD}{SEQ:6}` | `sal_delivery.delivery_no` | — |
| `shipment` | `SH{YYYYMMDD}{SEQ:4}` | 出货记录 `shipment_no` | 合并补发货/分批发货，随机→递增 |
| `return_order` | `RT{YYYYMMDD}{SEQ:6}` | `sal_return.return_no` | — |
| `reconciliation` | `RC{YYYYMMDD}{SEQ:6}` | `sal_reconciliation.reconciliation_no` | — |
| `quote` | `QT{YYYYMMDD}{SEQ:5}` | `sal_quote.quote_no` | — |

### 7.2 采购

| docType | 默认模板 | 落库 | 归一决策 |
|---|---|---|---|
| `purchase_request` | `PR{YYYYMMDD}{SEQ:6}` | `pur_request.request_no` | 合并 API 引擎/MRP 随机/**前端页面自造**（改为后端生成）；删除死代码 `_generateRequestNoSync` |
| `purchase_order` | `PO{YYYYMMDD}{SEQ:6}` | `pur_purchase_order.po_no` | 合并仓储/API/Drizzle/`pur_order_std.po_code` |
| `purchase_return` | `PRT{YYYYMMDD}{SEQ:6}` | 采购退货 `return_no` | **变更**：原回退前缀 `DOC` → `PRT` |
| `purchase_reconcile` | `RC{YYYYMMDD}{SEQ:6}` | `pur_purchase_reconciliation.reconciliation_no` | 与销售对账共用模板、序号独立 |
| `contract_review` | `CR{YYYYMMDD}{SEQ:4}` | `biz_contract_review.review_no` | 合并两个重复路由 |

### 7.3 生产

| docType | 默认模板 | 落库 | 归一决策 |
|---|---|---|---|
| `work_order` | `WO{YYYYMMDD}{SEQ:6}` | `prod_work_order.work_order_no` | **归并 6 套**：引擎 / `PWO{..}{5}` / `WO{..}{随机4}` / `WO{..}{COUNT+1}` / `WO{..}{TS6}` / 多色套印 |
| `sample_work_order` | `SWO{YYYYMMDD}{SEQ:5}` | 打样工单表 | 原 `SWO{date}{id:5}` 用工艺卡 id 拼接，改为独立流水 |
| `material_requisition` | `MR{YYYYMMDD}{SEQ:4}` | `material_requisitions.requisition_no` | 合并领料申请/超领/补料 3 处 |
| `material_issue` | `MI{YYYYMMDD}{SEQ:4}` | `prd_material_issue.issue_no` | **变更**：原与领料申请共用 `MR` → 改 `MI` 以区分 |
| `material_pick` | `MP{YYYYMMDD}{SEQ:4}` | `prd_pick_order.pick_no` | **变更**：原回退 `DOC` → `MP` |
| `material_return` | `MRT{YYYYMMDD}{SEQ:4}` | `prd_material_return.return_no`、`material_returns.return_no` | **变更**：原 `RT`（与销售退货撞）与 `MR`（与领料撞）两套 → `MRT` |
| `process_report` | `WR{YYYYMMDD}{SEQ:4}` | 工序汇报 `report_no` | **变更**：原回退 `DOC` → `WR` |
| `production_process` | `PCS{YYYYMMDD}{SEQ:4}` | 工序流转单 | **变更**：原 `TR`（与调拨单撞）→ `PCS` |
| `production_schedule` | `PS{YYYYMMDD}{SEQ:4}` | 排产编号 | 随机→递增 |
| `finish_inbound` | `FI{YYYYMMDD}{SEQ:4}` | 完工入库 `finish_no` | **变更**：原回退 `DOC` → `FI` |
| `mrp_run` | `MRP{YYYYMMDD}{SEQ:4}` | MRP 运行记录 `run_no` | **变更**：原回退 `DOC` → `MRP` |
| `bom` | `BOM{YYYYMMDD}{SEQ:3}` | `bom_header.bom_no` | 随机 base36 → 递增 |

### 7.4 仓库

| docType | 默认模板 | 落库 | 归一决策 |
|---|---|---|---|
| `inbound` | `INB{YYYYMMDD}{SEQ:6}` | `inv_inbound_order.order_no` | 合并仓储/API/Drizzle |
| `outbound` | `OTB{YYYYMMDD}{SEQ:6}` | `inv_outbound_order.order_no` | 合并仓储/API/采购退货联动；FIFO 的 `CK{..}{SEQ:3}` 归一 |
| `sales_outbound` | `SOB{YYYYMMDD}{SEQ:6}` | `inv_sales_outbound.outbound_no` | **变更**：原 `SO{TS}` → `SOB`（避免与销售订单 `ORD`/样品转销售 `SO` 混淆） |
| `production_inbound` | `PI{YYYYMMDD}{SEQ:4}` | `inv_production_inbound.inbound_no` | 合并 `PI{..}{随机4}` 与 `IN{TS}` |
| `transfer` | `TR{YYYYMMDD}{SEQ:6}` | `inv_transfer_order.transfer_no` | 合并仓储 `{SEQ:6}` 与 API `{随机4}` |
| `stocktaking` | `ST{YYYYMMDD}{SEQ:6}` | `inv_stocktaking.check_no` | 合并仓储 `check_no` 与 API `IC{..}{随机4}`→`taking_no`，**统一写 `check_no`** |
| `split_order` | `FJ{YYYYMMDD}{SEQ:4}` | `split_order.split_no` | — |
| `material_label` | `LBL-{YYYYMMDD}-{SEQ:4}` | `inv_material_label.label_no` | 合并 `label-service` 与 API 自造（随机→递增） |
| `cutting_record` | `CUT{YYYYMMDD}{SEQ:4}` | 分切记录 `record_no` | — |
| `cutting_label` | `LBL{YYYYMMDD}{SEQ:4}` | 分切标签 `label_no` | 保留无连字符以区分物料标签 |
| `inbound_label` | `IL{YYYYMMDD}{SEQ:5}` | `inv_inbound_label.label_id` | **变更**：原无字母前缀 → `IL` |

### 7.5 批次与库存事务（派生标识）

| docType | 默认模板 | 落库 | 归一决策 |
|---|---|---|---|
| `batch` | `B{YYMMDD}{SEQ:4}` | `inv_inventory_batch.batch_no` | 通用手工入库批次 |
| `batch_whole_split` | `SP{YYYYMMDD}{SEQ:4}` | `inv_inventory_batch.batch_no` | 整料拆分批次，随机→递增 |
| `batch_slit` | `SC{YYYYMMDD}{SEQ:4}` | `inv_inventory_batch.batch_no` | 合并分切单与横切子批次两处 |
| `batch_work_order` | `WO{WO_NO}{TS:6}` | `inv_inventory_batch.batch_no` | 工单完工批次（派生，不占流水） |
| `batch_finish_order` | `FN{FINISH_ORDER_ID}` | `inv_inventory_batch.batch_no` | 派生，不占流水 |
| `batch_transfer` | `TRF-{TRANSFER_NO}-{MATERIAL_CODE}` | `inv_inventory_batch.batch_no` | 派生，不占流水 |
| `batch_outsource` | `OR{RECEIVE_NO}{ID}` | `inv_inventory_batch.batch_no` | 派生，不占流水 |
| `batch_ink_mixed` | `MIX{YYYYMMDD}{SEQ:4}` | `ink_mixed_batch.batch_no` | — |
| `batch_ink_dispatch` | `INK{YYYYMMDD}{SEQ:4}` | 油墨发料批次 | — |
| `batch_small` | `SM-{PARENT_QR}-{TS}` | `inv_inventory_batch.qr_code` | 派生，不占流水 |
| `batch_remainder` | `RM-{PARENT_QR}-{TS}` | `inv_inventory_batch.qr_code` | 派生，不占流水 |
| `inventory_trans` | `TRX{YYYYMMDDHHmmss}{SEQ:4}` | `inv_inventory_transaction.trans_no` | 合并 `appendInventoryTransaction` 全部调用点 + 4 处绕过自造（含 `TRN-STK-{TS}`） |
| `cost_trans` | `COST{WO_NO}{TS:6}{SEQ:2}` | `inv_inventory_transaction.trans_no` | **变更**：合并 `COST`/`TOOL-COST`/`SCR-COST`/`INK-COST`/`AMORT` 5 套，新增 `{SEQ:2}` 消除同毫秒碰撞 |

### 7.6 质检

| docType | 默认模板 | 落库 | 归一决策 |
|---|---|---|---|
| `incoming_inspection` | `IQC{YYYYMMDD}{SEQ:3}` | `qc_incoming_inspection.inspection_no` | 日期由 UTC 改为系统时区本地日期 |
| `process_inspection` | `QI{YYYYMMDD}{SEQ:4}` | `qc_inspection.inspection_no` | 随机→递增 |
| `final_inspection` | `FPR{YYYYMMDD}{SEQ:4}` | `qc_final_inspection.inspection_no` | 随机→递增 |
| `unqualified` | `UQ-{YYYYMMDD}-{SEQ:4}` | `qc_unqualified.unqualified_no` | **归并 `NQ-{TS}-{id}`**（SPC 触发），消除同字段双格式 |
| `unqualified_handle` | `UNQ-{YYYY}-{MMDD}-{SEQ:3}` | `qc_unqualified.handle_no` | 保留（上一轮已按此格式实现） |
| `lab_test` | `LAB-{YYYYMMDD}-{SEQ:4}` | `qms_lab_test.lab_test_no` | — |

### 7.7 财务

| docType | 默认模板 | 落库 | 归一决策 |
|---|---|---|---|
| `receivable` | `REC{YYYYMMDD}{SEQ:6}` | `fin_receivable.receivable_no` | **归并 4 套**：引擎 / `AR{随机}` / `AR{TS}`（3 个 handler + 1 API）/ `COST{WO}{TS6}` |
| `payable` | `PAY{YYYYMMDD}{SEQ:6}` | `fin_payable.payable_no` | 归并 `AP{随机}` / `AP{TS}` |
| `receipt` | `RPT{YYYYMMDD}{SEQ:6}` | `fin_receipt_record.receipt_no` | 归并 `RC{随机}`（`finance-core.ts`） |
| `payment` | `PMT{YYYYMMDD}{SEQ:6}` | `fin_payment_record.payment_no` | 归并 `PY{随机}` |
| `voucher` | `VCH{YYYYMMDD}{SEQ:6}` | `fin_voucher.voucher_no` | **归并 5 套**：引擎 / `FV{..}{SEQ:4}` / `RV{..}{SEQ:4}` / `FV{TS}` / `SZ-{YYYYMM}-001` / `TR{YYYYMM}{TS6}` |
| `invoice_purchase` | `PI{YYYYMMDD}{SEQ:3}` | `finance_invoice.invoice_no` | `COUNT+1` → 序列表 |
| `invoice_sales` | `SI{YYYYMMDD}{SEQ:3}` | `finance_invoice.invoice_no` | `COUNT+1` → 序列表 |
| `expense` | `EXP{YYYYMMDD}{SEQ:3}` | `finance_expense.expense_no` | `COUNT+1` → 序列表 |

### 7.8 样品 / 标准卡 / 印前

| docType | 默认模板 | 落库 | 归一决策 |
|---|---|---|---|
| `sample_process_card` | `SPC{YYYYMMDD}{SEQ:5}` | `dcprint_sample_process_card.sample_no` | **变更**：原 `SP{..}{SEQ:5}` 与打样订单 `SP` 撞 → `SPC` |
| `sample_process_template` | `SPT{YYYYMMDD}{SEQ:5}` | `dcprint_sample_process_template.template_no` | — |
| `standard_card` | `{SC_TYPE}{YYYYMMDD}{SEQ:4}` | `prd_standard_card.code`、`card_no` | **变更**：合并仓储 `{SCC\|SCP\|SCQ\|SCZ}{..}{SEQ:4}`（且修掉"无记录时丢前缀"的 bug）与 API `SAMPLE{..}{随机4}`；`{SC_TYPE}` 由 `ctx.sc_type` 传入 |
| `standard_card_version` | `{CARD_NO}-V{VERSION}` | `prd_standard_card.card_no` | 派生，不占流水 |
| `mass_process_card` | `{CARD_NO}-M` | `prd_process_card.card_no` | 派生，不占流水 |
| `sample_to_mass` | `STM-{YYYYMMDD}-{SEQ:3}` | `eng_sample_to_mass.transfer_no` | `COUNT+1` → 序列表 |
| `process_card` | `PC{YYYYMMDD}{SEQ:4}` | 流程卡 `card_no` | 随机→递增 |
| `trace` | `TRC{YYYYMMDD}{SEQ:6}` | 追溯表 `trace_no` | **变更**：原 `TR{..}{随机6}` 与调拨单撞 → `TRC` |
| `material_qr` | `MAT{MATERIAL_ID}{TS}` | qrcode 记录 | 派生，不占流水 |
| `ink_color` | `CLR{YYYYMMDD}{SEQ:4}` | `dcprint_ink_color.color_code` | **变更**：原 `CLR{TS}` → 日期+流水 |
| `ink_formula_version` | `V{MAJOR}.{MINOR}` | `dcprint_ink_formula_version.version_no` | 语义版本，派生，不占流水 |

### 7.9 设备 / 人事

| docType | 默认模板 | 落库 | 归一决策 |
|---|---|---|---|
| `equipment` | `EQ-{YYYYMMDD}-{SEQ:4}` | `eq_equipment.equipment_code` | — |
| `maintenance_plan` | `MP{YYYYMMDD}{SEQ:4}` | `eq_maintenance_plan.plan_no` | 随机→递增 |
| `maintenance_record` | `EQMR{YYYYMMDD}{SEQ:4}` | `eq_maintenance_record.record_no` | **变更**：原 `MR{..}{随机4}`（与领料单 `MR` 跨模块撞）→ `EQMR` |
| `equipment_scrap` | `BF{YYYYMMDD}{SEQ:4}` | `eqp_scrap.scrap_no` | 随机→递增 |
| `equipment_repair` | `WX{YYYYMMDD}{SEQ:4}` | `eqp_repair.repair_no` | 随机→递增 |
| `equipment_calibration` | `JD{YYYYMMDD}{SEQ:4}` | `eqp_calibration.calibration_no` | 随机→递增 |
| `die` | `DIE{YYYYMMDD}{SEQ:4}` | 刀模 `code` | **变更**：原 `DIE{TS}` → 日期+流水 |
| `die_maintenance` | `MT{YYYYMMDD}{SEQ:4}` | `prd_die_maintenance.maintenance_no` | **变更**：原 `MT{TS}` → 日期+流水 |
| `employee` | `EMP{YYYYMMDD}-{SEQ:4}` | `hr_employee.employee_no`、`sys_employee.employee_no` | **归并 3 套**：`EMP{date}-{seq4}` / `EMP{seq6}` / 前端 `E{YYYY}{随机4}`（改为后端生成） |

### 7.10 委外

委外模块当前**无独立单据号生成**：`/api/outsource/issue`、`/api/outsource/receive` 只生成库存事务号（已由 `inventory_trans` 覆盖）与批次号（已由 `batch_outsource` 覆盖）。故本次不新增 docType；若后续委外新增单据号，按第 3 节规则追加一条 `numbering.*` 配置即可。

### 7.11 待确认范围项

| 项 | 处理 | 理由 |
|---|---|---|
| 主数据编码（物料/客户/供应商/仓库/部门/角色） | **不纳入** | 人工维护 + 已有唯一约束 + 外键引用广 |
| 种子脚本固定编号 | **不纳入** | 属测试数据 |
| `prd_process_card` 等历史字段无编号生成逻辑的表 | **不纳入** | 无可收敛对象 |

## 8. 兼容与迁移

### 8.1 兼容别名（保留一个发布周期）

| 旧键 | 映射到 |
|---|---|
| `order.prefix`、`order_no_prefix` | `numbering.sales_order` 的前缀段 |
| `purchase.prefix`、`po_prefix` | `numbering.purchase_order` |
| `inbound.prefix` | `numbering.inbound` |
| `outbound.prefix` | `numbering.outbound` |
| `wo_prefix` / `sample_prefix` / `mr_prefix` / `fpr_prefix` / `sh_prefix` / `qi_prefix` / `sc_prefix` / `bf_prefix` / `jd_prefix` / `wx_prefix` / `tr_prefix` / `wr_prefix` / `mp_prefix` / `ir_prefix` | 对应 docType（仅在前缀段生效） |
| `serial_number_length` | 模板未写 `{SEQ:n}` 时的 `n` 兜底值（默认 6） |
| `doc_date_format` | 仅支持 `YYYYMMDD`，其他值忽略并记录告警 |
| `qc_prefix`（DB 值 `QC`） | **当前无任何代码读取，属废弃键**；不纳入别名映射，保留数据不删除 |

读取顺序：`numbering.<docType>` 存在则以其为准；不存在则用别名拼出等价模板并**记录一次性告警日志**。一个发布周期后删除别名逻辑与旧键。

### 8.2 迁移脚本

`database/migrations/088_document_numbering.sql`：

1. 建 `sys_document_sequence`（第 4.1 节 DDL，幂等 `IF NOT EXISTS`）。
2. 插入 `numbering.<docType>` 种子（第 7 节清单，`INSERT ... ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`，幂等）。
3. 对每个有单表落点的 docType 执行 `last_seq` 首次初始化（第 4.3 节模式）。
4. 保留旧键，不删除。

### 8.3 存量数据

存量单据号**不改写**。新规则只对新生成的单据生效。因此同一单据类型在切换前后可能存在两种格式，这是可接受的（编号本身无格式校验的对外约束）。第 7 节「变更」列中的前缀改名同理。

## 9. settings/config 编号规则分组

### 9.1 分组挂载

- `configGroups` 增加 `{ key: 'numbering', label: '编号规则', icon: '🔢' }`（`src/app/[locale]/settings/config/page.tsx:51-58`）。
- `getConfigGroup` 增加 `if (key.startsWith('numbering.')) return 'numbering';`（同文件 `:525-533`）。

### 9.2 列表视图

「编号规则」Tab 下用专用表格（非通用配置表格），列：

| 列 | 说明 |
|---|---|
| 单据类型 | `sys_config.config_name`（迁移脚本写入，如「销售订单」）；该行缺失时降级显示 `numbering.<docType>` 原始键名 |
| 模板 | 等宽字体展示模板串 |
| 重置周期 | 由 `resolveResetPeriod` 推导，中文展示「按日 / 按月 / 按年 / 不重置」 |
| 下一号预览 | 调 `renderDocumentNoPreview` 展示示例 |
| 状态 | `已配置` / `使用默认`（无 `numbering.*` 行时） |
| 操作 | 编辑、恢复默认 |

### 9.3 编辑弹窗

- 单据类型（只读）
- 模板输入框（必填）+ 右侧「校验」按钮
- 校验结果区：合法时展示占位符清单与「解析结果」；非法时逐条列出错误
- 需要上下文变量的模板（含非日期/非流水的 `{KEY}`）展示必填上下文变量提示，并允许在预览区手动填写示例值
- 「实时预览」：输入停顿 400ms 后调 `renderDocumentNoPreview`
- 「恢复默认」：把 `config_value` 写回第 7 节默认模板

### 9.4 接口

- 列表：复用 `GET /api/system/config?configName=`（按 `numbering.` 前缀过滤由前端完成）。
- 预览/校验：新增只读接口 `POST /api/system/config/numbering-preview`，入参 `{ docType, ctx?, template? }`；`template` 存在时用入参模板校验（未保存也能预览），否则读库中规则。需登录 + 配置查看权限，不写库。
- 保存：复用 `POST/PUT /api/system/config`，保存后调用 `clearSystemConfigCache()`。

## 10. 收敛清单（迁移点）

按第 7 节归一决策，需改动的文件与位置如下（行号为设计时快照）：

**新增/重写**

- `src/lib/document-numbering.ts`：模板解析、渲染、校验、取号（第 3-5 节）
- `src/app/api/system/config/numbering-preview/route.ts`：预览与校验
- `database/migrations/088_document_numbering.sql`
- `src/lib/doc-types.ts`（新）：`NUMBERING_DOC_TYPES` 常量 + 各 docType 中文名映射

**删除**

- `src/lib/global-config.ts`：`generateDocNo`（:312-321）、15 个 `getXxxPrefix`（:128-266，保留非编号类 getter）
- `src/infrastructure/repositories/MysqlUnqualifiedRepository.ts:94-117`：`generateUnqualifiedNo` / `generateHandleNo`
- `src/app/api/purchase/request/route.ts:68-72`：`_generateRequestNoSync`（死代码）
- `src/app/[locale]/purchase/request/form/page.tsx:22-30`：前端单号生成
- `src/app/[locale]/hr/employee/page.tsx:243-248`：前端单号生成
- 各模块本地 `generateXxxNo` / `getNextSequence`（`label-service.ts:15`、`MysqlEquipmentRepository.ts:172`、`MysqlEmployeeRepository.ts:140`、`EmployeeRepository.ts:121`、`MysqlStandardCardRepository.ts:335`、`MysqlSampleOrderRepository.ts:234`、`FinanceVoucherHandler.ts:331`、`warehouse/split-order/route.ts:134,316`、`production-inbound/route.ts:95`、`incoming/cutting/route.ts:12,22`、`inbound/labels/route.ts:170`、`stocktaking/route.ts:18`、`transfer/route.ts:18`、`material-requisitions/route.ts:14`、`material-returns/route.ts:15`、`equipment/{plan,maintenance,scrap,repair,calibration}/route.ts`、`business/contract-review/route.ts:81`、`biz/contract-review/route.ts:62` 等）

**改造为调用引擎**（按第 7 节 docType 落位）

- 仓储层：`Mysql*Repository` 系列（销售/采购/工单/入出库/调拨/盘点/应收/应付/凭证/退货/对账/发货）
- 服务层：`ProductionApplicationService`、`FinanceApplicationService`、`SampleProcessCardService`、`SampleProcessTemplateService`、`SampleOrderApplicationService`、`PurchaseReturnApplicationService`、`PrintStandardCardRepository`
- Handler 层：`SalesReceivableHandler`、`DeliveryReceivableHandler`、`OutboundReceivableHandler`、`PurchasePayableHandler`、`FinanceVoucherHandler`、`ProductionFinanceHandler`、`WorkOrderCompletedHandler`、`FinishOrderInventoryHandler`、`ToolCostHandler`、`ScreenPlateCostHandler`、`InkCostHandler`、`PurchaseReceivedHandler`、`OutboundInventoryHandler`
- API 路由：`orders`、`workorders`、`purchase/request`、`sales/{delivery,return,reconciliation}`、`warehouse/{inbound,outbound,outbound/fifo,transfer,stocktaking,split-order,production-inbound,batch-inventory,ink-mixing,sales-outbound,inbound/{labels,cutting}}`、`inventory`、`quality/{incoming,process,final,lab-test/auto-request}`、`equipment/*`、`finance/{invoice,expense}`、`engineering/sample-to-mass`、`dcprint/{trace,process-cards,ink-formula,ink-dispatch}`、`standard-cards`、`prepress/die-maintenance`、`hr/finance-sync/salary-transfer`
- 工具层：`finance-core.ts`、`general-ledger.ts:928`、`mrp-engine.ts:876`、`mrp-engine-v2.ts:444`、`multi-color-printing.ts:329`、`production-scheduling-enhanced.ts:596`、`fifo-width-slit.ts:298`、`warehouse-core.ts:258,270,296`、`CostAmortizationService.ts:83`、`inventory-ledger.ts:54`、`utils.ts:69,78`：`generateBatchNo` 由 `batch` docType 取代、`generateTransNo` 由 `inventory_trans` docType 取代，两个函数**删除**，并同步删除 `src/lib/utils.test.ts:9-10,130,134,140,144` 中对应用例
- `src/lib/spc-analysis.ts:355`：`NQ-{TS}` 改为 `unqualified`

## 11. 测试策略

| 层次 | 用例 |
|---|---|
| 单元 · 模板解析 | 三类占位符解析；`{SEQ:n}` 位于中间时的前后切分；非法占位符报错；多 `{SEQ:n}` 报错；空模板报错 |
| 单元 · 渲染 | 各占位符输出正确；`{TS:6}` 取后 6 位；`{YY}` 两位年；补零边界（`{SEQ:1}` 到第 10 号） |
| 单元 · 校验 | 未闭合括号、未知变量、超长结果、缺 ctx 变量 |
| 单元 · 周期推导 | 含 `{YYYYMMDD}`→日；含 `{YYYYMM}`→月；无日期→不重置 |
| 单元 · 取号 | 连续 3 次取号递增；跨 period 重置；无 `{SEQ:n}` 不访问序列表 |
| 并发 | 20 个并发取同 docType 不重复、不跳号（复用 `tests/unit/…` 并发测试风格） |
| 集成 | 各模块创建单据后单号匹配当前模板；更新 `tests/integration/workorder-api.test.ts` 中的单号断言 |
| 回归 | 唯一键冲突路径：软删除后重建不复用旧号 |
| 配置联动 | 改 `numbering.sales_order` 后清缓存、下一次生成使用新模板 |
| UI | 预览接口不消费流水（连点两次预览，随后取号仍为同一号） |

## 12. 风险与回滚

| 风险 | 缓解 |
|---|---|
| 一次改动约 100 处调用点，回归面大 | 分 5 批提交，每批独立验证；每批只改本批文件的模板来源，不改业务逻辑 |
| 序列表初始化错误导致撞号 | 迁移脚本用 `GREATEST(last_seq, VALUES(last_seq))` 幂等；初始化后可执行校验 SQL 对比业务表最大值 |
| 并发下自增跳号 | `GET_LOCK` + `ON DUPLICATE KEY UPDATE` 双保险；跳号可接受（业务无连续性要求） |
| 前缀改名（`MRT`/`PCS`/`TRC`/`EQMR`/`SPC`/`SOB`/`IL`/`PRT`/`FI`/`MRP`/`MP`/`WR`）影响既有报表/打印模板 | 迁移前全仓检索这些前缀的引用（含打印模板、报表 SQL、前端筛选）；如有关联需同步更新 |
| 兼容别名逻辑遗漏 | 第 8.1 节表逐项对照；别名命中时打告警日志，运行一周后确认无告警再清理 |
| 时区导致日期片段跨日不一致 | 统一使用服务端时区（`Asia/Shanghai`，来自 `system.timezone` 配置）渲染日期，替换现有 `toISOString()` UTC 用法 |

**回滚方案**：本设计不删除旧键与旧配置数据，回滚只需还原代码并停止调用引擎；序列表保留不影响旧逻辑。

## 13. 实施批次

| 批次 | 内容 | 验证 |
|---|---|---|
| 1 | 引擎（模板解析/渲染/校验/取号）+ 序列表迁移 + 单测 | 单测 + 并发测试全绿 |
| 2 | 销售 + 采购模块全部生成点 | 创建订单/采购单/退货单/对账单，单号匹配模板 |
| 3 | 生产 + 仓库模块（含批次与库存事务） | 创建工单/领料/入库/出库/调拨/分切，批次与事务号匹配模板 |
| 4 | 质检 + 财务 + 设备 + 人事 + 样品标准卡 | 创建检验单/应收/凭证/设备单/员工，单号匹配模板 |
| 5 | settings/config 编号规则分组 UI + 预览接口 + 删除旧体系与兼容别名 | UI 手测：改模板→预览→保存→新建单据生效 |

每批次结束需运行 `npm run ts-check`、`npm run lint`、相关集成测试，并确认无新告警。
