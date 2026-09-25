import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

// 获取SGS认证统计信息（基于真实表 qms_sgs_cert）
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

    // status: 1=有效 2=过期 3=撤销
    const [validResult] = await query(
      `SELECT COUNT(*) as count FROM qms_sgs_cert WHERE deleted = 0 AND status = 1${dateFilter}`,
      params
    );
    const [expiredResult] = await query(
      `SELECT COUNT(*) as count FROM qms_sgs_cert WHERE deleted = 0 AND status = 2${dateFilter}`,
      params
    );
    const [revokedResult] = await query(
      `SELECT COUNT(*) as count FROM qms_sgs_cert WHERE deleted = 0 AND status = 3${dateFilter}`,
      params
    );
    const [passedResult] = await query(
      `SELECT COUNT(*) as count FROM qms_sgs_cert WHERE deleted = 0 AND test_result = '合格'${dateFilter}`,
      params
    );
    const [failedResult] = await query(
      `SELECT COUNT(*) as count FROM qms_sgs_cert WHERE deleted = 0 AND test_result = '不合格'${dateFilter}`,
      params
    );
    const [monthlyResult] = await query(
      `SELECT COUNT(*) as count FROM qms_sgs_cert
       WHERE deleted = 0 AND YEAR(create_time) = YEAR(CURDATE()) AND MONTH(create_time) = MONTH(CURDATE())`
    );

    return NextResponse.json({
      success: true,
      data: {
        valid: validResult?.count || 0,
        expired: expiredResult?.count || 0,
        revoked: revokedResult?.count || 0,
        passed: passedResult?.count || 0,
        failed: failedResult?.count || 0,
        monthlyCount: monthlyResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get SGS cert stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
