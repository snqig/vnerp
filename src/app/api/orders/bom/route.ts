import { NextRequest } from 'next/server';
import { query, transaction, queryPaginated } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

// BOM状态常量
const BOM_STATUS = {
  DRAFT: 10,
  AUDITED: 20,
  PUBLISHED: 30,
  DISABLED: 90,
} as const;

/**
 * 获取BOM列表
 * GET /api/orders/bom
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const keyword = searchParams.get('keyword') || '';
  const productCode = searchParams.get('productCode') || '';
  const status = searchParams.get('status') || '';
  const materialCode = searchParams.get('materialCode') || '';

  let whereClause = 'WHERE bh.deleted = 0';
  const params: any[] = [];

  if (keyword) {
    whereClause += ' AND (bh.bom_no LIKE ? OR bh.product_name LIKE ? OR bh.product_code LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (productCode) {
    whereClause += ' AND bh.product_code = ?';
    params.push(productCode);
  }

  if (status) {
    whereClause += ' AND bh.status = ?';
    params.push(parseInt(status));
  }

  // 如果按物料编码查询，需要关联BOM行表
  let joinClause = '';
  if (materialCode) {
    joinClause = 'INNER JOIN bom_line bl ON bh.id = bl.bom_id';
    whereClause += ' AND bl.material_code = ?';
    params.push(materialCode);
  }

  const result = await queryPaginated(
    `SELECT 
       bh.id, bh.bom_no, bh.product_id, bh.product_code, bh.product_name, bh.product_spec,
       bh.version, bh.is_default, bh.status, bh.unit, bh.base_qty,
       bh.total_material_count, bh.total_cost,
       bh.remark, bh.create_time, bh.update_time,
       CASE bh.status
         WHEN 10 THEN '草稿'
         WHEN 20 THEN '已审核'
         WHEN 30 THEN '已发布'
         WHEN 90 THEN '已停用'
       END as status_name
     FROM bom_header bh
     ${joinClause}
     ${whereClause}
     GROUP BY bh.id
     ORDER BY bh.create_time DESC`,
    params,
    page,
    pageSize
  );

  return paginatedResponse(result.data, result.pagination);
}, '获取BOM列表失败');

/**
 * 创建BOM
 * POST /api/orders/bom
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  const validation = validateRequestBody(body, [
    'product_id',
    'product_code',
    'product_name',
    'lines',
  ]);

  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const {
    product_id,
    product_code,
    product_name,
    product_spec,
    version = 'V1.0',
    base_qty = 1,
    unit = '件',
    remark,
    lines,
  } = body;

  if (!Array.isArray(lines) || lines.length === 0) {
    return errorResponse('BOM明细不能为空', 400, 400);
  }

  if (!product_code.trim() || !product_name.trim()) {
    return errorResponse('产品编码和产品名称不能为空', 400, 400);
  }

  const hasInvalidLine = lines.some((line: any) => !line.material_code || !line.material_name);
  if (hasInvalidLine) {
    return errorResponse('BOM明细中物料编码和名称不能为空', 400, 400);
  }

  return await transaction(async (connection) => {
    // 生成BOM编号
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    const bomNo = `BOM${dateStr}${randomStr}`;

    // 检查是否已存在默认版本
    const [existingDefault] = await connection.execute(
      `SELECT id FROM bom_header WHERE product_id = ? AND is_default = 1 AND deleted = 0`,
      [product_id]
    );

    const isDefault = (existingDefault as any[]).length === 0 ? 1 : 0;

    let totalCost = 0;
    let lineNo = 1;
    const processedLines = [];

    for (const line of lines) {
      const actual_qty = line.consumption_qty * (1 + (line.loss_rate || 0) / 100);
      const lineCost = actual_qty * (line.unit_cost || 0);
      totalCost += lineCost;

      processedLines.push({
        ...line,
        lineNo: lineNo++,
        actual_qty,
        total_cost: lineCost,
      });
    }

    const [headerResult] = await connection.execute(
      `INSERT INTO bom_header 
       (bom_no, product_id, product_code, product_name, product_spec, version, is_default,
        status, unit, base_qty, total_material_count, total_cost, remark, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        bomNo,
        product_id,
        product_code,
        product_name,
        product_spec || '',
        version,
        isDefault,
        BOM_STATUS.DRAFT,
        unit,
        base_qty,
        lines.length,
        totalCost,
        remark || '',
      ]
    );

    const bomId = (headerResult as any).insertId;

    for (const line of processedLines) {
      await connection.execute(
        `INSERT INTO bom_line 
         (bom_id, line_no, material_id, material_code, material_name, material_spec,
          unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost,
          material_type, is_key_material, position_no, process_seq, process_name, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          bomId,
          line.lineNo,
          line.material_id || 0,
          line.material_code,
          line.material_name,
          line.material_spec || '',
          line.unit || '件',
          line.consumption_qty,
          line.loss_rate || 0,
          line.actual_qty,
          line.unit_cost || 0,
          line.total_cost,
          line.material_type || 'RAW',
          line.is_key_material ? 1 : 0,
          line.position_no || '',
          line.process_seq || null,
          line.process_name || '',
          line.remark || '',
        ]
      );
    }

    // 记录版本历史
    await connection.execute(
      `INSERT INTO bom_version_history 
       (bom_id, version, change_type, change_content, change_reason, operate_time)
       VALUES (?, ?, 'CREATE', ?, '新建BOM', NOW())`,
      [bomId, version, `创建BOM，包含${lines.length}个物料`]
    );

    return successResponse({ bomId, bomNo }, 'BOM创建成功');
  });
}, '创建BOM失败');

/**
 * 更新BOM
 * PUT /api/orders/bom
 */
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, action, ...updateData } = body;

  if (!id) {
    return errorResponse('BOM ID不能为空', 400, 400);
  }

  return await transaction(async (connection) => {
    // 查询现有BOM
    const [bomRows] = await connection.execute(
      `SELECT * FROM bom_header WHERE id = ? AND deleted = 0`,
      [id]
    );

    if ((bomRows as any[]).length === 0) {
      throw new Error('BOM不存在');
    }

    const bom = (bomRows as any[])[0];

    // 状态流转处理
    if (action === 'audit') {
      await connection.execute(
        `UPDATE bom_header SET status = ?, audit_by = ?, audit_time = NOW(), update_time = NOW() WHERE id = ?`,
        [BOM_STATUS.AUDITED, updateData.audit_by || null, id]
      );

      await connection.execute(
        `INSERT INTO bom_version_history (bom_id, version, change_type, change_content, change_reason, operate_time)
         VALUES (?, ?, 'UPDATE', '审核通过', ?, NOW())`,
        [id, bom.version, updateData.reason || '审核通过']
      );

      return successResponse({ id }, 'BOM审核成功');
    }

    if (action === 'publish') {
      await connection.execute(
        `UPDATE bom_header SET is_default = 0 WHERE product_id = ? AND id != ?`,
        [bom.product_id, id]
      );

      await connection.execute(
        `UPDATE bom_header SET status = ?, is_default = 1, publish_time = NOW(), update_time = NOW() WHERE id = ?`,
        [BOM_STATUS.PUBLISHED, id]
      );

      await connection.execute(
        `INSERT INTO bom_version_history (bom_id, version, change_type, change_content, change_reason, operate_time)
         VALUES (?, ?, 'PUBLISH', '发布版本', ?, NOW())`,
        [id, bom.version, updateData.reason || '正式发布']
      );

      return successResponse({ id }, 'BOM发布成功');
    }

    if (action === 'disable') {
      await connection.execute(
        `UPDATE bom_header SET status = ?, update_time = NOW() WHERE id = ?`,
        [BOM_STATUS.DISABLED, id]
      );

      await connection.execute(
        `INSERT INTO bom_version_history (bom_id, version, change_type, change_content, change_reason, operate_time)
         VALUES (?, ?, 'DISABLE', '停用版本', ?, NOW())`,
        [id, bom.version, updateData.reason || '版本停用']
      );

      return successResponse({ id }, 'BOM停用成功');
    }

    // 普通更新
    if (bom.status >= BOM_STATUS.PUBLISHED) {
      throw new Error('已发布的BOM不能直接修改，请创建新版本');
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updateData.product_name) {
      updateFields.push('product_name = ?');
      updateValues.push(updateData.product_name);
    }
    if (updateData.product_spec !== undefined) {
      updateFields.push('product_spec = ?');
      updateValues.push(updateData.product_spec);
    }
    if (updateData.remark !== undefined) {
      updateFields.push('remark = ?');
      updateValues.push(updateData.remark);
    }

    if (updateFields.length > 0) {
      updateValues.push(id);
      await connection.execute(
        `UPDATE bom_header SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
        updateValues
      );
    }

    if (updateData.lines && Array.isArray(updateData.lines)) {
      await connection.execute(`DELETE FROM bom_line WHERE bom_id = ?`, [id]);

      let totalCost = 0;
      let lineNo = 1;

      for (const line of updateData.lines) {
        const actual_qty = line.consumption_qty * (1 + (line.loss_rate || 0) / 100);
        const lineCost = actual_qty * (line.unit_cost || 0);
        totalCost += lineCost;

        await connection.execute(
          `INSERT INTO bom_line 
           (bom_id, line_no, material_id, material_code, material_name, material_spec,
            unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost,
            material_type, is_key_material, position_no, process_seq, process_name, remark, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            id,
            lineNo++,
            line.material_id || 0,
            line.material_code,
            line.material_name,
            line.material_spec || '',
            line.unit || '件',
            line.consumption_qty,
            line.loss_rate || 0,
            actual_qty,
            line.unit_cost || 0,
            lineCost,
            line.material_type || 'RAW',
            line.is_key_material ? 1 : 0,
            line.position_no || '',
            line.process_seq || null,
            line.process_name || '',
            line.remark || '',
          ]
        );
      }

      await connection.execute(
        `UPDATE bom_header SET total_material_count = ?, total_cost = ?, update_time = NOW() WHERE id = ?`,
        [updateData.lines.length, totalCost, id]
      );
    }

    await connection.execute(
      `INSERT INTO bom_version_history (bom_id, version, change_type, change_content, change_reason, operate_time)
       VALUES (?, ?, 'UPDATE', ?, ?, NOW())`,
      [id, bom.version, '更新BOM信息', updateData.reason || '信息更新']
    );

    return successResponse({ id }, 'BOM更新成功');
  });
}, '更新BOM失败');

/**
 * 删除BOM
 * DELETE /api/orders/bom?id={id}
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('BOM ID不能为空', 400, 400);
  }

  const bom = await query(
    'SELECT status, version FROM bom_header WHERE id = ? AND deleted = 0',
    [id]
  );

  if ((bom as any[]).length === 0) {
    return errorResponse('BOM不存在', 404, 404);
  }

  const bomData = (bom as any[])[0];

  if (bomData.status >= BOM_STATUS.PUBLISHED) {
    return errorResponse('已发布的BOM不能删除，请停用它', 400, 400);
  }

  await transaction(async (connection) => {
    await connection.execute(
      'UPDATE bom_header SET deleted = 1, update_time = NOW() WHERE id = ?',
      [id]
    );

    await connection.execute(
      `INSERT INTO bom_version_history (bom_id, version, change_type, change_content, change_reason, operate_time)
       VALUES (?, ?, 'DELETE', '删除BOM', 'BOM删除', NOW())`,
      [id, bomData.version]
    );
  });

  return successResponse(null, 'BOM删除成功');
}, '删除BOM失败');
