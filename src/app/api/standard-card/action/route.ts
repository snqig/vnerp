import { getTranslations } from 'next-intl/server';

;
import { NextRequest, NextResponse } from 'next/server';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { StandardCardApplicationService } from '@/application/services/StandardCardApplicationService';

const service = new StandardCardApplicationService();

async function postHandler(request: NextRequest, user: UserInfo) {
  const ts = await getTranslations('Common');
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();
    const { id, reason } = body;

    if (!id) {
      return NextResponse.json({ code: 400, message: ts('k_1ql7lmh') }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'submit':
        result = await service.submit(id, user.userId);
        return NextResponse.json({
          code: 200,
          message: ts('k_h0jked'),
          data: result.toProps(),
        });

      case 'approve':
        result = await service.approve(id, user.userId);
        return NextResponse.json({
          code: 200,
          message: ts('k_1wqkzrj'),
          data: result.toProps(),
        });

      case 'confirm':
        result = await service.confirm(id, user.userId);
        return NextResponse.json({
          code: 200,
          message: ts('k_1r5yo7f'),
          data: result.toProps(),
        });

      case 'obsolete':
        if (!reason) {
          return NextResponse.json({ code: 400, message: ts('k_1udzix1') }, { status: 400 });
        }
        result = await service.obsolete(id, reason, user.userId);
        return NextResponse.json({
          code: 200,
          message: ts('k_pmrfm9'),
          data: result.toProps(),
        });

      case 'newVersion':
        result = await service.createNewVersion(id, user.userId);
        return NextResponse.json({
          code: 200,
          message: ts('k_14ecuwh'),
          data: result.toProps(),
        });

      default:
        return NextResponse.json({ code: 400, message: ts('k_1ijm3m') }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        code: 400,
        message: (error as Error).message || ts('k_ydow7a'),
      },
      { status: 400 }
    );
  }
}

export const POST = withPermission(postHandler, { logTitle: '标准卡操作', logType: 'business' });
