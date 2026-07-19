#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Keys to add to Common namespace, with their current values from zh-CN.json
// (fetched from wherever they currently exist in the file)
const KEYS_TO_ADD = [
  // Finance cross-cutting
  ["sourceNo", "来源单号"],
  ["dueDate", "到期日期"],
  ["receivedAmount", "已收金额"],
  ["paidAmount", "已付金额"],
  ["receiptDate", "收款日期"],
  ["payableNo", "应付单号"],
  ["receivableNo", "应收单号"],
  ["totalCost", "总成本"],

  // Currency
  ["currency", "币种"],
  ["selectCurrency", "选择币种"],
  ["noCurrency", "无可用币种"],
  ["symbol", "符号"],
  ["decimalPlaces", "小数位数"],
  ["currencyName", "币种名称"],
  ["currencyManagement", "币种管理"],
  ["codeAndNameRequired", "编码和名称不能为空"],
  ["sort", "排序"],
  ["invalidRate", "无效的汇率"],
  ["sameCurrencyError", "原币种和目标币种不能相同"],
  ["exchangeRateManagement", "汇率管理"],
  ["originalCurrency", "原币种"],
  ["baseCurrency", "基准币种"],
  ["exchangeRate", "汇率"],

  // Generic UI
  ["selectedCount", "已选择 {count} 项"],
  ["clearSelection", "清除选择"],
  ["submitting", "提交中"],
  ["saving", "保存中"],
  ["dataRefreshed", "数据已刷新"],
  ["filterReset", "筛选已重置"],
  ["queryFailed", "查询失败"],
  ["selectWarehouse", "选择仓库"],
  ["remarkPlaceholder", "请输入备注"],
  ["printWindowBlocked", "弹窗被拦截，请允许弹出窗口"],
  ["invalid", "无效"],
  ["importing", "导入中"],
  ["returnNo", "退货单号"],

  // User mgmt
  ["usernameRequired", "请输入用户名"],
  ["passwordRequired", "请输入密码"],

  // SRM
  ["fetchDataFail", "获取数据失败"],
  ["fetchDetailFail", "获取详情失败"],

  // Unit (quality incoming)
  ["unitM", "米"],
  ["unitKG", "千克"],
  ["unitRoll", "卷"],
  ["unitPiece", "个"],
  ["unitSheet", "张"],
  ["unitBucket", "桶"],
  ["unitBox", "盒"],
  ["unitPCS", "件"],
  ["unitSet", "套"],
  ["unitItem", "条"],

  // Process/Sample generic
  ["processCardNo", "流程卡号"],
  ["analysisTablesUnit", "张"],
  ["agingRecordsUnit", "张"],
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const langs = ['zh-CN', 'zh-TW', 'en', 'vi'];

// For zh-TW: convert zh-CN values
function twConvert(text) {
  const map = {
    "来源单号": "來源單號", "到期日期": "到期日期", "已收金额": "已收金額",
    "已付金额": "已付金額", "收款日期": "收款日期", "应付单号": "應付單號",
    "应收单号": "應收單號", "总成本": "總成本", "币种": "幣種",
    "选择币种": "選擇幣種", "无可用币种": "無可用幣種", "符号": "符號",
    "小数位数": "小數位數", "币种名称": "幣種名稱", "币种管理": "幣種管理",
    "编码和名称不能为空": "編碼和名稱不能為空", "排序": "排序",
    "无效的汇率": "無效的匯率", "原币种和目标币种不能相同": "原幣種和目標幣種不能相同",
    "汇率管理": "匯率管理", "原币种": "原幣種", "基准币种": "基準幣種",
    "汇率": "匯率", "已选择 {count} 项": "已選擇 {count} 項",
    "清除选择": "清除選擇", "提交中": "提交中", "保存中": "保存中",
    "数据已刷新": "資料已刷新", "筛选已重置": "篩選已重設",
    "查询失败": "查詢失敗", "选择仓库": "選擇倉庫",
    "请输入备注": "請輸入備註", "弹窗被拦截，请允许弹出窗口": "彈窗被攔截，請允許彈出視窗",
    "无效": "無效", "导入中": "匯入中", "退货单号": "退貨單號",
    "请输入用户名": "請輸入用戶名", "请输入密码": "請輸入密碼",
    "获取数据失败": "獲取資料失敗", "获取详情失败": "獲取詳情失敗",
    "米": "米", "千克": "千克", "卷": "卷", "个": "個", "张": "張",
    "桶": "桶", "盒": "盒", "件": "件", "套": "套", "条": "條",
    "流程卡号": "流程卡號",
  };
  return map[text] || text;
}

for (const lang of langs) {
  const path = join(projectRoot, 'messages', `${lang}.json`);
  const data = readJson(path);
  if (!data.Common) data.Common = {};

  for (const [key, cnVal] of KEYS_TO_ADD) {
    if (data.Common[key]) continue; // already exists

    if (lang === 'zh-CN') {
      data.Common[key] = cnVal;
    } else if (lang === 'zh-TW') {
      data.Common[key] = twConvert(cnVal);
    } else if (lang === 'en') {
      // English: derive or fetch from existing location
      const enMap = {
        sourceNo: "Source No", dueDate: "Due Date", receivedAmount: "Received Amount",
        paidAmount: "Paid Amount", receiptDate: "Receipt Date", payableNo: "Payable No",
        receivableNo: "Receivable No", totalCost: "Total Cost",
        currency: "Currency", selectCurrency: "Select Currency", noCurrency: "No Currency Available",
        symbol: "Symbol", decimalPlaces: "Decimal Places", currencyName: "Currency Name",
        currencyManagement: "Currency Management", codeAndNameRequired: "Code and name required",
        sort: "Sort", invalidRate: "Invalid Rate", sameCurrencyError: "Same currency error",
        exchangeRateManagement: "Exchange Rate Management", originalCurrency: "Original Currency",
        baseCurrency: "Base Currency", exchangeRate: "Exchange Rate",
        selectedCount: "{count} selected", clearSelection: "Clear Selection",
        submitting: "Submitting", saving: "Saving", dataRefreshed: "Data Refreshed",
        filterReset: "Filter Reset", queryFailed: "Query Failed",
        selectWarehouse: "Select Warehouse", remarkPlaceholder: "Please enter remark",
        printWindowBlocked: "Popup blocked", invalid: "Invalid",
        importing: "Importing", returnNo: "Return No",
        usernameRequired: "Username required", passwordRequired: "Password required",
        fetchDataFail: "Failed to fetch data", fetchDetailFail: "Failed to fetch details",
        unitM: "Meter", unitKG: "Kilogram", unitRoll: "Roll", unitPiece: "Piece",
        unitSheet: "Sheet", unitBucket: "Bucket", unitBox: "Box", unitPCS: "Pieces",
        unitSet: "Set", unitItem: "Item",
        processCardNo: "Process Card No",
        analysisTablesUnit: "Tables", agingRecordsUnit: "Records",
      };
      data.Common[key] = enMap[key] || cnVal;
    } else if (lang === 'vi') {
      const viMap = {
        sourceNo: "Số nguồn", dueDate: "Ngày đáo hạn", receivedAmount: "Số tiền đã nhận",
        paidAmount: "Số tiền đã trả", receiptDate: "Ngày nhận", payableNo: "Số phiếu phải trả",
        receivableNo: "Số phiếu phải thu", totalCost: "Tổng chi phí",
        currency: "Tiền tệ", selectCurrency: "Chọn tiền tệ", noCurrency: "Không có tiền tệ",
        symbol: "Ký hiệu", decimalPlaces: "Số thập phân", currencyName: "Tên tiền tệ",
        currencyManagement: "Quản lý tiền tệ", codeAndNameRequired: "Mã và tên không được để trống",
        sort: "Sắp xếp", invalidRate: "Tỷ giá không hợp lệ",
        sameCurrencyError: "Tiền tệ gốc và đích không thể giống nhau",
        exchangeRateManagement: "Quản lý tỷ giá", originalCurrency: "Tiền tệ gốc",
        baseCurrency: "Tiền tệ cơ sở", exchangeRate: "Tỷ giá",
        selectedCount: "Đã chọn {count}", clearSelection: "Bỏ chọn",
        submitting: "Đang gửi", saving: "Đang lưu", dataRefreshed: "Dữ liệu đã làm mới",
        filterReset: "Đã đặt lại bộ lọc", queryFailed: "Truy vấn thất bại",
        selectWarehouse: "Chọn kho", remarkPlaceholder: "Vui lòng nhập ghi chú",
        printWindowBlocked: "Cửa sổ bị chặn", invalid: "Không hợp lệ",
        importing: "Đang nhập", returnNo: "Số phiếu trả",
        usernameRequired: "Vui lòng nhập tên người dùng",
        passwordRequired: "Vui lòng nhập mật khẩu",
        fetchDataFail: "Lấy dữ liệu thất bại", fetchDetailFail: "Lấy chi tiết thất bại",
        unitM: "Mét", unitKG: "Kilôgam", unitRoll: "Cuộn", unitPiece: "Cái",
        unitSheet: "Tờ", unitBucket: "Thùng", unitBox: "Hộp", unitPCS: "Kiện",
        unitSet: "Bộ", unitItem: "Mục",
        processCardNo: "Số thẻ quy trình",
        analysisTablesUnit: "Bảng", agingRecordsUnit: "Bản ghi",
      };
      data.Common[key] = viMap[key] || cnVal;
    }
  }

  writeJson(path, data);
  console.log(`✓ ${lang}.json 已更新`);
}

console.log('Phase 1 (A类) 完成');
