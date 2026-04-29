import { query, execute, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';
import { PurBizStatus, PoStatus } from '@/lib/enum-status';

export interface ConvertResult {
  poId: number;
  poCode: string;
  lineCount: number;
  totalAmount: number;
}

export async function convertRequestToPurchaseOrder(requestId: number): Promise<ConvertResult> {
  return await transaction(async (conn) => {
    const [requestRows]: any = await conn.execute(
      `SELECT id, request_no, request_dept_id, requester_id, supplier_id, supplier_name, expected_date, status
       FROM pur_request WHERE id = ? AND deleted = 0`,
      [requestId]
    );

    if (!requestRows || requestRows.length === 0) {
      throw new Error('请购单不存在');
    }

    const request = requestRows[0];

    if (Number(request.status) !== PurBizStatus.APPROVED) {
      throw new Error(`请购单状态不是"已批准"，无法转采购。当前状态: ${request.status}`);
    }

    const [items]: any = await conn.execute(
      `SELECT id, line_no, material_id, material_code, material_name, material_spec, quantity, price, amount, unit
       FROM pur_request_item WHERE request_id = ? AND deleted = 0 ORDER BY line_no`,
      [requestId]
    );

    if (!items || items.length === 0) {
      throw new Error('请购单无物料明细');
    }

    const itemsWithoutMaterialId = items.filter((i: any) => !i.material_id);
    if (itemsWithoutMaterialId.length > 0) {
      throw new Error(`存在 ${itemsWithoutMaterialId.length} 条明细缺少物料ID，请先完善物料信息`);
    }

    const poCode = await generateDocumentNo('PO');
    const totalAmount = items.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);

    const [poResult]: any = await conn.execute(
      `INSERT INTO pur_order_std (po_code, request_id, supplier_id, supplier_name, order_date, delivery_date, total_amount, status, create_by)
       VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?)`,
      [
        poCode,
        requestId,
        request.supplier_id || 0,
        request.supplier_name || '',
        request.expected_date || null,
        totalAmount,
        PoStatus.DRAFT,
        request.requester_id || null,
      ]
    );

    const poId = poResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO pur_order_line_std (po_id, line_no, material_id, material_code, material_name, material_spec, order_qty, price, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          poId,
          item.line_no,
          item.material_id,
          item.material_code,
          item.material_name,
          item.material_spec || '',
          item.quantity,
          item.price || 0,
          item.amount || 0,
        ]
      );
    }

    await conn.execute(
      `UPDATE pur_request SET status = ? WHERE id = ?`,
      [PurBizStatus.CONVERT_PO, requestId]
    );

    return {
      poId,
      poCode,
      lineCount: items.length,
      totalAmount,
    };
  });
}

export async function batchConvertRequestToPurchaseOrder(requestIds: number[]): Promise<ConvertResult[]> {
  const results: ConvertResult[] = [];
  for (const id of requestIds) {
    try {
      const result = await convertRequestToPurchaseOrder(id);
      results.push(result);
    } catch (e: any) {
      console.error(`请购单 ${id} 转采购失败: ${e.message}`);
    }
  }
  return results;
}
