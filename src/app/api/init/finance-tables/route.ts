import { getTranslations } from 'next-intl/server';

;
import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const results: string[] = [];

  try {
    await execute(ts('k_qbadr9'));
    results.push('fin_receivable');

    await execute(ts('k_nec8ex'));
    results.push('finance_receipt');

    return NextResponse.json({
      success: true,
      message: ts('k_1joy7h4'),
      tables: results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        tables: results,
      },
      { status: 500 }
    );
  }
});
