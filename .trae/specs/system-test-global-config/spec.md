# 系统测试与全局配置规范化 Spec

## Why
项目登录页面和全局UI使用硬编码公司名称，无法根据系统设置动态配置；需要测试所有页面确保功能正常；需要补全或修正演示数据以展示完整业务流程。

## What Changes
- 登录页面公司名称改为从系统设置动态获取
- 所有页面 Logo 边的公司名称使用系统设置数据
- 测试所有页面功能，补全/修正演示数据
- 移除所有硬编码公司名称

## Impact
- Affected code: `src/app/login/page.tsx`, `src/app/layout.tsx`, 全局 Header/Sidebar 组件
- Affected settings: `/settings/basics` (系统基础配置)
- 全局 UI 组件需要改造

## ADDED Requirements

### Requirement: 登录页公司名称动态化
系统 SHALL 从系统设置表读取公司名称，而非硬编码。

#### Scenario: 登录页面显示公司名称
- **WHEN** 用户访问 `/login` 页面
- **THEN** 显示从 `sys_config` 表 `company_name` 配置项读取的公司名称
- **AND** 如果未配置，显示默认名称如"VNERP管理系统"

### Requirement: 全局 Header 公司名称
系统 SHALL 在页面 Header 区域显示从系统设置读取的公司名称。

#### Scenario: Header 显示公司名称
- **WHEN** 已登录用户访问任意页面
- **THEN** Header 区域显示系统设置的公司名称

### Requirement: Logo 区域公司名称
系统 SHALL 在 Logo 边显示公司名称，使用系统设置数据。

#### Scenario: Sidebar Logo 边显示
- **WHEN** 用户登录后查看 Sidebar
- **THEN** Logo 旁显示系统设置的公司名称

### Requirement: 全页面测试验证
系统 SHALL 测试所有页面确保功能正常。

#### Scenario: 页面测试
- **WHEN** 使用 admin/admin123 登录后
- **THEN** 按顺序访问所有页面确保无报错
- **AND** 如发现无数据或数据错误，进行补全或修正

## MODIFIED Requirements

### Requirement: 系统基础设置接口
原实现可能硬编码公司名称，现修改为从数据库 `sys_config` 表动态读取。

## REMOVED Requirements

### Requirement: 硬编码公司名称
**Reason**: 需要支持多租户/多公司配置
**Migration**: 所有硬编码公司名称替换为 API 调用
