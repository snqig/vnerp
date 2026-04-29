import {
  pgTable,
  varchar,
  timestamp,
  numeric,
  integer,
  boolean,
  text,
  serial,
  jsonb,
} from 'drizzle-orm/pg-core';

// ==================== 基础主数据 ====================

// 客户档案
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // 客户编码
  name: varchar('name', { length: 200 }).notNull(), // 客户名称
  shortName: varchar('short_name', { length: 100 }), // 简称
  contact: varchar('contact', { length: 50 }), // 联系人
  phone: varchar('phone', { length: 50 }), // 电话
  address: varchar('address', { length: 500 }), // 地址
  creditLimit: numeric('credit_limit', { precision: 15, scale: 2 }).default('0'), // 信用额度
  creditUsed: numeric('credit_used', { precision: 15, scale: 2 }).default('0'), // 已用信用
  status: varchar('status', { length: 20 }).default('active'), // 状态
  remarks: text('remarks'), // 备注
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 产品档案
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // 产品编码
  name: varchar('name', { length: 200 }).notNull(), // 产品名称
  specification: varchar('specification', { length: 200 }), // 规格
  unit: varchar('unit', { length: 20 }), // 单位
  category: varchar('category', { length: 50 }), // 分类
  bomVersion: varchar('bom_version', { length: 20 }).default('V1.0'), // BOM版本
  customerId: integer('customer_id').references(() => customers.id), // 所属客户
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 物料（原料/辅料）
export const materials = pgTable('materials', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // 物料编码
  name: varchar('name', { length: 200 }).notNull(), // 物料名称
  specification: varchar('specification', { length: 200 }), // 规格
  unit: varchar('unit', { length: 20 }), // 单位
  category: varchar('category', { length: 50 }), // 分类：原料/油墨/网版等
  safetyStock: numeric('safety_stock', { precision: 15, scale: 4 }).default('0'), // 安全库存
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 供应商
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  contact: varchar('contact', { length: 50 }),
  phone: varchar('phone', { length: 50 }),
  address: varchar('address', { length: 500 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 设备档案
export const equipments = pgTable('equipments', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // 设备编码
  name: varchar('name', { length: 200 }).notNull(), // 设备名称
  model: varchar('model', { length: 100 }), // 型号
  workshop: varchar('workshop', { length: 50 }), // 车间
  commissionDate: timestamp('commission_date'), // 投产日期
  maintenanceCycle: integer('maintenance_cycle'), // 保养周期（天）
  lastMaintenance: timestamp('last_maintenance'), // 上次保养
  nextMaintenance: timestamp('next_maintenance'), // 下次保养
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 员工档案
export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // 工号
  name: varchar('name', { length: 50 }).notNull(), // 姓名
  department: varchar('department', { length: 50 }), // 部门
  position: varchar('position', { length: 50 }), // 职位
  phone: varchar('phone', { length: 50 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== 仓库管理 ====================

// 仓库定义（四仓分离）
export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 原料仓/成品仓/板房仓/油墨仓
  manager: varchar('manager', { length: 50 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 库位
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  name: varchar('name', { length: 100 }).notNull(),
  zone: varchar('zone', { length: 50 }), // 区域
  shelf: varchar('shelf', { length: 50 }), // 货架
  layer: varchar('layer', { length: 50 }), // 层
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 批次库存
export const inventoryBatches = pgTable('inventory_batches', {
  id: serial('id').primaryKey(),
  batchNo: varchar('batch_no', { length: 50 }).notNull().unique(), // 批次号
  qrCode: varchar('qr_code', { length: 100 }).unique(), // 二维码
  materialId: integer('material_id').references(() => materials.id), // 物料ID
  productId: integer('product_id').references(() => products.id), // 产品ID
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  locationId: integer('location_id').references(() => locations.id),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(), // 数量
  availableQty: numeric('available_qty', { precision: 15, scale: 4 }).notNull(), // 可用数量
  reservedQty: numeric('reserved_qty', { precision: 15, scale: 4 }).default('0'), // 预占数量
  unit: varchar('unit', { length: 20 }),
  sourceType: varchar('source_type', { length: 50 }), // 来源类型：采购/生产/委外
  sourceNo: varchar('source_no', { length: 50 }), // 来源单号
  parentBatchNo: varchar('parent_batch_no', { length: 50 }), // 母卷批次号（磨切继承）
  expiryDate: timestamp('expiry_date'), // 有效期
  productionDate: timestamp('production_date'), // 生产日期
  status: varchar('status', { length: 20 }).default('available'), // 可用/冻结/待检
  // 新增：实时库存预警字段
  alertLevel: varchar('alert_level', { length: 20 }).default('normal'), // normal/warning/critical
  lastAlertTime: timestamp('last_alert_time'), // 上次预警时间
  // 新增：批次追踪字段
  inspectionStatus: varchar('inspection_status', { length: 20 }).default('pending'), // pending/pass/fail
  quarantineStatus: varchar('quarantine_status', { length: 20 }).default('none'), // none/quarantined/released
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 库存事务记录
export const inventoryTransactions = pgTable('inventory_transactions', {
  id: serial('id').primaryKey(),
  transNo: varchar('trans_no', { length: 50 }).notNull().unique(), // 事务编号
  transType: varchar('trans_type', { length: 50 }).notNull(), // 入库/出库/调拨/盘点
  batchId: integer('batch_id').notNull().references(() => inventoryBatches.id),
  warehouseId: integer('warehouse_id').notNull(),
  locationId: integer('location_id'),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  beforeQty: numeric('before_qty', { precision: 15, scale: 4 }), // 变动前
  afterQty: numeric('after_qty', { precision: 15, scale: 4 }), // 变动后
  sourceType: varchar('source_type', { length: 50 }),
  sourceNo: varchar('source_no', { length: 50 }),
  operatorId: integer('operator_id').references(() => employees.id),
  operatedAt: timestamp('operated_at').defaultNow(),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== 订单管理 ====================

// 销售订单
export const salesOrders = pgTable('sales_orders', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  orderDate: timestamp('order_date').notNull(),
  deliveryDate: timestamp('delivery_date'), // 交货日期
  status: varchar('status', { length: 20 }).default('draft'), // 草稿/确认/生产中/完成/取消
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).default('0'),
  remarks: text('remarks'),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 销售订单明细
export const salesOrderItems = pgTable('sales_order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => salesOrders.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 20 }),
  unitPrice: numeric('unit_price', { precision: 15, scale: 4 }),
  amount: numeric('amount', { precision: 15, scale: 4 }),
  deliveryDate: timestamp('delivery_date'),
  status: varchar('status', { length: 20 }).default('pending'), // 待产/生产中/完成
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// BOM配方
export const boms = pgTable('boms', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  version: varchar('version', { length: 20 }).default('V1.0'),
  status: varchar('status', { length: 20 }).default('active'),
  effectiveDate: timestamp('effective_date'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// BOM明细
export const bomItems = pgTable('bom_items', {
  id: serial('id').primaryKey(),
  bomId: integer('bom_id').notNull().references(() => boms.id),
  materialId: integer('material_id').notNull().references(() => materials.id),
  quantity: numeric('quantity', { precision: 15, scale: 6 }).notNull(), // 单位用量
  unit: varchar('unit', { length: 20 }),
  lossRate: numeric('loss_rate', { precision: 5, scale: 2 }).default('0'), // 损耗率
  sequence: integer('sequence').default(0), // 工序顺序
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== 生产管理 ====================

// 生产工单
export const workOrders = pgTable('work_orders', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  qrCode: varchar('qr_code', { length: 100 }).unique(), // 工单二维码
  salesOrderId: integer('sales_order_id').references(() => salesOrders.id),
  salesOrderItemId: integer('sales_order_item_id').references(() => salesOrderItems.id),
  productId: integer('product_id').notNull().references(() => products.id),
  bomId: integer('bom_id').references(() => boms.id),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(), // 计划数量
  completedQty: numeric('completed_qty', { precision: 15, scale: 4 }).default('0'), // 完成数量
  scrapQty: numeric('scrap_qty', { precision: 15, scale: 4 }).default('0'), // 报废数量
  planStartDate: timestamp('plan_start_date'),
  planEndDate: timestamp('plan_end_date'),
  actualStartDate: timestamp('actual_start_date'),
  actualEndDate: timestamp('actual_end_date'),
  status: varchar('status', { length: 20 }).default('created'), // 创建/已排产/生产中/完成/关闭
  priority: integer('priority').default(5), // 优先级1-10
  workshop: varchar('workshop', { length: 50 }),
  remarks: text('remarks'),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 工序路线
export const processes = pgTable('processes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  sequence: integer('sequence').notNull(), // 工序顺序
  workcenter: varchar('workcenter', { length: 50 }), // 工作中心
  standardTime: numeric('standard_time', { precision: 10, scale: 2 }), // 标准工时（分钟）
  setupTime: numeric('setup_time', { precision: 10, scale: 2 }), // 准备时间
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 工单工序
export const workOrderProcesses = pgTable('work_order_processes', {
  id: serial('id').primaryKey(),
  workOrderId: integer('work_order_id').notNull().references(() => workOrders.id),
  processId: integer('process_id').notNull().references(() => processes.id),
  equipmentId: integer('equipment_id').references(() => equipments.id),
  planQty: numeric('plan_qty', { precision: 15, scale: 4 }).notNull(),
  completedQty: numeric('completed_qty', { precision: 15, scale: 4 }).default('0'),
  scrapQty: numeric('scrap_qty', { precision: 15, scale: 4 }).default('0'),
  status: varchar('status', { length: 20 }).default('pending'), // 待工/进行中/完成
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 生产报工记录
export const productionReports = pgTable('production_reports', {
  id: serial('id').primaryKey(),
  reportNo: varchar('report_no', { length: 50 }).notNull().unique(),
  workOrderId: integer('work_order_id').notNull().references(() => workOrders.id),
  workOrderProcessId: integer('work_order_process_id').references(() => workOrderProcesses.id),
  processId: integer('process_id').notNull().references(() => processes.id),
  equipmentId: integer('equipment_id').references(() => equipments.id),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  goodQty: numeric('good_qty', { precision: 15, scale: 4 }).notNull(), // 良品数
  scrapQty: numeric('scrap_qty', { precision: 15, scale: 4 }).default('0'), // 报废数
  batchNo: varchar('batch_no', { length: 50 }), // 生产批次号
  workDate: timestamp('work_date').notNull(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  workMinutes: integer('work_minutes'), // 工作时长（分钟）
  efficiency: numeric('efficiency', { precision: 5, scale: 2 }), // 效率%
  status: varchar('status', { length: 20 }).default('normal'), // 正常/预警
  remarks: text('remarks'),
  reportedAt: timestamp('reported_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== 品质管理 ====================

// 检验标准
export const inspectionStandards = pgTable('inspection_standards', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 来料/首件/巡检/成品
  productId: integer('product_id').references(() => products.id),
  materialId: integer('material_id').references(() => materials.id),
  inspectionItems: jsonb('inspection_items'), // 检验项目JSON
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 检验记录
export const inspectionRecords = pgTable('inspection_records', {
  id: serial('id').primaryKey(),
  inspectionNo: varchar('inspection_no', { length: 50 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull(), // 来料/首件/巡检/成品
  standardId: integer('standard_id').references(() => inspectionStandards.id),
  batchId: integer('batch_id').references(() => inventoryBatches.id),
  workOrderId: integer('work_order_id').references(() => workOrders.id),
  productId: integer('product_id').references(() => products.id),
  materialId: integer('material_id').references(() => materials.id),
  sampleQty: integer('sample_qty'), // 抽样数量
  passQty: integer('pass_qty'), // 合格数
  failQty: integer('fail_qty'), // 不合格数
  result: varchar('result', { length: 20 }), // 合格/不合格/待判定
  inspectorId: integer('inspector_id').references(() => employees.id),
  inspectedAt: timestamp('inspected_at').defaultNow(),
  inspectionData: jsonb('inspection_data'), // 检验数据JSON
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 不良品记录
export const defectRecords = pgTable('defect_records', {
  id: serial('id').primaryKey(),
  inspectionId: integer('inspection_id').references(() => inspectionRecords.id),
  batchId: integer('batch_id').references(() => inventoryBatches.id),
  defectType: varchar('defect_type', { length: 50 }), // 不良类型
  defectQty: numeric('defect_qty', { precision: 15, scale: 4 }),
  disposition: varchar('disposition', { length: 20 }), // 处置方式：返工/报废/特采
  status: varchar('status', { length: 20 }).default('pending'), // 待处理/已处理
  handlerId: integer('handler_id').references(() => employees.id),
  handledAt: timestamp('handled_at'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== 采购管理 ====================

// 采购申请
export const purchaseRequests = pgTable('purchase_requests', {
  id: serial('id').primaryKey(),
  requestNo: varchar('request_no', { length: 50 }).notNull().unique(),
  requestType: varchar('request_type', { length: 20 }), // 主动请购/预警生成
  requesterId: integer('requester_id').references(() => employees.id),
  requestDate: timestamp('request_date').notNull(),
  status: varchar('status', { length: 20 }).default('draft'), // 草稿/提交/采购中/完成
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 采购申请明细
export const purchaseRequestItems = pgTable('purchase_request_items', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').notNull().references(() => purchaseRequests.id),
  materialId: integer('material_id').notNull().references(() => materials.id),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 20 }),
  requiredDate: timestamp('required_date'),
  status: varchar('status', { length: 20 }).default('pending'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 采购订单
export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  orderDate: timestamp('order_date').notNull(),
  expectedDate: timestamp('expected_date'),
  status: varchar('status', { length: 20 }).default('draft'), // 草稿/已发送/部分到货/完成
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).default('0'),
  remarks: text('remarks'),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 采购订单明细
export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => purchaseOrders.id),
  materialId: integer('material_id').notNull().references(() => materials.id),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  receivedQty: numeric('received_qty', { precision: 15, scale: 4 }).default('0'),
  unit: varchar('unit', { length: 20 }),
  unitPrice: numeric('unit_price', { precision: 15, scale: 4 }),
  amount: numeric('amount', { precision: 15, scale: 4 }),
  status: varchar('status', { length: 20 }).default('pending'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== 委外管理 ====================

// 委外工单
export const outsourceOrders = pgTable('outsource_orders', {
  id: serial('id').primaryKey(),
  orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
  qrCode: varchar('qr_code', { length: 100 }).unique(), // 委外二维码
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  workOrderId: integer('work_order_id').references(() => workOrders.id),
  processId: integer('process_id').references(() => processes.id),
  sendQty: numeric('send_qty', { precision: 15, scale: 4 }).notNull(), // 发出数量
  returnQty: numeric('return_qty', { precision: 15, scale: 4 }).default('0'), // 回货数量
  scrapQty: numeric('scrap_qty', { precision: 15, scale: 4 }).default('0'), // 损耗数量
  allowedLossRate: numeric('allowed_loss_rate', { precision: 5, scale: 2 }).default('0'), // 允许损耗率
  sendDate: timestamp('send_date').notNull(),
  expectedReturnDate: timestamp('expected_return_date'),
  actualReturnDate: timestamp('actual_return_date'),
  status: varchar('status', { length: 20 }).default('sent'), // 已发送/部分回货/完成
  amount: numeric('amount', { precision: 15, scale: 2 }),
  paymentStatus: varchar('payment_status', { length: 20 }).default('unpaid'), // 未付款/已付款/锁定
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== 车辆派送 ====================

// 车辆档案
export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  plateNo: varchar('plate_no', { length: 20 }).notNull().unique(),
  vehicleType: varchar('vehicle_type', { length: 50 }), // 车型
  volume: numeric('volume', { precision: 10, scale: 2 }), // 容积m³
  loadWeight: numeric('load_weight', { precision: 10, scale: 2 }), // 载重kg
  driver: varchar('driver', { length: 50 }),
  driverPhone: varchar('driver_phone', { length: 20 }),
  status: varchar('status', { length: 20 }).default('available'), // 可用/出车中/维修
  createdAt: timestamp('created_at').defaultNow(),
});

// 派车单
export const deliveryOrders = pgTable('delivery_orders', {
  id: serial('id').primaryKey(),
  deliveryNo: varchar('delivery_no', { length: 50 }).notNull().unique(),
  vehicleId: integer('vehicle_id').references(() => vehicles.id),
  salesOrderId: integer('sales_order_id').references(() => salesOrders.id),
  customerId: integer('customer_id').references(() => customers.id),
  deliveryAddress: varchar('delivery_address', { length: 500 }),
  deliveryWindow: varchar('delivery_window', { length: 50 }), // 卸货窗口
  planDate: timestamp('plan_date'),
  actualDate: timestamp('actual_date'),
  status: varchar('status', { length: 20 }).default('planned'), // 计划/装车/运输中/已送达
  totalWeight: numeric('total_weight', { precision: 10, scale: 2 }),
  totalVolume: numeric('total_volume', { precision: 10, scale: 2 }),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 派车明细
export const deliveryItems = pgTable('delivery_items', {
  id: serial('id').primaryKey(),
  deliveryId: integer('delivery_id').notNull().references(() => deliveryOrders.id),
  batchId: integer('batch_id').notNull().references(() => inventoryBatches.id),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  palletNo: varchar('pallet_no', { length: 50 }), // 栈板号
  loadedAt: timestamp('loaded_at'),
  confirmedAt: timestamp('confirmed_at'),
  status: varchar('status', { length: 20 }).default('pending'), // 待装/已装/已送达
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 电子回单
export const deliveryReceipts = pgTable('delivery_receipts', {
  id: serial('id').primaryKey(),
  deliveryId: integer('delivery_id').notNull().references(() => deliveryOrders.id),
  receiverName: varchar('receiver_name', { length: 50 }),
  receiverPhone: varchar('receiver_phone', { length: 20 }),
  receivedAt: timestamp('received_at'),
  signature: text('signature'), // 签名图片URL
  photos: jsonb('photos'), // 照片URL数组
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== 打样管理 ====================

// 打样申请
export const sampleRequests = pgTable('sample_requests', {
  id: serial('id').primaryKey(),
  requestNo: varchar('request_no', { length: 50 }).notNull().unique(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  productId: integer('product_id').references(() => products.id),
  productName: varchar('product_name', { length: 200 }),
  specification: varchar('specification', { length: 200 }),
  quantity: numeric('quantity', { precision: 15, scale: 4 }),
  unit: varchar('unit', { length: 20 }),
  requestDate: timestamp('request_date').notNull(),
  requiredDate: timestamp('required_date'),
  status: varchar('status', { length: 20 }).default('draft'), // 草稿/进行中/完成/转量产
  cost: numeric('cost', { precision: 15, scale: 2 }), // 打样成本
  qrCode: varchar('qr_code', { length: 100 }).unique(), // 打样二维码
  remarks: text('remarks'),
  requesterId: integer('requester_id').references(() => employees.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==================== 设备保养 ====================

// 保养计划
export const maintenancePlans = pgTable('maintenance_plans', {
  id: serial('id').primaryKey(),
  equipmentId: integer('equipment_id').notNull().references(() => equipments.id),
  planDate: timestamp('plan_date').notNull(),
  maintenanceType: varchar('maintenance_type', { length: 20 }), // 日常/周保/月保/年保
  status: varchar('status', { length: 20 }).default('planned'), // 计划/执行中/完成
  executorId: integer('executor_id').references(() => employees.id),
  executedAt: timestamp('executed_at'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
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
export const materialLabels = pgTable('material_labels', {
  id: serial('id').primaryKey(),
  labelNo: varchar('label_no', { length: 50 }).notNull().unique(), // 标签编号
  qrCode: text('qr_code'), // 二维码内容
  purchaseOrderNo: varchar('purchase_order_no', { length: 50 }), // 采购单号
  supplierName: varchar('supplier_name', { length: 200 }), // 供应商名称
  receiveDate: timestamp('receive_date'), // 进料日期
  materialCode: varchar('material_code', { length: 50 }).notNull(), // 物料代号
  materialName: varchar('material_name', { length: 200 }), // 品名
  specification: varchar('specification', { length: 200 }), // 进料规格
  unit: varchar('unit', { length: 20 }), // 单位
  batchNo: varchar('batch_no', { length: 50 }), // 批号
  quantity: numeric('quantity', { precision: 18, scale: 4 }).default('0'), // 数量
  packageQty: numeric('package_qty', { precision: 18, scale: 4 }).default('0'), // 包装量
  width: numeric('width', { precision: 18, scale: 2 }), // 宽幅
  lengthPerRoll: numeric('length_per_roll', { precision: 18, scale: 2 }), // 每卷米数
  remark: text('remark'), // 备注
  colorCode: varchar('color_code', { length: 50 }), // 颜色代号
  mixRemark: text('mix_remark'), // 混合料备注
  warehouseId: integer('warehouse_id').references(() => warehouses.id), // 仓库ID
  locationId: integer('location_id').references(() => locations.id), // 库位ID
  isMainMaterial: boolean('is_main_material').default(false), // 是否母材
  isUsed: boolean('is_used').default(false), // 是否已使用
  isCut: boolean('is_cut').default(false), // 是否已分切
  parentLabelId: integer('parent_label_id'), // 父标签ID（分切来源）
  status: varchar('status', { length: 20 }).default('active'), // active/frozen/disabled
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 分切记录表
export const cuttingRecords = pgTable('cutting_records', {
  id: serial('id').primaryKey(),
  recordNo: varchar('record_no', { length: 50 }).notNull().unique(), // 分切单号
  sourceLabelId: integer('source_label_id').notNull().references(() => materialLabels.id), // 源标签ID
  sourceLabelNo: varchar('source_label_no', { length: 50 }).notNull(), // 源标签编号
  cutWidthStr: varchar('cut_width_str', { length: 200 }), // 分切宽幅（如：10+20+30）
  originalWidth: numeric('original_width', { precision: 18, scale: 2 }), // 原宽幅
  cutTotalWidth: numeric('cut_total_width', { precision: 18, scale: 2 }), // 分切总宽幅
  remainWidth: numeric('remain_width', { precision: 18, scale: 2 }), // 剩余宽幅
  operatorId: integer('operator_id').references(() => employees.id), // 操作员ID
  operatorName: varchar('operator_name', { length: 50 }), // 操作员名称
  cutTime: timestamp('cut_time').defaultNow(), // 分切时间
  remark: text('remark'), // 备注
  status: varchar('status', { length: 20 }).default('active'), // active/cancelled
  createdAt: timestamp('created_at').defaultNow(),
});

// 分切明细表
export const cuttingDetails = pgTable('cutting_details', {
  id: serial('id').primaryKey(),
  recordId: integer('record_id').notNull().references(() => cuttingRecords.id), // 分切记录ID
  newLabelId: integer('new_label_id').notNull().references(() => materialLabels.id), // 新标签ID
  newLabelNo: varchar('new_label_no', { length: 50 }).notNull(), // 新标签编号
  cutWidth: numeric('cut_width', { precision: 18, scale: 2 }), // 分切宽幅
  sequence: integer('sequence').default(0), // 分切序号
  createdAt: timestamp('created_at').defaultNow(),
});

// 生产流程卡表
export const processCards = pgTable('process_cards', {
  id: serial('id').primaryKey(),
  cardNo: varchar('card_no', { length: 50 }).notNull().unique(), // 流程卡卡号
  qrCode: text('qr_code'), // 二维码内容
  workOrderId: integer('work_order_id').references(() => workOrders.id), // 工单ID
  workOrderNo: varchar('work_order_no', { length: 50 }), // 工单号
  productCode: varchar('product_code', { length: 50 }), // 成品料号
  productName: varchar('product_name', { length: 200 }), // 成品品名
  materialSpec: varchar('material_spec', { length: 200 }), // 材料规格
  workOrderDate: timestamp('work_order_date'), // 工单日期
  planQty: numeric('plan_qty', { precision: 18, scale: 4 }).default('0'), // 计划生产数量
  mainLabelId: integer('main_label_id').references(() => materialLabels.id), // 主材标签ID
  mainLabelNo: varchar('main_label_no', { length: 50 }), // 主材标签编号
  burdeningStatus: varchar('burdening_status', { length: 20 }).default('pending'), // 配料状态
  lockStatus: varchar('lock_status', { length: 20 }).default('unlocked'), // 锁住状态
  createUserId: integer('create_user_id').references(() => employees.id), // 创建人ID
  createUserName: varchar('create_user_name', { length: 50 }), // 创建人名称
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 流程卡物料关联表
export const processCardMaterials = pgTable('process_card_materials', {
  id: serial('id').primaryKey(),
  cardId: integer('card_id').notNull().references(() => processCards.id), // 流程卡ID
  cardNo: varchar('card_no', { length: 50 }), // 流程卡卡号
  labelId: integer('label_id').notNull().references(() => materialLabels.id), // 物料标签ID
  labelNo: varchar('label_no', { length: 50 }).notNull(), // 物料标签编号
  materialType: varchar('material_type', { length: 20 }).default('auxiliary'), // 物料类型：main/auxiliary
  materialCode: varchar('material_code', { length: 50 }), // 物料代号
  materialName: varchar('material_name', { length: 200 }), // 物料名称
  specification: varchar('specification', { length: 200 }), // 规格
  batchNo: varchar('batch_no', { length: 50 }), // 批号
  quantity: numeric('quantity', { precision: 18, scale: 4 }).default('0'), // 用量
  unit: varchar('unit', { length: 20 }), // 单位
  remark: text('remark'), // 备注
  createdAt: timestamp('created_at').defaultNow(),
});

// 物料追溯记录表
export const traceRecords = pgTable('trace_records', {
  id: serial('id').primaryKey(),
  traceNo: varchar('trace_no', { length: 50 }).notNull().unique(), // 追溯单号
  cardId: integer('card_id').references(() => processCards.id), // 流程卡ID
  cardNo: varchar('card_no', { length: 50 }), // 流程卡卡号
  workOrderNo: varchar('work_order_no', { length: 50 }), // 工单号
  productCode: varchar('product_code', { length: 50 }), // 成品料号
  mainLabelId: integer('main_label_id').references(() => materialLabels.id), // 主材标签ID
  traceType: varchar('trace_type', { length: 20 }).default('forward'), // 追溯类型：forward/backward
  operatorId: integer('operator_id').references(() => employees.id), // 操作员ID
  operatorName: varchar('operator_name', { length: 50 }), // 操作员名称
  traceTime: timestamp('trace_time').defaultNow(), // 追溯时间
  remark: text('remark'), // 备注
  createdAt: timestamp('created_at').defaultNow(),
});

// 扫码操作日志表
export const scanLogs = pgTable('scan_logs', {
  id: serial('id').primaryKey(),
  scanType: varchar('scan_type', { length: 50 }).notNull(), // 扫码类型: cutting/process/trace
  qrContent: text('qr_content'), // 二维码内容
  labelNo: varchar('label_no', { length: 50 }), // 标签编号
  operation: varchar('operation', { length: 50 }), // 操作类型
  result: varchar('result', { length: 20 }).default('success'), // 结果：success/failed
  message: text('message'), // 结果消息
  operatorId: integer('operator_id').references(() => employees.id), // 操作员ID
  operatorName: varchar('operator_name', { length: 50 }), // 操作员名称
  scanTime: timestamp('scan_time').defaultNow(), // 扫码时间
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
