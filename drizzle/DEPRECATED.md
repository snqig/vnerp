# DEPRECATED — Drizzle Kit 迁移目录

此目录已废弃，不再用于数据库迁移。

## 原因

`0000_chilly_retro_girl.sql` 和 `0001_ordinary_valkyrie.sql` 使用扁平表名（如 `customers`、`work_orders`），与权威 schema `database/vnerpdacahng_schema.sql` 的模块前缀命名（如 `crm_customer`、`prd_work_order`）零交集。运行这些迁移会创建大量与生产 schema 不匹配的表。

## 正确的迁移路径

| 场景 | 命令 | 说明 |
|------|------|------|
| 全量初始化（新环境） | `pnpm setup:db` | 执行 `vnerpdacahng_schema.sql` + seeds |
| 增量迁移（版本迭代） | `pnpm migrate` | 执行 `database/migrations/*.sql` |
| 查看迁移状态 | `pnpm migrate:status` | 检查已执行/待执行迁移 |

## Drizzle ORM

`src/lib/db/schema.ts` 仍保留 Drizzle ORM 表定义（仅 ORM 实际消费的表），但不再通过 `drizzle-kit generate/push` 生成迁移。ORM 查询仍可正常使用。
