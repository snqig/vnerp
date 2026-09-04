import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, execute, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

/**
 * 可经通用更新写入的字段白名单（防止任意字段注入）。
 * 与 eng_sample_to_mass 表列一一对应（创建/编辑/确认共用）。
 */
const EDITABLE_FIELDS = [
  'sample_order_id',
  'sample_order_no',
  'product_id',
  'product_code',
  'product_name',
  'customer_id',
  'customer_name',
  'standard_card_id',
  'standard_card_no',
  'process_card_id',
  'process_card_no',
  'bom_id',
  'bom_version',
  'sample_params',
  'mass_params',
  'sop_file',
  'process_route',
  'check_standard',
  'special_note',
  'remark',
  'workorder_id',
  'workorder_no',
  'conversion_date',
  'approved_by',
  'status',
] as const;

/** 状态 -> 对应确认人/确认日期字段（确认流转时由后端自动填当前用户） */
const STATUS_CONFIRMER: Record<number, { who: string; date: string }> = {
  2: { who: 'sample_confirmer', date: 'sample_confirm_date' },
  3: { who: 'eng_confirmer', date: 'eng_confirm_date' },
  4: { who: 'prod_confirmer', date: 'prod_confirm_date' },
  5: { who: 'quality_confirmer', date: 'quality_confirm_date' },
};

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || '';
  const sampleOrderNo = searchParams.get('sampleOrderNo') || '';
  const productName = searchParams.get('productName') || '';
  const boms = searchParams.get('boms') || '';
  const productId = searchParams.get('productId') || '';

  // BOM 列表（供前端「BOM版本」关联下拉）
  if (boms === '1') {
    let sql = `SELECT id, bom_name, version, product_id FROM prd_bom WHERE deleted = 0`;
    const params: SqlValue[] = [];
    if (productId) {
      sql += ' AND product_id = ?';
      params.push(Number(productId));
    }
    sql += ' ORDER BY id DESC';
    const rows = await query(sql, params);
    return successResponse(rows);
  }

  let where = 'WHERE stm.deleted = 0';
  const params: SqlValue[] = [];

  if (status) {
    where += ' AND stm.status = ?';
    params.push(Number(status));
  }
  if (sampleOrderNo) {
    where += ' AND stm.sample_order_no LIKE ?';
    params.push(`%${sampleOrderNo}%`);
  }
  if (productName) {
    where += ' AND stm.product_name LIKE ?';
    params.push(`%${productName}%`);
  }

  const totalRows = await query(
    `SELECT COUNT(*) as total FROM eng_sample_to_mass stm ${where}`,
    params
  );
  const total = totalRows[0]?.total || 0;

  const rows = await query(
    `SELECT stm.* FROM eng_sample_to_mass stm ${where} ORDER BY stm.create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list: rows, total, page, pageSize });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      sample_order_id,
      sample_order_no,
      product_id,
      product_code,
      product_name,
      customer_id,
      customer_name,
      standard_card_id,
      standard_card_no,
      process_card_id,
      process_card_no,
      bom_id,
      bom_version,
      sample_params,
      mass_params,
      sop_file,
      process_route,
      check_standard,
      special_note,
      remark,
      create_by,
    } = body;

    if (!sample_order_no) {
      return errorResponse(ts('k_tyvxc7'), 400, 400);
    }

    const result = await transaction(async (conn) => {
      const [existing] = await conn.execute(
        'SELECT id, status FROM eng_sample_to_mass WHERE sample_order_no = ? AND deleted = 0',
        [sample_order_no]
      );

      if (existing.length > 0 && existing[0].status >= 3) {
        throw new Error(ts('k_g4banz'));
      }

      // 转移单号：缺失时自动生成，保证唯一（STM-YYYYMMDD-NNN）
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [seqRows] = await conn.execute(
        'SELECT COUNT(*) AS c FROM eng_sample_to_mass WHERE transfer_no LIKE ?',
        [`STM-${today}-%`]
      );
      const transferNo = `STM-${today}-${String((seqRows[0]?.c || 0) + 1).padStart(3, '0')}`;

      if (existing.length > 0 && existing[0].status < 3) {
        await conn.execute(
          `UPDATE eng_sample_to_mass SET
          product_id = ?, product_code = ?, product_name = ?, customer_id = ?, customer_name = ?,
          standard_card_id = ?, standard_card_no = ?, process_card_id = ?, process_card_no = ?,
          bom_id = ?, bom_version = ?, sample_params = ?, mass_params = ?, sop_file = ?,
          process_route = ?, check_standard = ?, special_note = ?, remark = ?, create_by = ?
        WHERE id = ?`,
          [
            product_id || null,
            product_code || null,
            product_name || null,
            customer_id || null,
            customer_name || null,
            standard_card_id || null,
            standard_card_no || null,
            process_card_id || null,
            process_card_no || null,
            bom_id || null,
            bom_version || null,
            sample_params || null,
            mass_params || null,
            sop_file || null,
            process_route || null,
            check_standard || null,
            special_note || null,
            remark || null,
            create_by || null,
            existing[0].id,
          ]
        );
        return { id: existing[0].id, updated: true };
      }

      const [insertResult] = await conn.execute(
        `INSERT INTO eng_sample_to_mass (
          transfer_no, sample_order_id, sample_order_no, product_id, product_code, product_name,
          customer_id, customer_name, standard_card_id, standard_card_no, process_card_id, process_card_no,
          bom_id, bom_version, sample_params, mass_params, sop_file, process_route, check_standard,
          special_note, remark, create_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          transferNo,
          sample_order_id || null,
          sample_order_no,
          product_id || null,
          product_code || null,
          product_name || null,
          customer_id || null,
          customer_name || null,
          standard_card_id || null,
          standard_card_no || null,
          process_card_id || null,
          process_card_no || null,
          bom_id || null,
          bom_version || null,
          sample_params || null,
          mass_params || null,
          sop_file || null,
          process_route || null,
          check_standard || null,
          special_note || null,
          remark || null,
          create_by || null,
        ]
      );

      return { id: insertResult.insertId, created: true, transfer_no: transferNo };
    });

    return successResponse(result, ts('k_1xkhus2'));
  },
  { logTitle: '样品转量产', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action, bom_id, workorder_id, workorder_no, approved_by, remark } = body;

    if (!id) {
      return errorResponse(ts('k_2jkzf5'), 400, 400);
    }

    if (action === 'convert') {
      const result = await transaction(async (conn) => {
        const [recordRows] = await conn.execute(
          'SELECT * FROM eng_sample_to_mass WHERE id = ? AND deleted = 0 FOR UPDATE',
          [id]
        );

        if (recordRows.length === 0) {
          throw new Error(ts('k_1fi4arp'));
        }

        const record = recordRows[0];
        if (record.status >= 3) {
          throw new Error(ts('k_1svgifr'));
        }

        if (!record.standard_card_id && !record.process_card_id) {
          throw new Error(ts('k_1mpktak'));
        }

        const conversionDate = new Date().toISOString().slice(0, 10);

        await conn.execute(
          `UPDATE eng_sample_to_mass SET
          bom_id = ?, workorder_id = ?, workorder_no = ?,
          conversion_date = ?, approved_by = ?, status = 3, remark = ?
        WHERE id = ?`,
          [
            bom_id || null,
            workorder_id || null,
            workorder_no || null,
            conversionDate,
            approved_by || null,
            remark || null,
            id,
          ]
        );

        if (workorder_id) {
          await conn.execute(
            `UPDATE prod_work_order SET
            sales_order_id = NULL,
            standard_card_id = ?,
            process_card_id = ?
          WHERE id = ? AND deleted = 0`,
            [record.standard_card_id, record.process_card_id, workorder_id]
          );
        }

        return { id, status: 3, conversion_date: conversionDate };
      });

      return successResponse(result, ts('k_1tljy4k'));
    }

    if (action === 'cancel') {
      await execute('UPDATE eng_sample_to_mass SET status = 4 WHERE id = ?', [id]);
      return successResponse(null, ts('k_s3z06b'));
    }

    // 通用字段更新（编辑保存 / 确认流转共用）
    const patch: Record<string, unknown> = {};
    for (const f of EDITABLE_FIELDS) {
      if (f in body && body[f] !== undefined) {
        patch[f] = body[f];
      }
    }

    // 确认流转：按目标状态回填对应确认人/日期（取当前登录用户）
    const confirmerName = (userInfo as DbRow)?.realName || (userInfo as DbRow)?.username || '';
    const newStatus = Number(body.status);
    if (newStatus && STATUS_CONFIRMER[newStatus]) {
      const { who, date } = STATUS_CONFIRMER[newStatus];
      patch[who] = confirmerName || patch[who] || null;
      patch[date] = new Date().toISOString().slice(0, 10);
    }

    if (Object.keys(patch).length === 0) {
      return errorResponse(ts('k_15vo87k'), 400, 400);
    }

    const setClause = Object.keys(patch)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(patch), id];

    await execute(
      `UPDATE eng_sample_to_mass SET ${setClause}, update_time = NOW() WHERE id = ? AND deleted = 0`,
      values
    );

    return successResponse({ id, updated: Object.keys(patch) }, ts('k_1795bzg'));
  },
  { logTitle: '更新转量产', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return errorResponse(ts('k_18kulrp'), 400, 400);
    }
    await execute('UPDATE eng_sample_to_mass SET deleted = 1, update_time = NOW() WHERE id = ?', [
      id,
    ]);
    return successResponse(null, ts('k_1hlqs'));
  },
  { logTitle: '删除转量产', logType: 'business' }
);
