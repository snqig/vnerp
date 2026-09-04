# API 接口文档

> 印刷生产经营信息管理系统 Print MIS（vnerp）API 接口文档。
> 基于 Next.js 16 App Router，所有路由位于 `src/app/api/`。
> 路由文件总数约 280 个，HTTP 方法导出总数约 356 个（部分路由含多方法）。

## 1. 概述

| 项目 | 值 |
|---|---|
| 基础地址（开发） | `http://localhost:5000` |
| 路由目录 | `src/app/api/` |
| 认证方式 | JWT（access_token HttpOnly cookie）+ withPermission 装饰器 |
| 权限模型 | RBAC，admin 角色跳过所有权限检查 |
| 响应格式 | 统一 JSON（`ApiResponse<T>`） |
| CSRF 保护 | 写操作需携带 CSRF token |
| 中间件 | `src/proxy.ts`（i18n + cookie 存在性校验 + CSRF） |
| 文档维护 | `scripts/generate-api-docs.js`（自动扫描路由文件，但仅识别 `export async function` 模式，无法识别 `export const GET = withPermission(...)` 模式，故生成结果不完整；本文档为人工核实后手写，以本文档为准） |

## 2. 认证与授权

### 2.1 认证流程

1. 客户端调用 `POST /api/auth/login`，成功后服务端通过 `Set-Cookie` 写入 `access_token`（HttpOnly）和 `refresh_token`（HttpOnly），并返回 CSRF token。
2. 后续请求由浏览器自动携带 cookie。中间件 `src/proxy.ts` 校验 `access_token` cookie 存在性（Edge runtime 不解析 JWT），JWT 实际有效性由 API 路由内 `verifyToken` 校验。
3. access_token 过期时，客户端调用 `POST /api/auth/refresh`（携带 refresh_token cookie）静默刷新。
4. Token 撤销基于 Redis 黑名单（`token-blacklist.ts`），修改密码或账号锁定后旧 token 立即失效。

### 2.2 withPermission 装饰器

绝大多数业务路由使用 `withPermission` 装饰器（`src/lib/api-permissions.ts`）：

```typescript
export const GET = withPermission(async (request, userInfo) => {
  // 业务逻辑
  return successResponse(data);
});
```

`withPermission` 执行流程：
1. 提取并验证 JWT token（`extractToken` + `verifyToken`）
2. 检查 token 黑名单 + 用户级 token 撤销
3. 获取用户完整信息（`getUserInfo`）
4. 首次登录强制改密拦截（白名单路由除外）
5. 根据请求路径 + HTTP 方法自动查找所需权限（`getRequiredPermission`，最长前缀匹配 `ROUTE_PERMISSIONS`）
6. 检查用户是否拥有该权限或 admin 角色
7. 执行业务处理器
8. 可选记录操作日志

### 2.3 公开路由（无需认证）

以下路由无需 access_token 即可访问（`PUBLIC_ROUTES`）：

| 路径前缀 | 说明 |
|---|---|
| `/api/auth/login` | 用户登录 |
| `/api/auth/register` | 用户注册 |
| `/api/auth/reset-lock` | 重置账号锁定 |
| `/api/linkage/` | 联动校验（前端表单实时校验） |
| `/api/document-number` | 单号生成 |

### 2.4 权限标识格式

权限标识采用 `模块:操作` 格式，例如 `warehouse:view`、`order:create`。完整权限常量定义见 `src/lib/api-permissions.ts` 的 `API_PERMISSIONS` 对象。路由与权限的映射见 `ROUTE_PERMISSIONS`（最长前缀匹配）。

## 3. 统一响应格式

所有 API 返回统一 JSON 结构（`src/lib/api-response.ts`）：

```typescript
interface ApiResponse<T = unknown> {
  code: number;       // 业务状态码（200 成功，401/403/404/409/422/500 错误）
  success: boolean;   // 是否成功
  message: string;    // 提示消息
  data: T | null;     // 业务数据
}
```

分页响应额外包含 `pagination` 字段：

```typescript
interface PaginatedResponse<T> extends ApiResponse<{ list: T[]; total: number; page: number; pageSize: number }> {
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
```

### 3.1 常用响应函数

| 函数 | 用途 |
|---|---|
| `successResponse(data, message?, code?)` | 成功响应（200） |
| `paginatedResponse(data, pagination, message?)` | 分页响应 |
| `errorResponse(message, code?, statusCode?)` | 错误响应 |
| `commonErrors.unauthorized(message?)` | 401 未授权 |
| `commonErrors.forbidden(message?)` | 403 无权限 |
| `commonErrors.notFound(message?)` | 404 资源不存在 |
| `commonErrors.badRequest(message?)` | 400 参数错误 |
| `commonErrors.conflict(message?)` | 409 资源冲突 |
| `commonErrors.validationError(message?)` | 422 验证失败 |
| `commonErrors.serverError(message?)` | 500 服务器错误 |

### 3.2 常见错误码

| HTTP 状态码 | 业务码 | 含义 |
|---|---|---|
| 200 | 200 | 成功 |
| 400 | 400 | 请求参数错误 |
| 401 | 401 | 未授权 / token 无效或过期 |
| 403 | 403 | 无权限 / 首次登录需改密 |
| 404 | 404 | 资源不存在 |
| 409 | 409 | 资源冲突 |
| 422 | 422 | 数据验证失败 |
| 500 | 500 | 服务器内部错误 |

## 4. CSRF 保护

写操作（POST/PUT/DELETE/PATCH）需通过 CSRF 校验（`src/lib/csrf.ts`）：
- 登录成功后服务端返回 CSRF token，前端存储于 sessionStorage
- 写操作请求头需携带 `X-CSRF-Token`
- 中间件 `src/proxy.ts` 对 `requiresCsrfValidation` 的请求校验 CSRF token，失败返回 403

## 5. 按域分组的端点清单

> 动态路径参数用 `[id]` 表示。权限列标注该路由所需的最小权限标识；标注"公开"表示无需认证；标注"登录即可"表示仅需有效 token 无需特定权限；标注"admin"表示仅 admin 角色可访问（实际由 withPermission 自动放行 admin）。

### 5.1 认证模块（auth）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/auth/login` | POST | 用户登录，返回 token + CSRF | 公开 |
| `/api/auth/register` | POST | 用户注册 | 公开 |
| `/api/auth/logout` | POST | 登出，撤销 token | 登录即可 |
| `/api/auth/refresh` | POST | 刷新 access_token | 登录即可 |
| `/api/auth/me` | GET | 获取当前用户信息 | 登录即可 |
| `/api/auth/menus` | GET | 获取当前用户菜单树 | 登录即可 |
| `/api/auth/change-password` | PUT | 修改密码 | 登录即可 |
| `/api/auth/reset-lock` | POST | 重置账号锁定状态 | 公开 |
| `/api/auth/cache/clear` | POST | 清除认证缓存 | system:config |

### 5.2 健康检查（health）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/health` | GET | 应用健康检查 | 公开 |
| `/api/system/health/infrastructure` | GET | 基础设施健康检查（database/redis/outbox/streamConsumer） | 登录即可 |

### 5.3 仪表盘（dashboard）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/dashboard` | GET | 综合仪表盘数据 | dashboard:view |
| `/api/dashboard/kpi` | GET | KPI 指标 | dashboard:view |
| `/api/dashboard/ceo` | GET | CEO 视图 | dashboard:view |
| `/api/dashboard/finance` | GET | 财务视图 | dashboard:view |
| `/api/dashboard/production` | GET | 生产视图 | dashboard:view |
| `/api/dashboard/quality` | GET | 质量视图 | dashboard:view |
| `/api/dashboard/sales` | GET | 销售视图 | dashboard:view |
| `/api/dashboard/warehouse` | GET | 仓库视图 | dashboard:view |

### 5.4 销售模块（sales）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/sales/orders` | GET/POST/PUT/DELETE | 销售订单 CRUD | order:view / order:create / order:update / order:delete |
| `/api/sales/return` | GET/POST/PUT/DELETE | 销售退货 CRUD | order:view / order:create / order:update / order:delete |
| `/api/sales/reconciliation` | GET/POST | 销售对账 | order:view / order:create |
| `/api/sales/delivery` | GET/POST/PUT | 发货单 CRUD | delivery:view / delivery:create / delivery:update |
| `/api/sales/delivery/[id]/ship` | POST | 发货确认 | delivery:create |
| `/api/sales/delivery/partial` | POST | 部分发货 | delivery:create |
| `/api/sales/delivery/re-ship` | POST | 重新发货 | delivery:create |
| `/api/sales/convert-wo` | POST | 销售订单转工单 | workorder:create |

### 5.5 采购模块（purchase）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/purchase/orders` | GET/POST/PUT/DELETE | 采购订单 CRUD | purchase:view / purchase:create |
| `/api/purchase/request` | GET/POST/PUT/DELETE | 采购申请 CRUD | purchase:view / purchase:create |
| `/api/purchase/return` | GET/POST/PUT/DELETE | 采购退货 CRUD | purchase:view / purchase:create / purchase:approve |
| `/api/purchase/reconciliation` | GET/POST/PUT/DELETE | 采购对账 CRUD | purchase:view / purchase:create / finance:approve |
| `/api/purchase/suppliers` | GET/POST/PUT/DELETE | 供应商 CRUD | supplier:view / supplier:create / supplier:update / supplier:delete |
| `/api/purchase/convert-po` | POST | 采购申请转采购订单 | purchase:create |

### 5.6 仓储模块（warehouse）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/warehouse` | GET/POST/PUT/DELETE | 仓库 CRUD | warehouse:view / warehouse:create / warehouse:update / warehouse:delete |
| `/api/warehouse/inbound` | GET/POST/PUT | 入库单 CRUD | inventory:view / inbound:create / inbound:approve |
| `/api/warehouse/inbound/scan` | POST | 扫码入库 | inbound:create |
| `/api/warehouse/inbound/labels` | GET | 入库标签 | inventory:view |
| `/api/warehouse/inbound/cutting` | POST | 切料入库 | inbound:create |
| `/api/warehouse/inbound/from-po` | POST | 采购入库 | inbound:create |
| `/api/warehouse/inbound/with-po` | POST | 关联采购订单入库 | inbound:create |
| `/api/warehouse/inbound/audit` | POST | 入库审核 | inbound:approve |
| `/api/warehouse/outbound` | GET/POST/PUT/DELETE | 出库单 CRUD | inventory:view / outbound:create |
| `/api/warehouse/outbound/fifo` | GET/POST/PATCH | FIFO 出库推荐与确认 | inventory:view / outbound:create / outbound:confirm |
| `/api/warehouse/outbound/confirm` | POST/PUT | 出库确认 / 取消 | outbound:confirm / outbound:cancel |
| `/api/warehouse/transfer` | GET/POST/PUT | 调拨单 CRUD | warehouse:transfer |
| `/api/warehouse/transfer/[id]/items` | GET | 调拨明细 | warehouse:transfer |
| `/api/warehouse/transfer/[id]/outbound` | POST | 调拨出库 | warehouse:transfer |
| `/api/warehouse/transfer/[id]/inbound` | POST | 调拨入库 | warehouse:transfer |
| `/api/warehouse/stocktaking` | GET/POST/PUT | 盘点单 CRUD | warehouse:stocktake |
| `/api/warehouse/stocktaking/[id]/items` | GET | 盘点明细 | warehouse:stocktake |
| `/api/warehouse/stocktaking/[id]/scan` | POST | 扫码盘点 | warehouse:stocktake |
| `/api/warehouse/stocktaking/[id]/split-summary` | GET | 拆分汇总 | warehouse:stocktake |
| `/api/warehouse/stocktaking/diff-process` | POST | 差异处理 | warehouse:stocktake |
| `/api/warehouse/inventory` | GET | 库存查询 | inventory:view |
| `/api/warehouse/inventory/export` | GET | 库存导出 | inventory:view |
| `/api/warehouse/inventory/warning` | GET | 库存预警 | inventory:view |
| `/api/warehouse/inventory/logs` | GET | 库存流水 | inventory:view |
| `/api/warehouse/inventory/adjust` | POST/PUT | 库存调整 | inventory:view |
| `/api/warehouse/stock-adjust` | GET/POST | 库存调整记录 | inventory:view / warehouse:stock-adjust |
| `/api/warehouse/batch` | GET/POST/PUT | 批次管理 | warehouse:batch |
| `/api/warehouse/batch/trace` | GET | 批次追溯 | warehouse:batch |
| `/api/warehouse/batch-inventory` | GET | 批次库存查询 | warehouse:batch |
| `/api/warehouse/freeze` | GET/POST/PUT | 库存冻结 | inventory:view / warehouse:stock-adjust |
| `/api/warehouse/cost` | GET/POST | 库存成本 | inventory:view |
| `/api/warehouse/fifo-recommend` | GET | FIFO 推荐 | inventory:view |
| `/api/warehouse/sales-outbound` | POST | 销售出库 | outbound:create |
| `/api/warehouse/production-inbound` | POST | 生产入库 | inbound:create |
| `/api/warehouse/ink-opening` | POST | 油墨开罐 | warehouse:ink |
| `/api/warehouse/ink-mixing` | POST | 油墨调配 | warehouse:ink |
| `/api/warehouse/unit-conversion` | GET/POST/PUT/DELETE | 单位换算 CRUD | warehouse:view / warehouse:update / warehouse:delete |
| `/api/warehouse/categories` | GET/POST | 仓库分类 | warehouse:category |
| `/api/warehouse/alert-push` | GET/POST/PUT | 预警推送 | inventory:view |

### 5.7 库存与物料（inventory / materials）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/inventory` | GET/POST | 库存查询/操作 | inventory:view / outbound:create |
| `/api/inventory/materials` | GET | 库存物料查询 | material:view |
| `/api/materials` | GET/POST/PUT | 物料 CRUD | material:view / material:create / material:update |
| `/api/material-requisitions` | GET/POST | 领料单 | material:requisition |
| `/api/material-requisitions/[id]/issue` | POST | 领料发料 | material:requisition |
| `/api/material-returns` | GET/POST | 退料单 | material:return |
| `/api/material-labels` | GET/POST | 物料标签 | material:label |
| `/api/material-lifecycle` | GET | 物料生命周期 | material:view |
| `/api/base-data/material-category` | GET/POST | 物料分类 | material:view / material:create |

### 5.8 生产模块（production / workorders）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/production/work-orders` | GET/POST/PUT/DELETE | 生产工单 CRUD | workorder:view / workorder:create / workorder:update / workorder:delete |
| `/api/production/work-order/create-multi-color` | POST | 多色工单创建 | workorder:create |
| `/api/production/work-order/color-seq` | GET/PUT | 色序管理 | workorder:view / workorder:update |
| `/api/production/work-report` | GET/POST/PUT/DELETE | 报工 CRUD | workorder:view / workorder:update |
| `/api/production/material-issue` | POST | 生产领料 | workorder:update |
| `/api/production/material-return` | POST | 生产退料 | workorder:update |
| `/api/production/orders` | GET | 生产订单查询 | workorder:view |
| `/api/production/schedule` | GET/POST/PUT | 生产排程 CRUD | schedule:view / schedule:create |
| `/api/production/schedule/auto` | POST | 自动排程 | schedule:create |
| `/api/production/schedule/stats` | GET | 排程统计 | schedule:view |
| `/api/production/schedule/capacity` | GET | 产能分析 | schedule:view |
| `/api/production/trace` | GET/POST | 生产追溯 | production:schedule |
| `/api/production/process` | GET/POST | 工序管理 | workorder:view / workorder:create |
| `/api/production/process/stats` | GET | 工序统计 | workorder:view |
| `/api/production/process-route` | GET/POST | 工艺路线 | workorder:view / workorder:create |
| `/api/production/product-label` | GET | 产品标签 | workorder:view |
| `/api/production/mrp` | POST | MRP 物料需求计算 | mrp:run |
| `/api/production/bom` | GET | 生产 BOM 查询 | bom:view |
| `/api/workorders` | GET/POST/PUT/DELETE | 工单快捷入口 CRUD | workorder:view / workorder:create / workorder:update / workorder:delete |

### 5.9 财务模块（finance）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/finance/receivable` | GET/POST/PUT/DELETE | 应收账款 CRUD | finance:receivable |
| `/api/finance/receivables` | GET/POST/PUT/DELETE | 应收账款（复数）CRUD | finance:receivable |
| `/api/finance/receivables/[id]/receipt` | POST | 应收收款 | finance:receivable |
| `/api/finance/payable` | GET | 应付账款查询 | finance:view |
| `/api/finance/payables` | GET/POST/PUT/DELETE | 应付账款 CRUD | finance:payable |
| `/api/finance/payables/[id]/payment` | POST | 应付付款 | finance:payable |
| `/api/finance/receipt` | GET | 收款记录 | finance:view |
| `/api/finance/payment` | GET/POST/PUT | 付款记录 | finance:payment |
| `/api/finance/cost` | GET | 成本查询 | finance:view |
| `/api/finance/costs` | GET/POST | 成本管理 | finance:view |
| `/api/finance/cost-variance` | GET | 成本差异分析 | finance:cost-variance |
| `/api/finance/expense` | GET/POST/PUT/DELETE | 费用 CRUD | finance:expense |
| `/api/finance/invoice` | GET/POST/PUT/DELETE | 发票 CRUD | finance:invoice |
| `/api/finance/aging` | GET | 账龄分析 | finance:aging |
| `/api/finance/stats` | GET | 财务统计 | finance:stats |
| `/api/finance/report` | GET | 财务报表 | finance:stats |
| `/api/finance/summary` | GET | 财务汇总 | finance:summary |

### 5.10 质量模块（quality）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/quality/incoming` | GET/POST/PUT/DELETE | 来料检验 CRUD | quality:view / quality:inspect |
| `/api/quality/process` | GET/POST | 过程检验 | quality:view / quality:inspect |
| `/api/quality/process/stats` | GET | 过程检验统计 | quality:view |
| `/api/quality/final` | GET/POST | 成品检验 | quality:view / quality:inspect |
| `/api/quality/final/stats` | GET | 成品检验统计 | quality:view |
| `/api/quality/lab-test` | GET/POST/PUT/DELETE | 实验室检验 CRUD | quality:lab-test |
| `/api/quality/sgs` | GET | SGS 检测报告 | quality:sgs |
| `/api/quality/sgs/[id]` | GET/PUT/DELETE | SGS 报告详情 | quality:sgs |
| `/api/quality/sgs/expiry-warning` | GET | SGS 到期预警 | quality:sgs |
| `/api/quality/complaint` | GET/POST | 客诉管理 | quality:complaint |
| `/api/quality/supplier-audit` | GET/POST/PUT/DELETE | 供应商审核 CRUD | quality:audit |
| `/api/quality/unqualified` | GET/POST/PUT/DELETE | 不合格品 CRUD | quality:unqualified |
| `/api/quality/spc` | GET | SPC 统计过程控制 | quality:spc |

### 5.11 印前/印制模块（dcprint）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/dcprint/tool` | GET/POST | 工具（刀模/网版统一）管理 | dcprint:tool:view / dcprint:tool:create |
| `/api/dcprint/tool/[id]` | GET/PUT/DELETE | 工具详情 CRUD | dcprint:tool:view / dcprint:tool:update / dcprint:tool:delete |
| `/api/dcprint/tool/[id]/activate` | POST | 工具激活 | dcprint:tool:update |
| `/api/dcprint/tool/[id]/usage` | GET/POST | 工具使用记录 | dcprint:tool:view / dcprint:tool:use |
| `/api/dcprint/tool/[id]/scrap` | POST | 工具报废 | dcprint:tool:scrap |
| `/api/dcprint/tool/[id]/maintenance` | GET/POST | 工具维护 | dcprint:tool:view / dcprint:tool:maintenance |
| `/api/dcprint/tool/dashboard` | GET | 工具仪表盘 | dcprint:tool:view |
| `/api/dcprint/sample-card` | GET/POST | 工艺卡 CRUD | dcprint:sample-card:view / dcprint:sample-card:create |
| `/api/dcprint/sample-card/[id]` | GET/PUT/DELETE | 工艺卡详情 CRUD | dcprint:sample-card:view / dcprint:sample-card:update / dcprint:sample-card:delete |
| `/api/dcprint/sample-card/[id]/submit` | POST | 工艺卡提交 | dcprint:sample-card:submit |
| `/api/dcprint/sample-card/[id]/confirm` | POST | 工艺卡确认 | dcprint:sample-card:confirm |
| `/api/dcprint/sample-card/[id]/cancel` | POST | 工艺卡取消 | dcprint:sample-card:update |
| `/api/dcprint/sample-card/[id]/duplicate` | POST | 工艺卡复制 | dcprint:sample-card:duplicate |
| `/api/dcprint/sample-card/[id]/save-as-template` | POST | 另存为模板 | dcprint:sample-card:create |
| `/api/dcprint/sample-card/[id]/upload-diagram` | POST | 上传图纸 | dcprint:sample-card:update |
| `/api/dcprint/sample-card/[id]/cost-variance` | GET | 成本差异 | dcprint:sample-card:view |
| `/api/dcprint/sample-card/[id]/generate-quote` | POST | 生成报价 | dcprint:sample-card:view |
| `/api/dcprint/sample-card/[id]/convert-work-order` | POST | 转工单 | dcprint:sample-card:create |
| `/api/dcprint/sample-card/cost-preview` | POST | 成本预览 | dcprint:sample-card:view |
| `/api/dcprint/sample-card/template` | GET/POST | 工艺卡模板 | dcprint:sample-card:view / dcprint:sample-card:create |
| `/api/dcprint/sample-card/template/[id]` | GET/PUT/DELETE | 模板详情 CRUD | dcprint:sample-card:view / dcprint:sample-card:update / dcprint:sample-card:delete |
| `/api/dcprint/process-cards` | GET/POST | 流程卡 | dcprint:process-card |
| `/api/dcprint/formula/color` | GET/POST/PUT/DELETE | 油墨颜色 CRUD | dcprint:ink |
| `/api/dcprint/formula/version` | GET/POST | 油墨配方版本 | dcprint:ink |
| `/api/dcprint/formula/version/[id]` | GET/PUT/DELETE | 配方版本详情 CRUD | dcprint:ink |
| `/api/dcprint/formula/version/[id]/activate` | POST | 配方版本激活 | dcprint:ink |
| `/api/dcprint/formula/version/[id]/cancel` | POST | 配方版本取消 | dcprint:ink |
| `/api/dcprint/formula/version/[id]/duplicate` | POST | 配方版本复制 | dcprint:ink |
| `/api/dcprint/formula/version/[id]/items` | GET | 配方版本明细 | dcprint:ink |
| `/api/dcprint/formula/version/[id]/preview-cost` | POST | 成本预览 | dcprint:ink |
| `/api/dcprint/formula/version/[id]/recalculate-cost` | POST | 重新计算成本 | dcprint:ink |
| `/api/dcprint/formula/version/compare` | GET | 配方版本对比 | dcprint:ink |
| `/api/dcprint/ink-formula` | GET/POST | 油墨配方 | dcprint:ink |
| `/api/dcprint/ink` | GET/POST | 油墨管理 | dcprint:ink |
| `/api/dcprint/ink-consumption` | GET/POST | 油墨消耗 | dcprint:ink |
| `/api/dcprint/ink-usage` | GET/POST | 油墨使用 | dcprint:ink |
| `/api/dcprint/ink-dispatch` | POST | 油墨发料 | dcprint:ink |
| `/api/dcprint/ink-opening` | POST | 油墨开罐 | dcprint:ink |
| `/api/dcprint/ink-mixed` | POST | 油墨调配 | dcprint:ink |
| `/api/dcprint/ink-init` | POST | 油墨初始化 | dcprint:ink |
| `/api/dcprint/ink-surplus` | GET | 油墨余量 | dcprint:ink |
| `/api/dcprint/ink-query` | GET | 油墨查询 | dcprint:ink |
| `/api/dcprint/labels` | GET/POST | 标签 | dcprint:label |
| `/api/dcprint/trace` | GET/POST | 印制追溯 | dcprint:trace |
| `/api/dcprint/scan` | POST | 印制扫码 | dcprint:trace |
| `/api/dcprint/die` | GET/POST/PUT/DELETE | 刀模管理（旧路由） | dcprint:tool:view / dcprint:tool:create |
| `/api/dcprint/die-usage` | GET | 刀模使用记录 | dcprint:tool:view |
| `/api/dcprint/die-maintenance` | POST | 刀模维护 | dcprint:tool:maintenance |
| `/api/dcprint/die-template` | GET/POST | 刀模模板 | dcprint:tool:view / dcprint:tool:create |
| `/api/dcprint/screen-plate` | GET/POST/PUT/DELETE | 网版管理（旧路由） | dcprint:tool:view / dcprint:tool:create |
| `/api/ink-usages` | GET/POST/DELETE | 油墨使用（旧路由） | dcprint:ink |
| `/api/screen-plates` | GET/POST/PUT/DELETE | 网版（旧路由） | prepress:screen-plate |
| `/api/screen-plates/history` | GET | 网版历史 | prepress:screen-plate |

### 5.12 样品模块（sample）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/sample/orders` | GET/POST/PUT/DELETE | 打样订单 CRUD | sample:view / sample:create / sample:update / sample:delete |
| `/api/sample/orders/linkage` | GET | 打样订单联动 | sample:view |
| `/api/sample/orders/status` | PUT | 打样订单状态更新 | sample:update |
| `/api/sample/feedback` | GET/POST/PUT/DELETE | 打样反馈 CRUD | sample:view / sample:create / sample:update / sample:delete |
| `/api/sample/inventory` | GET/POST/PUT | 打样库存 | sample:view / sample:create / sample:update |

### 5.13 标准卡模块（standard-card / standard-cards）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/standard-card` | GET/POST | 标准卡 | standard-card:view / standard-card:create |
| `/api/standard-card/action` | POST | 标准卡操作 | standard-card:update |
| `/api/standard-card/by-material` | GET | 按物料查询标准卡 | standard-card:view |
| `/api/standard-cards` | GET/POST/PUT | 标准卡 CRUD | standard-card:view / standard-card:create / standard-card:update |
| `/api/standard-cards/approve` | POST | 标准卡审批 | standard-card:approve |
| `/api/standard-cards/scan` | POST | 标准卡扫码 | standard-card:scan |
| `/api/standard-cards/check-deviation` | GET | 偏差检查 | standard-card:view |
| `/api/standard-cards/by-material/[material_id]` | GET | 按物料查询 | standard-card:view |
| `/api/standard-cards/by-work-order/[work_order_id]` | GET | 按工单查询 | standard-card:view |

### 5.14 工程管理（engineering）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/engineering/standard-card` | GET/POST | 工程标准卡 | standard-card:view / standard-card:create |
| `/api/engineering/sop` | GET | SOP 作业指导书 | standard-card:view |
| `/api/engineering/sample-to-mass` | POST | 打样转量产 | standard-card:create |

### 5.15 设备管理（equipment）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/equipment` | GET/POST/PUT/DELETE | 设备 CRUD | equipment:view / equipment:create / equipment:update / equipment:delete |
| `/api/equipment/maintenance` | GET/POST/PUT/DELETE | 设备保养 CRUD | equipment:maintenance |
| `/api/equipment/repair` | GET/POST/PUT/DELETE | 设备维修 CRUD | equipment:repair |
| `/api/equipment/calibration` | GET/POST/PUT/DELETE | 设备校准 CRUD | equipment:calibration |
| `/api/equipment/scrap` | GET/POST/PUT/DELETE | 设备报废 CRUD | equipment:scrap |
| `/api/equipment/plan` | GET/POST/PUT/DELETE | 设备计划 CRUD | equipment:view / equipment:create / equipment:update / equipment:delete |

### 5.16 人力资源（hr）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/hr/employees` | GET/POST/PUT/DELETE | 员工 CRUD | hr:employee |
| `/api/hr/departments` | GET/POST/PUT | 部门 CRUD | hr:department |
| `/api/hr/attendance` | GET/POST/PUT | 考勤管理 | hr:attendance |
| `/api/hr/salary` | GET/POST/PUT | 薪资管理 | hr:salary |
| `/api/hr/salary/stats` | GET | 薪资统计 | hr:salary |
| `/api/hr/training` | GET/POST/PUT/DELETE | 培训管理 CRUD | hr:training |

### 5.17 组织管理（organization / menu / role-permissions）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/organization` | GET/PUT | 组织信息 | organization:department |
| `/api/organization/department` | GET/POST/PUT/DELETE | 部门 CRUD | organization:department |
| `/api/organization/employee` | GET/POST/PUT | 组织员工 | organization:employee |
| `/api/organization/role` | GET/POST/PUT/DELETE | 角色 CRUD | organization:role |
| `/api/organization/menu` | GET/POST/PUT/DELETE | 菜单 CRUD | organization:menu |
| `/api/organization/warehouse-category` | GET/POST | 仓库分类 | organization:warehouse-category |
| `/api/organization/warehouse-category/stats` | GET | 仓库分类统计 | organization:warehouse-category |
| `/api/menu` | GET | 菜单查询 | organization:menu |
| `/api/menu/sort-order` | POST | 菜单排序 | organization:menu |
| `/api/role-permissions` | GET/PUT | 角色权限 | organization:role |
| `/api/role-permissions/buttons` | GET | 按钮权限 | organization:role |

### 5.18 系统管理（system）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/system/user` | GET/POST/PUT/DELETE | 用户 CRUD | system:user |
| `/api/system/user/sync-names` | POST | 同步用户姓名 | system:user |
| `/api/system/user/fix-names` | POST | 修复用户姓名 | system:user |
| `/api/system/roles` | GET/POST/PUT/DELETE | 角色 CRUD | system:role |
| `/api/system/profile` | GET/PUT | 个人资料 | 登录即可 |
| `/api/system/profile/password` | PUT | 修改个人密码 | system:user |
| `/api/system/dict` | GET/POST/PUT/DELETE | 字典 CRUD | system:config |
| `/api/system/dict-type` | GET/POST/PUT/DELETE | 字典类型 CRUD | system:config / system:dict-type:manage |
| `/api/system/dict-data` | GET/POST/PUT/DELETE | 字典数据 CRUD | system:config / system:dict-data:manage |
| `/api/system/config` | GET/POST/PUT/DELETE | 系统配置 CRUD | system:config |
| `/api/system/config/update` | POST | 更新配置 | system:config |
| `/api/system/notice` | GET/POST/PUT/DELETE | 通知 CRUD | system:config |
| `/api/system/announcement` | GET/POST/PUT/DELETE | 公告 CRUD | system:config |
| `/api/system/oper-log` | GET/DELETE | 操作日志 | system:log |
| `/api/system/login-log` | GET/DELETE | 登录日志 | system:log |
| `/api/system/log/export` | GET | 日志导出 | system:log |
| `/api/system/monitor` | GET | 系统监控 | system:config |
| `/api/system/monitor/deadlock` | GET | 死锁监控 | system:config |
| `/api/system/data-scope` | GET/PUT | 数据权限 | system:role |
| `/api/system/data-fix` | GET/POST | 数据修复 | system:config |
| `/api/system/init` | GET/POST | 系统初始化 | system:config |
| `/api/system/scheduler` | GET/POST/PUT/DELETE | 定时任务 CRUD | system:config |
| `/api/system/workflow` | GET/POST/PUT/DELETE | 工作流配置 CRUD | system:config |
| `/api/system/outbox` | GET | 事件 Outbox 状态 | system:config |

### 5.19 报表（reports）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/reports/production-cost` | GET | 生产成本报表 | report:view |
| `/api/reports/inventory-turnover` | GET | 库存周转报表 | report:view |
| `/api/reports/delivery-rate` | GET | 交付率报表 | report:view |
| `/api/reports/dashboard` | GET | 报表仪表盘 | report:view |

### 5.20 二维码（qrcode）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/qrcode` | GET | 二维码路由 | qrcode:view |
| `/api/qrcode/trace` | GET | 二维码追溯 | qrcode:view |
| `/api/qrcode/print` | GET/POST | 二维码打印 | 登录即可 |
| `/api/qrcode/payload` | GET/POST | 二维码载荷 | 登录即可 |
| `/api/qrcode/records` | GET | 二维码记录 | qrcode:view |

### 5.21 交付（delivery）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/delivery/vehicles` | GET/POST | 车辆管理 | delivery:view / delivery:create |

### 5.22 客户关系（crm）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/crm/follow` | GET/POST | 客户跟进 | crm:follow |
| `/api/crm/analysis` | GET | 客户分析 | crm:analysis |

### 5.23 供应商关系（srm）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/srm/evaluation` | GET/POST | 供应商评估 | srm:evaluation |
| `/api/srm/evaluation/[id]` | GET/PUT/DELETE | 评估详情 CRUD | srm:evaluation |

### 5.24 产品生命周期（plm）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/plm/lifecycle` | GET | 物料生命周期 | plm:lifecycle |
| `/api/plm/eco` | GET/POST | 工程变更单 | plm:eco |

### 5.25 外包（outsource）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/outsource/order` | GET/POST/PUT/DELETE | 外包订单 CRUD | outsource:view / outsource:create / outsource:update / outsource:delete |
| `/api/outsource/issue` | GET/POST/PUT/DELETE | 外包发料 CRUD | outsource:view / outsource:create |
| `/api/outsource/receive` | GET/POST/PUT/DELETE | 外包收货 CRUD | outsource:view / outsource:create |
| `/api/outsource/settlement` | GET/POST/PUT/DELETE | 外包结算 CRUD | outsource:view |

### 5.26 产品与分类（products）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/products` | GET/POST/PUT/DELETE | 产品 CRUD | product:view / product:create / product:update / product:delete |
| `/api/products/categories` | GET/POST/PUT/DELETE | 产品分类 CRUD | product:view / product:create |

### 5.27 订单与 BOM（orders / customers）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/orders` | GET/POST/PUT/DELETE | 销售订单 CRUD（根路由） | order:view / order:create / order:update / order:delete |
| `/api/orders/sales` | GET/POST | 销售订单（别名） | order:view / order:create |
| `/api/orders/customers` | GET | 订单客户 | customer:view |
| `/api/orders/products` | GET | 订单产品 | product:view |
| `/api/orders/export` | GET | 订单导出 | order:view |
| `/api/orders/bom` | GET/POST/PUT | BOM CRUD | bom:view / bom:create / bom:update |
| `/api/orders/bom/[id]` | GET/PUT/DELETE | BOM 详情 CRUD | bom:view / bom:update |
| `/api/orders/bom/expand` | GET | BOM 展开 | bom:view |
| `/api/orders/bom/materials` | GET | BOM 物料 | bom:view |
| `/api/customers` | GET/POST/PUT/DELETE | 客户 CRUD | customer:view / customer:create / customer:update / customer:delete |

### 5.28 预印模块（prepress）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/prepress/ink` | GET/POST/PUT/DELETE | 预印油墨 CRUD | prepress:ink |
| `/api/prepress/die` | GET/POST/PUT/DELETE | 预印刀模 CRUD | prepress:die |
| `/api/prepress/die-usage` | GET | 刀模使用记录 | prepress:die |
| `/api/prepress/die-template` | GET/POST | 刀模模板 | prepress:die |
| `/api/prepress/die-maintenance` | POST | 刀模维护 | prepress:die |
| `/api/prepress/die-migrate` | POST | 刀模迁移 | prepress:die |
| `/api/prepress/screen-plate` | GET/POST/PUT/DELETE | 预印网版 CRUD | prepress:screen-plate |

### 5.29 工作流（workflow）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/workflow/tasks` | GET/POST/PUT | 工作流任务 | workflow:task |
| `/api/workflow/process` | GET/POST | 工作流流程 | workflow:process |

### 5.30 审计（audit）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/audit/logs` | GET | 审计日志（操作日志/登录日志/库存流水/财务流水） | audit:view |
| `/api/audit/report` | GET | 审计报告 | audit:view |

### 5.31 设置（settings）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/settings/change-approval` | GET/POST | 变更审批 | settings:approval |
| `/api/settings/category-linkage` | GET/POST | 分类联动 | settings:linkage |
| `/api/settings/category-rules` | GET/POST | 分类规则 | settings:linkage |
| `/api/settings/system` | GET | 系统设置 | system:config |

### 5.32 文件上传（upload / project-files）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/upload` | POST | 通用文件上传 | upload:file |
| `/api/upload/sop` | POST | SOP 文件上传 | upload:file |
| `/api/upload/contract` | POST | 合同文件上传 | upload:file |
| `/api/project-files` | GET | 项目文件列表 | 登录即可 |
| `/api/project-files/upload` | POST | 项目文件上传 | 登录即可 |
| `/api/project-files/gitignore` | POST | 生成 .gitignore | 登录即可 |

### 5.33 监控（monitoring）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/monitoring` | GET | 系统监控（含死锁检测） | system:monitor |

### 5.34 业务/合同评审（biz / business）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/biz/contract-review` | GET/POST | 合同评审 | order:view / order:create |
| `/api/business/contract-review` | GET/POST | 合同评审（别名） | order:view / order:create |

### 5.35 联动校验（linkage）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/linkage/validate` | GET/POST/PUT | 联动校验（前端表单实时校验） | 公开 |

### 5.36 单号生成（document-number）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/document-number` | GET | 生成业务单号 | 公开 |

### 5.37 数据库关系（db-relations）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/db-relations` | GET | 数据库表关系图数据 | 登录即可 |

### 5.38 OpenAPI（openapi.json）

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/openapi.json` | GET | 返回 OpenAPI 3.0 规范 JSON | 登录即可 |

### 5.39 迁移与初始化（migrations / setup / init / diagnose）

> 以下路由为运维脚本路由，生产环境受 `NODE_ENV` 检查或 `ALLOW_SETUP_API` 环境变量控制，默认禁用。

| 路径 | 方法 | 用途 | 权限 |
|---|---|---|---|
| `/api/migrations/add-workshop-column` | GET/POST | 添加车间列 | system:migrate |
| `/api/migrations/foreign-keys` | GET | 外键修复 | system:migrate |
| `/api/migrations/purchase-request-fk` | GET | 采购申请外键 | system:migrate |
| `/api/migrations/readmd-fixes` | GET | README 修复 | system:migrate |
| `/api/migrations/six-critical-fixes` | GET | 六项关键修复 | system:migrate |
| `/api/migrations/views` | GET | 视图修复 | system:migrate |
<!-- 已移除：/api/setup/create-tables（废弃建表接口） -->
| `/api/init/warehouse` | GET/POST | 仓库初始化 | system:setup |
| `/api/init/warehouse-category` | GET/POST | 仓库分类初始化 | system:setup |
| `/api/init/warehouse-category-seed` | GET/POST | 仓库分类种子数据 | system:setup |
| `/api/init/menus` | GET/POST | 菜单初始化 | system:setup |
| `/api/init/department` | GET/POST | 部门初始化 | system:setup |
| `/api/init/seed-data` | GET/POST | 种子数据 | system:setup |
| `/api/init/full-seed` | GET/POST | 全量种子数据 | system:setup |
| `/api/init/full-tables` | GET/POST | 全量建表 | system:setup |
| `/api/init/full-business-seed` | GET/POST | 全量业务种子数据 | system:setup |
| `/api/init/business-seed` | GET/POST | 业务种子数据 | system:setup |
| `/api/init/core-flow-seed` | GET/POST | 核心流程种子数据 | system:setup |
| `/api/init/related-seed` | GET/POST | 关联种子数据 | system:setup |
| `/api/init/settings-seed` | GET/POST | 设置种子数据 | system:setup |
| `/api/init/sample-seed` | GET/POST | 打样种子数据 | system:setup |
| `/api/init/ink-seed` | GET/POST | 油墨种子数据 | system:setup |
| `/api/init/quality-final-seed` | GET/POST | 质量成品种子数据 | system:setup |
| `/api/init/die-template-seed` | GET/POST | 刀模模板种子数据 | system:setup |
| `/api/init/bom-tables` | GET | BOM 建表 | system:setup |
| `/api/init/three-layer-tables` | GET | 三层建表 | system:setup |
| `/api/init/finance-tables` | GET/POST | 财务建表 | system:setup |
| `/api/init/product-tables` | GET | 产品建表 | system:setup |
| `/api/init/po-grn-tables` | GET | 采购入库建表 | system:setup |
| `/api/init/sample-tables` | GET | 打样建表 | system:setup |
| `/api/init/inbound-tables` | GET/POST | 入库建表 | system:setup |
| `/api/init/inventory-tables` | GET/POST | 库存建表 | system:setup |
| `/api/init/supplement-tables` | GET/POST | 补充建表 | system:setup |
| `/api/init/data-logic` | GET/POST | 数据逻辑 | system:setup |
| `/api/init/migrate` | GET/POST | 迁移 | system:setup |
| `/api/diagnose/all-tables` | GET | 诊断所有表 | system:setup |
| `/api/diagnose/column-types` | GET | 诊断列类型 | system:setup |
| `/api/diagnose/final-inspection-schema` | GET | 诊断成品检验表结构 | system:setup |
| `/api/diagnose/inbound` | GET | 诊断入库 | system:setup |
| `/api/diagnose/insert-test` | GET | 诊断插入测试 | system:setup |
| `/api/diagnose/inventory-schema` | GET | 诊断库存表结构 | system:setup |
| `/api/diagnose/label-status` | GET | 诊断标签状态 | system:setup |
| `/api/diagnose/material` | GET | 诊断物料 | system:setup |
| `/api/diagnose/show-columns` | GET | 显示列信息 | system:setup |
| `/api/diagnose/table-schema` | GET | 显示表结构 | system:setup |

## 6. 动态路径说明

Next.js App Router 动态路由使用方括号语法，如 `/api/dcprint/tool/[id]`。在请求时 `[id]` 替换为实际 ID，例如 `GET /api/dcprint/tool/42`。嵌套动态路由如 `/api/standard-cards/by-material/[material_id]` 对应 `GET /api/standard-cards/by-material/100`。

## 7. 客户端调用约定

前端统一使用 `src/lib/auth-fetch.ts` 的 `authFetch` 函数发起 API 请求，该函数自动处理：
- 携带 `access_token` cookie（浏览器自动）
- 携带 CSRF token 请求头
- 401 响应时自动调用 `/api/auth/refresh` 静默刷新 token 并重试请求
- 统一错误处理

禁止在页面中自定义 `authFetch` 局部函数（会丢失 CSRF 保护和 401 静默刷新能力）。

## 8. 相关代码文件

| 文件 | 说明 |
|---|---|
| `src/lib/api-response.ts` | 统一响应格式、错误处理包装器 |
| `src/lib/api-auth.ts` | withAuth / withAuthAndErrorHandler 装饰器 |
| `src/lib/api-permissions.ts` | withPermission 装饰器、权限常量、路由权限映射 |
| `src/lib/auth.ts` | JWT 验证、权限检查、用户信息 |
| `src/lib/auth-fetch.ts` | 客户端统一 fetch 封装 |
| `src/lib/csrf.ts` | CSRF token 生成与校验 |
| `src/lib/token-blacklist.ts` | Redis token 黑名单 |
| `src/proxy.ts` | Next.js 中间件（i18n + 认证 + CSRF） |

> 最后更新：2026-07-10
