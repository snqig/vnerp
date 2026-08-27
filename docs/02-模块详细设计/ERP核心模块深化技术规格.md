# ERP 核心模块深化技术规格文档

> **版本**: v1.0  
> **日期**: 2026-06-30  
> **状态**: 待评审

---

## 1. 概述

### 1.1 背景

当前 印刷生产经营信息管理系统 Print MIS 系统已具备生产管理、销售管理、采购管理、财务管理四大模块的页面与 API 骨架，但核心业务能力深度不足，特别是：

- **MRP 运算**：仅有基础框架，缺乏能力需求计划、有限能力排程、替代料处理
- **成本核算**：仅实现移动加权平均法，缺乏完整的产品成本卷积、成本差异分析
- **财务总账**：仅有应收应付单据，缺乏会计科目体系、凭证管理、账簿报表

### 1.2 目标

深化四大核心模块的业务能力，使其达到可用的生产级水平：

1. **MRP 运算**：支持净需求计算、批量调整、提前期排程、替代料处理、能力需求粗算
2. **成本核算**：支持移动加权平均、月末一次加权平均、标准成本三种方法，产品成本卷积
3. **财务总账**：建立完整会计科目体系，凭证自动生成，三大财务报表
4. **产供销协同**：销售订单 → MRP → 生产/采购 → 入库 → 成本核算 → 财务凭证 的全链路闭环

### 1.3 范围

| 模块 | 深化内容 | 优先级 |
|------|----------|--------|
| 生产管理 - MRP | 净需求计算、批量调整、提前期排程、替代料、能力粗算 | P0 |
| 财务管理 - 成本核算 | 移动加权平均、月末加权平均、标准成本、成本卷积 | P0 |
| 财务管理 - 总账 | 会计科目、凭证管理、明细账/总账、资产负债表/利润表 | P0 |
| 销售管理 | 价格策略、信用管控、交期承诺（ATP/CTP） | P1 |
| 采购管理 | 供应商配额、采购价格管理、交期预警 | P1 |

---

## 2. 现状分析

### 2.1 现有资产

| 模块 | 已有能力 | 代码位置 |
|------|----------|----------|
| MRP | BOM展开、时间桶、基础净需求、计划订单生成 | `src/lib/mrp-engine.ts` |
| BOM展开 | 多层展开、损耗率累计、循环引用检测 | `src/lib/bom-expansion.ts` |
| 成本核算 | 移动加权平均法（单函数） | `src/lib/__tests__/cost-calculation.test.ts` |
| 财务核心 | 应收单生成、回款录入、应付单生成、付款录入 | `src/lib/finance-core.ts` |
| 财务凭证 | 凭证处理器基础框架 | `src/lib/FinanceVoucherHandler.ts` |
| 生产排程 | 基础排程算法 | `src/lib/production-scheduling.ts` |
| 状态机 | 工单、销售订单、发货、仓库状态机 | `src/lib/*-state-machine.ts` |

### 2.2 核心数据表现状

**已有数据表**：
- `inv_material` - 物料档案
- `sal_order` / `sal_order_detail` - 销售订单
- `pur_order` / `pur_order_detail` - 采购订单
- `pur_request` / `pur_request_detail` - 采购申请
- `pro_work_order` / `pro_work_order_detail` - 生产工单
- `bom` / `bom_line` - 物料清单
- `fin_receivable` - 应收单
- `fin_payable` - 应付单
- `wh_inventory` - 库存

**缺失数据表**：
- 会计科目表 `fin_account`
- 会计凭证表 `fin_voucher` / `fin_voucher_line`
- 成本核算表 `fin_cost_calculation`
- MRP运算结果表 `mrp_result`
- 标准成本表 `fin_standard_cost`

---

## 3. 模块一：MRP 运算深化

### 3.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 毛需求计算 | 基于销售订单和预测单展开BOM | P0 |
| 净需求计算 | 毛需求 - 现有库存 - 在途/在制 + 安全库存 | P0 |
| 批量调整 | 固定批量、经济批量、最小批量倍数 | P0 |
| 提前期排程 | 按累计提前期倒推计划开工/完工日期 | P0 |
| 替代料处理 | 主料不足时自动考虑替代料 | P1 |
| 能力需求粗算 | 按工作中心汇总工时，识别瓶颈 | P1 |
| MRP运算版本 | 支持多次运算对比，版本管理 | P2 |

### 3.2 算法设计

#### 3.2.1 净需求计算公式

```
净需求 = 毛需求 
       - 现有可用库存 
       - 预计入库量（在制工单 + 在途采购）
       + 安全库存
       - 已分配量（已分配给其他工单）
```

**时间桶粒度**：按天（可配置按周/按月汇总）

#### 3.2.2 批量调整规则

| 批量策略 | 公式 | 适用场景 |
|----------|------|----------|
| 固定批量 | `计划量 = 固定批量 × ceil(净需求 / 固定批量)` | 标准件、常用料 |
| 经济批量（EOQ） | `EOQ = sqrt(2DS/H)` 其中 D=年需求量, S=每次订货成本, H=单位年存储成本 | 价值较高、订货频繁物料 |
| 直接批量 | `计划量 = 净需求` | 贵重物料、专用料 |
| 最小批量倍数 | `计划量 = max(最小批量, ceil(净需求 / 批量倍数) × 批量倍数)` | 包装规格限制 |

#### 3.2.3 提前期计算

```
计划完工日期 = 需求日期 - 检验提前期
计划开工日期 = 计划完工日期 - 生产提前期（产品）
采购到货日期 = 需求日期 - 检验提前期
采购下单日期 = 采购到货日期 - 采购提前期（供应商）
```

**累计提前期计算**：
- 采购件：采购提前期 + 检验提前期
- 自制件：生产提前期 + 检验提前期 + 子件最长累计提前期

### 3.3 数据模型

```sql
-- MRP运算主表
CREATE TABLE mrp_run (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  run_no VARCHAR(50) NOT NULL COMMENT '运算编号',
  run_type TINYINT NOT NULL DEFAULT 1 COMMENT '1:全量重排 2:净改变',
  plan_start_date DATE NOT NULL COMMENT '计划开始日期',
  plan_end_date DATE NOT NULL COMMENT '计划结束日期',
  horizon_days INT NOT NULL DEFAULT 180 COMMENT '展望期天数',
  bucket_size TINYINT NOT NULL DEFAULT 1 COMMENT '1:日 2:周 3:月',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0:计算中 1:已完成 2:已确认 3:已取消',
  product_count INT DEFAULT 0 COMMENT '产品数量',
  material_count INT DEFAULT 0 COMMENT '物料数量',
  planned_order_count INT DEFAULT 0 COMMENT '计划订单数',
  purchase_req_count INT DEFAULT 0 COMMENT '采购申请数',
  work_order_count INT DEFAULT 0 COMMENT '工单数',
  remark VARCHAR(500),
  created_by VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME,
  confirmed_by VARCHAR(50)
);

-- MRP运算结果明细表
CREATE TABLE mrp_result (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  run_id BIGINT NOT NULL COMMENT '运算ID',
  material_id BIGINT NOT NULL COMMENT '物料ID',
  material_code VARCHAR(50),
  material_name VARCHAR(200),
  bucket_date DATE NOT NULL COMMENT '时间桶日期',
  gross_requirement DECIMAL(18,4) DEFAULT 0 COMMENT '毛需求',
  scheduled_receipt DECIMAL(18,4) DEFAULT 0 COMMENT '预计入库',
  on_hand_inventory DECIMAL(18,4) DEFAULT 0 COMMENT '期末可用库存',
  net_requirement DECIMAL(18,4) DEFAULT 0 COMMENT '净需求',
  planned_order_receipt DECIMAL(18,4) DEFAULT 0 COMMENT '计划产出',
  planned_order_release DECIMAL(18,4) DEFAULT 0 COMMENT '计划投入',
  action_type TINYINT COMMENT '1:生产 2:采购 3:调拨',
  source_order_id BIGINT COMMENT '来源订单ID',
  source_order_no VARCHAR(50),
  demand_level INT DEFAULT 0 COMMENT '需求层级',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_run_material (run_id, material_id),
  INDEX idx_material_date (material_id, bucket_date)
);

-- 替代料关系表
CREATE TABLE bom_substitute (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  bom_id BIGINT NOT NULL,
  bom_line_id BIGINT NOT NULL COMMENT 'BOM行ID（主料）',
  material_id BIGINT NOT NULL COMMENT '替代料ID',
  material_code VARCHAR(50),
  material_name VARCHAR(200),
  substitute_qty DECIMAL(18,4) NOT NULL DEFAULT 1 COMMENT '替代用量（替代1单位主料需要多少替代料）',
  priority INT NOT NULL DEFAULT 1 COMMENT '优先级（数字越小越优先）',
  effective_date DATE COMMENT '生效日期',
  expiry_date DATE COMMENT '失效日期',
  status TINYINT DEFAULT 1 COMMENT '0:禁用 1:启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bom_line (bom_line_id)
);
```

### 3.4 API 设计

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 执行MRP运算 | POST | `/api/production/mrp/run` | 触发MRP全量/净改变运算 |
| 查询运算结果 | GET | `/api/production/mrp/result/:runId` | 分页查询MRP运算结果 |
| 确认计划订单 | POST | `/api/production/mrp/confirm` | 确认计划订单，生成正式工单/采购申请 |
| 运算列表 | GET | `/api/production/mrp/runs` | 查询历史运算记录 |
| 运算对比 | GET | `/api/production/mrp/compare` | 对比两次运算结果差异 |

### 3.5 核心类设计

```typescript
// mrp-engine-v2.ts

class MRPEngine {
  constructor(config: MRPConfig) {}
  
  // 执行完整MRP运算
  async run(params: MRPRunParams): Promise<MRPRunResult> {}
  
  // 1. 收集独立需求（销售订单+预测单）
  private collectGrossRequirements(): Promise<MRPDemandItem[]> {}
  
  // 2. BOM展开计算毛需求
  private explodeGrossRequirements(demands: MRPDemandItem[]): Promise<MRPBucketItem[]> {}
  
  // 3. 计算净需求（考虑库存、在途、在制）
  private calculateNetRequirements(buckets: MRPBucketItem[]): Promise<MRPBucketItem[]> {}
  
  // 4. 批量调整
  private applyLotSizing(netReqs: MRPBucketItem[]): Promise<MRPBucketItem[]> {}
  
  // 5. 提前期排程（倒推开工/下单日期）
  private scheduleLeadTime(buckets: MRPBucketItem[]): Promise<MRPPlannedOrder[]> {}
  
  // 6. 能力需求粗算
  private calculateCapacityRequired(plannedOrders: MRPPlannedOrder[]): Promise<CapacityLoad[]> {}
  
  // 7. 生成计划订单
  private generatePlannedOrders(buckets: MRPBucketItem[]): Promise<MRPPlannedOrder[]> {}
}
```

---

## 4. 模块二：成本核算深化

### 4.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 移动加权平均法 | 每次入库重新计算成本单价 | P0 |
| 月末一次加权平均法 | 月末统一计算全月平均成本 | P0 |
| 标准成本法 | 预设标准成本，差异分析 | P1 |
| 产品成本卷积 | 按BOM自下而上卷积产品实际成本 | P0 |
| 成本差异分析 | 量差、价差、效率差异分析 | P1 |
| 产成品成本核算 | 材料成本 + 人工成本 + 制造费用分摊 | P0 |
| 成本计算批次 | 按月计算，支持重算 | P0 |

### 4.2 成本核算方法

#### 4.2.1 移动加权平均法

```
新单价 = (原库存金额 + 本次入库金额) / (原库存数量 + 本次入库数量)
出库成本 = 出库数量 × 当前移动平均单价
```

**适用场景**：实时成本要求高、物料价值高的企业

#### 4.2.2 月末一次加权平均法

```
全月平均单价 = (月初库存金额 + 本月入库金额) / (月初数量 + 本月入库数量)
本月出库成本 = 本月出库数量 × 全月平均单价
月末结存金额 = 月末结存数量 × 全月平均单价
```

**适用场景**：月末结账、物料品种多、价格波动大的企业

#### 4.2.3 标准成本法

```
标准成本 = 标准用量 × 标准价格
成本差异 = 实际成本 - 标准成本
  价格差异 = (实际价格 - 标准价格) × 实际用量
  数量差异 = (实际用量 - 标准用量) × 标准价格
```

**适用场景**：管理成熟、标准化程度高的企业

### 4.3 产品成本卷积

#### 4.3.1 成本构成

```
产品实际成本 = 直接材料成本 + 直接人工成本 + 制造费用

直接材料成本 = Σ(子件实际成本 × 用量 × (1 + 损耗率))
直接人工成本 = 各工序标准工时 × 实际工资率
制造费用 = 各工序机器工时 × 费用分配率
```

#### 4.3.2 卷积顺序

从最底层的原材料开始，逐级向上卷积：
1. **第N层**：原材料采购成本 → 材料成本
2. **第N-1层**：半成品 = 下层材料 + 人工 + 费用
3. ...
4. **第0层**：产成品 = 所有下层成本卷积总和

### 4.4 数据模型

```sql
-- 成本计算批次表
CREATE TABLE fin_cost_batch (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  batch_no VARCHAR(50) NOT NULL COMMENT '批次号',
  period VARCHAR(20) NOT NULL COMMENT '会计期间 2026-06',
  cost_method TINYINT NOT NULL DEFAULT 1 COMMENT '1:移动加权 2:月末加权 3:标准成本',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0:待计算 1:计算中 2:已完成 3:已结转',
  material_count INT DEFAULT 0,
  total_in_qty DECIMAL(18,4) DEFAULT 0,
  total_out_qty DECIMAL(18,4) DEFAULT 0,
  total_in_amount DECIMAL(18,2) DEFAULT 0,
  total_out_amount DECIMAL(18,2) DEFAULT 0,
  start_time DATETIME,
  end_time DATETIME,
  created_by VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_period (period)
);

-- 物料成本明细表
CREATE TABLE fin_cost_detail (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT NOT NULL,
  material_id BIGINT NOT NULL,
  material_code VARCHAR(50),
  material_name VARCHAR(200),
  warehouse_id BIGINT,
  begin_qty DECIMAL(18,4) DEFAULT 0 COMMENT '期初数量',
  begin_amount DECIMAL(18,2) DEFAULT 0 COMMENT '期初金额',
  begin_price DECIMAL(18,6) DEFAULT 0 COMMENT '期初单价',
  in_qty DECIMAL(18,4) DEFAULT 0 COMMENT '本期入库数量',
  in_amount DECIMAL(18,2) DEFAULT 0 COMMENT '本期入库金额',
  out_qty DECIMAL(18,4) DEFAULT 0 COMMENT '本期出库数量',
  out_amount DECIMAL(18,2) DEFAULT 0 COMMENT '本期出库金额',
  end_qty DECIMAL(18,4) DEFAULT 0 COMMENT '期末数量',
  end_amount DECIMAL(18,2) DEFAULT 0 COMMENT '期末金额',
  end_price DECIMAL(18,6) DEFAULT 0 COMMENT '期末单价',
  weighted_price DECIMAL(18,6) DEFAULT 0 COMMENT '加权平均单价',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_batch_material_wh (batch_id, material_id, warehouse_id)
);

-- 产品成本卷积表
CREATE TABLE fin_product_cost (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  product_code VARCHAR(50),
  product_name VARCHAR(200),
  work_order_id BIGINT COMMENT '关联工单',
  bom_version VARCHAR(20),
  total_cost DECIMAL(18,2) DEFAULT 0 COMMENT '总成本',
  unit_cost DECIMAL(18,6) DEFAULT 0 COMMENT '单位成本',
  material_cost DECIMAL(18,2) DEFAULT 0 COMMENT '直接材料成本',
  labor_cost DECIMAL(18,2) DEFAULT 0 COMMENT '直接人工成本',
  manufacturing_cost DECIMAL(18,2) DEFAULT 0 COMMENT '制造费用',
  output_qty DECIMAL(18,4) DEFAULT 0 COMMENT '产出数量',
  cost_level INT DEFAULT 0 COMMENT '成本卷积层级',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_batch_product (batch_id, product_id)
);

-- 标准成本表
CREATE TABLE fin_standard_cost (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  material_id BIGINT NOT NULL,
  material_code VARCHAR(50),
  material_name VARCHAR(200),
  standard_price DECIMAL(18,6) NOT NULL COMMENT '标准单价',
  effective_date DATE NOT NULL COMMENT '生效日期',
  version VARCHAR(20) NOT NULL DEFAULT 'V1.0',
  status TINYINT DEFAULT 1 COMMENT '0:禁用 1:启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_material_effective (material_id, effective_date)
);
```

### 4.5 API 设计

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 执行成本计算 | POST | `/api/finance/cost/calculate` | 触发月末成本计算 |
| 查询成本明细 | GET | `/api/finance/cost/details` | 查询物料成本明细 |
| 产品成本卷积 | POST | `/api/finance/cost/convolve` | 执行产品成本卷积 |
| 成本差异分析 | GET | `/api/finance/cost/variance` | 查询标准成本差异分析 |
| 成本批次列表 | GET | `/api/finance/cost/batches` | 查询历史计算批次 |

### 4.6 核心类设计

```typescript
// cost-engine.ts

class CostEngine {
  constructor(config: CostConfig) {}
  
  // 月末一次加权平均法计算
  async calculateWeightedAverage(period: string): Promise<CostCalculationResult> {}
  
  // 移动加权平均法（入库时调用）
  async calculateMovingAverage(
    materialId: number, 
    warehouseId: number,
    inQty: number, 
    inPrice: number
  ): Promise<CostUpdateResult> {}
  
  // 产品成本卷积
  async convolveProductCost(
    productId: number, 
    batchId: number
  ): Promise<ProductCostResult> {}
  
  // 标准成本差异分析
  async analyzeVariance(
    materialId: number,
    period: string
  ): Promise<VarianceAnalysisResult> {}
  
  // 获取发出存货成本
  async getIssueCost(
    materialId: number,
    warehouseId: number,
    qty: number,
    date?: Date
  ): Promise<number> {}
}
```

---

## 5. 模块三：财务总账

### 5.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 会计科目体系 | 资产/负债/权益/成本/损益 五大类科目 | P0 |
| 凭证管理 | 手工凭证、自动凭证、凭证审核、记账 | P0 |
| 明细账/总账 | 按科目查询明细账、余额表、总账 | P0 |
| 期末结账 | 损益结转、期末结账、反结账 | P1 |
| 资产负债表 | 自动生成资产负债表 | P1 |
| 利润表 | 自动生成利润表 | P1 |
| 现金流量表 | 自动生成现金流量表 | P2 |
| 辅助核算 | 按客户/供应商/部门/项目辅助核算 | P1 |

### 5.2 会计科目体系设计

#### 5.2.1 科目编码规则

```
4-2-2-2 结构，共10位
例：1001-01-01-01 = 银行存款-工商银行-基本户-人民币

一级科目（4位）：按国家统一会计制度
  1xxx 资产类
  2xxx 负债类
  3xxx 所有者权益类
  4xxx 成本类
  5xxx 损益类
```

#### 5.2.2 核心科目表（节选）

| 科目编码 | 科目名称 | 类别 | 余额方向 |
|----------|----------|------|----------|
| 1001 | 库存现金 | 资产 | 借 |
| 1002 | 银行存款 | 资产 | 借 |
| 1122 | 应收账款 | 资产 | 借 |
| 1221 | 其他应收款 | 资产 | 借 |
| 1403 | 原材料 | 资产 | 借 |
| 1405 | 库存商品 | 资产 | 借 |
| 1601 | 固定资产 | 资产 | 借 |
| 2202 | 应付账款 | 负债 | 贷 |
| 2211 | 应付职工薪酬 | 负债 | 贷 |
| 2221 | 应交税费 | 负债 | 贷 |
| 4001 | 实收资本 | 权益 | 贷 |
| 5001 | 生产成本 | 成本 | 借 |
| 5101 | 制造费用 | 成本 | 借 |
| 6001 | 主营业务收入 | 损益 | 贷 |
| 6401 | 主营业务成本 | 损益 | 借 |
| 6601 | 销售费用 | 损益 | 借 |
| 6602 | 管理费用 | 损益 | 借 |

### 5.3 凭证自动生成规则

| 业务场景 | 借方科目 | 贷方科目 | 触发点 |
|----------|----------|----------|--------|
| 销售发货 | 应收账款 | 主营业务收入 | 销售出库审核 |
|  | 主营业务成本 | 库存商品 |  |
| 采购入库 | 原材料 | 应付账款 | 采购入库审核 |
| 生产领料 | 生产成本-直接材料 | 原材料 | 生产领料审核 |
| 产成品入库 | 库存商品 | 生产成本 | 生产入库审核 |
| 费用报销 | 管理费用/销售费用 | 银行存款/现金 | 费用单审核 |
| 工资计提 | 生产成本/制造费用/管理费用 | 应付职工薪酬 | 月末计提 |
| 折旧计提 | 制造费用/管理费用 | 累计折旧 | 月末计提 |
| 税金计提 | 税金及附加 | 应交税费 | 月末计提 |
| 损益结转 | 损益类科目 | 本年利润 | 月末结转 |

### 5.4 数据模型

```sql
-- 会计科目表
CREATE TABLE fin_account (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_code VARCHAR(20) NOT NULL COMMENT '科目编码',
  account_name VARCHAR(100) NOT NULL COMMENT '科目名称',
  full_name VARCHAR(500) COMMENT '全路径名称',
  parent_id BIGINT COMMENT '上级科目ID',
  level INT NOT NULL DEFAULT 1 COMMENT '层级',
  account_type TINYINT NOT NULL COMMENT '1:资产 2:负债 3:权益 4:成本 5:损益',
  balance_direction TINYINT NOT NULL DEFAULT 1 COMMENT '1:借方 2:贷方',
  is_leaf TINYINT DEFAULT 1 COMMENT '是否末级',
  assist_types VARCHAR(200) COMMENT '辅助核算类型: customer,supplier,department,project',
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_code (account_code),
  INDEX idx_parent (parent_id)
);

-- 会计期间表
CREATE TABLE fin_period (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  period_code VARCHAR(20) NOT NULL COMMENT '期间编码 2026-06',
  fiscal_year INT NOT NULL,
  fiscal_period INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed TINYINT DEFAULT 0 COMMENT '是否结账',
  closed_at DATETIME,
  closed_by VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_period (period_code)
);

-- 会计凭证表
CREATE TABLE fin_voucher (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  voucher_no VARCHAR(50) NOT NULL COMMENT '凭证字号',
  period_code VARCHAR(20) NOT NULL COMMENT '会计期间',
  voucher_date DATE NOT NULL COMMENT '凭证日期',
  voucher_type TINYINT NOT NULL DEFAULT 1 COMMENT '1:收款 2:付款 3:转账 4:调整',
  source_type VARCHAR(50) COMMENT '来源类型: sales/purchase/warehouse/manual',
  source_id BIGINT COMMENT '来源单据ID',
  source_no VARCHAR(50) COMMENT '来源单据号',
  total_debit DECIMAL(18,2) DEFAULT 0 COMMENT '借方合计',
  total_credit DECIMAL(18,2) DEFAULT 0 COMMENT '贷方合计',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0:草稿 1:已提交 2:已审核 3:已记账 4:已作废',
  attachment_count INT DEFAULT 0,
  summary VARCHAR(500) COMMENT '摘要',
  created_by VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  audited_by VARCHAR(50),
  audited_at DATETIME,
  posted_by VARCHAR(50),
  posted_at DATETIME,
  INDEX idx_period (period_code),
  INDEX idx_source (source_type, source_id)
);

-- 凭证明细表
CREATE TABLE fin_voucher_line (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  voucher_id BIGINT NOT NULL,
  line_no INT NOT NULL COMMENT '行号',
  account_id BIGINT NOT NULL COMMENT '科目ID',
  account_code VARCHAR(20),
  account_name VARCHAR(100),
  summary VARCHAR(200) COMMENT '摘要',
  debit_amount DECIMAL(18,2) DEFAULT 0 COMMENT '借方金额',
  credit_amount DECIMAL(18,2) DEFAULT 0 COMMENT '贷方金额',
  -- 辅助核算
  customer_id BIGINT,
  supplier_id BIGINT,
  department_id BIGINT,
  project_id BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_voucher (voucher_id),
  INDEX idx_account (account_id)
);

-- 科目余额表
CREATE TABLE fin_account_balance (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  period_code VARCHAR(20) NOT NULL,
  account_id BIGINT NOT NULL,
  account_code VARCHAR(20),
  begin_debit DECIMAL(18,2) DEFAULT 0 COMMENT '期初借方',
  begin_credit DECIMAL(18,2) DEFAULT 0 COMMENT '期初贷方',
  current_debit DECIMAL(18,2) DEFAULT 0 COMMENT '本期借方发生',
  current_credit DECIMAL(18,2) DEFAULT 0 COMMENT '本期贷方发生',
  year_debit DECIMAL(18,2) DEFAULT 0 COMMENT '本年借方累计',
  year_credit DECIMAL(18,2) DEFAULT 0 COMMENT '本年贷方累计',
  end_debit DECIMAL(18,2) DEFAULT 0 COMMENT '期末借方',
  end_credit DECIMAL(18,2) DEFAULT 0 COMMENT '期末贷方',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_period_account (period_code, account_id)
);
```

### 5.5 API 设计

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 科目树查询 | GET | `/api/finance/accounts/tree` | 查询会计科目树 |
| 新增科目 | POST | `/api/finance/accounts` | 新增会计科目 |
| 凭证查询 | GET | `/api/finance/vouchers` | 分页查询凭证列表 |
| 新增凭证 | POST | `/api/finance/vouchers` | 手工录入凭证 |
| 凭证审核 | POST | `/api/finance/vouchers/:id/audit` | 审核凭证 |
| 凭证记账 | POST | `/api/finance/vouchers/:id/post` | 凭证记账 |
| 明细账查询 | GET | `/api/finance/ledger/detail` | 科目明细账 |
| 余额表查询 | GET | `/api/finance/ledger/balance` | 科目余额表 |
| 期末结账 | POST | `/api/finance/period/close` | 期末结账 |
| 资产负债表 | GET | `/api/finance/reports/balance-sheet` | 生成资产负债表 |
| 利润表 | GET | `/api/finance/reports/income-statement` | 生成利润表 |

### 5.6 核心类设计

```typescript
// general-ledger.ts

class GeneralLedger {
  // 自动生成凭证
  async generateVoucher(params: VoucherGenerateParams): Promise<VoucherResult> {}
  
  // 凭证审核
  async auditVoucher(voucherId: number, auditor: string): Promise<boolean> {}
  
  // 凭证记账（更新科目余额）
  async postVoucher(voucherId: number, poster: string): Promise<boolean> {}
  
  // 计算科目余额
  async calculateBalance(periodCode: string): Promise<BalanceResult[]> {}
  
  // 期末结账
  async closePeriod(periodCode: string): Promise<CloseResult> {}
  
  // 损益结转
  async carryForwardProfit(periodCode: string): Promise<VoucherResult> {}
  
  // 生成资产负债表
  async generateBalanceSheet(periodCode: string): Promise<BalanceSheetResult> {}
  
  // 生成利润表
  async generateIncomeStatement(periodCode: string): Promise<IncomeStatementResult> {}
}
```

---

## 6. 模块四：销售管理深化

### 6.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 价格策略 | 客户等级价、批量折扣、促销价 | P1 |
| 信用管控 | 信用额度检查、信用期限控制 | P1 |
| 交期承诺（ATP） | 可用库存 + 预计入库 = 可承诺量 | P1 |
| 销售预测 | 历史数据预测未来需求 | P2 |

### 6.2 价格策略模型

```
价格优先级：促销价 > 客户特殊价 > 客户等级价 > 批量折扣价 > 标准售价
```

---

## 7. 模块五：采购管理深化

### 7.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 供应商配额 | 多供应商按比例分配采购量 | P1 |
| 采购价格管理 | 价格历史、比价分析 | P1 |
| 交期预警 | 提前预警即将延期的采购订单 | P1 |

---

## 8. 全链路业务闭环

### 8.1 端到端流程

```
销售订单
    ↓
MRP运算 → 计划订单
    ├→ 生产工单 → 生产领料 → 生产入库 → 成本卷积
    └→ 采购申请 → 采购订单 → 采购入库 → 应付单
    ↓
销售发货 → 应收单
    ↓
成本核算（月末）
    ↓
财务凭证自动生成
    ↓
财务报表
```

### 8.2 事件驱动架构

使用领域事件 + 事务性 Outbox 模式实现模块间解耦：

| 领域事件 | 发布方 | 订阅方 | 动作 |
|----------|--------|--------|------|
| SalesOrderCreated | 销售 | MRP | 触发MRP重算 |
| PurchaseReceiptCreated | 仓库 | 成本 | 更新移动平均成本 |
| WorkOrderCompleted | 生产 | 成本 | 计算产品成本 |
| FinTransactionPosted | 财务 | 总账 | 生成会计凭证 |

---

## 9. 技术实现计划

### 9.1 开发阶段

| 阶段 | 内容 | 预估工时 |
|------|------|----------|
| 第一阶段 | 数据模型 + 基础API骨架 | 3天 |
| 第二阶段 | MRP引擎深化 | 5天 |
| 第三阶段 | 成本核算引擎 | 5天 |
| 第四阶段 | 财务总账核心 | 7天 |
| 第五阶段 | 业务联动 + 自动凭证 | 5天 |
| 第六阶段 | 测试 + 优化 | 3天 |
| **合计** | | **28天** |

### 9.2 测试策略

- **单元测试**：核心算法（MRP计算、成本计算、凭证平衡）≥ 80% 覆盖率
- **集成测试**：端到端业务流程测试
- **数据验证**：MRP结果准确性、成本计算准确性、报表数据准确性

---

## 10. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 历史数据不准确 | MRP结果偏差大 | 先做数据清洗，分模块逐步上线 |
| 成本计算复杂度高 | 计算性能问题 | 增量计算、批量优化、索引优化 |
| 凭证规则复杂 | 自动凭证出错 | 规则引擎 + 人工审核机制 |
| 期初数据导入难 | 系统切换成本高 | 制定详细的期初数据方案 |

---

**文档结束**
