import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';
import { MaterialLifecycleService } from '@/application/services/MaterialLifecycleService';

const service = new MaterialLifecycleService();

async function getHandler(request: NextRequest, user: UserInfo) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'stats':
        const stats = await service.getStats();
        return NextResponse.json({ code: 200, data: stats });

      case 'expiry':
        const daysAhead = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30;
        const warnings = await service.getExpiryWarnings(daysAhead);
        return NextResponse.json({ code: 200, data: warnings });

      case 'stock':
        const analysis = await service.getStockAnalysis();
        return NextResponse.json({ code: 200, data: analysis });

      case 'batches':
        const materialId = searchParams.get('materialId');
        if (!materialId) {
          return NextResponse.json({ code: 400, message: '缺少物料ID' }, { status: 400 });
        }
        const batches = await service.getBatchList(parseInt(materialId));
        return NextResponse.json({ code: 200, data: batches });

      case 'consume':
        const consumePage = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const consumePageSize = searchParams.get('pageSize')
          ? parseInt(searchParams.get('pageSize')!)
          : 20;
        const consumeMaterialId = searchParams.get('materialId')
          ? parseInt(searchParams.get('materialId')!)
          : undefined;
        const consumeWorkOrderId = searchParams.get('workOrderId')
          ? parseInt(searchParams.get('workOrderId')!)
          : undefined;
        const consumeLog = await service.getConsumeLog(
          consumeMaterialId,
          consumeWorkOrderId,
          consumePage,
          consumePageSize
        );
        return NextResponse.json({
          code: 200,
          data: {
            list: consumeLog.list,
            total: consumeLog.total,
            page: consumePage,
            pageSize: consumePageSize,
          },
        });

      case 'adjustment':
        const adjPage = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const adjPageSize = searchParams.get('pageSize')
          ? parseInt(searchParams.get('pageSize')!)
          : 20;
        const adjMaterialId = searchParams.get('materialId')
          ? parseInt(searchParams.get('materialId')!)
          : undefined;
        const adjustmentLog = await service.getAdjustmentLog(adjMaterialId, adjPage, adjPageSize);
        return NextResponse.json({
          code: 200,
          data: {
            list: adjustmentLog.list,
            total: adjustmentLog.total,
            page: adjPage,
            pageSize: adjPageSize,
          },
        });

      case 'expiry-check':
        const checkResult = await service.runExpiryCheck();
        return NextResponse.json({ code: 200, data: checkResult });

      default:
        return NextResponse.json({ code: 400, message: '无效的操作' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        code: 500,
        message: error.message || '查询失败',
      },
      { status: 500 }
    );
  }
}

async function postHandler(request: NextRequest, user: UserInfo) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'consume':
        if (!body.materialId || !body.consumeQty || !body.consumeType) {
          return NextResponse.json({ code: 400, message: '缺少必要参数' }, { status: 400 });
        }
        const consumeId = await service.recordConsumption({
          materialId: body.materialId,
          batchId: body.batchId,
          consumeQty: body.consumeQty,
          consumeType: body.consumeType,
          workOrderId: body.workOrderId,
          workOrderNo: body.workOrderNo,
          sourceType: body.sourceType,
          sourceId: body.sourceId,
          sourceNo: body.sourceNo,
          operatorId: user.userId,
          remark: body.remark,
        });
        return NextResponse.json({ code: 200, message: '消耗记录成功', data: { id: consumeId } });

      case 'adjustment':
        if (!body.materialId || !body.afterQty || !body.adjustmentType || !body.reason) {
          return NextResponse.json({ code: 400, message: '缺少必要参数' }, { status: 400 });
        }
        const adjustmentId = await service.createAdjustment({
          materialId: body.materialId,
          batchId: body.batchId,
          adjustmentType: body.adjustmentType,
          afterQty: body.afterQty,
          reason: body.reason,
          operatorId: user.userId,
        });
        return NextResponse.json({
          code: 200,
          message: '调整单创建成功',
          data: { id: adjustmentId },
        });

      case 'approve':
        if (!body.adjustmentId) {
          return NextResponse.json({ code: 400, message: '缺少调整单ID' }, { status: 400 });
        }
        await service.approveAdjustment(body.adjustmentId, user.userId);
        return NextResponse.json({ code: 200, message: '审核通过' });

      default:
        return NextResponse.json({ code: 400, message: '无效的操作' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        code: 500,
        message: error.message || '操作失败',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuthAndErrorHandler(getHandler);
export const POST = withAuthAndErrorHandler(postHandler);
