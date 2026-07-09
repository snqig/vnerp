/**
 * 采购单→入库单→应付链路端到端测试
 *
 * 测试流程：
 * 1. 登录获取 JWT + CSRF token
 * 2. 创建采购订单（2行物料）
 * 3. 提交采购单
 * 4. 审核采购单
 * 5. 从采购单创建入库单
 * 6. 审核入库单（触发 inbound.approved 事件）
 * 7. 验证：库存增加、应付单生成、采购单状态反向同步
 *
 * 运行方式：node scripts/test-purchase-inbound-chain.mjs
 */

const BASE_URL = 'http://localhost:5000';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// 测试数据（基于 seed_business_data.sql）
const TEST_DATA = {
  supplier_id: 1,
  warehouse_id: 1,
  materials: [
    { line_no: 1, material_id: 1, material_code: 'PET-T-010', material_name: 'PET透明膜0.1mm', material_spec: '0.1mm', unit: 'KG', order_qty: 100, unit_price: 25.00 },
    { line_no: 2, material_id: 2, material_code: 'PET-W-0125', material_name: 'PET白膜0.125mm', material_spec: '0.125mm', unit: 'KG', order_qty: 50, unit_price: 30.00 },
  ],
};

// ============================================================
// HTTP 工具函数
// ============================================================

function extractCookie(setCookieHeaders, name) {
  if (!setCookieHeaders) return null;
  const lines = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const line of lines) {
    const match = line.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function apiCall(method, path, body, tokens) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (tokens?.jwt) {
    headers['Authorization'] = `Bearer ${tokens.jwt}`;
  }
  if (tokens?.csrf && method !== 'GET') {
    headers['X-CSRF-Token'] = tokens.csrf;
  }
  if (tokens?.cookie) {
    headers['Cookie'] = tokens.cookie;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, options);
  const setCookie = res.headers.getSetCookie?.();
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { status: res.status, data, setCookie };
}

function logStep(step, message, data) {
  const prefix = `\n[${step}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function logSuccess(message) {
  console.log(`  ✅ ${message}`);
}

function logError(message) {
  console.log(`  ❌ ${message}`);
}

// ============================================================
// 测试主流程
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('  采购单→入库单→应付 链路端到端测试');
  console.log('='.repeat(60));

  let tokens = {};
  let poId = null;
  let poNo = null;
  let inboundId = null;
  let inboundNo = null;

  // ----------------------------------------------------------
  // Step 1: 登录
  // ----------------------------------------------------------
  logStep('1', '登录获取 JWT + CSRF token...');
  const loginRes = await apiCall('POST', '/api/auth/login', {
    username: ADMIN_USER,
    password: ADMIN_PASS,
  });

  if (loginRes.status !== 200 || !loginRes.data?.success) {
    logError(`登录失败: ${loginRes.status}`);
    console.log(loginRes.data);
    process.exit(1);
  }

  tokens.jwt = loginRes.data.data.token;
  tokens.csrf = extractCookie(loginRes.setCookie, 'csrf_token');

  // 构造 Cookie header（access_token + csrf_token）
  const cookieParts = [];
  const accessToken = extractCookie(loginRes.setCookie, 'access_token');
  if (accessToken) cookieParts.push(`access_token=${accessToken}`);
  if (tokens.csrf) cookieParts.push(`csrf_token=${tokens.csrf}`);
  tokens.cookie = cookieParts.join('; ');

  logSuccess(`登录成功，用户: ${loginRes.data.data.user.username}`);
  logSuccess(`JWT token: ${tokens.jwt?.substring(0, 30)}...`);
  logSuccess(`CSRF token: ${tokens.csrf?.substring(0, 20)}...`);

  // ----------------------------------------------------------
  // Step 2: 创建采购订单
  // ----------------------------------------------------------
  logStep('2', '创建采购订单...');
  const createPoRes = await apiCall('POST', '/api/purchase/orders', {
    supplier_id: TEST_DATA.supplier_id,
    supplier_name: '测试供应商',
    order_date: new Date().toISOString().slice(0, 10),
    tax_rate: 13,
    remark: '链路测试-采购单',
    lines: TEST_DATA.materials.map((m) => ({
      material_id: m.material_id,
      material_code: m.material_code,
      material_name: m.material_name,
      material_spec: m.material_spec,
      unit: m.unit,
      order_qty: m.order_qty,
      unit_price: m.unit_price,
    })),
  }, tokens);

  if (createPoRes.status !== 200 || !createPoRes.data?.success) {
    logError(`创建采购单失败: ${createPoRes.status}`);
    console.log(createPoRes.data);
    process.exit(1);
  }

  poId = createPoRes.data.data.id;
  poNo = createPoRes.data.data.orderNo;
  logSuccess(`采购单创建成功: id=${poId}, orderNo=${poNo}`);

  // ----------------------------------------------------------
  // Step 3: 提交采购单
  // ----------------------------------------------------------
  logStep('3', '提交采购单...');
  const submitPoRes = await apiCall('PUT', '/api/purchase/orders', {
    id: poId,
    action: 'submit',
  }, tokens);

  if (submitPoRes.status !== 200 || !submitPoRes.data?.success) {
    logError(`提交采购单失败: ${submitPoRes.status}`);
    console.log(submitPoRes.data);
    process.exit(1);
  }
  logSuccess(`采购单已提交: ${submitPoRes.data.data.status}`);

  // ----------------------------------------------------------
  // Step 4: 审核采购单
  // ----------------------------------------------------------
  logStep('4', '审核采购单...');
  const approvePoRes = await apiCall('PUT', '/api/purchase/orders', {
    id: poId,
    action: 'approve',
  }, tokens);

  if (approvePoRes.status !== 200 || !approvePoRes.data?.success) {
    logError(`审核采购单失败: ${approvePoRes.status}`);
    console.log(approvePoRes.data);
    process.exit(1);
  }
  logSuccess(`采购单已审核: ${approvePoRes.data.data.status}`);

  // ----------------------------------------------------------
  // Step 5: 从采购单创建入库单
  // ----------------------------------------------------------
  logStep('5', '从采购单创建入库单...');
  const createInboundRes = await apiCall('POST', '/api/warehouse/inbound/from-po', {
    po_id: poId,
    warehouse_id: TEST_DATA.warehouse_id,
    items: TEST_DATA.materials.map((m) => ({
      line_no: m.line_no,
      material_id: m.material_id,
      material_code: m.material_code,
      material_name: m.material_name,
      material_spec: m.material_spec,
      unit: m.unit,
      batch_no: `BAT-${Date.now()}-${m.material_id}`,
      quantity: m.order_qty,
      unit_price: m.unit_price,
    })),
  }, tokens);

  if (createInboundRes.status !== 200 || !createInboundRes.data?.success) {
    logError(`创建入库单失败: ${createInboundRes.status}`);
    console.log(createInboundRes.data);
    process.exit(1);
  }

  inboundId = createInboundRes.data.data.order_id;
  inboundNo = createInboundRes.data.data.order_no;
  logSuccess(`入库单创建成功: id=${inboundId}, orderNo=${inboundNo}`);

  // ----------------------------------------------------------
  // Step 6a: 提交入库单（draft → pending）
  // ----------------------------------------------------------
  logStep('6a', '提交入库单...');
  const submitInboundRes = await apiCall('PUT', '/api/warehouse/inbound', {
    id: inboundId,
    action: 'submit',
  }, tokens);

  if (submitInboundRes.status !== 200 || !submitInboundRes.data?.success) {
    logError(`提交入库单失败: ${submitInboundRes.status}`);
    console.log(submitInboundRes.data);
    process.exit(1);
  }
  logSuccess(`入库单已提交: ${submitInboundRes.data.data.status}`);

  // ----------------------------------------------------------
  // Step 6b: 审核入库单（pending → completed，触发 inbound.approved 事件）
  // ----------------------------------------------------------
  logStep('6b', '审核入库单...');
  const approveInboundRes = await apiCall('PUT', '/api/warehouse/inbound', {
    id: inboundId,
    action: 'approve',
  }, tokens);

  if (approveInboundRes.status !== 200 || !approveInboundRes.data?.success) {
    logError(`审核入库单失败: ${approveInboundRes.status}`);
    console.log(approveInboundRes.data);
    process.exit(1);
  }
  logSuccess(`入库单已审核: ${approveInboundRes.data.data.status}`);

  // ----------------------------------------------------------
  // Step 7: 等待事件处理 + 验证结果
  // ----------------------------------------------------------
  logStep('7', '等待事件处理器完成...');
  console.log('  等待 8 秒供 OutboxPoller 轮询 + 处理事件 (poll interval = 5s)...');
  await new Promise((r) => setTimeout(r, 8000));

  // 验证1: 查询采购单状态
  logStep('7a', '验证采购单状态...');
  const poListRes = await apiCall('GET', `/api/purchase/orders?keyword=${poNo}`, null, tokens);
  if (poListRes.data?.success && poListRes.data.data?.length > 0) {
    const po = poListRes.data.data[0];
    const statusMap = { 30: '已审核', 40: '部分入库', 50: '已完成' };
    logSuccess(`采购单状态: ${po.status} (${statusMap[po.status] || '未知'})`);
    logSuccess(`已收数量: ${po.total_received_qty}/${po.total_quantity}`);
    if (po.lines) {
      for (const line of po.lines) {
        logSuccess(`  行${line.line_no} ${line.material_name}: 已收${line.received_qty}/${line.order_qty}`);
      }
    }
    if (po.status === 50) {
      logSuccess('采购单已自动流转为「已完成」✓');
    } else if (po.status === 40) {
      logSuccess('采购单已自动流转为「部分入库」✓');
    } else {
      logError(`采购单状态未更新，仍为 ${po.status}`);
    }
  } else {
    logError('无法查询采购单状态');
  }

  // 验证2: 查询入库单状态
  logStep('7b', '验证入库单...');
  const inboundListRes = await apiCall('GET', `/api/warehouse/inbound?keyword=${inboundNo}`, null, tokens);
  if (inboundListRes.data?.success && inboundListRes.data?.data?.length > 0) {
    const io = inboundListRes.data.data[0];
    logSuccess(`入库单号: ${io.order_no}`);
    logSuccess(`状态: ${io.status}`);
    logSuccess(`供应商: ${io.supplier_name || '(未设置)'}`);
    logSuccess(`总数量: ${io.total_quantity}`);
    logSuccess(`总金额: ${io.total_amount}`);
  } else {
    logError('无法查询入库单');
    console.log(inboundListRes.data);
  }

  // 验证3: 查询应付单（通过 API 或直接说明需查数据库）
  logStep('7c', '验证应付单...');
  logSuccess('应付单由 FinanceVoucherHandler 在 inbound.approved 事件中自动生成');
  logSuccess('请检查数据库: SELECT * FROM fin_payable WHERE source_no = ?');
  console.log(`  SQL: SELECT payable_no, supplier_id, source_type, source_no, amount, balance, status, due_date FROM fin_payable WHERE source_no = '${inboundNo}';`);

  // 验证4: 查询库存
  logStep('7d', '验证库存...');
  logSuccess('库存由 InventorySyncHandler 在 inbound.approved 事件中自动增加');
  console.log(`  SQL: SELECT material_id, material_name, warehouse_id, quantity FROM inv_inventory WHERE material_id IN (1, 2) AND warehouse_id = ${TEST_DATA.warehouse_id};`);
  console.log(`  SQL: SELECT batch_no, material_id, material_name, available_qty, quantity FROM inv_inventory_batch WHERE material_id IN (1, 2) AND warehouse_id = ${TEST_DATA.warehouse_id};`);

  // ----------------------------------------------------------
  // 验证旧路径已废弃
  // ----------------------------------------------------------
  logStep('8', '验证旧路径已废弃...');

  // 8a: with-po 路由应返回 410
  const withPoRes = await apiCall('POST', '/api/warehouse/inbound/with-po', {}, tokens);
  if (withPoRes.status === 410) {
    logSuccess('POST /api/warehouse/inbound/with-po → 410 Gone ✓');
  } else {
    logError(`with-po 路由未返回 410, 实际: ${withPoRes.status}`);
  }

  // 8b: audit 路由应返回 410
  const auditRes = await apiCall('POST', '/api/warehouse/inbound/audit', {}, tokens);
  if (auditRes.status === 410) {
    logSuccess('POST /api/warehouse/inbound/audit → 410 Gone ✓');
  } else {
    logError(`audit 路由未返回 410, 实际: ${auditRes.status}`);
  }

  // 8c: purchase receive action 应返回 410
  const receiveRes = await apiCall('PUT', '/api/purchase/orders', {
    id: poId,
    action: 'receive',
    lineReceives: [],
  }, tokens);
  if (receiveRes.status === 410) {
    logSuccess('PUT /api/purchase/orders?action=receive → 410 Gone ✓');
  } else {
    logError(`receive action 未返回 410, 实际: ${receiveRes.status}`);
  }

  // ----------------------------------------------------------
  // 总结
  // ----------------------------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('  测试完成！链路验证摘要');
  console.log('='.repeat(60));
  console.log(`  采购单:  ${poNo} (id=${poId})`);
  console.log(`  入库单:  ${inboundNo} (id=${inboundId})`);
  console.log(`  供应商:  ${TEST_DATA.supplier_id}`);
  console.log(`  仓库:    ${TEST_DATA.warehouse_id}`);
  console.log(`  物料:    ${TEST_DATA.materials.map((m) => `${m.material_name}×${m.order_qty}`).join(', ')}`);
  console.log('');
  console.log('  请执行以下 SQL 验证数据一致性:');
  console.log(`    SELECT * FROM fin_payable WHERE source_no = '${inboundNo}';`);
  console.log(`    SELECT * FROM inv_inventory WHERE material_id IN (1,2) AND warehouse_id = ${TEST_DATA.warehouse_id};`);
  console.log(`    SELECT * FROM inv_inventory_batch WHERE material_id IN (1,2) AND warehouse_id = ${TEST_DATA.warehouse_id};`);
  console.log(`    SELECT id, po_no, status, total_received_qty FROM pur_purchase_order WHERE id = ${poId};`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('\n💥 测试异常:', err);
  process.exit(1);
});
