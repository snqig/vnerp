import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  try {
    const results: string[] = [];

    // 建表时逐条容错：单条失败不影响其余步骤，并记录真实原因
    const safeExec = async (label: string, sql: string) => {
      try {
        await query(sql);
        results.push(`✅ ${label}`);
      } catch (e) {
        results.push(`⚠️ ${label} 跳过: ${(e as Error).message}`);
      }
    };

    // 1. BOM主表
    const bomHeaderExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bom_header'`
    );

    if ((bomHeaderExists as DbRow[]).length === 0) {
      await safeExec(ts('k_vyxf08'), ts('k_1p0t81o'));
    } else {
      results.push(ts('k_jx6gzs'));
    }

    // 2. BOM行表
    const bomLineExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bom_line'`
    );

    if ((bomLineExists as DbRow[]).length === 0) {
      await safeExec(ts('k_1ngkpb3'), ts('k_gj132e'));
    } else {
      results.push(ts('k_10wjfrj'));
    }

    // 3. BOM替代料表
    const bomAltExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bom_alternative'`
    );

    if ((bomAltExists as DbRow[]).length === 0) {
      await safeExec(ts('k_4uy20g'), ts('k_1ikst2h'));
    } else {
      results.push(ts('k_1qdlog0'));
    }

    // 4. BOM版本历史表
    const bomHistoryExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bom_version_history'`
    );

    if ((bomHistoryExists as DbRow[]).length === 0) {
      await safeExec(ts('k_8m4ltk'), ts('k_s5guoi'));
    } else {
      results.push(ts('k_1lry2q0'));
    }

    // 5. 物料基础信息表
    const materialExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bom_material'`
    );

    if ((materialExists as DbRow[]).length === 0) {
      await safeExec(ts('k_18aj8bc'), ts('k_1x8tuw6'));
    } else {
      results.push(ts('k_1a9g45k'));
    }

    // 6. 物料分类表
    const categoryExists = await query(
      `SELECT 1 FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bom_material_category'`
    );

    if ((categoryExists as DbRow[]).length === 0) {
      await safeExec(ts('k_vn4uup'), ts('k_uidc74'));
    } else {
      results.push(ts('k_1y6jm69'));
    }

    // 插入测试数据（表可能未建成，逐条容错）
    const countOf = async (table: string, extraWhere = ''): Promise<number> => {
      try {
        const rows = await query(`SELECT COUNT(*) as count FROM ${table} ${extraWhere}`);
        return Number((rows as DbRow[])[0]?.count ?? 0);
      } catch {
        return -1; // 表不存在时视为跳过
      }
    };

    if ((await countOf('bom_material_category')) === 0) {
      await safeExec(
        ts('k_t1ltil'),
        ts('k_181pcnp')
      );
    }

    if ((await countOf('bom_material', 'WHERE deleted = 0')) === 0) {
      await safeExec(
        ts('k_15n373e'),
        ts('k_14u4v5z')
      );
    }

    if ((await countOf('bom_header', 'WHERE deleted = 0')) === 0) {
      await safeExec(
        ts('k_1w1rtjy'),
        ts('k_wif843')
      );

      const bomLineSeeds: Array<[number, string, number, number, number, number, number, number, string, number]> = [
        [1, 'MAT001', 0.1, 5.0, 0.105, 5.25, 1, 1, 'RAW', 1],
        [2, 'MAT002', 0.05, 3.0, 0.0515, 1.29, 1, 1, 'RAW', 1],
        [3, 'PKG001', 1.0, 0.0, 1.0, 5.0, 1, 0, 'PKG', 0],
      ];

      for (const [
        lineNo,
        matCode,
        consumption,
        lossRate,
        actualQty,
        totalCost,
        _u,
        _k,
        matType,
        isKey,
      ] of bomLineSeeds) {
        await safeExec(
          `插入测试数据: BOM行 ${lineNo}`,
          `
          INSERT INTO bom_line (bom_id, line_no, material_id, material_code, material_name, material_spec, unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost, material_type, is_key_material)
          SELECT
            bh.id, ${lineNo}, bm.id, bm.material_code, bm.material_name, bm.material_spec, bm.unit,
            ${consumption}, ${lossRate}, ${actualQty}, bm.unit_cost, ${totalCost}, '${matType}', ${isKey}
          FROM bom_header bh, bom_material bm
          WHERE bh.bom_no = 'BOM20250101001' AND bm.material_code = '${matCode}'
        `
        );
      }

      await safeExec(
        ts('k_1uzjgqj'),
        `
        UPDATE bom_header
        SET total_material_count = 3,
            total_cost = (SELECT SUM(total_cost) FROM bom_line WHERE bom_id = bom_header.id)
        WHERE bom_no = 'BOM20250101001'
      `
      );
    }

    return successResponse({
      message: ts('k_xps504'),
      details: results,
    });
  } catch (error) {
    const e = error as any;
    return errorResponse(`初始化失败: ${e.message} | errno=${e.errno} sqlState=${e.sqlState} sqlMessage=${e.sqlMessage}`, 500, 500);
  }
});
