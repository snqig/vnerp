import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';

// 审核类型
type ApproveType = 'review' | 'factory' | 'quality' | 'sales' | 'approve';

// 审核字段映射
const APPROVE_FIELD_MAP: Record<ApproveType, string> = {
  review: 'reviewer',
  factory: 'factory_manager',
  quality: 'quality_manager',
  sales: 'sales',
  approve: 'approver',
};

// 审核状态流转
const STATUS_FLOW: Record<ApproveType, { from: number; to: number }> = {
  review: { from: 1, to: 2 },      // 草稿 -> 待审核
  factory: { from: 2, to: 2 },     // 待审核 -> 待审核（厂务审核）
  quality: { from: 2, to: 2 },     // 待审核 -> 待审核（品管审核）
  sales: { from: 2, to: 2 },      // 待审核 -> 待审核（业务审核）
  approve: { from: 2, to: 3 },    // 待审核 -> 已启用
};

// 审核标准卡
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, type, userId, userName, remark } = body;

  if (!id) {
    return errorResponse('标准卡ID不能为空', 400);
  }

  if (!type || !APPROVE_FIELD_MAP[type as ApproveType]) {
    return errorResponse('审核类型无效', 400);
  }

  if (!userId || !userName) {
    return errorResponse('审核人信息不能为空', 400);
  }

  const approveType = type as ApproveType;
  const field = APPROVE_FIELD_MAP[approveType];

  // 检查标准卡状态
  const [card] = await query<{
    id: number;
    status: number;
    card_no: string;
    [key: string]: any;
  }>(
    `SELECT id, status, card_no, ${field} FROM prd_standard_card WHERE id = ? AND deleted = 0`,
    [id]
  );

  if (!card) {
    return errorResponse('标准卡不存在', 404);
  }

  const flow = STATUS_FLOW[approveType];

  // 检查状态流转是否合法
  if (card.status !== flow.from) {
    return errorResponse(
      `当前状态不允许此操作，当前状态：${getStatusLabel(card.status)}`,
      400
    );
  }

  // 检查是否已审核
  if (card[field]) {
    return errorResponse(
      `该环节已审核，审核人：${card[field]}`,
      400
    );
  }

  // 更新审核信息
  await execute(
    `UPDATE prd_standard_card SET
      ${field} = ?,
      update_time = NOW()
    WHERE id = ?`,
    [userName, id]
  );

  // 如果是最后核准环节，更新状态为已启用
  if (approveType === 'approve') {
    await execute(
      `UPDATE prd_standard_card SET status = 3, update_time = NOW() WHERE id = ?`,
      [id]
    );
  }

  return successResponse(
    { id, type, userName, status: approveType === 'approve' ? 3 : 2 },
    `${getApproveTypeName(approveType)}成功`
  );
}, '审核失败');

// 撤销审核
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id, type, userId, userName, remark } = body;

  if (!id) {
    return errorResponse('标准卡ID不能为空', 400);
  }

  if (!type || !APPROVE_FIELD_MAP[type as ApproveType]) {
    return errorResponse('审核类型无效', 400);
  }

  const approveType = type as ApproveType;
  const field = APPROVE_FIELD_MAP[approveType];

  // 检查标准卡状态
  const [card] = await query<{
    id: number;
    status: number;
    [key: string]: any;
  }>(
    `SELECT id, status, ${field} FROM prd_standard_card WHERE id = ? AND deleted = 0`,
    [id]
  );

  if (!card) {
    return errorResponse('标准卡不存在', 404);
  }

  // 检查是否已审核
  if (!card[field]) {
    return errorResponse('该环节未审核，无法撤销', 400);
  }

  // 如果是核准环节撤销，需要将状态回退到待审核
  if (approveType === 'approve') {
    await execute(
      `UPDATE prd_standard_card SET
        ${field} = NULL,
        status = 2,
        update_time = NOW()
      WHERE id = ?`,
      [id]
    );
  } else {
    await execute(
      `UPDATE prd_standard_card SET
        ${field} = NULL,
        update_time = NOW()
      WHERE id = ?`,
      [id]
    );
  }

  return successResponse(
    { id, type, status: 2 },
    `撤销${getApproveTypeName(approveType)}成功`
  );
}, '撤销审核失败');

// 获取审核状态
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse('标准卡ID不能为空', 400);
  }

  const [card] = await query<{
    id: number;
    status: number;
    reviewer?: string;
    factory_manager?: string;
    quality_manager?: string;
    sales?: string;
    approver?: string;
  }>(
    `SELECT
      id, status,
      reviewer, factory_manager, quality_manager, sales, approver
    FROM prd_standard_card WHERE id = ? AND deleted = 0`,
    [id]
  );

  if (!card) {
    return errorResponse('标准卡不存在', 404);
  }

  const approvalStatus = {
    id: card.id,
    status: card.status,
    statusLabel: getStatusLabel(card.status),
    steps: [
      {
        type: 'review',
        name: '审核',
        approver: card.reviewer,
        status: card.reviewer ? 'completed' : (card.status >= 2 ? 'pending' : 'waiting'),
      },
      {
        type: 'factory',
        name: '厂务',
        approver: card.factory_manager,
        status: card.factory_manager ? 'completed' : (card.status >= 2 ? 'pending' : 'waiting'),
      },
      {
        type: 'quality',
        name: '品管',
        approver: card.quality_manager,
        status: card.quality_manager ? 'completed' : (card.status >= 2 ? 'pending' : 'waiting'),
      },
      {
        type: 'sales',
        name: '业务',
        approver: card.sales,
        status: card.sales ? 'completed' : (card.status >= 2 ? 'pending' : 'waiting'),
      },
      {
        type: 'approve',
        name: '核准',
        approver: card.approver,
        status: card.approver ? 'completed' : (card.status >= 2 ? 'pending' : 'waiting'),
      },
    ],
  };

  return successResponse(approvalStatus);
}, '获取审核状态失败');

// 辅助函数
function getStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    1: '草稿',
    2: '待审核',
    3: '已启用',
    4: '已归档',
  };
  return labels[status] || '未知';
}

function getApproveTypeName(type: ApproveType): string {
  const names: Record<ApproveType, string> = {
    review: '审核',
    factory: '厂务审核',
    quality: '品管审核',
    sales: '业务审核',
    approve: '核准',
  };
  return names[type];
}
