import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { DemandForecastingService } from '@/application/services/DemandForecastingService';

export const POST = withPermission(async (request: NextRequest) => {
  const { materialId, months = 12 } = await request.json();
  if (!materialId) return errorResponse('缺少 materialId', 400, 400);
  const service = new DemandForecastingService();
  const result = await service.forecastMonthlyDemand(Number(materialId), Number(months));
  return successResponse(result);
});
