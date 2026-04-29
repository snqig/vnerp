import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken, getUserInfo, hasPermission, validateResourceAccess, UserInfo } from './auth';
import { errorResponse } from './api-response';

// 需要认证的API包装器
export function withAuth(
  handler: (request: NextRequest, userInfo: UserInfo) => Promise<NextResponse>,
  options?: {
    permission?: string;
    resourceType?: 'order' | 'workorder' | 'inbound' | 'outbound';
    resourceIdParam?: string;
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // 1. 提取Token
    const token = extractToken(request);
    if (!token) {
      return errorResponse('未提供认证令牌', 401);
    }

    // 2. 验证Token
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload) {
      return errorResponse('认证令牌无效或已过期', 401);
    }

    // 3. 获取用户完整信息
    const userInfo = await getUserInfo(tokenPayload.userId);
    if (!userInfo) {
      return errorResponse('用户不存在或已被禁用', 401);
    }

    // 4. 检查权限
    if (options?.permission && !hasPermission(userInfo, options.permission)) {
      return errorResponse('没有权限执行此操作', 403);
    }

    // 5. 检查资源访问权限（防止横向越权）
    if (options?.resourceType && options?.resourceIdParam) {
      const { searchParams } = new URL(request.url);
      const resourceId = searchParams.get(options.resourceIdParam);
      
      if (resourceId) {
        const hasAccess = await validateResourceAccess(
          userInfo,
          options.resourceType,
          resourceId
        );
        if (!hasAccess) {
          return errorResponse('没有权限访问此资源', 403);
        }
      }
    }

    // 6. 执行处理器
    return handler(request, userInfo);
  };
}

// 带认证和错误处理的API包装器
export function withAuthAndErrorHandler(
  handler: (request: NextRequest, userInfo: UserInfo) => Promise<NextResponse>,
  options?: {
    permission?: string;
    resourceType?: 'order' | 'workorder' | 'inbound' | 'outbound';
    resourceIdParam?: string;
    errorMessage?: string;
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. 提取Token
      const token = extractToken(request);
      if (!token) {
        return errorResponse('未提供认证令牌', 401);
      }

      // 2. 验证Token
      const tokenPayload = await verifyToken(token);
      if (!tokenPayload) {
        return errorResponse('认证令牌无效或已过期', 401);
      }

      // 3. 获取用户完整信息
      const userInfo = await getUserInfo(tokenPayload.userId);
      if (!userInfo) {
        return errorResponse('用户不存在或已被禁用', 401);
      }

      // 4. 检查权限
      if (options?.permission && !hasPermission(userInfo, options.permission)) {
        return errorResponse('没有权限执行此操作', 403);
      }

      // 5. 检查资源访问权限（防止横向越权）
      if (options?.resourceType && options?.resourceIdParam) {
        const { searchParams } = new URL(request.url);
        const resourceId = searchParams.get(options.resourceIdParam);
        
        if (resourceId) {
          const hasAccess = await validateResourceAccess(
            userInfo,
            options.resourceType,
            resourceId
          );
          if (!hasAccess) {
            return errorResponse('没有权限访问此资源', 403);
          }
        }
      }

      // 6. 执行处理器
      return await handler(request, userInfo);
    } catch (error) {
      console.error(`[API Error] ${options?.errorMessage || '请求处理失败'}:`, error);
      return errorResponse(
        options?.errorMessage || '服务器内部错误',
        500
      );
    }
  };
}

// 中间件形式的认证检查（用于Next.js Middleware）
export async function middlewareAuth(request: NextRequest): Promise<UserInfo | null> {
  const token = extractToken(request);
  if (!token) {
    return null;
  }

  const tokenPayload = await verifyToken(token);
  if (!tokenPayload) {
    return null;
  }

  return await getUserInfo(tokenPayload.userId);
}
