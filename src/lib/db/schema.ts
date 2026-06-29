import {
  mysqlTable,
  varchar,
  datetime,
  decimal,
  int,
  boolean,
  text,
  serial,
  json,
} from 'drizzle-orm/mysql-core';

// ==================== 基础主数据 ====================

// 客户档案
export const customers = mysqlTable('customers', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // 客户编码
  name: varchar('name', { length: 200 }).notNull(), // 客户名称
  shortName: varchar('short_name', { length: 100 }), // 简称
  contact: varchar('contact', { length: 50 }), // 联系人
  phone: varchar('phone', { length: 50 }), // 电话
  address: varchar('address', { length: 500 }), // 地址
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }).default('0'), // 信用额度
  creditUsed: decimal('credit_used', { precision: 15, scale: 2 }).default('0'), // 已用信用
  status: varchar('status', { length: 20 }).default('active'), // 状态
  remarks: text('remarks'), // 备注
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 产品档案
export const products = mysqlTable('products', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // 产品编码
  name: varchar('name', { length: 200 }).notNull(), // 产品名称
  specification: varchar('specification', { length: 200 }), // 规格
  unit: varchar('unit', { length: 20 }), // 单位
  category: varchar('category', { length: 50 }), // 分类
  bomVersion: varchar('bom_version', { length: 20 }).default('V1.0'), // BOM版本
  customerId: int('customer_id').references(() => customers.id), // 所属客户
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 物料（原料/辅料）
export const materials = mysqlTable('materials', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // 物料编码
  name: varchar('name', { length: 200 }).notNull(), // 物料名称
  specification: varchar('specification', { length: 200 }), // 规格
  unit: varchar('unit', { length: 20 }), // 单位
  category: varchar('category', { length: 50 }), // 分类：原料/油墨/网版等
  safetyStock: decimal('safety_stock', { precision: 15, scale: 4 }).default('0'), // 安全库存
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 供应商
export const suppliers = mysqlTable('suppliers', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  contact: varchar('contact', { length: 50 }),
  phone: varchar('phone', { length: 50 }),
  address: varchar('address', { length: 500 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 设备档案
export const equipments = mysqlTable('equipments', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // 设备编码
  name: varchar('name', { length: 200 }).notNull(), // 设备名称
  model: varchar('model', { length: 100 }), // 型号
  workshop: varchar('workshop', { length: 50 }), // 车间
  commissionDate: datetime('commission_date'), // 投产日期
  maintenanceCycle: int('maintenance_cycle'), // 保养周期（天）
  lastMaintenance: datetime('last_maintenance'), // 上次保养
  nextMaintenance: datetime('next_maintenance'), // 下次保养
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 员工档案
export const employees = mysqlTable('employees', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // 工号
  name: varchar('name', { length: 50 }).notNull(), // 姓名
  department: varchar('department', { length: 50 }), // 部门
  position: varchar('position', { length: 50 }), // 职位
  phone: varchar('phone', { length: 50 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// ==================== 仓库管理 ====================

// 仓库定义（四仓分离）
export const warehouses = mysqlTable('warehouses', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 原料仓/成品仓/板房仓/油墨仓
  manager: varchar('manager', { length: 50 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 库位
export const locations = mysqlTable('locations', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  warehouseId: int('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  name: varchar('name', { length: 100 }).notNull(),
  zone: varchar('zone', { length: 50 }), // 区域
  shelf: varchar('shelf', { length: 50 }), // 货架
  layer: varchar('layer', { length: 50 }), // 层
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 批次库存
export const inventoryBatches = mysqlTable('inventory_batches', {
  id: serial('id').primaryKey(),
  batchNo: varchar('batch_no', { length: 50 }).notNull().unique(), // 批次号
  qrCode: varchar('qr_code', { length: 100 }).unique(), // 二维码
  materialId: int('material_id').references(() => materials.id), // 物料ID
  productId: int('product_id').references(() => products.id), // 产品ID
  warehouseId: int('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  locationId: int('location_id').references(() => locations.id),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(), // 数量
  availableQty: decimal('available_qty', { precision: 15, scale: 4 }).notNull(), // 可用数量
  reservedQty: decimal('reserved_qty', { precision: 15, scale: 4 }).default('0'), // 预占数量
  unit: varchar('unit', { length: 20 }),
  sourceType: varchar('source_type', { length: 50 }), // 来源类型：采购/生产/委外
  sourceNo: varchar('source_no', { length: 50 }), // 来源单号
  parentBatchNo: varchar('parent_batch_no', { length: 50 }), // 母卷批次号（磨切继承）
  expiryDate: datetime('expiry_date'), // 有效期
  productionDate: datetime('production_date'), // 生产日期
  status: varchar('status', { length: 20 }).default('available'), // 可用/冻结/待检
  // 新增：实时库存预警字段
  alertLevel: varchar('alert_level', { length: 20 }).default('normal'), // normal/warning/critical
  lastAlertTime: datetime('last_alert_time'), // 上次预警时间
  // 新增：批次追踪字段
  inspectionStatus: varchar('inspection_status', { length: 20 }).default('pending'), // pending/pass/fail
  quarantineStatus: varchar('quarantine_status', { length: 20 }).default('none'), // none/quarantined/released
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 库存事务记录
export const inventoryTransactions = mysqlTable('inventory_transactions', {
  id: serial('id').primaryKey(),
  transNo: varchar('trans_no', { length: 50 }).notNull().unique(), // 事务编号
  transType: varchar('trans_type', { length: 50 }).notNull(), // 入库/出库/调拨/盘点
  batchId: int('batch_id')
    .notNull()
    .references(() => inventoryBatches.id),
  warehouseId: int('warehouse_id').notNull(),
  locationId: int('location_id'),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  beforeQty: decimal('before_qty', { precision: 15, scale: 4 }), // 变动前
  afterQty: decimal('after_qty', { precision: 15, scale: 4 }), // 变动后
  sourceType: varchar('source_type', { length: 50 }),
  sourceNo: varchar('source_no', { length: 50 }),
  operatorId: int('operator_id').references(() => employees.id),
  operatedAt: datetime('operated_at').default('CURRENT_TIMESTAMP'),
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// ==================== 订单管理 ====================

// 销售订单
export const salesOrders = mysqlTable('sales_orders', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  customerId: int('customer_id')
    .notNull()
    .references(() => customers.id),
  orderDate: datetime('order_date').notNull(),
  deliveryDate: datetime('delivery_date'), // 交货日期
  status: varchar('status', { length: 20 }).default('draft'), // 草稿/确认/生产中/完成/取消
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).default('0'),
  remarks: text('remarks'),
  createdBy: int('created_by'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 销售订单明细
export const salesOrderItems = mysqlTable('sales_order_items', {
  id: serial('id').primaryKey(),
  orderId: int('order_id')
    .notNull()
    .references(() => salesOrders.id),
  productId: int('product_id')
    .notNull()
    .references(() => products.id),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 20 }),
  unitPrice: decimal('unit_price', { precision: 15, scale: 4 }),
  amount: decimal('amount', { precision: 15, scale: 4 }),
  deliveryDate: datetime('delivery_date'),
  status: varchar('status', { length: 20 }).default('pending'), // 待产/生产中/完成
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// BOM配方
export const boms = mysqlTable('boms', {
  id: serial('id').primaryKey(),
  productId: int('product_id')
    .notNull()
    .references(() => products.id),
  version: varchar('version', { length: 20 }).default('V1.0'),
  status: varchar('status', { length: 20 }).default('active'),
  effectiveDate: datetime('effective_date'),
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// BOM明细
export const bomItems = mysqlTable('bom_items', {
  id: serial('id').primaryKey(),
  bomId: int('bom_id')
    .notNull()
    .references(() => boms.id),
  materialId: int('material_id')
    .notNull()
    .references(() => materials.id),
  quantity: decimal('quantity', { precision: 15, scale: 6 }).notNull(), // 单位用量
  unit: varchar('unit', { length: 20 }),
  lossRate: decimal('loss_rate', { precision: 5, scale: 2 }).default('0'), // 损耗率
  sequence: int('sequence').default(0), // 工序顺序
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// ==================== 生产管理 ====================

// 生产工单
export const workOrders = mysqlTable('work_orders', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  qrCode: varchar('qr_code', { length: 100 }).unique(), // 工单二维码
  salesOrderId: int('sales_order_id').references(() => salesOrders.id),
  salesOrderItemId: int('sales_order_item_id').references(() => salesOrderItems.id),
  productId: int('product_id')
    .notNull()
    .references(() => products.id),
  bomId: int('bom_id').references(() => boms.id),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(), // 计划数量
  completedQty: decimal('completed_qty', { precision: 15, scale: 4 }).default('0'), // 完成数量
  scrapQty: decimal('scrap_qty', { precision: 15, scale: 4 }).default('0'), // 报废数量
  planStartDate: datetime('plan_start_date'),
  planEndDate: datetime('plan_end_date'),
  actualStartDate: datetime('actual_start_date'),
  actualEndDate: datetime('actual_end_date'),
  status: varchar('status', { length: 20 }).default('created'), // 创建/已排产/生产中/完成/关闭
  priority: int('priority').default(5), // 优先级1-10
  workshop: varchar('workshop', { length: 50 }),
  remarks: text('remarks'),
  createdBy: int('created_by'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 工序路线
export const processes = mysqlTable('processes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  sequence: int('sequence').notNull(), // 工序顺序
  workcenter: varchar('workcenter', { length: 50 }), // 工作中心
  standardTime: decimal('standard_time', { precision: 10, scale: 2 }), // 标准工时（分钟）
  setupTime: decimal('setup_time', { precision: 10, scale: 2 }), // 准备时间
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 工单工序
export const workOrderProcesses = mysqlTable('work_order_processes', {
  id: serial('id').primaryKey(),
  workOrderId: int('work_order_id')
    .notNull()
    .references(() => workOrders.id),
  processId: int('process_id')
    .notNull()
    .references(() => processes.id),
  equipmentId: int('equipment_id').references(() => equipments.id),
  planQty: decimal('plan_qty', { precision: 15, scale: 4 }).notNull(),
  completedQty: decimal('completed_qty', { precision: 15, scale: 4 }).default('0'),
  scrapQty: decimal('scrap_qty', { precision: 15, scale: 4 }).default('0'),
  status: varchar('status', { length: 20 }).default('pending'), // 待工/进行中/完成
  startTime: datetime('start_time'),
  endTime: datetime('end_time'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 生产报工记录
export const productionReports = mysqlTable('production_reports', {
  id: serial('id').primaryKey(),
  reportNo: varchar('report_no', { length: 50 }).notNull().unique(),
  workOrderId: int('work_order_id')
    .notNull()
    .references(() => workOrders.id),
  workOrderProcessId: int('work_order_process_id').references(() => workOrderProcesses.id),
  processId: int('process_id')
    .notNull()
    .references(() => processes.id),
  equipmentId: int('equipment_id').references(() => equipments.id),
  employeeId: int('employee_id')
    .notNull()
    .references(() => employees.id),
  goodQty: decimal('good_qty', { precision: 15, scale: 4 }).notNull(), // 良品数
  scrapQty: decimal('scrap_qty', { precision: 15, scale: 4 }).default('0'), // 报废数
  batchNo: varchar('batch_no', { length: 50 }), // 生产批次号
  workDate: datetime('work_date').notNull(),
  startTime: datetime('start_time'),
  endTime: datetime('end_time'),
  workMinutes: int('work_minutes'), // 工作时长（分钟）
  efficiency: decimal('efficiency', { precision: 5, scale: 2 }), // 效率%
  status: varchar('status', { length: 20 }).default('normal'), // 正常/预警
  remarks: text('remarks'),
  reportedAt: datetime('reported_at').default('CURRENT_TIMESTAMP'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// ==================== 品质管理 ====================

// 检验标准
export const inspectionStandards = mysqlTable('inspection_standards', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 来料/首件/巡检/成品
  productId: int('product_id').references(() => products.id),
  materialId: int('material_id').references(() => materials.id),
  inspectionItems: json('inspection_items'), // 检验项目JSON
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 检验记录
export const inspectionRecords = mysqlTable('inspection_records', {
  id: serial('id').primaryKey(),
  inspectionNo: varchar('inspection_no', { length: 50 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull(), // 来料/首件/巡检/成品
  standardId: int('standard_id').references(() => inspectionStandards.id),
  batchId: int('batch_id').references(() => inventoryBatches.id),
  workOrderId: int('work_order_id').references(() => workOrders.id),
  productId: int('product_id').references(() => products.id),
  materialId: int('material_id').references(() => materials.id),
  sampleQty: int('sample_qty'), // 抽样数量
  passQty: int('pass_qty'), // 合格数
  failQty: int('fail_qty'), // 不合格数
  result: varchar('result', { length: 20 }), // 合格/不合格/待判定
  inspectorId: int('inspector_id').references(() => employees.id),
  inspectedAt: datetime('inspected_at').default('CURRENT_TIMESTAMP'),
  inspectionData: json('inspection_data'), // 检验数据JSON
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 不良品记录
export const defectRecords = mysqlTable('defect_records', {
  id: serial('id').primaryKey(),
  inspectionId: int('inspection_id').references(() => inspectionRecords.id),
  batchId: int('batch_id').references(() => inventoryBatches.id),
  defectType: varchar('defect_type', { length: 50 }), // 不良类型
  defectQty: decimal('defect_qty', { precision: 15, scale: 4 }),
  disposition: varchar('disposition', { length: 20 }), // 处置方式：返工/报废/特采
  status: varchar('status', { length: 20 }).default('pending'), // 待处理/已处理
  handlerId: int('handler_id').references(() => employees.id),
  handledAt: datetime('handled_at'),
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// ==================== 采购管理 ====================

// 采购申请
export const purchaseRequests = mysqlTable('purchase_requests', {
  id: serial('id').primaryKey(),
  requestNo: varchar('request_no', { length: 50 }).notNull().unique(),
  requestType: varchar('request_type', { length: 20 }), // 主动请购/预警生成
  requesterId: int('requester_id').references(() => employees.id),
  requestDate: datetime('request_date').notNull(),
  status: varchar('status', { length: 20 }).default('draft'), // 草稿/提交/采购中/完成
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 采购申请明细
export const purchaseRequestItems = mysqlTable('purchase_request_items', {
  id: serial('id').primaryKey(),
  requestId: int('request_id')
    .notNull()
    .references(() => purchaseRequests.id),
  materialId: int('material_id')
    .notNull()
    .references(() => materials.id),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 20 }),
  requiredDate: datetime('required_date'),
  status: varchar('status', { length: 20 }).default('pending'),
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 采购订单
export const purchaseOrders = mysqlTable('purchase_orders', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  supplierId: int('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  orderDate: datetime('order_date').notNull(),
  expectedDate: datetime('expected_date'),
  status: varchar('status', { length: 20 }).default('draft'), // 草稿/已发送/部分到货/完成
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).default('0'),
  remarks: text('remarks'),
  createdBy: int('created_by'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 采购订单明细
export const purchaseOrderItems = mysqlTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  orderId: int('order_id')
    .notNull()
    .references(() => purchaseOrders.id),
  materialId: int('material_id')
    .notNull()
    .references(() => materials.id),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  receivedQty: decimal('received_qty', { precision: 15, scale: 4 }).default('0'),
  unit: varchar('unit', { length: 20 }),
  unitPrice: decimal('unit_price', { precision: 15, scale: 4 }),
  amount: decimal('amount', { precision: 15, scale: 4 }),
  status: varchar('status', { length: 20 }).default('pending'),
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// ==================== 委外管理 ====================

// 委外工单
export const outsourceOrders = mysqlTable('outsource_orders', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  qrCode: varchar('qr_code', { length: 100 }).unique(), // 委外二维码
  supplierId: int('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  workOrderId: int('work_order_id').references(() => workOrders.id),
  processId: int('process_id').references(() => processes.id),
  sendQty: decimal('send_qty', { precision: 15, scale: 4 }).notNull(), // 发出数量
  returnQty: decimal('return_qty', { precision: 15, scale: 4 }).default('0'), // 回货数量
  scrapQty: decimal('scrap_qty', { precision: 15, scale: 4 }).default('0'), // 损耗数量
  allowedLossRate: decimal('allowed_loss_rate', { precision: 5, scale: 2 }).default('0'), // 允许损耗率
  sendDate: datetime('send_date').notNull(),
  expectedReturnDate: datetime('expected_return_date'),
  actualReturnDate: datetime('actual_return_date'),
  status: varchar('status', { length: 20 }).default('sent'), // 已发送/部分回货/完成
  amount: decimal('amount', { precision: 15, scale: 2 }),
  paymentStatus: varchar('payment_status', { length: 20 }).default('unpaid'), // 未付款/已付款/锁定
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// ==================== 车辆派送 ====================

// 车辆档案
export const vehicles = mysqlTable('vehicles', {
  id: serial('id').primaryKey(),
  plateNo: varchar('plate_no', { length: 20 }).notNull().unique(),
  vehicleType: varchar('vehicle_type', { length: 50 }), // 车型
  volume: decimal('volume', { precision: 10, scale: 2 }), // 容积m³
  loadWeight: decimal('load_weight', { precision: 10, scale: 2 }), // 载重kg
  driver: varchar('driver', { length: 50 }),
  driverPhone: varchar('driver_phone', { length: 20 }),
  status: varchar('status', { length: 20 }).default('available'), // 可用/出车中/维修
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 派车单
export const deliveryOrders = mysqlTable('delivery_orders', {
  id: serial('id').primaryKey(),
  deliveryNo: varchar('delivery_no', { length: 50 }).notNull().unique(),
  vehicleId: int('vehicle_id').references(() => vehicles.id),
  salesOrderId: int('sales_order_id').references(() => salesOrders.id),
  customerId: int('customer_id').references(() => customers.id),
  deliveryAddress: varchar('delivery_address', { length: 500 }),
  deliveryWindow: varchar('delivery_window', { length: 50 }), // 卸货窗口
  planDate: datetime('plan_date'),
  actualDate: datetime('actual_date'),
  status: varchar('status', { length: 20 }).default('planned'), // 计划/装车/运输中/已送达
  totalWeight: decimal('total_weight', { precision: 10, scale: 2 }),
  totalVolume: decimal('total_volume', { precision: 10, scale: 2 }),
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 派车明细
export const deliveryItems = mysqlTable('delivery_items', {
  id: serial('id').primaryKey(),
  deliveryId: int('delivery_id')
    .notNull()
    .references(() => deliveryOrders.id),
  batchId: int('batch_id')
    .notNull()
    .references(() => inventoryBatches.id),
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  palletNo: varchar('pallet_no', { length: 50 }), // 栈板号
  loadedAt: datetime('loaded_at'),
  confirmedAt: datetime('confirmed_at'),
  status: varchar('status', { length: 20 }).default('pending'), // 待装/已装/已送达
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 电子回单
export const deliveryReceipts = mysqlTable('delivery_receipts', {
  id: serial('id').primaryKey(),
  deliveryId: int('delivery_id')
    .notNull()
    .references(() => deliveryOrders.id),
  receiverName: varchar('receiver_name', { length: 50 }),
  receiverPhone: varchar('receiver_phone', { length: 20 }),
  receivedAt: datetime('received_at'),
  signature: text('signature'), // 签名图片URL
  photos: json('photos'), // 照片URL数组
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// ==================== 打样管理 ====================

// 打样申请
export const sampleRequests = mysqlTable('sample_requests', {
  id: serial('id').primaryKey(),
  requestNo: varchar('request_no', { length: 50 }).notNull().unique(),
  customerId: int('customer_id')
    .notNull()
    .references(() => customers.id),
  productId: int('product_id').references(() => products.id),
  productName: varchar('product_name', { length: 200 }),
  specification: varchar('specification', { length: 200 }),
  quantity: decimal('quantity', { precision: 15, scale: 4 }),
  unit: varchar('unit', { length: 20 }),
  requestDate: datetime('request_date').notNull(),
  requiredDate: datetime('required_date'),
  status: varchar('status', { length: 20 }).default('draft'), // 草稿/进行中/完成/转量产
  cost: decimal('cost', { precision: 15, scale: 2 }), // 打样成本
  qrCode: varchar('qr_code', { length: 100 }).unique(), // 打样二维码
  remarks: text('remarks'),
  requesterId: int('requester_id').references(() => employees.id),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// ==================== 设备保养 ====================

// 保养计划
export const maintenancePlans = mysqlTable('maintenance_plans', {
  id: serial('id').primaryKey(),
  equipmentId: int('equipment_id')
    .notNull()
    .references(() => equipments.id),
  planDate: datetime('plan_date').notNull(),
  maintenanceType: varchar('maintenance_type', { length: 20 }), // 日常/周保/月保/年保
  status: varchar('status', { length: 20 }).default('planned'), // 计划/执行中/完成
  executorId: int('executor_id').references(() => employees.id),
  executedAt: datetime('executed_at'),
  remarks: text('remarks'),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 类型导出
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Equipment = typeof equipments.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type InventoryBatch = typeof inventoryBatches.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type SalesOrder = typeof salesOrders.$inferSelect;
export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type Bom = typeof boms.$inferSelect;
export type BomItem = typeof bomItems.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;
export type Process = typeof processes.$inferSelect;
export type WorkOrderProcess = typeof workOrderProcesses.$inferSelect;
export type ProductionReport = typeof productionReports.$inferSelect;
export type InspectionStandard = typeof inspectionStandards.$inferSelect;
export type InspectionRecord = typeof inspectionRecords.$inferSelect;
export type DefectRecord = typeof defectRecords.$inferSelect;
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type OutsourceOrder = typeof outsourceOrders.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;
export type SampleRequest = typeof sampleRequests.$inferSelect;

// ==================== dcprint 迁移功能 ====================

// 物料标签表
export const materialLabels = mysqlTable('material_labels', {
  id: serial('id').primaryKey(),
  labelNo: varchar('label_no', { length: 50 }).notNull().unique(), // 标签编号
  qrCode: text('qr_code'), // 二维码内容
  purchaseOrderNo: varchar('purchase_order_no', { length: 50 }), // 采购单号
  supplierName: varchar('supplier_name', { length: 200 }), // 供应商名称
  receiveDate: datetime('receive_date'), // 进料日期
  materialCode: varchar('material_code', { length: 50 }).notNull(), // 物料代号
  materialName: varchar('material_name', { length: 200 }), // 品名
  specification: varchar('specification', { length: 200 }), // 进料规格
  unit: varchar('unit', { length: 20 }), // 单位
  batchNo: varchar('batch_no', { length: 50 }), // 批号
  quantity: decimal('quantity', { precision: 18, scale: 4 }).default('0'), // 数量
  packageQty: decimal('package_qty', { precision: 18, scale: 4 }).default('0'), // 包装量
  width: decimal('width', { precision: 18, scale: 2 }), // 宽幅
  lengthPerRoll: decimal('length_per_roll', { precision: 18, scale: 2 }), // 每卷米数
  remark: text('remark'), // 备注
  colorCode: varchar('color_code', { length: 50 }), // 颜色代号
  mixRemark: text('mix_remark'), // 混合料备注
  warehouseId: int('warehouse_id').references(() => warehouses.id), // 仓库ID
  locationId: int('location_id').references(() => locations.id), // 库位ID
  isMainMaterial: boolean('is_main_material').default(false), // 是否母材
  isUsed: boolean('is_used').default(false), // 是否已使用
  isCut: boolean('is_cut').default(false), // 是否已分切
  parentLabelId: int('parent_label_id'), // 父标签ID（分切来源）
  status: varchar('status', { length: 20 }).default('active'), // active/frozen/disabled
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 分切记录表
export const cuttingRecords = mysqlTable('cutting_records', {
  id: serial('id').primaryKey(),
  recordNo: varchar('record_no', { length: 50 }).notNull().unique(), // 分切单号
  sourceLabelId: int('source_label_id')
    .notNull()
    .references(() => materialLabels.id), // 源标签ID
  sourceLabelNo: varchar('source_label_no', { length: 50 }).notNull(), // 源标签编号
  cutWidthStr: varchar('cut_width_str', { length: 200 }), // 分切宽幅（如：10+20+30）
  originalWidth: decimal('original_width', { precision: 18, scale: 2 }), // 原宽幅
  cutTotalWidth: decimal('cut_total_width', { precision: 18, scale: 2 }), // 分切总宽幅
  remainWidth: decimal('remain_width', { precision: 18, scale: 2 }), // 剩余宽幅
  operatorId: int('operator_id').references(() => employees.id), // 操作员ID
  operatorName: varchar('operator_name', { length: 50 }), // 操作员名称
  cutTime: datetime('cut_time').default('CURRENT_TIMESTAMP'), // 分切时间
  remark: text('remark'), // 备注
  status: varchar('status', { length: 20 }).default('active'), // active/cancelled
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 分切明细表
export const cuttingDetails = mysqlTable('cutting_details', {
  id: serial('id').primaryKey(),
  recordId: int('record_id')
    .notNull()
    .references(() => cuttingRecords.id), // 分切记录ID
  newLabelId: int('new_label_id')
    .notNull()
    .references(() => materialLabels.id), // 新标签ID
  newLabelNo: varchar('new_label_no', { length: 50 }).notNull(), // 新标签编号
  cutWidth: decimal('cut_width', { precision: 18, scale: 2 }), // 分切宽幅
  sequence: int('sequence').default(0), // 分切序号
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 生产流程卡表
export const processCards = mysqlTable('process_cards', {
  id: serial('id').primaryKey(),
  cardNo: varchar('card_no', { length: 50 }).notNull().unique(), // 流程卡卡号
  qrCode: text('qr_code'), // 二维码内容
  workOrderId: int('work_order_id').references(() => workOrders.id), // 工单ID
  workOrderNo: varchar('work_order_no', { length: 50 }), // 工单号
  productCode: varchar('product_code', { length: 50 }), // 成品料号
  productName: varchar('product_name', { length: 200 }), // 成品品名
  materialSpec: varchar('material_spec', { length: 200 }), // 材料规格
  workOrderDate: datetime('work_order_date'), // 工单日期
  planQty: decimal('plan_qty', { precision: 18, scale: 4 }).default('0'), // 计划生产数量
  mainLabelId: int('main_label_id').references(() => materialLabels.id), // 主材标签ID
  mainLabelNo: varchar('main_label_no', { length: 50 }), // 主材标签编号
  burdeningStatus: varchar('burdening_status', { length: 20 }).default('pending'), // 配料状态
  lockStatus: varchar('lock_status', { length: 20 }).default('unlocked'), // 锁住状态
  createUserId: int('create_user_id').references(() => employees.id), // 创建人ID
  createUserName: varchar('create_user_name', { length: 50 }), // 创建人名称
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

// 流程卡物料关联表
export const processCardMaterials = mysqlTable('process_card_materials', {
  id: serial('id').primaryKey(),
  cardId: int('card_id')
    .notNull()
    .references(() => processCards.id), // 流程卡ID
  cardNo: varchar('card_no', { length: 50 }), // 流程卡卡号
  labelId: int('label_id')
    .notNull()
    .references(() => materialLabels.id), // 物料标签ID
  labelNo: varchar('label_no', { length: 50 }).notNull(), // 物料标签编号
  materialType: varchar('material_type', { length: 20 }).default('auxiliary'), // 物料类型：main/auxiliary
  materialCode: varchar('material_code', { length: 50 }), // 物料代号
  materialName: varchar('material_name', { length: 200 }), // 物料名称
  specification: varchar('specification', { length: 200 }), // 规格
  batchNo: varchar('batch_no', { length: 50 }), // 批号
  quantity: decimal('quantity', { precision: 18, scale: 4 }).default('0'), // 用量
  unit: varchar('unit', { length: 20 }), // 单位
  remark: text('remark'), // 备注
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 物料追溯记录表
export const traceRecords = mysqlTable('trace_records', {
  id: serial('id').primaryKey(),
  traceNo: varchar('trace_no', { length: 50 }).notNull().unique(), // 追溯单号
  cardId: int('card_id').references(() => processCards.id), // 流程卡ID
  cardNo: varchar('card_no', { length: 50 }), // 流程卡卡号
  workOrderNo: varchar('work_order_no', { length: 50 }), // 工单号
  productCode: varchar('product_code', { length: 50 }), // 成品料号
  mainLabelId: int('main_label_id').references(() => materialLabels.id), // 主材标签ID
  traceType: varchar('trace_type', { length: 20 }).default('forward'), // 追溯类型：forward/backward
  operatorId: int('operator_id').references(() => employees.id), // 操作员ID
  operatorName: varchar('operator_name', { length: 50 }), // 操作员名称
  traceTime: datetime('trace_time').default('CURRENT_TIMESTAMP'), // 追溯时间
  remark: text('remark'), // 备注
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// 扫码操作日志表
export const scanLogs = mysqlTable('scan_logs', {
  id: serial('id').primaryKey(),
  scanType: varchar('scan_type', { length: 50 }).notNull(), // 扫码类型: cutting/process/trace
  qrContent: text('qr_content'), // 二维码内容
  labelNo: varchar('label_no', { length: 50 }), // 标签编号
  operation: varchar('operation', { length: 50 }), // 操作类型
  result: varchar('result', { length: 20 }).default('success'), // 结果：success/failed
  message: text('message'), // 结果消息
  operatorId: int('operator_id').references(() => employees.id), // 操作员ID
  operatorName: varchar('operator_name', { length: 50 }), // 操作员名称
  scanTime: datetime('scan_time').default('CURRENT_TIMESTAMP'), // 扫码时间
  ipAddress: varchar('ip_address', { length: 50 }), // IP地址
});

// 类型导出
type MaterialLabel = typeof materialLabels.$inferSelect;
type CuttingRecord = typeof cuttingRecords.$inferSelect;
type CuttingDetail = typeof cuttingDetails.$inferSelect;
type ProcessCard = typeof processCards.$inferSelect;
type ProcessCardMaterial = typeof processCardMaterials.$inferSelect;
type TraceRecord = typeof traceRecords.$inferSelect;
type ScanLog = typeof scanLogs.$inferSelect;
