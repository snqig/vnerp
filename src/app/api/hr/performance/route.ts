import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * HR 绩效考核（/hr/performance）
 * GET    列表：sys_employee LEFT JOIN hr_performance，未打分员工带 0 默认值
 * POST   保存：body.scores[] 按 employee_id UPSERT（软删行自动复活）
 * DELETE ?id= 软删除单条绩效记录
 */

interface ScoreInput {
  employeeId: number;
  outputRate: number;
  qualityRate: number;
  equipmentRate: number;
  siteManagement: number;
}

const isScoreInput = (v: unknown): v is ScoreInput => {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.employeeId === 'number' &&
    typeof r.outputRate === 'number' &&
    typeof r.qualityRate === 'number' &&
    typeof r.equipmentRate === 'number' &&
    typeof r.siteManagement === 'number'
  );
};

export const GET = withPermission(
  async () => {
    const rows = await query(
      `SELECT
         p.id AS perf_id,
         e.id AS employee_id,
         e.name AS employee_name,
         e.employee_no,
         COALESCE(p.output_rate, 0) AS output_rate,
         COALESCE(p.quality_rate, 0) AS quality_rate,
         COALESCE(p.equipment_rate, 0) AS equipment_rate,
         COALESCE(p.site_management, 0) AS site_management
       FROM sys_employee e
       LEFT JOIN hr_performance p
         ON p.employee_id = e.id AND p.deleted = 0
       WHERE e.deleted = 0
       ORDER BY e.employee_no, e.id`
    );
    return successResponse({ list: rows, total: rows.length });
  },
  { errorMessage: '获取绩效考核列表失败' }
);

export const POST = withPermission(
  async (request: NextRequest) => {
    const body = (await request.json()) as { scores?: unknown };
    if (!Array.isArray(body.scores)) {
      return errorResponse('参数错误：scores 必须为数组', 400, 400);
    }
    const scores = body.scores.filter(isScoreInput);
    for (const s of scores) {
      await execute(
        `INSERT INTO hr_performance
           (employee_id, employee_name, employee_no, output_rate, quality_rate, equipment_rate, site_management, deleted)
         SELECT e.id, e.name, e.employee_no, ?, ?, ?, ?, 0
           FROM sys_employee e WHERE e.id = ? AND e.deleted = 0
         ON DUPLICATE KEY UPDATE
           output_rate = VALUES(output_rate),
           quality_rate = VALUES(quality_rate),
           equipment_rate = VALUES(equipment_rate),
           site_management = VALUES(site_management),
           deleted = 0`,
        [
          s.outputRate,
          s.qualityRate,
          s.equipmentRate,
          s.siteManagement,
          s.employeeId,
        ]
      );
    }
    return successResponse({ saved: scores.length });
  },
  { errorMessage: '保存绩效考核失败' }
);

export const DELETE = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('缺少参数 id', 400, 400);
    await execute('UPDATE hr_performance SET deleted = 1 WHERE id = ?', [Number(id)]);
    return successResponse(null);
  },
  { errorMessage: '删除绩效考核记录失败' }
);
