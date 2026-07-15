import { IStocktakingOrderRepository } from '@/domain/warehouse/repositories/IStocktakingOrderRepository';
import {
  Pagination,
  PaginatedResult,
} from '@/domain/warehouse/repositories/IInboundOrderRepository';
import {
  StocktakingOrder,
  StocktakingOrderProps,
} from '@/domain/warehouse/aggregates/StocktakingOrder';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

const ITEM_COLUMNS = `id, taking_id, material_id, material_code, material_name, batch_no,
                      warehouse_id, location, book_qty, actual_qty, diff_qty,
                      unit, unit_price, diff_amount, scan_time, scan_operator, status, remark`;

export class MysqlStocktakingOrderRepository implements IStocktakingOrderRepository {
  async findById(id: number): Promise<StocktakingOrder | null> {
    const orders = await query(
      'SELECT * FROM inv_stocktaking WHERE id = ? AND deleted = 0',
      [id]
    );
    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const items = await query(
      `SELECT ${ITEM_COLUMNS} FROM inv_stocktaking_item WHERE taking_id = ? AND deleted = 0`,
      [id]
    );

    return StocktakingOrder.reconstitute(this.mapRowToProps(order, items));
  }

  async findByCheckNo(checkNo: string): Promise<StocktakingOrder | null> {
    const orders = await query(
      'SELECT * FROM inv_stocktaking WHERE check_no = ? AND deleted = 0',
      [checkNo]
    );
    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const items = await query(
      `SELECT ${ITEM_COLUMNS} FROM inv_stocktaking_item WHERE taking_id = ? AND deleted = 0`,
      [order.id]
    );

    return StocktakingOrder.reconstitute(this.mapRowToProps(order, items));
  }

  async findByStatus(
    status: number,
    pagination: Pagination,
    filters?: {
      keyword?: string;
      warehouseId?: number;
      stocktakingType?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<StocktakingOrder>> {
    let sql = `SELECT s.id, s.check_no, s.type, s.warehouse_id, s.warehouse_name, s.scope,
               s.status, s.applicant_id, s.applicant_name, s.approver_id, s.approver_name,
               s.approve_time, s.approve_remark, s.total_items, s.diff_items, s.total_diff_amount,
               s.version, s.remark, s.create_time, s.update_time
               FROM inv_stocktaking s WHERE s.deleted = 0`;
    let countSql = `SELECT COUNT(*) as total FROM inv_stocktaking s WHERE s.deleted = 0`;
    const params: (string | number)[] = [];

    if (filters?.keyword) {
      const condition = ` AND (s.check_no LIKE ? OR s.warehouse_name LIKE ? OR s.applicant_name LIKE ?)`;
      sql += condition;
      countSql += condition;
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    if (status !== undefined && status !== null) {
      sql += ` AND s.status = ?`;
      countSql += ` AND s.status = ?`;
      params.push(status);
    }

    if (filters?.warehouseId) {
      sql += ` AND s.warehouse_id = ?`;
      countSql += ` AND s.warehouse_id = ?`;
      params.push(filters.warehouseId);
    }

    if (filters?.stocktakingType) {
      sql += ` AND s.type = ?`;
      countSql += ` AND s.type = ?`;
      params.push(filters.stocktakingType);
    }

    if (filters?.startDate) {
      sql += ` AND s.create_time >= ?`;
      countSql += ` AND s.create_time >= ?`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ` AND s.create_time <= ?`;
      countSql += ` AND s.create_time <= ?`;
      params.push(filters.endDate);
    }

    sql += ` ORDER BY s.create_time DESC`;

    const result = await queryPaginated(sql, countSql, params, pagination);

    if (result.data.length > 0) {
      const orderIds = result.data.map((s: any) => s.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const items = await query(
        `SELECT ${ITEM_COLUMNS} FROM inv_stocktaking_item WHERE taking_id IN (${placeholders}) AND deleted = 0`,
        orderIds
      );

      const itemsMap = new Map<number, any[]>();
      for (const item of items as any[]) {
        if (!itemsMap.has(item.taking_id)) {
          itemsMap.set(item.taking_id, []);
        }
        itemsMap.get(item.taking_id)!.push(item);
      }

      for (const order of result.data as any[]) {
        order.items = itemsMap.get(order.id) || [];
      }
    }

    return {
      data: result.data.map((s: any) =>
        StocktakingOrder.reconstitute(this.mapRowToProps(s, s.items || []))
      ),
      pagination: result.pagination,
    };
  }

  async save(order: StocktakingOrder): Promise<{ id: number; checkNo: string }> {
    const checkNo = await generateDocumentNo('stocktaking');
    const items = order.items;

    return await transaction(async (conn) => {
      const [orderResult] = await conn.execute(
        `INSERT INTO inv_stocktaking
         (check_no, type, warehouse_id, warehouse_name, scope, status,
          applicant_id, applicant_name, total_items, diff_items, total_diff_amount,
          version, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          checkNo,
          order.type,
          order.warehouseId,
          order.warehouseName || null,
          order.scope || null,
          order.status.value,
          order.applicantId || null,
          order.applicantName || null,
          order.totalItems,
          order.diffItems,
          order.totalDiffAmount,
          order.version,
          order.remark || null,
        ]
      ) as any;

      const orderId = orderResult.insertId;

      for (const item of items) {
        await conn.execute(
          `INSERT INTO inv_stocktaking_item
           (taking_id, material_id, material_code, material_name, batch_no,
            warehouse_id, location, book_qty, actual_qty, diff_qty,
            unit, unit_price, diff_amount, status, remark, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            orderId,
            item.materialId,
            item.materialCode || null,
            item.materialName || null,
            item.batchNo || null,
            item.warehouseId || null,
            item.location || null,
            item.bookQty,
            item.actualQty,
            item.diffQty,
            item.unit || null,
            item.unitPrice || 0,
            item.diffAmount,
            item.status,
            item.remark || null,
          ]
        );
      }

      return { id: orderId, checkNo };
    });
  }

  async updateStatus(id: number, status: number, currentStatus: number): Promise<boolean> {
    const result = await execute(
      'UPDATE inv_stocktaking SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
      [status, id, currentStatus]
    );
    return result.affectedRows > 0;
  }

  async updateItemActualQty(
    itemId: number,
    actualQty: number,
    diffQty: number,
    diffAmount: number,
    scanOperator?: string
  ): Promise<void> {
    await execute(
      `UPDATE inv_stocktaking_item
       SET actual_qty = ?, diff_qty = ?, diff_amount = ?, scan_operator = ?, scan_time = NOW(), status = 1, update_time = NOW()
       WHERE id = ?`,
      [actualQty, diffQty, diffAmount, scanOperator || null, itemId]
    );
  }

  async updateApprover(
    id: number,
    approverId: number,
    approverName: string,
    approveTime: string,
    approveRemark: string
  ): Promise<void> {
    await execute(
      `UPDATE inv_stocktaking
       SET approver_id = ?, approver_name = ?, approve_time = ?, approve_remark = ?, update_time = NOW()
       WHERE id = ?`,
      [approverId, approverName, approveTime, approveRemark, id]
    );
  }

  async updateDiffSummary(id: number, diffItems: number, totalDiffAmount: number): Promise<void> {
    await execute(
      `UPDATE inv_stocktaking SET diff_items = ?, total_diff_amount = ?, update_time = NOW() WHERE id = ?`,
      [diffItems, totalDiffAmount, id]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE inv_stocktaking SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);
  }

  private mapRowToProps(order: any, items: any[]): StocktakingOrderProps {
    return {
      id: order.id,
      checkNo: order.check_no,
      status: order.status,
      type: order.type,
      warehouseId: order.warehouse_id,
      warehouseName: order.warehouse_name,
      scope: order.scope,
      applicantId: order.applicant_id,
      applicantName: order.applicant_name,
      approverId: order.approver_id,
      approverName: order.approver_name,
      approveTime: order.approve_time,
      approveRemark: order.approve_remark,
      remark: order.remark,
      items: items.map((item: any) => ({
        id: item.id,
        takingId: item.taking_id,
        materialId: item.material_id,
        materialCode: item.material_code,
        materialName: item.material_name,
        batchNo: item.batch_no || '',
        warehouseId: item.warehouse_id,
        location: item.location,
        bookQty: item.book_qty,
        actualQty: item.actual_qty,
        diffQty: item.diff_qty,
        unit: item.unit,
        unitPrice: item.unit_price,
        diffAmount: item.diff_amount,
        scanTime: item.scan_time,
        scanOperator: item.scan_operator,
        status: item.status,
        remark: item.remark,
      })),
      totalItems: order.total_items,
      diffItems: order.diff_items,
      totalDiffAmount: order.total_diff_amount,
      version: order.version,
      createTime: order.create_time,
      updateTime: order.update_time,
    };
  }
}
