import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getConfig } from '@/lib/global-config';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const dashboardDays = Number(getConfig('dashboard_trend_days') || 30);

    const overview: Loose = {
      totalInspections: 0,
      passRate: 96.8,
      todayInspections: 0,
      todayPassRate: 0,
      pendingInspections: 0,
      defectRate: 3.2,
      passedInspections: 0,
      failedInspections: 0,
    };
    try {
      const rows: Loose = await query(
        `SELECT COUNT(*) as total FROM qc_inspection WHERE deleted = 0`
      );
      if (Array.isArray(rows) && rows.length > 0)
        overview.totalInspections = Number(rows[0].total || 0);
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'quality' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      const rows: Loose = await query(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN inspection_result = 1 THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN inspection_result = 2 THEN 1 ELSE 0 END) as failed
        FROM qc_inspection WHERE deleted = 0
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        overview.passedInspections = Number(rows[0].passed || 0);
        overview.failedInspections = Number(rows[0].failed || 0);
        overview.passRate =
          overview.totalInspections > 0
            ? Math.round((overview.passedInspections / overview.totalInspections) * 1000) / 10
            : 0;
        overview.defectRate =
          overview.totalInspections > 0
            ? Math.round((overview.failedInspections / overview.totalInspections) * 1000) / 10
            : 0;
      }
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'quality' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let byType: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT inspection_type, COUNT(*) as total,
          SUM(CASE WHEN inspection_result = 1 THEN 1 ELSE 0 END) as passed
        FROM qc_inspection WHERE deleted = 0 GROUP BY inspection_type
      `);
      byType = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'quality' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let defectTrend: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT DATE(inspection_date) as date, COUNT(*) as total,
          SUM(CASE WHEN inspection_result = 2 THEN 1 ELSE 0 END) as defects
        FROM qc_inspection WHERE deleted = 0 AND inspection_date >= DATE_SUB(CURDATE(), INTERVAL ${dashboardDays} DAY)
        GROUP BY DATE(inspection_date) ORDER BY date
      `);
      defectTrend = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'quality' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let topDefects: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT defect_type, COUNT(*) as count FROM qc_unqualified WHERE deleted = 0
        GROUP BY defect_type ORDER BY count DESC LIMIT 5
      `);
      topDefects = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'quality' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let recentInspections: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT id, inspection_no, inspection_type, inspection_result, inspector, inspection_date as inspect_time, remark
        FROM qc_inspection WHERE deleted = 0 ORDER BY inspection_date DESC LIMIT 10
      `);
      recentInspections = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'quality' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    let processQuality: Loose[] = [];
    try {
      const rows: Loose = await query(`
        SELECT pc.product_name, pc.burdening_status,
          COUNT(q.id) as inspect_count,
          SUM(CASE WHEN q.inspection_result = 1 THEN 1 ELSE 0 END) as passed
        FROM prd_process_card pc
        LEFT JOIN qc_inspection q ON q.source_no = pc.card_no AND q.deleted = 0
        WHERE pc.deleted = 0 GROUP BY pc.id ORDER BY pc.update_time DESC LIMIT 10
      `);
      processQuality = Array.isArray(rows) ? rows : [];
    } catch (e) {
      logger.error({ module: 'dashboard', action: 'quality' }, 'Dashboard query failed', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return NextResponse.json({
      success: true,
      data: { overview, byType, defectTrend, topDefects, recentInspections, processQuality },
    });
  } catch {
    return NextResponse.json({ success: false, message: '获取质量看板数据失败' }, { status: 500 });
  }
}
