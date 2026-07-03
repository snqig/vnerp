# 检查清单：全局认证修复

## 1. 全局工具库
- [x] `src/lib/auth-fetch.ts` 已创建并正确导出 authFetch 函数

## 2. 仓库管理模块
- [x] warehouse/inbound/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] warehouse/outbound/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] warehouse/stock/page.tsx - 无此文件
- [x] warehouse/setup/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] warehouse/transfer/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] warehouse/inventory/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] warehouse/stocktaking/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] warehouse/stock-adjust/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] warehouse/sales-outbound/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] warehouse/production-inbound/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] warehouse/page.tsx - 所有 fetch 调用已替换为 authFetch

## 3. 财务管理模块
- [x] finance/receivable/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] finance/payables/page.tsx - 使用 ApiClient，已包含认证
- [x] finance/cost/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] finance/report/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] finance/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dashboard/finance/page.tsx - 所有 fetch 调用已替换为 authFetch

## 4. 设置管理模块
- [x] settings/user/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] settings/roles/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] settings/organization/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] settings/notice/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] settings/menus/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] settings/basics/page.tsx - 使用 ApiClient，已包含认证
- [x] settings/system/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] settings/dict/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] settings/login-log/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] settings/oper-log/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] settings/warehouse-category/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] settings/config/page.tsx - 所有 fetch 调用已替换为 authFetch

## 5. 系统组件
- [x] components/layout/header.tsx - 所有 fetch 调用已替换为 authFetch

## 6. 采购管理模块
- [x] purchase/orders/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] purchase/suppliers/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] purchase/request/page.tsx - 所有 fetch 调用已替换为 authFetch

## 7. 销售管理模块
- [x] sales/orders/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] sales/customers/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] sales/delivery/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] sales/reconciliation/page.tsx - 所有 fetch 调用已替换为 authFetch

## 8. 生产管理模块
- [x] production/orders/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] production/scheduling/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] production/process/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] production/workorder/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] production/report/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] production/mrp/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] production/material-return/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] production/material-issue/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] production/product-label/page.tsx - 所有 fetch 调用已替换为 authFetch

## 9. 质量管理模块
- [x] quality/inspection/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] quality/records/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] quality/trace/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] quality/final/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] quality/unqualified/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] quality/supplier-audit/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] quality/spc/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] quality/sgs/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] quality/lab-test/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] quality/complaint/page.tsx - 所有 fetch 调用已替换为 authFetch

## 10. 设备管理模块
- [x] equipment/maintenance/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] equipment/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] equipment/calibration/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] equipment/repair/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] equipment/scrap/page.tsx - 所有 fetch 调用已替换为 authFetch

## 11. 人力资源模块
- [x] hr/attendance/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] hr/employee/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] hr/training/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] hr/salary/page.tsx - 所有 fetch 调用已替换为 authFetch

## 12. 样品管理模块
- [x] sample/standard-card/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] sample/orders/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] sample/management/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] sample/standard-card/input/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] sample/standard-card/print/page.tsx - 所有 fetch 调用已替换为 authFetch

## 13. 其他模块
- [x] dashboard/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dashboard/warehouse/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dashboard/ceo/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dashboard/production/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dashboard/sales/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dashboard/quality/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] orders/bom/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] orders/customers/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] orders/products/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] orders/sales/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] qrcode/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] reports/page.tsx - 所有 fetch 调用已替换为 authFetch

## 14. 印前/油墨模块
- [x] prepress/die-template/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dcprint/ink/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dcprint/ink-usage/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dcprint/ink-opening/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dcprint/ink-mixed/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dcprint/die/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dcprint/labels/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dcprint/process-cards/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dcprint/trace/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] dcprint/screen-plate/page.tsx - 所有 fetch 调用已替换为 authFetch

## 15. 其他页面
- [x] plm/lifecycle/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] plm/eco/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] outsource/settlement/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] outsource/receive/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] outsource/order/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] outsource/issue/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] crm/follow/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] crm/analysis/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] business/contract-review/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] base-data/material-category/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] engineering/sop/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] engineering/sample-to-mass/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] delivery/vehicles/page.tsx - 所有 fetch 调用已替换为 authFetch
- [x] srm/evaluation/page.tsx - 所有 fetch 调用已替换为 authFetch

## 16. 全局扫描
- [x] 使用 grep 扫描确保没有遗漏的原生 fetch( 调用
- [x] 所有生产页面编译无错误

## 不需要修复的页面（无需认证）
- login/page.tsx - 登录页面不需要认证
- test-api/page.tsx - 测试页面不需要认证
- settings/seed-data/page.tsx - 种子数据页面不需要认证
