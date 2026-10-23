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
  turbopack: {
    root: __dirname,
  },
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
      // 旧质量检验路由（/quality/process、/quality/final）的跳转响应禁止缓存：
      // 307 仍会被浏览器缓存，若缓存了旧规则（:locale 误匹配 api 导致 /api/quality/process
      // 被跳到 /api/quality/center），即使服务端修复后浏览器仍直跳不存在的 API 拿到 HTML，
      // 前端 res.json() 抛 "Unexpected token '<'"。加 no-store 根治重定向缓存。
      {
        source: '/:locale(zh-CN|zh-TW|en|vi)/quality/(process|final)',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/quality/(process|final)',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
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
  async redirects() {
    // 质量检验中心：旧路由 /quality/process、/quality/final 307 重定向到 /quality/center。
    // 合并路由后两页共用一个 center 页的内tab，必须按来源带上 ?tab=，
    // 否则点侧边栏「成品终检」会落到默认的「过程检验」tab。
    //
    // 必须同时声明「带 locale」和「不带 locale」两套 source：next-intl 中间件对裸路径的
    // locale 补全发生在 redirect 阶段之后，只写 /:locale/... 时裸路径 /quality/process
    // 匹配不到任何规则 → 直接 404。
    // destination 一律写不带 locale 的 /quality/center，交由中间件按浏览器语言补前缀，
    // 避免硬编码语种导致跳转后语言被强制改成 zh-CN。
    //
    // 🚨 :locale 必须用正则收紧为真实语种码（src/i18n/locales.ts 的 4 个）。
    // 写成裸 /:locale/quality/process 会把首段任意字符串当语种，
    // 于是 /api/quality/process、/dashboard/quality 等 API/页面路径全被劫持成 307，
    // 前端 authFetch 拿到 HTML 而非 JSON → 页面报「获取品质过程检验数据失败」。
    // 该隐患由 c7de62ff 引入，此前 center 页自身 404 进不去，故未暴露。
    // permanent 用 false（307）而非 true（308）：308 会被浏览器永久缓存，
    // 日后若再次调整重定向目标，用户本机将无法刷新到新规则。
    const LOCALE = 'zh-CN|zh-TW|en|vi';
    return [
      {
        source: `/:locale(${LOCALE})/quality/process`,
        destination: '/:locale/quality/center?tab=process',
        permanent: false,
      },
      {
        source: `/:locale(${LOCALE})/quality/final`,
        destination: '/:locale/quality/center?tab=final',
        permanent: false,
      },
      {
        source: '/quality/process',
        destination: '/quality/center?tab=process',
        permanent: false,
      },
      {
        source: '/quality/final',
        destination: '/quality/center?tab=final',
        permanent: false,
      },
      // 来料检验同样并入 center（第三个 tab）。
      // 与 process/final 一样必须同时声明「带 locale」和「不带 locale」两套 source：
      // next-intl 对裸路径的 locale 补全发生在 redirect 阶段之后，
      // 只写 /:locale/... 时裸路径 /quality/incoming 匹配不到任何规则 → 直接 404。
      {
        source: `/:locale(${LOCALE})/quality/incoming`,
        destination: '/:locale/quality/center?tab=incoming',
        permanent: false,
      },
      {
        source: '/quality/incoming',
        destination: '/quality/center?tab=incoming',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
