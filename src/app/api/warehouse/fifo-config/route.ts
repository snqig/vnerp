import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getFIFOMode, setFIFOMode, FIFO_MODE } from '@/lib/fifo-config';

export const GET = withPermission(
  async () => {
    const mode = await getFIFOMode();
    return successResponse({
      mode,
      modes: FIFO_MODE,
      modeLabel: mode === 'off' ? '关闭' : mode === 'hint' ? '提示' : '强制',
    });
  },
  { errorMessage: '获取FIFO配置失败' }
);

export const PUT = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const { mode } = body;

    if (!mode || !Object.values(FIFO_MODE).includes(mode)) {
      return errorResponse('无效的FIFO模式, 可选: off/hint/force', 400, 400);
    }

    await setFIFOMode(mode);
    return successResponse({ mode }, 'FIFO管控模式已更新');
  },
  { errorMessage: '更新FIFO配置失败' }
);
