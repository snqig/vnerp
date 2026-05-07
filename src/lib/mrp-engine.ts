import { query, execute, transaction } from '@/lib/db';
import { generateDocumentNo } from '@/lib/document-numbering';

export interface BOMNode {
  material_id: number;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  level: number;
  path: string;
  is_leaf: boolean;
  lead_time_days: number;
  scrap_rate: number;
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
  product_id: number;
  product_code: string;
  product_name: string;
  version: string;
  status: number;
  base_qty: number;
}

interface BOMLineRow {
  id: number;
  bom_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_spec: string | null;
  unit: string;
  consumption_qty: number;
  loss_rate: number;
  material_type: string;
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

export async function explodeBOM(
  conn: any,
  productId: number,
  quantity: number,
  maxDepth: number = 10
): Promise<BOMNode> {
  const productRows: any = await conn.query(
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

  const leadTimeRows: any = await conn.query(
    `SELECT id, lead_time_days FROM inv_material WHERE id = ? AND deleted = 0`,
    [productId]
  );
  const rootLeadTime = leadTimeRows.length > 0 ? Number(leadTimeRows[0].lead_time_days || 7) : 7;

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
      `SELECT id, product_id, product_code, product_name, version, status, base_qty
       FROM bom_header
       WHERE product_id = ? AND status = 30 AND deleted = 0
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
      `SELECT id, bom_id, material_id, material_code, material_name, material_spec,
              unit, consumption_qty, loss_rate, material_type
       FROM bom_line
       WHERE bom_id = ?
       ORDER BY line_no`,
      [bom.id]
    );

    for (const line of lines) {
      const scrapRate = Number(line.loss_rate || 0) / 100;
      const grossQty = item.parent_qty * Number(line.consumption_qty) * (1 + scrapRate);

      const childPath = `${item.path}>${line.material_id}`;

      const childCircularKey = `${line.material_id}:${childPath}`;

      const matInfoRows: any = await conn.query(
        `SELECT id, lead_time_days FROM inv_material WHERE id = ? AND deleted = 0`,
        [line.material_id]
      );
      const childLeadTime = matInfoRows.length > 0 ? Number(matInfoRows[0].lead_time_days || 7) : 7;

      const childNode: BOMNode = {
        material_id: line.material_id,
        material_code: line.material_code,
        material_name: line.material_name,
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
          material_code: line.material_code,
          material_name: line.material_name,
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

export interface TimeBucket {
  date: string;
  gross_requirement: number;
  scheduled_receipt: number;
  on_hand: number;
  net_requirement: number;
  planned_order_release: number;
  planned_order_receipt: number;
}

export async function calculateTimeBuckets(
  conn: any,
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

  const matInfoRows: any = await conn.query(
    `SELECT id, lead_time_days FROM inv_material WHERE id = ? AND deleted = 0`,
    [materialId]
  );
  const leadTimeDays = matInfoRows.length > 0 ? Number(matInfoRows[0].lead_time_days || 7) : 7;

  const invRows: any = await conn.query(
    `SELECT COALESCE(SUM(available_qty), 0) as total_available
     FROM inv_inventory
     WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
    [materialId, warehouseId]
  );
  const currentOnHand = Number(invRows.length > 0 ? invRows[0].total_available : 0);

  const requirementRows: any = await conn.query(
    `SELECT
       DATE(bl.create_time) as req_date,
       COALESCE(SUM(bl.consumption_qty * wo.plan_qty * (1 + bl.loss_rate / 100)), 0) as total_req
     FROM prod_work_order wo
     INNER JOIN bom_header bh ON bh.product_id = wo.material_id AND bh.status = 30 AND bh.deleted = 0
     INNER JOIN bom_line bl ON bl.bom_id = bh.id AND bl.material_id = ?
     WHERE wo.deleted = 0
       AND wo.status IN (10, 20, 30)
       AND wo.plan_start_date IS NOT NULL
       AND wo.plan_start_date >= ?
       AND wo.plan_start_date <= ?
     GROUP BY DATE(wo.plan_start_date)`,
    [materialId, startDate, endDate]
  );

  const requirementMap = new Map<string, number>();
  for (const row of requirementRows) {
    const dateStr = typeof row.req_date === 'string' ? row.req_date.substring(0, 10) : String(row.req_date).substring(0, 10);
    requirementMap.set(dateStr, Number(row.total_req));
  }

  const receiptRows: any = await conn.query(
    `SELECT
       DATE(po.expected_date) as receipt_date,
       COALESCE(SUM(pol.order_qty - pol.received_qty), 0) as total_receipt
     FROM pur_purchase_order po
     INNER JOIN pur_purchase_order_line pol ON pol.po_id = po.id
     WHERE pol.material_id = ?
       AND po.deleted = 0
       AND po.status IN (1, 2, 3, 5)
       AND po.expected_date IS NOT NULL
       AND po.expected_date >= ?
       AND po.expected_date <= ?
       AND pol.order_qty > pol.received_qty
     GROUP BY DATE(po.expected_date)`,
    [materialId, startDate, endDate]
  );

  const receiptMap = new Map<string, number>();
  for (const row of receiptRows) {
    const dateStr = typeof row.receipt_date === 'string' ? row.receipt_date.substring(0, 10) : String(row.receipt_date).substring(0, 10);
    receiptMap.set(dateStr, Number(row.total_receipt));
  }

  const result: TimeBucket[] = [];
  let runningOnHand = currentOnHand;

  for (const bucket of buckets) {
    let grossReq = 0;
    let schedReceipt = 0;

    for (const d of bucket.dates) {
      const dStr = formatDateStr(d);
      grossReq += requirementMap.get(dStr) || 0;
      schedReceipt += receiptMap.get(dStr) || 0;
    }

    const onHand = Math.max(0, runningOnHand + schedReceipt - grossReq);
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
    case 'day': return 1;
    case 'week': return 7;
    case 'month': return 30;
  }
}

interface BucketDates {
  label: string;
  dates: Date[];
}

function generateBucketDates(startDate: string, endDate: string, bucketSize: 'day' | 'week' | 'month'): BucketDates[] {
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

export async function calculateNetRequirements(
  conn: any,
  workOrderIds: number[],
  warehouseId: number
): Promise<NetRequirement[]> {
  if (!workOrderIds || workOrderIds.length === 0) {
    return [];
  }

  const placeholders = workOrderIds.map(() => '?').join(',');

  const workOrders: any = await conn.query(
    `SELECT id, work_order_no, material_id, plan_qty, plan_start_date, bom_id
     FROM prod_work_order
     WHERE id IN (${placeholders}) AND deleted = 0`,
    workOrderIds
  );

  if (!workOrders || workOrders.length === 0) {
    return [];
  }

  const materialRequirements = new Map<number, {
    total_qty: number;
    unit: string;
    material_code: string;
    material_name: string;
    earliest_start_date: string;
    work_order_ids: number[];
  }>();

  for (const wo of workOrders) {
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
          earliest_start_date: wo.plan_start_date ? wo.plan_start_date.substring(0, 10) : formatDateStr(new Date()),
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
    const invRows: any = await conn.query(
      `SELECT COALESCE(SUM(available_qty), 0) as total_available
       FROM inv_inventory
       WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
      [materialId, warehouseId]
    );
    const onHandQty = Number(invRows.length > 0 ? invRows[0].total_available : 0);

    const allocatedRows: any = await conn.query(
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

    const inTransitRows: any = await conn.query(
      `SELECT COALESCE(SUM(pol.order_qty - pol.received_qty), 0) as total_in_transit
       FROM pur_purchase_order_line pol
       INNER JOIN pur_purchase_order po ON po.id = pol.po_id
       WHERE pol.material_id = ?
         AND po.deleted = 0
         AND po.status IN (3, 5)
         AND pol.order_qty > pol.received_qty`,
      [materialId]
    );
    const inTransitQty = Number(inTransitRows.length > 0 ? inTransitRows[0].total_in_transit : 0);

    const matInfoRows: any = await conn.query(
      `SELECT id, material_code, material_name, unit, safety_stock, purchase_price, lead_time_days
       FROM inv_material WHERE id = ? AND deleted = 0`,
      [materialId]
    );

    let safetyStock = 0;
    let leadTimeDays = 7;
    let materialCode = req.material_code;
    let materialName = req.material_name;
    let unit = req.unit;

    if (matInfoRows && matInfoRows.length > 0) {
      const matInfo = matInfoRows[0];
      safetyStock = Number(matInfo.safety_stock || 0);
      leadTimeDays = Number(matInfo.lead_time_days || 7);
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

function collectLeafMaterials(node: BOMNode): Array<{ material_id: number; material_code: string; material_name: string; quantity: number; unit: string }> {
  const leaves: Array<{ material_id: number; material_code: string; material_name: string; quantity: number; unit: string }> = [];

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

export async function generatePlannedOrders(
  conn: any,
  workOrderIds: number[],
  warehouseId: number
): Promise<PlannedOrder[]> {
  const netRequirements = await calculateNetRequirements(conn, workOrderIds, warehouseId);

  const positiveReqs = netRequirements.filter(r => r.net_requirement > 0);

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
        .filter(r => r.material_id === req.material_id)
        .flatMap(r => {
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

export async function generatePurchaseRequestsFromMRP(
  conn: any,
  plannedOrders: PlannedOrder[],
  operatorId: number | null,
  operatorName: string
): Promise<{ request_no: string; item_count: number }[]> {
  if (!plannedOrders || plannedOrders.length === 0) {
    return [];
  }

  const materialIds = plannedOrders.map(o => o.material_id);
  const matPlaceholders = materialIds.map(() => '?').join(',');

  const supplierMap = new Map<number | null, PlannedOrder[]>();

  const matSupplierRows: any = await conn.query(
    `SELECT id, material_code, material_name, default_supplier_id
     FROM inv_material
     WHERE id IN (${matPlaceholders}) AND deleted = 0`,
    materialIds
  );

  const matSupplierLookup = new Map<number, number | null>();
  for (const row of matSupplierRows) {
    matSupplierLookup.set(row.id, row.default_supplier_id || null);
  }

  const bomMatRows: any = await conn.query(
    `SELECT id, material_code, default_supplier_id
     FROM bom_material
     WHERE id IN (${matPlaceholders}) AND deleted = 0`,
    materialIds
  );

  for (const row of bomMatRows) {
    if (!matSupplierLookup.has(row.id)) {
      matSupplierLookup.set(row.id, row.default_supplier_id || null);
    }
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
      const suppRows: any = await conn.query(
        `SELECT supplier_name FROM pur_supplier WHERE id = ? AND deleted = 0`,
        [supplierId]
      );
      if (suppRows.length > 0) {
        supplierName = suppRows[0].supplier_name || '';
      }
    }

    const [headerResult]: any = await conn.execute(
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

      const priceRows: any = await conn.query(
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

export async function runFullMRP(
  conn: any,
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
        lead_time_days: 7,
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
  const workOrders: any = await conn.query(
    `SELECT id, material_id, plan_qty FROM prod_work_order WHERE id IN (${placeholders}) AND deleted = 0`,
    workOrderIds
  );

  let combinedBomTree: BOMNode = {
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
    const bomTree = await explodeBOM(conn, wo.material_id, Number(wo.plan_qty || 0));
    if (combinedBomTree.children) {
      combinedBomTree.children.push(bomTree);
    }
  }

  const netRequirements = await calculateNetRequirements(conn, workOrderIds, warehouseId);

  const plannedOrders = await generatePlannedOrders(conn, workOrderIds, warehouseId);

  let purchaseRequests: { request_no: string; item_count: number }[] | undefined;
  if (autoGeneratePR && plannedOrders.length > 0) {
    purchaseRequests = await generatePurchaseRequestsFromMRP(conn, plannedOrders, operatorId, operatorName);
  }

  const totalShortages = netRequirements.filter(r => r.shortage_warning).length;

  let totalPlannedAmount = 0;
  for (const order of plannedOrders) {
    const priceRows: any = await conn.query(
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
      total_planned_qty: Math.round(plannedOrders.reduce((sum, o) => sum + o.quantity, 0) * 10000) / 10000,
      total_planned_amount: Math.round(totalPlannedAmount * 100) / 100,
    },
  };
}
