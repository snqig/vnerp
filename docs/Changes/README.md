# 变更记录总览

> 核心原则：可追溯、可回滚、透明化

## 变更分类

| 目录 | 说明 | 格式 |
|------|------|------|
| [CHANGELOG.md](./CHANGELOG.md) | 版本变更记录 | Keep a Changelog 格式 |
| [releases/](./releases/) | 版本发布说明 | v{版本号}.md |
| [migrations/](./migrations/) | 数据库迁移记录 | {日期}_{描述}.sql |
| [bug-fixes/](./bug-fixes/) | Bug 修复记录 | bug-{编号}-fix.md |

## 变更流程

```
提出变更 → 评估影响 → 开发实现 → 测试验证 → 记录变更 → 发布
```

## 版本号规则

遵循语义化版本（SemVer）：

```
MAJOR.MINOR.PATCH

MAJOR: 不兼容的 API 变更
MINOR: 向后兼容的功能新增
PATCH: 向后兼容的问题修复
```
