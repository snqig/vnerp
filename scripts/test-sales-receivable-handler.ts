/**
 * Test script: Simulates triggering SalesReceivableHandler to verify the
 * fin_receivable INSERT fix (removed non-existent customer_name/source_id,
 * fixed source_type to tinyint 1, added balance column).
 *
 * Run: npx tsx scripts/test-sales-receivable-handler.ts
 */
import fs from 'fs';
import path from 'path';

// Load .env BEFORE importing any module that reads process.env
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

const TEST_ORDER_NO = 'TEST-SR-' + Date.now().toString().slice(-8);
const TEST_AMOUNT = 8888.5;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ ASSERT FAILED: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

async function main() {
  // Dynamic imports so env vars are loaded first
  const { SalesReceivableHandler } = await import(
    '../src/application/handlers/SalesReceivableHandler'
  );
  const { SalesOrderShippedEvent } = await import(
    '../src/domain/sales/events/SalesOrderEvents'
  );
  const { query, execute } = await import('../src/lib/db');

  console.log('=== SalesReceivableHandler Test ===\n');
  console.log(`Test order: ${TEST_ORDER_NO}, amount: ${TEST_AMOUNT}\n`);

  // 1. Find a valid customer from DB
  const customers = await query<any>(
    'SELECT id, customer_name FROM crm_customer WHERE deleted = 0 ORDER BY id LIMIT 1'
  );
  assert(customers.length > 0, 'Found at least one customer in crm_customer');
  const customerId = customers[0].id;
  const customerName = customers[0].customer_name;
  console.log(`  Using customer: id=${customerId}, name=${customerName}\n`);

  const orderId = 90000000 + Math.floor(Math.random() * 99999);

  // 2. Build mock SalesOrderShippedEvent
  const event = new SalesOrderShippedEvent({
    orderId,
    orderNo: TEST_ORDER_NO,
    customerId,
    customerName,
    shippedItems: [
      {
        materialId: 1,
        materialCode: 'TEST-MAT',
        materialName: 'Test Material',
        quantity: 100,
        unitPrice: TEST_AMOUNT / 100,
        batchNo: 'TEST-BATCH-001',
        warehouseId: 1,
      },
    ],
    totalShippedAmount: TEST_AMOUNT,
  });

  // 3. Invoke handler directly (first time - should create receivable)
  console.log('Step 1: Triggering SalesReceivableHandler (first call)...');
  const handler = new SalesReceivableHandler();
  await handler.handle(event);
  console.log('  Handler completed.\n');

  // 4. Verify fin_receivable record was created with correct fields
  console.log('Step 2: Verifying fin_receivable record...');
  const receivables = await query<any>(
    'SELECT * FROM fin_receivable WHERE source_no = ? AND deleted = 0',
    [TEST_ORDER_NO]
  );
  assert(receivables.length === 1, 'Exactly 1 receivable record created');

  const rec = receivables[0];
  console.log('  Record details:');
  console.log(`    receivable_no: ${rec.receivable_no}`);
  console.log(`    customer_id: ${rec.customer_id}`);
  console.log(`    source_type: ${rec.source_type} (expect 1 = tinyint)`);
  console.log(`    source_no: ${rec.source_no}`);
  console.log(`    amount: ${rec.amount}`);
  console.log(`    received_amount: ${rec.received_amount}`);
  console.log(`    balance: ${rec.balance}`);
  console.log(`    status: ${rec.status}`);
  console.log(`    due_date: ${rec.due_date}`);
  console.log(`    remark: ${rec.remark}`);

  assert(Number(rec.customer_id) === customerId, 'customer_id matches event');
  assert(Number(rec.source_type) === 1, 'source_type is tinyint 1 (not string "sales")');
  assert(rec.source_no === TEST_ORDER_NO, 'source_no matches order number');
  assert(Number(rec.amount) === TEST_AMOUNT, 'amount matches totalShippedAmount');
  assert(Number(rec.received_amount) === 0, 'received_amount is 0');
  assert(Number(rec.balance) === TEST_AMOUNT, 'balance equals amount (no payments yet)');
  assert(Number(rec.status) === 1, 'status is 1 (unpaid)');
  assert(rec.due_date !== null, 'due_date is set (30 days from now)');
  assert(
    rec.remark !== null && rec.remark.includes(TEST_ORDER_NO),
    'remark contains order number'
  );

  // 5. Test idempotency - calling again should NOT create a duplicate
  console.log('\nStep 3: Testing idempotency (second call should skip)...');
  await handler.handle(event);
  const receivablesAfterDup = await query<any>(
    'SELECT * FROM fin_receivable WHERE source_no = ? AND deleted = 0',
    [TEST_ORDER_NO]
  );
  assert(
    receivablesAfterDup.length === 1,
    'No duplicate receivable created (idempotency check passed)'
  );

  // 6. Clean up - soft delete the test record
  console.log('\nStep 4: Cleaning up test data...');
  await execute('UPDATE fin_receivable SET deleted = 1 WHERE source_no = ?', [TEST_ORDER_NO]);
  const remaining = await query<any>(
    'SELECT * FROM fin_receivable WHERE source_no = ? AND deleted = 0',
    [TEST_ORDER_NO]
  );
  assert(remaining.length === 0, 'Test record cleaned up successfully');

  console.log('\n=== ✅ ALL TESTS PASSED ===');
  console.log('SalesReceivableHandler fix verified:');
  console.log('  - No customer_name column (removed, customer tracked via customer_id)');
  console.log('  - No source_id column (removed, source tracked via source_no)');
  console.log('  - source_type is tinyint 1 (not string "sales")');
  console.log('  - balance column set correctly (= amount when received_amount = 0)');
  console.log('  - Idempotency: duplicate calls for same order are skipped');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n=== ❌ TEST FAILED ===');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  });
