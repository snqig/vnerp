# [DEPRECATED] 此目录已废弃

本目录的 4 个迁移文件已合并至 `database/migrations/`，统一管理：

| 原文件 | 新位置 | 说明 |
|--------|--------|------|
| `0001_add_inventory_alerts.sql` | `database/migrations/008_add_inventory_alerts.sql` | 修正表名 `inventory_batches` → `inv_inventory_batch`，修正列名 `expiry_date` → `expire_date` |
| `0002_add_performance_indexes.sql` | 未迁移 | 引用 7+ 个不存在的表名（`sys_warehouse`/`sample_orders`/`customers` 等），索引已由 `schema.sql` 内联定义。剩余索引规范化由 Phase 1-4 处理 |
| `0003_add_login_security_fields.sql` | `database/migrations/006_add_login_security_fields.sql` | 修正 `ADD COLUMN IF NOT EXISTS`（PostgreSQL 语法）为 MySQL 兼容的 INFORMATION_SCHEMA 守卫 |
| `0004_add_purchase_request_fk_fields.sql` | `database/migrations/007_add_purchase_request_fk_fields.sql` | 原样保留（已具备幂等守卫） |

## 正确的迁移流程

```bash
# 全量初始化（建表 + 自动标记已有迁移为已执行）
pnpm setup:db

# 增量迁移（仅执行新增迁移文件）
pnpx tsx scripts/migrate.ts up

# 查看迁移状态
pnpx tsx scripts/migrate.ts status
```

权威 schema 来源：`database/vnerpdacahng_schema.sql`
