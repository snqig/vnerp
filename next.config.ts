import './src/lib/env'; // 加载环境变量配置（永不抛出，Vercel demo 和本地开发均有回退值）
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// 开发环境允许的源：从环境变量读取（逗号分隔），默认 localhost + 局域网 IP
const devOrigins = process.env.DEV_ORIGINS
  ? process.env.DEV_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : ['localhost', '192.168.0.150', '192.168.0.149'];

// SECURITY: 开发环境默认 '*' 便于本地联调；生产环境必须通过 CORS_ALLOW_ORIGIN 显式配置允许的源（具体域名或逗号分隔的多域名），未配置时返回空字符串以阻止跨域请求
const corsAllowOrigin = process.env.CORS_ALLOW_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : '*');

// 是否生产环境（决定是否启用 HSTS）
const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  compress: true,
  output: process.env.VERCEL ? undefined : 'standalone',
  serverExternalPackages: ['ioredis', 'mysql2'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        net: false,
        tls: false,
        fs: false,
        child_process: false,
        cluster: false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'lodash',
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      {
        key: 'Content-Security-Policy',
        value:
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
      },
      ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
    ];

    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: corsAllowOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/:path*.(js|css|woff2|woff|ttf|ico|png|jpg|svg)',
        headers: [
          { key: 'Cache-Control', value: isProd ? 'public, max-age=31536000, immutable' : 'no-cache, no-store, must-revalidate' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: corsAllowOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          ...securityHeaders,
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
