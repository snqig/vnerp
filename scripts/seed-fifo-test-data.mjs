/**
 * FIFO 引擎测试数据脚本
 * 用途：构造模拟出库单数据，用于测试 FIFO 分配算法
 *
 * 用法：
 *   node scripts/seed-fifo-test-data.mjs
 *
 * 功能：
 *   1. 查询现有物料和仓库数据
 *   2. 为测试物料创建多个库存批次（模拟不同入库时间）
 *   3. 创建待出库的出库单（不指定批次号，触发 FIFO 自动分配）
 *   4. 打印创建的测试数据信息
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('[seed-fifo-test] ! 未找到 .env 文件');
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnv();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerp',
  });

  console.log('[seed-fifo-test] 连接数据库成功');

  try {
    const [materials] = await conn.execute(
      `SELECT id, material_code, material_name, unit FROM inv_material WHERE deleted = 0 AND status = 1 LIMIT 10`
    );
    console.log(`\n[seed-fifo-test] 找到 ${materials.length} 个物料:`);
    materials.forEach(m => console.log(`  - id=${m.id}, code=${m.material_code}, name=${m.material_name}, unit=${m.unit}`));

    const [warehouses] = await conn.execute(
      `SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE deleted = 0 AND status = 1 LIMIT 5`
    );
    console.log(`\n[seed-fifo-test] 找到 ${warehouses.length} 个仓库:`);
    warehouses.forEach(w => console.log(`  - id=${w.id}, code=${w.warehouse_code}, name=${w.warehouse_name}`));

    const testMaterial = materials[0];
    const testWarehouse = warehouses[0];

    if (!testMaterial || !testWarehouse) {
      console.error('[seed-fifo-test] 缺少测试所需的物料或仓库数据');
      return;
    }

    console.log(`\n[seed-fifo-test] 使用测试物料: ${testMaterial.material_name} (id=${testMaterial.id})`);
    console.log(`[seed-fifo-test] 使用测试仓库: ${testWarehouse.warehouse_name} (id=${testWarehouse.id})`);

    const [existingBatches] = await conn.execute(
      `SELECT id, batch_no, available_qty, inbound_date, expire_date, status FROM inv_inventory_batch
       WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 AND status = 1`,
      [testMaterial.id, testWarehouse.id]
    );
    console.log(`\n[seed-fifo-test] 该物料在仓库中已有 ${existingBatches.length} 个批次`);

    const batchConfigs = [
      { batchNo: `FIFO-TEST-${Date.now()}-001`, qty: 200, inboundDate: '2026-01-10', expireDate: '2027-01-10', price: 10.00 },
      { batchNo: `FIFO-TEST-${Date.now()}-002`, qty: 300, inboundDate: '2026-02-15', expireDate: '2027-02-15', price: 11.00 },
      { batchNo: `FIFO-TEST-${Date.now()}-003`, qty: 150, inboundDate: '2026-03-20', expireDate: '2027-03-20', price: 12.00 },
      { batchNo: `FIFO-TEST-${Date.now()}-004`, qty: 250, inboundDate: '2026-04-05', expireDate: '2027-04-05', price: 10.50 },
      { batchNo: `FIFO-TEST-${Date.now()}-005`, qty: 100, inboundDate: '2026-05-10', expireDate: '2027-05-10', price: 11.50, opened: true },
    ];

    const createdBatches = [];
    for (const config of batchConfigs) {
      try {
        await conn.execute(
          `INSERT INTO inv_inventory_batch (
            batch_no, material_id, material_name,
            warehouse_id, quantity, available_qty,
            unit_price, unit, inbound_date, expire_date,
            status, deleted, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1)`,
          [
            config.batchNo,
            testMaterial.id,
            testMaterial.material_name,
            testWarehouse.id,
            config.qty,
            config.qty,
            config.price,
            testMaterial.unit,
            config.inboundDate,
            config.expireDate,
          ]
        );
        createdBatches.push(config);
        console.log(`[seed-fifo-test] 创建批次: ${config.batchNo}, qty=${config.qty}, inbound=${config.inboundDate}`);
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`[seed-fifo-test] 批次已存在: ${config.batchNo}`);
        } else {
          throw err;
        }
      }
    }

    const [invCheck] = await conn.execute(
      `SELECT id, quantity, available_qty FROM inv_inventory
       WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
      [testMaterial.id, testWarehouse.id]
    );

    let inventoryId = null;
    if (invCheck.length > 0) {
      inventoryId = invCheck[0].id;
      const currentQty = parseFloat(invCheck[0].quantity) || 0;
      const totalNewQty = batchConfigs.reduce((sum, b) => sum + b.qty, 0);
      await conn.execute(
        `UPDATE inv_inventory SET quantity = quantity + ?, available_qty = available_qty + ?, update_time = NOW() WHERE id = ?`,
        [totalNewQty, totalNewQty, inventoryId]
      );
      console.log(`\n[seed-fifo-test] 更新库存记录: id=${inventoryId}, 增加 ${totalNewQty}`);
    } else {
      await conn.execute(
        `INSERT INTO inv_inventory (material_id, material_code, material_name, warehouse_id, warehouse_code, warehouse_name, quantity, available_qty, unit, status, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
        [
          testMaterial.id,
          testMaterial.material_code,
          testMaterial.material_name,
          testWarehouse.id,
          testWarehouse.warehouse_code,
          testWarehouse.warehouse_name,
          1000,
          1000,
          testMaterial.unit,
        ]
      );
      const [rows] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      inventoryId = rows[0].id;
      console.log(`\n[seed-fifo-test] 创建库存记录: id=${inventoryId}`);
    }

    const outboundTestCases = [
      {
        name: 'FIFO-TEST-001: 单批次可满足需求',
        orderNo: `OUT-FIFO-${Date.now()}-001`,
        items: [{ materialId: testMaterial.id, qty: 150 }],
      },
      {
        name: 'FIFO-TEST-002: 跨批次分配（需2个批次）',
        orderNo: `OUT-FIFO-${Date.now()}-002`,
        items: [{ materialId: testMaterial.id, qty: 250 }],
      },
      {
        name: 'FIFO-TEST-003: 跨多批次分配（需3个批次）',
        orderNo: `OUT-FIFO-${Date.now()}-003`,
        items: [{ materialId: testMaterial.id, qty: 550 }],
      },
      {
        name: 'FIFO-TEST-004: 接近全部库存（需4个批次）',
        orderNo: `OUT-FIFO-${Date.now()}-004`,
        items: [{ materialId: testMaterial.id, qty: 800 }],
      },
      {
        name: 'FIFO-TEST-005: 库存不足场景',
        orderNo: `OUT-FIFO-${Date.now()}-005`,
        items: [{ materialId: testMaterial.id, qty: 2000 }],
      },
    ];

    const createdOrders = [];
    for (const testCase of outboundTestCases) {
      const totalQty = testCase.items.reduce((sum, item) => sum + item.qty, 0);

      await conn.execute(
        `INSERT INTO inv_outbound_order (
          order_no, order_date, outbound_type,
          warehouse_id, warehouse_code, warehouse_name,
          total_qty, total_amount, currency, status,
          remark, operator_id, operator_name,
          audit_status, create_time, update_time, deleted, version
        ) VALUES (?, NOW(), 'test', ?, ?, ?, ?, 0, 'CNY', 'pending', ?, 1, '测试操作员', 0, NOW(), NOW(), 0, 1)`,
        [
          testCase.orderNo,
          testWarehouse.id,
          testWarehouse.warehouse_code,
          testWarehouse.warehouse_name,
          totalQty,
          testCase.name,
        ]
      );

      const [orderRows] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const orderId = orderRows[0].id;

      for (const item of testCase.items) {
        const [material] = await conn.execute(
          `SELECT material_name, unit FROM inv_material WHERE id = ?`,
          [item.materialId]
        );
        const mat = material[0];

        await conn.execute(
          `INSERT INTO inv_outbound_item (
            order_id, material_id, material_name,
            quantity, unit, batch_no, create_time, deleted
          ) VALUES (?, ?, ?, ?, ?, NULL, NOW(), 0)`,
          [orderId, item.materialId, mat.material_name, item.qty, mat.unit]
        );
      }

      createdOrders.push({ orderId, orderNo: testCase.orderNo, ...testCase });
      console.log(`\n[seed-fifo-test] 创建出库单: id=${orderId}, no=${testCase.orderNo}`);
      console.log(`  ${testCase.name}`);
      testCase.items.forEach(item => console.log(`    - 物料ID: ${item.materialId}, 数量: ${item.qty}`));
    }

    console.log(`\n========================================`);
    console.log(`FIFO 测试数据创建完成！`);
    console.log(`========================================`);
    console.log(`\n测试批次汇总（共 ${createdBatches.length} 个）:`);
    createdBatches.forEach((b, idx) => {
      console.log(`  ${idx + 1}. ${b.batchNo}`);
      console.log(`     - 数量: ${b.qty}`);
      console.log(`     - 入库时间: ${b.inboundDate}`);
      console.log(`     - 单价: ¥${b.price}`);
      console.log(`     - 已开封: ${b.opened ? '是' : '否'}`);
    });

    console.log(`\n测试出库单汇总（共 ${createdOrders.length} 个）:`);
    createdOrders.forEach((o, idx) => {
      console.log(`  ${idx + 1}. ${o.orderNo} (ID: ${o.orderId})`);
      console.log(`     - ${o.name}`);
      console.log(`     - 状态: pending（待确认出库）`);
      console.log(`     - 确认出库 API: POST /api/warehouse/outbound/confirm`);
      console.log(`     - 请求体: {"id": ${o.orderId}, "operatorId": 1, "operatorName": "测试操作员"}`);
    });

    console.log(`\n测试建议:`);
    console.log(`1. 使用 API 确认出库单 OUT-FIFO-xxx-001 ~ 004，观察服务器日志中的 FIFO 分配过程`);
    console.log(`2. 确认 OUT-FIFO-xxx-005（库存不足场景），观察缺料错误信息`);
    console.log(`3. 检查 inv_inventory_batch 表，验证批次扣减是否正确`);
    console.log(`4. 检查 inv_inventory_log 表，验证库存流水记录是否完整`);

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('[seed-fifo-test] 执行失败:', err);
  process.exit(1);
});
