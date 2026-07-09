import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

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

export class ToolManagementService {
  async listTools(params: {
    toolType?: number;
    status?: number;
    keyword?: string;
    page: number;
    pageSize: number;
  }): Promise<{ list: ToolListItem[]; total: number }> {
    const { toolType, status, keyword, page, pageSize } = params;
    let where = 'WHERE is_deleted = 0';
    const args: Loose[] = [];
    if (toolType) {
      where += ' AND tool_type = ?';
      args.push(toolType);
    }
    if (status) {
      where += ' AND status = ?';
      args.push(status);
    }
    if (keyword) {
      where += ' AND (tool_code LIKE ? OR tool_name LIKE ?)';
      args.push('%' + keyword + '%', '%' + keyword + '%');
    }

    const countRows = await query<Loose>(
      `SELECT COUNT(*) as total FROM dcprint_tool ${where}`,
      args
    );
    const total = countRows[0]?.total || 0;

    const offset = (page - 1) * pageSize;
    const list = await query<ToolListItem>(
      `SELECT * FROM dcprint_tool ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset]
    );

    return { list, total };
  }

  async getToolDetail(id: number): Promise<ToolListItem | null> {
    const rows = await query<ToolListItem>(
      'SELECT * FROM dcprint_tool WHERE id = ? AND is_deleted = 0',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
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
    remark?: string;
  }): Promise<number> {
    const unitCost = input.originalCost / input.totalLife;
    return transaction(async (conn) => {
      const [dup]: Loose = await conn.execute(
        'SELECT id FROM dcprint_tool WHERE tool_code = ? AND is_deleted = 0',
        [input.toolCode]
      );
      if (dup.length > 0) {
        throw new Error(`Tool code ${input.toolCode} already exists`);
      }

      const [result]: Loose = await conn.execute(
        `INSERT INTO dcprint_tool
         (tool_type, tool_code, tool_name, spec, material_id, total_life, warning_threshold,
          used_count, remain_life, original_cost, accumulated_cost, net_value, unit_cost,
          status, manufacture_date, warehouse_location, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?, 1, ?, ?, ?, NOW())`,
        [
          input.toolType,
          input.toolCode,
          input.toolName,
          input.spec || null,
          input.materialId || null,
          input.totalLife,
          input.warningThreshold,
          input.totalLife,
          input.originalCost,
          input.originalCost,
          unitCost,
          input.manufactureDate || null,
          input.warehouseLocation || null,
          input.remark || null,
        ]
      );
      return result.insertId;
    });
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
      remark: string;
    }>
  ): Promise<void> {
    const allowed = [
      'toolName',
      'spec',
      'materialId',
      'totalLife',
      'warningThreshold',
      'manufactureDate',
      'warehouseLocation',
      'remark',
    ];
    const colMap: Record<string, string> = {
      toolName: 'tool_name',
      spec: 'spec',
      materialId: 'material_id',
      totalLife: 'total_life',
      warningThreshold: 'warning_threshold',
      manufactureDate: 'manufacture_date',
      warehouseLocation: 'warehouse_location',
      remark: 'remark',
    };

    const sets: string[] = [];
    const args: Loose[] = [];
    for (const key of allowed) {
      if (input[key as keyof typeof input] !== undefined) {
        sets.push(`${colMap[key]} = ?`);
        args.push(input[key as keyof typeof input]);
      }
    }
    if (sets.length === 0) return;

    args.push(id);
    await execute(
      `UPDATE dcprint_tool SET ${sets.join(', ')} WHERE id = ? AND is_deleted = 0`,
      args
    );
  }

  async deleteTool(id: number): Promise<void> {
    await execute('UPDATE dcprint_tool SET is_deleted = 1 WHERE id = ? AND status IN (1, 5)', [id]);
  }

  async activateTool(id: number): Promise<void> {
    const rows = await query<Loose>(
      'SELECT status FROM dcprint_tool WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (rows.length === 0) throw new Error('Tool not found');
    if (rows[0].status !== 1) {
      throw new Error('Only tools in standby (status=1) can be activated');
    }
    await execute('UPDATE dcprint_tool SET status = 2 WHERE id = ?', [id]);
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
    await transaction(async (conn) => {
      const [rows]: Loose = await conn.execute(
        'SELECT * FROM dcprint_tool WHERE id = ? AND is_deleted = 0 FOR UPDATE',
        [input.toolId]
      );
      if (rows.length === 0) throw new Error('Tool not found');
      const tool = rows[0];

      if (![2, 4].includes(tool.status)) {
        throw new Error(
          `Tool in status ${tool.status} cannot be used (only active/warning allowed)`
        );
      }
      if (input.useCount > tool.remain_life) {
        throw new Error(`Use count ${input.useCount} exceeds remaining life ${tool.remain_life}`);
      }

      const newUsedCount = tool.used_count + input.useCount;
      const newRemainLife = tool.total_life - newUsedCount;
      const amortizedCost = Number(tool.unit_cost) * input.useCount;
      const newAccumulatedCost = Number(tool.accumulated_cost) + amortizedCost;
      const newNetValue = Number(tool.original_cost) - newAccumulatedCost;

      let newStatus = tool.status;
      if (newRemainLife <= 0) {
        newStatus = 5;
      } else if (newUsedCount >= tool.warning_threshold) {
        newStatus = 4;
      }

      await conn.execute(
        `UPDATE dcprint_tool
         SET used_count = ?, remain_life = ?, accumulated_cost = ?, net_value = ?, status = ?
         WHERE id = ?`,
        [newUsedCount, newRemainLife, newAccumulatedCost, newNetValue, newStatus, input.toolId]
      );

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
          amortizedCost,
          input.useTime || new Date(),
          input.remark || null,
        ]
      );

      if (newStatus === 5) {
        secureLog('warn', 'Tool reached end of life, auto-scrapped', {
          toolId: input.toolId,
          usedCount: newUsedCount,
        });
      }
    });
  }

  async startMaintenance(input: {
    toolId: number;
    maintenanceType?: number;
    description?: string;
    operatorId?: number;
    operatorName?: string;
    remark?: string;
  }): Promise<number> {
    return transaction(async (conn) => {
      const [rows]: Loose = await conn.execute(
        'SELECT * FROM dcprint_tool WHERE id = ? AND is_deleted = 0 FOR UPDATE',
        [input.toolId]
      );
      if (rows.length === 0) throw new Error('Tool not found');
      const tool = rows[0];
      if (![2, 4].includes(tool.status)) {
        throw new Error('Only active/warning tools can enter maintenance');
      }

      await conn.execute('UPDATE dcprint_tool SET status = 3 WHERE id = ?', [input.toolId]);

      const [result]: Loose = await conn.execute(
        `INSERT INTO dcprint_tool_maintenance
         (tool_id, maintenance_type, maintenance_cost, description, life_before, life_after,
          life_adjustment, status, start_time, operator_id, operator_name, remark)
         VALUES (?, ?, 0, ?, ?, 0, 0, 1, NOW(), ?, ?, ?)`,
        [
          input.toolId,
          input.maintenanceType || 1,
          input.description || null,
          tool.remain_life,
          input.operatorId || null,
          input.operatorName || null,
          input.remark || null,
        ]
      );
      return result.insertId;
    });
  }

  async completeMaintenance(input: {
    maintenanceId: number;
    maintenanceCost: number;
    lifeAfter: number;
    description?: string;
  }): Promise<void> {
    await transaction(async (conn) => {
      const [mRows]: Loose = await conn.execute(
        'SELECT * FROM dcprint_tool_maintenance WHERE id = ? AND status = 1 FOR UPDATE',
        [input.maintenanceId]
      );
      if (mRows.length === 0) throw new Error('Maintenance record not found or already completed');
      const m = mRows[0];

      const [tRows]: Loose = await conn.execute(
        'SELECT * FROM dcprint_tool WHERE id = ? AND is_deleted = 0 FOR UPDATE',
        [m.tool_id]
      );
      if (tRows.length === 0) throw new Error('Tool not found');
      const tool = tRows[0];

      const lifeAdjustment = input.lifeAfter - m.life_before;
      const newNetValue = Number(tool.net_value) + input.maintenanceCost;
      const newOriginalCost = Number(tool.original_cost) + input.maintenanceCost;
      const newUnitCost = input.lifeAfter > 0 ? newNetValue / input.lifeAfter : 0;

      let newStatus = 2;
      if (tool.used_count >= tool.warning_threshold) {
        newStatus = 4;
      }

      await conn.execute(
        `UPDATE dcprint_tool
         SET remain_life = ?, net_value = ?, original_cost = ?, unit_cost = ?, status = ?
         WHERE id = ?`,
        [input.lifeAfter, newNetValue, newOriginalCost, newUnitCost, newStatus, m.tool_id]
      );

      await conn.execute(
        `UPDATE dcprint_tool_maintenance
         SET maintenance_cost = ?, life_after = ?, life_adjustment = ?, description = COALESCE(?, description),
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
    });
  }

  async scrapTool(input: { toolId: number; scrapReason: string; scrapBy: number }): Promise<void> {
    await transaction(async (conn) => {
      const [rows]: Loose = await conn.execute(
        'SELECT * FROM dcprint_tool WHERE id = ? AND is_deleted = 0 FOR UPDATE',
        [input.toolId]
      );
      if (rows.length === 0) throw new Error('Tool not found');
      const tool = rows[0];
      if (tool.status === 5) throw new Error('Tool already scrapped');

      await conn.execute(
        `UPDATE dcprint_tool SET status = 5, scrap_reason = ?, scrap_time = NOW(), scrap_by = ? WHERE id = ?`,
        [input.scrapReason, input.scrapBy, input.toolId]
      );
    });
  }

  async listUsageRecords(toolId: number): Promise<ToolUsageRecord[]> {
    return query<ToolUsageRecord>(
      'SELECT * FROM dcprint_tool_usage WHERE tool_id = ? ORDER BY use_time DESC LIMIT 100',
      [toolId]
    );
  }

  async listMaintenanceRecords(toolId: number): Promise<ToolMaintenanceRecord[]> {
    return query<ToolMaintenanceRecord>(
      'SELECT * FROM dcprint_tool_maintenance WHERE tool_id = ? ORDER BY create_time DESC LIMIT 50',
      [toolId]
    );
  }

  async getDashboard(): Promise<{
    totalTools: number;
    activeTools: number;
    warningTools: number;
    maintenanceTools: number;
    scrappedTools: number;
    totalNetValue: number;
  }> {
    const rows = await query<Loose>(
      `SELECT
         COUNT(*) as total_tools,
         SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as active_tools,
         SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) as warning_tools,
         SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as maintenance_tools,
         SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) as scrapped_tools,
         COALESCE(SUM(net_value), 0) as total_net_value
       FROM dcprint_tool WHERE is_deleted = 0`
    );
    return {
      totalTools: rows[0]?.total_tools || 0,
      activeTools: rows[0]?.active_tools || 0,
      warningTools: rows[0]?.warning_tools || 0,
      maintenanceTools: rows[0]?.maintenance_tools || 0,
      scrappedTools: rows[0]?.scrapped_tools || 0,
      totalNetValue: Number(rows[0]?.total_net_value || 0),
    };
  }
}
