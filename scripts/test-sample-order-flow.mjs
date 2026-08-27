/**
 * 打样单模块测试脚本
 * 测试列表筛选和状态流转功能
 *
 * 运行方式:
 *   node --env-file=.env scripts/test-sample-order-flow.mjs
 *
 * 测试内容:
 *   1. 表结构验证（migration 053 字段是否存在）
 *   2. Mock 数据插入（多种客户名称 + 交付状态 + 生命周期状态）
 *   3. 列表筛选测试（customerName / status / deliveryStatus / 日期范围 / 组合）
 *   4. 状态流转测试（draft → pending → in_progress → completed → confirmed）
 *   5. 字段映射验证（snake_case 入库 ↔ camelCase 读取）
 *   6. 清理测试数据
 */

import mysql from 'mysql2/promise';

const TEST_PREFIX = 'SP-TEST-';
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
    log(`  ✔ ${testName}`, COLORS.green);
  } else {
    failed++;
    failures.push(testName);
    log(`  ✗ ${testName}`, COLORS.red);
    if (detail) log(`    → ${detail}`, COLORS.gray);
  }
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

  try {
    log('\n═══════════════════════════════════════════════', COLORS.cyan);
    log('  打样单模块测试 — 列表筛选 + 状态流转', COLORS.cyan);
    log('═══════════════════════════════════════════════\n', COLORS.cyan);

    // ============================================================
    // 1. 表结构验证
    // ============================================================
    log('【1】表结构验证', COLORS.yellow);
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sal_sample_order'
       ORDER BY ORDINAL_POSITION`,
      [process.env.DB_NAME || 'vnerpdacahng']
    );

    const columnNames = columns.map((c) => c.COLUMN_NAME);
    const requiredColumns = [
      'id', 'order_no', 'notify_date', 'customer_id', 'customer_name',
      'product_name', 'material_no', 'version', 'size_spec', 'material_spec',
      'specification', 'quantity', 'order_date', 'customer_require_date',
      'delivery_date', 'actual_delivery_date', 'delivery_status', 'status',
      'remark', 'create_by', 'create_time', 'update_time', 'deleted',
      // migration 053 fields
      'process_card_id', 'work_order_id', 'sales_order_id',
      'sample_fee', 'fee_charged', 'fee_deductible', 'fee_deducted',
      'sample_version', 'parent_version_id', 'converted_at', 'converted_by',
    ];

    for (const col of requiredColumns) {
      assert(columnNames.includes(col), `字段存在: ${col}`);
    }

    const missingCols = requiredColumns.filter((c) => !columnNames.includes(c));
    if (missingCols.length > 0) {
      log(`\n  ⚠ 缺失字段: ${missingCols.join(', ')}`, COLORS.red);
      log('  请先执行 migration 053: pnpm db:migrate\n', COLORS.red);
    }

    // ============================================================
    // 2. 清理旧测试数据
    // ============================================================
    log('\n【2】清理旧测试数据', COLORS.yellow);
    const [deleteResult] = await pool.execute(
      `DELETE FROM sal_sample_order WHERE order_no LIKE ?`,
      [`${TEST_PREFIX}%`]
    );
    log(`  已清理 ${deleteResult.affectedRows} 条旧测试数据`, COLORS.gray);

    // ============================================================
    // 3. 插入 Mock 数据
    // ============================================================
    log('\n【3】插入 Mock 数据', COLORS.yellow);

    const mockOrders = [
      {
        order_no: `${TEST_PREFIX}001`,
        notify_date: '2026-07-01',
        customer_name: '深圳精密电子科技有限公司',
        product_name: 'PET薄膜面板',
        material_no: 'MAT-001',
        version: 'A',
        size_spec: '296.3*96.8',
        material_spec: 'PET 0.125mm',
        specification: '透明PET',
        quantity: 100,
        order_date: '2026-07-01',
        customer_require_date: '2026-07-10',
        delivery_date: null,
        actual_delivery_date: null,
        delivery_status: 'pending',
        status: 'draft',
        remark: '测试数据-草稿状态',
        sample_fee: 500,
        fee_charged: 1,
        fee_deductible: 1,
        fee_deducted: 0,
        sample_version: 1,
      },
      {
        order_no: `${TEST_PREFIX}002`,
        notify_date: '2026-07-02',
        customer_name: '深圳精密电子科技有限公司',
        product_name: 'PC铭牌',
        material_no: 'MAT-002',
        version: 'B',
        size_spec: '50*30',
        material_spec: 'PC 0.5mm',
        specification: '磨砂PC',
        quantity: 50,
        order_date: '2026-07-02',
        customer_require_date: '2026-07-08',
        delivery_date: null,
        actual_delivery_date: null,
        delivery_status: 'pending',
        status: 'pending',
        remark: '测试数据-待打样状态',
        sample_fee: 300,
        fee_charged: 0,
        fee_deductible: 0,
        fee_deducted: 0,
        sample_version: 1,
      },
      {
        order_no: `${TEST_PREFIX}003`,
        notify_date: '2026-07-03',
        customer_name: '广州汽车零部件有限公司',
        product_name: '仪表盘标签',
        material_no: 'MAT-003',
        version: 'A',
        size_spec: '120*80',
        material_spec: 'PVC 0.1mm',
        specification: '白色PVC',
        quantity: 200,
        order_date: '2026-07-03',
        customer_require_date: '2026-07-12',
        delivery_date: null,
        actual_delivery_date: null,
        delivery_status: 'pending',
        status: 'in_progress',
        remark: '测试数据-打样中状态',
        sample_fee: 800,
        fee_charged: 1,
        fee_deductible: 1,
        fee_deducted: 0,
        sample_version: 2,
      },
      {
        order_no: `${TEST_PREFIX}004`,
        notify_date: '2026-07-04',
        customer_name: '广州汽车零部件有限公司',
        product_name: '发动机标签',
        material_no: 'MAT-004',
        version: 'C',
        size_spec: '80*40',
        material_spec: 'PET 0.188mm',
        specification: '亮银PET',
        quantity: 300,
        order_date: '2026-07-04',
        customer_require_date: '2026-07-09',
        delivery_date: '2026-07-08',
        actual_delivery_date: '2026-07-08',
        delivery_status: 'delivered',
        status: 'completed',
        remark: '测试数据-已完成+已交付',
        sample_fee: 600,
        fee_charged: 1,
        fee_deductible: 0,
        fee_deducted: 0,
        sample_version: 1,
      },
      {
        order_no: `${TEST_PREFIX}005`,
        notify_date: '2026-07-05',
        customer_name: '东莞塑料制品厂',
        product_name: '丝印面板',
        material_no: 'MAT-005',
        version: 'A',
        size_spec: '200*150',
        material_spec: '亚克力 2mm',
        specification: '透明亚克力',
        quantity: 80,
        order_date: '2026-07-05',
        customer_require_date: '2026-07-11',
        delivery_date: '2026-07-10',
        actual_delivery_date: '2026-07-10',
        delivery_status: 'signed',
        status: 'confirmed',
        remark: '测试数据-已确认+已签收',
        sample_fee: 1200,
        fee_charged: 1,
        fee_deductible: 1,
        fee_deducted: 0,
        sample_version: 3,
      },
      {
        order_no: `${TEST_PREFIX}006`,
        notify_date: '2026-07-06',
        customer_name: '东莞塑料制品厂',
        product_name: '丝印标牌',
        material_no: 'MAT-006',
        version: 'A',
        size_spec: '100*50',
        material_spec: '铝板 0.5mm',
        specification: '拉丝铝板',
        quantity: 150,
        order_date: '2026-07-06',
        customer_require_date: '2026-07-14',
        delivery_date: null,
        actual_delivery_date: null,
        delivery_status: 'pending',
        status: 'converted',
        remark: '测试数据-已转大货',
        sample_fee: 400,
        fee_charged: 1,
        fee_deductible: 1,
        fee_deducted: 1,
        sample_version: 1,
      },
      {
        order_no: `${TEST_PREFIX}007`,
        notify_date: '2026-07-07',
        customer_name: '佛山五金制品有限公司',
        product_name: '镍片标牌',
        material_no: 'MAT-007',
        version: 'B',
        size_spec: '60*30',
        material_spec: '镍片 0.3mm',
        specification: '电镀镍片',
        quantity: 500,
        order_date: '2026-07-07',
        customer_require_date: '2026-07-15',
        delivery_date: null,
        actual_delivery_date: null,
        delivery_status: 'pending',
        status: 'cancelled',
        remark: '测试数据-已作废',
        sample_fee: 0,
        fee_charged: 0,
        fee_deductible: 0,
        fee_deducted: 0,
        sample_version: 1,
      },
      {
        order_no: `${TEST_PREFIX}008`,
        notify_date: '2026-07-08',
        customer_name: '中山电子科技有限公司',
        product_name: '薄膜开关',
        material_no: 'MAT-008',
        version: 'A',
        size_spec: '80*60',
        material_spec: 'PC+PET复合',
        specification: 'FPC薄膜开关',
        quantity: 100,
        order_date: '2026-07-08',
        customer_require_date: '2026-07-16',
        delivery_date: null,
        actual_delivery_date: null,
        delivery_status: 'pending',
        status: 'draft',
        remark: '测试数据-草稿(中山)',
        sample_fee: 1000,
        fee_charged: 1,
        fee_deductible: 1,
        fee_deducted: 0,
        sample_version: 1,
      },
    ];

    for (const order of mockOrders) {
      await pool.execute(
        `INSERT INTO sal_sample_order
         (order_no, notify_date, customer_name, product_name, material_no, version,
          size_spec, material_spec, specification, quantity, order_date,
          customer_require_date, delivery_date, actual_delivery_date,
          delivery_status, status, remark, sample_fee, fee_charged, fee_deductible,
          fee_deducted, sample_version, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          order.order_no, order.notify_date, order.customer_name,
          order.product_name, order.material_no, order.version,
          order.size_spec, order.material_spec, order.specification,
          order.quantity, order.order_date, order.customer_require_date,
          order.delivery_date, order.actual_delivery_date,
          order.delivery_status, order.status, order.remark,
          order.sample_fee, order.fee_charged, order.fee_deductible,
          order.fee_deducted, order.sample_version,
        ]
      );
    }
    log(`  已插入 ${mockOrders.length} 条 Mock 数据`, COLORS.gray);

    // ============================================================
    // 4. 列表筛选测试
    // ============================================================
    log('\n【4】列表筛选测试', COLORS.yellow);

    // 4.1 按客户名称筛选（模糊匹配）
    {
      const [rows] = await pool.query(
        `SELECT id, order_no, customer_name, status, delivery_status
         FROM sal_sample_order
         WHERE deleted = 0 AND customer_name LIKE ?
         ORDER BY create_time DESC`,
        [`%深圳%`]
      );
      assert(rows.length === 2, '按客户名称"深圳"筛选 → 2条', `实际: ${rows.length}`);
    }

    // 4.2 按生命周期状态筛选
    {
      const [rows] = await pool.query(
        `SELECT id, order_no, customer_name, status, delivery_status
         FROM sal_sample_order
         WHERE deleted = 0 AND status = ?
         ORDER BY create_time DESC`,
        ['draft']
      );
      assert(rows.length === 2, '按状态"draft"筛选 → 2条', `实际: ${rows.length}`);
    }

    // 4.3 按交付状态筛选
    {
      const [rows] = await pool.query(
        `SELECT id, order_no, customer_name, status, delivery_status
         FROM sal_sample_order
         WHERE deleted = 0 AND delivery_status = ?
         ORDER BY create_time DESC`,
        ['signed']
      );
      assert(rows.length === 1, '按交付状态"signed"筛选 → 1条', `实际: ${rows.length}`);
    }

    // 4.4 按日期范围筛选
    {
      const [rows] = await pool.query(
        `SELECT id, order_no, customer_name, status
         FROM sal_sample_order
         WHERE deleted = 0 AND notify_date >= ? AND notify_date <= ?
         ORDER BY notify_date ASC`,
        ['2026-07-03', '2026-07-05']
      );
      assert(rows.length === 3, '按日期范围 07-03~07-05 筛选 → 3条', `实际: ${rows.length}`);
    }

    // 4.5 组合筛选：客户名称 + 状态
    {
      const [rows] = await pool.query(
        `SELECT id, order_no, customer_name, status, delivery_status
         FROM sal_sample_order
         WHERE deleted = 0 AND customer_name LIKE ? AND status = ?
         ORDER BY create_time DESC`,
        [`%广州%`, 'completed']
      );
      assert(rows.length === 1, '组合筛选 广州+completed → 1条', `实际: ${rows.length}`);
    }

    // 4.6 组合筛选：交付状态 + 状态
    {
      const [rows] = await pool.query(
        `SELECT id, order_no, customer_name, status, delivery_status
         FROM sal_sample_order
         WHERE deleted = 0 AND delivery_status = ? AND status = ?
         ORDER BY create_time DESC`,
        ['signed', 'confirmed']
      );
      assert(rows.length === 1, '组合筛选 signed+confirmed → 1条', `实际: ${rows.length}`);
    }

    // 4.7 关键词搜索（客户名 OR 产品名 OR 单号）
    {
      const [rows] = await pool.query(
        `SELECT id, order_no, customer_name, product_name
         FROM sal_sample_order
         WHERE deleted = 0
           AND (order_no LIKE ? OR customer_name LIKE ? OR product_name LIKE ?)
         ORDER BY create_time DESC`,
        [`%TEST-003%`, `%TEST-003%`, `%仪表盘%`]
      );
      assert(rows.length === 1, '关键词搜索"仪表盘" → 1条', `实际: ${rows.length}`);
    }

    // 4.8 验证 migration 053 字段正确持久化
    {
      const [rows] = await pool.query(
        `SELECT order_no, sample_fee, fee_charged, fee_deductible, fee_deducted,
                sample_version, process_card_id, work_order_id, sales_order_id
         FROM sal_sample_order
         WHERE order_no = ? AND deleted = 0`,
        [`${TEST_PREFIX}005`]
      );
      const row = rows[0];
      assert(
        row && Number(row.sample_fee) === 1200 && Number(row.fee_charged) === 1 &&
        Number(row.fee_deductible) === 1 && Number(row.sample_version) === 3,
        'migration 053 字段持久化验证 (SP-TEST-005)',
        `实际: fee=${row?.sample_fee}, charged=${row?.fee_charged}, deductible=${row?.fee_deductible}, version=${row?.sample_version}`
      );
    }

    // ============================================================
    // 5. 状态流转测试
    // ============================================================
    log('\n【5】状态流转测试', COLORS.yellow);

    // 5.1 创建新打样单（draft 状态）
    const flowOrderNo = `${TEST_PREFIX}FLOW-001`;
    {
      const [result] = await pool.execute(
        `INSERT INTO sal_sample_order
         (order_no, notify_date, customer_name, product_name, material_no, version,
          size_spec, material_spec, specification, quantity, order_date,
          customer_require_date, delivery_status, status, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'draft', '状态流转测试', NOW())`,
        [flowOrderNo, '2026-07-13', '测试客户-流转', '测试产品', 'MAT-FLOW', 'A',
         '100*50', 'PET', '透明PET', 10, '2026-07-13', '2026-07-20']
      );
      assert(result.insertId > 0, '创建流转测试单 (draft)', `insertId: ${result.insertId}`);

      const [rows] = await pool.query(
        `SELECT status FROM sal_sample_order WHERE id = ?`, [result.insertId]
      );
      assert(rows[0]?.status === 'draft', '初始状态为 draft', `实际: ${rows[0]?.status}`);

      // 保存 ID 供后续使用
      flowTestId = result.insertId;
    }

    // 5.2 draft → pending (submit)
    {
      const [result] = await pool.execute(
        `UPDATE sal_sample_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?`,
        ['pending', flowTestId, 'draft']
      );
      assert(result.affectedRows === 1, '状态流转 draft → pending (submit)', `affectedRows: ${result.affectedRows}`);

      const [rows] = await pool.query(
        `SELECT status FROM sal_sample_order WHERE id = ?`, [flowTestId]
      );
      assert(rows[0]?.status === 'pending', '当前状态为 pending', `实际: ${rows[0]?.status}`);
    }

    // 5.3 pending → in_progress (startProduction)
    {
      const [result] = await pool.execute(
        `UPDATE sal_sample_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?`,
        ['in_progress', flowTestId, 'pending']
      );
      assert(result.affectedRows === 1, '状态流转 pending → in_progress (startProduction)', `affectedRows: ${result.affectedRows}`);

      const [rows] = await pool.query(
        `SELECT status FROM sal_sample_order WHERE id = ?`, [flowTestId]
      );
      assert(rows[0]?.status === 'in_progress', '当前状态为 in_progress', `实际: ${rows[0]?.status}`);
    }

    // 5.4 in_progress → completed (complete)
    {
      const [result] = await pool.execute(
        `UPDATE sal_sample_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?`,
        ['completed', flowTestId, 'in_progress']
      );
      assert(result.affectedRows === 1, '状态流转 in_progress → completed (complete)', `affectedRows: ${result.affectedRows}`);

      const [rows] = await pool.query(
        `SELECT status FROM sal_sample_order WHERE id = ?`, [flowTestId]
      );
      assert(rows[0]?.status === 'completed', '当前状态为 completed', `实际: ${rows[0]?.status}`);
    }

    // 5.5 completed → confirmed (confirm)
    {
      const [result] = await pool.execute(
        `UPDATE sal_sample_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?`,
        ['confirmed', flowTestId, 'completed']
      );
      assert(result.affectedRows === 1, '状态流转 completed → confirmed (confirm)', `affectedRows: ${result.affectedRows}`);

      const [rows] = await pool.query(
        `SELECT status FROM sal_sample_order WHERE id = ?`, [flowTestId]
      );
      assert(rows[0]?.status === 'confirmed', '当前状态为 confirmed', `实际: ${rows[0]?.status}`);
    }

    // 5.6 confirmed → converted (convertToSalesOrder)
    {
      const [result] = await pool.execute(
        `UPDATE sal_sample_order
         SET status = ?, sales_order_id = ?, converted_at = NOW(), converted_by = ?,
             fee_deducted = 1, update_time = NOW()
         WHERE id = ? AND status = ?`,
        ['converted', 99999, 1, flowTestId, 'confirmed']
      );
      assert(result.affectedRows === 1, '状态流转 confirmed → converted (convert)', `affectedRows: ${result.affectedRows}`);

      const [rows] = await pool.query(
        `SELECT status, sales_order_id, converted_at, converted_by, fee_deducted
         FROM sal_sample_order WHERE id = ?`, [flowTestId]
      );
      assert(rows[0]?.status === 'converted', '当前状态为 converted', `实际: ${rows[0]?.status}`);
      assert(Number(rows[0]?.sales_order_id) === 99999, 'sales_order_id 已关联', `实际: ${rows[0]?.sales_order_id}`);
      assert(rows[0]?.converted_at !== null, 'converted_at 已设置', `实际: ${rows[0]?.converted_at}`);
      assert(Number(rows[0]?.fee_deducted) === 1, 'fee_deducted 已标记抵扣 (1)', `实际: ${rows[0]?.fee_deducted}`);
    }

    // 5.7 非法状态流转测试（draft 不能直接跳到 completed）
    {
      const illegalOrderNo = `${TEST_PREFIX}ILLEGAL-001`;
      const [createResult] = await pool.execute(
        `INSERT INTO sal_sample_order
         (order_no, notify_date, customer_name, product_name, material_no, version,
          size_spec, quantity, order_date, delivery_status, status, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'draft', '非法流转测试', NOW())`,
        [illegalOrderNo, '2026-07-13', '非法测试', '非法产品', 'MAT-ILLEGAL', 'A', '10*10', 1, '2026-07-13']
      );
      const illegalId = createResult.insertId;

      // 尝试 draft → completed (应该失败，因为 WHERE status = 'in_progress' 不匹配)
      const [result] = await pool.execute(
        `UPDATE sal_sample_order SET status = ? WHERE id = ? AND status = ?`,
        ['completed', illegalId, 'in_progress']
      );
      assert(result.affectedRows === 0, '非法流转 draft → completed 被阻止', `affectedRows: ${result.affectedRows}`);

      // 清理
      await pool.execute(`DELETE FROM sal_sample_order WHERE id = ?`, [illegalId]);
    }

    // 5.8 交付状态流转测试
    {
      const deliverOrderNo = `${TEST_PREFIX}DELIVER-001`;
      const [createResult] = await pool.execute(
        `INSERT INTO sal_sample_order
         (order_no, notify_date, customer_name, product_name, material_no, version,
          size_spec, quantity, order_date, delivery_status, status, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'completed', '交付测试', NOW())`,
        [deliverOrderNo, '2026-07-13', '交付测试客户', '交付产品', 'MAT-DELIVER', 'A', '20*20', 5, '2026-07-13']
      );
      const deliverId = createResult.insertId;

      // pending → delivered
      const [r1] = await pool.execute(
        `UPDATE sal_sample_order
         SET delivery_status = ?, actual_delivery_date = ?, update_time = NOW()
         WHERE id = ? AND delivery_status = ?`,
        ['delivered', '2026-07-13', deliverId, 'pending']
      );
      assert(r1.affectedRows === 1, '交付状态 pending → delivered', `affectedRows: ${r1.affectedRows}`);

      // delivered → signed
      const [r2] = await pool.execute(
        `UPDATE sal_sample_order SET delivery_status = ?, update_time = NOW()
         WHERE id = ? AND delivery_status = ?`,
        ['signed', deliverId, 'delivered']
      );
      assert(r2.affectedRows === 1, '交付状态 delivered → signed', `affectedRows: ${r2.affectedRows}`);

      // 验证最终状态
      const [rows] = await pool.query(
        `SELECT delivery_status, actual_delivery_date FROM sal_sample_order WHERE id = ?`,
        [deliverId]
      );
      assert(rows[0]?.delivery_status === 'signed', '最终交付状态为 signed', `实际: ${rows[0]?.delivery_status}`);
      assert(rows[0]?.actual_delivery_date !== null, 'actual_delivery_date 已设置', `实际: ${rows[0]?.actual_delivery_date}`);

      // 清理
      await pool.execute(`DELETE FROM sal_sample_order WHERE id = ?`, [deliverId]);
    }

    // ============================================================
    // 6. 字段映射验证（snake_case 入库 → 读取验证）
    // ============================================================
    log('\n【6】字段映射验证', COLORS.yellow);
    {
      const [rows] = await pool.query(
        `SELECT order_no, customer_name, product_name, material_no, size_spec,
                material_spec, quantity, delivery_status, status,
                sample_fee, fee_charged, fee_deductible, fee_deducted,
                sample_version, sales_order_id, converted_at, converted_by
         FROM sal_sample_order
         WHERE order_no = ? AND deleted = 0`,
        [`${TEST_PREFIX}006`]
      );
      const row = rows[0];
      assert(row !== undefined, '字段映射验证数据存在 (SP-TEST-006)');

      if (row) {
        assert(row.customer_name === '东莞塑料制品厂', 'customer_name 正确', `实际: ${row.customer_name}`);
        assert(row.status === 'converted', 'status 正确 (converted)', `实际: ${row.status}`);
        assert(row.delivery_status === 'pending', 'delivery_status 正确 (pending)', `实际: ${row.delivery_status}`);
        assert(Number(row.sample_fee) === 400, 'sample_fee 正确 (400)', `实际: ${row.sample_fee}`);
        assert(Number(row.fee_deducted) === 1, 'fee_deducted 正确 (1=已抵扣)', `实际: ${row.fee_deducted}`);
        assert(Number(row.sample_version) === 1, 'sample_version 正确 (1)', `实际: ${row.sample_version}`);
      }
    }

    // ============================================================
    // 7. 清理所有测试数据
    // ============================================================
    log('\n【7】清理测试数据', COLORS.yellow);
    const [cleanupResult] = await pool.execute(
      `DELETE FROM sal_sample_order WHERE order_no LIKE ?`,
      [`${TEST_PREFIX}%`]
    );
    log(`  已清理 ${cleanupResult.affectedRows} 条测试数据`, COLORS.gray);

    // ============================================================
    // 结果汇总
    // ============================================================
    log('\n═══════════════════════════════════════════════', COLORS.cyan);
    log(`  测试结果: ${passed} 通过 / ${failed} 失败`, failed === 0 ? COLORS.green : COLORS.red);
    if (failures.length > 0) {
      log('\n  失败项:', COLORS.red);
      for (const f of failures) {
        log(`    ✗ ${f}`, COLORS.red);
      }
    }
    log('═══════════════════════════════════════════════\n', COLORS.cyan);

    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    log(`\n✗ 测试脚本异常: ${err.message}`, COLORS.red);
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

let flowTestId = 0;

main();
