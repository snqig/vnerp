import { query, execute } from '@/lib/db';

export class SampleOrderConversionHandler {
  async handle(event: { eventType: string; payload: { sampleOrderId: number; salesOrderId: number; userId: number } }): Promise<void> {
    if (event.eventType !== 'SampleOrderConverted') return;

    const { sampleOrderId, salesOrderId, userId } = event.payload;

    await execute(
      `UPDATE sal_sample_order SET
        sales_order_id = ?, converted_at = NOW(), converted_by = ?
       WHERE id = ? AND deleted = 0`,
      [salesOrderId, userId, sampleOrderId]
    );
  }
}
