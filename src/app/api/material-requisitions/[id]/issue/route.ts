import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';
import { issueMaterial } from '@/lib/material-requisition';

export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const body = await request.json();
    const { items, operatorId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('请提供出库物料列表', 400, 400);
    }

    const result = await issueMaterial(Number(resolvedParams.id), items, operatorId);

    if (!result.success) {
      return errorResponse(result.message, 400, 400);
    }

    return successResponse({ issuedItems: result.issuedItems }, result.message);
  }
);
