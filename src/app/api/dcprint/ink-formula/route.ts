import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, execute, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { isInkUnopenedShelfLife } from '@/lib/global-config';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const keyword = searchParams.get('keyword') || '';
  const colorName = searchParams.get('colorName') || '';
  const status = searchParams.get('status') || '';
  const workorderNo = searchParams.get('workorderNo') || '';

  let where = 'WHERE f.is_deleted = 0';
  const params: SqlValue[] = [];

  if (keyword) {
    where += ' AND (f.version_no LIKE ? OR f.version_name LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like);
  }
  if (colorName) {
    where +=
      ' AND EXISTS (SELECT 1 FROM dcprint_ink_color c WHERE c.id = f.color_id AND c.color_name LIKE ?)';
    params.push(`%${colorName}%`);
  }
  if (status) {
    where += ' AND f.status = ?';
    params.push(Number(status));
  }
  if (workorderNo) {
    where +=
      ' AND EXISTS (SELECT 1 FROM ink_formula_workorder fw WHERE fw.formula_id = f.id AND fw.workorder_no = ? AND fw.deleted = 0)';
    params.push(workorderNo);
  }

  const totalRows = await query(
    `SELECT COUNT(*) as total FROM dcprint_ink_formula_version f ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT f.*, c.color_name, c.pantone_code
     FROM dcprint_ink_formula_version f
     LEFT JOIN dcprint_ink_color c ON c.id = f.color_id
     ${where} ORDER BY f.create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  for (const row of rows) {
    const items = await query(
      'SELECT * FROM dcprint_ink_formula_item WHERE version_id = ? ORDER BY sort, add_order',
      [row.id]
    );
    row.items = items;

    const workorders = await query(
      `SELECT fw.*, wo.order_no, wo.product_name, wo.quantity, wo.status as workorder_status
       FROM ink_formula_workorder fw
       LEFT JOIN prod_work_order wo ON fw.workorder_id = wo.id
       WHERE fw.formula_id = ? AND fw.deleted = 0`,
      [row.id]
    );
    row.workorders = workorders;
  }

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      version_name,
      formula_name,
      pantone_code,
      color_name,
      color_code,
      color_id,
      ink_type,
      base_ink_type,
      total_weight,
      unit,
      shelf_life_hours,
      remark,
      items,
      workorder_id,
      workorder_no,
    } = body;

    const displayName = version_name || formula_name;
    if (!displayName || !items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(ts('k_18y4j1k'), 400, 400);
    }

    // 未提供 color_id 时按色名/色号自动匹配或创建墨色档案
    let resolvedColorId: number | null = color_id ?? null;
    if (!resolvedColorId && (color_name || color_code)) {
      const [existing] = await query(
        'SELECT id FROM dcprint_ink_color WHERE (color_code = ? OR color_name = ?) AND is_deleted = 0 LIMIT 1',
        [color_code || '', color_name || '']
      );
      if (existing?.length) {
        resolvedColorId = Number(existing[0].id);
      } else {
        const ins = (await execute(
          `INSERT INTO dcprint_ink_color (color_code, color_name, pantone_code, base_ink_type, remark, status)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [
            color_code || `CLR${Date.now()}`,
            color_name || ts('k_1yo3rxb'),
            pantone_code || null,
            base_ink_type || null,
            remark || null,
          ]
        )) as unknown as { insertId?: number };
        resolvedColorId = Number(ins?.insertId) || null;
      }
    }

    const result = await transaction(async (conn) => {
      const now = new Date();
      const versionNo =
        'FM' +
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(Math.floor(Math.random() * 10000)).padStart(4, '0');

      const [insertResult] = (await conn.execute(
        `INSERT INTO dcprint_ink_formula_version (version_no, version_name, color_id, total_weight, unit, shelf_life_hours, status, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          versionNo,
          displayName,
          resolvedColorId,
          total_weight || null,
          unit || 'kg',
          shelf_life_hours || isInkUnopenedShelfLife(),
        ]
      )) as unknown as [{ insertId: number }];
      const formulaId = Number(insertResult.insertId);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await conn.execute(
          `INSERT INTO dcprint_ink_formula_item (version_id, sort, add_order, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, is_base)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            formulaId,
            i + 1,
            i + 1,
            item.ink_id || item.material_id || null,
            item.ink_code || item.material_code || null,
            item.ink_name || item.material_name || '',
            item.ink_type || null,
            item.brand || null,
            item.ratio_percent ?? item.ratio ?? 0,
            item.weight || 0,
            item.unit || 'kg',
            item.is_base ? 1 : 0,
          ]
        );
      }

      if (workorder_id && workorder_no) {
        await conn.execute(
          `INSERT INTO ink_formula_workorder (formula_id, workorder_id, workorder_no, status)
         VALUES (?, ?, ?, 1)`,
          [formulaId, workorder_id, workorder_no]
        );
      }

      return { id: formulaId, formula_no: versionNo, version_no: versionNo };
    });

    return successResponse(result, ts('k_cjn79a'));
  },
  { logTitle: '创建油墨配方', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action, status, remark, items, workorder_id, workorder_no } = body;

    if (!id) {
      return errorResponse(ts('k_uuwvjs'), 400, 400);
    }

    if (action === 'bind_workorder') {
      if (!workorder_id || !workorder_no) {
        return errorResponse(ts('k_12sfxpe'), 400, 400);
      }
      await execute(
        `INSERT INTO ink_formula_workorder (formula_id, workorder_id, workorder_no, status)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE deleted = 0, status = 1`,
        [id, workorder_id, workorder_no]
      );
      return successResponse(null, ts('k_19jgny5'));
    }

    if (action === 'unbind_workorder') {
      if (!workorder_id) {
        return errorResponse(ts('k_729j1r'), 400, 400);
      }
      await execute(
        'UPDATE ink_formula_workorder SET deleted = 1 WHERE formula_id = ? AND workorder_id = ?',
        [id, workorder_id]
      );
      return successResponse(null, ts('k_5ebz3'));
    }

    if (action === 'approve') {
      await execute('UPDATE dcprint_ink_formula_version SET status = 2 WHERE id = ? AND is_deleted = 0', [
        id,
      ]);
      return successResponse(null, ts('k_mg7prp'));
    }

    if (status !== undefined) {
      await execute(
        'UPDATE dcprint_ink_formula_version SET status = ? WHERE id = ? AND is_deleted = 0',
        [status, id]
      );
    }
    if (remark !== undefined) {
      await execute(
        'UPDATE dcprint_ink_formula_version SET change_reason = ? WHERE id = ? AND is_deleted = 0',
        [remark, id]
      );
    }

    if (items && Array.isArray(items)) {
      await transaction(async (conn) => {
        await conn.execute('DELETE FROM dcprint_ink_formula_item WHERE version_id = ?', [id]);
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await conn.execute(
            `INSERT INTO dcprint_ink_formula_item (version_id, sort, add_order, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, is_base)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              i + 1,
              i + 1,
              item.ink_id || item.material_id || null,
              item.ink_code || item.material_code || null,
              item.ink_name || item.material_name || '',
              item.ink_type || null,
              item.brand || null,
              item.ratio_percent ?? item.ratio ?? 0,
              item.weight || 0,
              item.unit || 'kg',
              item.is_base ? 1 : 0,
            ]
          );
        }
      });
    }

    return successResponse(null, ts('k_virgja'));
  },
  { logTitle: '更新油墨配方', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse(ts('k_js4lo9'), 400, 400);

    await transaction(async (conn) => {
      await conn.execute('UPDATE dcprint_ink_formula_version SET is_deleted = 1 WHERE id = ?', [
        Number(id),
      ]);
      await conn.execute('UPDATE ink_formula_workorder SET deleted = 1 WHERE formula_id = ?', [
        Number(id),
      ]);
    });

    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除油墨配方', logType: 'business' }
);
