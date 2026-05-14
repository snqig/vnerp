import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';
import { StandardCardApplicationService } from '@/application/services/StandardCardApplicationService';

const service = new StandardCardApplicationService();

async function postHandler(request: NextRequest, user: UserInfo) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();
    const { id, reason } = body;

    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少标准卡ID' }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'submit':
        result = await service.submit(id, user.userId);
        return NextResponse.json({
          code: 200,
          message: '提交审核成功',
          data: result.toProps(),
        });

      case 'approve':
        result = await service.approve(id, user.userId);
        return NextResponse.json({
          code: 200,
          message: '审核通过',
          data: result.toProps(),
        });

      case 'confirm':
        result = await service.confirm(id, user.userId);
        return NextResponse.json({
          code: 200,
          message: '确认完成',
          data: result.toProps(),
        });

      case 'obsolete':
        if (!reason) {
          return NextResponse.json({ code: 400, message: '作废时必须填写原因' }, { status: 400 });
        }
        result = await service.obsolete(id, reason, user.userId);
        return NextResponse.json({
          code: 200,
          message: '作废成功',
          data: result.toProps(),
        });

      case 'newVersion':
        result = await service.createNewVersion(id, user.userId);
        return NextResponse.json({
          code: 200,
          message: '创建新版本成功',
          data: result.toProps(),
        });

      default:
        return NextResponse.json({ code: 400, message: '无效的操作' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        code: 400,
        message: error.message || '操作失败',
      },
      { status: 400 }
    );
  }
}

export const POST = withAuthAndErrorHandler(postHandler);
