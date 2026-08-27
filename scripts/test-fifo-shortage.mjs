import mysql from 'mysql2/promise';
import { Decimal } from 'decimal.js';

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('[test-fifo-shortage] 连接数据库成功');

  try {
    console.log('\n=== 1. 查询当前库存状态 ===');
    const [batches] = await conn.execute(
      `SELECT batch_no, available_qty, quantity, inbound_date, expire_date, version
       FROM inv_inventory_batch
       WHERE material_id = 1 AND warehouse_id = 1 AND deleted = 0 AND status = 1
       ORDER BY inbound_date ASC, expire_date ASC, id ASC`
    );
    
    const totalAvailable = batches.reduce((sum, b) => sum + parseFloat(b.available_qty), 0);
    console.log(`总可用库存: ${totalAvailable}`);
    console.log(`批次数量: ${batches.length}`);
    batches.forEach(b => {
      console.log(`  - ${b.batch_no}: available=${b.available_qty}, qty=${b.quantity}, inbound=${b.inbound_date}, expire=${b.expire_date}, version=${b.version}`);
    });

    const shortageQty = totalAvailable + 500;
    console.log(`\n=== 2. 构造库存不足场景 ===`);
    console.log(`需求数量: ${shortageQty}`);
    console.log(`可用数量: ${totalAvailable}`);
    console.log(`预计缺料: ${shortageQty - totalAvailable}`);

    console.log('\n=== 3. 模拟 FIFO 分配（库存不足情况） ===');
    let remaining = new Decimal(shortageQty);
    const allocations = [];

    for (const batch of batches) {
      if (remaining.lessThanOrEqualTo(0)) break;
      
      const available = new Decimal(batch.available_qty);
      const allocate = Decimal.min(remaining, available);
      
      allocations.push({
        batch_no: batch.batch_no,
        available_before: available.toNumber(),
        allocate_qty: allocate.toNumber(),
        available_after: available.minus(allocate).toNumber(),
      });
      
      remaining = remaining.minus(allocate);
    }

    const allocatedTotal = allocations.reduce((sum, a) => sum + a.allocate_qty, 0);
    const shortage = Decimal.max(remaining, 0).toNumber();

    console.log('分配结果:');
    allocations.forEach(a => {
      console.log(`  - ${a.batch_no}: 分配 ${a.allocate_qty} (之前 ${a.available_before}, 之后 ${a.available_after})`);
    });
    console.log(`\n已分配: ${allocatedTotal}`);
    console.log(`缺料: ${shortage}`);

    if (shortage > 0) {
      console.log('\n✗ 库存不足，模拟异常抛出...');
      console.log(`错误信息: 物料 PET薄膜透明125μm 库存不足: 需要 ${shortageQty}, 可用 ${totalAvailable}, 缺少 ${shortage}`);
      
      console.log('\n=== 4. 验证事务回滚（模拟API行为） ===');
      await conn.beginTransaction();
      try {
        for (const alloc of allocations) {
          const [batch] = await conn.execute(
            'SELECT id, version FROM inv_inventory_batch WHERE batch_no = ?',
            [alloc.batch_no]
          );
          if (batch.length > 0) {
            const [update] = await conn.execute(
              `UPDATE inv_inventory_batch SET
                quantity = quantity - ?,
                available_qty = available_qty - ?,
                version = version + 1,
                update_time = NOW()
              WHERE id = ? AND version = ?`,
              [alloc.allocate_qty, alloc.allocate_qty, batch[0].id, batch[0].version]
            );
            console.log(`  ✓ ${alloc.batch_no}: 扣减成功 (affectedRows=${update.affectedRows})`);
          }
        }
        
        throw new Error(`库存不足: 需要 ${shortageQty}, 可用 ${totalAvailable}, 缺少 ${shortage}`);
      } catch (error) {
        await conn.rollback();
        console.log(`\n✓ 事务已回滚，库存恢复原状`);
        
        const [afterBatches] = await conn.execute(
          `SELECT batch_no, available_qty FROM inv_inventory_batch
           WHERE material_id = 1 AND warehouse_id = 1 AND deleted = 0 AND status = 1
           ORDER BY inbound_date ASC`
        );
        
        console.log('回滚后库存状态:');
        afterBatches.forEach(b => {
          console.log(`  - ${b.batch_no}: available=${b.available_qty}`);
        });
        
        const afterTotal = afterBatches.reduce((sum, b) => sum + parseFloat(b.available_qty), 0);
        console.log(`回滚后总库存: ${afterTotal}`);
        
        if (afterTotal === totalAvailable) {
          console.log('\n✅ 事务回滚验证通过！库存恢复正常');
        } else {
          console.log(`\n❌ 事务回滚验证失败！预期 ${totalAvailable}，实际 ${afterTotal}`);
        }
      }
    }

    console.log('\n=== 5. 通过 API 验证库存不足场景 ===');
    console.log('请使用以下 curl 命令测试出库确认 API：');
    console.log('');
    console.log('curl -X POST http://localhost:5000/api/warehouse/outbound/confirm \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Authorization: Bearer <your-token>" \\');
    console.log('  -d \'{"id": 72, "operatorId": 1, "operatorName": "测试操作员"}\'');
    console.log('');
    console.log('订单 72 是库存不足场景（需求 2000，当前可用约 3050）');
    console.log('如果先运行几次 test-fifo-outbound.mjs 消耗库存后，再测试订单 72 可触发库存不足异常');

  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error('[test-fifo-shortage] 执行失败:', e.message);
  process.exit(1);
});