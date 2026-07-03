# 全局认证修复规范

## Why
系统中多个页面存在 API 调用未携带身份验证令牌的问题，导致页面返回 401 未授权错误，数据无法正常加载。需要在所有前端页面中统一实现认证机制。

## What Changes
- 在所有使用 fetch API 的前端页面中统一添加 `authFetch` 辅助函数
- 替换所有 `fetch()` 调用为 `authFetch()`，自动携带 `Authorization: Bearer {token}` 头
- 移除冗余的 `'Content-Type': 'application/json'` headers（authFetch 已自动添加）
- 修复以下模块的认证问题：
  - 仓库管理模块 (warehouse)
  - 生产管理模块 (production)
  - 样品管理模块 (sample)
  - 质量管理模块 (quality)
  - 设备管理模块 (equipment)
  - 人力资源管理模块 (hr)
  - 印前管理模块 (prepress)
  - 销售管理模块 (sales)
  - 报表模块 (reports)
  - 设置管理模块 (settings)
  - 二维码模块 (qrcode)

## Impact
- Affected specs: 仓库入库管理、生产管理、样品管理、质量管理
- Affected code: 所有包含 API 调用的前端页面

## ADDED Requirements

### Requirement: 统一认证请求函数
系统 SHALL 提供统一的 `authFetch` 辅助函数，自动从 localStorage/sessionStorage 获取 JWT token 并添加到请求头。

#### Scenario: 成功认证请求
- **WHEN** 前端页面发起 API 请求
- **THEN** 自动添加 `Authorization: Bearer {token}` 请求头
- **AND** 如果 localStorage/sessionStorage 中无 token，请求仍然发送（API 端点自行处理）

### Requirement: 移除冗余 Content-Type Headers
系统 SHALL 在使用 authFetch 时移除手动设置的 `'Content-Type': 'application/json'` headers，因为 authFetch 已自动添加。

#### Scenario: 使用 authFetch 调用
- **WHEN** 前端页面使用 authFetch 发起请求
- **THEN** 不需要手动设置 'Content-Type': 'application/json'
- **AND** 如果原代码中有此 header，应予删除

## 修改统计摘要

| 模块 | 文件数 | fetch 调用数 | headers 移除数 |
|------|--------|---------------|----------------|
| 生产管理 (production) | 5 | 11 | 5 |
| 仓库管理 (warehouse) | 6 | 13 | 6 |
| 样品管理 (sample) | 7 | 15 | 6 |
| 质量管理 (quality) | 2 | 4 | 2 |
| 设备管理 (equipment) | 1 | 6 | 4 |
| 人力资源 (hr) | 2 | 9 | 4 |
| 印前管理 (prepress) | 1 | 11 | 7 |
| 销售管理 (sales) | 1 | 2 | 1 |
| 报表 (reports) | 1 | 2 | 1 |
| 设置 (settings) | 1 | 2 | 0 |
| 二维码 (qrcode) | 1 | 待检查 | 待检查 |
| **总计** | **28+** | **77+** | **36+** |

## 新增的 authFetch 函数模式

```typescript
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};
```
