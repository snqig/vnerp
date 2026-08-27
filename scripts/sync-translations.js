#!/usr/bin/env node
/**
 * 同步所有翻译文件
 * 以 zh-CN.json 为基准，同步到其他语言文件
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = 'd:/dcprint/erp-project/messages';

// 简繁转换映射
const SIMPLIFIED_TO_TRADITIONAL = {
  '简体中文': '繁體中文',
  '仓库': '倉庫',
  '管理': '管理',
  '库存': '庫存',
  '入库': '入庫',
  '出库': '出庫',
  '调拨': '調撥',
  '盘点': '盤點',
  '物料': '物料',
  '编码': '編碼',
  '名称': '名稱',
  '数量': '數量',
  '金额': '金額',
  '日期': '日期',
  '状态': '狀態',
  '类型': '類型',
  '备注': '備註',
  '规格': '規格',
  '单位': '單位',
  '审核': '審核',
  '审批': '審批',
  '草稿': '草稿',
  '正常': '正常',
  '冻结': '凍結',
  '过期': '過期',
  '预警': '預警',
  '紧急': '緊急',
  '保存': '儲存',
  '取消': '取消',
  '删除': '刪除',
  '编辑': '編輯',
  '新增': '新增',
  '搜索': '搜尋',
  '刷新': '重新整理',
  '导出': '匯出',
  '导入': '匯入',
  '打印': '列印',
  '查看': '檢視',
  '下载': '下載',
  '上传': '上傳',
  '加载中': '載入中',
  '暂无数据': '暫無資料',
  '操作成功': '成功',
  '操作失败': '錯誤',
  '确定': '確定',
  '是': '是',
  '否': '否',
  '全部': '全部',
  '启用': '啟用',
  '禁用': '停用',
  '上一页': '上一頁',
  '下一页': '下一頁',
  '操作': '操作',
  '详情': '詳情',
  '待审核': '待審核',
  '已审核': '已審核',
  '已关闭': '已關閉',
  '低': '低',
  '中': '中',
  '高': '高',
  '仪表盘': '儀表板',
  '订单': '訂單',
  '生产': '生產',
  '采购': '採購',
  '销售': '銷售',
  '财务': '財務',
  '质量': '品質',
  '设备': '設備',
  '人事': '人事',
  '委外': '委外',
  '供应商': '供應商',
  '客户': '客戶',
  '系统': '系統',
  '工程': '工程',
  '配送': '配送',
  '报表': '報表',
  '商务': '商務',
  '印前': '印前',
  '油墨': '油墨',
  '刀模': '刀模',
  '网版': '網版',
  '标签': '標籤',
  '工艺': '工藝',
  '检验': '檢驗',
  '合格': '合格',
  '不合格': '不合格品',
  '维修': '維修',
  '保养': '保養',
  '校准': '校準',
  '报废': '報廢',
  '员工': '員工',
  '部门': '部門',
  '职位': '職位',
  '薪资': '薪資',
  '培训': '培訓',
  '考勤': '考勤',
  '应收': '應收',
  '应付': '應付',
  '成本': '成本',
  '凭证': '憑證',
  '发票': '發票',
  '合同': '合約',
  '报价': '報價',
  '发货': '發貨',
  '退货': '退貨',
  '对账': '對帳',
  '结算': '結算',
  '用户': '使用者',
  '角色': '角色',
  '菜单': '選單',
  '字典': '字典',
  '配置': '設定',
  '日志': '日誌',
  '通知': '通知',
  '权限': '權限',
  '组织': '組織',
  '机构': '機構',
};

// 简体转繁体
function toTraditional(text) {
  let result = text;
  for (const [simplified, traditional] of Object.entries(SIMPLIFIED_TO_TRADITIONAL)) {
    result = result.replace(new RegExp(simplified, 'g'), traditional);
  }
  return result;
}

// 加载翻译文件
function loadMessages(filename) {
  const filePath = path.join(MESSAGES_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return {};
  }
}

// 保存翻译文件
function saveMessages(filename, data) {
  const filePath = path.join(MESSAGES_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

// 同步翻译文件
function syncTranslations() {
  console.log('='.repeat(80));
  console.log('Syncing Translation Files');
  console.log('='.repeat(80));
  
  const zhCN = loadMessages('zh-CN.json');
  const en = loadMessages('en.json');
  const zhTW = loadMessages('zh-TW.json');
  const vi = loadMessages('vi.json');
  
  let addedToEn = 0;
  let addedToZhTW = 0;
  let addedToVi = 0;
  
  // 同步每个命名空间
  for (const [ns, keys] of Object.entries(zhCN)) {
    // 同步到 en.json
    if (!en[ns]) en[ns] = {};
    for (const [key, value] of Object.entries(keys)) {
      if (!en[ns][key]) {
        // 使用 zh-CN 的值作为占位符（需要人工翻译）
        en[ns][key] = value;
        addedToEn++;
      }
    }
    
    // 同步到 zh-TW.json
    if (!zhTW[ns]) zhTW[ns] = {};
    for (const [key, value] of Object.entries(keys)) {
      if (!zhTW[ns][key]) {
        // 转換為繁體
        zhTW[ns][key] = toTraditional(value);
        addedToZhTW++;
      }
    }
    
    // 同步到 vi.json
    if (!vi[ns]) vi[ns] = {};
    for (const [key, value] of Object.entries(keys)) {
      if (!vi[ns][key]) {
        // 使用 zh-CN 的值作为占位符（需要人工翻译）
        vi[ns][key] = value;
        addedToVi++;
      }
    }
  }
  
  // 保存文件
  saveMessages('en.json', en);
  saveMessages('zh-TW.json', zhTW);
  saveMessages('vi.json', vi);
  
  console.log(`\nAdded to en.json: ${addedToEn} keys`);
  console.log(`Added to zh-TW.json: ${addedToZhTW} keys`);
  console.log(`Added to vi.json: ${addedToVi} keys`);
  
  console.log('\n' + '='.repeat(80));
  console.log('Sync Complete!');
  console.log('='.repeat(80));
  
  console.log('\nNote: en.json and vi.json have placeholder values that need manual translation.');
  console.log('zh-TW.json has been auto-converted from Simplified Chinese.');
}

syncTranslations();
