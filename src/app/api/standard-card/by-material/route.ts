import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';
import { StandardCardApplicationService } from '@/application/services/StandardCardApplicationService';

const service = new StandardCardApplicationService();

async function getHandler(request: NextRequest, { user }: { user: UserInfo }) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const includeObsolete = searchParams.get('includeObsolete') === 'true';

    if (!materialId) {
      return NextResponse.json({ code: 400, message: '缺少物料ID' }, { status: 400 });
    }

    const cards = await service.getByMaterialId(parseInt(materialId), includeObsolete);
    return NextResponse.json({
      code: 200,
      data: cards.map(card => card.toProps())
    });
  } catch (error: any) {
    return NextResponse.json({
      code: 400,
      message: error.message || '查询失败'
    }, { status: 400 });
  }
}

export const GET = withAuthAndErrorHandler(getHandler);
