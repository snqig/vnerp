import { getTranslations } from 'next-intl/server';

;
﻿import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { NextRequest } from 'next/server';
import type { DbRow } from '@/types/db';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const plateCode = searchParams.get('plateCode');

  if (id) {
    const rows = await query(
      `
      SELECT sp.*, sp.size_spec AS size, sp.used_count AS life_count, sp.remaining_count AS reclaim_count, NULL AS tension_value, c.customer_name, w.warehouse_name, l.location_name
      FROM prd_screen_plate sp
      LEFT JOIN crm_customer c ON sp.customer_id = c.id
      LEFT JOIN inv_warehouse w ON sp.warehouse_id = w.id
      LEFT JOIN inv_location l ON sp.location_id = l.id
      WHERE sp.id = ? AND sp.deleted = 0
    `,
      [id]
    );
    return successResponse((rows as DbRow[])[0], ts('k_1ws33o1'));
  }

  if (plateCode) {
    const rows = await query(
      `
      SELECT sp.*, sp.size_spec AS size, sp.used_count AS life_count, sp.remaining_count AS reclaim_count, NULL AS tension_value, c.customer_name, w.warehouse_name, l.location_name
      FROM prd_screen_plate sp
      LEFT JOIN crm_customer c ON sp.customer_id = c.id
      LEFT JOIN inv_warehouse w ON sp.warehouse_id = w.id
      LEFT JOIN inv_location l ON sp.location_id = l.id
      WHERE sp.plate_code = ? AND sp.deleted = 0
    `,
      [plateCode]
    );
    return successResponse((rows as DbRow[])[0], ts('k_1ws33o1'));
  }

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const offset = (page - 1) * pageSize;
  const status = searchParams.get('status');
  const customerName = searchParams.get('customerName');

  let whereClause = 'sp.deleted = 0';
  const params: SqlValue[] = [];

  if (status) {
    whereClause += ' AND sp.status = ?';
    params.push(status);
  }
  if (customerName) {
    whereClause += ' AND c.customer_name LIKE ?';
    params.push(`%${customerName}%`);
  }

  const [rows, countResult] = await Promise.all([
    query(
      `
      SELECT sp.*, sp.size_spec AS size, sp.used_count AS life_count, sp.remaining_count AS reclaim_count, NULL AS tension_value, c.customer_name, w.warehouse_name, l.location_name
      FROM prd_screen_plate sp
      LEFT JOIN crm_customer c ON sp.customer_id = c.id
      LEFT JOIN inv_warehouse w ON sp.warehouse_id = w.id
      LEFT JOIN inv_location l ON sp.location_id = l.id
      WHERE ${whereClause}
      ORDER BY sp.create_time DESC
      LIMIT ? OFFSET ?
    `,
      [...params, pageSize, offset]
    ),
    query(
      `SELECT COUNT(*) as total FROM prd_screen_plate sp LEFT JOIN crm_customer c ON sp.customer_id = c.id WHERE ${whereClause}`,
      params
    ),
  ]);

  return successResponse(
    {
      list: rows,
      total: (countResult as DbRow[])[0].total,
      page,
      pageSize,
    },
    ts('k_2t19x7')
  );
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      plateCode,
      plateName,
      plateType,
      meshCount,
      meshMaterial,
      size,
      tensionValue,
      frameType,
      customerId,
      maxUseCount,
      warehouseId,
      locationId,
      remark,
    } = body;

    if (!plateCode || !plateName) {
      return errorResponse(ts('k_txpvs6'), 400);
    }

    const result = await execute(
      `
    INSERT INTO prd_screen_plate (
      plate_code, plate_name, plate_type, mesh_count, mesh_material, size_spec,
      frame_type, customer_id, max_use_count, used_count,
      remaining_count, warehouse_id, location_id, status, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1, ?)
  `,
      [
        plateCode,
        plateName,
        plateType || 1,
        meshCount ?? null,
        meshMaterial ?? null,
        size ?? null,
        frameType ?? null,
        customerId ?? null,
        maxUseCount || 800,
        maxUseCount || 800,
        warehouseId ?? null,
        locationId ?? null,
        remark ?? null,
      ]
    );

    const plateId = (result as DbRow).insertId;

    await execute(
      ts('k_1gekhst'),
      [plateId, body.operatorName || ts('k_p0ysv3')]
    );

    return successResponse({ id: plateId, plateCode }, ts('k_1gbc408'));
  },
  { logTitle: '创建网版', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse(ts('k_tf0fjk'), 400);
    }

    const updateFields: string[] = [];
    const params: SqlValue[] = [];

    const fieldMap: Record<string, string> = {
      plateName: 'plate_name',
      plateType: 'plate_type',
      meshCount: 'mesh_count',
      meshMaterial: 'mesh_material',
      size: 'size_spec',
      frameType: 'frame_type',
      customerId: 'customer_id',
      maxUseCount: 'max_use_count',
      warehouseId: 'warehouse_id',
      locationId: 'location_id',
      status: 'status',
      remark: 'remark',
      scrapReason: 'scrap_reason',
      storageLocation: 'storage_location',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        updateFields.push(`${col} = ?`);
        params.push(body[key]);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse(ts('k_1kyikfw'), 400);
    }

    updateFields.push('update_time = NOW()');
    params.push(id);

    await execute(`UPDATE prd_screen_plate SET ${updateFields.join(', ')} WHERE id = ?`, params);

    return successResponse(null, ts('k_1uehmf9'));
  },
  { logTitle: '更新网版', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse(ts('k_tf0fjk'), 400);
    }

    await execute('UPDATE prd_screen_plate SET deleted = 1, update_time = NOW() WHERE id = ?', [
      id,
    ]);

    await execute(
      ts('k_fbyvk4'),
      [id, ts('k_p0ysv3')]
    );

    return successResponse(null, ts('k_19t690t'));
  },
  { logTitle: '删除网版', logType: 'business' }
);
