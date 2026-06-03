#!/usr/bin/env node
/**
 * 国际化改造辅助脚本
 * 扫描硬编码字符串并生成替换建议
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// 常用翻译映射表
const TRANSLATION_MAP = {
  // Common
  '保存': 'tc("save")',
  '取消': 'tc("cancel")',
  '删除': 'tc("delete")',
  '编辑': 'tc("edit")',
  '新增': 'tc("add")',
  '搜索': 'tc("search")',
  '重置': 'tc("reset")',
  '提交': 'tc("submit")',
  '确认': 'tc("confirm")',
  '返回': 'tc("back")',
  '导出': 'tc("export")',
  '导入': 'tc("import")',
  '打印': 'tc("print")',
  '刷新': 'tc("refresh")',
  '加载中...': 'tc("loading")',
  '暂无数据': 'tc("noData")',
  '操作成功': 'tc("success")',
  '操作失败': 'tc("error")',
  '查看': 'tc("view")',
  '下载': 'tc("download")',
  '上传': 'tc("upload")',
  '更多': 'tc("more")',
  '筛选': 'tc("filter")',
  '清空': 'tc("clear")',
  '确定': 'tc("ok")',
  '警告': 'tc("warning")',
  '提示': 'tc("info")',
  '是': 'tc("yes")',
  '否': 'tc("no")',
  '全部': 'tc("all")',
  '请选择': 'tc("select")',
  '请输入': 'tc("pleaseInput")',
  '确定要删除吗？': 'tc("confirmDelete")',
  '启用': 'tc("enabled")',
  '禁用': 'tc("disabled")',
  '复制': 'tc("copy")',
  '已复制': 'tc("copied")',
  
  // 状态
  '草稿': '"草稿"', // 需要添加到翻译文件
  '待审核': '"待审核"',
  '已审核': '"已审核"',
  '待审批': '"待审批"',
  '已审批': '"已审批"',
  '已完成': 't("completed")',
  '已取消': '"已取消"',
  '生产中': 't("inProduction")',
  '正常': '"正常"',
  '冻结': '"冻结"',
  '过期': '"过期"',
  '预警': '"预警"',
  '紧急': '"紧急"',
};

// 状态值映射
const STATUS_MAP = {
  '草稿': 0,
  '待审核': 1,
  '待审批': 1,
  '已审核': 2,
  '已审批': 2,
  '已完成': 3,
  '已取消': 4,
  '生产中': 5,
};

// 生成改造建议
function generateSuggestions() {
  console.log('='.repeat(60));
  console.log('国际化改造建议');
  console.log('='.repeat(60));
  
  console.log('\n【第一步】在页面组件中添加翻译钩子');
  console.log(`
// 在文件顶部导入
import { useTranslations } from 'next-intl';

// 在组件函数内添加
const t = useTranslations('ModuleName');  // 模块命名空间
const tc = useTranslations('Common');     // 通用命名空间
`);

  console.log('\n【第二步】替换硬编码字符串');
  console.log('\n常用替换示例:');
  
  const examples = [
    ['保存', 'tc("save")'],
    ['取消', 'tc("cancel")'],
    ['删除', 'tc("delete")'],
    ['编辑', 'tc("edit")'],
    ['新增', 'tc("add")'],
    ['搜索', 'tc("search")'],
    ['加载中...', 'tc("loading")'],
    ['暂无数据', 'tc("noData")'],
    ['确定要删除吗？', 'tc("confirmDelete")'],
  ];
  
  console.log('\n原字符串 → 替换为');
  console.log('-'.repeat(40));
  examples.forEach(([orig, repl]) => {
    console.log(`"${orig}" → ${repl}`);
  });

  console.log('\n【第三步】状态值处理');
  console.log(`
// 使用状态映射对象
const statusMap = {
  0: { label: tc("draft"), variant: "secondary" },
  1: { label: tc("pending"), variant: "outline" },
  2: { label: tc("approved"), variant: "default" },
  3: { label: tc("completed"), variant: "default" },
};

// 或使用翻译键
const STATUS_MAP = {
  0: { labelKey: "statusDraft" },
  1: { labelKey: "statusPending" },
  2: { labelKey: "statusConfirmed" },
  3: { labelKey: "statusCompleted" },
};

// 渲染时
{STATUS_MAP[status]?.labelKey ? t(STATUS_MAP[status].labelKey) : t("unknown")}
`);
}

// 生成需要添加到翻译文件的键
function generateNewKeys() {
  console.log('\n' + '='.repeat(60));
  console.log('需要添加到翻译文件的键');
  console.log('='.repeat(60));
  
  const newKeys = {
    Common: {
      // 状态相关
      draft: { zh: '草稿', en: 'Draft', vi: 'Nháp', tw: '草稿' },
      pending: { zh: '待审核', en: 'Pending', vi: 'Chờ duyệt', tw: '待審核' },
      approved: { zh: '已审核', en: 'Approved', vi: 'Đã duyệt', tw: '已審核' },
      normal: { zh: '正常', en: 'Normal', vi: 'Bình thường', tw: '正常' },
      frozen: { zh: '冻结', en: 'Frozen', vi: 'Đóng băng', tw: '凍結' },
      expired: { zh: '过期', en: 'Expired', vi: 'Hết hạn', tw: '過期' },
      warning: { zh: '预警', en: 'Warning', vi: 'Cảnh báo', tw: '預警' },
      critical: { zh: '紧急', en: 'Critical', vi: 'Nghiêm trọng', tw: '緊急' },
    }
  };
  
  console.log('\n// zh-CN.json');
  console.log(JSON.stringify(Object.fromEntries(
    Object.entries(newKeys.Common).map(([k, v]) => [k, v.zh])
  ), null, 2));
  
  console.log('\n// en.json');
  console.log(JSON.stringify(Object.fromEntries(
    Object.entries(newKeys.Common).map(([k, v]) => [k, v.en])
  ), null, 2));
  
  console.log('\n// vi.json');
  console.log(JSON.stringify(Object.fromEntries(
    Object.entries(newKeys.Common).map(([k, v]) => [k, v.vi])
  ), null, 2));
  
  console.log('\n// zh-TW.json');
  console.log(JSON.stringify(Object.fromEntries(
    Object.entries(newKeys.Common).map(([k, v]) => [k, v.tw])
  ), null, 2));
}

// 执行
generateSuggestions();
generateNewKeys();

console.log('\n' + '='.repeat(60));
console.log('改造优先级建议');
console.log('='.repeat(60));
console.log(`
1. 【高优先级】通用组件（按钮、表单、对话框等）
   - 影响范围广，改一处多处生效
   
2. 【中优先级】列表页面
   - 表头、操作按钮、状态显示
   
3. 【低优先级】详情页面
   - 标签、提示信息

4. 【建议】新建页面时直接使用翻译函数
   - 避免新增硬编码字符串
`);
