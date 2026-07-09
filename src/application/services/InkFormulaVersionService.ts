/**
 * 油墨配方版本管理 — 应用服务
 *
 * 封装核心业务规则：
 * - 同一色号同一时间有且仅有一个已生效版本
 * - 新版本生效时旧生效版本自动归档（状态置为已作废）
 * - 已生效版本不可编辑，必须通过「一键复用」生成草稿
 * - 版本号生成：复用时次版本号+1，重大调整可指定主版本号升级
 *
 * 依据: docs/油墨配方版本管理完整落地方案.md
 */
import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import {
  FormulaVersionActivatedEvent,
  FormulaVersionCancelledEvent,
} from '@/domain/dcprint/events/FormulaVersionEvents';

// ===== 类型定义 =====

export interface InkColor {
  id: number;
  color_code: string;
  color_name: string;
  color_series: string | null;
  base_ink_type: string | null;
  pantone_code: string | null;
  remark: string | null;
  status: number;
  create_by: number | null;
  create_time: string;
  update_by: number | null;
  update_time: string;
}

export interface FormulaItem {
  id?: number;
  version_id?: number;
  material_id: number | null;
  material_code: string;
  material_name: string;
  ink_type: string | null;
  brand: string | null;
  ratio: number;
  weight: number | null;
  unit: string;
  add_order: number;
  process_remark: string | null;
  sort: number;
  is_base: number;
  snapshot_unit_cost: number | null;
}

export interface FormulaVersion {
  id: number;
  color_id: number;
  version_no: string;
  version_name: string | null;
  status: number; // 1-草稿 2-已生效 3-已作废
  change_reason: string | null;
  source_version_id: number | null;
  process_note: string | null;
  total_weight: number | null;
  unit: string;
  shelf_life_hours: number;
  theoretical_cost: number | null;
  cost_snapshot_time: string | null;
  cost_calc_status: number;
  cost_warning: string | null;
  activate_by: number | null;
  activate_time: string | null;
  cancel_by: number | null;
  cancel_reason: string | null;
  cancel_time: string | null;
  create_by: number | null;
  create_time: string;
  update_by: number | null;
  update_time: string;
  items?: FormulaItem[];
  color?: InkColor;
}

export interface CompareResult {
  baseInfo: {
    left: Partial<FormulaVersion>;
    right: Partial<FormulaVersion>;
    diffFields: string[];
  };
  items: {
    added: FormulaItem[];
    removed: FormulaItem[];
    modified: { left: FormulaItem; right: FormulaItem; fields: string[] }[];
    unchanged: FormulaItem[];
  };
  summary: {
    totalLeft: number;
    totalRight: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
}

// ===== 色号管理 =====

export async function listColors(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
}): Promise<{
  list: (InkColor & { active_version_no: string | null; version_count: number })[];
  total: number;
}> {
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

  const totalRows: Loose = await query(
    `SELECT COUNT(*) as total FROM dcprint_ink_color c ${where}`,
    sqlParams
  );
  const total = totalRows[0]?.total || 0;

  const rows: Loose = await query(
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

  return { list: rows as Loose[], total };
}

export async function createColor(
  data: Omit<InkColor, 'id' | 'create_time' | 'update_time' | 'create_by' | 'update_by'>,
  operatorId: number
): Promise<number> {
  const result: Loose = await execute(
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

export async function updateColor(
  id: number,
  data: Partial<InkColor>,
  operatorId: number
): Promise<void> {
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
    if (data[f as keyof InkColor] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(data[f as keyof InkColor] as Loose);
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

export async function deleteColor(id: number): Promise<void> {
  await execute('UPDATE dcprint_ink_color SET is_deleted = 1 WHERE id = ?', [id]);
}

// ===== 版本管理 =====

export async function listVersions(colorId: number): Promise<FormulaVersion[]> {
  const rows: Loose = await query(
    `SELECT v.* FROM dcprint_ink_formula_version v
     WHERE v.color_id = ? AND v.is_deleted = 0
     ORDER BY v.status ASC, v.create_time DESC`,
    [colorId]
  );
  return rows as FormulaVersion[];
}

export async function getVersionDetail(id: number): Promise<FormulaVersion | null> {
  const versions: Loose = await query(
    `SELECT v.*, c.color_code, c.color_name, c.pantone_code, c.base_ink_type
     FROM dcprint_ink_formula_version v
     LEFT JOIN dcprint_ink_color c ON v.color_id = c.id
     WHERE v.id = ? AND v.is_deleted = 0`,
    [id]
  );
  if (!versions || versions.length === 0) return null;

  const version = versions[0];
  const items: Loose = await query(
    `SELECT * FROM dcprint_ink_formula_item WHERE version_id = ? ORDER BY sort, add_order`,
    [id]
  );
  version.items = items;
  return version as FormulaVersion;
}

export async function createDraftVersion(
  data: {
    color_id: number;
    version_name?: string;
    change_reason?: string;
    process_note?: string;
    total_weight?: number;
    unit?: string;
    shelf_life_hours?: number;
    items: FormulaItem[];
  },
  operatorId: number
): Promise<number> {
  // 生成版本号：查找该色号已有版本数，生成 V1.0, V1.1, ...
  const existing: Loose = await query(
    `SELECT version_no FROM dcprint_ink_formula_version
     WHERE color_id = ? AND is_deleted = 0 ORDER BY id DESC LIMIT 1`,
    [data.color_id]
  );

  let versionNo = 'V1.0';
  if (existing && existing.length > 0) {
    const lastNo = existing[0].version_no as string;
    const match = lastNo.match(/^V(\d+)\.(\d+)$/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      versionNo = `V${major}.${minor + 1}`;
    }
  }

  const result = await transaction(async (conn) => {
    const [insertResult]: Loose = await conn.execute(
      `INSERT INTO dcprint_ink_formula_version
       (color_id, version_no, version_name, status, change_reason, process_note, total_weight, unit, shelf_life_hours, cost_calc_status, create_by, update_by)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        data.color_id,
        versionNo,
        data.version_name || null,
        data.change_reason || null,
        data.process_note || null,
        data.total_weight || null,
        data.unit || 'kg',
        data.shelf_life_hours || 168,
        operatorId,
        operatorId,
      ]
    );
    const versionId = insertResult.insertId;

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      await conn.execute(
        `INSERT INTO dcprint_ink_formula_item
         (version_id, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, add_order, process_remark, sort, is_base)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          versionId,
          item.material_id || null,
          item.material_code,
          item.material_name,
          item.ink_type || null,
          item.brand || null,
          item.ratio,
          item.weight || null,
          item.unit || 'kg',
          item.add_order || 0,
          item.process_remark || null,
          item.sort || i + 1,
          item.is_base || 0,
        ]
      );
    }

    return { id: versionId, version_no: versionNo };
  });

  return result.id;
}

export async function duplicateVersion(
  sourceId: number,
  data: { version_name?: string; change_reason?: string; major_version?: boolean },
  operatorId: number
): Promise<number> {
  const source = await getVersionDetail(sourceId);
  if (!source) {
    throw new Error('源版本不存在');
  }

  // 生成新版本号
  const match = source.version_no.match(/^V(\d+)\.(\d+)$/);
  let newVersionNo = 'V1.0';
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (data.major_version) {
      newVersionNo = `V${major + 1}.0`;
    } else {
      newVersionNo = `V${major}.${minor + 1}`;
    }
  }

  const result = await transaction(async (conn) => {
    const [insertResult]: Loose = await conn.execute(
      `INSERT INTO dcprint_ink_formula_version
       (color_id, version_no, version_name, status, change_reason, source_version_id, process_note, total_weight, unit, shelf_life_hours, cost_calc_status, create_by, update_by)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        source.color_id,
        newVersionNo,
        data.version_name || `复制自 ${source.version_no}`,
        data.change_reason || `从 ${source.version_no} 一键复用`,
        sourceId,
        source.process_note,
        source.total_weight,
        source.unit,
        source.shelf_life_hours,
        operatorId,
        operatorId,
      ]
    );
    const newVersionId = insertResult.insertId;

    // 复制明细
    if (source.items && source.items.length > 0) {
      for (const item of source.items) {
        await conn.execute(
          `INSERT INTO dcprint_ink_formula_item
           (version_id, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, add_order, process_remark, sort, is_base)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newVersionId,
            item.material_id,
            item.material_code,
            item.material_name,
            item.ink_type,
            item.brand,
            item.ratio,
            item.weight,
            item.unit,
            item.add_order,
            item.process_remark,
            item.sort,
            item.is_base,
          ]
        );
      }
    }

    return { id: newVersionId, version_no: newVersionNo };
  });

  secureLog('info', 'Formula version duplicated', {
    sourceId,
    newId: result.id,
    newVersionNo,
    operatorId,
  });

  return result.id;
}

export async function activateVersion(id: number, operatorId: number): Promise<void> {
  const version = await getVersionDetail(id);
  if (!version) {
    throw new Error('版本不存在');
  }
  if (version.status !== 1) {
    throw new Error('只有草稿版本可以生效');
  }

  await transaction(async (conn) => {
    // 将同色号下其他已生效版本置为已作废
    await conn.execute(
      `UPDATE dcprint_ink_formula_version
       SET status = 3, cancel_by = ?, cancel_time = NOW(), cancel_reason = '新版本生效自动归档', update_by = ?
       WHERE color_id = ? AND status = 2 AND is_deleted = 0 AND id != ?`,
      [operatorId, operatorId, version.color_id, id]
    );

    // 当前版本生效
    await conn.execute(
      `UPDATE dcprint_ink_formula_version
       SET status = 2, activate_by = ?, activate_time = NOW(), update_by = ?
       WHERE id = ?`,
      [operatorId, operatorId, id]
    );

    // 计算成本快照
    await calculateAndSnapshotCost(conn, id);

    const [costRows]: Loose = await conn.execute(
      'SELECT theoretical_cost FROM dcprint_ink_formula_version WHERE id = ?',
      [id]
    );
    await getDomainEventOutbox().saveEvents(conn, 'InkFormulaVersion', id, [
      new FormulaVersionActivatedEvent({
        versionId: id,
        colorId: version.color_id,
        versionNo: version.version_no,
        activatedBy: operatorId,
        theoreticalCost: costRows[0]?.theoretical_cost ?? null,
      }),
    ]);
  });

  secureLog('info', 'Formula version activated', { id, operatorId });
}

export async function cancelVersion(id: number, operatorId: number, reason: string): Promise<void> {
  const version = await getVersionDetail(id);
  if (!version) {
    throw new Error('版本不存在');
  }
  if (version.status !== 2) {
    throw new Error('只有已生效版本可以作废');
  }

  await transaction(async (conn) => {
    await conn.execute(
      `UPDATE dcprint_ink_formula_version
       SET status = 3, cancel_by = ?, cancel_reason = ?, cancel_time = NOW(), update_by = ?
       WHERE id = ?`,
      [operatorId, reason, operatorId, id]
    );

    await getDomainEventOutbox().saveEvents(conn, 'InkFormulaVersion', id, [
      new FormulaVersionCancelledEvent({
        versionId: id,
        colorId: version.color_id,
        versionNo: version.version_no,
        cancelledBy: operatorId,
        reason,
      }),
    ]);
  });

  secureLog('info', 'Formula version cancelled', { id, operatorId, reason });
}

export async function updateVersion(
  id: number,
  data: {
    version_name?: string;
    change_reason?: string;
    process_note?: string;
    total_weight?: number;
    unit?: string;
    shelf_life_hours?: number;
    items?: FormulaItem[];
  },
  operatorId: number
): Promise<void> {
  const version = await getVersionDetail(id);
  if (!version) {
    throw new Error('版本不存在');
  }
  if (version.status !== 1) {
    throw new Error('只有草稿版本可以编辑');
  }

  await transaction(async (conn) => {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    const editable = [
      'version_name',
      'change_reason',
      'process_note',
      'total_weight',
      'unit',
      'shelf_life_hours',
    ];
    for (const f of editable) {
      if (data[f as keyof typeof data] !== undefined) {
        fields.push(`${f} = ?`);
        values.push((data as Loose)[f]);
      }
    }

    if (fields.length > 0) {
      fields.push('update_by = ?');
      values.push(operatorId);
      values.push(id);
      await conn.execute(
        `UPDATE dcprint_ink_formula_version SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    // 更新明细
    if (data.items && Array.isArray(data.items)) {
      await conn.execute('DELETE FROM dcprint_ink_formula_item WHERE version_id = ?', [id]);
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        await conn.execute(
          `INSERT INTO dcprint_ink_formula_item
           (version_id, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, add_order, process_remark, sort, is_base)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            item.material_id || null,
            item.material_code,
            item.material_name,
            item.ink_type || null,
            item.brand || null,
            item.ratio,
            item.weight || null,
            item.unit || 'kg',
            item.add_order || 0,
            item.process_remark || null,
            item.sort || i + 1,
            item.is_base || 0,
          ]
        );
      }
    }
  });
}

export async function deleteVersion(id: number): Promise<void> {
  const version = await getVersionDetail(id);
  if (!version) {
    throw new Error('版本不存在');
  }
  if (version.status === 2) {
    throw new Error('已生效版本不可删除，请先作废');
  }

  await transaction(async (conn) => {
    await conn.execute('UPDATE dcprint_ink_formula_version SET is_deleted = 1 WHERE id = ?', [id]);
    await conn.execute('DELETE FROM dcprint_ink_formula_item WHERE version_id = ?', [id]);
  });
}

// 独立更新草稿版本明细（对应 API：POST /version/:id/items）
export async function updateVersionItems(
  id: number,
  items: FormulaItem[],
  operatorId: number
): Promise<void> {
  const version = await getVersionDetail(id);
  if (!version) {
    throw new Error('版本不存在');
  }
  if (version.status !== 1) {
    throw new Error('只有草稿版本可以编辑明细');
  }
  if (!Array.isArray(items)) {
    throw new Error('items 必须为数组');
  }

  await transaction(async (conn) => {
    await conn.execute('DELETE FROM dcprint_ink_formula_item WHERE version_id = ?', [id]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await conn.execute(
        `INSERT INTO dcprint_ink_formula_item
         (version_id, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, add_order, process_remark, sort, is_base)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.material_id || null,
          item.material_code,
          item.material_name,
          item.ink_type || null,
          item.brand || null,
          item.ratio,
          item.weight || null,
          item.unit || 'kg',
          item.add_order || 0,
          item.process_remark || null,
          item.sort || i + 1,
          item.is_base || 0,
        ]
      );
    }
    await conn.execute(
      'UPDATE dcprint_ink_formula_version SET update_by = ?, cost_calc_status = 0 WHERE id = ?',
      [operatorId, id]
    );
  });
}

// ===== 版本对比 =====

export async function compareVersions(leftId: number, rightId: number): Promise<CompareResult> {
  const left = await getVersionDetail(leftId);
  const right = await getVersionDetail(rightId);

  if (!left || !right) {
    throw new Error('版本不存在');
  }
  if (left.color_id !== right.color_id) {
    throw new Error('只能对比同色号的版本');
  }

  // 以 material_code 为匹配键
  const leftMap = new Map<string, FormulaItem>();
  const rightMap = new Map<string, FormulaItem>();

  (left.items || []).forEach((item) => leftMap.set(item.material_code, item));
  (right.items || []).forEach((item) => rightMap.set(item.material_code, item));

  const added: FormulaItem[] = [];
  const removed: FormulaItem[] = [];
  const modified: { left: FormulaItem; right: FormulaItem; fields: string[] }[] = [];
  const unchanged: FormulaItem[] = [];

  const allCodes = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const code of allCodes) {
    const lItem = leftMap.get(code);
    const rItem = rightMap.get(code);

    if (!lItem && rItem) {
      added.push(rItem);
    } else if (lItem && !rItem) {
      removed.push(lItem);
    } else if (lItem && rItem) {
      const fields: string[] = [];
      if (Number(lItem.ratio) !== Number(rItem.ratio)) fields.push('ratio');
      if (Number(lItem.weight || 0) !== Number(rItem.weight || 0)) fields.push('weight');
      if ((lItem.add_order || 0) !== (rItem.add_order || 0)) fields.push('add_order');
      if ((lItem.process_remark || '') !== (rItem.process_remark || ''))
        fields.push('process_remark');

      if (fields.length > 0) {
        modified.push({ left: lItem, right: rItem, fields });
      } else {
        unchanged.push(rItem);
      }
    }
  }

  // 基础信息差异
  const diffFields: string[] = [];
  const baseFields = [
    'version_no',
    'version_name',
    'change_reason',
    'process_note',
    'total_weight',
    'theoretical_cost',
  ];
  for (const f of baseFields) {
    if (String((left as Loose)[f] ?? '') !== String((right as Loose)[f] ?? '')) {
      diffFields.push(f);
    }
  }

  return {
    baseInfo: {
      left: {
        id: left.id,
        version_no: left.version_no,
        version_name: left.version_name,
        change_reason: left.change_reason,
        process_note: left.process_note,
        total_weight: left.total_weight,
        theoretical_cost: left.theoretical_cost,
      },
      right: {
        id: right.id,
        version_no: right.version_no,
        version_name: right.version_name,
        change_reason: right.change_reason,
        process_note: right.process_note,
        total_weight: right.total_weight,
        theoretical_cost: right.theoretical_cost,
      },
      diffFields,
    },
    items: { added, removed, modified, unchanged },
    summary: {
      totalLeft: left.items?.length || 0,
      totalRight: right.items?.length || 0,
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
      unchangedCount: unchanged.length,
    },
  };
}

// ===== 成本计算 =====

/**
 * 计算配方理论成本并快照到版本表及明细表
 * 理论成本 = Σ (配比比例% × 原料单位成本)
 * 成本取值：base_ink.unit_price（计划价）
 */
async function calculateAndSnapshotCost(conn: Loose, versionId: number): Promise<void> {
  const items: Loose = await query(
    `SELECT fi.*, bi.unit_price
     FROM dcprint_ink_formula_item fi
     LEFT JOIN base_ink bi ON fi.material_id = bi.id
     WHERE fi.version_id = ?`,
    [versionId]
  );

  let totalCost = 0;
  let missingCount = 0;
  const warnings: string[] = [];

  for (const item of items) {
    const unitCost = Number(item.unit_price) || 0;
    if (unitCost === 0 && item.material_id) {
      missingCount++;
      warnings.push(`${item.material_name} 缺少成本`);
    }

    const itemCost = (Number(item.ratio) / 100) * unitCost;
    totalCost += itemCost;

    // 快照明细单位成本
    await conn.execute('UPDATE dcprint_ink_formula_item SET snapshot_unit_cost = ? WHERE id = ?', [
      unitCost.toFixed(4),
      item.id,
    ]);
  }

  const costStatus = missingCount === 0 ? 1 : 2;
  const warning = warnings.length > 0 ? warnings.join('; ') : null;

  await conn.execute(
    `UPDATE dcprint_ink_formula_version
     SET theoretical_cost = ?, cost_snapshot_time = NOW(), cost_calc_status = ?, cost_warning = ?
     WHERE id = ?`,
    [totalCost.toFixed(4), costStatus, warning, versionId]
  );
}

/**
 * 草稿成本预览（不持久化）
 */
export async function previewCost(items: FormulaItem[]): Promise<{
  totalCost: number;
  itemCosts: {
    material_code: string;
    material_name: string;
    ratio: number;
    unit_cost: number;
    item_cost: number;
  }[];
  warnings: string[];
}> {
  if (items.length === 0) {
    return { totalCost: 0, itemCosts: [], warnings: [] };
  }

  const materialIds = items.filter((i) => i.material_id).map((i) => i.material_id);
  const costMap = new Map<number, number>();
  if (materialIds.length > 0) {
    const costs: Loose = await query(`SELECT id, unit_price FROM base_ink WHERE id IN (?)`, [
      materialIds,
    ]);
    for (const c of costs) {
      costMap.set(c.id, Number(c.unit_price) || 0);
    }
  }

  let totalCost = 0;
  const warnings: string[] = [];
  const itemCosts = items.map((item) => {
    const unitCost = item.material_id ? costMap.get(item.material_id) || 0 : 0;
    if (unitCost === 0 && item.material_id) {
      warnings.push(`${item.material_name} 缺少成本数据`);
    }
    const itemCost = (Number(item.ratio) / 100) * unitCost;
    totalCost += itemCost;
    return {
      material_code: item.material_code,
      material_name: item.material_name,
      ratio: Number(item.ratio),
      unit_cost: unitCost,
      item_cost: Number(itemCost.toFixed(4)),
    };
  });

  return { totalCost: Number(totalCost.toFixed(4)), itemCosts, warnings };
}

/**
 * 手动重算草稿版本成本（更新预览值）
 */
export async function recalculateCost(versionId: number): Promise<void> {
  const version = await getVersionDetail(versionId);
  if (!version) {
    throw new Error('版本不存在');
  }
  if (version.status !== 1) {
    throw new Error('只有草稿版本可以重算成本');
  }

  await transaction(async (conn) => {
    await calculateAndSnapshotCost(conn, versionId);
  });
}
