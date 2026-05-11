# 数据库架构

> 文档编号：VNERP-WIKI-ARCH-003 | 版本：V1.0 | 更新日期：2026-05-10

## 数据库设计原则

1. 表命名使用模块前缀（prd_, inv_, fin_ 等）
2. 字段命名使用 snake_case
3. 状态使用数字编码，不使用字符串
4. 逻辑删除（deleted 字段），不物理删除
5. 不使用外键约束，应用层保证一致性
6. 不使用存储过程和触发器

## 核心表清单

### 生产模块 (prd_*)

| 表名 | 说明 | 核心字段 |
|------|------|---------|
| prd_work_order | 生产工单 | order_no, product_name, plan_quantity, status |
| prd_work_report | 报工记录 | work_order_id, report_type, good_qty, defect_qty |
| prd_standard_card | 标准卡 | card_no, product_name, specification |
| prd_standard_card_ink | 标准卡-油墨 | card_id, ink_type, ink_color, mix_ratio |
| prd_standard_card_screen | 标准卡-网版 | card_id, screen_type, mesh_count, tension |
| prd_standard_card_die | 标准卡-刀具 | card_id, die_type, die_code |
| prd_standard_card_process | 标准卡-工序 | card_id, process_name, standard_hours |

### 仓库模块 (inv_*)

| 表名 | 说明 | 核心字段 |
|------|------|---------|
| inv_production_inbound | 生产入库 | inbound_no, inbound_type, warehouse_id, status |
| inv_stocktaking | 盘点单 | taking_no, taking_type, warehouse_id, status |
| inv_transfer_order | 调拨单 | transfer_no, from_warehouse_id, to_warehouse_id, status |
| qrcode_record | 二维码记录 | qr_code, qr_type, material_id, quantity, split_flag, parent_qr_id, status |

### 财务模块 (fin_*)

| 表名 | 说明 | 核心字段 |
|------|------|---------|
| fin_receivable | 应收账款 | receivable_no, customer_id, amount, received_amount, balance, status |
| fin_payable | 应付账款 | payable_no, supplier_id, amount, paid_amount, balance, status |

### 系统模块 (sys_*)

| 表名 | 说明 | 核心字段 |
|------|------|---------|
| sys_user | 用户 | username, password, real_name, role, status |
| sys_role | 角色 | role_name, role_code, permissions, status |
| sys_menu | 菜单 | parent_id, name, path, icon, sort_order |

## 已清理的冗余表

以下表在架构清理中已合并/废弃：

| 废弃表 | 替代表 | 说明 |
|--------|--------|------|
| process_reports | prd_work_report | 报工记录统一使用 prd_work_report |
| qr_codes | qrcode_record | 二维码记录统一使用 qrcode_record |
| inventory_checks | inv_stocktaking | 盘点单统一使用 inv_stocktaking |
| transfers | inv_transfer_order | 调拨单统一使用 inv_transfer_order |
| fin_accounts_receivable | fin_receivable | 应收统一使用 fin_receivable |
| fin_accounts_payable | fin_payable | 应付统一使用 fin_payable |
| standard_cards + 4张明细表 | prd_standard_card + 4张明细表 | 标准卡统一使用 prd_ 前缀表 |

## 索引策略

- 主键：自增 BIGINT UNSIGNED
- 唯一索引：业务编号字段（order_no 等）
- 普通索引：外键字段、状态字段、高频查询字段
- 联合索引：遵循最左前缀原则
