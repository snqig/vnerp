# 修复 /api/warehouse/inbound 列表 500（Unknown column 'batch_id'）

## 现象
- 仓库入库页 `GET /api/warehouse/inbound?page=1&pageSize=1000` 返回 **500**，前端列表空白。
- 仅该路由 500；`inbound/labels`、`outbound`、`transfer` 均正常 200。

## 根因（真实 bug，非缓存损坏）
- 实际注入的仓库是 `MysqlInboundOrderRepository`，其明细查询 `ITEM_COLUMNS` 与 `save()` 的 INSERT 都引用
  `inv_inbound_item` 的 `batch_id` / `original_inbound_date` / `location_id` / `qr_code`。
- 但 **live `inv_inbound_item` 缺少这 4 列**（Drizzle 规范 `src/lib/db/schemas/warehouse.ts:188 invInboundItems`
  已定义 `batchId/originalInboundDate/locationId`，repo 也写 `qr_code`）→ MySQL 报
  `Unknown column 'batch_id' in 'field list'`。
- 为何之前不报错：列表在「无明细」时短路不查明细；本次 warehouse 重生写入了入库明细后，列表查明细即触发缺失列。
  这是一个**潜伏的 schema 缺口**——任何带明细的入库单列表都会 500。

## 修复
- 幂等脚本 `scripts/fix-inbound-item-schema.cjs`（information_schema 探测 + `ALTER TABLE ADD COLUMN`，类型对齐 Drizzle 规范）：
  - `batch_id BIGINT UNSIGNED NULL`
  - `original_inbound_date DATE NULL`
  - `location_id BIGINT UNSIGNED NULL`
  - `qr_code VARCHAR(255) NULL`
  - 补 `idx_batch_id` 索引（对齐 Drizzle `batchIdIdx`）
- 已应用到 live（`inv_inbound_item` 由 21 → 25 列，`batch_id` 已存在）。

## 验证
- `GET /api/warehouse/inbound` → **200**，`total = 10`（SIN-SMP-SO54…，source_type=sample），列表不再空白。
- 无需重启 dev server（raw SQL 每次直连 live，新增列即时生效）。

## 交付物
- `scripts/fix-inbound-item-schema.cjs` —— 可复跑的 schema 补齐脚本（与其它 `fix-*-schema.cjs` 同模式）。
- 关联：此前 `scripts/regen-warehouse-data.cjs` 生成的入库明细暴露了本缺口，现一并修复。

## 备注
- 初判易被 devlog 开头的 `Turbopack ... src_lib_db ... write` 恐慌误导为 `.next` 缓存损坏；但重启 dev server 后依旧 500，
  且 fresh log 出现 `[API Error] ... Unknown column`，确认为真实列缺口。排查中曾重启 dev server（端口 5000 现已由干净实例监听）。
