# 油墨开罐 & 调色油墨入库 — 统计卡重新设计实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 ink-opening 和 ink-mixed 两个页面的通用统计卡替换为具有业务逻辑、可点击联动表格过滤的专业统计卡。

**架构：** 每个页面通过 StatsCards 组件展示4张统计卡，点击卡片后设置 activeKey 状态并触发列表过滤；ink-opening API 新增 `valid_using_count` 聚合字段和 `is_overdue` 查询参数；新增翻译 key 到所有4个语言文件。

**技术栈：** Next.js App Router, React Server/Client Components, TypeScript, MySQL, next-intl

---

## 文件变更清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/app/api/dcprint/ink-opening/route.ts` | 修改 | 新增 `valid_using_count` 聚合字段；GET 列表支持 `is_overdue` 查询参数 |
| `messages/zh-CN.json` | 修改 | 新增 Dcprint namespace 翻译 key |
| `messages/en.json` | 修改 | 新增 Dcprint namespace 翻译 key |
| `messages/zh-TW.json` | 修改 | 新增 Dcprint namespace 翻译 key |
| `messages/vi.json` | 修改 | 新增 Dcprint namespace 翻译 key |
| `src/app/[locale]/dcprint/ink-opening/page.tsx` | 修改 | 添加可点击统计卡 + 移除过期预警独立卡片 |
| `src/app/[locale]/dcprint/ink-mixed/page.tsx` | 修改 | 添加可点击统计卡 + 修复 inStock 标签错误 |

---

## 已知问题（实现时需一并修复）

- ink-mixed 页面使用 `ts('k_lv5sqq')` 作为 inStock 卡标签，但该 key 值为 "已使用"，实际应为 "已入库"。需新增 `dcInkMixedInStock` key 并使用它。
- ink-opening 页面 `overdue` 卡使用 `ts('k_zh5my3')`（值为"新增开罐"），需改为新 key `dcInkOpeningOverdueLabel`。

---

## 新增翻译 Key（所有语言文件统一新增）

### zh-CN.json（Dcprint namespace，插入在 ink-opening 相关 key 附近）

```json
"dcInkOpeningTotalLabel": "总开罐记录",
"dcInkOpeningValidLabel": "在效使用中",
"dcInkOpeningExpiredLabel": "已过期",
"dcInkOpeningOverdueLabel": "超期预警",
"dcInkOpeningTotalDesc": "所有开罐记录的总数",
"dcInkOpeningValidDesc": "在有效期内的开罐记录",
"dcInkOpeningExpiredDesc": "已超过有效期的开罐记录",
"dcInkOpeningOverdueDesc": "超期仍在使用的开罐记录",

"dcInkMixedTotalLabel": "总入库记录",
"dcInkMixedInStockLabel": "已入库",
"dcInkMixedInUseLabel": "已领用",
"dcInkMixedExpiredLabel": "已过期",
"dcInkMixedTotalDesc": "所有调色油墨入库记录的总数",
"dcInkMixedInStockDesc": "已入库待领用的调色油墨",
"dcInkMixedInUseDesc": "已领用消耗的调色油墨",
"dcInkMixedExpiredDesc": "已超过有效期的调色油墨",
```

### en.json（Dcprint namespace）

```json
"dcInkOpeningTotalLabel": "Total Records",
"dcInkOpeningValidLabel": "In Valid Use",
"dcInkOpeningExpiredLabel": "Expired",
"dcInkOpeningOverdueLabel": "Overdue Warning",
"dcInkOpeningTotalDesc": "Total number of ink opening records",
"dcInkOpeningValidDesc": "Ink opened and within validity period",
"dcInkOpeningExpiredDesc": "Ink past its expiry date",
"dcInkOpeningOverdueDesc": "Ink still in use after expiry",

"dcInkMixedTotalLabel": "Total Records",
"dcInkMixedInStockLabel": "In Stock",
"dcInkMixedInUseLabel": "In Use",
"dcInkMixedExpiredLabel": "Expired",
"dcInkMixedTotalDesc": "Total number of mixed ink inbound records",
"dcInkMixedInStockDesc": "Mixed ink stored and waiting to be issued",
"dcInkMixedInUseDesc": "Mixed ink already consumed",
"dcInkMixedExpiredDesc": "Mixed ink past its expiry date",
```

### zh-TW.json（Dcprint namespace）

```json
"dcInkOpeningTotalLabel": "總開罐記錄",
"dcInkOpeningValidLabel": "在效使用中",
"dcInkOpeningExpiredLabel": "已過期",
"dcInkOpeningOverdueLabel": "超期預警",
"dcInkOpeningTotalDesc": "所有開罐記錄的總數",
"dcInkOpeningValidDesc": "在有效期內的開罐記錄",
"dcInkOpeningExpiredDesc": "已超過有效期的開罐記錄",
"dcInkOpeningOverdueDesc": "超期仍在使用中的開罐記錄",

"dcInkMixedTotalLabel": "總入庫記錄",
"dcInkMixedInStockLabel": "已入庫",
"dcInkMixedInUseLabel": "已領用",
"dcInkMixedExpiredLabel": "已過期",
"dcInkMixedTotalDesc": "所有調色油墨入庫記錄的總數",
"dcInkMixedInStockDesc": "已入庫待領用的調色油墨",
"dcInkMixedInUseDesc": "已領用消耗的調色油墨",
"dcInkMixedExpiredDesc": "已超過有效期的調色油墨",
```

### vi.json（Dcprint namespace）

```json
"dcInkOpeningTotalLabel": "Tổng bản ghi mở lọ",
"dcInkOpeningValidLabel": "Đang sử dụng hợp lệ",
"dcInkOpeningExpiredLabel": "Đã hết hạn",
"dcInkOpeningOverdueLabel": "Cảnh báo quá hạn",
"dcInkOpeningTotalDesc": "Tổng số bản ghi mở lọ mực",
"dcInkOpeningValidDesc": "Bản ghi mở lọ trong thời hạn sử dụng",
"dcInkOpeningExpiredDesc": "Bản ghi mở lọ đã hết hạn",
"dcInkOpeningOverdueDesc": "Bản ghi mở lọ vẫn đang sử dụng sau hạn",

"dcInkMixedTotalLabel": "Tổng bản ghi nhập kho",
"dcInkMixedInStockLabel": "Đã nhập kho",
"dcInkMixedInUseLabel": "Đã xuất dùng",
"dcInkMixedExpiredLabel": "Đã hết hạn",
"dcInkMixedTotalDesc": "Tổng số bản ghi nhập kho mực pha màu",
"dcInkMixedInStockDesc": "Mực pha màu đã nhập kho chờ xuất dùng",
"dcInkMixedInUseLabel": "Mực pha màu đã được xuất dùng",
"dcInkMixedExpiredDesc": "Mực pha màu đã hết hạn sử dụng",
```

---

## 任务分解

### 任务 1：更新 ink-opening API — 新增 valid_using_count 和 is_overdue 查询支持

**文件：**
- 修改：`src/app/api/dcprint/ink-opening/route.ts`

- [ ] **步骤 1：修改 summary SQL，新增 valid_using_count**

  在 GET 路由的 summary SQL 中，将 `using_count`（所有 status=1）拆分为 `valid_using_count`（status=1 AND expire_time >= NOW()）和保留 `overdue_using_count`（status=1 AND expire_time < NOW()）。

  将当前这段代码（约第56-65行）：
  ```sql
  SELECT
    COUNT(*) as total_count,
    COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) as using_count,
    COALESCE(SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END), 0) as expired_count,
    COALESCE(SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END), 0) as scrapped_count,
    COALESCE(SUM(CASE WHEN status = 1 AND expire_time < NOW() THEN 1 ELSE 0 END), 0) as overdue_using_count
  FROM ink_opening_record WHERE deleted = 0
  ```
  改为：
  ```sql
  SELECT
    COUNT(*) as total_count,
    COALESCE(SUM(CASE WHEN status = 1 AND expire_time >= NOW() THEN 1 ELSE 0 END), 0) as valid_using_count,
    COALESCE(SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END), 0) as expired_count,
    COALESCE(SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END), 0) as scrapped_count,
    COALESCE(SUM(CASE WHEN status = 1 AND expire_time < NOW() THEN 1 ELSE 0 END), 0) as overdue_using_count
  FROM ink_opening_record WHERE deleted = 0
  ```

  注意：原来返回的是 `using_count`，现在改为 `valid_using_count`。返回对象也需要同步更新。

- [ ] **步骤 2：新增 is_overdue 查询参数支持**

  在获取列表数据的 SQL 构建部分（在 `baseSql` 附近），新增对 `is_overdue` 参数的处理：
  ```typescript
  const isOverdue = req.query.get('is_overdue') === '1';
  ```
  然后在 countSql 和 dataSql 的 WHERE 子句中添加条件：
  ```typescript
  if (isOverdue) {
    whereClauses.push('status = 1 AND expire_time < NOW()');
  }
  ```
  确保这个条件与已有的 `statusFilter` 逻辑兼容（当 statusFilter='1' 且 is_overdue=1 时，应只显示超期记录）。

- [ ] **步骤 3：更新 summary 返回值中的字段名**

  将 `summary.using_count` 改为 `summary.valid_using_count`，确保 JSON response 中包含新字段名。

- [ ] **步骤 4：验证 TypeScript 编译**

  运行：`npx tsc --noEmit --pretty`
  预期：无 TypeScript 错误。

- [ ] **步骤 5：Commit**

  ```bash
  git add src/app/api/dcprint/ink-opening/route.ts
  git commit -m "feat(api): add valid_using_count and is_overdue filter to ink-opening API"
  ```

---

### 任务 2：新增翻译 Key

**文件：**
- 修改：`messages/zh-CN.json`
- 修改：`messages/en.json`
- 修改：`messages/zh-TW.json`
- 修改：`messages/vi.json`

- [ ] **步骤 1：在 zh-CN.json 的 Dcprint namespace 中新增 key**

  找到 `k_zh5my3`（"新增开罐"）所在的行附近（约10846行），在其后插入以下 key：
  ```json
  "dcInkOpeningTotalLabel": "总开罐记录",
  "dcInkOpeningValidLabel": "在效使用中",
  "dcInkOpeningExpiredLabel": "已过期",
  "dcInkOpeningOverdueLabel": "超期预警",
  "dcInkOpeningTotalDesc": "所有开罐记录的总数",
  "dcInkOpeningValidDesc": "在有效期内的开罐记录",
  "dcInkOpeningExpiredDesc": "已超过有效期的开罐记录",
  "dcInkOpeningOverdueDesc": "超期仍在使用的开罐记录",
  ```

  找到 `k_lv5sqq`（"已使用"）附近（约10923行），在其后插入：
  ```json
  "dcInkMixedTotalLabel": "总入库记录",
  "dcInkMixedInStockLabel": "已入库",
  "dcInkMixedInUseLabel": "已领用",
  "dcInkMixedExpiredLabel": "已过期",
  "dcInkMixedTotalDesc": "所有调色油墨入库记录的总数",
  "dcInkMixedInStockDesc": "已入库待领用的调色油墨",
  "dcInkMixedInUseDesc": "已领用消耗的调色油墨",
  "dcInkMixedExpiredDesc": "已超过有效期的调色油墨",
  ```

- [ ] **步骤 2-4：同步新增 en.json / zh-TW.json / vi.json 中对应的 key**

  按照计划文档中的翻译内容，在各自语言的 Dcprint namespace 中相同位置插入对应翻译。

- [ ] **步骤 5：验证 JSON 格式正确**

  运行：`node -e "JSON.parse(require('fs').readFileSync('messages/zh-CN.json','utf8')); console.log('zh-CN OK')"`
  依次验证其他3个语言文件。

- [ ] **步骤 6：Commit**

  ```bash
  git add messages/zh-CN.json messages/en.json messages/zh-TW.json messages/vi.json
  git commit -m "feat(i18n): add stats card translation keys for ink-opening and ink-mixed"
  ```

---

### 任务 3：重构 ink-opening 页面统计卡

**文件：**
- 修改：`src/app/[locale]/dcprint/ink-opening/page.tsx`

- [ ] **步骤 1：添加新状态变量**

  在现有 `useState` 声明区域，新增：
  ```typescript
  const [activeStatKey, setActiveStatKey] = useState<string | null>(null);
  const [isOverdueFilter, setIsOverdueFilter] = useState(false);
  ```

- [ ] **步骤 2：更新 fetchRecords，支持 is_overdue 参数**

  修改 `fetchRecords` 函数中的 params 构建，增加 is_overdue 参数：
  ```typescript
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (inkTypeFilter !== 'all') params.set('ink_type', inkTypeFilter);
      if (isOverdueFilter) params.set('is_overdue', '1');
      params.set('pageSize', '50');
      // ... rest unchanged
  ```

- [ ] **步骤 3：添加 handleStatClick 函数**

  在 `getTimeRemaining` 函数之后、`handleViewDetail` 之前添加：
  ```typescript
  const handleStatClick = (key: string) => {
    if (key === 'total') {
      setActiveStatKey(null);
      setStatusFilter('all');
      setIsOverdueFilter(false);
    } else if (key === 'valid') {
      setActiveStatKey('valid');
      setStatusFilter('1');
      setIsOverdueFilter(false);
    } else if (key === 'expired') {
      setActiveStatKey('expired');
      setStatusFilter('2');
      setIsOverdueFilter(false);
    } else if (key === 'overdue') {
      setActiveStatKey('overdue');
      setStatusFilter('1');
      setIsOverdueFilter(true);
    }
  };
  ```

- [ ] **步骤 4：更新 StatsCards 组件调用**

  将当前的 StatsCards 调用（约第269-283行）替换为：
  ```tsx
  <StatsCards
    clickable
    activeKey={activeStatKey}
    onCardClick={handleStatClick}
    configs={[
      {
        key: 'total',
        label: ts('dcInkOpeningTotalLabel'),
        icon: Droplet,
        ...StatsTheme.blue,
        description: ts('dcInkOpeningTotalDesc'),
      },
      {
        key: 'valid',
        label: ts('dcInkOpeningValidLabel'),
        icon: CheckCircle,
        ...StatsTheme.green,
        description: ts('dcInkOpeningValidDesc'),
      },
      {
        key: 'expired',
        label: ts('dcInkOpeningExpiredLabel'),
        icon: AlertTriangle,
        ...StatsTheme.orange,
        description: ts('dcInkOpeningExpiredDesc'),
      },
      {
        key: 'overdue',
        label: ts('dcInkOpeningOverdueLabel'),
        icon: Clock,
        ...StatsTheme.red,
        description: ts('dcInkOpeningOverdueDesc'),
      },
    ]}
    stats={[
      { key: 'total', count: summary.total_count },
      { key: 'valid', count: summary.valid_using_count ?? 0 },
      { key: 'expired', count: summary.expired_count },
      { key: 'overdue', count: summary.overdue_using_count },
    ]}
    cols={{ mobile: 2, tablet: 2, desktop: 4 }}
  />
  ```

- [ ] **步骤 5：移除过期预警独立警告卡片**

  找到并删除 `overdueList.length > 0 && (` 到对应的闭合 `)}` 整块（约第285-341行），即那个 `<Card className="border-red-200 bg-red-50...">` 的整个区块。

- [ ] **步骤 6：添加 useEffect 监听 isOverdueFilter 变化触发重新请求**

  更新现有的 useEffect（约第161-164行），将 `isOverdueFilter` 加入依赖数组：
  ```typescript
  useEffect(() => {
    fetchRecords();
    fetchMaterials();
  }, [fetchRecords, isOverdueFilter]);
  ```
  同时更新 fetchRecords 的 useCallback 依赖数组，加入 `isOverdueFilter`。

- [ ] **步骤 7：验证 TypeScript 编译**

  运行：`npx tsc --noEmit --pretty`
  预期：无 TypeScript 错误。

- [ ] **步骤 8：Commit**

  ```bash
  git add src/app/[locale]/dcprint/ink-opening/page.tsx
  git commit -m "feat(ui): redesign ink-opening stats cards with click-to-filter and remove duplicate warning card"
  ```

---

### 任务 4：重构 ink-mixed 页面统计卡

**文件：**
- 修改：`src/app/[locale]/dcprint/ink-mixed/page.tsx`

- [ ] **步骤 1：添加新状态变量**

  在现有 `useState` 声明区域，新增：
  ```typescript
  const [activeStatKey, setActiveStatKey] = useState<string | null>(null);
  ```

- [ ] **步骤 2：更新 fetchData，支持 status 查询参数**

  修改 `fetchData` 函数，增加 status 参数：
  ```typescript
  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        recordNo: searchNo,
        colorName: searchColor,
      });
      if (activeStatKey && activeStatKey !== 'total') {
        const statusMap: Record<string, string> = { inStock: '1', inUse: '2', expired: '3' };
        if (statusMap[activeStatKey]) params.set('status', statusMap[activeStatKey]);
      }
      const res = await authFetch('/api/dcprint/ink-mixed?' + params);
      // ... rest unchanged
  ```

- [ ] **步骤 3：添加 handleStatClick 函数**

  在现有函数中添加：
  ```typescript
  const handleStatClick = (key: string) => {
    if (key === 'total') {
      setActiveStatKey(null);
    } else {
      setActiveStatKey(key);
    }
  };
  ```

- [ ] **步骤 4：更新 StatsCards 组件调用**

  将当前的 StatsCards 调用（约第293-307行）替换为：
  ```tsx
  <StatsCards
    clickable
    activeKey={activeStatKey}
    onCardClick={handleStatClick}
    configs={[
      {
        key: 'total',
        label: ts('dcInkMixedTotalLabel'),
        icon: Beaker,
        ...StatsTheme.blue,
        description: ts('dcInkMixedTotalDesc'),
      },
      {
        key: 'inStock',
        label: ts('dcInkMixedInStockLabel'),
        icon: CheckCircle,
        ...StatsTheme.green,
        description: ts('dcInkMixedInStockDesc'),
      },
      {
        key: 'inUse',
        label: ts('dcInkMixedInUseLabel'),
        icon: Clock,
        ...StatsTheme.orange,
        description: ts('dcInkMixedInUseDesc'),
      },
      {
        key: 'expired',
        label: ts('dcInkMixedExpiredLabel'),
        icon: AlertTriangle,
        ...StatsTheme.red,
        description: ts('dcInkMixedExpiredDesc'),
      },
    ]}
    stats={[
      { key: 'total', count: stats.total },
      { key: 'inStock', count: stats.inStock },
      { key: 'inUse', count: stats.inUse },
      { key: 'expired', count: stats.expired },
    ]}
    cols={{ mobile: 2, tablet: 2, desktop: 4 }}
  />
  ```

- [ ] **步骤 5：更新 useEffect 依赖，加入 activeStatKey**

  将现有的 `useEffect(() => { fetchData(); fetchStats(); }, [page]);` 更新为：
  ```typescript
  useEffect(() => {
    fetchData();
    fetchStats();
  }, [page, activeStatKey]);
  ```

- [ ] **步骤 6：修复 inStock 标签 — 原来用的 k_lv5sqq 是"已使用"不是"已入库"**

  确认新的 `ts('dcInkMixedInStockLabel')` 已正确引用新翻译 key（见任务2），旧的使用 `k_lv5sqq` 的代码已完全替换。

- [ ] **步骤 7：验证 TypeScript 编译**

  运行：`npx tsc --noEmit --pretty`
  预期：无 TypeScript 错误。

- [ ] **步骤 8：Commit**

  ```bash
  git add src/app/[locale]/dcprint/ink-mixed/page.tsx
  git commit -m "feat(ui): redesign ink-mixed stats cards with click-to-filter and fix inStock label"
  ```

---

## 自检

### 规格覆盖度检查

| 规格需求 | 对应任务 |
|----------|----------|
| ink-opening 4卡标签正确，无"新增开罐"错误 | 任务2（翻译key）+ 任务3（步骤4） |
| ink-mixed 4卡可点击联动表格过滤 | 任务4（步骤2,3,4,5） |
| ink-opening 点击"超期预警"后表格只显示超期记录 | 任务1（is_overdue API）+ 任务3（步骤2,3,6） |
| 点击"总计"卡片清除过滤 | 任务3（步骤3）+ 任务4（步骤3） |
| 移除 ink-opening 独立过期预警警告卡片 | 任务3（步骤5） |
| TypeScript 编译无错误 | 每个任务末尾的验证步骤 |
| 不破坏现有功能 | 仅修改 stats 相关代码， CRUD 逻辑不变 |
| ink-mixed inStock 标签从"已使用"修复为"已入库" | 任务2（新key）+ 任务4（步骤4） |

### 占位符扫描
无"待定"、"TODO"、"补充细节"等占位符。

### 类型一致性检查
- API 返回字段名：`valid_using_count`（任务1）与页面使用 `summary.valid_using_count`（任务3）一致
- 状态 key 值：`'total' | 'valid' | 'expired' | 'overdue'`（任务3）与 `'total' | 'inStock' | 'inUse' | 'expired'`（任务4）各自独立，无冲突
- 翻译 key 名：所有新增 key 在4个语言文件中统一命名
