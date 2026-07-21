/**
 * @module permissions-catalog
 * @description 权限定义的**单一数据源**（纯数据，无服务端依赖）。
 *
 * 本文件仅包含权限常量与分组定义，不导入任何服务端专用模块（如数据库、next/server），
 * 因此可同时被服务端（`api-permissions.ts` 的网关校验）与客户端
 * （`usePermission.ts` 的角色权限勾选 UI）安全引用，从根本上避免权限码分处定义导致的漂移。
 */

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
  HR_REPORT: 'hr:report',
  HR_SYNC: 'hr:sync',

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

  // Saga 监控
  SAGA_VIEW: 'saga:view',
  SAGA_RETRY: 'saga:retry',
  SAGA_COMPENSATE: 'saga:compensate',
} as const;

/**
 * 权限模块分组定义（角色权限勾选 UI 的单一数据源）
 *
 * 此列表按业务模块组织了角色权限配置界面（settings/roles）中可授予的按钮级权限。
 * 关键原则：这里出现的每一个权限 `id` 都必须来自 `API_PERMISSIONS` 常量，
 * 因此界面可授予的权限与 API 网关（`ROUTE_PERMISSIONS` + `withPermission`）实际校验的权限
 * 始终保持一致，杜绝“授予了却不生效”或“网关需要却无法授予”的权限码漂移问题。
 *
 * 前端通过 `usePermission.getPermissionModules()` 引用此常量，请勿在别处另建副本。
 */
export const PERMISSION_MODULES: Array<{
  id: string;
  name: string;
  permissions: Array<{ id: string; name: string }>;
}> = [
  {
    id: 'dashboard',
    name: '仪表盘',
    permissions: [
      { id: API_PERMISSIONS.DASHBOARD_VIEW, name: '查看仪表盘' },
      { id: API_PERMISSIONS.REPORT_VIEW, name: '查看报表' },
    ],
  },
  {
    id: 'order',
    name: '订单管理',
    permissions: [
      { id: API_PERMISSIONS.ORDER_VIEW, name: '查看订单' },
      { id: API_PERMISSIONS.ORDER_CREATE, name: '创建订单' },
      { id: API_PERMISSIONS.ORDER_UPDATE, name: '编辑订单' },
      { id: API_PERMISSIONS.ORDER_DELETE, name: '删除订单' },
    ],
  },
  {
    id: 'customer',
    name: '客户管理',
    permissions: [
      { id: API_PERMISSIONS.CUSTOMER_VIEW, name: '查看客户' },
      { id: API_PERMISSIONS.CUSTOMER_CREATE, name: '创建客户' },
      { id: API_PERMISSIONS.CUSTOMER_UPDATE, name: '编辑客户' },
      { id: API_PERMISSIONS.CUSTOMER_DELETE, name: '删除客户' },
      { id: API_PERMISSIONS.CRM_FOLLOW, name: '客户跟进' },
      { id: API_PERMISSIONS.CRM_ANALYSIS, name: '客户分析' },
    ],
  },
  {
    id: 'production',
    name: '生产管理',
    permissions: [
      { id: API_PERMISSIONS.WORKORDER_VIEW, name: '查看工单' },
      { id: API_PERMISSIONS.WORKORDER_CREATE, name: '创建工单' },
      { id: API_PERMISSIONS.WORKORDER_UPDATE, name: '编辑工单' },
      { id: API_PERMISSIONS.WORKORDER_DELETE, name: '删除工单' },
      { id: API_PERMISSIONS.PRODUCTION_SCHEDULE, name: '生产排程' },
      { id: API_PERMISSIONS.SCHEDULE_VIEW, name: '查看排产' },
      { id: API_PERMISSIONS.SCHEDULE_CREATE, name: '创建排产' },
      { id: API_PERMISSIONS.MRP_RUN, name: '运行 MRP' },
    ],
  },
  {
    id: 'warehouse',
    name: '仓库管理',
    permissions: [
      { id: API_PERMISSIONS.WAREHOUSE_VIEW, name: '查看仓库' },
      { id: API_PERMISSIONS.WAREHOUSE_CREATE, name: '创建仓库' },
      { id: API_PERMISSIONS.WAREHOUSE_UPDATE, name: '编辑仓库' },
      { id: API_PERMISSIONS.WAREHOUSE_DELETE, name: '删除仓库' },
      { id: API_PERMISSIONS.WAREHOUSE_CATEGORY, name: '仓库分类' },
      { id: API_PERMISSIONS.INVENTORY_VIEW, name: '查看库存' },
      { id: API_PERMISSIONS.INBOUND_CREATE, name: '入库操作' },
      { id: API_PERMISSIONS.INBOUND_APPROVE, name: '入库审批' },
      { id: API_PERMISSIONS.OUTBOUND_CREATE, name: '出库操作' },
      { id: API_PERMISSIONS.OUTBOUND_CONFIRM, name: '出库确认' },
      { id: API_PERMISSIONS.OUTBOUND_CANCEL, name: '出库取消' },
      { id: API_PERMISSIONS.WAREHOUSE_TRANSFER, name: '调拨操作' },
      { id: API_PERMISSIONS.WAREHOUSE_STOCKTAKE, name: '库存盘点' },
      { id: API_PERMISSIONS.WAREHOUSE_STOCK_ADJUST, name: '库存调整' },
      { id: API_PERMISSIONS.WAREHOUSE_BATCH, name: '批次管理' },
      { id: API_PERMISSIONS.WAREHOUSE_INK, name: '油墨库存' },
    ],
  },
  {
    id: 'material',
    name: '物料管理',
    permissions: [
      { id: API_PERMISSIONS.MATERIAL_VIEW, name: '查看物料' },
      { id: API_PERMISSIONS.MATERIAL_CREATE, name: '创建物料' },
      { id: API_PERMISSIONS.MATERIAL_UPDATE, name: '编辑物料' },
      { id: API_PERMISSIONS.MATERIAL_REQUISITION, name: '物料领用' },
      { id: API_PERMISSIONS.MATERIAL_RETURN, name: '物料退料' },
      { id: API_PERMISSIONS.MATERIAL_LABEL, name: '物料标签' },
    ],
  },
  {
    id: 'purchase',
    name: '采购管理',
    permissions: [
      { id: API_PERMISSIONS.PURCHASE_VIEW, name: '查看采购' },
      { id: API_PERMISSIONS.PURCHASE_CREATE, name: '创建采购' },
      { id: API_PERMISSIONS.PURCHASE_APPROVE, name: '采购审批' },
      { id: API_PERMISSIONS.SUPPLIER_VIEW, name: '查看供应商' },
      { id: API_PERMISSIONS.SUPPLIER_CREATE, name: '创建供应商' },
      { id: API_PERMISSIONS.SUPPLIER_UPDATE, name: '编辑供应商' },
      { id: API_PERMISSIONS.SUPPLIER_DELETE, name: '删除供应商' },
      { id: API_PERMISSIONS.SRM_EVALUATION, name: '供应商评估' },
    ],
  },
  {
    id: 'sales',
    name: '销售交付',
    permissions: [
      { id: API_PERMISSIONS.DELIVERY_VIEW, name: '查看交付' },
      { id: API_PERMISSIONS.DELIVERY_CREATE, name: '创建交付' },
      { id: API_PERMISSIONS.DELIVERY_UPDATE, name: '编辑交付' },
    ],
  },
  {
    id: 'quality',
    name: '质量管理',
    permissions: [
      { id: API_PERMISSIONS.QUALITY_VIEW, name: '查看质量' },
      { id: API_PERMISSIONS.QUALITY_INSPECT, name: '检验操作' },
      { id: API_PERMISSIONS.QUALITY_APPROVE, name: '审核检验' },
      { id: API_PERMISSIONS.QUALITY_SPC, name: 'SPC 分析' },
      { id: API_PERMISSIONS.QUALITY_SGS, name: 'SGS 检测' },
      { id: API_PERMISSIONS.QUALITY_COMPLAINT, name: '质量投诉' },
      { id: API_PERMISSIONS.QUALITY_UNQUALIFIED, name: '不合格品' },
      { id: API_PERMISSIONS.QUALITY_AUDIT, name: '供应商审核' },
      { id: API_PERMISSIONS.QUALITY_LAB_TEST, name: '实验室检测' },
    ],
  },
  {
    id: 'bom',
    name: 'BOM 管理',
    permissions: [
      { id: API_PERMISSIONS.BOM_VIEW, name: '查看 BOM' },
      { id: API_PERMISSIONS.BOM_CREATE, name: '创建 BOM' },
      { id: API_PERMISSIONS.BOM_UPDATE, name: '编辑 BOM' },
    ],
  },
  {
    id: 'dcprint',
    name: '印制管理',
    permissions: [
      { id: API_PERMISSIONS.DCPRESET_TRACE, name: '生产追溯' },
      { id: API_PERMISSIONS.DCPRESET_PROCESS_CARD, name: '工艺卡' },
      { id: API_PERMISSIONS.DCPRESET_LABEL, name: '标签打印' },
      { id: API_PERMISSIONS.DCPRESET_INK, name: '油墨管理' },
      { id: API_PERMISSIONS.DCPRESET_TOOL_VIEW, name: '查看刀模/网版' },
      { id: API_PERMISSIONS.DCPRESET_TOOL_CREATE, name: '创建刀模/网版' },
      { id: API_PERMISSIONS.DCPRESET_TOOL_UPDATE, name: '编辑刀模/网版' },
      { id: API_PERMISSIONS.DCPRESET_TOOL_DELETE, name: '删除刀模/网版' },
      { id: API_PERMISSIONS.DCPRESET_TOOL_USE, name: '刀模/网版使用' },
      { id: API_PERMISSIONS.DCPRESET_TOOL_MAINTENANCE, name: '刀模/网版维护' },
      { id: API_PERMISSIONS.DCPRESET_TOOL_SCRAP, name: '刀模/网版报废' },
      { id: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_VIEW, name: '查看样卡' },
      { id: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_CREATE, name: '创建样卡' },
      { id: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_UPDATE, name: '编辑样卡' },
      { id: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_DELETE, name: '删除样卡' },
      { id: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_SUBMIT, name: '提交样卡' },
      { id: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_CONFIRM, name: '确认样卡' },
      { id: API_PERMISSIONS.DCPRESET_SAMPLE_CARD_DUPLICATE, name: '复制样卡' },
    ],
  },
  {
    id: 'prepress',
    name: '印前管理',
    permissions: [
      { id: API_PERMISSIONS.PREPRESS_DIE, name: '刀模管理' },
      { id: API_PERMISSIONS.PREPRESS_SCREEN_PLATE, name: '网版管理' },
      { id: API_PERMISSIONS.PREPRESS_INK, name: '印前油墨' },
    ],
  },
  {
    id: 'standard-card',
    name: '标准卡管理',
    permissions: [
      { id: API_PERMISSIONS.STANDARD_CARD_VIEW, name: '查看标准卡' },
      { id: API_PERMISSIONS.STANDARD_CARD_CREATE, name: '创建标准卡' },
      { id: API_PERMISSIONS.STANDARD_CARD_UPDATE, name: '编辑标准卡' },
      { id: API_PERMISSIONS.STANDARD_CARD_APPROVE, name: '审核标准卡' },
      { id: API_PERMISSIONS.STANDARD_CARD_SCAN, name: '扫描标准卡' },
    ],
  },
  {
    id: 'sample',
    name: '样品管理',
    permissions: [
      { id: API_PERMISSIONS.SAMPLE_VIEW, name: '查看样品' },
      { id: API_PERMISSIONS.SAMPLE_CREATE, name: '创建样品' },
      { id: API_PERMISSIONS.SAMPLE_UPDATE, name: '编辑样品' },
      { id: API_PERMISSIONS.SAMPLE_DELETE, name: '删除样品' },
    ],
  },
  {
    id: 'equipment',
    name: '设备管理',
    permissions: [
      { id: API_PERMISSIONS.EQUIPMENT_VIEW, name: '查看设备' },
      { id: API_PERMISSIONS.EQUIPMENT_CREATE, name: '创建设备' },
      { id: API_PERMISSIONS.EQUIPMENT_UPDATE, name: '编辑设备' },
      { id: API_PERMISSIONS.EQUIPMENT_DELETE, name: '删除设备' },
      { id: API_PERMISSIONS.EQUIPMENT_MAINTENANCE, name: '设备保养' },
      { id: API_PERMISSIONS.EQUIPMENT_REPAIR, name: '设备维修' },
      { id: API_PERMISSIONS.EQUIPMENT_CALIBRATION, name: '设备校准' },
      { id: API_PERMISSIONS.EQUIPMENT_SCRAP, name: '设备报废' },
    ],
  },
  {
    id: 'outsource',
    name: '外包管理',
    permissions: [
      { id: API_PERMISSIONS.OUTSOURCE_VIEW, name: '查看外包' },
      { id: API_PERMISSIONS.OUTSOURCE_CREATE, name: '创建外包' },
      { id: API_PERMISSIONS.OUTSOURCE_UPDATE, name: '编辑外包' },
      { id: API_PERMISSIONS.OUTSOURCE_DELETE, name: '删除外包' },
    ],
  },
  {
    id: 'finance',
    name: '财务管理',
    permissions: [
      { id: API_PERMISSIONS.FINANCE_VIEW, name: '查看财务' },
      { id: API_PERMISSIONS.FINANCE_CREATE, name: '创建财务单据' },
      { id: API_PERMISSIONS.FINANCE_APPROVE, name: '财务审批' },
      { id: API_PERMISSIONS.FINANCE_RECEIVABLE, name: '应收管理' },
      { id: API_PERMISSIONS.FINANCE_PAYABLE, name: '应付管理' },
      { id: API_PERMISSIONS.FINANCE_RECEIPT, name: '收款管理' },
      { id: API_PERMISSIONS.FINANCE_PAYMENT, name: '付款管理' },
      { id: API_PERMISSIONS.FINANCE_STATS, name: '财务统计' },
      { id: API_PERMISSIONS.FINANCE_COST_VARIANCE, name: '成本差异' },
      { id: API_PERMISSIONS.FINANCE_EXPENSE, name: '费用管理' },
      { id: API_PERMISSIONS.FINANCE_INVOICE, name: '发票管理' },
      { id: API_PERMISSIONS.FINANCE_AGING, name: '账龄分析' },
      { id: API_PERMISSIONS.FINANCE_SUMMARY, name: '财务汇总' },
    ],
  },
  {
    id: 'hr',
    name: '人力资源',
    permissions: [
      { id: API_PERMISSIONS.HR_EMPLOYEE, name: '员工管理' },
      { id: API_PERMISSIONS.HR_ATTENDANCE, name: '考勤管理' },
      { id: API_PERMISSIONS.HR_SALARY, name: '薪资管理' },
      { id: API_PERMISSIONS.HR_TRAINING, name: '培训管理' },
      { id: API_PERMISSIONS.HR_DEPARTMENT, name: '部门管理' },
      { id: API_PERMISSIONS.HR_REPORT, name: '人力报表' },
      { id: API_PERMISSIONS.HR_SYNC, name: '数据同步' },
    ],
  },
  {
    id: 'product',
    name: '产品管理',
    permissions: [
      { id: API_PERMISSIONS.PRODUCT_VIEW, name: '查看产品' },
      { id: API_PERMISSIONS.PRODUCT_CREATE, name: '创建产品' },
      { id: API_PERMISSIONS.PRODUCT_UPDATE, name: '编辑产品' },
      { id: API_PERMISSIONS.PRODUCT_DELETE, name: '删除产品' },
    ],
  },
  {
    id: 'plm',
    name: 'PLM 管理',
    permissions: [
      { id: API_PERMISSIONS.PLM_LIFECYCLE, name: '生命周期' },
      { id: API_PERMISSIONS.PLM_ECO, name: '工程变更' },
    ],
  },
  {
    id: 'organization',
    name: '组织管理',
    permissions: [
      { id: API_PERMISSIONS.ORG_DEPARTMENT, name: '部门管理' },
      { id: API_PERMISSIONS.ORG_ROLE, name: '角色管理' },
      { id: API_PERMISSIONS.ORG_MENU, name: '菜单管理' },
      { id: API_PERMISSIONS.ORG_EMPLOYEE, name: '员工管理' },
      { id: API_PERMISSIONS.ORG_WAREHOUSE_CATEGORY, name: '仓库分类' },
    ],
  },
  {
    id: 'settings',
    name: '设置',
    permissions: [
      { id: API_PERMISSIONS.SETTINGS_APPROVAL, name: '变更审批' },
      { id: API_PERMISSIONS.SETTINGS_LINKAGE, name: '分类联动' },
    ],
  },
  {
    id: 'workflow',
    name: '工作流',
    permissions: [
      { id: API_PERMISSIONS.WORKFLOW_TASK, name: '工作流任务' },
      { id: API_PERMISSIONS.WORKFLOW_PROCESS, name: '工作流流程' },
    ],
  },
  {
    id: 'audit',
    name: '审计管理',
    permissions: [{ id: API_PERMISSIONS.AUDIT_VIEW, name: '查看审计' }],
  },
  {
    id: 'system',
    name: '系统管理',
    permissions: [
      { id: API_PERMISSIONS.SYSTEM_USER, name: '用户管理' },
      { id: API_PERMISSIONS.SYSTEM_ROLE, name: '角色管理' },
      { id: API_PERMISSIONS.SYSTEM_MENU, name: '菜单管理' },
      { id: API_PERMISSIONS.SYSTEM_CONFIG, name: '系统配置' },
      { id: API_PERMISSIONS.SYSTEM_LOG, name: '日志管理' },
      { id: API_PERMISSIONS.SYSTEM_MONITOR, name: '系统监控' },
      { id: API_PERMISSIONS.SYSTEM_DICT_TYPE_MANAGE, name: '字典类型管理' },
      { id: API_PERMISSIONS.SYSTEM_DICT_DATA_MANAGE, name: '字典数据管理' },
      { id: API_PERMISSIONS.UPLOAD_FILE, name: '文件上传' },
      { id: API_PERMISSIONS.QRCODE_VIEW, name: '二维码' },
      { id: API_PERMISSIONS.SAGA_VIEW, name: '查看 Saga' },
      { id: API_PERMISSIONS.SAGA_RETRY, name: 'Saga 重试' },
      { id: API_PERMISSIONS.SAGA_COMPENSATE, name: 'Saga 补偿' },
    ],
  },
];
