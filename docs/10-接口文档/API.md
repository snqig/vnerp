# API Documentation

Generated: 2026-07-08T08:19:38.966Z

## Overview

Total API Routes: 317

## API Endpoints

### Audit Module

#### `/api/audit/logs`

**Methods:** 

**Description:** 审计日志API路由   功能：提供操作日志、登录日志、库存流水、财务流水的查询接口

**File:** `src\app\api\audit\logs\route.ts`

---

#### `/api/audit/report`

**Methods:** 

**Description:** 审计报告API路由   功能：生成审计报告、导出审计数据

**File:** `src\app\api\audit\report\route.ts`

---

### Auth Module

#### `/api/auth/cache/clear`

**Methods:** 

**Description:** No description

**File:** `src\app\api\auth\cache\clear\route.ts`

---

#### `/api/auth/change-password`

**Methods:** 

**Description:** No description

**File:** `src\app\api\auth\change-password\route.ts`

---

#### `/api/auth/login`

**Methods:** POST

**Description:** No description

**File:** `src\app\api\auth\login\route.ts`

---

#### `/api/auth/logout`

**Methods:** 

**Description:** No description

**File:** `src\app\api\auth\logout\route.ts`

---

#### `/api/auth/me`

**Methods:** 

**Description:** No description

**File:** `src\app\api\auth\me\route.ts`

---

#### `/api/auth/menus`

**Methods:** 

**Description:** No description

**File:** `src\app\api\auth\menus\route.ts`

---

#### `/api/auth/refresh`

**Methods:** 

**Description:** No description

**File:** `src\app\api\auth\refresh\route.ts`

---

#### `/api/auth/register`

**Methods:** 

**Description:** No description

**File:** `src\app\api\auth\register\route.ts`

---

#### `/api/auth/reset-lock`

**Methods:** POST

**Description:** No description

**File:** `src\app\api\auth\reset-lock\route.ts`

---

### Base-data Module

#### `/api/base-data/material-category`

**Methods:** 

**Description:** No description

**File:** `src\app\api\base-data\material-category\route.ts`

---

### Biz Module

#### `/api/biz/contract-review`

**Methods:** 

**Description:** No description

**File:** `src\app\api\biz\contract-review\route.ts`

---

### Business Module

#### `/api/business/contract-review`

**Methods:** 

**Description:** No description

**File:** `src\app\api\business\contract-review\route.ts`

---

### Crm Module

#### `/api/crm/analysis`

**Methods:** 

**Description:** No description

**File:** `src\app\api\crm\analysis\route.ts`

---

#### `/api/crm/follow`

**Methods:** 

**Description:** No description

**File:** `src\app\api\crm\follow\route.ts`

---

### Customers Module

#### `/api/customers`

**Methods:** 

**Description:** No description

**Parameters:**
```typescript
params: {
  status?: string;
  customerType?: string;
  followUpStatus?: string;
  keyword?: string;
}
```

**File:** `src\app\api\customers\route.ts`

---

### Dashboard Module

#### `/api/dashboard/ceo`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\dashboard\ceo\route.ts`

---

#### `/api/dashboard/finance`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\dashboard\finance\route.ts`

---

#### `/api/dashboard/kpi`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dashboard\kpi\route.ts`

---

#### `/api/dashboard/production`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\dashboard\production\route.ts`

---

#### `/api/dashboard/quality`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\dashboard\quality\route.ts`

---

#### `/api/dashboard`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\dashboard\route.ts`

---

#### `/api/dashboard/sales`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\dashboard\sales\route.ts`

---

#### `/api/dashboard/warehouse`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\dashboard\warehouse\route.ts`

---

### Db-relations Module

#### `/api/db-relations`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\db-relations\route.ts`

---

### Dcprint Module

#### `/api/dcprint/die`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\die\route.ts`

---

#### `/api/dcprint/die-maintenance`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\die-maintenance\route.ts`

---

#### `/api/dcprint/die-template`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\die-template\route.ts`

---

#### `/api/dcprint/die-usage`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\die-usage\route.ts`

---

#### `/api/dcprint/ink`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\ink\route.ts`

---

#### `/api/dcprint/ink-consumption`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\ink-consumption\route.ts`

---

#### `/api/dcprint/ink-dispatch`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\ink-dispatch\route.ts`

---

#### `/api/dcprint/ink-formula`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\ink-formula\route.ts`

---

#### `/api/dcprint/ink-init`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\ink-init\route.ts`

---

#### `/api/dcprint/ink-mixed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\ink-mixed\route.ts`

---

#### `/api/dcprint/ink-opening`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\ink-opening\route.ts`

---

#### `/api/dcprint/ink-query`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\ink-query\route.ts`

---

#### `/api/dcprint/ink-surplus`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\ink-surplus\route.ts`

---

#### `/api/dcprint/ink-usage`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\ink-usage\route.ts`

---

#### `/api/dcprint/labels`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\labels\route.ts`

---

#### `/api/dcprint/process-cards`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\process-cards\route.ts`

---

#### `/api/dcprint/scan`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\scan\route.ts`

---

#### `/api/dcprint/screen-plate`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\screen-plate\route.ts`

---

#### `/api/dcprint/trace`

**Methods:** 

**Description:** No description

**File:** `src\app\api\dcprint\trace\route.ts`

---

### Delivery Module

#### `/api/delivery/vehicles`

**Methods:** 

**Description:** No description

**Parameters:**
```typescript
params: { status: string | null; keyword: string | null }
```

**File:** `src\app\api\delivery\vehicles\route.ts`

---

### Diagnose Module

#### `/api/diagnose/all-tables`

**Methods:** 

**Description:** No description

**File:** `src\app\api\diagnose\all-tables\route.ts`

---

#### `/api/diagnose/column-types`

**Methods:** 

**Description:** No description

**File:** `src\app\api\diagnose\column-types\route.ts`

---

#### `/api/diagnose/final-inspection-schema`

**Methods:** 

**Description:** No description

**File:** `src\app\api\diagnose\final-inspection-schema\route.ts`

---

#### `/api/diagnose/inbound`

**Methods:** 

**Description:** No description

**File:** `src\app\api\diagnose\inbound\route.ts`

---

#### `/api/diagnose/insert-test`

**Methods:** 

**Description:** No description

**File:** `src\app\api\diagnose\insert-test\route.ts`

---

#### `/api/diagnose/inventory-schema`

**Methods:** 

**Description:** No description

**File:** `src\app\api\diagnose\inventory-schema\route.ts`

---

#### `/api/diagnose/label-status`

**Methods:** 

**Description:** No description

**File:** `src\app\api\diagnose\label-status\route.ts`

---

#### `/api/diagnose/material`

**Methods:** 

**Description:** No description

**File:** `src\app\api\diagnose\material\route.ts`

---

#### `/api/diagnose/show-columns`

**Methods:** 

**Description:** No description

**File:** `src\app\api\diagnose\show-columns\route.ts`

---

#### `/api/diagnose/table-schema`

**Methods:** 

**Description:** No description

**File:** `src\app\api\diagnose\table-schema\route.ts`

---

### Document-number Module

#### `/api/document-number`

**Methods:** 

**Description:** No description

**File:** `src\app\api\document-number\route.ts`

---

### Engineering Module

#### `/api/engineering/sample-to-mass`

**Methods:** 

**Description:** No description

**File:** `src\app\api\engineering\sample-to-mass\route.ts`

---

#### `/api/engineering/sop`

**Methods:** 

**Description:** No description

**File:** `src\app\api\engineering\sop\route.ts`

---

#### `/api/engineering/standard-card`

**Methods:** 

**Description:** No description

**File:** `src\app\api\engineering\standard-card\route.ts`

---

### Equipment Module

#### `/api/equipment/calibration`

**Methods:** 

**Description:** No description

**File:** `src\app\api\equipment\calibration\route.ts`

---

#### `/api/equipment/maintenance`

**Methods:** 

**Description:** 设备维保记录管理 API     GET    /api/equipment/maintenance               — 分页查询维保记录   GET    /api/equipment/maintenance?id=N          — 查询单条维保记录   GET    /api/equipment/maintenance?equipment_id=N— 按设备查询维保记录   POST   /api/equipment/maintenance               — 创建维保记录（同时更新设备 last_maintenance_date）   PUT    /api/equipment/maintenance               — 更新维保记录   DELETE /api/equipment/maintenance?id=N          — 删除维保记录

**File:** `src\app\api\equipment\maintenance\route.ts`

---

#### `/api/equipment/plan`

**Methods:** 

**Description:** 设备维保计划管理 API     GET    /api/equipment/plan                       — 分页查询维保计划   GET    /api/equipment/plan?id=N                  — 查询单条维保计划   GET    /api/equipment/plan?action=due-soon       — 查询即将到期的维保计划（lead_days 提醒窗口）   GET    /api/equipment/plan?equipment_id=N        — 按设备查询维保计划   POST   /api/equipment/plan                       — 创建维保计划（自动计算 next_execute_date）   PUT    /api/equipment/plan                       — 更新维保计划   DELETE /api/equipment/plan?id=N                  — 删除维保计划（软删除）

**File:** `src\app\api\equipment\plan\route.ts`

---

#### `/api/equipment/repair`

**Methods:** 

**Description:** No description

**File:** `src\app\api\equipment\repair\route.ts`

---

#### `/api/equipment`

**Methods:** 

**Description:** 设备台账管理 API     GET    /api/equipment          — 分页查询设备列表（支持筛选）   GET    /api/equipment?id=N     — 查询单个设备详情   POST   /api/equipment          — 创建设备   PUT    /api/equipment          — 更新设备   DELETE /api/equipment?id=N     — 删除设备（软删除）

**File:** `src\app\api\equipment\route.ts`

---

#### `/api/equipment/scrap`

**Methods:** 

**Description:** No description

**File:** `src\app\api\equipment\scrap\route.ts`

---

### Finance Module

#### `/api/finance/aging`

**Methods:** 

**Description:** 往来账龄分析 API      按账龄区间统计应收/应付款，识别坏账风险

**File:** `src\app\api\finance\aging\route.ts`

---

#### `/api/finance/cost`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\cost\route.ts`

---

#### `/api/finance/cost-variance`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\cost-variance\route.ts`

---

#### `/api/finance/costs`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\costs\route.ts`

---

#### `/api/finance/expense`

**Methods:** 

**Description:** 费用报销 API

**File:** `src\app\api\finance\expense\route.ts`

---

#### `/api/finance/invoice`

**Methods:** 

**Description:** 发票管理 API   支持采购发票、销售发票的记录和应收应付核销

**File:** `src\app\api\finance\invoice\route.ts`

---

#### `/api/finance/payable`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\payable\route.ts`

---

#### `/api/finance/payables`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\payables\route.ts`

---

#### `/api/finance/payables/[id]/payment`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\payables\[id]\payment\route.ts`

---

#### `/api/finance/payment`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\payment\route.ts`

---

#### `/api/finance/receipt`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\receipt\route.ts`

---

#### `/api/finance/receivable`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\receivable\route.ts`

---

#### `/api/finance/receivables`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\receivables\route.ts`

---

#### `/api/finance/receivables/[id]/receipt`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\receivables\[id]\receipt\route.ts`

---

#### `/api/finance/report`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\report\route.ts`

---

#### `/api/finance/stats`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\stats\route.ts`

---

#### `/api/finance/summary`

**Methods:** 

**Description:** No description

**File:** `src\app\api\finance\summary\route.ts`

---

### Health Module

#### `/api/health`

**Methods:** GET

**Description:** 系统健康检查 API   无需认证，用于负载均衡器和监控探针

**File:** `src\app\api\health\route.ts`

---

### Hr Module

#### `/api/hr/attendance`

**Methods:** 

**Description:** No description

**File:** `src\app\api\hr\attendance\route.ts`

---

#### `/api/hr/departments`

**Methods:** 

**Description:** No description

**File:** `src\app\api\hr\departments\route.ts`

---

#### `/api/hr/employees`

**Methods:** 

**Description:** No description

**File:** `src\app\api\hr\employees\route.ts`

---

#### `/api/hr/salary`

**Methods:** 

**Description:** No description

**File:** `src\app\api\hr\salary\route.ts`

---

#### `/api/hr/salary/stats`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\hr\salary\stats\route.ts`

---

#### `/api/hr/training`

**Methods:** 

**Description:** No description

**File:** `src\app\api\hr\training\route.ts`

---

### Init Module

#### `/api/init/bom-tables`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\init\bom-tables\route.ts`

---

#### `/api/init/business-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\business-seed\route.ts`

---

#### `/api/init/core-flow-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\core-flow-seed\route.ts`

---

#### `/api/init/data-logic`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\data-logic\route.ts`

---

#### `/api/init/department`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\department\route.ts`

---

#### `/api/init/die-template-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\die-template-seed\route.ts`

---

#### `/api/init/finance-tables`

**Methods:** POST

**Description:** No description

**File:** `src\app\api\init\finance-tables\route.ts`

---

#### `/api/init/full-business-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\full-business-seed\route.ts`

---

#### `/api/init/full-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\full-seed\route.ts`

---

#### `/api/init/full-tables`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\full-tables\route.ts`

---

#### `/api/init/inbound-tables`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\inbound-tables\route.ts`

---

#### `/api/init/ink-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\ink-seed\route.ts`

---

#### `/api/init/inventory-tables`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\inventory-tables\route.ts`

---

#### `/api/init/menus`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\menus\route.ts`

---

#### `/api/init/migrate`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\migrate\route.ts`

---

#### `/api/init/po-grn-tables`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\init\po-grn-tables\route.ts`

---

#### `/api/init/product-tables`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\init\product-tables\route.ts`

---

#### `/api/init/quality-final-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\quality-final-seed\route.ts`

---

#### `/api/init/related-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\related-seed\route.ts`

---

#### `/api/init/sample-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\sample-seed\route.ts`

---

#### `/api/init/sample-tables`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\init\sample-tables\route.ts`

---

#### `/api/init/seed-data`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\seed-data\route.ts`

---

#### `/api/init/settings-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\settings-seed\route.ts`

---

#### `/api/init/supplement-tables`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\supplement-tables\route.ts`

---

#### `/api/init/three-layer-tables`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\init\three-layer-tables\route.ts`

---

#### `/api/init/warehouse`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\warehouse\route.ts`

---

#### `/api/init/warehouse-category`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\warehouse-category\route.ts`

---

#### `/api/init/warehouse-category-seed`

**Methods:** 

**Description:** No description

**File:** `src\app\api\init\warehouse-category-seed\route.ts`

---

### Ink-usages Module

#### `/api/ink-usages`

**Methods:** 

**Description:** No description

**File:** `src\app\api\ink-usages\route.ts`

---

### Inventory Module

#### `/api/inventory/materials`

**Methods:** 

**Description:** No description

**File:** `src\app\api\inventory\materials\route.ts`

---

#### `/api/inventory`

**Methods:** 

**Description:** No description

**File:** `src\app\api\inventory\route.ts`

---

### Linkage Module

#### `/api/linkage/validate`

**Methods:** 

**Description:** 获取容差配置

**File:** `src\app\api\linkage\validate\route.ts`

---

### Material-labels Module

#### `/api/material-labels`

**Methods:** 

**Description:** No description

**File:** `src\app\api\material-labels\route.ts`

---

### Material-lifecycle Module

#### `/api/material-lifecycle`

**Methods:** 

**Description:** No description

**File:** `src\app\api\material-lifecycle\route.ts`

---

### Material-requisitions Module

#### `/api/material-requisitions`

**Methods:** 

**Description:** No description

**File:** `src\app\api\material-requisitions\route.ts`

---

#### `/api/material-requisitions/[id]/issue`

**Methods:** 

**Description:** No description

**File:** `src\app\api\material-requisitions\[id]\issue\route.ts`

---

### Material-returns Module

#### `/api/material-returns`

**Methods:** 

**Description:** No description

**File:** `src\app\api\material-returns\route.ts`

---

### Materials Module

#### `/api/materials`

**Methods:** 

**Description:** No description

**File:** `src\app\api\materials\route.ts`

---

### Menu Module

#### `/api/menu`

**Methods:** 

**Description:** No description

**File:** `src\app\api\menu\route.ts`

---

#### `/api/menu/sort-order`

**Methods:** 

**Description:** No description

**File:** `src\app\api\menu\sort-order\route.ts`

---

### Migrations Module

#### `/api/migrations/add-workshop-column`

**Methods:** GET, POST

**Description:** No description

**File:** `src\app\api\migrations\add-workshop-column\route.ts`

---

#### `/api/migrations/foreign-keys`

**Methods:** 

**Description:** No description

**File:** `src\app\api\migrations\foreign-keys\route.ts`

---

#### `/api/migrations/purchase-request-fk`

**Methods:** 

**Description:** No description

**File:** `src\app\api\migrations\purchase-request-fk\route.ts`

---

#### `/api/migrations/readmd-fixes`

**Methods:** 

**Description:** No description

**File:** `src\app\api\migrations\readmd-fixes\route.ts`

---

#### `/api/migrations/six-critical-fixes`

**Methods:** 

**Description:** No description

**File:** `src\app\api\migrations\six-critical-fixes\route.ts`

---

#### `/api/migrations/views`

**Methods:** 

**Description:** No description

**File:** `src\app\api\migrations\views\route.ts`

---

### Monitoring Module

#### `/api/monitoring`

**Methods:** 

**Description:** No description

**File:** `src\app\api\monitoring\route.ts`

---

### Openapi.json Module

#### `/api/openapi.json`

**Methods:** GET

**Description:** 动态返回 OpenAPI 3.0 规范     数据源：docs/10-接口文档/openapi.json   由 scripts/generate-api-docs.js 生成   可通过 pnpm docs:api 重新生成

**File:** `src\app\api\openapi.json\route.ts`

---

### Orders Module

#### `/api/orders/bom/expand`

**Methods:** 

**Description:** 展开单个产品的BOM   POST /api/orders/bom/expand      请求体：   {     "productId": 123,     "quantity": 100,     "maxDepth": 10,        // 可选，默认10     "enableCache": true    // 可选，默认true   }

**File:** `src\app\api\orders\bom\expand\route.ts`

---

#### `/api/orders/bom/materials`

**Methods:** 

**Description:** 获取物料列表   GET /api/orders/bom/materials

**File:** `src\app\api\orders\bom\materials\route.ts`

---

#### `/api/orders/bom`

**Methods:** 

**Description:** 获取BOM列表   GET /api/orders/bom

**File:** `src\app\api\orders\bom\route.ts`

---

#### `/api/orders/bom/[id]`

**Methods:** 

**Description:** 获取BOM详情   GET /api/orders/bom/{id}

**File:** `src\app\api\orders\bom\[id]\route.ts`

---

#### `/api/orders/customers`

**Methods:** 

**Description:** No description

**File:** `src\app\api\orders\customers\route.ts`

---

#### `/api/orders/export`

**Methods:** 

**Description:** No description

**File:** `src\app\api\orders\export\route.ts`

---

#### `/api/orders/products`

**Methods:** 

**Description:** No description

**File:** `src\app\api\orders\products\route.ts`

---

#### `/api/orders`

**Methods:** 

**Description:** No description

**File:** `src\app\api\orders\route.ts`

---

#### `/api/orders/sales`

**Methods:** 

**Description:** No description

**File:** `src\app\api\orders\sales\route.ts`

---

### Organization Module

#### `/api/organization/department`

**Methods:** 

**Description:** No description

**File:** `src\app\api\organization\department\route.ts`

---

#### `/api/organization/employee`

**Methods:** 

**Description:** No description

**Parameters:**
```typescript
params: {
  keyword?: string;
  dept_id?: string;
  role_id?: string;
  status?: string;
}
```

**File:** `src\app\api\organization\employee\route.ts`

---

#### `/api/organization/menu`

**Methods:** 

**Description:** No description

**File:** `src\app\api\organization\menu\route.ts`

---

#### `/api/organization/role`

**Methods:** 

**Description:** No description

**Parameters:**
```typescript
params: { keyword: string; status: string | null }
```

**File:** `src\app\api\organization\role\route.ts`

---

#### `/api/organization`

**Methods:** 

**Description:** No description

**File:** `src\app\api\organization\route.ts`

---

#### `/api/organization/warehouse-category`

**Methods:** 

**Description:** No description

**File:** `src\app\api\organization\warehouse-category\route.ts`

---

#### `/api/organization/warehouse-category/stats`

**Methods:** 

**Description:** No description

**File:** `src\app\api\organization\warehouse-category\stats\route.ts`

---

### Outsource Module

#### `/api/outsource/issue`

**Methods:** 

**Description:** No description

**File:** `src\app\api\outsource\issue\route.ts`

---

#### `/api/outsource/order`

**Methods:** 

**Description:** No description

**File:** `src\app\api\outsource\order\route.ts`

---

#### `/api/outsource/receive`

**Methods:** 

**Description:** No description

**File:** `src\app\api\outsource\receive\route.ts`

---

#### `/api/outsource/settlement`

**Methods:** 

**Description:** No description

**File:** `src\app\api\outsource\settlement\route.ts`

---

### Plm Module

#### `/api/plm/eco`

**Methods:** 

**Description:** No description

**File:** `src\app\api\plm\eco\route.ts`

---

#### `/api/plm/lifecycle`

**Methods:** 

**Description:** No description

**File:** `src\app\api\plm\lifecycle\route.ts`

---

### Prepress Module

#### `/api/prepress/die`

**Methods:** 

**Description:** No description

**File:** `src\app\api\prepress\die\route.ts`

---

#### `/api/prepress/die-maintenance`

**Methods:** 

**Description:** No description

**File:** `src\app\api\prepress\die-maintenance\route.ts`

---

#### `/api/prepress/die-migrate`

**Methods:** 

**Description:** No description

**File:** `src\app\api\prepress\die-migrate\route.ts`

---

#### `/api/prepress/die-template`

**Methods:** 

**Description:** No description

**File:** `src\app\api\prepress\die-template\route.ts`

---

#### `/api/prepress/die-usage`

**Methods:** 

**Description:** No description

**File:** `src\app\api\prepress\die-usage\route.ts`

---

#### `/api/prepress/ink`

**Methods:** 

**Description:** No description

**File:** `src\app\api\prepress\ink\route.ts`

---

#### `/api/prepress/screen-plate`

**Methods:** 

**Description:** No description

**File:** `src\app\api\prepress\screen-plate\route.ts`

---

### Production Module

#### `/api/production/bom`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\bom\route.ts`

---

#### `/api/production/material-issue`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\material-issue\route.ts`

---

#### `/api/production/material-return`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\material-return\route.ts`

---

#### `/api/production/mrp`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\mrp\route.ts`

---

#### `/api/production/orders`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\orders\route.ts`

---

#### `/api/production/process`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\process\route.ts`

---

#### `/api/production/process/stats`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\production\process\stats\route.ts`

---

#### `/api/production/process-route`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\process-route\route.ts`

---

#### `/api/production/product-label`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\product-label\route.ts`

---

#### `/api/production/schedule/auto`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\schedule\auto\route.ts`

---

#### `/api/production/schedule/capacity`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\schedule\capacity\route.ts`

---

#### `/api/production/schedule`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\schedule\route.ts`

---

#### `/api/production/schedule/stats`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\production\schedule\stats\route.ts`

---

#### `/api/production/trace`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\trace\route.ts`

---

#### `/api/production/work-order/color-seq`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\work-order\color-seq\route.ts`

---

#### `/api/production/work-order/create-multi-color`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\work-order\create-multi-color\route.ts`

---

#### `/api/production/work-orders`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\work-orders\route.ts`

---

#### `/api/production/work-report`

**Methods:** 

**Description:** No description

**File:** `src\app\api\production\work-report\route.ts`

---

### Products Module

#### `/api/products/categories`

**Methods:** 

**Description:** No description

**File:** `src\app\api\products\categories\route.ts`

---

#### `/api/products`

**Methods:** 

**Description:** No description

**File:** `src\app\api\products\route.ts`

---

### Project-files Module

#### `/api/project-files/gitignore`

**Methods:** POST

**Description:** No description

**File:** `src\app\api\project-files\gitignore\route.ts`

---

#### `/api/project-files`

**Methods:** GET

**Description:** 判断是否应该排除

**File:** `src\app\api\project-files\route.ts`

---

#### `/api/project-files/upload`

**Methods:** POST

**Description:** No description

**File:** `src\app\api\project-files\upload\route.ts`

---

### Purchase Module

#### `/api/purchase/convert-po`

**Methods:** 

**Description:** No description

**File:** `src\app\api\purchase\convert-po\route.ts`

---

#### `/api/purchase/orders`

**Methods:** 

**Description:** No description

**File:** `src\app\api\purchase\orders\route.ts`

---

#### `/api/purchase/reconciliation`

**Methods:** 

**Description:** No description

**File:** `src\app\api\purchase\reconciliation\route.ts`

---

#### `/api/purchase/request`

**Methods:** 

**Description:** No description

**File:** `src\app\api\purchase\request\route.ts`

---

#### `/api/purchase/return`

**Methods:** 

**Description:** No description

**File:** `src\app\api\purchase\return\route.ts`

---

#### `/api/purchase/suppliers`

**Methods:** 

**Description:** No description

**File:** `src\app\api\purchase\suppliers\route.ts`

---

### Qrcode Module

#### `/api/qrcode/payload`

**Methods:** GET, POST

**Description:** No description

**File:** `src\app\api\qrcode\payload\route.ts`

---

#### `/api/qrcode/print`

**Methods:** GET, POST

**Description:** No description

**File:** `src\app\api\qrcode\print\route.ts`

---

#### `/api/qrcode/records`

**Methods:** 

**Description:** No description

**File:** `src\app\api\qrcode\records\route.ts`

---

#### `/api/qrcode`

**Methods:** 

**Description:** No description

**File:** `src\app\api\qrcode\route.ts`

---

#### `/api/qrcode/trace`

**Methods:** 

**Description:** No description

**File:** `src\app\api\qrcode\trace\route.ts`

---

### Quality Module

#### `/api/quality/complaint`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\complaint\route.ts`

---

#### `/api/quality/final`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\final\route.ts`

---

#### `/api/quality/final/stats`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\quality\final\stats\route.ts`

---

#### `/api/quality/incoming`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\incoming\route.ts`

---

#### `/api/quality/lab-test`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\lab-test\route.ts`

---

#### `/api/quality/process`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\process\route.ts`

---

#### `/api/quality/process/stats`

**Methods:** GET

**Description:** No description

**File:** `src\app\api\quality\process\stats\route.ts`

---

#### `/api/quality/sgs/expiry-warning`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\sgs\expiry-warning\route.ts`

---

#### `/api/quality/sgs`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\sgs\route.ts`

---

#### `/api/quality/sgs/[id]`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\sgs\[id]\route.ts`

---

#### `/api/quality/spc`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\spc\route.ts`

---

#### `/api/quality/supplier-audit`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\supplier-audit\route.ts`

---

#### `/api/quality/unqualified`

**Methods:** 

**Description:** No description

**File:** `src\app\api\quality\unqualified\route.ts`

---

### Reports Module

#### `/api/reports/dashboard`

**Methods:** 

**Description:** 报表仪表盘 - 核心指标汇总

**File:** `src\app\api\reports\dashboard\route.ts`

---

#### `/api/reports/delivery-rate`

**Methods:** 

**Description:** 订单交付率报表   按月/客户统计订单准时交付率

**File:** `src\app\api\reports\delivery-rate\route.ts`

---

#### `/api/reports/inventory-turnover`

**Methods:** 

**Description:** 库存周转率报表   按品类/仓库统计库存周转情况

**File:** `src\app\api\reports\inventory-turnover\route.ts`

---

#### `/api/reports/production-cost`

**Methods:** 

**Description:** 生产成本汇总报表   标准成本 vs 实际成本对比

**File:** `src\app\api\reports\production-cost\route.ts`

---

### Role-permissions Module

#### `/api/role-permissions/buttons`

**Methods:** 

**Description:** No description

**File:** `src\app\api\role-permissions\buttons\route.ts`

---

#### `/api/role-permissions`

**Methods:** 

**Description:** No description

**File:** `src\app\api\role-permissions\route.ts`

---

### Sales Module

#### `/api/sales/convert-wo`

**Methods:** 

**Description:** No description

**File:** `src\app\api\sales\convert-wo\route.ts`

---

#### `/api/sales/delivery/partial`

**Methods:** 

**Description:** No description

**File:** `src\app\api\sales\delivery\partial\route.ts`

---

#### `/api/sales/delivery/re-ship`

**Methods:** 

**Description:** No description

**File:** `src\app\api\sales\delivery\re-ship\route.ts`

---

#### `/api/sales/delivery`

**Methods:** 

**Description:** No description

**File:** `src\app\api\sales\delivery\route.ts`

---

#### `/api/sales/delivery/[id]/ship`

**Methods:** 

**Description:** No description

**File:** `src\app\api\sales\delivery\[id]\ship\route.ts`

---

#### `/api/sales/orders`

**Methods:** 

**Description:** No description

**File:** `src\app\api\sales\orders\route.ts`

---

#### `/api/sales/reconciliation`

**Methods:** 

**Description:** No description

**File:** `src\app\api\sales\reconciliation\route.ts`

---

#### `/api/sales/return`

**Methods:** 

**Description:** No description

**File:** `src\app\api\sales\return\route.ts`

---

### Sample Module

#### `/api/sample/orders/linkage`

**Methods:** 

**Description:** No description

**File:** `src\app\api\sample\orders\linkage\route.ts`

---

#### `/api/sample/orders`

**Methods:** 

**Description:** No description

**File:** `src\app\api\sample\orders\route.ts`

---

### Screen-plates Module

#### `/api/screen-plates/history`

**Methods:** 

**Description:** No description

**File:** `src\app\api\screen-plates\history\route.ts`

---

#### `/api/screen-plates`

**Methods:** 

**Description:** No description

**File:** `src\app\api\screen-plates\route.ts`

---

### Settings Module

#### `/api/settings/category-linkage`

**Methods:** 

**Description:** No description

**File:** `src\app\api\settings\category-linkage\route.ts`

---

#### `/api/settings/category-rules`

**Methods:** 

**Description:** No description

**File:** `src\app\api\settings\category-rules\route.ts`

---

#### `/api/settings/change-approval`

**Methods:** 

**Description:** No description

**File:** `src\app\api\settings\change-approval\route.ts`

---

#### `/api/settings/system`

**Methods:** 

**Description:** No description

**File:** `src\app\api\settings\system\route.ts`

---

### Setup Module

#### `/api/setup/create-tables`

**Methods:** GET

**Description:** 安全开关：仅当显式设置 ALLOW_SETUP_API=true 时接口可用   生产环境默认禁用，避免建表接口被恶意调用导致数据被清空/重建

**File:** `src\app\api\setup\create-tables\route.ts`

---

### Srm Module

#### `/api/srm/evaluation`

**Methods:** 

**Description:** No description

**File:** `src\app\api\srm\evaluation\route.ts`

---

#### `/api/srm/evaluation/[id]`

**Methods:** 

**Description:** No description

**File:** `src\app\api\srm\evaluation\[id]\route.ts`

---

### Standard-card Module

#### `/api/standard-card/action`

**Methods:** 

**Description:** No description

**File:** `src\app\api\standard-card\action\route.ts`

---

#### `/api/standard-card/by-material`

**Methods:** 

**Description:** No description

**File:** `src\app\api\standard-card\by-material\route.ts`

---

#### `/api/standard-card`

**Methods:** 

**Description:** No description

**File:** `src\app\api\standard-card\route.ts`

---

### Standard-cards Module

#### `/api/standard-cards/approve`

**Methods:** 

**Description:** No description

**File:** `src\app\api\standard-cards\approve\route.ts`

---

#### `/api/standard-cards/by-material/[material_id]`

**Methods:** 

**Description:** No description

**File:** `src\app\api\standard-cards\by-material\[material_id]\route.ts`

---

#### `/api/standard-cards/by-work-order/[work_order_id]`

**Methods:** 

**Description:** No description

**File:** `src\app\api\standard-cards\by-work-order\[work_order_id]\route.ts`

---

#### `/api/standard-cards/check-deviation`

**Methods:** 

**Description:** No description

**File:** `src\app\api\standard-cards\check-deviation\route.ts`

---

#### `/api/standard-cards`

**Methods:** 

**Description:** No description

**File:** `src\app\api\standard-cards\route.ts`

---

#### `/api/standard-cards/scan`

**Methods:** 

**Description:** No description

**File:** `src\app\api\standard-cards\scan\route.ts`

---

### System Module

#### `/api/system/announcement`

**Methods:** 

**Description:** 系统公告 API

**File:** `src\app\api\system\announcement\route.ts`

---

#### `/api/system/config`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\config\route.ts`

---

#### `/api/system/config/update`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\config\update\route.ts`

---

#### `/api/system/data-fix`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\data-fix\route.ts`

---

#### `/api/system/data-scope`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\data-scope\route.ts`

---

#### `/api/system/dict`

**Methods:** 

**Description:** 字典管理 API

**File:** `src\app\api\system\dict\route.ts`

---

#### `/api/system/dict-data`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\dict-data\route.ts`

---

#### `/api/system/dict-type`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\dict-type\route.ts`

---

#### `/api/system/health/infrastructure`

**Methods:** GET

**Description:** 基础设施健康检查端点     不加鉴权：供 K8s/Nginx 负载均衡器探活使用。   仅返回状态与延迟，不暴露敏感数据。     HTTP 状态码：   - 200: healthy 或 degraded（服务可用但部分降级）   - 503: unhealthy（关键组件不可用）

**File:** `src\app\api\system\health\infrastructure\route.ts`

---

#### `/api/system/init`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\init\route.ts`

---

#### `/api/system/log/export`

**Methods:** 

**Description:** 操作日志导出 API   支持CSV格式导出

**File:** `src\app\api\system\log\export\route.ts`

---

#### `/api/system/login-log`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\login-log\route.ts`

---

#### `/api/system/monitor/deadlock`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\monitor\deadlock\route.ts`

---

#### `/api/system/monitor`

**Methods:** 

**Description:** 系统监控 API   提供系统运行状态、数据库状态、连接池状态等信息

**File:** `src\app\api\system\monitor\route.ts`

---

#### `/api/system/notice`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\notice\route.ts`

---

#### `/api/system/oper-log`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\oper-log\route.ts`

---

#### `/api/system/outbox`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\outbox\route.ts`

---

#### `/api/system/profile/password`

**Methods:** 

**Description:** 修改密码 API

**File:** `src\app\api\system\profile\password\route.ts`

---

#### `/api/system/profile`

**Methods:** 

**Description:** 个人中心 API   GET - 获取个人信息   PUT - 更新个人信息 / 修改密码

**File:** `src\app\api\system\profile\route.ts`

---

#### `/api/system/roles`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\roles\route.ts`

---

#### `/api/system/scheduler`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\scheduler\route.ts`

---

#### `/api/system/user/fix-names`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\user\fix-names\route.ts`

---

#### `/api/system/user`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\user\route.ts`

---

#### `/api/system/user/sync-names`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\user\sync-names\route.ts`

---

#### `/api/system/workflow`

**Methods:** 

**Description:** No description

**File:** `src\app\api\system\workflow\route.ts`

---

### Upload Module

#### `/api/upload/contract`

**Methods:** 

**Description:** No description

**File:** `src\app\api\upload\contract\route.ts`

---

#### `/api/upload`

**Methods:** 

**Description:** No description

**File:** `src\app\api\upload\route.ts`

---

#### `/api/upload/sop`

**Methods:** 

**Description:** No description

**File:** `src\app\api\upload\sop\route.ts`

---

### Warehouse Module

#### `/api/warehouse/alert-push`

**Methods:** 

**Description:** 库存预警推送 API      支持站内信、邮件推送库存预警通知   可配置预警规则和推送方式

**File:** `src\app\api\warehouse\alert-push\route.ts`

---

#### `/api/warehouse/batch`

**Methods:** 

**Description:** 批次/序列号管理 API      支持按批次管理物料，实现保质期预警、序列号追溯

**File:** `src\app\api\warehouse\batch\route.ts`

---

#### `/api/warehouse/batch/trace`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\batch\trace\route.ts`

---

#### `/api/warehouse/batch-inventory`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\batch-inventory\route.ts`

---

#### `/api/warehouse/categories`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\categories\route.ts`

---

#### `/api/warehouse/cost`

**Methods:** 

**Description:** 移动加权平均成本核算 API      移动加权平均法：每次入库后重新计算平均成本   公式：新平均成本 = (原库存金额 + 本次入库金额) / (原库存数量 + 本次入库数量)

**File:** `src\app\api\warehouse\cost\route.ts`

---

#### `/api/warehouse/fifo-recommend`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\fifo-recommend\route.ts`

---

#### `/api/warehouse/freeze`

**Methods:** 

**Description:** 库存冻结/解冻 API      支持按物料+仓库维度冻结库存，防止超卖   冻结的库存不参与可用库存计算

**File:** `src\app\api\warehouse\freeze\route.ts`

---

#### `/api/warehouse/inbound/audit`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\inbound\audit\route.ts`

---

#### `/api/warehouse/inbound/cutting`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\inbound\cutting\route.ts`

---

#### `/api/warehouse/inbound/labels`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\inbound\labels\route.ts`

---

#### `/api/warehouse/inbound`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\inbound\route.ts`

---

#### `/api/warehouse/inbound/scan`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\inbound\scan\route.ts`

---

#### `/api/warehouse/inbound/with-po`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\inbound\with-po\route.ts`

---

#### `/api/warehouse/ink-mixing`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\ink-mixing\route.ts`

---

#### `/api/warehouse/ink-opening`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\ink-opening\route.ts`

---

#### `/api/warehouse/inventory/adjust`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\inventory\adjust\route.ts`

---

#### `/api/warehouse/inventory/export`

**Methods:** 

**Description:** 库存流水导出 API      支持导出库存变动记录为CSV格式

**File:** `src\app\api\warehouse\inventory\export\route.ts`

---

#### `/api/warehouse/inventory/logs`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\inventory\logs\route.ts`

---

#### `/api/warehouse/inventory`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\inventory\route.ts`

---

#### `/api/warehouse/inventory/warning`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\inventory\warning\route.ts`

---

#### `/api/warehouse/outbound/confirm`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\outbound\confirm\route.ts`

---

#### `/api/warehouse/outbound/fifo`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\outbound\fifo\route.ts`

---

#### `/api/warehouse/outbound`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\outbound\route.ts`

---

#### `/api/warehouse/production-inbound`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\production-inbound\route.ts`

---

#### `/api/warehouse`

**Methods:** 

**Description:** No description

**Parameters:**
```typescript
params: {
  keyword?: string;
  type?: string;
  status?: string;
  categoryId?: string;
}
```

**File:** `src\app\api\warehouse\route.ts`

---

#### `/api/warehouse/sales-outbound`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\sales-outbound\route.ts`

---

#### `/api/warehouse/stock-adjust`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\stock-adjust\route.ts`

---

#### `/api/warehouse/stocktaking/diff-process`

**Methods:** 

**Description:** 盘点差异处理 API      盘点单审核后，差异需要经过审批才能调整库存   流程：盘点完成 → 差异确认 → 差异审批 → 库存调整

**File:** `src\app\api\warehouse\stocktaking\diff-process\route.ts`

---

#### `/api/warehouse/stocktaking`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\stocktaking\route.ts`

---

#### `/api/warehouse/stocktaking/[id]/items`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\stocktaking\[id]\items\route.ts`

---

#### `/api/warehouse/stocktaking/[id]/scan`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\stocktaking\[id]\scan\route.ts`

---

#### `/api/warehouse/stocktaking/[id]/split-summary`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\stocktaking\[id]\split-summary\route.ts`

---

#### `/api/warehouse/transfer`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\transfer\route.ts`

---

#### `/api/warehouse/transfer/[id]/inbound`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\transfer\[id]\inbound\route.ts`

---

#### `/api/warehouse/transfer/[id]/items`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\transfer\[id]\items\route.ts`

---

#### `/api/warehouse/transfer/[id]/outbound`

**Methods:** 

**Description:** No description

**File:** `src\app\api\warehouse\transfer\[id]\outbound\route.ts`

---

#### `/api/warehouse/unit-conversion`

**Methods:** 

**Description:** 多单位换算 API      支持物料的多单位管理，实现"箱→个"、"吨→公斤"等换算   换算关系：1 大单位 = N 小单位

**File:** `src\app\api\warehouse\unit-conversion\route.ts`

---

### Workflow Module

#### `/api/workflow/process`

**Methods:** 

**Description:** No description

**File:** `src\app\api\workflow\process\route.ts`

---

#### `/api/workflow/tasks`

**Methods:** 

**Description:** No description

**File:** `src\app\api\workflow\tasks\route.ts`

---

### Workorders Module

#### `/api/workorders`

**Methods:** 

**Description:** No description

**File:** `src\app\api\workorders\route.ts`

---

