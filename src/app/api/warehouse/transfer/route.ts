import { t } from '@/lib/server-translate';
import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, execute, queryOne, SqlValue } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getTrPrefix, generateDocNo } from '@/lib/global-config';
import { TRANSFER_TYPE_LABEL, TRANSFER_STATUS_LABEL } from '@/lib/status-labels';
import { checkMaterialsCategorized } from '@/lib/category-validation';
import { secureLog } from '@/lib/logger';
import type { DbRow } from '@/types/db';

const TYPE_MAP = TRANSFER_TYPE_LABEL;
const STATUS_MAP = TRANSFER_STATUS_LABEL;

function generateTransferNo(): string {
  return generateDocNo(getTrPrefix());
}

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const transferNo = searchParams.get('transferNo') || '';
  const statusParam = searchParams.get('status');
  const status = statusParam !== null && statusParam !== '' ? Number(statusParam) : undefined;

  let where = 'WHERE t.deleted = 0';
  const params: SqlValue[] = [];

  if (transferNo) {
    where += ' AND t.transfer_no LIKE ?';
    params.push(`%${transferNo}%`);
  }
  if (status !== undefined) {
    where += ' AND t.status = ?';
    params.push(status);
  }

  const totalRows = await query(
    `SELECT COUNT(*) as total FROM inv_transfer_order t ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT t.*,
            w1.warehouse_name as from_warehouse_name,
            w2.warehouse_name as to_warehouse_name,
            u1.real_name as operator_name
     FROM inv_transfer_order t
     LEFT JOIN inv_warehouse w1 ON t.from_warehouse_id = w1.id
     LEFT JOIN inv_warehouse w2 ON t.to_warehouse_id = w2.id
     LEFT JOIN sys_user u1 ON t.operator_id = u1.id
     ${where}
     ORDER BY t.create_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({
    list: rows.map((row: DbRow) => {
  const ts = t;
  return  ({
      ...row,
      type_name: TYPE_MAP[row.type] || ts('k_1lpnuh4'),
      status_name: STATUS_MAP[row.status] || ts('k_1lpnuh4'),
    });
}),
    total,
    page,
    pageSize,
  });
});

export const POST = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const {
    type = 1,
    from_warehouse_id,
    to_warehouse_id,
    from_location,
    to_location,
    operator_id,
    remark,
    items,
  } = body;

  if (!from_warehouse_id) {
    return errorResponse(ts('k_vqjfur'), 400, 400);
  }

  if (!to_warehouse_id) {
    return errorResponse(ts('k_l4ganq'), 400, 400);
  }

  if (![1, 2].includes(type)) {
    return errorResponse(ts('k_1s5wyn2'), 400, 400);
  }

  if (type === 1 && from_warehouse_id !== to_warehouse_id) {
    return errorResponse(ts('k_1jzjwz0'), 400, 400);
  }

  if (!from_location && type === 1) {
    return errorResponse(ts('k_11r9q71'), 400, 400);
  }

  if (!to_location && type === 1) {
    return errorResponse(ts('k_qk44qs'), 400, 400);
  }

  const transferNo = generateTransferNo();

  // 系统设置 category.require_on_business：调拨单要求物料已归类
  if (items && Array.isArray(items) && items.length > 0) {
    const materialIds = (items as DbRow[]).map((item: DbRow) => item.material_id).filter(Boolean);
    secureLog('info', ts('k_y3muv9'), {
      itemCount: items.length,
      materialIds,
    });
    const categoryCheck = await checkMaterialsCategorized(materialIds);
    secureLog('info', ts('k_19cbevo'), {
      blocked: categoryCheck.blocked,
      uncategorizedCount: categoryCheck.uncategorized.length,
    });
    if (categoryCheck.blocked) {
      secureLog('warn', ts('k_jzuj74'), {
        message: categoryCheck.message,
      });
      return errorResponse(categoryCheck.message!, 400, 400);
    }
    if (categoryCheck.message) {
      secureLog('warn', ts('k_1klmc4g'), {
        message: categoryCheck.message,
      });
    }

    const result = await execute(
      `INSERT INTO inv_transfer_order (
        transfer_no, type, from_warehouse_id, to_warehouse_id,
        from_location, to_location, status, operator_id,
        remark, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NOW(), NOW())`,
      [
        transferNo,
        type,
        from_warehouse_id,
        to_warehouse_id,
        from_location || null,
        to_location || null,
        operator_id || null,
        remark || null,
      ]
    );

    const transferId = result.insertId;

    for (const item of items) {
      if (!item.material_id || !item.quantity) continue;

      await execute(
        `INSERT INTO inv_transfer_item (
          transfer_id, material_id, material_code, material_name,
          quantity, unit, batch_no, batch_id, original_inbound_date, location_id, qr_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transferId,
          item.material_id,
          item.material_code || null,
          item.material_name || null,
          item.quantity,
          item.unit || null,
          item.batch_no || null,
          item.batch_id || null,
          item.original_inbound_date || null,
          item.location_id || null,
          item.qr_code || null,
        ]
      );
    }

    return successResponse(
      {
        id: transferId,
        transfer_no: transferNo,
        status: 0,
        uncategorizedMaterials: categoryCheck.uncategorized,
      },
      categoryCheck.message ? `调拨单创建成功。${categoryCheck.message}` : ts('k_w65uch')
    );
  }

  const result = await execute(
    `INSERT INTO inv_transfer_order (
      transfer_no, type, from_warehouse_id, to_warehouse_id,
      from_location, to_location, status, operator_id,
      remark, create_time, update_time
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NOW(), NOW())`,
    [
      transferNo,
      type,
      from_warehouse_id,
      to_warehouse_id,
      from_location || null,
      to_location || null,
      operator_id || null,
      remark || null,
    ]
  );

  const transferId = result.insertId;

  if (items && Array.isArray(items)) {
    for (const item of items) {
      if (!item.material_id || !item.quantity) continue;

      await execute(
        `INSERT INTO inv_transfer_item (
          transfer_id, material_id, material_code, material_name,
          quantity, unit, batch_no, batch_id, original_inbound_date, location_id, qr_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transferId,
          item.material_id,
          item.material_code || null,
          item.material_name || null,
          item.quantity,
          item.unit || null,
          item.batch_no || null,
          item.batch_id || null,
          item.original_inbound_date || null,
          item.location_id || null,
          item.qr_code || null,
        ]
      );
    }
  }

  return successResponse(
    {
      id: transferId,
      transfer_no: transferNo,
      status: 0,
    },
    ts('k_w65uch')
  );
});

export const PUT = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  const { id, action, approver_id } = body;

  const transfer = await queryOne(`SELECT * FROM inv_transfer_order WHERE id = ? AND deleted = 0`, [
    id,
  ]);

  if (!transfer) {
    return commonErrors.notFound(ts('k_118ryb8'));
  }

  switch (action) {
    case 'submit':
      // 提交审批：草稿→待审批
      if (transfer.status !== 0) {
        return errorResponse(ts('k_1bnm2sz'), 400, 400);
      }
      await execute(`UPDATE inv_transfer_order SET status = 1, update_time = NOW() WHERE id = ?`, [
        id,
      ]);
      return successResponse(null, ts('k_w7efif'));

    case 'approve':
      if (transfer.status !== 1) {
        return errorResponse(ts('k_hmi4kz'), 400, 400);
      }

      if (!approver_id) {
        return errorResponse(ts('k_141pjml'), 400, 400);
      }

      await execute(
        `UPDATE inv_transfer_order
         SET status = 2, approver_id = ?, update_time = NOW()
         WHERE id = ?`,
        [approver_id, id]
      );

      return successResponse(null, ts('k_1gbywpo'));

    case 'reject':
      if (transfer.status !== 1) {
        return errorResponse(ts('k_ia45zk'), 400, 400);
      }

      await execute(`UPDATE inv_transfer_order SET status = 4, update_time = NOW() WHERE id = ?`, [
        id,
      ]);

      return successResponse(null, ts('k_u77yvk'));

    case 'cancel':
      if (![0, 1].includes(transfer.status)) {
        return errorResponse(ts('k_1srdhz7'), 400, 400);
      }

      await execute(`UPDATE inv_transfer_order SET status = 4, update_time = NOW() WHERE id = ?`, [
        id,
      ]);

      return successResponse(null, ts('k_14ws6tb'));

    default:
      return errorResponse(ts('k_4ty90w'), 400, 400);
  }
});

export const DELETE = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse(ts('k_g0g39f'), 400, 400);
  }

  const transfer = await queryOne(`SELECT * FROM inv_transfer_order WHERE id = ? AND deleted = 0`, [
    Number(id),
  ]);

  if (!transfer) {
    return commonErrors.notFound(ts('k_118ryb8'));
  }

  if (![0, 4].includes(transfer.status)) {
    return errorResponse(ts('k_ohmnjs'), 400, 400);
  }

  await execute(`UPDATE inv_transfer_order SET deleted = 1, update_time = NOW() WHERE id = ?`, [
    Number(id),
  ]);

  return successResponse(null, ts('k_pda8'));
});
