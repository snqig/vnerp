/**
 * 入库审核全链路集成测试（文档最高优先级）
 *
 * 验证 approve() 触发的领域事件被各 handler 正确消费：
 *   1. InventorySyncHandler     → inv_inventory / inv_inventory_batch / inv_inventory_transaction（库存+批次+流水）
 *   2. PurchaseInboundSyncHandler→ pur_purchase_order_line.received_qty / pur_purchase_order.received_quantity（PO 回写）
 *   3. FinanceVoucherHandler    → fin_payable（财务过账，且幂等）
 *
 * 直接消费领域事件（绕过 outbox 轮询），确定性验证各 handler 的 DB 写入数学正确性。
 * 需要可达的真实 MySQL（默认 127.0.0.1:3306 / vnerpdacahng）。
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { query, execute } from '@/lib/db';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { InventorySyncHandler } from '@/application/handlers/InventorySyncHandler';
import { PurchaseInboundSyncHandler } from '@/application/handlers/PurchaseInboundSyncHandler';
import { FinanceVoucherHandler } from '@/application/handlers/FinanceVoucherHandler';
import {
  createTestWarehouse,
  createTestMaterial,
  cleanupTestWarehouse,
  cleanupTestMaterial,
  type TestMaterial,
  type TestWarehouse,
} from '../concurrency/setup';

const invSync = new InventorySyncHandler();
const poSync = new PurchaseInboundSyncHandler();
const finSync = new FinanceVoucherHandler();

describe('入库审核全链路 (approve → 库存/批次/流水/PO/财务)', () => {
  let wh: TestWarehouse;
  let mat: TestMaterial;
  let poId: number;
  let poNo: string;
  const testInboundIds: number[] = [];
  let inboundSeq = 0;

  beforeAll(async () => {
    wh = await createTestWarehouse();
    mat = await createTestMaterial(wh.id, 0); // 初始库存 0
    poNo = `PO_TEST_${Date.now()}`;
    const poRes: any = await execute(
      `INSERT INTO pur_purchase_order
        (po_no, supplier_id, supplier_name, status, total_amount, order_date, create_time, update_time, deleted)
       VALUES (?, 1, '测试供应商', 30, 0, NOW(), NOW(), NOW(), 0)`,
      [poNo]
    );
    poId = poRes.insertId;
    await execute(
      `INSERT INTO pur_purchase_order_line
        (po_id, line_no, material_id, material_code, material_name, material_spec, unit,
         order_qty, received_qty, returned_qty, unit_price, amount, tax_rate, tax_amount,
         line_total, base_unit_price, base_amount, base_tax_amount, base_line_total, create_time)
       VALUES (?, 1, ?, ?, ?, '', '个', ?, 0, 0, ?, ?, 13, 0, ?, ?, ?, ?, ?, NOW())`,
      [
        poId,
        mat.id,
        mat.material_code,
        mat.material_name,
        200,
        10,
        2000,
        10,
        1000,
        10,
        1000,
        10,
        1000,
      ]
    );
  }, 30000);

  afterAll(async () => {
    await execute('UPDATE pur_purchase_order SET deleted = 1 WHERE id = ?', [poId]).catch(() => {});
    await execute('UPDATE fin_payable SET deleted = 1 WHERE source_no LIKE ?', ['IN_TEST_%']).catch(
      () => {}
    );
    if (testInboundIds.length > 0) {
      await execute('DELETE FROM inv_inventory_transaction WHERE source_id IN (?)', [
        testInboundIds,
      ]).catch(() => {});
    }
    await cleanupTestMaterial(mat.id);
    await cleanupTestWarehouse(wh.id);
  }, 30000);

  function makeEvent(overrides: Partial<{
    inboundId: number;
    inboundNo: string;
    quantity: number;
    batchNo: string;
    poId?: number;
    poNo?: string;
    totalAmount: number;
  }> = {}) {
    const inboundId = overrides.inboundId ?? ++inboundSeq;
    const inboundNo = overrides.inboundNo ?? `IN_TEST_${Date.now()}_${inboundSeq}`;
    testInboundIds.push(inboundId);
    return new InboundOrderApprovedEvent({
      inboundId,
      inboundNo,
      warehouseId: wh.id,
      warehouseName: wh.warehouse_name,
      supplierId: 1,
      supplierName: '测试供应商',
      poId: overrides.poId ?? poId,
      poNo: overrides.poNo ?? poNo,
      items: [
        {
          materialId: mat.id,
          materialCode: mat.material_code,
          materialName: mat.material_name,
          quantity: overrides.quantity ?? 50,
          unitPrice: 10,
          batchNo: overrides.batchNo ?? `BATCH_TEST_${inboundSeq}`,
        },
      ],
      totalAmount: overrides.totalAmount ?? 500,
    });
  }

  it('IT-approve-1 InventorySyncHandler：库存+批次+流水正确写入', async () => {
    const ev = makeEvent({ quantity: 50, batchNo: 'BATCH_SYNC_1' });
    await invSync.handle(ev);

    const inv: any = await query(
      'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
      [mat.id, wh.id]
    );
    expect(parseFloat(inv[0].quantity)).toBe(50);

    const batch: any = await query(
      'SELECT quantity FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0',
      ['BATCH_SYNC_1', mat.id, wh.id]
    );
    expect(batch.length).toBe(1);
    expect(parseFloat(batch[0].quantity)).toBe(50);

    const tx: any = await query(
      "SELECT quantity, trans_type FROM inv_inventory_transaction WHERE source_id = ? AND trans_type = 'in' AND material_id = ?",
      [ev.payload.inboundId, mat.id]
    );
    expect(tx.length).toBe(1);
    expect(parseFloat(tx[0].quantity)).toBe(50);
  });

  it('IT-approve-2 PurchaseInboundSyncHandler：PO 收货量回写', async () => {
    const ev = makeEvent({ quantity: 50 });
    await poSync.handle(ev);

    const line: any = await query(
      'SELECT received_qty FROM pur_purchase_order_line WHERE po_id = ? AND material_id = ?',
      [poId, mat.id]
    );
    expect(parseFloat(line[0].received_qty)).toBe(50);

    const po: any = await query(
      'SELECT received_quantity FROM pur_purchase_order WHERE id = ?',
      [poId]
    );
    expect(parseFloat(po[0].received_quantity)).toBe(50);
  });

  it('IT-approve-3 FinanceVoucherHandler：财务过账且幂等（ERR-IN-006）', async () => {
    const ev = makeEvent({ totalAmount: 500 });
    await finSync.handle(ev);

    const pay1: any = await query(
      'SELECT amount FROM fin_payable WHERE source_no = ? AND deleted = 0',
      [ev.payload.inboundNo]
    );
    expect(pay1.length).toBe(1);
    expect(parseFloat(pay1[0].amount)).toBe(500);

    // 重复审核同一 source_no 不应重复记账
    await finSync.handle(ev);
    const pay2: any = await query(
      'SELECT id FROM fin_payable WHERE source_no = ? AND deleted = 0',
      [ev.payload.inboundNo]
    );
    expect(pay2.length).toBe(1);
  });

  it('IT-approve-4 全链路：同一事件被三 handler 消费后各表一致', async () => {
    const ev = makeEvent({ quantity: 60, batchNo: 'BATCH_FULL_1', totalAmount: 600 });
    await invSync.handle(ev);
    await poSync.handle(ev);
    await finSync.handle(ev);

    const inv: any = await query(
      'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
      [mat.id, wh.id]
    );
    expect(parseFloat(inv[0].quantity)).toBeGreaterThanOrEqual(60);

    const line: any = await query(
      'SELECT received_qty FROM pur_purchase_order_line WHERE po_id = ? AND material_id = ?',
      [poId, mat.id]
    );
    expect(parseFloat(line[0].received_qty)).toBe(110); // 50(IT-2) + 60

    const pay: any = await query(
      'SELECT amount FROM fin_payable WHERE source_no = ? AND deleted = 0',
      [ev.payload.inboundNo]
    );
    expect(pay.length).toBe(1);
    expect(parseFloat(pay[0].amount)).toBe(600);
  });
});
