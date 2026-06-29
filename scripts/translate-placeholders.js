#!/usr/bin/env node
/**
 * 翻译 en.json 和 vi.json 中的中文占位符
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = 'd:/dcprint/erp-project/messages';

// 翻译映射表
const TRANSLATIONS = {
  // 通用
  '仓库管理': { en: 'Warehouse Management', vi: 'Quản lý kho' },
  '入库': { en: 'Inbound', vi: 'Nhập kho' },
  '出库': { en: 'Outbound', vi: 'Xuất kho' },
  '调拨': { en: 'Transfer', vi: 'Chuyển kho' },
  '盘点': { en: 'Stocktaking', vi: 'Kiểm kê' },
  '库存查询': { en: 'Inventory Query', vi: 'Truy vấn tồn kho' },
  '库存调整': { en: 'Stock Adjustment', vi: 'Điều chỉnh tồn kho' },
  '仓库设置': { en: 'Warehouse Setup', vi: 'Thiết lập kho' },
  '批次库存': { en: 'Batch Inventory', vi: 'Tồn kho theo lô' },
  'FIFO分配': { en: 'FIFO Allocation', vi: 'Phân bổ FIFO' },
  '库存预警': { en: 'Inventory Warning', vi: 'Cảnh báo tồn kho' },
  '库存流水': { en: 'Inventory Logs', vi: 'Nhật ký tồn kho' },
  '仓库分类': { en: 'Warehouse Category', vi: 'Phân loại kho' },
  
  // 状态
  '草稿': { en: 'Draft', vi: 'Nháp' },
  '待审核': { en: 'Pending', vi: 'Chờ duyệt' },
  '已审核': { en: 'Approved', vi: 'Đã duyệt' },
  '已关闭': { en: 'Closed', vi: 'Đã đóng' },
  '已转采购': { en: 'Converted to Purchase', vi: 'Đã chuyển mua hàng' },
  '正常': { en: 'Normal', vi: 'Bình thường' },
  '冻结': { en: 'Frozen', vi: 'Đóng băng' },
  '过期': { en: 'Expired', vi: 'Hết hạn' },
  '预警': { en: 'Warning', vi: 'Cảnh báo' },
  '紧急': { en: 'Critical', vi: 'Nghiêm trọng' },
  '低': { en: 'Low', vi: 'Thấp' },
  '中': { en: 'Medium', vi: 'Trung bình' },
  '高': { en: 'High', vi: 'Cao' },
  
  // 操作
  '保存': { en: 'Save', vi: 'Lưu' },
  '取消': { en: 'Cancel', vi: 'Hủy' },
  '删除': { en: 'Delete', vi: 'Xóa' },
  '编辑': { en: 'Edit', vi: 'Sửa' },
  '新增': { en: 'Add', vi: 'Thêm' },
  '搜索': { en: 'Search', vi: 'Tìm kiếm' },
  '刷新': { en: 'Refresh', vi: 'Làm mới' },
  '导出': { en: 'Export', vi: 'Xuất' },
  '导入': { en: 'Import', vi: 'Nhập' },
  '打印': { en: 'Print', vi: 'In' },
  '查看': { en: 'View', vi: 'Xem' },
  '下载': { en: 'Download', vi: 'Tải' },
  '上传': { en: 'Upload', vi: 'Tải lên' },
  '提交': { en: 'Submit', vi: 'Gửi' },
  '批准': { en: 'Approve', vi: 'Phê duyệt' },
  '拒绝': { en: 'Reject', vi: 'Từ chối' },
  
  // 提示
  '加载中...': { en: 'Loading...', vi: 'Đang tải...' },
  '暂无数据': { en: 'No data', vi: 'Không có dữ liệu' },
  '操作成功': { en: 'Success', vi: 'Thành công' },
  '操作失败': { en: 'Error', vi: 'Lỗi' },
  '确定要删除吗？': { en: 'Confirm delete?', vi: 'Xác nhận xóa?' },
  '删除成功': { en: 'Deleted successfully', vi: 'Xóa thành công' },
  '删除失败': { en: 'Delete failed', vi: 'Xóa thất bại' },
  
  // 字段
  '物料编码': { en: 'Material Code', vi: 'Mã vật liệu' },
  '物料名称': { en: 'Material Name', vi: 'Tên vật liệu' },
  '规格': { en: 'Specification', vi: 'Quy cách' },
  '单位': { en: 'Unit', vi: 'Đơn vị' },
  '数量': { en: 'Quantity', vi: 'Số lượng' },
  '金额': { en: 'Amount', vi: 'Số tiền' },
  '日期': { en: 'Date', vi: 'Ngày' },
  '状态': { en: 'Status', vi: 'Trạng thái' },
  '类型': { en: 'Type', vi: 'Loại' },
  '备注': { en: 'Remark', vi: 'Ghi chú' },
  '名称': { en: 'Name', vi: 'Tên' },
  '编码': { en: 'Code', vi: 'Mã' },
  '操作': { en: 'Operation', vi: 'Thao tác' },
  
  // 模块
  '采购申请': { en: 'Purchase Request', vi: 'Yêu cầu mua hàng' },
  '采购订单': { en: 'Purchase Order', vi: 'Đơn hàng mua' },
  '销售订单': { en: 'Sales Order', vi: 'Đơn hàng bán' },
  '生产工单': { en: 'Work Order', vi: 'Lệnh sản xuất' },
  '客户档案': { en: 'Customer Profile', vi: 'Hồ sơ khách hàng' },
  '供应商': { en: 'Supplier', vi: 'Nhà cung cấp' },
};

// 翻译文本
function translate(text, lang) {
  if (TRANSLATIONS[text]) {
    return TRANSLATIONS[text][lang];
  }
  
  // 如果包含中文，返回原文（需要人工翻译）
  if (/[\u4e00-\u9fa5]/.test(text)) {
    return text; // 保持原样，需要人工翻译
  }
  
  return text;
}

// 处理翻译文件
function processFile(filename, lang) {
  const filePath = path.join(MESSAGES_DIR, filename);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  let translatedCount = 0;
  
  function translateObject(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        const original = obj[key];
        const translated = translate(original, lang);
        if (translated !== original) {
          obj[key] = translated;
          translatedCount++;
        }
      } else if (typeof obj[key] === 'object') {
        translateObject(obj[key]);
      }
    }
  }
  
  translateObject(content);
  
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  
  return translatedCount;
}

// 主函数
function main() {
  console.log('='.repeat(80));
  console.log('Translating Placeholders');
  console.log('='.repeat(80));
  
  console.log('\nProcessing en.json...');
  const enCount = processFile('en.json', 'en');
  console.log(`  Translated: ${enCount} items`);
  
  console.log('\nProcessing vi.json...');
  const viCount = processFile('vi.json', 'vi');
  console.log(`  Translated: ${viCount} items`);
  
  console.log('\n' + '='.repeat(80));
  console.log('Translation Complete');
  console.log('='.repeat(80));
  console.log(`\nTotal translated: ${enCount + viCount} items`);
  console.log('\nNote: Some items may still contain Chinese and require manual translation.');
}

main();
