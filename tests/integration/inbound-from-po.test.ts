/**
 * 入库 from-PO 业务集成测试（文档 IT-IN-001~003 业务侧）
 *
 * 覆盖「关联采购订单的入库单」在审核后产生的副作用：
 *   1. IT-IN-002 部分收货：同一 PO 行多次入库，received_qty 累加，PO 状态
 *      由 approved(30) 流转至 partially_received(40)。
 *   2. ERR-IN / IT-IN-003 超收拒绝：累计超过 order_qty*(1+容差) 时领域守卫抛
 *       DomainError，事务回滚，PO received_qty 保持不变。
 *   3. IT-IN 库存联动：from-PO 入库在通过守卫后，经由 InventorySyncHandler
 *       写入 inv_inventory（与 PO 回写相互独立又同源自一张入库单）。
 *
 * 直接消费领域事件（绕过 outbox 轮询），需要可达的真实 MySQL。
 * PO 行 order_qty=200（容差默认 5% → 上限 210），使 50+60=110 落在限额内、
 * 110+300=410 必然超限额——无论真实容差是 0 还是 5 都不影响断言。
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { query, execute } from '@/lib/db';
import { InboundOrderApprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { PurchaseInboundSyncHandler } from '@/application/handlers/PurchaseInboundSyncHandler';
import { InventorySyncHandler } from '@/application/handlers/InventorySyncHandler';
import {
  createTestWarehouse,
  createTestMaterial,
  cleanupTestWarehouse,
  cleanupTestMaterial,
  type TestMaterial,
  type TestWarehouse,
} from '../concurrency/setup';

const poSync = new PurchaseInboundSyncHandler();
const invSync = new InventorySyncHandler();

describe('入库 from-PO 业务集成（部分收货 / 超收拒绝 / 库存联动）', () => {
  let wh: TestWarehouse;
  let mat: TestMaterial;
  let poId: number;
  let poNo: string;
  const testInboundIds: number[] = [];
  let seq = 0;

  beforeAll(async () => {
    wh = await createTestWarehouse();
    mat = await createTestMaterial(wh.id, 0);
    poNo = `PO_FP_${Date.now()}`;
    const poRes: any = await execute(
      `INSERT INTO pur_purchase_order
        (po_no, supplier_id, supplier_name, status, total_amount, order_date, create_time, update_time, deleted)
       VALUES (?, 1, '供应商FP', 30, 0, NOW(), NOW(), NOW(), 0)`,
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
        2000,
        2000,
        2000,
        2000,
        2000,
      ]
    );
  }, 30000);

  afterAll(async () => {
    await execute('UPDATE pur_purchase_order SET deleted = 1 WHERE id = ?', [poId]).catch(() => {});
    if (testInboundIds.length > 0) {
      await execute('DELETE FROM inv_inventory_transaction WHERE source_id IN (?)', [
        testInboundIds,
      ]).catch(() => {});
    }
    await execute(
      'DELETE FROM inv_inventory_batch WHERE batch_no LIKE ? AND material_id = ? AND warehouse_id = ?',
      ['B_FP_%', mat.id, wh.id]
    ).catch(() => {});
    await cleanupTestMaterial(mat.id);
    await cleanupTestWarehouse(wh.id);
  }, 30000);

  function makeEvent(quantity: number, batchNo: string) {
    const inboundId = ++seq;
    const inboundNo = `IN_FP_${Date.now()}_${seq}`;
    testInboundIds.push(inboundId);
    return new InboundOrderApprovedEvent({
      inboundId,
      inboundNo,
      warehouseId: wh.id,
      warehouseName: wh.warehouse_name,
      supplierId: 1,
      supplierName: '供应商FP',
      poId,
      poNo,
      items: [
        {
          materialId: mat.id,
          materialCode: mat.material_code,
          materialName: mat.material_name,
          quantity,
          unitPrice: 10,
          batchNo,
        },
      ],
      totalAmount: quantity * 10,
    });
  }

  it('IT-IN-002 部分收货：两次入库累计回写 PO received_qty 与状态', async () => {
    const ev1 = makeEvent(50, 'B_FP_1');
    await poSync.handle(ev1);

    let line: any = await query(
      'SELECT received_qty FROM pur_purchase_order_line WHERE po_id = ? AND material_id = ?',
      [poId, mat.id]
    );
    expect(parseFloat(line[0].received_qty)).toBe(50);

    let po: any = await query(
      'SELECT received_quantity, status FROM pur_purchase_order WHERE id = ?',
      [poId]
    );
    expect(parseFloat(po[0].received_quantity)).toBe(50);
    expect(Number(po[0].status)).toBe(40); // partially_received

    const ev2 = makeEvent(60, 'B_FP_2');
    await poSync.handle(ev2);

    line = await query(
      'SELECT received_qty FROM pur_purchase_order_line WHERE po_id = ? AND material_id = ?',
      [poId, mat.id]
    );
    expect(parseFloat(line[0].received_qty)).toBe(110); // 50 + 60

    po = await query(
      'SELECT received_quantity, status FROM pur_purchase_order WHERE id = ?',
      [poId]
    );
    expect(parseFloat(po[0].received_quantity)).toBe(110);
    expect(Number(po[0].status)).toBe(40); // 仍未满收
  });

  it('ERR-IN / IT-IN-003 超收拒绝：累计超上限抛错且 PO 状态回滚不变', async () => {
    // 当前已收 110；再收 300 → 410 远超上限（≥200），领域守卫必须拒绝
    const ev3 = makeEvent(300, 'B_FP_3');
    await expect(poSync.handle(ev3)).rejects.toThrow(/入库数量超限/);

    const line: any = await query(
      'SELECT received_qty FROM pur_purchase_order_line WHERE po_id = ? AND material_id = ?',
      [poId, mat.id]
    );
    expect(parseFloat(line[0].received_qty)).toBe(110); // 事务回滚，保持原值
  });

  it('IT-IN 库存联动：from-PO 入库在守卫通过后会写入库存', async () => {
    const ev4 = makeEvent(40, 'B_FP_4'); // 110 + 40 = 150，仍在区间内
    await invSync.handle(ev4);

    const inv: any = await query(
      'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
      [mat.id, wh.id]
    );
    expect(inv.length).toBeGreaterThanOrEqual(1);
    expect(parseFloat(inv[0].quantity)).toBeGreaterThanOrEqual(40);

    const batch: any = await query(
      'SELECT quantity FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0',
      ['B_FP_4', mat.id, wh.id]
    );
    expect(batch.length).toBe(1);
    expect(parseFloat(batch[0].quantity)).toBe(40);
  });
});
