import { NextRequest } from 'next/server';
import { paginatedResponse } from '@/lib/api-response';
import { query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { FinanceApplicationService } from '@/application/services/FinanceApplicationService';
import type { DbRow } from '@/types/db';

const financeService = FinanceApplicationService.create();

export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sourceNo = searchParams.get('sourceNo') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const result = await financeService.getPayableList({
      page,
      pageSize,
      supplierId: supplierId ? parseInt(supplierId) : undefined,
      status: status ? parseInt(status) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sourceNo: sourceNo || undefined,
    });

    // 合并供应商名称（fin_payable 仅存 supplier_id，页面需要 supplier_name）
    const rows = result.data as unknown as DbRow[];
    const supplierIds = Array.from(
      new Set(rows.map((r) => r.supplier_id).filter((v): v is number => v != null))
    );
    const supplierMap: Record<number, string> = {};
    if (supplierIds.length > 0) {
      const suppliers = await query<DbRow>(
        'SELECT id, supplier_name FROM pur_supplier WHERE id IN (?)',
        [supplierIds]
      );
      suppliers.forEach((s) => {
        supplierMap[Number(s.id)] = String(s.supplier_name ?? '');
      });
    }
    const enriched = rows.map((r) => ({
      ...r,
      supplier_name: r.supplier_id != null ? supplierMap[Number(r.supplier_id)] || '' : '',
    }));

    return paginatedResponse(enriched as unknown as typeof result.data, result.pagination);
  },
  { errorMessage: '操作失败' }
);
