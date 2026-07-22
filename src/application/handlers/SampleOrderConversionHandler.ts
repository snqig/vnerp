import { query as _query, execute } from '@/lib/db';
import { DomainEvent } from '@/domain/shared/DomainTypes';

export class SampleOrderConversionHandler {
  async handle(event: DomainEvent): Promise<void> {
    if (event.eventType !== 'SampleOrderConverted') return;

    const { sampleOrderId, salesOrderId, userId } = event.payload as {
      sampleOrderId: number;
      salesOrderId: number;
      userId: number;
    };

    await execute(
      `UPDATE sal_sample_order SET
        sales_order_id = ?, converted_at = NOW(), converted_by = ?
       WHERE id = ? AND deleted = 0`,
      [salesOrderId, userId, sampleOrderId]
    );
  }
}
