# 变更记录

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/) 格式。

## [Unreleased]

### 新增
- 待发布特性预留

## [0.3.1] - 2026-07-15

### 新增
- **生产环境强制 Redis/DB 模式**：新增 3 个测试用例验证生产模式行为（`rate-limit-production.test.ts`、`cache-manager-production.test.ts`、`event-bus-production.test.ts`）
- **BaseRepository 类型安全增强**：支持自定义列名参数，SQL 标识符转义，兼容字符串/数字状态值

### 修复
- **RUN-001 限流为进程内内存**：生产环境强制 Redis 计数器，Redis 不可用时快速失败
- **RUN-002 Token 黑名单多实例不同步**：生产环境强制 Redis，禁用内存降级
- **RUN-003 事件总线仅内存/DB 两选**：生产环境强制 `EVENT_BUS_TYPE=db`（Outbox 模式 + Redis Streams）
- **DATA-005 幂等保护 TOCTOU 竞态**：完工入库 Handler 改用 `INSERT IGNORE` + 唯一索引 + 事务包裹
- **INV-001 soft-delete 表名与库存 API 不匹配**：经核查已正确使用 `inv_` 前缀表名

### 优化
- **INV-002 制造费用分摊为硬编码**：优先从事件驱动实际数据读取，配置系数兜底
- **BaseRepository SQL 安全**：所有列名使用反引号转义，防止 SQL 注入

### 变更
- **文档更新**：`docs/03-技术规范/已知问题.md` 标记 DATA-005、INV-001、INV-002、RUN-001、RUN-002、RUN-003 为已解决

## [0.3.0] - 2026-07-15

### 新增
- **印前/打样/生产三模块完善**：完成度从 30%-50% 提升至 75%（23/25 任务）
- **BaseRepository 抽象基类**：消除仓储层重复代码，提供 10 个通用方法（`src/infrastructure/repositories/BaseRepository.ts`）
- **打样转大货订单**：实现 `SampleOrderApplicationService.createSalesOrderFromSample()`，支持一键转量产
- **完工入库事件驱动**：修复 `FinishOrderApprovedEvent` 事件断链，新增 `FinishOrderInventoryHandler`（含幂等保护）
- **新增领域事件**：`ToolUsedEvent`、`ProcessCardConfirmedEvent` 支撑跨模块联动
- **新增测试用例**：24 个测试用例覆盖 Tool 事件、油墨配方事件、工艺卡事件、完工入库幂等性
- **迁移脚本 053-060**：工具列/打样增强、工单累计字段、生产表增强、排程索引、刀模字段扩展、PK 统一 bigint、collation 统一、补缺失索引、状态码统一

### 修复
- **Tool.ts shouldWarn 作用域缺陷**：修正闭包作用域绑定，修复预警逻辑误触发
- **FinishOrderApprovedEvent 事件链断裂**：在 `warehouse/production-inbound/route.ts` 补充事件发布
- **InkFormulaVersion 领域事件缺失**：补全 `_domainEvents` 与事件触发
- **印前模块领域事件集成**：修复 `Tool.ts` 和 `InkFormulaVersion.ts` 的领域事件集成

### 变更
- **测试覆盖提升**：1262 单元测试（68 文件），0 ts-check 错误，0 回归
- **文档更新**：新增印前打样生产模块完善总结报告（`docs/印前打样生产模块完善总结报告-2026-07-14.md`）
- **项目版本升级**：从 v0.1.0 提升至 v0.3.0

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

> 最后更新：2026-07-15
