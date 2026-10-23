/**
 * 打样签样登记 — 应用服务
 *
 * 签样标准管理闭环：签样确认时同步完成
 *   1. 签样登记（签样人 / 客户代表 / 留样数量 / 留样位置）
 *   2. 色样档案（每专色一条 Lab 基准，供 lab-test color_diff 对照 ΔE）
 *   3. 打样单交付状态 → signed
 *
 * 前置：仅 delivered（已交付）状态可签样；重复签样拒绝。
 */
import { transaction, query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { toLocalDateStr } from '@/lib/date-utils';
import type { DbRow, DbConnection } from '@/types/db';
import type { ResultSetHeader } from 'mysql2/promise';

// ===== 输入类型 =====

export interface SignColorInput {
  color_name: string;
  l_value: number;
  a_value: number;
  b_value: number;
  measure_device?: string | null;
  measure_date?: string | null;
  color_sample_url?: string | null;
  de_threshold?: number | null;
}

export interface CreateSignRecordInput {
  sample_order_id: number;
  sign_date?: string | null;
  customer_rep?: string | null;
  retained_qty?: number | null;
  retained_location?: string | null;
  remark?: string | null;
  colors?: SignColorInput[];
}

// ===== 私有：编号生成（事务内取当日最大序号） =====

async function nextSeq(
  conn: DbConnection,
  table: 'sal_sample_sign_record' | 'sal_sample_color_standard',
  column: 'sign_no' | 'color_no',
  prefix: string
): Promise<string> {
  const [rows] = await conn.execute(
    `SELECT ${column} FROM ${table} WHERE ${column} LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  const last = (rows as DbRow[])[0]?.[column];
  if (typeof last === 'string') {
    const parsed = parseInt(last.slice(-5), 10);
    if (!isNaN(parsed)) seq = parsed + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

function todayPrefix(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return ymd;
}

// ===== 服务 =====

export class SampleSignRecordService {
  /**
   * 创建签样登记（事务）：
   * 校验订单状态 → 插入签样登记 → 逐条插入色样档案 → delivery_status 置 signed
   */
  async createSignRecord(
    input: CreateSignRecordInput,
    userId: number
  ): Promise<{ id: number; signNo: string; colorNos: string[] }> {
    const ctx = { module: 'sample-sign', action: 'createSignRecord', userId };

    return await transaction(async (conn) => {
      const [orderRows] = await conn.execute(
        `SELECT id, order_no, customer_name, product_name, delivery_status
         FROM sal_sample_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
        [input.sample_order_id]
      );
      const order = (orderRows as DbRow[])[0];
      if (!order) {
        throw new Error('打样订单不存在');
      }
      if (order.delivery_status === 'signed') {
        throw new Error('该打样单已签样，请勿重复签样');
      }
      if (order.delivery_status !== 'delivered') {
        throw new Error('打样单尚未交付，无法签样');
      }

      const signNo = await nextSeq(conn, 'sal_sample_sign_record', 'sign_no', `SG${todayPrefix()}`);
      const signDate = input.sign_date || toLocalDateStr();
      const colors = input.colors ?? [];

      const [signResult] = await conn.execute(
        `INSERT INTO sal_sample_sign_record
         (sign_no, sample_order_id, sample_order_no, customer_name, product_name,
          sign_date, sign_by, customer_rep, retained_qty, retained_location, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          signNo,
          input.sample_order_id,
          order.order_no,
          order.customer_name ?? null,
          order.product_name ?? null,
          signDate,
          userId,
          input.customer_rep ?? null,
          input.retained_qty ?? 0,
          input.retained_location ?? null,
          input.remark ?? null,
          userId,
        ]
      );
      const signRecordId = (signResult as unknown as ResultSetHeader).insertId;

      logger.info(ctx, 'create sign record', {
        signNo,
        sampleOrderId: input.sample_order_id,
        sampleOrderNo: order.order_no,
        colorCount: colors.length,
        retainedQty: input.retained_qty ?? 0,
      });

      const colorPrefix = `CS${todayPrefix()}`;
      const colorNos: string[] = [];
      for (const color of colors) {
        const colorNo = await nextSeq(conn, 'sal_sample_color_standard', 'color_no', colorPrefix);
        await conn.execute(
          `INSERT INTO sal_sample_color_standard
           (color_no, sign_record_id, sample_order_id, sample_order_no, color_name,
            l_value, a_value, b_value, measure_device, measure_date, color_sample_url, de_threshold, create_by, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            colorNo,
            signRecordId,
            input.sample_order_id,
            order.order_no,
            color.color_name,
            color.l_value,
            color.a_value,
            color.b_value,
            color.measure_device ?? null,
            color.measure_date ?? null,
            color.color_sample_url ?? null,
            color.de_threshold ?? 1.5,
            userId,
          ]
        );
        colorNos.push(colorNo);
      }

      await conn.execute(
        `UPDATE sal_sample_order SET delivery_status = 'signed', update_time = NOW() WHERE id = ?`,
        [input.sample_order_id]
      );

      return { id: signRecordId, signNo, colorNos };
    });
  }

  /** 按打样单查签样登记（含色样档案），无登记返回 null */
  async getSignRecordByOrderId(
    sampleOrderId: number
  ): Promise<{ record: DbRow; colors: DbRow[] } | null> {
    const records = await query(
      `SELECT * FROM sal_sample_sign_record WHERE sample_order_id = ? AND deleted = 0 ORDER BY id DESC LIMIT 1`,
      [sampleOrderId]
    );
    const record = (records as DbRow[])[0];
    if (!record) return null;

    const colors = await query(
      `SELECT * FROM sal_sample_color_standard WHERE sign_record_id = ? AND deleted = 0 ORDER BY id`,
      [record.id]
    );

    return { record, colors: colors as DbRow[] };
  }

  /** 色样档案列表（供 lab-test 关联选择），按 keyword 匹配编号/色名/打样单号 */
  async listColorStandards(params: { keyword?: string; limit?: number }): Promise<DbRow[]> {
    const conditions: string[] = ['deleted = 0'];
    const values: (string | number)[] = [];

    if (params.keyword) {
      conditions.push('(color_no LIKE ? OR color_name LIKE ? OR sample_order_no LIKE ?)');
      const kw = `%${params.keyword}%`;
      values.push(kw, kw, kw);
    }

    const where = conditions.join(' AND ');
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);

    const rows = await query(
      `SELECT id, color_no, sample_order_id, sample_order_no, color_name,
              l_value, a_value, b_value, de_threshold, measure_device
       FROM sal_sample_color_standard WHERE ${where} ORDER BY id DESC LIMIT ?`,
      [...values, limit]
    );

    return rows as DbRow[];
  }
}
