# 数据备份与恢复 SOP

> SOP 编号：VNERP-SKILL-004 | 版本：V1.0 | 更新日期：2026-05-10

## 前置条件

- MySQL 8.0 已安装
- 有足够的磁盘空间存储备份
- 有数据库访问权限

## 备份操作

### 全量备份

```bash
mysqldump -u root -p \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  vnerp > full_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 压缩备份

```bash
mysqldump -u root -p --single-transaction vnerp | gzip > full_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 定时备份（crontab）

```bash
# 每天凌晨 2 点自动备份
0 2 * * * mysqldump -u root -pYOUR_PASSWORD --single-transaction vnerp | gzip > /backup/vnerp_$(date +\%Y\%m\%d).sql.gz
```

### 备份保留策略

| 备份类型 | 保留时间 | 存储位置 |
|---------|---------|---------|
| 日备份 | 7 天 | 本地 |
| 周备份 | 4 周 | 本地 + 远程 |
| 月备份 | 12 个月 | 远程存储 |

## 恢复操作

### 全量恢复

```bash
mysql -u root -p vnerp < full_backup_20260510_020000.sql
```

### 压缩备份恢复

```bash
gunzip < full_backup_20260510_020000.sql.gz | mysql -u root -p vnerp
```

### 验证恢复

```bash
# 检查表数量
mysql -u root -p vnerp -e "SHOW TABLES;" | wc -l

# 检查关键表数据
mysql -u root -p vnerp -e "SELECT COUNT(*) FROM sys_user;"
mysql -u root -p vnerp -e "SELECT COUNT(*) FROM bas_material;"
```

## 异常处理

| 问题 | 解决方案 |
|------|---------|
| 备份文件损坏 | 使用更早的备份文件 |
| 磁盘空间不足 | 清理旧备份，扩展存储 |
| 恢复后数据不一致 | 检查备份时间点，补充 binlog 回放 |
