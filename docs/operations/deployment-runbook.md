# 运维部署文档

> 本文档描述 DCPrint ERP 系统的部署流程、环境变量、监控指标与常见故障排查。
> 最后更新: 2026-07-23

## 1. 环境要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18.x | Next.js runtime |
| MySQL | >= 8.0 | 主库，InnoDB + utf8mb4 |
| Redis | >= 7.0 | 可选（缺失降级到 in-memory） |
| Vercel | 支持 Edge Runtime | 托管部署目标 |

## 2. 部署方式

### 2.1 Vercel（推荐）

```bash
vercel link
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add JWT_SECRET
vercel --prod
```

`vercel.json` 已配置 cron:
- `POST /api/admin/archive/qrcode` — 每天 02:00 归档 6+ 月前的二维码记录

### 2.2 本地自托管（Docker Compose TODO）

未来支持的部署方式，当前未实现。

## 3. 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | 是 | — | MySQL 连接串 `mysql://user:pass@host:3306/db` |
| `REDIS_URL` | 否 | — | Redis 连接串 `redis://host:6379` |
| `EVENT_BUS_TYPE` | 否 | `db` | `db` = outbox + poller; `memory` = 同步 in-memory |
| `JWT_SECRET` | 是 | — | JWT 签名密钥 |
| `QR_ARCHIVE_MONTHS` | 否 | `6` | 归档 cron 的过期月数阈值 |
| `QR_ARCHIVE_BATCH_SIZE` | 否 | `5000` | 归档 cron 的每批处理行数 |

## 4. 数据初始化

```bash
# 基础 schema + 补表 + 索引
curl -X POST https://<deploy>/api/init/supplement-tables

# 测试数据生成（仅开发环境）
node scripts/test-data/02-generate-data.mjs
```

`/api/init/supplement-tables` 幂等，可多次执行，包括：
- 新增字段（`qrcode_record.deleted`, `qrcode_record.status` 等）
- 回填数据（`qrcode_record.extra_data` JSON 解析）
- 新增索引（`idx_ref_no`, `idx_material_code`, 等）

## 5. 事件队列监控

### 5.1 查看 Outbox 积压

```sql
SELECT status, COUNT(*) 
FROM domain_event_outbox 
GROUP BY status;
-- pending: 待处理
-- processing: 处理中
-- completed: 已完成
-- failed: 失败（需人工介入）
```

### 5.2 清理已完成记录

```sql
DELETE FROM domain_event_outbox 
WHERE status = 'completed' AND created_at < NOW() - INTERVAL 7 DAY;
```

## 6. Redis 缓存管理

| Key 模式 | TTL | 说明 |
|----------|-----|------|
| `trace:qr:{qrCode}` | 300s | 追溯查询缓存 |
| `cache:inventory:{warehouseId}` | 60s | 盘点缓存 |
| `cache:dashboard:{date}` | 300s | Dashboard 数据 |

手动清理:
```bash
redis-cli --scan --pattern "trace:qr:*" | xargs redis-cli DEL
```

## 7. 归档任务

归档 cron 每天 02:00 执行 `/api/admin/archive/qrcode`:
- 条件: `create_time < NOW() - INTERVAL ? MONTH AND deleted = 0 AND status <> 1`
- 分批: 5000 条/批，最多 1000 批
- 目标: 从 `qrcode_record` 迁移到 `qrcode_record_archive`，标记源记录 `deleted=1`

手动触发:
```bash
curl -X POST https://<deploy>/api/admin/archive/qrcode \
  -H "Authorization: Bearer <admin-token>"
```

## 8. 常见故障排查

### 8.1 Vercel build 失败

检查 `tsc --noEmit` 本地是否通过。常见原因:
- `AuditDialog.tsx` 使用未确认字段（如 `item.batch_no`）
- `withPermission` 调用传入未声明选项（如 `permission` 字段）

### 8.2 Outbox 持续堆积

- 检查 `OutboxPoller` 是否启动（`EVENT_BUS_TYPE=db`）
- 检查 Redis 是否可达（`REDIS_URL` 正确）
- 查看 Vercel logs 是否有 handler 持续抛错

### 8.3 追溯查询慢

- 确认 `qrcode_record` 上 `idx_qr_code` 索引存在
- 检查 Redis 是否开启（`REDIS_URL` 设置）
- 手动清理 `trace:qr:*` 缓存

### 8.4 归档任务报错

- 确认 `qrcode_record_archive` 表存在（由 `/api/init/supplement-tables` 创建）
- 检查归档期间是否有写入并发（归档已加 `deleted=0` 过滤）

## 9. 备份策略

| 类型 | 频率 | 保留 | 说明 |
|------|------|------|------|
| 全量备份 | 每日 | 30 天 | `mysqldump --single-transaction` |
| Binlog | 实时 | 7 天 | MySQL binlog，用于 PITR |
| Redis RDB | 每 6 小时 | 7 天 | `redis-cli BGSAVE` |

恢复步骤:
1. 停止写入（Vercel deploy freeze / maintenance mode）
2. 恢复全量备份
3. 回放 Binlog 到目标时间点
4. 验证 `domain_event_outbox` 无重复
