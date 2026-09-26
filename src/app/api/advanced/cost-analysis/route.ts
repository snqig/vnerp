import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { CostAnalysis } from '@/domain/cost/aggregates/CostAnalysis';

export const POST = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { action } = await request.json();

  switch (action) {
    case 'product-cost': {
      const params = await request.json();
      const result = CostAnalysis.calculateProductCost(params);
      return successResponse(result);
    }

    case 'profit-analysis': {
      // 修复：sal_order_item 上**不存在 cost_price 列**（该表只有 unit_price / total_price），
      // 旧写法在任何请求下都会抛 Unknown column 'soi.cost_price'，
      // 导致「产品盈利分析」整块不可用。成本改取物料标准成本 inv_material.cost_price ；
      // 未维护标准成本的物料该项成本计 0（毛利=收入），属于数据缺口而非接口失败。
      const products = await query<{
        id: number;
        total_revenue: number;
        total_cost: number;
      }>(
        `SELECT soi.material_id as id, SUM(soi.quantity * soi.unit_price) as total_revenue,
                SUM(soi.quantity * COALESCE(im.cost_price, 0)) as total_cost
         FROM sal_order_item soi
         JOIN sal_order so ON soi.order_id = so.id
         LEFT JOIN inv_material im ON im.id = soi.material_id
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
      return errorResponse(ts('k_ztn3ax'), 400, 400);
  }
});
