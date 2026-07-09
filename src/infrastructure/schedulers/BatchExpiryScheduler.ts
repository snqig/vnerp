import { execute, query } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export interface BatchExpiryResult {
  expiredBatches: number;
  expiredInkOpenings: number;
  warningBatches: number;
  warningInkOpenings: number;
}

export class BatchExpiryScheduler {
  static async markExpiredBatches(): Promise<BatchExpiryResult> {
    const result: BatchExpiryResult = {
      expiredBatches: 0,
      expiredInkOpenings: 0,
      warningBatches: 0,
      warningInkOpenings: 0,
    };

    try {
      const [batchResult]: Loose = await execute(
        `UPDATE inv_inventory_batch
         SET status = 'expired'
         WHERE status = 'normal'
         AND expire_date IS NOT NULL
         AND expire_date < CURDATE()
         AND deleted = 0`
      );
      result.expiredBatches = batchResult.affectedRows || 0;

      if (result.expiredBatches > 0) {
        secureLog('info', 'Auto-marked expired inventory batches', {
          count: result.expiredBatches,
        });
      }
    } catch (error) {
      secureLog('error', 'Failed to mark expired inventory batches', {
        error: (error as Error)?.message,
      });
    }

    try {
      const [inkResult]: Loose = await execute(
        `UPDATE ink_opening_record
         SET status = 2
         WHERE status = 1
         AND expire_time < NOW()
         AND deleted = 0`
      );
      result.expiredInkOpenings = inkResult.affectedRows || 0;

      if (result.expiredInkOpenings > 0) {
        secureLog('info', 'Auto-marked expired ink opening records', {
          count: result.expiredInkOpenings,
        });
      }
    } catch (error) {
      secureLog('error', 'Failed to mark expired ink opening records', {
        error: (error as Error)?.message,
      });
    }

    try {
      const warningBatches: Loose = await query(
        `SELECT id, batch_no, material_code, material_name, expire_date
         FROM inv_inventory_batch
         WHERE status = 'normal'
         AND expire_date IS NOT NULL
         AND expire_date >= CURDATE()
         AND expire_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         AND deleted = 0`
      );
      result.warningBatches = (warningBatches as Loose[]).length;

      if (result.warningBatches > 0) {
        secureLog('warn', 'Inventory batches expiring within 7 days', {
          count: result.warningBatches,
          batches: (warningBatches as Loose[]).slice(0, 10).map((b: Loose) => ({
            id: b.id,
            batchNo: b.batch_no,
            materialCode: b.material_code,
            expireDate: b.expire_date,
          })),
        });
      }
    } catch (error) {
      secureLog('error', 'Failed to check batch expiry warnings', {
        error: (error as Error)?.message,
      });
    }

    try {
      const warningInk: Loose = await query(
        `SELECT id, record_no, material_name, expire_time
         FROM ink_opening_record
         WHERE status = 1
         AND expire_time >= NOW()
         AND expire_time <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
         AND deleted = 0`
      );
      result.warningInkOpenings = (warningInk as Loose[]).length;

      if (result.warningInkOpenings > 0) {
        secureLog('warn', 'Ink openings expiring within 24 hours', {
          count: result.warningInkOpenings,
          records: (warningInk as Loose[]).slice(0, 10).map((r: Loose) => ({
            id: r.id,
            recordNo: r.record_no,
            materialName: r.material_name,
            expireTime: r.expire_time,
          })),
        });
      }
    } catch (error) {
      secureLog('error', 'Failed to check ink expiry warnings', {
        error: (error as Error)?.message,
      });
    }

    return result;
  }
}
