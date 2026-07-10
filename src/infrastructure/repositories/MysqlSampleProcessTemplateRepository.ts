import { ISampleProcessTemplateRepository } from '@/domain/dcprint/repositories/ISampleProcessTemplateRepository';
import {
  SampleProcessTemplate,
  TemplateItemProps,
  TemplateStepProps,
} from '@/domain/dcprint/aggregates/SampleProcessTemplate';
import { query, execute, type SqlValue } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

export class MysqlSampleProcessTemplateRepository implements ISampleProcessTemplateRepository {
  async findById(id: number): Promise<SampleProcessTemplate | null> {
    const rows = await query<RowDataPacket[]>(
      'SELECT * FROM dcprint_sample_process_template WHERE id = ? AND deleted = 0',
      [id]
    );
    if (!rows || rows.length === 0) return null;

    const row = rows[0] as unknown as Record<string, unknown>;
    const items = await query<RowDataPacket[]>(
      'SELECT * FROM dcprint_sample_process_template_item WHERE template_id = ? ORDER BY sort, id',
      [id]
    );
    const steps = await query<RowDataPacket[]>(
      'SELECT * FROM dcprint_sample_process_template_step WHERE template_id = ? ORDER BY sort, id',
      [id]
    );

    return SampleProcessTemplate.reconstitute({
      id: row.id as number,
      templateNo: row.template_no as string,
      templateName: row.template_name as string,
      category: row.category as string | undefined,
      tags: row.tags as string | undefined,
      description: row.description as string | undefined,
      sourceCardId: row.source_card_id as number | undefined,
      customerId: row.customer_id as number | undefined,
      customerName: row.customer_name as string | undefined,
      productName: row.product_name as string | undefined,
      substrateMaterialId: row.substrate_material_id as number | undefined,
      substrateMaterialName: row.substrate_material_name as string | undefined,
      spec: row.spec as string | undefined,
      printColor: row.print_color as string | undefined,
      inkColorId: row.ink_color_id as number | undefined,
      screenPlateId: row.screen_plate_id as number | undefined,
      dieToolId: row.die_tool_id as number | undefined,
      materialLossRate: row.material_loss_rate as number,
      estimatedHour: row.estimated_hour as number,
      totalMaterialCost: row.total_material_cost as number,
      totalLaborCost: row.total_labor_cost as number,
      totalToolCost: row.total_tool_cost as number,
      totalCost: row.total_cost as number,
      diagramUrl: row.diagram_url as string | undefined,
      remark: row.remark as string | undefined,
      status: row.status as number,
      usageCount: row.usage_count as number,
      createBy: row.create_by as number | undefined,
      createTime: row.create_time as string | undefined,
      items: (items as unknown as Record<string, unknown>[]).map((r) => ({
        id: r.id as number,
        templateId: r.template_id as number,
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
        templateId: r.template_id as number,
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
    page: number;
    pageSize: number;
  }): Promise<{ list: SampleProcessTemplate[]; total: number }> {
    const conditions: string[] = ['deleted = 0'];
    const values: SqlValue[] = [];

    if (params.keyword) {
      conditions.push('(template_no LIKE ? OR template_name LIKE ? OR product_name LIKE ?)');
      const kw = `%${params.keyword}%`;
      values.push(kw, kw, kw);
    }

    const where = conditions.join(' AND ');
    const offset = (params.page - 1) * params.pageSize;

    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM dcprint_sample_process_template WHERE ${where}`,
      values
    );
    const total = (countRows[0] as unknown as Record<string, unknown>).total as number;

    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM dcprint_sample_process_template WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...values, params.pageSize, offset]
    );

    const list = (rows as unknown as Record<string, unknown>[]).map((r) =>
      SampleProcessTemplate.reconstitute({
        id: r.id as number,
        templateNo: r.template_no as string,
        templateName: r.template_name as string,
        category: r.category as string | undefined,
        description: r.description as string | undefined,
        customerId: r.customer_id as number | undefined,
        customerName: r.customer_name as string | undefined,
        productName: r.product_name as string | undefined,
        materialLossRate: r.material_loss_rate as number,
        estimatedHour: r.estimated_hour as number,
        totalMaterialCost: r.total_material_cost as number,
        totalLaborCost: r.total_labor_cost as number,
        totalToolCost: r.total_tool_cost as number,
        totalCost: r.total_cost as number,
        status: r.status as number,
        usageCount: r.usage_count as number,
        createBy: r.create_by as number | undefined,
        createTime: r.create_time as string | undefined,
      })
    );

    return { list, total };
  }

  async save(template: SampleProcessTemplate): Promise<number> {
    const row = template.toRow() as Record<string, SqlValue>;
    const result = await execute(
      `INSERT INTO dcprint_sample_process_template
       (template_no, template_name, category, tags, description, source_card_id, customer_id, customer_name,
        product_name, substrate_material_id, substrate_material_name, spec, print_color, ink_color_id,
        screen_plate_id, die_tool_id, material_loss_rate, estimated_hour,
        total_material_cost, total_labor_cost, total_tool_cost, total_cost, diagram_url, remark,
        status, usage_count, create_by, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        row.template_no,
        row.template_name,
        row.category,
        row.tags,
        row.description,
        row.source_card_id,
        row.customer_id,
        row.customer_name,
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
        row.status,
        row.usage_count,
        row.create_by,
      ]
    );
    return (result as { insertId: number }).insertId;
  }

  async update(template: SampleProcessTemplate): Promise<void> {
    const row = template.toRow() as Record<string, SqlValue>;
    await execute(
      `UPDATE dcprint_sample_process_template SET
        template_name = ?, category = ?, tags = ?, description = ?,
        customer_id = ?, customer_name = ?, product_name = ?,
        substrate_material_id = ?, substrate_material_name = ?, spec = ?, print_color = ?,
        ink_color_id = ?, screen_plate_id = ?, die_tool_id = ?,
        material_loss_rate = ?, estimated_hour = ?,
        total_material_cost = ?, total_labor_cost = ?, total_tool_cost = ?, total_cost = ?,
        diagram_url = ?, remark = ?, update_by = ?, update_time = NOW()
       WHERE id = ? AND deleted = 0`,
      [
        row.template_name,
        row.category,
        row.tags,
        row.description,
        row.customer_id,
        row.customer_name,
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

  async softDelete(id: number): Promise<void> {
    await execute(
      'UPDATE dcprint_sample_process_template SET deleted = 1, update_time = NOW() WHERE id = ?',
      [id]
    );
  }

  async incrementUsage(id: number): Promise<void> {
    await execute(
      'UPDATE dcprint_sample_process_template SET usage_count = usage_count + 1, update_time = NOW() WHERE id = ?',
      [id]
    );
  }
}
