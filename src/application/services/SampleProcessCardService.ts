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
import { logger, secureLog } from '@/lib/logger';
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
  const rows: Loose = await query(
    `SELECT COALESCE(SUM(unit_cost), 0) AS total FROM dcprint_tool WHERE id IN (${placeholders}) AND deleted = 0`,
    ids
  );
  return Number(rows[0]?.total || 0);
}

// ===== 私有：编号生成 =====

async function generateSampleNo(): Promise<string> {
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `SP${ymd}`;
  const rows: Loose = await query(
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

    const countRows: Loose = await query(
      `SELECT COUNT(*) AS total FROM dcprint_sample_process_card WHERE ${where}`,
      values
    );
    const total = countRows[0]?.total || 0;

    const rows: Loose = await query(
      `SELECT * FROM dcprint_sample_process_card WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...values, params.pageSize, offset]
    );

    return { list: rows, total, page: params.page, pageSize: params.pageSize };
  }

  /** 详情（含明细） */
  async getCardDetail(id: number): Promise<SampleProcessCard | null> {
    const cards: Loose = await query(
      `SELECT * FROM dcprint_sample_process_card WHERE id = ? AND deleted = 0 LIMIT 1`,
      [id]
    );
    if (cards.length === 0) return null;
    const card = cards[0];

    const items: Loose = await query(
      `SELECT * FROM dcprint_sample_process_item WHERE card_id = ? ORDER BY sort, id`,
      [id]
    );
    const steps: Loose = await query(
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
    const ctx = { module: 'sample-card', action: 'createCard', userId };
    let phase = 'init';
    const sampleNo = data.sample_no || (await generateSampleNo());
    try {
      phase = 'fetch_tool_cost';
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

      logger.info(ctx, `成本计算`, {
        sampleNo,
        sampleName: data.sample_name,
        itemCount: data.items.length,
        stepCount: data.steps.length,
        cost: {
          materialCost: baseCost.materialCost,
          laborCost: baseCost.laborCost,
          toolCost: totalToolCost,
          totalCost,
        },
      });

      return await transaction(async (conn) => {
        phase = 'insert_card';
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

        phase = 'insert_items';
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

        phase = 'insert_steps';
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

        logger.info(ctx, `工艺卡创建完成`, {
          cardId,
          sampleNo,
          itemCount: data.items.length,
          stepCount: data.steps.length,
          totalCost,
        });
        return cardId;
      });
    } catch (err) {
      logger.error(ctx, `createCard 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
        sampleNo,
      });
      throw err;
    }
  }

  /** 更新工艺卡（仅草稿状态可改） */
  async updateCard(
    id: number,
    data: Partial<SampleProcessCardInput>,
    userId: number
  ): Promise<void> {
    const existing: Loose = await query(
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
    const existing: Loose = await query(
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
    const ctx = { module: 'sample-card', action: 'submitCard', cardId: id, userId };
    let phase = 'init';
    try {
      phase = 'load_card';
      const card = await this.getCardDetail(id);
      if (!card) {
        logger.warn(ctx, `工艺卡不存在`);
        throw new Error('工艺卡不存在');
      }
      if (card.status !== 1) {
        logger.warn(ctx, `状态非草稿，无法提交`, { status: card.status });
        throw new Error('仅草稿状态可提交');
      }

      // 生成打样工单号
      const today = new Date();
      const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const workOrderNo = `SWO${ymd}${String(id).padStart(5, '0')}`;

      logger.info(ctx, `准备生成打样工单`, {
        sampleNo: card.sample_no,
        sampleName: card.sample_name,
        workOrderNo,
      });

      return await transaction(async (conn) => {
        phase = 'update_card_status';
        await conn.execute(
          `UPDATE dcprint_sample_process_card SET status = 2, sample_work_order_no = ?, update_by = ?, update_time = NOW() WHERE id = ?`,
          [workOrderNo, userId, id]
        );

        phase = 'insert_work_order';
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

        phase = 'write_back_work_order_id';
        await conn.execute(
          `UPDATE dcprint_sample_process_card SET sample_work_order_id = ? WHERE id = ?`,
          [workOrderId, id]
        );

        logger.info(ctx, `打样工单已生成`, {
          workOrderId,
          workOrderNo,
          statusTransition: '1(草稿) → 2(打样中)',
        });
        return { workOrderId, workOrderNo };
      });
    } catch (err) {
      logger.error(ctx, `submitCard 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** 确认工艺卡（打样中→已确认） */
  async confirmCard(id: number, userId: number): Promise<void> {
    const ctx = { module: 'sample-card', action: 'confirmCard', cardId: id, userId };
    const existing: Loose = await query(
      `SELECT status FROM dcprint_sample_process_card WHERE id = ? AND deleted = 0 LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      logger.warn(ctx, `工艺卡不存在`);
      throw new Error('工艺卡不存在');
    }
    if (existing[0].status !== 2) {
      logger.warn(ctx, `状态非打样中，无法确认`, { status: existing[0].status });
      throw new Error('仅打样中状态可确认');
    }

    await execute(
      `UPDATE dcprint_sample_process_card SET status = 3, confirm_by = ?, confirm_time = NOW(), update_by = ?, update_time = NOW() WHERE id = ?`,
      [userId, userId, id]
    );
    logger.info(ctx, `工艺卡已确认`, { statusTransition: '2(打样中) → 3(已确认)' });
  }

  /** 作废工艺卡 */
  async cancelCard(id: number, userId: number): Promise<void> {
    const ctx = { module: 'sample-card', action: 'cancelCard', cardId: id, userId };
    const existing: Loose = await query(
      `SELECT status FROM dcprint_sample_process_card WHERE id = ? AND deleted = 0 LIMIT 1`,
      [id]
    );
    if (existing.length === 0) {
      logger.warn(ctx, `工艺卡不存在`);
      throw new Error('工艺卡不存在');
    }
    if (existing[0].status === 4) {
      logger.warn(ctx, `工艺卡已作废，重复操作`);
      throw new Error('已作废的工艺卡不可重复操作');
    }

    await execute(
      `UPDATE dcprint_sample_process_card SET status = 4, update_by = ?, update_time = NOW() WHERE id = ?`,
      [userId, id]
    );
    logger.info(ctx, `工艺卡已作废`, { beforeStatus: existing[0].status });
  }

  /** 基于旧版本复制新版本（版本号自动+1） */
  async duplicateVersion(sourceId: number, userId: number): Promise<number> {
    const ctx = { module: 'sample-card', action: 'duplicateVersion', sourceId, userId };
    let phase = 'init';
    try {
      phase = 'load_source';
      const source = await this.getCardDetail(sourceId);
      if (!source) {
        logger.warn(ctx, `源工艺卡不存在`);
        throw new Error('源工艺卡不存在');
      }

      // 生成新版本号：V1.0 → V1.1（小版本）
      const versionParts = (source.version_no || 'V1.0').replace('V', '').split('.').map(Number);
      const newVersion = `V${versionParts[0]}.${(versionParts[1] || 0) + 1}`;
      const newSampleNo = await generateSampleNo();

      logger.info(ctx, `版本复制`, {
        sourceSampleNo: source.sample_no,
        sourceVersion: source.version_no,
        newSampleNo,
        newVersion,
        itemCount: source.items?.length || 0,
        stepCount: source.steps?.length || 0,
      });

      return await transaction(async (conn) => {
        phase = 'insert_card';
        const [result]: Loose = await conn.execute(
          `INSERT INTO dcprint_sample_process_card
         (sample_no, sample_name, customer_id, customer_name, product_id, product_name, version_no, status,
          substrate_material_id, substrate_material_name, spec, print_color, ink_color_id, screen_plate_id, die_tool_id,
          material_loss_rate, estimated_hour, total_material_cost, total_labor_cost, total_tool_cost, total_cost, diagram_url, remark,
          source_version_id, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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

        phase = 'copy_items';
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

        phase = 'copy_steps';
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

        logger.info(ctx, `版本复制完成`, {
          newCardId,
          newSampleNo,
          newVersion,
          sourceVersionId: sourceId,
        });
        return newCardId;
      });
    } catch (err) {
      logger.error(ctx, `duplicateVersion 失败 [phase=${phase}]`, {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  // ===== 阶段 3: 一键生成报价单 =====

  /** 生成报价单号：QT{YYYYMMDD}{5位序号} */
  private async generateQuoteNo(): Promise<string> {
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const prefix = `QT${ymd}`;
    const rows: Loose = await query(
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
    secureLog('info', '[generateQuote] 开始生成报价单', { cardId, options, userId });
    const card = await this.getCardDetail(cardId);
    if (!card) {
      secureLog('warn', '[generateQuote] 工艺卡不存在', { cardId });
      throw new Error('工艺卡不存在');
    }
    if (card.status !== 3) {
      secureLog('warn', '[generateQuote] 工艺卡状态非已确认', { cardId, status: card.status });
      throw new Error('仅已确认状态可生成报价');
    }
    if (card.quote_id) {
      secureLog('warn', '[generateQuote] 工艺卡已生成过报价单', {
        cardId,
        existingQuoteId: card.quote_id,
      });
      throw new Error('该工艺卡已生成过报价单，不可重复生成');
    }

    const markupRate = options.markupRate ?? 30;
    const quantity = options.quantity ?? 1;
    if (options.markupRate === undefined) {
      secureLog('warn', '[generateQuote] markupRate 未提供，使用默认值 30', { cardId });
    }
    if (options.quantity === undefined) {
      secureLog('warn', '[generateQuote] quantity 未提供，使用默认值 1', { cardId });
    }
    if (!card.customer_id) {
      secureLog('warn', '[generateQuote] 工艺卡缺少 customer_id，报价将无关联客户', { cardId });
    }
    const quoteNo = await this.generateQuoteNo();
    const totalCost = Number(card.total_cost || 0);
    if (totalCost <= 0) {
      secureLog('warn', '[generateQuote] 工艺卡总成本为 0，报价将为 0', { cardId, totalCost });
    }
    const materialCost = Number(card.total_material_cost || 0);
    const laborCost = Number(card.total_labor_cost || 0);
    const toolCost = Number(card.total_tool_cost || 0);
    const quotedPrice = Math.round(totalCost * (1 + markupRate / 100) * quantity * 10000) / 10000;

    secureLog('info', '[generateQuote] 报价计算完成', {
      cardId,
      sampleNo: card.sample_no,
      costBreakdown: { materialCost, laborCost, toolCost, totalCost },
      markupRate,
      quantity,
      quotedPrice,
      quoteNo,
    });

    let phase = 'init';
    try {
      return await transaction(async (conn) => {
        phase = 'insert_sal_quote';
        secureLog('info', '[generateQuote] 开始写入 sal_quote', { quoteNo });
        const [result]: Loose = await conn.execute(
          `INSERT INTO sal_quote
           (quote_no, quote_date, customer_id, customer_name, sample_card_id, sample_no, product_name,
            quantity, unit, material_cost, labor_cost, tool_cost, total_cost, markup_rate, quoted_price,
            currency, status, valid_until, remark, create_by, create_time)
           VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, 'pcs', ?, ?, ?, ?, ?, ?, 'CNY', 1, ?, ?, ?, NOW())`,
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
        secureLog('info', '[generateQuote] sal_quote 写入成功', { quoteId, quoteNo });

        phase = 'update_card_quote_id';
        secureLog('info', '[generateQuote] 回写工艺卡 quote_id', { cardId, quoteId });
        await conn.execute(
          `UPDATE dcprint_sample_process_card SET quote_id = ?, update_by = ?, update_time = NOW() WHERE id = ?`,
          [quoteId, userId, cardId]
        );

        phase = 'save_events';
        secureLog('info', '[generateQuote] 持久化领域事件', { cardId, quoteId });
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

        secureLog('info', '[generateQuote] 报价单生成完成', {
          cardId,
          quoteId,
          quoteNo,
          quotedPrice,
          userId,
        });
        return { quoteId, quoteNo, quotedPrice };
      });
    } catch (error) {
      secureLog('error', '[generateQuote] 报价生成失败', {
        cardId,
        quoteNo,
        quotedPrice,
        userId,
        phase,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // ===== 阶段 4: 转正式生产工单 =====

  /** 生成正式工单号：PWO{YYYYMMDD}{5位序号} */
  private async generateFormalWorkOrderNo(): Promise<string> {
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const prefix = `PWO${ymd}`;
    const rows: Loose = await query(
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
    secureLog('info', '[convertToFormalWorkOrder] 开始转正式工单', { cardId, options, userId });
    const card = await this.getCardDetail(cardId);
    if (!card) {
      secureLog('warn', '[convertToFormalWorkOrder] 工艺卡不存在', { cardId });
      throw new Error('工艺卡不存在');
    }
    if (card.status !== 3) {
      secureLog('warn', '[convertToFormalWorkOrder] 工艺卡状态非已确认', {
        cardId,
        status: card.status,
      });
      throw new Error('仅已确认状态可转正式工单');
    }
    if (card.formal_work_order_id) {
      secureLog('warn', '[convertToFormalWorkOrder] 工艺卡已转过正式工单', {
        cardId,
        existingWorkOrderId: card.formal_work_order_id,
      });
      throw new Error('该工艺卡已转过正式工单，不可重复转换');
    }

    const planQty = options.planQty ?? 1000;
    if (options.planQty === undefined) {
      secureLog('warn', '[convertToFormalWorkOrder] planQty 未提供，使用默认值 1000', { cardId });
    }
    const workOrderNo = await this.generateFormalWorkOrderNo();
    const productName = card.sample_name || card.product_name || `打样产品 ${card.sample_no}`;
    if (!card.sample_name && !card.product_name) {
      secureLog(
        'warn',
        '[convertToFormalWorkOrder] 工艺卡缺少 sample_name 和 product_name，使用兜底名称',
        { cardId, productName }
      );
    }

    secureLog('info', '[convertToFormalWorkOrder] 准备数据完成', {
      cardId,
      sampleNo: card.sample_no,
      workOrderNo,
      productName,
      planQty,
      itemCount: card.items?.length || 0,
      stepCount: card.steps?.length || 0,
    });

    let phase = 'init';
    try {
      return await transaction(async (conn) => {
        phase = 'insert_work_order';
        secureLog('info', '[convertToFormalWorkOrder] 写入 prod_work_order', {
          workOrderNo,
          planQty,
        });
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
        secureLog('info', '[convertToFormalWorkOrder] prod_work_order 写入成功', {
          workOrderId,
          workOrderNo,
        });

        if (card.items && card.items.length > 0) {
          phase = 'insert_bom_items';
          secureLog('info', '[convertToFormalWorkOrder] 写入 BOM 明细', {
            workOrderId,
            itemCount: card.items.length,
          });
          let lineNo = 1;
          for (const item of card.items) {
            if (!item.material_id) {
              secureLog('warn', '[convertToFormalWorkOrder] BOM 行缺少 material_id，将写入 null', {
                workOrderId,
                lineNo,
                materialName: item.material_name,
              });
            }
            const itemQty = Number(item.unit_dosage || 0) * planQty;
            const itemTotal = itemQty * Number(item.unit_cost || 0);
            secureLog('info', '[convertToFormalWorkOrder] BOM 行', {
              lineNo,
              materialName: item.material_name,
              materialId: item.material_id,
              unitDosage: item.unit_dosage,
              planQty,
              itemQty,
              unitCost: item.unit_cost,
              itemTotal,
            });
            await conn.execute(
              `INSERT INTO prod_work_order_item
               (work_order_id, line_no, material_id, material_name, quantity, unit, unit_price, total_price, create_time)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                workOrderId,
                lineNo++,
                item.material_id || null,
                item.material_name || '',
                itemQty,
                item.unit || 'pcs',
                Number(item.unit_cost || 0),
                itemTotal,
              ] as Loose[]
            );
          }
          secureLog('info', '[convertToFormalWorkOrder] BOM 明细写入完成', {
            workOrderId,
            totalLines: lineNo - 1,
          });
        } else {
          secureLog('info', '[convertToFormalWorkOrder] 无物料明细，跳过 BOM 写入', {
            workOrderId,
          });
        }

        phase = 'update_card_work_order_id';
        secureLog('info', '[convertToFormalWorkOrder] 回写工艺卡 formal_work_order_id', {
          cardId,
          workOrderId,
        });
        await conn.execute(
          `UPDATE dcprint_sample_process_card SET formal_work_order_id = ?, update_by = ?, update_time = NOW() WHERE id = ?`,
          [workOrderId, userId, cardId]
        );

        phase = 'save_events';
        secureLog('info', '[convertToFormalWorkOrder] 持久化领域事件', { cardId, workOrderId });
        await getDomainEventOutbox().saveEvents(conn, 'SampleProcessCard', cardId, [
          new SampleCardConvertedToWorkOrderEvent({
            cardId,
            workOrderId,
            workOrderNo,
            planQty,
            userId,
          }),
        ]);

        secureLog('info', '[convertToFormalWorkOrder] 转正式工单完成', {
          cardId,
          workOrderId,
          workOrderNo,
          planQty,
          userId,
        });
        return { workOrderId, workOrderNo };
      });
    } catch (error) {
      secureLog('error', '[convertToFormalWorkOrder] 转正式工单失败', {
        cardId,
        workOrderNo,
        planQty,
        userId,
        phase,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
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
    const ctx = { module: 'sample-card', action: 'getCostVariance', cardId };
    const card = await this.getCardDetail(cardId);
    if (!card) {
      logger.warn(ctx, `工艺卡不存在`);
      throw new Error('工艺卡不存在');
    }

    const estimated = {
      materialCost: Number(card.total_material_cost || 0),
      laborCost: Number(card.total_labor_cost || 0),
      toolCost: Number(card.total_tool_cost || 0),
      totalCost: Number(card.total_cost || 0),
    };

    let actual = { ...estimated };
    let workOrderNo: string | null = null;

    if (card.formal_work_order_id) {
      const woRows: Loose = await query(
        `SELECT work_order_no FROM prod_work_order WHERE id = ? LIMIT 1`,
        [card.formal_work_order_id]
      );
      if (woRows.length > 0) workOrderNo = woRows[0].work_order_no;

      const itemRows: Loose = await query(
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

    logger.info(ctx, `成本差异分析`, {
      sampleNo: card.sample_no,
      workOrderNo,
      estimated,
      actual,
      variance,
    });

    return { estimated, actual, variance, workOrderNo };
  }
}
