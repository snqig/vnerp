import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

// 辅助函数：检查列是否存在
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = ? 
     AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return (result as DbRow[]).length > 0;
}

// 辅助函数：安全地添加列
async function addColumnSafe(tableName: string, columnDef: string) {
  try {
    await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`);
  } catch (e) {
    if ((e as Error & { code?: string }).code === 'ER_DUP_FIELDNAME') {
      // 列已存在，忽略错误
      return;
    }
    throw e;
  }
}

export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  try {
    const results: string[] = [];

    // 检查并创建采购单主表
    const poTableExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order'`
    );

    if ((poTableExists as DbRow[]).length === 0) {
      await query(ts('k_6hiv9u'));
      results.push(ts('k_3kiwih'));
    } else {
      results.push(ts('k_1piy5f6'));
    }

    // 检查并创建采购单行表
    const poLineTableExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_purchase_order_line'`
    );

    if ((poLineTableExists as DbRow[]).length === 0) {
      await query(ts('k_k73gq2'));
      results.push(ts('k_1jdpm3k'));
    } else {
      results.push(ts('k_1n7c8v9'));
    }

    // 检查并创建库存事务表
    const transTableExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_inventory_transaction'`
    );

    if ((transTableExists as DbRow[]).length === 0) {
      await query(ts('k_tf3n8h'));
      results.push(ts('k_u1ou9o'));
    } else {
      results.push(ts('k_12ep7ed'));
    }

    // 检查并创建退货单表
    const rtvTableExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_return_order'`
    );

    if ((rtvTableExists as DbRow[]).length === 0) {
      await query(ts('k_v9tslq'));
      results.push(ts('k_1hprfi0'));
    } else {
      results.push(ts('k_ioekoj'));
    }

    // 检查并创建供应商表
    const supplierTableExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_supplier'`
    );

    if ((supplierTableExists as DbRow[]).length === 0) {
      await query(ts('k_1db21hy'));
      results.push(ts('k_1dff021'));
    } else {
      results.push(ts('k_ekjdze'));
    }

    // 修改现有入库单表，添加PO关联字段
    const inboundColumns = [
      { name: 'po_id', def: ts('k_fn6fku') },
      { name: 'po_no', def: ts('k_1i460cg') },
      {
        name: 'grn_type',
        def: ts('k_r279pw'),
      },
      { name: 'asn_no', def: ts('k_1gjl9f') },
      {
        name: 'delivery_no',
        def: ts('k_18dw24l'),
      },
      {
        name: 'qc_status',
        def: ts('k_jfkub5'),
      },
      { name: 'qc_remark', def: ts('k_1ih3l6r') },
      { name: 'post_time', def: ts('k_nitnjk') },
      { name: 'post_by', def: ts('k_o3l1hm') },
    ];

    let inboundUpdated = false;
    for (const col of inboundColumns) {
      if (!(await columnExists('inv_inbound_order', col.name))) {
        await addColumnSafe('inv_inbound_order', col.def);
        inboundUpdated = true;
      }
    }

    // 添加索引
    try {
      await query(`CREATE INDEX idx_po_id ON inv_inbound_order(po_id)`);
    } catch {
      /* 索引可能已存在 */
    }
    try {
      await query(`CREATE INDEX idx_po_no ON inv_inbound_order(po_no)`);
    } catch {
      /* 索引可能已存在 */
    }
    try {
      await query(`CREATE INDEX idx_grn_type ON inv_inbound_order(grn_type)`);
    } catch {
      /* 索引可能已存在 */
    }

    if (inboundUpdated) {
      results.push(ts('k_6cqmy8'));
    } else {
      results.push(ts('k_1lpj96o'));
    }

    // 修改现有入库明细表，添加PO关联字段
    const itemColumns = [
      { name: 'po_line_id', def: ts('k_1701sst') },
      { name: 'line_no', def: ts('k_10ry7kl') },
      { name: 'accepted_qty', def: ts('k_k1qaio') },
      { name: 'rejected_qty', def: ts('k_jza2r1') },
      {
        name: 'qc_result',
        def: ts('k_93qp94'),
      },
      {
        name: 'qc_inspector_id',
        def: ts('k_1lzt2vl'),
      },
      { name: 'qc_time', def: ts('k_gvga51') },
      {
        name: 'supplier_batch_no',
        def: ts('k_15eivmo'),
      },
      { name: 'warehouse_id', def: ts('k_qwvlta') },
      { name: 'location_id', def: ts('k_1yo0bmy') },
      {
        name: 'putaway_status',
        def: ts('k_18c73ac'),
      },
    ];

    let itemUpdated = false;
    for (const col of itemColumns) {
      if (!(await columnExists('inv_inbound_item', col.name))) {
        await addColumnSafe('inv_inbound_item', col.def);
        itemUpdated = true;
      }
    }

    if (itemUpdated) {
      results.push(ts('k_4at655'));
    } else {
      results.push(ts('k_1qpsuhj'));
    }

    // 插入测试数据
    const supplierCount = await query(
      `SELECT COUNT(*) as count FROM pur_supplier WHERE deleted = 0`
    );
    if ((supplierCount as DbRow[])[0].count === 0) {
      await query(ts('k_skvew0'));
      results.push(ts('k_ulu823'));
    }

    const poCount = await query(
      `SELECT COUNT(*) as count FROM pur_purchase_order WHERE deleted = 0`
    );
    if ((poCount as DbRow[])[0].count === 0) {
      // 创建测试采购单
      await query(ts('k_nrst9x'));

      // 创建采购单行
      await query(ts('k_uqz0gj'));

      await query(ts('k_aftwzy'));

      results.push(ts('k_bzo0yc'));
    }

    return successResponse({
      message: ts('k_fv0uqd'),
      details: results,
    });
  } catch (error) {
    return errorResponse(`初始化失败: ${(error as Error).message}`, 500, 500);
  }
});
