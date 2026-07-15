/**
 * 油墨配方版本管理 — 应用服务
 *
 * 编排业务流程，不包含业务规则：
 * - 业务规则委托给领域层（InkFormulaVersion 聚合根）
 * - 数据访问委托给仓储层（MysqlFormulaVersionRepository）
 * - 版本对比委托给 FormulaCompareService
 * - 成本计算委托给 FormulaCostService + MaterialCostProvider
 *
 * 依据: docs/油墨配方版本管理完整落地方案.md 第三、四节
 */
import { query, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import {
  FormulaVersionActivatedEvent,
  FormulaVersionCancelledEvent,
} from '@/domain/dcprint/events/FormulaVersionEvents';
import { InkFormulaVersion } from '@/domain/dcprint/aggregates/InkFormulaVersion';
import { FormulaItemVO, FormulaItemProps } from '@/domain/dcprint/value-objects/FormulaItemVO';
import { FormulaCompareService } from '@/domain/dcprint/services/FormulaCompareService';
import { FormulaCostService } from '@/domain/dcprint/services/FormulaCostService';
import {
  MysqlFormulaVersionRepository,
  MysqlInkColorRepository,
} from '@/infrastructure/repositories/MysqlFormulaVersionRepository';
import { MaterialCostProvider } from '@/infrastructure/providers/MaterialCostProvider';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

// ===== DTO 类型定义（保持与 API 路由兼容）=====

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
  status: number;
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

// ===== 领域服务 & 仓储实例 =====

const versionRepo = new MysqlFormulaVersionRepository();
const colorRepo = new MysqlInkColorRepository();
const compareService = new FormulaCompareService();
const costProvider = new MaterialCostProvider();
const costService = new FormulaCostService(costProvider);

// ===== 映射函数：领域对象 → DTO =====

function itemVOToDTO(vo: FormulaItemVO): FormulaItem {
  return {
    id: vo.id,
    version_id: vo.versionId,
    material_id: vo.materialId,
    material_code: vo.materialCode,
    material_name: vo.materialName,
    ink_type: vo.inkType,
    brand: vo.brand,
    ratio: Number(vo.ratio),
    weight: vo.weight != null ? Number(vo.weight) : null,
    unit: vo.unit,
    add_order: vo.addOrder,
    process_remark: vo.processRemark,
    sort: vo.sort,
    is_base: vo.isBase,
    snapshot_unit_cost: vo.snapshotUnitCost != null ? Number(vo.snapshotUnitCost) : null,
  };
}

function itemDTOToProps(item: FormulaItem): FormulaItemProps {
  return {
    id: item.id,
    versionId: item.version_id,
    materialId: item.material_id,
    materialCode: item.material_code,
    materialName: item.material_name,
    inkType: item.ink_type,
    brand: item.brand,
    ratio: Number(item.ratio),
    weight: item.weight != null ? Number(item.weight) : null,
    unit: item.unit,
    addOrder: item.add_order,
    processRemark: item.process_remark,
    sort: item.sort,
    isBase: item.is_base,
    snapshotUnitCost: item.snapshot_unit_cost != null ? Number(item.snapshot_unit_cost) : null,
  };
}

function aggregateToDTO(agg: InkFormulaVersion): FormulaVersion {
  const props = agg.toProps();
  return {
    id: props.id!,
    color_id: props.colorId,
    version_no: props.versionNo,
    version_name: props.versionName ?? null,
    status: props.status,
    change_reason: props.changeReason ?? null,
    source_version_id: props.sourceVersionId ?? null,
    process_note: props.processNote ?? null,
    total_weight: props.totalWeight != null ? Number(props.totalWeight) : null,
    unit: props.unit ?? 'kg',
    shelf_life_hours: props.shelfLifeHours ?? 168,
    theoretical_cost: props.theoreticalCost != null ? Number(props.theoreticalCost) : null,
    cost_snapshot_time: props.costSnapshotTime?.toISOString() ?? null,
    cost_calc_status: props.costCalcStatus ?? 0,
    cost_warning: props.costWarning ?? null,
    activate_by: props.activateBy ?? null,
    activate_time: props.activateTime?.toISOString() ?? null,
    cancel_by: props.cancelBy ?? null,
    cancel_reason: props.cancelReason ?? null,
    cancel_time: props.cancelTime?.toISOString() ?? null,
    create_by: props.createBy ?? null,
    create_time: props.createTime?.toISOString() ?? '',
    update_by: props.updateBy ?? null,
    update_time: props.updateTime?.toISOString() ?? '',
    items: props.items?.map(itemVOToDTO),
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
  const result = await colorRepo.findList({
    page: params.page,
    pageSize: params.pageSize,
    keyword: params.keyword,
    status: params.status ? Number(params.status) : undefined,
  });
  return {
    list: result.list as (InkColor & { active_version_no: string | null; version_count: number })[],
    total: result.total,
  };
}

export async function createColor(
  data: Omit<InkColor, 'id' | 'create_time' | 'update_time' | 'create_by' | 'update_by'>,
  operatorId: number
): Promise<number> {
  return colorRepo.save(data, operatorId);
}

export async function updateColor(
  id: number,
  data: Partial<InkColor>,
  operatorId: number
): Promise<void> {
  await colorRepo.update(id, data, operatorId);
}

export async function deleteColor(id: number): Promise<void> {
  await colorRepo.softDelete(id);
}

// ===== 版本管理 =====

export async function listVersions(colorId: number): Promise<FormulaVersion[]> {
  const versions = await versionRepo.findByColorId(colorId);
  return versions.map(aggregateToDTO);
}

export async function getVersionDetail(id: number): Promise<FormulaVersion | null> {
  const agg = await versionRepo.findByIdWithItems(id);
  if (!agg) return null;

  // 补充色号关联信息（保持兼容）
  const dto = aggregateToDTO(agg);
  const color = await colorRepo.findById(agg.colorId);
  if (color) {
    dto.color = {
      id: color.id,
      color_code: color.color_code,
      color_name: color.color_name,
      color_series: color.color_series,
      base_ink_type: color.base_ink_type,
      pantone_code: color.pantone_code,
      remark: color.remark,
      status: color.status,
      create_by: color.create_by,
      create_time: color.create_time,
      update_by: color.update_by,
      update_time: color.update_time,
    };
  }
  return dto;
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
  // 通过仓储获取已有版本号，生成新版本号
  const existingVersionNos = await versionRepo.getVersionNos(data.color_id);
  const versionNo = InkFormulaVersion.generateVersionNo(existingVersionNos);

  // 使用聚合根工厂方法创建草稿版本
  const version = InkFormulaVersion.createDraft(
    data.color_id,
    {
      versionNo,
      versionName: data.version_name ?? null,
      changeReason: data.change_reason ?? null,
      processNote: data.process_note ?? null,
      totalWeight: data.total_weight ?? null,
      unit: data.unit ?? 'kg',
      shelfLifeHours: data.shelf_life_hours ?? 168,
    },
    data.items.map(itemDTOToProps),
    operatorId
  );

  // 通过仓储持久化
  return versionRepo.save(version);
}

export async function duplicateVersion(
  sourceId: number,
  data: { version_name?: string; change_reason?: string; major_version?: boolean },
  operatorId: number
): Promise<number> {
  // 通过仓储获取源版本（含明细）
  const source = await versionRepo.findByIdWithItems(sourceId);
  if (!source) {
    throw new Error('源版本不存在');
  }

  // 使用聚合根工厂方法一键复用
  const newVersion = InkFormulaVersion.duplicateFrom(
    source,
    {
      versionName: data.version_name ?? null,
      changeReason: data.change_reason ?? null,
      majorVersion: data.major_version ?? false,
    },
    operatorId
  );

  // 通过仓储持久化
  const newId = await versionRepo.save(newVersion);

  secureLog('info', 'Formula version duplicated', {
    sourceId,
    newId,
    newVersionNo: newVersion.versionNo,
    operatorId,
  });

  return newId;
}

export async function activateVersion(id: number, operatorId: number): Promise<void> {
  // 通过仓储获取版本
  const agg = await versionRepo.findByIdWithItems(id);
  if (!agg) {
    throw new Error('版本不存在');
  }

  // 聚合根执行业务规则
  agg.activate(operatorId);

  await transaction(async (conn) => {
    // 将同色号下其他已生效版本置为已作废
    await versionRepo.archiveOtherActiveVersions(agg.colorId, id, operatorId);

    // 更新版本状态为已生效
    await conn.execute(
      `UPDATE dcprint_ink_formula_version
       SET status = 2, activate_by = ?, activate_time = NOW(), update_by = ?
       WHERE id = ?`,
      [operatorId, operatorId, id]
    );

    // 计算成本快照
    await calculateAndSnapshotCost(conn, id);

    const [costRows] = await conn.execute(
      'SELECT theoretical_cost FROM dcprint_ink_formula_version WHERE id = ?',
      [id]
    ) as [RowDataPacket[], any];
    await getDomainEventOutbox().saveEvents(conn, 'InkFormulaVersion', id, [
      new FormulaVersionActivatedEvent({
        versionId: id,
        colorId: agg.colorId,
        versionNo: agg.versionNo,
        activatedBy: operatorId,
        theoreticalCost: costRows[0]?.theoretical_cost ?? null,
      }),
    ]);
  });

  secureLog('info', 'Formula version activated', { id, operatorId });
}

export async function cancelVersion(id: number, operatorId: number, reason: string): Promise<void> {
  // 通过仓储获取版本
  const agg = await versionRepo.findById(id);
  if (!agg) {
    throw new Error('版本不存在');
  }

  // 聚合根执行业务规则
  agg.cancel(operatorId, reason);

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
        colorId: agg.colorId,
        versionNo: agg.versionNo,
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
  // 通过仓储获取版本
  const agg = await versionRepo.findByIdWithItems(id);
  if (!agg) {
    throw new Error('版本不存在');
  }

  // 聚合根执行业务规则（内部校验状态）
  agg.updateBaseInfo({
    versionName: data.version_name ?? null,
    changeReason: data.change_reason ?? null,
    processNote: data.process_note ?? null,
    totalWeight: data.total_weight ?? null,
    unit: data.unit,
    shelfLifeHours: data.shelf_life_hours,
  });

  if (data.items && Array.isArray(data.items)) {
    agg.updateItems(data.items.map(itemDTOToProps));
  }

  agg.toProps(); // 触发内部状态
  // 更新 updateBy
  (agg as InkFormulaVersion)['_updateBy'] = operatorId;

  await versionRepo.update(agg);
}

export async function deleteVersion(id: number): Promise<void> {
  // 通过仓储获取版本（检查状态）
  const agg = await versionRepo.findById(id);
  if (!agg) {
    throw new Error('版本不存在');
  }

  // 聚合根业务规则校验
  if (!agg.canDelete) {
    throw new Error('已生效版本不可删除，请先作废');
  }

  await versionRepo.softDelete(id);
}

// 独立更新草稿版本明细（对应 API：POST /version/:id/items）
export async function updateVersionItems(
  id: number,
  items: FormulaItem[],
  operatorId: number
): Promise<void> {
  // 通过仓储获取版本
  const agg = await versionRepo.findById(id);
  if (!agg) {
    throw new Error('版本不存在');
  }

  // 聚合根执行业务规则
  agg.updateItems(items.map(itemDTOToProps));

  // 更新 updateBy
  (agg as InkFormulaVersion)['_updateBy'] = operatorId;

  // 通过仓储更新明细
  const props = agg.toProps();
  const versionId = props.id!;
  await transaction(async (conn) => {
    await conn.execute('DELETE FROM dcprint_ink_formula_item WHERE version_id = ?', [versionId]);
    for (let i = 0; i < (props.items?.length ?? 0); i++) {
      const item = props.items![i];
      await conn.execute(
        `INSERT INTO dcprint_ink_formula_item
         (version_id, material_id, material_code, material_name, ink_type, brand, ratio, weight, unit, add_order, process_remark, sort, is_base)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    await conn.execute(
      'UPDATE dcprint_ink_formula_version SET update_by = ?, cost_calc_status = 0 WHERE id = ?',
      [operatorId, versionId]
    );
  });
}

// ===== 版本对比 =====

export async function compareVersions(leftId: number, rightId: number): Promise<CompareResult> {
  // 通过仓储获取两个版本
  const leftAgg = await versionRepo.findByIdWithItems(leftId);
  const rightAgg = await versionRepo.findByIdWithItems(rightId);

  if (!leftAgg || !rightAgg) {
    throw new Error('版本不存在');
  }

  // 使用领域服务计算差异
  const result = compareService.compare(leftAgg, rightAgg);

  // 转为 DTO 格式
  return {
    baseInfo: {
      left: {
        id: result.baseInfo.left.id,
        version_no: result.baseInfo.left.versionNo,
        version_name: result.baseInfo.left.versionName,
        change_reason: result.baseInfo.left.changeReason,
        process_note: result.baseInfo.left.processNote,
        total_weight: result.baseInfo.left.totalWeight,
        theoretical_cost: result.baseInfo.left.theoreticalCost,
      },
      right: {
        id: result.baseInfo.right.id,
        version_no: result.baseInfo.right.versionNo,
        version_name: result.baseInfo.right.versionName,
        change_reason: result.baseInfo.right.changeReason,
        process_note: result.baseInfo.right.processNote,
        total_weight: result.baseInfo.right.totalWeight,
        theoretical_cost: result.baseInfo.right.theoreticalCost,
      },
      diffFields: result.baseInfo.diffFields,
    },
    items: {
      added: result.items.added.map(itemVOToDTO),
      removed: result.items.removed.map(itemVOToDTO),
      modified: result.items.modified.map((m) => ({
        left: itemVOToDTO(m.left),
        right: itemVOToDTO(m.right),
        fields: m.fields,
      })),
      unchanged: result.items.unchanged.map(itemVOToDTO),
    },
    summary: result.summary,
  };
}

// ===== 成本计算 =====

/**
 * 计算配方理论成本并快照到版本表及明细表
 * 理论成本 = Σ (配比比例% × 原料单位成本)
 * 成本取值：优先 inv_material.weighted_avg_cost，降级 base_ink.unit_price
 */
async function calculateAndSnapshotCost(conn: any, versionId: number): Promise<void> {
  const items = await query(
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

  // 使用领域服务计算成本
  const itemVOs = items.map((item) => new FormulaItemVO(itemDTOToProps(item)));
  const result = await costService.calculate(itemVOs);

  return {
    totalCost: result.totalCost,
    itemCosts: result.itemCosts.map((c) => ({
      material_code: c.materialCode,
      material_name: c.materialName,
      ratio: c.ratio,
      unit_cost: c.unitCost,
      item_cost: c.itemCost,
    })),
    warnings: result.warnings,
  };
}

/**
 * 手动重算草稿版本成本（更新预览值）
 */
export async function recalculateCost(versionId: number): Promise<void> {
  // 通过仓储获取版本
  const agg = await versionRepo.findByIdWithItems(versionId);
  if (!agg) {
    throw new Error('版本不存在');
  }

  // 聚合根业务规则校验
  if (!agg.isDraft) {
    throw new Error('只有草稿版本可以重算成本');
  }

  await transaction(async (conn) => {
    await calculateAndSnapshotCost(conn, versionId);
  });
}
