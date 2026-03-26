import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.dev.coze.site', '192.168.0.157', '192.168.0.137', 'localhost'],
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    root: 'C:\\Users\\snqig\\Desktop\\oaerp\\erp-project',
    rules: {
      '*.css': {
        loaders: [],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
