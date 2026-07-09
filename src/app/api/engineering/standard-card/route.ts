import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { query, transaction } from '@/lib/db';
import {
  createCardWithVersion,
  updateCardWithVersion,
  getVersionHistory,
  approveCardVersion,
  getTemplates,
  compareVersions,
} from '@/lib/standard-card-service';

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { card_data, template_id, copy_from_id } = body;

    if (!card_data) return errorResponse('请提供工艺卡数据', 400, 400);

    const result = await transaction(async (conn) => {
      return await createCardWithVersion(conn, card_data, template_id, copy_from_id);
    });

    return successResponse(result);
  },
  { logTitle: '创建工艺卡', logType: 'business' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      const { card_id, version, approver_name } = body;
      if (!card_id || !version) return errorResponse('请提供工艺卡ID和版本号', 400, 400);
      await transaction(async (conn) => {
        await approveCardVersion(conn, card_id, version, approver_name || 'system');
      });
      return successResponse({ message: '审批成功' });
    }

    const { card_id, updates, change_description } = body;
    if (!card_id || !updates) return errorResponse('请提供工艺卡ID和更新数据', 400, 400);

    const result = await transaction(async (conn) => {
      return await updateCardWithVersion(
        conn,
        card_id,
        updates,
        'system',
        change_description || ''
      );
    });

    return successResponse(result);
  },
  { logTitle: '更新工艺卡', logType: 'business' }
);

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'list';

  if (action === 'templates') {
    const category = searchParams.get('category') || undefined;
    const templates = await transaction(async (conn) => {
      return await getTemplates(conn, category);
    });
    return successResponse(templates);
  }

  if (action === 'versions') {
    const cardId = parseInt(searchParams.get('card_id') || '0');
    if (!cardId) return errorResponse('请提供工艺卡ID', 400, 400);
    const history = await transaction(async (conn) => {
      return await getVersionHistory(conn, cardId);
    });
    return successResponse(history);
  }

  if (action === 'compare') {
    const v1 = searchParams.get('old_params');
    const v2 = searchParams.get('new_params');
    if (!v1 || !v2) return errorResponse('请提供对比参数', 400, 400);
    const diff = compareVersions(JSON.parse(v1), JSON.parse(v2));
    return successResponse(diff);
  }

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');
  const keyword = searchParams.get('keyword') || '';

  let where = 'WHERE 1=1';
  const params: Loose[] = [];
  if (keyword) {
    where += ' AND (card_no LIKE ? OR product_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const total: Loose = await query(
    `SELECT COUNT(*) as count FROM prd_process_card ${where}`,
    params
  );
  const rows: Loose = await query(
    `SELECT * FROM prd_process_card ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return paginatedResponse(rows, {
    page,
    pageSize,
    total: Number(total[0]?.count || 0),
    totalPages: Math.ceil(Number(total[0]?.count || 0) / pageSize),
  });
});
