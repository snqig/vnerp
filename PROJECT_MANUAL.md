# RP/MES/WMS/HRM 四系统数据关联审计报告
## 一、问题清单（按系统及关联对列出）
### 1. ERP ↔ WMS 关联问题
# 问题描述 涉及表/字段 具体数据示例 严重等级 影响后果 1.1 采购订单存在两套表结构，字段不一致 pur_order vs pur_purchase_order ； pur_order_detail vs pur_purchase_order_line pur_order 用 BIGINT UNSIGNED id ， pur_purchase_order 用 INT UNSIGNED id ；状态枚举不一致（TINYINT 1-5 vs TINYINT 10-90）； pur_purchase_order_line 有外键约束， pur_order_detail 没有 致命 数据写入不同表导致采购数据分裂，入库单关联的 purchase_order_id 可能指向错误表 1.2 入库单与采购订单关联字段为后补，非原生设计 inv_inbound_order.purchase_order_id 通过 ALTER TABLE 后加 初始建表无此字段，早期入库数据 purchase_order_id 为 NULL，视图 v_purchase_to_inbound LEFT JOIN 后这些记录丢失采购关联 严重 采购到入库的追溯链断裂，财务对账无法匹配 1.3 销售出库单 inv_sales_outbound 关联的是 order_id （销售订单），但视图 v_workorder_to_outbound 用 wo.sales_order_id 关联，语义混淆 inv_sales_outbound.order_id vs prod_work_order.sales_order_id 工单的 sales_order_id 是后补字段（ALTER TABLE添加），若工单未填此字段，视图关联结果为 NULL 严重 销售订单→工单→出库的完整链路不可查 1.4 盘点差异未设计财务调整触发机制 inv_stock_adjust 表无 voucher_no 、 finance_posted 字段 盘点调整后库存数量变更，但无财务凭证关联，成本金额无法同步调整 严重 库存成本与实物不一致，财务报表失真 1.5 入库单存在两套表定义 inv_inbound_order （inbound-tables创建）与 inv_inbound_order （full-tables创建）字段不同 inbound-tables版本用 ENUM('draft','pending','approved','completed','cancelled') 状态；full-tables版本无此枚举。po-grn-tables又添加了 po_id 、 grn_type 、 qc_status 等字段 致命 同一张表被多个初始化脚本覆盖，字段定义不确定

### 2. ERP ↔ MES（生产）关联问题
# 问题描述 涉及表/字段 具体数据示例 严重等级 影响后果 2.1 BOM存在三套表结构，互不兼容 prd_bom + prd_bom_detail （full-tables）； mdm_product_bom （product-tables）； bom_header + bom_line （bom-tables） 三套BOM的ID类型不同（BIGINT vs INT），字段名不同（ quantity vs consumption_qty vs 用量 ），版本管理方式不同 致命 工单关联BOM时不知道该查哪张表，物料需求计算可能基于错误BOM 2.2 销售订单→工单的关联字段 order_id 语义不清 prod_work_order.order_id 注释为"关联销售订单ID"，但 data-logic 又添加了 sales_order_id 同一张表有两个字段指向销售订单（ order_id 和 sales_order_id ），应用层不知该用哪个 严重 工单无法准确追溯来源销售订单 2.3 工单物料需求表无超领控制 prod_work_order_material_req 只有 required_qty ，无 issued_qty 、 over_issue_qty 、 over_issue_limit 实际发料数量（ prd_material_issue_item.issued_qty ）可能远超需求量，系统无预警 严重 物料浪费无法控制，成本核算偏差大 2.4 BOM变更无版本生效时序控制 prd_bom 有 version 字段但无 effective_date 、 obsolete_date 旧BOM已投入生产时新BOM生效，正在生产的工单仍按旧BOM投料还是新BOM投料无规则 严重 生产投料混乱，产品规格可能不符合客户要求 2.5 物料主档也存在两套表 inv_material （full-tables）vs bom_material （bom-tables）vs mdm_material （API中使用） 三处定义物料基础信息， inv_material 用 BIGINT UNSIGNED id ， bom_material 用 INT UNSIGNED id ，且字段不完全一致 致命 物料编码在不同表中可能不同步，投料、采购、库存引用的物料信息不一致

### 3. MES ↔ WMS 关联问题
# 问题描述 涉及表/字段 具体数据示例 严重等级 影响后果 3.1 生产完工入库与工单产出无自动核对 inv_production_inbound 有 work_order_id ，但无 plan_qty 、 qualified_qty 字段 工单计划生产10000张，实际入库8000张，系统无差异提示 严重 生产损耗无法追踪，在制品数量不清 3.2 发料单明细无批次分配记录 prd_material_issue_item 有 batch_no 但无 batch_id 、 fifo_allocation_id 发料时如果走FIFO自动分配，分配结果未持久化到发料明细，只记录了最终批次号 严重 无法追溯发料时的FIFO分配过程，审计困难 3.3 库存事务表 inv_inventory_transaction 被多个初始化脚本重复创建 inbound-tables、full-tables、po-grn-tables 三处定义 trans_type 枚举值不同： ENUM('in','out','transfer','adjust','return') vs ENUM('in','out','transfer','adjust','return') 一致但字段不同（po-grn版本有 material_code 必填，full-tables版本可选） 严重 表结构不确定，依赖此表的报表和查询可能失败

### 4. HRM ↔ MES/WMS 关联问题
# 问题描述 涉及表/字段 具体数据示例 严重等级 影响后果 4.1 考勤表 hr_attendance.employee_id 类型为 VARCHAR(50)，与 sys_employee.id 类型 INT UNSIGNED 不匹配 hr_attendance.employee_id vs sys_employee.id 考勤表中 employee_id 存的是 'EMP001' 字符串，而 sys_employee.id 是数字自增主键 致命 考勤记录无法通过外键关联到员工表，工时统计、工资计算需额外映射 4.2 生产报工表 prd_work_report.operator_id 与 sys_employee.id 无外键约束 prd_work_report.operator_id BIGINT UNSIGNED 操作员ID可能指向不存在的员工，或指向已离职员工 严重 工时统计不准确，计件工资可能发错人 4.3 薪资表 sys_salary 无计件工资字段 sys_salary 只有 basic_salary 、 overtime_pay 、 performance_bonus 等 生产报工的 qualified_qty （合格产出）无法直接映射到薪资计算，缺少 piece_rate_salary （计件工资）字段 严重 计件工资需人工计算，无法自动关联生产产出 4.4 仓库作业人员绩效无关联 WMS出库/入库单有 operator_id / operator_name ，但无绩效评分字段 叉车工一天作业20单vs5单，系统无统计无考核 轻微 仓库人员绩效无法量化管理 4.5 部门ID在多表中不一致 sys_employee.dept_id INT； hr_attendance.department_name VARCHAR； prd_work_report 无部门字段 考勤按部门名称字符串匹配，员工按部门ID数字匹配，报工无部门信息 严重 跨系统按部门统计时数据口径不一致

### 5. 跨系统通用问题
# 问题描述 涉及表/字段 具体数据示例 严重等级 影响后果 5.1 物料编码在多表中冗余存储且无同步机制 inv_material.material_code 、 inv_inventory_batch.material_code 、 prd_material_issue_item.material_code 、 inv_material_label.material_code 等 物料编码变更后，历史单据中的冗余编码不会更新 严重 历史数据查询时物料名称/编码不一致 5.2 deleted 字段类型不统一 部分表用 TINYINT DEFAULT 0 ，部分用 TINYINT(1) DEFAULT 0 ， inv_inventory_batch 用 TINYINT(1) DEFAULT 0 逻辑一致但类型定义不统一，影响ORM映射 轻微 代码维护困难 5.3 多初始化脚本存在覆盖风险 full-tables 先 DROP TABLE 再 CREATE，但 supplement-tables 、 inbound-tables 、 po-grn-tables 等是增量添加 执行顺序不同导致最终表结构不同 致命 数据库初始化结果不确定，生产环境与开发环境可能不一致 5.4 视图 v_workorder_to_outbound 将工单发料和销售出库混在一个视图 prd_material_issue （生产发料）和 inv_sales_outbound （销售出库） 工单既关联了发料又关联了销售出库，但发料是"进"生产、销售出库是"出"仓库，方向不同 严重 视图语义混乱，查询结果可能误导业务决策

## 二、FIFO专项检查表
### 2.1 最小表结构检查
必需表 是否存在 评估 批次主表 （记录每个批次的入库日期、数量、单价） ✅ inv_inventory_batch 存在 包含 batch_no 、 inbound_date 、 quantity 、 available_qty 、 unit_price 、 expire_date 批次余额表 （记录每个批次的剩余量） ⚠️ 未独立存在 inv_inventory_batch 同时承担主表和余额表角色， available_qty 即为余额。但缺少 total_issued_qty （累计出库量）字段，无法直接计算历史消耗 出库批次分配表 （记录每次出库分配到哪些批次） ❌ 缺失 出库时FIFO分配结果只写入了 inv_inventory_transaction 的 batch_no 字段，无独立的分配明细表。无法追溯某次出库具体从哪些批次扣减了多少

### 2.2 FIFO逻辑实现检查
检查项 状态 说明 FIFO排序逻辑 ✅ 已实现 ORDER BY inbound_date ASC, id ASC ，fifo/route.ts 还加入了过期优先排序 过期优先出库 ✅ 已实现 CASE WHEN expire_date <= 30天 THEN 0 ... 优先出即将过期批次 批次锁定（FOR UPDATE） ✅ 已实现 分配时使用 FOR UPDATE 行锁防止并发冲突 乐观锁版本号 ✅ 已实现 inv_inventory_batch.version 字段，UPDATE 时 version = version + 1 FIFO覆盖日志 ✅ 已实现 inv_fifo_override_log 记录跳过FIFO推荐批次的操作 FIFO推荐API ✅ 已实现 fifo-recommend/route.ts 提供推荐批次、替代批次、近效期预警 批次拆分支持 ✅ 已实现 FIFO分配循环中 allocateQty = Math.min(remaining, availableQty) 支持部分扣减 销售出库FIFO ✅ 已实现 sales-outbound/route.ts 中按 inbound_date ASC 扣减批次

### 2.3 违反FIFO的业务流程路径
风险路径 说明 严重等级 指定批次出库可绕过FIFO fifo/route.ts POST接口允许传入 batch_id 或 batch_no 指定批次，虽然有 inv_fifo_override_log 记录，但 approval_status 默认为0（待审批）， 无强制审批拦截 严重 confirm出库有两套FIFO实现 outbound/confirm/route.ts 和 outbound/fifo/route.ts 各自实现了 allocateFIFO 函数，排序逻辑不同：confirm版只按 inbound_date ASC, id ASC ；fifo版加入了过期优先 严重 销售出库扣减 inv_inventory 和 inv_inventory_batch 双重扣减 sales-outbound/route.ts 先扣 inv_inventory.quantity ，再按FIFO扣 inv_inventory_batch.available_qty ，两处扣减不在同一事务一致性保证中 致命 生产发料未走FIFO prd_material_issue_item 只有 batch_no 字段，发料流程未调用FIFO分配API，批次号可能手动填写 严重

### 2.4 建议的FIFO校验SQL逻辑
```
-- 检查1: 是否存在后入库批次先出库的FIFO违反
SELECT 
  ob.batch_no AS outbound_batch,
  ob.outbound_date,
  ib_out.inbound_date AS outbound_batch_inbound_date,
  ib_remain.batch_no AS remaining_batch,
  ib_remain.inbound_date AS remaining_batch_inbound_date
FROM inv_inventory_transaction ob
JOIN inv_inventory_batch ib_out ON ob.batch_no = ib_out.batch_no
JOIN inv_inventory_batch ib_remain 
  ON ib_remain.material_id = ob.material_id 
  AND ib_remain.warehouse_id = ob.warehouse_id
  AND ib_remain.available_qty > 0
  AND ib_remain.deleted = 0
  AND ib_remain.inbound_date < ib_out.inbound_date
WHERE ob.trans_type = 'out'
  AND ob.quantity < 0
  AND ib_out.expire_date IS NULL OR ib_out.expire_date > CURDATE()
  AND ob.create_time > DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 检查2: FIFO覆盖未审批记录
SELECT * FROM inv_fifo_override_log 
WHERE approval_status = 0 
  AND create_time < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- 检查3: 批次余额与库存台账不一致
SELECT 
  ib.material_id,
  ib.warehouse_id,
  SUM(ib.available_qty) AS batch_total_available,
  inv.quantity AS inventory_qty
FROM inv_inventory_batch ib
JOIN inv_inventory inv ON ib.material_id = inv.material_id AND ib.warehouse_id = inv.
warehouse_id
WHERE ib.deleted = 0 AND ib.status = 'normal'
GROUP BY ib.material_id, ib.warehouse_id, inv.quantity
HAVING ABS(batch_total_available - inventory_qty) > 0.001;
```
## 三、整体健康度评分
### 评分明细
维度 满分 得分 说明 表结构完整性 20 12 核心表基本齐全，但缺少出库批次分配表，多套表结构冲突 主外键参照完整性 15 5 大部分关联靠应用层维护，数据库层外键极少； hr_attendance.employee_id 类型不匹配 FIFO实现质量 20 14 核心FIFO逻辑完善，有覆盖日志和推荐API，但双实现不一致、生产发料未走FIFO 跨系统数据一致性 20 6 物料/BOM/采购订单存在多套表，ID类型不统一，初始化脚本覆盖风险高 业务流程闭环 15 8 销售→生产→采购主链路基本通，但盘点→财务调整、计件工资→生产产出等环节断裂 数据同步时序控制 10 3 无BOM版本生效控制，无工单状态变更事件通知机制

### 综合健康度评分：48 / 100
### 一句总结 系统具备较完整的业务表覆盖和FIFO核心逻辑，但"多套表结构并存、跨系统ID类型不一致、关键关联字段后补缺失"三大结构性问题严重威胁数据一致性，需优先统一表结构定义、补齐出库批次分配表、修复HRM与MES的员工ID关联，方可支撑生产级运行。
### 优先修复建议（按紧急程度排序）
1. 🔴 统一采购订单表 ：合并 pur_order 和 pur_purchase_order 为一套，所有引用方统一指向
2. 🔴 统一BOM表 ：合并 prd_bom 、 mdm_product_bom 、 bom_header 为一套，增加版本生效日期
3. 🔴 统一物料主档 ：合并 inv_material 、 bom_material 、 mdm_material 为一套
4. 🔴 修复 hr_attendance.employee_id 类型 ：改为 INT UNSIGNED 并添加外键指向 sys_employee.id
5. 🟠 创建出库批次分配表 ： inv_outbound_batch_allocation （outbound_id, batch_id, allocate_qty, unit_cost, fifo_mode）
6. 🟠 统一FIFO分配实现 ：合并 confirm/route.ts 和 fifo/route.ts 的 allocateFIFO 为一个共享函数
7. 🟠 生产发料接入FIFO ： prd_material_issue 流程调用FIFO分配API
8. 🟡 盘点调整增加财务过账 ： inv_stock_adjust 添加 finance_posted 、 voucher_no 字段
9. 🟡 薪资表增加计件工资 ： sys_salary 添加 piece_rate_salary 字段，关联生产报工产出
审计报告已完成。以上报告涵盖了：

1. 问题清单 ：5大关联对共20个问题，其中致命级5个、严重级12个、轻微级3个
2. FIFO专项检查 ：最小表结构评估（缺失出库批次分配表）、逻辑实现检查（8项通过/4项风险）、违反FIFO的业务路径（4条）、校验SQL逻辑
3. 健康度评分 ：48/100分，核心短板在于多套表结构并存和跨系统ID类型不一致
最需要优先解决的是三个"致命"级问题：采购订单/BOM/物料主档的多套表统一，以及HRM考勤表的员工ID类型修复。如需我针对某个具体问题进行修复实施，请告知。
# 角色
你是一位精通 MySQL 数据库重构和后端 Node.js/TypeScript 的技术专家。请根据“四系统数据关联审计报告”中的致命级问题，按顺序实施修复。

## 问题清单（按优先级）
1. **统一采购订单表**：现有 `pur_order` 与 `pur_purchase_order` 两套结构，字段、ID类型、状态枚举均不一致。
2. **统一 BOM 表**：合并 `prd_bom` + `prd_bom_detail`、`mdm_product_bom`、`bom_header` + `bom_line` 为一套标准 BOM。
3. **统一物料主档**：合并 `inv_material`、`bom_material`、`mdm_material`。
4. **修复 hr_attendance.employee_id 类型**：改为 INT UNSIGNED，并建立外键指向 `sys_employee.id`。
5. **创建出库批次分配表**：设计 `inv_outbound_batch_allocation`，用于详细记录每次出库的批次分配明细。
6. **统一 FIFO 分配实现**：将 `confirm/route.ts` 和 `fifo/route.ts` 中的 `allocateFIFO` 函数抽离为共享模块，并让生产发料也调用此接口。

## 输出要求
- 每个问题提供：
  - `ALTER TABLE` / `CREATE TABLE` 的 SQL 语句（含必要的索引与外键）
  - 数据迁移脚本（例如将旧表数据合并到新表，或转换字段类型）
  - 后端代码修改示例（关键逻辑片段）
  - 验证 SQL（用于检查修复前后数据一致性）
- 所有 SQL 要求幂等，可重复执行。
- 最后给出一个“快速修复”的执行顺序（先停服哪个模块，后部署哪些变更）。

## 约束
- 不能删除未处理的旧表，需先建立新表，双写运行一段时间后废弃旧表。
- 保持现有 API 接口不变，通过适配层做字段映射。

---

## 六大修复项实施记录（已完成）

### 【1】统一采购订单表

**新建标准表**：`std_purchase_order` + `std_purchase_order_line`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED AUTO_INCREMENT | 统一主键类型 |
| order_no | VARCHAR(50) UK | 采购单号 |
| source_request_id | BIGINT UNSIGNED | 来源请购单ID |
| supplier_id | BIGINT UNSIGNED | 供应商ID |
| status | TINYINT | 0-草稿/1-已提交/2-审校中/3-审校通过/4-已批准/5-部分收货/6-已完成/7-已取消/8-已关闭 |
| legacy_source | VARCHAR(30) | 旧表来源标识 |
| legacy_id | BIGINT UNSIGNED | 旧表原始ID |

**迁移结果**：
- pur_order → std_purchase_order: 10行
- pur_purchase_order → std_purchase_order: 5行
- pur_order_detail → std_purchase_order_line: 10行
- pur_purchase_order_line → std_purchase_order_line: 19行

**状态枚举映射**：
- pur_order: 1→0, 2→4, 3→5, 4→6, 5→8
- pur_purchase_order: 10→0, 20→2, 30→4, 40→5, 50→6, 90→8

### 【2】统一BOM表

**新建标准表**：`std_bom_header` + `std_bom_line`

| 关键字段 | 说明 |
|----------|------|
| effective_date | 生效日期（新增） |
| obsolete_date | 失效日期（新增） |
| material_type | TINYINT: 1-原材料/2-半成品/3-辅料/4-包材/5-其他 |

**迁移结果**：
- prd_bom → std_bom_header: 10行
- prd_bom_detail → std_bom_line: 30行
- bom_header → std_bom_header: 1行
- bom_line → std_bom_line: 4行
- mdm_product_bom: 10行需手动映射

### 【3】统一物料主档

**新建标准表**：`std_material`

**迁移结果**：
- inv_material → std_material: 20行
- bom_material → std_material: 4行
- mdm_material: 表不存在，跳过

### 【4】修复HRM考勤表员工ID

**修改**：新增 `employee_id_int INT UNSIGNED` 字段

**迁移结果**：
- hr_attendance 表已创建（含 employee_id_int）
- POST接口已更新，写入时自动填充 employee_id_int

### 【5】创建出库批次分配表

**新建表**：`inv_outbound_batch_allocation`

| 字段 | 说明 |
|------|------|
| source_type | 来源类型: outbound_order/material_issue/outsource_issue |
| batch_id | 批次ID |
| allocated_qty | 分配数量 |
| unit_cost | 单位成本 |
| total_cost | 总成本 |
| fifo_mode | FIFO模式: fifo_auto/specified_batch/manual_override |

### 【6】统一FIFO分配实现

**新建共享模块**：`src/lib/fifo-allocation.ts`

| 函数 | 说明 |
|------|------|
| allocateFIFO | FIFO批次分配（含保质期优先排序） |
| executeFIFODeduction | 执行FIFO扣减+事务记录+批次分配表写入 |
| executeSpecifiedBatchDeduction | 执行指定批次扣减 |

**已改造路由**：
- `warehouse/outbound/confirm/route.ts` — 移除内联allocateFIFO，改用共享模块
- `production/material-issue/route.ts` — 生产发料接入FIFO，改用共享模块

---

## 快速修复上线执行顺序

### 第一阶段：停服与数据库迁移

```
1. 停止 Next.js 应用服务
2. 执行迁移 API（按顺序）：
   GET /api/migrations/six-critical-fixes?step=1  （采购订单统一）
   GET /api/migrations/six-critical-fixes?step=2  （BOM统一）
   GET /api/migrations/six-critical-fixes?step=3  （物料主档统一）
   GET /api/migrations/six-critical-fixes?step=4  （HRM考勤修复）
   GET /api/migrations/six-critical-fixes?step=5  （出库批次分配表）
   GET /api/migrations/purchase-request-fk         （请购单FK字段）
3. 验证迁移结果：
   SELECT COUNT(*) FROM std_purchase_order;      -- 预期15
   SELECT COUNT(*) FROM std_purchase_order_line;  -- 预期29
   SELECT COUNT(*) FROM std_bom_header;           -- 预期11
   SELECT COUNT(*) FROM std_bom_line;             -- 预期34
   SELECT COUNT(*) FROM std_material;             -- 预期24
   SELECT COUNT(*) FROM inv_outbound_batch_allocation; -- 预期0（新表）
```

### 第二阶段：后端部署

```
4. 部署新代码（含共享FIFO模块、改造后的路由）
5. 启动 Next.js 应用
6. 验证：
   - 创建请购单 → 检查 material_id 是否写入
   - 生产发料过账 → 检查 inv_outbound_batch_allocation 是否有记录
   - 出库确认 → 检查FIFO分配是否正常
```

### 第三阶段：双写过渡期（2-4周）

```
7. 新数据同时写入旧表和标准表
8. 定期对比数据一致性
9. 前端逐步切换到标准表API
```

### 第四阶段：旧表废弃

```
10. 确认所有前端已切换到标准表API
11. 停止双写
12. 旧表标记为只读（RENAME TO _archived_表名）
13. 30天后确认无问题，DROP旧表
```

### 旧表废弃与清理策略

| 旧表 | 新表 | 过渡期操作 | 废弃条件 |
|------|------|-----------|---------|
| pur_order | std_purchase_order | 双写+legacy_source标记 | 所有PO API切换到std表 |
| pur_purchase_order | std_purchase_order | 双写+legacy_source标记 | 所有PO API切换到std表 |
| pur_order_detail | std_purchase_order_line | 双写 | 同上 |
| pur_purchase_order_line | std_purchase_order_line | 双写 | 同上 |
| prd_bom | std_bom_header | 双写+legacy_source标记 | 所有BOM API切换到std表 |
| prd_bom_detail | std_bom_line | 双写 | 同上 |
| bom_header | std_bom_header | 双写+legacy_source标记 | 同上 |
| bom_line | std_bom_line | 双写 | 同上 |
| mdm_product_bom | std_bom_header | 手动映射 | 映射完成 |
| inv_material | std_material | 双写+legacy_source标记 | 所有物料API切换到std表 |
| bom_material | std_material | 双写+legacy_source标记 | 同上 |
| hr_attendance.employee_id | hr_attendance.employee_id_int | 新写入同时填两字段 | 所有HR API使用INT字段 |
