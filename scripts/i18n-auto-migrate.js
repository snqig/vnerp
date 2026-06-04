#!/usr/bin/env node
/**
 * i18n 批量迁移自动化脚本
 * 自动扫描、处理所有包含硬编码中文字符串的文件
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const MESSAGES_DIR = path.join(PROJECT_ROOT, 'messages');

// 翻译映射表
const TRANSLATION_MAP = {
  // Common 命名空间
  '保存': { key: 'save', ns: 'Common' },
  '取消': { key: 'cancel', ns: 'Common' },
  '删除': { key: 'delete', ns: 'Common' },
  '编辑': { key: 'edit', ns: 'Common' },
  '新增': { key: 'add', ns: 'Common' },
  '搜索': { key: 'search', ns: 'Common' },
  '刷新': { key: 'refresh', ns: 'Common' },
  '导出': { key: 'export', ns: 'Common' },
  '导入': { key: 'import', ns: 'Common' },
  '打印': { key: 'print', ns: 'Common' },
  '查看': { key: 'view', ns: 'Common' },
  '下载': { key: 'download', ns: 'Common' },
  '上传': { key: 'upload', ns: 'Common' },
  '加载中...': { key: 'loading', ns: 'Common' },
  '加载中': { key: 'loading', ns: 'Common' },
  '暂无数据': { key: 'noData', ns: 'Common' },
  '操作成功': { key: 'success', ns: 'Common' },
  '操作失败': { key: 'error', ns: 'Common' },
  '确定要删除吗？': { key: 'confirmDelete', ns: 'Common' },
  '草稿': { key: 'draft', ns: 'Common' },
  '待审核': { key: 'pending', ns: 'Common' },
  '已审核': { key: 'approved', ns: 'Common' },
  '待审批': { key: 'pending', ns: 'Common' },
  '已审批': { key: 'approved', ns: 'Common' },
  '已关闭': { key: 'closed', ns: 'Common' },
  '已转采购': { key: 'convertedToPurchase', ns: 'Common' },
  '正常': { key: 'normal', ns: 'Common' },
  '冻结': { key: 'frozen', ns: 'Common' },
  '过期': { key: 'expired', ns: 'Common' },
  '预警': { key: 'warning', ns: 'Common' },
  '紧急': { key: 'critical', ns: 'Common' },
  '低': { key: 'low', ns: 'Common' },
  '中': { key: 'medium', ns: 'Common' },
  '高': { key: 'high', ns: 'Common' },
  '是': { key: 'yes', ns: 'Common' },
  '否': { key: 'no', ns: 'Common' },
  '全部': { key: 'all', ns: 'Common' },
  '启用': { key: 'enabled', ns: 'Common' },
  '禁用': { key: 'disabled', ns: 'Common' },
  '上一页': { key: 'prevPage', ns: 'Common' },
  '下一页': { key: 'nextPage', ns: 'Common' },
  '操作': { key: 'operation', ns: 'Common' },
  '状态': { key: 'status', ns: 'Common' },
  '类型': { key: 'type', ns: 'Common' },
  '备注': { key: 'remark', ns: 'Common' },
  '日期': { key: 'date', ns: 'Common' },
  '数量': { key: 'quantity', ns: 'Common' },
  '金额': { key: 'amount', ns: 'Common' },
  '名称': { key: 'name', ns: 'Common' },
  '编码': { key: 'code', ns: 'Common' },
  '确定': { key: 'ok', ns: 'Common' },
  '批准': { key: 'approve', ns: 'Common' },
  '拒绝': { key: 'reject', ns: 'Common' },
  '提交': { key: 'submit', ns: 'Common' },
  '重置': { key: 'reset', ns: 'Common' },
  '返回': { key: 'back', ns: 'Common' },
  '详情': { key: 'detail', ns: 'Common' },
  '未知': { key: 'unknown', ns: 'Common' },
};

// 需要添加的新翻译
const NEW_TRANSLATIONS = {
  Common: {
    closed: { zh: '已关闭', en: 'Closed', vi: 'Đã đóng', tw: '已關閉' },
    convertedToPurchase: { zh: '已转采购', en: 'Converted to Purchase', vi: 'Đã chuyển mua hàng', tw: '已轉採購' },
    approve: { zh: '批准', en: 'Approve', vi: 'Phê duyệt', tw: '批准' },
    reject: { zh: '拒绝', en: 'Reject', vi: 'Từ chối', tw: '拒絕' },
    deleteSuccess: { zh: '删除成功', en: 'Deleted successfully', vi: 'Xóa thành công', tw: '刪除成功' },
    deleteFailed: { zh: '删除失败', en: 'Delete failed', vi: 'Xóa thất bại', tw: '刪除失敗' },
    fetchFailed: { zh: '获取数据失败', en: 'Failed to fetch data', vi: 'Không thể lấy dữ liệu', tw: '獲取資料失敗' },
    noDataToPrint: { zh: '没有可打印的数据', en: 'No data to print', vi: 'Không có dữ liệu để in', tw: '沒有可列印的資料' },
    noDataToExport: { zh: '没有可导出的数据', en: 'No data to export', vi: 'Không có dữ liệu để xuất', tw: '沒有可匯出的資料' },
    confirmDeleteRequest: { zh: '确定要删除这条记录吗？', en: 'Are you sure to delete this record?', vi: 'Bạn có chắc muốn xóa bản ghi này?', tw: '確定要刪除這條記錄嗎？' },
  }
};

// 统计信息
const stats = {
  filesScanned: 0,
  filesWithChinese: 0,
  filesProcessed: 0,
  filesSkipped: 0,
  keysAdded: {},
};

// 扫描文件
function scanFiles() {
  const files = [];
  
  function scan(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (!['node_modules', '.next', 'dist', 'build', 'api'].includes(item.name)) {
          scan(fullPath);
        }
      } else if (item.isFile() && /\.(tsx|ts)$/.test(item.name)) {
        if (item.name.includes('page.') || item.name.includes('Page.')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scan(path.join(SRC_DIR, 'app'));
  return files;
}

// 检查文件是否包含中文
function hasChinese(content) {
  return /[\u4e00-\u9fa5]{2,}/.test(content);
}

// 检查是否已有翻译钩子
function hasTranslationHook(content) {
  return content.includes('useTranslations');
}

// 获取模块命名空间
function getModuleNamespace(filePath) {
  const relativePath = path.relative(SRC_DIR, filePath);
  
  if (relativePath.includes('warehouse')) return 'Warehouse';
  if (relativePath.includes('purchase')) return 'Purchase';
  if (relativePath.includes('production')) return 'Production';
  if (relativePath.includes('orders')) return 'Orders';
  if (relativePath.includes('sales')) return 'Sales';
  if (relativePath.includes('quality')) return 'Quality';
  if (relativePath.includes('equipment')) return 'Equipment';
  if (relativePath.includes('finance')) return 'Finance';
  if (relativePath.includes('hr')) return 'Hr';
  if (relativePath.includes('delivery')) return 'Delivery';
  if (relativePath.includes('dcprint')) return 'Dcprint';
  if (relativePath.includes('outsource')) return 'Outsource';
  if (relativePath.includes('crm')) return 'Crm';
  if (relativePath.includes('srm')) return 'Srm';
  if (relativePath.includes('system')) return 'System';
  
  return 'Common';
}

// 处理单个文件
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // 跳过已有翻译的文件
  if (hasTranslationHook(content)) {
    stats.filesSkipped++;
    return { processed: false, reason: 'already-has-translation' };
  }
  
  // 跳过不包含中文的文件
  if (!hasChinese(content)) {
    stats.filesSkipped++;
    return { processed: false, reason: 'no-chinese' };
  }
  
  const ns = getModuleNamespace(filePath);
  
  // 添加导入
  if (!content.includes("import { useTranslations } from 'next-intl'")) {
    const importMatch = content.match(/import .*? from ['"]@\/.*?['"];\n/);
    if (importMatch) {
      const insertPos = content.indexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, insertPos) + 
                "import { useTranslations } from 'next-intl';\n" + 
                content.slice(insertPos);
    }
  }
  
  // 添加翻译钩子
  const funcMatch = content.match(/export default function \w+\([^)]*\)\s*\{/);
  if (funcMatch && !content.includes('const tc = useTranslations')) {
    const funcStart = content.indexOf(funcMatch[0]) + funcMatch[0].length;
    const hookCode = `\n  // 翻译钩子\n  const t = useTranslations('${ns}');\n  const tc = useTranslations('Common');\n`;
    content = content.slice(0, funcStart) + hookCode + content.slice(funcStart);
  }
  
  // 替换硬编码字符串
  for (const [chinese, { key, ns: keyNs }] of Object.entries(TRANSLATION_MAP)) {
    const func = keyNs === 'Common' ? 'tc' : 't';
    
    // 替换双引号字符串
    content = content.replace(new RegExp(`"${escapeRegex(chinese)}"`, 'g'), `${func}("${key}")`);
    
    // 替换单引号字符串
    content = content.replace(new RegExp(`'${escapeRegex(chinese)}'`, 'g'), `${func}('${key}')`);
  }
  
  if (content !== originalContent) {
    // 备份原文件
    fs.writeFileSync(filePath + '.bak', originalContent);
    
    // 写入新文件
    fs.writeFileSync(filePath, content);
    
    stats.filesProcessed++;
    if (!stats.keysAdded[ns]) stats.keysAdded[ns] = 0;
    stats.keysAdded[ns]++;
    
    return { processed: true, ns };
  }
  
  stats.filesSkipped++;
  return { processed: false, reason: 'no-changes' };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 更新翻译文件
function updateTranslationFiles() {
  const files = ['en.json', 'zh-CN.json', 'vi.json', 'zh-TW.json'];
  
  for (const file of files) {
    const filePath = path.join(MESSAGES_DIR, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    for (const [ns, keys] of Object.entries(NEW_TRANSLATIONS)) {
      if (!content[ns]) content[ns] = {};
      
      for (const [key, translations] of Object.entries(keys)) {
        if (!content[ns][key]) {
          const lang = file.replace('.json', '');
          content[ns][key] = translations[lang === 'zh-CN' ? 'zh' : lang === 'zh-TW' ? 'tw' : lang];
        }
      }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  }
}

// 主函数
function main() {
  console.log('='.repeat(60));
  console.log('i18n 批量迁移自动化脚本');
  console.log('='.repeat(60));
  
  // 扫描文件
  console.log('\n【步骤 1】扫描文件...');
  const files = scanFiles();
  stats.filesScanned = files.length;
  console.log(`找到 ${files.length} 个页面文件`);
  
  // 处理文件
  console.log('\n【步骤 2】处理文件...');
  const results = [];
  
  for (const file of files) {
    const relativePath = path.relative(PROJECT_ROOT, file);
    const result = processFile(file);
    results.push({ file: relativePath, ...result });
    
    if (result.processed) {
      console.log(`  ✓ ${relativePath}`);
    }
  }
  
  // 更新翻译文件
  console.log('\n【步骤 3】更新翻译文件...');
  updateTranslationFiles();
  console.log('  ✓ 翻译文件已更新');
  
  // 输出报告
  console.log('\n' + '='.repeat(60));
  console.log('迁移报告');
  console.log('='.repeat(60));
  console.log(`\n文件扫描: ${stats.filesScanned} 个`);
  console.log(`文件处理: ${stats.filesProcessed} 个`);
  console.log(`文件跳过: ${stats.filesSkipped} 个`);
  
  console.log('\n翻译键添加:');
  for (const [ns, count] of Object.entries(stats.keysAdded)) {
    console.log(`  ${ns}: +${count} 个`);
  }
  
  console.log('\n处理结果:');
  const processed = results.filter(r => r.processed);
  const skipped = results.filter(r => !r.processed);
  
  console.log(`  成功: ${processed.length} 个`);
  console.log(`  跳过: ${skipped.length} 个`);
  
  // 输出跳过原因统计
  const skipReasons = {};
  for (const r of skipped) {
    skipReasons[r.reason] = (skipReasons[r.reason] || 0) + 1;
  }
  console.log('\n跳过原因:');
  for (const [reason, count] of Object.entries(skipReasons)) {
    console.log(`  ${reason}: ${count} 个`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('完成！');
  console.log('='.repeat(60));
}

main();
