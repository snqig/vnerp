import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (_request: NextRequest, _userInfo) => {
  try {
    const [totalResult, inStockResult, inUseResult, expiredResult] = await Promise.all([
      queryOne(`SELECT COUNT(*) as count FROM ink_mixed_record WHERE deleted = 0`),
      queryOne(`SELECT COUNT(*) as count FROM ink_mixed_record WHERE deleted = 0 AND status = 1`),
      queryOne(`SELECT COUNT(*) as count FROM ink_mixed_record WHERE deleted = 0 AND status = 2`),
      queryOne(`SELECT COUNT(*) as count FROM ink_mixed_record WHERE deleted = 0 AND status = 3`),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total: Number(totalResult?.count ?? 0),
        inStock: Number(inStockResult?.count ?? 0),
        inUse: Number(inUseResult?.count ?? 0),
        expired: Number(expiredResult?.count ?? 0),
      },
    });
  } catch (error) {
    console.error('Get ink-mixed stats error:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
});
