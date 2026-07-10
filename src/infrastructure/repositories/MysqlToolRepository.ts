import { query, execute, transaction } from '@/lib/db';
import { IToolRepository } from '@/domain/dcprint/repositories/IToolRepository';
import { Tool } from '@/domain/dcprint/aggregates/Tool';

export class MysqlToolRepository implements IToolRepository {
  async findById(id: number): Promise<Tool | null> {
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM dcprint_tool WHERE id = ? AND is_deleted = 0',
      [id]
    );
    return rows.length > 0 ? Tool.fromRow(rows[0]) : null;
  }

  async findByIdForUpdate(id: number): Promise<Tool | null> {
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM dcprint_tool WHERE id = ? AND is_deleted = 0 FOR UPDATE',
      [id]
    );
    return rows.length > 0 ? Tool.fromRow(rows[0]) : null;
  }

  async findByCode(toolCode: string): Promise<Tool | null> {
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM dcprint_tool WHERE tool_code = ? AND is_deleted = 0',
      [toolCode]
    );
    return rows.length > 0 ? Tool.fromRow(rows[0]) : null;
  }

  async findList(params: {
    toolType?: number;
    status?: number;
    keyword?: string;
    page: number;
    pageSize: number;
  }): Promise<{ list: Tool[]; total: number }> {
    const { toolType, status, keyword, page, pageSize } = params;
    let where = 'WHERE is_deleted = 0';
    const args: unknown[] = [];
    if (toolType) {
      where += ' AND tool_type = ?';
      args.push(toolType);
    }
    if (status) {
      where += ' AND status = ?';
      args.push(status);
    }
    if (keyword) {
      where += ' AND (tool_code LIKE ? OR tool_name LIKE ?)';
      args.push('%' + keyword + '%', '%' + keyword + '%');
    }

    const countRows = await query<Record<string, unknown>>(
      `SELECT COUNT(*) as total FROM dcprint_tool ${where}`,
      args
    );
    const total = Number(countRows[0]?.total || 0);

    const offset = (page - 1) * pageSize;
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM dcprint_tool ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return { list: rows.map(Tool.fromRow), total };
  }

  async save(tool: Tool): Promise<number> {
    const row = tool.toRow();
    const [result]: Record<string, unknown>[] = await execute(
      `INSERT INTO dcprint_tool
       (tool_type, tool_code, tool_name, spec, material_id, total_life, warning_threshold,
        used_count, remain_life, original_cost, accumulated_cost, net_value, unit_cost,
        status, manufacture_date, warehouse_location, remark, is_deleted, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [
        row.tool_type,
        row.tool_code,
        row.tool_name,
        row.spec,
        row.material_id,
        row.total_life,
        row.warning_threshold,
        row.used_count,
        row.remain_life,
        row.original_cost,
        row.accumulated_cost,
        row.net_value,
        row.unit_cost,
        row.status,
        row.manufacture_date,
        row.warehouse_location,
        row.remark,
      ]
    );
    return Number(result.insertId);
  }

  async update(tool: Tool): Promise<void> {
    const row = tool.toRow();
    await execute(
      `UPDATE dcprint_tool
       SET used_count = ?, remain_life = ?, accumulated_cost = ?, net_value = ?, unit_cost = ?,
           status = ?, scrap_reason = ?, scrap_time = ?, scrap_by = ?, update_time = NOW()
       WHERE id = ?`,
      [
        row.used_count,
        row.remain_life,
        row.accumulated_cost,
        row.net_value,
        row.unit_cost,
        row.status,
        row.scrap_reason,
        row.scrap_time,
        row.scrap_by,
        row.id,
      ]
    );
  }

  async updateBasicInfo(
    id: number,
    data: Partial<{
      toolName: string;
      spec: string;
      materialId: number;
      totalLife: number;
      warningThreshold: number;
      manufactureDate: string;
      warehouseLocation: string;
      remark: string;
    }>
  ): Promise<void> {
    const colMap: Record<string, string> = {
      toolName: 'tool_name',
      spec: 'spec',
      materialId: 'material_id',
      totalLife: 'total_life',
      warningThreshold: 'warning_threshold',
      manufactureDate: 'manufacture_date',
      warehouseLocation: 'warehouse_location',
      remark: 'remark',
    };

    const sets: string[] = [];
    const args: unknown[] = [];
    for (const [key, col] of Object.entries(colMap)) {
      if (data[key as keyof typeof data] !== undefined) {
        sets.push(`${col} = ?`);
        args.push(data[key as keyof typeof data]);
      }
    }
    if (sets.length === 0) return;

    args.push(id);
    await execute(
      `UPDATE dcprint_tool SET ${sets.join(', ')}, update_time = NOW() WHERE id = ? AND is_deleted = 0`,
      args
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE dcprint_tool SET is_deleted = 1 WHERE id = ? AND status IN (1, 5)', [id]);
  }

  async existsByCode(toolCode: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT 1 FROM dcprint_tool WHERE tool_code = ? AND is_deleted = 0';
    const args: unknown[] = [toolCode];
    if (excludeId) {
      sql += ' AND id != ?';
      args.push(excludeId);
    }
    const rows = await query<unknown>(sql + ' LIMIT 1', args);
    return rows.length > 0;
  }

  async countByStatus(): Promise<{
    total: number;
    active: number;
    warning: number;
    maintenance: number;
    scrapped: number;
    totalNetValue: number;
  }> {
    const rows = await query<Record<string, unknown>>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) as warning,
         SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as maintenance,
         SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) as scrapped,
         COALESCE(SUM(net_value), 0) as total_net_value
       FROM dcprint_tool WHERE is_deleted = 0`
    );
    return {
      total: Number(rows[0]?.total || 0),
      active: Number(rows[0]?.active || 0),
      warning: Number(rows[0]?.warning || 0),
      maintenance: Number(rows[0]?.maintenance || 0),
      scrapped: Number(rows[0]?.scrapped || 0),
      totalNetValue: Number(rows[0]?.total_net_value || 0),
    };
  }
}
