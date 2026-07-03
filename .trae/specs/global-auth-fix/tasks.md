# 全局认证修复任务

## 任务状态总览

- [x] 任务 1: 创建全局认证工具库
- [x] 任务 2: 修复生产管理模块认证 (production)
- [x] 任务 3: 修复仓库管理模块认证 (warehouse)
- [x] 任务 4: 修复样品管理模块认证 - 部分 (sample/standard-card)
- [ ] 任务 5: 修复样品管理模块认证 - 剩余 (sample/orders, sample/management, sample/standard-card/input)
- [ ] 任务 6: 修复质量管理模块认证 (quality)
- [ ] 任务 7: 修复人力资源模块认证 (hr)
- [ ] 任务 8: 修复设备管理模块认证 (equipment)
- [ ] 任务 9: 修复印前管理模块认证 (prepress)
- [ ] 任务 10: 修复销售管理模块认证 (sales)
- [ ] 任务 11: 修复报表模块认证 (reports)
- [ ] 任务 12: 修复设置模块认证 (settings)
- [ ] 任务 13: 修复二维码模块认证 (qrcode)
- [ ] 任务 14: 生成最终摘要报告

---

## 已完成的任务

### 任务 1: 创建全局认证工具库
- [x] 创建统一的 authFetch 辅助函数
- [x] 包含 token 提取和 Authorization 头添加逻辑
- [x] **状态**: 已完成（所有页面采用内联方式实现）

### 任务 2: 修复生产管理模块认证 (production)
- [x] `production/mrp/page.tsx` - 添加 authFetch 并替换 3 处 fetch 调用
- [x] `production/material-return/page.tsx` - 添加 authFetch 并替换 5 处 fetch 调用
- [x] `production/product-label/page.tsx` - 添加 authFetch 并替换 2 处 fetch 调用
- [x] `production/workorder/page.tsx` - 添加 authFetch 并替换 1 处 fetch 调用
- [x] `production/report/page.tsx` - 添加 authFetch 并替换 2 处 fetch 调用

### 任务 3: 修复仓库管理模块认证 (warehouse)
- [x] `warehouse/transfer/page.tsx` - 添加 authFetch 并替换 2 处 fetch 调用
- [x] `warehouse/stocktaking/page.tsx` - 添加 authFetch 并替换 3 处 fetch 调用
- [x] `warehouse/stock-adjust/page.tsx` - 添加 authFetch 并替换 2 处 fetch 调用
- [x] `warehouse/sales-outbound/page.tsx` - 添加 authFetch 并替换 3 处 fetch 调用
- [x] `warehouse/production-inbound/page.tsx` - 添加 authFetch 并替换 2 处 fetch 调用
- [ ] `warehouse/outbound/page.tsx` - 待修复（已有 authFetch，1 处 fetch 待替换）

### 任务 4: 修复样品管理模块认证 - 部分 (sample/standard-card)
- [x] `sample/standard-card/page.tsx` - 添加 authFetch 并替换 5 处 fetch 调用
- [ ] `sample/standard-card/input/page.tsx` - 待修复（authFetch 已存在，需替换 2 处 fetch）
- [ ] `sample/standard-card/input-v2/page.tsx` - 待添加 authFetch 并修复
- [ ] `sample/standard-card/input-v2/1.tsx` - 待添加 authFetch 并修复 3 处 fetch

---

## 待完成的任务

### 任务 5: 修复样品管理模块认证 - 剩余 (sample)
- [ ] `sample/orders/page.tsx` - 添加 authFetch 并替换 5 处 fetch 调用
- [ ] `sample/orders/new/page.tsx` - 添加 authFetch 并替换 fetch 调用
- [ ] `sample/orders/[id]/page.tsx` - 添加 authFetch 并替换 fetch 调用
- [ ] `sample/orders/[id]/edit/page.tsx` - 添加 authFetch 并替换 fetch 调用
- [ ] `sample/management/page.tsx` - 添加 authFetch 并替换 3 处 fetch 调用

### 任务 6: 修复质量管理模块认证 (quality)
- [ ] `quality/trace/page.tsx` - 添加 authFetch 并替换 4 处 fetch 调用
- [ ] `quality/unqualified/page.tsx` - 添加 authFetch 并替换 fetch 调用
- [ ] `quality/supplier-audit/page.tsx` - 添加 authFetch 并替换 fetch 调用
- [ ] `quality/spc/page.tsx` - 添加 authFetch 并替换 fetch 调用
- [ ] `quality/sgs/page.tsx` - 添加 authFetch 并替换 fetch 调用
- [ ] `quality/lab-test/page.tsx` - 添加 authFetch 并替换 fetch 调用
- [ ] `quality/complaint/page.tsx` - 添加 authFetch 并替换 fetch 调用

### 任务 7: 修复人力资源模块认证 (hr)
- [ ] `hr/employee/page.tsx` - 添加 authFetch 并替换 5 处 fetch 调用
- [ ] `hr/attendance/page.tsx` - 添加 authFetch 并替换 4 处 fetch 调用

### 任务 8: 修复设备管理模块认证 (equipment)
- [ ] `equipment/maintenance/page.tsx` - 添加 authFetch 并替换 6 处 fetch 调用

### 任务 9: 修复印前管理模块认证 (prepress)
- [ ] `prepress/die-template/page.tsx` - 添加 authFetch 并替换 11 处 fetch 调用

### 任务 10: 修复销售管理模块认证 (sales)
- [ ] `sales/reconciliation/page.tsx` - 添加 authFetch 并替换 2 处 fetch 调用

### 任务 11: 修复报表模块认证 (reports)
- [ ] `reports/page.tsx` - 添加 authFetch 并替换 2 处 fetch 调用

### 任务 12: 修复设置模块认证 (settings)
- [ ] `settings/config/page.tsx` - 添加 authFetch 并替换 2 处 fetch 调用

### 任务 13: 修复二维码模块认证 (qrcode)
- [ ] `qrcode/page.tsx` - 添加 authFetch 并替换 fetch 调用

### 任务 14: 生成最终摘要报告
- [ ] 统计所有修改的文件数和替换次数
- [ ] 汇总 headers 移除数量
- [ ] 验证所有页面是否正确使用 authFetch

---

## 修改统计（实时更新）

| 模块 | 文件数 | fetch 调用数 | headers 移除数 | 状态 |
|------|--------|---------------|----------------|------|
| 生产管理 (production) | 5 | 13 | 5 | ✅ 完成 |
| 仓库管理 (warehouse) | 5 | 12 | 6 | ✅ 完成 |
| 仓库管理 (warehouse) | 1 | 1 | 0 | ⏳ 待完成 |
| 样品管理 (sample) | 1 | 5 | 2 | ✅ 完成 |
| 样品管理 (sample) | 4 | 待统计 | 待统计 | ⏳ 待完成 |
| 质量管理 (quality) | 7 | 待统计 | 待统计 | ⏳ 待完成 |
| 人力资源 (hr) | 2 | 9 | 4 | ⏳ 待完成 |
| 设备管理 (equipment) | 1 | 6 | 4 | ⏳ 待完成 |
| 印前管理 (prepress) | 1 | 11 | 7 | ⏳ 待完成 |
| 销售管理 (sales) | 1 | 2 | 1 | ⏳ 待完成 |
| 报表 (reports) | 1 | 2 | 1 | ⏳ 待完成 |
| 设置 (settings) | 1 | 2 | 0 | ⏳ 待完成 |
| 二维码 (qrcode) | 1 | 待检查 | 待检查 | ⏳ 待完成 |

---

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
