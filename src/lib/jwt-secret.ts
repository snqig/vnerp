/**
 * JWT 密钥解析（单一数据源）
 *
 * 从环境变量读取 HS256 签名密钥；生产环境缺失时抛错，禁止使用可预测的 demo 弱密钥。
 * 该逻辑被以下两处共用，确保「登录签发」与「边缘层校验」使用同一把密钥：
 *   - src/lib/auth.ts        → verifyToken / verifyTokenLight（Node 运行时，API + SSR）
 *   - src/lib/jwt-verify-edge.ts → verifyJwtSignature（Edge 运行时，Next.js Middleware）
 *
 * 本模块不得 import 任何 Node-only 依赖（如 mysql2 / ./db），否则会破坏 Edge bundle。
 */
export function getSecretKey(): string {
  const key = process.env.JWT_SECRET;
  if (key) return key;
  if (process.env.JWT_SECRET_STATIC) return process.env.JWT_SECRET_STATIC;
  // SECURITY: 生产环境不允许回退到 demo 弱密钥，缺失时直接抛错，避免使用可预测密钥签发 JWT。
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is not configured. Production environment requires a strong JWT_SECRET in env vars.'
    );
  }
  return 'demo-mode-jwt-secret-key-2024';
}
