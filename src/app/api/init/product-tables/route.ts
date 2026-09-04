import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

// 创建产品管理相关表
export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  try {
    const results: string[] = [];

    // 检查表是否已存在
    const tables = await query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('mdm_product', 'mdm_product_category', 'mdm_product_bom', 'mdm_product_route')
    `);

    const existingTables = (tables as DbRow[]).map((t) => t.TABLE_NAME);

    // 1. 创建产品主表
    if (!existingTables.includes('mdm_product')) {
      await query(ts('k_1j1hg1n'));
      results.push(ts('k_7iezu7'));
    } else {
      results.push(ts('k_19r6qfq'));
    }

    // 2. 创建产品分类表
    if (!existingTables.includes('mdm_product_category')) {
      await query(ts('k_q5xfzl'));
      results.push(ts('k_1onnoaw'));
    } else {
      results.push(ts('k_168vfhr'));
    }

    // 3. 创建产品BOM表
    if (!existingTables.includes('mdm_product_bom')) {
      await query(ts('k_putj42'));
      results.push(ts('k_13p7zsy'));
    } else {
      results.push(ts('k_a8ajcj'));
    }

    // 4. 创建产品工艺路线表
    if (!existingTables.includes('mdm_product_route')) {
      await query(ts('k_1kpajk2'));
      results.push(ts('k_4lfod9'));
    } else {
      results.push(ts('k_1blzmqg'));
    }

    // 插入产品分类测试数据
    const categoryCount = await query(
      'SELECT COUNT(*) as count FROM mdm_product_category WHERE deleted = 0'
    );
    if ((categoryCount as DbRow[])[0].count === 0) {
      await query(ts('k_1je5i5g'));
      results.push(ts('k_1u004ig'));
    } else {
      results.push(ts('k_7k7spz'));
    }

    // 插入产品测试数据
    const productCount = await query('SELECT COUNT(*) as count FROM mdm_product WHERE deleted = 0');
    if ((productCount as DbRow[])[0].count === 0) {
      await query(ts('k_1jtzpam'));
      results.push(ts('k_1j8ujx3'));
    } else {
      results.push(ts('k_104isma'));
    }

    return successResponse({
      message: ts('k_o1auz4'),
      details: results,
    });
  } catch (error) {
    return errorResponse(`创建表失败: ${(error as Error).message}`, 500, 500);
  }
});
