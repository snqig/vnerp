# 数据库优化建议详细说明

## 概述

本文档详细说明数据库优化的四个方面：
1. 增加外键约束
2. 统一命名规范
3. 添加索引
4. 补充表注释

---

## 一、增加外键约束

### 1.1 为什么需要外键约束

**当前问题**：
- 数据库只有 1 个外键关系（`pur_purchase_order_line.po_id → pur_purchase_order.id`）
- 缺少外键约束会导致：
  - **数据不一致**：可以删除有引用的主表记录
  - **孤儿数据**：子表引用不存在的主表记录
  - **级联问题**：更新主表 ID 时子表不会同步更新

**外键约束的好处**：
| 好处 | 说明 |
|------|------|
| 数据完整性 | 自动保证引用关系有效 |
| 级联操作 | 删除/更新主表时自动处理子表 |
| 错误预防 | 阻止无效数据的插入 |
| 文档作用 | 外键关系即是最准确的文档 |

### 1.2 建议添加的外键关系

#### 系统管理模块（10 个）

```sql
-- 用户 -> 部门
ALTER TABLE sys_user 
  ADD CONSTRAINT fk_sys_user_department 
  FOREIGN KEY (department_id) REFERENCES sys_department(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 用户角色关联 -> 用户
ALTER TABLE sys_user_role 
  ADD CONSTRAINT fk_sys_user_role_user 
  FOREIGN KEY (user_id) REFERENCES sys_user(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 用户角色关联 -> 角色
ALTER TABLE sys_user_role 
  ADD CONSTRAINT fk_sys_user_role_role 
  FOREIGN KEY (role_id) REFERENCES sys_role(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 角色菜单关联 -> 角色
ALTER TABLE sys_role_menu 
  ADD CONSTRAINT fk_sys_role_menu_role 
  FOREIGN KEY (role_id) REFERENCES sys_role(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 角色菜单关联 -> 菜单
ALTER TABLE sys_role_menu 
  ADD CONSTRAINT fk_sys_role_menu_menu 
  FOREIGN KEY (menu_id) REFERENCES sys_menu(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 字典数据 -> 字典类型
ALTER TABLE sys_dict_data 
  ADD CONSTRAINT fk_sys_dict_data_type 
  FOREIGN KEY (dict_type_id) REFERENCES sys_dict_type(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 员工 -> 角色
ALTER TABLE sys_employee 
  ADD CONSTRAINT fk_sys_employee_role 
  FOREIGN KEY (role_id) REFERENCES sys_role(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 登录日志 -> 用户
ALTER TABLE sys_login_log 
  ADD CONSTRAINT fk_sys_login_log_user 
  FOREIGN KEY (user_id) REFERENCES sys_user(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 操作日志 -> 用户
ALTER TABLE sys_operation_log 
  ADD CONSTRAINT fk_sys_operation_log_user 
  FOREIGN KEY (user_id) REFERENCES sys_user(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 薪资 -> 员工
ALTER TABLE sys_salary 
  ADD CONSTRAINT fk_sys_salary_employee 
  FOREIGN KEY (employee_id) REFERENCES sys_employee(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;
```

#### 人事管理模块（3 个）

```sql
-- 考勤 -> 员工
ALTER TABLE hr_attendance 
  ADD CONSTRAINT fk_hr_attendance_employee 
  FOREIGN KEY (employee_id) REFERENCES sys_employee(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 培训参与人员 -> 员工
ALTER TABLE hr_training_participant 
  ADD CONSTRAINT fk_hr_training_participant_employee 
  FOREIGN KEY (employee_id) REFERENCES sys_employee(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 培训参与人员 -> 培训
ALTER TABLE hr_training_participant 
  ADD CONSTRAINT fk_hr_training_participant_training 
  FOREIGN KEY (training_id) REFERENCES hr_training(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;
```

#### 客户管理模块（3 个）

```sql
-- 客户联系人 -> 客户
ALTER TABLE crm_customer_contact 
  ADD CONSTRAINT fk_crm_customer_contact_customer 
  FOREIGN KEY (customer_id) REFERENCES crm_customer(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 客户分析 -> 客户
ALTER TABLE crm_customer_analysis 
  ADD CONSTRAINT fk_crm_customer_analysis_customer 
  FOREIGN KEY (customer_id) REFERENCES crm_customer(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 客户跟进记录 -> 客户
ALTER TABLE crm_follow_record 
  ADD CONSTRAINT fk_crm_follow_record_customer 
  FOREIGN KEY (customer_id) REFERENCES crm_customer(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;
```

#### 库存管理模块（6 个）

```sql
-- 库存 -> 物料
ALTER TABLE inv_inventory 
  ADD CONSTRAINT fk_inv_inventory_material 
  FOREIGN KEY (material_id) REFERENCES inv_material(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 库存 -> 仓库
ALTER TABLE inv_inventory 
  ADD CONSTRAINT fk_inv_inventory_warehouse 
  FOREIGN KEY (warehouse_id) REFERENCES inv_warehouse(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 库存批次 -> 物料
ALTER TABLE inv_inventory_batch 
  ADD CONSTRAINT fk_inv_inventory_batch_material 
  FOREIGN KEY (material_id) REFERENCES inv_material(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 入库明细 -> 入库订单
ALTER TABLE inv_inbound_item 
  ADD CONSTRAINT fk_inv_inbound_item_order 
  FOREIGN KEY (order_id) REFERENCES inv_inbound_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 出库明细 -> 出库订单
ALTER TABLE inv_outbound_item 
  ADD CONSTRAINT fk_inv_outbound_item_order 
  FOREIGN KEY (order_id) REFERENCES inv_outbound_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 物料分类 -> 父分类
ALTER TABLE inv_material_category 
  ADD CONSTRAINT fk_inv_material_category_parent 
  FOREIGN KEY (parent_id) REFERENCES inv_material_category(id) 
  ON DELETE SET NULL ON UPDATE CASCADE;
```

#### 委外管理模块（4 个）

```sql
-- 委外发料 -> 委外订单
ALTER TABLE outsource_issue 
  ADD CONSTRAINT fk_outsource_issue_order 
  FOREIGN KEY (outsource_order_id) REFERENCES outsource_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 委外收货 -> 委外订单
ALTER TABLE outsource_receive 
  ADD CONSTRAINT fk_outsource_receive_order 
  FOREIGN KEY (outsource_order_id) REFERENCES outsource_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 委外结算 -> 委外订单
ALTER TABLE outsource_settlement 
  ADD CONSTRAINT fk_outsource_settlement_order 
  FOREIGN KEY (outsource_order_id) REFERENCES outsource_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 委外发料明细 -> 委外发料
ALTER TABLE outsource_issue_item 
  ADD CONSTRAINT fk_outsource_issue_item_issue 
  FOREIGN KEY (issue_id) REFERENCES outsource_issue(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;
```

#### 油墨管理模块（3 个）

```sql
-- 调墨记录 -> 基础油墨
ALTER TABLE ink_mixed_record 
  ADD CONSTRAINT fk_ink_mixed_record_base_ink 
  FOREIGN KEY (base_ink_id) REFERENCES base_ink(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 调墨记录 -> 公司
ALTER TABLE ink_mixed_record 
  ADD CONSTRAINT fk_ink_mixed_record_company 
  FOREIGN KEY (company_id) REFERENCES sys_company(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 调墨明细 -> 调墨批次
ALTER TABLE ink_mixed_batch_detail 
  ADD CONSTRAINT fk_ink_mixed_batch_detail_batch 
  FOREIGN KEY (batch_id) REFERENCES ink_mixed_batch(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;
```

#### 采购管理模块（3 个）

```sql
-- 采购申请明细 -> 采购申请
ALTER TABLE pur_request_detail 
  ADD CONSTRAINT fk_pur_request_detail_request 
  FOREIGN KEY (request_id) REFERENCES pur_request(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 采购订单 -> 供应商
ALTER TABLE pur_purchase_order 
  ADD CONSTRAINT fk_pur_purchase_order_supplier 
  FOREIGN KEY (supplier_id) REFERENCES pur_supplier(id) 
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

#### BOM 管理模块（1 个）

```sql
-- BOM 行 -> BOM 头
ALTER TABLE bom_line 
  ADD CONSTRAINT fk_bom_line_header 
  FOREIGN KEY (header_id) REFERENCES bom_header(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;
```

### 1.3 外键级联策略说明

| 策略 | 适用场景 | 说明 |
|------|----------|------|
| `ON DELETE CASCADE` | 强关联数据 | 删除主表记录时自动删除子表记录 |
| `ON DELETE SET NULL` | 可选关联 | 删除主表记录时将子表外键设为 NULL |
| `ON DELETE RESTRICT` | 保护性关联 | 有子表引用时禁止删除主表记录 |
| `ON UPDATE CASCADE` | 所有场景 | 更新主表 ID 时自动更新子表外键 |

### 1.4 执行前检查

**必须先检查孤儿数据**：

```bash
mysql -u root -p vnerpdacahng < scripts/check-data-integrity.sql
```

**如果发现孤儿数据**：

```sql
-- 清理孤儿数据示例（sys_user -> sys_department）
UPDATE sys_user 
SET department_id = NULL 
WHERE department_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM sys_department d WHERE d.id = sys_user.department_id);

-- 清理孤儿数据示例（sys_user_role -> sys_user）
DELETE FROM sys_user_role 
WHERE NOT EXISTS (SELECT 1 FROM sys_user u WHERE u.id = sys_user_role.user_id);
```

---

## 二、统一命名规范

### 2.1 当前命名问题

| 表名 | 字段名 | 问题 | 建议修改 |
|------|--------|------|----------|
| pur_purchase_order_line | po_id | 缩写不清晰 | purchase_order_id |
| bom_line | header_id | 未指明是哪个头 | bom_header_id |
| inv_inbound_item | order_id | 未指明是哪个订单 | inbound_order_id |
| inv_outbound_item | order_id | 未指明是哪个订单 | outbound_order_id |

### 2.2 命名规范建议

**关联字段命名规则**：
```
{被关联表名去掉前缀}_id
```

**示例**：
| 被关联表 | 关联字段名 |
|----------|------------|
| sys_department | department_id |
| sys_user | user_id |
| sys_role | role_id |
| crm_customer | customer_id |
| inv_material | material_id |
| pur_purchase_order | purchase_order_id（不是 po_id） |
| bom_header | bom_header_id（不是 header_id） |

### 2.3 修改命名的影响

**需要同步修改的内容**：
1. 数据库字段名
2. 所有 SQL 查询
3. 所有应用代码中的字段引用
4. API 接口字段名
5. 前端代码字段名

**修改步骤**：

```sql
-- 1. 重命名字段
ALTER TABLE pur_purchase_order_line 
  CHANGE po_id purchase_order_id INT;

-- 2. 更新外键约束名称
ALTER TABLE pur_purchase_order_line 
  DROP FOREIGN KEY fk_pur_purchase_order_line_order;

ALTER TABLE pur_purchase_order_line 
  ADD CONSTRAINT fk_pur_purchase_order_line_purchase_order 
  FOREIGN KEY (purchase_order_id) REFERENCES pur_purchase_order(id) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. 更新索引名称
DROP INDEX idx_pur_purchase_order_line_order ON pur_purchase_order_line;
CREATE INDEX idx_pur_purchase_order_line_purchase_order 
  ON pur_purchase_order_line(purchase_order_id);
```

**建议**：由于修改命名影响范围大，建议：
1. 在新项目中严格执行命名规范
2. 现有项目可保持现状，但新增表必须遵循规范
3. 逐步重构时再统一修改

---

## 三、添加索引

### 3.1 为什么需要索引

**没有索引的问题**：
- 关联查询（JOIN）性能差
- WHERE 条件查询慢
- 外键约束检查慢

**索引的作用**：
| 操作 | 无索引 | 有索引 |
|------|--------|--------|
| 查找用户所属部门 | 扫描全部用户 | 直接定位 |
| 查询订单明细 | 全表扫描 | 快速定位 |
| 外键约束检查 | 每次检查全表 | 快速验证 |

### 3.2 建议添加的索引

#### 系统管理模块

```sql
CREATE INDEX idx_sys_user_department ON sys_user(department_id);
CREATE INDEX idx_sys_user_role_user ON sys_user_role(user_id);
CREATE INDEX idx_sys_user_role_role ON sys_user_role(role_id);
CREATE INDEX idx_sys_role_menu_role ON sys_role_menu(role_id);
CREATE INDEX idx_sys_role_menu_menu ON sys_role_menu(menu_id);
CREATE INDEX idx_sys_dict_data_type ON sys_dict_data(dict_type_id);
CREATE INDEX idx_sys_employee_role ON sys_employee(role_id);
CREATE INDEX idx_sys_login_log_user ON sys_login_log(user_id);
CREATE INDEX idx_sys_operation_log_user ON sys_operation_log(user_id);
CREATE INDEX idx_sys_salary_employee ON sys_salary(employee_id);
```

#### 人事管理模块

```sql
CREATE INDEX idx_hr_attendance_employee ON hr_attendance(employee_id);
CREATE INDEX idx_hr_training_participant_employee ON hr_training_participant(employee_id);
CREATE INDEX idx_hr_training_participant_training ON hr_training_participant(training_id);
```

#### 客户管理模块

```sql
CREATE INDEX idx_crm_customer_contact_customer ON crm_customer_contact(customer_id);
CREATE INDEX idx_crm_customer_analysis_customer ON crm_customer_analysis(customer_id);
CREATE INDEX idx_crm_follow_record_customer ON crm_follow_record(customer_id);
```

#### 库存管理模块

```sql
CREATE INDEX idx_inv_inventory_material ON inv_inventory(material_id);
CREATE INDEX idx_inv_inventory_warehouse ON inv_inventory(warehouse_id);
CREATE INDEX idx_inv_inventory_location ON inv_inventory(location_id);
CREATE INDEX idx_inv_inventory_batch_material ON inv_inventory_batch(material_id);
CREATE INDEX idx_inv_inbound_item_order ON inv_inbound_item(order_id);
CREATE INDEX idx_inv_inbound_item_material ON inv_inbound_item(material_id);
CREATE INDEX idx_inv_outbound_item_order ON inv_outbound_item(order_id);
CREATE INDEX idx_inv_outbound_item_material ON inv_outbound_item(material_id);
CREATE INDEX idx_inv_material_category_parent ON inv_material_category(parent_id);
CREATE INDEX idx_inv_inventory_log_material ON inv_inventory_log(material_id);
CREATE INDEX idx_inv_inventory_transaction_material ON inv_inventory_transaction(material_id);
```

#### 生产管理模块

```sql
CREATE INDEX idx_prd_work_order_material ON prd_work_order(material_id);
CREATE INDEX idx_prd_work_order_product ON prd_work_order(product_id);
CREATE INDEX idx_prd_work_order_customer ON prd_work_order(customer_id);
CREATE INDEX idx_prd_bom_detail_bom ON prd_bom_detail(bom_id);
CREATE INDEX idx_prd_bom_detail_material ON prd_bom_detail(material_id);
CREATE INDEX idx_prd_process_route_step_route ON prd_process_route_step(route_id);
CREATE INDEX idx_prd_schedule_detail_schedule ON prd_schedule_detail(schedule_id);
CREATE INDEX idx_prd_work_report_work_order ON prd_work_report(work_order_id);
```

#### 设备管理模块

```sql
CREATE INDEX idx_eqp_maintenance_plan_equipment ON eqp_maintenance_plan(equipment_id);
CREATE INDEX idx_eqp_maintenance_record_equipment ON eqp_maintenance_record(equipment_id);
CREATE INDEX idx_eqp_calibration_equipment ON eqp_calibration(equipment_id);
CREATE INDEX idx_eqp_repair_equipment ON eqp_repair(equipment_id);
CREATE INDEX idx_eqp_scrap_equipment ON eqp_scrap(equipment_id);
```

#### 质量管理模块

```sql
CREATE INDEX idx_qc_inspection_work_order ON qc_inspection(work_order_id);
CREATE INDEX idx_qc_inspection_material ON qc_inspection(material_id);
CREATE INDEX idx_qc_unqualified_inspection ON qc_unqualified(inspection_id);
```

#### 财务管理模块

```sql
CREATE INDEX idx_fin_payable_supplier ON fin_payable(supplier_id);
CREATE INDEX idx_fin_receivable_customer ON fin_receivable(customer_id);
CREATE INDEX idx_fin_payment_record_payable ON fin_payment_record(payable_id);
CREATE INDEX idx_fin_receipt_record_receivable ON fin_receipt_record(receivable_id);
```

#### 委外管理模块

```sql
CREATE INDEX idx_outsource_issue_order ON outsource_issue(outsource_order_id);
CREATE INDEX idx_outsource_receive_order ON outsource_receive(outsource_order_id);
CREATE INDEX idx_outsource_settlement_order ON outsource_settlement(outsource_order_id);
CREATE INDEX idx_outsource_issue_item_issue ON outsource_issue_item(issue_id);
```

#### 油墨管理模块

```sql
CREATE INDEX idx_ink_mixed_record_base_ink ON ink_mixed_record(base_ink_id);
CREATE INDEX idx_ink_mixed_record_company ON ink_mixed_record(company_id);
CREATE INDEX idx_ink_mixed_batch_detail_batch ON ink_mixed_batch_detail(batch_id);
CREATE INDEX idx_ink_opening_record_ink ON ink_opening_record(ink_id);
```

#### 采购管理模块

```sql
CREATE INDEX idx_pur_request_detail_request ON pur_request_detail(request_id);
CREATE INDEX idx_pur_request_item_request ON pur_request_item(request_id);
CREATE INDEX idx_pur_purchase_order_line_order ON pur_purchase_order_line(po_id);
CREATE INDEX idx_pur_purchase_order_supplier ON pur_purchase_order(supplier_id);
```

#### BOM 管理模块

```sql
CREATE INDEX idx_bom_line_header ON bom_line(header_id);
CREATE INDEX idx_bom_line_material ON bom_line(material_id);
```

### 3.3 索引命名规范

```
idx_{表名}_{字段名}
```

**示例**：
- `idx_sys_user_department` - sys_user 表的 department_id 字段索引
- `idx_inv_inbound_item_order` - inv_inbound_item 表的 order_id 字段索引

---

## 四、补充表注释

### 4.1 当前问题

部分表缺少注释，影响：
- 代码理解困难
- 新人上手慢
- 文档维护难

### 4.2 建议添加的注释

```sql
-- 系统管理模块
ALTER TABLE sys_company COMMENT '公司信息表';
ALTER TABLE sys_config COMMENT '系统配置表';
ALTER TABLE sys_department COMMENT '部门表';
ALTER TABLE sys_dict_data COMMENT '字典数据表';
ALTER TABLE sys_dict_type COMMENT '字典类型表';
ALTER TABLE sys_employee COMMENT '员工信息表';
ALTER TABLE sys_login_log COMMENT '登录日志表';
ALTER TABLE sys_menu COMMENT '菜单表';
ALTER TABLE sys_notice COMMENT '通知公告表';
ALTER TABLE sys_operation_log COMMENT '操作日志表';
ALTER TABLE sys_post COMMENT '岗位表';
ALTER TABLE sys_role COMMENT '角色表';
ALTER TABLE sys_role_menu COMMENT '角色菜单关联表';
ALTER TABLE sys_user COMMENT '用户表';
ALTER TABLE sys_user_role COMMENT '用户角色关联表';
ALTER TABLE sys_salary COMMENT '薪资表';

-- 其他模块...（详见 database-optimization.sql）
```

### 4.3 注释规范

**表注释格式**：
```
{业务含义}表
```

**示例**：
- `客户信息表`
- `入库订单主表`
- `生产工单表`

**字段注释格式**：
```
{字段含义}
```

---

## 五、执行步骤

### 5.1 备份数据库

```bash
mysqldump -u root -pSnqig521223 vnerpdacahng > vnerpdacahng_backup_$(date +%Y%m%d).sql
```

### 5.2 检查数据完整性

```bash
mysql -u root -pSnqig521223 vnerpdacahng < scripts/check-data-integrity.sql
```

### 5.3 分步执行优化脚本

```bash
# 方式一：执行完整脚本（推荐先在测试环境执行）
mysql -u root -pSnqig521223 vnerpdacahng < scripts/database-optimization.sql

# 方式二：分步执行
# 1. 先执行表注释（无风险）
# 2. 再执行索引（无风险，但可能需要时间）
# 3. 最后执行外键（需要确保数据完整性）
```

### 5.4 验证结果

```sql
-- 检查外键数量
SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = 'vnerpdacahng' AND CONSTRAINT_TYPE = 'FOREIGN KEY';

-- 检查索引数量
SELECT COUNT(*) FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'vnerpdacahng' AND INDEX_NAME != 'PRIMARY';

-- 检查表注释
SELECT TABLE_NAME, TABLE_COMMENT 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'vnerpdacahng' 
ORDER BY TABLE_NAME;
```

---

## 六、风险评估

| 操作 | 风险等级 | 说明 |
|------|----------|------|
| 补充表注释 | 低 | 无数据影响 |
| 添加索引 | 低 | 可能短暂影响性能 |
| 增加外键约束 | 中 | 需确保数据完整性 |
| 修改字段命名 | 高 | 需同步修改应用代码 |

**建议执行顺序**：
1. 补充表注释（立即执行）
2. 添加索引（低峰期执行）
3. 增加外键约束（测试环境验证后执行）
4. 修改字段命名（重构时执行）

---

## 七、相关文件

| 文件 | 说明 |
|------|------|
| [database-optimization.sql](file:///d:/dcprint/erp-project/scripts/database-optimization.sql) | 完整优化脚本 |
| [check-data-integrity.sql](file:///d:/dcprint/erp-project/scripts/check-data-integrity.sql) | 数据完整性检查脚本 |
| [db-relations.json](file:///d:/dcprint/erp-project/scripts/db-relations.json) | 表关系分析数据 |
