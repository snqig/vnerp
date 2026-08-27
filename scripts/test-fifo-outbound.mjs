import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('[test-fifo] ! 未找到 .env 文件');
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

  console.log('[test-fifo] 连接数据库成功');

  try {
    console.log('\n=== 1. 查询当前批次库存 ===');
    const [batches] = await conn.execute(
      `SELECT id, batch_no, available_qty, quantity, inbound_date, expire_date, version 
       FROM inv_inventory_batch 
       WHERE material_id = 1 AND warehouse_id = 1 AND deleted = 0 AND status = 1 
       ORDER BY inbound_date ASC`
    );
    console.log(`找到 ${batches.length} 个批次:`);
    batches.forEach(b => console.log(`  - ${b.batch_no}: available=${b.available_qty}, qty=${b.quantity}, inbound=${b.inbound_date}, version=${b.version}`));

    console.log('\n=== 2. 查询待出库订单 ===');
    const [orders] = await conn.execute(
      `SELECT id, order_no, status, total_qty, remark 
       FROM inv_outbound_order 
       WHERE order_no LIKE 'OUT-FIFO-%' AND deleted = 0 
       ORDER BY id ASC`
    );
    console.log(`找到 ${orders.length} 个 FIFO 测试订单:`);
    orders.forEach(o => console.log(`  - id=${o.id}, no=${o.order_no}, status=${o.status}, qty=${o.total_qty}, remark=${o.remark}`));

    if (orders.length === 0) {
      console.log('[test-fifo] 没有找到 FIFO 测试订单，请先运行 seed-fifo-test-data.mjs');
      return;
    }

    let testOrder = null;
    for (const order of orders) {
      if (order.status === 'completed') continue;
      const [items] = await conn.execute(
        `SELECT id FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
        [order.id]
      );
      if (items.length > 0) {
        testOrder = order;
        break;
      }
    }

    if (!testOrder) {
      console.log('[test-fifo] 没有找到带有出库明细的测试订单');
      return;
    }
    console.log(`\n=== 3. 测试订单: ${testOrder.order_no} (id=${testOrder.id}) ===`);

    const [items] = await conn.execute(
      `SELECT id, material_id, material_name, quantity, batch_no 
       FROM inv_outbound_item 
       WHERE order_id = ? AND deleted = 0`,
      [testOrder.id]
    );
    console.log('出库明细:');
    items.forEach(item => console.log(`  - 物料ID=${item.material_id}, 名称=${item.material_name}, 数量=${item.quantity}, 指定批次=${item.batch_no || '无(自动FIFO)'}`));

    const [orderRow] = await conn.execute(
      `SELECT id, order_no, status, warehouse_id, warehouse_code, warehouse_name, version 
       FROM inv_outbound_order WHERE id = ? AND deleted = 0`,
      [testOrder.id]
    );
    const order = orderRow[0];

    console.log(`\n=== 4. 模拟 FIFO 分配流程 ===`);
    
    const requiredQty = parseFloat(items[0].quantity);
    console.log(`需求数量: ${requiredQty}`);

    const [availableBatches] = await conn.execute(
      `SELECT id, batch_no, material_id, material_name,
        available_qty, unit_price, inbound_date, unit, expire_date,
        version
      FROM inv_inventory_batch
      WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 1
      ORDER BY 
        expire_date ASC,
        inbound_date ASC,
        id ASC`,
      [items[0].material_id, order.warehouse_id]
    );

    console.log(`\n可用批次（按 FIFO 策略排序）:`);
    availableBatches.forEach((b, idx) => console.log(`  ${idx+1}. ${b.batch_no}: available=${b.available_qty}, inbound=${b.inbound_date}, expire=${b.expire_date}`));

    let remaining = requiredQty;
    const allocations = [];
    for (const batch of availableBatches) {
      if (remaining <= 0) break;
      const available = parseFloat(batch.available_qty);
      const allocate = Math.min(remaining, available);
      allocations.push({
        batch_id: batch.id,
        batch_no: batch.batch_no,
        allocate_qty: allocate,
        available_qty_before: available,
        unit_price: parseFloat(batch.unit_price || 0),
        version: batch.version
      });
      remaining -= allocate;
    }

    console.log(`\nFIFO 分配结果:`);
    allocations.forEach(a => console.log(`  - ${a.batch_no}: 分配 ${a.allocate_qty} (之前可用 ${a.available_qty_before})`));
    
    if (remaining > 0) {
      console.log(`  ! 缺料: ${remaining}`);
    } else {
      console.log(`  ✓ 完全满足需求`);
    }

    console.log('\n=== 5. 执行事务扣减 ===');
    await conn.beginTransaction();
    try {
      for (const alloc of allocations) {
        const [result] = await conn.execute(
          `UPDATE inv_inventory_batch SET
            quantity = quantity - ?,
            available_qty = available_qty - ?,
            version = version + 1,
            update_time = NOW()
          WHERE id = ? AND available_qty >= ? AND version = ?`,
          [alloc.allocate_qty, alloc.allocate_qty, alloc.batch_id, alloc.allocate_qty, alloc.version]
        );
        console.log(`  ✓ ${alloc.batch_no}: affectedRows=${result.affectedRows}`);
        
        if (result.affectedRows === 0) {
          throw new Error(`乐观锁冲突: ${alloc.batch_no}`);
        }
      }

      await conn.execute(
        `UPDATE inv_outbound_order SET
          status = 'completed',
          audit_status = '1',
          auditor_name = '测试操作员',
          audit_time = NOW(),
          version = version + 1,
          update_time = NOW()
        WHERE id = ?`,
        [testOrder.id]
      );

      const [items] = await conn.execute(
        `SELECT id FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
        [testOrder.id]
      );
      for (let i = 0; i < items.length && i < allocations.length; i++) {
        await conn.execute(
          `UPDATE inv_outbound_item SET batch_no = ? WHERE id = ?`,
          [allocations[i].batch_no, items[i].id]
        );
      }

      await conn.commit();
      console.log(`\n✓ 事务提交成功！`);
    } catch (error) {
      await conn.rollback();
      console.log(`\n✗ 事务回滚: ${error.message}`);
      throw error;
    }

    console.log('\n=== 6. 验证库存扣减结果 ===');
    const [updatedBatches] = await conn.execute(
      `SELECT batch_no, available_qty, quantity, version 
       FROM inv_inventory_batch 
       WHERE material_id = 1 AND warehouse_id = 1 AND deleted = 0 AND status = 1 
       ORDER BY inbound_date ASC`
    );
    console.log('扣减后批次状态:');
    updatedBatches.forEach(b => console.log(`  - ${b.batch_no}: available=${b.available_qty}, qty=${b.quantity}, version=${b.version}`));

    const totalAvailable = updatedBatches.reduce((sum, b) => sum + parseFloat(b.available_qty), 0);
    console.log(`\n总可用量: ${totalAvailable}`);

    console.log('\n=== 7. 查询库存流水 ===');
    try {
      const [logs] = await conn.execute(
        `SELECT id, operation_type, operation_qty, before_qty, after_qty, business_no, create_time 
         FROM inv_inventory_log 
         WHERE business_no = ? 
         ORDER BY id DESC LIMIT 10`,
        [testOrder.order_no]
      );
      console.log(`找到 ${logs.length} 条流水记录:`);
      logs.forEach(log => console.log(`  - id=${log.id}: type=${log.operation_type}, qty=${log.operation_qty}, before=${log.before_qty}, after=${log.after_qty}, time=${log.create_time}`));
    } catch (e) {
      console.log(`库存流水查询失败（可能表结构不同）: ${e.message}`);
    }

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('[test-fifo] 执行失败:', err);
  process.exit(1);
});
