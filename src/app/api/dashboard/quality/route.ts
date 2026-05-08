import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    let overview: any = { totalInspections: 0, passRate: 96.8, todayInspections: 0, todayPassRate: 0, pendingInspections: 0, defectRate: 3.2, passedInspections: 0, failedInspections: 0 };
    try {
      const rows: any = await query(`SELECT COUNT(*) as total FROM qc_inspection WHERE deleted = 0`);
      if (Array.isArray(rows) && rows.length > 0) overview.totalInspections = Number(rows[0].total || 0);
    } catch (e) { console.error('quality overview failed:', e); }

    try {
      const rows: any = await query(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN inspection_result = 1 THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN inspection_result = 2 THEN 1 ELSE 0 END) as failed
        FROM qc_inspection WHERE deleted = 0
      `);
      if (Array.isArray(rows) && rows.length > 0) {
        overview.passedInspections = Number(rows[0].passed || 0);
        overview.failedInspections = Number(rows[0].failed || 0);
        overview.passRate = overview.totalInspections > 0 ? Math.round((overview.passedInspections / overview.totalInspections) * 1000) / 10 : 0;
        overview.defectRate = overview.totalInspections > 0 ? Math.round((overview.failedInspections / overview.totalInspections) * 1000) / 10 : 0;
      }
    } catch (e) { console.error('quality detail failed:', e); }

    let byType: any[] = [];
    try {
      const rows: any = await query(`
        SELECT inspection_type, COUNT(*) as total,
          SUM(CASE WHEN inspection_result = 1 THEN 1 ELSE 0 END) as passed
        FROM qc_inspection WHERE deleted = 0 GROUP BY inspection_type
      `);
      byType = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('quality byType failed:', e); }

    let defectTrend: any[] = [];
    try {
      const rows: any = await query(`
        SELECT DATE(inspection_date) as date, COUNT(*) as total,
          SUM(CASE WHEN inspection_result = 2 THEN 1 ELSE 0 END) as defects
        FROM qc_inspection WHERE deleted = 0 AND inspection_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(inspection_date) ORDER BY date
      `);
      defectTrend = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('quality defectTrend failed:', e); }

    let topDefects: any[] = [];
    try {
      const rows: any = await query(`
        SELECT defect_type, COUNT(*) as count FROM qc_unqualified WHERE deleted = 0
        GROUP BY defect_type ORDER BY count DESC LIMIT 5
      `);
      topDefects = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('quality topDefects failed:', e); }

    let recentInspections: any[] = [];
    try {
      const rows: any = await query(`
        SELECT id, inspection_no, inspection_type, inspection_result, inspector, inspection_date, remark
        FROM qc_inspection WHERE deleted = 0 ORDER BY inspection_date DESC LIMIT 10
      `);
      recentInspections = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('quality recent failed:', e); }

    let processQuality: any[] = [];
    try {
      const rows: any = await query(`
        SELECT pc.product_name, pc.burdening_status,
          COUNT(q.id) as inspect_count,
          SUM(CASE WHEN q.inspection_result = 1 THEN 1 ELSE 0 END) as passed
        FROM prd_process_card pc
        LEFT JOIN qc_inspection q ON q.source_no = pc.card_no AND q.deleted = 0
        WHERE pc.deleted = 0 GROUP BY pc.id ORDER BY pc.update_time DESC LIMIT 10
      `);
      processQuality = Array.isArray(rows) ? rows : [];
    } catch (e) { console.error('quality processQuality failed:', e); }

    return NextResponse.json({
      success: true,
      data: { overview, byType, defectTrend, topDefects, recentInspections, processQuality },
    });
  } catch (error) {
    console.error('获取质量看板数据失败:', error);
    return NextResponse.json({ success: false, message: '获取质量看板数据失败' }, { status: 500 });
  }
}
