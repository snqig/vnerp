/**
 * 验证采购→入库→应付链路的数据库状态
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// Load .env manually
const envContent = readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const INBOUND_NO = process.argv[2] || 'IN20260709000002';
const PO_ID = process.argv[3] || '187';
const WAREHOUSE_ID = 1;

async function main() {
  const pool = mysql.createPool({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'vnerpdacahng',
  });

  console.log('='.repeat(60));
  console.log(`  数据库验证 - 入库单号: ${INBOUND_NO}, 采购单ID: ${PO_ID}`);
  console.log('='.repeat(60));

  // 1. 验证应付单
  console.log('\n📋 1. fin_payable 应付单');
  const [payables] = await pool.query(
    'SELECT payable_no, supplier_id, source_type, source_no, amount, paid_amount, balance, status, due_date, remark FROM fin_payable WHERE source_no = ?',
    [INBOUND_NO]
  );
  if (payables.length > 0) {
    for (const p of payables) {
      console.log('  ✅', JSON.stringify(p, null, 2));
    }
  } else {
    console.log('  ❌ 未找到应付单记录');
  }

  // 2. 验证库存
  console.log('\n📦 2. inv_inventory 库存主表');
  const [inventory] = await pool.query(
    'SELECT id, material_id, material_code, material_name, warehouse_id, quantity, unit FROM inv_inventory WHERE material_id IN (1, 2) AND warehouse_id = ? AND deleted = 0',
    [WAREHOUSE_ID]
  );
  if (inventory.length > 0) {
    for (const inv of inventory) {
      console.log('  ✅', JSON.stringify(inv));
    }
  } else {
    console.log('  ❌ 未找到库存记录');
  }

  // 3. 验证库存批次
  console.log('\n📦 3. inv_inventory_batch 库存批次');
  const [batches] = await pool.query(
    'SELECT id, batch_no, material_id, material_name, warehouse_id, available_qty, quantity, unit_price, inbound_date FROM inv_inventory_batch WHERE material_id IN (1, 2) AND warehouse_id = ? AND deleted = 0 ORDER BY create_time DESC LIMIT 10',
    [WAREHOUSE_ID]
  );
  if (batches.length > 0) {
    for (const b of batches) {
      console.log('  ✅', JSON.stringify(b));
    }
  } else {
    console.log('  ❌ 未找到库存批次记录');
  }

  // 4. 验证采购单状态
  console.log('\n📝 4. pur_purchase_order 采购单状态');
  const [po] = await pool.query(
    'SELECT id, po_no, status, total_quantity, create_time, update_time FROM pur_purchase_order WHERE id = ?',
    [PO_ID]
  );
  if (po.length > 0) {
    const statusMap = { 10: '草稿', 20: '已提交', 30: '已审核', 40: '部分入库', 50: '已完成', 90: '已关闭' };
    console.log('  ✅', JSON.stringify({ ...po[0], status_label: statusMap[po[0].status] || '未知' }));
  } else {
    console.log('  ❌ 未找到采购单');
  }

  // 5. 验证采购单行已收数量
  console.log('\n📝 5. pur_purchase_order_line 采购单明细');
  const [poLines] = await pool.query(
    'SELECT id, line_no, material_id, material_name, order_qty, received_qty, unit_price FROM pur_purchase_order_line WHERE po_id = ?',
    [PO_ID]
  );
  if (poLines.length > 0) {
    for (const line of poLines) {
      console.log('  ✅', JSON.stringify(line));
    }
  } else {
    console.log('  ❌ 未找到采购单明细');
  }

  // 6. 验证入库单
  console.log('\n📥 6. inv_inbound_order 入库单');
  const [inbound] = await pool.query(
    'SELECT id, order_no, order_type, warehouse_id, supplier_id, supplier_name, po_id, po_no, total_amount, total_quantity, status, qc_status FROM inv_inbound_order WHERE order_no = ?',
    [INBOUND_NO]
  );
  if (inbound.length > 0) {
    console.log('  ✅', JSON.stringify(inbound[0], null, 2));
  } else {
    console.log('  ❌ 未找到入库单');
  }

  // 7. 验证领域事件 outbox
  console.log('\n📬 7. domain_event_outbox 事件投递状态');
  const [events] = await pool.query(
    "SELECT id, event_type, aggregate_type, aggregate_id, status, retry_count, error_message, create_time, processed_at FROM domain_event_outbox WHERE aggregate_type = 'InboundOrder' AND aggregate_id = (SELECT id FROM inv_inbound_order WHERE order_no = ?) ORDER BY id DESC LIMIT 5",
    [INBOUND_NO]
  );
  if (events.length > 0) {
    for (const e of events) {
      console.log('  ✅', JSON.stringify(e));
    }
  } else {
    console.log('  ⚠️ 未找到入库单事件（可能已被清理或使用不同 aggregate_id）');
  }

  await pool.end();
  console.log('\n' + '='.repeat(60));
  console.log('  验证完成');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('验证异常:', err);
  process.exit(1);
});
