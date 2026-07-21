import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { OPERATION_TYPE_LABEL } from '@/lib/status-labels';

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const batchNo = searchParams.get('batchNo');

    if (!batchNo) {
      return errorResponse('batchNo 不能为空', 400, 400);
    }

    const batchRows = await query<Loose>(
      `SELECT
      id, batch_no, material_id, material_code, material_name,
      quantity, available_qty, locked_qty, unit_cost, unit_price,
      warehouse_id, location, inbound_date, produce_date, expire_date,
      status, deleted, create_time, update_time
    FROM inv_inventory_batch
    WHERE batch_no = ? AND deleted = 0
    ORDER BY create_time ASC`,
      [batchNo]
    );

    if (!batchRows || batchRows.length === 0) {
      return errorResponse(`批次 ${batchNo} 不存在`, 404, 404);
    }

    const batchSnapshot = batchRows[0];

    const logRows = await query<Loose>(
      `SELECT
      l.id, l.material_id, l.warehouse_id, l.batch_no,
      l.operation_type, l.operation_qty, l.before_qty, l.after_qty,
      l.business_type, l.business_no, l.remark, l.operator_id,
      l.create_time,
      w.warehouse_name,
      u.real_name as operator_name
    FROM inv_inventory_log l
    LEFT JOIN inv_warehouse w ON l.warehouse_id = w.id
    LEFT JOIN sys_user u ON l.operator_id = u.id
    WHERE l.batch_no = ?
    ORDER BY l.create_time ASC`,
      [batchNo]
    );

    const traceChain: Array<{
      log_id: number;
      operation_type: number;
      operation_type_label: string;
      operation_qty: number;
      before_qty: number;
      after_qty: number;
      business_type: string;
      business_no: string;
      warehouse_name: string;
      operator_name: string;
      remark: string;
      create_time: string;
      document?: {
        type: string;
        id?: number;
        no?: string;
        status?: string;
        details?: Loose;
      };
    }> = [];

    const OPERATION_TYPE_LABELS = OPERATION_TYPE_LABEL;

    for (const log of logRows) {
      const entry: Loose = {
        log_id: log.id,
        operation_type: log.operation_type,
        operation_type_label:
          OPERATION_TYPE_LABELS[log.operation_type] || `类型${log.operation_type}`,
        operation_qty: parseFloat(log.operation_qty),
        before_qty: parseFloat(log.before_qty),
        after_qty: parseFloat(log.after_qty),
        business_type: log.business_type,
        business_no: log.business_no,
        warehouse_name: log.warehouse_name || '',
        operator_name: log.operator_name || '',
        remark: log.remark || '',
        create_time: log.create_time,
      };

      try {
        if (log.business_type === 'inbound_order' || log.business_type === 'inbound') {
          const [order]: Loose = await query(
            `SELECT o.id, o.order_no, o.status, o.supplier_name, o.inbound_date, o.total_amount,
                  o.warehouse_id
           FROM inv_inbound_order o
           WHERE o.order_no = ? AND o.deleted = 0`,
            [log.business_no]
          );
          if (order) {
            entry.document = {
              type: 'inbound',
              id: order.id,
              no: order.order_no,
              status: order.status,
              details: {
                supplier_name: order.supplier_name,
                inbound_date: order.inbound_date,
                total_amount: parseFloat(order.total_amount),
              },
            };
          }
        } else if (log.business_type === 'outbound_order' || log.business_type === 'outbound') {
          const [order]: Loose = await query(
            `SELECT o.id, o.order_no, o.status, o.outbound_type, o.customer_name,
                  o.work_order_no, o.total_amount, o.order_date
           FROM inv_outbound_order o
           WHERE o.order_no = ? AND o.deleted = 0`,
            [log.business_no]
          );
          if (order) {
            entry.document = {
              type: 'outbound',
              id: order.id,
              no: order.order_no,
              status: order.status,
              details: {
                outbound_type: order.outbound_type,
                customer_name: order.customer_name,
                work_order_no: order.work_order_no,
                total_amount: parseFloat(order.total_amount),
                order_date: order.order_date,
              },
            };
          }
        } else if (log.business_type === 'transfer' || log.business_type === 'transfer_order') {
          const [order]: Loose = await query(
            `SELECT t.id, t.transfer_no, t.status, t.type,
                  t.from_warehouse_id, t.to_warehouse_id,
                  fw.warehouse_name as from_warehouse_name,
                  tw.warehouse_name as to_warehouse_name,
                  t.total_qty, t.total_amount
           FROM inv_transfer_order t
           LEFT JOIN inv_warehouse fw ON t.from_warehouse_id = fw.id
           LEFT JOIN inv_warehouse tw ON t.to_warehouse_id = tw.id
           WHERE t.transfer_no = ? AND t.deleted = 0`,
            [log.business_no]
          );
          if (order) {
            entry.document = {
              type: 'transfer',
              id: order.id,
              no: order.transfer_no,
              status: order.status,
              details: {
                transfer_type: order.type,
                from_warehouse_name: order.from_warehouse_name,
                to_warehouse_name: order.to_warehouse_name,
                total_qty: parseFloat(order.total_qty),
                total_amount: parseFloat(order.total_amount),
              },
            };
          }
        } else if (
          log.business_type === 'stocktaking' ||
          log.business_type === 'stocktaking_order'
        ) {
          const [order]: Loose = await query(
            `SELECT s.id, s.check_no, s.status, s.type, s.warehouse_name,
                  s.diff_items, s.total_diff_amount
           FROM inv_stocktaking s
           WHERE s.check_no = ? AND s.deleted = 0`,
            [log.business_no]
          );
          if (order) {
            entry.document = {
              type: 'stocktaking',
              id: order.id,
              no: order.check_no,
              status: order.status,
              details: {
                stocktaking_type: order.type,
                warehouse_name: order.warehouse_name,
                diff_items: order.diff_items,
                total_diff_amount: parseFloat(order.total_diff_amount),
              },
            };
          }
        } else if (log.business_type === 'stock_adjust' || log.business_type === 'adjust') {
          const [order]: Loose = await query(
            `SELECT a.id, a.adjust_no, a.status, a.adjust_type, a.total_amount
           FROM inv_stock_adjust a
           WHERE a.adjust_no = ? AND a.deleted = 0`,
            [log.business_no]
          );
          if (order) {
            entry.document = {
              type: 'stock_adjust',
              id: order.id,
              no: order.adjust_no,
              status: order.status,
              details: {
                adjust_type: order.adjust_type,
                total_amount: parseFloat(order.total_amount),
              },
            };
          }
        }
      } catch {
        // If document lookup fails, continue without document details
      }

      traceChain.push(entry);
    }

    const totalIn = logRows
      .filter((l: Loose) => l.operation_type === 1)
      .reduce((sum: number, l: Loose) => sum + parseFloat(l.operation_qty), 0);
    const totalOut = logRows
      .filter((l: Loose) => l.operation_type === 2)
      .reduce((sum: number, l: Loose) => sum + parseFloat(l.operation_qty), 0);

    return successResponse({
      batch: {
        batch_no: batchSnapshot.batch_no,
        material_id: batchSnapshot.material_id,
        material_code: batchSnapshot.material_code,
        material_name: batchSnapshot.material_name,
        warehouse_id: batchSnapshot.warehouse_id,
        location: batchSnapshot.location,
        quantity: parseFloat(batchSnapshot.quantity),
        available_qty: parseFloat(batchSnapshot.available_qty),
        locked_qty: parseFloat(batchSnapshot.locked_qty),
        unit_cost: parseFloat(batchSnapshot.unit_cost || batchSnapshot.unit_price || 0),
        inbound_date: batchSnapshot.inbound_date,
        produce_date: batchSnapshot.produce_date,
        expire_date: batchSnapshot.expire_date,
        status: batchSnapshot.status,
        create_time: batchSnapshot.create_time,
        update_time: batchSnapshot.update_time,
      },
      trace_chain: traceChain,
      summary: {
        total_records: traceChain.length,
        total_in: totalIn,
        total_out: totalOut,
        net_change: totalIn - totalOut,
      },
    });
  },
  { errorMessage: '批次追溯查询失败' }
);
