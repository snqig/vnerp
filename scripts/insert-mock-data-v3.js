/**
 * ERP系统全模块模拟数据插入脚本 V3
 * 根据实际数据库表结构调整
 * 包含：客户管理、采购申请、仓库管理、生产管理、打样管理、人事管理
 */

const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  port: 3306,
  multipleStatements: true
};

// 模拟数据
const mockData = {
  // 1. 客户管理 - 10条
  customers: [
    { customer_code: 'CUST20240001', customer_name: '深圳市科技有限公司', short_name: '深圳科技', customer_type: 1, contact_name: '张经理', contact_phone: '13800138001', contact_email: 'zhang@sztech.com', address: '深圳市南山区科技园', status: 1 },
    { customer_code: 'CUST20240002', customer_name: '广州贸易发展有限公司', short_name: '广州贸易', customer_type: 1, contact_name: '李主任', contact_phone: '13800138002', contact_email: 'li@gtrade.com', address: '广州市天河区珠江新城', status: 1 },
    { customer_code: 'CUST20240003', customer_name: '东莞制造有限公司', short_name: '东莞制造', customer_type: 1, contact_name: '王总', contact_phone: '13800138003', contact_email: 'wang@dgmake.com', address: '东莞市长安镇工业区', status: 1 },
    { customer_code: 'CUST20240004', customer_name: '佛山实业集团有限公司', short_name: '佛山实业', customer_type: 1, contact_name: '陈经理', contact_phone: '13800138004', contact_email: 'chen@fsind.com', address: '佛山市顺德区北滘镇', status: 1 },
    { customer_code: 'CUST20240005', customer_name: '中山电子科技有限公司', short_name: '中山电子', customer_type: 1, contact_name: '刘主任', contact_phone: '13800138005', contact_email: 'liu@zselec.com', address: '中山市火炬开发区', status: 1 },
    { customer_code: 'CUST20240006', customer_name: '惠州包装材料有限公司', short_name: '惠州包装', customer_type: 1, contact_name: '赵经理', contact_phone: '13800138006', contact_email: 'zhao@hzpack.com', address: '惠州市惠城区', status: 1 },
    { customer_code: 'CUST20240007', customer_name: '珠海进出口贸易有限公司', short_name: '珠海进出口', customer_type: 1, contact_name: '孙总', contact_phone: '13800138007', contact_email: 'sun@zhimport.com', address: '珠海市香洲区', status: 1 },
    { customer_code: 'CUST20240008', customer_name: '江门印刷包装有限公司', short_name: '江门印刷', customer_type: 1, contact_name: '周经理', contact_phone: '13800138008', contact_email: 'zhou@jmprint.com', address: '江门市蓬江区', status: 1 },
    { customer_code: 'CUST20240009', customer_name: '肇庆新材料科技有限公司', short_name: '肇庆新材料', customer_type: 1, contact_name: '吴主任', contact_phone: '13800138009', contact_email: 'wu@zqmaterial.com', address: '肇庆市端州区', status: 1 },
    { customer_code: 'CUST20240010', customer_name: '汕头塑料制品有限公司', short_name: '汕头塑料', customer_type: 1, contact_name: '郑经理', contact_phone: '13800138010', contact_email: 'zheng@stplastic.com', address: '汕头市龙湖区', status: 1 }
  ],

  // 2. 采购申请 - 10条
  purchaseRequests: [
    { request_no: 'PR202403001', request_date: '2024-03-01', request_type: '原材料', request_dept: '生产部', requester_id: 1, requester_name: '张三', total_amount: 50000.00, status: 3, priority: 2, remark: 'PET透明膜采购申请' },
    { request_no: 'PR202403002', request_date: '2024-03-02', request_type: '原材料', request_dept: '品质部', requester_id: 2, requester_name: '李四', total_amount: 30000.00, status: 3, priority: 2, remark: '防静电膜采购申请' },
    { request_no: 'PR202403003', request_date: '2024-03-05', request_type: '原材料', request_dept: '生产部', requester_id: 1, requester_name: '张三', total_amount: 80000.00, status: 3, priority: 1, remark: '标签纸大批量采购' },
    { request_no: 'PR202403004', request_date: '2024-03-08', request_type: '原材料', request_dept: '采购部', requester_id: 3, requester_name: '王五', total_amount: 45000.00, status: 2, priority: 2, remark: '彩印膜采购申请' },
    { request_no: 'PR202403005', request_date: '2024-03-10', request_type: '原材料', request_dept: '生产部', requester_id: 1, requester_name: '张三', total_amount: 25000.00, status: 3, priority: 3, remark: '热收缩膜紧急采购' },
    { request_no: 'PR202403006', request_date: '2024-03-12', request_type: '辅料', request_dept: '仓库部', requester_id: 4, requester_name: '赵六', total_amount: 15000.00, status: 3, priority: 2, remark: '保护膜采购申请' },
    { request_no: 'PR202403007', request_date: '2024-03-15', request_type: '原材料', request_dept: '生产部', requester_id: 1, requester_name: '张三', total_amount: 100000.00, status: 1, priority: 1, remark: '复合膜大批量采购' },
    { request_no: 'PR202403008', request_date: '2024-03-18', request_type: '耗材', request_dept: '品质部', requester_id: 2, requester_name: '李四', total_amount: 35000.00, status: 2, priority: 2, remark: '检测耗材采购' },
    { request_no: 'PR202403009', request_date: '2024-03-20', request_type: '样品', request_dept: '销售部', requester_id: 5, requester_name: '孙七', total_amount: 60000.00, status: 1, priority: 2, remark: '样品材料采购' },
    { request_no: 'PR202403010', request_date: '2024-03-25', request_type: '原材料', request_dept: '生产部', requester_id: 1, requester_name: '张三', total_amount: 75000.00, status: 1, priority: 2, remark: '常规物料补货' }
  ],

  // 3. 仓库 - 5个
  warehouses: [
    { warehouse_code: 'WH001', warehouse_name: '原材料仓', warehouse_type: 1, province: '广东', city: '深圳', address: 'A区1楼', status: 1 },
    { warehouse_code: 'WH002', warehouse_name: '半成品仓', warehouse_type: 2, province: '广东', city: '深圳', address: 'A区2楼', status: 1 },
    { warehouse_code: 'WH003', warehouse_name: '成品仓', warehouse_type: 3, province: '广东', city: '深圳', address: 'B区1楼', status: 1 },
    { warehouse_code: 'WH004', warehouse_name: '辅料仓', warehouse_type: 4, province: '广东', city: '深圳', address: 'B区2楼', status: 1 },
    { warehouse_code: 'WH005', warehouse_name: '不良品仓', warehouse_type: 5, province: '广东', city: '深圳', address: 'C区1楼', status: 1 }
  ],

  // 4. 库存记录 - 10条
  inventoryLogs: [
    { material_id: 1, warehouse_id: 1, batch_no: 'BATCH202403001', operation_type: 1, operation_qty: 50000.00, before_qty: 0.00, after_qty: 50000.00, business_type: '采购入库', business_no: 'PI202403001', remark: 'PET透明膜入库', operator_id: 1 },
    { material_id: 2, warehouse_id: 1, batch_no: 'BATCH202403002', operation_type: 1, operation_qty: 30000.00, before_qty: 0.00, after_qty: 30000.00, business_type: '采购入库', business_no: 'PI202403002', remark: '防静电膜入库', operator_id: 1 },
    { material_id: 3, warehouse_id: 1, batch_no: 'BATCH202403003', operation_type: 1, operation_qty: 80000.00, before_qty: 0.00, after_qty: 80000.00, business_type: '采购入库', business_no: 'PI202403003', remark: '标签纸入库', operator_id: 2 },
    { material_id: 4, warehouse_id: 2, batch_no: 'BATCH202403004', operation_type: 1, operation_qty: 40000.00, before_qty: 0.00, after_qty: 40000.00, business_type: '生产入库', business_no: 'MI202403001', remark: '半成品入库', operator_id: 3 },
    { material_id: 5, warehouse_id: 3, batch_no: 'BATCH202403005', operation_type: 1, operation_qty: 25000.00, before_qty: 0.00, after_qty: 25000.00, business_type: '生产入库', business_no: 'MI202403002', remark: '成品入库', operator_id: 3 },
    { material_id: 1, warehouse_id: 1, batch_no: 'BATCH202403001', operation_type: 2, operation_qty: 20000.00, before_qty: 50000.00, after_qty: 30000.00, business_type: '生产出库', business_no: 'MO202403001', remark: '领料出库', operator_id: 1 },
    { material_id: 2, warehouse_id: 1, batch_no: 'BATCH202403002', operation_type: 2, operation_qty: 15000.00, before_qty: 30000.00, after_qty: 15000.00, business_type: '生产出库', business_no: 'MO202403002', remark: '领料出库', operator_id: 1 },
    { material_id: 4, warehouse_id: 2, batch_no: 'BATCH202403004', operation_type: 2, operation_qty: 20000.00, before_qty: 40000.00, after_qty: 20000.00, business_type: '销售出库', business_no: 'SO202403001', remark: '销售发货', operator_id: 4 },
    { material_id: 5, warehouse_id: 3, batch_no: 'BATCH202403005', operation_type: 2, operation_qty: 15000.00, before_qty: 25000.00, after_qty: 10000.00, business_type: '销售出库', business_no: 'SO202403002', remark: '销售发货', operator_id: 4 },
    { material_id: 3, warehouse_id: 1, batch_no: 'BATCH202403003', operation_type: 2, operation_qty: 30000.00, before_qty: 80000.00, after_qty: 50000.00, business_type: '生产出库', business_no: 'MO202403003', remark: '领料出库', operator_id: 2 }
  ],

  // 5. 标准卡（生产管理）- 10条
  standardCards: [
    { card_no: 'SC202403001', customer_name: '深圳科技', customer_code: 'CUST20240001', product_name: '透明包装膜A款', version: 'V1.0', date: '2024-03-01', material_name: 'PET透明膜', material_type: '原材料', status: 3, creator: '技术员A', creator_id: 1 },
    { card_no: 'SC202403002', customer_name: '广州贸易', customer_code: 'CUST20240002', product_name: '防静电膜B款', version: 'V1.0', date: '2024-03-03', material_name: '防静电膜', material_type: '原材料', status: 3, creator: '技术员B', creator_id: 2 },
    { card_no: 'SC202403003', customer_name: '东莞制造', customer_code: 'CUST20240003', product_name: '标签贴纸C款', version: 'V2.0', date: '2024-03-05', material_name: '不干胶纸', material_type: '原材料', status: 2, creator: '技术员A', creator_id: 1 },
    { card_no: 'SC202403004', customer_name: '佛山实业', customer_code: 'CUST20240004', product_name: '彩印膜D款', version: 'V1.0', date: '2024-03-08', material_name: 'BOPP彩印膜', material_type: '原材料', status: 1, creator: '技术员C', creator_id: 3 },
    { card_no: 'SC202403005', customer_name: '中山电子', customer_code: 'CUST20240005', product_name: '热收缩膜E款', version: 'V1.0', date: '2024-03-10', material_name: 'POF热收缩膜', material_type: '原材料', status: 3, creator: '技术员B', creator_id: 2 },
    { card_no: 'SC202403006', customer_name: '惠州包装', customer_code: 'CUST20240006', product_name: '保护膜F款', version: 'V3.0', date: '2024-03-12', material_name: 'PE保护膜', material_type: '原材料', status: 2, creator: '技术员A', creator_id: 1 },
    { card_no: 'SC202403007', customer_name: '珠海进出口', customer_code: 'CUST20240007', product_name: '复合膜G款', version: 'V1.0', date: '2024-03-15', material_name: '复合膜材料', material_type: '原材料', status: 1, creator: '技术员C', creator_id: 3 },
    { card_no: 'SC202403008', customer_name: '江门印刷', customer_code: 'CUST20240008', product_name: '印刷膜H款', version: 'V2.0', date: '2024-03-18', material_name: '印刷专用膜', material_type: '原材料', status: 3, creator: '技术员B', creator_id: 2 },
    { card_no: 'SC202403009', customer_name: '肇庆新材料', customer_code: 'CUST20240009', product_name: '新材料I款', version: 'V1.0', date: '2024-03-20', material_name: '生物降解膜', material_type: '新材料', status: 2, creator: '技术员A', creator_id: 1 },
    { card_no: 'SC202403010', customer_name: '汕头塑料', customer_code: 'CUST20240010', product_name: '塑料膜J款', version: 'V1.0', date: '2024-03-25', material_name: 'PVC塑料膜', material_type: '原材料', status: 1, creator: '技术员C', creator_id: 3 }
  ],

  // 6. 打样订单 - 10条
  sampleOrders: [
    { sample_no: 'SP202403001', order_month: 3, order_date: '2024-03-01', sample_type: '新产品', customer_name: '深圳科技', product_name: '透明包装膜样品', quantity: 100, progress_status: '已完成', is_urgent: 0, is_confirmed: 1, order_tracker: '张三', status: 1 },
    { sample_no: 'SP202403002', order_month: 3, order_date: '2024-03-03', sample_type: '改版', customer_name: '广州贸易', product_name: '防静电膜样品', quantity: 50, progress_status: '生产中', is_urgent: 0, is_confirmed: 1, order_tracker: '李四', status: 1 },
    { sample_no: 'SP202403003', order_month: 3, order_date: '2024-03-05', sample_type: '新产品', customer_name: '东莞制造', product_name: '标签贴纸样品', quantity: 200, progress_status: '待确认', is_urgent: 1, is_confirmed: 0, order_tracker: '王五', status: 1 },
    { sample_no: 'SP202403004', order_month: 3, order_date: '2024-03-08', sample_type: '常规', customer_name: '佛山实业', product_name: '彩印膜样品', quantity: 80, progress_status: '已完成', is_urgent: 0, is_confirmed: 1, order_tracker: '赵六', status: 1 },
    { sample_no: 'SP202403005', order_month: 3, order_date: '2024-03-10', sample_type: '紧急', customer_name: '中山电子', product_name: '热收缩膜样品', quantity: 150, progress_status: '生产中', is_urgent: 1, is_confirmed: 1, order_tracker: '张三', status: 1 },
    { sample_no: 'SP202403006', order_month: 3, order_date: '2024-03-12', sample_type: '新产品', customer_name: '惠州包装', product_name: '保护膜样品', quantity: 120, progress_status: '待生产', is_urgent: 0, is_confirmed: 0, order_tracker: '李四', status: 1 },
    { sample_no: 'SP202403007', order_month: 3, order_date: '2024-03-15', sample_type: '改版', customer_name: '珠海进出口', product_name: '复合膜样品', quantity: 60, progress_status: '已完成', is_urgent: 0, is_confirmed: 1, order_tracker: '王五', status: 1 },
    { sample_no: 'SP202403008', order_month: 3, order_date: '2024-03-18', sample_type: '常规', customer_name: '江门印刷', product_name: '印刷膜样品', quantity: 90, progress_status: '生产中', is_urgent: 0, is_confirmed: 1, order_tracker: '赵六', status: 1 },
    { sample_no: 'SP202403009', order_month: 3, order_date: '2024-03-20', sample_type: '新产品', customer_name: '肇庆新材料', product_name: '新材料样品', quantity: 70, progress_status: '待确认', is_urgent: 0, is_confirmed: 0, order_tracker: '张三', status: 1 },
    { sample_no: 'SP202403010', order_month: 3, order_date: '2024-03-25', sample_type: '紧急', customer_name: '汕头塑料', product_name: '塑料膜样品', quantity: 180, progress_status: '待生产', is_urgent: 1, is_confirmed: 1, order_tracker: '李四', status: 1 }
  ],

  // 7. 员工（人事管理）- 10条
  employees: [
    { employee_no: 'EMP2024001', name: '张三', gender: 1, phone: '13800138001', email: 'zhangsan@company.com', dept_id: 1, dept_name: '生产部', position: '生产主管', entry_date: '2022-01-15', status: 1, education: '本科', address: '深圳市南山区' },
    { employee_no: 'EMP2024002', name: '李四', gender: 1, phone: '13800138002', email: 'lisi@company.com', dept_id: 2, dept_name: '品质部', position: '品质经理', entry_date: '2021-06-20', status: 1, education: '本科', address: '深圳市福田区' },
    { employee_no: 'EMP2024003', name: '王五', gender: 1, phone: '13800138003', email: 'wangwu@company.com', dept_id: 1, dept_name: '生产部', position: '技术员', entry_date: '2023-03-10', status: 1, education: '大专', address: '深圳市宝安区' },
    { employee_no: 'EMP2024004', name: '赵六', gender: 1, phone: '13800138004', email: 'zhaoliu@company.com', dept_id: 3, dept_name: '采购部', position: '采购专员', entry_date: '2022-08-05', status: 1, education: '本科', address: '深圳市龙岗区' },
    { employee_no: 'EMP2024005', name: '孙七', gender: 2, phone: '13800138005', email: 'sunqi@company.com', dept_id: 4, dept_name: '销售部', position: '销售经理', entry_date: '2021-11-12', status: 1, education: '本科', address: '深圳市罗湖区' },
    { employee_no: 'EMP2024006', name: '周八', gender: 1, phone: '13800138006', email: 'zhouba@company.com', dept_id: 5, dept_name: '仓库部', position: '仓库主管', entry_date: '2020-09-01', status: 1, education: '大专', address: '深圳市龙华区' },
    { employee_no: 'EMP2024007', name: '吴九', gender: 2, phone: '13800138007', email: 'wujiu@company.com', dept_id: 6, dept_name: '财务部', position: '会计', entry_date: '2023-01-08', status: 1, education: '本科', address: '深圳市南山区' },
    { employee_no: 'EMP2024008', name: '郑十', gender: 1, phone: '13800138008', email: 'zhengshi@company.com', dept_id: 7, dept_name: '研发部', position: '工程师', entry_date: '2022-05-20', status: 1, education: '硕士', address: '深圳市光明区' },
    { employee_no: 'EMP2024009', name: '钱十一', gender: 2, phone: '13800138009', email: 'qian11@company.com', dept_id: 4, dept_name: '销售部', position: '销售代表', entry_date: '2023-07-15', status: 1, education: '大专', address: '深圳市坪山区' },
    { employee_no: 'EMP2024010', name: '冯十二', gender: 1, phone: '13800138010', email: 'feng12@company.com', dept_id: 1, dept_name: '生产部', position: '操作工', entry_date: '2024-01-10', status: 1, education: '高中', address: '深圳市大鹏新区' }
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
      customers: 0,
      purchaseRequests: 0,
      warehouses: 0,
      inventoryLogs: 0,
      standardCards: 0,
      sampleOrders: 0,
      employees: 0
    };

    // 1. 插入客户
    console.log('正在插入客户数据...');
    for (const cust of mockData.customers) {
      try {
        await connection.execute(
          `INSERT INTO crm_customer (customer_code, customer_name, short_name, customer_type, contact_name, contact_phone, contact_email, address, status, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [cust.customer_code, cust.customer_name, cust.short_name, cust.customer_type, cust.contact_name, cust.contact_phone, cust.contact_email, cust.address, cust.status]
        );
        results.customers++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  客户 ${cust.customer_code} 已存在，跳过`);
        } else {
          console.error(`  插入客户 ${cust.customer_code} 失败:`, err.message);
        }
      }
    }
    console.log(`  ✓ 客户: ${results.customers} 条\n`);

    // 2. 插入采购申请
    console.log('正在插入采购申请数据...');
    for (const pr of mockData.purchaseRequests) {
      try {
        await connection.execute(
          `INSERT INTO pur_request (request_no, request_date, request_type, request_dept, requester_id, requester_name, total_amount, status, priority, remark, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [pr.request_no, pr.request_date, pr.request_type, pr.request_dept, pr.requester_id, pr.requester_name, pr.total_amount, pr.status, pr.priority, pr.remark]
        );
        results.purchaseRequests++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  采购申请 ${pr.request_no} 已存在，跳过`);
        } else {
          console.error(`  插入采购申请 ${pr.request_no} 失败:`, err.message);
        }
      }
    }
    console.log(`  ✓ 采购申请: ${results.purchaseRequests} 条\n`);

    // 3. 插入仓库
    console.log('正在插入仓库数据...');
    for (const wh of mockData.warehouses) {
      try {
        await connection.execute(
          `INSERT INTO inv_warehouse (warehouse_code, warehouse_name, warehouse_type, province, city, address, status, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [wh.warehouse_code, wh.warehouse_name, wh.warehouse_type, wh.province, wh.city, wh.address, wh.status]
        );
        results.warehouses++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  仓库 ${wh.warehouse_code} 已存在，跳过`);
        } else {
          console.error(`  插入仓库 ${wh.warehouse_code} 失败:`, err.message);
        }
      }
    }
    console.log(`  ✓ 仓库: ${results.warehouses} 条\n`);

    // 4. 插入库存记录
    console.log('正在插入库存记录数据...');
    for (const log of mockData.inventoryLogs) {
      try {
        await connection.execute(
          `INSERT INTO inv_inventory_log (material_id, warehouse_id, batch_no, operation_type, operation_qty, before_qty, after_qty, business_type, business_no, remark, operator_id, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [log.material_id, log.warehouse_id, log.batch_no, log.operation_type, log.operation_qty, log.before_qty, log.after_qty, log.business_type, log.business_no, log.remark, log.operator_id]
        );
        results.inventoryLogs++;
      } catch (err) {
        console.error(`  插入库存记录失败:`, err.message);
      }
    }
    console.log(`  ✓ 库存记录: ${results.inventoryLogs} 条\n`);

    // 5. 插入标准卡
    console.log('正在插入标准卡数据...');
    for (const sc of mockData.standardCards) {
      try {
        await connection.execute(
          `INSERT INTO prd_standard_card (card_no, customer_name, customer_code, product_name, version, date, material_name, material_type, status, creator, creator_id, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [sc.card_no, sc.customer_name, sc.customer_code, sc.product_name, sc.version, sc.date, sc.material_name, sc.material_type, sc.status, sc.creator, sc.creator_id]
        );
        results.standardCards++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  标准卡 ${sc.card_no} 已存在，跳过`);
        } else {
          console.error(`  插入标准卡 ${sc.card_no} 失败:`, err.message);
        }
      }
    }
    console.log(`  ✓ 标准卡: ${results.standardCards} 条\n`);

    // 6. 插入打样订单
    console.log('正在插入打样订单数据...');
    for (const so of mockData.sampleOrders) {
      try {
        await connection.execute(
          `INSERT INTO sample_order (sample_no, order_month, order_date, sample_type, customer_name, product_name, quantity, progress_status, is_urgent, is_confirmed, order_tracker, status, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [so.sample_no, so.order_month, so.order_date, so.sample_type, so.customer_name, so.product_name, so.quantity, so.progress_status, so.is_urgent, so.is_confirmed, so.order_tracker, so.status]
        );
        results.sampleOrders++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  打样订单 ${so.sample_no} 已存在，跳过`);
        } else {
          console.error(`  插入打样订单 ${so.sample_no} 失败:`, err.message);
        }
      }
    }
    console.log(`  ✓ 打样订单: ${results.sampleOrders} 条\n`);

    // 7. 插入员工
    console.log('正在插入员工数据...');
    for (const emp of mockData.employees) {
      try {
        await connection.execute(
          `INSERT INTO sys_employee (employee_no, name, gender, phone, email, dept_id, dept_name, position, entry_date, status, education, address, create_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [emp.employee_no, emp.name, emp.gender, emp.phone, emp.email, emp.dept_id, emp.dept_name, emp.position, emp.entry_date, emp.status, emp.education, emp.address]
        );
        results.employees++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  员工 ${emp.employee_no} 已存在，跳过`);
        } else {
          console.error(`  插入员工 ${emp.employee_no} 失败:`, err.message);
        }
      }
    }
    console.log(`  ✓ 员工: ${results.employees} 条\n`);

    // 输出汇总
    console.log('========================================');
    console.log('模拟数据插入完成！');
    console.log('========================================');
    console.log(`订单管理 - 客户: ${results.customers} 条`);
    console.log(`采购管理 - 采购申请: ${results.purchaseRequests} 条`);
    console.log(`仓库管理 - 仓库: ${results.warehouses} 条`);
    console.log(`仓库管理 - 库存记录: ${results.inventoryLogs} 条`);
    console.log(`生产管理 - 标准卡: ${results.standardCards} 条`);
    console.log(`打样中心 - 打样订单: ${results.sampleOrders} 条`);
    console.log(`人事管理 - 员工: ${results.employees} 条`);
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
