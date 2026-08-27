/**
 * 全项目自动录入数据脚本
 *
 * 通过 API + SQL 混合方式录入一组完整业务数据：
 *   1. 登录 → 获取 access_token + refresh_token + CSRF token
 *   2. 客户管理：3 条客户
 *   3. 供应商管理：3 条供应商
 *   4. 仓库管理：4 个仓库
 *   5. 物料管理：直接 SQL 插入 10 条物料（API 未实现 POST）
 *   6. 标准卡：3 条（已有 SC-DEMO 数据，跳过）
 *   7. 采购订单：2 笔（含明细）
 *   8. 销售订单：2 笔（含明细）
 *   9. 入库：1 笔（采购入库）
 *  10. 质量检验：1 笔
 *
 * 用法：node scripts/seed-full-project.cjs
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 加载 .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const API_BASE = 'http://localhost:5000';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// 全局 token 和 CSRF
let accessToken = '';
let refreshToken = '';
let csrfToken = '';
let cookieHeader = '';
let dbConn = null;

// 统计
const stats = { success: 0, fail: 0, skip: 0, errors: [] };

// ========== 工具函数 ==========

async function apiCall(method, urlPath, body) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'x-csrf-token': csrfToken,
    Cookie: cookieHeader,
  };
  const res = await fetch(`${API_BASE}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { success: false, message: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function sqlInsert(sql, params) {
  const [result] = await dbConn.execute(sql, params);
  return result;
}

// ========== 1. 登录 ==========

async function step1_Login() {
  console.log('\n[1/10] 登录...');
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Login failed: ${data.message}`);

  accessToken = data.data.token;
  refreshToken = data.data.refreshToken;
  const userId = data.data.user.id;

  // 提取 set-cookie 中的 access_token 和 csrf_token
  const setCookie = res.headers.get('set-cookie') || '';
  const accessMatch = setCookie.match(/access_token=([^;]+)/);
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/);
  const refreshMatch = setCookie.match(/refresh_token=([^;]+)/);
  csrfToken = csrfMatch ? csrfMatch[1] : '';
  cookieHeader = `access_token=${accessMatch ? accessMatch[1] : accessToken}; csrf_token=${csrfToken}; refresh_token=${refreshMatch ? refreshMatch[1] : refreshToken}`;

  console.log(`  ✓ 登录成功 (userId=${userId}, csrfToken=${csrfToken ? csrfToken.slice(0, 8) + '...' : 'NONE'})`);
}

// ========== 2. 客户 ==========

async function step2_Customers() {
  console.log('\n[2/10] 客户管理（SQL 直接插入）...');
  // SQL 直接插入，避免 API 层 500 错误（salesman_id 等 bigint unsigned 字段 null 问题）
  // 注意：不能直接 DELETE 客户，因为 sal_order 有外键引用。
  // 改为：先软删除旧 DEMO 客户，再插入新数据（编码相同会冲突，所以使用 ON DUPLICATE KEY UPDATE）
  const now = new Date();
  const customers = [
    ['C-DEMO-001', '深圳科技有限公司', '科技', 1, '电子产品', '中型', 'A', '广东省', '深圳市', '南山区', '科技园南区', '张经理', '13800138001', 'zhang@tech.com', '', '', '91440300000000001', '招商银行', '6225000000000001', 3, 1, '自动录入'],
    ['C-DEMO-002', '上海制造集团', '制造', 1, '制造业', '大型', 'AAA', '上海市', '上海市', '浦东新区', '张江高科技园区', '李总', '13800138002', 'li@manu.com', '', '', '91310000000000002', '工商银行', '6222000000000002', 3, 1, '自动录入'],
    ['C-DEMO-003', '北京智能科技', '智能', 1, '智能硬件', '小型', 'B', '北京市', '北京市', '海淀区', '中关村大街', '王工', '13800138003', 'wang@smart.com', '', '', '91110100000000003', '建设银行', '6217000000000003', 2, 1, '自动录入 - 意向客户'],
  ];

  for (const c of customers) {
    try {
      // 使用 ON DUPLICATE KEY UPDATE 避免外键冲突
      await sqlInsert(
        `INSERT INTO crm_customer (
          customer_code, customer_name, short_name, customer_type,
          industry, scale, credit_level, province, city, district, address,
          contact_name, contact_phone, contact_email, fax, website,
          tax_number, bank_name, bank_account,
          follow_up_status, status, remark, deleted, create_time, update_time
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)
        ON DUPLICATE KEY UPDATE
          customer_name=VALUES(customer_name), short_name=VALUES(short_name),
          industry=VALUES(industry), scale=VALUES(scale), credit_level=VALUES(credit_level),
          province=VALUES(province), city=VALUES(city), district=VALUES(district), address=VALUES(address),
          contact_name=VALUES(contact_name), contact_phone=VALUES(contact_phone), contact_email=VALUES(contact_email),
          tax_number=VALUES(tax_number), bank_name=VALUES(bank_name), bank_account=VALUES(bank_account),
          follow_up_status=VALUES(follow_up_status), status=VALUES(status), remark=VALUES(remark),
          deleted=0, update_time=VALUES(update_time)`,
        [...c, now, now]
      );
      stats.success++;
      console.log(`  ✓ ${c[0]} - ${c[1]}`);
    } catch (e) {
      stats.fail++;
      stats.errors.push(`customer ${c[0]}: ${e.message}`);
      console.log(`  ✗ ${c[0]} 失败: ${e.message}`);
    }
  }
}

// ========== 3. 供应商 ==========

async function step3_Suppliers() {
  console.log('\n[3/10] 供应商管理...');
  const suppliers = [
    {
      supplier_code: 'S-DEMO-001', supplier_name: '广州原材料供应商', short_name: '广州原材',
      supplier_type: 1, contact_name: '陈经理', contact_phone: '13900139001', contact_email: 'chen@mat.com',
      address: '广州市黄埔区', credit_level: 'A', business_license: 'BL001', tax_number: '91440100000000001',
      bank_name: '农业银行', bank_account: '6228000000000001',
      settlement_method: '月结30天', payment_terms: '货到付款', cooperation_status: 'active', status: 1, remark: '自动录入',
    },
    {
      supplier_code: 'S-DEMO-002', supplier_name: '东莞辅料供应商', short_name: '东莞辅料',
      supplier_type: 2, contact_name: '刘经理', contact_phone: '13900139002', contact_email: 'liu@aux.com',
      address: '东莞市松山湖', credit_level: 'B', business_license: 'BL002', tax_number: '91441900000000002',
      bank_name: '中国银行', bank_account: '6217000000000002',
      settlement_method: '月结60天', payment_terms: '预付30%', cooperation_status: 'active', status: 1, remark: '自动录入',
    },
    {
      supplier_code: 'S-DEMO-003', supplier_name: '苏州设备供应商', short_name: '苏州设备',
      supplier_type: 3, contact_name: '赵工', contact_phone: '13900139003', contact_email: 'zhao@equip.com',
      address: '苏州市工业园区', credit_level: 'AAA', business_license: 'BL003', tax_number: '91320500000000003',
      bank_name: '交通银行', bank_account: '6222000000000003',
      settlement_method: '分期', payment_terms: '验收后付清', cooperation_status: 'active', status: 1, remark: '自动录入',
    },
  ];

  for (const s of suppliers) {
    const { json } = await apiCall('POST', '/api/purchase/suppliers', s);
    if (json.success) {
      stats.success++;
      console.log(`  ✓ ${s.supplier_code} - ${s.supplier_name}`);
    } else if (json.message && (json.message.includes('已存在') || json.message.includes('Duplicate'))) {
      // 已存在则尝试 PUT 更新
      const { json: putJson } = await apiCall('PUT', '/api/purchase/suppliers', s);
      if (putJson.success) {
        stats.success++;
        console.log(`  ✓ ${s.supplier_code} - ${s.supplier_name}（更新）`);
      } else {
        stats.skip++;
        console.log(`  - ${s.supplier_code} 跳过（已存在）`);
      }
    } else {
      stats.fail++;
      stats.errors.push(`supplier ${s.supplier_code}: ${json.message}`);
      console.log(`  ✗ ${s.supplier_code} 失败: ${json.message}`);
    }
  }
}

// ========== 4. 仓库 ==========

async function step4_Warehouses() {
  console.log('\n[4/10] 仓库管理...');
  const warehouses = [
    { code: 'WH-RAW-01', name: '原材料仓', type: 'raw', address: 'A区1号', status: 'active', remark: '自动录入' },
    { code: 'WH-FIN-01', name: '成品仓', type: 'finished', address: 'B区2号', status: 'active', remark: '自动录入' },
    { code: 'WH-SEM-01', name: '半成品仓', type: 'semi', address: 'C区3号', status: 'active', remark: '自动录入' },
    { code: 'WH-SCR-01', name: '废品仓', type: 'scrap', address: 'D区4号', status: 'active', remark: '自动录入' },
  ];

  for (const w of warehouses) {
    const { json } = await apiCall('POST', '/api/warehouse', w);
    if (json.success) {
      stats.success++;
      console.log(`  ✓ ${w.code} - ${w.name}`);
    } else if (json.message && (json.message.includes('Duplicate') || json.message.includes('已存在'))) {
      stats.skip++;
      console.log(`  - ${w.code} 跳过（已存在）`);
    } else {
      stats.fail++;
      stats.errors.push(`warehouse ${w.code}: ${json.message}`);
      console.log(`  ✗ ${w.code} 失败: ${json.message}`);
    }
  }
}

// ========== 5. 物料（SQL 直接插入，API 无 POST） ==========

async function step5_Materials() {
  console.log('\n[5/10] 物料管理（SQL 直接插入）...');
  const now = new Date();
  const materials = [
    ['M-DEMO-001', 'PET聚酯薄膜', '50μm白色', 1, '卷', 'PET-W50', '达昌', 100, 500, 50, 12.5, 18.0, 10.0],
    ['M-DEMO-002', 'OPP光膜', '30μm透明', 1, '卷', 'OPP-T30', '达昌', 80, 400, 40, 9.5, 14.0, 7.5],
    ['M-DEMO-003', 'PVC不干胶', '80μm白色', 1, '卷', 'PVC-W80', '达昌', 120, 600, 60, 15.0, 22.0, 12.0],
    ['M-DEMO-004', 'UV油墨-黑', '1000ml/瓶', 4, '瓶', 'UV-BK-1000', 'DIC', 20, 100, 10, 280.0, 0, 240.0],
    ['M-DEMO-005', 'UV油墨-白', '1000ml/瓶', 4, '瓶', 'UV-WH-1000', 'DIC', 20, 100, 10, 300.0, 0, 260.0],
    ['M-DEMO-006', 'UV油墨-蓝', '1000ml/瓶', 4, '瓶', 'UV-BL-1000', 'DIC', 15, 80, 8, 290.0, 0, 250.0],
    ['M-DEMO-007', '溶剂-异丙醇', '5L/桶', 5, '桶', 'SOL-IPA-5L', '巴斯夫', 10, 50, 5, 120.0, 0, 100.0],
    ['M-DEMO-008', '离型纸', '100g/m²', 5, '卷', 'RP-100', 'APP', 200, 1000, 100, 6.5, 9.0, 5.0],
    ['M-DEMO-009', '胶水-硬胶', '5kg/桶', 4, '桶', 'GLU-H-5K', '3M', 30, 150, 15, 180.0, 0, 150.0],
    ['M-DEMO-010', '标签成品-空调面板', '48×24mm', 3, '张', 'LBL-AC-01', '达昌', 5000, 20000, 1000, 0.35, 0.85, 0.22],
  ];

  for (const m of materials) {
    try {
      // 使用 ON DUPLICATE KEY UPDATE（material_code 唯一），避免外键冲突
      await sqlInsert(
        `INSERT INTO inv_material (
          material_code, material_name, specification, material_type, unit, barcode, brand,
          safety_stock, max_stock, min_stock, purchase_price, sale_price, cost_price,
          is_batch_managed, is_serial_managed, status, remark, deleted, create_time, update_time
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          material_name=VALUES(material_name), specification=VALUES(specification),
          material_type=VALUES(material_type), unit=VALUES(unit), barcode=VALUES(barcode), brand=VALUES(brand),
          safety_stock=VALUES(safety_stock), max_stock=VALUES(max_stock), min_stock=VALUES(min_stock),
          purchase_price=VALUES(purchase_price), sale_price=VALUES(sale_price), cost_price=VALUES(cost_price),
          status=VALUES(status), remark=VALUES(remark), deleted=0, update_time=VALUES(update_time)`,
        [...m, 1, 0, 1, '自动录入', 0, now, now]
      );
      stats.success++;
      console.log(`  ✓ ${m[0]} - ${m[1]}`);
    } catch (e) {
      stats.fail++;
      stats.errors.push(`material ${m[0]}: ${e.message}`);
      console.log(`  ✗ ${m[0]} 失败: ${e.message}`);
    }
  }
}

// ========== 6. 标准卡（已有 SC-DEMO 数据，跳过） ==========

async function step6_StandardCards() {
  console.log('\n[6/10] 标准卡（已录入 SC-DEMO 数据，跳过）');
  const [rows] = await dbConn.query(
    "SELECT COUNT(*) AS cnt FROM prd_standard_card WHERE card_no LIKE 'SC-DEMO-%' AND deleted=0"
  );
  const count = rows[0].cnt;
  if (count > 0) {
    stats.skip += count;
    console.log(`  - 跳过 ${count} 条（已存在 SC-DEMO 数据）`);
  } else {
    console.log('  - 无 SC-DEMO 数据，请先运行 seed-standard-cards.cjs');
  }
}

// ========== 7. 采购订单 ==========

async function step7_PurchaseOrders() {
  console.log('\n[7/10] 采购订单...');
  // 查询供应商 ID
  const [suppliers] = await dbConn.query(
    "SELECT id, supplier_code FROM pur_supplier WHERE supplier_code IN ('S-DEMO-001','S-DEMO-002') AND deleted=0"
  );
  if (suppliers.length === 0) {
    console.log('  - 无可用供应商，跳过');
    return;
  }

  // 查询物料 ID（采购订单 API 要求 lines 中 material_id 必填）
  const [mats] = await dbConn.query(
    "SELECT id, material_code, material_name, unit, cost_price FROM inv_material WHERE material_code IN ('M-DEMO-001','M-DEMO-002','M-DEMO-004','M-DEMO-005','M-DEMO-006') AND deleted=0"
  );
  const matMap = new Map(mats.map(m => [m.material_code, m]));

  const today = new Date().toISOString().split('T')[0];
  const plus3 = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const pos = [
    {
      supplier_id: suppliers[0].id,
      supplier_code: 'S-DEMO-001',
      supplier_name: '广州原材料供应商',
      order_date: today, delivery_date: plus3,
      currency: 'CNY', exchange_rate: 1.0, tax_rate: 13,
      payment_terms: '货到付款', delivery_address: '工厂 A 区',
      remark: '自动录入 - PET/OPP 采购',
      lines: [
        { material_id: matMap.get('M-DEMO-001')?.id, material_code: 'M-DEMO-001', material_name: 'PET聚酯薄膜', material_spec: '50μm白色', unit: '卷', order_qty: 100, unit_price: 12.5, require_date: plus3 },
        { material_id: matMap.get('M-DEMO-002')?.id, material_code: 'M-DEMO-002', material_name: 'OPP光膜', material_spec: '30μm透明', unit: '卷', order_qty: 80, unit_price: 9.5, require_date: plus3 },
      ],
    },
    {
      supplier_id: suppliers[1] ? suppliers[1].id : suppliers[0].id,
      supplier_code: suppliers[1] ? 'S-DEMO-002' : 'S-DEMO-001',
      supplier_name: suppliers[1] ? '东莞辅料供应商' : '广州原材料供应商',
      order_date: today, delivery_date: plus3,
      currency: 'CNY', exchange_rate: 1.0, tax_rate: 13,
      payment_terms: '预付30%', delivery_address: '工厂 B 区',
      remark: '自动录入 - 油墨采购',
      lines: [
        { material_id: matMap.get('M-DEMO-004')?.id, material_code: 'M-DEMO-004', material_name: 'UV油墨-黑', material_spec: '1000ml/瓶', unit: '瓶', order_qty: 20, unit_price: 280.0 },
        { material_id: matMap.get('M-DEMO-005')?.id, material_code: 'M-DEMO-005', material_name: 'UV油墨-白', material_spec: '1000ml/瓶', unit: '瓶', order_qty: 20, unit_price: 300.0 },
        { material_id: matMap.get('M-DEMO-006')?.id, material_code: 'M-DEMO-006', material_name: 'UV油墨-蓝', material_spec: '1000ml/瓶', unit: '瓶', order_qty: 15, unit_price: 290.0 },
      ],
    },
  ];

  for (const po of pos) {
    const { json } = await apiCall('POST', '/api/purchase/orders', po);
    if (json.success) {
      stats.success++;
      console.log(`  ✓ 采购订单创建成功 (supplier=${po.supplier_code}, lines=${po.lines.length})`);
    } else {
      stats.fail++;
      stats.errors.push(`purchase_order: ${json.message}`);
      console.log(`  ✗ 失败: ${json.message}`);
    }
  }
}

// ========== 8. 销售订单 ==========

async function step8_SalesOrders() {
  console.log('\n[8/10] 销售订单（SQL 直接插入）...');
  // SQL 直接插入，避免 API 层 500（sal_order_item.material_id bigint unsigned null 问题）
  const [customers] = await dbConn.query(
    "SELECT id, customer_code, customer_name FROM crm_customer WHERE customer_code IN ('C-DEMO-001','C-DEMO-002') AND deleted=0"
  );
  if (customers.length === 0) {
    console.log('  - 无可用客户，跳过');
    return;
  }

  // 查询物料 ID
  const [mats] = await dbConn.query(
    "SELECT id, material_code, material_name, unit, sale_price FROM inv_material WHERE material_code IN ('M-DEMO-010','M-DEMO-001','M-DEMO-002') AND deleted=0"
  );
  const matMap = new Map(mats.map(m => [m.material_code, m]));

  const today = new Date().toISOString().split('T')[0];
  const plus14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const plus21 = new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0];

  // 清理旧 DEMO 数据
  await dbConn.query("DELETE FROM sal_order_item WHERE remark LIKE '自动录入%'");
  await dbConn.query("DELETE FROM sal_order WHERE remark LIKE '自动录入%'");

  const orders = [
    {
      customer: customers[0], orderDate: today, deliveryDate: plus14,
      payment: '月结30天', contract: 'CT-2024-001', remark: '自动录入 - 标签订单',
      items: [
        { mat: matMap.get('M-DEMO-010'), qty: 5000, price: 0.85 },
      ],
    },
    {
      customer: customers[1] || customers[0], orderDate: today, deliveryDate: plus21,
      payment: '月结45天', contract: 'CT-2024-002', remark: '自动录入 - 薄膜订单',
      items: [
        { mat: matMap.get('M-DEMO-001'), qty: 200, price: 18.0 },
        { mat: matMap.get('M-DEMO-002'), qty: 150, price: 14.0 },
      ],
    },
  ];

  for (const order of orders) {
    try {
      const orderNo = 'SO-DEMO-' + Date.now().toString().slice(-6);
      // 注意：sal_order 表没有 customer_name 列（仅 customer_id 外键）
      // 13 列 = 4 ?(订单字段) + 1 字面值(status) + 5 ?(业务字段) + NOW() + NOW() + 0
      const result = await sqlInsert(
        `INSERT INTO sal_order (
          order_no, customer_id, order_date, delivery_date, status,
          salesman_id, payment_terms, contract_no, remark,
          create_by, create_time, update_time, deleted
        ) VALUES (?,?,?,?,1,?,?,?,?,?,NOW(),NOW(),0)`,
        [orderNo, order.customer.id, order.orderDate, order.deliveryDate, 1, order.payment, order.contract, order.remark, 1]
      );
      const orderId = result.insertId;
      let total = 0;
      for (const item of order.items) {
        const amount = item.qty * item.price;
        total += amount;
        // sal_order_item 实际列：id, order_id, material_name, quantity, unit, unit_price, total_price, remark, create_time
        await sqlInsert(
          `INSERT INTO sal_order_item (
            order_id, material_name, quantity, unit, unit_price, total_price, remark, create_time
          ) VALUES (?,?,?,?,?,?,?,NOW())`,
          [orderId, item.mat.material_name, item.qty, item.mat.unit, item.price, amount, order.remark]
        );
      }
      // 更新金额
      await dbConn.query('UPDATE sal_order SET total_amount=?, total_with_tax=? WHERE id=?', [total, total * 1.13, orderId]);
      stats.success++;
      console.log(`  ✓ 销售订单 ${orderNo} (customer=${order.customer.customer_name}, items=${order.items.length}, total=${total.toFixed(2)})`);
    } catch (e) {
      stats.fail++;
      stats.errors.push(`sales_order: ${e.message}`);
      console.log(`  ✗ 失败: ${e.message.slice(0, 100)}`);
    }
  }
}

// ========== 9. 库存入库（直接 SQL，避免复杂业务联动） ==========

async function step9_Inventory() {
  console.log('\n[9/10] 库存入库（SQL 直接插入批次库存）...');
  // 查询仓库和物料
  const [warehouses] = await dbConn.query(
    "SELECT id, warehouse_code FROM inv_warehouse WHERE warehouse_code = 'WH-RAW-01' AND deleted=0"
  );
  const [materials] = await dbConn.query(
    "SELECT id, material_code, material_name, unit, cost_price FROM inv_material WHERE material_code IN ('M-DEMO-001','M-DEMO-002','M-DEMO-004') AND deleted=0"
  );
  if (warehouses.length === 0 || materials.length === 0) {
    console.log('  - 无可用仓库或物料，跳过');
    return;
  }

  const wid = warehouses[0].id;
  const wname = warehouses[0].warehouse_name || '原材料仓';
  const now = new Date();
  const batchNo = (d) => `B${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  for (const m of materials) {
    const qty = 50;
    const bno = `${batchNo(now)}-${m.material_code.slice(-3)}`;
    try {
      // 批次库存 - 使用 ON DUPLICATE KEY UPDATE，避免重复执行时外键冲突
      await sqlInsert(
        `INSERT INTO inv_inventory_batch (
          batch_no, material_id, material_name, warehouse_id, warehouse_name,
          quantity, available_qty, locked_qty, unit_price, unit,
          status, produce_date, expire_date, inbound_date,
          deleted, create_time, update_time
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)
        ON DUPLICATE KEY UPDATE
          quantity=VALUES(quantity), available_qty=VALUES(available_qty),
          unit_price=VALUES(unit_price), update_time=VALUES(update_time)`,
        [bno, m.id, m.material_name, wid, wname, qty, qty, 0, m.cost_price, m.unit, 1, now, now, now, now, now]
      );
      stats.success++;
      console.log(`  ✓ 入库 ${bno} - ${m.material_name} × ${qty} ${m.unit}`);
    } catch (e) {
      stats.fail++;
      stats.errors.push(`inventory ${bno}: ${e.message}`);
      console.log(`  ✗ ${bno} 失败: ${e.message.slice(0, 100)}`);
    }
  }
}

// ========== 10. 质量检验 ==========

async function step10_QualityInspection() {
  console.log('\n[10/10] 质量检验（SQL 直接插入）...');
  // 先建表（如不存在）- 用 IF NOT EXISTS 避免重复创建
  const createMainTable = `CREATE TABLE IF NOT EXISTS qc_incoming_inspection (
    id int NOT NULL AUTO_INCREMENT,
    inspection_no varchar(50) NOT NULL COMMENT '检验单号',
    inspection_date date NOT NULL COMMENT '检验日期',
    supplier_name varchar(100) NOT NULL COMMENT '供应商',
    material_code varchar(50) DEFAULT NULL COMMENT '物料编码',
    material_name varchar(100) NOT NULL COMMENT '物料名称',
    specification varchar(100) NOT NULL COMMENT '规格',
    batch_no varchar(50) NOT NULL COMMENT '批次号',
    quantity decimal(10,2) NOT NULL COMMENT '数量',
    unit varchar(20) NOT NULL COMMENT '单位',
    inspection_type varchar(20) NOT NULL COMMENT '检验类型',
    inspection_result varchar(20) NOT NULL COMMENT '检验结果',
    inspector_name varchar(50) NOT NULL COMMENT '检验员',
    remark text COMMENT '备注',
    create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted tinyint NOT NULL DEFAULT '0' COMMENT '删除状态',
    PRIMARY KEY (id),
    UNIQUE KEY uk_inspection_no (inspection_no),
    KEY idx_inspection_date (inspection_date),
    KEY idx_supplier_name (supplier_name),
    KEY idx_material_name (material_name),
    KEY idx_batch_no (batch_no),
    KEY idx_inspection_result (inspection_result)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='进料检验主表'`;

  const createItemTable = `CREATE TABLE IF NOT EXISTS qc_incoming_inspection_item (
    id int NOT NULL AUTO_INCREMENT,
    inspection_id int NOT NULL COMMENT '检验单ID',
    inspection_no varchar(50) NOT NULL COMMENT '检验单号',
    item_name varchar(100) NOT NULL COMMENT '检验项目',
    standard varchar(255) NOT NULL COMMENT '标准要求',
    actual_value varchar(255) DEFAULT NULL COMMENT '实际值',
    result varchar(20) NOT NULL COMMENT '检验结果',
    remark text COMMENT '备注',
    create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted tinyint NOT NULL DEFAULT '0' COMMENT '删除状态',
    PRIMARY KEY (id),
    KEY idx_inspection_id (inspection_id),
    KEY idx_inspection_no (inspection_no),
    KEY idx_item_name (item_name),
    KEY idx_result (result),
    CONSTRAINT fk_qc_incoming_item_inspection FOREIGN KEY (inspection_id) REFERENCES qc_incoming_inspection (id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='进料检验明细表'`;

  try {
    await dbConn.query(createMainTable);
    await dbConn.query(createItemTable);
    console.log('  建表 qc_incoming_inspection（如不存在）');
  } catch (e) {
    if (!e.message.includes('already exists')) {
      console.log('  建表警告:', e.message.slice(0, 100));
    }
  }

  // 清理旧 DEMO 数据
  await dbConn.query("DELETE FROM qc_incoming_inspection_item WHERE inspection_no LIKE 'IQC-DEMO-%'");
  await dbConn.query("DELETE FROM qc_incoming_inspection WHERE inspection_no LIKE 'IQC-DEMO-%'");

  const today = new Date().toISOString().split('T')[0];
  const inspections = [
    {
      no: 'IQC-DEMO-001', date: today, supplier: '广州原材料供应商',
      matCode: 'M-DEMO-001', matName: 'PET聚酯薄膜', spec: '50μm白色', batch: 'B20260713-001',
      qty: 50, unit: '卷', type: 'incoming', result: 'pass', inspector: '赵质',
      remark: '自动录入 - 进料检验合格',
      items: [
        ['厚度', '50±2μm', '51μm', 'pass'],
        ['宽度', '≥1000mm', '1020mm', 'pass'],
        ['外观', '无破损', '合格', 'pass'],
      ],
    },
    {
      no: 'IQC-DEMO-002', date: today, supplier: '东莞辅料供应商',
      matCode: 'M-DEMO-004', matName: 'UV油墨-黑', spec: '1000ml/瓶', batch: 'B20260713-004',
      qty: 20, unit: '瓶', type: 'incoming', result: 'pass', inspector: '赵质',
      remark: '自动录入 - 油墨进料检验合格',
      items: [
        ['粘度', '20-25s', '22s', 'pass'],
        ['颜色', '比对样板', '符合', 'pass'],
        ['细度', '≤10μm', '8μm', 'pass'],
      ],
    },
  ];

  for (const ins of inspections) {
    try {
      const result = await sqlInsert(
        `INSERT INTO qc_incoming_inspection (
          inspection_no, inspection_date, supplier_name, material_code, material_name,
          specification, batch_no, quantity, unit, inspection_type, inspection_result,
          inspector_name, remark
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ins.no, ins.date, ins.supplier, ins.matCode, ins.matName, ins.spec, ins.batch, ins.qty, ins.unit, ins.type, ins.result, ins.inspector, ins.remark]
      );
      const insId = result.insertId;
      // 插入明细
      for (const item of ins.items) {
        await sqlInsert(
          `INSERT INTO qc_incoming_inspection_item (
            inspection_id, inspection_no, item_name, standard, actual_value, result, remark
          ) VALUES (?,?,?,?,?,?,?)`,
          [insId, ins.no, item[0], item[1], item[2], item[3], '']
        );
      }
      stats.success++;
      console.log(`  ✓ ${ins.no} - ${ins.matName} (${ins.items.length} 项明细)`);
    } catch (e) {
      stats.fail++;
      stats.errors.push(`quality ${ins.no}: ${e.message}`);
      console.log(`  ✗ ${ins.no} 失败: ${e.message.slice(0, 100)}`);
    }
  }
}

// ========== 主流程 ==========

(async () => {
  console.log('====================================');
  console.log('  全项目自动录入数据');
  console.log('====================================');
  console.log(`时间: ${new Date().toLocaleString()}`);
  console.log(`API: ${API_BASE}`);

  // 连接数据库
  dbConn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
  });
  console.log('数据库连接成功');

  try {
    await step1_Login();
    await step2_Customers();
    await step3_Suppliers();
    await step4_Warehouses();
    await step5_Materials();
    await step6_StandardCards();
    await step7_PurchaseOrders();
    await step8_SalesOrders();
    await step9_Inventory();
    await step10_QualityInspection();
  } catch (e) {
    console.error('\n❌ 执行异常:', e.message);
    stats.errors.push(`exception: ${e.message}`);
  } finally {
    await dbConn.end();
  }

  console.log('\n====================================');
  console.log('  录入完成');
  console.log('====================================');
  console.log(`  成功: ${stats.success}`);
  console.log(`  跳过: ${stats.skip}`);
  console.log(`  失败: ${stats.fail}`);
  if (stats.errors.length > 0) {
    console.log('\n  错误详情:');
    for (const err of stats.errors) {
      console.log(`    - ${err}`);
    }
  }
  process.exit(stats.fail > 0 ? 1 : 0);
})();
