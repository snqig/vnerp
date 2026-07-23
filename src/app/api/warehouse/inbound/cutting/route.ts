import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
// 生成单号
function generateRecordNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `CUT${dateStr}${random}`;
}

// 生成标签号
function generateLabelNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `LBL${dateStr}${random}`;
}

// GET - 获取分切记录列表 / 校验单个标签（?labelNo=xxx）
export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const labelNo = searchParams.get('labelNo');

    // 如果提供 labelNo，执行单标签校验
    if (labelNo) {
      const label = await queryOne<Loose>(
        `SELECT * FROM inv_material_label WHERE label_no = ? AND deleted = 0`,
        [labelNo]
      );

      if (!label) {
        return errorResponse('码不存在', 404, 404);
      }

      if (label.is_cut === 1) {
        return errorResponse('物料已分切', 400, 400);
      }

      if (label.is_used === 1) {
        return errorResponse('物料已使用', 400, 400);
      }

      if (label.label_type !== 1) {
        return errorResponse('非母材请在采购进货中作业', 400, 400);
      }

      const currentQty = parseFloat(label.quantity) || 0;
      if (currentQty <= 0) {
        return errorResponse('该标签库存量为零或负数，无法分切', 400, 400);
      }

      return successResponse({
        id: label.id,
        labelNo: label.label_no,
        materialName: label.material_name,
        materialCode: label.material_code,
        specification: label.specification,
        quantity: label.quantity,
        unit: label.unit,
        width: label.width,
        supplierName: label.supplier_name,
        batchNo: label.batch_no,
        purchaseOrderNo: label.purchase_order_no,
        labelType: label.label_type,
        isUsed: label.is_used,
        isCut: label.is_cut,
      });
    }

    // 否则返回分页分切记录列表
    const keyword = searchParams.get('keyword') || '';
    const sourceLabelNoQ = searchParams.get('sourceLabelNo') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let whereClause = '';
    const params: Loose[] = [];

    if (keyword) {
      whereClause += `WHERE (r.record_no LIKE ? OR r.source_label_no LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (sourceLabelNoQ) {
      if (whereClause) {
        whereClause += ` AND r.source_label_no = ?`;
      } else {
        whereClause += `WHERE r.source_label_no = ?`;
      }
      params.push(sourceLabelNoQ);
    }

    const result = await queryPaginated(
      `SELECT
      r.id,
      r.record_no as recordNo,
      r.source_label_id as sourceLabelId,
      r.source_label_no as sourceLabelNo,
      r.cut_width_str as cutWidthStr,
      r.original_width as originalWidth,
      r.cut_total_width as cutTotalWidth,
      r.remain_width as remainWidth,
      r.operator_id as operatorId,
      r.operator_name as operatorName,
      r.cut_time as cutTime,
      r.remark,
      r.status,
      r.create_time as createTime,
      l.material_code as materialCode,
      l.material_name as materialName,
      l.specification
    FROM inv_cutting_record r
    LEFT JOIN inv_material_label l ON r.source_label_id = l.id
    ${whereClause}
    ORDER BY r.cut_time DESC`,
      `SELECT COUNT(*) as total FROM inv_cutting_record r ${whereClause}`,
      params || [],
      { page, pageSize }
    );

    return successResponse(result);
  },
  { errorMessage: '操作失败' }
);

// POST - 执行分切操作
export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();

    const {
      sourceLabelId,
      sourceLabelNo,
      cutWidthStr,
      operatorId,
      operatorName,
      remark,
      materialCode,
      materialName,
      specification,
      quantity,
      unit,
      supplierName,
      batchNo,
      orderNo,
      originalWidth,
    } = body;

    if (!cutWidthStr) {
      return errorResponse('缺少必填字段: cutWidthStr', 400, 400);
    }
    const finalOperatorId = operatorId || '1';
    const finalOperatorName = operatorName || '系统管理员';

    let sourceLabel: Loose = null;

    if (sourceLabelId && !isNaN(Number(sourceLabelId))) {
      sourceLabel = await queryOne<Loose>(
        `SELECT * FROM inv_material_label WHERE id = ? AND deleted = 0`,
        [sourceLabelId]
      );
    }

    if (!sourceLabel) {
      const labelNoToFind = sourceLabelNo || `${orderNo}-1`;
      sourceLabel = await queryOne<Loose>(
        `SELECT * FROM inv_material_label WHERE label_no = ? AND deleted = 0`,
        [labelNoToFind]
      );
    }

    if (!sourceLabel) {
      return errorResponse('码不存在', 404, 404);
    }

    if (sourceLabel.is_cut === 1) {
      return errorResponse('物料已分切', 400, 400);
    }

    if (sourceLabel.is_used === 1) {
      return errorResponse('物料已使用', 400, 400);
    }

    // 仅 label_type=1（原材料/母材）允许分切
    if (sourceLabel.label_type !== 1) {
      return errorResponse('非母材请在采购进货中作业', 400, 400);
    }

    const currentQty = parseFloat(sourceLabel.quantity) || 0;
    if (currentQty <= 0) {
      return errorResponse('该标签库存量为零或负数，无法分切', 400, 400);
    }

    const cutWidths = cutWidthStr.split('+').map((w: string) => parseFloat(w.trim()));

    for (const width of cutWidths) {
      if (isNaN(width) || width <= 0) {
        return errorResponse(
          '分切宽幅格式不正确，请使用数字+数字的格式，如：300+400+300',
          400,
          400
        );
      }
    }

    const originalW =
      parseFloat(sourceLabel.width) ||
      originalWidth ||
      parseSpecWidth(sourceLabel.specification) ||
      0;
    const cutTotalWidth = cutWidths.reduce((sum: number, w: number) => sum + w, 0);
    const remainWidth = originalW - cutTotalWidth;

    if (cutTotalWidth > originalW) {
      return errorResponse(
        `分切后的宽幅总和【${cutTotalWidth}】不能大于原宽幅【${originalW}】`,
        400,
        400
      );
    }

    // 库存校验（按数量）：现有库存是否满足分切后剩余 >= 0
    if (currentQty < cutTotalWidth) {
      return errorResponse('库存不足，现有库存无法满足分切需求', 400, 400);
    }

    const recordNo = generateRecordNo();

    const result = await transaction(async (conn) => {
      const recordResult = await conn.execute(
        `INSERT INTO inv_cutting_record (
        record_no, source_label_id, source_label_no, cut_width_str,
        original_width, cut_total_width, remain_width,
        operator_id, operator_name, remark, status, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)`,
        [
          recordNo,
          sourceLabel.id,
          sourceLabel.label_no,
          cutWidthStr,
          originalW,
          cutTotalWidth,
          remainWidth,
          finalOperatorId,
          finalOperatorName,
          remark,
        ]
      );

      const recordId = (recordResult as Loose).insertId;

      await conn.execute(`UPDATE inv_material_label SET is_cut = 1, status = 'cut' WHERE id = ?`, [
        sourceLabel.id,
      ]);

      const newLabels = [];
      const originalSpec = sourceLabel.specification || '';

      for (let i = 0; i < cutWidths.length; i++) {
        const newLabelNo = generateLabelNo();
        const cutWidth = cutWidths[i];

        let newSpec = originalSpec;
        const specMatch = originalSpec.match(
          /^(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|m)?$/i
        );
        if (specMatch) {
          const origLength = specMatch[2];
          const unitStr = specMatch[3] || 'mm';
          newSpec = `${cutWidth}×${origLength}${unitStr}`;
        } else {
          newSpec = `${cutWidth}mm`;
        }

        const cutQty =
          originalW > 0
            ? Math.round(parseFloat(sourceLabel.quantity) * (cutWidth / originalW) * 100) / 100
            : parseFloat(sourceLabel.quantity);

        const qrCode = JSON.stringify({
          ID: newLabelNo,
          TYPE: '2',
          PARENT: sourceLabel.label_no,
        });

        const labelResult = await conn.execute(
          `INSERT INTO inv_material_label (
          label_no, qr_code, purchase_order_no, supplier_name, receive_date,
          material_code, material_name, specification, unit, batch_no,
          quantity, width, length_per_roll, remark,
          warehouse_id, location_id, is_main_material, is_used, is_cut,
          parent_label_id, label_type, status, deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 2, 'active', 0)`,
          [
            newLabelNo,
            qrCode,
            sourceLabel.purchase_order_no,
            sourceLabel.supplier_name,
            sourceLabel.receive_date,
            sourceLabel.material_code,
            sourceLabel.material_name,
            newSpec,
            sourceLabel.unit,
            sourceLabel.batch_no,
            cutQty,
            cutWidth,
            sourceLabel.length_per_roll,
            `分切${i + 1}: ${cutWidth}mm`,
            sourceLabel.warehouse_id,
            sourceLabel.location_id,
            sourceLabel.is_main_material,
            sourceLabel.id,
          ]
        );

        const newLabelId = (labelResult as Loose).insertId;

        await conn.execute(
          `INSERT INTO inv_cutting_detail (record_id, new_label_id, new_label_no, cut_width, sequence)
         VALUES (?, ?, ?, ?, ?)`,
          [recordId, newLabelId, newLabelNo, cutWidth, i + 1]
        );

        newLabels.push({
          id: newLabelId,
          labelNo: newLabelNo,
          cutWidth,
          newSpec,
          cutQty,
          sequence: i + 1,
        });
      }

      if (remainWidth > 0) {
        const remLabelNo = generateLabelNo();
        let remSpec = originalSpec;
        const specMatch = originalSpec.match(
          /^(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|m)?$/i
        );
        if (specMatch) {
          const origLength = specMatch[2];
          const unitStr = specMatch[3] || 'mm';
          remSpec = `${remainWidth}×${origLength}${unitStr}`;
        } else {
          remSpec = `${remainWidth}mm`;
        }
        const remQty =
          originalW > 0
            ? Math.round(parseFloat(sourceLabel.quantity) * (remainWidth / originalW) * 100) / 100
            : 0;

        const remQrCode = JSON.stringify({
          ID: remLabelNo,
          TYPE: '3',
          PARENT: sourceLabel.label_no,
        });

        const remLabelResult = await conn.execute(
          `INSERT INTO inv_material_label (
          label_no, qr_code, purchase_order_no, supplier_name, receive_date,
          material_code, material_name, specification, unit, batch_no,
          quantity, width, remaining_width, length_per_roll, remark,
          warehouse_id, location_id, is_main_material, is_used, is_cut,
          parent_label_id, label_type, status, deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 3, 'active', 0)`,
          [
            remLabelNo,
            remQrCode,
            sourceLabel.purchase_order_no,
            sourceLabel.supplier_name,
            sourceLabel.receive_date,
            sourceLabel.material_code,
            `余料${sourceLabel.material_name}`,
            remSpec,
            sourceLabel.unit,
            sourceLabel.batch_no,
            remQty,
            remainWidth,
            remainWidth,
            sourceLabel.length_per_roll,
            `余料: ${remainWidth}mm`,
            sourceLabel.warehouse_id,
            sourceLabel.location_id,
            sourceLabel.id,
          ]
        );

        const remLabelId = (remLabelResult as Loose).insertId;
        newLabels.push({
          id: remLabelId,
          labelNo: remLabelNo,
          cutWidth: remainWidth,
          newSpec: remSpec,
          cutQty: remQty,
          sequence: cutWidths.length + 1,
          isRemainder: true,
        });
      }

      return {
        recordId,
        recordNo,
        originalWidth: originalW,
        cutTotalWidth,
        remainWidth,
        newLabels,
      };
    });

    return successResponse(result, '分切操作成功');
  },
  { errorMessage: '分切操作失败' }
);

function parseSpecWidth(spec: string): number | null {
  if (!spec) return null;
  const match = spec.match(/^(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|m)?$/i);
  if (match) return parseFloat(match[1]);
  return null;
}

// 辅助函数：分页查询
async function queryPaginated(
  sql: string,
  countSql: string,
  params: Loose[],
  pagination: { page: number; pageSize: number }
) {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  try {
    const [data, countResult] = await Promise.all([
      query<Loose[]>(`${sql} LIMIT ? OFFSET ?`, [...(params || []), pageSize, offset]),
      queryOne<{ total: number }>(countSql, params || []),
    ]);

    return {
      list: data || [],
      pagination: {
        page,
        pageSize,
        total: countResult?.total || 0,
      },
    };
  } catch {
    return {
      list: [],
      pagination: {
        page,
        pageSize,
        total: 0,
      },
    };
  }
}
