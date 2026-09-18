// @vitest-environment node
/**
 * 中间件（src/proxy.ts）边缘层鉴权口径回归测试 —— 守护 2026-09-18 的「收尾」修复。
 *
 * 背景（2026-09-14 运行时核实的缺口）：
 *   中间件只校验 `access_token` cookie 的**存在性**，不校验签名/有效期，导致
 *   「持伪造 / 过期 token」的请求照样拿到 200 仪表盘外壳，且业务 API 路径同样只查存在性。
 *
 * 修复后口径（两条路径对齐）：
 *   - API 路径：见 src/proxy.ts —— 取值优先级 Bearer > cookie（与 auth.ts extractToken 一致），
 *     再经 verifyJwtSignature 验签，失败 401；
 *   - 页面路径：无效 token 按未登录处理 → 307 /login?next=…。
 *   黑名单 / 用户级撤销仍由 API 层 withAuth 负责，中间件只做粗粒度放行（本测试不覆盖）。
 *
 * 说明：`/api/*` 分支在 CSRF 校验后直接返回，不会进入 next-intl 中间件；
 *       仅「有效 token 访问受保护页面」一例会走到 i18n 中间件，故该例只断言「未被拦到登录页」。
 */
import { describe, it, expect, vi } from 'vitest';
import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { getSecretKey } from '@/lib/jwt-secret';

// next-intl 的 middleware 在 vitest(node) 下解析其内部 `next/server` 导入会失败
// （pnpm ESM 解析怪癖，报 Did you mean to import "next/server.js"?）。
// 本测试只关心鉴权口径，不关心 i18n 行为，故把 i18n 中间件替换为透传实现。
vi.mock('next-intl/middleware', () => ({
  default: () => () => NextResponse.next(),
}));

import { proxy } from '@/proxy';

const BASE = 'http://localhost:5000';
const GARBAGE = 'garbage.token.value';

/** 用中间件同源的密钥签发一个有效 token，确保「签发 ↔ 边缘校验」密钥一致 */
async function signValidToken(): Promise<string> {
  return new SignJWT({ userId: 1, username: 'admin', realName: 'Admin', roles: ['admin'], permissions: [] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(getSecretKey()));
}

function req(path: string, opts: { cookie?: string; bearer?: string } = {}): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set('cookie', `access_token=${opts.cookie}`);
  if (opts.bearer) headers.set('authorization', `Bearer ${opts.bearer}`);
  return new NextRequest(`${BASE}${path}`, { headers });
}

describe('proxy —— API 路径边缘验签', () => {
  it('无 token → 401', async () => {
    const res = await proxy(req('/api/customers?page=1&pageSize=1'));
    expect(res.status).toBe(401);
  });

  it('cookie 携带伪造 token → 401（修复前会穿透到路由层）', async () => {
    const res = await proxy(req('/api/customers?page=1&pageSize=1', { cookie: GARBAGE }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ success: false });
  });

  it('Bearer 携带伪造 token → 401', async () => {
    const res = await proxy(req('/api/customers?page=1&pageSize=1', { bearer: GARBAGE }));
    expect(res.status).toBe(401);
  });

  it('cookie 携带有效 token → 放行（非 401）', async () => {
    const token = await signValidToken();
    const res = await proxy(req('/api/customers?page=1&pageSize=1', { cookie: token }));
    expect(res.status).not.toBe(401);
  });

  it('Bearer 携带有效 token → 放行（localStorage 模式兼容）', async () => {
    const token = await signValidToken();
    const res = await proxy(req('/api/customers?page=1&pageSize=1', { bearer: token }));
    expect(res.status).not.toBe(401);
  });

  it('公开 API（登录）无 token 也放行', async () => {
    const res = await proxy(req('/api/auth/login'));
    expect(res.status).not.toBe(401);
  });
});

describe('proxy —— 页面路径边缘验签', () => {
  it('无 token 访问受保护页 → 307 /login（带 next 回跳参数）', async () => {
    const res = await proxy(req('/dashboard'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('/login');
    expect(location).toContain('next=');
  });

  it('伪造 token 访问受保护页 → 307 /login（修复前是 200 仪表盘外壳）', async () => {
    const res = await proxy(req('/dashboard', { cookie: GARBAGE }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location') || '').toContain('/login');
  });

  it('有效 token 访问受保护页 → 不被拦到登录页', async () => {
    const token = await signValidToken();
    const res = await proxy(req('/dashboard', { cookie: token }));
    const location = res.headers.get('location') || '';
    expect(location).not.toContain('/login');
  });

  it('有效 token 访问 /login → 307 /dashboard（已登录不回登录页）', async () => {
    const token = await signValidToken();
    const res = await proxy(req('/login', { cookie: token }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location') || '').toContain('/dashboard');
  });
});
