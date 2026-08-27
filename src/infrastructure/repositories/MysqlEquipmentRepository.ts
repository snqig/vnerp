import { query, execute, queryOne, type SqlValue } from '@/lib/db';
import { IEquipmentRepository } from '@/domain/equipment/repositories/IEquipmentRepository';
import { Equipment, EquipmentStatus, EquipmentType } from '@/domain/equipment/aggregates/Equipment';

type EquipmentRow = {
  id: number;
  equipment_code: string;
  equipment_name: string;
  equipment_type: string;
  model: string;
  manufacturer: string;
  workshop: string;
  location: string;
  purchase_date: string | null;
  install_date: string | null;
  purchase_price: number;
  expected_life_years: number;
  status: number;
  cumulative_run_hours: number;
  cumulative_print_count: number;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  remark: string;
};

function rowToEquipment(row: EquipmentRow): Equipment {
  return new Equipment(
    row.id,
    row.equipment_code,
    row.equipment_name,
    row.equipment_type as EquipmentType,
    row.model,
    row.manufacturer,
    row.workshop,
    row.location,
    row.purchase_date ?? undefined,
    row.install_date ?? undefined,
    row.purchase_price,
    row.expected_life_years,
    row.status as EquipmentStatus,
    row.cumulative_run_hours,
    row.cumulative_print_count,
    row.last_maintenance_date ?? undefined,
    row.next_maintenance_date ?? undefined,
    row.remark
  );
}

export class MysqlEquipmentRepository implements IEquipmentRepository {
  async getById(id: number): Promise<Equipment | null> {
    const rows = await query<EquipmentRow>(
      'SELECT * FROM eq_equipment WHERE id = ? AND deleted = 0',
      [id]
    );
    return rows.length > 0 ? rowToEquipment(rows[0]) : null;
  }

  async getByCode(equipmentCode: string): Promise<Equipment | null> {
    const rows = await query<EquipmentRow>(
      'SELECT * FROM eq_equipment WHERE equipment_code = ? AND deleted = 0',
      [equipmentCode]
    );
    return rows.length > 0 ? rowToEquipment(rows[0]) : null;
  }

  async existsByCode(equipmentCode: string): Promise<boolean> {
    const row = await queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM eq_equipment WHERE equipment_code = ? AND deleted = 0',
      [equipmentCode]
    );
    return (row?.cnt ?? 0) > 0;
  }

  async findAll(params?: {
    keyword?: string;
    equipmentType?: EquipmentType;
    status?: EquipmentStatus;
    workshop?: string;
  }): Promise<Equipment[]> {
    let sql = 'SELECT * FROM eq_equipment WHERE deleted = 0';
    const bindings: SqlValue[] = [];
    if (params?.keyword) {
      sql += ' AND (equipment_code LIKE ? OR equipment_name LIKE ? OR model LIKE ?)';
      const kw = `%${params.keyword}%`;
      bindings.push(kw, kw, kw);
    }
    if (params?.equipmentType) {
      sql += ' AND equipment_type = ?';
      bindings.push(params.equipmentType);
    }
    if (params?.status) {
      sql += ' AND status = ?';
      bindings.push(params.status);
    }
    if (params?.workshop) {
      sql += ' AND workshop = ?';
      bindings.push(params.workshop);
    }
    sql += ' ORDER BY id DESC';
    const rows = await query<EquipmentRow>(sql, bindings);
    return rows.map(rowToEquipment);
  }

  async save(equipment: Equipment): Promise<number> {
    const result = await execute(
      `INSERT INTO eq_equipment
       (equipment_code, equipment_name, equipment_type, model, manufacturer,
        workshop, location, purchase_date, install_date, purchase_price,
        expected_life_years, status, cumulative_run_hours, cumulative_print_count,
        last_maintenance_date, next_maintenance_date, remark,
        create_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
      [
        equipment.equipmentCode,
        equipment.equipmentName,
        equipment.equipmentType,
        equipment.model,
        equipment.manufacturer,
        equipment.workshop,
        equipment.location,
        equipment.purchaseDate ?? null,
        equipment.installDate ?? null,
        equipment.purchasePrice,
        equipment.expectedLifeYears,
        equipment.status,
        equipment.cumulativeRunHours,
        equipment.cumulativePrintCount,
        equipment.lastMaintenanceDate ?? null,
        equipment.nextMaintenanceDate ?? null,
        equipment.remark,
      ]
    );
    return result.insertId;
  }

  async update(equipment: Equipment): Promise<void> {
    await execute(
      `UPDATE eq_equipment SET
        equipment_name=?, equipment_type=?, model=?, manufacturer=?,
        workshop=?, location=?, purchase_date=?, install_date=?,
        purchase_price=?, expected_life_years=?, status=?,
        cumulative_run_hours=?, cumulative_print_count=?,
        last_maintenance_date=?, next_maintenance_date=?, remark=?,
        update_time=NOW()
       WHERE id=? AND deleted=0`,
      [
        equipment.equipmentName,
        equipment.equipmentType,
        equipment.model,
        equipment.manufacturer,
        equipment.workshop,
        equipment.location,
        equipment.purchaseDate ?? null,
        equipment.installDate ?? null,
        equipment.purchasePrice,
        equipment.expectedLifeYears,
        equipment.status,
        equipment.cumulativeRunHours,
        equipment.cumulativePrintCount,
        equipment.lastMaintenanceDate ?? null,
        equipment.nextMaintenanceDate ?? null,
        equipment.remark,
        equipment.id,
      ]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE eq_equipment SET deleted=1, update_time=NOW() WHERE id=?', [id]);
  }

  async generateEquipmentCode(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const row = await queryOne<{ seq: number }>(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(equipment_code, 5) AS UNSIGNED)), 0) + 1 as seq
       FROM eq_equipment WHERE equipment_code LIKE CONCAT('EQ-', ?, '%')`,
      [dateStr]
    );
    const seq = row?.seq ?? 1;
    return `EQ-${dateStr}-${String(seq).padStart(4, '0')}`;
  }
}
