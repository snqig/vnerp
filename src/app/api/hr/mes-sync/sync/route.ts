import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 手动同步（/hr/mes-sync 页「立即同步」按钮）
 *
 * 当前 MES 计件数据为**推送接入模式**：由 MES 侧调用
 *   POST /api/hr/mes-sync/piece-work  { records: [...] }
 * 推送写入 hr_piece_work_detail。系统内不存在 MES 拉取客户端
 * （无 MES_URL 等接入配置），因此本端点不能伪造拉取动作，
 * 明确返回 501 告知调用方真实接入方式。
 */
export const POST = withPermission(
  async () => {
    return errorResponse(
      'MES 计件数据为推送接入模式：请由 MES 侧调用 POST /api/hr/mes-sync/piece-work 推送数据；系统暂未配置 MES 拉取通道。如需主动拉取，请提供 MES 侧 API 接入信息。',
      501,
      501
    );
  },
  { errorMessage: '触发 MES 同步失败' }
);
