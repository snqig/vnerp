# Release Notes — 2026-07-08

> **版本**: v0.2.0
> **提交**: `e3b0e5d` feat(erp): 安全加固+DB迁移统一+Docker部署+CI/CD自动化+监控告警+文档完善
> **变更规模**: 539 文件，+82,098 / -28,878 行
> **上一版本**: v0.1.0 (`87e7365` P0-4权限补全+DB外键补齐+并发测试恢复+采购模块测试)

---

## 概述

本次迭代为 VNERP（越南达昌科技 ERP）系统的综合性工程治理版本，围绕 **安全加固、数据库统一、容器化部署、CI/CD 自动化、监控告警、文档完善、代码重构与项目清理** 八大主题展开。完成了从开发到部署运维的完整 DevOps 闭环建设，建立了生产级 Docker 部署 + GitHub Actions 自动发布流水线 + Prometheus/Grafana 监控告警体系。

---

## 一、安全加固（P0 级）

### 1.1 SQL 注入修复（5 处）

| 文件 | 问题 | 修复方式 |
|------|------|----------|
| `src/lib/soft-delete.ts` | 动态表名字符串拼接 | `mysql2.escapeId()` + `assertValidIdentifier()` 白名单校验 |
| `src/application/services/MaterialLifecycleService.ts` | id 未参数化 | `?` 占位符参数化查询 |
| `src/app/api/dcprint/process-cards/route.ts` | 动态字段名字符串拼接 | `fieldColumnMap`（camelCase→snake_case 显式映射）+ `escapeId()` |
| `src/app/api/quality/incoming/route.ts` | `UPDATE...WHERE IN(SELECT...)` | 改写为 `JOIN UPDATE`（安全+性能） |
| `src/app/api/warehouse/inbound/labels/route.ts` + `cutting/route.ts` | LIMIT/OFFSET 字符串拼接 | `?` 占位符 + `params` 数组展开 |

### 1.2 权限与认证

- **diagnose 路由加固**: 9 个 `/api/diagnose/*` 路由补充 `withPermission` 权限装饰器，防止 DB schema 泄露
- **ApiClient 合并**: `api-client.ts` 中的平行 auth 实现合并至 `authFetch`，6 个消费页面获得 401 静默刷新 + CSRF 保护
- **shadow authFetch 修复**: `finance/cost` 页面移除局部 `authFetch` 定义，恢复 CSRF + refresh
- **Cookie 迁移 Phase 1**: `extractToken()` 支持 HttpOnly cookie 回退，API 路由同时支持 localStorage（header）和 cookie 两种认证模式

### 1.3 ESLint 配置修复

- 修复 `eslint.config.mjs` 语法错误（`defineConfig([` 未正确闭合导致 ESLint 9.39.4 崩溃）
- 降级 `react-hooks/set-state-in-effect` 为 warning（新规则对已有 useEffect+fetch 模式误报）

---

## 二、数据库迁移（020-045）

### 2.1 迁移概览

本次新增 **26 个迁移脚本**（020-045），覆盖 schema 统一、PK 类型对齐、外键补齐、业务字段扩展四大类。

### 2.2 详细清单

| 迁移 | 类型 | 内容 |
|------|------|------|
| 020 | Schema 统一 | QC 不合格品表 schema 对齐 |
| 021 | Schema 统一 | QC 不合格品表增加 update_by + FK |
| 022 | Schema 统一 | 全库 collation 统一为 utf8mb4 |
| 023 | Schema 统一 | 软删除字段统一（is_deleted/deleted_at） |
| 024 | Schema 统一 | 小数精度统一（DECIMAL(15,4)） |
| 025 | Schema 统一 | 审计字段统一（create_by/update_by/create_time/update_time） |
| 026 | Schema 统一 | 补齐缺失审计字段 |
| 027 | PK 类型 | 采购模块 INT→BIGINT UNSIGNED |
| 028 | PK 类型 | 总账/系统模块 INT→BIGINT UNSIGNED |
| 029 | 外键约束 | P0 核心外键补齐 |
| 030 | 外键约束 | P1 RBAC 主从表外键补齐 |
| 031 | 外键约束 | 仓库模块外键补齐 |
| 032 | 外键约束 | 销售/生产/物料/成本外键补齐 |
| 033 | 外键约束 | 系统/客户/供应商/财务/质量外键补齐 |
| 034 | 外键约束 | 自引用外键 + 代码适配校验 |
| 035 | 新表 | sys_notification 通知表 |
| 036 | 修复 | 组织/角色/入库/标签 schema 修复 |
| 037 | 业务迁移 | 采购订单状态字段迁移 |
| 038 | 新表 | sys_calc_param 计算参数表 |
| 039 | 业务扩展 | 销售税费/折扣字段 |
| 040 | 业务扩展 | AQL 抽样字段 |
| 041 | Schema 统一 | BOM 表统一 |
| 042 | 修复 | 027 重复 FK 静默失败修复（drop 双 FK 后 ALTER） |
| 043 | PK 类型 | P0 缺口：inv_inbound + pur_purchase_order *_by + pur_purchase_return/reconciliation UNSIGNED |
| 044 | PK 类型 | sys_user 级联：20 FK + 6 非外键审计列 |
| 045 | 数据清理 | 删除 demo/demo_crud 菜单（含角色关联） |

### 2.3 关键经验

- **迁移 027 静默失败**: `pur_purchase_order_line` 存在两个 FK（`fk_pur_line_po` + 遗留 `pur_purchase_order_line_ibfk_1`），027 只 drop 了一个，导致 ALTER 静默失败。042 通过 drop 双 FK 修复。
- **迁移 044 过度声明**: 7 个 FK 在 DB 中实际不存在（列未创建），`ADD CONSTRAINT` 无列存在保护。后续迁移需增加列存在性检查。
- **教训**: PK 类型迁移前必须查询 `INFORMATION_SCHEMA.KEY_COLUMN_USAGE` 审计所有 FK（含自动生成的 `*_ibfk_N`），避免静默失败。

---

## 三、Docker 容器化部署

### 3.1 Dockerfile

- 多阶段构建（deps → builder → runner），最终镜像基于 `node:20-alpine`
- `output: 'standalone'` 模式，`CMD ["node", "server.js"]`（非 `next start`）
- 非 root 用户 `nextjs`（UID 1001）运行
- 最终镜像约 150MB

### 3.2 docker-compose.prod.yml

| 服务 | 镜像 | 端口 | 安全措施 |
|------|------|------|----------|
| nginx | `nginx:1.27-alpine` | 80, 443 | SSL 终结 + 限流 + 安全头 |
| app | `ghcr.io/snqig/vnerp:latest` | 5000（内部） | `read_only: true` + tmpfs + cap_drop ALL |
| mysql | `mysql:8.0` | 3306（expose） | bind mount 数据卷 |
| redis | `redis:7-alpine` | 6379（expose） | named volume |

### 3.3 安全加固

- MySQL/Redis 从 `ports` 改为 `expose`（仅内部网络可访问）
- App 容器 `read_only: true` + tmpfs `/tmp` + `app_cache` volume
- Nginx 新增 `Content-Security-Policy` 头
- `.dockerignore` 排除 `*.pem`/`*.key`/`*.crt` 密钥文件
- `cap_drop: ALL` + `cap_add: NET_BIND_SERVICE` + `no-new-privileges: true`

### 3.4 安全扫描报告

- 11 项发现：1 HIGH + 3 MEDIUM + 4 LOW + 3 INFO
- 3 项已修复（端口暴露、CSP 头、read_only 文件系统）
- 综合评分：B+（85/100）
- 报告位置：`docs/04-运维指南/Docker安全扫描报告.md`

---

## 四、CI/CD 自动化

### 4.1 流水线架构

```
push to main
    │
    ▼
unit-test (lint + ts-check + vitest 覆盖率卡点)
    │
    ▼
e2e-test (Playwright 全量 E2E)
    │
    ▼
docker-publish (构建 → 推送 ghcr.io/snqig/vnerp)
    │  标签：sha-<git>, latest, YYYYMMDD
    ▼
deploy (SSH → git pull → docker compose pull → up -d → 健康检查)
```

### 4.2 关键特性

- **GHCR 镜像仓库**: 使用 `GITHUB_TOKEN` 认证，无需额外 Secret
- **三标签策略**: `sha-<git-sha>`（精确追溯）、`latest`（生产部署）、`YYYYMMDD`（日期归档）
- **GHA 缓存**: `cache-from: type=gha` + `cache-to: type=gha,mode=max` 加速构建
- **SSH 自动部署**: `appleboy/ssh-action` 登录服务器执行滚动更新
- **健康检查**: 部署后等待 15 秒检查容器健康状态，通过则清理旧镜像
- **环境保护**: `environment: production` 支持人工审批 + 分支限制

### 4.3 所需 GitHub Secrets

| Secret | 说明 |
|--------|------|
| `DEPLOY_HOST` | 生产服务器 IP |
| `DEPLOY_USER` | SSH 用户名 |
| `DEPLOY_SSH_KEY` | SSH 私钥 |
| `DEPLOY_PORT` | SSH 端口（可选，默认 22） |
| `DEPLOY_PATH` | 部署路径（可选，默认 /opt/vnerp） |

---

## 五、监控告警（Prometheus + Grafana）

### 5.1 监控架构

4 层监控模型：
1. **主机层**: node-exporter（CPU/内存/磁盘）
2. **数据库层**: mysqld-exporter（连接数/慢查询）
3. **缓存层**: redis-exporter（内存/命中率）
4. **应用层**: blackbox-exporter（HTTP 健康探针）

### 5.2 服务清单

| 服务 | 端口 | 说明 |
|------|------|------|
| Prometheus | 9090 | 指标采集与存储 |
| Alertmanager | 9093 | 告警路由与通知 |
| Grafana | 3001 | 可视化面板 |
| node-exporter | 9100 | 主机指标 |
| mysqld-exporter | 9104 | MySQL 指标 |
| redis-exporter | 9121 | Redis 指标 |
| blackbox-exporter | 9115 | HTTP 探针 |

### 5.3 告警规则（10 条）

- **应用**: AppDown
- **基础设施**: MySQLDown, RedisDown, HighCPU, DiskSpaceLow, HighMemory
- **数据库**: MySQLHighConnections, MySQLSlowQueries
- **缓存**: RedisHighMemory, RedisLowHitRate

### 5.4 推荐 Grafana Dashboard

| ID | 面板 | 用途 |
|----|------|------|
| 1860 | Node Exporter Full | 主机监控 |
| 7362 | MySQL Overview | 数据库监控 |
| 11835 | Redis Dashboard | 缓存监控 |
| 1270 | Blackbox Exporter | HTTP 探针 |

---

## 六、文档完善

### 6.1 文档结构重组

| 变更 | 说明 |
|------|------|
| 新建 `docs/13-分析报告/` | 归档 9 份散落报告（含 README 索引） |
| 合并 `04-部署文档` → `04-运维指南` | 解决 04 重复编号，9 文件统一索引 |
| 合并 `02-设计文档` → `02-模块详细设计` | 消除空目录 |

### 6.2 新增文档

| 文档 | 内容 |
|------|------|
| `04-运维指南/Docker部署指南.md` | 完整 Docker 部署指南 + CI/CD 自动化部署章节 |
| `04-运维指南/Docker安全扫描报告.md` | 11 项安全发现与加固记录 |
| `04-运维指南/监控告警接入方案.md` | Prometheus + Grafana 4 层监控方案 |
| `13-分析报告/README.md` | 分析报告目录索引 |

### 6.3 文档修正

- `00-运维指南总览.md`: 9 文件索引，修正 `drizzle/` 失效引用
- `docs/README.md`: 去除重复 04 行，更新描述与日期
- `.github/workflows/ci.yml`: 修正 docs 路径引用

---

## 七、代码重构

### 7.1 warehouse/inbound 拆分（2902 行 → 模块化）

| 类型 | 数量 | 说明 |
|------|------|------|
| Hooks | 6 | useInboundData, useInboundDialogs, useCutting, usePrintLabels, usePurchaseOrderSearch |
| 子组件 | 12 | InboundDialogs, InboundStatsCards, InboundToolbar + 9 个 Dialog |
| Utils | 2 | generatePrintContent, mapRecordsToLabels |
| 单元测试 | 7 | 覆盖全部 hooks + utils |

### 7.2 Drizzle 仓储实现

- `RepositoryRegistry` 支持通过 `REPOSITORY_IMPL` 环境变量切换 mysql/drizzle
- `DrizzlePurchaseOrderRepository` + `DrizzleSalesOrderRepository` 实现
- SQL 日志记录支持

### 7.3 质量管理领域层

- `UnqualifiedProduct` 聚合根
- `InspectionRecord` 实体
- `HandleMethod` + `UnqualifiedStatus` 值对象
- `UnqualifiedEvents` 领域事件
- `IUnqualifiedRepository` 接口 + `MysqlUnqualifiedRepository` 实现
- 3 个单元测试文件

### 7.4 错误边界

- 20 个 `error.tsx` 错误边界组件（覆盖所有路由段）
- `global-error.tsx` 全局兜底
- `ErrorFallback` 通用错误回退组件
- `not-found.tsx` 404 页面

### 7.5 其他

- 全局导入导出服务（`global-export-service.ts` + `global-import-service.ts`）
- 菜单树服务（`menu-service.ts` + `menu-tree.ts`）
- AQL 抽样服务（`aql-service.ts`）
- 计算参数服务（`calc-param-service.ts`）
- Decimal 精度工具（`decimal-utils.ts`）

---

## 八、i18n 国际化

- 4 语言（zh-CN / zh-TW / en / vi）翻译补全
- 服务端（`src/i18n/request.ts`）+ 客户端（`IntlProvider.tsx`）missing key 日志
- Set 去重 + 诊断脚本指引（`diagnose_i18n_keys.mjs`）

---

## 九、项目清理

### 9.1 删除的文件（40+）

| 类别 | 文件 |
|------|------|
| Demo 文件 | `database/seeds/demo_seed_data.sql`, `database/seeds/seed.js`, `button-demo/page.tsx` |
| 废弃迁移 | `migrations/0001-0004` + `DEPRECATED.md`, `drizzle/` 整个目录 |
| 归档脚本 | `database/_archive/` 9 个一次性 SQL 执行脚本 |
| 测试产物 | `tests/concurrency/reports/` 17 个 JSON 文件 |
| 临时文件 | `tsc-errors.txt`, `nul`（Windows 保留文件名）, HTML 报告 |
| 调试路由 | `debug/inbound`, `diagnostic`, `test-api`, `test`, `api/debug/schema`, `api/test` |

### 9.2 .gitignore 更新

- 新增 `/review_results.json`（临时分析产物）
- 新增 `/tests/concurrency/reports/`（并发测试报告）

---

## 十、性能数据

### 生产模式页面加载速度（TTFB）

| 页面 | TTFB | Full Load |
|------|------|-----------|
| 仪表盘 | 33ms | 83ms |
| 用户管理 | 34ms | 85ms |
| 角色管理 | 36ms | 87ms |
| 菜单管理 | 32ms | 83ms |
| 系统设置 | 30ms | 78ms |

> 对比 Dev 模式首次访问 2-9 秒，生产模式提升 60-280 倍。

---

## 升级指南

### 从 v0.1.0 升级到 v0.2.0

1. **拉取最新代码**
   ```bash
   git pull origin main
   pnpm install --frozen-lockfile
   ```

2. **执行数据库迁移**（020-045）
   ```bash
   pnpm db:migrate
   ```

3. **生产环境 Docker 部署**
   ```bash
   # 配置环境变量
   cp .env.production.example .env.production
   vim .env.production

   # 放置 SSL 证书
   mkdir -p nginx/ssl
   cp cert.pem key.pem nginx/ssl/

   # 一键启动
   ./scripts/deploy-docker.sh up
   ```

4. **配置 CI/CD**（可选）
   - 在 GitHub 仓库 Settings → Secrets 配置 `DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`
   - 推送到 main 分支即自动构建部署

5. **配置监控**（可选）
   ```bash
   docker compose -f docker-compose.monitoring.yml up -d
   ```

---

## 已知问题与后续计划

| 项目 | 状态 | 说明 |
|------|------|------|
| ESLint 28 个 error | 待修复 | React 19 严格规则（react-hooks/static-components 等），需逐一重构 |
| Cookie 迁移 Phase 2 | 计划中 | NEXT_PUBLIC_AUTH_COOKIE_MODE Feature Flag + 完整 cookie 模式 |
| hr/employee 拆分 | 待执行 | 2156 行，Sprint B.2 |
| 仓库管理 FIFO + 批次追溯 | 待开发 | 核心业务逻辑 |
| 生产管理调度算法 + MRP | 待开发 | 核心业务逻辑 |
| 质量管理 SPC 统计分析 | 待开发 | 核心业务逻辑 |
| 移动端适配 | 待开发 | 仓库扫码 + 车间报工 |

---

## 贡献者

- VNERP 开发团队

---

> 发布日期：2026-07-08
> 仓库：https://github.com/snqig/vnerp
