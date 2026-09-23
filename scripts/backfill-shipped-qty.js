/**
 * 回填 sal_order.shipped_qty
 *
 * 背景：outbound/confirm 回写逻辑之前被注释掉（误以为 sal_order 是幽灵表），
 * 导致所有销售订单 shipped_qty 都是 0，但已有 10 个 sales 出库单已 completed。
 *
 * 策略：对每个 sal_order，汇总所有 completed sales 出库单 total_qty，
 * 按新 confirm 逻辑（幂等重算）回填 shipped_qty + status + actual_delivery_date。
 *
 * 与新 confirm 事务内的计算方式完全一致（SUM io.total_qty），保持幂等。
 */
const mysql = require('mysql2/promise');

async function backfill() {
  const c = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root',
    password: 'Snqig521223', database: 'vnerpdacahng',
  });

  // 查出所有有 sales 出库单完成记录的销售订单号
  const [orders] = await c.execute(
    `SELECT DISTINCT io.sales_order_no
     FROM inv_outbound_order io
     WHERE io.outbound_type = 'sales'
       AND io.status = 'completed'
       AND io.deleted = 0
       AND io.sales_order_no IS NOT NULL
       AND io.sales_order_no != ''`
  );

  console.log(`=== 找到 ${orders.length} 个有 completed sales 出库的订单号 ===`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of orders) {
    const salesOrderNo = row.sales_order_no;
    const [soRows] = await c.execute(
      'SELECT id, status FROM sal_order WHERE order_no = ? AND deleted = 0',
      [salesOrderNo]
    );
    if (soRows.length === 0) {
      console.log(`  SKIP: sal_order NOT FOUND for ${salesOrderNo}`);
      notFound++;
      continue;
    }
    const saleOrder = soRows[0];

    // 累计已完成出库数量
    const [agg] = await c.execute(
      `SELECT COALESCE(SUM(io.total_qty), 0) AS shipped_qty
       FROM inv_outbound_order io
       WHERE io.sales_order_no = ?
         AND io.outbound_type = 'sales'
         AND io.status = 'completed'
         AND io.deleted = 0`,
      [salesOrderNo]
    );
    const newShippedQty = parseFloat(String(agg[0].shipped_qty));

    // 订单明细总量
    const [itemSum] = await c.execute(
      `SELECT COALESCE(SUM(quantity), 0) AS total_qty
       FROM sal_order_item WHERE order_id = ? AND deleted = 0`,
      [saleOrder.id]
    );
    const orderTotalQty = parseFloat(String(itemSum[0].total_qty));

    // 状态判定（同 confirm route.ts 逻辑）
    let newStatus = saleOrder.status;
    let deliveryDateExpr = '';
    if (saleOrder.status === 1 || saleOrder.status === 2 || saleOrder.status === 3) {
      if (newShippedQty >= orderTotalQty && orderTotalQty > 0) {
        newStatus = 4;
        deliveryDateExpr = ', actual_delivery_date = NOW()';
      } else if (newShippedQty > 0) {
        newStatus = 3;
      }
    }
    // 4/5 不动

    const [res] = await c.execute(
      `UPDATE sal_order
       SET shipped_qty = ?, status = ?, update_time = NOW()${deliveryDateExpr}
       WHERE id = ?`,
      [newShippedQty, newStatus, saleOrder.id]
    );

    if (res.affectedRows > 0) {
      console.log(`  UPDATE ${salesOrderNo}: shipped_qty=${newShippedQty}, order_total=${orderTotalQty}, status=${saleOrder.status}→${newStatus}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n=== 回填完成 ===`);
  console.log(`已更新: ${updated}`);
  console.log(`跳过: ${skipped}`);
  console.log(`sal_order 未找到: ${notFound}`);

  await c.end();
}

backfill().catch(e => { console.error(e); process.exit(1); });
