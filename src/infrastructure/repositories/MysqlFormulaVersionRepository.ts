/**
 * 配方版本仓储 — MySQL 实现
 * 基于 mysql2/promise，支持事务连接传入
 * 依据: docs/油墨配方版本管理完整落地方案.md 第三节
 */
import { query, execute, transaction } from '@/lib/db';
import { InkFormulaVersion } from '@/domain/dcprint/aggregates/InkFormulaVersion';
import { FormulaItemVO } from '@/domain/dcprint/value-objects/FormulaItemVO';
import {
  IFormulaVersionRepository,
  IInkColorRepository,
} from '@/domain/dcprint/repositories/IFormulaVersionRepository';
import type { ResultSetHeader, PoolConnection } from 'mysql2/promise';

const VERSION_SELECT_FIELDS = `
  v.id, v.color_id, v.version_no, v.version_name, v.status,
  v.change_reason, v.source_version_id, v.process_note,
  v.total_weight, v.unit, v.shelf_life_hours,
  v.theoretical_cost, v.cost_snapshot_time, v.cost_calc_status, v.cost_warning,
  v.activate_by, v.activate_time,
  v.cancel_by, v.cancel_reason, v.cancel_time,
  v.create_by, v.create_time, v.update_by, v.update_time
`;

const ITEM_INSERT_FIELDS = `
  (version_id, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, add_order, process_remark, sort, is_base)
`;

const ITEM_INSERT_PLACEHOLDER = `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export class MysqlFormulaVersionRepository implements IFormulaVersionRepository {
  async findById(id: number): Promise<InkFormulaVersion | null> {
    const rows = await query<any>(
      `SELECT ${VERSION_SELECT_FIELDS} FROM dcprint_ink_formula_version v WHERE v.id = ? AND v.is_deleted = 0`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    return InkFormulaVersion.fromRow(rows[0]);
  }

  async findByIdWithItems(id: number): Promise<InkFormulaVersion | null> {
    const rows = await query<any>(
      `SELECT ${VERSION_SELECT_FIELDS}, c.color_code, c.color_name, c.pantone_code, c.base_ink_type
       FROM dcprint_ink_formula_version v
       LEFT JOIN dcprint_ink_color c ON v.color_id = c.id
       WHERE v.id = ? AND v.is_deleted = 0`,
      [id]
    );
    if (!rows || rows.length === 0) return null;

    const items = await query<any>(
      `SELECT * FROM dcprint_ink_formula_item WHERE version_id = ? ORDER BY sort, add_order`,
      [id]
    );

    const itemVOs = items.map((row: any) => this.mapItemRowToVO(row));
    return InkFormulaVersion.fromRow(rows[0], itemVOs);
  }

  async findByColorId(colorId: number): Promise<InkFormulaVersion[]> {
    const rows = await query<any>(
      `SELECT ${VERSION_SELECT_FIELDS} FROM dcprint_ink_formula_version v
       WHERE v.color_id = ? AND v.is_deleted = 0
       ORDER BY v.status ASC, v.create_time DESC`,
      [colorId]
    );
    return rows.map((row: any) => InkFormulaVersion.fromRow(row));
  }

  async getActiveVersion(colorId: number): Promise<InkFormulaVersion | null> {
    const rows = await query<any>(
      `SELECT ${VERSION_SELECT_FIELDS} FROM dcprint_ink_formula_version v
       WHERE v.color_id = ? AND v.status = 2 AND v.is_deleted = 0
       ORDER BY v.activate_time DESC LIMIT 1`,
      [colorId]
    );
    if (!rows || rows.length === 0) return null;
    return InkFormulaVersion.fromRow(rows[0]);
  }

  async getVersionNos(colorId: number): Promise<string[]> {
    const rows = await query<any>(
      `SELECT version_no FROM dcprint_ink_formula_version
       WHERE color_id = ? AND is_deleted = 0 ORDER BY id DESC`,
      [colorId]
    );
    return rows.map((r: any) => r.version_no as string);
  }

  async save(version: InkFormulaVersion): Promise<number> {
    const props = version.toProps();
    return transaction(async (conn) => {
      const [insertResult] = await conn.execute(
        `INSERT INTO dcprint_ink_formula_version
         (color_id, version_no, version_name, status, change_reason, source_version_id, process_note, total_weight, unit, shelf_life_hours, cost_calc_status, create_by, update_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          props.colorId,
          props.versionNo,
          props.versionName ?? null,
          props.status,
          props.changeReason ?? null,
          props.sourceVersionId ?? null,
          props.processNote ?? null,
          props.totalWeight ?? null,
          props.unit ?? 'kg',
          props.shelfLifeHours ?? 168,
          props.costCalcStatus ?? 0,
          props.createBy ?? null,
          props.updateBy ?? null,
        ]
      );
      const versionId = (insertResult as ResultSetHeader).insertId;

      await this.saveItems(conn, versionId, props.items ?? []);
      return versionId;
    });
  }

  async update(version: InkFormulaVersion): Promise<void> {
    const props = version.toProps();
    if (!props.id) throw new Error('更新版本时 id 不能为空');
    const id = props.id;

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE dcprint_ink_formula_version SET
         version_name = ?, change_reason = ?, process_note = ?, total_weight = ?, unit = ?, shelf_life_hours = ?,
         update_by = ?
         WHERE id = ?`,
        [
          props.versionName ?? null,
          props.changeReason ?? null,
          props.processNote ?? null,
          props.totalWeight ?? null,
          props.unit ?? 'kg',
          props.shelfLifeHours ?? 168,
          props.updateBy ?? null,
          id,
        ]
      );

      // 明细：先删后插
      if (props.items && props.items.length >= 0) {
        await conn.execute('DELETE FROM dcprint_ink_formula_item WHERE version_id = ?', [id]);
        await this.saveItems(conn, id, props.items);
      }
    });
  }

  async updateStatus(
    id: number,
    status: number,
    operatorId: number,
    extra?: {
      activateBy?: number;
      activateTime?: Date;
      cancelBy?: number;
      cancelReason?: string;
      cancelTime?: Date;
    }
  ): Promise<void> {
    const fields: string[] = ['status = ?', 'update_by = ?'];
    const values: (string | number | null)[] = [status, operatorId];

    if (extra?.activateBy !== undefined) {
      fields.push('activate_by = ?');
      values.push(extra.activateBy);
    }
    if (extra?.activateTime !== undefined) {
      fields.push('activate_time = NOW()');
    }
    if (extra?.cancelBy !== undefined) {
      fields.push('cancel_by = ?');
      values.push(extra.cancelBy);
    }
    if (extra?.cancelReason !== undefined) {
      fields.push('cancel_reason = ?');
      values.push(extra.cancelReason);
    }
    if (extra?.cancelTime !== undefined) {
      fields.push('cancel_time = NOW()');
    }

    values.push(id);
    await execute(
      `UPDATE dcprint_ink_formula_version SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async archiveOtherActiveVersions(
    colorId: number,
    excludeVersionId: number,
    operatorId: number
  ): Promise<void> {
    await execute(
      `UPDATE dcprint_ink_formula_version
       SET status = 3, cancel_by = ?, cancel_time = NOW(), cancel_reason = '新版本生效自动归档', update_by = ?
       WHERE color_id = ? AND status = 2 AND is_deleted = 0 AND id != ?`,
      [operatorId, operatorId, colorId, excludeVersionId]
    );
  }

  async softDelete(id: number): Promise<void> {
    await transaction(async (conn) => {
      await conn.execute('UPDATE dcprint_ink_formula_version SET is_deleted = 1 WHERE id = ?', [
        id,
      ]);
      await conn.execute('DELETE FROM dcprint_ink_formula_item WHERE version_id = ?', [id]);
    });
  }

  async exists(id: number): Promise<boolean> {
    const rows = await query<any>(
      'SELECT 1 FROM dcprint_ink_formula_version WHERE id = ? AND is_deleted = 0 LIMIT 1',
      [id]
    );
    return rows && rows.length > 0;
  }

  // ===== 私有方法 =====

  private async saveItems(conn: PoolConnection, versionId: number, items: FormulaItemVO[]): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await conn.execute(
        `INSERT INTO dcprint_ink_formula_item ${ITEM_INSERT_FIELDS} VALUES ${ITEM_INSERT_PLACEHOLDER}`,
        [
          versionId,
          item.materialId || null,
          item.materialCode,
          item.materialName,
          item.inkType || null,
          item.brand || null,
          item.ratio,
          item.weight || null,
          item.unit || 'kg',
          item.addOrder || 0,
          item.processRemark || null,
          item.sort || i + 1,
          item.isBase || 0,
        ]
      );
    }
  }

  private mapItemRowToVO(row: any): FormulaItemVO {
    return new FormulaItemVO({
      id: row.id,
      versionId: row.version_id,
      materialId: row.material_id,
      materialCode: row.material_code,
      materialName: row.material_name,
      inkType: row.ink_type,
      brand: row.brand,
      ratio: Number(row.ratio),
      weight: row.weight != null ? Number(row.weight) : null,
      unit: row.unit,
      addOrder: row.add_order,
      processRemark: row.process_remark,
      sort: row.sort,
      isBase: row.is_base,
      snapshotUnitCost: row.snapshot_unit_cost != null ? Number(row.snapshot_unit_cost) : null,
    });
  }
}

/**
 * 色号仓储 — MySQL 实现
 */
export class MysqlInkColorRepository implements IInkColorRepository {
  async findById(id: number): Promise<any | null> {
    const rows = await query<any>(
      'SELECT * FROM dcprint_ink_color WHERE id = ? AND is_deleted = 0',
      [id]
    );
    return rows?.[0] ?? null;
  }

  async findByCode(code: string): Promise<any | null> {
    const rows = await query<any>(
      'SELECT * FROM dcprint_ink_color WHERE color_code = ? AND is_deleted = 0',
      [code]
    );
    return rows?.[0] ?? null;
  }

  async findList(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    status?: number;
  }): Promise<{ list: any[]; total: number }> {
    const { page, pageSize, keyword, status } = params;
    let where = 'WHERE c.is_deleted = 0';
    const sqlParams: (string | number)[] = [];

    if (keyword) {
      where += ' AND (c.color_code LIKE ? OR c.color_name LIKE ? OR c.pantone_code LIKE ?)';
      const like = `%${keyword}%`;
      sqlParams.push(like, like, like);
    }
    if (status) {
      where += ' AND c.status = ?';
      sqlParams.push(Number(status));
    }

    const totalRows = await query<any>(
      `SELECT COUNT(*) as total FROM dcprint_ink_color c ${where}`,
      sqlParams
    );
    const total = Number(totalRows[0]?.total || 0);

    const rows = await query<any>(
      `SELECT c.*,
       (SELECT v.version_no FROM dcprint_ink_formula_version v
        WHERE v.color_id = c.id AND v.status = 2 AND v.is_deleted = 0
        ORDER BY v.activate_time DESC LIMIT 1) as active_version_no,
       (SELECT COUNT(*) FROM dcprint_ink_formula_version v
        WHERE v.color_id = c.id AND v.is_deleted = 0) as version_count
       FROM dcprint_ink_color c ${where}
       ORDER BY c.create_time DESC
       LIMIT ? OFFSET ?`,
      [...sqlParams, pageSize, (page - 1) * pageSize]
    );

    return { list: rows, total };
  }

  async save(data: any, operatorId: number): Promise<number> {
    const result = await execute(
      `INSERT INTO dcprint_ink_color (color_code, color_name, color_series, base_ink_type, pantone_code, remark, status, create_by, update_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.color_code,
        data.color_name,
        data.color_series || null,
        data.base_ink_type || null,
        data.pantone_code || null,
        data.remark || null,
        data.status || 1,
        operatorId,
        operatorId,
      ]
    );
    return result.insertId;
  }

  async update(id: number, data: any, operatorId: number): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    const editable = [
      'color_code',
      'color_name',
      'color_series',
      'base_ink_type',
      'pantone_code',
      'remark',
      'status',
    ];
    for (const f of editable) {
      if (data[f] !== undefined) {
        fields.push(`${f} = ?`);
        values.push(data[f]);
      }
    }
    if (fields.length === 0) return;

    fields.push('update_by = ?');
    values.push(operatorId);
    values.push(id);

    await execute(
      `UPDATE dcprint_ink_color SET ${fields.join(', ')} WHERE id = ? AND is_deleted = 0`,
      values
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE dcprint_ink_color SET is_deleted = 1 WHERE id = ?', [id]);
  }
}
