import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取供应商审核统计信息（基于真实表 qms_supplier_audit）
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Quality');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(create_time) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // status: 1=待审核 2=审核中 3=已完成
    const [pendingResult] = await query(
      `SELECT COUNT(*) as count FROM qms_supplier_audit WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );
    const [auditingResult] = await query(
      `SELECT COUNT(*) as count FROM qms_supplier_audit WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );
    const [completedResult] = await query(
      `SELECT COUNT(*) as count FROM qms_supplier_audit WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );
    // audit_result: 合格/不合格
    const [passedResult] = await query(
      `SELECT COUNT(*) as count FROM qms_supplier_audit WHERE deleted = 0 AND audit_result = '合格'${dateFilter}`,
      params
    );
    const [failedResult] = await query(
      `SELECT COUNT(*) as count FROM qms_supplier_audit WHERE deleted = 0 AND audit_result = '不合格'${dateFilter}`,
      params
    );
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM qms_supplier_audit
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingResult?.count || 0,
        auditing: auditingResult?.count || 0,
        completed: completedResult?.count || 0,
        passed: passedResult?.count || 0,
        failed: failedResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get supplier audit stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
