import {
  ITransferOrderRepository,
} from '@/domain/warehouse/repositories/ITransferOrderRepository';
import { Pagination, PaginatedResult } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { TransferOrder, TransferOrderProps } from '@/domain/warehouse/aggregates/TransferOrder';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

const ITEM_COLUMNS = `id, transfer_id, material_id, material_code, material_name,
                      qr_code, batch_no, quantity, out_quantity, in_quantity,
                      unit, unit_price, amount, remark`;

export class MysqlTransferOrderRepository implements ITransferOrderRepository {
  async findById(id: number): Promise<TransferOrder | null> {
    const orders = await query<any>(
      'SELECT * FROM inv_transfer_order WHERE id = ? AND deleted = 0',
      [id]
    );
    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const items = await query<any>(
      `SELECT ${ITEM_COLUMNS} FROM inv_transfer_item WHERE transfer_id = ? AND deleted = 0`,
      [id]
    );

    return TransferOrder.reconstitute(this.mapRowToProps(order, items));
  }

  async findByTransferNo(transferNo: string): Promise<TransferOrder | null> {
    const orders = await query<any>(
      'SELECT * FROM inv_transfer_order WHERE transfer_no = ? AND deleted = 0',
      [transferNo]
    );
    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const items = await query<any>(
      `SELECT ${ITEM_COLUMNS} FROM inv_transfer_item WHERE transfer_id = ? AND deleted = 0`,
      [order.id]
    );

    return TransferOrder.reconstitute(this.mapRowToProps(order, items));
  }

  async findByStatus(
    status: number,
    pagination: Pagination,
    filters?: {
      keyword?: string;
      fromWarehouseId?: number;
      toWarehouseId?: number;
      transferType?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<TransferOrder>> {
    let sql = `SELECT t.id, t.transfer_no, t.type, t.from_warehouse_id, t.to_warehouse_id,
               t.from_location, t.to_location, t.status, t.applicant_id, t.applicant_name,
               t.approver_id, t.approver_name, t.operator_id, t.operator_name,
               t.out_time, t.in_time, t.total_qty, t.total_amount, t.version,
               t.remark, t.create_time, t.update_time
               FROM inv_transfer_order t WHERE t.deleted = 0`;
    let countSql = `SELECT COUNT(*) as total FROM inv_transfer_order t WHERE t.deleted = 0`;
    const params: any[] = [];

    if (filters?.keyword) {
      const condition = ` AND (t.transfer_no LIKE ? OR t.applicant_name LIKE ?)`;
      sql += condition;
      countSql += condition;
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    if (status !== undefined && status !== null) {
      sql += ` AND t.status = ?`;
      countSql += ` AND t.status = ?`;
      params.push(status);
    }

    if (filters?.fromWarehouseId) {
      sql += ` AND t.from_warehouse_id = ?`;
      countSql += ` AND t.from_warehouse_id = ?`;
      params.push(filters.fromWarehouseId);
    }

    if (filters?.toWarehouseId) {
      sql += ` AND t.to_warehouse_id = ?`;
      countSql += ` AND t.to_warehouse_id = ?`;
      params.push(filters.toWarehouseId);
    }

    if (filters?.transferType) {
      sql += ` AND t.type = ?`;
      countSql += ` AND t.type = ?`;
      params.push(filters.transferType);
    }

    if (filters?.startDate) {
      sql += ` AND t.create_time >= ?`;
      countSql += ` AND t.create_time >= ?`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ` AND t.create_time <= ?`;
      countSql += ` AND t.create_time <= ?`;
      params.push(filters.endDate);
    }

    sql += ` ORDER BY t.create_time DESC`;

    const result = await queryPaginated(sql, countSql, params, pagination);

    if (result.data.length > 0) {
      const orderIds = result.data.map((t: any) => t.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const items = await query(
        `SELECT ${ITEM_COLUMNS} FROM inv_transfer_item WHERE transfer_id IN (${placeholders}) AND deleted = 0`,
        orderIds
      );

      const itemsMap = new Map<number, any[]>();
      for (const item of items as any[]) {
        if (!itemsMap.has(item.transfer_id)) {
          itemsMap.set(item.transfer_id, []);
        }
        itemsMap.get(item.transfer_id)!.push(item);
      }

      for (const order of result.data as any[]) {
        order.items = itemsMap.get(order.id) || [];
      }
    }

    return {
      data: result.data.map((t: any) =>
        TransferOrder.reconstitute(this.mapRowToProps(t, t.items || []))
      ),
      pagination: result.pagination,
    };
  }

  async save(order: TransferOrder): Promise<{ id: number; transferNo: string }> {
    const transferNo = await generateDocumentNo('transfer');
    const items = order.items;

    return await transaction(async (conn) => {
      const [orderResult]: any = await conn.execute(
        `INSERT INTO inv_transfer_order
         (transfer_no, type, from_warehouse_id, to_warehouse_id, from_location, to_location,
          status, applicant_id, applicant_name, operator_id, operator_name,
          total_qty, total_amount, version, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          transferNo,
          order.type,
          order.fromWarehouseId,
          order.toWarehouseId,
          order.fromLocation || null,
          order.toLocation || null,
          order.status.value,
          order.applicantId || null,
          order.applicantName || null,
          order.operatorId || null,
          order.operatorName || null,
          order.totalQuantity,
          order.totalAmount.amount,
          order.version,
          order.remark || null,
        ]
      );

      const orderId = orderResult.insertId;

      for (const item of items) {
        await conn.execute(
          `INSERT INTO inv_transfer_item
           (transfer_id, material_id, material_code, material_name, qr_code, batch_no,
            quantity, out_quantity, in_quantity, unit, unit_price, amount, remark, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            orderId,
            item.materialId,
            item.materialCode || null,
            item.materialName || null,
            item.qrCode || null,
            item.batchNo || null,
            item.quantity,
            item.outQuantity || 0,
            item.inQuantity || 0,
            item.unit || null,
            item.unitPrice || 0,
            item.totalPrice || 0,
            item.remark || null,
          ]
        );
      }

      return { id: orderId, transferNo };
    });
  }

  async updateStatus(id: number, status: number, currentStatus: number): Promise<boolean> {
    const result = await execute(
      'UPDATE inv_transfer_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
      [status, id, currentStatus]
    );
    return result.affectedRows > 0;
  }

  async updateOutTime(id: number, outTime: string): Promise<void> {
    await execute(
      'UPDATE inv_transfer_order SET out_time = ?, update_time = NOW() WHERE id = ?',
      [outTime, id]
    );
  }

  async updateInTime(id: number, inTime: string): Promise<void> {
    await execute(
      'UPDATE inv_transfer_order SET in_time = ?, update_time = NOW() WHERE id = ?',
      [inTime, id]
    );
  }

  async updateApprover(id: number, approverId: number, approverName: string): Promise<void> {
    await execute(
      'UPDATE inv_transfer_order SET approver_id = ?, approver_name = ?, update_time = NOW() WHERE id = ?',
      [approverId, approverName, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE inv_transfer_order SET deleted = 1, update_time = NOW() WHERE id = ?', [
      id,
    ]);
  }

  private mapRowToProps(order: any, items: any[]): TransferOrderProps {
    return {
      id: order.id,
      transferNo: order.transfer_no,
      status: order.status,
      type: order.type,
      fromWarehouseId: order.from_warehouse_id,
      toWarehouseId: order.to_warehouse_id,
      fromLocation: order.from_location,
      toLocation: order.to_location,
      applicantId: order.applicant_id,
      applicantName: order.applicant_name,
      approverId: order.approver_id,
      approverName: order.approver_name,
      operatorId: order.operator_id,
      operatorName: order.operator_name,
      outTime: order.out_time,
      inTime: order.in_time,
      remark: order.remark,
      items: items.map((item: any) => ({
        id: item.id,
        transferId: item.transfer_id,
        materialId: item.material_id,
        materialCode: item.material_code,
        materialName: item.material_name,
        qrCode: item.qr_code,
        batchNo: item.batch_no || '',
        quantity: item.quantity,
        outQuantity: item.out_quantity,
        inQuantity: item.in_quantity,
        unit: item.unit,
        unitPrice: item.unit_price,
        remark: item.remark,
      })),
      totalQuantity: order.total_qty,
      totalAmount: order.total_amount,
      version: order.version,
      createTime: order.create_time,
      updateTime: order.update_time,
    };
  }
}
