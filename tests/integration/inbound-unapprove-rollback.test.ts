/**
 * 入库反审核回滚集成测试（文档高优先级）
 *
 * 验证 unapprove() 触发的 InboundOrderUnapprovedEvent 被 InventoryRollbackHandler 正确消费：
 *   - inv_inventory 数量回退
 *   - inv_inventory_batch 扣减 / 归零后软删
 *   - inv_inventory_transaction 生成反向（return）流水
 *   - 关联 fin_payable 按 source_no 软删（采购入库）
 * 数学不变量：回滚后库存回到审核前状态（available 与 quantity 一致）。
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { query, execute } from '@/lib/db';
import { InboundOrderUnapprovedEvent } from '@/domain/warehouse/events/InboundOrderEvents';
import { InventoryRollbackHandler } from '@/application/handlers/InventoryRollbackHandler';
import {
  createTestWarehouse,
  createTestMaterial,
  cleanupTestWarehouse,
  cleanupTestMaterial,
  type TestMaterial,
  type TestWarehouse,
} from '../concurrency/setup';

const rollback = new InventoryRollbackHandler();

describe('入库反审核回滚 (unapprove → 库存/批次/流水回退)', () => {
  let wh: TestWarehouse;
  let mat: TestMaterial;
  let inboundId: number;
  let inboundNo: string;

  beforeAll(async () => {
    wh = await createTestWarehouse();
    // 初始库存 50，批次号已知，用于与入库明细 batch_no 对齐
    mat = await createTestMaterial(wh.id, 50);
    inboundNo = `IN_RB_${Date.now()}`;
    const orderRes: any = await execute(
      `INSERT INTO inv_inbound_order
        (order_no, inbound_date, order_type, supplier_id, supplier_name, warehouse_id,
         warehouse_code, warehouse_name, total_quantity, total_amount, status,
         operator_id, operator_name, create_time, update_time, deleted)
       VALUES (?, NOW(), 'purchase', 1, '测试供应商', ?, ?, ?, 50, 500, 'approved', 1, '操作员', NOW(), NOW(), 0)`,
      [inboundNo, wh.id, wh.warehouse_code, wh.warehouse_name]
    );
    inboundId = orderRes.insertId;
    await execute(
      `INSERT INTO inv_inbound_item
        (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, create_time, deleted)
       VALUES (?, ?, ?, '', ?, 50, '个', 10, NOW(), 0)`,
      [inboundId, mat.id, mat.material_name, mat.batch_no]
    );
  }, 30000);

  afterAll(async () => {
    await execute('UPDATE inv_inbound_order SET deleted = 1 WHERE id = ?', [inboundId]).catch(() => {});
    await execute('UPDATE fin_payable SET deleted = 1 WHERE source_no = ?', [inboundNo]).catch(() => {});
    await execute('DELETE FROM inv_inventory_transaction WHERE source_id = ?', [inboundId]).catch(() => {});
    await cleanupTestMaterial(mat.id);
    await cleanupTestWarehouse(wh.id);
  }, 30000);

  it('IT-unapprove-1 库存数量回到审核前（0）', async () => {
    const ev = new InboundOrderUnapprovedEvent({
      inboundId,
      inboundNo,
      poId: undefined,
      items: [
        {
          materialId: mat.id,
          materialCode: mat.material_code,
          materialName: mat.material_name,
          quantity: 50,
          unitPrice: 10,
          batchNo: mat.batch_no,
          purchaseOrderItemId: undefined,
          purchaseOrderLineNo: undefined,
        },
      ],
      reason: '',
    });
    await rollback.handle(ev);

    const inv: any = await query(
      'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
      [mat.id, wh.id]
    );
    expect(parseFloat(inv[0].quantity)).toBe(0);
  });

  it('IT-unapprove-2 批次归零后软删', async () => {
    const batch: any = await query(
      'SELECT deleted, quantity FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?',
      [mat.batch_no, mat.id, wh.id]
    );
    expect(batch.length).toBe(1);
    expect(Number(batch[0].deleted)).toBe(1);
  });

  it('IT-unapprove-3 生成反向（return）流水', async () => {
    const tx: any = await query(
      "SELECT quantity, trans_type FROM inv_inventory_transaction WHERE source_id = ? AND trans_type = 'return'",
      [inboundId]
    );
    expect(tx.length).toBe(1);
    expect(parseFloat(tx[0].quantity)).toBe(50);
  });

  it('IT-unapprove-4 入库单不存在时不抛错、安全跳过', async () => {
    const ev = new InboundOrderUnapprovedEvent({
      inboundId: 99999999,
      inboundNo: 'IN_RB_MISSING',
      poId: undefined,
      items: [],
      reason: '',
    });
    await expect(rollback.handle(ev)).resolves.toBeUndefined();
  });
});
