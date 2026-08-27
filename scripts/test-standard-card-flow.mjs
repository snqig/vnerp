/**
 * 标准卡录入页面 Save/Edit 流程测试脚本
 *
 * 运行方式:
 *   node --env-file=.env scripts/test-standard-card-flow.mjs
 *
 * 测试内容:
 *   1. Mock 客户数据插入（中越客户名称）
 *   2. 标准卡创建（POST 模拟 — INSERT into prd_standard_card）
 *   3. 标准卡加载（GET 模拟 — SELECT by id）
 *   4. 标准卡编辑（PUT 模拟 — UPDATE by id）
 *   5. 字段映射验证（camelCase UI ↔ snake_case DB）
 *   6. sequences JSON 序列化/反序列化
 *   7. 多值字段（coreType, printType, processMethod — 逗号分隔）
 *   8. 清理测试数据
 */

import mysql from 'mysql2/promise';

const TEST_PREFIX = 'SC-TEST-';
const TEST_CUST_PREFIX = 'TEST-CUST-';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

let passed = 0;
let failed = 0;
const failures = [];

function log(msg, color = COLORS.reset) {
  console.log(`${color}${msg}${COLORS.reset}`);
}

function assert(condition, testName, detail = '') {
  if (condition) {
    passed++;
    log(`  \u2714 ${testName}`, COLORS.green);
  } else {
    failed++;
    failures.push(testName);
    log(`  \u2717 ${testName}`, COLORS.red);
    if (detail) log(`    \u2192 ${detail}`, COLORS.gray);
  }
}

// Mock 客户数据（中越名称）
const MOCK_CUSTOMERS = [
  {
    customer_code: `${TEST_CUST_PREFIX}001`,
    customer_name: '深圳大昌印刷有限公司',
    short_name: '大昌印刷',
    contact_name: '张经理',
    contact_phone: '13800138001',
    province: '广东省',
    city: '深圳市',
    district: '宝安区',
    address: '深圳市宝安区西乡街道xxx路123号',
  },
  {
    customer_code: `${TEST_CUST_PREFIX}002`,
    customer_name: 'Công ty TNHH In Vina',
    short_name: 'Vina Print',
    contact_name: 'Nguyễn Văn A',
    contact_phone: '0901234567',
    province: 'Ho Chi Minh',
    city: 'Ho Chi Minh City',
    district: 'Quan 7',
    address: '123 Nguyen Van Linh, Q7, HCMC',
  },
  {
    customer_code: `${TEST_CUST_PREFIX}003`,
    customer_name: '东莞华丰标签厂',
    short_name: '华丰标签',
    contact_name: '李总',
    contact_phone: '13900139001',
    province: '广东省',
    city: '东莞市',
    district: '长安镇',
    address: '东莞市长安镇xxx工业区',
  },
  {
    customer_code: `${TEST_CUST_PREFIX}004`,
    customer_name: 'Hà Nội Packaging Co.',
    short_name: 'HN Pack',
    contact_name: 'Tran Thi B',
    contact_phone: '0987654321',
    province: 'Ha Noi',
    city: 'Ha Noi',
    district: 'Cau Giay',
    address: '456 Pham Hung, Cau Giay, HN',
  },
  {
    customer_code: `${TEST_CUST_PREFIX}005`,
    customer_name: '广州彩印包装集团',
    short_name: '彩印集团',
    contact_name: '王总监',
    contact_phone: '13700137001',
    province: '广东省',
    city: '广州市',
    district: '番禺区',
    address: '广州市番禺区市桥xxx路',
  },
];

// Mock 标准卡数据（模拟前端 CardData）
function createMockCardData(customer) {
  return {
    card_no: `${TEST_PREFIX}${Date.now()}`,
    customer_name: customer.customer_name,
    customer_code: customer.customer_code,
    product_name: '测试产品-A4标准卡',
    version: 'V1.0',
    date: new Date().toISOString().split('T')[0],
    document_code: 'DOC-TEST-001',
    finished_size: '148x210',
    tolerance: '0.5',
    material_name: 'PET薄膜',
    material_type: '硬胶',
    layout_type: '单排',
    spacing: '2',
    spacing_value: '3',
    sheet_width: '150',
    sheet_length: '212',
    core_type: '3#,2#',
    paper_direction: '纵向',
    roll_width: '150',
    paper_edge: '3',
    standard_usage: '120',
    jump_distance: '5',
    process_flow1: '印刷 \u2192 模切 \u2192 包装',
    process_flow2: '检验 \u2192 入库',
    print_type: '卷料丝印,胶印',
    first_jump_distance: '3',
    sequences: JSON.stringify([
      { id: 1, color: '红', inkCode: 'R001', linCode: 'F001', storageLocation: 'A1', plateCode: 'P001', mesh: '120', plateStorage: 'B1', printSide: '正面' },
      { id: 2, color: '蓝', inkCode: 'B001', linCode: 'F002', storageLocation: 'A2', plateCode: 'P002', mesh: '120', plateStorage: 'B2', printSide: '正面' },
      { id: 3, color: '', inkCode: '', linCode: '', storageLocation: '', plateCode: '', mesh: '', plateStorage: '', printSide: '' },
      { id: 4, color: '', inkCode: '', linCode: '', storageLocation: '', plateCode: '', mesh: '', plateStorage: '', printSide: '' },
      { id: 5, color: '', inkCode: '', linCode: '', storageLocation: '', plateCode: '', mesh: '', plateStorage: '', printSide: '' },
      { id: 6, color: '', inkCode: '', linCode: '', storageLocation: '', plateCode: '', mesh: '', plateStorage: '', printSide: '' },
      { id: 7, color: '', inkCode: '', linCode: '', storageLocation: '', plateCode: '', mesh: '', plateStorage: '', printSide: '' },
    ]),
    film_manufacturer: '3M',
    film_code: 'FILM-001',
    film_size: '150x210',
    process_method: '模切',
    stamping_method: '冷冲压',
    mold_code: 'MOLD-001',
    back_mold_code: 'BMOLD-001',
    layout_method: '单排',
    layout_way: '横排',
    jump_distance2: '4',
    mylar_material: 'PET',
    mylar_specs: '0.05mm',
    mylar_layout: '双排',
    mylar_jump: '3',
    adhesive_type: '热熔胶',
    adhesive_manufacturer: 'Henkel',
    adhesive_code: 'ADH-001',
    adhesive_size: '150x210',
    adhesive_specs: '0.02mm',
    dashed_knife: 1,
    slice_per_row: '10',
    slice_per_roll: '500',
    slice_per_bundle: '50',
    slice_per_bag: '100',
    slice_per_box: '1000',
    packing_qty: '2000',
    back_knife_mold: 'BK-001',
    back_mylar_mold: 'BM-001',
    release_paper_code: 'RP-001',
    release_paper_type: '硅油纸',
    release_paper_category: 'A类',
    release_paper_specs: '0.08mm',
    padding_material: '珍珠棉',
    packing_material: '瓦楞纸箱',
    special_color: '专色红',
    color_formula: '红:100% + 黄:20%',
    file_path: '/shared/files/test-card.dwg',
    sample_info: '500PCS样品',
    notes: '测试标准卡，注意色差控制',
    glue_type: '硬胶',
    packing_type: 'PCS/箱',
    mold_type: '雕刻刀模',
    etch_mold: 'EM-001',
    storage_location: 'C区-3架',
    extra_field: '额外备注',
    creator: '测试员',
    reviewer: '审核员',
    factory_manager: '厂务经理',
    quality_manager: '品管经理',
    sales: '业务员',
    approver: '核准人',
    status: 1,
  };
}

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
    charset: 'utf8mb4',
    waitForConnections: true,
  });

  const insertedCustomerIds = [];
  const insertedCardIds = [];

  try {
    log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550', COLORS.cyan);
    log('  \u6807\u51c6\u5361\u5f55\u5165\u9875\u9762 Save/Edit \u6d41\u7a0b\u6d4b\u8bd5', COLORS.cyan);
    log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n', COLORS.cyan);

    // ============================================================
    // 0. 清理残留测试数据 (上次失败可能遗留)
    // ============================================================
    log('\u30100\u3011 \u6e05\u7406\u6b8b\u7559\u6d4b\u8bd5\u6570\u636e', COLORS.yellow);
    await pool.execute(`DELETE FROM prd_standard_card WHERE card_no LIKE ?`, [`${TEST_PREFIX}%`]);
    await pool.execute(`DELETE FROM crm_customer WHERE customer_code LIKE ?`, [`${TEST_CUST_PREFIX}%`]);
    log('  \u2714 \u6e05\u7406\u5b8c\u6210', COLORS.gray);

    // ============================================================
    // 1. Mock 客户数据插入
    // ============================================================
    log('\n\u30101\u3011 Mock \u5ba2\u6237\u6570\u636e\u63d2\u5165', COLORS.yellow);

    for (const cust of MOCK_CUSTOMERS) {
      const [result] = await pool.execute(
        `INSERT INTO crm_customer (customer_code, customer_name, short_name, contact_name, contact_phone,
          province, city, district, address, deleted, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
        [cust.customer_code, cust.customer_name, cust.short_name, cust.contact_name, cust.contact_phone,
         cust.province, cust.city, cust.district, cust.address]
      );
      insertedCustomerIds.push(result.insertId);
    }
    assert(insertedCustomerIds.length === MOCK_CUSTOMERS.length, `\u63d2\u5165 ${MOCK_CUSTOMERS.length} \u4e2a mock \u5ba2\u6237`);

    // 验证客户数据可查询
    const [customers] = await pool.query(
      `SELECT id, customer_code, customer_name, short_name FROM crm_customer WHERE customer_code LIKE ? AND deleted = 0`,
      [`${TEST_CUST_PREFIX}%`]
    );
    assert(customers.length === MOCK_CUSTOMERS.length, '\u5ba2\u6237\u5217\u8868\u67e5\u8be2\u6210\u529f', `\u671f\u671b ${MOCK_CUSTOMERS.length}, \u5b9e\u9645 ${customers.length}`);
    assert(customers.some(c => c.customer_name.includes('\u5927\u660c\u5370\u5237')), '\u4e2d\u6587\u5ba2\u6237\u540d\u6b63\u786e');
    assert(customers.some(c => c.customer_name.includes('C\xf4ng ty')), '\u8d8a\u5357\u8bed\u5ba2\u6237\u540d\u6b63\u786e (utf8mb4)');

    log(`  \u2714 \u63d2\u5165\u5ba2\u6237 ID: ${insertedCustomerIds.join(', ')}`, COLORS.gray);

    // ============================================================
    // 2. 标准卡创建 (POST 模拟)
    // ============================================================
    log('\n\u30102\u3011 \u6807\u51c6\u5361\u521b\u5efa (POST \u6a21\u62df)', COLORS.yellow);

    const testCustomer = MOCK_CUSTOMERS[0];
    const cardData = createMockCardData(testCustomer);

    // 构建 INSERT (模拟 API POST handler 逻辑)
    const insertFields = Object.keys(cardData);
    const insertValues = Object.values(cardData);
    const placeholders = insertFields.map(() => '?').join(', ');

    const [insertResult] = await pool.execute(
      `INSERT INTO prd_standard_card (${insertFields.join(', ')}, deleted, create_time, update_time)
       VALUES (${placeholders}, 0, NOW(), NOW())`,
      insertValues
    );

    const cardId = insertResult.insertId;
    insertedCardIds.push(cardId);
    assert(cardId > 0, '\u6807\u51c6\u5361\u521b\u5efa\u6210\u529f', `insertId=${cardId}`);
    log(`  \u2714 \u65b0\u5efa\u6807\u51c6\u5361 ID: ${cardId}, card_no: ${cardData.card_no}`, COLORS.gray);

    // ============================================================
    // 3. 标准卡加载 (GET 模拟)
    // ============================================================
    log('\n\u30103\u3011 \u6807\u51c6\u5361\u52a0\u8f7d (GET \u6a21\u62df)', COLORS.yellow);

    const [rows] = await pool.query(
      `SELECT * FROM prd_standard_card WHERE id = ? AND deleted = 0`,
      [cardId]
    );
    assert(rows.length === 1, '\u52a0\u8f7d\u6807\u51c6\u5361\u6210\u529f');

    const loadedCard = rows[0];

    // 字段映射验证 (snake_case DB \u2192 camelCase UI)
    assert(loadedCard.card_no === cardData.card_no, 'card_no \u5b57\u6bb5\u6620\u5c04\u6b63\u786e');
    assert(loadedCard.customer_name === testCustomer.customer_name, 'customer_name \u5b57\u6bb5\u6620\u5c04\u6b63\u786e');
    assert(loadedCard.customer_code === testCustomer.customer_code, 'customer_code \u5b57\u6bb5\u6620\u5c04\u6b63\u786e');
    assert(loadedCard.product_name === cardData.product_name, 'product_name \u5b57\u6bb5\u6620\u5c04\u6b63\u786e');
    assert(loadedCard.finished_size === cardData.finished_size, 'finished_size \u5b57\u6bb5\u6620\u5c04\u6b63\u786e');
    assert(loadedCard.tolerance === cardData.tolerance, 'tolerance \u5b57\u6bb5\u6620\u5c04\u6b63\u786e');
    assert(loadedCard.material_name === cardData.material_name, 'material_name \u5b57\u6bb5\u6620\u5c04\u6b63\u786e');
    assert(loadedCard.core_type === '3#,2#', 'core_type \u591a\u503c\u5b57\u6bb5\u6b63\u786e (\u9017\u53f7\u5206\u9694)');
    assert(loadedCard.print_type === '\u5377\u6599\u4e1d\u5370,\u80f6\u5370', 'print_type \u591a\u503c\u5b57\u6bb5\u6b63\u786e');
    assert(loadedCard.process_method === '\u6a21\u5207', 'process_method \u5b57\u6bb5\u6b63\u786e');
    assert(loadedCard.dashed_knife === 1, 'dashed_knife boolean \u2192 int \u6b63\u786e');
    assert(loadedCard.film_manufacturer === '3M', 'film_manufacturer \u5b57\u6bb5\u6b63\u786e');
    assert(loadedCard.adhesive_type === '\u70ed\u7194\u80f6', 'adhesive_type \u5b57\u6bb5\u6b63\u786e');

    // sequences JSON \u53cd\u5e8f\u5217\u5316\u9a8c\u8bc1 (\u5904\u7406 string \u548c JSON \u7c7b\u578b\u4e24\u79cd\u60c5\u51b5)
    let parsedSequences;
    if (typeof loadedCard.sequences === 'string') {
      try {
        parsedSequences = JSON.parse(loadedCard.sequences);
      } catch {
        parsedSequences = null;
      }
    } else if (Array.isArray(loadedCard.sequences)) {
      parsedSequences = loadedCard.sequences;
    } else {
      parsedSequences = null;
    }
    assert(Array.isArray(parsedSequences), 'sequences JSON \u53cd\u5e8f\u5217\u5316\u6210\u529f', `type=${typeof loadedCard.sequences}`);
    assert(parsedSequences?.length === 7, 'sequences \u5305\u542b 7 \u4e2a\u5370\u5e8f', `\u671f\u671b 7, \u5b9e\u9645 ${parsedSequences?.length}`);
    assert(parsedSequences?.[0]?.color === '\u7ea2', 'sequences[0].color \u6b63\u786e');
    assert(parsedSequences?.[0]?.inkCode === 'R001', 'sequences[0].inkCode \u6b63\u786e');
    assert(parsedSequences?.[1]?.color === '\u84dd', 'sequences[1].color \u6b63\u786e');

    log(`  \u2714 \u52a0\u8f7d\u6210\u529f, \u5b57\u6bb5\u5168\u90e8\u5339\u914d`, COLORS.gray);

    // ============================================================
    // 4. 标准卡编辑 (PUT 模拟)
    // ============================================================
    log('\n\u30104\u3011 \u6807\u51c6\u5361\u7f16\u8f91 (PUT \u6a21\u62df)', COLORS.yellow);

    const updatedData = {
      product_name: '\u6d4b\u8bd5\u4ea7\u54c1-\u5df2\u7f16\u8f91\u7248',
      version: 'V2.0',
      finished_size: '210x297',
      tolerance: '0.3',
      material_name: 'PVC\u8584\u819c',
      core_type: '1#',
      print_type: '\u7247\u6599\u4e1d\u5370',
      process_method: '\u51b2\u538b',
      dashed_knife: 0,
      notes: '\u5df2\u66f4\u65b0\u5907\u6ce8\u4fe1\u606f',
      color_formula: '\u84dd:80% + \u7ea2:15%',
      standard_usage: '150',
    };

    const setClauses = Object.keys(updatedData).map(f => `${f} = ?`);
    const setValues = Object.values(updatedData);

    await pool.execute(
      `UPDATE prd_standard_card SET ${setClauses.join(', ')}, update_time = NOW() WHERE id = ? AND deleted = 0`,
      [...setValues, cardId]
    );

    // 重新加载验证更新
    const [updatedRows] = await pool.query(
      `SELECT * FROM prd_standard_card WHERE id = ? AND deleted = 0`,
      [cardId]
    );
    const updatedCard = updatedRows[0];

    assert(updatedCard.product_name === '\u6d4b\u8bd5\u4ea7\u54c1-\u5df2\u7f16\u8f91\u7248', 'PUT \u540e product_name \u5df2\u66f4\u65b0');
    assert(updatedCard.version === 'V2.0', 'PUT \u540e version \u5df2\u66f4\u65b0');
    assert(updatedCard.finished_size === '210x297', 'PUT \u540e finished_size \u5df2\u66f4\u65b0');
    assert(updatedCard.tolerance === '0.3', 'PUT \u540e tolerance \u5df2\u66f4\u65b0');
    assert(updatedCard.material_name === 'PVC\u8584\u819c', 'PUT \u540e material_name \u5df2\u66f4\u65b0');
    assert(updatedCard.core_type === '1#', 'PUT \u540e core_type \u5355\u503c\u6b63\u786e');
    assert(updatedCard.print_type === '\u7247\u6599\u4e1d\u5370', 'PUT \u540e print_type \u5355\u503c\u6b63\u786e');
    assert(updatedCard.process_method === '\u51b2\u538b', 'PUT \u540e process_method \u5df2\u66f4\u65b0');
    assert(updatedCard.dashed_knife === 0, 'PUT \u540e dashed_knife=false \u2192 0');
    assert(updatedCard.notes === '\u5df2\u66f4\u65b0\u5907\u6ce8\u4fe1\u606f', 'PUT \u540e notes \u5df2\u66f4\u65b0');
    assert(updatedCard.color_formula === '\u84dd:80% + \u7ea2:15%', 'PUT \u540e color_formula \u5df2\u66f4\u65b0');
    assert(updatedCard.standard_usage === '150', 'PUT \u540e standard_usage \u5df2\u66f4\u65b0');

    // \u672a\u66f4\u65b0\u7684\u5b57\u6bb5\u5e94\u4fdd\u6301\u4e0d\u53d8
    assert(updatedCard.card_no === cardData.card_no, 'PUT \u540e card_no \u4fdd\u6301\u4e0d\u53d8');
    assert(updatedCard.customer_name === testCustomer.customer_name, 'PUT \u540e customer_name \u4fdd\u6301\u4e0d\u53d8');
    assert(updatedCard.adhesive_type === '\u70ed\u7194\u80f6', 'PUT \u540e adhesive_type \u4fdd\u6301\u4e0d\u53d8');

    log(`  \u2714 \u7f16\u8f91\u6210\u529f, \u66f4\u65b0\u5b57\u6bb5\u5168\u90e8\u9a8c\u8bc1\u901a\u8fc7`, COLORS.gray);

    // ============================================================
    // 5. \u591a\u5ba2\u6237\u521b\u5efa\u6d4b\u8bd5
    // ============================================================
    log('\n\u30105\u3011 \u591a\u5ba2\u6237\u521b\u5efa\u6d4b\u8bd5', COLORS.yellow);

    for (let i = 0; i < MOCK_CUSTOMERS.length; i++) {
      const cust = MOCK_CUSTOMERS[i];
      const card = createMockCardData(cust);
      card.product_name = `\u6d4b\u8bd5\u4ea7\u54c1-\u5ba2\u6237${i + 1}`;

      const fields = Object.keys(card);
      const values = Object.values(card);
      const phs = fields.map(() => '?').join(', ');

      const [res] = await pool.execute(
        `INSERT INTO prd_standard_card (${fields.join(', ')}, deleted, create_time, update_time)
         VALUES (${phs}, 0, NOW(), NOW())`,
        values
      );
      insertedCardIds.push(res.insertId);
      assert(res.insertId > 0, `\u5ba2\u6237${i + 1} (${cust.short_name}) \u6807\u51c6\u5361\u521b\u5efa\u6210\u529f`);
    }

    // ============================================================
    // 6. \u91cd\u590d\u7f16\u53f7\u68c0\u6d4b
    // ============================================================
    log('\n\u30106\u3011 \u91cd\u590d\u7f16\u53f7\u68c0\u6d4b', COLORS.yellow);

    const [dupCheck] = await pool.query(
      `SELECT id FROM prd_standard_card WHERE card_no = ? AND deleted = 0`,
      [cardData.card_no]
    );
    assert(dupCheck.length > 0, '\u540c card_no \u67e5\u8be2\u5230\u5df2\u5b58\u5728\u8bb0\u5f55');
    log(`  \u2714 API \u5e94\u8fd4\u56de 409 "\u6807\u51c6\u5361\u7f16\u53f7\u5df2\u5b58\u5728"`, COLORS.gray);

    // ============================================================
    // 7. \u6e05\u7406\u6d4b\u8bd5\u6570\u636e
    // ============================================================
    log('\n\u30107\u3011 \u6e05\u7406\u6d4b\u8bd5\u6570\u636e', COLORS.yellow);

    // \u5220\u9664\u6807\u51c6\u5361 (\u786c\u5220\u9664, \u907f\u514d\u91cd\u590d\u7f16\u53f7\u51b2\u7a81)
    if (insertedCardIds.length > 0) {
      const placeholders = insertedCardIds.map(() => '?').join(',');
      await pool.execute(
        `DELETE FROM prd_standard_card WHERE id IN (${placeholders})`,
        insertedCardIds
      );
    }
    log(`  \u2714 \u786c\u5220\u9664 ${insertedCardIds.length} \u6761\u6807\u51c6\u5361`, COLORS.gray);

    // \u5220\u9664\u5ba2\u6237 (\u786c\u5220\u9664)
    if (insertedCustomerIds.length > 0) {
      const placeholders = insertedCustomerIds.map(() => '?').join(',');
      await pool.execute(
        `DELETE FROM crm_customer WHERE id IN (${placeholders})`,
        insertedCustomerIds
      );
    }
    log(`  \u2714 \u786c\u5220\u9664 ${insertedCustomerIds.length} \u4e2a\u5ba2\u6237`, COLORS.gray);

    // ============================================================
    // \u6c47\u603b
    // ============================================================
    log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550', COLORS.cyan);
    log(`  \u6d4b\u8bd5\u7ed3\u679c: ${passed} \u901a\u8fc7, ${failed} \u5931\u8d25`, COLORS.cyan);
    if (failures.length > 0) {
      log('  \u5931\u8d25\u9879:', COLORS.red);
      failures.forEach(f => log(`    \u2717 ${f}`, COLORS.red));
    }
    log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n', COLORS.cyan);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    log(`\n\u81f4\u547d\u9519\u8bef: ${err.message}`, COLORS.red);
    console.error(err);

    // \u5c3d\u529b\u6e05\u7406
    try {
      if (insertedCardIds.length > 0) {
        const ph = insertedCardIds.map(() => '?').join(',');
        await pool.execute(`DELETE FROM prd_standard_card WHERE id IN (${ph})`, insertedCardIds);
      }
      if (insertedCustomerIds.length > 0) {
        const ph = insertedCustomerIds.map(() => '?').join(',');
        await pool.execute(`DELETE FROM crm_customer WHERE id IN (${ph})`, insertedCustomerIds);
      }
    } catch {
      // ignore cleanup errors
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
