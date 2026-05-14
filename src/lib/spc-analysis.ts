export interface SPCDataPoint {
  subgroup_id: number;
  timestamp: string;
  values: number[];
  x_bar: number;
  range: number;
}

export interface ControlLimit {
  ucl: number;
  cl: number;
  lcl: number;
}

export interface XbarRChart {
  data_points: SPCDataPoint[];
  x_bar_limits: ControlLimit;
  r_limits: ControlLimit;
  out_of_control_points: {
    subgroup_id: number;
    type: 'x_bar' | 'range';
    value: number;
    limit: number;
  }[];
  process_capability: {
    cp: number;
    cpk: number;
    pp: number;
    ppk: number;
  };
}

export interface ParetoItem {
  defect_type: string;
  count: number;
  percentage: number;
  cumulative_percentage: number;
}

export interface PChartDataPoint {
  period: string;
  inspected: number;
  defective: number;
  defective_rate: number;
}

export interface PChart {
  data_points: PChartDataPoint[];
  limits: ControlLimit;
  out_of_control_points: { period: string; rate: number; limit: number }[];
}

const A2_TABLE: Record<number, number> = {
  2: 1.88,
  3: 1.023,
  4: 0.729,
  5: 0.577,
  6: 0.483,
  7: 0.419,
  8: 0.373,
  9: 0.337,
  10: 0.308,
};

const D3_TABLE: Record<number, number> = {
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
  7: 0.076,
  8: 0.136,
  9: 0.184,
  10: 0.223,
};

const D4_TABLE: Record<number, number> = {
  2: 3.267,
  3: 2.574,
  4: 2.282,
  5: 2.114,
  6: 2.004,
  7: 1.924,
  8: 1.864,
  9: 1.816,
  10: 1.777,
};

const D2_TABLE: Record<number, number> = {
  2: 1.128,
  3: 1.693,
  4: 2.059,
  5: 2.326,
  6: 2.534,
  7: 2.704,
  8: 2.847,
  9: 2.97,
  10: 3.078,
};

export function calculateXbarRChart(
  data: { subgroup_id: number; values: number[] }[],
  sigmaMultiplier: number = 3
): XbarRChart {
  if (data.length === 0) {
    return {
      data_points: [],
      x_bar_limits: { ucl: 0, cl: 0, lcl: 0 },
      r_limits: { ucl: 0, cl: 0, lcl: 0 },
      out_of_control_points: [],
      process_capability: { cp: 0, cpk: 0, pp: 0, ppk: 0 },
    };
  }

  const dataPoints: SPCDataPoint[] = data.map((d) => {
    const xBar = d.values.reduce((sum, v) => sum + v, 0) / d.values.length;
    const range = Math.max(...d.values) - Math.min(...d.values);
    return {
      subgroup_id: d.subgroup_id,
      timestamp: new Date().toISOString(),
      values: d.values,
      x_bar: xBar,
      range,
    };
  });

  const n = data[0].values.length;
  const A2 = A2_TABLE[n] ?? A2_TABLE[5];
  const D3 = D3_TABLE[n] ?? D3_TABLE[5];
  const D4 = D4_TABLE[n] ?? D4_TABLE[5];
  const d2 = D2_TABLE[n] ?? D2_TABLE[5];

  const xDoubleBar = dataPoints.reduce((sum, dp) => sum + dp.x_bar, 0) / dataPoints.length;
  const rBar = dataPoints.reduce((sum, dp) => sum + dp.range, 0) / dataPoints.length;

  const xBarLimits: ControlLimit = {
    ucl: xDoubleBar + A2 * rBar,
    cl: xDoubleBar,
    lcl: xDoubleBar - A2 * rBar,
  };

  const rLimits: ControlLimit = {
    ucl: D4 * rBar,
    cl: rBar,
    lcl: D3 * rBar,
  };

  const outOfControlPoints: XbarRChart['out_of_control_points'] = [];

  for (const dp of dataPoints) {
    if (dp.x_bar > xBarLimits.ucl) {
      outOfControlPoints.push({
        subgroup_id: dp.subgroup_id,
        type: 'x_bar',
        value: dp.x_bar,
        limit: xBarLimits.ucl,
      });
    } else if (dp.x_bar < xBarLimits.lcl) {
      outOfControlPoints.push({
        subgroup_id: dp.subgroup_id,
        type: 'x_bar',
        value: dp.x_bar,
        limit: xBarLimits.lcl,
      });
    }

    if (dp.range > rLimits.ucl) {
      outOfControlPoints.push({
        subgroup_id: dp.subgroup_id,
        type: 'range',
        value: dp.range,
        limit: rLimits.ucl,
      });
    } else if (dp.range < rLimits.lcl) {
      outOfControlPoints.push({
        subgroup_id: dp.subgroup_id,
        type: 'range',
        value: dp.range,
        limit: rLimits.lcl,
      });
    }
  }

  const sigma = rBar / d2;
  const USL = xBarLimits.ucl;
  const LSL = xBarLimits.lcl;

  const cp = sigma > 0 ? (USL - LSL) / (6 * sigma) : 0;
  const cpk = sigma > 0 ? Math.min(USL - xDoubleBar, xDoubleBar - LSL) / (3 * sigma) : 0;

  const allValues = dataPoints.flatMap((dp) => dp.values);
  const overallMean = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
  const overallVariance =
    allValues.reduce((sum, v) => sum + Math.pow(v - overallMean, 2), 0) / (allValues.length - 1);
  const overallSigma = Math.sqrt(overallVariance);

  const pp = overallSigma > 0 ? (USL - LSL) / (6 * overallSigma) : 0;
  const ppk =
    overallSigma > 0 ? Math.min(USL - overallMean, overallMean - LSL) / (3 * overallSigma) : 0;

  return {
    data_points: dataPoints,
    x_bar_limits: xBarLimits,
    r_limits: rLimits,
    out_of_control_points: outOfControlPoints,
    process_capability: { cp, cpk, pp, ppk },
  };
}

export function calculatePareto(defects: { defect_type: string; count: number }[]): ParetoItem[] {
  const sorted = [...defects].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return sorted.map((d) => ({
      defect_type: d.defect_type,
      count: d.count,
      percentage: 0,
      cumulative_percentage: 0,
    }));
  }

  let cumulative = 0;
  return sorted.map((d) => {
    const percentage = (d.count / total) * 100;
    cumulative += percentage;
    return {
      defect_type: d.defect_type,
      count: d.count,
      percentage: Math.round(percentage * 1000) / 1000,
      cumulative_percentage: Math.round(cumulative * 1000) / 1000,
    };
  });
}

export function calculatePChart(
  data: { period: string; inspected: number; defective: number }[],
  sigmaMultiplier: number = 3
): PChart {
  if (data.length === 0) {
    return {
      data_points: [],
      limits: { ucl: 0, cl: 0, lcl: 0 },
      out_of_control_points: [],
    };
  }

  const totalDefective = data.reduce((sum, d) => sum + d.defective, 0);
  const totalInspected = data.reduce((sum, d) => sum + d.inspected, 0);
  const pBar = totalInspected > 0 ? totalDefective / totalInspected : 0;

  const dataPoints: PChartDataPoint[] = data.map((d) => ({
    period: d.period,
    inspected: d.inspected,
    defective: d.defective,
    defective_rate: d.inspected > 0 ? d.defective / d.inspected : 0,
  }));

  const ucl =
    pBar + sigmaMultiplier * Math.sqrt((pBar * (1 - pBar)) / (totalInspected / data.length));
  const lcl = Math.max(
    0,
    pBar - sigmaMultiplier * Math.sqrt((pBar * (1 - pBar)) / (totalInspected / data.length))
  );

  const limits: ControlLimit = { ucl, cl: pBar, lcl };

  const outOfControlPoints: PChart['out_of_control_points'] = [];

  for (const dp of dataPoints) {
    if (dp.inspected > 0) {
      const pointUcl = pBar + sigmaMultiplier * Math.sqrt((pBar * (1 - pBar)) / dp.inspected);
      const pointLcl = Math.max(
        0,
        pBar - sigmaMultiplier * Math.sqrt((pBar * (1 - pBar)) / dp.inspected)
      );

      if (dp.defective_rate > pointUcl) {
        outOfControlPoints.push({
          period: dp.period,
          rate: dp.defective_rate,
          limit: pointUcl,
        });
      } else if (dp.defective_rate < pointLcl) {
        outOfControlPoints.push({
          period: dp.period,
          rate: dp.defective_rate,
          limit: pointLcl,
        });
      }
    }
  }

  return {
    data_points: dataPoints,
    limits,
    out_of_control_points: outOfControlPoints,
  };
}

export async function handleInspectionFailure(
  conn: any,
  inspectionId: number,
  operatorName: string
): Promise<void> {
  const [inspectionRows]: any = await conn.query(
    `SELECT id, inspection_no, inspection_type, source_type, source_id, source_no,
            material_id, batch_no, inspection_qty, unqualified_qty, inspection_result,
            inspector_id, remark
     FROM qc_inspection WHERE id = ? AND deleted = 0`,
    [inspectionId]
  );

  if (!inspectionRows || inspectionRows.length === 0) {
    throw new Error(`检验单不存在: ID ${inspectionId}`);
  }

  const inspection = inspectionRows[0];

  await conn.execute(`UPDATE qc_inspection SET inspection_result = 2 WHERE id = ?`, [inspectionId]);

  if (inspection.batch_no) {
    const [batchRows]: any = await conn.query(
      `SELECT id FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0`,
      [inspection.batch_no]
    );

    if (batchRows && batchRows.length > 0) {
      await conn.execute(
        `UPDATE inv_inventory_batch SET status = 'quarantined' WHERE batch_no = ? AND deleted = 0`,
        [inspection.batch_no]
      );
    }
  }

  if (inspection.source_type === 'work_order' && inspection.source_id) {
    await conn.execute(
      `INSERT INTO sys_notification (title, content, type, ref_id, ref_no, status, create_time)
       VALUES (?, ?, 'quality_alert', ?, ?, 0, NOW())`,
      [
        `品质异常预警 - ${inspection.inspection_no}`,
        `检验单 ${inspection.inspection_no} 不合格，批次 ${inspection.batch_no || '未知'}，不合格数量 ${inspection.unqualified_qty || 0}，操作人 ${operatorName}`,
        inspection.source_id,
        inspection.source_no || '',
      ]
    );
  }

  const unqualifiedNo = `NQ-${Date.now()}-${inspectionId}`;
  await conn.execute(
    `INSERT INTO qc_unqualified (
      unqualified_no, inspection_id, material_id, batch_no,
      unqualified_qty, unqualified_type, unqualified_reason,
      status, create_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
    [
      unqualifiedNo,
      inspectionId,
      inspection.material_id || null,
      inspection.batch_no || null,
      inspection.unqualified_qty || 0,
      inspection.inspection_type === 1
        ? '来料不合格'
        : inspection.inspection_type === 2
          ? '过程不合格'
          : '成品不合格',
      inspection.remark || `检验单 ${inspection.inspection_no} 检验不合格，由 ${operatorName} 确认`,
    ]
  );
}

export async function getSPCDataFromDB(
  conn: any,
  materialId: number,
  inspectionType: string,
  startDate: string,
  endDate: string,
  subgroupSize: number = 5
): Promise<SPCDataPoint[]> {
  const typeMap: Record<string, number> = {
    incoming: 1,
    process: 2,
    finished: 3,
  };
  const typeValue = typeMap[inspectionType];

  let sql = `
    SELECT id, inspection_no, material_id, batch_no, inspection_qty,
           qualified_qty, unqualified_qty, inspection_result,
           inspection_date, create_time
    FROM qc_inspection
    WHERE material_id = ? AND deleted = 0
      AND create_time >= ? AND create_time <= ?
  `;
  const params: any[] = [materialId, startDate, endDate];

  if (typeValue !== undefined) {
    sql += ` AND inspection_type = ?`;
    params.push(typeValue);
  }

  sql += ` ORDER BY create_time ASC`;

  const [rows]: any = await conn.query(sql, params);

  if (!rows || rows.length === 0) {
    return [];
  }

  const measurements: { timestamp: string; value: number }[] = rows.map((row: any) => ({
    timestamp: row.create_time?.toISOString?.() || String(row.create_time),
    value: Number(row.inspection_qty || 0),
  }));

  const subgroups: SPCDataPoint[] = [];
  for (let i = 0; i < measurements.length; i += subgroupSize) {
    const group = measurements.slice(i, i + subgroupSize);
    if (group.length < 2) break;

    const values = group.map((m) => m.value);
    const xBar = values.reduce((sum, v) => sum + v, 0) / values.length;
    const range = Math.max(...values) - Math.min(...values);

    subgroups.push({
      subgroup_id: Math.floor(i / subgroupSize) + 1,
      timestamp: group[0].timestamp,
      values,
      x_bar: Math.round(xBar * 10000) / 10000,
      range: Math.round(range * 10000) / 10000,
    });
  }

  return subgroups;
}
