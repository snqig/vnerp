# VNERP 印刷行业ERP系统

## 项目简介

VNERP 是一款专为印刷行业设计的综合性企业资源计划（ERP）系统，采用 Next.js 16 + MySQL 技术栈构建，基于 DDD（领域驱动设计）架构，提供完整的业务管理功能。

## 快速开始

### 环境要求

- Node.js 18+
- MySQL 8.0+
- pnpm 9.0+

### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd erp-project

# 2. 安装依赖
pnpm install

# 3. 配置数据库
# 编辑 .env.local 文件，配置数据库连接信息
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=vnerpdacahng

# 4. 初始化数据库表结构
# 执行 database/ 目录下的 SQL 文件

# 5. 启动开发服务器
pnpm dev
```

### 访问地址

- 开发环境: http://localhost:5000
- 登录页面: http://localhost:5000/login

### 常用命令

```bash
pnpm dev          # 启动开发服务器 (端口 5000)
pnpm build        # 生产构建
pnpm start        # 启动生产服务器
pnpm lint         # ESLint 检查
pnpm ts-check     # TypeScript 类型检查
pnpm test         # Playwright E2E 测试
pnpm test:unit    # Vitest 单元测试
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 16 (App Router + Turbopack) |
| UI 组件库 | shadcn/ui + Radix UI + Tailwind CSS 4 |
| 后端运行时 | Next.js Route Handlers (Serverless) |
| 数据库 | MySQL 8.0 + mysql2 |
| 状态管理 | React Hooks + Context |
| 图表 | Recharts |
| 认证 | JWT (jose) |
| 表单 | React Hook Form + Zod |
| 测试 | Playwright (E2E) + Vitest (Unit) |
| 包管理 | pnpm |

## 项目架构

本项目采用 DDD（领域驱动设计）分层架构，将业务逻辑从基础设施中解耦：

```
src/
├── domain/                          # 领域层
│   ├── shared/                      # 共享基础
│   │   ├── DomainTypes.ts           # 领域异常、事件接口
│   │   └── value-objects/
│   │       └── Money.ts             # 金额值对象
│   └── warehouse/                   # 仓储领域
│       ├── aggregates/
│       │   └── InboundOrder.ts      # 入库单聚合根
│       ├── entities/
│       │   └── InboundItem.ts       # 入库明细实体
│       ├── events/
│       │   └── InboundOrderEvents.ts # 领域事件
│       ├── repositories/
│       │   └── IInboundOrderRepository.ts # 仓储接口
│       └── value-objects/
│           └── OrderStatus.ts       # 订单状态值对象
│
├── application/                     # 应用层
│   ├── handlers/                    # 事件处理器
│   │   ├── AuditLogHandler.ts       # 审计日志
│   │   ├── CacheInvalidationHandler.ts # 缓存失效
│   │   ├── FinanceVoucherHandler.ts # 财务凭证
│   │   ├── InventorySyncHandler.ts  # 库存同步
│   │   └── QrCodeGenerationHandler.ts # 二维码生成
│   └── services/                    # 应用服务
│       ├── DashboardDataService.ts  # 看板数据服务
│       └── InboundApplicationService.ts # 入库应用服务
│
├── infrastructure/                  # 基础设施层
│   ├── cache/
│   │   └── CacheManager.ts          # 内存缓存管理
│   ├── config/
│   │   └── EventRegistry.ts         # 事件注册配置
│   ├── event-bus/
│   │   └── EventBus.ts              # 内存事件总线
│   └── repositories/
│       └── MysqlInboundOrderRepository.ts # MySQL 仓储实现
│
├── app/                             # Next.js App Router
│   ├── api/                         # API 路由 (Thin Controller)
│   ├── dashboard/                   # 看板页面
│   ├── warehouse/                   # 仓储管理
│   ├── production/                  # 生产管理
│   ├── sales/                       # 销售管理
│   ├── purchase/                    # 采购管理
│   ├── finance/                     # 财务管理
│   ├── quality/                     # 质量管理
│   ├── equipment/                   # 设备管理
│   ├── hr/                          # 人力资源
│   ├── dcprint/                     # 印前管理
│   ├── sample/                      # 打样管理
│   ├── settings/                    # 系统设置
│   └── ...                          # 其他模块
│
├── components/                      # 共享组件
│   ├── ui/                          # shadcn/ui 基础组件
│   ├── layout/                      # 布局组件
│   ├── auth/                        # 认证组件
│   └── common/                      # 通用业务组件
│
├── hooks/                           # 自定义 Hooks
├── contexts/                        # React Context
├── lib/                             # 工具库
│   ├── db/                          # 数据库连接与查询
│   ├── api-response.ts              # 统一 API 响应
│   ├── auth.ts                      # 认证工具
│   ├── fifo-allocation.ts           # FIFO 分配算法
│   ├── state-machine.ts             # 状态机
│   └── ...                          # 其他工具
│
└── test/                            # 测试配置
```

### DDD 架构说明

**领域层 (Domain)**：封装核心业务逻辑，不依赖任何外部框架。
- 聚合根 (Aggregate Root)：`InboundOrder` 管理入库单生命周期
- 值对象 (Value Object)：`OrderStatus` 封装状态转换规则，`Money` 封装金额运算
- 领域事件 (Domain Event)：`InboundOrderCreatedEvent`、`InboundOrderApprovedEvent` 等

**应用层 (Application)**：编排领域对象，协调业务流程。
- 应用服务：加载聚合 → 调用领域方法 → 持久化 → 发布事件
- 事件处理器：库存同步、财务凭证、二维码生成、审计日志、缓存失效

**基础设施层 (Infrastructure)**：技术实现细节。
- 仓储实现：MySQL 查询与持久化
- 事件总线：内存发布/订阅
- 缓存管理：TTL 过期 + 事件驱动失效

**表现层 (Presentation)**：Thin Controller 模式，API 路由仅负责 HTTP ↔ 应用服务的转换。

## 系统模块

### 看板中心

| 页面 | 路径 | 说明 |
|------|------|------|
| 综合仪表盘 | `/dashboard` | 业务概览与 KPI |
| CEO 看板 | `/dashboard/ceo` | 全局经营数据大屏 |
| 生产看板 | `/dashboard/production` | 生产进度与设备状态 |
| 财务看板 | `/dashboard/finance` | 收支与资金流 |
| 质量看板 | `/dashboard/quality` | 质量指标与趋势 |
| 销售看板 | `/dashboard/sales` | 订单与客户分析 |
| 仓库看板 | `/dashboard/warehouse` | 库存与出入库 |

### 仓储管理

| 页面 | 路径 | API |
|------|------|-----|
| 入库管理 | `/warehouse/inbound` | `/api/warehouse/inbound` |
| 分切入库 | `/warehouse/inbound/cutting` | `/api/warehouse/inbound/cutting` |
| 物料标签 | - | `/api/warehouse/inbound/labels` |
| 出库管理 | `/warehouse/outbound` | `/api/warehouse/outbound` |
| 库存管理 | `/warehouse/inventory` | `/api/warehouse/inventory` |
| 生产入库 | `/warehouse/production-inbound` | `/api/warehouse/production-inbound` |
| 销售出库 | `/warehouse/sales-outbound` | `/api/warehouse/sales-outbound` |
| 调拨管理 | `/warehouse/transfer` | `/api/warehouse/transfer` |
| 库存调整 | `/warehouse/stock-adjust` | `/api/warehouse/stock-adjust` |
| 盘点管理 | `/warehouse/stocktaking` | `/api/warehouse/stocktaking` |
| 仓库设置 | `/warehouse/setup` | `/api/warehouse` |

### 生产管理

| 页面 | 路径 | API |
|------|------|-----|
| 生产工单 | `/production/orders` | `/api/production/orders` |
| 工单管理 | `/production/workorder` | `/api/workorders` |
| 生产流程 | `/production/process` | `/api/production/process` |
| 排产管理 | `/production/schedule` | `/api/production/schedule` |
| 领料管理 | `/production/material-issue` | `/api/production/material-issue` |
| 退料管理 | `/production/material-return` | `/api/production/material-return` |
| MRP | `/production/mrp` | `/api/production/mrp` |
| 产品标签 | `/production/product-label` | `/api/production/product-label` |

### 销售管理

| 页面 | 路径 | API |
|------|------|-----|
| 发货管理 | `/sales/delivery` | `/api/sales/delivery` |
| 对账管理 | `/sales/reconciliation` | `/api/sales/reconciliation` |
| 退货管理 | `/sales/return` | `/api/sales/return` |

### 采购管理

| 页面 | 路径 | API |
|------|------|-----|
| 采购订单 | `/purchase/orders` | `/api/purchase/orders` |
| 采购申请 | `/purchase/request` | `/api/purchase/request` |
| 供应商管理 | `/purchase/suppliers` | `/api/purchase/suppliers` |
| 供应商评估 | `/srm/evaluation` | `/api/srm/evaluation` |

### 印前管理 (DCPrint)

| 页面 | 路径 | API |
|------|------|-----|
| 刀模管理 | `/dcprint/die` | `/api/prepress/die` |
| 油墨管理 | `/dcprint/ink` | `/api/dcprint/ink-*` |
| 油墨开盖 | `/dcprint/ink-opening` | `/api/dcprint/ink-opening` |
| 油墨使用 | `/dcprint/ink-usage` | `/api/dcprint/ink-usage` |
| 混合油墨 | `/dcprint/ink-mixed` | `/api/dcprint/ink-mixed` |
| 标签管理 | `/dcprint/labels` | `/api/dcprint/labels` |
| 工艺卡 | `/dcprint/process-cards` | `/api/dcprint/process-cards` |
| 网版管理 | `/dcprint/screen-plate` | `/api/screen-plates` |
| 追溯管理 | `/dcprint/trace` | `/api/dcprint/trace` |

### 质量管理

| 页面 | 路径 | API |
|------|------|-----|
| 来料检验 | `/quality/incoming` | `/api/quality/incoming` |
| 过程检验 | `/quality/process` | `/api/quality/process` |
| 成品检验 | `/quality/final` | `/api/quality/final` |
| SGS 管理 | `/quality/sgs` | `/api/quality/sgs` |
| SPC 分析 | `/quality/spc` | `/api/quality/spc` |
| 不合格品 | `/quality/unqualified` | `/api/quality/unqualified` |
| 客户投诉 | `/quality/complaint` | `/api/quality/complaint` |
| 实验室测试 | `/quality/lab-test` | `/api/quality/lab-test` |
| 供应商审核 | `/quality/supplier-audit` | `/api/quality/supplier-audit` |

### 设备管理

| 页面 | 路径 | API |
|------|------|-----|
| 设备校准 | `/equipment/calibration` | `/api/equipment/calibration` |
| 设备维护 | `/equipment/maintenance` | `/api/equipment/maintenance` |
| 设备维修 | `/equipment/repair` | `/api/equipment/repair` |
| 设备报废 | `/equipment/scrap` | `/api/equipment/scrap` |

### 财务管理

| 页面 | 路径 | API |
|------|------|-----|
| 应收账款 | `/finance/receivable` | `/api/finance/receivable` |
| 成本管理 | `/finance/cost` | `/api/finance/cost` |
| 财务报表 | `/finance/report` | `/api/finance/report` |

### 人力资源

| 页面 | 路径 | API |
|------|------|-----|
| 员工管理 | `/hr/employee` | `/api/organization/employee` |
| 考勤管理 | `/hr/attendance` | `/api/hr/attendance` |
| 薪资管理 | `/hr/salary` | `/api/hr/salary` |
| 培训管理 | `/hr/training` | `/api/hr/training` |

### 打样管理

| 页面 | 路径 | API |
|------|------|-----|
| 样品订单 | `/sample/orders` | `/api/sample/orders` |
| 标准色卡 | `/sample/standard-card` | `/api/standard-cards` |
| 样品管理 | `/sample/management` | - |

### 系统设置

| 页面 | 路径 | API |
|------|------|-----|
| 组织架构 | `/settings/organization` | `/api/organization` |
| 用户管理 | `/settings/user` | `/api/system/user` |
| 角色管理 | `/settings/roles` | `/api/system/roles` |
| 权限管理 | `/settings/permissions` | `/api/role-permissions` |
| 菜单管理 | `/settings/menus` | `/api/menu` |
| 字典管理 | `/settings/dict` | `/api/system/dict-type` |
| 系统配置 | `/settings/config` | `/api/system/config` |
| 操作日志 | `/settings/oper-log` | `/api/system/oper-log` |
| 登录日志 | `/settings/login-log` | `/api/system/login-log` |
| 通知公告 | `/settings/notice` | `/api/system/notice` |
| 仓库分类 | `/settings/warehouse-category` | `/api/organization/warehouse-category` |

## 核心数据库表

| 表名 | 说明 |
|------|------|
| `sys_user` | 用户表 |
| `sys_menu` | 菜单表 |
| `sys_role` | 角色表 |
| `crm_customer` | 客户表 |
| `pur_supplier` | 供应商表 |
| `sal_order` | 销售订单表 |
| `prod_work_order` | 生产工单表 |
| `prd_process_card` | 工艺卡表 |
| `pur_order_std` | 采购订单表 |
| `inv_inbound_order` | 入库单表 |
| `inv_inbound_item` | 入库明细表 |
| `inv_inbound_label` | 物料标签表 |
| `inv_outbound_order` | 出库单表 |
| `inv_inventory` | 库存表 |
| `inv_inventory_batch` | 批次库存表 |
| `inv_warehouse` | 仓库表 |
| `inv_material` | 物料表 |
| `fin_receivable` | 应收账款表 |
| `fin_payable` | 应付账款表 |
| `qc_inspection` | 质检表 |
| `eqp_equipment` | 设备表 |

## 安全说明

- 密码使用 bcryptjs 加密存储
- API 接口通过 JWT (jose) 身份验证
- 敏感操作需要权限验证
- 数据库连接使用环境变量配置
- 所有 SQL 查询使用参数化语句防止注入
- XSS 防护由 Next.js 框架内置处理

## 许可证

本项目仅供学习和内部使用。

*最后更新: 2026-05-08*
