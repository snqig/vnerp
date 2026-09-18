# 入库分切与状态流转调试报告

> 📌 历史快照（生成于 2026-07-08），内容反映当时状态，未随代码更新。仅作归档参考。

> 生成时间：2026-07-08
> 覆盖模块：`useInboundData.ts`、`useCutting.ts`
> 基础设施：`src/lib/logger.ts`（已修复空方法问题）

---

## 1. 日志基础设施修复

### 问题描述

`src/lib/logger.ts` 中 `info`、`warn`、`error`、`debug` 四个方法的方法体为空，`formatMessage` 方法虽存在但从未被调用，导致所有日志调用均为空操作。

### 修复内容

```ts
// 修复前（空方法体）
info(context: LogContext, message: string, data?: unknown) {
}

// 修复后（调用 formatMessage + console 输出）
info(context: LogContext, message: string, data?: unknown) {
  console.info(this.formatMessage('info', context, message, data));
}
```

四个级别方法均已修复，日志格式为：

```
[时间戳] [级别] [模块:操作] [user:用户ID] [trace:追踪ID] 消息
  数据: { JSON }
```

---

## 2. useInboundData 日志节点

### 2.1 数据拉取流程

| 节点 | 级别 | 日志内容 | 触发条件 |
|------|------|----------|----------|
| `fetchInboundRecords` 开始 | stepStart | `▶ 开始: fetchInboundRecords` + 搜索参数 | 每次 API 调用前 |
| API 响应 | info | `API响应` + HTTP status/ok | fetch 返回后 |
| 数据形状分支 | branch | `⑂ 分支[dataShape]: 条件="result.data.list" → ✓/✗` | 判断返回数据是 `{list:[]}` 还是裸数组 |
| 列表获取成功 | info | `入库单列表获取成功` + count | success=true |
| API 返回失败 | warn | `API返回失败` + message/code | success=false |
| 网络异常 | error | `获取入库单列表失败` + error message + stack | catch 块 |
| `handleRefresh` 开始/结束 | stepStart/stepEnd | `▶ 开始: handleRefresh` / `✔ 完成: handleRefresh` | 刷新操作 |
| 组件挂载 | info | `组件挂载，开始并行拉取初始数据` | useEffect 触发 |

### 2.2 辅助数据拉取

| 函数 | 成功日志 | 失败日志 |
|------|----------|----------|
| `fetchWarehouses` | `仓库列表获取成功` + count | warn: API返回失败 / error: 获取失败 |
| `fetchWarehouseCategories` | `仓库分类获取成功` + count | warn: API返回失败 / error: 获取失败 |
| `fetchSuppliers` | `供应商列表获取成功` + count | warn: API返回失败 / error: 获取失败 |
| `fetchLabels` | `标签列表获取成功` + count | warn: API返回失败 / error: 获取失败 |

### 2.3 排查路径

**问题：入库单列表不显示**

1. 检查 `[Warehouse:fetchInboundRecords]` 是否有 `▶ 开始` 日志 → 确认请求是否发出
2. 检查 `API响应` 的 `status` 和 `ok` → 确认 HTTP 层是否正常
3. 检查 `branch[dataShape]` → 确认返回数据结构是否匹配
4. 检查 `入库单列表获取成功` 的 `count` → 确认是否有数据
5. 若有 `API返回失败` warn → 查看 `message` 确认后端错误信息

**问题：刷新后数据未更新**

1. 确认 `▶ 开始: handleRefresh` 出现
2. 确认 `isLoading` 状态正确切换
3. 确认 `✔ 完成: handleRefresh` 出现 → 若未出现，检查中间是否有异常

---

## 3. useCutting 日志节点

### 3.1 校验分支

| 分支 | 条件 | 命中时日志 | 未命中时日志 |
|------|------|------------|--------------|
| 标签选择 | `currentLabel != null` | `⑂ 分支[validate]: ✓ 命中` + 物料/规格信息 | `⑂ 分支[validate]: ✗ 未命中` |
| 可分切物料 | `isCuttableMaterial` | `⑂ 分支[validate]: ✓ 命中` | `⑂ 分支[validate]: ✗ 未命中` + 物料名称 |
| 宽度非空 | `cutWidths not empty` | `⑂ 分支[validate]: ✓ 命中` + 宽度值 | `⑂ 分支[validate]: ✗ 未命中` |

### 3.2 宽度解析与规格校验

| 节点 | 级别 | 日志内容 | 说明 |
|------|------|----------|------|
| 宽度解析 | info | `分切宽度解析` + widths数组 + hasInvalid标志 | 例如 `["50","50"]` → `[50, 50]` |
| 无效宽度 | warn | `存在无效宽度值，将跳过规格校验` + widths | NaN 或 ≤0 的值 |
| 规格宽度解析 | info | `规格宽度解析` + spec字符串 + specWidth数值 | 例如 `"120×1000mm"` → `120` |
| 总量校验 | branch | `⑂ 分支[specCheck]: totalCutWidth <= specWidth → ✓/✗` | 超出时阻断 |
| 无法解析规格 | warn | `未能解析规格宽度，跳过总量校验` + spec | spec 为空或格式不匹配 |

### 3.3 API 请求与响应

| 节点 | 级别 | 日志内容 |
|------|------|----------|
| 发送请求 | info | `发送分切请求` + URL/sourceLabelId/sourceLabelNo/cutWidthStr/materialName/originalWidth |
| API 响应 | info | `分切API响应` + status/ok |
| 流程完成 | stepEnd | `✔ 完成: handleCutting` + success/newLabelCount/newLabels详情 |
| API 失败 | error | `分切API返回失败` + message/code |
| 网络异常 | error | `分切过程异常` + error message + stack |

### 3.4 后处理流程

| 节点 | 级别 | 日志内容 |
|------|------|----------|
| 刷新入库单 | info | `开始刷新入库单列表` → `入库单列表刷新完成` |
| 标签映射开始 | info | `开始映射分切结果到打印标签` + count |
| 标签映射完成 | info | `分切结果映射完成` + mappedCount + 每个标签摘要(id/labelNo/isRemainder/cutWidth/quantity) |
| 打开结果对话框 | info | `已打开分切结果对话框` |
| 无新标签 | warn | `API返回成功但无新标签数据` + data |

### 3.5 排查路径

**问题：分切操作失败**

1. 检查 `▶ 开始: handleCutting` 的参数 → 确认 `labelId`/`labelNo`/`cutWidths` 是否正确
2. 检查三个 `branch[validate]` → 确认哪个校验未通过
3. 若校验通过，检查 `分切宽度解析` 和 `规格宽度解析` → 确认数值正确
4. 检查 `branch[specCheck]` → 确认总量是否超限
5. 检查 `发送分切请求` → 确认请求体参数
6. 检查 `分切API响应` 的 status → 确认 HTTP 层
7. 若 success=false，检查 `分切API返回失败` 的 message
8. 若网络异常，检查 `分切过程异常` 的 error + stack

**问题：分切成功但结果标签不显示**

1. 确认 `✔ 完成: handleCutting` 出现且 `newLabelCount > 0`
2. 确认 `开始映射分切结果到打印标签` 出现
3. 检查 `分切结果映射完成` 的 `mappedCount` 和标签列表
4. 确认 `已打开分切结果对话框` 出现
5. 若 `API返回成功但无新标签数据` warn 出现 → 后端返回空数组

**问题：分切后入库列表未刷新**

1. 确认 `开始刷新入库单列表` 出现
2. 确认 `入库单列表刷新完成` 出现 → 若未出现，fetchInboundRecords 可能卡住
3. 检查 `fetchInboundRecords` 自身的日志（见 2.1）

---

## 4. 日志输出示例

### 正常分切流程日志序列

```
[INFO] [Warehouse:handleCutting] ▶ 开始: handleCutting
  数据: { "labelId": "1-0", "labelNo": "PO-001-1", "cutWidths": "50+50", "operatorId": "1" }
[INFO] [Warehouse:handleCutting] ⑂ 分支[validate]: 条件="currentLabel != null" → ✓ 命中
  数据: { "materialName": "PET薄膜", "specification": "120×1000mm" }
[INFO] [Warehouse:handleCutting] ⑂ 分支[validate]: 条件="isCuttableMaterial" → ✓ 命中
[INFO] [Warehouse:handleCutting] ⑂ 分支[validate]: 条件="cutWidths not empty" → ✓ 命中
  数据: { "cutWidths": "50+50" }
[INFO] [Warehouse:handleCutting] 分切宽度解析
  数据: { "widths": [50, 50], "hasInvalid": false }
[INFO] [Warehouse:handleCutting] 规格宽度解析
  数据: { "spec": "120×1000mm", "specWidth": 120 }
[INFO] [Warehouse:handleCutting] ⑂ 分支[specCheck]: 条件="totalCutWidth <= specWidth" → ✓ 命中
  数据: { "totalCutWidth": 100, "specWidth": 120 }
[INFO] [Warehouse:handleCutting] 发送分切请求
  数据: { "url": "/api/warehouse/inbound/cutting", "sourceLabelId": 1, "sourceLabelNo": "PO-001-1", "cutWidthStr": "50+50", "materialName": "PET薄膜", "originalWidth": 120 }
[INFO] [Warehouse:handleCutting] 分切API响应
  数据: { "status": 200, "ok": true }
[INFO] [Warehouse:handleCutting] ✔ 完成: handleCutting
  数据: { "success": true, "newLabelCount": 3, "newLabels": [...] }
[INFO] [Warehouse:handleCutting] 开始刷新入库单列表
[INFO] [Warehouse:fetchInboundRecords] ▶ 开始: fetchInboundRecords
  数据: { "searchQuery": "", "statusFilter": "all" }
[INFO] [Warehouse:fetchInboundRecords] API响应
  数据: { "status": 200, "ok": true }
[INFO] [Warehouse:fetchInboundRecords] 入库单列表获取成功
  数据: { "count": 5 }
[INFO] [Warehouse:handleCutting] 入库单列表刷新完成
[INFO] [Warehouse:handleCutting] 开始映射分切结果到打印标签
  数据: { "count": 3 }
[INFO] [Warehouse:handleCutting] 分切结果映射完成
  数据: { "mappedCount": 3, "labels": [{"id":10,"labelNo":"PO-001-C1","isRemainder":false,"cutWidth":50,"quantity":50}, ...] }
[INFO] [Warehouse:handleCutting] 已打开分切结果对话框
```

### 校验失败日志序列（物料不可分切）

```
[INFO] [Warehouse:handleCutting] ▶ 开始: handleCutting
  数据: { "labelId": "2-0", "labelNo": "PO-002-1", "cutWidths": "30", "operatorId": "1" }
[INFO] [Warehouse:handleCutting] ⑂ 分支[validate]: 条件="currentLabel != null" → ✓ 命中
  数据: { "materialName": "木材", "specification": "100×50mm" }
[INFO] [Warehouse:handleCutting] ⑂ 分支[validate]: 条件="isCuttableMaterial" → ✗ 未命中
  数据: { "materialName": "木材" }
```
