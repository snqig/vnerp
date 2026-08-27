import { IWorkOrderRepository } from '@/domain/production/repositories/IWorkOrderRepository';
import { WorkOrder, WorkOrderProps } from '@/domain/production/aggregates/WorkOrder';
import { WorkOrderStatusVO } from '@/domain/production/value-objects/WorkOrderStatus';
import { query, execute, transaction, queryPaginated } from '@/lib/db';
import type { ResultSetHeader } from 'mysql2/promise';
import { generateDocumentNo } from '@/lib/document-numbering';

interface WorkOrderRow {
  id: number;
  work_order_no: string;
  status: number;
  product_id: number;
  product_name: string;
  product_code: string;
  order_type: number;
  process_id: number | null;
  process_name: string | null;
  warehouse_id: number;
  planned_qty: number;
  completed_qty: number;
  planned_start_date: Date | null;
  planned_end_date: Date | null;
  actual_start_date: Date | null;
  actual_end_date: Date | null;
  remark: string;
  create_by: number | null;
  create_time: Date;
  update_time: Date | null;
  deleted: number;
}

interface WorkOrderMaterialRow {
  id: number;
  work_order_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  specification: string;
  unit: string;
  required_qty: number;
  issued_qty: number;
  returned_qty: number;
  warehouse_id: number;
}

export class MysqlWorkOrderRepository implements IWorkOrderRepository {
  async findById(id: number): Promise<WorkOrder | null> {
    const orders = await query('SELECT * FROM prod_work_order WHERE id = ? AND deleted = 0', [id]);
    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const materials = await query(
      'SELECT * FROM prod_work_order_material WHERE work_order_id = ? AND deleted = 0 ORDER BY id ASC',
      [id]
    );

    return WorkOrder.reconstitute(this.mapToProps(order, materials));
  }

  async findByWorkOrderNo(workOrderNo: string): Promise<WorkOrder | null> {
    const orders = await query(
      'SELECT * FROM prod_work_order WHERE work_order_no = ? AND deleted = 0',
      [workOrderNo]
    );
    if (!orders || orders.length === 0) return null;

    const order = orders[0];
    const materials = await query(
      'SELECT * FROM prod_work_order_material WHERE work_order_id = ? AND deleted = 0 ORDER BY id ASC',
      [order.id]
    );

    return WorkOrder.reconstitute(this.mapToProps(order, materials));
  }

  async findByStatus(
    status: string,
    pagination: { page: number; pageSize: number },
    filters?: { keyword?: string; productId?: number }
  ) {
    let sql = 'SELECT o.* FROM prod_work_order o WHERE o.deleted = 0';
    let countSql = 'SELECT COUNT(*) as total FROM prod_work_order o WHERE o.deleted = 0';
    const params: (string | number)[] = [];

    if (status && status !== 'all') {
      const dbCode = WorkOrderStatusVO.from(status).toDbCode();
      sql += ' AND o.status = ?';
      countSql += ' AND o.status = ?';
      params.push(dbCode);
    }

    if (filters?.keyword) {
      sql += ' AND (o.work_order_no LIKE ? OR o.product_name LIKE ?)';
      countSql += ' AND (o.work_order_no LIKE ? OR o.product_name LIKE ?)';
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    if (filters?.productId) {
      sql += ' AND o.product_id = ?';
      countSql += ' AND o.product_id = ?';
      params.push(filters.productId);
    }

    sql += ' ORDER BY o.create_time DESC';
    const result = await queryPaginated(sql, countSql, params, pagination);

    return {
      data: result.data.map((o: WorkOrderRow) => WorkOrder.reconstitute(this.mapToProps(o, []))),
      pagination: result.pagination,
    };
  }

  async save(order: WorkOrder): Promise<{ id: number; workOrderNo: string }> {
    const workOrderNo = await generateDocumentNo('work_order');

    return await transaction(async (conn) => {
      const [result] = (await conn.execute(
        `INSERT INTO prod_work_order (work_order_no, product_id, product_name, product_code, planned_qty, completed_qty,
          order_type, process_id, process_name, warehouse_id, planned_start_date, planned_end_date, status, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          workOrderNo,
          order.productId,
          order.productName,
          order.productCode,
          order.plannedQty,
          order.completedQty,
          order.orderType || 0,
          order.processId || null,
          order.processName || null,
          order.warehouseId,
          order.plannedStartDate || null,
          order.plannedEndDate || null,
          order.status.toDbCode(),
          order.remark,
          order.createBy || null,
        ]
      )) as unknown as [ResultSetHeader];

      const orderId = result.insertId;

      for (const mr of order.materialRequirements) {
        await conn.execute(
          `INSERT INTO prod_work_order_material (work_order_id, material_id, material_code, material_name, specification, unit, required_qty, issued_qty, returned_qty, warehouse_id, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NOW())`,
          [
            orderId,
            mr.materialId,
            mr.materialCode,
            mr.materialName,
            mr.specification,
            mr.unit,
            mr.requiredQty,
            mr.warehouseId,
          ]
        );
      }

      return { id: orderId, workOrderNo };
    });
  }

  async updateStatus(id: number, status: string, currentStatus: string): Promise<boolean> {
    const dbStatus = WorkOrderStatusVO.from(status).toDbCode();
    const dbCurrentStatus = WorkOrderStatusVO.from(currentStatus).toDbCode();
    const result = await execute(
      'UPDATE prod_work_order SET status = ?, update_time = NOW() WHERE id = ? AND status = ?',
      [dbStatus, id, dbCurrentStatus]
    );
    return result.affectedRows > 0;
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE prod_work_order SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);
  }

  private mapToProps(order: WorkOrderRow, materials: WorkOrderMaterialRow[]): WorkOrderProps {
    return {
      id: order.id,
      workOrderNo: order.work_order_no,
      status: WorkOrderStatusVO.fromDbCode(order.status).value,
      productId: order.product_id,
      productName: order.product_name || '',
      productCode: order.product_code || '',
      orderType: order.order_type || 0,
      plannedQty: order.planned_qty,
      completedQty: order.completed_qty || 0,
      processId: order.process_id ?? undefined,
      processName: order.process_name ?? undefined,
      warehouseId: order.warehouse_id || 1,
      plannedStartDate: order.planned_start_date
        ? typeof order.planned_start_date === 'string'
          ? order.planned_start_date
          : order.planned_start_date.toISOString()
        : undefined,
      plannedEndDate: order.planned_end_date
        ? typeof order.planned_end_date === 'string'
          ? order.planned_end_date
          : order.planned_end_date.toISOString()
        : undefined,
      actualStartDate: order.actual_start_date
        ? typeof order.actual_start_date === 'string'
          ? order.actual_start_date
          : order.actual_start_date.toISOString()
        : undefined,
      actualEndDate: order.actual_end_date
        ? typeof order.actual_end_date === 'string'
          ? order.actual_end_date
          : order.actual_end_date.toISOString()
        : undefined,
      remark: order.remark || '',
      createBy: order.create_by ?? undefined,
      materialRequirements: (materials || []).map((m: WorkOrderMaterialRow) => ({
        id: m.id,
        materialId: m.material_id,
        materialCode: m.material_code || '',
        materialName: m.material_name || '',
        specification: m.specification || '',
        unit: m.unit || '件',
        requiredQty: m.required_qty,
        issuedQty: m.issued_qty || 0,
        returnedQty: m.returned_qty || 0,
        warehouseId: m.warehouse_id || 1,
      })),
      createTime:
        typeof order.create_time === 'string' ? order.create_time : order.create_time.toISOString(),
      updateTime: order.update_time
        ? typeof order.update_time === 'string'
          ? order.update_time
          : order.update_time.toISOString()
        : undefined,
    };
  }
}
