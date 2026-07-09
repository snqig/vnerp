import { NextRequest } from 'next/server';
import {
  expandBom,
  expandBomBatch,
  mergeExpansionResults,
  getBomExpansionTree,
  clearBomExpansionCache,
} from '@/lib/bom-expansion';
import { successResponse, errorResponse, validateRequestBody } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 展开单个产品的BOM
 * POST /api/orders/bom/expand
 *
 * 请求体：
 * {
 *   "productId": 123,
 *   "quantity": 100,
 *   "maxDepth": 10,        // 可选，默认10
 *   "enableCache": true    // 可选，默认true
 * }
 */
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();

    const validation = validateRequestBody(body, ['productId', 'quantity']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const { productId, quantity, maxDepth, enableCache } = body;

    // 参数验证
    if (!Number.isInteger(productId) || productId <= 0) {
      return errorResponse('productId 必须是正整数', 400, 400);
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return errorResponse('quantity 必须是正数', 400, 400);
    }

    if (maxDepth !== undefined && (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 20)) {
      return errorResponse('maxDepth 必须是1-20之间的整数', 400, 400);
    }

    try {
      const result = await expandBom(productId, quantity, {
        maxDepth: maxDepth || 10,
        enableCache: enableCache !== false,
      });

      return successResponse(result, 'BOM展开成功');
    } catch (error: any) {
      if (error.message.includes('产品不存在')) {
        return errorResponse(error.message, 404, 404);
      }
      throw error;
    }
  },
  { logTitle: 'BOM展开', logType: 'business' }
);

/**
 * 批量展开多个产品的BOM或获取树形结构
 * GET /api/orders/bom/expand?productId=123&quantity=100&format=tree
 *
 * 查询参数：
 * - productId: 产品ID
 * - quantity: 数量
 * - format: 'tree' 返回树形结构，'flat' 返回平铺列表（默认）
 * - maxDepth: 最大递归深度
 */
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  const quantity = searchParams.get('quantity');
  const format = searchParams.get('format') || 'flat';
  const maxDepth = searchParams.get('maxDepth');
  const action = searchParams.get('action');

  // 清除缓存操作
  if (action === 'clearCache') {
    await clearBomExpansionCache();
    return successResponse(null, '缓存已清除');
  }

  if (!productId || !quantity) {
    return errorResponse('缺少必填参数: productId, quantity', 400, 400);
  }

  const pid = parseInt(productId);
  const qty = parseFloat(quantity);

  if (!Number.isInteger(pid) || pid <= 0) {
    return errorResponse('productId 必须是正整数', 400, 400);
  }

  if (qty <= 0) {
    return errorResponse('quantity 必须是正数', 400, 400);
  }

  const config = {
    maxDepth: maxDepth ? parseInt(maxDepth) : 10,
    enableCache: true,
  };

  try {
    if (format === 'tree') {
      // 返回树形结构
      const result = await getBomExpansionTree(pid, qty, config);
      return successResponse(result, 'BOM树形展开成功');
    } else {
      // 返回平铺列表
      const result = await expandBom(pid, qty, config);
      return successResponse(result, 'BOM展开成功');
    }
  } catch (error: any) {
    if (error.message.includes('产品不存在')) {
      return errorResponse(error.message, 404, 404);
    }
    throw error;
  }
});

/**
 * 批量操作
 * PUT /api/orders/bom/expand
 *
 * 请求体：
 * {
 *   "action": "batch" | "merge",
 *   "products": [
 *     { "productId": 123, "quantity": 100 },
 *     { "productId": 456, "quantity": 200 }
 *   ]
 * }
 *
 * - batch: 批量展开多个产品的BOM
 * - merge: 展开多个产品并合并物料需求
 */
export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();

    const validation = validateRequestBody(body, ['action', 'products']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const { action, products, maxDepth, enableCache } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return errorResponse('products 必须是非空数组', 400, 400);
    }

    // 验证每个产品项
    for (const item of products) {
      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        return errorResponse('products 中的 productId 必须是正整数', 400, 400);
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return errorResponse('products 中的 quantity 必须是正数', 400, 400);
      }
    }

    const config = {
      maxDepth: maxDepth || 10,
      enableCache: enableCache !== false,
    };

    try {
      if (action === 'batch') {
        // 批量展开
        const results = await expandBomBatch(products, config);
        return successResponse(
          {
            results,
            summary: {
              totalProducts: results.length,
              totalMaterials: results.reduce((sum, r) => sum + r.statistics.totalMaterials, 0),
              totalLeafMaterials: results.reduce((sum, r) => sum + r.statistics.leafMaterials, 0),
            },
          },
          '批量BOM展开成功'
        );
      } else if (action === 'merge') {
        // 展开并合并
        const results = await expandBomBatch(products, config);
        const merged = mergeExpansionResults(results);

        // 转换Map为数组便于JSON序列化
        const materialsArray = Array.from(merged.materials.entries()).map(([id, data]) => ({
          materialId: id,
          ...data,
        }));

        return successResponse(
          {
            products: results.map((r) => ({
              productCode: r.productCode,
              productName: r.productName,
              requiredQuantity: r.requiredQuantity,
            })),
            mergedMaterials: materialsArray,
            summary: {
              totalProducts: results.length,
              totalMaterialTypes: materialsArray.length,
              totalQuantity: materialsArray.reduce((sum, m) => sum + m.totalActualQuantity, 0),
            },
          },
          'BOM合并展开成功'
        );
      } else {
        return errorResponse(`不支持的操作类型: ${action}`, 400, 400);
      }
    } catch (error: any) {
      if (error.message.includes('产品不存在')) {
        return errorResponse(error.message, 404, 404);
      }
      throw error;
    }
  },
  { logTitle: '批量BOM操作', logType: 'business' }
);
