import { getTranslations } from 'next-intl/server';

;
import { errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(async () => {
  const ts = await getTranslations('Common');
  return errorResponse(ts('k_xxykzh'), 410, 410);
});
