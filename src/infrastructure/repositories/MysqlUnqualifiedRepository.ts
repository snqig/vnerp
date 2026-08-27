import {
  IUnqualifiedRepository,
  Pagination,
  PaginatedResult,
  UnqualifiedFilters,
  UpdateHandleInfoFields,
} from '@/domain/quality/repositories/IUnqualifiedRepository';
import {
  UnqualifiedProduct,
  UnqualifiedProductProps,
} from '@/domain/quality/aggregates/UnqualifiedProduct';
import { UnqualifiedStatus } from '@/domain/quality/value-objects/UnqualifiedStatus';
import { HandleMethod } from '@/domain/quality/value-objects/HandleMethod';
import { query, execute, queryPaginated } from '@/lib/db';

interface UnqualifiedRow {
  id: number;
  unqualified_no: string;
  handle_no: string | null;
  inspection_id: number | null;
  source_type: string | null;
  source_no: string | null;
  material_id: number | null;
  material_code: string | null;
  material_name: string | null;
  quantity: number;
  defect_type: string | null;
  defect_desc: string | null;
  handle_type: number | null;
  handle_status: number;
  handle_result: number | null;
  responsible_dept: string | null;
  responsible_person: string | null;
  cost_amount: number | null;
  handler: string | null;
  handle_date: string | null;
  remark: string | null;
  create_time: string | null;
  update_time: string | null;
  create_by: number | null;
  update_by: number | null;
  deleted: number;
}

function rowToProps(row: UnqualifiedRow): UnqualifiedProductProps {
  let handleTypeValue: UnqualifiedProductProps['handleType'];
  if (row.handle_type !== null && row.handle_type !== undefined) {
    try {
      handleTypeValue = HandleMethod.fromDbCode(row.handle_type).value;
    } catch {
      handleTypeValue = undefined;
    }
  }
  let statusValue: UnqualifiedProductProps['status'];
  if (row.handle_status !== null && row.handle_status !== undefined) {
    try {
      statusValue = UnqualifiedStatus.fromDbCode(row.handle_status).value;
    } catch {
      statusValue = 'pending';
    }
  }
  return {
    id: row.id,
    unqualifiedNo: row.unqualified_no,
    handleNo: row.handle_no || '',
    inspectionId: row.inspection_id || 0,
    sourceType: row.source_type || undefined,
    sourceNo: row.source_no || undefined,
    materialId: row.material_id || undefined,
    materialCode: row.material_code || undefined,
    materialName: row.material_name || undefined,
    quantity: Number(row.quantity),
    defectType: row.defect_type || undefined,
    defectDesc: row.defect_desc || undefined,
    handleType: handleTypeValue,
    status: statusValue,
    responsibleDept: row.responsible_dept || undefined,
    responsiblePerson: row.responsible_person || undefined,
    costAmount: row.cost_amount !== null ? Number(row.cost_amount) : undefined,
    handler: row.handler || undefined,
    handleDate: row.handle_date
      ? typeof row.handle_date === 'string'
        ? row.handle_date.slice(0, 10)
        : String(row.handle_date)
      : undefined,
    remark: row.remark || undefined,
    createBy: row.create_by || undefined,
    updateBy: row.update_by || undefined,
    createTime: row.create_time ? String(row.create_time) : undefined,
    updateTime: row.update_time ? String(row.update_time) : undefined,
  };
}

function generateUnqualifiedNo(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `UQ-${dateStr}-${random}`;
}

function generateHandleNo(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `UH-${dateStr}-${random}`;
}

export class MysqlUnqualifiedRepository implements IUnqualifiedRepository {
  async findById(id: number): Promise<UnqualifiedProduct | null> {
    const rows = await query<UnqualifiedRow>(
      'SELECT * FROM qc_unqualified WHERE id = ? AND deleted = 0',
      [id]
    );
    if (!rows || rows.length === 0) return null;
    return UnqualifiedProduct.reconstitute(rowToProps(rows[0]));
  }

  async findByHandleNo(handleNo: string): Promise<UnqualifiedProduct | null> {
    const rows = await query<UnqualifiedRow>(
      'SELECT * FROM qc_unqualified WHERE handle_no = ? AND deleted = 0',
      [handleNo]
    );
    if (!rows || rows.length === 0) return null;
    return UnqualifiedProduct.reconstitute(rowToProps(rows[0]));
  }

  async findByStatus(
    status: string,
    pagination: Pagination,
    filters?: UnqualifiedFilters
  ): Promise<PaginatedResult<UnqualifiedProduct>> {
    let sql = 'SELECT * FROM qc_unqualified WHERE deleted = 0';
    let countSql = 'SELECT COUNT(*) as total FROM qc_unqualified WHERE deleted = 0';
    const params: Array<string | number> = [];

    if (status && status !== 'all') {
      const dbCode = UnqualifiedStatus.from(status).toDbCode();
      sql += ' AND handle_status = ?';
      countSql += ' AND handle_status = ?';
      params.push(dbCode);
    }

    if (filters?.keyword) {
      const cond =
        ' AND (unqualified_no LIKE ? OR handle_no LIKE ? OR material_name LIKE ? OR defect_type LIKE ?)';
      sql += cond;
      countSql += cond;
      const kw = `%${filters.keyword}%`;
      params.push(kw, kw, kw, kw);
    }

    if (filters?.handleType !== undefined && filters.handleType !== null) {
      sql += ' AND handle_type = ?';
      countSql += ' AND handle_type = ?';
      params.push(filters.handleType);
    }

    if (filters?.handleStatus !== undefined && filters.handleStatus !== null) {
      sql += ' AND handle_status = ?';
      countSql += ' AND handle_status = ?';
      params.push(filters.handleStatus);
    }

    if (filters?.startDate) {
      sql += ' AND create_time >= ?';
      countSql += ' AND create_time >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ' AND create_time <= ?';
      countSql += ' AND create_time <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY create_time DESC';

    const result = await queryPaginated<UnqualifiedRow>(sql, countSql, params, pagination);
    return {
      data: result.data.map((row) => UnqualifiedProduct.reconstitute(rowToProps(row))),
      pagination: result.pagination,
    };
  }

  async save(
    record: UnqualifiedProduct
  ): Promise<{ id: number; unqualifiedNo: string; handleNo: string }> {
    const unqualifiedNo = record.unqualifiedNo || generateUnqualifiedNo();
    const handleNo = record.handleNo || generateHandleNo();

    const result = await execute(
      `INSERT INTO qc_unqualified
       (unqualified_no, handle_no, inspection_id, source_type, source_no,
        material_id, material_code, material_name, quantity, defect_type, defect_desc,
        handle_type, handle_status, responsible_dept, responsible_person,
        cost_amount, handler, handle_date, remark, create_by, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        unqualifiedNo,
        handleNo,
        record.inspectionId,
        record.sourceType || null,
        record.sourceNo || null,
        record.materialId || null,
        record.materialCode || null,
        record.materialName || null,
        record.quantity,
        record.defectType || null,
        record.defectDesc || null,
        record.handleType ? record.handleType.toDbCode() : null,
        record.status.toDbCode(),
        record.responsibleDept || null,
        record.responsiblePerson || null,
        record.costAmount !== undefined ? record.costAmount : null,
        record.handler || null,
        record.handleDate || null,
        record.remark || null,
        record.createBy || null,
      ]
    );

    return {
      id: result.insertId,
      unqualifiedNo,
      handleNo,
    };
  }

  async updateStatus(
    id: number,
    status: string,
    currentStatus: string,
    updateBy?: number
  ): Promise<boolean> {
    const newDbCode = UnqualifiedStatus.from(status).toDbCode();
    const currentDbCode = UnqualifiedStatus.from(currentStatus).toDbCode();
    const sql =
      updateBy !== undefined
        ? 'UPDATE qc_unqualified SET handle_status = ?, update_by = ?, update_time = NOW() WHERE id = ? AND handle_status = ? AND deleted = 0'
        : 'UPDATE qc_unqualified SET handle_status = ?, update_time = NOW() WHERE id = ? AND handle_status = ? AND deleted = 0';
    const params =
      updateBy !== undefined
        ? [newDbCode, updateBy, id, currentDbCode]
        : [newDbCode, id, currentDbCode];
    const result = await execute(sql, params);
    return result.affectedRows > 0;
  }

  async updateHandleInfo(id: number, fields: UpdateHandleInfoFields): Promise<void> {
    const setClauses: string[] = [];
    const params: Array<string | number | null> = [];

    if (fields.handleType !== undefined) {
      setClauses.push('handle_type = ?');
      params.push(fields.handleType);
    }
    if (fields.responsibleDept !== undefined) {
      setClauses.push('responsible_dept = ?');
      params.push(fields.responsibleDept);
    }
    if (fields.responsiblePerson !== undefined) {
      setClauses.push('responsible_person = ?');
      params.push(fields.responsiblePerson);
    }
    if (fields.handler !== undefined) {
      setClauses.push('handler = ?');
      params.push(fields.handler);
    }
    if (fields.handleResult !== undefined) {
      setClauses.push('handle_result = ?');
      params.push(fields.handleResult);
    }
    if (fields.costAmount !== undefined) {
      setClauses.push('cost_amount = ?');
      params.push(fields.costAmount);
    }
    if (fields.handleDate !== undefined) {
      setClauses.push('handle_date = ?');
      params.push(fields.handleDate);
    }
    if (fields.remark !== undefined) {
      setClauses.push('remark = ?');
      params.push(fields.remark);
    }
    if (fields.updateBy !== undefined) {
      setClauses.push('update_by = ?');
      params.push(fields.updateBy);
    }

    if (setClauses.length === 0) return;

    setClauses.push('update_time = NOW()');
    params.push(id);

    await execute(
      `UPDATE qc_unqualified SET ${setClauses.join(', ')} WHERE id = ? AND deleted = 0`,
      params
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE qc_unqualified SET deleted = 1, update_time = NOW() WHERE id = ?', [id]);
  }
}
