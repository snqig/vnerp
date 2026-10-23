# StandardTable 通用表格组件 · 使用文档

> 位置：`src/components/common/standard-table.tsx`
> 导出：`src/components/common/index.ts`
> 适用范围：**所有业务列表页**。后续新增页面直接复用本组件，禁止手写独立 `<Table>`。

---

## 1. 组件能力一览

| 能力 | 说明 |
| --- | --- |
| 统一基础样式 | 表头、行、hover、单元格内边距、边框全部统一；支持业务页局部覆盖 |
| 行勾选 | `rowSelectable` 开关；表头总选 + 单行独立勾选 + 半选态联动 |
| 内置分页 | 每页条数下拉（默认 20 / 25 / 30）、上一页 / 下一页、总条数 + 总页数、页码输入跳转 + 边界校验 |
| 表头排序 | 列级 `sortable` 开关；点击循环 升序 → 降序 → 取消排序；排序图标 + 当前字段高亮；切换排序自动回到第 1 页 |
| 内置状态 | loading 加载态、空数据态、接口异常态（可带重试） |
| 国际化 | 组件内置文案全部走 `StandardTable` i18n 命名空间（zh-CN / en / vi / zh-TW 四语），**无中文硬编码** |
| 业务兼容 | 每行末尾的编辑 / 更新 / 修正等操作列通过 `columns[].render` 原样迁移，**业务逻辑不变** |

---

## 2. 基础用法

```tsx
'use client';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import { useTranslations } from 'next-intl';

export default function CostPage() {
  const t = useTranslations('Finance');
  const [list, setList] = useState<CostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const columns: StandardTableColumn<CostItem>[] = [
    { key: 'cost_no', title: t('costNo'), sortable: true, render: (r) => <span className="font-mono">{r.cost_no}</span> },
    { key: 'amount', title: t('amount'), align: 'right', sortable: true, render: (r) => `¥${Number(r.amount || 0).toFixed(2)}` },
    // 操作列原样保留
    { key: 'actions', title: t('actions'), align: 'right', render: (r) => <Button size="sm" onClick={() => handleEdit(r)}>{t('edit')}</Button> },
  ];

  return (
    <StandardTable
      columns={columns}
      dataSource={list}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
    />
  );
}
```

---

## 3. Props 清单

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `columns` | `StandardTableColumn<T>[]` | — | 列定义，见下表 |
| `dataSource` | `T[]` | `[]` | 当前页数据 |
| `total` | `number` | `0` | 总条数（用于算总页数与「共 XX 条」） |
| `page` | `number` | `1` | 当前页码（1 起） |
| `pageSize` | `number` | `20` | 每页条数 |
| `pageSizeOptions` | `number[]` | `[20, 25, 30]` | 每页条数下拉选项 |
| `rowSelectable` | `boolean` | `false` | 是否开启勾选列 |
| `selectedRows` | `T[]` | — | 受控选中行集合；不传则组件内部自管 |
| `onRowSelectedChange` | `(rows: T[]) => void` | — | 勾选变化回调，返回当前所有已勾行数据 |
| `preserveCrossPageSelection` | `boolean` | `false` | 预留扩展：翻页是否保留选中 |
| `onPageChange` | `(page: number) => void` | — | 翻页 / 页码跳转 |
| `onPageSizeChange` | `(size: number) => void` | — | 切换每页条数 |
| `onSortChange` | `(sort: SortState) => void` | — | 排序变化，`null` 表示取消排序 |
| `sortState` | `SortState` | — | 受控排序状态 |
| `loading` | `boolean` | `false` | 加载态 |
| `error` | `string \| null` | `null` | 异常态文案（有值时展示错误态） |
| `onRetry` | `() => void` | — | 异常态重试按钮回调 |
| `emptyText` | `ReactNode` | — | 自定义空数据文案 |
| `rowKey` | `string \| (row, i) => string` | `'id'` | 行唯一键 |
| `customStyle` | `StandardTableCustomStyle` | `{}` | 局部样式覆盖 |
| `showPagination` | `boolean` | `true` | 是否展示分页栏 |

### 3.1 Column 定义

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `key` | `string` | 列唯一标识；`sortable` 时同时作为排序字段名 |
| `title` | `ReactNode` | 表头文字，**由业务侧传入已国际化的文案** |
| `dataIndex` | `string` | 取值字段；未传 `render` 时按此字段取值 |
| `render` | `(row, index) => ReactNode` | 自定义单元格；传了则忽略 `dataIndex` |
| `sortable` | `boolean` | 是否允许点击表头排序 |
| `width` | `number \| string` | 列宽 |
| `align` | `'left' \| 'center' \| 'right'` | 对齐 |
| `className` / `headerClassName` | `string` | 单元格 / 表头附加样式 |

---

## 4. 行勾选（`rowSelectable`）

```tsx
const [selectedRows, setSelectedRows] = useState<CostItem[]>([]);

<StandardTable
  rowSelectable
  selectedRows={selectedRows}
  onRowSelectedChange={setSelectedRows}
  rowKey="id"
  ...
/>
```

行为约定：

1. `rowSelectable={false}`（默认）→ **不渲染勾选列**，表格与改造前一致。
2. `rowSelectable` → 最左侧出现勾选列：
   - 表头总选复选框：**仅选中当前页全部数据**；再次点击取消 → 清空当前页选中。
   - 每行独立复选框：可单独勾选 / 取消。
   - 表头复选框自动联动：当前页全选 → 选中态；部分选中 → **半选（indeterminate）** 态；全不选 → 取消态。
3. 翻页默认清空勾选（不跨页保留）。如需跨页保留，传 `preserveCrossPageSelection`（预留扩展项）。
4. `onRowSelectedChange(rows)` 始终返回**行数据对象集合**，可直接取 `rows.map(r => r.id)` 做批量操作。

> ⚠️ **原有每行末尾的编辑 / 更新 / 修正按钮一律放在 `columns` 的最后一列 `render` 里，逻辑与事件处理原样迁移，不受组件替换影响。**

---

## 5. 排序

```tsx
const [sort, setSort] = useState<SortState>(null);
const handleSortChange = (s: SortState) => {
  setSort(s);
  setPage(1);               // 组件也会自动回调 onPageChange(1)
};
// 服务端排序：把 sort 拼进请求参数
// 客户端排序：对 dataSource 自行 sort 后传入
```

点击表头循环：**升序 → 降序 → 取消排序**。当前排序字段表头文字加粗高亮，并显示 ↑ / ↓ 图标，未排序列显示灰色 ⇅。

---

## 6. 分页

- 每页条数下拉默认 `20 / 25 / 30`，可用 `pageSizeOptions` 覆盖。
- 分页栏文案：`共 {total} 条，共 {pages} 页`（四语已内置）。
- 页码输入框：输入后回车或点「跳转」；非法页码（空、非整数、`< 1`、`> 总页数`）展示国际化校验提示，不跳转。

---

## 7. 局部样式覆盖

```tsx
<StandardTable
  customStyle={{
    containerClassName: 'rounded-md border',
    headerClassName: 'bg-muted/60',
    rowClassName: (row) => (row.status === 9 ? 'opacity-60 line-through' : ''),
    cellClassName: 'py-3',
    paginationClassName: 'justify-end',
    maxHeight: 520,
  }}
/>
```

所有 `customStyle` 字段都是**追加**到组件内置样式之后，不会覆盖掉内置的统一风格（`cn()` 合并）。

---

## 8. 国际化

- 组件内置文案位于 `messages/*.json` 的 `StandardTable` 命名空间，四语齐全：

  | key | 中文 |
  | --- | --- |
  | `selectAll` | 全选（当前页） |
  | `selectRow` | 选择第 {id} 行 |
  | `paginationSummary` | 共 {total} 条，共 {pages} 页 |
  | `pageSize` / `pageSizeUnit` | 每页条数 / 条·页 |
  | `prevPage` / `nextPage` | 上一页 / 下一页 |
  | `pageNumber` / `jump` | 页码 / 跳转 |
  | `invalidPage` | 请输入 1 ~ {max} 之间的页码 |
  | `loading` / `empty` / `error` / `retry` | 加载中… / 暂无数据 / 数据加载失败 / 重试 |
  | `sortHint` | 点击切换排序（升序 / 降序 / 取消） |
  | `selectedCount` | 已选 {count} 条 |

- **表头文字由业务 `columns` 传入**，请继续使用页面自身的命名空间（`t('costNo')` 等），不要写死中文。
- 新增语言只需在 `messages/<locale>.json` 补 `StandardTable` 命名空间；缺失 key 会自动回退到 zh-CN。

---

## 9. 迁移步骤（存量页面）

1. 保留页面原有的数据请求、筛选、编辑 / 更新 / 修正等 handler，**不改业务逻辑**。
2. 把 `<Table>...<TableHeader>...<TableBody>` 整段替换为 `<StandardTable>`。
3. 把每个 `<TableHead>` 转成 `columns` 项，`<TableCell>` 内容转成 `render`。
4. 操作列（编辑 / 更新 / 修正）作为最后一列 `render` 原样搬过去。
5. 勾选：删除手写 `<input type="checkbox">` 与 `useRowSelection`，改用 `rowSelectable` + `selectedRows` / `onRowSelectedChange`；批量操作处用 `selectedRows.map(r => r.id)` 取 id。
6. 删除手写分页按钮组，改用 `onPageChange` / `onPageSizeChange`。
7. 自测：勾选联动、分页、页码跳转边界、排序、loading / 空态、**原有编辑功能**、多语言切换。

---

## 10. 验收清单（每页）

- [ ] 表头总选可一键选中当前页全部；取消则清空当前页
- [ ] 单行可独立勾选 / 取消；表头自动同步 半选 / 全选 / 未选
- [ ] `rowSelectable={false}` 时勾选列隐藏
- [ ] 每页条数 20 / 25 / 30 切换生效
- [ ] 上一页 / 下一页、页码跳转生效；越界输入有校验提示
- [ ] 表头点击 升序 → 降序 → 取消，图标与高亮正确，自动回第 1 页
- [ ] loading / 空数据 / 异常态展示统一
- [ ] 自定义样式生效，整体风格与其他页面一致
- [ ] **每行末尾编辑 / 更新 / 修正按钮功能与改造前一致**
- [ ] 切换四语，组件内置文案与表头文案均正确翻译，无中文硬编码残留
