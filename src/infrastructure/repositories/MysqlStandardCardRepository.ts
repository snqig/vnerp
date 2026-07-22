import { db } from '@/lib/db';
import { StandardCard, StandardCardProps } from '@/domain/standard-card/aggregates/StandardCard';
import { StandardCardStatus } from '@/domain/standard-card/value-objects/StandardCardStatus';
import {
  StandardCardType,
  getTypePrefix,
} from '@/domain/standard-card/value-objects/StandardCardType';
import {
  IStandardCardRepository,
  StandardCardFilters,
} from '@/domain/standard-card/repositories/IStandardCardRepository';
interface StandardCardRow {
  id: number;
  code: string;
  version: string;
  name: string;
  type: string;
  material_id: number;
  material_name: string;
  customer_id: number | null;
  customer_name: string;
  spec: string;
  status: string;
  effective_date: string | null;
  expiry_date: string | null;
  parent_version_id: number | null;
  is_current: number;
  is_obsolete: number;
  is_locked: number;
  change_description: string | null;
  obsolete_reason: string | null;
  obsolete_by: number | null;
  obsolete_at: string | null;
  quality_requirement: string | null;
  material_requirement: string | null;
  ink_requirement: string | null;
  tooling_requirement: string | null;
  process_requirement: string | null;
  create_user: number | null;
  remark: string | null;
  create_time: string | null;
  update_time: string | null;
  deleted: number;
}

interface ColorStandardItemRow {
  id: number;
  standard_card_id: number;
  color_name: string;
  pantone_code: string | null;
  cmyk_value: string | null;
  rgb_value: string | null;
  color_sample_image: string | null;
  tolerance: string | null;
  remark: string | null;
}

interface ProcessStandardItemRow {
  id: number;
  standard_card_id: number;
  process_id: number | null;
  process_name: string;
  process_order: number;
  parameter_name: string | null;
  standard_value: string | null;
  tolerance: string | null;
  unit: string | null;
  standard_time: number | null;
  machine_type: string | null;
  description: string | null;
  remark: string | null;
}

interface QualityStandardItemRow {
  id: number;
  standard_card_id: number;
  inspection_item: string;
  standard_value: string | null;
  tolerance: string | null;
  inspection_method: string | null;
  is_key: number;
  defect_level: string | null;
  remark: string | null;
}

interface StandardCardMaterialRow {
  id: number;
  standard_card_id: number;
  material_id: number;
  spec: string | null;
  unit_consumption: number;
  loss_rate: number;
  remark: string | null;
}

interface StandardCardInkRow {
  id: number;
  standard_card_id: number;
  ink_id: number;
  ratio: number;
  unit_consumption: number;
  remark: string | null;
}

interface StandardCardToolingRow {
  id: number;
  standard_card_id: number;
  die_mold_id: number | null;
  screen_plate_id: number | null;
  remark: string | null;
}

interface StandardCardAttachmentRow {
  id: number;
  standard_card_id: number;
  version: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  remark: string | null;
  uploaded_by: number | null;
}

interface VersionChangeLogRow {
  id: number;
  standard_card_id: number;
  version: string;
  change_type: string;
  change_content: string;
  changed_by: number;
  changed_at: string | null;
  changed_by_name: string | null;
}

export class MysqlStandardCardRepository implements IStandardCardRepository {
  async findById(id: number): Promise<StandardCard | null> {
    const rows = await db.query('SELECT * FROM prd_standard_card WHERE id = ? AND deleted = 0', [
      id,
    ]);
    if (rows.length === 0) return null;
    return this.mapToEntity(rows[0] as StandardCardRow);
  }

  async findByCode(code: string): Promise<StandardCard | null> {
    const rows = await db.query('SELECT * FROM prd_standard_card WHERE code = ? AND deleted = 0', [
      code,
    ]);
    if (rows.length === 0) return null;
    return this.mapToEntity(rows[0] as StandardCardRow);
  }

  async findByMaterialId(materialId: number, includeObsolete = false): Promise<StandardCard[]> {
    const params: (string | number | null)[] = [materialId];
    let sql = 'SELECT * FROM prd_standard_card WHERE material_id = ?';
    if (!includeObsolete) {
      sql += ' AND is_obsolete = 0';
    }
    sql += ' AND deleted = 0 ORDER BY is_current DESC, version DESC, create_time DESC';
    const rows = await db.query(sql, params);
    return rows.map((row) => this.mapToEntity(row as StandardCardRow));
  }

  async findCurrentByMaterialId(materialId: number): Promise<StandardCard | null> {
    const rows = await db.query(
      'SELECT * FROM prd_standard_card WHERE material_id = ? AND is_current = 1 AND deleted = 0 LIMIT 1',
      [materialId]
    );
    if (rows.length === 0) return null;
    return this.mapToEntity(rows[0] as StandardCardRow);
  }

  async findByFilters(
    filters: StandardCardFilters,
    page = 1,
    pageSize = 20
  ): Promise<{ list: StandardCard[]; total: number }> {
    const conditions: string[] = ['deleted = 0'];
    const params: (string | number | null)[] = [];

    if (filters.code) {
      conditions.push('code LIKE ?');
      params.push(`%${filters.code}%`);
    }
    if (filters.name) {
      conditions.push('name LIKE ?');
      params.push(`%${filters.name}%`);
    }
    if (filters.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.materialId) {
      conditions.push('material_id = ?');
      params.push(filters.materialId);
    }
    if (filters.customerId) {
      conditions.push('customer_id = ?');
      params.push(filters.customerId);
    }
    if (filters.isCurrent !== undefined) {
      conditions.push('is_current = ?');
      params.push(filters.isCurrent ? 1 : 0);
    }
    if (filters.isObsolete !== undefined) {
      conditions.push('is_obsolete = ?');
      params.push(filters.isObsolete ? 1 : 0);
    }
    if (filters.effectiveDateFrom) {
      conditions.push('effective_date >= ?');
      params.push(
        filters.effectiveDateFrom instanceof Date
          ? filters.effectiveDateFrom.toISOString().slice(0, 10)
          : filters.effectiveDateFrom
      );
    }
    if (filters.effectiveDateTo) {
      conditions.push('effective_date <= ?');
      params.push(
        filters.effectiveDateTo instanceof Date
          ? filters.effectiveDateTo.toISOString().slice(0, 10)
          : filters.effectiveDateTo
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM prd_standard_card ${whereClause}`,
      params
    );
    const total = Number(countResult[0]?.total || 0);

    const offset = (page - 1) * pageSize;
    const rows = await db.query(
      `SELECT * FROM prd_standard_card ${whereClause} ORDER BY is_current DESC, version DESC, create_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      list: rows.map((row) => this.mapToEntity(row as StandardCardRow)),
      total,
    };
  }

  async save(card: StandardCard): Promise<number> {
    const props = card.toProps();
    const result = await db.insert('prd_standard_card', {
      code: props.code,
      version: props.version,
      name: props.name,
      type: props.type,
      material_id: props.materialId,
      material_name: props.materialName,
      customer_id: props.customerId,
      customer_name: props.customerName,
      spec: props.spec,
      status: props.status,
      effective_date: props.effectiveDate || null,
      expiry_date: props.expiryDate || null,
      parent_version_id: props.parentVersionId,
      is_current: props.isCurrent ? 1 : 0,
      is_obsolete: props.isObsolete ? 1 : 0,
      is_locked: props.isLocked ? 1 : 0,
      change_description: props.changeDescription,
      obsolete_reason: props.obsoleteReason,
      obsolete_by: props.obsoleteBy,
      obsolete_at: props.obsoleteAt,
      quality_requirement: props.qualityRequirement,
      material_requirement: props.materialRequirement,
      ink_requirement: props.inkRequirement,
      tooling_requirement: props.toolingRequirement,
      process_requirement: props.processRequirement,
      create_user: props.createUser,
      create_time: new Date(),
    });
    return result.insertId;
  }

  async update(card: StandardCard): Promise<void> {
    const props = card.toProps();
    await db.execute(
      `UPDATE prd_standard_card 
       SET name = ?, type = ?, material_id = ?, material_name = ?, customer_id = ?, customer_name = ?, 
           spec = ?, status = ?, effective_date = ?, expiry_date = ?, is_current = ?, is_obsolete = ?, 
           is_locked = ?, change_description = ?, obsolete_reason = ?, obsolete_by = ?, obsolete_at = ?, 
           quality_requirement = ?, material_requirement = ?, ink_requirement = ?, tooling_requirement = ?, 
           process_requirement = ?, update_time = NOW()
       WHERE id = ?`,
      [
        props.name,
        props.type,
        props.materialId,
        props.materialName,
        props.customerId,
        props.customerName,
        props.spec,
        props.status,
        props.effectiveDate,
        props.expiryDate,
        props.isCurrent ? 1 : 0,
        props.isObsolete ? 1 : 0,
        props.isLocked ? 1 : 0,
        props.changeDescription,
        props.obsoleteReason,
        props.obsoleteBy,
        props.obsoleteAt,
        props.qualityRequirement,
        props.materialRequirement,
        props.inkRequirement,
        props.toolingRequirement,
        props.processRequirement,
        card.id,
      ]
    );
  }

  async delete(id: number): Promise<void> {
    await db.execute('UPDATE prd_standard_card SET deleted = 1, update_time = NOW() WHERE id = ?', [
      id,
    ]);
  }

  async exists(code: string): Promise<boolean> {
    const rows = await db.query(
      'SELECT 1 FROM prd_standard_card WHERE code = ? AND deleted = 0 LIMIT 1',
      [code]
    );
    return rows.length > 0;
  }

  async getNextSequence(type: StandardCardType): Promise<string> {
    const prefix = getTypePrefix(type);
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const pattern = `${prefix}${datePrefix}%`;

    const rows = await db.query(
      'SELECT code FROM prd_standard_card WHERE code LIKE ? ORDER BY code DESC LIMIT 1',
      [pattern]
    );

    if (rows.length === 0) {
      return `${datePrefix}0001`;
    }

    const lastCode = rows[0].code as string;
    const lastSeq = parseInt(lastCode.slice(-4));
    const nextSeq = (lastSeq + 1).toString().padStart(4, '0');
    return `${datePrefix}${nextSeq}`;
  }

  private mapToEntity(row: StandardCardRow): StandardCard {
    const props: StandardCardProps = {
      id: row.id,
      code: row.code,
      version: row.version,
      name: row.name,
      type: row.type as StandardCardType,
      materialId: row.material_id,
      materialName: row.material_name,
      customerId: row.customer_id ?? undefined,
      customerName: row.customer_name,
      spec: row.spec,
      status: row.status as StandardCardStatus,
      effectiveDate: row.effective_date ? new Date(row.effective_date) : undefined,
      expiryDate: row.expiry_date ? new Date(row.expiry_date) : undefined,
      parentVersionId: row.parent_version_id ?? undefined,
      isCurrent: row.is_current === 1,
      isObsolete: row.is_obsolete === 1,
      isLocked: row.is_locked === 1,
      changeDescription: row.change_description ?? undefined,
      obsoleteReason: row.obsolete_reason ?? undefined,
      obsoleteBy: row.obsolete_by ?? undefined,
      obsoleteAt: row.obsolete_at ? new Date(row.obsolete_at) : undefined,
      qualityRequirement: row.quality_requirement ?? undefined,
      materialRequirement: row.material_requirement ?? undefined,
      inkRequirement: row.ink_requirement ?? undefined,
      toolingRequirement: row.tooling_requirement ?? undefined,
      processRequirement: row.process_requirement ?? undefined,
      createUser: row.create_user ?? undefined,
      createTime: row.create_time ? new Date(row.create_time) : undefined,
      updateTime: row.update_time ? new Date(row.update_time) : undefined,
      remark: row.remark ?? undefined,
    };
    return new StandardCard(props);
  }
}

export class ColorStandardItemRepository {
  async findByStandardCardId(standardCardId: number): Promise<ColorStandardItemRow[]> {
    return await db.query('SELECT * FROM prd_color_standard_item WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }

  async saveBatch(standardCardId: number, items: ColorStandardItemRow[]): Promise<void> {
    await db.execute('DELETE FROM prd_color_standard_item WHERE standard_card_id = ?', [
      standardCardId,
    ]);
    for (const item of items) {
      await db.insert('prd_color_standard_item', {
        standard_card_id: standardCardId,
        color_name: item.color_name,
        pantone_code: item.pantone_code,
        cmyk_value: item.cmyk_value,
        rgb_value: item.rgb_value,
        color_sample_image: item.color_sample_image,
        tolerance: item.tolerance,
        remark: item.remark,
      });
    }
  }

  async deleteByStandardCardId(standardCardId: number): Promise<void> {
    await db.execute('DELETE FROM prd_color_standard_item WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }
}

export class ProcessStandardItemRepository {
  async findByStandardCardId(standardCardId: number): Promise<ProcessStandardItemRow[]> {
    return await db.query(
      'SELECT * FROM prd_process_standard_item WHERE standard_card_id = ? ORDER BY process_order',
      [standardCardId]
    );
  }

  async saveBatch(standardCardId: number, items: ProcessStandardItemRow[]): Promise<void> {
    await db.execute('DELETE FROM prd_process_standard_item WHERE standard_card_id = ?', [
      standardCardId,
    ]);
    for (const item of items) {
      await db.insert('prd_process_standard_item', {
        standard_card_id: standardCardId,
        process_id: item.process_id,
        process_name: item.process_name,
        process_order: item.process_order,
        parameter_name: item.parameter_name,
        standard_value: item.standard_value,
        tolerance: item.tolerance,
        unit: item.unit,
        standard_time: item.standard_time,
        machine_type: item.machine_type,
        description: item.description,
        remark: item.remark,
      });
    }
  }

  async deleteByStandardCardId(standardCardId: number): Promise<void> {
    await db.execute('DELETE FROM prd_process_standard_item WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }
}

export class QualityStandardItemRepository {
  async findByStandardCardId(standardCardId: number): Promise<QualityStandardItemRow[]> {
    return await db.query('SELECT * FROM prd_quality_standard_item WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }

  async saveBatch(standardCardId: number, items: QualityStandardItemRow[]): Promise<void> {
    await db.execute('DELETE FROM prd_quality_standard_item WHERE standard_card_id = ?', [
      standardCardId,
    ]);
    for (const item of items) {
      await db.insert('prd_quality_standard_item', {
        standard_card_id: standardCardId,
        inspection_item: item.inspection_item,
        standard_value: item.standard_value,
        tolerance: item.tolerance,
        inspection_method: item.inspection_method,
        is_key: item.is_key ? 1 : 0,
        defect_level: item.defect_level,
        remark: item.remark,
      });
    }
  }

  async deleteByStandardCardId(standardCardId: number): Promise<void> {
    await db.execute('DELETE FROM prd_quality_standard_item WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }
}

export class StandardCardMaterialRepository {
  async findByStandardCardId(standardCardId: number): Promise<StandardCardMaterialRow[]> {
    return await db.query(
      `SELECT scm.*, im.material_code, im.material_name 
       FROM prd_standard_card_material scm
       LEFT JOIN inv_material im ON scm.material_id = im.id
       WHERE scm.standard_card_id = ?`,
      [standardCardId]
    );
  }

  async saveBatch(standardCardId: number, materials: StandardCardMaterialRow[]): Promise<void> {
    await db.execute('DELETE FROM prd_standard_card_material WHERE standard_card_id = ?', [
      standardCardId,
    ]);
    for (const m of materials) {
      await db.insert('prd_standard_card_material', {
        standard_card_id: standardCardId,
        material_id: m.material_id,
        spec: m.spec,
        unit_consumption: m.unit_consumption,
        loss_rate: m.loss_rate ?? 0,
        remark: m.remark,
      });
    }
  }

  async deleteByStandardCardId(standardCardId: number): Promise<void> {
    await db.execute('DELETE FROM prd_standard_card_material WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }
}

export class StandardCardInkRepository {
  async findByStandardCardId(standardCardId: number): Promise<StandardCardInkRow[]> {
    return await db.query(
      `SELECT sci.*, di.ink_code, di.ink_name, di.color_name
       FROM prd_standard_card_ink sci
       LEFT JOIN dcprint_ink di ON sci.ink_id = di.id
       WHERE sci.standard_card_id = ?`,
      [standardCardId]
    );
  }

  async saveBatch(standardCardId: number, inks: StandardCardInkRow[]): Promise<void> {
    await db.execute('DELETE FROM prd_standard_card_ink WHERE standard_card_id = ?', [
      standardCardId,
    ]);
    for (const ink of inks) {
      await db.insert('prd_standard_card_ink', {
        standard_card_id: standardCardId,
        ink_id: ink.ink_id,
        ratio: ink.ratio,
        unit_consumption: ink.unit_consumption,
        remark: ink.remark,
      });
    }
  }

  async deleteByStandardCardId(standardCardId: number): Promise<void> {
    await db.execute('DELETE FROM prd_standard_card_ink WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }
}

export class StandardCardToolingRepository {
  async findByStandardCardId(standardCardId: number): Promise<StandardCardToolingRow[]> {
    return await db.query('SELECT * FROM prd_standard_card_tooling WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }

  async saveBatch(standardCardId: number, toolings: StandardCardToolingRow[]): Promise<void> {
    await db.execute('DELETE FROM prd_standard_card_tooling WHERE standard_card_id = ?', [
      standardCardId,
    ]);
    for (const t of toolings) {
      await db.insert('prd_standard_card_tooling', {
        standard_card_id: standardCardId,
        die_mold_id: t.die_mold_id,
        screen_plate_id: t.screen_plate_id,
        remark: t.remark,
      });
    }
  }

  async deleteByStandardCardId(standardCardId: number): Promise<void> {
    await db.execute('DELETE FROM prd_standard_card_tooling WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }
}

export class StandardCardAttachmentRepository {
  async findByStandardCardId(standardCardId: number): Promise<StandardCardAttachmentRow[]> {
    return await db.query('SELECT * FROM prd_standard_card_attachment WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }

  async save(standardCardId: number, attachment: StandardCardAttachmentRow): Promise<number> {
    const result = await db.insert('prd_standard_card_attachment', {
      standard_card_id: standardCardId,
      version: attachment.version,
      file_name: attachment.file_name,
      file_path: attachment.file_path,
      file_size: attachment.file_size,
      remark: attachment.remark,
      uploaded_by: attachment.uploaded_by,
    });
    return result.insertId;
  }

  async delete(id: number): Promise<void> {
    await db.execute('DELETE FROM prd_standard_card_attachment WHERE id = ?', [id]);
  }

  async deleteByStandardCardId(standardCardId: number): Promise<void> {
    await db.execute('DELETE FROM prd_standard_card_attachment WHERE standard_card_id = ?', [
      standardCardId,
    ]);
  }
}

export class VersionChangeLogRepository {
  async findByStandardCardId(standardCardId: number): Promise<VersionChangeLogRow[]> {
    return await db.query(
      `SELECT vcl.*, u.user_name as changed_by_name
       FROM prd_standard_card_version_log vcl
       LEFT JOIN sys_user u ON vcl.changed_by = u.id
       WHERE vcl.standard_card_id = ?
       ORDER BY vcl.changed_at DESC`,
      [standardCardId]
    );
  }

  async save(log: VersionChangeLogRow): Promise<void> {
    await db.insert('prd_standard_card_version_log', {
      standard_card_id: log.standard_card_id,
      version: log.version,
      change_type: log.change_type,
      change_content: log.change_content,
      changed_by: log.changed_by,
    });
  }
}
