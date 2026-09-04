import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, execute, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { recomputeInventorySummary } from '@/lib/inventory-ledger';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const receiveNo = searchParams.get('receiveNo') || '';
  const outsourceOrderNo = searchParams.get('outsourceOrderNo') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE r.deleted = 0';
  const params: SqlValue[] = [];
  if (receiveNo) {
    where += ' AND r.receive_no LIKE ?';
    params.push('%' + receiveNo + '%');
  }
  if (outsourceOrderNo) {
    where += ' AND r.outsource_order_no LIKE ?';
    params.push('%' + outsourceOrderNo + '%');
  }
  if (status) {
    where += ' AND r.status = ?';
    params.push(Number(status));
  }

  const totalRows = await query(
    'SELECT COUNT(*) as total FROM outsource_receive r ' + where,
    params
  );
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT r.*, w.warehouse_name FROM outsource_receive r LEFT JOIN inv_warehouse w ON r.warehouse_id = w.id ' +
      where +
      ' ORDER BY r.create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      outsource_order_id,
      outsource_order_no,
      warehouse_id,
      receive_date,
      receive_qty,
      qualified_qty,
      defective_qty,
      operator_name,
      remark,
    } = body;

    if (!outsource_order_id) return errorResponse(ts('k_1n84mps'), 400, 400);
    if (!warehouse_id) return errorResponse(ts('k_1wa8aih'), 400, 400);

    const now = new Date();
    const receiveNo =
      'OR' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const result = await execute(
      `INSERT INTO outsource_receive (receive_no, outsource_order_id, outsource_order_no, warehouse_id, receive_date, receive_qty, qualified_qty, defective_qty, qc_status, status, operator_name, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
      [
        receiveNo,
        outsource_order_id,
        outsource_order_no || null,
        warehouse_id,
        receive_date || null,
        receive_qty || 0,
        qualified_qty || 0,
        defective_qty || 0,
        operator_name || null,
        remark || null,
      ]
    );

    return successResponse({ id: result.insertId, receive_no: receiveNo }, ts('k_1nu25af'));
  },
  { logTitle: '创建委外收货单', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action, status, qc_status, qualified_qty, defective_qty, remark } = body;

    if (!id) return errorResponse(ts('k_1yvbhui'), 400, 400);

    if (action === 'post') {
      const result = await transaction(async (conn) => {
        const [receiveRows] = await conn.execute(
          'SELECT id, receive_no, outsource_order_id, outsource_order_no, warehouse_id, status, qc_status, receive_qty, qualified_qty FROM outsource_receive WHERE id = ? AND deleted = 0 FOR UPDATE',
          [id]
        );
        if (receiveRows.length === 0) throw new Error(ts('k_1qhi45c'));
        const receive = receiveRows[0];
        if (receive.status >= 3) throw new Error(ts('k_dcu88c'));
        if (receive.qc_status === 3) throw new Error(ts('k_kq1av2'));

        const orderRows = await query(
          'SELECT product_id, product_code, product_name FROM outsource_order WHERE id = ? AND deleted = 0',
          [receive.outsource_order_id]
        );
        const order = orderRows && orderRows.length > 0 ? orderRows[0] : {};

        const inQty = Number(receive.qualified_qty) || Number(receive.receive_qty) || 0;

        // 1) 新建批次（委外收货成品入库）—— 批次明细为权威源
        const recvBatchNo = `OR${receive.receive_no}${id}`;
        const today = new Date().toISOString().slice(0, 10);
        await conn.execute(
          `INSERT INTO inv_inventory_batch
           (material_id, material_name, batch_no, quantity, available_qty, warehouse_id, inbound_date, status, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
          [
            order.product_id,
            order.product_name || '',
            recvBatchNo,
            inQty,
            inQty,
            receive.warehouse_id,
            today,
          ]
        );

        // 2) 派生重算汇总（批次已新增，汇总 = 批次 SUM）
        await recomputeInventorySummary(conn, order.product_id, receive.warehouse_id);

        // 3) 财务级流水（保留原 raw INSERT 含 account_dr/cr，财务列治理归 T-INV-6）
        const transNo = 'TRX' + Date.now() + String(id).slice(-4);
        await conn.execute(
          ts('k_1guz0ae'),
          [
            transNo,
            id,
            order.product_id,
            order.product_code || '',
            recvBatchNo,
            receive.warehouse_id,
            inQty,
          ]
        );

        await conn.execute(
          'UPDATE outsource_receive SET status = 3, qc_status = COALESCE(qc_status, 2), update_time = NOW() WHERE id = ?',
          [id]
        );

        await conn.execute(
          `UPDATE outsource_order SET received_qty = COALESCE(received_qty, 0) + ?, qualified_qty = COALESCE(qualified_qty, 0) + ?,
         status = CASE WHEN COALESCE(received_qty, 0) + ? >= plan_qty THEN 4 WHEN COALESCE(received_qty, 0) + ? > 0 THEN 3 ELSE status END
         WHERE id = ? AND deleted = 0`,
          [
            Number(receive.receive_qty) || 0,
            inQty,
            Number(receive.receive_qty) || 0,
            Number(receive.receive_qty) || 0,
            receive.outsource_order_id,
          ]
        );

        return { id, status: 3 };
      });
      return successResponse(result, ts('k_b0jot5'));
    }

    if (action === 'qc_pass') {
      await execute('UPDATE outsource_receive SET qc_status = 2 WHERE id = ? AND deleted = 0', [
        id,
      ]);
      return successResponse(null, ts('k_1qhewbl'));
    }
    if (action === 'qc_fail') {
      await execute('UPDATE outsource_receive SET qc_status = 3 WHERE id = ? AND deleted = 0', [
        id,
      ]);
      return successResponse(null, ts('k_gy3n9w'));
    }

    const fields: string[] = [];
    const values: SqlValue[] = [];
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }
    if (qc_status !== undefined) {
      fields.push('qc_status = ?');
      values.push(qc_status);
    }
    if (qualified_qty !== undefined) {
      fields.push('qualified_qty = ?');
      values.push(qualified_qty);
    }
    if (defective_qty !== undefined) {
      fields.push('defective_qty = ?');
      values.push(defective_qty);
    }
    if (remark !== undefined) {
      fields.push('remark = ?');
      values.push(remark);
    }
    if (fields.length > 0) {
      values.push(id);
      await execute(
        `UPDATE outsource_receive SET ${fields.join(', ')} WHERE id = ? AND deleted = 0`,
        values
      );
    }

    return successResponse(null, ts('k_19cy3gk'));
  },
  { logTitle: '更新委外收货单', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse(ts('k_js4lo9'), 400, 400);
    await execute('UPDATE outsource_receive SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除委外收货单', logType: 'business' }
);
