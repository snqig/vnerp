import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getTrPrefix, generateDocNo } from '@/lib/global-config';

interface Transfer {
  id: number;
  transfer_no: string;
  type: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  from_location: string | null;
  to_location: string | null;
  status: number;
  operator_id: number | null;
  approver_id: number | null;
  out_time: string | null;
  in_time: string | null;
  remark: string | null;
  create_time: string;
  update_time: string;
}

interface TransferItem {
  id: number;
  transfer_id: number;
  material_id: number;
  qr_code: string | null;
  quantity: number;
  out_quantity: number;
  in_quantity: number;
  unit: string | null;
  batch_no: string | null;
}

const TYPE_MAP: Record<number, string> = {
  1: '库位调拨',
  2: '仓库调拨',
};

const STATUS_MAP: Record<number, string> = {
  0: '草稿',
  1: '待审批',
  2: '已出库',
  3: '已入库',
  4: '已取消',
};

function generateTransferNo(): string {
  return generateDocNo(getTrPrefix());
}

export const GET = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const transferNo = searchParams.get('transferNo') || '';
  const status = searchParams.get('status') !== '' ? Number(searchParams.get('status')) : undefined;

  let where = 'WHERE t.deleted = 0';
  const params: any[] = [];

  if (transferNo) {
    where += ' AND t.transfer_no LIKE ?';
    params.push(`%${transferNo}%`);
  }
  if (status !== undefined) {
    where += ' AND t.status = ?';
    params.push(status);
  }

  const totalRows: any = await query(
    `SELECT COUNT(*) as total FROM inv_transfer_order t ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows: any[] = await query(
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
    list: rows.map((row: any) => ({
      ...row,
      type_name: TYPE_MAP[row.type] || '未知',
      status_name: STATUS_MAP[row.status] || '未知',
    })),
    total,
    page,
    pageSize,
  });
});

export const POST = withPermission(async (request: NextRequest, userInfo) => {
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
    return errorResponse('请选择调出仓库', 400, 400);
  }

  if (!to_warehouse_id) {
    return errorResponse('请选择调入仓库', 400, 400);
  }

  if (![1, 2].includes(type)) {
    return errorResponse('调拨类型无效（1=库位调拨，2=仓库调拨）', 400, 400);
  }

  if (type === 1 && from_warehouse_id !== to_warehouse_id) {
    return errorResponse('库位调拨必须在同一仓库内进行', 400, 400);
  }

  if (!from_location && type === 1) {
    return errorResponse('请选择调出库位', 400, 400);
  }

  if (!to_location && type === 1) {
    return errorResponse('请选择调入库位', 400, 400);
  }

  const transferNo = generateTransferNo();

  const result: any = await execute(
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
          transfer_id, material_id, quantity,
          unit, batch_no
        ) VALUES (?, ?, ?, ?, ?)`,
        [transferId, item.material_id, item.quantity, item.unit || null, item.batch_no || null]
      );
    }
  }

  return successResponse(
    {
      id: transferId,
      transfer_no: transferNo,
      status: 0,
    },
    '调拨单创建成功'
  );
});

export const PUT = withPermission(async (request: NextRequest, userInfo) => {
  const body = await request.json();
  const { id, action, approver_id } = body;

  const transfer: any = await queryOne(
    `SELECT * FROM inv_transfer_order WHERE id = ? AND deleted = 0`,
    [id]
  );

  if (!transfer) {
    return commonErrors.notFound('调拨单不存在');
  }

  switch (action) {
    case 'submit':
      // 提交审批：草稿→待审批
      if (transfer.status !== 0) {
        return errorResponse('只有草稿状态的调拨单才能提交审批', 400, 400);
      }
      await execute(
        `UPDATE inv_transfer_order SET status = 1, update_time = NOW() WHERE id = ?`,
        [id]
      );
      return successResponse(null, '调拨单已提交审批');

    case 'approve':
      if (transfer.status !== 1) {
        return errorResponse('只有待审批的调拨单才能审批', 400, 400);
      }

      if (!approver_id) {
        return errorResponse('请指定审批人', 400, 400);
      }

      await execute(
        `UPDATE inv_transfer_order
         SET status = 2, approver_id = ?, update_time = NOW()
         WHERE id = ?`,
        [approver_id, id]
      );

      return successResponse(null, '调拨单审批通过');

    case 'reject':
      if (transfer.status !== 1) {
        return errorResponse('只有待审批的调拨单才能驳回', 400, 400);
      }

      await execute(`UPDATE inv_transfer_order SET status = 4, update_time = NOW() WHERE id = ?`, [
        id,
      ]);

      return successResponse(null, '调拨单已驳回');

    case 'cancel':
      if (![0, 1].includes(transfer.status)) {
        return errorResponse('只能取消草稿或待审批的调拨单', 400, 400);
      }

      await execute(`UPDATE inv_transfer_order SET status = 4, update_time = NOW() WHERE id = ?`, [
        id,
      ]);

      return successResponse(null, '调拨单已取消');

    default:
      return errorResponse('无效的操作类型', 400, 400);
  }
});

export const DELETE = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('缺少ID参数', 400, 400);
  }

  const transfer: any = await queryOne(
    `SELECT * FROM inv_transfer_order WHERE id = ? AND deleted = 0`,
    [Number(id)]
  );

  if (!transfer) {
    return commonErrors.notFound('调拨单不存在');
  }

  if (![0, 4].includes(transfer.status)) {
    return errorResponse('只能删除草稿或已取消的调拨单', 400, 400);
  }

  await execute(`UPDATE inv_transfer_order SET deleted = 1, update_time = NOW() WHERE id = ?`, [
    Number(id),
  ]);

  return successResponse(null, '调拨单删除成功');
});
