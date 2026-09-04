import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

// 创建打样订单管理相关表
export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  try {
    const results: string[] = [];

    // 检查表是否已存在
    const tables = await query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('sal_sample_order', 'sal_sample_order_history')
    `);

    const existingTables = (tables as DbRow[]).map((t) => t.TABLE_NAME);

    // 1. 创建打样订单主表
    if (!existingTables.includes('sal_sample_order')) {
      await query(ts('k_1wh52ri'));
      results.push(ts('k_1ke8yed'));
    } else {
      results.push(ts('k_vsiyca'));
    }

    // 2. 创建打样订单状态历史表
    if (!existingTables.includes('sal_sample_order_history')) {
      await query(ts('k_1u7c57c'));
      results.push(ts('k_1dapgva'));
    } else {
      results.push(ts('k_18yi0ld'));
    }

    // 3. 插入测试数据
    const testDataCount = await query(`
      SELECT COUNT(*) as count FROM sal_sample_order WHERE deleted = 0
    `);

    if ((testDataCount as DbRow[])[0].count === 0) {
      await query(ts('k_7wojh4'));
      results.push(ts('k_1qt161c'));
    } else {
      results.push(`✓ 测试数据已存在: ${(testDataCount as DbRow[])[0].count}条`);
    }

    return successResponse({
      message: ts('k_14ymjor'),
      details: results,
    });
  } catch (error) {
    return errorResponse(`创建表失败: ${(error as Error).message}`, 500, 500);
  }
});
