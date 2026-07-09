import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 设备台账管理 API
 *
 * GET    /api/equipment          — 分页查询设备列表（支持筛选）
 * GET    /api/equipment?id=N     — 查询单个设备详情
 * POST   /api/equipment          — 创建设备
 * PUT    /api/equipment          — 更新设备
 * DELETE /api/equipment?id=N     — 删除设备（软删除）
 */

export const GET = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);

  // 单个设备详情
  const id = searchParams.get('id');
  if (id) {
    const rows: any = await query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM eq_maintenance_record r WHERE r.equipment_id = e.id AND r.deleted = 0) as maintenance_count,
              (SELECT MAX(maintenance_date) FROM eq_maintenance_record r WHERE r.equipment_id = e.id AND r.deleted = 0) as last_maintenance_date
       FROM eq_equipment e
       WHERE e.id = ? AND e.deleted = 0`,
      [Number(id)]
    );
    if (!rows || rows.length === 0) {
      return errorResponse('设备不存在', 404, 404);
    }
    return successResponse(rows[0]);
  }

  // 分页查询列表
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const keyword = searchParams.get('keyword') || '';
  const equipmentType = searchParams.get('equipment_type') || '';
  const status = searchParams.get('status') || '';
  const workshop = searchParams.get('workshop') || '';

  let where = 'WHERE e.deleted = 0';
  const params: any[] = [];

  if (keyword) {
    where += ' AND (e.equipment_code LIKE ? OR e.equipment_name LIKE ? OR e.model LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (equipmentType) {
    where += ' AND e.equipment_type = ?';
    params.push(equipmentType);
  }
  if (status) {
    where += ' AND e.status = ?';
    params.push(Number(status));
  }
  if (workshop) {
    where += ' AND e.workshop = ?';
    params.push(workshop);
  }

  const countRows: any = await query(
    `SELECT COUNT(*) as total FROM eq_equipment e ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const rows: any = await query(
    `SELECT e.id, e.equipment_code, e.equipment_name, e.equipment_type, e.model,
            e.manufacturer, e.workshop, e.location, e.status,
            e.cumulative_run_hours, e.cumulative_print_count,
            e.last_maintenance_date, e.next_maintenance_date
     FROM eq_equipment e ${where}
     ORDER BY e.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const {
      equipment_code,
      equipment_name,
      equipment_type,
      model,
      manufacturer,
      workshop,
      location,
      purchase_date,
      install_date,
      purchase_price,
      expected_life_years,
      remark,
    } = body;

    if (!equipment_code || !equipment_name) {
      return errorResponse('设备编号和名称不能为空', 400, 400);
    }

    // 检查编号唯一性
    const existing: any = await query(
      'SELECT id FROM eq_equipment WHERE equipment_code = ? AND deleted = 0',
      [equipment_code]
    );
    if (existing && existing.length > 0) {
      return errorResponse('设备编号已存在', 409, 409);
    }

    const result: any = await execute(
      `INSERT INTO eq_equipment
       (equipment_code, equipment_name, equipment_type, model, manufacturer,
        workshop, location, purchase_date, install_date, purchase_price,
        expected_life_years, remark, create_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        equipment_code,
        equipment_name,
        equipment_type || 'other',
        model || null,
        manufacturer || null,
        workshop || null,
        location || null,
        purchase_date || null,
        install_date || null,
        purchase_price || 0,
        expected_life_years || 10,
        remark || null,
        userInfo?.userId || null,
      ]
    );

    return successResponse({ id: result.insertId, equipment_code }, '设备创建成功');
  },
  { logTitle: '创建设备', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return errorResponse('ID不能为空', 400, 400);

    const allowedFields = [
      'equipment_name',
      'equipment_type',
      'model',
      'manufacturer',
      'workshop',
      'location',
      'purchase_date',
      'install_date',
      'purchase_price',
      'expected_life_years',
      'status',
      'cumulative_run_hours',
      'cumulative_print_count',
      'last_maintenance_date',
      'next_maintenance_date',
      'remark',
    ];

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(fields[field]);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse('没有可更新的字段', 400, 400);
    }

    updateFields.push('update_by = ?');
    updateValues.push(userInfo?.userId || null);
    updateValues.push(Number(id));

    await execute(
      `UPDATE eq_equipment SET ${updateFields.join(', ')} WHERE id = ? AND deleted = 0`,
      updateValues
    );

    return successResponse(null, '更新成功');
  },
  { logTitle: '更新设备', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('ID不能为空', 400, 400);

    await execute('UPDATE eq_equipment SET deleted = 1, update_by = ? WHERE id = ?', [
      userInfo?.userId || null,
      Number(id),
    ]);

    return successResponse(null, '删除成功');
  },
  { logTitle: '删除设备', logType: 'business' }
);
