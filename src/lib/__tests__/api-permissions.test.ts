import { describe, it, expect, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }) },
}));

const {
  getRequiredPermission,
  isRoutePermissionConfigured,
  ROUTE_PERMISSIONS,
  ROUTE_PERMISSIONS_MERGED,
  PUBLIC_ROUTES,
} = await import('../api-permissions');

describe('getRequiredPermission', () => {
  it('命中最长前缀并返回该方法的权限码', () => {
    expect(getRequiredPermission('/api/warehouse/inbound', 'GET')).toBe('inventory:view');
    expect(getRequiredPermission('/api/warehouse/inbound', 'PUT')).toBe('inbound:approve');
    expect(getRequiredPermission('/api/warehouse', 'POST')).toBe('warehouse:create');
  });

  it('公开路由直接返回 null（放行交给 isRoutePermissionConfigured 裁定）', () => {
    expect(PUBLIC_ROUTES.length).toBeGreaterThan(0);
    expect(getRequiredPermission('/api/auth/login', 'POST')).toBeNull();
  });
});

describe('isRoutePermissionConfigured（fail-closed 判定）', () => {
  it('已登记的方法判定为已配置', () => {
    expect(isRoutePermissionConfigured('/api/warehouse/inbound', 'GET')).toBe(true);
    expect(isRoutePermissionConfigured('/api/hr/piece-rate', 'GET')).toBe(true);
    expect(isRoutePermissionConfigured('/api/qrcode/records', 'DELETE')).toBe(true);
  });

  it('未登记的任何方法判定为未配置（不再放行）', () => {
    expect(isRoutePermissionConfigured('/api/warehouse/inbound', 'HEAD')).toBe(false);
    expect(isRoutePermissionConfigured('/api/does-not-exist', 'GET')).toBe(false);
  });

  it('公开路由与登录态白名单始终判定为已配置', () => {
    expect(isRoutePermissionConfigured('/api/auth/login', 'POST')).toBe(true);
    expect(isRoutePermissionConfigured('/api/auth/user-info', 'GET')).toBe(true);
  });
});

describe('ROUTE_PERMISSIONS_MERGED（逐方法合并）', () => {
  it('同名前缀条目不会因补齐而丢掉原有方法', () => {
    const original = ROUTE_PERMISSIONS['/api/warehouse/inbound'] ?? {};
    const merged = ROUTE_PERMISSIONS_MERGED['/api/warehouse/inbound'] ?? {};
    for (const [method, code] of Object.entries(original)) {
      expect(merged[method as keyof typeof merged]).toBe(code);
    }
  });

  it('补齐条目带上了新登记的方法', () => {
    expect(ROUTE_PERMISSIONS_MERGED['/api/hr/piece-rate']?.GET).toBe('hr:salary');
    expect(ROUTE_PERMISSIONS_MERGED['/api/qrcode']?.DELETE).toBe('qrcode:view');
  });
});
