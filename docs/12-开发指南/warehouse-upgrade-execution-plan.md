# vnerp 仓储体系升级 · 全量执行计划

> 制定日期：2026-08-16
> 依据：用户贴出的「vnerp 仓储体系升级全量 To-Do 清单」（源自 github.com/fjykTec/ModernWMS），结合**真实库 `vnerpdacahng` 实测状态**编制。
> 执行原则：**基础先行 → 核心落地 → 执行适配 → 进阶扩展**
> 技术栈：Next.js 16 + Drizzle ORM 0.45 + MySQL 8.0 + TypeScript（DDD 分层：domain / application / api / page）

---

## 0. 既有约定（必须遵循，否则会踩已知坑）

| 约定 | 说明 | 来源 |
|------|------|------|
| **迁移走裸 SQL，不用 drizzle-kit** | 库由 init 脚本建，`scripts/migrate.ts up` 执行 `database/migrations/*.sql` 并记录 `sys_migration`。**严禁跑 `drizzle-kit push/generate`** —— Drizzle 不知情真实库 129 个外键，会全部 DROP。 | 先前唯一约束整改复盘 |
| **软删除 = `deleted TINYINT NOT NULL DEFAULT 0`** | 复合唯一键必须含 `deleted` 列（NULL 语义不适用）。 | 全项目统一 |
| **唯一冲突统一转译** | `src/lib/db/errors.ts` 的 `isUniqueViolation` + 中央 handler 已把 1062 → 409 友好中文，业务层无需各自处理。 | 1-7 已完成 |
| **live 表名单数，Drizzle 注册复数** | 真实表 `inv_inbound_order`；Drizzle 里 `invInboundOrders`。很多真实表 Drizzle 根本未建模（见 Phase 风险）。 | 先前核对 |
| **四件套 + `version` 乐观锁** | 高并发写用 `transactionWithRetry`。 | 全项目统一 |
| **事件总线已就绪** | `DomainEventOutbox → OutboxPoller → EventBus → Handler`，5s 轮询。跨模块联动优先走事件，别写同步 RPC。 | 采购入库联动已验证 |

---

## 1. 真实进度审计（连 live 库实测，非假设）

| 阶段 | 整体状态 | 关键实测事实 |
|------|---------|-------------|
| **一、唯一约束（P0）** | **≈78% 完成** | 1-1/1-4/1-5/1-6/1-7/1-8/1-9 已在 8/13 通过 7 个幂等迁移 + `errors.ts` + `check-duplicate-data.mjs` 落地。全库现有 **123 个唯一索引**。仅剩 **1-2、1-3**。 |
| **二、FIFO + 效期（P0）** | 基础有 / 业务 TODO | FIFO 路由 `/api/warehouse/outbound/fifo` 已存在；批次表 `inv_inventory_batch` 已有 `produce_date / expire_date / inbound_date / status / alert_level`（**缺「保质期天数」列**）。2-2~2-9 全未做。 |
| **三、分切（P1）** | TODO | `inv_cutting_record` 表已存在（有 `uk_record_no`），母子码/分切事务/追溯需新建。 |
| **四、二维码 + 标签（P1）** | 部分 | `QRCodeScanner` 组件 + `/api/dcprint/scan` + 标签打印已有基础；全环节闭环 TODO。 |
| **五、Pad 端（P2）** | TODO | — |
| **六、ModernWMS 整合（P3）** | TODO | 外部系统，需定接口契约。 |
| **七、印前整合（P1）** | TODO | `prd_ink`/`base_ink`/`ink_mixed_batch`/`prd_die`/`prd_screen_plate`/`dcprint_tool` 等表已有基础。 |

---

## 2. 阶段一：基础数据治理（唯一约束整改）收尾

> P0 前置必做。除 1-2、1-3 外全部已完成，本阶段只需补完这两块。

### 1-3 库存流水唯一索引 —— **可立即安全执行**
- **实测**：`inv_inventory_transaction` 当前 **0 行、0 重复**；列 `source_type(varchar20) / source_id(bigint) / source_line_id(bigint)` 齐全。
- **做法**：幂等 SQL 加 `uk_inv_transaction_source(source_type, source_id, source_line_id)`，记 `sys_migration`。
- ⚠️ **建索引前需核查写入路径**：确认业务不会在同一 `(source_type, source_id, source_line_id)` 写多行（如「数量行 + 成本行」分开记）。若存在，索引需加判别列（如 `trans_sub_type`）或改为「单来源单行」。
- **验收**：同单据同类型同号无法重复生成流水；账实可追溯。

### 1-2 扫码出库记录唯一索引 —— **已定方案：扩展 `inv_scan_log`**
- **实测**：真实库**无专用「扫码出库记录表」**。`inv_scan_log` 现有 `scan_type / qr_content / label_no / operation / operator_id`，**无出库单 ID 列**；`qrcode_record` 是通用记录表。
- **已选方案**（用户确认）：给 `inv_scan_log` 加 `outbound_order_id BIGINT UNSIGNED` 列 + 唯一索引 `uk_scan_outbound(outbound_order_id, label_no)`。
- **配套改造**（非纯 DB）：
  1. `/api/dcprint/scan`（scanType='outbound'）及出库扫码闭环需把当前**出库单 ID** 写入 `inv_scan_log.outbound_order_id`。
  2. 写入前查重：同 `(outbound_order_id, label_no)` 已存在则拦截（复用 `errors.ts` 1062→409）。
- **验收**：同一出库单同一二维码无法重复扫码扣库，从 DB 层杜绝重复扣减。

---

## 3. 阶段二：FIFO 先进先出 + 批次效期全管控（P0 核心）

| 任务 | 做法要点 | 当前状态 |
|------|---------|---------|
| 2-1 批次效期字段 | `inv_inventory_batch` 补 `shelf_life_days INT`（保质期天数，用于自动算过期日）；`produce/expire/inbound_date/status` 已有 | 部分（缺天数） |
| 2-2 采购入库强制效期 | 入库 API 校验 `produce_date + shelf_life_days` 必填，自动算 `expire_date`；缺失禁止入库、禁止生成二维码 | TODO |
| 2-3 FIFO 引擎重构 | `planFIFOAllocation` 统一按 `inbound_date` 升序，过滤 `expire_date<今天` 与 `status=冻结/隔离`；支持母/子批次混合（见阶段三） | 基础有，需增强 |
| 2-4 生产领料 FIFO 推荐 | 建领料单时调 FIFO 路由，拆分最早批次，展示 批次号/入库日期/库位/应领量 | TODO |
| 2-5 扫码出库 FIFO 合规 | 扫非最早批次弹黄色提醒；强制模式无授权不可领 | TODO |
| 2-6 过期批次强拦截 | 扫过期批次直接拦截，禁止任何出库 | TODO |
| 2-7 效期状态定时任务 | 每日巡检，按规则更新 `status`/`alert_level`（正常/临期/过期） | TODO |
| 2-8 效期预警 | 首页看板统计卡片 + 定时推送临期清单 | TODO |
| 2-9 报表 | 效期库存报表、FIFO 执行合规报表（非 FIFO 领用记录） | TODO |

**依赖**：2-1 先于 2-2/2-3；2-3 是 2-4/2-5/2-6 的基础。

---

## 4. 阶段三：分切作业全流程 + 母子码 FIFO 继承（P1 行业核心）

| 任务 | 做法要点 |
|------|---------|
| 3-1 批次扩字段 | `inv_inventory_batch` 加 `batch_type(母/子) / parent_batch_id / original_inbound_date / cutting_date` |
| 3-2 分切工单/明细表 | 新建 `inv_cutting_order` + `inv_cutting_detail`，配套唯一约束（分切单号全局唯一、母子关联可查） |
| 3-3 子批次继承 | 分切时 100% 继承母材 `original_inbound_date / produce_date / expire_date / supplier_id`，不重置保质期、不改变 FIFO 基准 |
| 3-4 FIFO 引擎适配 | 母+子按 `original_inbound_date` 混合升序参与扣减 |
| 3-5 分切全事务 | 单事务包裹：母材扣减 + 子材入库 + 损耗记账 + 流水 + 子码生成，任一步失败全回滚 |
| 3-6 作废逆向回滚 | 子材作废 + 母材数量恢复 + 流水冲销，原路还原留痕 |
| 3-7 数量校验 | `Σ子材量 + 损耗 = 母材分切量`，不匹配禁止完工 |
| 3-8 全链路追溯 | 母码查所有子卷流向，子码溯源母批次与采购单 |
| 3-9 报表 | 分切损耗率、完工统计 |

**依赖**：3-1/3-2 → 3-3/3-4 → 3-5/3-6/3-7 → 3-8/3-9。需阶段二 2-3 FIFO 引擎先支持母子混合。

---

## 5. 阶段四：二维码全环节落地 + 标准化标签打印（P1 执行落地）

| 任务 | 做法要点 |
|------|---------|
| 4-1 统一编码规则 | `批次类型+批次ID+物料ID+校验位`，全局唯一，复用阶段一唯一约束成果 |
| 4-2/4-3 标签模板 | 母材入库标签、分切子材标签（明确标注母批次号+原始入库日期+FIFO 基准） |
| 4-4~4-7 扫码闭环 | 采购入库 / 分切 / 生产领料 / 盘点调拨 四环节，复用 `QRCodeScanner`+`/api/dcprint/scan`，扫码自动校验 FIFO 与效期 |
| 4-8 打印能力 | 自动/单张补打/批量打印，适配热敏标签机 |

**已有基础**：`QRCodeScanner`（@zxing/browser，camera 模式已修可用）、`/api/dcprint/scan`、标签打印模块。

---

## 6. 阶段五：Pad + 扫描枪移动作业端（P2 体验优化）

- 5-1 Pad 响应式（大按钮/大字体/高对比/三色状态）；5-2 扫描枪键盘模拟输入兼容；5-3~5-6 Pad 端采购入库/分切/领料/盘点调拨页；5-7 三色交互（绿合规/黄提醒/红拦截）。
- **依赖**：阶段二~四的业务能力先就位，Pad 端只是适配层。

---

## 7. 阶段六：ModernWMS 整合（P3 长期）

- 6-1 双层定位：vnerp=业务财务中枢，ModernWMS=仓储执行层。
- 6-2 主数据同步（物料/供应商/客户/仓库/库位由 vnerp 下发）。
- 6-3 核心单据对接（采购入库/销售出库/生产领料审核后下发，执行结果回传）。
- 6-4 事件总线替换同步接口（已有 OutboxPoller 可直接复用）。
- 6-5 库位四级体系（仓-区-架-位）+ 上架策略。
- 6-6 波次拣选/智能上架；6-7 可视化看板+热力图；6-8 ABC 分类/呆滞料分析。

**注意**：外部系统，需先定接口契约与鉴权，建议 Phase 五完成后启动。

---

## 8. 阶段七：印前模块（网板/油墨/刀模）整合 ModernWMS（P1）

沿用「vnerp 管工艺 + WMS 管实物」双层（详见用户原方案）。

| 任务 | 要点 |
|------|------|
| 7-1 WMS 档案扩展 | 油墨/刀模/网板专属属性字段 |
| 7-2 编号唯一 | 三类编号全局唯一 + 唯一索引（复用阶段一模式） |
| 7-3 油墨 | 完全复用原材料 FIFO+效期（最成熟，先做） |
| 7-4 刀模 | 一物一码 + 寿命累计（设计寿命/累计次数，80%黄提醒/100%红拦截）+ 修模报废 |
| 7-5 网板 | 一物一码 + 张力+次数双管控（张力阈值拦截、张检记录） |
| 7-6 三套标签模板 | 油墨/刀模/网板，支持批量+补打 |
| 7-7 Pad 三作业页 | 油墨/刀模/网板各作业入口 |
| 7-8/7-9 双向对接 | 主数据同步 + 单据对接回传 |
| 7-10 印前工装看板 | 在库/寿命预警/临期油墨/待报废统计 |

**执行顺序建议**：油墨（复用原材料）→ 刀模（工装通用逻辑）→ 网板（张力扩展，最复杂）。

---

## 9. 跨阶段依赖与建议排期

```
阶段一(收尾 1-2/1-3)  ──►  阶段二(FIFO+效期)  ──┐
        │                                          ├─► 阶段四(二维码+标签) ─► 阶段五(Pad)
        └─► 阶段三(分切, 依赖 2-3) ◄───────────────┘
                                                      │
                                              阶段六(ModernWMS) ─ 阶段七(印前)
```

- **第一阶段（1~2 周）**：收尾阶段一 + 阶段二（数据一致性 + 核心业务规则）。
- **第二阶段（2~3 周）**：阶段三（分切）+ 阶段四（二维码+标签）。
- **第三阶段（1 周）**：阶段五（Pad 端）。
- **第四阶段（长期）**：阶段六 + 阶段七（ModernWMS 整合 + 印前）。

---

## 10. 风险与护栏

1. **🔴 drizzle-kit 误删外键**：任何 schema 改动走裸 SQL 迁移，**绝不**跑 `drizzle-kit push/generate`（会删 129 个 FK）。
2. **数据孤儿**：加唯一索引前先跑重复检测（参考 `scripts/check-duplicate-data.mjs`）。1-3 已实测 0 行安全；1-2 为新列不涉及历史重复。
3. **并发扣减**：库存写用 `transactionWithRetry` + 行锁，FIFO 扣减需 `SELECT ... FOR UPDATE` 锁批次行。
4. **Drizzle 建模缺口**：财务 `fin_voucher*`、印前 `prd_ink/die` 等表 Drizzle 未建模，涉及这些表的查询仍走 `db.query` raw SQL，新增逻辑优先复用既有仓储而非强行 Drizzle 化。
5. **扫码幂等**：出库扫码除 DB 唯一索引外，应用层对「同单同码」请求做前置拦截（参考阶段一 1-7 模式）。

---

## 11. 验收与回归门禁

- **类型门**：每次改动后 `npx tsc --noEmit` 必须 EXIT 0（`next build` 本机 hang，用 tsc 兜底）。
- **数据门**：涉及唯一索引的迁移，先 dry-run 脏数据脚本确认 0 重复再执行。
- **端到端门**：核心链路（采购入库→FIFO 推荐→扫码出库→库存流水）用真实标签 + 真事件总线冒烟，轮询 >5s 再断言，DECIMAL 用 `Number()` 比较（先前踩过的坑）。
- **迁移幂等**：所有 `.sql` 用 `information_schema` 探测 + `IF NOT EXISTS`/重复忽略，可复跑。

---

## 12. 待确认/开放项

- [ ] 1-3 写入路径核查（是否存在单来源多行）— 决定索引是否加判别列。
- [ ] 阶段二 2-1「保质期天数」列命名与单位（天？月？）待定。
- [ ] 阶段六 ModernWMS 接口契约与鉴权方案（启动前定）。
- [ ] 印前三类物资是否全部下沉 WMS，还是仅油墨先行（原方案建议油墨先做）。
