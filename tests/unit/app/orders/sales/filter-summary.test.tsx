/**
 * 销售订单列表页 — 统计卡片筛选逻辑单元测试
 *
 * 覆盖：
 * - 点击卡片触发 onStatusFilterChange / onPageChange / onFetchOrders
 * - 各状态码卡片参数正确（key 1..5）
 * - 激活态 aria-pressed / ring 样式正确
 * - 键盘 Enter / Space 与点击行为一致
 * - 数值格式化（千分位 + 两位小数）
 * - 无数据时 count=0 / amount=0
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SalesStatsCards } from '@/app/[locale]/orders/sales/sales-stats-cards';

// ===== 工具函数 =====

function renderCards(propsOverrides: Partial<Parameters<typeof SalesStatsCards>[0]> = {}) {
  const defaultProps = {
    stats: [
      { status: 1, count: 3, amount: 1200.5 },
      { status: 2, count: 5, amount: 3400.0 },
      { status: 3, count: 2, amount: 800.0 },
      { status: 4, count: 10, amount: 9500.75 },
      { status: 5, count: 1, amount: 200.0 },
    ],
    statusFilter: 'all',
    onStatusFilterChange: vi.fn(),
    onFetchOrders: vi.fn(),
    onPageChange: vi.fn(),
    t: (key: string) => key,
    ...propsOverrides,
  };
  const result = render(<SalesStatsCards {...defaultProps} />);
  return {
    ...result,
    props: defaultProps as typeof defaultProps & {
      onStatusFilterChange: ReturnType<typeof vi.fn>;
      onFetchOrders: ReturnType<typeof vi.fn>;
      onPageChange: ReturnType<typeof vi.fn>;
    },
  };
}

// 所有卡片的 role=button 断言辅助
function getStatCards() {
  return screen.getAllByRole('button');
}

// 按 key 获取卡片（通过 aria-pressed 或文本）
function getCardByText(text: string) {
  return screen.getByText(text).closest('[role="button"]');
}

// ============================================================
// 点击行为
// ============================================================
describe('SalesStatsCards — 点击筛选', () => {
  it('点击任意卡片时调用 onStatusFilterChange 并传入对应字符串状态码', () => {
    const { props } = renderCards();

    const [card1, card2, card3, card4, card5] = getStatCards();

    fireEvent.click(card1);
    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith('1');

    fireEvent.click(card2);
    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith('2');

    fireEvent.click(card3);
    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith('3');

    fireEvent.click(card4);
    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith('4');

    fireEvent.click(card5);
    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith('5');
  });

  it('点击卡片时调用 onPageChange(1) 重置到第一页', () => {
    const { props } = renderCards();

    const [card] = getStatCards();
    fireEvent.click(card);

    expect(props.onPageChange).toHaveBeenCalledWith(1);
  });

  it('点击卡片时调用 onFetchOrders(undefined, statusStr, 1)', () => {
    const { props } = renderCards();

    const [, card2] = getStatCards();
    fireEvent.click(card2);

    expect(props.onFetchOrders).toHaveBeenCalledWith(undefined, '2', 1);
  });

  it('点击第 4 个卡片（已完成）时 fetchOrders 参数正确', () => {
    const { props } = renderCards();

    const [, , , card4] = getStatCards();
    fireEvent.click(card4);

    expect(props.onFetchOrders).toHaveBeenLastCalledWith(undefined, '4', 1);
    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith('4');
  });

  it('点击第 5 个卡片（已取消）时 fetchOrders 参数正确', () => {
    const { props } = renderCards();

    const [, , , , card5] = getStatCards();
    fireEvent.click(card5);

    expect(props.onFetchOrders).toHaveBeenLastCalledWith(undefined, '5', 1);
    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith('5');
  });
});

// ============================================================
// 激活态视觉反馈
// ============================================================
describe('SalesStatsCards — 激活态', () => {
  it('未选中任何状态时所有卡片 aria-pressed 为 false', () => {
    renderCards({ statusFilter: 'all' });

    getStatCards().forEach((card) => {
      expect(card).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('选中 status=2 时，第二张卡片 aria-pressed 为 true，其余为 false', () => {
    renderCards({ statusFilter: '2' });

    const cards = getStatCards();
    expect(cards[0]).toHaveAttribute('aria-pressed', 'false');
    expect(cards[1]).toHaveAttribute('aria-pressed', 'true');
    expect(cards[2]).toHaveAttribute('aria-pressed', 'false');
    expect(cards[3]).toHaveAttribute('aria-pressed', 'false');
    expect(cards[4]).toHaveAttribute('aria-pressed', 'false');
  });

  it('选中 status=5 时，第五张卡片 aria-pressed 为 true', () => {
    renderCards({ statusFilter: '5' });

    const [, , , , card5] = getStatCards();
    expect(card5).toHaveAttribute('aria-pressed', 'true');
  });

  it('激活卡片含有 ring-blue-500 类名', () => {
    renderCards({ statusFilter: '1' });

    const [card1] = getStatCards();
    expect(card1.className).toContain('ring-blue-500');
  });

  it('非激活卡片不含 ring-blue-500 类名', () => {
    renderCards({ statusFilter: '1' });

    const [, card2] = getStatCards();
    expect(card2.className).not.toContain('ring-blue-500');
  });
});

// ============================================================
// 键盘可访问性
// ============================================================
describe('SalesStatsCards — 键盘交互', () => {
  it('Enter 键触发与点击相同的回调', () => {
    const { props } = renderCards();

    const [card1] = getStatCards();
    fireEvent.keyDown(card1, { key: 'Enter' });

    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith('1');
    expect(props.onPageChange).toHaveBeenCalledWith(1);
    expect(props.onFetchOrders).toHaveBeenCalledWith(undefined, '1', 1);
  });

  it('Space 键触发与点击相同的回调', () => {
    const { props } = renderCards();

    const [, card2] = getStatCards();
    fireEvent.keyDown(card2, { key: ' ' });

    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith('2');
    expect(props.onFetchOrders).toHaveBeenCalledWith(undefined, '2', 1);
  });

  it('其他键（如 Escape）不触发筛选回调', () => {
    const { props } = renderCards();

    const [card1] = getStatCards();
    fireEvent.keyDown(card1, { key: 'Escape' });

    expect(props.onStatusFilterChange).not.toHaveBeenCalled();
    expect(props.onFetchOrders).not.toHaveBeenCalled();
  });

  it('Enter 键阻止默认行为（防止页面滚动）', () => {
    renderCards();
    const [card1] = getStatCards();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    vi.spyOn(event, 'preventDefault').mockImplementation(() => {});
    fireEvent(card1, event);

    // preventDefault 应被调用
    expect(event.preventDefault).toHaveBeenCalled();
  });
});

// ============================================================
// 数据展示
// ============================================================
describe('SalesStatsCards — 数据渲染', () => {
  it('正确显示每条统计的 count 值', () => {
    renderCards();

    // 统计卡片顺序对应 key 1..5
    const counts = ['3', '5', '2', '10', '1'];
    getStatCards().forEach((card, i) => {
      expect(card.textContent).toContain(counts[i]);
    });
  });

  it('金额使用千分位 + 两位小数格式化', () => {
    renderCards();

    // amount 1200.5 → ¥1,200.50
    const [card1] = getStatCards();
    expect(card1.textContent).toContain('¥1,200.50');

    // amount 9500.75 → ¥9,500.75
    const [, , , card4] = getStatCards();
    expect(card4.textContent).toContain('¥9,500.75');
  });

  it('amount 为 0 时显示 ¥0.00', () => {
    renderCards({
      stats: [
        { status: 1, count: 0, amount: 0 },
        { status: 2, count: 0, amount: 0 },
        { status: 3, count: 0, amount: 0 },
        { status: 4, count: 0, amount: 0 },
        { status: 5, count: 0, amount: 0 },
      ],
    });

    getStatCards().forEach((card) => {
      expect(card.textContent).toContain('¥0.00');
    });
  });

  it('stats 为空数组时所有卡片 count 显示 0', () => {
    renderCards({ stats: [] });

    const counts = getStatCards().map((c) => c.textContent?.match(/\d+/)?.[0]);
    expect(counts).toEqual(['0', '0', '0', '0', '0']);
  });

  it('stats 缺少某个状态时，该状态卡片 count 显示 0，amount 显示 ¥0.00', () => {
    renderCards({
      stats: [
        { status: 2, count: 7, amount: 5000 },
        // status 1,3,4,5 缺失
      ],
    });

    const [, card2] = getStatCards();
    expect(card2.textContent).toContain('7');
    expect(card2.textContent).toContain('¥5,000.00');

    const [card1] = getStatCards();
    expect(card1.textContent).toContain('0');
    expect(card1.textContent).toContain('¥0.00');
  });
});

// ============================================================
// statusFilter=all 时的行为
// ============================================================
describe('SalesStatsCards — all 状态过滤', () => {
  it('statusFilter=all 时不自动选中任何卡片', () => {
    renderCards({ statusFilter: 'all' });

    getStatCards().forEach((card) => {
      expect(card).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('刷新按钮回调（reset）清空筛选后，所有卡片恢复非激活态', () => {
    // 模拟先选中 status=3，再调 reset
    const { props, rerender } = renderCards({ statusFilter: '3' });
    const [, , card3] = getStatCards();
    expect(card3).toHaveAttribute('aria-pressed', 'true');

    // 模拟重置
    rerender(
      <SalesStatsCards
        stats={props.stats}
        statusFilter="all"
        onStatusFilterChange={props.onStatusFilterChange}
        onFetchOrders={props.onFetchOrders}
        onPageChange={props.onPageChange}
        t={props.t}
      />
    );

    getStatCards().forEach((card) => {
      expect(card).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
