# 数据库表关系分析报告

## 概述

本报告分析了 ERP 系统 `vnerpdacahng` 数据库中所有表的逻辑关联关系。

## 统计信息

| 指标 | 数量 |
|------|------|
| 总表数 | 124 |
| 外键关系 | 1 |
| 逻辑关联 | 18 |
| 模块数量 | 9 |

## 模块分布

| 模块 | 表数量 | 说明 |
|------|--------|------|
| other | 54 | 其他业务表 |
| order | 21 | 订单管理 |
| system | 17 | 系统管理 |
| product | 16 | 产品管理 |
| partner | 7 | 合作伙伴 |
| inventory | 4 | 库存管理 |
| production | 3 | 生产管理 |
| finance | 1 | 财务管理 |
| sample | 1 | 样品管理 |

## 外键关系

数据库中只定义了 **1 个外键关系**：

| 源表 | 源字段 | 目标表 | 目标字段 |
|------|--------|--------|----------|
| pur_purchase_order_line | po_id | pur_purchase_order | id |

## 逻辑关联关系

基于字段名推断的关联关系（共 18 个）：

### 系统管理模块

| 源表 | 关联字段 | 目标表 | 说明 |
|------|----------|--------|------|
| sys_user | department_id | sys_department | 用户归属部门 |
| sys_user_role | user_id | sys_user | 用户角色关联 |
| sys_user_role | role_id | sys_role | 用户角色关联 |
| sys_role_menu | role_id | sys_role | 角色菜单关联 |
| sys_role_menu | menu_id | sys_menu | 角色菜单关联 |
| sys_dict_data | dict_type_id | sys_dict_type | 字典数据归属 |
| sys_employee | role_id | sys_role | 员工角色 |
| sys_login_log | user_id | sys_user | 登录日志用户 |
| sys_operation_log | user_id | sys_user | 操作日志用户 |
| sys_salary | employee_id | sys_employee | 薪资员工 |

### 人事管理模块

| 源表 | 关联字段 | 目标表 | 说明 |
|------|----------|--------|------|
| hr_attendance | employee_id | sys_employee | 考勤员工 |
| hr_training_participant | employee_id | sys_employee | 培训参与人员 |

### 委外管理模块

| 源表 | 关联字段 | 目标表 | 说明 |
|------|----------|--------|------|
| outsource_issue | outsource_order_id | outsource_order | 委外发料订单 |
| outsource_receive | outsource_order_id | outsource_order | 委外收货订单 |
| outsource_settlement | outsource_order_id | outsource_order | 委外结算订单 |

### 油墨管理模块

| 源表 | 关联字段 | 目标表 | 说明 |
|------|----------|--------|------|
| ink_mixed_record | base_ink_id | base_ink | 调墨基础油墨 |
| ink_mixed_record | company_id | sys_company | 调墨公司 |

### 生产管理模块

| 源表 | 关联字段 | 目标表 | 说明 |
|------|----------|--------|------|
| prod_work_order_material_req | bom_line_id | bom_line | 工单物料需求 BOM |

## 关系图

### 模块分布饼图

![模块分布](https://mdn.alipayobjects.com/one_clip/afts/img/AW7BSbaam-gAAAAARSAAAAgAoEACAQFr/original)

### 表关联数量 TOP 20

![关联数量](https://mdn.alipayobjects.com/one_clip/afts/img/GnogTL6uYV8AAAAAQ0AAAAgAoEACAQFr/original)

## 建议

1. **增加外键约束**：当前数据库只有 1 个外键关系，建议增加更多外键约束以保证数据完整性
2. **统一命名规范**：部分表的关联字段命名不一致，建议统一使用 `{表名}_id` 格式
3. **添加索引**：对关联字段添加索引以提高查询性能
4. **补充表注释**：部分表缺少注释，建议补充完整的表说明

## 访问页面

可通过以下页面查看交互式分析结果：

- http://localhost:5000/analysis/db-relations
