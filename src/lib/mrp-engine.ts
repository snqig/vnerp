/**
 * @module MRP 引擎
 * @description MRP（物料需求计划）核心计算引擎。负责执行 BOM 展开、时间分段计算、净需求分析、
 * 计划订单生成以及自动生成采购申请等完整 MRP 运算流程。该模块是 ERP 系统中生产计划与物料控制
 * 的关键组件，输入工单编号和仓库信息，输出物料供需平衡的完整计算报告。
 */

import { CalcParamService } from '@/lib/calc-param-service';

/**
 * 表示 BOM 树中的一个节点，用于存储展开后的物料清单结构
 */
export interface BOMNode {
  /** 物料 ID */
  material_id: number;
  /** 物料编码 */
  material_code: string;
  /** 物料名称 */
  material_name: string;
  /** 需求数量（已考虑损耗率） */
  quantity: number;
  /** 计量单位 */
  unit: string;
  /** BOM 层级，0 为顶层产品 */
  level: number;
  /** BOM 路径，用 '>' 分隔各层级物料 ID，用于环检测 */
  path: string;
  /** 是否为叶节点（无下级 BOM） */
  is_leaf: boolean;
  /** 采购/生产提前期（天） */
  lead_time_days: number;
  /** 损耗率（0~1 之间的小数） */
  scrap_rate: number;
  /** 子 BOM 节点列表 */
  children?: BOMNode[];
}

interface StackItem {
  material_id: number;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  level: number;
  path: string;
  parent_node: BOMNode | null;
  parent_qty: number;
}

interface BOMRow {
  id: number;
  material_id: number;
  version: string;
  status: number;
  is_default: number;
}

interface BOMLineRow {
  id: number;
  bom_id: number;
  material_id: number;
  quantity: number;
  unit: string;
  loss_rate: number;
}

interface MaterialInfoRow {
  id: number;
  material_code: string;
  material_name: string;
  unit: string;
  safety_stock: number;
  purchase_price: number;
  default_supplier_id: number | null;
  lead_time_days: number | null;
}

/**
 * 展开 BOM（物料清单）树
 *
 * 使用迭代栈（非递归）方式从上往下展开指定产品的 BOM 结构。
 * 算法流程：
 * 1. 查询产品基础信息，创建根节点
 * 2. 使用栈进行广度优先遍历，逐层查询每个物料的 BOM 明细
 * 3. 计算子物料数量时考虑损耗率：grossQty = parentQty × quantity × (1 + scrapRate)
 * 4. 通过 path 路径和 visited 集合防止循环引用和无限递归
 * 5. 最多展开 maxDepth 层
 *
 * @param conn - 数据库连接对象
 * @param productId - 产品/物料 ID
 * @param quantity - 顶层产品的需求数量
 * @param maxDepth - 最大展开深度，默认 10 层
 * @returns BOM 树的根节点，包含完整的父子层级结构
 */
export async function explodeBOM(
  conn: Loose,
  productId: number,
  quantity: number,
  maxDepth: number = 10
): Promise<BOMNode> {
  const productRows: Loose = await conn.query(
    `SELECT id, material_code, material_name, unit FROM inv_material WHERE id = ? AND deleted = 0`,
    [productId]
  );

  let productCode = '';
  let productName = '';
  let productUnit = '件';

  if (productRows.length > 0) {
    productCode = productRows[0].material_code || '';
    productName = productRows[0].material_name || '';
    productUnit = productRows[0].unit || '件';
  }

  const defaultLeadTime = await CalcParamService.getInt('mrp.default_lead_time_days', 7);
  const leadTimeRows: Loose = await conn.query(
    `SELECT id FROM inv_material WHERE id = ? AND deleted = 0`,
    [productId]
  );
  const rootLeadTime = leadTimeRows.length > 0 ? defaultLeadTime : defaultLeadTime;

  const root: BOMNode = {
    material_id: productId,
    material_code: productCode,
    material_name: productName,
    quantity: quantity,
    unit: productUnit,
    level: 0,
    path: String(productId),
    is_leaf: true,
    lead_time_days: rootLeadTime,
    scrap_rate: 0,
    children: [],
  };

  const stack: StackItem[] = [
    {
      material_id: productId,
      material_code: productCode,
      material_name: productName,
      quantity: quantity,
      unit: productUnit,
      level: 0,
      path: String(productId),
      parent_node: root,
      parent_qty: quantity,
    },
  ];

  const visited = new Set<string>();

  while (stack.length > 0) {
    const item = stack.pop()!;

    if (item.level >= maxDepth) {
      continue;
    }

    const visitKey = `${item.material_id}:${item.path}`;
    if (visited.has(visitKey)) {
      continue;
    }
    visited.add(visitKey);

    const bomRows: BOMRow[] = await conn.query(
      `SELECT id, material_id, version, status, is_default
       FROM prd_bom
       WHERE material_id = ? AND status = 1
       ORDER BY is_default DESC, version DESC
       LIMIT 1`,
      [item.material_id]
    );

    if (!bomRows || bomRows.length === 0) {
      continue;
    }

    const bom = bomRows[0];
    if (item.parent_node) {
      item.parent_node.is_leaf = false;
    }

    const lines: BOMLineRow[] = await conn.query(
      `SELECT bd.id, bd.bom_id, bd.material_id, bd.quantity, bd.unit, bd.loss_rate,
              m.material_code, m.material_name
       FROM prd_bom_detail bd
       LEFT JOIN inv_material m ON m.id = bd.material_id
       WHERE bd.bom_id = ?`,
      [bom.id]
    );

    for (const line of lines) {
      // 计算损耗率（百分比转小数）和考虑损耗后的毛需求数量
      const scrapRate = Number(line.loss_rate || 0) / 100;
      const grossQty = item.parent_qty * Number(line.quantity) * (1 + scrapRate);

      const childPath = `${item.path}>${line.material_id}`;

      const childCircularKey = `${line.material_id}:${childPath}`;

      const matInfoRows: Loose = await conn.query(
        `SELECT id, material_code, material_name FROM inv_material WHERE id = ?`,
        [line.material_id]
      );
      const childLeadTime = defaultLeadTime;
      const childCode = matInfoRows.length > 0 ? matInfoRows[0].material_code || '' : '';
      const childName = matInfoRows.length > 0 ? matInfoRows[0].material_name || '' : '';

      const childNode: BOMNode = {
        material_id: line.material_id,
        material_code: childCode,
        material_name: childName,
        quantity: Math.round(grossQty * 10000) / 10000,
        unit: line.unit || '件',
        level: item.level + 1,
        path: childPath,
        is_leaf: true,
        lead_time_days: childLeadTime,
        scrap_rate: scrapRate,
        children: [],
      };

      if (item.parent_node) {
        if (!item.parent_node.children) {
          item.parent_node.children = [];
        }
        item.parent_node.children.push(childNode);
      }

      if (!visited.has(childCircularKey) && item.level + 1 < maxDepth) {
        stack.push({
          material_id: line.material_id,
          material_code: childCode,
          material_name: childName,
          quantity: grossQty,
          unit: line.unit || '件',
          level: item.level + 1,
          path: childPath,
          parent_node: childNode,
          parent_qty: grossQty,
        });
      }
    }
  }

  return root;
}

/**
 * 表示一个时间分段（时区）内的 MRP 供需数据
 */
export interface TimeBucket {
  date: string;
  gross_requirement: number;
  scheduled_receipt: number;
  on_hand: number;
  net_requirement: number;
  planned_order_release: number;
  planned_order_receipt: number;
}

/**
 * 计算指定物料的时间分段供需平衡
 *
 * 按 day/week/month 粒度将时间范围划分为多个分段，逐段计算 MRP 核心指标。
 * 计算逻辑：
 * 1. 获取物料提前期和当前库存
 * 2. 收集工单需求（gross requirement）和在途采购收货（scheduled receipt）
 * 3. 逐段滚动计算：在手库存 = max(0, 上期库存 + 计划收货 - 毛需求)
 * 4. 净需求 = max(0, 毛需求 - 在手库存 - 计划收货)
 * 5. 根据提前期前移计划订单下达日期
 *
 * @param conn - 数据库连接对象
 * @param materialId - 物料 ID
 * @param warehouseId - 仓库 ID
 * @param startDate - 计算起始日期（YYYY-MM-DD）
 * @param endDate - 计算结束日期（YYYY-MM-DD）
 * @param bucketSize - 时间分段粒度：'day' | 'week' | 'month'，默认 'week'
 * @returns 各时间分段的 MRP 计算明细数组
 */
export async function calculateTimeBuckets(
  conn: Loose,
  materialId: number,
  warehouseId: number,
  startDate: string,
  endDate: string,
  bucketSize: 'day' | 'week' | 'month' = 'week'
): Promise<TimeBucket[]> {
  const buckets = generateBucketDates(startDate, endDate, bucketSize);

  if (buckets.length === 0) {
    return [];
  }

  const defaultLeadTime = await CalcParamService.getInt('mrp.default_lead_time_days', 7);
  const matInfoRows: Loose = await conn.query(
    `SELECT id FROM inv_material WHERE id = ? AND deleted = 0`,
    [materialId]
  );
  const leadTimeDays = defaultLeadTime;

  const invRows: Loose = await conn.query(
    `SELECT COALESCE(SUM(available_qty), 0) as total_available
     FROM inv_inventory
     WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
    [materialId, warehouseId]
  );
  const currentOnHand = Number(invRows.length > 0 ? invRows[0].total_available : 0);

  const requirementRows: Loose = await conn.query(
    `SELECT
       DATE(wo.plan_start_date) as req_date,
       COALESCE(SUM(bd.quantity * wo.plan_qty * (1 + bd.loss_rate / 100)), 0) as total_req
     FROM prd_work_order wo
     INNER JOIN prd_bom b ON b.material_id = wo.material_id AND b.status = 1
     INNER JOIN prd_bom_detail bd ON bd.bom_id = b.id AND bd.material_id = ?
     WHERE wo.plan_start_date IS NOT NULL
       AND wo.status IN (1, 2)
       AND wo.plan_start_date >= ?
       AND wo.plan_start_date <= ?
     GROUP BY DATE(wo.plan_start_date)`,
    [materialId, startDate, endDate]
  );

  const requirementMap = new Map<string, number>();
  for (const row of requirementRows) {
    const dateStr =
      typeof row.req_date === 'string'
        ? row.req_date.substring(0, 10)
        : String(row.req_date).substring(0, 10);
    requirementMap.set(dateStr, Number(row.total_req));
  }

  const receiptRows: Loose = await conn.query(
    `SELECT
       DATE(po.delivery_date) as receipt_date,
       COALESCE(SUM(pol.order_qty - pol.received_qty), 0) as total_receipt
     FROM pur_purchase_order po
     INNER JOIN pur_purchase_order_line pol ON pol.po_id = po.id
     WHERE pol.material_id = ?
       AND po.deleted = 0
       AND po.status IN (20, 30, 40)
       AND po.delivery_date IS NOT NULL
       AND po.delivery_date >= ?
       AND po.delivery_date <= ?
       AND pol.order_qty > pol.received_qty
     GROUP BY DATE(po.delivery_date)`,
    [materialId, startDate, endDate]
  );

  const receiptMap = new Map<string, number>();
  for (const row of receiptRows) {
    const dateStr =
      typeof row.receipt_date === 'string'
        ? row.receipt_date.substring(0, 10)
        : String(row.receipt_date).substring(0, 10);
    receiptMap.set(dateStr, Number(row.total_receipt));
  }

  const result: TimeBucket[] = [];
  let runningOnHand = currentOnHand;

  for (const bucket of buckets) {
    let grossReq = 0;
    let schedReceipt = 0;

    // 汇总该分段内所有日期的毛需求和计划收货
    for (const d of bucket.dates) {
      const dStr = formatDateStr(d);
      grossReq += requirementMap.get(dStr) || 0;
      schedReceipt += receiptMap.get(dStr) || 0;
    }

    // 预计在手库存 = max(0, 滚动手在 + 计划收货 - 毛需求)
    const onHand = Math.max(0, runningOnHand + schedReceipt - grossReq);
    // 净需求 = max(0, 毛需求 - 在手库存 - 计划收货)
    const netReq = Math.max(0, grossReq - runningOnHand - schedReceipt);

    let plannedRelease = 0;
    let plannedReceipt = 0;

    if (netReq > 0) {
      plannedReceipt = netReq;
      plannedRelease = netReq;
    }

    result.push({
      date: bucket.label,
      gross_requirement: Math.round(grossReq * 10000) / 10000,
      scheduled_receipt: Math.round(schedReceipt * 10000) / 10000,
      on_hand: Math.round(onHand * 10000) / 10000,
      net_requirement: Math.round(netReq * 10000) / 10000,
      planned_order_release: Math.round(plannedRelease * 10000) / 10000,
      planned_order_receipt: Math.round(plannedReceipt * 10000) / 10000,
    });

    runningOnHand = onHand;
  }

  // 根据提前期前移计划订单：接收日期的时间分段 -> 释放日期的时间分段
  for (let i = 0; i < result.length; i++) {
    if (result[i].planned_order_receipt > 0) {
      const releaseBucketIdx = i - Math.ceil(leadTimeDays / getBucketDays(bucketSize));
      if (releaseBucketIdx >= 0) {
        result[releaseBucketIdx].planned_order_release = result[i].planned_order_receipt;
        result[i].planned_order_release = 0;
      }
    }
  }

  return result;
}

function getBucketDays(bucketSize: 'day' | 'week' | 'month'): number {
  switch (bucketSize) {
    case 'day':
      return 1;
    case 'week':
      return 7;
    case 'month':
      return 30;
  }
}

interface BucketDates {
  label: string;
  dates: Date[];
}

function generateBucketDates(
  startDate: string,
  endDate: string,
  bucketSize: 'day' | 'week' | 'month'
): BucketDates[] {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const buckets: BucketDates[] = [];

  if (start > end) {
    return buckets;
  }

  let current = new Date(start);

  while (current <= end) {
    const bucketStart = new Date(current);
    let bucketEnd: Date;

    switch (bucketSize) {
      case 'day':
        bucketEnd = new Date(current);
        current.setDate(current.getDate() + 1);
        break;
      case 'week': {
        const dayOfWeek = current.getDay();
        const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        bucketEnd = new Date(current);
        bucketEnd.setDate(bucketEnd.getDate() + daysToSunday);
        if (bucketEnd > end) bucketEnd = new Date(end);
        current.setDate(current.getDate() + daysToSunday + 1);
        break;
      }
      case 'month': {
        bucketEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        if (bucketEnd > end) bucketEnd = new Date(end);
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        break;
      }
    }

    const dates: Date[] = [];
    for (let d = new Date(bucketStart); d <= bucketEnd; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    buckets.push({
      label: formatDateStr(bucketStart),
      dates,
    });
  }

  return buckets;
}

function formatDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return formatDateStr(d);
}

/**
 * 表示单个物料的净需求分析结果
 */
export interface NetRequirement {
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  gross_requirement: number;
  on_hand_qty: number;
  allocated_qty: number;
  in_transit_qty: number;
  safety_stock: number;
  net_requirement: number;
  lead_time_days: number;
  suggested_order_date: string;
  suggested_delivery_date: string;
  suggested_order_qty: number;
  shortage_warning: boolean;
}

/**
 * 计算工单的净需求
 *
 * 针对指定的工单列表，展开每个工单产品的 BOM 树，汇总所有叶子物料的毛需求量，
 * 再结合库存、已分配量、在途量和安全库存计算每个物料的净需求。
 *
 * 净需求公式：netReq = max(0, grossRequirement - onHandQty + allocatedQty - inTransitQty + safetyStock)
 *
 * @param conn - 数据库连接对象
 * @param workOrderIds - 工单 ID 数组
 * @param warehouseId - 仓库 ID
 * @returns 各物料的净需求分析结果数组，按物料聚合汇总
 */
export async function calculateNetRequirements(
  conn: Loose,
  workOrderIds: number[],
  warehouseId: number
): Promise<NetRequirement[]> {
  if (!workOrderIds || workOrderIds.length === 0) {
    return [];
  }

  const placeholders = workOrderIds.map(() => '?').join(',');

  const workOrders: Loose = await conn.query(
    `SELECT wo.id, wo.work_order_no, wo.plan_qty, wo.plan_start_date, wo.material_id
     FROM prd_work_order wo
     WHERE wo.id IN (${placeholders})`,
    workOrderIds
  );

  if (!workOrders || workOrders.length === 0) {
    return [];
  }

  const materialRequirements = new Map<
    number,
    {
      total_qty: number;
      unit: string;
      material_code: string;
      material_name: string;
      earliest_start_date: string;
      work_order_ids: number[];
    }
  >();

  for (const wo of workOrders) {
    if (!wo.material_id) continue;
    const bomTree = await explodeBOM(conn, wo.material_id, Number(wo.plan_qty || 0));

    const leafMaterials = collectLeafMaterials(bomTree);

    for (const leaf of leafMaterials) {
      const existing = materialRequirements.get(leaf.material_id);
      if (existing) {
        existing.total_qty += leaf.quantity;
        if (wo.plan_start_date) {
          if (!existing.earliest_start_date || wo.plan_start_date < existing.earliest_start_date) {
            existing.earliest_start_date = wo.plan_start_date.substring(0, 10);
          }
        }
        if (!existing.work_order_ids.includes(wo.id)) {
          existing.work_order_ids.push(wo.id);
        }
      } else {
        materialRequirements.set(leaf.material_id, {
          total_qty: leaf.quantity,
          unit: leaf.unit,
          material_code: leaf.material_code,
          material_name: leaf.material_name,
          earliest_start_date: wo.plan_start_date
            ? wo.plan_start_date.substring(0, 10)
            : formatDateStr(new Date()),
          work_order_ids: [wo.id],
        });
      }
    }
  }

  const results: NetRequirement[] = [];
  const materialReqEntries = Array.from(materialRequirements.entries());

  for (const entry of materialReqEntries) {
    const materialId = entry[0];
    const req = entry[1];
    const invRows: Loose = await conn.query(
      `SELECT COALESCE(SUM(available_qty), 0) as total_available
       FROM inv_inventory
       WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
      [materialId, warehouseId]
    );
    const onHandQty = Number(invRows.length > 0 ? invRows[0].total_available : 0);

    const allocatedRows: Loose = await conn.query(
      `SELECT COALESCE(SUM(mii.issued_qty), 0) as total_allocated
       FROM prd_material_issue_item mii
       INNER JOIN prd_material_issue mi ON mi.id = mii.issue_id
       WHERE mii.material_id = ?
         AND mi.warehouse_id = ?
         AND mi.deleted = 0
         AND mi.status IN (1, 2)`,
      [materialId, warehouseId]
    );
    const allocatedQty = Number(allocatedRows.length > 0 ? allocatedRows[0].total_allocated : 0);

    const inTransitRows: Loose = await conn.query(
      `SELECT COALESCE(SUM(pol.order_qty - pol.received_qty), 0) as total_in_transit
       FROM pur_purchase_order_line pol
       INNER JOIN pur_purchase_order po ON po.id = pol.po_id
       WHERE pol.material_id = ?
         AND po.deleted = 0
         AND po.status IN (30, 40)
         AND pol.order_qty > pol.received_qty`,
      [materialId]
    );
    const inTransitQty = Number(inTransitRows.length > 0 ? inTransitRows[0].total_in_transit : 0);

    const defaultLeadTime = await CalcParamService.getInt('mrp.default_lead_time_days', 7);
    const matInfoRows: Loose = await conn.query(
      `SELECT id, material_code, material_name, unit, safety_stock, purchase_price
       FROM inv_material WHERE id = ? AND deleted = 0`,
      [materialId]
    );

    let safetyStock = 0;
    let leadTimeDays = defaultLeadTime;
    let materialCode = req.material_code;
    let materialName = req.material_name;
    let unit = req.unit;

    if (matInfoRows && matInfoRows.length > 0) {
      const matInfo = matInfoRows[0];
      safetyStock = Number(matInfo.safety_stock || 0);
      leadTimeDays = defaultLeadTime;
      materialCode = matInfo.material_code || materialCode;
      materialName = matInfo.material_name || materialName;
      unit = matInfo.unit || unit;
    }

    const netReq = Math.max(
      0,
      req.total_qty - onHandQty + allocatedQty - inTransitQty + safetyStock
    );

    const earliestDate = req.earliest_start_date || formatDateStr(new Date());
    const suggestedOrderDate = addDays(earliestDate, -leadTimeDays);
    const suggestedDeliveryDate = earliestDate;

    const shortageWarning = onHandQty < safetyStock;

    results.push({
      material_id: materialId,
      material_code: materialCode,
      material_name: materialName,
      unit: unit,
      gross_requirement: Math.round(req.total_qty * 10000) / 10000,
      on_hand_qty: Math.round(onHandQty * 10000) / 10000,
      allocated_qty: Math.round(allocatedQty * 10000) / 10000,
      in_transit_qty: Math.round(inTransitQty * 10000) / 10000,
      safety_stock: Math.round(safetyStock * 10000) / 10000,
      net_requirement: Math.round(netReq * 10000) / 10000,
      lead_time_days: leadTimeDays,
      suggested_order_date: suggestedOrderDate,
      suggested_delivery_date: suggestedDeliveryDate,
      suggested_order_qty: Math.round(netReq * 10000) / 10000,
      shortage_warning: shortageWarning,
    });
  }

  return results;
}

function collectLeafMaterials(node: BOMNode): Array<{
  material_id: number;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
}> {
  const leaves: Array<{
    material_id: number;
    material_code: string;
    material_name: string;
    quantity: number;
    unit: string;
  }> = [];

  if (node.is_leaf) {
    leaves.push({
      material_id: node.material_id,
      material_code: node.material_code,
      material_name: node.material_name,
      quantity: node.quantity,
      unit: node.unit,
    });
  }

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childLeaves = collectLeafMaterials(child);
      leaves.push(...childLeaves);
    }
  }

  return leaves;
}

/**
 * 表示 MRP 计算生成的计划订单
 */
export interface PlannedOrder {
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  quantity: number;
  required_date: string;
  order_date: string;
  source_type: 'mrp';
  source_ids: number[];
  priority: 'urgent' | 'normal' | 'low';
}

/**
 * 根据净需求生成计划订单
 *
 * 将净需求计算结果转化为计划订单。按物料聚合净需求量，根据需求日期距离今天的天数
 * 自动设置优先级：
 * - 距今天 ≤3 天：紧急（urgent）
 * - 距今天 ≤14 天：正常（normal）
 * - 其他：低（low）
 *
 * @param conn - 数据库连接对象
 * @param workOrderIds - 工单 ID 数组
 * @param warehouseId - 仓库 ID
 * @returns 按物料聚合的计划订单数组
 */
export async function generatePlannedOrders(
  conn: Loose,
  workOrderIds: number[],
  warehouseId: number
): Promise<PlannedOrder[]> {
  const netRequirements = await calculateNetRequirements(conn, workOrderIds, warehouseId);

  const positiveReqs = netRequirements.filter((r) => r.net_requirement > 0);

  const orderMap = new Map<number, PlannedOrder>();

  for (const req of positiveReqs) {
    const existing = orderMap.get(req.material_id);
    if (existing) {
      existing.quantity += req.suggested_order_qty;
      existing.source_ids = Array.from(new Set(existing.source_ids.concat(workOrderIds)));
      if (req.suggested_delivery_date < existing.required_date) {
        existing.required_date = req.suggested_delivery_date;
        existing.order_date = req.suggested_order_date;
      }
    } else {
      const now = new Date();
      const todayStr = formatDateStr(now);
      const requiredDate = req.suggested_delivery_date || todayStr;
      const daysUntilRequired = Math.ceil(
        (new Date(requiredDate + 'T00:00:00').getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let priority: 'urgent' | 'normal' | 'low';
      if (daysUntilRequired <= 3) {
        priority = 'urgent';
      } else if (daysUntilRequired <= 14) {
        priority = 'normal';
      } else {
        priority = 'low';
      }

      const woIds = netRequirements
        .filter((r) => r.material_id === req.material_id)
        .flatMap((r) => {
          return workOrderIds;
        });
      const uniqueWoIds = Array.from(new Set(woIds));

      orderMap.set(req.material_id, {
        material_id: req.material_id,
        material_code: req.material_code,
        material_name: req.material_name,
        unit: req.unit,
        quantity: req.suggested_order_qty,
        required_date: requiredDate,
        order_date: req.suggested_order_date,
        source_type: 'mrp',
        source_ids: uniqueWoIds,
        priority,
      });
    }
  }

  return Array.from(orderMap.values());
}

/**
 * 根据 MRP 计划订单自动生成采购申请
 *
 * 将计划订单按供应商分组，为每组创建一条采购申请（pur_request），
 * 并为每个物料创建采购申请明细行（pur_request_item）。
 * 采购申请编号格式：PR + 日期 + 4位随机数。
 *
 * @param conn - 数据库连接对象
 * @param plannedOrders - 计划订单数组
 * @param operatorId - 操作人 ID
 * @param operatorName - 操作人名称
 * @returns 生成的采购申请列表，每项包含申请编号和物料项数
 */
export async function generatePurchaseRequestsFromMRP(
  conn: Loose,
  plannedOrders: PlannedOrder[],
  operatorId: number | null,
  operatorName: string
): Promise<{ request_no: string; item_count: number }[]> {
  if (!plannedOrders || plannedOrders.length === 0) {
    return [];
  }

  const materialIds = plannedOrders.map((o) => o.material_id);
  const matPlaceholders = materialIds.map(() => '?').join(',');

  const supplierMap = new Map<number | null, PlannedOrder[]>();

  const matSupplierRows: Loose = await conn.query(
    `SELECT id, material_code, material_name
     FROM inv_material
     WHERE id IN (${matPlaceholders})`,
    materialIds
  );

  const matSupplierLookup = new Map<number, number | null>();
  for (const row of matSupplierRows) {
    matSupplierLookup.set(row.id, null);
  }

  for (const order of plannedOrders) {
    const supplierId = matSupplierLookup.get(order.material_id) || null;
    const group = supplierMap.get(supplierId) || [];
    group.push(order);
    supplierMap.set(supplierId, group);
  }

  const results: { request_no: string; item_count: number }[] = [];
  const supplierEntries = Array.from(supplierMap.entries());

  for (const entry of supplierEntries) {
    const supplierId = entry[0];
    const orders = entry[1];
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomDigits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const requestNo = `PR${dateStr}${randomDigits}`;

    let supplierName = '';
    if (supplierId) {
      const suppRows: Loose = await conn.query(
        `SELECT supplier_name FROM pur_supplier WHERE id = ? AND deleted = 0`,
        [supplierId]
      );
      if (suppRows.length > 0) {
        supplierName = suppRows[0].supplier_name || '';
      }
    }

    const [headerResult]: Loose = await conn.execute(
      `INSERT INTO pur_request
       (request_no, request_dept_id, requester_id, supplier_id, supplier_name, expected_date, status, source_type, create_by, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'mrp', ?, NOW())`,
      [
        requestNo,
        null,
        operatorId,
        supplierId,
        supplierName,
        orders.length > 0 ? orders[0].required_date : null,
        0,
        operatorId,
      ]
    );

    const requestId = headerResult.insertId;
    let lineNo = 1;

    for (const order of orders) {
      let suggestedPrice = 0;

      const priceRows: Loose = await conn.query(
        `SELECT purchase_price FROM inv_material WHERE id = ? AND deleted = 0`,
        [order.material_id]
      );
      if (priceRows.length > 0) {
        suggestedPrice = Number(priceRows[0].purchase_price || 0);
      }

      await conn.execute(
        `INSERT INTO pur_request_item
         (request_id, line_no, material_id, material_code, material_name, material_spec, quantity, price, amount, unit, required_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          requestId,
          lineNo++,
          order.material_id,
          order.material_code,
          order.material_name,
          '',
          order.quantity,
          suggestedPrice,
          Math.round(order.quantity * suggestedPrice * 100) / 100,
          order.unit,
          order.required_date,
          0,
        ]
      );
    }

    results.push({
      request_no: requestNo,
      item_count: orders.length,
    });
  }

  return results;
}

/**
 * 运行完整的 MRP 计算流程
 *
 * 这是 MRP 引擎的入口函数，串联执行以下完整流程：
 * 1. BOM 展开：对每个工单产品展开 BOM 树
 * 2. 净需求计算：汇总叶子物料需求，结合库存计算缺口
 * 3. 计划订单生成：将净需求转化为计划订单
 * 4. （可选）自动生成采购申请：根据计划订单创建采购申请
 * 5. 汇总统计：总物料数、短缺数、计划数量、计划金额
 *
 * @param conn - 数据库连接对象
 * @param workOrderIds - 工单 ID 数组
 * @param warehouseId - 仓库 ID
 * @param operatorId - 操作人 ID
 * @param operatorName - 操作人名称
 * @param autoGeneratePR - 是否自动生成采购申请，默认 false
 * @returns MRP 完整计算结果，包含 BOM 树、净需求、计划订单、采购申请（可选）和汇总统计
 */
export async function runFullMRP(
  conn: Loose,
  workOrderIds: number[],
  warehouseId: number,
  operatorId: number | null,
  operatorName: string,
  autoGeneratePR: boolean = false
): Promise<{
  bom_tree: BOMNode;
  net_requirements: NetRequirement[];
  planned_orders: PlannedOrder[];
  purchase_requests?: { request_no: string; item_count: number }[];
  summary: {
    total_materials: number;
    total_shortages: number;
    total_planned_qty: number;
    total_planned_amount: number;
  };
}> {
  if (!workOrderIds || workOrderIds.length === 0) {
    return {
      bom_tree: {
        material_id: 0,
        material_code: '',
        material_name: '',
        quantity: 0,
        unit: '',
        level: 0,
        path: '',
        is_leaf: true,
        lead_time_days: await CalcParamService.getInt('mrp.default_lead_time_days', 7),
        scrap_rate: 0,
        children: [],
      },
      net_requirements: [],
      planned_orders: [],
      summary: {
        total_materials: 0,
        total_shortages: 0,
        total_planned_qty: 0,
        total_planned_amount: 0,
      },
    };
  }

  const placeholders = workOrderIds.map(() => '?').join(',');
  const workOrders: Loose = await conn.query(
    `SELECT wo.id, wo.plan_qty, wo.material_id
     FROM prd_work_order wo
     WHERE wo.id IN (${placeholders})`,
    workOrderIds
  );

  const combinedBomTree: BOMNode = {
    material_id: 0,
    material_code: 'MRP_ROOT',
    material_name: 'MRP计算根节点',
    quantity: 0,
    unit: '',
    level: -1,
    path: 'MRP_ROOT',
    is_leaf: false,
    lead_time_days: 0,
    scrap_rate: 0,
    children: [],
  };

  for (const wo of workOrders) {
    if (!wo.material_id) continue;
    const bomTree = await explodeBOM(conn, wo.material_id, Number(wo.plan_qty || 0));
    if (combinedBomTree.children) {
      combinedBomTree.children.push(bomTree);
    }
  }

  const netRequirements = await calculateNetRequirements(conn, workOrderIds, warehouseId);

  const plannedOrders = await generatePlannedOrders(conn, workOrderIds, warehouseId);

  let purchaseRequests: { request_no: string; item_count: number }[] | undefined;
  if (autoGeneratePR && plannedOrders.length > 0) {
    purchaseRequests = await generatePurchaseRequestsFromMRP(
      conn,
      plannedOrders,
      operatorId,
      operatorName
    );
  }

  const totalShortages = netRequirements.filter((r) => r.shortage_warning).length;

  let totalPlannedAmount = 0;
  for (const order of plannedOrders) {
    const priceRows: Loose = await conn.query(
      `SELECT purchase_price FROM inv_material WHERE id = ? AND deleted = 0`,
      [order.material_id]
    );
    const price = priceRows.length > 0 ? Number(priceRows[0].purchase_price || 0) : 0;
    totalPlannedAmount += order.quantity * price;
  }

  return {
    bom_tree: combinedBomTree,
    net_requirements: netRequirements,
    planned_orders: plannedOrders,
    purchase_requests: purchaseRequests,
    summary: {
      total_materials: netRequirements.length,
      total_shortages: totalShortages,
      total_planned_qty:
        Math.round(plannedOrders.reduce((sum, o) => sum + o.quantity, 0) * 10000) / 10000,
      total_planned_amount: Math.round(totalPlannedAmount * 100) / 100,
    },
  };
}
