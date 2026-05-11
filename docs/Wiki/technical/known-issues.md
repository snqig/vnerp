# 已知问题与解决方案

> 文档编号：VNERP-WIKI-TECH-001 | 版本：V1.0 | 更新日期：2026-05-10

## 已解决

### ARCH-001: 两套报工系统并存

**问题**：`process_reports` 和 `prd_work_report` 功能重叠，API 指向错误的表。

**解决方案**：统一使用 `prd_work_report`，重写 `/api/process-reports` 路由。

**影响范围**：生产报工 API、生产管理页面。

### ARCH-002: 两套二维码表未打通

**问题**：`qr_codes`（拆分场景）和 `qrcode_record`（主追溯）数据不互通。

**解决方案**：给 `qrcode_record` 添加 `split_flag` 和 `parent_qr_id` 字段，统一使用 `qrcode_record`。

**影响范围**：物料拆分、FIFO 分配、二维码追溯。

### ARCH-003: 冗余盘点/调拨表

**问题**：`inventory_checks` vs `inv_stocktaking`、`transfers` vs `inv_transfer_order` 冗余。

**解决方案**：统一使用 `inv_stocktaking` 和 `inv_transfer_order`，重写 API 路由。

**影响范围**：盘点/调拨 API 和页面。

### ARCH-004: 冗余财务表

**问题**：`fin_accounts_receivable` vs `fin_receivable`、`fin_accounts_payable` vs `fin_payable` 冗余。

**解决方案**：统一使用 `fin_receivable` 和 `fin_payable`，重写 API 路由。

**影响范围**：财务 API 和页面。

### ARCH-005: 标准卡表未使用

**问题**：`standard_cards` 四张明细表存在但代码中几乎无读写。

**解决方案**：统一使用 `prd_standard_card` 及其明细表。

**影响范围**：标准卡 API 和页面。

## 待解决

### PERF-001: 大数据量查询性能

**问题**：部分列表查询在数据量增大时响应缓慢。

**临时方案**：添加分页限制（默认 20 条/页）。

**计划方案**：添加数据库索引、优化 SQL 查询、引入缓存。

### AUTH-001: Token 刷新机制

**问题**：当前 JWT Token 过期后需重新登录，无刷新机制。

**临时方案**：设置较长过期时间（2小时）。

**计划方案**：实现 Refresh Token 机制。
