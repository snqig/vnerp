---
name: "i18n-migration"
description: "Automates internationalization (i18n) migration for Next.js projects. Scans for hardcoded Chinese strings, replaces with translation functions, and updates all language files (en, zh-CN, zh-TW, vi). Invoke when user asks to migrate i18n, fix hardcoded strings, or internationalize pages."
---

# i18n Migration Skill

This skill automates the internationalization migration process for Next.js projects using next-intl.

## What It Does

1. **Scans** source files for hardcoded Chinese strings
2. **Replaces** hardcoded strings with translation function calls (`t()`, `tc()`)
3. **Updates** all four language files (en.json, zh-CN.json, zh-TW.json, vi.json)
4. **Validates** translation file completeness
5. **Generates** reports on migration progress

## When to Invoke

- User asks to "migrate i18n" or "internationalize" pages
- User wants to fix "hardcoded Chinese strings"
- User mentions "翻译" or "国际化"
- User wants to batch process multiple pages for i18n

## Workflow

### Step 1: Scan for Files

Scan the project for files containing hardcoded Chinese strings:

```bash
# Files to scan
src/app/[locale]/**/*.tsx
src/components/**/*.tsx
```

### Step 2: Process Each File

For each file with hardcoded strings:

1. Add import: `import { useTranslations } from 'next-intl';`
2. Add translation hooks in component:
   ```typescript
   const t = useTranslations('ModuleName');
   const tc = useTranslations('Common');
   ```
3. Replace hardcoded strings with translation calls
4. Keep print/export Chinese content unchanged (use separate CN maps)

### Step 3: Update Translation Files

Add new translation keys to all four language files:

| File | Language |
|------|----------|
| messages/zh-CN.json | Chinese Simplified |
| messages/en.json | English |
| messages/zh-TW.json | Chinese Traditional |
| messages/vi.json | Vietnamese |

### Step 4: Validate

Run validation script to ensure all files are in sync:

```bash
node scripts/analyze-translation-completeness.js
```

## Common Translation Keys

### Common Namespace (tc)

| Key | zh-CN | en | vi | zh-TW |
|-----|-------|-----|-----|-------|
| save | 保存 | Save | Lưu | 儲存 |
| cancel | 取消 | Cancel | Hủy | 取消 |
| delete | 删除 | Delete | Xóa | 刪除 |
| edit | 编辑 | Edit | Sửa | 編輯 |
| add | 新增 | Add | Thêm | 新增 |
| search | 搜索 | Search | Tìm kiếm | 搜尋 |
| loading | 加载中... | Loading... | Đang tải... | 載入中... |
| noData | 暂无数据 | No data | Không có dữ liệu | 暫無資料 |
| draft | 草稿 | Draft | Nháp | 草稿 |
| pending | 待审核 | Pending | Chờ duyệt | 待審核 |
| approved | 已审核 | Approved | Đã duyệt | 已審核 |
| normal | 正常 | Normal | Bình thường | 正常 |
| frozen | 冻结 | Frozen | Đóng băng | 凍結 |
| expired | 过期 | Expired | Hết hạn | 過期 |
| warning | 预警 | Warning | Cảnh báo | 預警 |
| critical | 紧急 | Critical | Nghiêm trọng | 緊急 |
| low | 低 | Low | Thấp | 低 |
| medium | 中 | Medium | Trung bình | 中 |
| high | 高 | High | Cao | 高 |

## Replacement Patterns

```typescript
// Status mapping
const statusMap = {
  0: { label: tc('draft'), variant: 'secondary' },
  1: { label: tc('pending'), variant: 'outline' },
  2: { label: tc('approved'), variant: 'default' },
};

// Priority mapping
const priorityMap = {
  0: { label: tc('low'), color: '...' },
  1: { label: tc('medium'), color: '...' },
  2: { label: tc('high'), color: '...' },
  3: { label: tc('critical'), color: '...' },
};

// Buttons
<Button>{tc('save')}</Button>
<Button>{tc('cancel')}</Button>

// Toast messages
toast.success(tc('success'));
toast.error(tc('error'));
```

## Files to Skip

- Print/Export content (keep Chinese for output documents)
- API route files
- Configuration files
- Type definition files

## Priority Order

1. **High**: Common components (buttons, forms, dialogs)
2. **Medium**: List pages (tables, filters, actions)
3. **Low**: Detail/Edit pages (labels, hints)

## Example Usage

```
User: "帮我国际化采购申请页面"
Agent: [Invokes i18n-migration skill]
       - Scans purchase/request/page.tsx
       - Adds translation hooks
       - Replaces hardcoded strings
       - Updates all 4 language files
       - Validates completeness
       - Reports: "✅ 采购申请页面国际化完成"
```

## Validation Checklist

- [ ] All four language files have same keys
- [ ] No empty translations
- [ ] Translation hooks added correctly
- [ ] Print/export Chinese preserved
- [ ] No hardcoded strings remaining (except print/export)
