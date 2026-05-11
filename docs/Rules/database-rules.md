# 数据库设计规则

> 文档编号：VNERP-RULES-002 | 版本：V1.0 | 更新日期：2026-05-10

## 1. 表命名规则

### 1.1 命名格式

```
{模块前缀}_{业务实体}
```

### 1.2 模块前缀

| 前缀 | 模块 | 示例 |
|------|------|------|
| `prd_` | 生产管理 | `prd_work_report`, `prd_standard_card` |
| `inv_` | 仓库/库存 | `inv_stocktaking`, `inv_transfer_order` |
| `pur_` | 采购管理 | `pur_order`, `pur_request` |
| `fin_` | 财务管理 | `fin_receivable`, `fin_payable` |
| `sal_` | 销售管理 | `sal_order`, `sal_delivery` |
| `qc_` | 品质管理 | `qc_incoming`, `qc_process` |
| `sys_` | 系统管理 | `sys_user`, `sys_role` |
| `bas_` | 基础数据 | `bas_material`, `bas_warehouse` |
| `hr_` | 人力资源 | `hr_employee`, `hr_attendance` |

### 1.3 关联/明细表命名

```
{主表名}_detail    -- 明细表
{主表名}_log       -- 操作日志表
{主表名}_relation   -- 关联关系表
```

示例：`prd_standard_card_ink`（标准卡油墨明细表）

## 2. 字段命名规则

### 2.1 通用字段（所有表必须包含）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | BIGINT UNSIGNED AUTO_INCREMENT | 主键 |
| `create_time` | DATETIME DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `update_time` | DATETIME ON UPDATE CURRENT_TIMESTAMP | 更新时间 |
| `deleted` | TINYINT DEFAULT 0 | 逻辑删除标识 |

### 2.2 字段命名规范

- 使用 snake_case 命名
- 布尔字段使用 `is_` 前缀：`is_active`, `is_deleted`
- 时间字段使用 `_time` 后缀：`create_time`, `approve_time`
- 日期字段使用 `_date` 后缀：`order_date`, `due_date`
- 金额字段使用 `_amount` 后缀：`total_amount`, `paid_amount`
- 数量字段使用 `_quantity` 或 `_qty` 后缀：`plan_quantity`, `actual_qty`
- 编号字段使用 `_no` 后缀：`order_no`, `taking_no`
- 状态字段使用 `status`：类型为 TINYINT/INT，使用数字编码
- 类型字段使用 `_type` 后缀：`taking_type`, `transfer_type`
- 外键字段使用 `_id` 后缀：`material_id`, `warehouse_id`
- 名称字段使用 `_name` 后缀：`material_name`, `warehouse_name`

### 2.3 状态编码规范

统一使用数字编码，禁止使用字符串状态：

```sql
-- 正确
status TINYINT DEFAULT 1 COMMENT '1-待审核 2-审核中 3-已审核 4-已取消'

-- 错误
status VARCHAR(20) DEFAULT '草稿' COMMENT '草稿/审核中/已审核/已取消'
```

状态编码通用约定：

| 编码 | 含义 | 适用场景 |
|------|------|---------|
| 1 | 草稿/待处理/初始 | 所有单据 |
| 2 | 进行中/审核中 | 流程类单据 |
| 3 | 已完成/已审核 | 流程类单据 |
| 4 | 已关闭/已入库 | 终态 |
| 5 | 已取消 | 终态 |
| 9 | 异常/已删除 | 异常状态 |

## 3. 索引设计规则

### 3.1 必须创建索引的场景

- 主键自动创建聚簇索引
- 外键字段必须创建索引
- WHERE 条件高频使用的字段
- ORDER BY / GROUP BY 高频使用的字段
- 唯一业务编号（如 `order_no`）创建唯一索引

### 3.2 索引命名

```
idx_{表名}_{字段名}       -- 普通索引
uk_{表名}_{字段名}        -- 唯一索引
idx_{表名}_{字段1}_{字段2} -- 联合索引
```

### 3.3 索引使用原则

- 单表索引数量不超过 5 个
- 联合索引遵循最左前缀原则
- 区分度低的字段（如 `deleted`）不单独建索引
- 避免冗余索引

## 4. 事务使用规范

### 4.1 必须使用事务的场景

- 涉及多表写入操作
- 涉及金额计算操作
- 涉及库存数量变更操作
- 涉及状态流转操作
- 涉及二维码记录创建/更新操作

### 4.2 事务使用模板

```typescript
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();

  // 业务操作1
  await conn.execute('INSERT INTO ...', [...]);
  // 业务操作2
  await conn.execute('UPDATE ...', [...]);

  await conn.commit();
} catch (error) {
  await conn.rollback();
  throw error;
} finally {
  conn.release();
}
```

### 4.3 事务注意事项

- 事务粒度尽量小，避免长事务
- 事务中禁止包含 RPC 调用或耗时操作
- 读取操作一般不需要事务（除非需要一致性读）
- 连接必须在 finally 中释放

## 5. 数据库迁移规范

### 5.1 迁移脚本命名

```
migrations/{序号}_{描述}.sql
```

示例：`0005_consolidate_redundant_tables.sql`

### 5.2 迁移脚本要求

- 每个迁移脚本必须可独立执行
- 必须包含回滚语句（注释形式）
- 使用 `IF NOT EXISTS` / `IF EXISTS` 避免重复执行报错
- 破坏性操作（DROP TABLE）必须注释，确认后手动执行
- 迁移脚本一旦提交不可修改，只能新增回滚脚本

## 6. 禁止事项

- 禁止使用 `SELECT *`，必须明确列出字段
- 禁止在数据库中存储大对象（图片、文件等），只存路径
- 禁止使用存储过程和触发器（业务逻辑在应用层实现）
- 禁止使用外键约束（在应用层保证数据一致性）
- 禁止物理删除，统一使用逻辑删除（`deleted` 字段）
- 禁止在字段名中使用数据库保留字
