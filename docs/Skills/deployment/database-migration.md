# 数据库迁移 SOP

> SOP 编号：VNERP-SKILL-003 | 版本：V1.0 | 更新日期：2026-05-10

## 前置条件

- 已确认迁移脚本内容
- 已在测试环境验证迁移脚本
- 已备份生产数据库

## 操作步骤

### 步骤 1：备份数据库

```bash
mysqldump -u root -p --single-transaction --routines --triggers vnerp > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

验证：检查备份文件大小 > 0

### 步骤 2：检查迁移脚本

```bash
# 查看迁移脚本内容
cat migrations/XXXX_description.sql
```

确认：
- [ ] 包含 IF NOT EXISTS / IF EXISTS 保护
- [ ] 破坏性操作（DROP TABLE）已注释
- [ ] 包含回滚语句（注释形式）

### 步骤 3：在测试环境执行

```bash
mysql -u root -p vnerp_test < migrations/XXXX_description.sql
```

验证：测试环境功能正常

### 步骤 4：在生产环境执行

```bash
# 先执行非破坏性部分
mysql -u root -p vnerp < migrations/XXXX_description.sql
```

### 步骤 5：验证迁移结果

```bash
# 检查新表/字段是否创建
mysql -u root -p vnerp -e "DESCRIBE table_name;"
mysql -u root -p vnerp -e "SHOW INDEX FROM table_name;"
```

### 步骤 6：确认后执行破坏性操作

如果迁移脚本包含 DROP TABLE（已注释），确认数据迁移完成后：

```bash
# 手动执行 DROP TABLE
mysql -u root -p vnerp -e "DROP TABLE IF EXISTS redundant_table;"
```

## 回滚方案

```bash
# 恢复备份
mysql -u root -p vnerp < backup_before_migration_YYYYMMDD_HHMMSS.sql
```

## 迁移脚本编写规范

```sql
-- 迁移脚本模板
-- 编号：XXXX
-- 描述：xxx
-- 日期：2026-05-10
-- 作者：xxx

-- 正向迁移
ALTER TABLE table_name
  ADD COLUMN IF NOT EXISTS new_column VARCHAR(100) COMMENT '说明';

-- 回滚语句（注释形式）
-- ALTER TABLE table_name DROP COLUMN IF EXISTS new_column;
```
