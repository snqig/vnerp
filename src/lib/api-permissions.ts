/**
 * @module api-permissions
 * @description API 权限检查系统，定义了系统中所有权限标识、路由与 HTTP 方法的权限映射关系，
 * 以及权限校验的核心逻辑。所有需要权限控制的 API 路由均通过此模块进行访问级别判断。
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndErrorHandler, FIRST_LOGIN_WHITELIST, RouteHandlerContext } from './api-auth';
import { logOperation } from './api-response';
import { UserInfo, hasPermission } from './auth';

/**
 * 系统中所有权限标识的常量定义
 *
 * 每个权限标识采用 `模块:操作` 的格式，用于在角色权限配置和 API 路由权限检查中
 * 标识用户对特定资源的访问级别。如 `warehouse:view` 表示仓库查看权限，
 * `warehouse:create` 表示仓库创建权限。
 */
export const API_PERMISSIONS = {
  WAREHOUSE_VIEW: 'warehouse:view',
  WAREHOUSE_CREATE: 'warehouse:create',
  WAREHOUSE_UPDATE: 'warehouse:update',
  WAREHOUSE_DELETE: 'warehouse:delete',
  INVENTORY_VIEW: 'inventory:view',
  INBOUND_CREATE: 'inbound:create',
  INBOUND_APPROVE: 'inbound:approve',
  OUTBOUND_CREATE: 'outbound:create',
  OUTBOUND_CONFIRM: 'outbound:confirm',
  OUTBOUND_CANCEL: 'outbound:cancel',

  WORKORDER_VIEW: 'workorder:view',
  WORKORDER_CREATE: 'workorder:create',
  WORKORDER_UPDATE: 'workorder:update',
  WORKORDER_DELETE: 'workorder:delete',
  PRODUCTION_SCHEDULE: 'production:schedule',

  QUALITY_VIEW: 'quality:view',
  QUALITY_INSPECT: 'quality:inspect',
  QUALITY_APPROVE: 'quality:approve',

  ORDER_VIEW: 'order:view',
  ORDER_CREATE: 'order:create',
  ORDER_UPDATE: 'order:update',
  ORDER_DELETE: 'order:delete',

  CUSTOMER_VIEW: 'customer:view',
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_UPDATE: 'customer:update',
  CUSTOMER_DELETE: 'customer:delete',

  SUPPLIER_VIEW: 'supplier:view',
  SUPPLIER_CREATE: 'supplier:create',
  SUPPLIER_UPDATE: 'supplier:update',
  SUPPLIER_DELETE: 'supplier:delete',

  PURCHASE_VIEW: 'purchase:view',
  PURCHASE_CREATE: 'purchase:create',
  PURCHASE_APPROVE: 'purchase:approve',

  FINANCE_VIEW: 'finance:view',
  FINANCE_CREATE: 'finance:create',
  FINANCE_APPROVE: 'finance:approve',

  SYSTEM_USER: 'system:user',
  SYSTEM_ROLE: 'system:role',
  SYSTEM_MENU: 'system:menu',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOG: 'system:log',
  SYSTEM_MONITOR: 'system:monitor',
  SYSTEM_SETUP: 'system:setup',
  SYSTEM_MIGRATE: 'system:migrate',
  // 字典删除（独立权限，避免误删字典类型/数据）
  SYSTEM_DICT_TYPE_MANAGE: 'system:dict-type:manage',
  SYSTEM_DICT_DATA_MANAGE: 'system:dict-data:manage',

  // 人力资源
  HR_EMPLOYEE: 'hr:employee',
  HR_ATTENDANCE: 'hr:attendance',
  HR_SALARY: 'hr:salary',
  HR_TRAINING: 'hr:training',
  HR_DEPARTMENT: 'hr:department',

  // 设备管理
  EQUIPMENT_VIEW: 'equipment:view',
  EQUIPMENT_CREATE: 'equipment:create',
  EQUIPMENT_UPDATE: 'equipment:update',
  EQUIPMENT_DELETE: 'equipment:delete',
  EQUIPMENT_MAINTENANCE: 'equipment:maintenance',
  EQUIPMENT_REPAIR: 'equipment:repair',
  EQUIPMENT_CALIBRATION: 'equipment:calibration',
  EQUIPMENT_SCRAP: 'equipment:scrap',

  // 印前/印制管理
  DCPRESET_TRACE: 'dcprint:trace',
  DCPRESET_PROCESS_CARD: 'dcprint:process-card',
  DCPRESET_LABEL: 'dcprint:label',
  DCPRESET_INK: 'dcprint:ink',
  DCPRESET_TOOL_VIEW: 'dcprint:tool:view',
  DCPRESET_TOOL_CREATE: 'dcprint:tool:create',
  DCPRESET_TOOL_UPDATE: 'dcprint:tool:update',
  DCPRESET_TOOL_DELETE: 'dcprint:tool:delete',
  DCPRESET_TOOL_USE: 'dcprint:tool:use',
  DCPRESET_TOOL_MAINTENANCE: 'dcprint:tool:maintenance',
  DCPRESET_TOOL_SCRAP: 'dcprint:tool:scrap',
  DCPRESET_SAMPLE_CARD_VIEW: 'dcprint:sample-card:view',
  DCPRESET_SAMPLE_CARD_CREATE: 'dcprint:sample-card:create',
  DCPRESET_SAMPLE_CARD_UPDATE: 'dcprint:sample-card:update',
  DCPRESET_SAMPLE_CARD_DELETE: 'dcprint:sample-card:delete',
  DCPRESET_SAMPLE_CARD_SUBMIT: 'dcprint:sample-card:submit',
  DCPRESET_SAMPLE_CARD_CONFIRM: 'dcprint:sample-card:confirm',
  DCPRESET_SAMPLE_CARD_DUPLICATE: 'dcprint:sample-card:duplicate',
  PREPRESS_DIE: 'prepress:die',
  PREPRESS_SCREEN_PLATE: 'prepress:screen-plate',
  PREPRESS_INK: 'prepress:ink',

  // 外包管理
  OUTSOURCE_VIEW: 'outsource:view',
  OUTSOURCE_CREATE: 'outsource:create',
  OUTSOURCE_UPDATE: 'outsource:update',
  OUTSOURCE_DELETE: 'outsource:delete',

  // 样品管理
  SAMPLE_VIEW: 'sample:view',
  SAMPLE_CREATE: 'sample:create',
  SAMPLE_UPDATE: 'sample:update',
  SAMPLE_DELETE: 'sample:delete',

  // 报表/仪表盘
  REPORT_VIEW: 'report:view',
  DASHBOARD_VIEW: 'dashboard:view',

  // SRM/PLM
  SRM_EVALUATION: 'srm:evaluation',
  PLM_LIFECYCLE: 'plm:lifecycle',
  PLM_ECO: 'plm:eco',

  // 审计
  AUDIT_VIEW: 'audit:view',

  // 文件上传
  UPLOAD_FILE: 'upload:file',

  // 标准卡
  STANDARD_CARD_VIEW: 'standard-card:view',
  STANDARD_CARD_CREATE: 'standard-card:create',
  STANDARD_CARD_UPDATE: 'standard-card:update',
  STANDARD_CARD_APPROVE: 'standard-card:approve',
  STANDARD_CARD_SCAN: 'standard-card:scan',

  // 物料领用/退料
  MATERIAL_REQUISITION: 'material:requisition',
  MATERIAL_RETURN: 'material:return',
  MATERIAL_LABEL: 'material:label',

  // 二维码
  QRCODE_VIEW: 'qrcode:view',

  // 组织管理
  ORG_DEPARTMENT: 'organization:department',
  ORG_ROLE: 'organization:role',
  ORG_MENU: 'organization:menu',
  ORG_EMPLOYEE: 'organization:employee',
  ORG_WAREHOUSE_CATEGORY: 'organization:warehouse-category',

  // CRM
  CRM_FOLLOW: 'crm:follow',
  CRM_ANALYSIS: 'crm:analysis',

  // 产品/物料
  PRODUCT_VIEW: 'product:view',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  MATERIAL_VIEW: 'material:view',
  MATERIAL_CREATE: 'material:create',
  MATERIAL_UPDATE: 'material:update',

  // 交付
  DELIVERY_VIEW: 'delivery:view',
  DELIVERY_CREATE: 'delivery:create',
  DELIVERY_UPDATE: 'delivery:update',

  // BOM/MRP/排产
  BOM_VIEW: 'bom:view',
  BOM_CREATE: 'bom:create',
  BOM_UPDATE: 'bom:update',
  MRP_RUN: 'mrp:run',
  SCHEDULE_VIEW: 'schedule:view',
  SCHEDULE_CREATE: 'schedule:create',

  // 质量扩展
  QUALITY_SPC: 'quality:spc',
  QUALITY_SGS: 'quality:sgs',
  QUALITY_COMPLAINT: 'quality:complaint',
  QUALITY_UNQUALIFIED: 'quality:unqualified',
  QUALITY_AUDIT: 'quality:audit',
  QUALITY_LAB_TEST: 'quality:lab-test',

  // 财务扩展
  FINANCE_RECEIVABLE: 'finance:receivable',
  FINANCE_PAYABLE: 'finance:payable',
  FINANCE_RECEIPT: 'finance:receipt',
  FINANCE_PAYMENT: 'finance:payment',
  FINANCE_STATS: 'finance:stats',
  FINANCE_COST_VARIANCE: 'finance:cost-variance',
  FINANCE_EXPENSE: 'finance:expense',
  FINANCE_INVOICE: 'finance:invoice',
  FINANCE_AGING: 'finance:aging',
  FINANCE_SUMMARY: 'finance:summary',

  // 仓储扩展
  WAREHOUSE_STOCKTAKE: 'warehouse:stocktake',
  WAREHOUSE_TRANSFER: 'warehouse:transfer',
  WAREHOUSE_STOCK_ADJUST: 'warehouse:stock-adjust',
  WAREHOUSE_BATCH: 'warehouse:batch',
  WAREHOUSE_INK: 'warehouse:ink',
  WAREHOUSE_CATEGORY: 'warehouse:category',

  // 设置
  SETTINGS_APPROVAL: 'settings:approval',
  SETTINGS_LINKAGE: 'settings:linkage',

  // 工作流
  WORKFLOW_TASK: 'workflow:task',
  WORKFLOW_PROCESS: 'workflow:process',
} as const;

/**
 * 路径与 HTTP 方法的权限映射表
 *
 * 将每个 API 路径前缀映射到其各 HTTP 方法（GET/POST/PUT/DELETE/PATCH）所需的权限标识。
 * 路由匹配采用最长前缀匹配策略，路径越长优先级越高。用于 `getRequiredPermission` 函数
 * 查找请求所需的权限。
 */
export const ROUTE_PERMISSIONS: Record<
  string,
  { GET?: string; POST?: string; PUT?: string; DELETE?: string; PATCH?: string }
> = {
  '/api/warehouse': {
    GET: API_PERMISSIONS.WAREHOUSE_VIEW,
    POST: API_PERMISSIONS.WAREHOUSE_CREATE,
    PUT: API_PERMISSIONS.WAREHOUSE_UPDATE,
    DELETE: API_PERMISSIONS.WAREHOUSE_DELETE,
  },
  '/api/warehouse/inbound': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.INBOUND_CREATE,
    PUT: API_PERMISSIONS.INBOUND_APPROVE,
  },
  '/api/warehouse/outbound': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.OUTBOUND_CREATE,
    PUT: API_PERMISSIONS.OUTBOUND_CREATE,
    DELETE: API_PERMISSIONS.OUTBOUND_CREATE,
  },
  '/api/warehouse/outbound/confirm': {
    POST: API_PERMISSIONS.OUTBOUND_CONFIRM,
    PUT: API_PERMISSIONS.OUTBOUND_CANCEL,
  },
  '/api/warehouse/outbound/fifo': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.OUTBOUND_CREATE,
    PATCH: API_PERMISSIONS.OUTBOUND_CONFIRM,
  },
  '/api/inventory': { GET: API_PERMISSIONS.INVENTORY_VIEW, POST: API_PERMISSIONS.OUTBOUND_CREATE },
  '/api/workorders': {
    GET: API_PERMISSIONS.WORKORDER_VIEW,
    POST: API_PERMISSIONS.WORKORDER_CREATE,
    PUT: API_PERMISSIONS.WORKORDER_UPDATE,
    DELETE: API_PERMISSIONS.WORKORDER_DELETE,
  },
  '/api/production/orders': { GET: API_PERMISSIONS.WORKORDER_VIEW },
  '/api/quality/incoming': {
    GET: API_PERMISSIONS.QUALITY_VIEW,
    POST: API_PERMISSIONS.QUALITY_INSPECT,
  },
  '/api/quality/process': {
    GET: API_PERMISSIONS.QUALITY_VIEW,
    POST: API_PERMISSIONS.QUALITY_INSPECT,
  },
  '/api/quality/final': {
    GET: API_PERMISSIONS.QUALITY_VIEW,
    POST: API_PERMISSIONS.QUALITY_INSPECT,
  },
  '/api/orders/sales': { GET: API_PERMISSIONS.ORDER_VIEW, POST: API_PERMISSIONS.ORDER_CREATE },
  '/api/sales/return': {
    GET: API_PERMISSIONS.ORDER_VIEW,
    POST: API_PERMISSIONS.ORDER_CREATE,
    PUT: API_PERMISSIONS.ORDER_UPDATE,
    DELETE: API_PERMISSIONS.ORDER_DELETE,
  },
  '/api/customers': {
    GET: API_PERMISSIONS.CUSTOMER_VIEW,
    POST: API_PERMISSIONS.CUSTOMER_CREATE,
    PUT: API_PERMISSIONS.CUSTOMER_UPDATE,
    DELETE: API_PERMISSIONS.CUSTOMER_DELETE,
  },
  '/api/purchase/orders': {
    GET: API_PERMISSIONS.PURCHASE_VIEW,
    POST: API_PERMISSIONS.PURCHASE_CREATE,
  },
  '/api/purchase/request': {
    GET: API_PERMISSIONS.PURCHASE_VIEW,
    POST: API_PERMISSIONS.PURCHASE_CREATE,
  },
  '/api/purchase/return': {
    GET: API_PERMISSIONS.PURCHASE_VIEW,
    POST: API_PERMISSIONS.PURCHASE_CREATE,
    PUT: API_PERMISSIONS.PURCHASE_APPROVE,
    DELETE: API_PERMISSIONS.PURCHASE_APPROVE,
  },
  '/api/purchase/reconciliation': {
    GET: API_PERMISSIONS.PURCHASE_VIEW,
    POST: API_PERMISSIONS.PURCHASE_CREATE,
    PUT: API_PERMISSIONS.FINANCE_APPROVE,
    DELETE: API_PERMISSIONS.PURCHASE_APPROVE,
  },
  '/api/purchase/suppliers': {
    GET: API_PERMISSIONS.SUPPLIER_VIEW,
    POST: API_PERMISSIONS.SUPPLIER_CREATE,
    PUT: API_PERMISSIONS.SUPPLIER_UPDATE,
    DELETE: API_PERMISSIONS.SUPPLIER_DELETE,
  },
  '/api/system/user': {
    GET: API_PERMISSIONS.SYSTEM_USER,
    POST: API_PERMISSIONS.SYSTEM_USER,
    PUT: API_PERMISSIONS.SYSTEM_USER,
    DELETE: API_PERMISSIONS.SYSTEM_USER,
  },
  '/api/system/roles': {
    GET: API_PERMISSIONS.SYSTEM_ROLE,
    POST: API_PERMISSIONS.SYSTEM_ROLE,
    PUT: API_PERMISSIONS.SYSTEM_ROLE,
    DELETE: API_PERMISSIONS.SYSTEM_ROLE,
  },
  '/api/system/menu': {
    GET: API_PERMISSIONS.SYSTEM_MENU,
    POST: API_PERMISSIONS.SYSTEM_MENU,
    PUT: API_PERMISSIONS.SYSTEM_MENU,
    DELETE: API_PERMISSIONS.SYSTEM_MENU,
  },
  '/api/system/oper-log': { GET: API_PERMISSIONS.SYSTEM_LOG, DELETE: API_PERMISSIONS.SYSTEM_LOG },
  '/api/system/login-log': { GET: API_PERMISSIONS.SYSTEM_LOG, DELETE: API_PERMISSIONS.SYSTEM_LOG },
  '/api/system/log': { GET: API_PERMISSIONS.SYSTEM_LOG, POST: API_PERMISSIONS.SYSTEM_LOG },
  '/api/system/config': {
    GET: API_PERMISSIONS.SYSTEM_CONFIG,
    PUT: API_PERMISSIONS.SYSTEM_CONFIG,
    POST: API_PERMISSIONS.SYSTEM_CONFIG,
    DELETE: API_PERMISSIONS.SYSTEM_CONFIG,
  },
  '/api/system/dict': {
    GET: API_PERMISSIONS.SYSTEM_CONFIG,
    POST: API_PERMISSIONS.SYSTEM_CONFIG,
    PUT: API_PERMISSIONS.SYSTEM_CONFIG,
    DELETE: API_PERMISSIONS.SYSTEM_CONFIG,
  },
  '/api/system/dict-type': {
    GET: API_PERMISSIONS.SYSTEM_CONFIG,
    POST: API_PERMISSIONS.SYSTEM_DICT_TYPE_MANAGE,
    PUT: API_PERMISSIONS.SYSTEM_DICT_TYPE_MANAGE,
    DELETE: API_PERMISSIONS.SYSTEM_DICT_TYPE_MANAGE,
  },
  '/api/system/dict-data': {
    GET: API_PERMISSIONS.SYSTEM_CONFIG,
    POST: API_PERMISSIONS.SYSTEM_DICT_DATA_MANAGE,
    PUT: API_PERMISSIONS.SYSTEM_DICT_DATA_MANAGE,
    DELETE: API_PERMISSIONS.SYSTEM_DICT_DATA_MANAGE,
  },
  '/api/system/data-scope': { GET: API_PERMISSIONS.SYSTEM_ROLE, PUT: API_PERMISSIONS.SYSTEM_ROLE },
  '/api/system/announcement': {
    GET: API_PERMISSIONS.SYSTEM_CONFIG,
    POST: API_PERMISSIONS.SYSTEM_CONFIG,
    PUT: API_PERMISSIONS.SYSTEM_CONFIG,
    DELETE: API_PERMISSIONS.SYSTEM_CONFIG,
  },
  '/api/system/notice': {
    GET: API_PERMISSIONS.SYSTEM_CONFIG,
    POST: API_PERMISSIONS.SYSTEM_CONFIG,
    PUT: API_PERMISSIONS.SYSTEM_CONFIG,
    DELETE: API_PERMISSIONS.SYSTEM_CONFIG,
  },
  '/api/system/scheduler': {
    GET: API_PERMISSIONS.SYSTEM_CONFIG,
    POST: API_PERMISSIONS.SYSTEM_CONFIG,
    PUT: API_PERMISSIONS.SYSTEM_CONFIG,
    DELETE: API_PERMISSIONS.SYSTEM_CONFIG,
  },
  '/api/system/workflow': {
    GET: API_PERMISSIONS.SYSTEM_CONFIG,
    POST: API_PERMISSIONS.SYSTEM_CONFIG,
    PUT: API_PERMISSIONS.SYSTEM_CONFIG,
    DELETE: API_PERMISSIONS.SYSTEM_CONFIG,
  },
  '/api/system/monitor': { GET: API_PERMISSIONS.SYSTEM_CONFIG },
  '/api/system/outbox': { GET: API_PERMISSIONS.SYSTEM_CONFIG },
  '/api/system/data-fix': {
    GET: API_PERMISSIONS.SYSTEM_CONFIG,
    POST: API_PERMISSIONS.SYSTEM_CONFIG,
  },
  '/api/system/init': { GET: API_PERMISSIONS.SYSTEM_CONFIG, POST: API_PERMISSIONS.SYSTEM_CONFIG },
  '/api/system/profile/password': { PUT: API_PERMISSIONS.SYSTEM_USER },
  '/api/auth/cache': { POST: API_PERMISSIONS.SYSTEM_CONFIG },
  '/api/finance/cost': { GET: API_PERMISSIONS.FINANCE_VIEW },
  '/api/finance/payable': { GET: API_PERMISSIONS.FINANCE_VIEW },
  '/api/finance/receipt': { GET: API_PERMISSIONS.FINANCE_VIEW },
  '/api/finance/receivables': {
    GET: API_PERMISSIONS.FINANCE_RECEIVABLE,
    POST: API_PERMISSIONS.FINANCE_RECEIVABLE,
    PUT: API_PERMISSIONS.FINANCE_RECEIVABLE,
    DELETE: API_PERMISSIONS.FINANCE_RECEIVABLE,
  },
  '/api/finance/receivable': {
    GET: API_PERMISSIONS.FINANCE_RECEIVABLE,
    POST: API_PERMISSIONS.FINANCE_RECEIVABLE,
    PUT: API_PERMISSIONS.FINANCE_RECEIVABLE,
    DELETE: API_PERMISSIONS.FINANCE_RECEIVABLE,
  },
  '/api/finance/payables': {
    GET: API_PERMISSIONS.FINANCE_PAYABLE,
    POST: API_PERMISSIONS.FINANCE_PAYABLE,
    PUT: API_PERMISSIONS.FINANCE_PAYABLE,
    DELETE: API_PERMISSIONS.FINANCE_PAYABLE,
  },
  '/api/finance/payment': {
    GET: API_PERMISSIONS.FINANCE_PAYMENT,
    POST: API_PERMISSIONS.FINANCE_PAYMENT,
    PUT: API_PERMISSIONS.FINANCE_PAYMENT,
  },
  '/api/finance/stats': { GET: API_PERMISSIONS.FINANCE_STATS },
  '/api/finance/report': { GET: API_PERMISSIONS.FINANCE_STATS },
  '/api/finance/costs': { GET: API_PERMISSIONS.FINANCE_VIEW, POST: API_PERMISSIONS.FINANCE_VIEW },
  '/api/finance/cost-variance': { GET: API_PERMISSIONS.FINANCE_COST_VARIANCE },
  '/api/finance/expense': {
    GET: API_PERMISSIONS.FINANCE_EXPENSE,
    POST: API_PERMISSIONS.FINANCE_EXPENSE,
    PUT: API_PERMISSIONS.FINANCE_EXPENSE,
    DELETE: API_PERMISSIONS.FINANCE_EXPENSE,
  },
  '/api/finance/invoice': {
    GET: API_PERMISSIONS.FINANCE_INVOICE,
    POST: API_PERMISSIONS.FINANCE_INVOICE,
    PUT: API_PERMISSIONS.FINANCE_INVOICE,
    DELETE: API_PERMISSIONS.FINANCE_INVOICE,
  },
  '/api/finance/aging': { GET: API_PERMISSIONS.FINANCE_AGING },
  '/api/finance/summary': { GET: API_PERMISSIONS.FINANCE_SUMMARY },

  // === 人力资源 ===
  '/api/hr/employees': {
    GET: API_PERMISSIONS.HR_EMPLOYEE,
    POST: API_PERMISSIONS.HR_EMPLOYEE,
    PUT: API_PERMISSIONS.HR_EMPLOYEE,
    DELETE: API_PERMISSIONS.HR_EMPLOYEE,
  },
  '/api/hr/salary': {
    GET: API_PERMISSIONS.HR_SALARY,
    POST: API_PERMISSIONS.HR_SALARY,
    PUT: API_PERMISSIONS.HR_SALARY,
  },
  '/api/hr/attendance': {
    GET: API_PERMISSIONS.HR_ATTENDANCE,
    POST: API_PERMISSIONS.HR_ATTENDANCE,
    PUT: API_PERMISSIONS.HR_ATTENDANCE,
  },
  '/api/hr/training': {
    GET: API_PERMISSIONS.HR_TRAINING,
    POST: API_PERMISSIONS.HR_TRAINING,
    PUT: API_PERMISSIONS.HR_TRAINING,
    DELETE: API_PERMISSIONS.HR_TRAINING,
  },
  '/api/hr/departments': {
    GET: API_PERMISSIONS.HR_DEPARTMENT,
    POST: API_PERMISSIONS.HR_DEPARTMENT,
    PUT: API_PERMISSIONS.HR_DEPARTMENT,
  },

  // === 组织管理 ===
  '/api/organization': {
    GET: API_PERMISSIONS.ORG_DEPARTMENT,
    POST: API_PERMISSIONS.ORG_DEPARTMENT,
    PUT: API_PERMISSIONS.ORG_DEPARTMENT,
    DELETE: API_PERMISSIONS.ORG_DEPARTMENT,
  },
  '/api/organization/department': {
    GET: API_PERMISSIONS.ORG_DEPARTMENT,
    POST: API_PERMISSIONS.ORG_DEPARTMENT,
    PUT: API_PERMISSIONS.ORG_DEPARTMENT,
    DELETE: API_PERMISSIONS.ORG_DEPARTMENT,
  },
  '/api/organization/role': {
    GET: API_PERMISSIONS.ORG_ROLE,
    POST: API_PERMISSIONS.ORG_ROLE,
    PUT: API_PERMISSIONS.ORG_ROLE,
    DELETE: API_PERMISSIONS.ORG_ROLE,
  },
  '/api/organization/menu': {
    GET: API_PERMISSIONS.ORG_MENU,
    POST: API_PERMISSIONS.ORG_MENU,
    PUT: API_PERMISSIONS.ORG_MENU,
    DELETE: API_PERMISSIONS.ORG_MENU,
  },
  '/api/organization/employee': {
    GET: API_PERMISSIONS.ORG_EMPLOYEE,
    POST: API_PERMISSIONS.ORG_EMPLOYEE,
    PUT: API_PERMISSIONS.ORG_EMPLOYEE,
  },
  '/api/organization/warehouse-category': {
    GET: API_PERMISSIONS.ORG_WAREHOUSE_CATEGORY,
    POST: API_PERMISSIONS.ORG_WAREHOUSE_CATEGORY,
  },
  '/api/role-permissions': {
    GET: API_PERMISSIONS.ORG_ROLE,
    PUT: API_PERMISSIONS.ORG_ROLE,
  },
  '/api/role-permissions/buttons': { GET: API_PERMISSIONS.ORG_ROLE },
  '/api/menu/sort-order': { PUT: API_PERMISSIONS.ORG_MENU },

  // === CRM ===
  '/api/crm/follow': {
    GET: API_PERMISSIONS.CRM_FOLLOW,
    POST: API_PERMISSIONS.CRM_FOLLOW,
  },
  '/api/crm/analysis': { GET: API_PERMISSIONS.CRM_ANALYSIS },

  // === SRM ===
  '/api/srm/evaluation': {
    GET: API_PERMISSIONS.SRM_EVALUATION,
    POST: API_PERMISSIONS.SRM_EVALUATION,
  },

  // === 仓储扩展 ===
  '/api/warehouse/stock-adjust': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.WAREHOUSE_STOCK_ADJUST,
  },
  '/api/warehouse/inventory/warning': { GET: API_PERMISSIONS.INVENTORY_VIEW },
  '/api/warehouse/inventory/adjust': {
    POST: API_PERMISSIONS.INVENTORY_VIEW,
    PUT: API_PERMISSIONS.INVENTORY_VIEW,
  },
  '/api/warehouse/inventory/logs': { GET: API_PERMISSIONS.INVENTORY_VIEW },
  '/api/warehouse/stocktaking': {
    GET: API_PERMISSIONS.WAREHOUSE_STOCKTAKE,
    POST: API_PERMISSIONS.WAREHOUSE_STOCKTAKE,
    PUT: API_PERMISSIONS.WAREHOUSE_STOCKTAKE,
  },
  '/api/warehouse/transfer': {
    GET: API_PERMISSIONS.WAREHOUSE_TRANSFER,
    POST: API_PERMISSIONS.WAREHOUSE_TRANSFER,
    PUT: API_PERMISSIONS.WAREHOUSE_TRANSFER,
  },
  '/api/warehouse/sales-outbound': { POST: API_PERMISSIONS.OUTBOUND_CREATE },
  '/api/warehouse/production-inbound': { POST: API_PERMISSIONS.INBOUND_CREATE },
  '/api/warehouse/batch-inventory': { GET: API_PERMISSIONS.WAREHOUSE_BATCH },
  '/api/warehouse/ink-opening': { POST: API_PERMISSIONS.WAREHOUSE_INK },
  '/api/warehouse/ink-mixing': { POST: API_PERMISSIONS.WAREHOUSE_INK },
  '/api/warehouse/fifo-recommend': { GET: API_PERMISSIONS.INVENTORY_VIEW },
  '/api/warehouse/categories': {
    GET: API_PERMISSIONS.WAREHOUSE_CATEGORY,
    POST: API_PERMISSIONS.WAREHOUSE_CATEGORY,
  },
  '/api/warehouse/inbound/audit': { POST: API_PERMISSIONS.INBOUND_APPROVE },
  '/api/warehouse/inbound/with-po': { POST: API_PERMISSIONS.INBOUND_CREATE },
  '/api/warehouse/inbound/scan': { POST: API_PERMISSIONS.INBOUND_CREATE },
  '/api/warehouse/inbound/labels': { GET: API_PERMISSIONS.INVENTORY_VIEW },
  '/api/warehouse/inbound/cutting': { POST: API_PERMISSIONS.INBOUND_CREATE },

  // === 库存/物料 ===
  '/api/inventory/inventory': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.INVENTORY_VIEW,
  },
  '/api/inventory/materials': {
    GET: API_PERMISSIONS.MATERIAL_VIEW,
    POST: API_PERMISSIONS.MATERIAL_CREATE,
  },
  '/api/material-requisitions': {
    GET: API_PERMISSIONS.MATERIAL_REQUISITION,
    POST: API_PERMISSIONS.MATERIAL_REQUISITION,
  },
  '/api/material-returns': {
    GET: API_PERMISSIONS.MATERIAL_RETURN,
    POST: API_PERMISSIONS.MATERIAL_RETURN,
  },
  '/api/material-labels': {
    GET: API_PERMISSIONS.MATERIAL_LABEL,
    POST: API_PERMISSIONS.MATERIAL_LABEL,
  },
  '/api/materials': {
    GET: API_PERMISSIONS.MATERIAL_VIEW,
    POST: API_PERMISSIONS.MATERIAL_CREATE,
    PUT: API_PERMISSIONS.MATERIAL_UPDATE,
  },
  '/api/base-data/material-category': {
    GET: API_PERMISSIONS.MATERIAL_VIEW,
    POST: API_PERMISSIONS.MATERIAL_CREATE,
  },

  // === 采购/销售/外包 ===
  '/api/purchase/convert-po': { POST: API_PERMISSIONS.PURCHASE_CREATE },
  '/api/sales/reconciliation': {
    GET: API_PERMISSIONS.ORDER_VIEW,
    POST: API_PERMISSIONS.ORDER_CREATE,
  },
  '/api/sales/delivery': {
    GET: API_PERMISSIONS.DELIVERY_VIEW,
    POST: API_PERMISSIONS.DELIVERY_CREATE,
    PUT: API_PERMISSIONS.DELIVERY_UPDATE,
  },
  '/api/sales/convert-wo': { POST: API_PERMISSIONS.WORKORDER_CREATE },
  '/api/outsource/order': {
    GET: API_PERMISSIONS.OUTSOURCE_VIEW,
    POST: API_PERMISSIONS.OUTSOURCE_CREATE,
    PUT: API_PERMISSIONS.OUTSOURCE_UPDATE,
    DELETE: API_PERMISSIONS.OUTSOURCE_DELETE,
  },
  '/api/outsource/issue': { POST: API_PERMISSIONS.OUTSOURCE_CREATE },
  '/api/outsource/receive': { POST: API_PERMISSIONS.OUTSOURCE_CREATE },
  '/api/outsource/settlement': {
    GET: API_PERMISSIONS.OUTSOURCE_VIEW,
    POST: API_PERMISSIONS.OUTSOURCE_VIEW,
  },

  // === 订单/BOM ===
  '/api/orders/orders': {
    GET: API_PERMISSIONS.ORDER_VIEW,
    POST: API_PERMISSIONS.ORDER_CREATE,
    PUT: API_PERMISSIONS.ORDER_UPDATE,
    DELETE: API_PERMISSIONS.ORDER_DELETE,
  },
  '/api/orders/bom': {
    GET: API_PERMISSIONS.BOM_VIEW,
    POST: API_PERMISSIONS.BOM_CREATE,
    PUT: API_PERMISSIONS.BOM_UPDATE,
  },
  '/api/orders/bom/expand': { GET: API_PERMISSIONS.BOM_VIEW },
  '/api/orders/bom/materials': { GET: API_PERMISSIONS.BOM_VIEW },
  '/api/orders/export': { GET: API_PERMISSIONS.ORDER_VIEW },

  // === 生产管理 ===
  '/api/production/material-issue': { POST: API_PERMISSIONS.WORKORDER_UPDATE },
  '/api/production/material-return': { POST: API_PERMISSIONS.WORKORDER_UPDATE },
  '/api/production/work-report': { POST: API_PERMISSIONS.WORKORDER_UPDATE },
  '/api/production/work-order': { POST: API_PERMISSIONS.WORKORDER_CREATE },
  '/api/production/work-order/create-multi-color': { POST: API_PERMISSIONS.WORKORDER_CREATE },
  '/api/production/work-order/color-seq': {
    GET: API_PERMISSIONS.WORKORDER_VIEW,
    PUT: API_PERMISSIONS.WORKORDER_UPDATE,
  },
  '/api/production/trace': { GET: API_PERMISSIONS.PRODUCTION_SCHEDULE },
  '/api/production/schedule': {
    GET: API_PERMISSIONS.SCHEDULE_VIEW,
    POST: API_PERMISSIONS.SCHEDULE_CREATE,
    PUT: API_PERMISSIONS.SCHEDULE_CREATE,
  },
  '/api/production/schedule/capacity': { GET: API_PERMISSIONS.SCHEDULE_VIEW },
  '/api/production/schedule/auto': { POST: API_PERMISSIONS.SCHEDULE_CREATE },
  '/api/production/product-label': { GET: API_PERMISSIONS.WORKORDER_VIEW },
  '/api/production/process-route': {
    GET: API_PERMISSIONS.WORKORDER_VIEW,
    POST: API_PERMISSIONS.WORKORDER_CREATE,
  },
  '/api/production/mrp': { POST: API_PERMISSIONS.MRP_RUN },
  '/api/production/process': {
    GET: API_PERMISSIONS.WORKORDER_VIEW,
    POST: API_PERMISSIONS.WORKORDER_CREATE,
  },

  // === 印前/印制 ===
  '/api/dcprint/trace': {
    GET: API_PERMISSIONS.DCPRESET_TRACE,
    POST: API_PERMISSIONS.DCPRESET_TRACE,
  },
  '/api/dcprint/scan': { POST: API_PERMISSIONS.DCPRESET_TRACE },
  '/api/dcprint/process-cards': {
    GET: API_PERMISSIONS.DCPRESET_PROCESS_CARD,
    POST: API_PERMISSIONS.DCPRESET_PROCESS_CARD,
  },
  '/api/dcprint/labels': {
    GET: API_PERMISSIONS.DCPRESET_LABEL,
    POST: API_PERMISSIONS.DCPRESET_LABEL,
  },
  '/api/dcprint/ink-usage': {
    GET: API_PERMISSIONS.DCPRESET_INK,
    POST: API_PERMISSIONS.DCPRESET_INK,
  },
  '/api/dcprint/ink-surplus': { GET: API_PERMISSIONS.DCPRESET_INK },
  '/api/dcprint/ink-query': { GET: API_PERMISSIONS.DCPRESET_INK },
  '/api/dcprint/ink-opening': { POST: API_PERMISSIONS.DCPRESET_INK },
  '/api/dcprint/ink-mixing': { POST: API_PERMISSIONS.DCPRESET_INK },
  '/api/dcprint/ink-mixed': { POST: API_PERMISSIONS.DCPRESET_INK },
  '/api/dcprint/ink-init': { POST: API_PERMISSIONS.DCPRESET_INK },
  '/api/dcprint/ink-formula': {
    GET: API_PERMISSIONS.DCPRESET_INK,
    POST: API_PERMISSIONS.DCPRESET_INK,
  },
  '/api/dcprint/formula/color': {
    GET: API_PERMISSIONS.DCPRESET_INK,
    POST: API_PERMISSIONS.DCPRESET_INK,
    PUT: API_PERMISSIONS.DCPRESET_INK,
    DELETE: API_PERMISSIONS.DCPRESET_INK,
  },
  '/api/dcprint/formula/version': {
    GET: API_PERMISSIONS.DCPRESET_INK,
    POST: API_PERMISSIONS.DCPRESET_INK,
  },
  '/api/dcprint/tool': {
    GET: API_PERMISSIONS.DCPRESET_TOOL_VIEW,
    POST: API_PERMISSIONS.DCPRESET_TOOL_CREATE,
  },
  '/api/dcprint/tool/dashboard': {
    GET: API_PERMISSIONS.DCPRESET_TOOL_VIEW,
  },
  '/api/dcprint/tool/activate': {
    POST: API_PERMISSIONS.DCPRESET_TOOL_UPDATE,
  },
  '/api/dcprint/tool/usage': {
    GET: API_PERMISSIONS.DCPRESET_TOOL_VIEW,
    POST: API_PERMISSIONS.DCPRESET_TOOL_USE,
  },
  '/api/dcprint/tool/maintenance': {
    GET: API_PERMISSIONS.DCPRESET_TOOL_VIEW,
    POST: API_PERMISSIONS.DCPRESET_TOOL_MAINTENANCE,
  },
  '/api/dcprint/tool/scrap': {
    POST: API_PERMISSIONS.DCPRESET_TOOL_SCRAP,
  },
  '/api/dcprint/sample-card': {
    GET: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_VIEW,
    POST: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_CREATE,
  },
  '/api/dcprint/sample-card/cost-preview': {
    POST: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_VIEW,
  },
  '/api/dcprint/sample-card/submit': {
    POST: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_SUBMIT,
  },
  '/api/dcprint/sample-card/confirm': {
    POST: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_CONFIRM,
  },
  '/api/dcprint/sample-card/cancel': {
    POST: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_UPDATE,
  },
  '/api/dcprint/sample-card/duplicate': {
    POST: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_DUPLICATE,
  },
  '/api/dcprint/ink-dispatch': { POST: API_PERMISSIONS.DCPRESET_INK },
  '/api/dcprint/ink-consumption': {
    GET: API_PERMISSIONS.DCPRESET_INK,
    POST: API_PERMISSIONS.DCPRESET_INK,
  },

  // === 预印 ===
  '/api/prepress/ink': {
    GET: API_PERMISSIONS.PREPRESS_INK,
    POST: API_PERMISSIONS.PREPRESS_INK,
    PUT: API_PERMISSIONS.PREPRESS_INK,
    DELETE: API_PERMISSIONS.PREPRESS_INK,
  },
  '/api/prepress/die': {
    GET: API_PERMISSIONS.PREPRESS_DIE,
    POST: API_PERMISSIONS.PREPRESS_DIE,
    PUT: API_PERMISSIONS.PREPRESS_DIE,
    DELETE: API_PERMISSIONS.PREPRESS_DIE,
  },
  '/api/prepress/screen-plate': {
    GET: API_PERMISSIONS.PREPRESS_SCREEN_PLATE,
    POST: API_PERMISSIONS.PREPRESS_SCREEN_PLATE,
    PUT: API_PERMISSIONS.PREPRESS_SCREEN_PLATE,
    DELETE: API_PERMISSIONS.PREPRESS_SCREEN_PLATE,
  },
  '/api/prepress/die-usage': { GET: API_PERMISSIONS.PREPRESS_DIE },
  '/api/prepress/die-template': {
    GET: API_PERMISSIONS.PREPRESS_DIE,
    POST: API_PERMISSIONS.PREPRESS_DIE,
  },
  '/api/prepress/die-maintenance': { POST: API_PERMISSIONS.PREPRESS_DIE },
  '/api/prepress/die-migrate': { POST: API_PERMISSIONS.PREPRESS_DIE },

  // === 质量管理 ===
  '/api/quality/unqualified': {
    GET: API_PERMISSIONS.QUALITY_UNQUALIFIED,
    POST: API_PERMISSIONS.QUALITY_UNQUALIFIED,
  },
  '/api/quality/spc': { GET: API_PERMISSIONS.QUALITY_SPC },
  '/api/quality/sgs': { GET: API_PERMISSIONS.QUALITY_SGS },
  '/api/quality/complaint': {
    GET: API_PERMISSIONS.QUALITY_COMPLAINT,
    POST: API_PERMISSIONS.QUALITY_COMPLAINT,
  },
  '/api/quality/supplier-audit': { GET: API_PERMISSIONS.QUALITY_AUDIT },
  '/api/quality/lab-test': {
    GET: API_PERMISSIONS.QUALITY_LAB_TEST,
    POST: API_PERMISSIONS.QUALITY_LAB_TEST,
  },

  // === 设备管理 ===
  '/api/equipment/equipment': {
    GET: API_PERMISSIONS.EQUIPMENT_VIEW,
    POST: API_PERMISSIONS.EQUIPMENT_CREATE,
    PUT: API_PERMISSIONS.EQUIPMENT_UPDATE,
    DELETE: API_PERMISSIONS.EQUIPMENT_DELETE,
  },
  '/api/equipment/maintenance': {
    GET: API_PERMISSIONS.EQUIPMENT_MAINTENANCE,
    POST: API_PERMISSIONS.EQUIPMENT_MAINTENANCE,
  },
  '/api/equipment/repair': {
    GET: API_PERMISSIONS.EQUIPMENT_REPAIR,
    POST: API_PERMISSIONS.EQUIPMENT_REPAIR,
  },
  '/api/equipment/calibration': {
    GET: API_PERMISSIONS.EQUIPMENT_CALIBRATION,
    POST: API_PERMISSIONS.EQUIPMENT_CALIBRATION,
  },
  '/api/equipment/scrap': { POST: API_PERMISSIONS.EQUIPMENT_SCRAP },

  // === 标准卡 ===
  '/api/standard-cards': {
    GET: API_PERMISSIONS.STANDARD_CARD_VIEW,
    POST: API_PERMISSIONS.STANDARD_CARD_CREATE,
    PUT: API_PERMISSIONS.STANDARD_CARD_UPDATE,
  },
  '/api/standard-cards/approve': { POST: API_PERMISSIONS.STANDARD_CARD_APPROVE },
  '/api/standard-cards/scan': { POST: API_PERMISSIONS.STANDARD_CARD_SCAN },
  '/api/standard-cards/check-deviation': { GET: API_PERMISSIONS.STANDARD_CARD_VIEW },

  // === 报表/仪表盘 ===
  '/api/reports/production-cost': { GET: API_PERMISSIONS.REPORT_VIEW },
  '/api/reports/inventory-turnover': { GET: API_PERMISSIONS.REPORT_VIEW },
  '/api/reports/delivery-rate': { GET: API_PERMISSIONS.REPORT_VIEW },
  '/api/reports/dashboard': { GET: API_PERMISSIONS.REPORT_VIEW },
  '/api/dashboard/kpi': { GET: API_PERMISSIONS.DASHBOARD_VIEW },

  // === 上传 ===
  '/api/upload/upload': { POST: API_PERMISSIONS.UPLOAD_FILE },
  '/api/upload/sop': { POST: API_PERMISSIONS.UPLOAD_FILE },
  '/api/upload/contract': { POST: API_PERMISSIONS.UPLOAD_FILE },

  // === 二维码 ===
  '/api/qrcode/qrcode': {
    GET: API_PERMISSIONS.QRCODE_VIEW,
    POST: API_PERMISSIONS.QRCODE_VIEW,
  },
  '/api/qrcode/trace': { GET: API_PERMISSIONS.QRCODE_VIEW },

  // === 样品 ===
  '/api/sample/orders': {
    GET: API_PERMISSIONS.SAMPLE_VIEW,
    POST: API_PERMISSIONS.SAMPLE_CREATE,
    PUT: API_PERMISSIONS.SAMPLE_UPDATE,
    DELETE: API_PERMISSIONS.SAMPLE_DELETE,
  },

  // === PLM ===
  '/api/plm/lifecycle': { GET: API_PERMISSIONS.PLM_LIFECYCLE },
  '/api/plm/eco': {
    GET: API_PERMISSIONS.PLM_ECO,
    POST: API_PERMISSIONS.PLM_ECO,
  },

  // === 审计 ===
  '/api/audit/report': { GET: API_PERMISSIONS.AUDIT_VIEW },
  '/api/audit/logs': { GET: API_PERMISSIONS.AUDIT_VIEW },

  // === 设置 ===
  '/api/settings/change-approval': {
    GET: API_PERMISSIONS.SETTINGS_APPROVAL,
    POST: API_PERMISSIONS.SETTINGS_APPROVAL,
  },
  '/api/settings/category-linkage': {
    GET: API_PERMISSIONS.SETTINGS_LINKAGE,
    POST: API_PERMISSIONS.SETTINGS_LINKAGE,
  },
  '/api/settings/category-rules': {
    GET: API_PERMISSIONS.SETTINGS_LINKAGE,
    POST: API_PERMISSIONS.SETTINGS_LINKAGE,
  },

  // === 工作流 ===
  '/api/workflow/tasks': {
    GET: API_PERMISSIONS.WORKFLOW_TASK,
    POST: API_PERMISSIONS.WORKFLOW_TASK,
    PUT: API_PERMISSIONS.WORKFLOW_TASK,
  },
  '/api/workflow/process': {
    GET: API_PERMISSIONS.WORKFLOW_PROCESS,
    POST: API_PERMISSIONS.WORKFLOW_PROCESS,
  },

  // === 监控 ===
  '/api/monitoring': { GET: API_PERMISSIONS.SYSTEM_MONITOR },

  // === 产品 ===
  '/api/products': {
    GET: API_PERMISSIONS.PRODUCT_VIEW,
    POST: API_PERMISSIONS.PRODUCT_CREATE,
    PUT: API_PERMISSIONS.PRODUCT_UPDATE,
    DELETE: API_PERMISSIONS.PRODUCT_DELETE,
  },
  '/api/products/categories': {
    GET: API_PERMISSIONS.PRODUCT_VIEW,
    POST: API_PERMISSIONS.PRODUCT_CREATE,
  },

  // === 交付 ===
  '/api/delivery/vehicles': {
    GET: API_PERMISSIONS.DELIVERY_VIEW,
    POST: API_PERMISSIONS.DELIVERY_CREATE,
  },

  // === 工程管理 ===
  '/api/engineering/standard-card': {
    GET: API_PERMISSIONS.STANDARD_CARD_VIEW,
    POST: API_PERMISSIONS.STANDARD_CARD_CREATE,
  },
  '/api/engineering/sop': { GET: API_PERMISSIONS.STANDARD_CARD_VIEW },
  '/api/engineering/sample-to-mass': { POST: API_PERMISSIONS.STANDARD_CARD_CREATE },

  // === 其他散落路由 ===
  '/api/ink-usages': { GET: API_PERMISSIONS.DCPRESET_INK },
  '/api/screen-plates': {
    GET: API_PERMISSIONS.PREPRESS_SCREEN_PLATE,
    POST: API_PERMISSIONS.PREPRESS_SCREEN_PLATE,
    PUT: API_PERMISSIONS.PREPRESS_SCREEN_PLATE,
    DELETE: API_PERMISSIONS.PREPRESS_SCREEN_PLATE,
  },
  '/api/screen-plates/history': { GET: API_PERMISSIONS.PREPRESS_SCREEN_PLATE },
  '/api/biz/contract-review': {
    GET: API_PERMISSIONS.ORDER_VIEW,
    POST: API_PERMISSIONS.ORDER_CREATE,
  },
  '/api/business/contract-review': {
    GET: API_PERMISSIONS.ORDER_VIEW,
    POST: API_PERMISSIONS.ORDER_CREATE,
  },

  // === 运维脚本路由 ===
  '/api/init': {
    GET: API_PERMISSIONS.SYSTEM_SETUP,
    POST: API_PERMISSIONS.SYSTEM_SETUP,
  },
  '/api/migrations': {
    GET: API_PERMISSIONS.SYSTEM_MIGRATE,
    POST: API_PERMISSIONS.SYSTEM_MIGRATE,
  },
  '/api/debug': { GET: API_PERMISSIONS.SYSTEM_SETUP, POST: API_PERMISSIONS.SYSTEM_SETUP },
  '/api/diagnose': { GET: API_PERMISSIONS.SYSTEM_SETUP, POST: API_PERMISSIONS.SYSTEM_SETUP },
  '/api/test': { GET: API_PERMISSIONS.SYSTEM_SETUP, POST: API_PERMISSIONS.SYSTEM_SETUP },
  '/api/setup': { GET: API_PERMISSIONS.SYSTEM_SETUP, POST: API_PERMISSIONS.SYSTEM_SETUP },

  // === 仓储扩展补充（批次3） ===
  '/api/warehouse/unit-conversion': {
    GET: API_PERMISSIONS.WAREHOUSE_VIEW,
    POST: API_PERMISSIONS.WAREHOUSE_UPDATE,
    PUT: API_PERMISSIONS.WAREHOUSE_UPDATE,
    DELETE: API_PERMISSIONS.WAREHOUSE_DELETE,
  },
  '/api/warehouse/freeze': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.WAREHOUSE_STOCK_ADJUST,
    PUT: API_PERMISSIONS.WAREHOUSE_STOCK_ADJUST,
  },
  '/api/warehouse/batch': {
    GET: API_PERMISSIONS.WAREHOUSE_BATCH,
    POST: API_PERMISSIONS.WAREHOUSE_BATCH,
    PUT: API_PERMISSIONS.WAREHOUSE_BATCH,
  },
  '/api/warehouse/cost': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.INVENTORY_VIEW,
  },
  '/api/warehouse/alert-push': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.INVENTORY_VIEW,
    PUT: API_PERMISSIONS.INVENTORY_VIEW,
  },
  '/api/warehouse/inventory/export': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
  },

  // === 订单根路由（批次4） ===
  '/api/orders': {
    GET: API_PERMISSIONS.ORDER_VIEW,
    POST: API_PERMISSIONS.ORDER_CREATE,
    PUT: API_PERMISSIONS.ORDER_UPDATE,
    DELETE: API_PERMISSIONS.ORDER_DELETE,
  },

  // === 生产工单补充（批次5） ===
  '/api/production/work-orders': {
    GET: API_PERMISSIONS.WORKORDER_VIEW,
    POST: API_PERMISSIONS.WORKORDER_CREATE,
    PUT: API_PERMISSIONS.WORKORDER_UPDATE,
    DELETE: API_PERMISSIONS.WORKORDER_DELETE,
  },
  '/api/production/schedule/stats': { GET: API_PERMISSIONS.SCHEDULE_VIEW },

  // === 设备根路由（批次6） ===
  '/api/equipment': {
    GET: API_PERMISSIONS.EQUIPMENT_VIEW,
    POST: API_PERMISSIONS.EQUIPMENT_CREATE,
    PUT: API_PERMISSIONS.EQUIPMENT_UPDATE,
    DELETE: API_PERMISSIONS.EQUIPMENT_DELETE,
  },

  // === 仪表盘子路由（批次7） ===
  '/api/dashboard': { GET: API_PERMISSIONS.DASHBOARD_VIEW },
  '/api/dashboard/warehouse': { GET: API_PERMISSIONS.DASHBOARD_VIEW },
  '/api/dashboard/sales': { GET: API_PERMISSIONS.DASHBOARD_VIEW },
  '/api/dashboard/production': { GET: API_PERMISSIONS.DASHBOARD_VIEW },
  '/api/dashboard/finance': { GET: API_PERMISSIONS.DASHBOARD_VIEW },
  '/api/dashboard/ceo': { GET: API_PERMISSIONS.DASHBOARD_VIEW },
  '/api/dashboard/quality': { GET: API_PERMISSIONS.DASHBOARD_VIEW },
};

/**
 * 无需认证即可访问的公开路由列表
 *
 * 这些路由（如登录、注册、重置锁定等）不需要进行权限检查，
 * 即使未登录或首次登录状态下也可正常访问。
 */
export const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-lock',
  '/api/linkage/',
  '/api/document-number',
];

/**
 * 首次登录强制改密白名单
 *
 * 定义已移至 api-auth.ts，此处通过 re-export 保持向后兼容。
 * 白名单中的路由在用户首次登录（firstLogin=true）时仍可访问，
 * 主要包括修改密码、登出、获取用户信息等必要操作。
 */
export { FIRST_LOGIN_WHITELIST };

/**
 * 根据请求路径和 HTTP 方法获取所需的权限标识
 *
 * 首先检查路径是否属于公开路由（无需权限），然后采用最长前缀匹配策略
 * 从 ROUTE_PERMISSIONS 映射表中查找对应的权限标识。匹配越长的路径优先级越高，
 * 例如 `/api/warehouse/outbound` 会优先匹配 `/api/warehouse/outbound` 而非 `/api/warehouse`。
 *
 * @param pathname - 请求的 URL 路径，如 `/api/warehouse/inbound`
 * @param method - HTTP 请求方法，如 `GET`、`POST`、`PUT`、`DELETE`、`PATCH`
 * @returns 所需的权限标识字符串，若为公开路由或未配置权限的路由则返回 null
 */
export function getRequiredPermission(pathname: string, method: string): string | null {
  for (const publicRoute of PUBLIC_ROUTES) {
    if (pathname.startsWith(publicRoute)) return null;
  }

  const matchedPattern = Object.keys(ROUTE_PERMISSIONS)
    .filter((pattern) => pathname.startsWith(pattern))
    .sort((a, b) => b.length - a.length)[0];

  if (!matchedPattern) return null;

  const methodPermissions = ROUTE_PERMISSIONS[matchedPattern];
  return methodPermissions[method as keyof typeof methodPermissions] || null;
}

/**
 * 带权限检查的 API 路由处理器包装器
 *
 * 在 `withAuthAndErrorHandler` 认证和错误处理的基础上，增加基于路由的自动权限校验。
 * 流程：认证 → 根据请求路径和方法自动查找所需权限 → 检查用户是否拥有该权限或 admin 角色 →
 * 首次登录改密拦截 → 执行业务处理器 → 可选的操作日志记录。
 *
 * admin 角色的用户自动跳过所有权限检查，拥有系统最高访问级别。
 *
 * @param handler - 业务处理器函数，接收请求、用户信息和上下文
 * @param options - 可选配置
 * @param options.errorMessage - 自定义错误提示消息，传递给 withAuthAndErrorHandler
 * @param options.logTitle - 操作日志标题，若提供则在成功响应时记录操作日志
 * @param options.logType - 操作日志类型，默认为 `'api'`
 * @returns 包装后的 Next.js API 路由处理函数
 */
export function withPermission(
  handler: (
    request: NextRequest,
    userInfo: UserInfo,
    context?: RouteHandlerContext
  ) => Promise<NextResponse>,
  options?: {
    errorMessage?: string;
    logTitle?: string;
    logType?: string;
  }
) {
  return withAuthAndErrorHandler(
    async (request, userInfo, context) => {
      const { pathname } = new URL(request.url);
      const method = request.method;
      const requiredPermission = getRequiredPermission(pathname, method);

      if (requiredPermission && !hasPermission(userInfo, requiredPermission)) {
        return NextResponse.json(
          {
            code: 403,
            success: false,
            message: `没有权限执行此操作，需要权限: ${requiredPermission}`,
            data: null,
          },
          { status: 403 }
        );
      }

      // 首次登录强制改密拦截：除白名单外所有 API 返回 403
      if (userInfo.firstLogin && !FIRST_LOGIN_WHITELIST.some((p) => pathname.startsWith(p))) {
        return NextResponse.json(
          {
            code: 403,
            success: false,
            message: '首次登录需修改密码后才能访问系统功能',
            data: null,
            passwordExpired: true,
          },
          { status: 403 }
        );
      }

      const result = await handler(request, userInfo, context);

      if (options?.logTitle && result.status >= 200 && result.status < 300) {
        await logOperation({
          title: options.logTitle,
          oper_name: userInfo.realName || userInfo.username,
          oper_type: options.logType || 'api',
          oper_method: method,
          oper_url: pathname,
          status: 1,
        });
      }

      return result;
    },
    {
      errorMessage: options?.errorMessage,
    }
  );
}
