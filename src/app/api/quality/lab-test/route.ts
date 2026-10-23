import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { numericFilter } from '@/lib/query-filter';
import { calculateDeltaE, judgeDeltaE } from '@/lib/color-diff';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const testNo = searchParams.get('testNo') || '';
  const productName = searchParams.get('productName') || '';
  const testType = searchParams.get('testType') || '';
  const status = numericFilter(searchParams.get('status'));

  let where = 'WHERE deleted = 0';
  const params: SqlValue[] = [];
  if (testNo) {
    where += ' AND test_no LIKE ?';
    params.push('%' + testNo + '%');
  }
  if (productName) {
    where += ' AND product_name LIKE ?';
    params.push('%' + productName + '%');
  }
  if (testType) {
    where += ' AND test_type = ?';
    params.push(testType);
  }
  if (status !== undefined) {
    where += ' AND status = ?';
    params.push(Number(status));
  }

  const totalRows = await query('SELECT COUNT(*) as total FROM qms_lab_test ' + where, params);
  const total = totalRows[0]?.total || 0;
  const rows = await query(
    'SELECT * FROM qms_lab_test ' + where + ' ORDER BY create_time DESC LIMIT ? OFFSET ?',
    [...params, pageSize, (page - 1) * pageSize]
  );
  return successResponse({ list: rows, total, page, pageSize });
});

/**
 * 签样色样基准联动（POST/PUT 共用）：
 * - color_standard_id 为 null/undefined → 清除 detail_data 中的联动信息
 * - 有 id → 查色样基准 Lab，有 measured_lab 则按 CIE76 算 ΔE 并判定（阈值取色样档案 de_threshold），
 *   结果 merge 进 detail_data.color_standard
 * 返回 judge 为 ''（未判定）或 'pass'/'fail'；found=false 表示色样不存在（调用方不更新）。
 */
async function resolveColorStandardLink(
  body: {
    color_standard_id?: number | string | null;
    measured_lab?: { l: number; a: number; b: number };
  },
  detail_data: unknown
): Promise<{ detail: SqlValue; judge: '' | 'pass' | 'fail'; found: boolean }> {
  let baseDetail: Record<string, unknown> = {};
  if (typeof detail_data === 'string' && detail_data) {
    try {
      baseDetail = JSON.parse(detail_data) as Record<string, unknown>;
    } catch {
      baseDetail = { raw: detail_data };
    }
  } else if (detail_data && typeof detail_data === 'object') {
    baseDetail = detail_data as Record<string, unknown>;
  }

  const csId = body.color_standard_id;
  if (!csId) {
    const rest = { ...baseDetail };
    delete rest.color_standard;
    return {
      detail: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null,
      judge: '',
      found: true,
    };
  }

  const stdRows = await query(
    `SELECT id, color_no, color_name, l_value, a_value, b_value, de_threshold
     FROM sal_sample_color_standard WHERE id = ? AND deleted = 0`,
    [Number(csId)]
  );
  const std = stdRows[0];
  if (!std) {
    return { detail: (detail_data || null) as SqlValue, judge: '', found: false };
  }

  const baseLab = { l: Number(std.l_value), a: Number(std.a_value), b: Number(std.b_value) };
  const threshold = Number(std.de_threshold ?? 1.5);
  const colorInfo: Record<string, unknown> = {
    color_standard_id: std.id,
    color_no: std.color_no,
    color_name: std.color_name,
    base_lab: baseLab,
    de_threshold: threshold,
  };
  let judge: '' | 'pass' | 'fail' = '';
  const ml = body.measured_lab;
  if (
    ml &&
    typeof ml.l === 'number' &&
    typeof ml.a === 'number' &&
    typeof ml.b === 'number'
  ) {
    const deltaE = calculateDeltaE(baseLab, ml);
    judge = judgeDeltaE(deltaE, threshold);
    colorInfo.measured_lab = ml;
    colorInfo.delta_e = deltaE;
    colorInfo.de_judge = judge;
  }
  return { detail: JSON.stringify({ ...baseDetail, color_standard: colorInfo }), judge, found: true };
}

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      product_id,
      product_code,
      product_name,
      batch_no,
      test_type,
      test_items,
      test_standard,
      test_equipment,
      tester,
      test_date,
      result_summary,
      detail_data,
      conclusion,
      remark,
    } = body;

    if (!product_name) return errorResponse(ts('k_1bhfx0a'), 400, 400);

    // 签样色样基准联动（与 PUT 共用 resolveColorStandardLink）
    let finalDetail: SqlValue = detail_data || null;
    let finalConclusion = conclusion || 'pending';
    if ('color_standard_id' in body) {
      const resolved = await resolveColorStandardLink(body, detail_data);
      if (resolved.found) {
        finalDetail = resolved.detail;
        if (resolved.judge && (!conclusion || conclusion === 'pending')) {
          finalConclusion = resolved.judge;
        }
      }
    }

    const now = new Date();
    const testNo =
      'LT' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const result = await execute(
      `INSERT INTO qms_lab_test (test_no, product_id, product_code, product_name, batch_no, test_type, test_items, test_standard, test_equipment, tester, test_date, result_summary, detail_data, conclusion, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testNo,
        product_id || null,
        product_code || null,
        product_name,
        batch_no || null,
        test_type || 'color',
        test_items || null,
        test_standard || null,
        test_equipment || null,
        tester || null,
        test_date || null,
        result_summary || null,
        finalDetail,
        finalConclusion,
        remark || null,
      ]
    );

    return successResponse({ id: result.insertId, test_no: testNo }, ts('k_17bxkkq'));
  },
  { logTitle: '创建实验室测试记录', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const {
      id,
      product_id,
      product_code,
      product_name,
      batch_no,
      test_type,
      test_items,
      test_standard,
      test_equipment,
      tester,
      test_date,
      result_summary,
      detail_data,
      conclusion,
      status,
      remark,
    } = body;

    if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

    const fields: string[] = [];
    const values: SqlValue[] = [];

    if (product_id !== undefined) {
      fields.push('product_id = ?');
      values.push(product_id);
    }
    if (product_code !== undefined) {
      fields.push('product_code = ?');
      values.push(product_code);
    }
    if (product_name !== undefined) {
      fields.push('product_name = ?');
      values.push(product_name);
    }
    if (batch_no !== undefined) {
      fields.push('batch_no = ?');
      values.push(batch_no);
    }
    if (test_type !== undefined) {
      fields.push('test_type = ?');
      values.push(test_type);
    }
    if (test_items !== undefined) {
      fields.push('test_items = ?');
      values.push(test_items);
    }
    if (test_standard !== undefined) {
      fields.push('test_standard = ?');
      values.push(test_standard);
    }
    if (test_equipment !== undefined) {
      fields.push('test_equipment = ?');
      values.push(test_equipment);
    }
    if (tester !== undefined) {
      fields.push('tester = ?');
      values.push(tester);
    }
    if (test_date !== undefined) {
      fields.push('test_date = ?');
      values.push(test_date);
    }
    if (result_summary !== undefined) {
      fields.push('result_summary = ?');
      values.push(result_summary);
    }
    if (detail_data !== undefined) {
      fields.push('detail_data = ?');
      values.push(detail_data);
    }
    if (conclusion !== undefined) {
      fields.push('conclusion = ?');
      values.push(conclusion);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }
    if (remark !== undefined) {
      fields.push('remark = ?');
      values.push(remark);
    }

    // 签样色样基准联动（编辑重算 ΔE）：显式传 color_standard_id（含 null 清除）时重写 detail_data
    if ('color_standard_id' in body) {
      const resolved = await resolveColorStandardLink(body, detail_data);
      if (resolved.found) {
        const ddIdx = fields.indexOf('detail_data = ?');
        if (ddIdx >= 0) {
          fields.splice(ddIdx, 1);
          values.splice(ddIdx, 1);
        }
        fields.push('detail_data = ?');
        values.push(resolved.detail);
        if (resolved.judge && (!conclusion || conclusion === 'pending')) {
          const ccIdx = fields.indexOf('conclusion = ?');
          if (ccIdx >= 0) {
            fields.splice(ccIdx, 1);
            values.splice(ccIdx, 1);
          }
          fields.push('conclusion = ?');
          values.push(resolved.judge);
        }
      }
    }

    if (fields.length === 0) return errorResponse(ts('k_1kyikfw'), 400, 400);

    values.push(id);
    await execute('UPDATE qms_lab_test SET ' + fields.join(', ') + ' WHERE id = ?', values);
    return successResponse(null, ts('k_12roq8f'));
  },
  { logTitle: '更新实验室测试记录', logType: 'business' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse(ts('k_32pxya'), 400, 400);

    await execute('UPDATE qms_lab_test SET deleted = 1 WHERE id = ?', [id]);
    return successResponse(null, ts('k_103jvi7'));
  },
  { logTitle: '删除实验室测试记录', logType: 'business' }
);
