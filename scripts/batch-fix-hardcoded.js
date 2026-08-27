/**
 * 批量修正硬编码中文 - 自动替换为 t() 调用
 * 用法: node scripts/batch-fix-hardcoded.js [targetDir]
 * 示例: node scripts/batch-fix-hardcoded.js warehouse (只处理仓库模块)
 */
const fs = require('fs');
const path = require('path');

const PROJECT = process.cwd();
const MESSAGES_DIR = path.join(PROJECT, 'messages');
const LANGS = ['zh-CN', 'en', 'zh-TW', 'vi'];
// TARGET: 第一个非 -- 开头的参数作为目标目录过滤
const TARGET = process.argv.slice(2).find(a => !a.startsWith('--')) || '';

// 加载所有语言文件
const messages = {};
for (const lang of LANGS) {
  const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
  messages[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// 确保命名空间存在
function ensureNamespace(namespace) {
  for (const lang of LANGS) {
    if (!messages[lang][namespace]) {
      messages[lang][namespace] = {};
    }
  }
}

// 简单映射: 中文 → 英文翻译
function toEnglish(chinese) {
  const map = {
    '取消': 'Cancel', '保存': 'Save', '删除': 'Delete', '编辑': 'Edit', '新增': 'Add',
    '搜索': 'Search', '确认': 'Confirm', '关闭': 'Close', '返回': 'Back', '提交': 'Submit',
    '审核': 'Review', '审批': 'Approve', '导出': 'Export', '导入': 'Import', '打印': 'Print',
    '刷新': 'Refresh', '重置': 'Reset', '查询': 'Query', '上传': 'Upload', '下载': 'Download',
    '预览': 'Preview', '复制': 'Copy', '清空': 'Clear', '启用': 'Enable', '禁用': 'Disable',
    '上架': 'Shelve', '下架': 'Unshelve', '登记': 'Register',
    '状态': 'Status', '操作': 'Actions', '备注': 'Remark', '名称': 'Name', '编码': 'Code',
    '类型': 'Type', '单位': 'Unit', '数量': 'Quantity', '金额': 'Amount', '合计': 'Total',
    '序号': 'No.', '创建时间': 'Created At', '更新时间': 'Updated At', '创建人': 'Created By',
    '申请人': 'Applicant', '审批人': 'Approver', '负责人': 'Responsible',
    '联系电话': 'Phone', '手机号': 'Mobile', '邮箱': 'Email', '地址': 'Address',
    '开始日期': 'Start Date', '结束日期': 'End Date', '日期': 'Date', '时间': 'Time',
    '生效日期': 'Effective Date', '失效日期': 'Expiry Date',
    '正常': 'Normal', '已启用': 'Enabled', '已禁用': 'Disabled',
    '已审核': 'Approved', '待审核': 'Pending', '草稿': 'Draft',
    '已驳回': 'Rejected', '已完成': 'Completed', '进行中': 'In Progress',
    '已取消': 'Cancelled', '已关闭': 'Closed', '已提交': 'Submitted', '已确认': 'Confirmed',
    '已入库': 'Stocked In', '已出库': 'Stocked Out',
    '确定删除': 'Confirm delete?', '确定删除？': 'Confirm delete?', '确认删除？': 'Confirm delete?',
    '确定要删除吗？': 'Confirm delete?', '确定要删除该记录吗？': 'Confirm delete this record?',
    '暂无数据': 'No data', '加载中': 'Loading...', '暂无记录': 'No records',
    '操作成功': 'Operation successful', '操作失败': 'Operation failed',
    '保存成功': 'Save successful', '保存失败': 'Save failed',
    '删除成功': 'Delete successful', '删除失败': 'Delete failed',
    '请输入关键词': 'Enter keyword', '搜索单号': 'Search order no.',
    '请输入搜索关键词': 'Enter search keyword', '搜索编码、名称': 'Search code, name',
    '请输入名称': 'Enter name', '请输入编码': 'Enter code', '请输入描述': 'Enter description',
    '请输入备注': 'Enter remark', '请输入数量': 'Enter quantity', '请输入手机号': 'Enter phone',
    '请输入邮箱': 'Enter email', '请输入地址': 'Enter address', '请选择': 'Please select',
    '请输入': 'Please enter', '请选择仓库': 'Select warehouse', '请选择库位': 'Select location',
    '请选择供应商': 'Select supplier', '请选择客户': 'Select customer',
    '请选择部门': 'Select department', '请选择角色': 'Select role', '请选择用户': 'Select user',
    '请选择状态': 'Select status', '请选择类型': 'Select type', '请选择日期': 'Select date',
    '请选择日期范围': 'Select date range', '共': 'Total ', '条': ' items', '页': '',
    '供应商': 'Supplier', '客户': 'Customer', '物料': 'Material', '产品': 'Product',
    '仓库': 'Warehouse', '库位': 'Location', '批次': 'Batch', '批次号': 'Batch No.',
    '订单': 'Order', '合同': 'Contract', '部门': 'Department', '角色': 'Role',
    '用户': 'User', '权限': 'Permission', '菜单': 'Menu', '日志': 'Log',
    '公告': 'Announcement', '通知': 'Notice', '消息': 'Message', '任务': 'Task',
    '计划': 'Plan', '报告': 'Report', '统计': 'Statistics', '分析': 'Analysis',
    '看板': 'Dashboard', '设置': 'Settings', '配置': 'Configuration', '系统': 'System',
    '参数': 'Parameter', '字典': 'Dictionary', '模板': 'Template', '流程': 'Process',
    '规则': 'Rule', '版本': 'Version', '方案': 'Scheme', '策略': 'Strategy',
    '节点': 'Node', '条件': 'Condition', '入库': 'Inbound', '出库': 'Outbound',
    '移库': 'Transfer', '盘点': 'Stocktaking', '调拨': 'Transfer Order', '退库': 'Return',
    '领用': 'Requisition', '归还': 'Return', '报损': 'Scrap', '报废': 'Discard',
    '维修': 'Repair', '保养': 'Maintenance', '校准': 'Calibration', '检验': 'Inspection',
    '检测': 'Testing', '不合格': 'Unqualified', '合格': 'Qualified',
    '采购': 'Purchase', '销售': 'Sale', '报价': 'Quotation', '询价': 'Inquiry',
    '比价': 'Comparison', '付款': 'Payment', '收款': 'Collection', '退款': 'Refund',
    '结算': 'Settlement', '对账': 'Reconciliation', '应收': 'Receivable',
    '应付': 'Payable', '成本': 'Cost', '利润': 'Profit', '收入': 'Revenue',
    '支出': 'Expense', '预算': 'Budget', '实际': 'Actual', '差异': 'Variance',
    '税率': 'Tax Rate', '税额': 'Tax Amount', '生产': 'Production', '排程': 'Scheduling',
    '工单': 'Work Order', '工序': 'Process Step', '工艺': 'Craft', 'BOM': 'BOM',
    '物料清单': 'BOM', '配方': 'Formula', '规格': 'Specification', '品牌': 'Brand',
    '颜色': 'Color', '尺寸': 'Size', '材质': 'Material', '温度': 'Temperature',
    '湿度': 'Humidity', '压力': 'Pressure', '抽样': 'Sampling', '让步': 'Concession',
    '设备': 'Equipment', '工具': 'Tool', '模具': 'Die', '量具': 'Gauge', '仪器': 'Instrument',
    '发货': 'Delivery', '收货': 'Receiving', '退货': 'Return', '换货': 'Exchange',
    '补货': 'Replenishment', '培训': 'Training', '考勤': 'Attendance', '薪资': 'Salary',
    '招聘': 'Recruitment', '入职': 'Onboarding', '离职': 'Resignation',
    '请假': 'Leave', '加班': 'Overtime', '出差': 'Business Trip', '报销': 'Reimbursement',
    '修改密码': 'Change Password', '重置密码': 'Reset Password', '忘记密码': 'Forgot Password',
    '登录': 'Login', '登出': 'Logout', '注册': 'Register', '验证码': 'Captcha',
    '文件名': 'File Name', '文件大小': 'File Size', '文件类型': 'File Type',
    '上传时间': 'Upload Time', '图片': 'Image', '登录成功': 'Login successful',
    '登录失败': 'Login failed', '全选': 'Select All', '已选择': 'Selected', '更多': 'More',
    '展开': 'Expand', '收起': 'Collapse', '全部': 'All', '折扣': 'Discount',
    '优惠': 'Promotion', '附加费': 'Surcharge', '积分': 'Points', '描述': 'Description',
    '排序': 'Sort Order', '来源': 'Source', '目标': 'Target', '级别': 'Level',
    '优先级': 'Priority', '正面': 'Front', '反面': 'Back', '附件': 'Attachment',
    '详情': 'Detail', '明细': 'Detail', '总金额': 'Total Amount', '总数量': 'Total Quantity',
    '总重量': 'Total Weight', '总容量': 'Total Capacity', '总价': 'Total Price',
    '小计': 'Subtotal', '余额': 'Balance', '男': 'Male', '女': 'Female',
    '是': 'Yes', '否': 'No', '必填': 'Required', '搜索物料': 'Search material',
    '搜索供应商': 'Search supplier', '搜索客户': 'Search customer', '搜索用户': 'Search user',
    '搜索角色': 'Search role', '搜索部门': 'Search department', '搜索产品': 'Search product',
    '搜索订单': 'Search order', '搜索合同': 'Search contract', '搜索任务': 'Search task',
    '搜索日志': 'Search log', '搜索仓库': 'Search warehouse', '搜索名称': 'Search name',
    '搜索编码': 'Search code', '搜索类型': 'Search type', '搜索用户名': 'Search username',
    '搜索产品名称': 'Search product name', '搜索产品编码': 'Search product code',
    '搜索客户名称、联系人': 'Search customer name, contact',
    '搜索供应商名称、联系人': 'Search supplier name, contact',
    '搜索提单号': 'Search bill no.', '搜索车牌号': 'Search plate no.',
    '搜索司机': 'Search driver', '搜索车辆': 'Search vehicle',
    '搜索公告标题': 'Search announcement title',
    '搜索物料编码、名称': 'Search material code, name',
    '搜索物料编码、名称、规格': 'Search material code, name, spec',
    '搜索仓库编码、名称、负责人': 'Search warehouse code, name, responsible',
    '搜索库存编码': 'Search inventory code',
    '搜索库存编码、名称': 'Search inventory code, name',
    '请输入物料': 'Enter material', '请输入单号': 'Enter order no.',
    '请输入完整的物料编码或名称': 'Enter full material code or name',
    '请输入物料名称或编码': 'Enter material name or code',
    '请输入物料编码': 'Enter material code', '请输入物料名称': 'Enter material name',
    '请输入供应商名称': 'Enter supplier name', '请输入供应商编码': 'Enter supplier code',
    '请输入客户名称': 'Enter customer name', '请输入客户编码': 'Enter customer code',
    '请输入部门名称': 'Enter department name', '请输入部门编码': 'Enter department code',
    '请输入角色名称': 'Enter role name', '请输入角色编码': 'Enter role code',
    '请输入用户名': 'Enter username', '请输入密码': 'Enter password',
    '请输入新密码': 'Enter new password', '请输入确认密码': 'Enter confirm password',
    '请输入原密码': 'Enter old password', '请输入当前密码': 'Enter current password',
    '请输入仓库名称': 'Enter warehouse name', '请输入仓库编码': 'Enter warehouse code',
    '请输入仓库容量': 'Enter warehouse capacity', '请输入库位编码': 'Enter location code',
    '请输入库位名称': 'Enter location name', '请输入企业名称': 'Enter company name',
    '请输入企业简称': 'Enter company short name', '请输入企业编码': 'Enter company code',
    '请输入企业邮箱': 'Enter company email', '请输入企业官网': 'Enter company website',
    '请输入传真号码': 'Enter fax', '请输入邮编': 'Enter postal code',
    '请输入纳税人识别号': 'Enter tax ID', '请输入开户银行': 'Enter bank name',
    '请输入银行账号': 'Enter bank account', '请输入企业简介': 'Enter company intro',
    '请输入排序号': 'Enter sort order', '请输入部门描述': 'Enter department description',
    '请输入角色描述': 'Enter role description', '请输入公告标题': 'Enter announcement title',
    '请输入公告内容': 'Enter announcement content', '请输入字典名称': 'Enter dictionary name',
    '请输入字典编码': 'Enter dictionary code', '请输入字典值': 'Enter dictionary value',
    '请输入配置名称': 'Enter config name', '请输入配置值': 'Enter config value',
    '请输入参数名称': 'Enter parameter name', '请输入参数值': 'Enter parameter value',
    '请输入模板名称': 'Enter template name', '请输入模板编码': 'Enter template code',
    '请输入流程名称': 'Enter process name', '请输入流程编码': 'Enter process code',
    '请输入规则名称': 'Enter rule name', '请输入规则编码': 'Enter rule code',
    '请输入方案名称': 'Enter scheme name', '请输入方案编码': 'Enter scheme code',
    '请输入任务名称': 'Enter task name', '请输入任务编码': 'Enter task code',
    '请输入计划名称': 'Enter plan name', '请输入计划编码': 'Enter plan code',
    '请输入报告名称': 'Enter report name', '请输入报告编码': 'Enter report code',
    '请输入看板名称': 'Enter dashboard name', '请输入看板编码': 'Enter dashboard code',
    '请输入图表名称': 'Enter chart name', '请输入图表编码': 'Enter chart code',
    '请输入分析名称': 'Enter analysis name', '请输入分析编码': 'Enter analysis code',
    '请输入统计名称': 'Enter statistics name', '请输入统计编码': 'Enter statistics code',
    '请输入消息标题': 'Enter message title', '请输入消息内容': 'Enter message content',
    '请输入通知标题': 'Enter notification title', '请输入通知内容': 'Enter notification content',
    '请输入日志内容': 'Enter log content', '请输入日志类型': 'Enter log type',
    '请输入菜单名称': 'Enter menu name', '请输入菜单编码': 'Enter menu code',
    '请输入菜单路径': 'Enter menu path', '请输入权限名称': 'Enter permission name',
    '请输入权限编码': 'Enter permission code', '请输入权限描述': 'Enter permission description',
    '请输入二维码': 'Enter QR code', '请输入序列号': 'Enter serial no.',
    '请输入数量（默认1）': 'Enter quantity (default 1)', '扫描或输入二维码': 'Scan or enter QR code',
    '请选择仓库性质': 'Select warehouse nature', '请选择仓库类型': 'Select warehouse type',
    '请选择上级部门': 'Select parent department', '请选择角色类型': 'Select role type',
    '请选择数据范围': 'Select data scope', '请选择优先级': 'Select priority',
    '请选择级别': 'Select level', '请选择来源': 'Select source',
    '请选择目标': 'Select target', '请选择结算方式': 'Select settlement method',
    '请选择付款方式': 'Select payment method', '请选择币种': 'Select currency',
    '请选择税率': 'Select tax rate', '请选择单位': 'Select unit',
    '请选择品牌': 'Select brand', '请选择规格': 'Select specification',
    '请选择颜色': 'Select color', '请选择尺寸': 'Select size',
    '请选择材质': 'Select material', '请选择产地': 'Select origin',
    '请选择版本': 'Select version', '请选择模板': 'Select template',
    '请选择流程': 'Select process', '请选择规则': 'Select rule',
    '请选择策略': 'Select strategy', '请选择方案': 'Select scheme',
    '请选择条件': 'Select condition', '请选择节点': 'Select node',
    '请选择任务': 'Select task', '请选择计划': 'Select plan',
    '请选择报告': 'Select report', '请选择图表': 'Select chart',
    '请选择看板': 'Select dashboard', '请选择分类': 'Select category',
    '请选择文件': 'Select file', '请选择图片': 'Select image',
    '请选择时间': 'Select time', '请输入单价': 'Enter unit price',
    '请输入金额': 'Enter amount', '请输入URL': 'Enter URL',
    '请输入完整的物料编码或名称/规格': 'Enter full material code or name/spec',
    '请输入仓库名称、编码': 'Enter warehouse name, code',
    '请输入供应商名称、编码': 'Enter supplier name, code',
    '请输入客户名称、编码': 'Enter customer name, code',
    '请输入部门名称、编码': 'Enter department name, code',
    '请输入角色名称、编码': 'Enter role name, code',
    '请输入用户名、编码': 'Enter username, code',
    '请输入产品名称、编码': 'Enter product name, code',
    '请输入订单号、客户名': 'Enter order no., customer name',
    '请输入合同号、客户名': 'Enter contract no., customer name',
    '请输入发票号': 'Enter invoice no.', '请输入收据号': 'Enter receipt no.',
    '请输入车牌号': 'Enter plate no.', '请输入司机名': 'Enter driver name',
    '请输入设备名': 'Enter equipment name', '请输入设备编码': 'Enter equipment code',
    '请输入工具名': 'Enter tool name', '请输入工具编码': 'Enter tool code',
    '请输入模具名': 'Enter die name', '请输入模具编码': 'Enter die code',
    '新增成功': 'Create successful', '编辑成功': 'Update successful',
    '新增失败': 'Create failed', '编辑失败': 'Update failed',
    '提交成功': 'Submit successful', '提交失败': 'Submit failed',
    '审核成功': 'Review successful', '审核失败': 'Review failed',
    '审批成功': 'Approve successful', '审批失败': 'Approve failed',
    '驳回成功': 'Reject successful', '驳回失败': 'Reject failed',
    '导出成功': 'Export successful', '导出失败': 'Export failed',
    '导入成功': 'Import successful', '导入失败': 'Import failed',
    '上传成功': 'Upload successful', '上传失败': 'Upload failed',
    '下载成功': 'Download successful', '下载失败': 'Download failed',
    '打印成功': 'Print successful', '打印失败': 'Print failed',
    '刷新成功': 'Refresh successful', '刷新失败': 'Refresh failed',
    '重置成功': 'Reset successful', '重置失败': 'Reset failed',
    '启用成功': 'Enable successful', '启用失败': 'Enable failed',
    '禁用成功': 'Disable successful', '禁用失败': 'Disable failed',
    '上架成功': 'Shelve successful', '上架失败': 'Shelve failed',
    '下架成功': 'Unshelve successful', '下架失败': 'Unshelve failed',
    '入库成功': 'Inbound successful', '入库失败': 'Inbound failed',
    '出库成功': 'Outbound successful', '出库失败': 'Outbound failed',
    '移库成功': 'Transfer successful', '移库失败': 'Transfer failed',
    '盘点成功': 'Stocktaking successful', '盘点失败': 'Stocktaking failed',
    '调拨成功': 'Transfer successful', '调拨失败': 'Transfer failed',
    '退库成功': 'Return successful', '退库失败': 'Return failed',
    '领用成功': 'Requisition successful', '领用失败': 'Requisition failed',
    '归还成功': 'Return successful', '归还失败': 'Return failed',
    '报损成功': 'Scrap successful', '报损失败': 'Scrap failed',
    '报废成功': 'Discard successful', '报废失败': 'Discard failed',
    '维修成功': 'Repair successful', '维修失败': 'Repair failed',
    '保养成功': 'Maintenance successful', '保养失败': 'Maintenance failed',
    '校准成功': 'Calibration successful', '校准失败': 'Calibration failed',
    '检验成功': 'Inspection successful', '检验失败': 'Inspection failed',
    '检测成功': 'Testing successful', '检测失败': 'Testing failed',
    '付款成功': 'Payment successful', '付款失败': 'Payment failed',
    '收款成功': 'Collection successful', '收款失败': 'Collection failed',
    '退款成功': 'Refund successful', '退款失败': 'Refund failed',
    '结算成功': 'Settlement successful', '结算失败': 'Settlement failed',
    '对账成功': 'Reconciliation successful', '对账失败': 'Reconciliation failed',
    '注册成功': 'Register successful', '注册失败': 'Register failed',
    '修改成功': 'Update successful', '修改失败': 'Update failed',
    '发送成功': 'Send successful', '发送失败': 'Send failed',
    '复制成功': 'Copy successful', '复制失败': 'Copy failed',
    '新增人员': 'Add Person', '新增仓库': 'Add Warehouse', '新增供应商': 'Add Supplier',
    '新增客户': 'Add Customer', '新增物料': 'Add Material', '新增产品': 'Add Product',
    '新增订单': 'Add Order', '新增合同': 'Add Contract', '新增角色': 'Add Role',
    '新增部门': 'Add Department', '新增用户': 'Add User', '新增菜单': 'Add Menu',
    '新增权限': 'Add Permission', '新增公告': 'Add Announcement', '新增通知': 'Add Notification',
    '新增字典': 'Add Dictionary', '新增配置': 'Add Configuration', '新增参数': 'Add Parameter',
    '新增模板': 'Add Template', '新增流程': 'Add Process', '新增规则': 'Add Rule',
    '新增方案': 'Add Scheme', '新增任务': 'Add Task', '新增计划': 'Add Plan',
    '新增报告': 'Add Report', '新增看板': 'Add Dashboard', '新增图表': 'Add Chart',
    '新增分析': 'Add Analysis', '新增统计': 'Add Statistics', '新增消息': 'Add Message',
    '新增批次': 'Add Batch', '新增库位': 'Add Location', '新增设备': 'Add Equipment',
    '新增工具': 'Add Tool', '新增模具': 'Add Die', '新增量具': 'Add Gauge',
    '新增仪器': 'Add Instrument', '新增样品': 'Add Sample', '新增工单': 'Add Work Order',
    '新增工序': 'Add Process Step', '新增工艺': 'Add Craft', '新增BOM': 'Add BOM',
    '新增配方': 'Add Formula', '新增规格': 'Add Specification', '新增品牌': 'Add Brand',
    '新增颜色': 'Add Color', '新增尺寸': 'Add Size', '新增材质': 'Add Material',
    '编辑人员': 'Edit Person', '编辑仓库': 'Edit Warehouse', '编辑供应商': 'Edit Supplier',
    '编辑客户': 'Edit Customer', '编辑物料': 'Edit Material', '编辑产品': 'Edit Product',
    '编辑订单': 'Edit Order', '编辑合同': 'Edit Contract', '编辑角色': 'Edit Role',
    '编辑部门': 'Edit Department', '编辑用户': 'Edit User', '编辑菜单': 'Edit Menu',
    '编辑权限': 'Edit Permission', '编辑公告': 'Edit Announcement', '编辑通知': 'Edit Notification',
    '编辑字典': 'Edit Dictionary', '编辑配置': 'Edit Configuration', '编辑参数': 'Edit Parameter',
    '编辑模板': 'Edit Template', '编辑流程': 'Edit Process', '编辑规则': 'Edit Rule',
    '编辑方案': 'Edit Scheme', '编辑任务': 'Edit Task', '编辑计划': 'Edit Plan',
    '编辑报告': 'Edit Report', '编辑看板': 'Edit Dashboard', '编辑图表': 'Edit Chart',
    '编辑分析': 'Edit Analysis', '编辑统计': 'Edit Statistics', '编辑消息': 'Edit Message',
    '编辑批次': 'Edit Batch', '编辑库位': 'Edit Location', '编辑设备': 'Edit Equipment',
    '编辑工具': 'Edit Tool', '编辑模具': 'Edit Die', '编辑量具': 'Edit Gauge',
    '编辑仪器': 'Edit Instrument', '编辑样品': 'Edit Sample', '编辑工单': 'Edit Work Order',
    '编辑工序': 'Edit Process Step', '编辑工艺': 'Edit Craft', '编辑BOM': 'Edit BOM',
    '编辑配方': 'Edit Formula', '编辑规格': 'Edit Specification', '编辑品牌': 'Edit Brand',
    '编辑颜色': 'Edit Color', '编辑尺寸': 'Edit Size', '编辑材质': 'Edit Material',
    '删除人员': 'Delete Person', '删除仓库': 'Delete Warehouse', '删除供应商': 'Delete Supplier',
    '删除客户': 'Delete Customer', '删除物料': 'Delete Material', '删除产品': 'Delete Product',
    '删除订单': 'Delete Order', '删除合同': 'Delete Contract', '删除角色': 'Delete Role',
    '删除部门': 'Delete Department', '删除用户': 'Delete User', '删除菜单': 'Delete Menu',
    '删除权限': 'Delete Permission', '删除公告': 'Delete Announcement', '删除通知': 'Delete Notification',
    '删除字典': 'Delete Dictionary', '删除配置': 'Delete Configuration', '删除参数': 'Delete Parameter',
    '删除模板': 'Delete Template', '删除流程': 'Delete Process', '删除规则': 'Delete Rule',
    '删除方案': 'Delete Scheme', '删除任务': 'Delete Task', '删除计划': 'Delete Plan',
    '删除报告': 'Delete Report', '删除看板': 'Delete Dashboard', '删除图表': 'Delete Chart',
    '删除分析': 'Delete Analysis', '删除统计': 'Delete Statistics', '删除消息': 'Delete Message',
    '删除批次': 'Delete Batch', '删除库位': 'Delete Location', '删除设备': 'Delete Equipment',
    '删除工具': 'Delete Tool', '删除模具': 'Delete Die', '删除量具': 'Delete Gauge',
    '删除仪器': 'Delete Instrument', '删除样品': 'Delete Sample', '删除工单': 'Delete Work Order',
    '删除工序': 'Delete Process Step', '删除工艺': 'Delete Craft', '删除BOM': 'Delete BOM',
    '删除配方': 'Delete Formula', '删除规格': 'Delete Specification', '删除品牌': 'Delete Brand',
    '删除颜色': 'Delete Color', '删除尺寸': 'Delete Size', '删除材质': 'Delete Material',
    '点击上方按钮添加出库明细': 'Click above to add outbound details',
    '点击上方按钮添加入库明细': 'Click above to add inbound details',
  };

  // special cases for zh-TW
  const twMap = {
    '取消': '取消', '保存': '儲存', '刪除': '刪除',
  };

  return map[chinese] || null;
}

// 根据中文生成 key
function toKey(chinese) {
  // 返回小驼峰
  const map = {
    '取消': 'cancel', '保存': 'save', '删除': 'delete', '编辑': 'edit', '新增': 'add',
    '搜索': 'search', '确认': 'confirm', '关闭': 'close', '返回': 'back', '提交': 'submit',
    '审核': 'review', '审批': 'approve', '导出': 'export', '导入': 'import', '打印': 'print',
    '刷新': 'refresh', '重置': 'reset', '查询': 'query', '上传': 'upload', '下载': 'download',
    '预览': 'preview', '复制': 'copy', '清空': 'clear', '启用': 'enable', '禁用': 'disable',
    '上架': 'shelve', '下架': 'unshelve', '登记': 'register',
    '状态': 'status', '操作': 'actions', '备注': 'remark', '名称': 'name', '编码': 'code',
    '类型': 'type', '单位': 'unit', '数量': 'quantity', '金额': 'amount', '合计': 'total',
    '序号': 'serialNo', '创建时间': 'createdAt', '更新时间': 'updatedAt', '创建人': 'createdBy',
    '申请人': 'applicant', '审批人': 'approver', '负责人': 'responsiblePerson',
    '联系电话': 'phone', '手机号': 'mobile', '邮箱': 'email', '地址': 'address',
    '开始日期': 'startDate', '结束日期': 'endDate', '日期': 'date', '时间': 'time',
    '生效日期': 'effectiveDate', '失效日期': 'expiryDate',
    '正常': 'normal', '已启用': 'enabled', '已禁用': 'disabled',
    '已审核': 'approved', '待审核': 'pending', '草稿': 'draft',
    '已驳回': 'rejected', '已完成': 'completed', '进行中': 'inProgress',
    '已取消': 'cancelled', '已关闭': 'closed', '已提交': 'submitted', '已确认': 'confirmed',
    '已入库': 'stockedIn', '已出库': 'stockedOut',
    '确定删除': 'confirmDelete', '确定删除？': 'confirmDelete', '确认删除？': 'confirmDelete',
    '确定要删除吗？': 'confirmDelete', '确定要删除该记录吗？': 'confirmDelete',
    '暂无数据': 'noData', '加载中': 'loading', '暂无记录': 'noRecords',
    '操作成功': 'operationSuccess', '操作失败': 'operationFailed',
    '保存成功': 'saveSuccess', '保存失败': 'saveFailed',
    '删除成功': 'deleteSuccess', '删除失败': 'deleteFailed',
    '请输入关键词': 'enterKeyword', '搜索单号': 'searchOrderNo',
    '请输入搜索关键词': 'enterSearchKeyword', '搜索编码、名称': 'searchCodeName',
    '请输入名称': 'enterName', '请输入编码': 'enterCode', '请输入描述': 'enterDescription',
    '请输入备注': 'enterRemark', '请输入数量': 'enterQuantity', '请输入手机号': 'enterPhone',
    '请输入邮箱': 'enterEmail', '请输入地址': 'enterAddress', '请选择': 'pleaseSelect',
    '请输入': 'pleaseEnter', '请选择仓库': 'selectWarehouse', '请选择库位': 'selectLocation',
    '请选择供应商': 'selectSupplier', '请选择客户': 'selectCustomer',
    '请选择部门': 'selectDepartment', '请选择角色': 'selectRole', '请选择用户': 'selectUser',
    '请选择状态': 'selectStatus', '请选择类型': 'selectType', '请选择日期': 'selectDate',
    '请选择日期范围': 'selectDateRange', '共': 'totalPrefix', '条': 'itemSuffix', '页': 'pageSuffix',
    '供应商': 'supplier', '客户': 'customer', '物料': 'material', '产品': 'product',
    '仓库': 'warehouse', '库位': 'location', '批次': 'batch', '批次号': 'batchNo',
    '订单': 'order', '合同': 'contract', '部门': 'department', '角色': 'role',
    '用户': 'user', '权限': 'permission', '菜单': 'menu', '日志': 'log',
    '公告': 'announcement', '通知': 'notice', '消息': 'message', '任务': 'task',
    '计划': 'plan', '报告': 'report', '统计': 'statistics', '分析': 'analysis',
    '看板': 'dashboard', '设置': 'settings', '配置': 'configuration', '系统': 'system',
    '参数': 'parameter', '字典': 'dictionary', '模板': 'template', '流程': 'process',
    '规则': 'rule', '版本': 'version', '方案': 'scheme', '策略': 'strategy',
    '节点': 'node', '条件': 'condition', '入库': 'inbound', '出库': 'outbound',
    '移库': 'transfer', '盘点': 'stocktaking', '调拨': 'transferOrder', '退库': 'returnOrder',
    '领用': 'requisition', '归还': 'returnItem', '报损': 'scrap', '报废': 'discard',
    '维修': 'repair', '保养': 'maintenance', '校准': 'calibration', '检验': 'inspection',
    '检测': 'testing', '不合格': 'unqualified', '合格': 'qualified',
    '采购': 'purchase', '销售': 'sale', '报价': 'quotation', '询价': 'inquiry',
    '比价': 'comparison', '付款': 'payment', '收款': 'collection', '退款': 'refund',
    '结算': 'settlement', '对账': 'reconciliation', '应收': 'receivable',
    '应付': 'payable', '成本': 'cost', '利润': 'profit', '收入': 'revenue',
    '支出': 'expense', '预算': 'budget', '实际': 'actual', '差异': 'variance',
    '税率': 'taxRate', '税额': 'taxAmount', '生产': 'production', '排程': 'scheduling',
    '工单': 'workOrder', '工序': 'processStep', '工艺': 'craft', 'BOM': 'bom',
    '物料清单': 'bom', '配方': 'formula', '规格': 'specification', '品牌': 'brand',
    '颜色': 'color', '尺寸': 'size', '材质': 'materialType', '温度': 'temperature',
    '湿度': 'humidity', '压力': 'pressure', '抽样': 'sampling', '让步': 'concession',
    '设备': 'equipment', '工具': 'tool', '模具': 'die', '量具': 'gauge', '仪器': 'instrument',
    '发货': 'delivery', '收货': 'receiving', '退货': 'returnOrder', '换货': 'exchange',
    '补货': 'replenishment', '培训': 'training', '考勤': 'attendance', '薪资': 'salary',
    '招聘': 'recruitment', '入职': 'onboarding', '离职': 'resignation',
    '请假': 'leave', '加班': 'overtime', '出差': 'businessTrip', '报销': 'reimbursement',
    '修改密码': 'changePassword', '重置密码': 'resetPassword', '忘记密码': 'forgotPassword',
    '登录': 'login', '登出': 'logout', '注册': 'register', '验证码': 'captcha',
    '文件名': 'fileName', '文件大小': 'fileSize', '文件类型': 'fileType',
    '上传时间': 'uploadTime', '图片': 'image', '登录成功': 'loginSuccess',
    '登录失败': 'loginFailed', '全选': 'selectAll', '已选择': 'selected', '更多': 'more',
    '展开': 'expand', '收起': 'collapse', '全部': 'all', '折扣': 'discount',
    '优惠': 'promotion', '附加费': 'surcharge', '积分': 'points', '描述': 'description',
    '排序': 'sortOrder', '来源': 'source', '目标': 'target', '级别': 'level',
    '优先级': 'priority', '正面': 'front', '反面': 'back', '附件': 'attachment',
    '详情': 'detail', '明细': 'detail', '总金额': 'totalAmount', '总数量': 'totalQuantity',
    '总重量': 'totalWeight', '总容量': 'totalCapacity', '总价': 'totalPrice',
    '小计': 'subtotal', '余额': 'balance', '男': 'male', '女': 'female',
    '是': 'yes', '否': 'no', '必填': 'required',
    '搜索物料': 'searchMaterial', '搜索供应商': 'searchSupplier', '搜索客户': 'searchCustomer',
    '搜索用户': 'searchUser', '搜索角色': 'searchRole', '搜索部门': 'searchDepartment',
    '搜索产品': 'searchProduct', '搜索订单': 'searchOrder', '搜索合同': 'searchContract',
    '搜索任务': 'searchTask', '搜索日志': 'searchLog', '搜索仓库': 'searchWarehouse',
    '搜索名称': 'searchName', '搜索编码': 'searchCode', '搜索类型': 'searchType',
    '搜索用户名': 'searchUsername', '搜索产品名称': 'searchProductName',
    '搜索产品编码': 'searchProductCode', '搜索客户名称、联系人': 'searchCustomerNameContact',
    '搜索供应商名称、联系人': 'searchSupplierNameContact', '搜索提单号': 'searchBillNo',
    '搜索车牌号': 'searchPlateNo', '搜索司机': 'searchDriver', '搜索车辆': 'searchVehicle',
    '搜索公告标题': 'searchAnnouncementTitle', '搜索物料编码、名称': 'searchMaterialCodeName',
    '搜索物料编码、名称、规格': 'searchMaterialCodeNameSpec',
    '搜索仓库编码、名称、负责人': 'searchWarehouseCodeName',
    '搜索库存编码': 'searchInventoryCode', '搜索库存编码、名称': 'searchInventoryCodeName',
    '请输入物料': 'enterMaterial', '请输入单号': 'enterOrderNo',
    '请输入完整的物料编码或名称': 'enterFullMaterialCode',
    '请输入物料名称或编码': 'enterMaterialNameCode',
    '请输入物料编码': 'enterMaterialCode', '请输入物料名称': 'enterMaterialName',
    '请输入供应商名称': 'enterSupplierName', '请输入供应商编码': 'enterSupplierCode',
    '请输入客户名称': 'enterCustomerName', '请输入客户编码': 'enterCustomerCode',
    '请输入部门名称': 'enterDepartmentName', '请输入部门编码': 'enterDepartmentCode',
    '请输入角色名称': 'enterRoleName', '请输入角色编码': 'enterRoleCode',
    '请输入用户名': 'enterUsername', '请输入密码': 'enterPassword',
    '请输入新密码': 'enterNewPassword', '请输入确认密码': 'enterConfirmPassword',
    '请输入原密码': 'enterOldPassword', '请输入当前密码': 'enterCurrentPassword',
    '请输入仓库名称': 'enterWarehouseName', '请输入仓库编码': 'enterWarehouseCode',
    '请输入仓库容量': 'enterWarehouseCapacity', '请输入库位编码': 'enterLocationCode',
    '请输入库位名称': 'enterLocationName', '请输入企业名称': 'enterCompanyName',
    '请输入企业简称': 'enterCompanyShortName', '请输入企业编码': 'enterCompanyCode',
    '请输入企业邮箱': 'enterCompanyEmail', '请输入企业官网': 'enterCompanyWebsite',
    '请输入传真号码': 'enterFax', '请输入邮编': 'enterPostalCode',
    '请输入纳税人识别号': 'enterTaxId', '请输入开户银行': 'enterBankName',
    '请输入银行账号': 'enterBankAccount', '请输入企业简介': 'enterCompanyIntro',
    '请输入排序号': 'enterSortOrder', '请输入部门描述': 'enterDepartmentDesc',
    '请输入角色描述': 'enterRoleDesc', '请输入公告标题': 'enterAnnouncementTitle',
    '请输入公告内容': 'enterAnnouncementContent', '请输入字典名称': 'enterDictName',
    '请输入字典编码': 'enterDictCode', '请输入字典值': 'enterDictValue',
    '请输入配置名称': 'enterConfigName', '请输入配置值': 'enterConfigValue',
    '请输入参数名称': 'enterParamName', '请输入参数值': 'enterParamValue',
    '请输入模板名称': 'enterTemplateName', '请输入模板编码': 'enterTemplateCode',
    '请输入流程名称': 'enterProcessName', '请输入流程编码': 'enterProcessCode',
    '请输入规则名称': 'enterRuleName', '请输入规则编码': 'enterRuleCode',
    '请输入方案名称': 'enterSchemeName', '请输入方案编码': 'enterSchemeCode',
    '请输入任务名称': 'enterTaskName', '请输入任务编码': 'enterTaskCode',
    '请输入计划名称': 'enterPlanName', '请输入计划编码': 'enterPlanCode',
    '请输入报告名称': 'enterReportName', '请输入报告编码': 'enterReportCode',
    '请输入看板名称': 'enterDashboardName', '请输入看板编码': 'enterDashboardCode',
    '请输入图表名称': 'enterChartName', '请输入图表编码': 'enterChartCode',
    '请输入分析名称': 'enterAnalysisName', '请输入分析编码': 'enterAnalysisCode',
    '请输入统计名称': 'enterStatisticsName', '请输入统计编码': 'enterStatisticsCode',
    '请输入消息标题': 'enterMessageTitle', '请输入消息内容': 'enterMessageContent',
    '请输入通知标题': 'enterNotificationTitle', '请输入通知内容': 'enterNotificationContent',
    '请输入日志内容': 'enterLogContent', '请输入日志类型': 'enterLogType',
    '请输入菜单名称': 'enterMenuName', '请输入菜单编码': 'enterMenuCode',
    '请输入菜单路径': 'enterMenuPath', '请输入权限名称': 'enterPermissionName',
    '请输入权限编码': 'enterPermissionCode', '请输入权限描述': 'enterPermissionDesc',
    '请输入二维码': 'enterQrCode', '请输入序列号': 'enterSerialNo',
    '请输入数量（默认1）': 'enterQuantityDefault', '扫描或输入二维码': 'scanOrEnterQrCode',
    '请选择仓库性质': 'selectWarehouseNature', '请选择仓库类型': 'selectWarehouseType',
    '请选择上级部门': 'selectParentDepartment', '请选择角色类型': 'selectRoleType',
    '请选择数据范围': 'selectDataScope', '请选择优先级': 'selectPriority',
    '请选择级别': 'selectLevel', '请选择来源': 'selectSource',
    '请选择目标': 'selectTarget', '请选择结算方式': 'selectSettlementMethod',
    '请选择付款方式': 'selectPaymentMethod', '请选择币种': 'selectCurrency',
    '请选择税率': 'selectTaxRate', '请选择单位': 'selectUnit',
    '请选择品牌': 'selectBrand', '请选择规格': 'selectSpecification',
    '请选择颜色': 'selectColor', '请选择尺寸': 'selectSize',
    '请选择材质': 'selectMaterial', '请选择产地': 'selectOrigin',
    '请选择版本': 'selectVersion', '请选择模板': 'selectTemplate',
    '请选择流程': 'selectProcess', '请选择规则': 'selectRule',
    '请选择策略': 'selectStrategy', '请选择方案': 'selectScheme',
    '请选择条件': 'selectCondition', '请选择节点': 'selectNode',
    '请选择任务': 'selectTask', '请选择计划': 'selectPlan',
    '请选择报告': 'selectReport', '请选择图表': 'selectChart',
    '请选择看板': 'selectDashboard', '请选择分类': 'selectCategory',
    '请选择文件': 'selectFile', '请选择图片': 'selectImage',
    '请选择时间': 'selectTime', '请输入单价': 'enterUnitPrice',
    '请输入金额': 'enterAmount', '请输入URL': 'enterUrl',
    '请输入完整的物料编码或名称/规格': 'enterFullMaterialInfo',
    '请输入仓库名称、编码': 'enterWarehouseNameCode',
    '请输入供应商名称、编码': 'enterSupplierNameCode',
    '请输入客户名称、编码': 'enterCustomerNameCode',
    '请输入部门名称、编码': 'enterDepartmentNameCode',
    '请输入角色名称、编码': 'enterRoleNameCode',
    '请输入用户名、编码': 'enterUsernameCode',
    '请输入产品名称、编码': 'enterProductNameCode',
    '请输入订单号、客户名': 'enterOrderNoCustomer',
    '请输入合同号、客户名': 'enterContractNoCustomer',
    '请输入发票号': 'enterInvoiceNo', '请输入收据号': 'enterReceiptNo',
    '请输入车牌号': 'enterPlateNo', '请输入司机名': 'enterDriverName',
    '请输入设备名': 'enterEquipmentName', '请输入设备编码': 'enterEquipmentCode',
    '新增成功': 'createSuccess', '编辑成功': 'updateSuccess',
    '新增失败': 'createFailed', '编辑失败': 'updateFailed',
    '提交成功': 'submitSuccess', '提交失败': 'submitFailed',
    '审核成功': 'reviewSuccess', '审核失败': 'reviewFailed',
    '审批成功': 'approveSuccess', '审批失败': 'approveFailed',
    '驳回成功': 'rejectSuccess', '驳回失败': 'rejectFailed',
    '导出成功': 'exportSuccess', '导出失败': 'exportFailed',
    '导入成功': 'importSuccess', '导入失败': 'importFailed',
    '上传成功': 'uploadSuccess', '上传失败': 'uploadFailed',
    '下载成功': 'downloadSuccess', '下载失败': 'downloadFailed',
    '打印成功': 'printSuccess', '打印失败': 'printFailed',
    '刷新成功': 'refreshSuccess', '刷新失败': 'refreshFailed',
    '重置成功': 'resetSuccess', '重置失败': 'resetFailed',
    '启用成功': 'enableSuccess', '启用失败': 'enableFailed',
    '禁用成功': 'disableSuccess', '禁用失败': 'disableFailed',
    '上架成功': 'shelveSuccess', '上架失败': 'shelveFailed',
    '下架成功': 'unshelveSuccess', '下架失败': 'unshelveFailed',
    '入库成功': 'inboundSuccess', '入库失败': 'inboundFailed',
    '出库成功': 'outboundSuccess', '出库失败': 'outboundFailed',
    '新增人员': 'addPerson', '新增仓库': 'addWarehouse',
    '新增供应商': 'addSupplier', '新增客户': 'addCustomer',
    '新增物料': 'addMaterial', '新增产品': 'addProduct',
    '新增订单': 'addOrder', '新增合同': 'addContract',
    '新增角色': 'addRole', '新增部门': 'addDepartment',
    '新增用户': 'addUser', '新增菜单': 'addMenu', '新增权限': 'addPermission',
    '新增公告': 'addAnnouncement', '新增通知': 'addNotification',
    '新增字典': 'addDict', '新增配置': 'addConfig', '新增参数': 'addParam',
    '新增模板': 'addTemplate', '新增流程': 'addProcess', '新增规则': 'addRule',
    '新增方案': 'addScheme', '新增任务': 'addTask', '新增计划': 'addPlan',
    '新增报告': 'addReport', '新增看板': 'addDashboard', '新增图表': 'addChart',
    '新增分析': 'addAnalysis', '新增统计': 'addStatistics', '新增消息': 'addMessage',
    '新增批次': 'addBatch', '新增库位': 'addLocation', '新增设备': 'addEquipment',
    '新增工具': 'addTool', '新增模具': 'addDie', '新增量具': 'addGauge',
    '新增仪器': 'addInstrument', '新增样品': 'addSample', '新增工单': 'addWorkOrder',
    '新增工序': 'addProcessStep', '新增工艺': 'addCraft', '新增BOM': 'addBom',
    '新增配方': 'addFormula', '新增规格': 'addSpecification', '新增品牌': 'addBrand',
    '新增颜色': 'addColor', '新增尺寸': 'addSize', '新增材质': 'addMaterialType',
    '编辑人员': 'editPerson', '编辑仓库': 'editWarehouse',
    '编辑供应商': 'editSupplier', '编辑客户': 'editCustomer',
    '编辑物料': 'editMaterial', '编辑产品': 'editProduct',
    '编辑订单': 'editOrder', '编辑合同': 'editContract',
    '编辑角色': 'editRole', '编辑部门': 'editDepartment',
    '编辑用户': 'editUser', '编辑菜单': 'editMenu', '编辑权限': 'editPermission',
    '编辑公告': 'editAnnouncement', '编辑通知': 'editNotification',
    '编辑字典': 'editDict', '编辑配置': 'editConfig', '编辑参数': 'editParam',
    '编辑模板': 'editTemplate', '编辑流程': 'editProcess', '编辑规则': 'editRule',
    '编辑方案': 'editScheme', '编辑任务': 'editTask', '编辑计划': 'editPlan',
    '编辑报告': 'editReport', '编辑看板': 'editDashboard', '编辑图表': 'editChart',
    '编辑分析': 'editAnalysis', '编辑统计': 'editStatistics', '编辑消息': 'editMessage',
    '编辑批次': 'editBatch', '编辑库位': 'editLocation', '编辑设备': 'editEquipment',
    '编辑工具': 'editTool', '编辑模具': 'editDie', '编辑量具': 'editGauge',
    '编辑仪器': 'editInstrument', '编辑样品': 'editSample', '编辑工单': 'editWorkOrder',
    '编辑工序': 'editProcessStep', '编辑工艺': 'editCraft', '编辑BOM': 'editBom',
    '编辑配方': 'editFormula', '编辑规格': 'editSpecification', '编辑品牌': 'editBrand',
    '编辑颜色': 'editColor', '编辑尺寸': 'editSize', '编辑材质': 'editMaterialType',
    '删除人员': 'deletePerson', '删除仓库': 'deleteWarehouse',
    '删除供应商': 'deleteSupplier', '删除客户': 'deleteCustomer',
    '删除物料': 'deleteMaterial', '删除产品': 'deleteProduct',
    '删除订单': 'deleteOrder', '删除合同': 'deleteContract',
    '删除角色': 'deleteRole', '删除部门': 'deleteDepartment',
    '删除用户': 'deleteUser', '删除菜单': 'deleteMenu', '删除权限': 'deletePermission',
    '删除公告': 'deleteAnnouncement', '删除通知': 'deleteNotification',
    '删除字典': 'deleteDict', '删除配置': 'deleteConfig', '删除参数': 'deleteParam',
    '删除模板': 'deleteTemplate', '删除流程': 'deleteProcess', '删除规则': 'deleteRule',
    '删除方案': 'deleteScheme', '删除任务': 'deleteTask', '删除计划': 'deletePlan',
    '删除报告': 'deleteReport', '删除看板': 'deleteDashboard', '删除图表': 'deleteChart',
    '删除分析': 'deleteAnalysis', '删除统计': 'deleteStatistics', '删除消息': 'deleteMessage',
    '删除批次': 'deleteBatch', '删除库位': 'deleteLocation', '删除设备': 'deleteEquipment',
    '删除工具': 'deleteTool', '删除模具': 'deleteDie', '删除量具': 'deleteGauge',
    '删除仪器': 'deleteInstrument', '删除样品': 'deleteSample', '删除工单': 'deleteWorkOrder',
    '删除工序': 'deleteProcessStep', '删除工艺': 'deleteCraft', '删除BOM': 'deleteBom',
    '删除配方': 'deleteFormula', '删除规格': 'deleteSpecification', '删除品牌': 'deleteBrand',
    '删除颜色': 'deleteColor', '删除尺寸': 'deleteSize', '删除材质': 'deleteMaterialType',
    '点击上方按钮添加出库明细': 'clickAddOutboundDetail',
    '点击上方按钮添加入库明细': 'clickAddInboundDetail',
  };
  return map[chinese] || null;
}

// 根据文件路径确定命名空间
function getNamespace(filePath) {
  const p = filePath.replace(/\\/g, '/');
  if (p.includes('/warehouse/')) return 'Warehouse';
  if (p.includes('/inventory/')) return 'Inventory';
  if (p.includes('/purchase/')) return 'Purchase';
  if (p.includes('/sale/')) return 'Sale';
  if (p.includes('/finance/')) return 'Finance';
  if (p.includes('/production/')) return 'Production';
  if (p.includes('/quality/')) return 'Quality';
  if (p.includes('/equipment/')) return 'Equipment';
  if (p.includes('/hr/')) return 'Hr';
  if (p.includes('/delivery/')) return 'Delivery';
  if (p.includes('/settings/')) return 'Settings';
  if (p.includes('/system/')) return 'System';
  if (p.includes('/basic/')) return 'Basic';
  if (p.includes('/auth/')) return 'Auth';
  if (p.includes('/dashboard/')) return 'Dashboard';
  if (p.includes('/report/')) return 'Report';
  if (p.includes('/log/')) return 'Log';
  if (p.includes('/message/')) return 'Message';
  return 'Common';
}

// 确保文件有 useTranslations 导入
function ensureUseTranslations(content, filePath) {
  if (content.includes('useTranslations')) return content;
  if (content.includes("from 'next-intl'")) {
    return content.replace(
      /(import\s+\{[^}]*)\}\s+from\s+['"]next-intl['"]/,
      '$1, useTranslations } from "next-intl"'
    );
  }
  // 添加新 import
  if (content.includes("'use client'")) {
    return content.replace(
      "'use client'",
      "'use client';\nimport { useTranslations } from 'next-intl';"
    );
  }
  const i = content.indexOf("import ");
  if (i >= 0) {
    return content.slice(0, i) + "import { useTranslations } from 'next-intl';\n" + content.slice(i);
  }
  return "import { useTranslations } from 'next-intl';\n" + content;
}

// 确保组件内有 const t = useTranslations('namespace')
function ensureTDeclaration(content, namespace) {
  if (content.includes('useTranslations')) return content;
  // 在 export default function 后面添加
  const match = content.match(/export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/);
  if (match) {
    return content.replace(match[0], match[0] + `\n  const t = useTranslations('${namespace}');`);
  }
  return content;
}

// 处理单个文件
function processFile(filePath) {
  const fullPath = path.join(PROJECT, filePath);
  if (!fs.existsSync(fullPath)) return 0;

  let content = fs.readFileSync(fullPath, 'utf-8');
  const namespace = getNamespace(filePath);
  ensureNamespace(namespace);
  let replacementCount = 0;

  // 确保有 useTranslations
  content = ensureUseTranslations(content, filePath);
  content = ensureTDeclaration(content, namespace);

  // 替换 JSX 文本: >中文<
  content = content.replace(/>([\u4e00-\u9fa5]{1,30})</g, (match, chinese) => {
    const key = toKey(chinese);
    if (!key) return match;
    replacementCount++;
    return `>{t("${key}")}<`;
  });

  // 替换 placeholder="中文"
  content = content.replace(/placeholder="([\u4e00-\u9fa5][^"]*[\u4e00-\u9fa5][^"]*)"/g, (match, chinese) => {
    const key = toKey(chinese);
    if (!key) return match;
    replacementCount++;
    return `placeholder={t("${key}")}`;
  });

  // 替换 placeholder='中文'
  content = content.replace(/placeholder='([\u4e00-\u9fa5][^']*[\u4e00-\u9fa5][^']*)'/g, (match, chinese) => {
    const key = toKey(chinese);
    if (!key) return match;
    replacementCount++;
    return `placeholder={t("${key}")}`;
  });

  if (replacementCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`  ${filePath}: ${replacementCount} replacements`);
  }

  return replacementCount;
}

// 收集所有被替换的 key 并更新语言文件
function updateLanguageFiles() {
  const scannedFiles = scanAllFiles();
  console.log(`\nProcessing ${scannedFiles.length} files...`);

  let totalReplacements = 0;
  const processedFiles = [];

  for (const file of scannedFiles) {
    const count = processFile(file);
    if (count > 0) {
      totalReplacements += count;
      processedFiles.push({ file, count });
    }
  }

  // 保存语言文件
  for (const lang of LANGS) {
    const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
    fs.writeFileSync(filePath, JSON.stringify(messages[lang], null, 2), 'utf-8');
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files processed: ${processedFiles.length}`);
  console.log(`Total replacements: ${totalReplacements}`);
  console.log(`Language files updated.`);
}

// 扫描所有页面文件
function scanAllFiles() {
  const files = [];
  const walk = function(dir, fileList) {
    const fullPath = path.join(PROJECT, dir);
    if (!fs.existsSync(fullPath)) return;
    const items = fs.readdirSync(fullPath);
    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        if (item === 'node_modules' || item === '.next') continue;
        walk(path.join(dir, item), fileList);
      } else if (item === 'page.tsx' || item === 'layout.tsx') {
        const relPath = path.join(dir, item);
        if (TARGET && !relPath.includes(TARGET)) continue;
        fileList.push(relPath);
      }
    }
  };
  walk('src/app/[locale]', files);
  return files;
}

// 先预览模式
if (process.argv.includes('--dry-run')) {
  console.log('DRY RUN mode - no changes will be made\n');

  const scannedFiles = scanAllFiles();
  console.log(`Scanning ${scannedFiles.length} files...\n`);

  let totalMatches = 0;
  for (const file of scannedFiles) {
    const fullPath = path.join(PROJECT, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    let count = 0;
    const matches = [];

    // 找 JSX 文本
    const jsxMatches = [...content.matchAll(/>([\u4e00-\u9fa5]{1,30})</g)];
    for (const m of jsxMatches) {
      if (toKey(m[1])) {
        count++;
        matches.push(`  JSX: "${m[1]}"`);
      }
    }
    // 找 placeholder
    const phMatches = [...content.matchAll(/placeholder="([\u4e00-\u9fa5][^"]*[\u4e00-\u9fa5][^"]*)"/g)];
    for (const m of phMatches) {
      if (toKey(m[1])) {
        count++;
        matches.push(`  placeholder: "${m[1]}"`);
      }
    }
    if (count > 0) {
      totalMatches += count;
      console.log(`${file} (${count} matches)`);
      for (const m of matches) console.log(m);
      console.log('');
    }
  }
  console.log(`Total: ${totalMatches} matches across ${scannedFiles.length} files`);
} else {
  updateLanguageFiles();
}