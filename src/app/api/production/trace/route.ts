import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const sn = searchParams.get('sn');
  const batchNo = searchParams.get('batchNo');
  const workorderNo = searchParams.get('workorderNo');

  if (!sn && !batchNo && !workorderNo) {
    return errorResponse('请提供至少一个查询参数: sn, batchNo, workorderNo', 400, 400);
  }

  let traceLinks: any[] = [];

  if (sn) {
    traceLinks = await buildTraceChain(sn);
  } else if (batchNo) {
    const rows: any = await query(
      'SELECT sn FROM prd_product_trace_link WHERE material_batch = ? AND deleted = 0',
      [batchNo]
    );
    if (rows.length > 0) {
      traceLinks = await buildTraceChain(rows[0].sn);
    }
  } else if (workorderNo) {
    const rows: any = await query(
      'SELECT sn FROM prd_product_trace_link WHERE workorder_no = ? AND deleted = 0',
      [workorderNo]
    );
    if (rows.length > 0) {
      traceLinks = await buildTraceChain(rows[0].sn);
    }
  }

  return successResponse({
    traceLinks,
    totalLinks: traceLinks.length,
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { sn, parent_sn, material_batch, workorder_id, workorder_no, material_id, material_code, material_name, supplier_id, supplier_name, inbound_date, inbound_no, inspection_id, inspection_result, trace_level, trace_type } = body;

  if (!sn) {
    return errorResponse('缺少必填字段: sn', 400, 400);
  }

  const result = await transaction(async (conn) => {
    const [existing]: any = await conn.execute(
      'SELECT id FROM prd_product_trace_link WHERE sn = ? AND material_batch = ? AND deleted = 0',
      [sn, material_batch || '']
    );

    if (existing.length > 0) {
      await conn.execute(
        `UPDATE prd_product_trace_link SET
          parent_sn = ?, workorder_id = ?, workorder_no = ?,
          material_id = ?, material_code = ?, material_name = ?,
          supplier_id = ?, supplier_name = ?,
          inbound_date = ?, inbound_no = ?,
          inspection_id = ?, inspection_result = ?,
          trace_level = ?, trace_type = ?
        WHERE id = ?`,
        [parent_sn || null, workorder_id || null, workorder_no || null,
         material_id || null, material_code || null, material_name || null,
         supplier_id || null, supplier_name || null,
         inbound_date || null, inbound_no || null,
         inspection_id || null, inspection_result || null,
         trace_level || 1, trace_type || 'product', existing[0].id]
      );
      return { id: existing[0].id, sn, updated: true };
    }

    const [insertResult]: any = await conn.execute(
      `INSERT INTO prd_product_trace_link (sn, parent_sn, material_batch, workorder_id, workorder_no, material_id, material_code, material_name, supplier_id, supplier_name, inbound_date, inbound_no, inspection_id, inspection_result, trace_level, trace_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sn, parent_sn || null, material_batch || null, workorder_id || null, workorder_no || null,
       material_id || null, material_code || null, material_name || null,
       supplier_id || null, supplier_name || null,
       inbound_date || null, inbound_no || null,
       inspection_id || null, inspection_result || null,
       trace_level || 1, trace_type || 'product']
    );

    return { id: insertResult.insertId, sn, updated: false };
  });

  return successResponse(result, '追溯链记录创建成功');
});

async function buildTraceChain(startSn: string): Promise<any[]> {
  const chain: any[] = [];
  const visited = new Set<string>();

  async function traverse(sn: string, level: number) {
    if (visited.has(sn)) return;
    visited.add(sn);

    const links: any = await query(
      'SELECT * FROM prd_product_trace_link WHERE sn = ? AND deleted = 0',
      [sn]
    );

    for (const link of links) {
      chain.push({
        level,
        sn: link.sn,
        parentSn: link.parent_sn,
        materialBatch: link.material_batch,
        workorderId: link.workorder_id,
        workorderNo: link.workorder_no,
        materialId: link.material_id,
        materialCode: link.material_code,
        materialName: link.material_name,
        supplierId: link.supplier_id,
        supplierName: link.supplier_name,
        inboundDate: link.inbound_date,
        inboundNo: link.inbound_no,
        inspectionId: link.inspection_id,
        inspectionResult: link.inspection_result,
        traceType: link.trace_type,
      });

      if (link.parent_sn) {
        await traverse(link.parent_sn, level + 1);
      }

      const childLinks: any = await query(
        'SELECT sn FROM prd_product_trace_link WHERE parent_sn = ? AND deleted = 0',
        [sn]
      );
      for (const child of childLinks) {
        await traverse(child.sn, level - 1);
      }
    }
  }

  await traverse(startSn, 0);
  return chain.sort((a, b) => a.level - b.level);
}
