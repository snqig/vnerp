# 变更记录

本文件格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

## [Unreleased]

### 新增
- 标准化文档体系（Rules/Skills/harness/Wiki/Changes）
- 全链路测试验证方案

### 修复
- 修复两套报工系统并存问题：统一使用 prd_work_report
- 修复两套二维码表未打通问题：统一使用 qrcode_record，添加 split_flag/parent_qr_id
- 修复冗余盘点/调拨表：统一使用 inv_stocktaking 和 inv_transfer_order
- 修复冗余财务表：统一使用 fin_receivable 和 fin_payable
- 修复标准卡表未使用问题：统一使用 prd_standard_card
- 修复 production-inbound 页面 API 错位问题
- 修复 finance/page.tsx 字段映射错误
- 修复 check-transfer/page.tsx 字段映射和状态码类型错误

### 变更
- 重写 /api/process-reports 路由指向 prd_work_report
- 重写 /api/inventory-checks 路由指向 inv_stocktaking
- 重写 /api/transfers 路由指向 inv_transfer_order
- 重写 /api/finance/accounts-receivable 路由指向 fin_receivable
- 重写 /api/finance/accounts-payable 路由指向 fin_payable
- 更新 auto-material-split.ts 使用 qrcode_record
- 更新 fifo-allocation.ts 使用 qrcode_record
- 更新 material-splits/route.ts 使用 qrcode_record
- 更新 qrcode/trace/route.ts 使用 qrcode_record

## [0.1.0] - 2026-05-10

### 新增
- 项目初始化
- Next.js 15 + App Router 基础架构
- 用户认证与权限管理
- 生产管理模块（工单、报工、标准卡）
- 仓库管理模块（入库、出库、盘点、调拨）
- 采购管理模块（采购申请、采购订单）
- 品质管理模块（来料检验、过程检验、成品检验）
- 销售管理模块（销售订单、发货、退货）
- 财务管理模块（应收应付、成本核算）
- 印刷车间模块（油墨管理、网版管理、二维码追溯）
- 二维码全流程追溯系统
- 物料自动拆分功能
- FIFO 先进先出分配算法
