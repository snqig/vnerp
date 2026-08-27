## PR 标题

<!-- 请遵循 Conventional Commits，如 feat(production): 新增物料退料事件 -->

## 变更说明

简要描述本次 PR 的改动内容。

## 变更类型

- [ ] 新功能（feat）
- [ ] Bug 修复（fix）
- [ ] 重构（refactor）
- [ ] 文档（docs）
- [ ] 测试（test）
- [ ] 构建/CI（build/ci）
- [ ] 其他（chore）

## 关联 Issue

Closes #

## 事件发布检查清单

> 本次变更若涉及领域事件（Domain Event）发布，请逐项确认；Transactional Outbox 模式要求聚合写入与事件写入必须在同一事务内。

- [ ] 本次变更不涉及领域事件发布（如勾选此项可跳过下列项）
- [ ] 聚合写入与 `persistEvents()` 在同一 `transaction()` 内
- [ ] 事务提交后调用 `order.clearDomainEvents()`
- [ ] Handler 实现了幂等性（INSERT IGNORE + affectedRows 检查，或类似机制）
- [ ] 已补充/更新对应事件的单元测试或集成测试
- [ ] 已更新 `docs/印前模块文档.md` / `生产模块文档.md` / `打样模块文档.md` 中的事件列表（如适用）

## 测试清单

- [ ] 单元测试通过 `pnpm test:unit:run`
- [ ] 集成测试通过（如适用）
- [ ] E2E 测试通过（如适用）
- [ ] 覆盖率未下降 `pnpm test:coverage`

## 通用检查清单

- [ ] 代码通过 `pnpm lint`
- [ ] 类型检查通过 `pnpm ts-check`
- [ ] 提交信息遵循 Conventional Commits 规范
- [ ] 无硬编码密钥或敏感信息

## Breaking Changes

- [ ] 本次变更包含 Breaking Change
<!-- 若有 Breaking Change，请描述影响范围与迁移路径 -->

## 部署注意事项

<!-- 如涉及 DB migration / 环境变量 / Redis 配置 / 数据回填等，请在此说明 -->

- [ ] 需要 DB migration
- [ ] 需要新增/修改环境变量
- [ ] 需要调整 Redis 配置
- [ ] 需要数据回填脚本
