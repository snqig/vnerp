import { jwtVerify } from 'jose';
import { getSecretKey } from './jwt-secret';

/**
 * Edge 运行时安全的 JWT 签名校验（仅验签名 + 过期，不查库、不查黑名单）。
 *
 * 用于 Next.js Middleware（src/proxy.ts）在边缘层拦截伪造 / 过期 token，
 * 关闭「proxy 只校验 cookie 存在性、不校验有效性」的缺口：无效 token 直接按未登录处理。
 *
 * 语义与 src/lib/auth.ts 的 verifyTokenLight 一致：
 *   - 仅做「签名有效且未过期」的粗粒度放行；
 *   - 黑名单 / 用户级撤销（改密 / 锁号）由 API 层 withAuth 负责，这里不重复实现。
 *
 * 该模块不得 import 任何 Node-only 依赖（如 mysql2 / ./db），否则会破坏 Edge bundle。
 */
export async function verifyJwtSignature(token: string): Promise<boolean> {
  try {
    const secret = getSecretKey();
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    // 签名错误 / 过期 / 非法 token / 密钥缺失 → 一律视为未通过
    return false;
  }
}
