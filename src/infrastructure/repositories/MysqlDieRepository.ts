import { query, execute, queryOne, type SqlValue } from '@/lib/db';
import { IDieRepository } from '@/domain/prepress/repositories/IDieRepository';
import { Die, DieStatusValue } from '@/domain/prepress/aggregates/Die';

export class MysqlDieRepository implements IDieRepository {
  async getById(id: number): Promise<Die | null> {
    const rows = await query('SELECT * FROM prd_die_template WHERE id = ? AND deleted = 0', [id]);
    if (!rows || rows.length === 0) return null;
    return Die.fromRow(rows[0] as Record<string, unknown>);
  }

  async getByCode(code: string): Promise<Die | null> {
    const rows = await query(
      'SELECT * FROM prd_die_template WHERE template_code = ? AND deleted = 0',
      [code]
    );
    if (!rows || rows.length === 0) return null;
    return Die.fromRow(rows[0] as Record<string, unknown>);
  }

  async existsByCode(code: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT id FROM prd_die_template WHERE template_code = ? AND deleted = 0';
    const params: SqlValue[] = [code];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const row = await queryOne(sql, params);
    return !!row;
  }

  async findAll(params?: {
    keyword?: string;
    templateType?: number;
    assetType?: string;
    dieStatus?: DieStatusValue;
    status?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: Die[]; total: number }> {
    let where = 'WHERE deleted = 0';
    const values: SqlValue[] = [];

    if (params?.keyword) {
      where += ' AND (template_code LIKE ? OR template_name LIKE ? OR qr_code LIKE ?)';
      const kw = `%${params.keyword}%`;
      values.push(kw, kw, kw);
    }
    if (params?.templateType) {
      where += ' AND template_type = ?';
      values.push(params.templateType);
    }
    if (params?.assetType) {
      where += ' AND asset_type = ?';
      values.push(params.assetType);
    }
    if (params?.dieStatus) {
      where += ' AND die_status = ?';
      values.push(params.dieStatus);
    }
    if (params?.status) {
      where += ' AND status = ?';
      values.push(params.status);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM prd_die_template ${where}`,
      values
    );
    const total = ((countResult as Record<string, unknown>)?.total as number) || 0;

    const rows = await query(
      `SELECT * FROM prd_die_template ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
      [...values, pageSize, (page - 1) * pageSize]
    );

    return {
      list: (rows as Record<string, unknown>[]).map((r) => Die.fromRow(r)),
      total,
    };
  }

  async findWarningList(): Promise<Die[]> {
    const rows = await query(
      `SELECT * FROM prd_die_template WHERE deleted = 0 AND (
        die_status IN ('maintenance_needed', 're_rule_needed') OR
        (current_usage >= warning_usage AND status = 1) OR
        (cumulative_impressions >= max_impressions * warning_threshold / 100 AND max_impressions > 0)
      )`
    );
    return (rows as Record<string, unknown>[]).map((r) => Die.fromRow(r));
  }

  async getDashboardStats(): Promise<Record<string, unknown>> {
    const row = await queryOne(
      `SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN die_status = 'available' OR status = 1 THEN 1 ELSE 0 END) as available_count,
        SUM(CASE WHEN die_status = 'maintenance_needed' OR status = 2 THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN die_status = 're_rule_needed' OR status = 3 THEN 1 ELSE 0 END) as locked_count,
        SUM(CASE WHEN die_status = 'scrap' OR status = 4 THEN 1 ELSE 0 END) as scrap_count,
        SUM(CASE WHEN maintenance_interval > 0 AND (cumulative_impressions - last_maintenance_impressions) >= maintenance_interval THEN 1 ELSE 0 END) as maintenance_due_count
      FROM prd_die_template WHERE deleted = 0`
    );
    return (row as Record<string, unknown>) || {};
  }

  async getTypeStats(): Promise<Record<string, unknown>[]> {
    const rows = await query(
      `SELECT template_type, asset_type, COUNT(*) as count,
        AVG(CASE WHEN max_impressions > 0 THEN cumulative_impressions / max_impressions * 100 ELSE 0 END) as avg_usage_pct,
        SUM(CASE WHEN die_status = 'maintenance_needed' THEN 1 ELSE 0 END) as maintenance_needed_count,
        SUM(CASE WHEN die_status = 're_rule_needed' THEN 1 ELSE 0 END) as re_rule_needed_count,
        SUM(CASE WHEN die_status = 'scrap' THEN 1 ELSE 0 END) as scrap_count
      FROM prd_die_template WHERE deleted = 0 GROUP BY template_type, asset_type`
    );
    return rows as Record<string, unknown>[];
  }

  async save(die: Die): Promise<number> {
    const row = die.toRow();
    const cols = Object.keys(row).join(', ');
    const placeholders = Object.keys(row)
      .map(() => '?')
      .join(', ');
    const values = Object.values(row);

    const result = await execute(
      `INSERT INTO prd_die_template (${cols}, create_time, update_time) VALUES (${placeholders}, NOW(), NOW())`,
      values as SqlValue[]
    );
    return result.insertId;
  }

  async update(die: Die): Promise<void> {
    const row = die.toRow();
    const setClause = Object.keys(row)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = Object.values(row);
    await execute(`UPDATE prd_die_template SET ${setClause} WHERE id = ? AND deleted = 0`, [
      ...values,
      die.id,
    ] as SqlValue[]);
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE prd_die_template SET deleted = 1 WHERE id = ?', [id]);
  }
}
