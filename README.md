# VNERP 印刷行业ERP系统

## 📖 项目简介

VNERP 是一款专为印刷行业设计的综合性企业资源计划（ERP）系统，采用 Next.js + MySQL 技术栈构建，提供完整的业务管理功能。

## 🚀 快速开始

### 环境要求

- Node.js 18+
- MySQL 8.0+
- npm 或 yarn

### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd erp-project

# 2. 安装依赖
npm install

# 3. 配置数据库
# 编辑 .env.local 文件，配置数据库连接信息

# 4. 启动开发服务器
npx next dev -p 5000
```

### 访问地址

- 开发环境: http://localhost:5000
- 登录页面: http://localhost:5000/login

## 📋 系统模块说明

### 1. 认证模块 (Authentication)

**页面路径**: `/login`

**功能说明**:
- 用户登录/登出
- 密码修改
- 用户注册
- 菜单权限控制

**API端点**:
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/change-password` - 修改密码
- `GET /api/auth/menus` - 获取用户菜单

**使用说明**:
1. 访问 http://localhost:5000/login
2. 输入用户名和密码
3. 点击"登录"按钮进入系统
4. 系统根据用户角色显示对应菜单

---

### 2. 仪表盘模块 (Dashboard)

**页面路径**: `/dashboard`

**子模块**:
- CEO看板: `/dashboard/ceo`
- 财务看板: `/dashboard/finance`
- 生产看板: `/dashboard/production`
- 质量看板: `/dashboard/quality`
- 销售看板: `/dashboard/sales`
- 仓库看板: `/dashboard/warehouse`

**功能说明**:
- 实时业务数据展示
- KPI指标监控
- 多维度数据分析
- 图表可视化展示

**API端点**:
- `GET /api/dashboard/ceo` - CEO看板数据
- `GET /api/dashboard/finance` - 财务看板数据
- `GET /api/dashboard/production` - 生产看板数据
- `GET /api/dashboard/quality` - 质量看板数据
- `GET /api/dashboard/sales` - 销售看板数据
- `GET /api/dashboard/warehouse` - 仓库看板数据

---

### 3. CRM客户管理模块

**页面路径**: `/orders/customers`

**子模块**:
- 客户列表: `/orders/customers`
- 新增客户: `/orders/customers/new`
- 客户跟进: `/crm/follow`
- 客户分析: `/crm/analysis`

**功能说明**:
- 客户信息管理
- 客户等级分类
- 跟进记录管理
- 客户数据分析

**API端点**:
- `GET /api/customers` - 获取客户列表
- `POST /api/customers` - 新增客户
- `PUT /api/customers/:id` - 更新客户
- `DELETE /api/customers/:id` - 删除客户
- `GET /api/crm/follow` - 获取跟进记录
- `POST /api/crm/follow` - 新增跟进记录
- `GET /api/crm/analysis` - 客户分析数据

---

### 4. 销售管理模块

**页面路径**: `/orders/sales`

**子模块**:
- 销售订单: `/orders/sales`
- 发货管理: `/sales/delivery`
- 对账管理: `/sales/reconciliation`
- 退货管理: `/sales/return`

**功能说明**:
- 销售订单创建与管理
- 订单发货跟踪
- 客户对账单
- 退货处理

**API端点**:
- `GET /api/orders/sales` - 获取销售订单列表
- `POST /api/orders/sales` - 创建销售订单
- `GET /api/sales/delivery` - 获取发货记录
- `POST /api/sales/delivery` - 创建发货单
- `GET /api/sales/reconciliation` - 获取对账数据
- `GET /api/sales/return` - 获取退货记录

---

### 5. 采购管理模块

**页面路径**: `/purchase/suppliers`

**子模块**:
- 供应商管理: `/purchase/suppliers`
- 采购申请: `/purchase/request`
- 采购订单: `/purchase/orders`
- 新建申请: `/purchase/request/new`
- 申请表单: `/purchase/request/form`

**功能说明**:
- 供应商信息管理
- 采购申请审批流程
- 采购订单管理
- 供应商评估

**API端点**:
- `GET /api/purchase/suppliers` - 获取供应商列表
- `POST /api/purchase/suppliers` - 新增供应商
- `GET /api/purchase/request` - 获取采购申请列表
- `POST /api/purchase/request` - 创建采购申请
- `GET /api/purchase/orders` - 获取采购订单列表
- `POST /api/purchase/orders` - 创建采购订单

---

### 6. 生产管理模块

**页面路径**: `/production/workorder`

**子模块**:
- 工单管理: `/production/workorder`
- 生产订单: `/production/orders`
- 排产管理: `/production/schedule`
- 领料管理: `/production/material-issue`
- 退料管理: `/production/material-return`
- 工序管理: `/production/process`
- 产品标签: `/production/product-label`
- 工作汇报: `/production/report`

**功能说明**:
- 生产工单创建与跟踪
- 生产排产计划
- 材料领用管理
- 生产退料处理
- 工序流程管理
- 产品标签打印
- 工作汇报记录

**API端点**:
- `GET /api/production/orders` - 获取生产订单列表
- `POST /api/production/orders` - 创建生产订单
- `GET /api/production/schedule` - 获取排产数据
- `POST /api/production/schedule` - 创建排产计划
- `GET /api/production/material-issue` - 获取领料记录
- `POST /api/production/material-issue` - 创建领料单
- `GET /api/production/material-return` - 获取退料记录
- `POST /api/production/material-return` - 创建退料单

---

### 7. 仓储管理模块

**页面路径**: `/warehouse`

**子模块**:
- 入库管理: `/warehouse/inbound`
- 出库管理: `/warehouse/outbound`
- 库存管理: `/warehouse/inventory`
- 生产入库: `/warehouse/production-inbound`
- 销售出库: `/warehouse/sales-outbound`
- 库存调整: `/warehouse/stock-adjust`
- 盘点管理: `/warehouse/stocktaking`
- 调拨管理: `/warehouse/transfer`
- 仓库设置: `/warehouse/setup`
- 裁切管理: `/warehouse/inbound/cutting`

**功能说明**:
- 采购入库管理
- 生产入库管理
- 销售出库管理
- 库存查询与调整
- 库存盘点
- 仓库调拨
- FIFO先进先出管理
- 标签裁切管理

**API端点**:
- `GET /api/warehouse/inbound` - 获取入库记录
- `POST /api/warehouse/inbound` - 创建入库单
- `GET /api/warehouse/outbound` - 获取出库记录
- `POST /api/warehouse/outbound` - 创建出库单
- `GET /api/warehouse/inventory` - 获取库存数据
- `POST /api/warehouse/stock-adjust` - 库存调整
- `GET /api/warehouse/stocktaking` - 获取盘点数据
- `POST /api/warehouse/stocktaking` - 创建盘点单
- `GET /api/warehouse/transfer` - 获取调拨记录
- `POST /api/warehouse/transfer` - 创建调拨单

---

### 8. 财务管理模块

**页面路径**: `/finance`

**子模块**:
- 应收账款: `/finance/receivable`
- 成本管理: `/finance/cost`
- 财务报表: `/finance/report`

**功能说明**:
- 应收账款管理
- 应付账款管理
- 成本核算
- 财务报表生成
- 收款记录
- 付款记录

**API端点**:
- `GET /api/finance/receivable` - 获取应收账款
- `POST /api/finance/receivable` - 创建应收账款
- `GET /api/finance/payable` - 获取应付账款
- `POST /api/finance/payable` - 创建应付账款
- `GET /api/finance/cost` - 获取成本数据
- `GET /api/finance/report` - 获取财务报表
- `GET /api/finance/receipt` - 获取收款记录
- `GET /api/finance/payment` - 获取付款记录

---

### 9. 人力资源管理模块

**页面路径**: `/hr/employee`

**子模块**:
- 员工管理: `/hr/employee`
- 员工查询: `/hr/employee/query`
- 考勤管理: `/hr/attendance`
- 薪资管理: `/hr/salary`
- 培训管理: `/hr/training`

**功能说明**:
- 员工信息管理
- 考勤记录管理
- 薪资计算与发放
- 培训计划管理
- 部门管理

**API端点**:
- `GET /api/hr/attendance` - 获取考勤记录
- `POST /api/hr/attendance` - 创建考勤记录
- `GET /api/hr/salary` - 获取薪资数据
- `POST /api/hr/salary` - 创建薪资记录
- `GET /api/hr/training` - 获取培训记录
- `POST /api/hr/training` - 创建培训计划
- `GET /api/hr/departments` - 获取部门列表

---

### 10. 质量管理模块

**页面路径**: `/quality/incoming`

**子模块**:
- 来料检验: `/quality/incoming`
- 过程检验: `/quality/process`
- 成品检验: `/quality/final`
- SGS管理: `/quality/sgs`
- 不合格品: `/quality/unqualified`
- 客户投诉: `/quality/complaint`
- 实验室测试: `/quality/lab-test`
- 供应商审核: `/quality/supplier-audit`
- 质量追溯: `/quality/trace`

**功能说明**:
- 来料检验记录
- 生产过程检验
- 成品质量检验
- SGS证书管理
- 不合格品处理
- 客户投诉处理
- 实验室测试记录
- 供应商质量审核
- 质量追溯查询

**API端点**:
- `GET /api/quality/incoming` - 获取来料检验记录
- `POST /api/quality/incoming` - 创建来料检验
- `GET /api/quality/process` - 获取过程检验记录
- `POST /api/quality/process` - 创建过程检验
- `GET /api/quality/final` - 获取成品检验记录
- `POST /api/quality/final` - 创建成品检验
- `GET /api/quality/sgs` - 获取SGS证书
- `GET /api/quality/complaint` - 获取客户投诉
- `POST /api/quality/complaint` - 创建投诉记录

---

### 11. 设备管理模块

**页面路径**: `/equipment`

**子模块**:
- 设备校准: `/equipment/calibration`
- 设备维护: `/equipment/maintenance`
- 设备维修: `/equipment/repair`
- 设备报废: `/equipment/scrap`

**功能说明**:
- 设备校准记录
- 设备维护计划
- 设备维修记录
- 设备报废管理
- 设备台账管理

**API端点**:
- `GET /api/equipment` - 获取设备列表
- `POST /api/equipment` - 新增设备
- `GET /api/equipment/calibration` - 获取校准记录
- `POST /api/equipment/calibration` - 创建校准记录
- `GET /api/equipment/maintenance` - 获取维护记录
- `POST /api/equipment/maintenance` - 创建维护记录
- `GET /api/equipment/repair` - 获取维修记录
- `POST /api/equipment/repair` - 创建维修记录
- `GET /api/equipment/scrap` - 获取报废记录
- `POST /api/equipment/scrap` - 创建报废记录

---

### 12. 打样管理模块

**页面路径**: `/sample/orders`

**子模块**:
- 样品订单: `/sample/orders`
- 新建订单: `/sample/orders/new`
- 订单详情: `/sample/orders/[id]`
- 编辑订单: `/sample/orders/[id]/edit`
- 标准色卡: `/sample/standard-card`
- 色卡录入: `/sample/standard-card/input`
- 色卡打印: `/sample/standard-card/print`
- 样品管理: `/sample/management`

**功能说明**:
- 样品订单管理
- 标准色卡管理
- 色卡录入与打印
- 样品与量产转换

**API端点**:
- `GET /api/sample/orders` - 获取样品订单列表
- `POST /api/sample/orders` - 创建样品订单
- `GET /api/sample/orders/linkage` - 获取订单关联数据
- `GET /api/standard-cards` - 获取标准色卡
- `POST /api/standard-cards` - 创建标准色卡
- `POST /api/standard-cards/approve` - 审批色卡

---

### 13. 印前管理模块 (DCPrint)

**页面路径**: `/dcprint`

**子模块**:
- 刀模管理: `/dcprint/die`
- 油墨管理: `/dcprint/ink`
- 油墨开盖: `/dcprint/ink-opening`
- 油墨使用: `/dcprint/ink-usage`
- 混合油墨: `/dcprint/ink-mixed`
- 标签管理: `/dcprint/labels`
- 工艺卡: `/dcprint/process-cards`
- 网版管理: `/dcprint/screen-plate`
- 追溯管理: `/dcprint/trace`

**功能说明**:
- 刀模信息管理
- 油墨库存管理
- 油墨开盖记录
- 油墨使用记录
- 混合油墨管理
- 标签打印与管理
- 工艺卡管理
- 网版生命周期管理
- 全流程追溯查询

**API端点**:
- `GET /api/screen-plates` - 获取网版列表
- `POST /api/screen-plates` - 创建网版
- `GET /api/screen-plates/history` - 获取网版历史
- `GET /api/ink-usages` - 获取油墨使用记录
- `POST /api/ink-usages` - 创建油墨使用记录
- `GET /api/dcprint/ink-opening` - 获取开盖记录
- `POST /api/dcprint/ink-opening` - 创建开盖记录
- `GET /api/dcprint/ink-mixed` - 获取混合记录
- `POST /api/dcprint/ink-mixed` - 创建混合记录
- `GET /api/material-labels` - 获取标签列表
- `POST /api/material-labels` - 创建标签
- `GET /api/dcprint/process-cards` - 获取工艺卡
- `POST /api/dcprint/process-cards` - 创建工艺卡
- `GET /api/dcprint/trace` - 获取追溯数据

---

### 14. 系统设置模块

**页面路径**: `/settings/users`

**子模块**:
- 用户管理: `/settings/users`
- 角色管理: `/settings/roles`
- 权限管理: `/settings/permissions`
- 菜单管理: `/settings/menus`
- 字典管理: `/settings/dict`
- 系统配置: `/settings/config`
- 操作日志: `/settings/oper-log`
- 登录日志: `/settings/login-log`
- 通知公告: `/settings/notice`
- 组织架构: `/settings/organization`
- 基础设置: `/settings/basics`
- 仓库分类: `/settings/warehouse-category`

**功能说明**:
- 用户账号管理
- 角色权限分配
- 菜单权限配置
- 数据字典管理
- 系统参数配置
- 操作日志查询
- 登录日志查询
- 通知公告管理
- 组织架构管理
- 仓库分类管理

**API端点**:
- `GET /api/system/user` - 获取用户列表
- `POST /api/system/user` - 创建用户
- `GET /api/system/roles` - 获取角色列表
- `POST /api/system/roles` - 创建角色
- `GET /api/role-permissions` - 获取权限数据
- `GET /api/menu` - 获取菜单列表
- `POST /api/menu` - 创建菜单
- `GET /api/system/dict-type` - 获取字典类型
- `POST /api/system/dict-type` - 创建字典类型
- `GET /api/system/dict-data` - 获取字典数据
- `POST /api/system/dict-data` - 创建字典数据
- `GET /api/system/config` - 获取系统配置
- `GET /api/system/oper-log` - 获取操作日志
- `GET /api/system/login-log` - 获取登录日志
- `GET /api/system/notice` - 获取通知公告

---

## 📊 数据库表结构

### 核心业务表

| 表名 | 说明 |
|------|------|
| `sys_user` | 用户表 |
| `sys_employee` | 员工表 |
| `sys_department` | 部门表 |
| `sys_role` | 角色表 |
| `crm_customer` | 客户表 |
| `pur_supplier` | 供应商表 |
| `sal_order` | 销售订单表 |
| `sal_order_item` | 销售订单明细表 |
| `prod_work_order` | 生产工单表 |
| `pur_order_std` | 采购订单表 |
| `pur_order_line_std` | 采购订单明细表 |
| `pur_request` | 采购申请表 |
| `inv_inbound_order` | 入库单表 |
| `inv_outbound_order` | 出库单表 |
| `inv_inventory` | 库存表 |
| `inv_inventory_batch` | 批次库存表 |
| `inv_material_label` | 物料标签表 |
| `base_ink` | 油墨基础表 |
| `ink_usage` | 油墨使用表 |
| `prd_screen_plate` | 网版表 |
| `screen_plate_history` | 网版历史表 |
| `hr_attendance` | 考勤表 |
| `qc_incoming_inspection` | 来料检验表 |

### 视图

| 视图名 | 说明 |
|--------|------|
| `v_purchase_request_full` | 采购申请完整视图 |
| `v_purchase_order_std_full` | 采购订单完整视图 |
| `v_bom_std_full` | BOM完整视图 |
| `v_inventory_batch_full` | 批次库存完整视图 |
| `v_hr_attendance_full` | 考勤完整视图 |
| `v_outbound_batch_allocation_full` | 出库批次分配完整视图 |

---

## 🧪 测试数据

系统已预置以下测试数据（每模块5条）：

### 客户数据
| 客户编码 | 客户名称 | 联系人 | 电话 |
|----------|----------|--------|------|
| CUST001 | 深圳华强包装有限公司 | 张三 | 13800138001 |
| CUST002 | 广州美达印刷集团 | 李四 | 13800138002 |
| CUST003 | 东莞精密电子科技 | 王五 | 13800138003 |
| CUST004 | 佛山华美包装材料 | 赵六 | 13800138004 |
| CUST005 | 中山恒达塑料制品 | 孙七 | 13800138005 |

### 供应商数据
| 供应商编码 | 供应商名称 | 联系人 | 电话 |
|------------|------------|--------|------|
| SUP001 | 上海油墨化工集团 | 周八 | 13900139001 |
| SUP002 | 江苏网版制造公司 | 吴九 | 13900139002 |
| SUP003 | 浙江包装材料厂 | 郑十 | 13900139003 |
| SUP004 | 山东化工原料公司 | 冯十一 | 13900139004 |
| SUP005 | 广东机械设备公司 | 陈十二 | 13900139005 |

### 采购申请数据
| 申请编号 | 申请日期 | 金额 | 状态 | 优先级 |
|----------|----------|------|------|--------|
| PR20260401001 | 2026-04-01 | ¥5,000 | 待审批 | 高 |
| PR20260402002 | 2026-04-02 | ¥8,000 | 已审批 | 高 |
| PR20260403003 | 2026-04-03 | ¥3,000 | 待审批 | 中 |
| PR20260404004 | 2026-04-04 | ¥12,000 | 待审批 | 高 |
| PR20260405005 | 2026-04-05 | ¥6,000 | 已审批 | 低 |

### 油墨数据
| 油墨编码 | 油墨名称 | 颜色 | 规格 | 单价 |
|----------|----------|------|------|------|
| INK-BLK-001 | 黑色丝印油墨 | 黑色 | 1kg/罐 | ¥85.00 |
| INK-WHT-002 | 白色丝印油墨 | 白色 | 1kg/罐 | ¥90.00 |
| INK-RED-003 | 红色丝印油墨 | 红色 | 1kg/罐 | ¥95.00 |
| INK-BLU-004 | 蓝色丝印油墨 | 蓝色 | 1kg/罐 | ¥92.00 |
| INK-GRN-005 | 绿色丝印油墨 | 绿色 | 1kg/罐 | ¥88.00 |

### 网版数据
| 网版编码 | 网版名称 | 目数 | 材质 | 尺寸 |
|----------|----------|------|------|------|
| SP20260401001 | 食品包装袋网版-80目 | 80 | 不锈钢 | 400x500mm |
| SP20260402002 | 印刷品网版-120目 | 120 | 不锈钢 | 500x600mm |
| SP20260403003 | 电子标签网版-200目 | 200 | 不锈钢 | 300x400mm |
| SP20260404004 | 包装材料网版-100目 | 100 | 不锈钢 | 450x550mm |
| SP20260405005 | 塑料制品网版-150目 | 150 | 不锈钢 | 600x700mm |

### 考勤数据
| 日期 | 员工 | 签到时间 | 签退时间 | 状态 |
|------|------|----------|----------|------|
| 2026-04-01 | 张三 | 08:30 | 17:30 | 正常 |
| 2026-04-02 | 李四 | 08:25 | 17:35 | 正常 |
| 2026-04-03 | 王五 | 08:45 | 17:30 | 迟到 |
| 2026-04-04 | 赵六 | 08:30 | 17:30 | 正常 |
| 2026-04-05 | 孙七 | 08:30 | 17:30 | 正常 |

### 标签数据
| 标签编号 | 物料编码 | 物料名称 | 数量 | 单位 |
|----------|----------|----------|------|------|
| LBL20260401001 | INK-BLK-001 | 黑色丝印油墨 | 500 | kg |
| LBL20260402002 | INK-WHT-002 | 白色丝印油墨 | 400 | kg |
| LBL20260403003 | INK-RED-003 | 红色丝印油墨 | 300 | kg |
| LBL20260404004 | INK-BLU-004 | 蓝色丝印油墨 | 350 | kg |
| LBL20260405005 | INK-GRN-005 | 绿色丝印油墨 | 450 | kg |

---

## 🔧 API 接口文档

### 认证接口

#### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

#### 注册
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "password",
  "email": "user@example.com"
}
```

### 客户接口

#### 获取客户列表
```
GET /api/customers?page=1&pageSize=10&keyword=
```

#### 创建客户
```
POST /api/customers
Content-Type: application/json

{
  "customer_code": "CUST006",
  "customer_name": "新客户名称",
  "contact_name": "联系人",
  "contact_phone": "13800138006",
  "address": "客户地址"
}
```

### 供应商接口

#### 获取供应商列表
```
GET /api/purchase/suppliers?page=1&pageSize=10
```

#### 创建供应商
```
POST /api/purchase/suppliers
Content-Type: application/json

{
  "supplier_code": "SUP006",
  "supplier_name": "新供应商",
  "contact_name": "联系人",
  "contact_phone": "13900139006"
}
```

---

## 📸 页面截图说明

由于无法直接提供截图，以下是各页面的截图建议位置：

### 登录页面
- 路径: `/login`
- 截图说明: 显示登录表单，包含用户名、密码输入框和登录按钮

### 仪表盘
- 路径: `/dashboard`
- 截图说明: 显示KPI卡片、图表和业务概览

### 客户管理
- 路径: `/orders/customers`
- 截图说明: 显示客户列表表格，包含搜索、新增、编辑、删除功能

### 销售订单
- 路径: `/orders/sales`
- 截图说明: 显示销售订单列表，包含订单状态、金额等信息

### 采购管理
- 路径: `/purchase/request`
- 截图说明: 显示采购申请列表，包含审批状态、优先级等信息

### 生产管理
- 路径: `/production/workorder`
- 截图说明: 显示生产工单列表，包含工单状态、进度等信息

### 仓储管理
- 路径: `/warehouse/inventory`
- 截图说明: 显示库存数据，包含物料、数量、仓库等信息

### 质量管理
- 路径: `/quality/incoming`
- 截图说明: 显示来料检验记录，包含检验结果、合格数量等信息

---

## 🛠️ 技术栈

- **前端框架**: Next.js 14+
- **UI组件库**: Ant Design / Tailwind CSS
- **数据库**: MySQL 8.0+
- **ORM**: mysql2
- **状态管理**: React Hooks
- **图表库**: ECharts / Chart.js
- **认证**: JWT

---

## 📝 开发指南

### 项目结构

```
erp-project/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API路由
│   │   ├── login/             # 登录页面
│   │   ├── dashboard/         # 仪表盘
│   │   ├── crm/               # CRM模块
│   │   ├── orders/            # 订单模块
│   │   ├── purchase/          # 采购模块
│   │   ├── production/        # 生产模块
│   │   ├── warehouse/         # 仓储模块
│   │   ├── finance/           # 财务模块
│   │   ├── hr/                # 人力资源模块
│   │   ├── quality/           # 质量管理模块
│   │   ├── equipment/         # 设备管理模块
│   │   ├── sample/            # 打样模块
│   │   ├── dcprint/           # 印前管理模块
│   │   └── settings/          # 系统设置
│   ├── lib/
│   │   └── db/                # 数据库连接
│   └── components/            # 公共组件
├── public/                    # 静态资源
└── package.json
```

### 添加新模块

1. 在 `src/app/` 下创建模块目录
2. 创建页面组件 `page.tsx`
3. 在 `src/app/api/` 下创建API路由
4. 更新菜单配置

---

## 🔐 安全说明

- 所有密码均经过加密存储
- API接口需要身份验证
- 敏感操作需要权限验证
- 数据库连接使用环境变量配置
- 防止SQL注入攻击
- XSS防护

---

## 📞 技术支持

如有问题，请联系技术支持团队或提交Issue。

---

## 📄 许可证

本项目仅供学习和内部使用。

---

*最后更新: 2026-04-30*
