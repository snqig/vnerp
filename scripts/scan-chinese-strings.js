#!/usr/bin/env node
/**
 * 扫描项目中硬编码的中文字符串
 * 生成需要添加到翻译文件的键
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/dcprint/erp-project';
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// 匹配中文字符的正则
const CHINESE_REGEX = /[\u4e00-\u9fa5]+/g;

// 需要扫描的文件扩展名
const SCAN_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// 排除的目录
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build'];

// 收集的中文字符串
const chineseStrings = new Set();

// 扫描文件
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 跳过注释行
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
      
      // 跳过 import 语句
      if (line.includes('import ')) return;
      
      // 查找中文字符串
      const matches = line.match(CHINESE_REGEX);
      if (matches) {
        matches.forEach(match => {
          // 过滤掉一些常见的非翻译字符串
          if (match.length >= 2 && !isIgnoredChinese(match)) {
            chineseStrings.add(match);
          }
        });
      }
    });
  } catch (e) {
    // 忽略错误
  }
}

// 判断是否应该忽略的中文字符串
function isIgnoredChinese(str) {
  // 忽略单个字符
  if (str.length === 1) return true;
  
  // 忽略一些常见的非翻译字符串
  const ignoredPatterns = [
    /^[\d]+$/, // 纯数字
    /^VNERP$/, // 项目名称
    /^测试$/, // 测试相关
  ];
  
  return ignoredPatterns.some(pattern => pattern.test(str));
}

// 递归扫描目录
function scanDirectory(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(item.name)) {
        scanDirectory(fullPath);
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (SCAN_EXTENSIONS.includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

// 主函数
function main() {
  console.log('='.repeat(60));
  console.log('扫描硬编码的中文字符串');
  console.log('='.repeat(60));
  
  scanDirectory(SRC_DIR);
  
  console.log(`\n找到 ${chineseStrings.size} 个不同的中文字符串:\n`);
  
  // 按长度排序
  const sorted = Array.from(chineseStrings).sort((a, b) => a.length - b.length);
  
  // 分组显示
  const groups = {
    '状态相关': [],
    '操作按钮': [],
    '表单标签': [],
    '提示信息': [],
    '其他': []
  };
  
  const statusKeywords = ['待', '已', '未', '中', '草稿', '正常', '冻结', '过期', '预警', '紧急', '完成', '取消', '审核', '批准', '拒绝'];
  const actionKeywords = ['新增', '编辑', '删除', '保存', '取消', '确认', '提交', '导出', '导入', '打印', '搜索', '刷新', '查看', '下载', '上传', '审核', '驳回', '关闭'];
  const formKeywords = ['名称', '编码', '类型', '状态', '日期', '时间', '数量', '金额', '备注', '说明', '地址', '电话', '邮箱', '联系人', '部门', '职位', '单位', '规格', '分类'];
  const messageKeywords = ['成功', '失败', '提示', '警告', '错误', '确认', '请', '是否', '没有', '暂无', '加载', '正在'];
  
  sorted.forEach(str => {
    if (statusKeywords.some(k => str.includes(k))) {
      groups['状态相关'].push(str);
    } else if (actionKeywords.some(k => str.includes(k))) {
      groups['操作按钮'].push(str);
    } else if (formKeywords.some(k => str.includes(k))) {
      groups['表单标签'].push(str);
    } else if (messageKeywords.some(k => str.includes(k))) {
      groups['提示信息'].push(str);
    } else {
      groups['其他'].push(str);
    }
  });
  
  for (const [group, strings] of Object.entries(groups)) {
    if (strings.length > 0) {
      console.log(`\n【${group}】(${strings.length}个)`);
      strings.forEach(s => console.log(`  - ${s}`));
    }
  }
  
  // 生成建议的翻译键
  console.log('\n\n' + '='.repeat(60));
  console.log('建议添加的翻译键');
  console.log('='.repeat(60));
  
  // 状态相关
  if (groups['状态相关'].length > 0) {
    console.log('\n// 状态相关');
    groups['状态相关'].forEach(s => {
      const key = generateKey(s);
      console.log(`"${key}": "${s}"`);
    });
  }
  
  // 操作按钮
  if (groups['操作按钮'].length > 0) {
    console.log('\n// 操作按钮');
    groups['操作按钮'].forEach(s => {
      const key = generateKey(s);
      console.log(`"${key}": "${s}"`);
    });
  }
}

// 生成翻译键
function generateKey(chinese) {
  // 简单的拼音映射
  const pinyinMap = {
    '待': 'pending', '已': 'completed', '未': 'un', '中': 'ing',
    '草稿': 'draft', '正常': 'normal', '冻结': 'frozen', '过期': 'expired',
    '预警': 'warning', '紧急': 'critical', '完成': 'completed', '取消': 'cancelled',
    '审核': 'approved', '批准': 'approved', '拒绝': 'rejected',
    '新增': 'add', '编辑': 'edit', '删除': 'delete', '保存': 'save',
    '确认': 'confirm', '提交': 'submit', '导出': 'export', '导入': 'import',
    '打印': 'print', '搜索': 'search', '刷新': 'refresh', '查看': 'view',
    '下载': 'download', '上传': 'upload', '驳回': 'reject', '关闭': 'close',
    '名称': 'name', '编码': 'code', '类型': 'type', '状态': 'status',
    '日期': 'date', '时间': 'time', '数量': 'quantity', '金额': 'amount',
    '备注': 'remark', '说明': 'description', '地址': 'address',
    '电话': 'phone', '邮箱': 'email', '联系人': 'contact',
    '部门': 'department', '职位': 'position', '单位': 'unit',
    '规格': 'specification', '分类': 'category',
    '成功': 'success', '失败': 'failed', '提示': 'info',
    '警告': 'warning', '错误': 'error', '请': 'please',
    '是否': 'whether', '没有': 'no', '暂无': 'noData', '加载': 'loading',
    '正在': 'loading', '待审批': 'pendingApproval', '已审批': 'approved',
    '已转采购': 'convertedToPurchase', '待审核': 'pendingApproval',
  };
  
  // 查找匹配
  for (const [cn, en] of Object.entries(pinyinMap)) {
    if (chinese === cn || chinese.includes(cn)) {
      return en;
    }
  }
  
  // 默认使用小写拼音首字母
  return chinese.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

main();
