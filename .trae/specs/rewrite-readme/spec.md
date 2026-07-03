# README.md 重写 Spec

## Why
现有 README.md 信息过时（最后更新 2026-06-03），缺少 i18n 国际化、Drizzle ORM、husky/commitlint 提交规范、CLI 数据库初始化脚本等近期新增内容；快速开始步骤引用了已废弃的 `/api/setup/create-tables` 接口；项目架构描述未反映 `[locale]` 多语言路由结构。

## What Changes
- 重写 README.md，反映项目当前真实状态
- 更新快速开始步骤（使用 `pnpm setup:db --seed` 替代废弃 API）
- 补充 i18n 国际化（4 语言：zh-CN/zh-TW/en/vi）、Drizzle ORM、commitlint/husky 提交门禁等新增内容
- 更新技术栈表格（补充 next-intl、Drizzle、vitest 覆盖率等）
- 更新项目架构树（反映 `[locale]` 路由结构）
- 更新常用命令（补充 setup:db、db:generate、test:coverage 等）
- 补充 CI/CD 流水线说明
- 补充贡献指南（提交规范、pre-commit hook）
- 更新最后更新日期

## Impact
- Affected code: 仅 README.md，无代码变更
- 无破坏性变更

## ADDED Requirements

### Requirement: 准确的快速开始指南
README SHALL 提供可操作的快速开始步骤，使用 `pnpm setup:db --seed` 作为数据库初始化方式，而非已废弃的 HTTP 接口。

#### Scenario: 新成员首次搭建
- **WHEN** 新成员按 README 步骤执行
- **THEN** 能在 10 分钟内完成项目搭建并启动开发服务器

### Requirement: 完整的技术栈描述
README SHALL 列出所有核心技术依赖及版本，包括 next-intl、Drizzle ORM、vitest、husky/commitlint 等。

### Requirement: 项目架构反映多语言路由
README 的目录结构 SHALL 展示 `[locale]` 多语言路由层级。

### Requirement: 提交规范说明
README SHALL 包含 Conventional Commits 提交规范说明，指出 husky pre-commit 和 commitlint commit-msg hooks 的存在。

### Requirement: CI/CD 说明
README SHALL 简述 CI 流水线阶段（lint → ts-check → test:coverage → e2e → build）。

## MODIFIED Requirements
无（全新重写）

## REMOVED Requirements
无
