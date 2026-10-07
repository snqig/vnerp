import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, execute, transaction, queryPaginated, SqlValue } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { buildQualityFormMessages } from '@/lib/validators/quality-form';
import type { DbRow, DbResultSetHeader } from '@/types/db';
import { stringFilter } from '@/lib/query-filter';

/**
 * 解析「对应的采购入库单」（inv_inbound_order）：
 *  - 显式 inboundOrderId 优先，按 id 反查；
 *  - 否则按批次号经 qrcode_record 反查其 ref_no 对应的采购入库单。
 * 注意：qrcode_record.ref_no 为 utf8mb4_unicode_ci，而 inv_inbound_order.order_no 为
 *       utf8mb4_0900_ai_ci，JOIN 必须显式 COLLATE，否则报 ER_CANT_AGGREGATE_2COLLATIONS。
 * 返回 supplierId：入库单表头带 supplier_id，可直接反查写入检验单，补全「关联字段未使用」P1。
 */
async function resolveInboundOrder(
  batchNo?: SqlValue,
  explicitId?: SqlValue
): Promise<{ id: number; no: string; supplierId: number | null } | null> {
  const eid = Number(explicitId);
  if (Number.isFinite(eid) && eid > 0) {
    const rows = await query<{ id: number; order_no: string; supplier_id: number | null }>(
      'SELECT id, order_no, supplier_id FROM inv_inbound_order WHERE id = ? AND deleted = 0 LIMIT 1',
      [eid]
    );
    if (rows.length > 0)
      return { id: rows[0].id, no: rows[0].order_no, supplierId: rows[0].supplier_id ?? null };
  }
  if (batchNo) {
    const rows = await query<{ id: number; order_no: string; supplier_id: number | null }>(
      `SELECT o.id, o.order_no, o.supplier_id
       FROM inv_inbound_order o
       INNER JOIN qrcode_record q ON o.order_no = q.ref_no COLLATE utf8mb4_0900_ai_ci
       WHERE q.batch_no = ? AND q.qr_type = 'material' AND q.deleted = 0 AND o.deleted = 0
       ORDER BY o.id DESC LIMIT 1`,
      [batchNo]
    );
    if (rows.length > 0)
      return { id: rows[0].id, no: rows[0].order_no, supplierId: rows[0].supplier_id ?? null };
  }
  return null;
}

/**
 * 由物料编码派生 inv_material.id 写入检验单 material_id。
 * 说明：inv_inbound_order 表头无 material_id 列（物料在采购订单行表），而检验单始终携带
 *       material_code，且库内 material_code 唯一，故直接经 material_code 反查最可靠。
 * 查不到（编码缺失/不匹配）时返回 null，不臆造。
 */
async function resolveMaterialId(materialCode?: SqlValue): Promise<number | null> {
  const code = typeof materialCode === 'string' ? materialCode.trim() : '';
  if (!code) return null;
  const rows = await query<{ id: number }>(
    'SELECT id FROM inv_material WHERE material_code = ? LIMIT 1',
    [code]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * 由检验结果派生合格/不合格数量。
 *  - 明细表 qc_incoming_inspection_item 无数量列，故基础口径为「表头判定 × 检验总量 quantity」：
 *      pass/qualified      → 全部合格
 *      fail/unqualified    → 全部不合格
 *      partial             → 按明细 pass/fail 项占比拆分（无数量则按比例估算）
 *  - 不变量：qualified_qty + unqualified_qty = quantity，满足报告要求的「合格率」一致性。
 */
function splitQualifiedQty(
  result: string | undefined,
  quantity: SqlValue,
  items?: DbRow[]
): { qualified_qty: number; unqualified_qty: number } {
  const q = Number(quantity);
  const total = Number.isFinite(q) && q > 0 ? q : 0;
  const r = (result || '').toLowerCase();
  if (r === 'pass' || r === 'qualified') return { qualified_qty: total, unqualified_qty: 0 };
  if (r === 'fail' || r === 'unqualified') return { qualified_qty: 0, unqualified_qty: total };
  // partial：按明细项 pass/fail 占比拆分；无明细时保守按全部合格处理
  if (Array.isArray(items) && items.length > 0) {
    const pass = items.filter((it) => String(it.result ?? '').toLowerCase() === 'pass').length;
    const ratio = items.length ? pass / items.length : 1;
    const qualified = Math.round(total * ratio * 10000) / 10000;
    return { qualified_qty: qualified, unqualified_qty: Math.round((total - qualified) * 10000) / 10000 };
  }
  return { qualified_qty: total, unqualified_qty: 0 };
}

/**
 * 归一化检验结果到库内权威值域 pending/pass/fail。
 * 实测三套词汇并存（2026-09-24）：前端表单/筛选发 pass/reject/pending；库内存量 pass/fail/pending；
 * 旧分支比较 qualified/unqualified + 中文标签（"合格"/"不合格"）。POST/PUT 的存储与分支判定
 * 统一经此归一，保证库存联动分支（批次冻结/放行、入库单 inspection_status）真正可达。
 */
function normalizeInspectionResult(raw: unknown): 'pending' | 'pass' | 'fail' {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'pass' || v === 'qualified' || v === '合格') return 'pass';
  if (v === 'fail' || v === 'reject' || v === 'unqualified' || v === '不合格') return 'fail';
  return 'pending';
}

// 获取进料检验列表
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = stringFilter(searchParams.get('status'));
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 基础查询SQL
  let sql = `
    SELECT
      i.id,
      -- ④ 命名统一：SQL 别名 snake_case（与库内列名一致）。消费端
      -- src/app/[locale]/quality/incoming/page.tsx 的 mapApiToInternal 已对下列键做「snake ?? camel」双读。
      i.inspection_no as inspection_no,
      i.inspection_date as inspection_date,
      i.supplier_name as supplier_name,
      i.material_code as material_code,
      i.material_name as material_name,
      -- 暴露已建未使用字段（报告合法 P1）：精确筛选 + 合格率统计
      i.supplier_id as supplier_id,
      i.material_id as material_id,
      i.qualified_qty as qualified_qty,
      i.unqualified_qty as unqualified_qty,
      i.specification,
      i.batch_no as batch_no,
      i.quantity,
      i.unit,
      i.inspection_type as inspection_type,
      i.inspection_result as inspection_result,
      i.inspector_name as inspector_name,
      i.remark,
      i.inbound_order_id as inbound_order_id,
      i.inbound_no as inbound_no,
      i.create_time as create_time
    FROM qc_incoming_inspection i
    WHERE i.deleted = 0
  `;

  let countSql = `SELECT COUNT(*) as total FROM qc_incoming_inspection i WHERE i.deleted = 0`;
  const params: SqlValue[] = [];

  if (keyword) {
    const keywordCondition = ` AND (i.inspection_no LIKE ? OR i.supplier_name LIKE ? OR i.material_name LIKE ? OR i.batch_no LIKE ?)`;
    sql += keywordCondition;
    countSql += keywordCondition;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    sql += ` AND i.inspection_result = ?`;
    countSql += ` AND i.inspection_result = ?`;
    params.push(status);
  }

  if (startDate) {
    sql += ` AND i.inspection_date >= ?`;
    countSql += ` AND i.inspection_date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND i.inspection_date <= ?`;
    countSql += ` AND i.inspection_date <= ?`;
    params.push(endDate);
  }

  sql += ` ORDER BY i.create_time DESC`;

  // 使用分页查询工具
  const result = await queryPaginated(sql, countSql, params, { page, pageSize });

  // 获取每个检验单的明细
  if (result.data.length > 0) {
    const inspectionIds = result.data.map((i: DbRow) => i.id);
    const placeholders = inspectionIds.map(() => '?').join(',');

    const items = await query(
      `SELECT
        id,
        inspection_id as inspection_id,
        item_name as item_name,
        standard,
        actual_value as actual_value,
        result,
        remark as item_remark
      FROM qc_incoming_inspection_item
      WHERE inspection_id IN (${placeholders}) AND deleted = 0`,
      inspectionIds
    );

    // 将明细分组到对应的检验单
    const itemsMap = new Map();
    for (const item of items as DbRow[]) {
      if (!itemsMap.has(item.inspection_id)) {
        itemsMap.set(item.inspection_id, []);
      }
      itemsMap.get(item.inspection_id).push(item);
    }

    for (const inspection of result.data as DbRow[]) {
      inspection.items = itemsMap.get(inspection.id) || [];
    }
  }

  return paginatedResponse(result.data, result.pagination);
});

// 创建进料检验单
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();

    // 验证必填字段
    const validation = validateRequestBody(body, [
      'inspectionDate',
      'supplierName',
      'materialCode',
      'materialName',
      'specification',
      'batchNo',
      'quantity',
      'unit',
      'inspectionType',
      'inspectionResult',
      'inspectorName',
    ]);

    if (!validation.valid) {
      return errorResponse(ts('missingRequiredFieldsDetail', { fields: validation.missing.join(', ') }), 400, 400);
    }

    // 数量必须为正数（防字符串/0/负数入库）
    const qtyNum = Number(body.quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      return errorResponse(
        buildQualityFormMessages((k) => ts(k)).qtyMustBePositive,
        400,
        400
      );
    }

    const {
      inspectionDate,
      supplierName,
      materialCode,
      materialName,
      specification,
      batchNo,
      quantity,
      unit,
      inspectionType,
      inspectorName,
      remark,
      inboundOrderId,
      items,
    } = body;

    // 归一化检验结果（前端可能发 pass/reject/qualified/中文标签 → 库内权威值域 pending/pass/fail）
    const inspectionResult = normalizeInspectionResult(body.inspectionResult);

    // 使用事务确保数据一致性
    const result = await transaction(async (connection) => {
      // 生成检验单号（本地日期拼接；勿用 toISOString——UTC 日期在 +08:00 早 8 点前会落到前一天）
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const [maxInspection] = await connection.query(
        `SELECT MAX(inspection_no) as max_no FROM qc_incoming_inspection WHERE inspection_no LIKE ?`,
        [`IQC${dateStr}%`]
      );
      const maxNo = (maxInspection as DbRow[])[0]?.max_no;
      const seq = maxNo ? String(parseInt(String(maxNo).slice(-3)) + 1).padStart(3, '0') : '001';
      const inspectionNo = `IQC${dateStr}${seq}`;

      // 关联「对应的采购入库单」：显式 inboundOrderId 优先，否则按批次号反查
      const inboundOrder = await resolveInboundOrder(batchNo, inboundOrderId);
      // 派生 supplier_id（来自入库单表头）/ material_id（来自物料编码 → inv_material）
      const materialId = await resolveMaterialId(materialCode);

      // 插入检验单主表
      const [insertResult] = (await connection.execute(
        `INSERT INTO qc_incoming_inspection (
        inspection_no, inspection_date, supplier_name,
        material_code, material_name, specification,
        batch_no, quantity, unit, inspection_type,
        inspection_result, inspector_name, remark,
        inbound_order_id, inbound_no,
        supplier_id, material_id, qualified_qty, unqualified_qty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inspectionNo,
          inspectionDate,
          supplierName,
          materialCode,
          materialName,
          specification,
          batchNo,
          quantity,
          unit,
          inspectionType,
          inspectionResult,
          inspectorName,
          remark,
          inboundOrder?.id ?? null,
          inboundOrder?.no ?? null,
          inboundOrder?.supplierId ?? null,
          materialId ?? null,
          0,
          0,
        ]
      )) as [unknown[], unknown];

      const inspectionId = (insertResult as unknown as DbResultSetHeader).insertId;

      // 批量插入检验单明细
      if (items && items.length > 0) {
        const itemValues = items.map((item: DbRow) => [
          inspectionId,
          inspectionNo,
          item.itemName,
          item.standard,
          item.actualValue,
          item.result,
          item.itemRemark,
        ]);

        await connection.query(
          `INSERT INTO qc_incoming_inspection_item (
          inspection_id, inspection_no, item_name,
          standard, actual_value, result, remark
        ) VALUES ?`,
          [itemValues]
        );
      }

      // 派生合格/不合格数量（partial 按明细 pass/fail 占比拆分），写入主表
      const qtySplit = splitQualifiedQty(inspectionResult, quantity, items);
      await connection.execute(
        `UPDATE qc_incoming_inspection SET qualified_qty = ?, unqualified_qty = ? WHERE id = ?`,
        [qtySplit.qualified_qty, qtySplit.unqualified_qty, inspectionId]
      );

      // 库存联动与检验单【同事务】：批次放行/冻结 + 入库单 inspection_status 与本检验单同生共死。
      // 任一联动 UPDATE 抛错即整体回滚，杜绝「检验单已 pass 但批次未放行/未冻结、inspection_id 未落库」。
      // 注意：inspection_status 只能写 1（合格）/2（不合格），严禁写 3——3 是入库单 approve()
      // 的专属语义（approve() 通过时自置 3 + finance_posted），质检写 3 会僭越审核语义。
      if (inspectionResult === 'pass') {
        await connection.execute(
          `UPDATE inv_inventory_batch SET alert_level = 'normal', status = 1, inspection_id = ? WHERE batch_no = ? AND deleted = 0`,
          [inspectionId, batchNo]
        );
        await connection.execute(
          `UPDATE inv_inbound_order o INNER JOIN qrcode_record q ON o.order_no = q.ref_no COLLATE utf8mb4_0900_ai_ci SET o.inspection_status = 1, o.inspection_id = ? WHERE q.batch_no = ? AND q.qr_type = 'material' AND q.deleted = 0 AND o.deleted = 0`,
          [inspectionId, batchNo]
        );
      } else if (inspectionResult === 'fail') {
        await connection.execute(
          `UPDATE inv_inventory_batch SET alert_level = 'frozen', status = 0, inspection_id = ? WHERE batch_no = ? AND deleted = 0`,
          [inspectionId, batchNo]
        );
        await connection.execute(
          `UPDATE inv_inbound_order o INNER JOIN qrcode_record q ON o.order_no = q.ref_no COLLATE utf8mb4_0900_ai_ci SET o.inspection_status = 2, o.inspection_id = ? WHERE q.batch_no = ? AND q.qr_type = 'material' AND q.deleted = 0 AND o.deleted = 0`,
          [inspectionId, batchNo]
        );
      }

      return { id: inspectionId, inspectionNo, inspectionResult };
    });

    return successResponse(result, ts('k_e70dsk'));
  },
  { logTitle: '创建进料检验单', logType: 'business' }
);

// 更新进料检验单
export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return commonErrors.badRequest(ts('k_sldnwj'));
    }

    // 归一化检验结果（同 POST；后续 UPDATE 存储、库存联动分支、合格数量派生共用归一值）
    updateData.inspectionResult = normalizeInspectionResult(updateData.inspectionResult);

    // 检查检验单是否存在
    const [inspection] = await query<{ id: number }>(
      'SELECT id FROM qc_incoming_inspection WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!inspection) {
      return commonErrors.notFound(ts('k_np4sir'));
    }

    const inboundOrder = await resolveInboundOrder(updateData.batchNo, updateData.inboundOrderId);
    // 派生 supplier_id（来自入库单表头）/ material_id（来自物料编码 → inv_material）
    const materialId = await resolveMaterialId(updateData.materialCode);

    await execute(
      `UPDATE qc_incoming_inspection SET
      inspection_date = ?,
      supplier_name = ?,
      material_code = ?,
      material_name = ?,
      specification = ?,
      batch_no = ?,
      quantity = ?,
      unit = ?,
      inspection_type = ?,
      inspection_result = ?,
      inspector_name = ?,
      remark = ?,
      inbound_order_id = ?,
      inbound_no = ?,
      supplier_id = ?,
      material_id = ?
    WHERE id = ?`,
      [
        updateData.inspectionDate,
        updateData.supplierName,
        updateData.materialCode,
        updateData.materialName,
        updateData.specification,
        updateData.batchNo,
        updateData.quantity,
        updateData.unit,
        updateData.inspectionType,
        updateData.inspectionResult,
        updateData.inspectorName,
        updateData.remark,
        inboundOrder?.id ?? null,
        inboundOrder?.no ?? null,
        inboundOrder?.supplierId ?? null,
        materialId ?? null,
        id,
      ]
    );

    if (updateData.inspectionResult === 'pass') {
      await transaction(async (conn) => {
        await conn.execute(
          `UPDATE inv_inventory_batch SET alert_level = 'normal', status = 1, inspection_id = ? WHERE batch_no = ? AND deleted = 0`,
          [id, updateData.batchNo]
        );
        await conn.execute(
          `UPDATE inv_inbound_order o INNER JOIN qrcode_record q ON o.order_no = q.ref_no COLLATE utf8mb4_0900_ai_ci SET o.inspection_status = 1, o.inspection_id = ? WHERE q.batch_no = ? AND q.qr_type = 'material' AND q.deleted = 0 AND o.deleted = 0`,
          [id, updateData.batchNo]
        );
      });
    } else if (updateData.inspectionResult === 'fail') {
      await transaction(async (conn) => {
        await conn.execute(
          `UPDATE inv_inventory_batch SET alert_level = 'frozen', status = 0, inspection_id = ? WHERE batch_no = ? AND deleted = 0`,
          [id, updateData.batchNo]
        );
        await conn.execute(
          `UPDATE inv_inbound_order o INNER JOIN qrcode_record q ON o.order_no = q.ref_no COLLATE utf8mb4_0900_ai_ci SET o.inspection_status = 2, o.inspection_id = ? WHERE q.batch_no = ? AND q.qr_type = 'material' AND q.deleted = 0 AND o.deleted = 0`,
          [id, updateData.batchNo]
        );
      });
    }

    // 更新检验单明细
    if (updateData.items && updateData.items.length > 0) {
      // 先删除原有的明细
      await execute('UPDATE qc_incoming_inspection_item SET deleted = 1 WHERE inspection_id = ?', [
        id,
      ]);

      // 插入新的明细
      const itemValues = updateData.items.map((item: DbRow) => [
        id,
        updateData.inspectionNo,
        item.itemName,
        item.standard,
        item.actualValue,
        item.result,
        item.itemRemark,
      ]);

      await execute(
        `INSERT INTO qc_incoming_inspection_item (
        inspection_id, inspection_no, item_name,
        standard, actual_value, result, remark
      ) VALUES ?`,
        [itemValues]
      );
    }

    // 重新派生合格/不合格数量（明细可能已变更，按最新明细判定）
    const qtySplit = splitQualifiedQty(updateData.inspectionResult, updateData.quantity, updateData.items);
    await execute(
      `UPDATE qc_incoming_inspection SET qualified_qty = ?, unqualified_qty = ? WHERE id = ?`,
      [qtySplit.qualified_qty, qtySplit.unqualified_qty, id]
    );

    return successResponse(null, ts('k_1g9pneh'));
  },
  { logTitle: '更新进料检验单', logType: 'business' }
);

// 删除进料检验单（软删除）
export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest(ts('k_sldnwj'));
    }

    // 检查检验单是否存在
    const [inspection] = await query<{ id: number }>(
      'SELECT id FROM qc_incoming_inspection WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!inspection) {
      return commonErrors.notFound(ts('k_np4sir'));
    }

    // 使用事务同时更新主表和明细表
    await transaction(async (connection) => {
      await connection.execute('UPDATE qc_incoming_inspection SET deleted = 1 WHERE id = ?', [id]);
      await connection.execute(
        'UPDATE qc_incoming_inspection_item SET deleted = 1 WHERE inspection_id = ?',
        [id]
      );
    });

    return successResponse(null, ts('k_7wb8oh'));
  },
  { logTitle: '删除进料检验单', logType: 'business' }
);
