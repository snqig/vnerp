import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { FinanceApplicationService } from '@/application/services/FinanceApplicationService';

const financeService = FinanceApplicationService.create();

export const GET = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const [payableSummary, receivableSummary] = await Promise.all([
      financeService.getPayableSummary({
        supplierId: supplierId ? parseInt(supplierId) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
      financeService.getReceivableSummary({
        customerId: customerId ? parseInt(customerId) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    ]);

    return successResponse({
      payable: payableSummary,
      receivable: receivableSummary,
      netCashFlow: receivableSummary.totalReceived - payableSummary.totalPaid,
    });
  },
  { errorMessage: '操作失败' }
);
