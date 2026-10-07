import type { MetadataRoute } from 'next';

/**
 * PWA manifest（车间平板可安装为独立应用）。
 *
 * 现有 public/sw.js 已在根布局以 beforeInteractive 之后 lazyOnload 注册 service
 * worker；本 manifest 补齐「可安装」所需的 name / icons / display / start_url，
 * 使 /pad/scan（Pad 扫码工作站）可从平板主屏以 standalone 模式启动。
 * 图标底色与 globals.css --primary（#3b82f6）保持一致。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pad 扫码工作站',
    short_name: 'Pad 扫码',
    description: '车间平板扫码工作站：双轨统一溯源 + 盘点扫码过账',
    // 启动即进入 Pad 工作台；/pad/scan 由 i18n 中间件补上 locale 前缀
    start_url: '/pad/scan',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#3b82f6',
    icons: [
      { src: '/pad-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pad-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pad-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
