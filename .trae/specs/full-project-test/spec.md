# 全项目功能测试规格

## Why
系统经历了大量代码修改（认证修复、100+文件更新），需要全面验证所有功能是否正常工作，包括输入控件、上传功能、弹出框等UI组件，以及中文字体渲染问题。

## What Changes
- **前端页面测试**：测试所有页面（约100+个）的输入框、按钮、Select、Dialog、Table等控件
- **上传功能测试**：验证所有文件上传功能（员工照片、标签模板、图片上传等）
- **字体渲染优化**：修复中文字体锯齿问题
- **认证功能验证**：确保所有需要认证的API正常工作

## Impact
- **影响范围**：整个ERP系统的所有前端页面
- **关键系统**：仓库管理、财务管理、生产管理、采购销售、人力资源、印前管理、质量管理、设备管理等

## ADDED Requirements

### Requirement: 前端控件全面测试
系统应确保所有前端页面的控件都能正常工作，包括：
- 输入框（Input、Textarea、Number）
- 选择器（Select、Checkbox、Radio）
- 按钮（Button、IconButton）
- 弹出框（Dialog、Modal、Dropdown）
- 表格（Table）及分页
- 表单验证

#### Scenario: 输入控件测试
- **WHEN** 用户在每个页面进行输入操作
- **THEN** 输入框应正常响应，支持中文输入，样式正确

#### Scenario: 弹出框测试
- **WHEN** 用户打开Dialog、Modal等弹出组件
- **THEN** 弹出框应正常显示，背景遮罩正确，可正常关闭

### Requirement: 上传功能全面测试
系统应确保所有文件上传功能正常工作：
- 员工照片上传
- 标签模板相关上传
- 各类图片上传
- 文件大小和类型验证

#### Scenario: 文件上传测试
- **WHEN** 用户上传文件
- **THEN** 文件应成功上传到服务器，返回正确的URL，页面显示上传结果

### Requirement: 中文字体渲染优化
系统应确保中文字体清晰无锯齿：
- 全局字体配置
- 特定组件字体设置
- 回退字体链

#### Scenario: 字体渲染测试
- **WHEN** 用户在页面查看中文内容
- **THEN** 中文字体应清晰可读，无明显锯齿

### Requirement: 认证功能验证
系统应确保所有需要认证的页面和API正常工作：
- JWT Token传递
- 401错误处理
- 登录状态维护

#### Scenario: 认证测试
- **WHEN** 用户访问需要认证的页面
- **THEN** 应能正常获取数据，不出现401未授权错误

## MODIFIED Requirements

### Requirement: 现有功能回归测试
**说明**：所有之前修复的功能（authFetch、文件上传、Select组件等）应继续正常工作

## Test Coverage

### 模块覆盖清单
1. **仓库管理** (warehouse)
   - 入库管理 /inbound, /inbound-simple
   - 出库管理 /outbound
   - 库位管理 /location
   - 库存查询 /inventory

2. **财务管理** (finance)
   - 应收款 /receivable
   - 应付款 /payable
   - 凭证管理 /voucher

3. **生产管理** (production)
   - 生产工单 /workorder
   - 生产报工 /report
   - 工序管理 /process

4. **采购销售** (purchase, sales)
   - 采购申请 /purchase/request
   - 销售订单 /sales/order
   - 采购合同 /purchase/contract

5. **人力资源** (hr)
   - 员工管理 /employee
   - 部门管理 /department

6. **质量管理** (quality)
   - 检验标准 /inspection
   - 质量异常 /abnormal

7. **设备管理** (equipment)
   - 设备台账 /equipment
   - 设备保养 /maintenance

8. **印前管理** (dcprint)
   - 油墨管理 /ink
   - 工艺卡 /process-card

9. **设置管理** (settings)
   - 用户管理 /user
   - 菜单管理 /menu
   - 标签模板 /label-templates

10. **样品管理** (sample)
    - 样卡管理 /standard-card
    - 样品订单 /order

### 控件类型测试清单
- [ ] Input 输入框
- [ ] Select 下拉选择
- [ ] Checkbox 多选框
- [ ] Radio 单选框
- [ ] Button 按钮
- [ ] Dialog 弹出对话框
- [ ] Table 表格
- [ ] Tabs 选项卡
- [ ] DatePicker 日期选择
- [ ] FileUpload 文件上传
- [ ] Modal 模态框
- [ ] Dropdown 下拉菜单
- [ ] Toast 提示消息
- [ ] Badge 徽章
- [ ] Card 卡片

### 上传功能测试清单
- [ ] 员工头像上传
- [ ] 标签模板图片上传
- [ ] 工艺卡图片上传
- [ ] 设备图片上传
- [ ] 附件上传

### 字体渲染检查
- [ ] 全局中文字体配置
- [ ] 标题字体清晰度
- [ ] 正文字体清晰度
- [ ] 表格数据字体
- [ ] 表单标签字体
