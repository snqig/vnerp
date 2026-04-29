import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'list';
  const colorName = searchParams.get('colorName') || '';
  const pantoneCode = searchParams.get('pantoneCode') || '';
  const minWeight = searchParams.get('minWeight') || '0';
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);

  if (action === 'recommend') {
    return await recommendSurplus(pantoneCode, colorName);
  }

  if (action === 'detail') {
    const batchNo = searchParams.get('batchNo') || '';
    if (!batchNo) return errorResponse('缺少batchNo', 400, 400);
    return await getSurplusDetail(batchNo);
  }

  let where = `WHERE ib.deleted = 0 AND ib.available_qty > 0 AND ib.status = 'normal'
    AND (ib.material_name LIKE '%专色%' OR ib.material_name LIKE '%调色%' OR ib.material_name LIKE '%余墨%' OR ib.batch_no LIKE 'INK%' OR ib.batch_no LIKE 'MIX%')`;
  const params: any[] = [];

  if (colorName) {
    where += ' AND ib.material_name LIKE ?';
    params.push(`%${colorName}%`);
  }
  if (Number(minWeight) > 0) {
    where += ' AND ib.available_qty >= ?';
    params.push(Number(minWeight));
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM inv_inventory_batch ib ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT ib.*, w.warehouse_name,
      CASE
        WHEN ib.expire_date IS NOT NULL AND ib.expire_date < CURDATE() THEN 'EXPIRED'
        WHEN ib.expire_date IS NOT NULL AND DATEDIFF(ib.expire_date, CURDATE()) <= 7 THEN 'CRITICAL'
        WHEN ib.expire_date IS NOT NULL AND DATEDIFF(ib.expire_date, CURDATE()) <= 30 THEN 'WARNING'
        ELSE 'NORMAL'
      END as expiry_status,
      DATEDIFF(ib.expire_date, CURDATE()) as days_until_expiry
    FROM inv_inventory_batch ib
    LEFT JOIN inv_warehouse w ON ib.warehouse_id = w.id
    ${where}
    ORDER BY ib.inbound_date ASC
    LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  for (const row of rows) {
    const usageHistory: any = await query(
      `SELECT usage_type, workorder_no, weight, operator_name, machine_name, usage_time
       FROM ink_usage WHERE batch_no = ? AND deleted = 0 ORDER BY usage_time DESC LIMIT 10`,
      [row.batch_no]
    );
    row.usage_history = usageHistory;

    const dispatchRows: any = await query(
      `SELECT d.workorder_no, d.color_name, d.pantone_code, d.formula_no
       FROM ink_dispatch d
       WHERE d.batch_no = ? AND d.deleted = 0`,
      [row.batch_no]
    );
    row.dispatch_info = dispatchRows.length > 0 ? dispatchRows[0] : null;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

async function recommendSurplus(pantoneCode: string, colorName: string) {
  const recommendations: any[] = [];

  const surplusInks: any = await query(`
    SELECT
      ib.batch_no,
      ib.material_name,
      ib.available_qty,
      ib.unit_price,
      ib.expire_date,
      ib.inbound_date,
      ib.warehouse_id,
      w.warehouse_name,
      DATEDIFF(ib.expire_date, CURDATE()) as days_until_expiry,
      d.pantone_code,
      d.color_name as dispatch_color_name,
      d.formula_no,
      d.workorder_no as original_workorder
    FROM inv_inventory_batch ib
    LEFT JOIN inv_warehouse w ON ib.warehouse_id = w.id
    LEFT JOIN ink_dispatch d ON d.batch_no = ib.batch_no AND d.deleted = 0
    WHERE ib.deleted = 0 AND ib.available_qty > 0 AND ib.status = 'normal'
      AND (ib.expire_date IS NULL OR ib.expire_date >= CURDATE())
      AND (ib.material_name LIKE '%专色%' OR ib.material_name LIKE '%调色%' OR ib.material_name LIKE '%余墨%'
        OR ib.batch_no LIKE 'INK%' OR ib.batch_no LIKE 'MIX%')
    ORDER BY ib.inbound_date ASC
  `);

  for (const ink of surplusInks) {
    let matchScore = 0;
    let matchReasons: string[] = [];

    if (pantoneCode && ink.pantone_code) {
      if (ink.pantone_code === pantoneCode) {
        matchScore += 50;
        matchReasons.push('Pantone色号完全匹配');
      } else if (ink.pantone_code.substring(0, 3) === pantoneCode.substring(0, 3)) {
        matchScore += 30;
        matchReasons.push('Pantone色号相近');
      }
    }

    if (colorName && ink.dispatch_color_name) {
      if (ink.dispatch_color_name.includes(colorName) || colorName.includes(ink.dispatch_color_name)) {
        matchScore += 30;
        matchReasons.push('颜色名称匹配');
      }
    }

    if (ink.available_qty >= 5) {
      matchScore += 10;
      matchReasons.push('可用量充足');
    }

    if (ink.days_until_expiry && ink.days_until_expiry > 30) {
      matchScore += 10;
      matchReasons.push('有效期充裕');
    } else if (ink.days_until_expiry && ink.days_until_expiry > 7) {
      matchScore += 5;
      matchReasons.push('有效期即将到期，优先使用');
    }

    if (matchScore > 0) {
      recommendations.push({
        ...ink,
        match_score: matchScore,
        match_reasons: matchReasons,
        recommended_usage: Math.min(Number(ink.available_qty), 20),
      });
    }
  }

  recommendations.sort((a, b) => b.match_score - a.match_score);

  const totalAvailable = surplusInks.reduce((sum: number, ink: any) => sum + Number(ink.available_qty || 0), 0);
  const potentialSaving = totalAvailable * (surplusInks[0]?.unit_price || 50);

  return successResponse({
    recommendations: recommendations.slice(0, 20),
    total_surplus_count: surplusInks.length,
    total_available_weight: totalAvailable,
    potential_cost_saving: potentialSaving,
    query: { pantoneCode, colorName },
  });
}

async function getSurplusDetail(batchNo: string) {
  const batchRows: any = await query(`
    SELECT ib.*, w.warehouse_name
    FROM inv_inventory_batch ib
    LEFT JOIN inv_warehouse w ON ib.warehouse_id = w.id
    WHERE ib.batch_no = ? AND ib.deleted = 0
  `, [batchNo]);

  if (batchRows.length === 0) {
    return errorResponse('批次不存在', 404, 404);
  }

  const batch = batchRows[0];

  const dispatchRows: any = await query(
    'SELECT * FROM ink_dispatch WHERE batch_no = ? AND deleted = 0',
    [batchNo]
  );

  let formulaInfo = null;
  let rawInks: any[] = [];

  if (dispatchRows.length > 0) {
    const dispatch = dispatchRows[0];
    const formulaRows: any = await query(
      'SELECT * FROM ink_formula WHERE id = ? AND deleted = 0',
      [dispatch.formula_id]
    );
    if (formulaRows.length > 0) {
      formulaInfo = formulaRows[0];
      const items: any = await query(
        'SELECT * FROM ink_formula_item WHERE formula_id = ? AND deleted = 0 ORDER BY sort_order',
        [formulaInfo.id]
      );
      rawInks = items;
    }
  }

  const usageHistory: any = await query(
    `SELECT * FROM ink_usage WHERE batch_no = ? AND deleted = 0 ORDER BY usage_time DESC`,
    [batchNo]
  );

  const openingRows: any = await query(
    'SELECT * FROM ink_opening_record WHERE batch_no = ? AND deleted = 0 ORDER BY open_time DESC LIMIT 1',
    [batchNo]
  );

  return successResponse({
    batch,
    dispatch: dispatchRows.length > 0 ? dispatchRows[0] : null,
    formula: formulaInfo,
    raw_inks: rawInks,
    usage_history: usageHistory,
    opening_record: openingRows.length > 0 ? openingRows[0] : null,
  });
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { batch_no, return_weight, unit, workorder_no, operator_id, operator_name, location_id, location_name, remark } = body;

  if (!batch_no || !return_weight || Number(return_weight) <= 0) {
    return errorResponse('缺少必填字段: batch_no, return_weight', 400, 400);
  }

  const result = await transaction(async (conn) => {
    const [batchRows]: any = await conn.execute(
      'SELECT id, available_qty, material_name, status, expire_date FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0 FOR UPDATE',
      [batch_no]
    );

    if (batchRows.length === 0) {
      throw new Error(`油墨批次 ${batch_no} 不存在`);
    }

    const batch = batchRows[0];

    if (batch.expire_date && new Date(batch.expire_date) < new Date()) {
      throw new Error(`油墨批次 ${batch_no} 已过期，不能退回`);
    }

    await conn.execute(
      'UPDATE inv_inventory_batch SET available_qty = available_qty + ? WHERE id = ?',
      [return_weight, batch.id]
    );

    const now = new Date();
    const usageNo = 'IU' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const [insertResult]: any = await conn.execute(
      `INSERT INTO ink_usage (usage_no, usage_type, batch_no, workorder_no, color_name, weight, unit, operator_id, operator_name, location_id, location_name, status, remark)
       VALUES (?, 'return', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [usageNo, batch_no, workorder_no || null, batch.material_name || '',
       return_weight, unit || 'kg', operator_id || null, operator_name || null,
       location_id || null, location_name || null, remark || '余墨退回']
    );

    return { id: insertResult.insertId, usage_no: usageNo, batch_no, return_weight };
  });

  return successResponse(result, '余墨退回成功');
});
