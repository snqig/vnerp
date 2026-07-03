---
name: "i18n-batch-migration"
description: "Batch internationalization migration for Next.js projects. Automatically scans all pages with hardcoded Chinese strings, replaces with translation functions, updates all 4 language files (en, zh-CN, zh-TW, vi), and generates completion report. Invoke when user wants to batch migrate i18n or says '继续' to continue migration."
---

# i18n Batch Migration Skill

This skill automates batch internationalization migration for Next.js projects using next-intl.

## What It Does

1. **Scans** ALL source files for hardcoded Chinese strings
2. **Prioritizes** files by importance (components > list pages > detail pages)
3. **Batch processes** all files automatically
4. **Updates** all four language files (en.json, zh-CN.json, zh-TW.json, vi.json)
5. **Validates** translation file completeness
6. **Generates** detailed completion report

## When to Invoke

- User asks to "batch migrate i18n" or "批量国际化"
- User says "继续" to continue migration
- User wants to process ALL pages at once
- User mentions "自动完成" or "全部改造"

## Automatic Workflow

### Step 1: Scan All Files

```javascript
// Scan pattern
const files = glob.sync('src/app/[locale]/**/page.tsx');
const filesWithChinese = files.filter(f => hasChinese(readFile(f)));

// Priority sorting
const sorted = filesWithChinese.sort((a, b) => {
  if (a.includes('components/ui')) return -1;
  if (a.includes('/new/') || a.includes('/edit/')) return 1;
  return 0;
});
```

### Step 2: Process Each File Automatically

For each file, the skill will:

1. **Add imports**:
   ```typescript
   import { useTranslations } from 'next-intl';
   ```

2. **Add translation hooks**:
   ```typescript
   const t = useTranslations('ModuleName');
   const tc = useTranslations('Common');
   ```

3. **Replace hardcoded strings**:
   - Status labels: `'草稿'` → `tc('draft')`
   - Buttons: `'保存'` → `tc('save')`
   - Messages: `'加载中...'` → `tc('loading')`
   - Table headers: `'物料名称'` → `t('materialName')`

4. **Keep print/export Chinese** unchanged

### Step 3: Update All Language Files

Automatically add new translation keys to all 4 files:

| File | Language | Example |
|------|----------|---------|
| zh-CN.json | 简体中文 | `"save": "保存"` |
| en.json | English | `"save": "Save"` |
| zh-TW.json | 繁体中文 | `"save": "儲存"` |
| vi.json | Vietnamese | `"save": "Lưu"` |

### Step 4: Validate & Report

```bash
node scripts/analyze-translation-completeness.js
```

## Translation Key Mappings

### Common Namespace (tc)

| Chinese | Key | en | vi | zh-TW |
|---------|-----|-----|-----|-------|
| 保存 | save | Save | Lưu | 儲存 |
| 取消 | cancel | Cancel | Hủy | 取消 |
| 删除 | delete | Delete | Xóa | 刪除 |
| 编辑 | edit | Edit | Sửa | 編輯 |
| 新增 | add | Add | Thêm | 新增 |
| 搜索 | search | Search | Tìm kiếm | 搜尋 |
| 刷新 | refresh | Refresh | Làm mới | 重新整理 |
| 导出 | export | Export | Xuất | 匯出 |
| 导入 | import | Import | Nhập | 匯入 |
| 打印 | print | Print | In | 列印 |
| 查看 | view | View | Xem | 檢視 |
| 下载 | download | Download | Tải | 下載 |
| 上传 | upload | Upload | Tải lên | 上傳 |
| 加载中... | loading | Loading... | Đang tải... | 載入中... |
| 暂无数据 | noData | No data | Không có dữ liệu | 暫無資料 |
| 操作成功 | success | Success | Thành công | 成功 |
| 操作失败 | error | Error | Lỗi | 錯誤 |
| 确定要删除吗？ | confirmDelete | Confirm delete? | Xác nhận xóa? | 確定要刪除嗎？ |
| 草稿 | draft | Draft | Nháp | 草稿 |
| 待审核 | pending | Pending | Chờ duyệt | 待審核 |
| 已审核 | approved | Approved | Đã duyệt | 已審核 |
| 待审批 | pending | Pending | Chờ duyệt | 待審批 |
| 已审批 | approved | Approved | Đã duyệt | 已審批 |
| 已关闭 | closed | Closed | Đã đóng | 已關閉 |
| 已转采购 | convertedToPurchase | Converted to Purchase | Đã chuyển mua | 已轉採購 |
| 正常 | normal | Normal | Bình thường | 正常 |
| 冻结 | frozen | Frozen | Đóng băng | 凍結 |
| 过期 | expired | Expired | Hết hạn | 過期 |
| 预警 | warning | Warning | Cảnh báo | 預警 |
| 紧急 | critical | Critical | Nghiêm trọng | 緊急 |
| 低 | low | Low | Thấp | 低 |
| 中 | medium | Medium | Trung bình | 中 |
| 高 | high | High | Cao | 高 |
| 是 | yes | Yes | Có | 是 |
| 否 | no | No | Không | 否 |
| 全部 | all | All | Tất cả | 全部 |
| 启用 | enabled | Enabled | Bật | 啟用 |
| 禁用 | disabled | Disabled | Tắt | 停用 |
| 上一页 | prevPage | Previous | Trước | 上一頁 |
| 下一页 | nextPage | Next | Tiếp | 下一頁 |
| 操作 | operation | Operation | Thao tác | 操作 |
| 状态 | status | Status | Trạng thái | 狀態 |
| 类型 | type | Type | Loại | 類型 |
| 备注 | remark | Remark | Ghi chú | 備註 |
| 日期 | date | Date | Ngày | 日期 |
| 数量 | quantity | Quantity | Số lượng | 數量 |
| 金额 | amount | Amount | Số tiền | 金額 |
| 名称 | name | Name | Tên | 名稱 |
| 编码 | code | Code | Mã | 編碼 |

### Module-Specific Namespaces

| Module | Namespace | Example Keys |
|--------|-----------|--------------|
| 仓库 | Warehouse | inbound, outbound, transfer, stocktaking |
| 采购 | Purchase | request, order, supplier, quotation |
| 生产 | Production | workOrder, scheduling, materialIssue |
| 订单 | Orders | salesOrder, customer, delivery |
| 销售 | Sales | quotation, contract, invoice |
| 质量 | Quality | inspection, defect, corrective |
| 设备 | Equipment | maintenance, calibration, repair |
| 人事 | Hr | employee, attendance, payroll |
| 财务 | Finance | voucher, account, reconciliation |

## Replacement Patterns

### Status Mapping

```typescript
// Before
const statusMap = {
  0: { label: '草稿', variant: 'secondary' },
  1: { label: '待审批', variant: 'outline' },
  2: { label: '已审批', variant: 'default' },
};

// After
const statusMap = {
  0: { label: tc('draft'), variant: 'secondary' },
  1: { label: tc('pending'), variant: 'outline' },
  2: { label: tc('approved'), variant: 'default' },
};
```

### Priority Mapping

```typescript
// Before
const priorityMap = {
  0: { label: '低', color: '...' },
  1: { label: '中', color: '...' },
  2: { label: '高', color: '...' },
  3: { label: '紧急', color: '...' },
};

// After
const priorityMap = {
  0: { label: tc('low'), color: '...' },
  1: { label: tc('medium'), color: '...' },
  2: { label: tc('high'), color: '...' },
  3: { label: tc('critical'), color: '...' },
};
```

### Buttons

```typescript
// Before
<Button>保存</Button>
<Button>取消</Button>
<Button>删除</Button>

// After
<Button>{tc('save')}</Button>
<Button>{tc('cancel')}</Button>
<Button>{tc('delete')}</Button>
```

### Toast Messages

```typescript
// Before
toast.success('操作成功');
toast.error('操作失败');

// After
toast.success(tc('success'));
toast.error(tc('error'));
```

### Table Headers

```typescript
// Before
<TableHead>物料编码</TableHead>
<TableHead>物料名称</TableHead>
<TableHead>数量</TableHead>

// After
<TableHead>{t('materialCode')}</TableHead>
<TableHead>{t('materialName')}</TableHead>
<TableHead>{t('quantity')}</TableHead>
```

## Files to Process

### High Priority (Process First)
- `src/components/ui/**/*.tsx` - Common components
- `src/components/layout/**/*.tsx` - Layout components

### Medium Priority
- `src/app/[locale]/*/page.tsx` - List pages
- `src/app/[locale]/*/*/page.tsx` - Sub list pages

### Low Priority (Process Last)
- `src/app/[locale]/*/new/page.tsx` - Create pages
- `src/app/[locale]/*/edit/page.tsx` - Edit pages
- `src/app/[locale]/*/[id]/page.tsx` - Detail pages

## Files to Skip

- Print/Export content (keep Chinese for documents)
- `src/app/api/**` - API routes
- `*.d.ts` - Type definitions
- `*.config.ts` - Configuration files

## Validation Checklist

After processing, verify:

- [ ] All four language files have same keys
- [ ] No empty translations
- [ ] Translation hooks added correctly
- [ ] Print/export Chinese preserved
- [ ] No hardcoded strings remaining (except print/export)
- [ ] TypeScript compiles without errors

## Example Output

```
============================================================
i18n Batch Migration Report
============================================================

Files scanned: 50
Files with Chinese: 30
Files processed: 30

High priority: 5 files ✓
Medium priority: 20 files ✓
Low priority: 5 files ✓

Translation keys added:
  Common: +15 keys (total: 75)
  Warehouse: +20 keys (total: 68)
  Purchase: +18 keys (total: 35)
  Production: +25 keys (total: 49)
  Orders: +30 keys (total: 192)

Validation: ✓ All files in sync
============================================================
```

## Usage

Simply invoke this skill and it will automatically:
1. Scan all pages
2. Process each file
3. Update translation files
4. Generate report

No manual intervention needed!
