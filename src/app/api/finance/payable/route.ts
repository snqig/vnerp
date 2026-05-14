import { NextRequest } from 'next/server';
import { successResponse, paginatedResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';
import { FinanceApplicationService } from '@/application/services/FinanceApplicationService';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';

const financeService = new FinanceApplicationService();

export const GET = withAuthAndErrorHandler(
  async (request: NextRequest, userInfo: UserInfo) => {
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
  { permission: 'finance:view' }
);
