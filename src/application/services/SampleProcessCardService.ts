/**
 * 打样工艺卡 — 应用服务
 *
 * 双录入页（经典版 + 高效版）共用此服务，保证业务逻辑 100% 一致：
 * - CRUD + 版本管理（基于旧版本复制新版本）
 * - 成本计算（物料 / 人工 / 工装 三项分项汇总）
 * - 提交后生成打样工单
 * - 状态流转：1-草稿 → 2-打样中 → 3-已确认 / 4-已作废
 *
 * 依据: docs/打样工艺卡录入页统一完善方案.md
 */
import { query, execute, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import {
  SampleCardQuoteGeneratedEvent,
  SampleCardConvertedToWorkOrderEvent,
} from '@/domain/sample-card/events/SampleCardEvents';
import type {
  SampleProcessCardInput,
  SampleProcessItemInput,
  SampleProcessStepInput,
} from '@/lib/validators/sample-card.schema';

// ===== 类型定义 =====

export interface SampleProcessCard extends Omit<
  SampleProcessCardInput,
  'items' | 'steps' | 'diagram_url'
> {
  id: number;
  sample_no: string;
  sample_work_order_id: number | null;
  sample_work_order_no: string | null;
  quote_id: number | null;
  formal_work_order_id: number | null;
  source_version_id: number | null;
  confirm_by: number | null;
  confirm_time: string | null;
  total_material_cost: number;
  total_labor_cost: number;
  total_tool_cost: number;
  total_cost: number;
  diagram_url: string | null | undefined;
  create_by: number | null;
  create_time: string;
  update_by: number | null;
  update_time: string;
  items?: SampleProcessItemInput[];
  steps?: SampleProcessStepInput[];
}

// 默认工时单价（元/小时）— 实际应从 sys_calc_param 读取，此处用默认值
const DEFAULT_HOURLY_RATE = 80;

// ===== 私有：成本计算 =====

interface CostBreakdown {
  materialCost: number;
  laborCost: number;
  toolCost: number;
  totalCost: number;
}

function calculateCost(
  items: SampleProcessItemInput[],
  steps: SampleProcessStepInput[],
  lossRate: number,
  dieToolId?: number | null,
  screenPlateId?: number | null
): CostBreakdown {
  const lossMultiplier = 1 + (lossRate || 0) / 100;
  const materialCost = items.reduce((sum, item) => {
    return sum + (item.unit_dosage || 0) * (item.unit_cost || 0) * lossMultiplier;
  }, 0);

  const laborCost = steps.reduce((sum, step) => {
    return sum + (step.work_hour || 0) * (step.hourly_rate || DEFAULT_HOURLY_RATE);
  }, 0);

  // 工装成本：从 dcprint_tool 读取 unit_cost 进行单次分摊
  // 此处仅做预览估算，实际入库时再快照
  const toolCost = 0; // 由调用方在需要时通过 DB 查询补充

  return {
    materialCost: Math.round(materialCost * 10000) / 10000,
    laborCost: Math.round(laborCost * 10000) / 10000,
    toolCost: Math.round(toolCost * 10000) / 10000,
    totalCost: Math.round((materialCost + laborCost + toolCost) * 10000) / 10000,
  };
}

async function fetchToolCosts(
  dieToolId?: number | null,
  screenPlateId?: number | null
): Promise<number> {
  if (!dieToolId && !screenPlateId) return 0;
  const ids = [dieToolId, screenPlateId].filter(Boolean) as number[];
  const placeholders = ids.map(() => '?').join(',');
  const [rows]: Loose = await query(
    `SELECT COALESCE(SUM(unit_cost), 0) AS total FROM dcprint_tool WHERE id IN (${placeholders}) AND is_deleted = 0`,
    ids
  );
  return Number(rows[0]?.total || 0);
}

// ===== 私有：编号生成 =====

async function generateSampleNo(): Promise<string> {
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `SP${ymd}`;
  const [rows]: Loose = await query(
    `SELECT sample_no FROM dcprint_sample_process_card WHERE sample_no LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (rows.length > 0) {
    const lastSeq = parseInt(rows[0].sample_no.slice(-5), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

// ===== 公共 API =====

export class SampleProcessCardService {
  /** 列表查询 */
  async listCards(params: {
    keyword?: string;
    status?: number;
    customerId?: number;
    page: number;
    pageSize: number;
  }) {
    const conditions: string[] = ['deleted = 0'];
    const values: Loose[] = [];

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

    const [countRows]: Loose = await query(
      `SELECT COUNT(*) AS total FROM dcprint_sample_process_card WHERE ${where}`,
      values
    );
    const total = countRows[0]?.total || 0;

    const [rows]: Loose = await query(
      `SELECT * FROM dcprint_sample_process_card WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...values, params.pageSize, offset]
    );

    return { list: rows, total, page: params.page, pageSize: params.pageSize };
  }

  /** 详情（含明细） */
  async getCardDetail(id: number): Promise<SampleProcessCard | null> {
    const [cards]: Loose = await query(
      `SELECT * FROM dcprint_sample_process_card WHERE id = ? AND deleted = 0 LIMIT 1`,
      [id]
    );
    if (cards.length === 0) return null;
    const card = cards[0];

    const [items]: Loose = await query(
      `SELECT * FROM dcprint_sample_process_item WHERE card_id = ? ORDER BY sort, id`,
      [id]
    );
    const [steps]: Loose = await query(
      `SELECT * FROM dcprint_sample_process_step WHERE card_id = ? ORDER BY sort, id`,
      [id]
    );

    return { ...card, items, steps };
  }

  /** 成本预览（不入库） */
  async previewCost(data: {
    items: SampleProcessItemInput[];
    steps: SampleProcessStepInput[];
    material_loss_rate: number;
    die_tool_id?: number | null;
    screen_plate_id?: number | null;
  }) {
    const baseCost = calculateCost(data.items, data.steps, data.material_loss_rate);
    const toolCost = await fetchToolCosts(data.die_tool_id, data.screen_plate_id);
    const totalCost = baseCost.materialCost + baseCost.laborCost + toolCost;
    return {
      materialCost: baseCost.materialCost,
      laborCost: baseCost.laborCost,
      toolCost: Math.round(toolCost * 10000) / 10000,
      totalCost: Math.round(totalCost * 10000) / 10000,
    };
  }

  /** 创建工艺卡 */
  async createCard(data: SampleProcessCardInput, userId: number): Promise<number> {
    const sampleNo = data.sample_no || (await generateSampleNo());
    const toolCost = await fetchToolCosts(data.die_tool_id, data.screen_plate_id);
    const baseCost = calculateCost(
      data.items,
      data.steps,
      data.material_loss_rate,
      data.die_tool_id,
      data.screen_plate_id
    );
    const totalToolCost = Math.round(toolCost * 10000) / 10000;
    const totalCost = baseCost.materialCost + baseCost.laborCost + totalToolCost;

    return await transaction(async (conn) => {
      const [result]: Loose = await conn.execute(
        `INSERT INTO dcprint_sample_process_card
         (sample_no, sample_name, customer_id, customer_name, product_id, product_name, version_no, status,
          substrate_material_id, substrate_material_name, spec, print_color, ink_color_id, screen_plate_id, die_tool_id,
          material_loss_rate, estimated_hour, total_material_cost, total_labor_cost, total_tool_cost, total_cost, diagram_url, remark,
          create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          sampleNo,
          data.sample_name,
          data.customer_id || null,
          data.customer_name || null,
          data.product_id || null,
          data.product_name || null,
          data.version_no || 'V1.0',
          data.substrate_material_id || null,
          data.substrate_material_name || null,
          data.spec || null,
          data.print_color || null,
          data.ink_color_id || null,
          data.screen_plate_id || null,
          data.die_tool_id || null,
          data.material_loss_rate || 5,
          data.estimated_hour || null,
          baseCost.materialCost,
          baseCost.laborCost,
          totalToolCost,
          totalCost,
          data.diagram_url || null,
          data.remark || null,
          userId,
        ] as Loose[]
      );
      const cardId = result.insertId;

      for (const item of data.items) {
        await conn.execute(
          `INSERT INTO dcprint_sample_process_item
           (card_id, item_type, material_id, material_code, material_name, specification, unit_dosage, unit, unit_cost, line_cost, remark, sort)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cardId,
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

      for (const step of data.steps) {
        await conn.execute(
          `INSERT INTO dcprint_sample_process_step
           (card_id, process_id, process_name, work_hour, hourly_rate, line_cost, process_param, sort)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cardId,
            step.process_id || null,
            step.process_name,
            step.work_hour,
            step.hourly_rate || DEFAULT_HOURLY_RATE,
            step.line_cost || 0,
            step.process_param || null,
            step.sort || 0,
          ] as Loose[]
        );
      }

      secureLog('info', 'Sample process card created', { cardId, sampleNo, userId });
      return cardId;
    });
  }

  /** 更新工艺卡（仅草稿状态可改） */
  async updateCard(
    id: number,
    data: Partial<SampleProcessCardInput>,
    userId: number
  ): Promise<void> {
    const [existing]: Loose = await query(
      `SELECT status FROM dcprint_sample_process_card WHERE id = ? AND deleted = 0 LIMIT 1`,
      [id]
    );
    if (existing.length === 0) throw new Error('工艺卡不存在');
    if (existing[0].status !== 1) throw new Error('仅草稿状态可编辑');

    const toolCost = await fetchToolCosts(data.die_tool_id, data.screen_plate_id);
    const baseCost =
      data.items && data.steps
        ? calculateCost(
            data.items,
            data.steps,
            data.material_loss_rate || 5,
            data.die_tool_id,
            data.screen_plate_id
          )
        : null;
    const totalToolCost = Math.round(toolCost * 10000) / 10000;

    await transaction(async (conn) => {
      const params: Loose[] = [
        data.sample_name,
        data.customer_id || null,
        data.customer_name || null,
        data.product_id || null,
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
      ];
      if (baseCost) {
        params.push(
          baseCost.materialCost,
          baseCost.laborCost,
          totalToolCost,
          baseCost.materialCost + baseCost.laborCost + totalToolCost
        );
      }
      params.push(id);
      await conn.execute(
        `UPDATE dcprint_sample_process_card SET
         sample_name = ?, customer_id = ?, customer_name = ?, product_id = ?, product_name = ?,
         substrate_material_id = ?, substrate_material_name = ?, spec = ?, print_color = ?,
         ink_color_id = ?, screen_plate_id = ?, die_tool_id = ?,
         material_loss_rate = ?, estimated_hour = ?, diagram_url = ?, remark = ?, update_by = ?, update_time = NOW()
         ${baseCost ? ', total_material_cost = ?, total_labor_cost = ?, total_tool_cost = ?, total_cost = ?' : ''}
         WHERE id = ?`,
        params
      );

      if (data.items) {
        await conn.execute(`DELETE FROM dcprint_sample_process_item WHERE card_id = ?`, [id]);
        for (const item of data.items) {
          await conn.execute(
            `INSERT INTO dcprint_sample_process_item
             (card_id, item_type, material_id, material_code, material_name, specification, unit_dosage, unit, unit_cost, line_cost, remark, sort)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
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

      if (data.steps) {
        await conn.execute(`DELETE FROM dcprint_sample_process_step WHERE card_id = ?`, [id]);
        for (const step of data.steps) {
          await conn.execute(
            `INSERT INTO dcprint_sample_process_step
             (card_id, process_id, process_name, work_hour, hourly_rate, line_cost, process_param, sort)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              step.process_id || null,
              step.process_name,
              step.work_hour,
              step.hourly_rate || DEFAULT_HOURLY_RATE,
              step.line_cost || 0,
              step.process_param || null,
              step.sort || 0,
            ] as Loose[]
          );
        }
      }
    });
  }

  /** 删除（软删除，仅草稿可删） */
  async deleteCard(id: number): Promise<void> {
    const [existing]: Loose = await query(
      `SELECT status FROM dcprint_sample_process_card WHERE id = ? AND deleted = 0 LIMIT 1`,
      [id]
    );
    if (existing.length === 0) throw new Error('工艺卡不存在');
    if (existing[0].status !== 1) throw new Error('仅草稿状态可删除');
    await execute(`UPDATE dcprint_sample_process_card SET deleted = 1 WHERE id = ?`, [id]);
  }

  /** 提交工艺卡（草稿→打样中），同步生成打样工单 */
  async submitCard(
    id: number,
    userId: number
  ): Promise<{ workOrderId: number; workOrderNo: string }> {
    const card = await this.getCardDetail(id);
    if (!card) throw new Error('工艺卡不存在');
    if (card.status !== 1) throw new Error('仅草稿状态可提交');

    // 生成打样工单号
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const workOrderNo = `SWO${ymd}${String(id).padStart(5, '0')}`;

    return await transaction(async (conn) => {
      // 更新工艺卡状态
      await conn.execute(
        `UPDATE dcprint_sample_process_card SET status = 2, sample_work_order_no = ?, update_by = ?, update_time = NOW() WHERE id = ?`,
        [workOrderNo, userId, id]
      );

      // 生成打样工单
      const [woResult]: Loose = await conn.execute(
        `INSERT INTO prd_work_order
         (work_order_no, work_order_date, material_id, plan_qty, unit, priority, status, remark, create_by, create_time)
         VALUES (?, CURDATE(), ?, 1, 'pcs', 1, 1, ?, ?, NOW())`,
        [
          workOrderNo,
          card.substrate_material_id || 0,
          `打样工单 - ${card.sample_no} ${card.sample_name}`,
          userId,
        ] as Loose[]
      );
      const workOrderId = woResult.insertId;

      // 回写工艺卡的工单ID
      await conn.execute(
        `UPDATE dcprint_sample_process_card SET sample_work_order_id = ? WHERE id = ?`,
        [workOrderId, id]
      );

      secureLog('info', 'Sample process card submitted, work order created', {
        cardId: id,
        workOrderId,
        workOrderNo,
        userId,
      });

      return { workOrderId, workOrderNo };
    });
  }

  /** 确认工艺卡（打样中→已确认） */
  async confirmCard(id: number, userId: number): Promise<void> {
    const [existing]: Loose = await query(
      `SELECT status FROM dcprint_sample_process_card WHERE id = ? AND deleted = 0 LIMIT 1`,
      [id]
    );
    if (existing.length === 0) throw new Error('工艺卡不存在');
    if (existing[0].status !== 2) throw new Error('仅打样中状态可确认');

    await execute(
      `UPDATE dcprint_sample_process_card SET status = 3, confirm_by = ?, confirm_time = NOW(), update_by = ?, update_time = NOW() WHERE id = ?`,
      [userId, userId, id]
    );
  }

  /** 作废工艺卡 */
  async cancelCard(id: number, userId: number): Promise<void> {
    const [existing]: Loose = await query(
      `SELECT status FROM dcprint_sample_process_card WHERE id = ? AND deleted = 0 LIMIT 1`,
      [id]
    );
    if (existing.length === 0) throw new Error('工艺卡不存在');
    if (existing[0].status === 4) throw new Error('已作废的工艺卡不可重复操作');

    await execute(
      `UPDATE dcprint_sample_process_card SET status = 4, update_by = ?, update_time = NOW() WHERE id = ?`,
      [userId, id]
    );
  }

  /** 基于旧版本复制新版本（版本号自动+1） */
  async duplicateVersion(sourceId: number, userId: number): Promise<number> {
    const source = await this.getCardDetail(sourceId);
    if (!source) throw new Error('源工艺卡不存在');

    // 生成新版本号：V1.0 → V1.1（小版本）或 V2.0（大版本，通过 majorVersion 参数控制）
    const versionParts = (source.version_no || 'V1.0').replace('V', '').split('.').map(Number);
    const newVersion = `V${versionParts[0]}.${(versionParts[1] || 0) + 1}`;
    const newSampleNo = await generateSampleNo();

    return await transaction(async (conn) => {
      const [result]: Loose = await conn.execute(
        `INSERT INTO dcprint_sample_process_card
         (sample_no, sample_name, customer_id, customer_name, product_id, product_name, version_no, status,
          substrate_material_id, substrate_material_name, spec, print_color, ink_color_id, screen_plate_id, die_tool_id,
          material_loss_rate, estimated_hour, total_material_cost, total_labor_cost, total_tool_cost, total_cost, diagram_url, remark,
          source_version_id, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          newSampleNo,
          source.sample_name,
          source.customer_id,
          source.customer_name,
          source.product_id,
          source.product_name,
          newVersion,
          source.substrate_material_id,
          source.substrate_material_name,
          source.spec,
          source.print_color,
          source.ink_color_id,
          source.screen_plate_id,
          source.die_tool_id,
          source.material_loss_rate,
          source.estimated_hour,
          source.total_material_cost,
          source.total_labor_cost,
          source.total_tool_cost,
          source.total_cost,
          source.diagram_url || null,
          source.remark,
          sourceId,
          userId,
        ] as Loose[]
      );
      const newCardId = result.insertId;

      if (source.items) {
        for (const item of source.items) {
          await conn.execute(
            `INSERT INTO dcprint_sample_process_item
             (card_id, item_type, material_id, material_code, material_name, specification, unit_dosage, unit, unit_cost, line_cost, remark, sort)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newCardId,
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

      if (source.steps) {
        for (const step of source.steps) {
          await conn.execute(
            `INSERT INTO dcprint_sample_process_step
             (card_id, process_id, process_name, work_hour, hourly_rate, line_cost, process_param, sort)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newCardId,
              step.process_id || null,
              step.process_name,
              step.work_hour,
              step.hourly_rate || DEFAULT_HOURLY_RATE,
              step.line_cost || 0,
              step.process_param || null,
              step.sort || 0,
            ] as Loose[]
          );
        }
      }

      secureLog('info', 'Sample process card version duplicated', {
        sourceId,
        newCardId,
        newSampleNo,
        newVersion,
        userId,
      });
      return newCardId;
    });
  }

  // ===== 阶段 3: 一键生成报价单 =====

  /** 生成报价单号：QT{YYYYMMDD}{5位序号} */
  private async generateQuoteNo(): Promise<string> {
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const prefix = `QT${ymd}`;
    const [rows]: Loose = await query(
      `SELECT quote_no FROM sal_quote WHERE quote_no LIKE ? ORDER BY id DESC LIMIT 1`,
      [`${prefix}%`]
    );
    let seq = 1;
    if (rows.length > 0) {
      const lastSeq = parseInt(rows[0].quote_no.slice(-5), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  /** 一键生成报价单（已确认工艺卡 → 报价单） */
  async generateQuote(
    cardId: number,
    options: { markupRate?: number; quantity?: number; validUntil?: string; remark?: string },
    userId: number
  ): Promise<{ quoteId: number; quoteNo: string; quotedPrice: number }> {
    const card = await this.getCardDetail(cardId);
    if (!card) throw new Error('工艺卡不存在');
    if (card.status !== 3) throw new Error('仅已确认状态可生成报价');

    const markupRate = options.markupRate ?? 30;
    const quantity = options.quantity ?? 1;
    const quoteNo = await this.generateQuoteNo();
    const totalCost = Number(card.total_cost || 0);
    const quotedPrice = Math.round(totalCost * (1 + markupRate / 100) * quantity * 10000) / 10000;

    return await transaction(async (conn) => {
      const [result]: Loose = await conn.execute(
        `INSERT INTO sal_quote
         (quote_no, quote_date, customer_id, customer_name, sample_card_id, sample_no, product_name,
          quantity, unit, material_cost, labor_cost, tool_cost, total_cost, markup_rate, quoted_price,
          currency, status, valid_until, remark, create_by, create_time)
         VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, 'pcs', ?, ?, ?, ?, ?, ?, ?, 'CNY', 1, ?, ?, ?, NOW())`,
        [
          quoteNo,
          card.customer_id || null,
          card.customer_name || null,
          cardId,
          card.sample_no,
          card.sample_name || card.product_name || null,
          quantity,
          Number(card.total_material_cost || 0),
          Number(card.total_labor_cost || 0),
          Number(card.total_tool_cost || 0),
          totalCost,
          markupRate,
          quotedPrice,
          options.validUntil || null,
          options.remark || null,
          userId,
        ] as Loose[]
      );
      const quoteId = result.insertId;

      await conn.execute(
        `UPDATE dcprint_sample_process_card SET quote_id = ?, update_by = ?, update_time = NOW() WHERE id = ?`,
        [quoteId, userId, cardId]
      );

      await getDomainEventOutbox().saveEvents(conn, 'SampleProcessCard', cardId, [
        new SampleCardQuoteGeneratedEvent({
          cardId,
          quoteId,
          quoteNo,
          quotedPrice,
          markupRate,
          userId,
        }),
      ]);

      secureLog('info', 'Quote generated from sample card', {
        cardId,
        quoteId,
        quoteNo,
        quotedPrice,
        userId,
      });
      return { quoteId, quoteNo, quotedPrice };
    });
  }

  // ===== 阶段 4: 转正式生产工单 =====

  /** 生成正式工单号：PWO{YYYYMMDD}{5位序号} */
  private async generateFormalWorkOrderNo(): Promise<string> {
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const prefix = `PWO${ymd}`;
    const [rows]: Loose = await query(
      `SELECT work_order_no FROM prod_work_order WHERE work_order_no LIKE ? ORDER BY id DESC LIMIT 1`,
      [`${prefix}%`]
    );
    let seq = 1;
    if (rows.length > 0) {
      const lastSeq = parseInt(rows[0].work_order_no.slice(-5), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  /** 转正式生产工单（已确认工艺卡 → prod_work_order + BOM 明细） */
  async convertToFormalWorkOrder(
    cardId: number,
    options: { planQty?: number; planStartDate?: string; planEndDate?: string; priority?: string },
    userId: number
  ): Promise<{ workOrderId: number; workOrderNo: string }> {
    const card = await this.getCardDetail(cardId);
    if (!card) throw new Error('工艺卡不存在');
    if (card.status !== 3) throw new Error('仅已确认状态可转正式工单');
    if (card.formal_work_order_id) throw new Error('该工艺卡已转过正式工单，不可重复转换');

    const planQty = options.planQty ?? 1000;
    const workOrderNo = await this.generateFormalWorkOrderNo();
    const productName = card.sample_name || card.product_name || `打样产品 ${card.sample_no}`;

    return await transaction(async (conn) => {
      const [result]: Loose = await conn.execute(
        `INSERT INTO prod_work_order
         (work_order_no, order_no, customer_name, product_name, quantity, unit, status, priority,
          plan_start_date, plan_end_date, create_time)
         VALUES (?, ?, ?, ?, ?, 'pcs', 1, ?, ?, ?, NOW())`,
        [
          workOrderNo,
          card.sample_no,
          card.customer_name || '',
          productName,
          planQty,
          options.priority || 'normal',
          options.planStartDate || null,
          options.planEndDate || null,
        ] as Loose[]
      );
      const workOrderId = result.insertId;

      if (card.items && card.items.length > 0) {
        let lineNo = 1;
        for (const item of card.items) {
          await conn.execute(
            `INSERT INTO prod_work_order_item
             (work_order_id, line_no, material_id, material_name, quantity, unit, unit_price, total_price, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              workOrderId,
              lineNo++,
              item.material_id || null,
              item.material_name || '',
              Number(item.unit_dosage || 0) * planQty,
              item.unit || 'pcs',
              Number(item.unit_cost || 0),
              Number(item.unit_dosage || 0) * planQty * Number(item.unit_cost || 0),
            ] as Loose[]
          );
        }
      }

      await conn.execute(
        `UPDATE dcprint_sample_process_card SET formal_work_order_id = ?, update_by = ?, update_time = NOW() WHERE id = ?`,
        [workOrderId, userId, cardId]
      );

      await getDomainEventOutbox().saveEvents(conn, 'SampleProcessCard', cardId, [
        new SampleCardConvertedToWorkOrderEvent({
          cardId,
          workOrderId,
          workOrderNo,
          planQty,
          userId,
        }),
      ]);

      secureLog('info', 'Sample card converted to formal work order', {
        cardId,
        workOrderId,
        workOrderNo,
        planQty,
        userId,
      });
      return { workOrderId, workOrderNo };
    });
  }

  // ===== 阶段 5: 成本差异分析 =====

  /** 成本差异分析（预估 vs 实际） */
  async getCostVariance(cardId: number): Promise<{
    estimated: { materialCost: number; laborCost: number; toolCost: number; totalCost: number };
    actual: { materialCost: number; laborCost: number; toolCost: number; totalCost: number };
    variance: {
      materialCost: number;
      laborCost: number;
      toolCost: number;
      totalCost: number;
      varianceRate: number;
    };
    workOrderNo: string | null;
  }> {
    const card = await this.getCardDetail(cardId);
    if (!card) throw new Error('工艺卡不存在');

    const estimated = {
      materialCost: Number(card.total_material_cost || 0),
      laborCost: Number(card.total_labor_cost || 0),
      toolCost: Number(card.total_tool_cost || 0),
      totalCost: Number(card.total_cost || 0),
    };

    let actual = { ...estimated };
    let workOrderNo: string | null = null;

    if (card.formal_work_order_id) {
      const [woRows]: Loose = await query(
        `SELECT work_order_no FROM prod_work_order WHERE id = ? LIMIT 1`,
        [card.formal_work_order_id]
      );
      if (woRows.length > 0) workOrderNo = woRows[0].work_order_no;

      const [itemRows]: Loose = await query(
        `SELECT COALESCE(SUM(total_price), 0) AS actual_material
         FROM prod_work_order_item WHERE work_order_id = ?`,
        [card.formal_work_order_id]
      );
      const actualMaterial = Number(itemRows[0]?.actual_material || 0);

      // 实际人工成本暂取预估（无实际工时回填表，后续扩展）
      actual = {
        materialCost: actualMaterial,
        laborCost: estimated.laborCost,
        toolCost: estimated.toolCost,
        totalCost: actualMaterial + estimated.laborCost + estimated.toolCost,
      };
    }

    const variance = {
      materialCost: Math.round((actual.materialCost - estimated.materialCost) * 10000) / 10000,
      laborCost: Math.round((actual.laborCost - estimated.laborCost) * 10000) / 10000,
      toolCost: Math.round((actual.toolCost - estimated.toolCost) * 10000) / 10000,
      totalCost: Math.round((actual.totalCost - estimated.totalCost) * 10000) / 10000,
      varianceRate:
        estimated.totalCost > 0
          ? Math.round(((actual.totalCost - estimated.totalCost) / estimated.totalCost) * 10000) /
            100
          : 0,
    };

    return { estimated, actual, variance, workOrderNo };
  }
}
