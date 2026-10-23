import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import {
  StandardTable,
  type StandardTableColumn,
  type SortState,
} from './standard-table';

interface Row {
  id: number;
  name: string;
  amount: number;
}

const rows: Row[] = [
  { id: 1, name: 'A', amount: 10 },
  { id: 2, name: 'B', amount: 20 },
  { id: 3, name: 'C', amount: 30 },
];

const columns: StandardTableColumn<Row>[] = [
  { key: 'name', title: '名称', sortable: true },
  { key: 'amount', title: '金额', sortable: true, align: 'right' },
  {
    key: 'actions',
    title: '操作',
    align: 'right',
    render: (r) => <button data-testid={`edit-${r.id}`}>编辑</button>,
  },
];

/** 受控包装：勾选 / 分页 / 排序全部由外部 state 驱动，贴近真实页面用法。
 *  外部传入的回调与内部 state 同时更新，避免受控状态下 sortState 不联动。 */
function Harness(props: Partial<React.ComponentProps<typeof StandardTable<Row>>> = {}) {
  const [selected, setSelected] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);
  return (
    <StandardTable<Row>
      columns={columns}
      dataSource={props.dataSource ?? rows}
      total={props.total ?? 100}
      page={page}
      pageSize={20}
      onPageChange={(p) => {
        setPage(p);
        props.onPageChange?.(p);
      }}
      onSortChange={(s) => {
        setSort(s);
        props.onSortChange?.(s);
      }}
      sortState={sort}
      rowSelectable={props.rowSelectable}
      selectedRows={selected}
      onRowSelectedChange={(r) => {
        setSelected(r);
        props.onRowSelectedChange?.(r);
      }}
      loading={props.loading}
      error={props.error}
      onRetry={props.onRetry}
      customStyle={props.customStyle}
    />
  );
}

const headerCheckbox = () => {
  const boxes = screen.getAllByRole('checkbox');
  return boxes[0];
};

describe('StandardTable 通用表格组件', () => {
  it('rowSelectable=false（默认）时不渲染勾选列', () => {
    render(<Harness />);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('rowSelectable 时表头总选可一键选中当前页全部数据', () => {
    const onRowSelectedChange = vi.fn();
    render(<Harness rowSelectable onRowSelectedChange={onRowSelectedChange} />);
    fireEvent.click(headerCheckbox());
    expect(onRowSelectedChange).toHaveBeenCalledTimes(1);
    const arg = onRowSelectedChange.mock.calls[0][0] as Row[];
    expect(arg).toHaveLength(3);
    expect(arg.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('支持单行独立勾选 / 取消', () => {
    const onRowSelectedChange = vi.fn();
    render(<Harness rowSelectable onRowSelectedChange={onRowSelectedChange} />);
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[1]); // 第一行
    const arg = onRowSelectedChange.mock.calls[0][0] as Row[];
    expect(arg).toHaveLength(1);
    expect(arg[0].id).toBe(1);
  });

  it('部分选中时表头复选框自动进入半选（indeterminate）态', () => {
    function Partial() {
      const [selected, setSelected] = useState<Row[]>([rows[0]]);
      return (
        <StandardTable<Row>
          columns={columns}
          dataSource={rows}
          total={100}
          page={1}
          pageSize={20}
          rowSelectable
          selectedRows={selected}
          onRowSelectedChange={setSelected}
        />
      );
    }
    render(<Partial />);
    expect(headerCheckbox()).toHaveAttribute('data-state', 'indeterminate');
  });

  it('整页全选时表头为 checked，清空后为 unchecked', () => {
    function All() {
      const [selected, setSelected] = useState<Row[]>(rows);
      return (
        <StandardTable<Row>
          columns={columns}
          dataSource={rows}
          total={100}
          page={1}
          pageSize={20}
          rowSelectable
          selectedRows={selected}
          onRowSelectedChange={setSelected}
        />
      );
    }
    render(<All />);
    expect(headerCheckbox()).toHaveAttribute('data-state', 'checked');
    fireEvent.click(headerCheckbox()); // 取消 → 清空当前页
    expect(headerCheckbox()).toHaveAttribute('data-state', 'unchecked');
  });

  it('分页栏展示总条数与总页数（国际化文案）', () => {
    render(<Harness />);
    expect(screen.getByText('共 100 条，共 5 页')).toBeInTheDocument();
  });

  it('每页条数下拉存在并展示当前值（aria-label 走 i18n）', () => {
    render(<Harness />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-label', '每页条数');
    expect(trigger).toHaveTextContent('20');
  });

  it('页码输入框支持合法跳转', () => {
    const onPageChange = vi.fn();
    render(<Harness onPageChange={onPageChange} />);
    const input = screen.getByLabelText('页码');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(screen.getByText('跳转'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('越界页码做校验提示且不跳转', () => {
    const onPageChange = vi.fn();
    render(<Harness onPageChange={onPageChange} />);
    const input = screen.getByLabelText('页码');
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.click(screen.getByText('跳转'));
    expect(onPageChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('请输入 1 ~ 5 之间的页码');
  });

  it('上一页 / 下一页翻页', () => {
    const onPageChange = vi.fn();
    render(<Harness onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText('下一页'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('表头点击循环：升序 → 降序 → 取消排序，并重置到第 1 页', () => {
    const onSortChange = vi.fn();
    const onPageChange = vi.fn();
    render(<Harness onSortChange={onSortChange} onPageChange={onPageChange} />);
    const headerBtn = screen.getByText('名称');
    fireEvent.click(headerBtn);
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'name', direction: 'asc' });
    fireEvent.click(headerBtn);
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'name', direction: 'desc' });
    fireEvent.click(headerBtn);
    expect(onSortChange).toHaveBeenLastCalledWith(null);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('当前排序列展示排序图标（高亮）', () => {
    function Sorted() {
      const [sort] = useState<SortState>({ field: 'name', direction: 'asc' });
      return (
        <StandardTable<Row>
          columns={columns}
          dataSource={rows}
          total={100}
          page={1}
          pageSize={20}
          sortState={sort}
        />
      );
    }
    const { container } = render(<Sorted />);
    expect(container.querySelector('[aria-sort="ascending"]')).toBeInTheDocument();
  });

  // 注：测试基建对 i18n 文案做「叶子 key 扁平化」，StandardTable.loading 会被
  // 其他命名空间的同名 key 覆盖，故此处以结构（spinner + 单格占位）断言加载态。
  it('loading 加载态', () => {
    const { container } = render(<Harness loading />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="table-body"] td')).toHaveAttribute('colspan', '3');
    expect(container.querySelectorAll('[data-slot="table-body"] tr')).toHaveLength(1);
  });

  it('空数据展示统一空态', () => {
    render(<Harness dataSource={[]} total={0} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('异常态展示错误文案与重试按钮', () => {
    const onRetry = vi.fn();
    render(<Harness error="接口异常" onRetry={onRetry} />);
    expect(screen.getByText('接口异常')).toBeInTheDocument();
    fireEvent.click(screen.getByText('重试'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('操作列渲染保留，编辑按钮可点击（业务逻辑不受组件影响）', () => {
    render(<Harness />);
    expect(screen.getByTestId('edit-1')).toBeInTheDocument();
    const onClick = vi.fn();
    screen.getByTestId('edit-1').addEventListener('click', onClick);
    fireEvent.click(screen.getByTestId('edit-1'));
    expect(onClick).toHaveBeenCalled();
  });

  it('自定义样式生效', () => {
    const { container } = render(
      <Harness customStyle={{ containerClassName: 'my-custom-table' }} />
    );
    expect(container.querySelector('.my-custom-table')).toBeInTheDocument();
  });
});
