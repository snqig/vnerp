/**
 * JWT 配置统一模块
 * 集中管理 JWT_SECRET 的读取和校验，避免多处重复定义导致不一致
 */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
}

export const SECRET_KEY = JWT_SECRET || 'dev-only-secret-key';
