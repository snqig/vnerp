import { execute, transaction } from '@/lib/db';
import { logger, secureLog } from '@/lib/logger';
import { Tool } from '@/domain/dcprint/aggregates/Tool';
import { ToolStatus } from '@/domain/dcprint/value-objects/ToolStatus';
import { IToolRepository } from '@/domain/dcprint/repositories/IToolRepository';
import {
  ToolWarningTriggeredEvent,
  ToolScrappedEvent,
  ToolCreatedEvent,
  ToolActivatedEvent,
  ToolMaintenanceStartedEvent,
  ToolMaintenanceCompletedEvent,
} from '@/domain/dcprint/events/ToolEvents';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';

export interface ToolListItem {
  id: number;
  tool_type: number;
  tool_code: string;
  tool_name: string;
  spec: string | null;
  material_id: number | null;
  total_life: number;
  warning_threshold: number;
  used_count: number;
  remain_life: number;
  original_cost: string;
  accumulated_cost: string;
  net_value: string;
  unit_cost: string;
  status: number;
  manufacture_date: string | null;
  warehouse_location: string | null;
  // 体系B 字段
  asset_type: string | null;
  layout_type: string | null;
  pieces_per_impression: number | null;
  material: string | null;
  qr_code: string | null;
  supplier_id: number | null;
  maintenance_interval: number | null;
  maintenance_count: number | null;
  last_maintenance_date: string | null;
  last_maintenance_impressions: number | null;
  last_used_date: string | null;
  // 体系C 字段
  mesh_count: string | null;
  mesh_material: string | null;
  size: string | null;
  tension_value: number | null;
  frame_type: string | null;
  customer_id: number | null;
  reclaim_count: number | null;
  exposure_date: string | null;
  last_clean_date: string | null;
  last_reclaim_date: string | null;
  tension_date: string | null;
  remark: string | null;
  create_time: string;
  update_time: string;
}

export interface ToolUsageRecord {
  id: number;
  tool_id: number;
  work_order_id: number | null;
  work_order_no: string | null;
  process_name: string | null;
  use_count: number;
  amortized_cost: string;
  operator_name: string | null;
  use_time: string;
}

export interface ToolMaintenanceRecord {
  id: number;
  tool_id: number;
  maintenance_type: number;
  maintenance_cost: string;
  description: string | null;
  life_before: number;
  life_after: number;
  life_adjustment: number;
  status: number;
  start_time: string;
  end_time: string | null;
  operator_name: string | null;
  remark: string | null;
}

function toolToRow(tool: Tool): ToolListItem {
  return {
    id: tool.id!,
    tool_type: tool.toolType,
    tool_code: tool.toolCode,
    tool_name: tool.toolName,
    spec: tool.spec ?? null,
    material_id: tool.materialId ?? null,
    total_life: tool.totalLife,
    warning_threshold: tool.warningThreshold,
    used_count: tool.usedCount,
    remain_life: tool.remainLife,
    original_cost: String(tool.originalCost),
    accumulated_cost: String(tool.accumulatedCost),
    net_value: String(tool.netValue),
    unit_cost: String(tool.unitCost),
    status: tool.status,
    manufacture_date: tool.manufactureDate ?? null,
    warehouse_location: tool.warehouseLocation ?? null,
    asset_type: tool.assetType ?? null,
    layout_type: tool.layoutType ?? null,
    pieces_per_impression: tool.piecesPerImpression ?? null,
    material: tool.material ?? null,
    qr_code: tool.qrCode ?? null,
    supplier_id: tool.supplierId ?? null,
    maintenance_interval: tool.maintenanceInterval ?? null,
    maintenance_count: tool.maintenanceCount ?? null,
    last_maintenance_date: tool.lastMaintenanceDate ?? null,
    last_maintenance_impressions: tool.lastMaintenanceImpressions ?? null,
    last_used_date: tool.lastUsedDate ?? null,
    mesh_count: tool.meshCount ?? null,
    mesh_material: tool.meshMaterial ?? null,
    size: tool.size ?? null,
    tension_value: tool.tensionValue ?? null,
    frame_type: tool.frameType ?? null,
    customer_id: tool.customerId ?? null,
    reclaim_count: tool.reclaimCount ?? null,
    exposure_date: tool.exposureDate ?? null,
    last_clean_date: tool.lastCleanDate ?? null,
    last_reclaim_date: tool.lastReclaimDate ?? null,
    tension_date: tool.tensionDate ?? null,
    remark: tool.remark ?? null,
    create_time: tool.createTime ?? '',
    update_time: tool.updateTime ?? '',
  };
}

export class ToolManagementService {
  constructor(private readonly toolRepo: IToolRepository) {}

  async listTools(params: {
    toolType?: number;
    status?: number;
    keyword?: string;
    page: number;
    pageSize: number;
  }): Promise<{ list: ToolListItem[]; total: number }> {
    const result = await this.toolRepo.findList(params);
    return {
      list: result.list.map(toolToRow),
      total: result.total,
    };
  }

  async getToolDetail(id: number): Promise<ToolListItem | null> {
    const tool = await this.toolRepo.findById(id);
    return tool ? toolToRow(tool) : null;
  }

  async createTool(input: {
    toolType: number;
    toolCode: string;
    toolName: string;
    spec?: string;
    materialId?: number;
    totalLife: number;
    warningThreshold: number;
    originalCost: number;
    manufactureDate?: string;
    warehouseLocation?: string;
    assetType?: string;
    layoutType?: string;
    piecesPerImpression?: number;
    material?: string;
    qrCode?: string;
    supplierId?: number;
    maintenanceInterval?: number;
    meshCount?: string;
    meshMaterial?: string;
    size?: string;
    tensionValue?: number;
    frameType?: string;
    customerId?: number;
    remark?: string;
  }): Promise<number> {
    const exists = await this.toolRepo.existsByCode(input.toolCode);
    if (exists) {
      throw new Error(`Tool code ${input.toolCode} already exists`);
    }

    const tool = Tool.create(input);
    const toolId = await this.toolRepo.save(tool);

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'Tool', toolId, [
        new ToolCreatedEvent({
          toolId,
          toolCode: input.toolCode,
          toolType: input.toolType,
          toolName: input.toolName,
          totalLife: input.totalLife,
          originalCost: input.originalCost,
        }),
      ]);
    });

    return toolId;
  }

  async updateTool(
    id: number,
    input: Partial<{
      toolName: string;
      spec: string;
      materialId: number;
      totalLife: number;
      warningThreshold: number;
      manufactureDate: string;
      warehouseLocation: string;
      assetType: string;
      layoutType: string;
      piecesPerImpression: number;
      material: string;
      qrCode: string;
      supplierId: number;
      maintenanceInterval: number;
      meshCount: string;
      meshMaterial: string;
      size: string;
      tensionValue: number;
      frameType: string;
      customerId: number;
      remark: string;
    }>
  ): Promise<void> {
    await this.toolRepo.updateBasicInfo(id, input);
  }

  async deleteTool(id: number): Promise<void> {
    await this.toolRepo.softDelete(id);
  }

  async activateTool(id: number): Promise<void> {
    const tool = await this.toolRepo.findById(id);
    if (!tool) throw new Error('Tool not found');
    tool.activate();
    await this.toolRepo.update(tool);

    await transaction(async (conn) => {
      await getDomainEventOutbox().saveEvents(conn, 'Tool', id, [
        new ToolActivatedEvent({
          toolId: id,
          toolCode: tool.toolCode,
          toolType: tool.toolType,
          toolName: tool.toolName,
          totalLife: tool.totalLife,
        }),
      ]);
    });
  }

  async recordUsage(input: {
    toolId: number;
    workOrderId?: number;
    workOrderNo?: string;
    processId?: number;
    processName?: string;
    useCount: number;
    operatorId?: number;
    operatorName?: string;
    useTime?: string;
    remark?: string;
  }): Promise<void> {
    const ctx = { module: 'tool', action: 'recordUsage', toolId: input.toolId };
    let phase = 'init';
    try {
      await transaction(async (conn) => {
        phase = 'load_tool';
        const rows = await conn.execute(
          'SELECT * FROM dcprint_tool WHERE id = ? AND deleted = 0 FOR UPDATE',
          [input.toolId]
        );
        const toolRows = (rows as unknown[])[0] as Record<string, unknown>[];
        if (toolRows.length === 0) {
          logger.warn(ctx, `Tool not found`, { toolId: input.toolId });
          throw new Error('Tool not found');
        }
        const tool = Tool.fromRow(toolRows[0]);

        phase = 'record_usage';
        const usageResult = tool.recordUsage(input.useCount);

        logger.info(ctx, `寿命与成本计算`, {
          toolType: tool.toolType,
          toolCode: tool.toolCode,
          delta: { useCount: input.useCount, amortizedCost: usageResult.amortizedCost },
          result: usageResult,
        });

        phase = 'persist_tool';
        await conn.execute(
          `UPDATE dcprint_tool
           SET used_count = ?, remain_life = ?, accumulated_cost = ?, net_value = ?, status = ?
           WHERE id = ?`,
          [
            usageResult.newUsedCount,
            usageResult.newRemainLife,
            usageResult.newAccumulatedCost,
            usageResult.newNetValue,
            usageResult.newStatus,
            input.toolId,
          ]
        );

        phase = 'persist_usage';
        await conn.execute(
          `INSERT INTO dcprint_tool_usage
           (tool_id, work_order_id, work_order_no, process_id, process_name, use_count,
            operator_id, operator_name, amortized_cost, use_time, remark)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            input.toolId,
            input.workOrderId || null,
            input.workOrderNo || null,
            input.processId || null,
            input.processName || null,
            input.useCount,
            input.operatorId || null,
            input.operatorName || null,
            usageResult.amortizedCost,
            input.useTime || new Date(),
            input.remark || null,
          ]
        );

        logger.info(ctx, `报工记录已写入`, {
          toolType: tool.toolType,
          workOrderNo: input.workOrderNo,
          amortizedCost: usageResult.amortizedCost,
          newStatus: usageResult.newStatus,
        });

        phase = 'emit_events';
        if (usageResult.shouldWarn) {
          await getDomainEventOutbox().saveEvents(conn, 'Tool', input.toolId, [
            new ToolWarningTriggeredEvent({
              toolId: input.toolId,
              toolCode: tool.toolCode,
              toolType: tool.toolType,
              usedCount: usageResult.newUsedCount,
              warningThreshold: tool.warningThreshold,
              totalLife: tool.totalLife,
              remainLife: usageResult.newRemainLife,
            }),
          ]);
        }

        if (usageResult.isEndOfLife) {
          await getDomainEventOutbox().saveEvents(conn, 'Tool', input.toolId, [
            new ToolScrappedEvent({
              toolId: input.toolId,
              toolCode: tool.toolCode,
              toolType: tool.toolType,
              usedCount: usageResult.newUsedCount,
              remainLife: usageResult.newRemainLife,
              netValue: usageResult.newNetValue,
              scrapReason: '寿命耗尽自动报废',
            }),
          ]);
          secureLog('warn', 'Tool reached end of life, auto-scrapped', {
            toolId: input.toolId,
            usedCount: usageResult.newUsedCount,
          });
        }
      });
    } catch (err) {
      logger.error(ctx, `recordUsage 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        input,
      });
      throw err;
    }
  }

  async startMaintenance(input: {
    toolId: number;
    maintenanceType?: number;
    description?: string;
    operatorId?: number;
    operatorName?: string;
    remark?: string;
  }): Promise<number> {
    const ctx = { module: 'tool', action: 'startMaintenance', toolId: input.toolId };
    let phase = 'init';
    try {
      return await transaction(async (conn) => {
        phase = 'load_tool';
        const rows = await conn.execute(
          'SELECT * FROM dcprint_tool WHERE id = ? AND deleted = 0 FOR UPDATE',
          [input.toolId]
        );
        const toolRows = (rows as unknown[])[0] as Record<string, unknown>[];
        if (toolRows.length === 0) {
          logger.warn(ctx, `Tool not found`, { toolId: input.toolId });
          throw new Error('Tool not found');
        }
        const tool = Tool.fromRow(toolRows[0]);

        phase = 'validate_status';
        tool.startMaintenance();

        phase = 'persist_status';
        await conn.execute('UPDATE dcprint_tool SET status = 3 WHERE id = ?', [input.toolId]);

        phase = 'persist_maintenance';
        const [result] = (await conn.execute(
          `INSERT INTO dcprint_tool_maintenance
           (tool_id, maintenance_type, maintenance_cost, description, life_before, life_after,
            life_adjustment, status, start_time, operator_id, operator_name, remark)
           VALUES (?, ?, 0, ?, ?, 0, 0, 1, NOW(), ?, ?, ?)`,
          [
            input.toolId,
            input.maintenanceType || 1,
            input.description || null,
            tool.remainLife,
            input.operatorId || null,
            input.operatorName || null,
            input.remark || null,
          ]
        )) as unknown as [{ insertId: number }, unknown];

        logger.info(ctx, `维修记录已创建`, {
          maintenanceId: result.insertId,
          lifeBefore: tool.remainLife,
        });

        await getDomainEventOutbox().saveEvents(conn, 'Tool', input.toolId, [
          new ToolMaintenanceStartedEvent({
            toolId: input.toolId,
            toolCode: tool.toolCode,
            toolType: tool.toolType,
            maintenanceId: result.insertId,
            maintenanceType: input.maintenanceType || 1,
            remainLife: tool.remainLife,
          }),
        ]);

        return result.insertId;
      });
    } catch (err) {
      logger.error(ctx, `startMaintenance 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        input,
      });
      throw err;
    }
  }

  async completeMaintenance(input: {
    maintenanceId: number;
    maintenanceCost: number;
    lifeAfter: number;
    description?: string;
  }): Promise<void> {
    const ctx = {
      module: 'tool',
      action: 'completeMaintenance',
      maintenanceId: input.maintenanceId,
    };
    let phase = 'init';
    try {
      await transaction(async (conn) => {
        phase = 'load_maintenance';
        const mRows = await conn.execute(
          'SELECT * FROM dcprint_tool_maintenance WHERE id = ? AND status = 1 FOR UPDATE',
          [input.maintenanceId]
        );
        const maintenanceRows = (mRows as unknown[])[0] as Record<string, unknown>[];
        if (maintenanceRows.length === 0) {
          logger.warn(ctx, `Maintenance record not found or already completed`, {
            maintenanceId: input.maintenanceId,
          });
          throw new Error('Maintenance record not found or already completed');
        }
        const m = maintenanceRows[0];

        phase = 'load_tool';
        const tRows = await conn.execute(
          'SELECT * FROM dcprint_tool WHERE id = ? AND deleted = 0 FOR UPDATE',
          [m.tool_id as number]
        );
        const toolRows = (tRows as unknown[])[0] as Record<string, unknown>[];
        if (toolRows.length === 0) {
          logger.warn(ctx, `Tool not found during maintenance completion`, {
            toolId: m.tool_id,
          });
          throw new Error('Tool not found');
        }
        const tool = Tool.fromRow(toolRows[0]);

        phase = 'compute_cost';
        const lifeAdjustment = input.lifeAfter - (m.life_before as number);
        tool.completeMaintenance(input.maintenanceCost, input.lifeAfter);

        logger.info(ctx, `维修后成本重算`, {
          toolId: m.tool_id,
          toolType: tool.toolType,
          toolCode: tool.toolCode,
          lifeAdjustment,
          maintenanceCost: input.maintenanceCost,
        });

        phase = 'persist_tool';
        await conn.execute(
          `UPDATE dcprint_tool
           SET remain_life = ?, net_value = ?, original_cost = ?, unit_cost = ?, status = ?
           WHERE id = ?`,
          [
            tool.remainLife,
            tool.netValue,
            tool.originalCost,
            tool.unitCost,
            tool.status,
            m.tool_id as number,
          ]
        );

        phase = 'persist_maintenance';
        await conn.execute(
          `UPDATE dcprint_tool_maintenance
           SET maintenance_cost = ?, life_after = ?, life_adjustment = ?,
               description = COALESCE(?, description),
               status = 2, end_time = NOW()
           WHERE id = ?`,
          [
            input.maintenanceCost,
            input.lifeAfter,
            lifeAdjustment,
            input.description || null,
            input.maintenanceId,
          ]
        );

        logger.info(ctx, `维修完成`, {
          toolId: m.tool_id,
          toolType: tool.toolType,
          newStatus: tool.status,
          lifeAdjustment,
        });

        if (tool.status === ToolStatus.WARNING) {
          logger.info(ctx, `维修后仍达预警阈值 → status=4`, {
            toolId: m.tool_id,
            toolCode: tool.toolCode,
            usedCount: tool.usedCount,
            warningThreshold: tool.warningThreshold,
          });
        }

        await getDomainEventOutbox().saveEvents(conn, 'Tool', m.tool_id as number, [
          new ToolMaintenanceCompletedEvent({
            toolId: m.tool_id as number,
            toolCode: tool.toolCode,
            toolType: tool.toolType,
            maintenanceId: input.maintenanceId,
            maintenanceCost: input.maintenanceCost,
            lifeAdjustment,
            newRemainLife: tool.remainLife,
            newStatus: tool.status,
          }),
        ]);
      });
    } catch (err) {
      logger.error(ctx, `completeMaintenance 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        input,
      });
      throw err;
    }
  }

  async scrapTool(input: { toolId: number; scrapReason: string; scrapBy: number }): Promise<void> {
    const ctx = { module: 'tool', action: 'scrapTool', toolId: input.toolId };
    let phase = 'init';
    try {
      await transaction(async (conn) => {
        phase = 'load_tool';
        const rows = await conn.execute(
          'SELECT * FROM dcprint_tool WHERE id = ? AND deleted = 0 FOR UPDATE',
          [input.toolId]
        );
        const toolRows = (rows as unknown[])[0] as Record<string, unknown>[];
        if (toolRows.length === 0) {
          logger.warn(ctx, `Tool not found`, { toolId: input.toolId });
          throw new Error('Tool not found');
        }
        const tool = Tool.fromRow(toolRows[0]);

        phase = 'validate_status';
        tool.scrap(input.scrapReason, input.scrapBy);

        logger.info(ctx, `手动报废`, {
          toolType: tool.toolType,
          toolCode: tool.toolCode,
          scrapReason: input.scrapReason,
        });

        phase = 'persist';
        await conn.execute(
          `UPDATE dcprint_tool
           SET status = 5, scrap_reason = ?, scrap_time = NOW(), scrap_by = ?
           WHERE id = ?`,
          [input.scrapReason, input.scrapBy, input.toolId]
        );

        phase = 'emit_events';
        await getDomainEventOutbox().saveEvents(conn, 'Tool', input.toolId, [
          new ToolScrappedEvent({
            toolId: input.toolId,
            toolCode: tool.toolCode,
            toolType: tool.toolType,
            usedCount: tool.usedCount,
            remainLife: tool.remainLife,
            netValue: tool.netValue,
            scrapReason: input.scrapReason,
            scrapBy: input.scrapBy,
          }),
        ]);

        secureLog('warn', 'Tool manually scrapped', {
          toolId: input.toolId,
          toolCode: tool.toolCode,
          scrapReason: input.scrapReason,
          scrapBy: input.scrapBy,
        });
      });
    } catch (err) {
      logger.error(ctx, `scrapTool 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        input,
      });
      throw err;
    }
  }

  async listUsageRecords(toolId: number): Promise<ToolUsageRecord[]> {
    const rows = await execute(
      'SELECT * FROM dcprint_tool_usage WHERE tool_id = ? ORDER BY use_time DESC LIMIT 100',
      [toolId]
    );
    return rows as unknown as ToolUsageRecord[];
  }

  async listMaintenanceRecords(toolId: number): Promise<ToolMaintenanceRecord[]> {
    const rows = await execute(
      'SELECT * FROM dcprint_tool_maintenance WHERE tool_id = ? ORDER BY create_time DESC LIMIT 50',
      [toolId]
    );
    return rows as unknown as ToolMaintenanceRecord[];
  }

  async getDashboard(): Promise<{
    totalTools: number;
    activeTools: number;
    warningTools: number;
    maintenanceTools: number;
    scrappedTools: number;
    totalNetValue: number;
  }> {
    const stats = await this.toolRepo.countByStatus();
    return {
      totalTools: stats.total,
      activeTools: stats.active,
      warningTools: stats.warning,
      maintenanceTools: stats.maintenance,
      scrappedTools: stats.scrapped,
      totalNetValue: stats.totalNetValue,
    };
  }
}
