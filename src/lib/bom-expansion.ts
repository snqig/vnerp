import { query } from './db';
import { getCacheManager } from '@/infrastructure/cache/CacheManager';
import { CacheGuard } from '@/infrastructure/cache/CacheGuard';

const BOM_CACHE_TTL_SECONDS = 600;

let bomCacheGuard: CacheGuard | null = null;
function getBomCacheGuard(): CacheGuard {
  if (!bomCacheGuard) {
    bomCacheGuard = new CacheGuard(getCacheManager());
  }
  return bomCacheGuard;
}

function bomCacheKey(productId: number, quantity: number): string {
  return `bom:expansion:${productId}:${quantity}`;
}

/**
 * BOM展开配置
 */
export interface BomExpansionConfig {
  maxDepth: number; // 最大递归深度，默认10
  enableCache: boolean; // 是否启用缓存，默认true
}

/**
 * BOM展开结果项
 */
export interface BomExpansionItem {
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec?: string;
  unit: string;
  // 基础用量（不含损耗）
  baseQuantity: number;
  // 累计损耗率（百分比）
  accumulatedLossRate: number;
  // 实际需求量 = baseQuantity * (1 + accumulatedLossRate/100)
  actualQuantity: number;
  // BOM层级深度（0为顶层产品）
  level: number;
  // 父级路径（产品编码 -> 子件编码 -> ...）
  parentPath: string[];
  // 来源BOM ID
  sourceBomId: number;
  // 是否为叶子节点（最底层的原材料）
  isLeaf: boolean;
}

/**
 * BOM展开结果
 */
export interface BomExpansionResult {
  // 产品信息
  productId: number;
  productCode: string;
  productName: string;
  productSpec?: string;
  // 需求数量
  requiredQuantity: number;
  // 展开后的所有物料
  items: BomExpansionItem[];
  // 展开统计
  statistics: {
    totalMaterials: number; // 总物料种类数
    maxDepth: number; // 最大展开层级
    leafMaterials: number; // 叶子节点物料数
    intermediateMaterials: number; // 中间件物料数
  };
  // 循环引用警告
  circularReferenceWarnings?: string[];
}

/**
 * BOM节点（用于递归计算）
 */
interface BomNode {
  id: number;
  code: string;
  name: string;
  spec?: string;
  unit: string;
  type: 'product' | 'material'; // 产品或物料
  bomId?: number; // 如果是产品，关联的BOM ID
}

/**
 * BOM明细行
 */
interface BomLine {
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec?: string;
  unit: string;
  quantity: number; // 单位用量
  lossRate: number; // 损耗率（百分比）
  bomId: number;
}

/**
 * 获取产品的BOM明细
 */
async function getBomLines(productId: number): Promise<BomLine[]> {
  const sql = `
    SELECT 
      bl.material_id as materialId,
      bl.material_code as materialCode,
      bl.material_name as materialName,
      bl.material_spec as materialSpec,
      bl.unit,
      bl.consumption_qty as quantity,
      bl.loss_rate as lossRate,
      bh.id as bomId
    FROM bom_header bh
    INNER JOIN bom_line bl ON bh.id = bl.bom_id
    WHERE bh.product_id = ?
      AND bh.status = 30
      AND bh.deleted = 0
      AND bh.is_default = 1
    ORDER BY bl.line_no
  `;

  const rows = await query<BomLine>(sql, [productId]);
  return rows;
}

/**
 * 检查物料是否有BOM（是否为半成品）
 */
async function checkMaterialHasBom(materialId: number): Promise<{ hasBom: boolean; bomId?: number }> {
  const sql = `
    SELECT bh.id as bomId
    FROM bom_header bh
    INNER JOIN products p ON bh.product_id = p.id
    INNER JOIN materials m ON m.code = p.code
    WHERE m.id = ?
      AND bh.status = 30
      AND bh.deleted = 0
      AND bh.is_default = 1
    LIMIT 1
  `;

  const rows = await query<{ bomId: number }>(sql, [materialId]);
  if (rows.length > 0) {
    return { hasBom: true, bomId: rows[0].bomId };
  }
  return { hasBom: false };
}

/**
 * 根据物料ID获取产品ID（如果物料对应一个产品）
 */
async function getProductIdByMaterialId(materialId: number): Promise<number | null> {
  const sql = `
    SELECT p.id as productId
    FROM products p
    INNER JOIN materials m ON m.code = p.code
    WHERE m.id = ?
    LIMIT 1
  `;

  const rows = await query<{ productId: number }>(sql, [materialId]);
  return rows.length > 0 ? rows[0].productId : null;
}

/**
 * 递归展开BOM
 */
async function expandBomRecursive(
  productId: number,
  productCode: string,
  productName: string,
  productSpec: string | undefined,
  requiredQuantity: number,
  accumulatedLossRate: number,
  currentDepth: number,
  parentPath: string[],
  config: BomExpansionConfig,
  visitedNodes: Set<string>,
  warnings: string[]
): Promise<BomExpansionItem[]> {
  const items: BomExpansionItem[] = [];

  // 深度限制检查
  if (currentDepth >= config.maxDepth) {
    warnings.push(`达到最大递归深度 ${config.maxDepth}，产品 ${productCode} 的展开已停止`);
    return items;
  }

  // 循环引用检查
  const nodeKey = `${productId}:${productCode}`;
  if (visitedNodes.has(nodeKey)) {
    warnings.push(`检测到循环引用：${[...parentPath, productCode].join(' -> ')}`);
    return items;
  }
  visitedNodes.add(nodeKey);

  // 获取BOM明细
  const bomLines = await getBomLines(productId);
  
  if (bomLines.length === 0) {
    // 没有BOM，说明是叶子节点
    return items;
  }

  // 递归展开每个物料
  for (const line of bomLines) {
    // 计算当前层的需求量（考虑父级累计损耗）
    // 父级需求 × 子件用量 × (1 + 父级累计损耗/100)
    const baseQuantity = requiredQuantity * line.quantity;
    
    // 子级损耗 = 父级损耗 + 子级自身损耗 × 父级用量
    // 实际计算：累计损耗率 = 父级累计损耗率 + 当前损耗率
    const currentAccumulatedLossRate = accumulatedLossRate + line.lossRate;
    
    // 实际需求量 = 基础用量 × (1 + 累计损耗率/100)
    const actualQuantity = baseQuantity * (1 + currentAccumulatedLossRate / 100);

    // 检查物料是否有BOM（是否为半成品）
    const { hasBom, bomId } = await checkMaterialHasBom(line.materialId);
    
    // 获取对应的产品ID（如果有）
    const relatedProductId = await getProductIdByMaterialId(line.materialId);

    const currentItem: BomExpansionItem = {
      materialId: line.materialId,
      materialCode: line.materialCode,
      materialName: line.materialName,
      materialSpec: line.materialSpec,
      unit: line.unit,
      baseQuantity,
      accumulatedLossRate: currentAccumulatedLossRate,
      actualQuantity,
      level: currentDepth,
      parentPath: [...parentPath],
      sourceBomId: line.bomId,
      isLeaf: !hasBom,
    };

    if (hasBom && relatedProductId) {
      // 是半成品，继续递归展开
      const childItems = await expandBomRecursive(
        relatedProductId,
        line.materialCode,
        line.materialName,
        line.materialSpec,
        actualQuantity, // 使用实际需求量作为子级的需求数量
        currentAccumulatedLossRate, // 传递累计损耗率
        currentDepth + 1,
        [...parentPath, productCode],
        config,
        visitedNodes,
        warnings
      );
      
      // 标记为非叶子节点
      currentItem.isLeaf = false;
      items.push(currentItem);
      items.push(...childItems);
    } else {
      // 是原材料，叶子节点
      currentItem.isLeaf = true;
      items.push(currentItem);
    }
  }

  // 移除访问标记（允许其他路径访问此节点）
  visitedNodes.delete(nodeKey);

  return items;
}

/**
 * 合并相同的物料（按materialId分组，累加数量）
 */
function mergeMaterials(items: BomExpansionItem[]): BomExpansionItem[] {
  const materialMap = new Map<number, BomExpansionItem>();

  for (const item of items) {
    const existing = materialMap.get(item.materialId);
    if (existing) {
      // 累加数量
      existing.baseQuantity += item.baseQuantity;
      existing.actualQuantity += item.actualQuantity;
      // 取较大的损耗率
      existing.accumulatedLossRate = Math.max(existing.accumulatedLossRate, item.accumulatedLossRate);
      // 取较深的层级
      existing.level = Math.max(existing.level, item.level);
    } else {
      materialMap.set(item.materialId, { ...item });
    }
  }

  return Array.from(materialMap.values()).sort((a, b) => {
    // 按层级和物料编码排序
    if (a.level !== b.level) return a.level - b.level;
    return a.materialCode.localeCompare(b.materialCode);
  });
}

/**
 * 展开BOM - 主函数
 * @param productId 产品ID
 * @param quantity 需求数量
 * @param config 配置选项
 */
export async function expandBom(
  productId: number,
  quantity: number,
  config: Partial<BomExpansionConfig> = {}
): Promise<BomExpansionResult> {
  // 默认配置
  const finalConfig: BomExpansionConfig = {
    maxDepth: config.maxDepth || 10,
    enableCache: config.enableCache !== false,
  };

  const computeResult = async (): Promise<BomExpansionResult> => {
    // 获取产品信息
    const productSql = `
      SELECT
        id,
        code,
        name,
        specification
      FROM products
      WHERE id = ?
    `;
    const productRows = await query<{
      id: number;
      code: string;
      name: string;
      specification?: string;
    }>(productSql, [productId]);

    if (productRows.length === 0) {
      throw new Error(`产品不存在：ID ${productId}`);
    }

    const product = productRows[0];
    const warnings: string[] = [];
    const visitedNodes = new Set<string>();

    // 递归展开BOM
    const items = await expandBomRecursive(
      productId,
      product.code,
      product.name,
      product.specification,
      quantity,
      0, // 初始累计损耗率为0
      0, // 初始层级为0
      [], // 初始父级路径为空
      finalConfig,
      visitedNodes,
      warnings
    );

    // 合并相同物料
    const mergedItems = mergeMaterials(items);

    // 统计信息
    const statistics = {
      totalMaterials: mergedItems.length,
      maxDepth: Math.max(...mergedItems.map(i => i.level), 0),
      leafMaterials: mergedItems.filter(i => i.isLeaf).length,
      intermediateMaterials: mergedItems.filter(i => !i.isLeaf).length,
    };

    return {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      productSpec: product.specification,
      requiredQuantity: quantity,
      items: mergedItems,
      statistics,
      circularReferenceWarnings: warnings.length > 0 ? warnings : undefined,
    };
  };

  if (!finalConfig.enableCache) {
    return computeResult();
  }

  return getBomCacheGuard().getOrLoad(
    bomCacheKey(productId, quantity),
    BOM_CACHE_TTL_SECONDS,
    computeResult
  );
}

/**
 * 批量展开多个产品的BOM
 * @param products 产品列表 [{ productId, quantity }]
 * @param config 配置选项
 */
export async function expandBomBatch(
  products: Array<{ productId: number; quantity: number }>,
  config: Partial<BomExpansionConfig> = {}
): Promise<BomExpansionResult[]> {
  const results: BomExpansionResult[] = [];

  for (const { productId, quantity } of products) {
    try {
      const result = await expandBom(productId, quantity, config);
      results.push(result);
    } catch (error) {
      console.error(`展开BOM失败：产品ID ${productId}`, error);
      throw error;
    }
  }

  return results;
}

/**
 * 合并多个BOM展开结果（用于汇总多个产品的物料需求）
 */
export function mergeExpansionResults(results: BomExpansionResult[]): {
  materials: Map<number, {
    materialCode: string;
    materialName: string;
    materialSpec?: string;
    unit: string;
    totalActualQuantity: number;
    sources: Array<{ productCode: string; quantity: number }>;
  }>;
} {
  const materialMap = new Map<
    number,
    {
      materialCode: string;
      materialName: string;
      materialSpec?: string;
      unit: string;
      totalActualQuantity: number;
      sources: Array<{ productCode: string; quantity: number }>;
    }
  >();

  for (const result of results) {
    for (const item of result.items) {
      // 只统计叶子节点（原材料）
      if (!item.isLeaf) continue;

      const existing = materialMap.get(item.materialId);
      if (existing) {
        existing.totalActualQuantity += item.actualQuantity;
        existing.sources.push({
          productCode: result.productCode,
          quantity: item.actualQuantity,
        });
      } else {
        materialMap.set(item.materialId, {
          materialCode: item.materialCode,
          materialName: item.materialName,
          materialSpec: item.materialSpec,
          unit: item.unit,
          totalActualQuantity: item.actualQuantity,
          sources: [
            {
              productCode: result.productCode,
              quantity: item.actualQuantity,
            },
          ],
        });
      }
    }
  }

  return { materials: materialMap };
}

/**
 * 清除缓存
 */
export async function clearBomExpansionCache(): Promise<void> {
  await getCacheManager().deletePattern('bom:expansion:*');
}

/**
 * 获取BOM展开的树形结构（用于前端展示）
 */
export async function getBomExpansionTree(
  productId: number,
  quantity: number,
  config: Partial<BomExpansionConfig> = {}
): Promise<{
  node: {
    id: number;
    code: string;
    name: string;
    type: 'product' | 'material';
    quantity: number;
    lossRate: number;
    level: number;
    children: any[];
  };
  warnings?: string[];
}> {
  const warnings: string[] = [];
  const visitedNodes = new Set<string>();

  async function buildTree(
    pid: number,
    pcode: string,
    pname: string,
    pquantity: number,
    plossRate: number,
    level: number,
    path: string[]
  ): Promise<any> {
    // 深度和循环检查
    if (level >= (config.maxDepth || 10)) {
      warnings.push(`达到最大递归深度，产品 ${pcode} 的展开已停止`);
      return {
        id: pid,
        code: pcode,
        name: pname,
        type: 'product',
        quantity: pquantity,
        lossRate: plossRate,
        level,
        children: [],
      };
    }

    const nodeKey = `${pid}:${pcode}`;
    if (visitedNodes.has(nodeKey)) {
      warnings.push(`检测到循环引用：${[...path, pcode].join(' -> ')}`);
      return {
        id: pid,
        code: pcode,
        name: pname,
        type: 'product',
        quantity: pquantity,
        lossRate: plossRate,
        level,
        children: [],
      };
    }
    visitedNodes.add(nodeKey);

    const bomLines = await getBomLines(pid);
    const children = [];

    for (const line of bomLines) {
      const baseQty = pquantity * line.quantity;
      const accLossRate = plossRate + line.lossRate;
      const actualQty = baseQty * (1 + accLossRate / 100);

      const { hasBom } = await checkMaterialHasBom(line.materialId);
      const relatedProductId = await getProductIdByMaterialId(line.materialId);

      if (hasBom && relatedProductId) {
        const childTree = await buildTree(
          relatedProductId,
          line.materialCode,
          line.materialName,
          actualQty,
          accLossRate,
          level + 1,
          [...path, pcode]
        );
        children.push(childTree);
      } else {
        children.push({
          id: line.materialId,
          code: line.materialCode,
          name: line.materialName,
          type: 'material',
          quantity: actualQty,
          lossRate: accLossRate,
          level: level + 1,
          children: [],
        });
      }
    }

    visitedNodes.delete(nodeKey);

    return {
      id: pid,
      code: pcode,
      name: pname,
      type: 'product',
      quantity: pquantity,
      lossRate: plossRate,
      level,
      children,
    };
  }

  // 获取产品信息
  const productSql = `SELECT id, code, name FROM products WHERE id = ?`;
  const productRows = await query<{ id: number; code: string; name: string }>(productSql, [productId]);

  if (productRows.length === 0) {
    throw new Error(`产品不存在：ID ${productId}`);
  }

  const product = productRows[0];
  const node = await buildTree(product.id, product.code, product.name, quantity, 0, 0, []);

  return {
    node,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
