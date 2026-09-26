import { getTranslations } from 'next-intl/server';
import type { DbRow } from '@/types/db';

;
import { NextRequest } from 'next/server';
import { query, queryOne, SqlValue } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { ProcessStandardItem, StandardCard } from '../route';

// POST /api/standard-cards/check-deviation - 参数偏差检测（设计文档 6.5 节）
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { standard_card_id, actual_params } = body;

    if (!standard_card_id) {
      return errorResponse(ts('k_1ql7lmh'), 400, 400);
    }

    if (!actual_params || !Array.isArray(actual_params) || actual_params.length === 0) {
      return errorResponse(ts('k_1qrq4hp'), 400, 400);
    }

    // 查询标准卡信息
    const card = await queryOne<StandardCard>(
      'SELECT * FROM prd_standard_card WHERE id = ? AND deleted = 0',
      [standard_card_id]
    );

    if (!card) {
      return commonErrors.notFound(ts('k_10y4j6y'));
    }

    // 工艺参数明细表 process_standard_items 在当前库里并不存在（早期代码按设想的 schema 写死，
    // 运行期必然报 Table doesn't exist → 接口 500）。在明细子表落地之前，偏差检测没有可比对的
    // 标准值，这里明确返回空表而不是报错，调用方据此把每条实测值判为「无标准可比对」。
    // TODO(数据模型)：补建 process_standard_items 后接回。
    const standardItems: ProcessStandardItem[] = [];

    // 构建参数映射表
    const paramMap = new Map<string, ProcessStandardItem>();
    for (const item of standardItems) {
      paramMap.set(item.parameter_name, item);
    }

    // 计算偏差
    const deviations: DbRow[] = [];
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
          message: ts('k_1syckzt'),
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
        tolerance: standard.tolerance ?? null,
        deviation: deviation >= 0 ? `+${deviation}` : `${deviation}`,
        is_within_tolerance: isWithinTolerance,
        unit: standard.unit ?? null,
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
