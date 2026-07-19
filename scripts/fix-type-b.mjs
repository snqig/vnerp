#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Step 1: Gather all misbound B类 instances
const MESSAGES_PATH = join(projectRoot, 'messages', 'zh-CN.json');
const SRC_DIR = join(projectRoot, 'src');

const raw = readFileSync(MESSAGES_PATH, 'utf8');
const data = JSON.parse(raw);
const namespaces = {};
for (const ns of Object.keys(data)) {
  namespaces[ns] = new Set(Object.keys(data[ns] || {}));
}

const BINDING_RE = /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:use|get)Translations\(\s*['"]([A-Za-z]+)['"]\s*\)/g;
const CALL_RE = /([A-Za-z_$][\w$]*)\(\s*['"`]([^'"`]+)['"`]\s*(?:,[^)]*)?\)/g;

function walk(dir, rel, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      walk(full, rel ? `${rel}/${entry}` : entry, out);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      const relPath = rel ? `${rel}/${entry}` : entry;
      const r = analyzeFile(full, relPath);
      if (r) out.push(r);
    }
  }
}

function analyzeFile(absPath, relPath) {
  let content;
  try { content = readFileSync(absPath, 'utf8'); } catch { return null; }

  const aliasToNs = {};
  let bm;
  BINDING_RE.lastIndex = 0;
  while ((bm = BINDING_RE.exec(content)) !== null) {
    aliasToNs[bm[1]] = bm[2];
  }
  const aliasNames = Object.keys(aliasToNs);
  if (aliasNames.length === 0) return null;
  const aliasRe = new RegExp(`^(?:${aliasNames.map(a => a.replace(/[$]/g, '\\$')).join('|')})$`);

  let cm;
  CALL_RE.lastIndex = 0;
  const results = [];
  while ((cm = CALL_RE.exec(content)) !== null) {
    const alias = cm[1];
    if (!aliasRe.test(alias)) continue;
    const key = cm[2];
    if (key.includes('${') || /[+]|['"`]/.test(key)) continue;
    const ns = aliasToNs[alias];
    const inLocal = namespaces[ns]?.has(key) ?? false;
    if (inLocal) continue;

    const candidates = [];
    for (const [cns, keyset] of Object.entries(namespaces)) {
      if (keyset.has(key)) candidates.push(cns);
    }
    if (candidates.length > 0) {
      results.push({ boundNs: ns, key, actualNs: candidates[0] });
    }
  }
  return results.length > 0 ? results : null;
}

const allFiles = [];
walk(SRC_DIR, '', allFiles);

// Collect unique (boundNs, key) -> actualNs mappings
const needAdd = new Map(); // `${boundNs}.${key}` -> { boundNs, key, actualNs, sources: [] }
for (const results of allFiles) {
  if (!results) continue;
  for (const r of results) {
    if (r.boundNs === 'Common') continue; // A类 already handled
    const id = `${r.boundNs}.${r.key}`;
    if (!needAdd.has(id)) {
      needAdd.set(id, { boundNs: r.boundNs, key: r.key, actualNs: r.actualNs });
    }
  }
}

console.log(`需要添加 ${needAdd.size} 个 key 到模块命名空间`);

// Step 2: For each (boundNs, key), find zh-CN translation from actualNs
function findKeyInNs(obj, ns, key) {
  if (obj[ns] && obj[ns][key] !== undefined) return obj[ns][key];
  return null;
}

// zh-TW conversion
const twMap = {
  "上传成功": "上傳成功", "上传失败": "上傳失敗", "刀模编号": "刀模編號",
  "成本": "成本", "状态": "狀態", "工单号": "工單號", "工序": "工序",
  "操作人": "操作人", "编辑说明": "編輯說明", "单价": "單價",
  "二维码": "二維碼", "暂无记录": "暫無記錄", "详情": "詳情",
  "错误": "錯誤", "成功": "成功", "状态已更新": "狀態已更新",
  "当前状态": "當前狀態", "尺寸": "尺寸", "公差": "公差",
  "查看详情": "查看詳情", "工序信息": "工序信息", "主标签号": "主標籤號",
  "材料规格": "材料規格", "印刷类型": "印刷類型", "计划数量": "計劃數量",
  "成品尺寸": "成品尺寸", "工艺流程": "工藝流程", "合格数量": "合格數量",
  "物料信息": "物料信息", "产品名称": "產品名稱", "主料信息": "主料信息",
  "标签号": "標籤號", "物料编码": "物料編碼", "入库日期": "入庫日期",
  "主料": "主料", "辅料": "輔料", "成品": "成品", "物料类型": "物料類型",
  "接收日期": "接收日期", "不良金额": "不良金額", "报告编号": "報告編號",
  "切割": "切割", "批量打印": "批量打印", "页信息": "頁信息",
  "扫描查询失败": "掃描查詢失敗", "生成失败": "生成失敗", "已锁定": "已鎖定",
  "审核": "審核", "创建失败": "創建失敗", "操作人": "操作人",
  "获取列表失败": "獲取列表失敗", "填写编码和名称": "填寫編碼和名稱",
  "创建成功": "創建成功", "更新成功": "更新成功", "更新失败": "更新失敗",
  "模板": "模板", "确认删除": "確認刪除", "删除成功": "刪除成功",
  "删除失败": "刪除失敗", "产能过剩": "產能過剩",
  "获取失败": "獲取失敗", "无数据可打印": "無數據可打印",
  "无数据可导出": "無數據可導出", "无数据": "無數據",
  "物料名称": "物料名稱", "加班时长": "加班時長",
  "应收总计": "應收總計", "应付总计": "應付總計",
  "制版费": "製版費", "版费": "版費",
  "选择销售订单": "選擇銷售訂單", "选择客户": "選擇客戶",
  "选择仓库": "選擇倉庫", "获取详情失败": "獲取詳情失敗",
  "联系人": "聯繫人", "添加物料": "添加物料", "单价": "單價",
  "退货单号": "退貨單號", "制版": "製版",
  "单位": "單位",
};

const enMap = {
  "上传成功": "Upload successful", "上传失败": "Upload failed",
  "刀模编号": "Die Code", "成本": "Cost", "状态": "Status",
  "工单号": "Work Order No", "工序": "Process", "操作人": "Operator",
  "编辑说明": "Edit Description", "单价": "Unit Price",
  "二维码": "QR Code", "暂无记录": "No Records", "详情": "Details",
  "错误": "Error", "成功": "Success", "状态已更新": "Status Updated",
  "当前状态": "Current Status", "尺寸": "Size", "公差": "Tolerance",
  "查看详情": "View Details", "工序信息": "Process Info",
  "主标签号": "Main Label No", "材料规格": "Material Spec",
  "印刷类型": "Print Type", "计划数量": "Planned Qty",
  "成品尺寸": "Finished Size", "工艺流程": "Process Flow",
  "合格数量": "Qualified Qty", "物料信息": "Material Info",
  "产品名称": "Product Name", "主料信息": "Main Material Info",
  "标签号": "Label No", "物料编码": "Material Code", "入库日期": "Receipt Date",
  "主料": "Main Material", "辅料": "Auxiliary Material", "成品": "Finished Product",
  "物料类型": "Material Type", "接收日期": "Receive Date",
  "不良金额": "Defect Amount", "报告编号": "Report No",
  "切割": "Cut", "批量打印": "Batch Print", "页信息": "Page Info",
  "扫描查询失败": "Scan Query Failed", "生成失败": "Generate Failed",
  "已锁定": "Locked", "审核": "Audit", "创建失败": "Create Failed",
  "获取列表失败": "Fetch List Failed",
  "填写编码和名称": "Fill Code and Name",
  "创建成功": "Created Successfully", "更新成功": "Updated Successfully",
  "更新失败": "Update Failed", "模板": "Template",
  "确认删除": "Confirm Deletion", "删除成功": "Deleted Successfully",
  "删除失败": "Delete Failed", "产能过剩": "Overcapacity",
  "获取失败": "Fetch Failed", "无数据可打印": "No Data to Print",
  "无数据可导出": "No Data to Export", "无数据": "No Data",
  "物料名称": "Material Name", "加班时长": "Overtime Hours",
  "应收总计": "Total Receivable", "应付总计": "Total Payable",
  "制版费": "Plate Making Fee", "版费": "Plate Fee",
  "选择销售订单": "Select Sales Order", "选择客户": "Select Customer",
  "选择仓库": "Select Warehouse", "获取详情失败": "Fetch Detail Failed",
  "联系人": "Contact Person", "添加物料": "Add Material",
  "单位": "Unit(s)",
};

const viMap = {
  "上传成功": "Tải lên thành công", "上传失败": "Tải lên thất bại",
  "刀模编号": "Mã khuôn", "成本": "Chi phí", "状态": "Trạng thái",
  "工单号": "Số lệnh SX", "工序": "Quy trình", "操作人": "Người thực hiện",
  "编辑说明": "Chỉnh sửa mô tả", "单价": "Đơn giá",
  "二维码": "Mã QR", "暂无记录": "Không có bản ghi", "详情": "Chi tiết",
  "错误": "Lỗi", "成功": "Thành công", "状态已更新": "Đã cập nhật trạng thái",
  "当前状态": "Trạng thái hiện tại", "尺寸": "Kích thước", "公差": "Dung sai",
  "查看详情": "Xem chi tiết", "工序信息": "Thông tin quy trình",
  "主标签号": "Mã nhãn chính", "材料规格": "Quy cách vật liệu",
  "印刷类型": "Loại in", "计划数量": "Số lượng KH",
  "成品尺寸": "Kích thước TP", "工艺流程": "Quy trình SX",
  "合格数量": "SL đạt yêu cầu", "物料信息": "Thông tin vật tư",
  "产品名称": "Tên SP", "主料信息": "Thông tin NVL chính",
  "标签号": "Số nhãn", "物料编码": "Mã vật tư", "入库日期": "Ngày nhập",
  "主料": "NVL chính", "辅料": "NVL phụ", "成品": "Thành phẩm",
  "物料类型": "Loại vật tư", "接收日期": "Ngày nhận",
  "不良金额": "Số tiền lỗi", "报告编号": "Số báo cáo",
  "切割": "Cắt", "批量打印": "In hàng loạt", "页信息": "Thông tin trang",
  "扫描查询失败": "Truy vấn quét thất bại",
  "生成失败": "Tạo thất bại", "已锁定": "Đã khóa",
  "审核": "Kiểm duyệt", "创建失败": "Tạo thất bại",
  "获取列表失败": "Lấy danh sách thất bại",
  "填写编码和名称": "Nhập mã và tên",
  "创建成功": "Tạo thành công", "更新成功": "Cập nhật thành công",
  "更新失败": "Cập nhật thất bại", "模板": "Mẫu",
  "确认删除": "Xác nhận xóa", "删除成功": "Xóa thành công",
  "删除失败": "Xóa thất bại", "产能过剩": "Dư thừa công suất",
  "获取失败": "Lấy dữ liệu thất bại", "无数据可打印": "Không có dữ liệu để in",
  "无数据可导出": "Không có dữ liệu XK", "无数据": "Không có dữ liệu",
  "物料名称": "Tên vật tư", "加班时长": "Giờ làm thêm",
  "应收总计": "Tổng phải thu", "应付总计": "Tổng phải trả",
  "制版费": "Phí tạo bản", "版费": "Phí bản in",
  "选择销售订单": "Chọn đơn hàng", "选择客户": "Chọn khách hàng",
  "选择仓库": "Chọn kho", "获取详情失败": "Lấy chi tiết thất bại",
  "联系人": "Liên hệ", "添加物料": "Thêm vật tư",
  "单位": "Đơn vị",
};

const langs = ['zh-CN', 'zh-TW', 'en', 'vi'];
const locales = {};
for (const lang of langs) {
  locales[lang] = JSON.parse(readFileSync(join(projectRoot, 'messages', `${lang}.json`), 'utf8'));
}

let added = 0;
for (const [id, info] of needAdd) {
  const { boundNs, key, actualNs } = info;

  // Get zh-CN translation from actual namespace
  const cnVal = findKeyInNs(locales['zh-CN'], actualNs, key);
  if (!cnVal) {
    console.log(`  ⚠ 找不到 ${actualNs}.${key} 在 zh-CN 中的翻译`);
    continue;
  }

  let skip = true;
  for (const lang of langs) {
    if (!locales[lang][boundNs]) locales[lang][boundNs] = {};
    if (locales[lang][boundNs][key]) continue; // already exists
    skip = false;

    if (lang === 'zh-CN') {
      locales[lang][boundNs][key] = cnVal;
    } else if (lang === 'zh-TW') {
      locales[lang][boundNs][key] = twMap[cnVal] || cnVal;
    } else if (lang === 'en') {
      locales[lang][boundNs][key] = enMap[cnVal] || cnVal;
    } else if (lang === 'vi') {
      locales[lang][boundNs][key] = viMap[cnVal] || cnVal;
    }
  }
  if (!skip) {
    added++;
    console.log(`  ✓ ${boundNs}.${key} (取自 ${actualNs})`);
  }
}

// Write back
for (const lang of langs) {
  writeFileSync(join(projectRoot, 'messages', `${lang}.json`), JSON.stringify(locales[lang], null, 2) + '\n', 'utf8');
}

console.log(`\n已添加 ${added} 个 key (共 ${needAdd.size} 个需要)`);
