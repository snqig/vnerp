# 仓库（/warehouse/*）数据清空与 1:1 关联重生

## 执行结论
按「安全范围」完成：清空仓库**事务表**（约 30 张），保留主数据与跨模块汇总，并据 `/plm/*`、`/orders/*`、`sample/*` **1:1 关联重生**仓库数据。校验全部通过，系统其余模块未受影响。

## 关键安全决策
- 用户最初在选项中勾选了「全部 inv_* 含主数据（危险）」。主动拦截并指出：删除 `inv_material`(4353)/`inv_warehouse`(150) 会破坏 30+ 张表（真实库 129 个 FK），且与「关联重生」目标自相矛盾（仓库单据的 `material_id`/`warehouse_id` 必须指向这两张主数据，删了即失去关联锚点），也违背此前 sample/plm 任务「只删本模块表、不碰父级主数据」的既定模式。
- 用户随后确认「按安全范围执行」。

## 删除范围（~30 张事务表）
inbound*/outbound*/transfer*/batch、transaction*/log、sales_outbound*/production_inbound*/stock_adjust*/stocktaking*/cutting*/trace*/material_label、scan_log、fifo_override_log、split_order*，以及 `inv_inventory`（重派生）。

## 保留（未触碰）
- 主数据：`inv_material`(4353)、`inv_warehouse`(150)、`inv_material_category`(169)、`sys_warehouse_category`(12)
- 跨模块汇总：`inv_material_inventory`(1847)、`inv_product_inventory`(5603)、`inv_auxiliary_inventory`(739)、`inv_location`、`inv_unit_conversion`、`inv_material_std`

## 1:1 关联重生
| 来源 | 生成目标 | 仓库 | 关联方式 |
|---|---|---|---|
| 11 张 `sal_order` | 销售出库 `inv_sales_outbound` | 成品仓 WH003 | `order_id`↔`sal_order`，从「种子批次」整批发货 |
| 10 张 `sal_sample_order` | 打样料入库 `inv_inbound_order` | 原材料仓 WH001 | `source_order_id`=47..56↔`sal_sample_order`；`material_no`→`inv_material` 全命中 MAT001..MAT010 |
| 10 张 `plm_eco` | 生产入库 `inv_production_inbound` | 成品仓 WH003 | 沿用 1:1:1 对齐（eco i→MAT00i），remark 写「关联PLM:eco_no+title」 |

每单均写入 `inv_inventory_batch` + `inv_inventory_transaction`(in/out) + `inv_inventory_log`(in/out)；最后由批次重派生 `inv_inventory` 汇总。

## 校验结果（全部通过）
- 批次 31（数量 20000）｜汇总 20（数量 20000）｜台账 42｜日志 42
- **汇总与批次不一致行数 = 0 ✅**
- 主数据与跨模块汇总行数原样保留

## 回滚
所有被删事务表已整表备份到 `<表名>_bak_wh20260828`，需要时用 `INSERT INTO <表> SELECT * FROM <表>_bak_wh20260828` 即可回滚。

## 交付物
- `scripts/regen-warehouse-data.cjs` — 可复跑的重生脚本（含备份+回滚）
- `_wh_regen_result.txt` — 执行汇总
