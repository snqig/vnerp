# VNERP - 丝网印刷 ERP 系统

> 版本：V1.0 | 更新日期：2026-05-10

## 快速启动

### 环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18.x | 推荐使用 LTS 版本 |
| pnpm | >= 8.x | 包管理器（项目强制使用 pnpm） |
| MySQL | >= 8.0 | 数据库 |
| Redis | >= 6.x | 缓存与会话管理（可选） |

### 安装与启动

```bash
# 克隆项目
git clone <repo-url> vnerp
cd vnerp

# 安装依赖（强制使用 pnpm）
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，配置数据库连接等

# 初始化数据库
pnpm run db:init

# 启动开发服务器
pnpm dev
# 访问 http://localhost:5000
```

### 常用命令

```bash
pnpm dev              # 启动开发服务器（端口 5000）
pnpm build            # 生产构建
pnpm start            # 启动生产服务器
pnpm lint             # ESLint 检查
pnpm lint:fix         # ESLint 自动修复
pnpm format           # Prettier 格式化
pnpm ts-check         # TypeScript 类型检查
pnpm test             # 运行 E2E 测试（Playwright）
pnpm test:unit        # 运行单元测试（Vitest）
pnpm test:coverage    # 运行单元测试并生成覆盖率报告
```

## 系统简介

VNERP 是专为丝网印刷行业设计的企业资源规划系统，覆盖企业核心业务流程：

```
销售订单 → 生产计划 → 物料采购 → 仓库管理 → 生产执行 → 品质检验 → 成品发货 → 财务核算
```

### 核心特色

- **二维码全流程追溯**：从原材料入库到成品出库的完整追溯链
- **物料自动拆分**：大包装物料按标准拆分单位自动拆分为小料
- **FIFO 先进先出**：严格执行物料先进先出原则
- **标准卡管理**：丝网印刷专用标准卡，记录油墨、网版、刀具等工艺参数
- **批次成本核算**：精确到每个工单、每个批次的实际成本核算

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 15 (App Router) | React 全栈框架 |
| UI 组件 | shadcn/ui + Tailwind CSS | 组件库与样式方案 |
| 后端 API | Next.js Route Handlers | 服务端 API 路由 |
| 数据库 | MySQL 8.0 | 关系型数据库 |
| ORM | 原生 SQL (mysql2) | 直接 SQL 查询 |
| 认证 | JWT + bcrypt | 用户认证与授权 |
| 测试 | Vitest + Playwright | 单元测试 + E2E 测试 |

## 文档体系

| 目录 | 说明 | 详细索引 |
|------|------|---------|
| [Rules/](./Rules/README.md) | 规则体系 | 编码规范、数据库规则、API规范、业务规则、安全规则 |
| [Skills/](./Skills/README.md) | 技能SOP | 部署SOP、开发SOP、运维SOP |
| [harness/](./harness/README.md) | 测试框架 | 单元测试、集成测试、E2E测试、测试数据 |
| [Wiki/](./Wiki/README.md) | 知识库 | 架构文档、业务知识、技术知识、决策记录 |
| [Changes/](./Changes/README.md) | 变更记录 | 版本记录、数据库迁移、Bug修复 |

## 项目结构

```
vnerp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API 路由（Route Handlers）
│   │   ├── [module]/           # 业务模块页面
│   │   ├── layout.tsx          # 根布局
│   │   └── page.tsx            # 首页
│   ├── components/             # 共享组件
│   │   ├── ui/                 # shadcn/ui 基础组件
│   │   └── layout/             # 布局组件
│   ├── lib/                    # 核心工具库
│   │   ├── db.ts               # 数据库连接与工具
│   │   ├── api-response.ts     # API 响应标准化
│   │   ├── auth.ts             # 认证工具
│   │   ├── fifo-allocation.ts  # FIFO 分配算法
│   │   └── auto-material-split.ts  # 物料自动拆分
│   └── hooks/                  # 自定义 Hooks
├── database/                   # 数据库脚本
├── migrations/                 # 数据库迁移脚本
├── docs/                       # 项目文档
├── scripts/                    # 辅助脚本
└── public/                     # 静态资源
```

## 核心业务模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 生产管理 | `/production/*` | 工单管理、报工、排产 |
| 仓库管理 | `/warehouse/*` | 入库、出库、盘点、调拨 |
| 采购管理 | `/purchase/*` | 采购申请、采购订单 |
| 品质管理 | `/quality/*` | 来料检验、过程检验、成品检验 |
| 销售管理 | `/sales/*` | 销售订单、发货、退货 |
| 财务管理 | `/finance/*` | 应收应付、成本核算 |
| 印刷车间 | `/dcprint/*` | 油墨管理、网版管理、二维码追溯 |
| 标准卡 | `/sample/standard-card` | 丝网印刷标准卡管理 |
