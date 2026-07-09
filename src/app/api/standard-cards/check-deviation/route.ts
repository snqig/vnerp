import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ProcessStandardItem, StandardCard } from '../route';

// POST /api/standard-cards/check-deviation - 参数偏差检测（设计文档 6.5 节）
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { standard_card_id, actual_params } = body;

    if (!standard_card_id) {
      return errorResponse('缺少标准卡ID', 400, 400);
    }

    if (!actual_params || !Array.isArray(actual_params) || actual_params.length === 0) {
      return errorResponse('缺少实际参数数据', 400, 400);
    }

    // 查询标准卡信息
    const card = await queryOne<StandardCard>(
      'SELECT * FROM prd_standard_card WHERE id = ? AND deleted = 0',
      [standard_card_id]
    );

    if (!card) {
      return commonErrors.notFound('标准卡不存在');
    }

    // 查询标准卡的工艺参数明细
    const standardItems = await query<ProcessStandardItem>(
      'SELECT * FROM process_standard_items WHERE standard_card_id = ?',
      [standard_card_id]
    );

    // 构建参数映射表
    const paramMap = new Map<string, ProcessStandardItem>();
    for (const item of standardItems) {
      paramMap.set(item.parameter_name, item);
    }

    // 计算偏差
    const deviations: Loose[] = [];
    let hasDeviation = false;
    let warningLevel = 'success';

    for (const actual of actual_params) {
      const standard = paramMap.get(actual.parameter_name);

      if (!standard) {
        deviations.push({
          parameter_name: actual.parameter_name,
          standard_value: 'N/A',
          actual_value: actual.actual_value,
          tolerance: 'N/A',
          deviation: 'N/A',
          is_within_tolerance: false,
          message: '未找到对应的标准值',
        });
        hasDeviation = true;
        warningLevel = 'warning';
        continue;
      }

      const stdValue = parseFloat(standard.standard_value);
      const actValue = parseFloat(actual.actual_value);
      const tolerance = parseFloat(standard.tolerance?.replace(/[±%]/g, '') || '0');

      const deviation = actValue - stdValue;
      const isWithinTolerance = Math.abs(deviation) <= tolerance;

      if (!isWithinTolerance) {
        hasDeviation = true;
        if (Math.abs(deviation) > tolerance * 2) {
          warningLevel = 'error';
        } else if (warningLevel !== 'error') {
          warningLevel = 'warning';
        }
      }

      deviations.push({
        parameter_name: actual.parameter_name,
        standard_value: standard.standard_value,
        actual_value: actual.actual_value,
        tolerance: standard.tolerance,
        deviation: deviation >= 0 ? `+${deviation}` : `${deviation}`,
        is_within_tolerance: isWithinTolerance,
        unit: standard.unit,
      });
    }

    return successResponse({
      has_deviation: hasDeviation,
      deviations: deviations,
      warning_level: warningLevel,
      standard_card: {
        card_no: card.card_no,
        product_name: card.product_name,
        version: card.version,
      },
    });
  },
  { logTitle: '参数偏差检测', logType: 'business' }
);
