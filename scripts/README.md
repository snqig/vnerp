# Scripts 目录说明

本目录包含项目的各类工具脚本，按功能分类如下。

---

## 1. Git 配置优化

解决在某些网络环境下推送 GitHub 失败的问题（HTTP/2 不稳定、连接重置等）。

| 脚本 | 说明 |
|------|------|
| `setup-git-config.ps1` | Windows PowerShell 一键配置脚本 |
| `setup-git-config.sh` | Mac/Linux bash 一键配置脚本 |

**配置内容：** HTTP/1.1 协议、500MB 缓冲区、关闭低速限制、延长超时。

```powershell
# Windows
.\setup-git-config.ps1
```

```bash
# Mac/Linux
chmod +x setup-git-config.sh
./setup-git-config.sh
```

如需 SOCKS5 代理：
```bash
git config --global http.proxy socks5://127.0.0.1:3067
git config --global https.proxy socks5://127.0.0.1:3067
```

---

## 2. 数据库管理

### 初始化与迁移

| 脚本 | 说明 |
|------|------|
| `setup-db.mjs` | 数据库初始化（建表 + 可选种子数据），替代 HTTP setup 接口 |
| `migrate.ts` | 迁移管理（up/down/status/history/create） |
| `run-migration.ts` | 单个迁移执行 |
| `run-migration-020.mjs` / `021.mjs` / `047.mjs` | 指定版本迁移执行 |
| `run-pending-migrations.mjs` | 执行所有待执行迁移 |
| `export-schema.mjs` | 导出数据库 schema |
| `analyze-database-tables.ts` / `analyze-tables-static.ts` | 数据库表结构分析 |

**常用命令：**
```bash
pnpm setup:db                 # 仅建表
pnpm setup:db --seed          # 建表 + 种子数据
npx tsx scripts/migrate.ts status    # 查看迁移状态
npx tsx scripts/migrate.ts up        # 执行迁移
npx tsx scripts/migrate.ts create <name>  # 创建新迁移
```

### SQL 脚本

| 脚本 | 说明 |
|------|------|
| `02-add-indexes-and-comments.sql` | 添加索引与注释 |
| `database-optimization.sql` | 数据库优化 |
| `check-data-integrity.sql` | 数据完整性检查 |
| `cleanup-unused-tables.sql` | 清理无用表 |
| `fix_security_issues.sql` | 安全问题修复 |
| `create_*.sql` | 各业务模块建表脚本（BOM、入库、采购、产品、销售、工单等） |
| `seed-mock-data.sql` / `seed-sample-card-mock.sql` | Mock 数据种子 |
| `init_sample_menu.sql` | 示例菜单初始化 |

### 备份与清理

| 脚本 | 说明 |
|------|------|
| `backup-data.ts` / `backup-database.ts` | 数据备份 |
| `db-cleanup.ts` | 数据库清理 |
| `cleanup-duplicate-payable.mjs` | 清理重复应付记录 |
| `cleanup-event-processed.mjs` | 清理已处理事件记录 |
| `reset-event-for-retry.mjs` | 重置事件以重试 |

---

## 3. i18n 国际化工具

### 校验与分析

| 脚本 | 说明 |
|------|------|
| `i18n-key-check.mjs` | **i18n key 缺失校验器**，扫描代码中 tc/t 调用并与 messages 比对（CI 卡点） |
| `i18n-misbound-check.mjs` | 错位 key 检查 |
| `i18n-misbound-categorize.mjs` | 错位 key 分类 |
| `audit-i18n-keys.mjs` | i18n key 审计 |
| `audit-pages-i18n.mjs` / `.py` | 页面 i18n 审计 |
| `analyze-i18n.js` / `analyze-i18n-complete.js` | i18n 分析 |
| `analyze-translation-completeness.js` | 翻译完整性分析 |
| `analyze-used-keys.js` | 已使用 key 分析 |
| `check-hr-keys.js` / `check-hr-usage.js` | HR 模块 i18n 检查 |
| `find-missing-tc-keys.mjs` / `find-missing-tc-v3.mjs` | 查找缺失 tc key |
| `smoke-purchase-sales-i18n.mjs` | 采购销售 i18n 冒烟测试 |

### 自动修复

| 脚本 | 说明 |
|------|------|
| `fix-type-a.mjs` / `fix-type-b.mjs` | 批量修复错位 key（282 个） |
| `fix-tc-calls.cjs` / `fix-tc-quick.mjs` / `fix-tc-scope.js` | tc 调用修复 |
| `fix-tc-from-translations.mjs` / `fix-tc-manual-mappings.mjs` | 基于翻译修复 tc |
| `fix-i18n-imports.js` | i18n 导入修复 |
| `fix-common-keys.js` | 通用 key 修复 |
| `batch-fix-hardcoded.js` | 批量修复硬编码文案 |
| `batch-i18n-migration.js` | 批量 i18n 迁移 |
| `i18n-auto-migrate.js` | i18n 自动迁移 |
| `translate-placeholders.js` | 占位符翻译 |
| `restore-remaining-tc.cjs` | 恢复剩余 tc |

### 同步与报告

| 脚本 | 说明 |
|------|------|
| `sync-translations.js` | 翻译同步 |
| `sync-nav-keys.js` / `sync-nav-zhTW-vi.js` | 导航 key 同步 |
| `update-menu-translations.js` | 菜单翻译更新 |
| `i18n-language-report.js` | 语言报告 |
| `i18n-migration-guide.js` | 迁移指南 |
| `add-common-keys.js` / `add-tc-declaration.js` | 添加通用 key / tc 声明 |
| `extract-tc-context.mjs` | 提取 tc 上下文 |

**i18n 校验用法：**
```bash
node scripts/i18n-key-check.mjs            # 检查缺失 key
node scripts/i18n-key-check.mjs --strict   # CI 卡点模式（缺失则退出码 1）
node scripts/i18n-key-check.mjs --unused   # 同时报告孤立 key
node scripts/i18n-key-check.mjs --json     # JSON 输出（CI 解析）
```

---

## 4. 种子数据

| 脚本 | 说明 |
|------|------|
| `seed-all-data.js` | 全量种子数据 |
| `seed-full-project.cjs` | 完整项目种子 |
| `seed-fullchain-data.mjs` | 全链路种子数据 |
| `seed-fullflow-data.js` | 全流程种子数据 |
| `seed-customers.js` | 客户种子 |
| `seed-attendance.js` | 考勤种子 |
| `seed-dashboard-data.js` | 仪表盘种子 |
| `seed-standard-cards.js` / `.cjs` | 标准卡种子 |
| `insert-mock-data.js` / `-v2.js` / `-v3.js` | Mock 数据（多版本） |
| `insert-test-cards.js` | 测试卡数据 |

---

## 5. 部署与启动

| 脚本 | 说明 |
|------|------|
| `build.sh` | 构建脚本（pnpm install + next build） |
| `deploy-docker.sh` | Docker 部署 |
| `dev.sh` | 开发环境启动 |
| `start.sh` / `start.bat` | 启动脚本 |
| `prepare.sh` | 预处理脚本 |
| `clean-start.bat` | 干净启动 |
| `setup-swagger-ui.cjs` | Swagger UI 配置 |

---

## 6. 诊断与调试

### 性能与登录诊断

`debug-perf/` 子目录包含性能与登录诊断脚本：

| 脚本 | 说明 |
|------|------|
| `debug-perf/check_purchase_status.mjs` | 采购状态检查 |
| `debug-perf/check_schema.mjs` / `check_schema_v2.mjs` | Schema 检查 |
| `debug-perf/diagnose_i18n_keys.mjs` | i18n key 诊断 |
| `debug-perf/dump_page_text.mjs` | 页面文本导出 |
| `debug-perf/repro_login.mjs` | 登录问题复现 |
| `debug-perf/run_migration.mjs` | 迁移执行 |
| `debug-perf/test_db.mjs` | 数据库测试 |
| `debug-perf/test_perf.py` | 性能测试 |
| `debug-perf/time_redis.mjs` | Redis 耗时测试 |
| `debug-perf/verify_all_locales.py` | 多语言校验 |
| `debug-perf/verify_browser.mjs` / `_v2.mjs` | 浏览器校验 |

### 其他诊断

| 脚本 | 说明 |
|------|------|
| `diagnose-login.cjs` | 登录诊断 |
| `check-admin-permissions.ts` | 管理员权限检查 |
| `check-table-columns.mjs` / `check-table-structure*.js` | 表结构检查 |
| `check-tool-tables.mjs` | 工具表检查 |
| `inspect-qc-schema.mjs` | 质量模块 schema 检查 |
| `audit-handler-schema.mjs` | Handler schema 审计 |
| `audit-use-client.mjs` | use client 审计 |

---

## 7. 测试脚本

| 脚本 | 说明 |
|------|------|
| `test-customer.cjs` | 客户测试 |
| `test-ink-formula.mjs` | 油墨配方测试 |
| `test-purchase-inbound-chain.mjs` | 采购入库链路测试 |
| `test-qrcode-i18n.js` | 二维码 i18n 测试 |
| `test-quote-and-workorder.ts` | 报价与工单测试 |
| `test-sales-receivable-handler.ts` | 销售应收 handler 测试 |
| `test-sample-order-flow.mjs` | 样品订单流程测试 |
| `test-standard-card-flow.mjs` | 标准卡流程测试 |
| `test-cleanup-30days.mjs` | 30 天清理测试 |
| `stress-test.ts` | 压力测试 |
| `simulate-dispatching-orphan.mjs` | 模拟派发孤儿消息 |
| `simulate-long-handler-reclaim.mjs` | 模拟长 handler 回收 |
| `simulate-xautoclaim-redelivery.mjs` | 模拟 XAUTOCLAIM 重投递 |
| `verify-chain-results.mjs` | 链路结果验证 |
| `verify-high1-fix.mjs` / `verify-sql-fixes.mjs` | 修复验证 |

---

## 8. 代码修复工具

| 脚本 | 说明 |
|------|------|
| `fix-admin-menus.js` / `fix-admin-role.ts` | 管理员菜单/角色修复 |
| `fix-auth-check.js` / `auto-fix-auth.js` | 认证检查修复 |
| `fix-department-table.ts` / `fix-role-table.ts` | 表结构修复 |
| `fix-suppliers.js` | 供应商修复 |
| `fix-any-to-loose.mjs` | any 类型修复 |
| `fix-catch-any.mjs` / `fix-catch-message.mjs` | catch 修复 |
| `fix-img-element.mjs` | img 元素修复 |
| `fix-permission-imports.ps1` / `fix-permission-options.ps1` | 权限修复 |
| `fix-remaining-ts-errors-v2.mjs` | TS 错误修复 |
| `fix-unused-imports.mjs` / `fix-unused-vars*.mjs` | 未使用导入/变量修复 |
| `fix-td-string-literals.cjs` | TD 字符串字面量修复 |
| `refactor-security-env-vars.mjs` | 安全环境变量重构 |
| `convert-to-withPermission.ps1` | 转换为 withPermission 装饰器 |
| `revert-false-options.ps1` | 回退 false 选项 |

---

## 9. 数据分析与工具

| 脚本 | 说明 |
|------|------|
| `analyze-any-patterns.mjs` | any 模式分析 |
| `analyze-db-relations.js` | 数据库关系分析 |
| `analyze-large-files.js` | 大文件分析 |
| `complete-analysis-report.js` | 完整分析报告 |
| `project-analysis.js` | 项目分析 |
| `generate-api-docs.js` | API 文档生成 |
| `generate-charts.js` | 图表生成 |
| `export-tool-doc-to-pdf.mjs` | 工具文档导出 PDF |
| `reset-password.ts` | 重置密码 |
| `start-redis.mjs` | 启动 Redis |
| `trigger-init.mjs` | 触发初始化 |
| `clear-auth-cache.js` / `clear-cache.js` | 清除缓存 |
| `init-project.js` | 项目初始化 |
| `migrate-hr-employee.js` / `replace-hr-employee.js` | HR 员工迁移 |
| `migrate-purchase-status.mjs` | 采购状态迁移 |
| `project_uploader.js` / `.py` | 项目上传工具 |

---

## 常用命令速查

```bash
# 数据库
pnpm setup:db                          # 初始化数据库
npx tsx scripts/migrate.ts status      # 迁移状态
npx tsx scripts/migrate.ts up          # 执行迁移

# i18n
node scripts/i18n-key-check.mjs --strict  # CI 校验缺失 key

# Git 配置
.\scripts\setup-git-config.ps1            # Windows
bash scripts/setup-git-config.sh          # Mac/Linux

# 构建
bash scripts/build.sh                     # 安装依赖 + 构建

# 开发
bash scripts/dev.sh                       # 启动开发环境
```

---

## 注意事项

1. **脚本执行前**请确认 `.env` 配置正确（DB_HOST、DB_USER 等）
2. **数据库脚本**请在运维环境执行，生产环境需先备份
3. **i18n 修复脚本**执行前建议提交当前工作区，便于回滚
4. **种子数据脚本**仅用于开发/测试环境，禁止在生产执行
5. **Git 全局配置**会影响所有仓库，网络改善后可用 `git config --global --unset <key>` 恢复
