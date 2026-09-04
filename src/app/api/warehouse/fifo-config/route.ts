import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getFIFOMode, setFIFOMode, FIFO_MODE } from '@/lib/fifo-config';

export const GET = withPermission(
  async () => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const mode = await getFIFOMode();
    return successResponse({
      mode,
      modes: FIFO_MODE,
      modeLabel: mode === 'off' ? ts('k_g0fanx') : mode === 'hint' ? tc('info') : ts('k_1wlbznl'),
    });
  },
  { errorMessage: '获取FIFO配置失败' }
);

export const PUT = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { mode } = body;

    if (!mode || !Object.values(FIFO_MODE).includes(mode)) {
      return errorResponse(ts('k_rdgees'), 400, 400);
    }

    await setFIFOMode(mode);
    return successResponse({ mode }, ts('k_6r3rvf'));
  },
  { errorMessage: '更新FIFO配置失败' }
);
