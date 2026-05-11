# 模块架构设计

> 文档编号：VNERP-WIKI-ARCH-002 | 版本：V1.0 | 更新日期：2026-05-10

## 模块总览

```
vnerp/
├── 生产管理 (Production)     ← 工单、报工、标准卡、排产
├── 仓库管理 (Warehouse)      ← 入库、出库、盘点、调拨、二维码
├── 采购管理 (Purchase)       ← 采购申请、采购订单
├── 品质管理 (Quality)        ← IQC、IPQC、FQC、OQC
├── 销售管理 (Sales)          ← 销售订单、发货、退货
├── 财务管理 (Finance)        ← 应收、应付、成本核算
├── 印刷车间 (DCPrint)        ← 油墨、网版、标签、追溯
├── 人力资源管理 (HR)         ← 员工、考勤、薪资
├── 设备管理 (Equipment)      ← 维修、保养、报废
└── 系统管理 (System)         ← 用户、角色、权限、字典
```

## 模块间依赖关系

```
                    ┌──────────┐
                    │ 系统管理  │ (基础：用户/权限/字典)
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐   ┌─────▼─────┐
    │ 基础数据  │    │  人力资源  │   │  设备管理  │
    │(物料/仓库)│    │ (员工)    │   │ (设备)    │
    └────┬────┘    └─────┬─────┘   └─────┬─────┘
         │               │               │
    ┌────▼────────────────▼───────────────▼────┐
    │                                          │
    │   ┌──────────┐    ┌──────────┐           │
    │   │  采购管理  │───→│ 仓库管理  │←──────────│
    │   └────┬─────┘    └────┬─────┘           │
    │        │               │                 │
    │   ┌────▼─────┐    ┌────▼─────┐    ┌──────▼────┐
    │   │ 品质管理  │    │ 生产管理  │    │  印刷车间  │
    │   └────┬─────┘    └────┬─────┘    └──────┬────┘
    │        │               │                 │
    │        └───────────────┼─────────────────┘
    │                        │
    │   ┌──────────┐    ┌────▼─────┐
    │   │  销售管理  │───→│ 财务管理  │
    │   └──────────┘    └──────────┘
    │                                          │
    └──────────────────────────────────────────┘
```

## 各模块核心表

| 模块 | 核心表 | API前缀 |
|------|--------|---------|
| 生产 | prd_work_order, prd_work_report, prd_standard_card | /api/production/*, /api/process-reports, /api/standard-cards |
| 仓库 | inv_production_inbound, inv_stocktaking, inv_transfer_order, qrcode_record | /api/warehouse/*, /api/inventory-checks, /api/transfers, /api/qrcode/* |
| 采购 | pur_order, pur_request | /api/purchase/* |
| 品质 | qc_incoming, qc_process, qc_final | /api/quality/* |
| 销售 | sal_order, sal_delivery | /api/sales/*, /api/orders/* |
| 财务 | fin_receivable, fin_payable | /api/finance/* |
| 印刷 | dcprint_* | /api/dcprint/* |
| 系统 | sys_user, sys_role, sys_menu | /api/system/*, /api/auth/* |
