import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { recordReceipt } from '@/lib/finance-core';

export const POST = withPermission(
  async (request: NextRequest, userInfo, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const body = await request.json();
    const { amount, receiptMethod, receiptDate, bankAccount, referenceNo, operatorId } = body;

    if (!amount || !receiptMethod || !receiptDate) {
      return errorResponse('缺少必要参数', 400, 400);
    }

    const result = await recordReceipt(
      Number(resolvedParams.id),
      Number(amount),
      receiptMethod,
      receiptDate,
      bankAccount,
      referenceNo,
      operatorId
    );

    if (!result.success) {
      return errorResponse(result.message, 400, 400);
    }

    return successResponse(null, result.message);
  }
);
