# 贡献指南

感谢参与 VNERP 项目！请阅读以下规范确保协作顺畅。

## 开发环境

- Node.js 18+
- MySQL 8.0+
- pnpm 9.0+

```bash
pnpm install
pnpm setup:db --seed
pnpm dev
```

## 提交规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交格式

```
<type>[scope]: <description>
```

### 类型

| type | 用途 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档 |
| refactor | 重构 |
| test | 测试 |
| build | 构建/依赖 |
| ci | CI 配置 |
| chore | 维护 |

### 示例

```
feat(warehouse): 添加入库单审核功能
fix(auth): 修复 401 刷新并发问题
docs(readme): 更新快速开始步骤
```

## 提交门禁

本项目已配置 husky hooks，提交时自动执行：

- **pre-commit**：lint-staged 对暂存文件运行 eslint + prettier
- **commit-msg**：commitlint 校验提交信息格式

## 质量检查

提交前请确保：

- `pnpm lint` 通过
- `pnpm ts-check` 通过
- `pnpm test:unit` 通过
- 新增功能有对应测试

## 分支策略

- `main`：生产分支，仅接受 PR 合入
- `develop`：开发分支
- 功能分支：`feat/<scope>-<description>`
- 修复分支：`fix/<scope>-<description>`
