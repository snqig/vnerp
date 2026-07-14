import { query } from './db';

export interface AQLSamplingPlan {
  lotSizeMin: number;
  lotSizeMax: number;
  sampleSizeCode: string;
  sampleSize: number;
  aqlLevel: string;
  acceptQty: number;
  rejectQty: number;
  inspectionLevel: string;
}

export class AQLService {
  /**
   * Get sampling plan for given lot size and AQL level based on GB/T 2828.1
   */
  async getSamplingPlan(
    lotSize: number,
    aqlLevel: string = '2.5',
    inspectionLevel: string = 'II'
  ): Promise<AQLSamplingPlan | null> {
    const plans = await query<AQLSamplingPlan>(
      `SELECT * FROM qc_aql_sampling_plan
       WHERE lot_size_min <= ? AND lot_size_max >= ?
         AND aql_level = ?
         AND inspection_level = ?
       ORDER BY lot_size_min ASC
       LIMIT 1`,
      [lotSize, lotSize, aqlLevel, inspectionLevel]
    );
    return plans.length > 0 ? plans[0] : null;
  }

  /**
   * Get available AQL levels
   */
  async getAcceptableQualityLevels(): Promise<string[]> {
    const rows = await query<{ aql_level: string }>(
      `SELECT DISTINCT aql_level FROM qc_aql_sampling_plan ORDER BY CAST(aql_level AS DECIMAL(10,2)) ASC`
    );
    return rows.map((r) => r.aql_level);
  }

  /**
   * Get available lot size ranges for display
   */
  async getLotSizeRanges(): Promise<{ min: number; max: number }[]> {
    const rows = await query<{ lot_size_min: number; lot_size_max: number }>(
      `SELECT DISTINCT lot_size_min, lot_size_max FROM qc_aql_sampling_plan ORDER BY lot_size_min ASC`
    );
    return rows.map((r) => ({ min: r.lot_size_min, max: r.lot_size_max }));
  }

  /**
   * Determine inspection result based on AQL sampling
   */
  evaluate(defectiveCount: number, plan: AQLSamplingPlan): 'pass' | 'fail' {
    if (defectiveCount <= plan.acceptQty) return 'pass';
    if (defectiveCount >= plan.rejectQty) return 'fail';
    return 'pass';
  }
}
