import { DomainError } from '@/domain/shared/DomainTypes';

type MappingTable = Record<string, string>;

export class FieldMapper {
  static readonly DB_TO_DOMAIN: MappingTable = {
    template_code: 'templateCode',
    template_name: 'templateName',
    asset_type: 'assetType',
    layout_type: 'layoutType',
    pieces_per_impression: 'piecesPerImpression',
    template_type: 'templateType',
    specification: 'specification',
    material: 'material',
    max_usage: 'maxUsage',
    current_usage: 'currentUsage',
    remaining_usage: 'remainingUsage',
    warning_usage: 'warningUsage',
    max_impressions: 'maxImpressions',
    cumulative_impressions: 'cumulativeImpressions',
    cum_after: 'cumulativeImpressions',
    cumulative_after: 'cumulativeImpressions',
    warning_threshold: 'warningThreshold',
    maintenance_interval: 'maintenanceInterval',
    maintenance_count: 'maintenanceCount',
    maintenance_due_count: 'maintenanceDueCount',
    last_maintenance_date: 'lastMaintenanceDate',
    last_maintenance_impressions: 'lastMaintenanceImpressions',
    last_used_date: 'lastUsedDate',
    storage_location: 'storageLocation',
    purchase_date: 'purchaseDate',
    unit_price: 'unitPrice',
    qr_code: 'qrCode',
    supplier_id: 'supplierId',
    die_status: 'dieStatus',
    die_code: 'dieCode',
    die_name: 'dieName',
    die_id: 'dieId',
    work_report_id: 'workReportId',
    work_order_no: 'workOrderNo',
    process_name: 'processName',
    operator_id: 'operatorId',
    operator_name: 'operatorName',
    equipment_id: 'equipmentId',
    usage_date: 'usageDate',
    impressions_before: 'impressionsBefore',
    impressions_after: 'impressionsAfter',
    maintenance_no: 'maintenanceNo',
    maintenance_type: 'maintenanceType',
    technician_id: 'technicianId',
    technician_name: 'technicianName',
    original_cost: 'originalCost',
    accumulated_cost: 'accumulatedCost',
    net_value: 'netValue',
    unit_cost: 'unitCost',
    total_life: 'totalLife',
    used_count: 'usedCount',
    remain_life: 'remainLife',
    manufacture_date: 'manufactureDate',
    warehouse_location: 'warehouseLocation',
    tool_type: 'toolType',
    tool_code: 'toolCode',
    tool_name: 'toolName',
    scrap_reason: 'scrapReason',
    scrap_time: 'scrapTime',
    scrap_by: 'scrapBy',
    mesh_count: 'meshCount',
    mesh_material: 'meshMaterial',
    size_spec: 'sizeSpec',
    tension_value: 'tensionValue',
    frame_type: 'frameType',
    reclaim_count: 'reclaimCount',
    exposure_date: 'exposureDate',
    last_clean_date: 'lastCleanDate',
    last_reclaim_date: 'lastReclaimDate',
    tension_date: 'tensionDate',
    plate_code: 'plateCode',
    plate_name: 'plateName',
    plate_type: 'plateType',
    max_use_count: 'maxUseCount',
    remaining_count: 'remainingCount',
    maintenance_days: 'maintenanceDays',
    next_maintenance_date: 'nextMaintenanceDate',
    card_no: 'cardNo',
    product_code: 'productCode',
    product_name: 'productName',
    material_spec: 'materialSpec',
    work_order_date: 'workOrderDate',
    plan_qty: 'planQty',
    burdening_status: 'burdeningStatus',
    lock_status: 'lockStatus',
    create_user_id: 'createUserId',
    create_user_name: 'createUserName',
    main_label_id: 'mainLabelId',
    main_label_no: 'mainLabelNo',
    trace_no: 'traceNo',
    trace_type: 'traceType',
    batch_no: 'batchNo',
    supplier_name: 'supplierName',
    receive_date: 'receiveDate',
    ink_code: 'inkCode',
    ink_name: 'inkName',
    base_color: 'baseColor',
    mixed_percentage: 'mixedPercentage',
    used_quantity: 'usedQuantity',
    remaining_quantity: 'remainingQuantity',
    total_count: 'totalCount',
    available_count: 'availableCount',
    warning_count: 'warningCount',
    locked_count: 'lockedCount',
    scrap_count: 'scrapCount',
    unique_dies_used: 'uniqueDiesUsed',
    unique_work_orders: 'uniqueWorkOrders',
    total_records: 'totalRecords',
    total_impressions: 'totalImpressions',
    avg_usage_pct: 'avgUsagePct',
    maintenance_needed_count: 'maintenanceNeededCount',
    re_rule_needed_count: 'reRuleNeededCount',
  };

  static readonly DOMAIN_TO_DB: MappingTable = Object.fromEntries(
    Object.entries(FieldMapper.DB_TO_DOMAIN).map(([db, domain]) => [domain, db])
  );

  static toDomain<T extends Record<string, unknown>>(dbRow: Record<string, unknown>): T {
    const result: Record<string, unknown> = {};
    for (const [dbKey, value] of Object.entries(dbRow)) {
      const domainKey = FieldMapper.DB_TO_DOMAIN[dbKey];
      result[domainKey || dbKey] = value;
    }
    return result as T;
  }

  static toDb<T extends Record<string, unknown>>(domainObj: Record<string, unknown>): T {
    const result: Record<string, unknown> = {};
    for (const [domainKey, value] of Object.entries(domainObj)) {
      const dbKey = FieldMapper.DOMAIN_TO_DB[domainKey];
      result[dbKey || domainKey] = value;
    }
    return result as T;
  }

  static normalizeApiResponse<T>(data: unknown): T {
    if (Array.isArray(data)) {
      return data.map((item) => FieldMapper.toDomain(item as Record<string, unknown>)) as T;
    }
    if (data !== null && typeof data === 'object') {
      return FieldMapper.toDomain(data as Record<string, unknown>) as T;
    }
    return data as T;
  }
}

export function assertField(
  value: unknown,
  name: string
): asserts value is NonNullable<typeof value> {
  if (value === undefined || value === null || value === '') {
    throw new DomainError(`${name} 不能为空`);
  }
}

export function assertPositive(value: number, name: string): void {
  if (value <= 0) {
    throw new DomainError(`${name} 必须大于 0`);
  }
}

export function assertMaxUsage(current: number, max: number): void {
  if (current > max) {
    throw new DomainError(`当前使用次数(${current}) 不能超过最大次数(${max})`);
  }
}
