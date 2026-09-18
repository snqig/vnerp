// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { getSecretKey } from '../jwt-secret';
import { verifyJwtSignature } from '../jwt-verify-edge';

/**
 * 运行时验证 src/lib/jwt-verify-edge.ts 的签名校验行为。
 * 用与登录路由相同的 getSecretKey 签发 token，确保「签发 ↔ 边缘校验」密钥一致。
 */
async function signToken(secret: string, opts: { expiresIn?: number | string } = {}) {
  const builder = new SignJWT({
    userId: 1,
    username: 'admin',
    realName: 'Admin',
    roles: ['admin'],
    permissions: [],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt();
  if (opts.expiresIn != null) builder.setExpirationTime(opts.expiresIn);
  return builder.sign(new TextEncoder().encode(secret));
}

describe('verifyJwtSignature (Edge-safe, no DB)', () => {
  it('accepts a token signed with the active secret', async () => {
    const secret = getSecretKey();
    const token = await signToken(secret);
    expect(await verifyJwtSignature(token)).toBe(true);
  });

  it('rejects a token signed with a wrong secret', async () => {
    const token = await signToken('a-completely-different-secret');
    expect(await verifyJwtSignature(token)).toBe(false);
  });

  it('rejects an expired token', async () => {
    const secret = getSecretKey();
    // 过期时间设为 1 小时前的 Unix 秒级时间戳 → 验签时 jwtVerify 判定已过期
    const expiredAt = Math.floor(Date.now() / 1000) - 3600;
    const token = await signToken(secret, { expiresIn: expiredAt });
    expect(await verifyJwtSignature(token)).toBe(false);
  });

  it('rejects non-JWT / garbage strings', async () => {
    expect(await verifyJwtSignature('not-a-jwt')).toBe(false);
    expect(await verifyJwtSignature('')).toBe(false);
  });
});
