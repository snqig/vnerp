#!/usr/bin/env node
/**
 * 批量国际化改造脚本
 * 自动替换常见的硬编码中文字符串
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';

// 常用替换规则
const REPLACEMENTS = {
  // Common 命名空间
  '"保存"': 'tc("save")',
  '"取消"': 'tc("cancel")',
  '"删除"': 'tc("delete")',
  '"编辑"': 'tc("edit")',
  '"新增"': 'tc("add")',
  '"搜索"': 'tc("search")',
  '"重置"': 'tc("reset")',
  '"提交"': 'tc("submit")',
  '"确认"': 'tc("confirm")',
  '"返回"': 'tc("back")',
  '"导出"': 'tc("export")',
  '"导入"': 'tc("import")',
  '"打印"': 'tc("print")',
  '"刷新"': 'tc("refresh")',
  '"加载中..."': 'tc("loading")',
  '"加载中"': 'tc("loading")',
  '"暂无数据"': 'tc("noData")',
  '"操作成功"': 'tc("success")',
  '"操作失败"': 'tc("error")',
  '"查看"': 'tc("view")',
  '"下载"': 'tc("download")',
  '"上传"': 'tc("upload")',
  '"更多"': 'tc("more")',
  '"筛选"': 'tc("filter")',
  '"清空"': 'tc("clear")',
  '"确定"': 'tc("ok")',
  '"警告"': 'tc("warning")',
  '"提示"': 'tc("info")',
  '"是"': 'tc("yes")',
  '"否"': 'tc("no")',
  '"全部"': 'tc("all")',
  '"请选择"': 'tc("select")',
  '"请输入"': 'tc("pleaseInput")',
  '"确定要删除吗？"': 'tc("confirmDelete")',
  '"启用"': 'tc("enabled")',
  '"禁用"': 'tc("disabled")',
  '"草稿"': 'tc("draft")',
  '"待审核"': 'tc("pending")',
  '"已审核"': 'tc("approved")',
  '"正常"': 'tc("normal")',
  '"冻结"': 'tc("frozen")',
  '"过期"': 'tc("expired")',
  '"预警"': 'tc("warning")',
  '"紧急"': 'tc("critical")',
  "'保存'": "tc('save')",
  "'取消'": "tc('cancel')",
  "'删除'": "tc('delete')",
  "'编辑'": "tc('edit')",
  "'新增'": "tc('add')",
  "'搜索'": "tc('search')",
  "'刷新'": "tc('refresh')",
  "'加载中...'": "tc('loading')",
  "'暂无数据'": "tc('noData')",
  "'确定要删除吗？'": "tc('confirmDelete')",
  "'草稿'": "tc('draft')",
  "'待审批'": "tc('pending')",
  "'已审批'": "tc('approved')",
  "'已关闭'": "tc('closed')",
  "'已转采购'": "tc('convertedToPurchase')",
  "'低'": "tc('low')",
  "'中'": "tc('medium')",
  "'高'": "tc('high')",
  "'紧急'": "tc('critical')",
  "'正常'": "tc('normal')",
  "'未知'": "tc('unknown')",
};

// 需要添加的翻译键
const NEW_TRANSLATIONS = {
  Common: {
    closed: { zh: '已关闭', en: 'Closed', vi: 'Đã đóng', tw: '已關閉' },
    convertedToPurchase: { zh: '已转采购', en: 'Converted to Purchase', vi: 'Đã chuyển mua hàng', tw: '已轉採購' },
    low: { zh: '低', en: 'Low', vi: 'Thấp', tw: '低' },
    medium: { zh: '中', en: 'Medium', vi: 'Trung bình', tw: '中' },
    high: { zh: '高', en: 'High', vi: 'Cao', tw: '高' },
  },
  Purchase: {
    requestList: { zh: '采购申请列表', en: 'Purchase Request List', vi: 'Danh sách yêu cầu mua', tw: '採購申請列表' },
    noDataToPrint: { zh: '没有可打印的数据', en: 'No data to print', vi: 'Không có dữ liệu để in', tw: '沒有可列印的資料' },
    noDataToExport: { zh: '没有可导出的数据', en: 'No data to export', vi: 'Không có dữ liệu để xuất', tw: '沒有可匯出的資料' },
    deleteSuccess: { zh: '删除成功', en: 'Deleted successfully', vi: 'Xóa thành công', tw: '刪除成功' },
    deleteFailed: { zh: '删除失败', en: 'Delete failed', vi: 'Xóa thất bại', tw: '刪除失敗' },
    fetchFailed: { zh: '获取采购申请列表失败', en: 'Failed to fetch purchase requests', vi: 'Không thể lấy danh sách yêu cầu mua', tw: '獲取採購申請列表失敗' },
    confirmDelete: { zh: '确定要删除这个采购申请吗？', en: 'Are you sure to delete this purchase request?', vi: 'Bạn có chắc muốn xóa yêu cầu mua này?', tw: '確定要刪除這個採購申請嗎？' },
  }
};

// 检查文件是否已有翻译钩子
function hasTranslationHook(content) {
  return content.includes('useTranslations');
}

// 添加翻译钩子导入
function addTranslationImport(content, namespaces = ['Common']) {
  // 检查是否已导入
  if (content.includes("import { useTranslations } from 'next-intl';")) {
    return content;
  }
  
  // 在第一个 import 后添加
  const importMatch = content.match(/import .*? from .*?;\n/);
  if (importMatch) {
    const insertPos = content.indexOf(importMatch[0]) + importMatch[0].length;
    return content.slice(0, insertPos) + 
           "import { useTranslations } from 'next-intl';\n" + 
           content.slice(insertPos);
  }
  
  return content;
}

// 添加翻译钩子声明
function addTranslationHook(content, namespaces = ['Common', 'Purchase']) {
  // 找到组件函数开始位置
  const funcMatch = content.match(/export default function \w+\([^)]*\)\s*\{/);
  if (!funcMatch) return content;
  
  const funcStart = content.indexOf(funcMatch[0]) + funcMatch[0].length;
  
  // 检查是否已有翻译钩子
  if (content.includes('const tc = useTranslations')) {
    return content;
  }
  
  // 生成翻译钩子代码
  let hookCode = '\n  // 翻译钩子\n';
  namespaces.forEach((ns, i) => {
    const varName = i === 0 ? 't' : `t${ns}`;
    hookCode += `  const ${i === 0 ? 'tc' : varName} = useTranslations('${ns}');\n`;
  });
  
  return content.slice(0, funcStart) + hookCode + content.slice(funcStart);
}

// 替换硬编码字符串
function replaceStrings(content) {
  let result = content;
  
  for (const [original, replacement] of Object.entries(REPLACEMENTS)) {
    // 只替换在 JSX 或对象中的字符串
    result = result.replace(new RegExp(escapeRegex(original), 'g'), replacement);
  }
  
  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 处理单个文件
function processFile(filePath) {
  console.log(`\n处理文件: ${filePath}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // 检查是否已有翻译
    if (hasTranslationHook(content)) {
      console.log('  ✓ 已使用翻译');
      return { changed: false, reason: 'already-has-translation' };
    }
    
    // 添加翻译导入
    content = addTranslationImport(content);
    
    // 添加翻译钩子
    content = addTranslationHook(content);
    
    // 替换字符串
    content = replaceStrings(content);
    
    if (content !== originalContent) {
      // 备份原文件
      fs.writeFileSync(filePath + '.bak', originalContent);
      
      // 写入新文件
      fs.writeFileSync(filePath, content);
      
      console.log('  ✓ 改造完成');
      return { changed: true };
    }
    
    return { changed: false, reason: 'no-changes' };
  } catch (e) {
    console.log(`  ✗ 错误: ${e.message}`);
    return { changed: false, reason: 'error', error: e.message };
  }
}

// 输出需要添加的翻译
function printNewTranslations() {
  console.log('\n' + '='.repeat(60));
  console.log('需要添加到翻译文件的键');
  console.log('='.repeat(60));
  
  for (const [ns, keys] of Object.entries(NEW_TRANSLATIONS)) {
    console.log(`\n【${ns}】`);
    
    console.log('\n// zh-CN.json');
    console.log(JSON.stringify(Object.fromEntries(
      Object.entries(keys).map(([k, v]) => [k, v.zh])
    ), null, 2));
    
    console.log('\n// en.json');
    console.log(JSON.stringify(Object.fromEntries(
      Object.entries(keys).map(([k, v]) => [k, v.en])
    ), null, 2));
    
    console.log('\n// vi.json');
    console.log(JSON.stringify(Object.fromEntries(
      Object.entries(keys).map(([k, v]) => [k, v.vi])
    ), null, 2));
    
    console.log('\n// zh-TW.json');
    console.log(JSON.stringify(Object.fromEntries(
      Object.entries(keys).map(([k, v]) => [k, v.tw])
    ), null, 2));
  }
}

// 主函数
function main() {
  console.log('='.repeat(60));
  console.log('批量国际化改造');
  console.log('='.repeat(60));
  
  // 要处理的文件列表
  const files = [
    'src/app/[locale]/purchase/request/page.tsx',
    'src/app/[locale]/production/workorder/page.tsx',
    'src/app/[locale]/orders/sales/page.tsx',
    'src/app/[locale]/orders/customers/page.tsx',
  ];
  
  let processed = 0;
  let changed = 0;
  
  for (const file of files) {
    const fullPath = path.join(PROJECT_ROOT, file);
    if (fs.existsSync(fullPath)) {
      const result = processFile(fullPath);
      processed++;
      if (result.changed) changed++;
    } else {
      console.log(`\n文件不存在: ${file}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('处理完成');
  console.log('='.repeat(60));
  console.log(`处理文件: ${processed} 个`);
  console.log(`修改文件: ${changed} 个`);
  
  printNewTranslations();
}

main();
