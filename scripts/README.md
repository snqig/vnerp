# 脚本使用说明

本目录包含项目工程化的各类脚本工具，涵盖项目初始化、数据库管理、代码质量检查、数据迁移等场景。

---

## 目录结构

```
scripts/
├── init-project.js          # 项目一键初始化
├── migrate.ts               # 数据库迁移管理
├── backup-database.ts       # 生产环境数据库备份
├── setup-db.mjs             # 数据库建表脚本（T003）
├── run-migration.ts         # 单次数据库迁移
├── seed-*.js                # 种子数据脚本
├── i18n-*.js                # 国际化相关脚本
├── analyze-*.js             # 代码分析脚本
├── db-cleanup.ts            # 数据库清理工具
├── stress-test.ts           # 压力测试
└── README.md                # 本文档
```

---

## 快速开始

### 1. 项目一键初始化

从零开始搭建整个项目环境（推荐新同事使用）。

```bash
# 生成 .env 配置模板
node scripts/init-project.js --env

# 编辑 .env 配置数据库连接后，执行完整初始化
node scripts/init-project.js --full
```

| 选项 | 说明 |
|------|------|
| `--seed` | 初始化 + 导入种子数据 |
| `--demo` | 初始化 + 导入 Demo 数据 |
| `--full` | 完整初始化（表 + 种子 + Demo + 菜单） |
| `--skip-deps` | 跳过依赖安装 |
| `--env` | 生成 .env 配置模板 |
| `-h, --help` | 显示帮助 |

**默认账号:** `admin / admin123`

---

### 2. 数据库迁移管理

管理数据库 Schema 变更，支持版本化管理和回滚。

```bash
# 查看迁移状态
npx tsx scripts/migrate.ts status

# 执行所有待执行的迁移
npx tsx scripts/migrate.ts up

# 执行前 N 个迁移
npx tsx scripts/migrate.ts up --count 1

# 回滚最后一个迁移
npx tsx scripts/migrate.ts down

# 回滚最后 N 个迁移
npx tsx scripts/migrate.ts down --count 3

# 回滚所有迁移
npx tsx scripts/migrate.ts down --all

# 查看迁移历史
npx tsx scripts/migrate.ts history

# 创建新迁移文件
npx tsx scripts/migrate.ts create add_user_table

# 重置（回滚所有 + 重新执行所有）
npx tsx scripts/migrate.ts reset
```

#### 迁移文件结构

```typescript
// database/migrations/YYYYMMDDHHMMSS_<description>.ts

import { Connection } from 'mysql2/promise';

export async function up(conn: Connection): Promise<void> {
  // 正向迁移：ALTER TABLE / CREATE TABLE 等
}

export async function down(conn: Connection): Promise<void> {
  // 反向回滚：DROP COLUMN / DROP TABLE 等
}
```

**最佳实践:**
- 每个迁移只做一件事
- 始终提供 `down` 回滚逻辑
- 迁移创建后不要修改，如需变更请创建新迁移
- 生产环境执行迁移前务必先备份

---

### 3. 数据库备份与恢复

生产级数据库备份工具，支持压缩、校验、自动清理。

```bash
# 全量备份（默认）
npx tsx scripts/backup-database.ts

# 仅备份表结构
npx tsx scripts/backup-database.ts --structure

# 仅备份数据
npx tsx scripts/backup-database.ts --data-only

# 备份指定的表
npx tsx scripts/backup-database.ts --tables "sys_user,sys_menu"

# 保留指定天数的备份
npx tsx scripts/backup-database.ts --retention 90

# 保留指定数量的备份
npx tsx scripts/backup-database.ts --keep 100

# 备份后验证完整性
npx tsx scripts/backup-database.ts --verify

# 不压缩
npx tsx scripts/backup-database.ts --no-compress

# 指定输出目录
npx tsx scripts/backup-database.ts --output /data/backups

# 预演模式（不实际执行）
npx tsx scripts/backup-database.ts --dry-run

# 列出已有备份
npx tsx scripts/backup-database.ts list

# 从备份恢复
npx tsx scripts/backup-database.ts restore backups/vnerp_2024-01-01.sql.gz
```

#### 备份功能特性

| 特性 | 说明 |
|------|------|
| gzip 压缩 | 默认开启，显著减少磁盘占用 |
| SHA256 校验 | 自动生成校验文件，确保备份完整性 |
| 双策略清理 | 按天数 + 按数量双重清理策略 |
| 预演模式 | `--dry-run` 测试配置 |
| 多种模式 | 全量/仅结构/仅数据/指定表 |
| 恢复验证 | 支持 gzip 文件完整性检查 |

#### 环境变量配置

```bash
# .env 中配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vnerpdacahng
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
BACKUP_KEEP_COUNT=100
```

#### 生产环境定时备份

添加到 crontab 每日凌晨 2 点执行：

```bash
0 2 * * * cd /path/to/project && npx tsx scripts/backup-database.ts >> backup.log 2>&1
```

---

### 4. 数据库建表（快速建表）

轻量级数据库建表脚本，不依赖 Drizzle。

```bash
# 仅建表
pnpm setup:db

# 建表 + 种子数据
pnpm setup:db --seed
```

---

### 5. 国际化（i18n）脚本

#### 硬编码检查

扫描代码中未国际化的硬编码中文字符串。

```bash
# 分析 i18n 使用情况
node scripts/analyze-i18n.js

# 批量迁移硬编码
node scripts/batch-i18n-migration.js
```

#### 菜单翻译同步

```bash
# 导出菜单代码
node scripts/dump-menu-codes.js

# 同步导航翻译
node scripts/sync-nav-keys.js
```

---

### 6. 数据库分析与清理

#### 分析表使用情况

```bash
# 静态分析 API 使用了哪些表
npx tsx scripts/analyze-tables-static.ts
```

#### 数据库清理

```bash
# 查看所有表的数据量统计
npx tsx scripts/db-cleanup.ts stats

# 分析未使用的表
npx tsx scripts/db-cleanup.ts analyze

# 清理所有未使用的空表
npx tsx scripts/db-cleanup.ts cleanup

# 删除指定的表（需要确认）
npx tsx scripts/db-cleanup.ts drop --table crm_customer_contact
```

---

### 7. 数据种子脚本

```bash
# 插入演示数据
node database/seeds/seed.js

# 插入 Mock 数据（全模块）
node scripts/insert-mock-data-v3.js
```

---

## 脚本分类索引

### 项目初始化
| 脚本 | 用途 | 场景 |
|------|------|------|
| `init-project.js` | 一键初始化项目 | 新环境搭建、新同事入职 |
| `setup-db.mjs` | 数据库建表 | 快速重建表结构 |

### 数据库运维
| 脚本 | 用途 | 场景 |
|------|------|------|
| `migrate.ts` | 版本化迁移管理 | 日常 Schema 变更 |
| `backup-database.ts` | 备份与恢复 | 生产备份、灾备 |
| `db-cleanup.ts` | 数据库清理 | 表结构优化、清理 |
| `run-migration.ts` | 单次迁移执行 | 紧急补丁迁移 |
| `analyze-tables-static.ts` | 表使用分析 | 架构优化 |

### 国际化
| 脚本 | 用途 | 场景 |
|------|------|------|
| `analyze-i18n.js` | i18n 覆盖率分析 | 质量检查 |
| `batch-i18n-migration.js` | 批量迁移硬编码 | 批量修复 |
| `dump-menu-codes.js` | 导出菜单代码 | 翻译工作 |
| `sync-nav-keys.js` | 同步导航翻译 | 菜单更新 |

### 数据填充
| 脚本 | 用途 | 场景 |
|------|------|------|
| `seed.js` | 基础种子数据 | 初始化 |
| `insert-mock-data-v3.js` | Mock 测试数据 | 开发测试 |
| `insert-test-cards.js` | 测试卡片数据 | 测试 |

### 压力测试
| 脚本 | 用途 | 场景 |
|------|------|------|
| `stress-test.ts` | API 压力测试 | 性能评估 |

---

## 开发规范

### 编写新脚本

1. **文件命名:** 使用 kebab-case，语义清晰
2. **帮助信息:** 必须支持 `--help` 或 `help` 命令
3. **配置读取:** 优先从 `.env` 读取，支持命令行参数覆盖
4. **错误处理:** 提供清晰的错误信息和排错指引
5. **预演模式:** 涉及破坏性操作的脚本必须支持 `--dry-run`

### 脚本模板

```typescript
/**
 * 脚本功能简述
 *
 * 用法:
 *   npx tsx scripts/your-script.ts [选项]
 *
 * 选项:
 *   --help  显示帮助
 */

function loadEnv() { /* ... */ }

function parseArgs() { /* ... */ }

function showHelp() { /* ... */ }

async function main() {
  loadEnv();
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  // 主逻辑
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
```

---

## 故障排查

### 常见问题

**Q: 执行脚本报错 "Cannot find module 'mysql2/promise'"**
A: 请先安装依赖：`pnpm install`

**Q: 数据库连接失败**
A: 检查 `.env` 中的 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME 配置是否正确

**Q: mysqldump 找不到**
A: 请安装 MySQL 客户端工具，并确保在 PATH 中

**Q: 迁移执行失败**
A:
1. 先备份数据库
2. 查看错误信息定位失败的迁移
3. 手动执行 `down` 回滚或修复后重新执行

### 日志查看

脚本执行过程中的输出均带有时间戳和状态标识，便于排查：
- `ℹ️` 信息
- `✅` 成功
- `⚠️` 警告
- `❌` 错误

---

## 相关文档

- [数据库架构](../docs/09-数据库/数据库架构.md)
- [运维指南](../docs/04-运维指南/)
- [API 设计规范](../docs/03-技术规范/API设计规范.md)
