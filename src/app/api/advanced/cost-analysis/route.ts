import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { CostAnalysis } from '@/domain/cost/aggregates/CostAnalysis';

export const POST = withPermission(async (request: NextRequest) => {
  const { action } = await request.json();

  switch (action) {
    case 'product-cost': {
      const params = await request.json();
      const result = CostAnalysis.calculateProductCost(params);
      return successResponse(result);
    }

    case 'profit-analysis': {
      const products = await query<{
        id: number;
        total_revenue: number;
        total_cost: number;
      }>(
        `SELECT soi.material_id as id, SUM(soi.quantity * soi.unit_price) as total_revenue,
                SUM(soi.quantity * soi.cost_price) as total_cost
         FROM sal_order_item soi JOIN sal_order so ON soi.order_id = so.id
         WHERE so.order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND so.deleted = 0
         GROUP BY soi.material_id`
      );
      const analyzed = CostAnalysis.analyzeProductProfitability(
        products.map((p) => ({
          productId: p.id,
          revenue: Number(p.total_revenue) || 0,
          directCost: Number(p.total_cost) || 0,
          overheadAllocation: Number(p.total_cost) * 0.15 || 0,
        }))
      );
      return successResponse(analyzed);
    }

    case 'abc-classification': {
      const inventory = await query<{ material_id: number; total_value: number }>(
        `SELECT material_id, SUM(quantity * unit_cost) as total_value
         FROM inv_inventory WHERE deleted = 0 GROUP BY material_id`
      );
      const result = CostAnalysis.classifyInventory(
        inventory.map((i) => ({ materialId: i.material_id, value: Number(i.total_value) || 0 }))
      );
      return successResponse(result);
    }

    case 'break-even': {
      const params = await request.json();
      const result = CostAnalysis.calculateBreakEvenPoint({
        fixedCost: Number(params.fixedCost) || 0,
        variableCostPerUnit: Number(params.variableCostPerUnit) || 0,
        sellingPrice: Number(params.sellingPrice) || 0,
      });
      return successResponse(result);
    }

    default:
      return errorResponse('未知操作', 400, 400);
  }
});
