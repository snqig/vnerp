import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';
import { recordPayment } from '@/lib/finance-core';

export const POST = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const body = await request.json();
    const { amount, paymentMethod, paymentDate, bankAccount, referenceNo, operatorId } = body;

    if (!amount || !paymentMethod || !paymentDate) {
      return errorResponse('缺少必要参数', 400, 400);
    }

    const result = await recordPayment(
      Number(resolvedParams.id),
      Number(amount),
      paymentMethod,
      paymentDate,
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
