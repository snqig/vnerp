# 数据真实性审计系统 — 规格说明书

## 概述

基于系统设置规则（`sys_config`）与种子基准数据，对全部业务模块进行数据真实性审核，通过 MCP 工具触发扫描，批量问题提交 `jev-style-qwen3.5-2b-decision` 统一决策。

---

## 一、审核范围

覆盖四个模块，每个模块按「规则校验」+「基线对比」双基准执行：

| 模块 | 规则校验要点 | 基线数据源 |
|------|------------|-----------|
| 仓库 | 库存数量≥0、仓库容量未超限、物料-仓库关联完整 | `database/seeds/vnerp-seed-data.sql` |
| 生产 | 工单报工率≤100%、状态流转合法、BOM消耗与报工匹配 | `seed_business_data/*.sql` |
| 销售 | 订单状态合法、交期未逾期标记、客户信息完整 | `vnerp-seed-data.sql` |
| 采购 | 供应商资质检查、采购单-入库关联完整、价格合理性 | `seed_part1-5/*.sql` |

---

## 二、MCP 工具设计

### 工具 1：`audit_data_authenticity`

**参数：**
- `modules`: 字符串数组，指定审核模块（默认全部）
- `strict_mode`: 布尔值，是否启用严格模式（严格模式下基线偏差也视为问题）

**返回结构：**
```json
{
  "total_issues": 12,
  "severity_summary": { "critical": 2, "warning": 5, "info": 5 },
  "issues": [
    {
      "id": "ISS-001",
      "module": "warehouse",
      "severity": "critical",
      "type": "baseline_mismatch",
      "table": "inventory",
      "record_id": 3,
      "field": "quantity",
      "actual_value": -5,
      "expected_value": 100,
      "rule_key": "inventory_qty_non_negative",
      "description": "库存数量不能为负数，记录ID=3当前数量为-5"
    }
  ]
}
```

### 工具 2：`batch_decision_on_issues`

**参数：**
- `issues`: 问题数组（来自 audit 结果）
- `context`: 附加上下文（如当前日期、批次号）

**返回结构：**
```json
{
  "decisions": [
    {
      "issue_id": "ISS-001",
      "verdict": "fix_immediately",
      "reasoning": "负库存违反仓库基础规则，可能导致后续报工异常",
      "suggested_action": "查找对应出入库单据，补充实际入库记录",
      "priority": 1
    }
  ],
  "summary": "共12个问题，建议立即修复2个，本周处理5个"
}
```

---

## 三、审核规则来源

### 规则组 A：sys_config 系统配置
从 `src/lib/system-config-seed.ts` 提取的 ~127 条配置项转化为校验规则：

| config_key | 规则转化 |
|-----------|---------|
| `WH_CAPACITY_CHECK_ENABLED` | 仓库容量超过阈值时标记 warning |
| `INVENTORY_ALLOW_NEGATIVE` | 库存允许负数开关，关闭时负数为 critical |
| `WORK_ORDER_REQUIRED_FIELDS` | 工单必填字段完整性检查 |
| `ORDER_STATUS_TRANSITION_RULE` | 订单状态流转合法性校验 |
| `SUPPLIER_QUALIFICATION_REQUIRED` | 供应商资质必填检查 |

### 规则组 B：Seed 基线数据
- `database/seeds/vnerp-seed-data.sql`：客户/供应商/物料/仓库/标准卡片的初始值
- `database/seeds/seed_business_data/`：业务单据的初始状态
- 比对逻辑：若当前数据偏离 seed 期望值且无变更记录，标记为 baseline_mismatch

---

## 四、MCP 服务器改动

### 文件：`mcp-decision-server/src/index.ts`

新增两个工具注册：

```typescript
// 1. audit_data_authenticity
server.registerTool(
  'audit_data_authenticity',
  {
    description: '审核指定模块的数据真实性，结合系统规则与seed基线数据',
    inputSchema: {
      modules: z.array(z.string()),
      strict_mode: z.boolean().optional(),
    },
  },
  async (params) => {
    const issues = await runAudit(params.modules, params.strict_mode);
    return { content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }] };
  }
);

// 2. batch_decision_on_issues
server.registerTool(
  'batch_decision_on_issues',
  {
    description: '对批量审核问题进行LLM统一决策，返回优先级排序和处理建议',
    inputSchema: {
      issues: z.array(z.any()),
      context: z.record(z.any()).optional(),
    },
  },
  async (params) => {
    const decisions = await makeBatchDecision(params.issues, params.context);
    return { content: [{ type: 'text', text: JSON.stringify(decisions, null, 2) }] };
  }
);
```

### 新增文件：`mcp-decision-server/src/auditor.ts`

核心审计逻辑：

```typescript
// 从数据库读取 sys_config + seed 数据
// 逐模块执行规则校验和基线对比
// 返回结构化问题列表
export async function runAudit(modules: string[], strictMode?: boolean): Promise<AuditResult>
```

---

## 五、执行流程

```
用户提问 → MCP server 接收请求
    ↓
调用 audit_data_authenticity → 扫描数据库 + 比对规则/基线
    ↓
返回问题列表 → 用户确认后调用 batch_decision_on_issues
    ↓
LLM 统一决策 → 返回优先级排序的处理建议
    ↓
展示结果给用户
```

---

## 六、实施计划

1. **Phase 1**：在 `auditor.ts` 实现基础审计逻辑（读取 sys_config、对比 seed 数据）
2. **Phase 2**：注册两个新 MCP 工具
3. **Phase 3**：测试端到端流程（扫描 → 决策）
4. **Phase 4**：验证四类模块各至少一条问题能被正确识别
