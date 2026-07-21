import { NextRequest, NextResponse } from 'next/server';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { StandardCardApplicationService } from '@/application/services/StandardCardApplicationService';

const service = new StandardCardApplicationService();

async function getHandler(request: NextRequest, _user: UserInfo) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const code = searchParams.get('code');
  const materialId = searchParams.get('materialId');
  const current = searchParams.get('current');

  if (id) {
    const card = await service.getById(parseInt(id));
    if (!card) {
      return NextResponse.json({ code: 404, message: '标准卡不存在' }, { status: 404 });
    }
    const details = await service.getDetailItems(parseInt(id));
    return NextResponse.json({
      code: 200,
      data: { ...card.toProps(), ...details },
    });
  }

  if (code) {
    const card = await service.getByCode(code);
    if (!card) {
      return NextResponse.json({ code: 404, message: '标准卡不存在' }, { status: 404 });
    }
    const details = await service.getDetailItems(card.id!);
    return NextResponse.json({
      code: 200,
      data: { ...card.toProps(), ...details },
    });
  }

  if (materialId && current === 'true') {
    const card = await service.getCurrentByMaterialId(parseInt(materialId));
    if (!card) {
      return NextResponse.json({ code: 200, data: null });
    }
    const details = await service.getDetailItems(card.id!);
    return NextResponse.json({
      code: 200,
      data: { ...card.toProps(), ...details },
    });
  }

  const filters = {
    code: searchParams.get('code') || undefined,
    name: searchParams.get('name') || undefined,
    type: searchParams.get('type') || undefined,
    status: searchParams.get('status') || undefined,
    materialId: searchParams.get('materialId')
      ? parseInt(searchParams.get('materialId')!)
      : undefined,
    customerId: searchParams.get('customerId')
      ? parseInt(searchParams.get('customerId')!)
      : undefined,
    isCurrent: searchParams.get('isCurrent') === 'true',
    isObsolete:
      searchParams.get('isObsolete') === 'true'
        ? true
        : searchParams.get('isObsolete') === 'false'
          ? false
          : undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
  };

  const result = await service.query(filters);
  return NextResponse.json({
    code: 200,
    data: {
      list: result.list.map((card) => card.toProps()),
      total: result.total,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  });
}

async function postHandler(request: NextRequest, user: UserInfo) {
  try {
    const body = await request.json();
    const dto = {
      ...body,
      userId: user.userId,
    };
    const card = await service.create(dto);
    return NextResponse.json({
      code: 200,
      message: '创建成功',
      data: card.toProps(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        code: 400,
        message: (error as Error).message || '创建失败',
      },
      { status: 400 }
    );
  }
}

async function putHandler(request: NextRequest, user: UserInfo) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ code: 400, message: '缺少标准卡ID' }, { status: 400 });
    }
    const dto = {
      ...body,
      userId: user.userId,
    };
    const card = await service.update(dto);
    return NextResponse.json({
      code: 200,
      message: '更新成功',
      data: card.toProps(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        code: 400,
        message: (error as Error).message || '更新失败',
      },
      { status: 400 }
    );
  }
}

async function deleteHandler(request: NextRequest, _user: UserInfo) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少标准卡ID' }, { status: 400 });
    }
    const ids = id
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (ids.length === 0) {
      return NextResponse.json({ code: 400, message: '标准卡ID无效' }, { status: 400 });
    }
    for (const one of ids) {
      await service.delete(one);
    }
    return NextResponse.json({
      code: 200,
      message: '删除成功',
    });
  } catch (error) {
    return NextResponse.json(
      {
        code: 400,
        message: (error as Error).message || '删除失败',
      },
      { status: 400 }
    );
  }
}

export const GET = withPermission(getHandler);
export const POST = withPermission(postHandler, { logTitle: '创建标准卡', logType: 'business' });
export const PUT = withPermission(putHandler, { logTitle: '更新标准卡', logType: 'business' });
export const DELETE = withPermission(deleteHandler, {
  logTitle: '删除标准卡',
  logType: 'business',
});
