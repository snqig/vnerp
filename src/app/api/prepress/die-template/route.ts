import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, commonErrors, withErrorHandler, validateRequestBody } from '@/lib/api-response';

const ASSET_TYPE_MAP: Record<string, string> = {
  die: '刀模',
  flexo_plate: '柔印版',
  screen_mesh: '丝网版',
};

const DIE_STATUS_MAP: Record<string, string> = {
  available: '可用',
  in_use: '使用中',
  maintenance_needed: '需保养',
  re_rule_needed: '需重做',
  scrap: '已报废',
};

function computeDieStatus(cumulative: number, maxImpressions: number, warningThreshold: number): string {
  if (maxImpressions <= 0) return 'available';
  const pct = (cumulative / maxImpressions) * 100;
  if (pct >= 95) return 're_rule_needed';
  if (pct >= warningThreshold) return 'maintenance_needed';
  return 'available';
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const template_type = searchParams.get('template_type');
  const asset_type = searchParams.get('asset_type');
  const die_status = searchParams.get('die_status');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let sql = `SELECT * FROM prd_die_template WHERE deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (template_code LIKE ? OR template_name LIKE ? OR qr_code LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like, like);
  }
  if (template_type) {
    sql += ' AND template_type = ?';
    values.push(parseInt(template_type));
  }
  if (asset_type) {
    sql += ' AND asset_type = ?';
    values.push(asset_type);
  }
  if (die_status) {
    sql += ' AND die_status = ?';
    values.push(die_status);
  }
  if (status) {
    sql += ' AND status = ?';
    values.push(parseInt(status));
  }

  sql += ' ORDER BY id ASC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM prd_die_template WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  const warningList = await query(
    `SELECT * FROM prd_die_template WHERE deleted = 0 AND (
      (die_status IN ('maintenance_needed', 're_rule_needed')) OR
      (current_usage >= warning_usage AND status = 1) OR
      (cumulative_impressions >= max_impressions * warning_threshold / 100 AND max_impressions > 0)
    )`
  ) as any[];

  const typeStats = await query(
    `SELECT template_type, asset_type, COUNT(*) as count,
      AVG(CASE WHEN max_impressions > 0 THEN cumulative_impressions / max_impressions * 100 ELSE 0 END) as avg_usage_pct,
      SUM(CASE WHEN die_status = 'maintenance_needed' THEN 1 ELSE 0 END) as maintenance_needed_count,
      SUM(CASE WHEN die_status = 're_rule_needed' THEN 1 ELSE 0 END) as re_rule_needed_count,
      SUM(CASE WHEN die_status = 'scrap' THEN 1 ELSE 0 END) as scrap_count
    FROM prd_die_template WHERE deleted = 0 GROUP BY template_type, asset_type`
  ) as any[];

  const dashboardStats = await query(
    `SELECT
      COUNT(*) as total_count,
      SUM(CASE WHEN die_status = 'available' OR status = 1 THEN 1 ELSE 0 END) as available_count,
      SUM(CASE WHEN die_status = 'maintenance_needed' OR status = 2 THEN 1 ELSE 0 END) as warning_count,
      SUM(CASE WHEN die_status = 're_rule_needed' OR status = 3 THEN 1 ELSE 0 END) as locked_count,
      SUM(CASE WHEN die_status = 'scrap' OR status = 4 THEN 1 ELSE 0 END) as scrap_count,
      SUM(CASE WHEN maintenance_interval > 0 AND (cumulative_impressions - last_maintenance_impressions) >= maintenance_interval THEN 1 ELSE 0 END) as maintenance_due_count
    FROM prd_die_template WHERE deleted = 0`
  ) as any[];

  return successResponse({
    list,
    total: countResult?.total || 0,
    page,
    pageSize,
    warningList,
    typeStats,
    dashboardStats: dashboardStats[0] || {},
    assetTypeMap: ASSET_TYPE_MAP,
    dieStatusMap: DIE_STATUS_MAP,
  });
}, '获取刀模板/网版列表失败');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['template_code', 'template_name', 'template_type']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const existing = await queryOne('SELECT id FROM prd_die_template WHERE template_code = ? AND deleted = 0', [body.template_code]);
  if (existing) {
    return errorResponse('刀模板/网版编号已存在', 409, 409);
  }

  const maxUsage = body.max_usage || 0;
  const currentUsage = body.current_usage || 0;
  const warningUsage = body.warning_usage || Math.round(maxUsage * 0.2);

  const maxImpressions = body.max_impressions || maxUsage;
  const cumulativeImpressions = body.cumulative_impressions || currentUsage;
  const warningThreshold = body.warning_threshold || 80;
  const maintenanceInterval = body.maintenance_interval || 8000;
  const assetType = body.asset_type || (body.template_type === 2 ? 'screen_mesh' : 'die');
  const layoutType = body.layout_type || 'single_row';
  const piecesPerImpression = body.pieces_per_impression || 1;
  const dieStatus = computeDieStatus(cumulativeImpressions, maxImpressions, warningThreshold);

  const result = await execute(
    `INSERT INTO prd_die_template (
      template_code, template_name, asset_type, layout_type, pieces_per_impression,
      template_type, specification, material,
      max_usage, current_usage, remaining_usage, warning_usage,
      max_impressions, cumulative_impressions, warning_threshold,
      maintenance_interval, maintenance_count, last_maintenance_impressions,
      status, die_status, storage_location, purchase_date, supplier_id,
      unit_price, qr_code, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.template_code, body.template_name, assetType, layoutType, piecesPerImpression,
      body.template_type, body.specification || null, body.material || null,
      maxUsage, currentUsage, maxUsage - currentUsage, warningUsage,
      maxImpressions, cumulativeImpressions, warningThreshold,
      maintenanceInterval, 0, 0,
      body.status || 1, dieStatus,
      body.storage_location || null, body.purchase_date || null, body.supplier_id || null,
      body.unit_price || 0, body.qr_code || null, body.remark || null,
    ]
  );

  return successResponse({ id: result.insertId }, '刀模板/网版创建成功');
}, '创建刀模板/网版失败');

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return commonErrors.badRequest('ID不能为空');

  const existing = await queryOne('SELECT id FROM prd_die_template WHERE id = ? AND deleted = 0', [body.id]);
  if (!existing) return commonErrors.notFound('刀模板/网版不存在');

  return await transaction(async (conn) => {
    const maxUsage = body.max_usage;
    const currentUsage = body.current_usage;
    const maxImpressions = body.max_impressions;
    const cumulativeImpressions = body.cumulative_impressions;
    const warningThreshold = body.warning_threshold;

    let remainingUsage = undefined;
    let newStatus = body.status;
    let newDieStatus = body.die_status;

    if (maxUsage !== undefined && currentUsage !== undefined) {
      remainingUsage = maxUsage - currentUsage;
      const warningUsage = body.warning_usage || Math.round(maxUsage * 0.2);
      if (currentUsage >= maxUsage) {
        newStatus = 3;
      } else if (currentUsage >= warningUsage) {
        newStatus = 2;
      }
    }

    if (maxImpressions !== undefined && cumulativeImpressions !== undefined && warningThreshold !== undefined) {
      newDieStatus = computeDieStatus(cumulativeImpressions, maxImpressions, warningThreshold);
    } else if (maxImpressions !== undefined && cumulativeImpressions !== undefined) {
      const wt = warningThreshold || 80;
      newDieStatus = computeDieStatus(cumulativeImpressions, maxImpressions, wt);
    }

    if (body.force_die_status) {
      newDieStatus = body.force_die_status;
    }

    await conn.execute(
      `UPDATE prd_die_template SET
        template_name = ?, asset_type = ?, layout_type = ?, pieces_per_impression = ?,
        template_type = ?, specification = ?, material = ?,
        max_usage = ?, current_usage = ?, remaining_usage = ?, warning_usage = ?,
        max_impressions = ?, cumulative_impressions = ?, warning_threshold = ?,
        maintenance_interval = ?, maintenance_count = ?, last_maintenance_impressions = ?,
        last_maintenance_date = ?, last_used_date = ?,
        status = ?, die_status = ?, storage_location = ?,
        unit_price = ?, qr_code = ?, remark = ?
      WHERE id = ?`,
      [
        body.template_name, body.asset_type || existing.asset_type,
        body.layout_type || existing.layout_type, body.pieces_per_impression || existing.pieces_per_impression,
        body.template_type, body.specification, body.material,
        maxUsage, currentUsage, remainingUsage, body.warning_usage,
        maxImpressions, cumulativeImpressions, warningThreshold,
        body.maintenance_interval, body.maintenance_count, body.last_maintenance_impressions,
        body.last_maintenance_date || existing.last_maintenance_date,
        body.last_used_date || existing.last_used_date,
        newStatus || body.status || existing.status,
        newDieStatus || existing.die_status,
        body.storage_location,
        body.unit_price, body.qr_code, body.remark,
        body.id,
      ]
    );

    return successResponse(null, '刀模板/网版更新成功');
  });
}, '更新刀模板/网版失败');

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('ID不能为空');

  await execute('UPDATE prd_die_template SET deleted = 1 WHERE id = ?', [parseInt(id)]);
  return successResponse(null, '删除成功');
}, '删除刀模板/网版失败');
