/**
 * 标准工艺模板 — 应用服务
 *
 * 实现「录入即沉淀」：确认的工艺卡可一键保存为标准模板，
 * 新建工艺卡时可从模板导入，大幅缩短打样时间。
 *
 * 依据: docs/打样工艺卡录入页统一完善方案.md
 */
import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { SampleProcessTemplateInput } from '@/lib/validators/sample-template.schema';
import type { SampleProcessCard } from './SampleProcessCardService';

export interface SampleProcessTemplate {
  id: number;
  template_no: string;
  template_name: string;
  category: string | null;
  tags: string | null;
  description: string | null;
  source_card_id: number | null;
  customer_id: number | null;
  customer_name: string | null;
  product_name: string | null;
  substrate_material_id: number | null;
  substrate_material_name: string | null;
  spec: string | null;
  print_color: string | null;
  ink_color_id: number | null;
  screen_plate_id: number | null;
  die_tool_id: number | null;
  material_loss_rate: number;
  estimated_hour: number | null;
  diagram_url: string | null;
  total_material_cost: number;
  total_labor_cost: number;
  total_tool_cost: number;
  total_cost: number;
  remark: string | null;
  status: number;
  usage_count: number;
  create_by: number | null;
  create_time: string;
  update_by: number | null;
  update_time: string;
  items?: SampleProcessTemplateInput['items'];
  steps?: SampleProcessTemplateInput['steps'];
}

async function generateTemplateNo(): Promise<string> {
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `SPT${ymd}`;
  const [rows]: Loose = await query(
    `SELECT template_no FROM dcprint_sample_process_template WHERE template_no LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (rows.length > 0) {
    const lastSeq = parseInt(rows[0].template_no.slice(-5), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

export class SampleProcessTemplateService {
  /** 列表查询 */
  async listTemplates(params: {
    keyword?: string;
    category?: string;
    page: number;
    pageSize: number;
  }) {
    const conditions: string[] = ['deleted = 0'];
    const values: Loose[] = [];

    if (params.keyword) {
      conditions.push('(template_no LIKE ? OR template_name LIKE ? OR tags LIKE ?)');
      const kw = `%${params.keyword}%`;
      values.push(kw, kw, kw);
    }
    if (params.category) {
      conditions.push('category = ?');
      values.push(params.category);
    }

    const where = conditions.join(' AND ');
    const offset = (params.page - 1) * params.pageSize;

    const [countRows]: Loose = await query(
      `SELECT COUNT(*) AS total FROM dcprint_sample_process_template WHERE ${where}`,
      values
    );
    const total = countRows[0]?.total || 0;

    const [rows]: Loose = await query(
      `SELECT * FROM dcprint_sample_process_template WHERE ${where} ORDER BY usage_count DESC, id DESC LIMIT ? OFFSET ?`,
      [...values, params.pageSize, offset]
    );

    return { list: rows, total, page: params.page, pageSize: params.pageSize };
  }

  /** 详情（含明细） */
  async getTemplateDetail(id: number): Promise<SampleProcessTemplate | null> {
    const [templates]: Loose = await query(
      `SELECT * FROM dcprint_sample_process_template WHERE id = ? AND deleted = 0 LIMIT 1`,
      [id]
    );
    if (templates.length === 0) return null;
    const template = templates[0];

    const [items]: Loose = await query(
      `SELECT * FROM dcprint_sample_process_template_item WHERE template_id = ? ORDER BY sort, id`,
      [id]
    );
    const [steps]: Loose = await query(
      `SELECT * FROM dcprint_sample_process_template_step WHERE template_id = ? ORDER BY sort, id`,
      [id]
    );

    return { ...template, items, steps };
  }

  /** 创建模板 */
  async createTemplate(data: SampleProcessTemplateInput, userId: number): Promise<number> {
    const templateNo = data.template_no || (await generateTemplateNo());

    return await transaction(async (conn) => {
      const [result]: Loose = await conn.execute(
        `INSERT INTO dcprint_sample_process_template
         (template_no, template_name, category, tags, description, customer_id, customer_name, product_name,
          substrate_material_id, substrate_material_name, spec, print_color, ink_color_id, screen_plate_id, die_tool_id,
          material_loss_rate, estimated_hour, diagram_url, total_material_cost, total_labor_cost, total_tool_cost, total_cost, remark,
          status, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, 1, ?, NOW())`,
        [
          templateNo,
          data.template_name,
          data.category || null,
          data.tags || null,
          data.description || null,
          data.customer_id || null,
          data.customer_name || null,
          data.product_name || null,
          data.substrate_material_id || null,
          data.substrate_material_name || null,
          data.spec || null,
          data.print_color || null,
          data.ink_color_id || null,
          data.screen_plate_id || null,
          data.die_tool_id || null,
          data.material_loss_rate || 5,
          data.estimated_hour || null,
          data.diagram_url || null,
          data.remark || null,
          userId,
        ] as Loose[]
      );
      const templateId = result.insertId;

      await this.insertItems(conn, templateId, data.items || []);
      await this.insertSteps(conn, templateId, data.steps || []);

      secureLog('info', 'Sample process template created', { templateId, templateNo, userId });
      return templateId;
    });
  }

  /** 从已确认工艺卡保存为模板（录入即沉淀） */
  async saveAsTemplate(
    cardId: number,
    templateName: string,
    category: string | null,
    userId: number
  ): Promise<number> {
    const cardRes: Loose = await query(
      `SELECT * FROM dcprint_sample_process_card WHERE id = ? AND deleted = 0 LIMIT 1`,
      [cardId]
    );
    const [cards] = cardRes as unknown as [Loose[]];
    if (!cards || cards.length === 0) throw new Error('工艺卡不存在');
    const card = cards[0] as SampleProcessCard;

    const [items]: Loose = await query(
      `SELECT * FROM dcprint_sample_process_item WHERE card_id = ? ORDER BY sort, id`,
      [cardId]
    );
    const [steps]: Loose = await query(
      `SELECT * FROM dcprint_sample_process_step WHERE card_id = ? ORDER BY sort, id`,
      [cardId]
    );

    const templateNo = await generateTemplateNo();

    return await transaction(async (conn) => {
      const [result]: Loose = await conn.execute(
        `INSERT INTO dcprint_sample_process_template
         (template_no, template_name, category, source_card_id, customer_id, customer_name, product_name,
          substrate_material_id, substrate_material_name, spec, print_color, ink_color_id, screen_plate_id, die_tool_id,
          material_loss_rate, estimated_hour, diagram_url, total_material_cost, total_labor_cost, total_tool_cost, total_cost, remark,
          status, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
        [
          templateNo,
          templateName,
          category,
          cardId,
          card.customer_id,
          card.customer_name,
          card.product_name,
          card.substrate_material_id,
          card.substrate_material_name,
          card.spec,
          card.print_color,
          card.ink_color_id,
          card.screen_plate_id,
          card.die_tool_id,
          card.material_loss_rate,
          card.estimated_hour,
          card.diagram_url,
          card.total_material_cost,
          card.total_labor_cost,
          card.total_tool_cost,
          card.total_cost,
          card.remark,
          userId,
        ] as Loose[]
      );
      const templateId = result.insertId;

      await this.insertItems(conn, templateId, items as Loose[]);
      await this.insertSteps(conn, templateId, steps as Loose[]);

      secureLog('info', 'Sample process template saved from card', {
        cardId,
        templateId,
        templateNo,
        userId,
      });
      return templateId;
    });
  }

  /** 更新模板 */
  async updateTemplate(
    id: number,
    data: Partial<SampleProcessTemplateInput>,
    userId: number
  ): Promise<void> {
    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE dcprint_sample_process_template SET
         template_name = ?, category = ?, tags = ?, description = ?, customer_id = ?, customer_name = ?,
         product_name = ?, substrate_material_id = ?, substrate_material_name = ?, spec = ?,
         print_color = ?, ink_color_id = ?, screen_plate_id = ?, die_tool_id = ?,
         material_loss_rate = ?, estimated_hour = ?, diagram_url = ?, remark = ?,
         update_by = ?, update_time = NOW()
         WHERE id = ? AND deleted = 0`,
        [
          data.template_name,
          data.category || null,
          data.tags || null,
          data.description || null,
          data.customer_id || null,
          data.customer_name || null,
          data.product_name || null,
          data.substrate_material_id || null,
          data.substrate_material_name || null,
          data.spec || null,
          data.print_color || null,
          data.ink_color_id || null,
          data.screen_plate_id || null,
          data.die_tool_id || null,
          data.material_loss_rate || 5,
          data.estimated_hour || null,
          data.diagram_url || null,
          data.remark || null,
          userId,
          id,
        ] as Loose[]
      );

      if (data.items) {
        await conn.execute(
          `DELETE FROM dcprint_sample_process_template_item WHERE template_id = ?`,
          [id]
        );
        await this.insertItems(conn, id, data.items);
      }
      if (data.steps) {
        await conn.execute(
          `DELETE FROM dcprint_sample_process_template_step WHERE template_id = ?`,
          [id]
        );
        await this.insertSteps(conn, id, data.steps);
      }
    });
  }

  /** 删除（软删除） */
  async deleteTemplate(id: number): Promise<void> {
    await execute(`UPDATE dcprint_sample_process_template SET deleted = 1 WHERE id = ?`, [id]);
  }

  /** 增加使用次数 */
  async incrementUsage(id: number): Promise<void> {
    await execute(
      `UPDATE dcprint_sample_process_template SET usage_count = usage_count + 1 WHERE id = ?`,
      [id]
    );
  }

  /** 私有：批量插入物料明细 */
  private async insertItems(conn: Loose, templateId: number, items: Loose[]): Promise<void> {
    for (const item of items) {
      await conn.execute(
        `INSERT INTO dcprint_sample_process_template_item
         (template_id, item_type, material_id, material_code, material_name, specification, unit_dosage, unit, unit_cost, line_cost, remark, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          item.item_type || 1,
          item.material_id || null,
          item.material_code,
          item.material_name,
          item.specification || null,
          item.unit_dosage,
          item.unit || null,
          item.unit_cost || 0,
          item.line_cost || 0,
          item.remark || null,
          item.sort || 0,
        ] as Loose[]
      );
    }
  }

  /** 私有：批量插入工序明细 */
  private async insertSteps(conn: Loose, templateId: number, steps: Loose[]): Promise<void> {
    for (const step of steps) {
      await conn.execute(
        `INSERT INTO dcprint_sample_process_template_step
         (template_id, process_id, process_name, work_hour, hourly_rate, line_cost, process_param, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          step.process_id || null,
          step.process_name,
          step.work_hour,
          step.hourly_rate || 0,
          step.line_cost || 0,
          step.process_param || null,
          step.sort || 0,
        ] as Loose[]
      );
    }
  }
}
