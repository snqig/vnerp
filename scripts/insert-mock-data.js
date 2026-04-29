/**
 * 插入ERP系统全模块模拟数据脚本
 * 包含：订单管理、仓库管理、生产管理、采购管理、账务管理、品质管理、人事管理
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Snqig521223',
  database: process.env.DB_NAME || 'vnerpdacahng',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true
};

// 模拟数据
const mockData = {
  // 1. 订单管理 - 销售订单
  salesOrders: [
    { order_no: 'SO20240001', order_date: '2024-01-05', customer_id: 1, contact_name: '张经理', contact_phone: '13800138001', delivery_address: '深圳市南山区科技园', salesman_id: 2, total_amount: 158000.00, tax_amount: 18960.00, total_with_tax: 176960.00, discount_amount: 0.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '月结30天', delivery_date: '2024-01-20', contract_no: 'HT2024001', status: 4, remark: '首批试单，质量要求严格', create_time: '2024-01-05 09:30:00', update_time: '2024-01-25 14:20:00', create_by: 1, update_by: 1, deleted: 0 },
    { order_no: 'SO20240002', order_date: '2024-01-12', customer_id: 2, contact_name: '李主任', contact_phone: '13800138002', delivery_address: '广州市天河区珠江新城', salesman_id: 2, total_amount: 256000.00, tax_amount: 30720.00, total_with_tax: 286720.00, discount_amount: 5000.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '预付30%，发货前付清', delivery_date: '2024-01-28', contract_no: 'HT2024002', status: 4, remark: '长期合作客户', create_time: '2024-01-12 10:15:00', update_time: '2024-02-01 16:45:00', create_by: 1, update_by: 1, deleted: 0 },
    { order_no: 'SO20240003', order_date: '2024-01-18', customer_id: 3, contact_name: '王总', contact_phone: '13800138003', delivery_address: '东莞市长安镇工业区', salesman_id: 3, total_amount: 89000.00, tax_amount: 10680.00, total_with_tax: 99680.00, discount_amount: 0.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '货到付款', delivery_date: '2024-02-05', contract_no: 'HT2024003', status: 4, remark: '紧急订单，需加急生产', create_time: '2024-01-18 14:30:00', update_time: '2024-02-08 11:30:00', create_by: 1, update_by: 2, deleted: 0 },
    { order_no: 'SO20240004', order_date: '2024-02-01', customer_id: 4, contact_name: '陈经理', contact_phone: '13800138004', delivery_address: '佛山市顺德区北滘镇', salesman_id: 2, total_amount: 345000.00, tax_amount: 41400.00, total_with_tax: 386400.00, discount_amount: 10000.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '月结60天', delivery_date: '2024-02-20', contract_no: 'HT2024004', status: 4, remark: '大批量订单，分批发货', create_time: '2024-02-01 08:45:00', update_time: '2024-02-25 09:15:00', create_by: 1, update_by: 1, deleted: 0 },
    { order_no: 'SO20240005', order_date: '2024-02-14', customer_id: 5, contact_name: '刘主任', contact_phone: '13800138005', delivery_address: '中山市火炬开发区', salesman_id: 3, total_amount: 178000.00, tax_amount: 21360.00, total_with_tax: 199360.00, discount_amount: 0.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '预付50%，余款月结', delivery_date: '2024-03-01', contract_no: 'HT2024005', status: 4, remark: '新产品试产', create_time: '2024-02-14 11:20:00', update_time: '2024-03-05 15:30:00', create_by: 1, update_by: 1, deleted: 0 },
    { order_no: 'SO20240006', order_date: '2024-02-28', customer_id: 6, contact_name: '赵经理', contact_phone: '13800138006', delivery_address: '惠州市惠城区', salesman_id: 2, total_amount: 267000.00, tax_amount: 32040.00, total_with_tax: 299040.00, discount_amount: 8000.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '月结30天', delivery_date: '2024-03-15', contract_no: 'HT2024006', status: 3, remark: '常规补货订单', create_time: '2024-02-28 13:00:00', update_time: '2024-03-18 10:00:00', create_by: 1, update_by: 1, deleted: 0 },
    { order_no: 'SO20240007', order_date: '2024-03-08', customer_id: 7, contact_name: '孙总', contact_phone: '13800138007', delivery_address: '珠海市香洲区', salesman_id: 3, total_amount: 156000.00, tax_amount: 18720.00, total_with_tax: 174720.00, discount_amount: 0.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '预付全款', delivery_date: '2024-03-25', contract_no: 'HT2024007', status: 3, remark: '出口订单，需报关', create_time: '2024-03-08 09:00:00', update_time: '2024-03-28 14:00:00', create_by: 1, update_by: 2, deleted: 0 },
    { order_no: 'SO20240008', order_date: '2024-03-15', customer_id: 8, contact_name: '周经理', contact_phone: '13800138008', delivery_address: '江门市蓬江区', salesman_id: 2, total_amount: 198000.00, tax_amount: 23760.00, total_with_tax: 221760.00, discount_amount: 3000.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '月结45天', delivery_date: '2024-04-05', contract_no: 'HT2024008', status: 2, remark: '季度采购计划', create_time: '2024-03-15 10:30:00', update_time: '2024-03-20 16:00:00', create_by: 1, update_by: 1, deleted: 0 },
    { order_no: 'SO20240009', order_date: '2024-03-22', customer_id: 9, contact_name: '吴主任', contact_phone: '13800138009', delivery_address: '肇庆市端州区', salesman_id: 3, total_amount: 234000.00, tax_amount: 28080.00, total_with_tax: 262080.00, discount_amount: 0.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '预付30%，月结', delivery_date: '2024-04-10', contract_no: 'HT2024009', status: 2, remark: '新客户首单', create_time: '2024-03-22 14:15:00', update_time: '2024-03-25 11:20:00', create_by: 1, update_by: 1, deleted: 0 },
    { order_no: 'SO20240010', order_date: '2024-04-01', customer_id: 10, contact_name: '郑经理', contact_phone: '13800138010', delivery_address: '汕头市龙湖区', salesman_id: 2, total_amount: 312000.00, tax_amount: 37440.00, total_with_tax: 349440.00, discount_amount: 12000.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '月结60天', delivery_date: '2024-04-20', contract_no: 'HT2024010', status: 1, remark: '年度框架协议订单', create_time: '2024-04-01 08:00:00', update_time: '2024-04-01 08:00:00', create_by: 1, update_by: 1, deleted: 0 }
  ],

  // 销售订单明细
  salesOrderDetails: [
    { order_id: 1, material_id: 1, quantity: 50000.00, unit: 'PCS', unit_price: 1.50, tax_rate: 13.00, amount: 75000.00, tax_amount: 9750.00, total_amount: 84750.00, delivered_qty: 50000.00, delivery_date: '2024-01-20', remark: '透明包装膜', create_time: '2024-01-05 09:30:00' },
    { order_id: 1, material_id: 2, quantity: 30000.00, unit: 'PCS', unit_price: 2.00, tax_rate: 13.00, amount: 60000.00, tax_amount: 7800.00, total_amount: 67800.00, delivered_qty: 30000.00, delivery_date: '2024-01-20', remark: '防静电膜', create_time: '2024-01-05 09:30:00' },
    { order_id: 2, material_id: 3, quantity: 80000.00, unit: 'PCS', unit_price: 1.80, tax_rate: 13.00, amount: 144000.00, tax_amount: 18720.00, total_amount: 162720.00, delivered_qty: 80000.00, delivery_date: '2024-01-28', remark: '标签贴纸', create_time: '2024-01-12 10:15:00' },
    { order_id: 2, material_id: 4, quantity: 40000.00, unit: 'PCS', unit_price: 2.30, tax_rate: 13.00, amount: 92000.00, tax_amount: 11960.00, total_amount: 103960.00, delivered_qty: 40000.00, delivery_date: '2024-01-28', remark: '彩印膜', create_time: '2024-01-12 10:15:00' },
    { order_id: 3, material_id: 5, quantity: 25000.00, unit: 'PCS', unit_price: 2.50, tax_rate: 13.00, amount: 62500.00, tax_amount: 8125.00, total_amount: 70625.00, delivered_qty: 25000.00, delivery_date: '2024-02-05', remark: '热收缩膜-紧急', create_time: '2024-01-18 14:30:00' },
    { order_id: 3, material_id: 6, quantity: 15000.00, unit: 'PCS', unit_price: 1.20, tax_rate: 13.00, amount: 18000.00, tax_amount: 2340.00, total_amount: 20340.00, delivered_qty: 15000.00, delivery_date: '2024-02-05', remark: '保护膜', create_time: '2024-01-18 14:30:00' },
    { order_id: 4, material_id: 7, quantity: 100000.00, unit: 'PCS', unit_price: 2.00, tax_rate: 13.00, amount: 200000.00, tax_amount: 26000.00, total_amount: 226000.00, delivered_qty: 60000.00, delivery_date: '2024-02-20', remark: '大批量-分批', create_time: '2024-02-01 08:45:00' },
    { order_id: 4, material_id: 8, quantity: 50000.00, unit: 'PCS', unit_price: 1.90, tax_rate: 13.00, amount: 95000.00, tax_amount: 12350.00, total_amount: 107350.00, delivered_qty: 30000.00, delivery_date: '2024-02-25', remark: '复合膜-分批', create_time: '2024-02-01 08:45:00' },
    { order_id: 5, material_id: 9, quantity: 45000.00, unit: 'PCS', unit_price: 2.80, tax_rate: 13.00, amount: 126000.00, tax_amount: 16380.00, total_amount: 142380.00, delivered_qty: 45000.00, delivery_date: '2024-03-01', remark: '新产品试产', create_time: '2024-02-14 11:20:00' },
    { order_id: 5, material_id: 10, quantity: 20000.00, unit: 'PCS', unit_price: 1.60, tax_rate: 13.00, amount: 32000.00, tax_amount: 4160.00, total_amount: 36160.00, delivered_qty: 20000.00, delivery_date: '2024-03-01', remark: '配套产品', create_time: '2024-02-14 11:20:00' }
  ],

  // 2. 仓库管理 - 入库记录
  inventoryLogsInbound: [
    { material_id: 1, warehouse_id: 1, batch_no: 'BATCH202401001', operation_type: 1, operation_qty: 50000.00, before_qty: 0.00, after_qty: 50000.00, business_type: '采购入库', business_no: 'PI20240001', remark: 'PET透明膜-入库', operator_id: 1, create_time: '2024-01-03 10:00:00' },
    { material_id: 2, warehouse_id: 1, batch_no: 'BATCH202401002', operation_type: 1, operation_qty: 30000.00, before_qty: 0.00, after_qty: 30000.00, business_type: '采购入库', business_no: 'PI20240002', remark: '防静电膜-入库', operator_id: 1, create_time: '2024-01-03 14:30:00' },
    { material_id: 3, warehouse_id: 2, batch_no: 'BATCH202401003', operation_type: 1, operation_qty: 80000.00, before_qty: 0.00, after_qty: 80000.00, business_type: '采购入库', business_no: 'PI20240003', remark: '标签纸-入库', operator_id: 2, create_time: '2024-01-10 09:00:00' },
    { material_id: 4, warehouse_id: 1, batch_no: 'BATCH202401004', operation_type: 1, operation_qty: 40000.00, before_qty: 0.00, after_qty: 40000.00, business_type: '采购入库', business_no: 'PI20240004', remark: '彩印膜-入库', operator_id: 1, create_time: '2024-01-10 16:00:00' },
    { material_id: 5, warehouse_id: 1, batch_no: 'BATCH202401005', operation_type: 1, operation_qty: 25000.00, before_qty: 0.00, after_qty: 25000.00, business_type: '采购入库', business_no: 'PI20240005', remark: '热收缩膜-入库', operator_id: 1, create_time: '2024-01-15 11:00:00' },
    { material_id: 6, warehouse_id: 2, batch_no: 'BATCH202401006', operation_type: 1, operation_qty: 15000.00, before_qty: 0.00, after_qty: 15000.00, business_type: '采购入库', business_no: 'PI20240006', remark: '保护膜-入库', operator_id: 2, create_time: '2024-01-15 15:30:00' },
    { material_id: 7, warehouse_id: 1, batch_no: 'BATCH202402001', operation_type: 1, operation_qty: 100000.00, before_qty: 0.00, after_qty: 100000.00, business_type: '采购入库', business_no: 'PI20240007', remark: '复合膜-大批量', operator_id: 1, create_time: '2024-01-28 08:30:00' },
    { material_id: 8, warehouse_id: 1, batch_no: 'BATCH202402002', operation_type: 1, operation_qty: 50000.00, before_qty: 0.00, after_qty: 50000.00, business_type: '采购入库', business_no: 'PI20240008', remark: '复合膜配套', operator_id: 1, create_time: '2024-01-30 14:00:00' },
    { material_id: 9, warehouse_id: 2, batch_no: 'BATCH202402003', operation_type: 1, operation_qty: 45000.00, before_qty: 0.00, after_qty: 45000.00, business_type: '采购入库', business_no: 'PI20240009', remark: '新产品材料', operator_id: 2, create_time: '2024-02-10 10:00:00' },
    { material_id: 10, warehouse_id: 2, batch_no: 'BATCH202402004', operation_type: 1, operation_qty: 20000.00, before_qty: 0.00, after_qty: 20000.00, business_type: '采购入库', business_no: 'PI20240010', remark: '配套材料', operator_id: 2, create_time: '2024-02-12 16:30:00' }
  ],

  // 仓库管理 - 出库记录
  inventoryLogsOutbound: [
    { material_id: 1, warehouse_id: 1, batch_no: 'BATCH202401001', operation_type: 2, operation_qty: 50000.00, before_qty: 50000.00, after_qty: 0.00, business_type: '销售出库', business_no: 'SO20240001', remark: 'SO20240001-出库', operator_id: 3, create_time: '2024-01-20 09:00:00' },
    { material_id: 2, warehouse_id: 1, batch_no: 'BATCH202401002', operation_type: 2, operation_qty: 30000.00, before_qty: 30000.00, after_qty: 0.00, business_type: '销售出库', business_no: 'SO20240001', remark: 'SO20240001-出库', operator_id: 3, create_time: '2024-01-20 14:00:00' },
    { material_id: 3, warehouse_id: 2, batch_no: 'BATCH202401003', operation_type: 2, operation_qty: 80000.00, before_qty: 80000.00, after_qty: 0.00, business_type: '销售出库', business_no: 'SO20240002', remark: 'SO20240002-出库', operator_id: 3, create_time: '2024-01-28 10:30:00' },
    { material_id: 4, warehouse_id: 1, batch_no: 'BATCH202401004', operation_type: 2, operation_qty: 40000.00, before_qty: 40000.00, after_qty: 0.00, business_type: '销售出库', business_no: 'SO20240002', remark: 'SO20240002-出库', operator_id: 3, create_time: '2024-01-28 15:00:00' },
    { material_id: 5, warehouse_id: 1, batch_no: 'BATCH202401005', operation_type: 2, operation_qty: 25000.00, before_qty: 25000.00, after_qty: 0.00, business_type: '销售出库', business_no: 'SO20240003', remark: 'SO20240003-出库', operator_id: 3, create_time: '2024-02-08 08:00:00' },
    { material_id: 6, warehouse_id: 2, batch_no: 'BATCH202401006', operation_type: 2, operation_qty: 15000.00, before_qty: 15000.00, after_qty: 0.00, business_type: '销售出库', business_no: 'SO20240003', remark: 'SO20240003-出库', operator_id: 3, create_time: '2024-02-08 13:30:00' },
    { material_id: 7, warehouse_id: 1, batch_no: 'BATCH202402001', operation_type: 2, operation_qty: 60000.00, before_qty: 100000.00, after_qty: 40000.00, business_type: '销售出库', business_no: 'SO20240004', remark: 'SO20240004-第一批', operator_id: 3, create_time: '2024-02-20 09:30:00' },
    { material_id: 8, warehouse_id: 1, batch_no: 'BATCH202402002', operation_type: 2, operation_qty: 30000.00, before_qty: 50000.00, after_qty: 20000.00, business_type: '销售出库', business_no: 'SO20240004', remark: 'SO20240004-第一批', operator_id: 3, create_time: '2024-02-25 11:00:00' },
    { material_id: 9, warehouse_id: 2, batch_no: 'BATCH202402003', operation_type: 2, operation_qty: 45000.00, before_qty: 45000.00, after_qty: 0.00, business_type: '销售出库', business_no: 'SO20240005', remark: 'SO20240005-出库', operator_id: 3, create_time: '2024-03-05 10:00:00' },
    { material_id: 10, warehouse_id: 2, batch_no: 'BATCH202402004', operation_type: 2, operation_qty: 20000.00, before_qty: 20000.00, after_qty: 0.00, business_type: '销售出库', business_no: 'SO20240005', remark: 'SO20240005-出库', operator_id: 3, create_time: '2024-03-05 15:00:00' }
  ],

  // 3. 生产管理 - 生产工单
  workOrders: [
    { work_order_no: 'WO20240001', work_order_date: '2024-01-06', sales_order_id: 1, material_id: 1, plan_qty: 50000.00, completed_qty: 50000.00, unit: 'PCS', plan_start_date: '2024-01-08', plan_end_date: '2024-01-18', actual_start_date: '2024-01-08', actual_end_date: '2024-01-18', workshop_id: 1, workcenter_id: 1, priority: 2, status: 3, remark: '首批试单生产', create_time: '2024-01-06 10:00:00', update_time: '2024-01-18 16:00:00', create_by: 1 },
    { work_order_no: 'WO20240002', work_order_date: '2024-01-06', sales_order_id: 1, material_id: 2, plan_qty: 30000.00, completed_qty: 30000.00, unit: 'PCS', plan_start_date: '2024-01-08', plan_end_date: '2024-01-18', actual_start_date: '2024-01-08', actual_end_date: '2024-01-18', workshop_id: 1, workcenter_id: 2, priority: 2, status: 3, remark: '首批试单生产', create_time: '2024-01-06 10:30:00', update_time: '2024-01-18 16:30:00', create_by: 1 },
    { work_order_no: 'WO20240003', work_order_date: '2024-01-13', sales_order_id: 2, material_id: 3, plan_qty: 80000.00, completed_qty: 80000.00, unit: 'PCS', plan_start_date: '2024-01-15', plan_end_date: '2024-01-26', actual_start_date: '2024-01-15', actual_end_date: '2024-01-26', workshop_id: 2, workcenter_id: 3, priority: 2, status: 3, remark: '长期客户订单', create_time: '2024-01-13 11:00:00', update_time: '2024-01-26 17:00:00', create_by: 1 },
    { work_order_no: 'WO20240004', work_order_date: '2024-01-13', sales_order_id: 2, material_id: 4, plan_qty: 40000.00, completed_qty: 40000.00, unit: 'PCS', plan_start_date: '2024-01-15', plan_end_date: '2024-01-26', actual_start_date: '2024-01-15', actual_end_date: '2024-01-26', workshop_id: 2, workcenter_id: 4, priority: 2, status: 3, remark: '长期客户订单', create_time: '2024-01-13 11:30:00', update_time: '2024-01-26 17:30:00', create_by: 1 },
    { work_order_no: 'WO20240005', work_order_date: '2024-01-19', sales_order_id: 3, material_id: 5, plan_qty: 25000.00, completed_qty: 25000.00, unit: 'PCS', plan_start_date: '2024-01-20', plan_end_date: '2024-02-05', actual_start_date: '2024-01-20', actual_end_date: '2024-02-05', workshop_id: 1, workcenter_id: 1, priority: 4, status: 3, remark: '紧急订单-加急', create_time: '2024-01-19 15:00:00', update_time: '2024-02-05 18:00:00', create_by: 2 },
    { work_order_no: 'WO20240006', work_order_date: '2024-01-19', sales_order_id: 3, material_id: 6, plan_qty: 15000.00, completed_qty: 15000.00, unit: 'PCS', plan_start_date: '2024-01-20', plan_end_date: '2024-02-05', actual_start_date: '2024-01-20', actual_end_date: '2024-02-05', workshop_id: 1, workcenter_id: 2, priority: 4, status: 3, remark: '紧急订单-加急', create_time: '2024-01-19 15:30:00', update_time: '2024-02-05 18:30:00', create_by: 2 },
    { work_order_no: 'WO20240007', work_order_date: '2024-02-02', sales_order_id: 4, material_id: 7, plan_qty: 100000.00, completed_qty: 60000.00, unit: 'PCS', plan_start_date: '2024-02-05', plan_end_date: '2024-02-25', actual_start_date: '2024-02-05', actual_end_date: null, workshop_id: 2, workcenter_id: 3, priority: 3, status: 2, remark: '大批量-分批生产', create_time: '2024-02-02 09:00:00', update_time: '2024-02-25 12:00:00', create_by: 1 },
    { work_order_no: 'WO20240008', work_order_date: '2024-02-02', sales_order_id: 4, material_id: 8, plan_qty: 50000.00, completed_qty: 30000.00, unit: 'PCS', plan_start_date: '2024-02-05', plan_end_date: '2024-02-25', actual_start_date: '2024-02-05', actual_end_date: null, workshop_id: 2, workcenter_id: 4, priority: 3, status: 2, remark: '大批量-分批生产', create_time: '2024-02-02 09:30:00', update_time: '2024-02-25 12:30:00', create_by: 1 },
    { work_order_no: 'WO20240009', work_order_date: '2024-02-15', sales_order_id: 5, material_id: 9, plan_qty: 45000.00, completed_qty: 45000.00, unit: 'PCS', plan_start_date: '2024-02-16', plan_end_date: '2024-03-01', actual_start_date: '2024-02-16', actual_end_date: '2024-03-01', workshop_id: 1, workcenter_id: 1, priority: 2, status: 3, remark: '新产品试产', create_time: '2024-02-15 12:00:00', update_time: '2024-03-01 19:00:00', create_by: 1 },
    { work_order_no: 'WO20240010', work_order_date: '2024-02-15', sales_order_id: 5, material_id: 10, plan_qty: 20000.00, completed_qty: 20000.00, unit: 'PCS', plan_start_date: '2024-02-16', plan_end_date: '2024-03-01', actual_start_date: '2024-02-16', actual_end_date: '2024-03-01', workshop_id: 1, workcenter_id: 2, priority: 2, status: 3, remark: '新产品试产', create_time: '2024-02-15 12:30:00', update_time: '2024-03-01 19:30:00', create_by: 1 }
  ],

  // 4. 采购管理 - 采购订单
  purchaseOrders: [
    { order_no: 'PO20240001', order_date: '2024-01-02', supplier_id: 1, contact_name: '刘经理', contact_phone: '13900139001', delivery_address: '深圳市宝安区', total_amount: 75000.00, tax_amount: 9750.00, total_with_tax: 84750.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '月结30天', delivery_date: '2024-01-05', settlement_method: '银行转账', status: 4, remark: 'PET透明膜采购', create_time: '2024-01-02 09:00:00', update_time: '2024-01-05 16:00:00', create_by: 1, deleted: 0 },
    { order_no: 'PO20240002', order_date: '2024-01-02', supplier_id: 2, contact_name: '陈主任', contact_phone: '13900139002', delivery_address: '东莞市虎门镇', total_amount: 60000.00, tax_amount: 7800.00, total_with_tax: 67800.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '预付30%，到货付70%', delivery_date: '2024-01-05', settlement_method: '银行转账', status: 4, remark: '防静电膜采购', create_time: '2024-01-02 10:00:00', update_time: '2024-01-05 17:00:00', create_by: 1, deleted: 0 },
    { order_no: 'PO20240003', order_date: '2024-01-08', supplier_id: 3, contact_name: '王经理', contact_phone: '13900139003', delivery_address: '广州市番禺区', total_amount: 144000.00, tax_amount: 18720.00, total_with_tax: 162720.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '月结60天', delivery_date: '2024-01-12', settlement_method: '银行转账', status: 4, remark: '标签纸大批量采购', create_time: '2024-01-08 14:00:00', update_time: '2024-01-12 18:00:00', create_by: 1, deleted: 0 },
    { order_no: 'PO20240004', order_date: '2024-01-08', supplier_id: 4, contact_name: '李总', contact_phone: '13900139004', delivery_address: '佛山市南海区', total_amount: 92000.00, tax_amount: 11960.00, total_with_tax: 103960.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '货到付款', delivery_date: '2024-01-12', settlement_method: '现金', status: 4, remark: '彩印膜采购', create_time: '2024-01-08 15:00:00', update_time: '2024-01-12 19:00:00', create_by: 1, deleted: 0 },
    { order_no: 'PO20240005', order_date: '2024-01-14', supplier_id: 5, contact_name: '张主任', contact_phone: '13900139005', delivery_address: '中山市小榄镇', total_amount: 62500.00, tax_amount: 8125.00, total_with_tax: 70625.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '预付50%，余款月结', delivery_date: '2024-01-18', settlement_method: '银行转账', status: 4, remark: '热收缩膜紧急采购', create_time: '2024-01-14 11:00:00', update_time: '2024-01-18 20:00:00', create_by: 2, deleted: 0 },
    { order_no: 'PO20240006', order_date: '2024-01-14', supplier_id: 6, contact_name: '赵经理', contact_phone: '13900139006', delivery_address: '惠州市惠阳区', total_amount: 18000.00, tax_amount: 2340.00, total_with_tax: 20340.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '月结30天', delivery_date: '2024-01-18', settlement_method: '银行转账', status: 4, remark: '保护膜采购', create_time: '2024-01-14 13:00:00', update_time: '2024-01-18 21:00:00', create_by: 2, deleted: 0 },
    { order_no: 'PO20240007', order_date: '2024-01-25', supplier_id: 7, contact_name: '孙总', contact_phone: '13900139007', delivery_address: '珠海市斗门区', total_amount: 200000.00, tax_amount: 26000.00, total_with_tax: 226000.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '预付30%，分批发货付款', delivery_date: '2024-01-30', settlement_method: '银行转账', status: 4, remark: '复合膜大批量', create_time: '2024-01-25 08:00:00', update_time: '2024-01-30 22:00:00', create_by: 1, deleted: 0 },
    { order_no: 'PO20240008', order_date: '2024-01-25', supplier_id: 8, contact_name: '周经理', contact_phone: '13900139008', delivery_address: '江门市新会区', total_amount: 95000.00, tax_amount: 12350.00, total_with_tax: 107350.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '月结45天', delivery_date: '2024-01-30', settlement_method: '银行转账', status: 4, remark: '复合膜配套采购', create_time: '2024-01-25 09:00:00', update_time: '2024-01-30 23:00:00', create_by: 1, deleted: 0 },
    { order_no: 'PO20240009', order_date: '2024-02-08', supplier_id: 9, contact_name: '吴主任', contact_phone: '13900139009', delivery_address: '肇庆市高新区', total_amount: 126000.00, tax_amount: 16380.00, total_with_tax: 142380.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '预付30%，月结', delivery_date: '2024-02-15', settlement_method: '银行转账', status: 4, remark: '新产品材料采购', create_time: '2024-02-08 10:00:00', update_time: '2024-02-15 10:00:00', create_by: 1, deleted: 0 },
    { order_no: 'PO20240010', order_date: '2024-02-08', supplier_id: 10, contact_name: '郑经理', contact_phone: '13900139010', delivery_address: '汕头市澄海区', total_amount: 32000.00, tax_amount: 4160.00, total_with_tax: 36160.00, currency: 'CNY', exchange_rate: 1.0000, payment_terms: '货到付款', delivery_date: '2024-02-15', settlement_method: '现金', status: 4, remark: '配套材料采购', create_time: '2024-02-08 11:00:00', update_time: '2024-02-15 11:00:00', create_by: 1, deleted: 0 }
  ],

  // 采购订单明细
  purchaseOrderDetails: [
    { order_id: 1, material_id: 1, quantity: 50000.00, unit: 'PCS', unit_price: 1.50, tax_rate: 13.00, amount: 75000.00, tax_amount: 9750.00, total_amount: 84750.00, received_qty: 50000.00, delivery_date: '2024-01-05', remark: 'PET透明膜', create_time: '2024-01-02 09:00:00' },
    { order_id: 2, material_id: 2, quantity: 30000.00, unit: 'PCS', unit_price: 2.00, tax_rate: 13.00, amount: 60000.00, tax_amount: 7800.00, total_amount: 67800.00, received_qty: 30000.00, delivery_date: '2024-01-05', remark: '防静电膜', create_time: '2024-01-02 10:00:00' },
    { order_id: 3, material_id: 3, quantity: 80000.00, unit: 'PCS', unit_price: 1.80, tax_rate: 13.00, amount: 144000.00, tax_amount: 18720.00, total_amount: 162720.00, received_qty: 80000.00, delivery_date: '2024-01-12', remark: '标签纸', create_time: '2024-01-08 14:00:00' },
    { order_id: 4, material_id: 4, quantity: 40000.00, unit: 'PCS', unit_price: 2.30, tax_rate: 13.00, amount: 92000.00, tax_amount: 11960.00, total_amount: 103960.00, received_qty: 40000.00, delivery_date: '2024-01-12', remark: '彩印膜', create_time: '2024-01-08 15:00:00' },
    { order_id: 5, material_id: 5, quantity: 25000.00, unit: 'PCS', unit_price: 2.50, tax_rate: 13.00, amount: 62500.00, tax_amount: 8125.00, total_amount: 70625.00, received_qty: 25000.00, delivery_date: '2024-01-18', remark: '热收缩膜', create_time: '2024-01-14 11:00:00' },
    { order_id: 6, material_id: 6, quantity: 15000.00, unit: 'PCS', unit_price: 1.20, tax_rate: 13.00, amount: 18000.00, tax_amount: 2340.00, total_amount: 20340.00, received_qty: 15000.00, delivery_date: '2024-01-18', remark: '保护膜', create_time: '2024-01-14 13:00:00' },
    { order_id: 7, material_id: 7, quantity: 100000.00, unit: 'PCS', unit_price: 2.00, tax_rate: 13.00, amount: 200000.00, tax_amount: 26000.00, total_amount: 226000.00, received_qty: 100000.00, delivery_date: '2024-01-30', remark: '复合膜', create_time: '2024-01-25 08:00:00' },
    { order_id: 8, material_id: 8, quantity: 50000.00, unit: 'PCS', unit_price: 1.90, tax_rate: 13.00, amount: 95000.00, tax_amount: 12350.00, total_amount: 107350.00, received_qty: 50000.00, delivery_date: '2024-01-30', remark: '复合膜配套', create_time: '2024-01-25 09:00:00' },
    { order_id: 9, material_id: 9, quantity: 45000.00, unit: 'PCS', unit_price: 2.80, tax_rate: 13.00, amount: 126000.00, tax_amount: 16380.00, total_amount: 142380.00, received_qty: 45000.00, delivery_date: '2024-02-15', remark: '新产品材料', create_time: '2024-02-08 10:00:00' },
    { order_id: 10, material_id: 10, quantity: 20000.00, unit: 'PCS', unit_price: 1.60, tax_rate: 13.00, amount: 32000.00, tax_amount: 4160.00, total_amount: 36160.00, received_qty: 20000.00, delivery_date: '2024-02-15', remark: '配套材料', create_time: '2024-02-08 11:00:00' }
  ],

  // 5. 账务管理 - 应收款
  receivables: [
    { receivable_no: 'AR20240001', source_type: 1, source_id: 1, source_no: 'SO20240001', customer_id: 1, amount: 176960.00, received_amount: 176960.00, balance: 0.00, due_date: '2024-02-05', status: 3, remark: '首批试单-已结清', create_time: '2024-01-05 10:00:00', update_time: '2024-01-25 15:00:00' },
    { receivable_no: 'AR20240002', source_type: 1, source_id: 2, source_no: 'SO20240002', customer_id: 2, amount: 286720.00, received_amount: 286720.00, balance: 0.00, due_date: '2024-02-12', status: 3, remark: '长期客户-已结清', create_time: '2024-01-12 11:00:00', update_time: '2024-02-01 16:00:00' },
    { receivable_no: 'AR20240003', source_type: 1, source_id: 3, source_no: 'SO20240003', customer_id: 3, amount: 99680.00, received_amount: 99680.00, balance: 0.00, due_date: '2024-03-05', status: 3, remark: '紧急订单-已结清', create_time: '2024-01-18 15:00:00', update_time: '2024-02-08 12:00:00' },
    { receivable_no: 'AR20240004', source_type: 1, source_id: 4, source_no: 'SO20240004', customer_id: 4, amount: 386400.00, received_amount: 200000.00, balance: 186400.00, due_date: '2024-03-20', status: 2, remark: '大批量-部分收款', create_time: '2024-02-01 09:00:00', update_time: '2024-02-25 10:00:00' },
    { receivable_no: 'AR20240005', source_type: 1, source_id: 5, source_no: 'SO20240005', customer_id: 5, amount: 199360.00, received_amount: 199360.00, balance: 0.00, due_date: '2024-04-01', status: 3, remark: '新产品-已结清', create_time: '2024-02-14 12:00:00', update_time: '2024-03-05 16:00:00' },
    { receivable_no: 'AR20240006', source_type: 1, source_id: 6, source_no: 'SO20240006', customer_id: 6, amount: 299040.00, received_amount: 150000.00, balance: 149040.00, due_date: '2024-04-15', status: 2, remark: '常规补货-部分收款', create_time: '2024-02-28 14:00:00', update_time: '2024-03-18 11:00:00' },
    { receivable_no: 'AR20240007', source_type: 1, source_id: 7, source_no: 'SO20240007', customer_id: 7, amount: 174720.00, received_amount: 174720.00, balance: 0.00, due_date: '2024-04-25', status: 3, remark: '出口订单-已结清', create_time: '2024-03-08 10:00:00', update_time: '2024-03-28 15:00:00' },
    { receivable_no: 'AR20240008', source_type: 1, source_id: 8, source_no: 'SO20240008', customer_id: 8, amount: 221760.00, received_amount: 0.00, balance: 221760.00, due_date: '2024-05-05', status: 1, remark: '季度采购-未收款', create_time: '2024-03-15 11:00:00', update_time: '2024-03-15 11:00:00' },
    { receivable_no: 'AR20240009', source_type: 1, source_id: 9, source_no: 'SO20240009', customer_id: 9, amount: 262080.00, received_amount: 78624.00, balance: 183456.00, due_date: '2024-05-10', status: 2, remark: '新客户-部分收款', create_time: '2024-03-22 15:00:00', update_time: '2024-03-25 12:00:00' },
    { receivable_no: 'AR20240010', source_type: 1, source_id: 10, source_no: 'SO20240010', customer_id: 10, amount: 349440.00, received_amount: 0.00, balance: 349440.00, due_date: '2024-05-20', status: 1, remark: '年度框架-未收款', create_time: '2024-04-01 09:00:00', update_time: '2024-04-01 09:00:00' }
  ],

  // 应付款
  payables: [
    { payable_no: 'AP20240001', source_type: 1, source_id: 1, source_no: 'PO20240001', supplier_id: 1, amount: 84750.00, paid_amount: 84750.00, balance: 0.00, due_date: '2024-02-02', status: 3, remark: 'PET膜-已结清', create_time: '2024-01-02 10:00:00', update_time: '2024-01-05 17:00:00' },
    { payable_no: 'AP20240002', source_type: 1, source_id: 2, source_no: 'PO20240002', supplier_id: 2, amount: 67800.00, paid_amount: 67800.00, balance: 0.00, due_date: '2024-02-02', status: 3, remark: '防静电膜-已结清', create_time: '2024-01-02 11:00:00', update_time: '2024-01-05 18:00:00' },
    { payable_no: 'AP20240003', source_type: 1, source_id: 3, source_no: 'PO20240003', supplier_id: 3, amount: 162720.00, paid_amount: 162720.00, balance: 0.00, due_date: '2024-03-08', status: 3, remark: '标签纸-已结清', create_time: '2024-01-08 15:00:00', update_time: '2024-01-12 19:00:00' },
    { payable_no: 'AP20240004', source_type: 1, source_id: 4, source_no: 'PO20240004', supplier_id: 4, amount: 103960.00, paid_amount: 103960.00, balance: 0.00, due_date: '2024-01-12', status: 3, remark: '彩印膜-货到付款', create_time: '2024-01-08 16:00:00', update_time: '2024-01-12 20:00:00' },
    { payable_no: 'AP20240005', source_type: 1, source_id: 5, source_no: 'PO20240005', supplier_id: 5, amount: 70625.00, paid_amount: 70625.00, balance: 0.00, due_date: '2024-02-14', status: 3, remark: '热收缩膜-已结清', create_time: '2024-01-14 12:00:00', update_time: '2024-01-18 22:00:00' },
    { payable_no: 'AP20240006', source_type: 1, source_id: 6, source_no: 'PO20240006', supplier_id: 6, amount: 20340.00, paid_amount: 20340.00, balance: 0.00, due_date: '2024-02-14', status: 3, remark: '保护膜-已结清', create_time: '2024-01-14 14:00:00', update_time: '2024-01-18 23:00:00' },
    { payable_no: 'AP20240007', source_type: 1, source_id: 7, source_no: 'PO20240007', supplier_id: 7, amount: 226000.00, paid_amount: 67800.00, balance: 158200.00, due_date: '2024-02-25', status: 2, remark: '复合膜-部分付款', create_time: '2024-01-25 10:00:00', update_time: '2024-01-30 23:30:00' },
    { payable_no: 'AP20240008', source_type: 1, source_id: 8, source_no: 'PO20240008', supplier_id: 8, amount: 107350.00, paid_amount: 0.00, balance: 107350.00, due_date: '2024-04-10', status: 1, remark: '复合膜配套-未付款', create_time: '2024-01-25 11:00:00', update_time: '2024-01-25 11:00:00' },
    { payable_no: 'AP20240009', source_type: 1, source_id: 9, source_no: 'PO20240009', supplier_id: 9, amount: 142380.00, paid_amount: 42714.00, balance: 99666.00, due_date: '2024-03-10', status: 2, remark: '新材料-部分付款', create_time: '2024-02-08 11:00:00', update_time: '2024-02-15 12:00:00' },
    { payable_no: 'AP20240010', source_type: 1, source_id: 10, source_no: 'PO20240010', supplier_id: 10, amount: 36160.00, paid_amount: 36160.00, balance: 0.00, due_date: '2024-02-15', status: 3, remark: '配套材料-货到付款', create_time: '2024-02-08 12:00:00', update_time: '2024-02-15 13:00:00' }
  ],

  // 6. 品质管理 - 检验单
  inspections: [
    { inspection_no: 'QC20240001', inspection_type: 1, source_type: '采购入库', source_id: 1, source_no: 'PI20240001', material_id: 1, batch_no: 'BATCH202401001', inspection_qty: 50000.00, qualified_qty: 49800.00, unqualified_qty: 200.00, inspection_result: 1, inspector_id: 3, inspection_date: '2024-01-03', remark: 'PET膜来料检验-合格', create_time: '2024-01-03 16:00:00' },
    { inspection_no: 'QC20240002', inspection_type: 1, source_type: '采购入库', source_id: 2, source_no: 'PI20240002', material_id: 2, batch_no: 'BATCH202401002', inspection_qty: 30000.00, qualified_qty: 29950.00, unqualified_qty: 50.00, inspection_result: 1, inspector_id: 3, inspection_date: '2024-01-03', remark: '防静电膜来料检验-合格', create_time: '2024-01-03 17:00:00' },
    { inspection_no: 'QC20240003', inspection_type: 1, source_type: '采购入库', source_id: 3, source_no: 'PI20240003', material_id: 3, batch_no: 'BATCH202401003', inspection_qty: 80000.00, qualified_qty: 79500.00, unqualified_qty: 500.00, inspection_result: 1, inspector_id: 4, inspection_date: '2024-01-10', remark: '标签纸来料检验-合格', create_time: '2024-01-10 15:00:00' },
    { inspection_no: 'QC20240004', inspection_type: 1, source_type: '采购入库', source_id: 4, source_no: 'PI20240004', material_id: 4, batch_no: 'BATCH202401004', inspection_qty: 40000.00, qualified_qty: 39800.00, unqualified_qty: 200.00, inspection_result: 1, inspector_id: 3, inspection_date: '2024-01-10', remark: '彩印膜来料检验-合格', create_time: '2024-01-10 18:00:00' },
    { inspection_no: 'QC20240005', inspection_type: 1, source_type: '采购入库', source_id: 5, source_no: 'PI20240005', material_id: 5, batch_no: 'BATCH202401005', inspection_qty: 25000.00, qualified_qty: 24750.00, unqualified_qty: 250.00, inspection_result: 1, inspector_id: 3, inspection_date: '2024-01-15', remark: '热收缩膜来料检验-轻微不合格', create_time: '2024-01-15 14:00:00' },
    { inspection_no: 'QC20240006', inspection_type: 1, source_type: '采购入库', source_id: 6, source_no: 'PI20240006', material_id: 6, batch_no: 'BATCH202401006', inspection_qty: 15000.00, qualified_qty: 14980.00, unqualified_qty: 20.00, inspection_result: 1, inspector_id: 4, inspection_date: '2024-01-15', remark: '保护膜来料检验-合格', create_time: '2024-01-15 17:00:00' },
    { inspection_no: 'QC20240007', inspection_type: 2, source_type: '生产过程', source_id: 1, source_no: 'WO20240001', material_id: 1, batch_no: 'BATCH202401001', inspection_qty: 50000.00, qualified_qty: 49700.00, unqualified_qty: 300.00, inspection_result: 1, inspector_id: 3, inspection_date: '2024-01-18', remark: '首批试单过程检验-合格', create_time: '2024-01-18 15:00:00' },
    { inspection_no: 'QC20240008', inspection_type: 2, source_type: '生产过程', source_id: 3, source_no: 'WO20240003', material_id: 3, batch_no: 'BATCH202401003', inspection_qty: 80000.00, qualified_qty: 79200.00, unqualified_qty: 800.00, inspection_result: 1, inspector_id: 4, inspection_date: '2024-01-26', remark: '长期客户过程检验-合格', create_time: '2024-01-26 16:00:00' },
    { inspection_no: 'QC20240009', inspection_type: 3, source_type: '成品入库', source_id: 1, source_no: 'WO20240001', material_id: 1, batch_no: 'BATCH202401001', inspection_qty: 49700.00, qualified_qty: 49500.00, unqualified_qty: 200.00, inspection_result: 1, inspector_id: 3, inspection_date: '2024-01-18', remark: '首批试单成品检验-合格', create_time: '2024-01-18 18:00:00' },
    { inspection_no: 'QC20240010', inspection_type: 3, source_type: '成品入库', source_id: 3, source_no: 'WO20240003', material_id: 3, batch_no: 'BATCH202401003', inspection_qty: 79200.00, qualified_qty: 78800.00, unqualified_qty: 400.00, inspection_result: 1, inspector_id: 4, inspection_date: '2024-01-26', remark: '长期客户成品检验-合格', create_time: '2024-01-26 18:00:00' }
  ],

  // 不合格品处理
  unqualifiedItems: [
    { unqualified_no: 'UQ20240001', inspection_id: 1, material_id: 1, batch_no: 'BATCH202401001', unqualified_qty: 200.00, unqualified_type: '外观不良', unqualified_reason: '表面轻微划痕', handle_method: 1, handle_result: '返工后合格', handler_id: 3, handle_date: '2024-01-03', status: 3, create_time: '2024-01-03 18:00:00' },
    { unqualified_no: 'UQ20240002', inspection_id: 2, material_id: 2, batch_no: 'BATCH202401002', unqualified_qty: 50.00, unqualified_type: '尺寸偏差', unqualified_reason: '厚度略超公差', handle_method: 1, handle_result: '返工后合格', handler_id: 3, handle_date: '2024-01-03', status: 3, create_time: '2024-01-03 19:00:00' },
    { unqualified_no: 'UQ20240003', inspection_id: 3, material_id: 3, batch_no: 'BATCH202401003', unqualified_qty: 500.00, unqualified_type: '印刷模糊', unqualified_reason: '部分印刷不清晰', handle_method: 1, handle_result: '返工后合格', handler_id: 4, handle_date: '2024-01-10', status: 3, create_time: '2024-01-10 19:00:00' },
    { unqualified_no: 'UQ20240004', inspection_id: 4, material_id: 4, batch_no: 'BATCH202401004', unqualified_qty: 200.00, unqualified_type: '色差', unqualified_reason: '颜色略有偏差', handle_method: 1, handle_result: '返工后合格', handler_id: 3, handle_date: '2024-01-10', status: 3, create_time: '2024-01-10 20:00:00' },
    { unqualified_no: 'UQ20240005', inspection_id: 5, material_id: 5, batch_no: 'BATCH202401005', unqualified_qty: 250.00, unqualified_type: '厚度不均', unqualified_reason: '厚度不均匀', handle_method: 3, handle_result: '特采使用', handler_id: 3, handle_date: '2024-01-15', status: 3, create_time: '2024-01-15 18:00:00' },
    { unqualified_no: 'UQ20240006', inspection_id: 7, material_id: 1, batch_no: 'BATCH202401001', unqualified_qty: 300.00, unqualified_type: '裁切不良', unqualified_reason: '裁切尺寸偏差', handle_method: 1, handle_result: '返工后合格', handler_id: 3, handle_date: '2024-01-18', status: 3, create_time: '2024-01-18 20:00:00' },
    { unqualified_no: 'UQ20240007', inspection_id: 8, material_id: 3, batch_no: 'BATCH202401003', unqualified_qty: 800.00, unqualified_type: '贴合不良', unqualified_reason: '贴合有气泡', handle_method: 1, handle_result: '返工后合格', handler_id: 4, handle_date: '2024-01-26', status: 3, create_time: '2024-01-26 19:00:00' }
  ],

  // 7. 人事管理 - 考勤记录
  attendances: [
    { attendance_date: '2024-03-01', employee_id: 'EMP001', employee_name: '张三', department_name: '生产部', check_in_time: '08:00:00', check_out_time: '17:30:00', status: 'normal', working_hours: 8.50, overtime_hours: 0.00, remark: '正常出勤', create_time: '2024-03-01 18:00:00' },
    { attendance_date: '2024-03-01', employee_id: 'EMP002', employee_name: '李四', department_name: '品质部', check_in_time: '08:10:00', check_out_time: '17:30:00', status: 'late', working_hours: 8.33, overtime_hours: 0.00, remark: '迟到10分钟', create_time: '2024-03-01 18:00:00' },
    { attendance_date: '2024-03-01', employee_id: 'EMP003', employee_name: '王五', department_name: '生产部', check_in_time: '08:00:00', check_out_time: '19:30:00', status: 'normal', working_hours: 8.50, overtime_hours: 2.00, remark: '正常出勤，加班2小时', create_time: '2024-03-01 20:00:00' },
    { attendance_date: '2024-03-01', employee_id: 'EMP004', employee_name: '赵六', department_name: '采购部', check_in_time: '08:00:00', check_out_time: '17:30:00', status: 'normal', working_hours: 8.50, overtime_hours: 0.00, remark: '正常出勤', create_time: '2024-03-01 18:00:00' },
    { attendance_date: '2024-03-01', employee_id: 'EMP005', employee_name: '孙七', department_name: '销售部', check_in_time: '08:30:00', check_out_time: '17:30:00', status: 'late', working_hours: 8.00, overtime_hours: 0.00, remark: '迟到30分钟', create_time: '2024-03-01 18:00:00' },
    { attendance_date: '2024-03-02', employee_id: 'EMP001', employee_name: '张三', department_name: '生产部', check_in_time: '08:00:00', check_out_time: '18:00:00', status: 'normal', working_hours: 8.50, overtime_hours: 1.00, remark: '正常出勤，加班1小时', create_time: '2024-03-02 19:00:00' },
    { attendance_date: '2024-03-02', employee_id: 'EMP002', employee_name: '李四', department_name: '品质部', check_in_time: '08:00:00', check_out_time: '17:30:00', status: 'normal', working_hours: 8.50, overtime_hours: 0.00, remark: '正常出勤', create_time: '2024-03-02 18:00:00' },
    { attendance_date: '2024-03-02', employee_id: 'EMP003', employee_name: '王五', department_name: '生产部', check_in_time: null, check_out_time: null, status: 'leave', working_hours: 0.00, overtime_hours: 0.00, remark: '事假一天', create_time: '2024-03-02 09:00:00' },
    { attendance_date: '2024-03-02', employee_id: 'EMP004', employee_name: '赵六', department_name: '采购部', check_in_time: '08:00:00', check_out_time: '17:30:00', status: 'normal', working_hours: 8.50, overtime_hours: 0.00, remark: '正常出勤', create_time: '2024-03-02 18:00:00' },
    { attendance_date: '2024-03-02', employee_id: 'EMP005', employee_name: '孙七', department_name: '销售部', check_in_time: '08:00:00', check_out_time: '20:00:00', status: 'normal', working_hours: 8.50, overtime_hours: 3.00, remark: '正常出勤，加班3小时', create_time: '2024-03-02 21:00:00' }
  ]
};

// 插入数据函数
async function insertData() {
  let connection;
  
  try {
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功！\n');

    const results = {
      salesOrders: 0,
      salesOrderDetails: 0,
      inventoryLogs: 0,
      workOrders: 0,
      purchaseOrders: 0,
      purchaseOrderDetails: 0,
      receivables: 0,
      payables: 0,
      inspections: 0,
      unqualifiedItems: 0,
      attendances: 0
    };

    // 1. 插入销售订单
    console.log('正在插入销售订单数据...');
    for (const order of mockData.salesOrders) {
      try {
        await connection.execute(
          `INSERT INTO sal_order (order_no, order_date, customer_id, contact_name, contact_phone, delivery_address, salesman_id, 
           total_amount, tax_amount, total_with_tax, discount_amount, currency, exchange_rate, payment_terms, delivery_date, 
           contract_no, status, remark, create_time, update_time, create_by, update_by, deleted) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [order.order_no, order.order_date, order.customer_id, order.contact_name, order.contact_phone, order.delivery_address,
           order.salesman_id, order.total_amount, order.tax_amount, order.total_with_tax, order.discount_amount, order.currency,
           order.exchange_rate, order.payment_terms, order.delivery_date, order.contract_no, order.status, order.remark,
           order.create_time, order.update_time, order.create_by, order.update_by, order.deleted]
        );
        results.salesOrders++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  订单 ${order.order_no} 已存在，跳过`);
        } else {
          throw err;
        }
      }
    }
    console.log(`  ✓ 销售订单: ${results.salesOrders} 条\n`);

    // 2. 插入销售订单明细
    console.log('正在插入销售订单明细数据...');
    for (const detail of mockData.salesOrderDetails) {
      try {
        await connection.execute(
          `INSERT INTO sal_order_detail (order_id, material_id, quantity, unit, unit_price, tax_rate, amount, tax_amount, 
           total_amount, delivered_qty, delivery_date, remark, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [detail.order_id, detail.material_id, detail.quantity, detail.unit, detail.unit_price, detail.tax_rate, detail.amount,
           detail.tax_amount, detail.total_amount, detail.delivered_qty, detail.delivery_date, detail.remark, detail.create_time]
        );
        results.salesOrderDetails++;
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    console.log(`  ✓ 销售订单明细: ${results.salesOrderDetails} 条\n`);

    // 3. 插入仓库入库记录
    console.log('正在插入仓库入库记录...');
    for (const log of mockData.inventoryLogsInbound) {
      try {
        await connection.execute(
          `INSERT INTO inv_inventory_log (material_id, warehouse_id, batch_no, operation_type, operation_qty, before_qty, 
           after_qty, business_type, business_no, remark, operator_id, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [log.material_id, log.warehouse_id, log.batch_no, log.operation_type, log.operation_qty, log.before_qty,
           log.after_qty, log.business_type, log.business_no, log.remark, log.operator_id, log.create_time]
        );
        results.inventoryLogs++;
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }

    // 4. 插入仓库出库记录
    console.log('正在插入仓库出库记录...');
    for (const log of mockData.inventoryLogsOutbound) {
      try {
        await connection.execute(
          `INSERT INTO inv_inventory_log (material_id, warehouse_id, batch_no, operation_type, operation_qty, before_qty, 
           after_qty, business_type, business_no, remark, operator_id, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [log.material_id, log.warehouse_id, log.batch_no, log.operation_type, log.operation_qty, log.before_qty,
           log.after_qty, log.business_type, log.business_no, log.remark, log.operator_id, log.create_time]
        );
        results.inventoryLogs++;
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    console.log(`  ✓ 仓库出入库记录: ${results.inventoryLogs} 条\n`);

    // 5. 插入生产工单
    console.log('正在插入生产工单数据...');
    for (const wo of mockData.workOrders) {
      try {
        await connection.execute(
          `INSERT INTO prd_work_order (work_order_no, work_order_date, sales_order_id, material_id, plan_qty, completed_qty, 
           unit, plan_start_date, plan_end_date, actual_start_date, actual_end_date, workshop_id, workcenter_id, priority, 
           status, remark, create_time, update_time, create_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [wo.work_order_no, wo.work_order_date, wo.sales_order_id, wo.material_id, wo.plan_qty, wo.completed_qty, wo.unit,
           wo.plan_start_date, wo.plan_end_date, wo.actual_start_date, wo.actual_end_date, wo.workshop_id, wo.workcenter_id,
           wo.priority, wo.status, wo.remark, wo.create_time, wo.update_time, wo.create_by]
        );
        results.workOrders++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  工单 ${wo.work_order_no} 已存在，跳过`);
        } else {
          throw err;
        }
      }
    }
    console.log(`  ✓ 生产工单: ${results.workOrders} 条\n`);

    // 6. 插入采购订单
    console.log('正在插入采购订单数据...');
    for (const order of mockData.purchaseOrders) {
      try {
        await connection.execute(
          `INSERT INTO pur_order (order_no, order_date, supplier_id, contact_name, contact_phone, delivery_address, 
           total_amount, tax_amount, total_with_tax, currency, exchange_rate, payment_terms, delivery_date, settlement_method, 
           status, remark, create_time, update_time, create_by, deleted) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [order.order_no, order.order_date, order.supplier_id, order.contact_name, order.contact_phone, order.delivery_address,
           order.total_amount, order.tax_amount, order.total_with_tax, order.currency, order.exchange_rate, order.payment_terms,
           order.delivery_date, order.settlement_method, order.status, order.remark, order.create_time, order.update_time,
           order.create_by, order.deleted]
        );
        results.purchaseOrders++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  订单 ${order.order_no} 已存在，跳过`);
        } else {
          throw err;
        }
      }
    }
    console.log(`  ✓ 采购订单: ${results.purchaseOrders} 条\n`);

    // 7. 插入采购订单明细
    console.log('正在插入采购订单明细数据...');
    for (const detail of mockData.purchaseOrderDetails) {
      try {
        await connection.execute(
          `INSERT INTO pur_order_detail (order_id, material_id, quantity, unit, unit_price, tax_rate, amount, tax_amount, 
           total_amount, received_qty, delivery_date, remark, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [detail.order_id, detail.material_id, detail.quantity, detail.unit, detail.unit_price, detail.tax_rate, detail.amount,
           detail.tax_amount, detail.total_amount, detail.received_qty, detail.delivery_date, detail.remark, detail.create_time]
        );
        results.purchaseOrderDetails++;
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    console.log(`  ✓ 采购订单明细: ${results.purchaseOrderDetails} 条\n`);

    // 8. 插入应收款
    console.log('正在插入应收款数据...');
    for (const ar of mockData.receivables) {
      try {
        await connection.execute(
          `INSERT INTO fin_receivable (receivable_no, source_type, source_id, source_no, customer_id, amount, received_amount, 
           balance, due_date, status, remark, create_time, update_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ar.receivable_no, ar.source_type, ar.source_id, ar.source_no, ar.customer_id, ar.amount, ar.received_amount,
           ar.balance, ar.due_date, ar.status, ar.remark, ar.create_time, ar.update_time]
        );
        results.receivables++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  应收款 ${ar.receivable_no} 已存在，跳过`);
        } else {
          throw err;
        }
      }
    }
    console.log(`  ✓ 应收款: ${results.receivables} 条\n`);

    // 9. 插入应付款
    console.log('正在插入应付款数据...');
    for (const ap of mockData.payables) {
      try {
        await connection.execute(
          `INSERT INTO fin_payable (payable_no, source_type, source_id, source_no, supplier_id, amount, paid_amount, 
           balance, due_date, status, remark, create_time, update_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ap.payable_no, ap.source_type, ap.source_id, ap.source_no, ap.supplier_id, ap.amount, ap.paid_amount,
           ap.balance, ap.due_date, ap.status, ap.remark, ap.create_time, ap.update_time]
        );
        results.payables++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  应付款 ${ap.payable_no} 已存在，跳过`);
        } else {
          throw err;
        }
      }
    }
    console.log(`  ✓ 应付款: ${results.payables} 条\n`);

    // 10. 插入检验单
    console.log('正在插入检验单数据...');
    for (const qc of mockData.inspections) {
      try {
        await connection.execute(
          `INSERT INTO qc_inspection (inspection_no, inspection_type, source_type, source_id, source_no, material_id, batch_no, 
           inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector_id, inspection_date, remark, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [qc.inspection_no, qc.inspection_type, qc.source_type, qc.source_id, qc.source_no, qc.material_id, qc.batch_no,
           qc.inspection_qty, qc.qualified_qty, qc.unqualified_qty, qc.inspection_result, qc.inspector_id, qc.inspection_date,
           qc.remark, qc.create_time]
        );
        results.inspections++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  检验单 ${qc.inspection_no} 已存在，跳过`);
        } else {
          throw err;
        }
      }
    }
    console.log(`  ✓ 检验单: ${results.inspections} 条\n`);

    // 11. 插入不合格品处理
    console.log('正在插入不合格品处理数据...');
    for (const uq of mockData.unqualifiedItems) {
      try {
        await connection.execute(
          `INSERT INTO qc_unqualified (unqualified_no, inspection_id, material_id, batch_no, unqualified_qty, unqualified_type, 
           unqualified_reason, handle_method, handle_result, handler_id, handle_date, status, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uq.unqualified_no, uq.inspection_id, uq.material_id, uq.batch_no, uq.unqualified_qty, uq.unqualified_type,
           uq.unqualified_reason, uq.handle_method, uq.handle_result, uq.handler_id, uq.handle_date, uq.status, uq.create_time]
        );
        results.unqualifiedItems++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  不合格品 ${uq.unqualified_no} 已存在，跳过`);
        } else {
          throw err;
        }
      }
    }
    console.log(`  ✓ 不合格品处理: ${results.unqualifiedItems} 条\n`);

    // 12. 插入考勤记录
    console.log('正在插入考勤记录数据...');
    for (const att of mockData.attendances) {
      try {
        await connection.execute(
          `INSERT INTO hr_attendance (attendance_date, employee_id, employee_name, department_name, check_in_time, check_out_time, 
           status, working_hours, overtime_hours, remark, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [att.attendance_date, att.employee_id, att.employee_name, att.department_name, att.check_in_time, att.check_out_time,
           att.status, att.working_hours, att.overtime_hours, att.remark, att.create_time]
        );
        results.attendances++;
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    console.log(`  ✓ 考勤记录: ${results.attendances} 条\n`);

    // 输出汇总
    console.log('========================================');
    console.log('模拟数据插入完成！');
    console.log('========================================');
    console.log(`订单管理 - 销售订单: ${results.salesOrders} 条`);
    console.log(`订单管理 - 销售明细: ${results.salesOrderDetails} 条`);
    console.log(`仓库管理 - 出入库记录: ${results.inventoryLogs} 条`);
    console.log(`生产管理 - 生产工单: ${results.workOrders} 条`);
    console.log(`采购管理 - 采购订单: ${results.purchaseOrders} 条`);
    console.log(`采购管理 - 采购明细: ${results.purchaseOrderDetails} 条`);
    console.log(`账务管理 - 应收款: ${results.receivables} 条`);
    console.log(`账务管理 - 应付款: ${results.payables} 条`);
    console.log(`品质管理 - 检验单: ${results.inspections} 条`);
    console.log(`品质管理 - 不合格品: ${results.unqualifiedItems} 条`);
    console.log(`人事管理 - 考勤记录: ${results.attendances} 条`);
    console.log('========================================');

  } catch (error) {
    console.error('插入数据时出错:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 执行插入
insertData();