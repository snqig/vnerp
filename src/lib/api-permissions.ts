import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndErrorHandler } from './api-auth';
import { logOperation } from './api-response';
import { UserInfo } from './auth';

export const API_PERMISSIONS = {
  WAREHOUSE_VIEW: 'warehouse:view',
  WAREHOUSE_CREATE: 'warehouse:create',
  WAREHOUSE_UPDATE: 'warehouse:update',
  WAREHOUSE_DELETE: 'warehouse:delete',
  INVENTORY_VIEW: 'inventory:view',
  INBOUND_CREATE: 'inbound:create',
  INBOUND_APPROVE: 'inbound:approve',
  OUTBOUND_CREATE: 'outbound:create',
  OUTBOUND_CONFIRM: 'outbound:confirm',
  OUTBOUND_CANCEL: 'outbound:cancel',

  WORKORDER_VIEW: 'workorder:view',
  WORKORDER_CREATE: 'workorder:create',
  WORKORDER_UPDATE: 'workorder:update',
  WORKORDER_DELETE: 'workorder:delete',
  PRODUCTION_SCHEDULE: 'production:schedule',

  QUALITY_VIEW: 'quality:view',
  QUALITY_INSPECT: 'quality:inspect',
  QUALITY_APPROVE: 'quality:approve',

  ORDER_VIEW: 'order:view',
  ORDER_CREATE: 'order:create',
  ORDER_UPDATE: 'order:update',
  ORDER_DELETE: 'order:delete',

  PURCHASE_VIEW: 'purchase:view',
  PURCHASE_CREATE: 'purchase:create',
  PURCHASE_APPROVE: 'purchase:approve',

  FINANCE_VIEW: 'finance:view',
  FINANCE_CREATE: 'finance:create',
  FINANCE_APPROVE: 'finance:approve',

  SYSTEM_USER: 'system:user',
  SYSTEM_ROLE: 'system:role',
  SYSTEM_MENU: 'system:menu',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOG: 'system:log',
} as const;

export const ROUTE_PERMISSIONS: Record<
  string,
  { GET?: string; POST?: string; PUT?: string; DELETE?: string; PATCH?: string }
> = {
  '/api/warehouse': {
    GET: API_PERMISSIONS.WAREHOUSE_VIEW,
    POST: API_PERMISSIONS.WAREHOUSE_CREATE,
    PUT: API_PERMISSIONS.WAREHOUSE_UPDATE,
    DELETE: API_PERMISSIONS.WAREHOUSE_DELETE,
  },
  '/api/warehouse/inbound': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.INBOUND_CREATE,
    PUT: API_PERMISSIONS.INBOUND_APPROVE,
  },
  '/api/warehouse/outbound': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.OUTBOUND_CREATE,
    PUT: API_PERMISSIONS.OUTBOUND_CREATE,
    DELETE: API_PERMISSIONS.OUTBOUND_CREATE,
  },
  '/api/warehouse/outbound/confirm': {
    POST: API_PERMISSIONS.OUTBOUND_CONFIRM,
    PUT: API_PERMISSIONS.OUTBOUND_CANCEL,
  },
  '/api/warehouse/outbound/fifo': {
    GET: API_PERMISSIONS.INVENTORY_VIEW,
    POST: API_PERMISSIONS.OUTBOUND_CREATE,
    PATCH: API_PERMISSIONS.OUTBOUND_CONFIRM,
  },
  '/api/inventory': { GET: API_PERMISSIONS.INVENTORY_VIEW, POST: API_PERMISSIONS.OUTBOUND_CREATE },
  '/api/workorders': {
    GET: API_PERMISSIONS.WORKORDER_VIEW,
    POST: API_PERMISSIONS.WORKORDER_CREATE,
    PUT: API_PERMISSIONS.WORKORDER_UPDATE,
    DELETE: API_PERMISSIONS.WORKORDER_DELETE,
  },
  '/api/production/orders': { GET: API_PERMISSIONS.WORKORDER_VIEW },
  '/api/quality/incoming': {
    GET: API_PERMISSIONS.QUALITY_VIEW,
    POST: API_PERMISSIONS.QUALITY_INSPECT,
  },
  '/api/quality/process': {
    GET: API_PERMISSIONS.QUALITY_VIEW,
    POST: API_PERMISSIONS.QUALITY_INSPECT,
  },
  '/api/quality/final': {
    GET: API_PERMISSIONS.QUALITY_VIEW,
    POST: API_PERMISSIONS.QUALITY_INSPECT,
  },
  '/api/orders/sales': { GET: API_PERMISSIONS.ORDER_VIEW, POST: API_PERMISSIONS.ORDER_CREATE },
  '/api/purchase/orders': {
    GET: API_PERMISSIONS.PURCHASE_VIEW,
    POST: API_PERMISSIONS.PURCHASE_CREATE,
  },
  '/api/purchase/request': {
    GET: API_PERMISSIONS.PURCHASE_VIEW,
    POST: API_PERMISSIONS.PURCHASE_CREATE,
  },
  '/api/system/user': {
    GET: API_PERMISSIONS.SYSTEM_USER,
    POST: API_PERMISSIONS.SYSTEM_USER,
    PUT: API_PERMISSIONS.SYSTEM_USER,
  },
  '/api/system/roles': { GET: API_PERMISSIONS.SYSTEM_ROLE },
  '/api/system/oper-log': { GET: API_PERMISSIONS.SYSTEM_LOG, DELETE: API_PERMISSIONS.SYSTEM_LOG },
  '/api/system/login-log': { GET: API_PERMISSIONS.SYSTEM_LOG },
  '/api/system/config': { GET: API_PERMISSIONS.SYSTEM_CONFIG, PUT: API_PERMISSIONS.SYSTEM_CONFIG },
  '/api/finance/cost': { GET: API_PERMISSIONS.FINANCE_VIEW },
  '/api/finance/payable': { GET: API_PERMISSIONS.FINANCE_VIEW },
  '/api/finance/receipt': { GET: API_PERMISSIONS.FINANCE_VIEW },
};

export const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-lock',
  '/api/linkage/',
  '/api/document-number',
];

export function getRequiredPermission(pathname: string, method: string): string | null {
  for (const publicRoute of PUBLIC_ROUTES) {
    if (pathname.startsWith(publicRoute)) return null;
  }

  const matchedPattern = Object.keys(ROUTE_PERMISSIONS)
    .filter((pattern) => pathname.startsWith(pattern))
    .sort((a, b) => b.length - a.length)[0];

  if (!matchedPattern) return null;

  const methodPermissions = ROUTE_PERMISSIONS[matchedPattern];
  return methodPermissions[method as keyof typeof methodPermissions] || null;
}

export function withPermission(
  handler: (request: NextRequest, userInfo: UserInfo) => Promise<NextResponse>,
  options?: {
    errorMessage?: string;
    logTitle?: string;
    logType?: string;
  }
) {
  return withAuthAndErrorHandler(
    async (request, userInfo) => {
      const { pathname } = new URL(request.url);
      const method = request.method;
      const requiredPermission = getRequiredPermission(pathname, method);

      if (
        requiredPermission &&
        !userInfo.permissions.includes(requiredPermission) &&
        !userInfo.roles.includes('admin')
      ) {
        return NextResponse.json(
          {
            code: 403,
            success: false,
            message: `没有权限执行此操作，需要权限: ${requiredPermission}`,
            data: null,
          },
          { status: 403 }
        );
      }

      const result = await handler(request, userInfo);

      if (options?.logTitle && result.status >= 200 && result.status < 300) {
        await logOperation({
          title: options.logTitle,
          oper_name: userInfo.realName || userInfo.username,
          oper_type: options.logType || 'api',
          oper_method: method,
          oper_url: pathname,
          status: 1,
        });
      }

      return result;
    },
    {
      errorMessage: options?.errorMessage,
    }
  );
}
