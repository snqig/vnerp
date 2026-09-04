# Bug 修复记录：架构冗余表合并

> 编号：BUG-ARCH-001 | 日期：2026-05-10 | 严重程度：高

## 问题描述

系统中存在多套冗余表，导致数据不互通、API 指向错误、前端字段映射混乱：

1. process_reports vs prd_work_report（报工系统）
2. qr_codes vs qrcode_record（二维码表）
3. inventory_checks vs inv_stocktaking（盘点表）
4. transfers vs inv_transfer_order（调拨表）
5. fin_accounts_receivable vs fin_receivable（应收表）
6. fin_accounts_payable vs fin_payable（应付表）
7. standard_cards vs prd_standard_card（标准卡表）

## 影响范围

- 生产管理、仓库管理、财务管理模块
- 所有涉及上述表的 API 和前端页面

## 解决方案

1. 确定正式表（带模块前缀的表为正式表）
2. 重写 API 路由指向正式表
3. 修复前端页面字段映射
4. 创建数据迁移脚本
5. 标记冗余表待删除

## 验证方法

- [x] TypeScript 类型检查通过
- [ ] API 接口功能测试通过
- [ ] 前端页面功能测试通过
- [ ] 数据迁移脚本在测试环境验证通过
