import { NextRequest } from 'next/server';
import { clearAllPermissionsCache } from '@/lib/auth-cache';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(async (request: NextRequest, userInfo) => {
  clearAllPermissionsCache();
  return successResponse(null, '所有权限缓存已清除');
}, { logTitle: '清除权限缓存', logType: 'system' });
