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
      return;
    }
    throw e;
  }
}

export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  try {
    const results: string[] = [];

    // 1. 业务订单主表
    const bizOrderExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_order_header'`
    );

    if ((bizOrderExists as DbRow[]).length === 0) {
      await query(ts('k_1vsa825'));
      results.push(ts('k_u417bb'));
    } else {
      results.push(ts('k_xa5juk'));
    }

    // 2. 业务订单行表
    const bizOrderLineExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_order_line'`
    );

    if ((bizOrderLineExists as DbRow[]).length === 0) {
      await query(ts('k_f1az'));
      results.push(ts('k_1bxq2x8'));
    } else {
      results.push(ts('k_1nit3yr'));
    }

    // 3. 采购申请表
    const prExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request'`
    );

    if ((prExists as DbRow[]).length === 0) {
      await query(ts('k_1kb3llx'));
      results.push(ts('k_suarw2'));
    } else {
      results.push(ts('k_uahgiv'));
    }

    // 4. 采购申请行表
    const prLineExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pur_request_line'`
    );

    if ((prLineExists as DbRow[]).length === 0) {
      await query(ts('k_1d47dau'));
      results.push(ts('k_166bol'));
    } else {
      results.push(ts('k_g2yiqa'));
    }

    // 5. 修改采购订单行表
    const poLineColumns = [
      {
        name: 'source_order_id',
        def: ts('k_b1ebvg'),
      },
      {
        name: 'source_order_line_id',
        def: ts('k_1ozvtdz'),
      },
      {
        name: 'source_order_no',
        def: ts('k_110ikv3'),
      },
      { name: 'pr_id', def: ts('k_1xvsiz6') },
      {
        name: 'pr_line_id',
        def: ts('k_1svi04x'),
      },
      {
        name: 'is_strict_by_order',
        def: ts('k_13nks6i'),
      },
    ];

    let poLineUpdated = false;
    for (const col of poLineColumns) {
      if (!(await columnExists('pur_purchase_order_line', col.name))) {
        await addColumnSafe('pur_purchase_order_line', col.def);
        poLineUpdated = true;
      }
    }

    // 添加索引
    try {
      await query(
        `CREATE INDEX idx_source_order ON pur_purchase_order_line(source_order_id, source_order_line_id)`
      );
    } catch {
      /* 索引可能已存在 */
    }
    try {
      await query(`CREATE INDEX idx_pr ON pur_purchase_order_line(pr_id, pr_line_id)`);
    } catch {
      /* 索引可能已存在 */
    }

    if (poLineUpdated) {
      results.push(ts('k_122g6a1'));
    } else {
      results.push(ts('k_fjq4dd'));
    }

    // 6. 修改入库明细表
    const inboundItemColumns = [
      {
        name: 'source_order_id',
        def: ts('k_b1ebvg'),
      },
      {
        name: 'source_order_line_id',
        def: ts('k_1ozvtdz'),
      },
      { name: 'is_consumed', def: ts('k_333vf6') },
    ];

    let inboundItemUpdated = false;
    for (const col of inboundItemColumns) {
      if (!(await columnExists('inv_inbound_item', col.name))) {
        await addColumnSafe('inv_inbound_item', col.def);
        inboundItemUpdated = true;
      }
    }

    // 添加索引
    try {
      await query(
        `CREATE INDEX idx_source_order_item ON inv_inbound_item(source_order_id, source_order_line_id)`
      );
    } catch {
      /* 索引可能已存在 */
    }

    if (inboundItemUpdated) {
      results.push(ts('k_ad2f53'));
    } else {
      results.push(ts('k_1qpsuhj'));
    }

    // 7. 业务订单与PO关联表
    const linkExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'link_order_po'`
    );

    if ((linkExists as DbRow[]).length === 0) {
      await query(ts('k_bfmq01'));
      results.push(ts('k_fjti42'));
    } else {
      results.push(ts('k_idqi7n'));
    }

    // 8. 消耗记录表
    const consumptionExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biz_consumption'`
    );

    if ((consumptionExists as DbRow[]).length === 0) {
      await query(ts('k_1p8w1j3'));
      results.push(ts('k_1tgo152'));
    } else {
      results.push(ts('k_1hfapej'));
    }

    // 9. 容差配置表
    const toleranceExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_tolerance_config'`
    );

    if ((toleranceExists as DbRow[]).length === 0) {
      await query(ts('k_yvhuc9'));
      results.push(ts('k_azljuq'));
    } else {
      results.push(ts('k_136ktv5'));
    }

    // 10. 状态变更历史表
    const historyExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_status_history'`
    );

    if ((historyExists as DbRow[]).length === 0) {
      await query(ts('k_asz8vt'));
      results.push(ts('k_edeyx1'));
    } else {
      results.push(ts('k_h1miua'));
    }

    // 插入测试数据
    const orderCount = await query(
      `SELECT COUNT(*) as count FROM biz_order_header WHERE deleted = 0`
    );
    if ((orderCount as DbRow[])[0].count === 0) {
      await query(ts('k_h7yw64'));

      await query(ts('k_pk7ipa'));

      results.push(ts('k_kl3aqa'));
    }

    // 插入容差配置
    const toleranceCount = await query(
      `SELECT COUNT(*) as count FROM order_tolerance_config WHERE is_default = 1`
    );
    if ((toleranceCount as DbRow[])[0].count === 0) {
      await query(`
        INSERT INTO order_tolerance_config (order_type, over_delivery_tolerance, under_delivery_tolerance, price_tolerance, action_on_exceed, is_default)
        VALUES ('PURCHASE', 5.00, 5.00, 2.00, 'WARNING', 1)
      `);
      results.push(ts('k_hg9bdh'));
    }

    return successResponse({
      message: ts('k_1wsf29l'),
      details: results,
    });
  } catch (error) {
    return errorResponse(`初始化失败: ${(error as Error).message}`, 500, 500);
  }
});
