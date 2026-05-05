import { NextRequest } from 'next/server';
import { clearAllPermissionsCache } from '@/lib/auth-cache';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const POST = withErrorHandler(async (request: NextRequest) => {
  clearAllPermissionsCache();
  return successResponse(null, '所有权限缓存已清除');
}, '清除缓存失败');
