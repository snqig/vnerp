/**
 * 测试报价生成 + 转正式工单逻辑（调用实际 SampleProcessCardService）
 *
 * 用法: npx tsx scripts/test-quote-and-workorder.ts
 * 清理: npx tsx scripts/test-quote-and-workorder.ts --cleanup
 *
 * 验证点:
 * 1. generateQuote 返回 quotedPrice = total_cost * (1 + markupRate/100) * quantity
 * 2. convertToFormalWorkOrder 生成 BOM 明细（数量按 planQty 放大）
 * 3. domain_event_outbox 持久化 2 条领域事件
 */
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const SAMPLE_NO = 'SP-MOCK-0001';
const MARKUP_RATE = 30;
const QUANTITY = 1;
const PLAN_QTY = 1000;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ ASSERT FAILED: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

type ExecuteFn = (sql: string, params?: unknown[]) => Promise<{ insertId: number; affectedRows: number }>;
type QueryFn = (sql: string, params?: unknown[]) => Promise<any[]>;

async function cleanupMockData(query: QueryFn, execute: ExecuteFn) {
  console.log('🧹 清理旧 mock 数据...');
  const rows = await query(`SELECT id FROM dcprint_sample_process_card WHERE sample_no = ?`, [SAMPLE_NO]);
  if (rows.length > 0) {
    const cardId = rows[0].id;
    await execute('DELETE FROM dcprint_sample_process_step WHERE card_id = ?', [cardId]);
    await execute('DELETE FROM dcprint_sample_process_item WHERE card_id = ?', [cardId]);
    await execute('DELETE FROM sal_quote WHERE sample_card_id = ?', [cardId]);
    await execute('DELETE FROM prod_work_order_item WHERE work_order_id IN (SELECT id FROM prod_work_order WHERE order_no = ?)', [SAMPLE_NO]);
    await execute('DELETE FROM prod_work_order WHERE order_no = ?', [SAMPLE_NO]);
    await execute('DELETE FROM domain_event_outbox WHERE aggregate_type = ? AND aggregate_id = ?', ['SampleProcessCard', cardId]);
    await execute('DELETE FROM dcprint_sample_process_card WHERE id = ?', [cardId]);
    console.log(`  ✓ 已清理旧工艺卡 ID: ${cardId}`);
  } else {
    console.log('  ✓ 无旧数据可清理');
  }
}

async function seedMockData(execute: ExecuteFn): Promise<number> {
  console.log('🌱 种子 mock 数据...');
  const cardResult = await execute(
    `INSERT INTO dcprint_sample_process_card
     (sample_no, sample_name, customer_id, customer_name, product_name, version_no, status,
      substrate_material_name, spec, print_color, material_loss_rate, estimated_hour,
      total_material_cost, total_labor_cost, total_tool_cost, total_cost,
      remark, confirm_by, confirm_time, create_by, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?,
             ?, ?, ?, ?,
             ?, ?, NOW(), ?, NOW())`,
    [
      SAMPLE_NO,
      '测试标签工艺卡-哑银纸四色印刷',
      1,
      '测试客户A',
      '哑银纸标签 50x30mm',
      'V1.0',
      3,
      '哑银龙贴纸',
      '50x30mm 卷装',
      'C/M/Y/K + 专色红',
      5.0,
      2.5,
      120.5,
      80.0,
      50.0,
      250.5,
      'Mock data for testing',
      1,
      1,
    ]
  );
  const cardId = cardResult.insertId;
  console.log('  ✓ 工艺卡已创建, ID:', cardId, '编号:', SAMPLE_NO);

  await execute(
    `INSERT INTO dcprint_sample_process_item
     (card_id, item_type, material_code, material_name, specification, unit_dosage, unit, unit_cost, line_cost, sort)
     VALUES
       (?, 1, 'MAT-PET-001', '哑银龙贴纸', '50x30mm', 1.0, 'm²', 80.0, 80.0, 1),
       (?, 2, 'INK-CMYK-SET', '四色油墨套装', 'C/M/Y/K 各100ml', 0.2, 'kg', 150.0, 30.0, 2),
       (?, 3, 'AUX-GLUE-001', '水性胶水', '食品级', 0.05, 'kg', 210.0, 10.5, 3)`,
    [cardId, cardId, cardId]
  );
  console.log('  ✓ 3 条物料明细已创建');

  await execute(
    `INSERT INTO dcprint_sample_process_step
     (card_id, process_name, work_hour, hourly_rate, line_cost, process_param, sort)
     VALUES
       (?, '四色丝网印刷', 2.0, 30.0, 60.0, '{"mesh":"300目"}', 1),
       (?, '平压平模切', 0.5, 40.0, 20.0, '{"pressure":"3吨"}', 2)`,
    [cardId, cardId]
  );
  console.log('  ✓ 2 条工序明细已创建');

  return cardId;
}

async function main() {
  const isCleanup = process.argv.includes('--cleanup');

  const { SampleProcessCardService } = await import(
    '../src/application/services/SampleProcessCardService'
  );
  const db = await import('../src/lib/db');
  const query = db.query as QueryFn;
  const execute = db.execute as ExecuteFn;

  if (isCleanup) {
    await cleanupMockData(query, execute);
    console.log('\n✓ 清理完成');
    return;
  }

  console.log('=== 报价生成 + 转正式工单 测试 ===\n');

  await cleanupMockData(query, execute);
  const cardId = await seedMockData(execute);
  const service = new SampleProcessCardService();

  console.log('\n💰 测试 generateQuote...');
  console.log(`  参数: markupRate=${MARKUP_RATE}, quantity=${QUANTITY}`);
  const totalCost = 250.5;
  const expectedQuotedPrice = Math.round(totalCost * (1 + MARKUP_RATE / 100) * QUANTITY * 10000) / 10000;
  console.log(`  预期报价: ${expectedQuotedPrice} = ${totalCost} * 1.3 * ${QUANTITY}`);

  const quote = await service.generateQuote(cardId, { markupRate: MARKUP_RATE, quantity: QUANTITY }, 1);
  console.log('  返回:', quote);
  assert(Math.abs(quote.quotedPrice - expectedQuotedPrice) < 0.0001, `报价金额 = ${expectedQuotedPrice}`);
  assert(quote.quoteId > 0, 'quoteId > 0');
  assert(quote.quoteNo.startsWith('QT'), '报价单号以 QT 开头');

  const cardCheck = await query('SELECT quote_id FROM dcprint_sample_process_card WHERE id = ?', [cardId]);
  assert(Number(cardCheck[0].quote_id) === quote.quoteId, '工艺卡 quote_id 回写');

  console.log('\n🏭 测试 convertToFormalWorkOrder...');
  console.log(`  参数: planQty=${PLAN_QTY}`);
  const wo = await service.convertToFormalWorkOrder(cardId, { planQty: PLAN_QTY }, 1);
  console.log('  返回:', wo);
  assert(wo.workOrderId > 0, 'workOrderId > 0');
  assert(wo.workOrderNo.startsWith('PWO'), '工单号以 PWO 开头');

  const bomRows = await query('SELECT * FROM prod_work_order_item WHERE work_order_id = ? ORDER BY line_no', [wo.workOrderId]);
  console.log('\n  BOM 明细:');
  for (const bom of bomRows) {
    console.log(`    行${bom.line_no}: ${bom.material_name} qty=${bom.quantity} total=${bom.total_price}`);
  }
  assert(bomRows.length === 3, 'BOM 行数 = 3');
  assert(Number(bomRows[0].quantity) === 1000, 'BOM 行1 数量 = 1000 (1.0 * 1000)');
  assert(Number(bomRows[1].quantity) === 200, 'BOM 行2 数量 = 200 (0.2 * 1000)');
  assert(Number(bomRows[2].quantity) === 50, 'BOM 行3 数量 = 50 (0.05 * 1000)');

  const cardCheck2 = await query('SELECT quote_id, formal_work_order_id FROM dcprint_sample_process_card WHERE id = ?', [cardId]);
  assert(Number(cardCheck2[0].formal_work_order_id) === wo.workOrderId, '工艺卡 formal_work_order_id 回写');

  console.log('\n📋 验证领域事件持久化...');
  const events = await query(
    `SELECT event_type, status, payload FROM domain_event_outbox WHERE aggregate_type = ? AND aggregate_id = ? ORDER BY id`,
    ['SampleProcessCard', cardId]
  );
  console.log(`  事件数: ${events.length}`);
  for (const ev of events) {
    console.log(`    - ${ev.event_type} (status=${ev.status})`);
  }
  assert(events.length === 2, '领域事件数 = 2');
  assert(events[0].event_type === 'SampleCardQuoteGenerated', '事件1 类型 = SampleCardQuoteGenerated');
  assert(events[1].event_type === 'SampleCardConvertedToWorkOrder', '事件2 类型 = SampleCardConvertedToWorkOrder');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 全部测试通过!');
  console.log('='.repeat(60));
  console.log('\n测试摘要:');
  console.log(`  工艺卡 ID: ${cardId} (${SAMPLE_NO}, status=3)`);
  console.log(`  报价单 ID: ${quote.quoteId} (${quote.quoteNo}, ¥${quote.quotedPrice})`);
  console.log(`  正式工单 ID: ${wo.workOrderId} (${wo.workOrderNo}, qty=${PLAN_QTY})`);
  console.log(`  BOM 行数: ${bomRows.length}`);
  console.log(`  领域事件: ${events.length} 条`);
  console.log('\n清理 mock 数据:');
  console.log('  npx tsx scripts/test-quote-and-workorder.ts --cleanup');
}

main().catch((err) => {
  console.error('\n❌ 测试失败:', err);
  if (err.message) console.error('   错误:', err.message);
  if (err.stack) console.error('\n', err.stack);
  process.exit(1);
});
