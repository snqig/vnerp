# 印刷生产经营信息管理系统 Print MIS

[![CI](https://github.com/snqig/vnerp/actions/workflows/ci.yml/badge.svg)](https://github.com/snqig/vnerp/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](#许可证)

> 印刷生产经营信息管理系统 Print MIS — 基于 Next.js 16 + DDD + Drizzle ORM 的印刷行业综合管理系统，支持中文（简/繁）、英文、越南语四语言国际化。

## 目录

- [快速开始](#快速开始)
  - [环境要求](#环境要求)
  - [安装与启动](#安装与启动)
  - [常用命令](#常用命令)
- [技术栈](#技术栈)
- [架构与模块](#架构与模块)
  - [DDD 分层架构](#ddd-分层架构)
  - [业务模块](#业务模块)
  - [多币种支持](#多币种支持)
- [国际化 i18n](#国际化-i18n)
- [数据库与部署](#数据库与部署)
  - [数据库初始化](#数据库初始化)
  - [Docker 部署](#docker-部署)
  - [环境变量](#环境变量)
- [安全说明](#安全说明)
- [提交规范与 CI/CD](#提交规范与-ci-cd)
- [文档](#文档)
- [许可证](#许可证)

## 快速开始

### 环境要求

- Node.js 20+
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

| 命令                       | 说明                                                |
| -------------------------- | --------------------------------------------------- |
| `pnpm dev`               | 启动开发服务器（端口 5000，Turbopack）              |
| `pnpm build`             | 生产构建                                            |
| `pnpm start`             | 启动生产服务器                                      |
| `pnpm lint`              | ESLint 检查（含 `i18n/no-chinese-hardcode` 规则） |
| `pnpm ts-check`          | TypeScript 类型检查                                 |
| `pnpm test:unit`         | Vitest 单元测试（watch 模式）                       |
| `pnpm test:unit:run`     | Vitest 单元测试（单次运行）                         |
| `pnpm test:coverage`     | 单元测试 + 覆盖率报告                               |
| `pnpm test`              | Playwright E2E 测试                                 |
| `pnpm setup:db --seed`   | 数据库初始化 + 种子数据                             |
| `pnpm setup:db`          | 数据库初始化（建表）                                |
| `pnpm migrate`           | 执行数据库迁移                                      |
| `pnpm migrate:status`    | 查看迁移状态                                        |
| `pnpm db:studio`         | Drizzle Studio 可视化管理                           |
| `pnpm i18n:check`        | i18n key 缺失校验                                   |
| `pnpm i18n:check:strict` | i18n key 校验（CI 卡点模式，缺失则失败）            |
| `pnpm backup`            | 数据库备份                                          |

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
│   ├── hr/              # 人力资源领域
│   └── standard-card/   # 标准卡领域
├── application/         # 应用层：应用服务 + 事件处理器
│   ├── handlers/        # 审计/缓存失效/财务凭证/库存同步/二维码
│   └── services/        # 入库应用服务、看板数据服务
├── infrastructure/      # 基础设施层：MySQL 仓储、事件总线、缓存
├── app/[locale]/        # 表现层：多语言路由
│   ├── api/             # API 路由（Thin Controller）
│   └── (dashboard)/     # 业务页面
├── components/ui/       # shadcn/ui 基础组件
├── lib/                 # 工具库（db/auth/fifo/state-machine/hr）
└── i18n/                # next-intl 配置
```

**分层依赖流向**：表现层 → 应用层 → 领域层 ← 基础设施层（依赖倒置）

### 业务模块

| 模块     | 路径前缀        | 说明                                                     |
| -------- | --------------- | -------------------------------------------------------- |
| 看板中心 | `/dashboard`  | 综合仪表盘、CEO/生产/财务/质量/销售/仓库看板             |
| 仓储管理 | `/warehouse`  | 入库、出库、库存、调拨、盘点、批次追溯（多币种）         |
| 生产管理 | `/production` | 工单、排产、领料、退料、MRP                              |
| 销售管理 | `/sales`      | 发货、对账、退货（多币种）                               |
| 采购管理 | `/purchase`   | 采购订单、申请、供应商、退换货（多币种）                 |
| 印前管理 | `/dcprint`    | 刀模、油墨、网版、工艺卡、追溯                           |
| 质量管理 | `/quality`    | 来料/过程/成品检验、SPC、SGS、客诉                       |
| 设备管理 | `/equipment`  | 校准、维护、维修、报废                                   |
| 财务管理 | `/finance`    | 应收应付、成本、报表（多币种）                           |
| 人力资源 | `/hr`         | 员工、考勤、薪资核算（计件/绩效/加班/社保/个税）、培训   |
| 打样管理 | `/sample`     | 样品订单、标准色卡                                       |
| 系统设置 | `/settings`   | 组织架构、用户、角色、菜单、字典、配置、日志、币种、汇率 |

完整接口清单见 [docs/10-接口文档/API.md](docs/10-接口文档/API.md)。

### 多币种支持

系统支持多币种业务处理（Phase 2b 已完成），覆盖采购、销售、仓储、财务四大模块：

- **币种管理**：`/settings/currency` — 币种 CRUD（代码、名称、符号、小数位）
- **汇率管理**：`/settings/exchange-rate` — 汇率 CRUD 与历史记录
- **双币种显示**：`MoneyDisplay` 组件同时展示原币种与本位币金额
- **领域层**：`CurrencySnapshot` 不可变值对象，记录下单时的汇率快照
- **数据迁移**：迁移脚本 064-068 已添加多币种字段并回填历史数据

设计文档详见 [docs/superpowers/specs/](docs/superpowers/specs/)。

### HR 人力资源模块

人力资源模块已从基础员工档案管理升级为**制造型印刷企业薪酬核算引擎**：

**核心功能**：
- **组织架构**：6 级组织树（集团→法人主体→工厂→车间→班组→岗位）
- **员工档案**：入职/调岗/离职/返聘全生命周期管理
- **排班考勤**：班次定义、排班计划、打卡记录与统计
- **薪酬核算**：计件工资、加班费、绩效评分、社保公积金、个税累计预扣
- **培训认证**：技能矩阵、证书管理、到期预警、培训记录
- **报表分析**：人工成本、薪酬结构、离职率分析

**薪酬核算引擎架构**：

```
前端 (shadcn/ui) → API Routes → 薪酬核算引擎 → Drizzle ORM → MySQL
                                  ├── piece-calculator.ts    — 计件工资
                                  ├── overtime-calculator.ts — 加班费
                                  ├── performance-calculator.ts — 绩效评分
                                  ├── insurance-calculator.ts — 社保公积金
                                  ├── tax-calculator.ts      — 个税累计预扣
                                  └── salary-engine.ts       — 核算引擎入口
```

**关键特性**：
- 计件工资：支持印刷行业多工序、多工价核算，与 MES 数据同步
- 加班计算：1.5/2/3 倍倍率，按法定节假日自动匹配
- 个税计算：累计预扣预缴法，支持专项附加扣除
- 批量核算：全月一键批量核算，核算-确认-发放三级工作流
- MES 集成：产量数据、不良率自动拉取

## 国际化 i18n

项目支持四种语言，路由前缀策略为 `as-needed`（zh-CN 无前缀）：

| 语言             | locale    | 路由示例             |
| ---------------- | --------- | -------------------- |
| 简体中文（默认） | `zh-CN` | `/dashboard`       |
| 繁体中文         | `zh-TW` | `/zh-TW/dashboard` |
| 英文             | `en`    | `/en/dashboard`    |
| 越南语           | `vi`    | `/vi/dashboard`    |

**开发约束**：UI 文本必须通过 `useTranslations` Hook 读取，禁止硬编码中文。ESLint 自定义规则 `i18n/no-chinese-hardcode` 会在提交时自动检测。

**i18n key 校验**：

```bash
node scripts/i18n-key-check.mjs    # 检查代码引用的 key 是否在 messages 中存在
node scripts/i18n-key-check.mjs --strict   # CI 卡点模式
node scripts/i18n-key-check.mjs --unused   # 报告未使用的孤立 key
```

## 数据库与部署

### 数据库初始化

两条初始化路径：

| 场景              | 命令                                  | 说明                                                                                                                        |
| ----------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 首次搭建/重置     | `pnpm setup:db --seed`              | 执行 `database/vnerpdacahng_schema.sql`（含 CREATE DATABASE IF NOT EXISTS / INSERT IGNORE 容错），建表 + 种子数据           |
| 迭代开发改 schema | `pnpm setup:db` → `pnpm migrate` | 基于 `src/lib/db/schema.ts` 执行数据库迁移                                                                                |

- **ORM**：Drizzle ORM 0.45，schema 定义在 `src/lib/db/schema.ts`
- **可视化**：`pnpm db:studio` 启动 Drizzle Studio

> ⚠️ `vnerpdacahng_schema.sql` 与 `schema.ts` 目前存在表名不一致，详见 [docs/03-技术规范/已知问题.md](docs/03-技术规范/已知问题.md) DATA-001。

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
- API 通过 JWT (jose) 鉴权，支持 401 无感刷新（并发锁防重复刷新）
- 登录限流（IP 维度 15 分钟 20 次）+ 失败锁定（5 次/15 分钟）
- 所有 SQL 使用参数化查询防注入
- 生产环境屏蔽 `/debug`、`/test-api`、`/diagnostic` 等调试路由

## 提交规范与 CI/CD

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

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

### 提交门禁

| Hook           | 作用                                         |
| -------------- | -------------------------------------------- |
| `pre-commit` | lint-staged 对暂存文件运行 ESLint + Prettier |
| `commit-msg` | commitlint 校验提交信息格式                  |

### CI 流水线

GitHub Actions 流水线（[.github/workflows/ci.yml](.github/workflows/ci.yml)）：

1. **lint** — ESLint 检查
2. **ts-check** — TypeScript 类型检查
3. **test:coverage** — Vitest 单元测试 + 覆盖率（阈值 80%）
4. **e2e-test** — Playwright E2E 测试
5. **build** — Next.js 构建（仅 `main` 分支）

## 文档

完整项目文档位于 [docs/](docs/)，入口索引见 [docs/README.md](docs/README.md)。

工具脚本说明见 [scripts/README.md](scripts/README.md)，涵盖数据库管理、i18n 工具、部署脚本、诊断调试等 9 大类脚本。

## 许可证

本报告及其所含全部内容（包括但不限于文字、图表、代码示例、数据分析结论、架构设计描述等）的版权归 **落尘** 所有，保留一切权利。未经书面授权，任何单位与个人不得以任何形式复制、转载、摘编、镜像或用于商业用途。

- **开发者：** 落尘
- **联系邮箱：** [364301747@qq.com](mailto:364301747@qq.com)
- **报告版本：** 1.0
- **生成日期：** 2026-07-07
- **项目名称：** 印刷生产经营信息管理系统 Print MIS

> 最后更新：2026-07-20