/**
 * @module FIFO 库存分配
 * @description 实现先进先出（FIFO）策略的库存批次分配与扣减逻辑。
 * 按批次入库时间排序依次分配数量，使用 Decimal 保证金额精度，
 * 内置乐观锁冲突重试机制与缺料预警，支持事务化的多物料批量出库和指定批次出库。
 */
import { query, transaction } from './db';
import Decimal from 'decimal.js';
import { logger } from '@/lib/logger';

/**
 * FIFO 分配明细项接口，记录单个批次的分配详情。
 * 包含批次标识、物料信息、分配数量、分配前可用量、单价以及入库/过期/开封时间。
 */
export interface FIFOAllocationItem {
  batch_id: number;
  batch_no: string;
  material_id: number;
  material_code: string;
  material_name: string;
  allocate_qty: number;
  available_qty_before: number;
  unit_cost: number;
  inbound_date: string;
  expire_date?: string;
  opened_at?: string;
  version?: number;
}

/**
 * FIFO 分配结果接口，记录单次分配的整体汇总信息。
 * 包含物料需求量、总可用量、已分配量、缺料数量与百分比，以及各批次分配明细列表。
 */
export interface FIFOAllocationResult {
  material_id: number;
  material_code: string;
  material_name: string;
  required_qty: number;
  total_available: number;
  allocated_qty: number;
  shortage: number;
  shortage_percentage: number;
  allocations: FIFOAllocationItem[];
}

/**
 * 缺料预警接口，当库存不足以满足需求时生成。
 * 包含需求量、可用量、缺料量、缺料百分比，以及安全库存、再订购点和建议补货数量。
 */
export interface ShortageWarning {
  materialId: number;
  materialCode: string;
  materialName: string;
  requiredQty: number;
  availableQty: number;
  shortageQty: number;
  shortagePercentage: number;
  safetyStock?: number;
  reorderPoint?: number;
  reorderSuggestion?: number;
}

/**
 * 带重试的分配结果接口，记录分配是否成功、重试次数以及最终结果或错误信息。
 */
export interface AllocationWithRetry {
  success: boolean;
  attempts: number;
  result?: FIFOAllocationResult;
  error?: string;
}

/** 默认乐观锁冲突重试次数 */
export const DEFAULT_RETRY_ATTEMPTS = 3;
/** 默认重试间隔（毫秒），每次重试按 attempts 递增（线性退避） */
export const DEFAULT_RETRY_DELAY_MS = 100;

/**
 * FIFO 统一排序策略常量
 * 排序规则优先级：
 * 1. 余料优先 (split_flag = 2)
 * 2. 已开封优先 (opened_at IS NOT NULL)
 * 3. 临期优先 (expire_date ASC)
 * 4. 入库时间优先 (inbound_date ASC)
 * 5. 批次ID (id ASC)
 */
export const FIFO_POLICY = {
  ORDER_BY_CLAUSE: `
    CASE WHEN split_flag = 2 THEN 0 ELSE 1 END ASC,
    CASE WHEN opened_at IS NOT NULL THEN 0 ELSE 1 END ASC,
    expire_date ASC,
    inbound_date ASC,
    id ASC
  `,
};

/**
 * FIFO 分配选项接口
 */
export interface FIFOPlanOptions {
  allowExpired?: boolean;
  excludeBatchIds?: number[];
  respectFifoEnabled?: boolean;
  policy?: typeof FIFO_POLICY;
}

/**
 * 按先进先出（FIFO）策略分配库存批次数量。
 *
 * 算法逻辑：
 * 1. 查询指定物料在指定仓库中所有可用批次（available_qty > 0，状态正常）；
 * 2. 排序规则：优先使用已开封批次（opened_at），再按入库时间（inbound_date）升序，
 *    再按过期日期升序（优先消耗即将过期的），最后按批次 ID 升序；
 * 3. 使用 FOR UPDATE 锁定选中行，防止并发修改；
 * 4. 按排序顺序逐批扣减：每批分配量 = min(剩余需求量, 该批可用量)；
 * 5. 使用 Decimal 类保证数量与金额运算精度，避免浮点误差；
 * 6. 计算缺料量 = max(剩余未满足需求, 0)，缺料百分比 = 缺料量 / 需求量 × 100。
 *
 * @param conn - 数据库连接对象（需支持 query 方法），通常在事务中使用
 * @param materialId - 物料 ID
 * @param warehouseId - 仓库 ID
 * @param requiredQty - 需求数量
 * @param options - 可选配置
 * @param options.allowExpired - 是否允许分配已过期批次，默认 false
 * @param options.excludeBatchIds - 要排除的批次 ID 列表，用于跳过已分配失败的批次
 * @returns FIFO 分配结果，包含需求量、总可用量、已分配量、缺料信息及各批次分配明细
 */
/**
 * 构建批次查询 SQL（纯查询，不加锁）
 * 包含统一排序策略和过滤条件
 */
function buildBatchQuery(
  materialId: number,
  warehouseId: number,
  options: FIFOPlanOptions = {}
): { sql: string; params: unknown[] } {
  const allowExpired = options.allowExpired ?? false;
  const excludeBatchIds = options.excludeBatchIds ?? [];
  const policy = options.policy ?? FIFO_POLICY;

  let sql = `SELECT
      id, batch_no, material_id, material_code, material_name,
      available_qty, unit_price, inbound_date, unit, expire_date,
      opened_at, split_flag, qr_code, location, version
    FROM inv_inventory_batch
    WHERE material_id = ? AND warehouse_id = ? AND available_qty > 0 AND deleted = 0 AND status = 1`;

  if (!allowExpired) {
    sql += ` AND (expire_date IS NULL OR expire_date >= CURDATE())`;
  }

  if (excludeBatchIds.length > 0) {
    sql += ` AND id NOT IN (${excludeBatchIds.map(() => '?').join(',')})`;
  }

  sql += ` ORDER BY ${policy.ORDER_BY_CLAUSE}`;

  return { sql, params: [materialId, warehouseId, ...excludeBatchIds] };
}

/**
 * FIFO 分配计算核心逻辑（纯计算，无副作用）
 */
function calculateAllocation(
  batches: Loose[],
  materialId: number,
  requiredQty: number
): FIFOAllocationResult {
  const result: FIFOAllocationResult = {
    material_id: materialId,
    material_code: batches.length > 0 ? batches[0].material_code : '',
    material_name: batches.length > 0 ? batches[0].material_name : '',
    required_qty: requiredQty,
    total_available: 0,
    allocated_qty: 0,
    shortage: 0,
    shortage_percentage: 0,
    allocations: [],
  };

  const totalAvailableDecimal = batches.reduce(
    (sum: Decimal, b: Loose) => sum.plus(new Decimal(b.available_qty)),
    new Decimal(0)
  );
  result.total_available = totalAvailableDecimal.toNumber();

  logger.debug(`[FIFO] calculateAllocation start - materialId: ${materialId}, requiredQty: ${requiredQty}`);
  logger.debug(`[FIFO] batches found: ${batches.length}`);
  batches.forEach((b, idx) => {
    logger.debug(`[FIFO]   batch[${idx}]: id=${b.id}, batch_no=${b.batch_no}, available_qty=${b.available_qty}, inbound_date=${b.inbound_date}, expire_date=${b.expire_date}, opened_at=${b.opened_at}, split_flag=${b.split_flag}, version=${b.version}`);
  });

  let remainingDecimal = new Decimal(requiredQty);

  for (const batch of batches) {
    if (remainingDecimal.lessThanOrEqualTo(0)) break;

    const availableQtyDecimal = new Decimal(batch.available_qty);
    const allocateQtyDecimal = Decimal.min(remainingDecimal, availableQtyDecimal);

    logger.debug(`[FIFO]   allocating: batch_no=${batch.batch_no}, available=${availableQtyDecimal.toNumber()}, remaining=${remainingDecimal.toNumber()}, allocate=${allocateQtyDecimal.toNumber()}`);

    result.allocations.push({
      batch_id: batch.id,
      batch_no: batch.batch_no,
      material_id: batch.material_id,
      material_code: batch.material_code,
      material_name: batch.material_name,
      allocate_qty: allocateQtyDecimal.toNumber(),
      available_qty_before: availableQtyDecimal.toNumber(),
      unit_cost: new Decimal(batch.unit_price || 0).toNumber(),
      inbound_date: batch.inbound_date,
      expire_date: batch.expire_date,
      opened_at: batch.opened_at,
      version: batch.version,
    });

    remainingDecimal = remainingDecimal.minus(allocateQtyDecimal);
    result.allocated_qty = result.allocated_qty + allocateQtyDecimal.toNumber();
  }

  result.shortage = Decimal.max(remainingDecimal, 0).toNumber();
  result.shortage_percentage =
    requiredQty > 0 ? new Decimal(result.shortage).dividedBy(requiredQty).times(100).toNumber() : 0;

  logger.debug(`[FIFO] calculateAllocation end - materialId: ${materialId}, total_available: ${result.total_available}, allocated_qty: ${result.allocated_qty}, shortage: ${result.shortage}, allocations_count: ${result.allocations.length}`);

  return result;
}

/**
 * FIFO 分配计划（纯计算，不加锁）
 * 用于只读场景：推荐批次、库存查询等
 */
export async function planFIFOAllocation(
  conn: Loose,
  materialId: number,
  warehouseId: number,
  requiredQty: number,
  options: FIFOPlanOptions = {}
): Promise<FIFOAllocationResult> {
  logger.debug(`[FIFO] planFIFOAllocation - materialId: ${materialId}, warehouseId: ${warehouseId}, requiredQty: ${requiredQty}`);
  const { sql, params } = buildBatchQuery(materialId, warehouseId, options);
  logger.debug(`[FIFO] planFIFOAllocation SQL: ${sql}`);
  const [batches]: Loose = await conn.query(sql, params);
  logger.debug(`[FIFO] planFIFOAllocation got ${batches.length} batches`);
  return calculateAllocation(batches, materialId, requiredQty);
}

/**
 * 按先进先出（FIFO）策略分配库存批次数量。
 *
 * 算法逻辑：
 * 1. 调用 planFIFOAllocation 获取分配计划（只读计算）；
 * 2. 使用 FOR UPDATE 锁定选中行，防止并发修改；
 * 3. 返回分配结果，包含各批次分配明细。
 */
export async function allocateFIFO(
  conn: Loose,
  materialId: number,
  warehouseId: number,
  requiredQty: number,
  options?: {
    allowExpired?: boolean;
    excludeBatchIds?: number[];
  }
): Promise<FIFOAllocationResult> {
  logger.debug(`[FIFO] allocateFIFO (with lock) - materialId: ${materialId}, warehouseId: ${warehouseId}, requiredQty: ${requiredQty}, options: ${JSON.stringify(options)}`);
  const planOptions: FIFOPlanOptions = {
    allowExpired: options?.allowExpired,
    excludeBatchIds: options?.excludeBatchIds,
  };

  const { sql, params } = buildBatchQuery(materialId, warehouseId, planOptions);
  const lockedSql = sql.replace(/ORDER BY/, 'FOR UPDATE ORDER BY');
  logger.debug(`[FIFO] allocateFIFO locked SQL: ${lockedSql}`);

  const [batches]: Loose = await conn.query(lockedSql, params);
  logger.debug(`[FIFO] allocateFIFO locked query got ${batches.length} batches`);
  const result = calculateAllocation(batches, materialId, requiredQty);
  logger.debug(`[FIFO] allocateFIFO result - allocated: ${result.allocated_qty}, shortage: ${result.shortage}`);
  return result;
}

/**
 * 检查指定物料的库存是否足以满足需求数量，若存在缺料则生成预警信息。
 *
 * 算法逻辑：
 * 1. 查询物料的安全库存（safety_stock）和最低库存（min_stock，作为再订购点）；
 * 2. 查询物料所有有效批次的可用量合计；
 * 3. 缺料量 = max(需求量 - 可用量, 0)，若缺料量为 0 则返回 null（无需预警）；
 * 4. 建议补货量 = max(再订购点 - 可用量 + 需求量, 0)，确保补货后库存回到再订购点以上。
 *
 * @param materialId - 物料 ID
 * @param requiredQty - 需求数量
 * @returns 缺料预警对象（包含安全库存、再订购点、建议补货量等），若无缺料返回 null
 */
export async function checkShortageAndWarn(
  materialId: number,
  requiredQty: number
): Promise<ShortageWarning | null> {
  const [safetyRows]: Loose = await query(
    `SELECT safety_stock, min_stock FROM inv_material WHERE id = ? AND deleted = 0`,
    [materialId]
  );

  if (!safetyRows || safetyRows.length === 0) return null;

  const { safety_stock, min_stock } = safetyRows[0];
  // 再订购点取最低库存值（min_stock），安全库存为更底线的缓冲量
  const reorder_point = min_stock;
  const safetyStock = parseFloat(safety_stock) || 0;
  const reorderPoint = parseFloat(reorder_point) || 0;

  const [invRows]: Loose = await query(
    `SELECT COALESCE(SUM(available_qty), 0) as total_available FROM inv_inventory_batch
     WHERE material_id = ? AND deleted = 0 AND status = 1`,
    [materialId]
  );

  const availableQty = parseFloat(invRows[0]?.total_available) || 0;
  // 缺料量 = 需求量 - 可用量（至少为0）
  const shortageQty = Math.max(0, requiredQty - availableQty);

  if (shortageQty === 0) return null;

  // 建议补货量 = 再订购点 - 当前可用量 + 本次需求量，确保补货后不低于再订购点
  const reorderSuggestion = Math.max(0, reorderPoint - availableQty + requiredQty);

  return {
    materialId,
    materialCode: '',
    materialName: '',
    requiredQty,
    availableQty,
    shortageQty,
    shortagePercentage: requiredQty > 0 ? (shortageQty / requiredQty) * 100 : 0,
    safetyStock,
    reorderPoint,
    reorderSuggestion,
  };
}

/**
 * 执行 FIFO 库存扣减，内置乐观锁冲突自动重试机制。
 *
 * 重试逻辑：
 * - 若扣减时遇到乐观锁版本冲突（错误信息包含 "已被其他操作修改"、"version" 或 "affectedRows"），
 *   则等待线性退避时间（DELAY × attempts 毫秒）后重新尝试；
 * - 非乐观锁冲突的错误直接抛出，不进行重试；
 * - 达到最大重试次数后仍未成功则抛出最终失败异常。
 *
 * @param conn - 数据库连接对象（需在事务上下文中使用）
 * @param allocation - FIFO 分配结果，包含各批次的分配明细
 * @param params - 扣减参数，包含业务来源信息（单据类型、单据号）和操作人信息
 * @param params.sourceType - 业务单据类型（如 "production_order"）
 * @param params.sourceId - 业务单据 ID
 * @param params.sourceNo - 业务单据号
 * @param params.warehouseId - 仓库 ID
 * @param params.warehouseCode - 仓库编码
 * @param params.operatorId - 操作人 ID，可为 null
 * @param params.operatorName - 操作人姓名，可为 null
 * @param maxRetries - 最大重试次数，默认为 DEFAULT_RETRY_ATTEMPTS (3)
 * @returns 包含扣减明细列表、总成本和实际重试次数的对象
 * @throws 乐观锁冲突重试次数耗尽后抛出 "FIFO deduction failed" 异常
 * @throws 非乐观锁冲突的错误立即抛出原始异常
 */
export async function executeFIFODeductionWithRetry(
  conn: Loose,
  allocation: FIFOAllocationResult,
  params: {
    sourceType: string;
    sourceId: number;
    sourceNo: string;
    warehouseId: number;
    warehouseCode: string;
    operatorId: number | null;
    operatorName: string | null;
  },
  maxRetries: number = DEFAULT_RETRY_ATTEMPTS
): Promise<{ deductionDetails: Loose[]; totalCost: number; attempts: number }> {
  logger.debug(`[FIFO] executeFIFODeductionWithRetry start - sourceType: ${params.sourceType}, sourceNo: ${params.sourceNo}, materialId: ${allocation.material_id}, sourceId: ${params.sourceId}, maxRetries: ${maxRetries}`);
  logger.debug(`[FIFO] executeFIFODeductionWithRetry allocation summary - required_qty: ${allocation.required_qty}, allocated_qty: ${allocation.allocated_qty}, shortage: ${allocation.shortage}, allocations_count: ${allocation.allocations.length}`);

  let attempts = 0;
  let lastError: string = '';

  while (attempts < maxRetries) {
    attempts++;
    logger.debug(`[FIFO] executeFIFODeductionWithRetry attempt ${attempts}/${maxRetries}`);
    try {
      const result = await executeFIFODeductionInternal(conn, allocation, params);
      logger.debug(`[FIFO] executeFIFODeductionWithRetry success after ${attempts} attempts - totalCost: ${result.totalCost}, deductionDetails: ${result.deductionDetails.length}`);
      return { ...result, attempts };
    } catch (error) {
      lastError = (error as Error).message;
      logger.debug(`[FIFO] executeFIFODeductionWithRetry attempt ${attempts} failed: ${lastError}`);
      if (
        attempts < maxRetries &&
        (lastError.includes('已被其他操作修改') ||
          lastError.includes('version') ||
          lastError.includes('affectedRows'))
      ) {
        logger.debug(`[FIFO] executeFIFODeductionWithRetry retrying after ${DEFAULT_RETRY_DELAY_MS * attempts}ms delay...`);
        await new Promise((resolve) => setTimeout(resolve, DEFAULT_RETRY_DELAY_MS * attempts));
        continue;
      }
      logger.debug(`[FIFO] executeFIFODeductionWithRetry throwing error (not retryable)`);
      throw error;
    }
  }

  throw new Error(`FIFO deduction failed after ${maxRetries} attempts: ${lastError}`);
}

/**
 * FIFO 扣减的内部实现，逐批扣减库存并记录流水。
 *
 * 执行流程：
 * 1. 对每个分配明细项，使用乐观锁（version 字段）更新批次表的可用量和总数量；
 * 2. 若 affectedRows 为 0，查询当前批次实际版本号，抛出详细的乐观锁冲突信息；
 * 3. 计算每行成本 = 分配数量 × 单价（使用 Decimal 保证精度）；
 * 4. 查询物料在仓库的当前库存总量，计算扣减前后的库存变化；
 * 5. 插入库存流水日志（inv_inventory_log），记录操作类型、前后数量、业务关联信息。
 *
 * @param conn - 数据库连接对象
 * @param allocation - FIFO 分配结果
 * @param params - 扣减业务参数
 * @returns 包含扣减明细列表和总成本的对象
 * @throws 乐观锁冲突时抛出含版本号和可用量的详细错误信息
 * @throws 批次不存在时抛出 "FIFO库存更新失败" 异常
 */
async function executeFIFODeductionInternal(
  conn: Loose,
  allocation: FIFOAllocationResult,
  params: {
    sourceType: string;
    sourceId: number;
    sourceNo: string;
    warehouseId: number;
    warehouseCode: string;
    operatorId: number | null;
    operatorName: string | null;
  }
): Promise<{ deductionDetails: Loose[]; totalCost: number }> {
  logger.debug(`[FIFO] executeFIFODeductionInternal start - materialId: ${allocation.material_id}, sourceNo: ${params.sourceNo}`);
  const deductionDetails: Loose[] = [];
  const totalCostDecimal = new Decimal(0);

  for (const alloc of allocation.allocations) {
    logger.debug(`[FIFO]   processing batch: batch_id=${alloc.batch_id}, batch_no=${alloc.batch_no}, allocate_qty=${alloc.allocate_qty}, available_qty_before=${alloc.available_qty_before}, version=${alloc.version}, unit_cost=${alloc.unit_cost}`);

    // 使用乐观锁更新：WHERE 条件包含 version 字段，防止并发修改导致超扣
    const [updateResult]: Loose = await conn.execute(
      `UPDATE inv_inventory_batch SET
        quantity = quantity - ?,
        available_qty = available_qty - ?,
        version = version + 1,
        update_time = NOW()
      WHERE id = ? AND available_qty >= ? AND version = ?`,
      [alloc.allocate_qty, alloc.allocate_qty, alloc.batch_id, alloc.allocate_qty, alloc.version]
    );

    logger.debug(`[FIFO]   batch ${alloc.batch_no} UPDATE result - affectedRows: ${updateResult.affectedRows}`);

    if (updateResult.affectedRows === 0) {
      // 乐观锁冲突：查询当前批次实际状态，用于生成详细错误信息
      const [currentBatch]: Loose = await conn.query(
        'SELECT version, available_qty FROM inv_inventory_batch WHERE id = ?',
        [alloc.batch_id]
      );
      logger.debug(`[FIFO]   batch ${alloc.batch_no} optimistic lock conflict - currentBatch: ${JSON.stringify(currentBatch)}`);
      if (currentBatch.length > 0) {
        throw new Error(
          `批次${alloc.batch_no}乐观锁冲突: 期望版本${alloc.version}, ` +
            `实际版本${currentBatch[0].version}, 可用量${currentBatch[0].available_qty}`
        );
      }
      throw new Error(`FIFO库存更新失败: 批次${alloc.batch_no}，可能已被其他操作修改`);
    }

    // 行成本 = 分配数量 × 单价（Decimal 运算避免浮点误差）
    const lineCostDecimal = new Decimal(alloc.allocate_qty).times(alloc.unit_cost);
    totalCostDecimal.plus(lineCostDecimal);
    logger.debug(`[FIFO]   batch ${alloc.batch_no} cost calculated - line_cost: ${lineCostDecimal.toNumber()}, totalCost so far: ${totalCostDecimal.toNumber()}`);

    deductionDetails.push({
      batch_id: alloc.batch_id,
      batch_no: alloc.batch_no,
      material_id: alloc.material_id,
      material_name: alloc.material_name,
      deducted_qty: alloc.allocate_qty,
      unit_cost: alloc.unit_cost,
      line_cost: lineCostDecimal.toNumber(),
      mode: 'fifo_auto',
    });

    // 查询物料在仓库的当前库存总量，用于记录库存流水的前后变化
    const [currentInv]: Loose = await conn.query(
      'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
      [alloc.material_id, params.warehouseId]
    );
    const beforeQty = currentInv.length > 0 ? parseFloat(currentInv[0].quantity) : 0;
    const afterQty = beforeQty - alloc.allocate_qty;

    logger.debug(`[FIFO]   batch ${alloc.batch_no} inventory log - before_qty: ${beforeQty}, after_qty: ${afterQty}`);

    await conn.execute(
      `INSERT INTO inv_inventory_log (
        material_id, warehouse_id, batch_no, operation_type, operation_qty,
        before_qty, after_qty, business_type, business_no, remark, operator_id, create_time
      ) VALUES (?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        alloc.material_id,
        params.warehouseId,
        alloc.batch_no,
        alloc.allocate_qty,
        beforeQty,
        afterQty,
        params.sourceType,
        params.sourceNo,
        `FIFO出库-批次${alloc.batch_no}`,
        params.operatorId,
      ]
    );

    logger.debug(`[FIFO]   batch ${alloc.batch_no} deduction completed successfully`);
  }

  logger.debug(`[FIFO] executeFIFODeductionInternal end - totalCost: ${totalCostDecimal.toNumber()}, deductionDetails: ${deductionDetails.length} items`);
  return { deductionDetails, totalCost: totalCostDecimal.toNumber() };
}

/**
 * 在事务中批量执行多个物料的 FIFO 分配与扣减操作。
 *
 * 执行流程：
 * 1. 开启数据库事务；
 * 2. 对每个物料依次调用 allocateFIFO 进行分配；
 * 3. 若存在缺料，调用 checkShortageAndWarn 生成预警并补充物料编码/名称；
 * 4. 对有分配明细的物料调用 executeFIFODeductionWithRetry 执行扣减（含乐观锁重试）；
 * 5. 使用 Decimal 累加所有物料的总成本；
 * 6. 事务成功则返回全部结果，失败则回滚并返回错误信息。
 *
 * @param allocations - 多物料的分配请求列表，每项包含物料 ID、仓库 ID、需求数量和可选排除批次
 * @param params - 扣减业务参数，包含单据信息和操作人信息
 * @param params.sourceType - 业务单据类型
 * @param params.sourceId - 业务单据 ID
 * @param params.sourceNo - 业务单据号
 * @param params.warehouseCode - 仓库编码
 * @param params.operatorId - 操作人 ID，可为 null
 * @param params.operatorName - 操作人姓名，可为 null
 * @returns 包含所有物料分配结果、总成本、缺料预警列表及成功标志的对象；
 *          事务失败时 success 为 false 并附带 error 信息
 */
export async function executeFIFOWithTransaction(
  allocations: Array<{
    materialId: number;
    warehouseId: number;
    requiredQty: number;
    excludeBatchIds?: number[];
  }>,
  params: {
    sourceType: string;
    sourceId: number;
    sourceNo: string;
    warehouseCode: string;
    operatorId: number | null;
    operatorName: string | null;
  }
): Promise<{
  results: FIFOAllocationResult[];
  totalCost: number;
  shortageWarnings: ShortageWarning[];
  success: boolean;
  error?: string;
}> {
  const results: FIFOAllocationResult[] = [];
  const shortageWarnings: ShortageWarning[] = [];
  let totalCostDecimal = new Decimal(0);

  try {
    const finalResult = await transaction(async (conn) => {
      for (const alloc of allocations) {
        const allocation = await allocateFIFO(
          conn,
          alloc.materialId,
          alloc.warehouseId,
          alloc.requiredQty,
          {
            excludeBatchIds: alloc.excludeBatchIds,
          }
        );

        if (allocation.shortage > 0) {
          const warning = await checkShortageAndWarn(alloc.materialId, alloc.requiredQty);
          if (warning) {
            warning.materialCode = allocation.material_code;
            warning.materialName = allocation.material_name;
            shortageWarnings.push(warning);
          }
        }

        if (allocation.allocations.length > 0) {
          const deductionResult = await executeFIFODeductionWithRetry(conn, allocation, {
            sourceType: params.sourceType,
            sourceId: params.sourceId,
            sourceNo: params.sourceNo,
            warehouseId: alloc.warehouseId,
            warehouseCode: params.warehouseCode,
            operatorId: params.operatorId,
            operatorName: params.operatorName,
          });
          totalCostDecimal = totalCostDecimal.plus(deductionResult.totalCost);
        }

        results.push(allocation);
      }

      return {
        results,
        totalCost: totalCostDecimal.toNumber(),
        shortageWarnings,
        success: true,
      };
    });

    return finalResult;
  } catch (error) {
    return {
      results,
      totalCost: totalCostDecimal.toNumber(),
      shortageWarnings,
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * 指定批次出库扣减，跳过 FIFO 自动分配，直接从用户指定的批次扣减库存。
 *
 * 执行流程：
 * 1. 查询指定批次并加行锁（FOR UPDATE），防止并发修改；
 * 2. 校验批次可用量是否 >= 需求数量，不足则抛出异常；
 * 3. 使用乐观锁（version 字段）更新批次表的可用量和总数量；
 * 4. 若 affectedRows 为 0，说明并发冲突，抛出异常；
 * 5. 计算总成本 = 需求数量 × 单价（Decimal 精度运算）；
 * 6. 查询物料当前库存总量，插入库存流水日志。
 *
 * @param conn - 数据库连接对象（需在事务上下文中使用）
 * @param params - 扣减参数，包含批次号、物料信息、仓库信息和业务单据信息
 * @param params.batchNo - 批次号
 * @param params.materialId - 物料 ID
 * @param params.materialCode - 物料编码
 * @param params.materialName - 物料名称
 * @param params.warehouseId - 仓库 ID
 * @param params.warehouseCode - 仓库编码
 * @param params.requiredQty - 需求数量
 * @param params.sourceType - 业务单据类型
 * @param params.sourceId - 业务单据 ID
 * @param params.sourceNo - 业务单据号
 * @param params.operatorId - 操作人 ID，可为 null
 * @param params.operatorName - 操作人姓名，可为 null
 * @returns 包含扣减明细和总成本的对象；明细中 mode 为 'specified_batch'
 * @throws 当批次不存在时抛出 "库存批次不存在" 异常
 * @throws 当可用量不足时抛出含可用量和需求数量的 "库存不足" 异常
 * @throws 当乐观锁冲突时抛出 "库存更新失败" 异常
 */
export async function executeSpecifiedBatchDeduction(
  conn: Loose,
  params: {
    batchNo: string;
    materialId: number;
    materialCode: string;
    materialName: string;
    warehouseId: number;
    warehouseCode: string;
    requiredQty: number;
    sourceType: string;
    sourceId: number;
    sourceNo: string;
    operatorId: number | null;
    operatorName: string | null;
  }
): Promise<{ deductionDetail: Loose; totalCost: number }> {
  const [batch]: Loose = await conn.query(
    `SELECT id, batch_no, available_qty, quantity, unit_price, version FROM inv_inventory_batch
     WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0
     FOR UPDATE`,
    [params.batchNo, params.materialId, params.warehouseId]
  );

  if (batch.length === 0) {
    throw new Error(`库存批次不存在: ${params.batchNo}`);
  }

  const batchData = batch[0];
  const availableQtyDecimal = new Decimal(batchData.available_qty);
  const requiredQtyDecimal = new Decimal(params.requiredQty);

  // 校验可用量是否足够：可用量 < 需求量时抛出异常
  if (availableQtyDecimal.lessThan(requiredQtyDecimal)) {
    throw new Error(
      `库存不足: ${params.materialName}(${params.batchNo}), ` +
        `可用: ${availableQtyDecimal.toFixed(2)}, 需要: ${requiredQtyDecimal.toFixed(2)}`
    );
  }

  // 使用乐观锁更新批次库存：version 字段防止并发冲突
  const [updateResult]: Loose = await conn.execute(
    `UPDATE inv_inventory_batch SET
      quantity = quantity - ?,
      available_qty = available_qty - ?,
      version = version + 1,
      update_time = NOW()
    WHERE id = ? AND version = ?`,
    [params.requiredQty, params.requiredQty, batchData.id, batchData.version]
  );

  if (updateResult.affectedRows === 0) {
    throw new Error(`库存更新失败，可能已被其他操作修改: ${params.batchNo}`);
  }

  // 计算总成本 = 需求数量 × 单价（Decimal 精度运算）
  const unitCostDecimal = new Decimal(batchData.unit_price || 0);
  const totalCostDecimal = requiredQtyDecimal.times(unitCostDecimal);

  const [currentInv]: Loose = await conn.query(
    'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
    [params.materialId, params.warehouseId]
  );
  const beforeQty = currentInv.length > 0 ? parseFloat(currentInv[0].quantity) : 0;
  const afterQty = beforeQty - params.requiredQty;

  await conn.execute(
    `INSERT INTO inv_inventory_log (
      material_id, warehouse_id, batch_no, operation_type, operation_qty,
      before_qty, after_qty, business_type, business_no, remark, operator_id, create_time
    ) VALUES (?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      params.materialId,
      params.warehouseId,
      params.batchNo,
      params.requiredQty,
      beforeQty,
      afterQty,
      params.sourceType,
      params.sourceNo,
      `指定批次出库-${params.batchNo}`,
      params.operatorId,
    ]
  );

  return {
    deductionDetail: {
      batch_id: batchData.id,
      batch_no: params.batchNo,
      material_id: params.materialId,
      material_name: params.materialName,
      deducted_qty: params.requiredQty,
      unit_cost: unitCostDecimal.toNumber(),
      line_cost: totalCostDecimal.toNumber(),
      mode: 'specified_batch',
    },
    totalCost: totalCostDecimal.toNumber(),
  };
}
