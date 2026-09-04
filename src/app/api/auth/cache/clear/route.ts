import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { clearAllPermissionsCache } from '@/lib/auth-cache';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(
  async (_request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    clearAllPermissionsCache();
    return successResponse(null, ts('k_16di43l'));
  },
  { logTitle: '清除权限缓存', logType: 'system' }
);
