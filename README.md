# 印刷生产经营信息管理系统 Print MIS

[![CI](https://github.com/snqig/vnerp/actions/workflows/ci.yml/badge.svg)](https://github.com/snqig/vnerp/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Internal-blue)](#许可证)

> 印刷生产经营信息管理系统 Print MIS — 基于 Next.js 16 + DDD + Drizzle ORM 的印刷行业综合管理系统，支持中文（简/繁）、英文、越南语四语言国际化。

## 快速开始

### 环境要求

- Node.js 18+
- MySQL 8.0+
- pnpm 9.0+（项目已配置 `preinstall: only-allow pnpm`，禁用 npm/yarn）

### 安装与启动

```bash
git clone https://github.com/snqig/vnerp.git
cd vnerp

# 1. 安装依赖（仅允许 pnpm）
pnpm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填写 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/JWT_SECRET

# 3. 初始化数据库（推荐方式：CLI 脚本，容错执行）
pnpm setup:db --seed
# --seed 参数：同时导入种子数据；不带 --seed 仅建表结构
# 脚本会自动创建数据库（CREATE DATABASE IF NOT EXISTS）

# 4. 启动开发服务器
pnpm dev
```

启动后访问 http://localhost:5000，登录入口 `/login`。

**默认账号**（种子数据）：用户名 `admin` / 密码 `admin123`

> ⚠️ **安全警告**：默认口令 `admin123` 仅供初始化使用。`first_login=1` 标记会强制 admin 首次登录时修改密码，修改前无法访问任何业务页面。**生产部署前必须确认默认口令已被更改**，并配置 `system.force_change_password=true` 与 `system.password_expire_days` 策略。

### 常用命令

| 命令                     | 说明                                                |
| ------------------------ | --------------------------------------------------- |
| `pnpm dev`             | 启动开发服务器（端口 5000，Turbopack）              |
| `pnpm build`           | 生产构建                                            |
| `pnpm start`           | 启动生产服务器                                      |
| `pnpm lint`            | ESLint 检查（含 `i18n/no-chinese-hardcode` 规则） |
| `pnpm ts-check`        | TypeScript 类型检查                                 |
| `pnpm test:unit`       | Vitest 单元测试（watch 模式）                       |
| `pnpm test:unit:run`   | Vitest 单元测试（单次运行）                         |
| `pnpm test:coverage`   | 单元测试 + 覆盖率报告                               |
| `pnpm test`            | Playwright E2E 测试                                 |
| `pnpm setup:db --seed` | 数据库初始化 + 种子数据                             |
| `pnpm db:generate`     | Drizzle 生成迁移文件                                |
| `pnpm db:push`         | Drizzle 推送 schema 到数据库                        |
| `pnpm db:studio`       | Drizzle Studio 可视化管理                           |

## 技术栈

| 类别     | 技术                                             |
| -------- | ------------------------------------------------ |
| 前端框架 | Next.js 16.1.1（App Router + Turbopack）         |
| UI 组件  | React 19 + shadcn/ui + Radix UI + Tailwind CSS 4 |
| 编程语言 | TypeScript 5（严格模式）                         |
| 数据库   | MySQL 8.0 + Drizzle ORM 0.45 + mysql2 连接池     |
| 国际化   | next-intl（zh-CN / zh-TW / en / vi 四语言）      |
| 认证     | JWT (jose) + bcryptjs + 401 无感刷新             |
| 表单校验 | React Hook Form + Zod                            |
| 状态管理 | React Hooks + Context                            |
| 图表     | Recharts                                         |
| 单元测试 | Vitest（覆盖率阈值 80%）                         |
| E2E 测试 | Playwright                                       |
| 代码规范 | ESLint + Prettier + 自定义 i18n 规则             |
| 提交规范 | husky + lint-staged + commitlint                 |
| 包管理   | pnpm 9.0（lockfile 锁定）                        |
| 容器化   | Docker + docker-compose（多阶段构建）            |

## 架构与模块

### DDD 分层架构

```
src/
├── domain/              # 领域层：聚合根、实体、值对象、领域事件、仓储接口
│   ├── shared/          # 共享基础（Money、DomainTypes）
│   ├── warehouse/       # 仓储领域（InboundOrder 聚合根）
│   ├── production/      # 生产领域
│   ├── sales/           # 销售领域
│   ├── purchase/        # 采购领域
│   └── standard-card/   # 标准卡领域
├── application/         # 应用层：应用服务 + 事件处理器
│   ├── handlers/        # 审计/缓存失效/财务凭证/库存同步/二维码
│   └── services/        # 入库应用服务、看板数据服务
├── infrastructure/      # 基础设施层：MySQL 仓储、事件总线、缓存
├── app/[locale]/        # 表现层：多语言路由
│   ├── api/             # API 路由（Thin Controller）
│   └── (dashboard)/     # 业务页面
├── components/ui/       # shadcn/ui 基础组件
├── lib/                 # 工具库（db/auth/fifo/state-machine）
└── i18n/                # next-intl 配置
```

**分层依赖流向**：表现层 → 应用层 → 领域层 ← 基础设施层（依赖倒置）

### 业务模块

| 模块     | 路径前缀        | 说明                                         |
| -------- | --------------- | -------------------------------------------- |
| 看板中心 | `/dashboard`  | 综合仪表盘、CEO/生产/财务/质量/销售/仓库看板 |
| 仓储管理 | `/warehouse`  | 入库、出库、库存、调拨、盘点、批次追溯       |
| 生产管理 | `/production` | 工单、排产、领料、退料、MRP                  |
| 销售管理 | `/sales`      | 发货、对账、退货                             |
| 采购管理 | `/purchase`   | 采购订单、申请、供应商、退换货               |
| 印前管理 | `/dcprint`    | 刀模、油墨、网版、工艺卡、追溯               |
| 质量管理 | `/quality`    | 来料/过程/成品检验、SPC、SGS、客诉           |
| 设备管理 | `/equipment`  | 校准、维护、维修、报废                       |
| 财务管理 | `/finance`    | 应收应付、成本、报表                         |
| 人力资源 | `/hr`         | 员工、考勤、薪资、培训                       |
| 打样管理 | `/sample`     | 样品订单、标准色卡                           |
| 系统设置 | `/settings`   | 组织架构、用户、角色、菜单、字典、配置、日志 |

完整接口清单见 [docs/10-接口文档/API.md](docs/10-接口文档/API.md)。

## i18n 国际化

项目支持四种语言，路由前缀策略为 `as-needed`（zh-CN 无前缀，其他语言带前缀）：

| 语言             | locale    | 路由示例             |
| ---------------- | --------- | -------------------- |
| 简体中文（默认） | `zh-CN` | `/dashboard`       |
| 繁体中文         | `zh-TW` | `/zh-TW/dashboard` |
| 英文             | `en`    | `/en/dashboard`    |
| 越南语           | `vi`    | `/vi/dashboard`    |

**开发约束**：UI 文本必须通过 `useTranslations` Hook 读取，禁止硬编码中文。ESLint 自定义规则 `i18n/no-chinese-hardcode` 会在提交时自动检测，详见 [docs/11-开发指南/i18n规范.md](docs/11-开发指南/i18n规范.md)。

## 提交规范与 CI/CD

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[scope]: <description>
```

| type     | 用途      |
| -------- | --------- |
| feat     | 新功能    |
| fix      | Bug 修复  |
| docs     | 文档      |
| refactor | 重构      |
| test     | 测试      |
| build    | 构建/依赖 |
| ci       | CI 配置   |
| chore    | 维护      |

示例：`feat(warehouse): 添加入库单审核功能`

### 提交门禁（husky hooks）

| Hook           | 作用                                         |
| -------------- | -------------------------------------------- |
| `pre-commit` | lint-staged 对暂存文件运行 ESLint + Prettier |
| `commit-msg` | commitlint 校验提交信息格式                  |

### CI 流水线

GitHub Actions 流水线（[.github/workflows/ci.yml](.github/workflows/ci.yml)）在 push/PR 到 `main`/`develop` 时触发，按顺序执行：

1. **lint** — ESLint 检查
2. **ts-check** — TypeScript 类型检查
3. **test:coverage** — Vitest 单元测试 + 覆盖率（阈值 80%）
4. **e2e-test** — Playwright E2E 测试（依赖单元测试通过，PR 与 main 均执行）
5. **build** — Next.js 构建（仅 `main` 分支触发，PR 不跑以节省资源）

视觉回归测试通过 Chromatic 单独流水线（[chromatic.yml](.github/workflows/chromatic.yml)）。

提交贡献流程详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 数据库与部署

### 数据库

两条初始化路径，按场景选择：

| 场景              | 命令                                     | 说明                                                                                                                        |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 首次搭建/重置     | `pnpm setup:db --seed`                 | 执行 `database/vnerpdacahng_schema.sql`（含 CREATE DATABASE IF NOT EXISTS / INSERT IGNORE 容错），一次性建表 + 灌种子数据 |
| 迭代开发改 schema | `pnpm db:generate` → `pnpm db:push` | 基于 `src/lib/db/schema.ts` 生成 Drizzle 迁移文件并应用                                                                   |

> ⚠️ `vnerpdacahng_schema.sql`（业务表，含 `inv_*`/`crm_*`/`fin_*` 前缀）与 `schema.ts`（Drizzle 定义）目前存在表名不一致，详见 [docs/03-技术规范/已知问题.md](docs/03-技术规范/已知问题.md) DATA-001。

- **ORM**：Drizzle ORM 0.45，schema 定义在 `src/lib/db/schema.ts`
- **可视化**：`pnpm db:studio` 启动 Drizzle Studio
<!-- 废弃接口已移除：旧的 /api/setup/create-tables HTTP 接口已删除，请使用 CLI 脚本 -->

### Docker 部署

```bash
# 开发环境
docker-compose up -d

# 生产环境
docker-compose -f docker-compose.prod.yml up -d
```

多阶段构建见 [Dockerfile](Dockerfile)，部署配置详见 [docs/04-运维指南/部署指南.md](docs/04-运维指南/部署指南.md)。

### 环境变量

参考 [.env.example](.env.example)，关键字段：

| 变量                                                                    | 说明               |
| ----------------------------------------------------------------------- | ------------------ |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL 连接         |
| `JWT_SECRET`                                                          | JWT 签名密钥       |
| `NEXT_PUBLIC_APP_NAME`                                                | 应用名称           |
| `DEV_ORIGINS`                                                         | 开发环境跨域白名单 |

## 安全说明

- 密码使用 bcryptjs 加盐哈希存储
- API 通过 JWT (jose) 鉴权，支持 401 无感刷新（`authFetch` 并发锁防重复刷新）
- 登录限流（IP 维度 15 分钟 20 次）+ 失败锁定（5 次/15 分钟）
- 所有 SQL 使用参数化查询防注入
- 生产环境屏蔽 `/debug`、`/test-api`、`/diagnostic` 等调试路由（`src/middleware.ts`）

## 文档

完整项目文档位于 [docs/](docs/)，入口索引见 [docs/README.md](docs/README.md)。

## 个人微信

扫码加入微信交流群，获取最新动态与技术支持：

![微信交流群二维码](wechat-community-qrcode.jpg)

## 许可证

本报告及其所含全部内容（包括但不限于文字、图表、代码示例、数据分析结论、架构设计描述等）的版权归 **落尘** 所有，保留一切权利。未经书面授权，任何单位与个人不得以任何形式复制、转载、摘编、镜像或用于商业用途。

- **开发者：** 落尘
- **联系邮箱：** [364301747@qq.com](mailto:364301747@qq.com)
- **报告版本：** 1.0
- **生成日期：** 2026-07-07
- **项目名称：** 印刷生产经营信息管理系统 Print MIS

> 最后更新：2026-07-07
