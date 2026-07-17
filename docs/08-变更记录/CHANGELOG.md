# 变更记录

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/) 格式。

## [Unreleased]

### 新增
- 多币种功能 Phase 2b：销售/库存/财务模块支持多币种显示（`7140afd`）
- 财务模块：应收/应付/收款/付款支持多币种字段（`41aab94`）
- 销售模块：销售订单/配送/退货/对账页面支持多币种展示（`7140afd`）
- 仓储模块：入库/出库页面支持多币种展示（`7140afd`）
- API 路由：`/api/orders/sales`、`/api/finance/payment`、`/api/finance/receipt`、`/api/warehouse/inbound`、`/api/warehouse/outbound` 支持多币种
- 数据库迁移脚本 066-068：添加多币种字段并回填历史数据
- Git 配置优化脚本：`scripts/setup-git-config.ps1` 和 `scripts/setup-git-config.sh`，解决网络连接问题
- 测试文档体系重写：00-测试文档总览、测试指南、测试用例模板、测试笔记、测试工具说明、全链路测试方案（基于 `vitest.config.ts` 与 `playwright.config.ts` 现状）
- 数据库文档重写：数据库关系、数据库架构、领域事件 Outbox（基于 `src/lib/db/schema.ts` 与 `src/infrastructure/event-bus/`）
- 变更记录目录 README，明确目录用途与版本号规则

### 修复
- 测试文档与实际配置对齐（Vitest 4 + Playwright 1.58，覆盖率阈值 lines 45 / functions 70 / branches 35 / statements 45）
- 文档中端口、目录、命令与 `package.json` 脚本对齐

## [0.2.0] - 2026-06

### 新增
- 标准化工程治理与质量门禁（`9f7250e`）
- 渐进式覆盖率卡点配置（`5c9d002`）
- inventory-sync 乐观锁改造与并发冲突测试（`21ef3c6`）
- P0 架构加固：事件总线持久化与 Drizzle 修复（`876f911`）
- 生产 Docker 多阶段构建与环境分离（`7d90528`）
- 标准 GitHub 项目模板（CODEOWNERS、PR 模板、Issue 模板）（`4ea523c`）
- Drizzle schema 从 PostgreSQL 迁移到 MySQL dialect（`dcbe133`）
- 仓库入库 5 个核心查询的 Drizzle 迁移示例（`1c5a346`）
- 注册与修改密码接口限流（`db3dd95`）
- warehouse 模块多语言硬编码修复与检查工具（`7ae51ee`）

### 修复
- 测试断言对齐与补测 inventory-sync / warehouse-core（`9a9081d`）
- `next.config.ts` 安全加固，dev origins 与 CORS 走环境变量（`70fac01`）
- warehouse 模块 inbound/outbound/stocktaking 页面 i18n 缺失翻译补齐（`f9f3282`）
- 二维码页面 Tabs 布局与 i18n 清理（`26fecb4`）

### 变更
- 移除仓库根的调试脚本与测试截图（`ccdd091`、`e1c2927`）
- 从仓库移除构建产物并完善 `.gitignore`（`d51c3ed`）

## [0.1.0] - 2026-05-10

### 新增
- 项目初始化（Next.js 15 + App Router 基础架构，后升级至 Next.js 16.1.1）
- MySQL 8.0 数据库 + Drizzle ORM
- JWT 认证与 RBAC 权限系统
- 统一 API 响应格式
- 生产管理模块（工单、报工、标准卡）
- 仓库管理模块（入库、出库、盘点、调拨）
- 采购管理模块（采购申请、采购订单）
- 品质管理模块（来料检验、过程检验、成品检验）
- 销售管理模块（销售订单、发货、退货）
- 财务管理模块（应收应付、成本核算）
- 印刷车间模块（油墨管理、网版管理、二维码追溯）
- 二维码全流程追溯系统
- 物料自动拆分功能
- FIFO 先进先出分配算法

### 修复
- 修复两套报工系统并存问题：统一使用 `prd_work_report`
- 修复两套二维码表未打通：统一使用 `qrcode_record`，添加 `split_flag` / `parent_qr_id`
- 修复冗余盘点/调拨表：统一使用 `inv_stocktaking` 和 `inv_transfer_order`
- 修复冗余财务表：统一使用 `fin_receivable` 和 `fin_payable`
- 修复标准卡表未使用：统一使用 `prd_standard_card`
- 修复 production-inbound 页面 API 错位
- 修复 finance/page.tsx 字段映射错误
- 修复 check-transfer/page.tsx 字段映射和状态码类型错误

### 变更
- 重写 `/api/process-reports` 路由指向 `prd_work_report`
- 重写 `/api/inventory-checks` 路由指向 `inv_stocktaking`
- 重写 `/api/transfers` 路由指向 `inv_transfer_order`
- 重写 `/api/finance/accounts-receivable` 路由指向 `fin_receivable`
- 重写 `/api/finance/accounts-payable` 路由指向 `fin_payable`
- 更新 `auto-material-split.ts`、`fifo-allocation.ts`、`material-splits/route.ts`、`qrcode/trace/route.ts` 使用 `qrcode_record`

## 版本号规则

遵循语义化版本（SemVer）：

```
MAJOR.MINOR.PATCH

MAJOR: 不兼容的 API 变更
MINOR: 向后兼容的功能新增
PATCH: 向后兼容的问题修复
```

> 最后更新：2026-06-30
