import { query, execute } from '@/lib/db';
import { DomainEvent } from '@/domain/shared/DomainTypes';

export class SampleOrderInventoryHandler {
  async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as { sampleOrderId: number };

    if (event.eventType === 'SampleOrderCompleted') {
      const order = await query('SELECT * FROM sal_sample_order WHERE id = ?', [
        payload.sampleOrderId,
      ]);
      if (!order || order.length === 0) return;

      const o = order[0];
      await execute(
        `INSERT INTO sal_sample_inventory
         (sample_order_id, product_name, material_no, quantity, unit, warehouse_id, status, create_time)
         VALUES (?, ?, ?, ?, ?, ?, 'available', NOW())`,
        [payload.sampleOrderId, o.product_name, o.material_no, o.quantity || 0, 'pcs', null]
      );
    }
  }
}
