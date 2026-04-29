# 数据库优化脚本

这个目录包含用于数据库分析和清理的脚本。

## 脚本列表

### 1. analyze-tables-static.ts
静态分析脚本，不需要连接数据库，直接分析API代码中的表使用情况。

```bash
npx tsx scripts/analyze-tables-static.ts
```

**输出内容：**
- API中正在使用的表
- API中未使用的表
- 模块完整性分析
- 优化建议

### 2. db-cleanup.ts
数据库清理脚本，需要连接数据库，可以执行实际的清理操作。

```bash
# 查看帮助
npx tsx scripts/db-cleanup.ts help

# 查看所有表的数据量统计
npx tsx scripts/db-cleanup.ts stats

# 分析未使用的表
npx tsx scripts/db-cleanup.ts analyze

# 归档历史数据（保留最近365天）
npx tsx scripts/db-cleanup.ts archive --table inv_inventory_log --days 365

# 删除指定的表（需要确认）
npx tsx scripts/db-cleanup.ts drop --table crm_customer_contact

# 清理所有未使用的空表
npx tsx scripts/db-cleanup.ts cleanup
```

### 3. cleanup-unused-tables.sql
SQL清理脚本，包含所有删除未使用表的SQL语句（注释状态）。

```bash
# 在MySQL中执行
mysql -u root -p vnerpdacahng < scripts/cleanup-unused-tables.sql
```

## 使用流程

### 第一步：分析表使用情况

```bash
npx tsx scripts/analyze-tables-static.ts
```

这个命令会分析API代码，找出哪些表被使用，哪些表未被使用。

### 第二步：查看数据库实际数据量

```bash
npx tsx scripts/db-cleanup.ts stats
```

这个命令会连接数据库，显示所有表的数据量和空间占用。

### 第三步：分析未使用的表

```bash
npx tsx scripts/db-cleanup.ts analyze
```

这个命令会详细分析每个未使用表的数据量，帮助决策。

### 第四步：执行清理（谨慎操作）

#### 方案A：清理空表（推荐先执行）

```bash
npx tsx scripts/db-cleanup.ts cleanup
```

这个命令会删除所有未使用的**空表**，有数据的表会被跳过。

#### 方案B：归档历史数据

对于包含历史数据的表（如日志表），可以先归档：

```bash
npx tsx scripts/db-cleanup.ts archive --table inv_inventory_log --days 365
```

#### 方案C：逐个删除表

```bash
npx tsx scripts/db-cleanup.ts drop --table crm_customer_contact
```

## 注意事项

1. **备份数据库**：在执行任何删除操作前，请务必备份数据库
   ```bash
   mysqldump -u root -p vnerpdacahng > backup_$(date +%Y%m%d).sql
   ```

2. **谨慎操作**：删除表是不可逆的操作，请仔细确认后再执行

3. **业务确认**：某些表虽然在API中未使用，但可能被后台任务或其他系统使用，删除前请确认

4. **保留系统表**：以下系统表建议保留，即使API中未直接使用：
   - `sys_operation_log` - 操作日志（审计）
   - `sys_login_log` - 登录日志（安全）
   - `sys_dict_type` / `sys_dict_data` - 数据字典
   - `sys_config` - 系统配置

## 未使用的表列表

根据静态分析，以下26个表在API代码中未被引用：

### 可以安全删除的表（空表或业务可选）

| 表名 | 模块 | 说明 |
|------|------|------|
| crm_customer_contact | 客户管理 | 客户联系人 |
| crm_customer_follow_up | 客户管理 | 客户跟进记录 |
| pur_supplier | 供应商管理 | 供应商 |
| pur_supplier_material | 供应商管理 | 供应商物料关联 |
| pur_request_detail | 采购管理 | 采购申请明细 |
| pur_order | 采购管理 | 采购订单 |
| pur_order_detail | 采购管理 | 采购订单明细 |
| pur_receipt | 采购管理 | 采购入库单 |
| pur_receipt_detail | 采购管理 | 采购入库明细 |
| sal_order | 销售管理 | 销售订单 |
| sal_order_detail | 销售管理 | 销售订单明细 |
| sal_delivery | 销售管理 | 销售出库单 |
| sal_delivery_detail | 销售管理 | 销售出库明细 |
| prd_work_order | 生产管理 | 生产工单 |
| prd_bom | 生产管理 | BOM表 |
| prd_bom_detail | 生产管理 | BOM明细 |
| fin_receivable | 财务管理 | 应收款 |
| fin_payable | 财务管理 | 应付款 |
| fin_receipt_record | 财务管理 | 收款记录 |
| fin_payment_record | 财务管理 | 付款记录 |
| qc_inspection | 质量管理 | 质检记录 |
| qc_unqualified | 质量管理 | 不合格品记录 |

### 需要谨慎处理的表

| 表名 | 模块 | 说明 |
|------|------|------|
| inv_material_category | 物料管理 | 物料分类 |
| inv_material | 物料管理 | 物料 |
| inv_inventory | 物料管理 | 库存 |
| inv_inventory_log | 物料管理 | 库存日志（可归档） |

## 清理后的预期效果

- 减少数据库表数量（41个 → 15个，减少63%）
- 释放磁盘空间（取决于数据量）
- 简化数据库维护
- 提高备份和恢复速度
