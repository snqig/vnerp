/**
 * @module AQL 抽样方案服务
 * @description 基于 GB/T 2828.1 标准的 AQL 抽样计算服务。
 *   从 qc_aql_sampling_plan 表查询抽样方案，返回样本量/合格判定数/不合格判定数。
 *
 *   使用方式:
 *   ```ts
 *   const plan = await AQLService.getSamplingPlan(lotSize, '2.5', 'II');
 *   // plan.sampleSize = 32, plan.acceptQty = 2, plan.rejectQty = 3
 *   ```
 */

import { query } from './db';

export interface AQLSamplingPlan {
  sampleSize: number;
  acceptQty: number;
  rejectQty: number;
  sampleSizeCode: string;
  aqlLevel: string;
  inspectionLevel: string;
}

export interface AQLInspectionResult {
  passed: boolean;
  sampleSize: number;
  acceptQty: number;
  rejectQty: number;
  defectivesFound: number;
  result: 'accept' | 'reject';
}

class AQLServiceClass {
  /**
   * 根据批量大小和 AQL 水平查询抽样方案
   * @param lotSize - 批量大小
   * @param aqlLevel - AQL 水平: '0.65' | '1.0' | '1.5' | '2.5' | '4.0'
   * @param inspectionLevel - 检验水平: 'I' | 'II' | 'III'，默认 II
   * @returns 抽样方案，或 null（无匹配方案）
   */
  async getSamplingPlan(
    lotSize: number,
    aqlLevel: string = '2.5',
    inspectionLevel: string = 'II'
  ): Promise<AQLSamplingPlan | null> {
    if (lotSize <= 0) {
      return null;
    }

    const rows = await query<{
      sample_size: number;
      accept_qty: number;
      reject_qty: number;
      sample_size_code: string;
      aql_level: string;
      inspection_level: string;
    }>(
      `SELECT sample_size, accept_qty, reject_qty, sample_size_code, aql_level, inspection_level
       FROM qc_aql_sampling_plan
       WHERE lot_size_min <= ? AND lot_size_max >= ?
         AND aql_level = ? AND inspection_level = ?
       LIMIT 1`,
      [lotSize, lotSize, aqlLevel, inspectionLevel]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      sampleSize: row.sample_size,
      acceptQty: row.accept_qty,
      rejectQty: row.reject_qty,
      sampleSizeCode: row.sample_size_code,
      aqlLevel: row.aql_level,
      inspectionLevel: row.inspection_level,
    };
  }

  /**
   * 判定检验结果
   * @param plan - 抽样方案
   * @param defectivesFound - 发现的不合格品数
   * @returns 检验结果
   */
  evaluate(plan: AQLSamplingPlan, defectivesFound: number): AQLInspectionResult {
    const passed = defectivesFound <= plan.acceptQty;
    return {
      passed,
      sampleSize: plan.sampleSize,
      acceptQty: plan.acceptQty,
      rejectQty: plan.rejectQty,
      defectivesFound,
      result: passed ? 'accept' : 'reject',
    };
  }

  /**
   * 一站式 AQL 检验计算
   * @param lotSize - 批量
   * @param aqlLevel - AQL 水平
   * @param defectivesFound - 不合格品数
   * @param inspectionLevel - 检验水平
   * @returns 检验结果（含抽样方案信息）
   */
  async inspect(
    lotSize: number,
    aqlLevel: string,
    defectivesFound: number,
    inspectionLevel: string = 'II'
  ): Promise<AQLInspectionResult | null> {
    const plan = await this.getSamplingPlan(lotSize, aqlLevel, inspectionLevel);
    if (!plan) {
      return null;
    }
    return this.evaluate(plan, defectivesFound);
  }
}

export const AQLService = new AQLServiceClass();
