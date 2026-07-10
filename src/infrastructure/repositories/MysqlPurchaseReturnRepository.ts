import mysql from 'mysql2/promise';
import {
  IPurchaseReturnRepository,
  Pagination,
  PaginatedResult,
} from '@/domain/purchase/repositories/IPurchaseReturnRepository';
import { PurchaseReturn, PurchaseReturnProps } from '@/domain/purchase/aggregates/PurchaseReturn';
import { PurchaseReturnLineProps } from '@/domain/purchase/entities/PurchaseReturnLine';
import { PurchaseReturnStatusValue } from '@/domain/purchase/value-objects/PurchaseReturnStatus';
import { query, execute, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

type SqlValue = string | number | null | boolean | Date;

/** pur_purchase_return 表行类型 */
interface PurPurchaseReturnRow {
  id: number;
  return_no: string;
  status: number;
  order_id: number;
  order_no: string;
  supplier_id: number;
  supplier_name: string;
  warehouse_id: number;
  receipt_id: number | null;
  receipt_no: string;
  reason: string;
  return_date: string;
  total_amount: number | string;
  approve_by: number | null;
  approve_time: string | null;
  complete_by: number | null;
  complete_time: string | null;
  outbound_order_id: number | null;
  outbound_order_no: string | null;
  payable_id: number | null;
  payable_no: string | null;
  remark: string;
  create_by: number | null;
  create_time: string;
  update_time: string;
  deleted: number;
}

/** pur_purchase_return_line 表行类型 */
interface PurPurchaseReturnLineRow {
  id: number;
  return_id: number;
  line_no: number;
  order_line_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  material_spec: string;
  unit: string;
  quantity: number | string;
  unit_price: number | string;
  amount: number | string;
  batch_no: string;
  reason: string;
  remark: string;
}

const RETURN_COLUMNS = `id, return_no, status, order_id, order_no, supplier_id, supplier_name,
  warehouse_id, receipt_id, receipt_no, reason, return_date, total_amount,
  approve_by, approve_time, complete_by, complete_time,
  outbound_order_id, outbound_order_no, payable_id, payable_no,
  remark, create_by, create_time, update_time`;

const LINE_COLUMNS = `id, return_id, line_no, order_line_id, material_id, material_code,
  material_name, material_spec, unit, quantity, unit_price, amount,
  batch_no, reason, remark`;

export class MysqlPurchaseReturnRepository implements IPurchaseReturnRepository {
  async findById(id: number): Promise<PurchaseReturn | null> {
    const rows = await query<PurPurchaseReturnRow>(
      `SELECT ${RETURN_COLUMNS} FROM pur_purchase_return WHERE id = ? AND deleted = 0`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const lines = await query<PurPurchaseReturnLineRow>(
      `SELECT ${LINE_COLUMNS} FROM pur_purchase_return_line WHERE return_id = ? ORDER BY line_no`,
      [id]
    );
    return this.mapToAggregate(rows[0], lines);
  }

  async findByReturnNo(returnNo: string): Promise<PurchaseReturn | null> {
    const rows = await query<PurPurchaseReturnRow>(
      `SELECT ${RETURN_COLUMNS} FROM pur_purchase_return WHERE return_no = ? AND deleted = 0`,
      [returnNo]
    );
    if (!rows || rows.length === 0) return null;
    const lines = await query<PurPurchaseReturnLineRow>(
      `SELECT ${LINE_COLUMNS} FROM pur_purchase_return_line WHERE return_id = ? ORDER BY line_no`,
      [rows[0].id]
    );
    return this.mapToAggregate(rows[0], lines);
  }

  async findByOrderId(orderId: number): Promise<PurchaseReturn[]> {
    const rows = await query<PurPurchaseReturnRow>(
      `SELECT ${RETURN_COLUMNS} FROM pur_purchase_return WHERE order_id = ? AND deleted = 0 ORDER BY create_time DESC`,
      [orderId]
    );
    if (!rows || rows.length === 0) return [];
    const returnIds = rows.map((r) => r.id);
    const allLines = await query<PurPurchaseReturnLineRow>(
      `SELECT ${LINE_COLUMNS} FROM pur_purchase_return_line WHERE return_id IN (${returnIds.map(() => '?').join(',')}) ORDER BY return_id, line_no`,
      returnIds
    );
    return rows.map((r) => {
      const lines = allLines.filter((l) => l.return_id === r.id);
      return this.mapToAggregate(r, lines);
    });
  }

  async findByStatus(
    status: number,
    pagination: Pagination,
    filters?: { keyword?: string; supplierId?: number; startDate?: string; endDate?: string }
  ): Promise<PaginatedResult<PurchaseReturn>> {
    const where: string[] = ['deleted = 0', 'status = ?'];
    const values: SqlValue[] = [status];
    if (filters?.keyword) {
      where.push('(return_no LIKE ? OR supplier_name LIKE ? OR order_no LIKE ?)');
      const like = `%${filters.keyword}%`;
      values.push(like, like, like);
    }
    if (filters?.supplierId) {
      where.push('supplier_id = ?');
      values.push(filters.supplierId);
    }
    if (filters?.startDate) {
      where.push('return_date >= ?');
      values.push(filters.startDate);
    }
    if (filters?.endDate) {
      where.push('return_date <= ?');
      values.push(filters.endDate);
    }
    const whereClause = where.join(' AND ');

    const countRows = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM pur_purchase_return WHERE ${whereClause}`,
      values
    );
    const total = countRows[0]?.total || 0;

    const offset = (pagination.page - 1) * pagination.pageSize;
    const rows = await query<PurPurchaseReturnRow>(
      `SELECT ${RETURN_COLUMNS} FROM pur_purchase_return WHERE ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...values, pagination.pageSize, offset]
    );

    if (!rows || rows.length === 0) {
      return {
        data: [],
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total,
          totalPages: Math.ceil(total / pagination.pageSize) || 0,
        },
      };
    }

    const returnIds = rows.map((r) => r.id);
    const allLines = await query<PurPurchaseReturnLineRow>(
      `SELECT ${LINE_COLUMNS} FROM pur_purchase_return_line WHERE return_id IN (${returnIds.map(() => '?').join(',')}) ORDER BY return_id, line_no`,
      returnIds
    );

    const data = rows.map((r) => {
      const lines = allLines.filter((l) => l.return_id === r.id);
      return this.mapToAggregate(r, lines);
    });

    return {
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize) || 0,
      },
    };
  }

  async save(ret: PurchaseReturn): Promise<{ id: number; returnNo: string }> {
    const returnNo = ret.returnNo || (await generateDocumentNo('purchase_return'));

    return transaction(async (conn) => {
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO pur_purchase_return
         (return_no, status, order_id, order_no, supplier_id, supplier_name,
          warehouse_id, receipt_id, receipt_no, reason, return_date, total_amount,
          remark, create_by, create_time, update_time, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
        [
          returnNo,
          ret.status.value,
          ret.orderId,
          ret.orderNo,
          ret.supplierId,
          ret.supplierName,
          ret.warehouseId,
          ret.receiptId ?? null,
          ret.receiptNo,
          ret.reason,
          ret.returnDate,
          ret.totalAmount,
          ret.remark,
          ret.createBy ?? null,
        ]
      );

      const newId = result.insertId;

      for (const line of ret.lines) {
        await conn.execute(
          `INSERT INTO pur_purchase_return_line
           (return_id, line_no, order_line_id, material_id, material_code,
            material_name, material_spec, unit, quantity, unit_price, amount,
            batch_no, reason, remark)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId,
            line.lineNo,
            line.orderLineId ?? null,
            line.materialId,
            line.materialCode,
            line.materialName,
            line.materialSpec,
            line.unit,
            line.quantity,
            line.unitPrice,
            line.amount,
            line.batchNo,
            line.reason,
            line.remark,
          ]
        );
      }

      return { id: newId, returnNo };
    });
  }

  async updateStatus(id: number, status: number): Promise<void> {
    await execute(`UPDATE pur_purchase_return SET status = ?, update_time = NOW() WHERE id = ?`, [
      status,
      id,
    ]);
  }

  async updateApproveInfo(id: number, approveBy: number, approveTime: string): Promise<void> {
    await execute(
      `UPDATE pur_purchase_return
       SET status = 2, approve_by = ?, approve_time = ?, update_time = NOW()
       WHERE id = ?`,
      [approveBy, approveTime, id]
    );
  }

  async updateCompleteInfo(
    id: number,
    completeBy: number,
    completeTime: string,
    outboundOrderId: number,
    outboundOrderNo: string,
    payableId: number,
    payableNo: string
  ): Promise<void> {
    await execute(
      `UPDATE pur_purchase_return
       SET status = 3, complete_by = ?, complete_time = ?,
           outbound_order_id = ?, outbound_order_no = ?,
           payable_id = ?, payable_no = ?, update_time = NOW()
       WHERE id = ?`,
      [completeBy, completeTime, outboundOrderId, outboundOrderNo, payableId, payableNo, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute(`UPDATE pur_purchase_return SET deleted = 1, update_time = NOW() WHERE id = ?`, [
      id,
    ]);
  }

  private mapToAggregate(
    row: PurPurchaseReturnRow,
    lines: PurPurchaseReturnLineRow[]
  ): PurchaseReturn {
    const lineProps: PurchaseReturnLineProps[] = (lines || []).map((l) => ({
      id: l.id,
      returnId: l.return_id,
      lineNo: l.line_no,
      orderLineId: l.order_line_id ?? undefined,
      materialId: l.material_id,
      materialCode: l.material_code || '',
      materialName: l.material_name || '',
      materialSpec: l.material_spec || '',
      unit: l.unit || '件',
      quantity: Number(l.quantity),
      unitPrice: Number(l.unit_price),
      amount: Number(l.amount),
      batchNo: l.batch_no || '',
      reason: l.reason || '',
      remark: l.remark || '',
    }));

    const props: PurchaseReturnProps = {
      id: row.id,
      returnNo: row.return_no,
      status: row.status as PurchaseReturnStatusValue,
      orderId: row.order_id,
      orderNo: row.order_no || '',
      supplierId: row.supplier_id,
      supplierName: row.supplier_name || '',
      warehouseId: row.warehouse_id,
      receiptId: row.receipt_id ?? undefined,
      receiptNo: row.receipt_no || '',
      reason: row.reason || '',
      returnDate: row.return_date ? String(row.return_date) : '',
      totalAmount: Number(row.total_amount || 0),
      approveBy: row.approve_by ?? undefined,
      approveTime: row.approve_time ? String(row.approve_time) : undefined,
      completeBy: row.complete_by ?? undefined,
      completeTime: row.complete_time ? String(row.complete_time) : undefined,
      outboundOrderId: row.outbound_order_id ?? undefined,
      outboundOrderNo: row.outbound_order_no || undefined,
      payableId: row.payable_id ?? undefined,
      payableNo: row.payable_no || undefined,
      remark: row.remark || '',
      createBy: row.create_by ?? undefined,
      createTime: row.create_time ? String(row.create_time) : undefined,
      updateTime: row.update_time ? String(row.update_time) : undefined,
      lines: lineProps,
    };
    return PurchaseReturn.reconstitute(props);
  }
}
