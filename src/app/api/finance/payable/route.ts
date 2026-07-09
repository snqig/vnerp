import { NextRequest } from 'next/server';
import { paginatedResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { FinanceApplicationService } from '@/application/services/FinanceApplicationService';

const financeService = FinanceApplicationService.create();

export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const result = await financeService.getPayableList({
      page,
      pageSize,
      supplierId: supplierId ? parseInt(supplierId) : undefined,
      status: status ? parseInt(status) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return paginatedResponse(result.data, result.pagination);
  },
  { errorMessage: '操作失败' }
);
