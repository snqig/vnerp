# 技术栈说明

> 文档编号：VNERP-WIKI-ARCH-004 | 版本：V1.0 | 更新日期：2026-05-10

## 前端技术栈

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|---------|
| Next.js | 15.x | 全栈框架 | App Router、SSR、API Routes |
| React | 19.x | UI 库 | 组件化开发 |
| TypeScript | 5.x | 类型系统 | 类型安全、IDE 支持 |
| Tailwind CSS | 4.x | 样式方案 | 原子化 CSS、快速开发 |
| shadcn/ui | latest | 组件库 | 可定制、无运行时依赖 |
| Radix UI | latest | 无障碍基础 | shadcn/ui 底层依赖 |
| Lucide React | latest | 图标库 | 轻量、一致的图标风格 |
| date-fns | latest | 日期处理 | 轻量、函数式、可 tree-shake |

## 后端技术栈

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|---------|
| Next.js Route Handlers | 15.x | API 路由 | 与前端一体化、零配置 |
| mysql2 | 3.x | 数据库驱动 | 高性能、Promise 支持 |
| bcrypt | latest | 密码哈希 | 行业标准、安全可靠 |
| jsonwebtoken | latest | JWT 认证 | 无状态认证、可扩展 |
| uuid | latest | ID 生成 | 唯一性保证 |

## 开发工具

| 工具 | 用途 | 配置文件 |
|------|------|---------|
| ESLint | 代码检查 | eslint.config.mjs |
| Prettier | 代码格式化 | .prettierrc |
| Husky | Git Hooks | .husky/ |
| lint-staged | 暂存区检查 | package.json |
| Vitest | 单元测试 | vitest.config.ts |
| Playwright | E2E 测试 | playwright.config.ts |

## 数据库

| 技术 | 版本 | 用途 |
|------|------|------|
| MySQL | 8.0+ | 主数据库 |
| InnoDB | - | 存储引擎（事务支持） |
| utf8mb4 | - | 字符集（支持中文和 Emoji） |

## 部署

| 技术 | 用途 |
|------|------|
| Node.js 18+ | 运行时 |
| PM2 | 进程管理 |
| Nginx | 反向代理、SSL |
| Let's Encrypt | SSL 证书 |
