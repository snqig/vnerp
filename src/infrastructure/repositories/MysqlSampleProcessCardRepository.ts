import { ISampleProcessCardRepository } from '@/domain/dcprint/repositories/ISampleProcessCardRepository';
import {
  SampleProcessCard,
  SampleProcessItemProps,
  SampleProcessStepProps,
} from '@/domain/dcprint/aggregates/SampleProcessCard';
import { query, execute, transaction, type SqlValue } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

export class MysqlSampleProcessCardRepository implements ISampleProcessCardRepository {
  async findById(id: number): Promise<SampleProcessCard | null> {
    const rows = await query<RowDataPacket[]>(
      'SELECT * FROM dcprint_sample_process_card WHERE id = ? AND deleted = 0',
      [id]
    );
    if (!rows || rows.length === 0) return null;

    const cardRow = rows[0] as unknown as Record<string, unknown>;
    const items = await query<RowDataPacket[]>(
      'SELECT * FROM dcprint_sample_process_item WHERE card_id = ? ORDER BY sort, id',
      [id]
    );
    const steps = await query<RowDataPacket[]>(
      'SELECT * FROM dcprint_sample_process_step WHERE card_id = ? ORDER BY sort, id',
      [id]
    );

    return SampleProcessCard.reconstitute({
      id: cardRow.id as number,
      sampleNo: cardRow.sample_no as string,
      sampleName: cardRow.sample_name as string,
      customerId: cardRow.customer_id as number | undefined,
      customerName: cardRow.customer_name as string | undefined,
      productId: cardRow.product_id as number | undefined,
      productName: cardRow.product_name as string | undefined,
      versionNo: cardRow.version_no as string,
      status: cardRow.status as 1 | 2 | 3 | 4,
      substrateMaterialId: cardRow.substrate_material_id as number | undefined,
      substrateMaterialName: cardRow.substrate_material_name as string | undefined,
      spec: cardRow.spec as string | undefined,
      printColor: cardRow.print_color as string | undefined,
      inkColorId: cardRow.ink_color_id as number | undefined,
      screenPlateId: cardRow.screen_plate_id as number | undefined,
      dieToolId: cardRow.die_tool_id as number | undefined,
      materialLossRate: cardRow.material_loss_rate as number,
      estimatedHour: cardRow.estimated_hour as number,
      totalMaterialCost: cardRow.total_material_cost as number,
      totalLaborCost: cardRow.total_labor_cost as number,
      totalToolCost: cardRow.total_tool_cost as number,
      totalCost: cardRow.total_cost as number,
      diagramUrl: cardRow.diagram_url as string | undefined,
      remark: cardRow.remark as string | undefined,
      sampleWorkOrderId: cardRow.sample_work_order_id as number | undefined,
      sampleWorkOrderNo: cardRow.sample_work_order_no as string | undefined,
      quoteId: cardRow.quote_id as number | undefined,
      formalWorkOrderId: cardRow.formal_work_order_id as number | undefined,
      sourceVersionId: cardRow.source_version_id as number | undefined,
      confirmBy: cardRow.confirm_by as number | undefined,
      confirmTime: cardRow.confirm_time as string | undefined,
      createBy: cardRow.create_by as number | undefined,
      createTime: cardRow.create_time as string | undefined,
      updateBy: cardRow.update_by as number | undefined,
      updateTime: cardRow.update_time as string | undefined,
      items: (items as unknown as Record<string, unknown>[]).map((r) => ({
        id: r.id as number,
        cardId: r.card_id as number,
        itemType: r.item_type as number,
        materialId: r.material_id as number | undefined,
        materialCode: r.material_code as string,
        materialName: r.material_name as string,
        specification: r.specification as string | undefined,
        unitDosage: r.unit_dosage as number,
        unit: r.unit as string | undefined,
        unitCost: r.unit_cost as number | undefined,
        lineCost: r.line_cost as number | undefined,
        remark: r.remark as string | undefined,
        sort: r.sort as number | undefined,
      })),
      steps: (steps as unknown as Record<string, unknown>[]).map((r) => ({
        id: r.id as number,
        cardId: r.card_id as number,
        processId: r.process_id as number | undefined,
        processName: r.process_name as string,
        workHour: r.work_hour as number,
        hourlyRate: r.hourly_rate as number | undefined,
        lineCost: r.line_cost as number | undefined,
        processParam: r.process_param as string | undefined,
        sort: r.sort as number | undefined,
      })),
    });
  }

  async findList(params: {
    keyword?: string;
    status?: number;
    customerId?: number;
    page: number;
    pageSize: number;
  }): Promise<{ list: SampleProcessCard[]; total: number }> {
    const conditions: string[] = ['deleted = 0'];
    const values: SqlValue[] = [];

    if (params.keyword) {
      conditions.push('(sample_no LIKE ? OR sample_name LIKE ? OR customer_name LIKE ?)');
      const kw = `%${params.keyword}%`;
      values.push(kw, kw, kw);
    }
    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }
    if (params.customerId) {
      conditions.push('customer_id = ?');
      values.push(params.customerId);
    }

    const where = conditions.join(' AND ');
    const offset = (params.page - 1) * params.pageSize;

    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM dcprint_sample_process_card WHERE ${where}`,
      values
    );
    const total = (countRows[0] as unknown as Record<string, unknown>).total as number;

    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM dcprint_sample_process_card WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...values, params.pageSize, offset]
    );

    const list = (rows as unknown as Record<string, unknown>[]).map((r) =>
      SampleProcessCard.reconstitute({
        id: r.id as number,
        sampleNo: r.sample_no as string,
        sampleName: r.sample_name as string,
        customerId: r.customer_id as number | undefined,
        customerName: r.customer_name as string | undefined,
        productId: r.product_id as number | undefined,
        productName: r.product_name as string | undefined,
        versionNo: r.version_no as string,
        status: r.status as 1 | 2 | 3 | 4,
        substrateMaterialId: r.substrate_material_id as number | undefined,
        substrateMaterialName: r.substrate_material_name as string | undefined,
        spec: r.spec as string | undefined,
        printColor: r.print_color as string | undefined,
        inkColorId: r.ink_color_id as number | undefined,
        screenPlateId: r.screen_plate_id as number | undefined,
        dieToolId: r.die_tool_id as number | undefined,
        materialLossRate: r.material_loss_rate as number,
        estimatedHour: r.estimated_hour as number,
        totalMaterialCost: r.total_material_cost as number,
        totalLaborCost: r.total_labor_cost as number,
        totalToolCost: r.total_tool_cost as number,
        totalCost: r.total_cost as number,
        diagramUrl: r.diagram_url as string | undefined,
        remark: r.remark as string | undefined,
        createBy: r.create_by as number | undefined,
        createTime: r.create_time as string | undefined,
        confirmBy: r.confirm_by as number | undefined,
        confirmTime: r.confirm_time as string | undefined,
      })
    );

    return { list, total };
  }

  async save(card: SampleProcessCard): Promise<number> {
    const row = card.toRow() as Record<string, SqlValue>;
    const result = await execute(
      `INSERT INTO dcprint_sample_process_card
       (sample_no, sample_name, customer_id, customer_name, product_id, product_name, version_no, status,
        substrate_material_id, substrate_material_name, spec, print_color, ink_color_id, screen_plate_id, die_tool_id,
        material_loss_rate, estimated_hour, total_material_cost, total_labor_cost, total_tool_cost, total_cost, diagram_url, remark,
        create_by, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        row.sample_no,
        row.sample_name,
        row.customer_id,
        row.customer_name,
        row.product_id,
        row.product_name,
        row.version_no,
        row.status,
        row.substrate_material_id,
        row.substrate_material_name,
        row.spec,
        row.print_color,
        row.ink_color_id,
        row.screen_plate_id,
        row.die_tool_id,
        row.material_loss_rate,
        row.estimated_hour,
        row.total_material_cost,
        row.total_labor_cost,
        row.total_tool_cost,
        row.total_cost,
        row.diagram_url,
        row.remark,
        row.create_by,
      ]
    );
    return (result as { insertId: number }).insertId;
  }

  async update(card: SampleProcessCard): Promise<void> {
    const row = card.toRow() as Record<string, SqlValue>;
    await execute(
      `UPDATE dcprint_sample_process_card SET
        sample_name = ?, customer_id = ?, customer_name = ?, product_id = ?, product_name = ?,
        substrate_material_id = ?, substrate_material_name = ?, spec = ?, print_color = ?,
        ink_color_id = ?, screen_plate_id = ?, die_tool_id = ?,
        material_loss_rate = ?, estimated_hour = ?,
        total_material_cost = ?, total_labor_cost = ?, total_tool_cost = ?, total_cost = ?,
        diagram_url = ?, remark = ?, update_by = ?, update_time = NOW()
       WHERE id = ? AND deleted = 0`,
      [
        row.sample_name,
        row.customer_id,
        row.customer_name,
        row.product_id,
        row.product_name,
        row.substrate_material_id,
        row.substrate_material_name,
        row.spec,
        row.print_color,
        row.ink_color_id,
        row.screen_plate_id,
        row.die_tool_id,
        row.material_loss_rate,
        row.estimated_hour,
        row.total_material_cost,
        row.total_labor_cost,
        row.total_tool_cost,
        row.total_cost,
        row.diagram_url,
        row.remark,
        row.update_by,
        row.id,
      ]
    );
  }

  async updateStatus(id: number, status: number): Promise<void> {
    await execute(
      'UPDATE dcprint_sample_process_card SET status = ?, update_time = NOW() WHERE id = ?',
      [status, id]
    );
  }

  async saveItems(cardId: number, items: SampleProcessItemProps[]): Promise<void> {
    await execute('DELETE FROM dcprint_sample_process_item WHERE card_id = ?', [cardId]);
    for (const item of items) {
      await execute(
        `INSERT INTO dcprint_sample_process_item
         (card_id, item_type, material_id, material_code, material_name, specification, unit_dosage, unit, unit_cost, line_cost, remark, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cardId,
          item.itemType || 1,
          item.materialId || null,
          item.materialCode,
          item.materialName,
          item.specification || null,
          item.unitDosage,
          item.unit || null,
          item.unitCost || 0,
          item.lineCost || 0,
          item.remark || null,
          item.sort || 0,
        ]
      );
    }
  }

  async saveSteps(cardId: number, steps: SampleProcessStepProps[]): Promise<void> {
    await execute('DELETE FROM dcprint_sample_process_step WHERE card_id = ?', [cardId]);
    for (const step of steps) {
      await execute(
        `INSERT INTO dcprint_sample_process_step
         (card_id, process_id, process_name, work_hour, hourly_rate, line_cost, process_param, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cardId,
          step.processId || null,
          step.processName,
          step.workHour,
          step.hourlyRate || 0,
          step.lineCost || 0,
          step.processParam || null,
          step.sort || 0,
        ]
      );
    }
  }

  async softDelete(id: number): Promise<void> {
    await execute(
      'UPDATE dcprint_sample_process_card SET deleted = 1, update_time = NOW() WHERE id = ?',
      [id]
    );
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await query<RowDataPacket[]>(
      'SELECT status, COUNT(*) as count FROM dcprint_sample_process_card WHERE deleted = 0 GROUP BY status'
    );
    const result: Record<string, number> = {};
    for (const row of rows as unknown as Record<string, unknown>[]) {
      result[String(row.status)] = Number(row.count);
    }
    return result;
  }
}
