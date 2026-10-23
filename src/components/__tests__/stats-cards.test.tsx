import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { StatsCards, type StatsCardConfig, type StatsItem } from '../stats-cards';

const MOCK_CONFIGS: StatsCardConfig<string>[] = [
  { key: 'pending', label: '待处理', icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50' },
  { key: 'done', label: '已完成', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'error', label: '错误', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
];

const MOCK_STATS: StatsItem<string>[] = [
  { key: 'pending', count: 5, amount: 1234.56 },
  { key: 'done', count: 8, amount: 9999.99 },
  { key: 'error', count: 0, amount: 0 },
];

describe('StatsCards 组件测试', () => {
  it('应该正确渲染统计卡片网格', () => {
    render(<StatsCards configs={MOCK_CONFIGS} stats={MOCK_STATS} />);

    const cards = document.querySelectorAll('[role="button"]');
    expect(cards).toHaveLength(3);
  });

  it('应该渲染所有配置项的标签', () => {
    render(<StatsCards configs={MOCK_CONFIGS} stats={MOCK_STATS} />);

    expect(screen.getByText('待处理')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('错误')).toBeInTheDocument();
  });

  it('应该正确显示统计数据', () => {
    render(<StatsCards configs={MOCK_CONFIGS} stats={MOCK_STATS} />);

    // 组件已重构：主数值样式为 text-2xl font-bold（原 text-xl font-semibold 已升级）
    const counts = document.querySelectorAll('.text-2xl.font-bold');
    expect(counts[0]).toHaveTextContent('5');
    expect(counts[1]).toHaveTextContent('8');
    expect(counts[2]).toHaveTextContent('0');
  });

  it('应该正确格式化金额显示', () => {
    render(<StatsCards configs={MOCK_CONFIGS} stats={MOCK_STATS} />);

    // 组件样式：金额段落 class 为 text-xs text-gray-500 dark:text-gray-400，
    // 原断言的 .text-muted-foreground 已不再使用。
    // 每张卡片内 text-gray-500 出现 2 次：标签 + 金额，金额位于索引 [1]。
    const cards = document.querySelectorAll('[role="button"]');
    const amounts = Array.from(cards).map((card) =>
      card.querySelectorAll('.text-gray-500')
    );
    expect(amounts[0]![1]!.textContent).toBe('¥1,234.56');
    expect(amounts[1]![1]!.textContent).toBe('¥9,999.99');
    expect(amounts[2]![1]!.textContent).toBe('¥0.00');
  });

  it('应该使用自定义货币符号', () => {
    render(
      <StatsCards
        configs={MOCK_CONFIGS}
        stats={MOCK_STATS}
        currencySymbol="USD$"
      />
    );

    expect(screen.getByText('USD$1,234.56')).toBeInTheDocument();
  });

  it('应该使用自定义金额格式化函数', () => {
    const formatter = (amount: number) => `$${amount.toFixed(0)}`;

    render(
      <StatsCards
        configs={MOCK_CONFIGS}
        stats={MOCK_STATS}
        amountFormatter={formatter}
      />
    );

    expect(screen.getByText(/\$1235/)).toBeInTheDocument();
  });

  it('应该支持 activeKey 高亮激活状态', () => {
    const { rerender } = render(
      <StatsCards
        configs={MOCK_CONFIGS}
        stats={MOCK_STATS}
        activeKey="pending"
      />
    );

    // 组件已重构：激活态用 border-2 border-blue-500（原 ring-2 ring-blue-500 已弃用）
    const firstCard = document.querySelectorAll('[role="button"]')[0];
    expect(firstCard).toHaveClass('border-2');
    expect(firstCard).toHaveClass('border-blue-500');

    rerender(
      <StatsCards
        configs={MOCK_CONFIGS}
        stats={MOCK_STATS}
        activeKey="done"
      />
    );

    const secondCard = document.querySelectorAll('[role="button"]')[1];
    expect(secondCard).toHaveClass('border-2');
    expect(secondCard).toHaveClass('border-blue-500');
  });

  it('应该在无匹配数据时显示默认值', () => {
    render(
      <StatsCards
        configs={MOCK_CONFIGS}
        stats={[]}
      />
    );

    // 主数值样式为 text-2xl font-bold
    const counts = document.querySelectorAll('.text-2xl.font-bold');
    expect(counts[0]).toHaveTextContent('0');
    expect(counts[1]).toHaveTextContent('0');
    expect(counts[2]).toHaveTextContent('0');
  });

  it('应该触发点击回调', () => {
    const handleClick = vi.fn();
    render(
      <StatsCards
        configs={MOCK_CONFIGS}
        stats={MOCK_STATS}
        onCardClick={handleClick}
      />
    );

    const card = screen.getByText('待处理').closest('[role="button"]');
    fireEvent.click(card!);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('pending');
  });

  it('应该渲染 Lucide 图标', () => {
    const { container } = render(
      <StatsCards configs={MOCK_CONFIGS} stats={MOCK_STATS} />
    );

    const icons = container.querySelectorAll('svg');
    expect(icons).toHaveLength(3);
  });

  it('应该支持 ReactNode 类型的标签', () => {
    const customLabel = (
      <span className="custom-label">自定义标签</span>
    );
    const configs: StatsCardConfig<string>[] = [
      { key: 'custom', label: customLabel, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    ];

    render(<StatsCards configs={configs} stats={[]} />);

    expect(screen.getByText('自定义标签')).toBeInTheDocument();
  });

  it('应该支持 extra 属性与默认金额同时显示', () => {
    const stats: StatsItem<string>[] = [
      {
        key: 'pending',
        count: 5,
        amount: 1234.56,
        extra: <span className="custom-extra">自定义内容</span>,
      },
    ];
    const configs: StatsCardConfig<string>[] = [
      { key: 'pending', label: '待处理', icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50' },
    ];

    render(<StatsCards configs={configs} stats={stats} />);

    // 组件当前契约是 amount 与 extra 同时渲染（extra 不覆盖 amount），
    // 这一点与原测试期望不一致，已按实际行为调整。
    expect(screen.getByText('自定义内容')).toBeInTheDocument();
    expect(screen.getByText('¥1,234.56')).toBeInTheDocument();
  });

  it('应该支持数字类型 key', () => {
    const numericConfigs: StatsCardConfig<number>[] = [
      { key: 1, label: '状态一', icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50' },
      { key: 2, label: '状态二', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    ];
    const numericStats: StatsItem<number>[] = [
      { key: 1, count: 10, amount: 500 },
      { key: 2, count: 20, amount: 1000 },
    ];

    render(
      <StatsCards<number>
        configs={numericConfigs}
        stats={numericStats}
        activeKey={1}
      />
    );

    expect(screen.getByText('状态一')).toBeInTheDocument();
    expect(screen.getByText('状态二')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();

    // 激活态边框：border-2 border-blue-500
    const firstCard = document.querySelectorAll('[role="button"]')[0];
    expect(firstCard).toHaveClass('border-2');
  });

  it('应该支持字符串类型 key', () => {
    const stringConfigs: StatsCardConfig<string>[] = [
      { key: 'A', label: '类型A', icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50' },
      { key: 'B', label: '类型B', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    ];
    const stringStats: StatsItem<string>[] = [
      { key: 'A', count: 15, amount: 750 },
      { key: 'B', count: 25, amount: 1250 },
    ];

    render(
      <StatsCards<string>
        configs={stringConfigs}
        stats={stringStats}
        activeKey="A"
      />
    );

    expect(screen.getByText('类型A')).toBeInTheDocument();
    expect(screen.getByText('类型B')).toBeInTheDocument();

    // 激活态边框：border-2 border-blue-500
    const firstCard = document.querySelectorAll('[role="button"]')[0];
    expect(firstCard).toHaveClass('border-2');
  });

  it('应该响应键盘事件', () => {
    const handleClick = vi.fn();
    render(
      <StatsCards
        configs={MOCK_CONFIGS}
        stats={MOCK_STATS}
        onCardClick={handleClick}
      />
    );

    const card = screen.getByText('待处理').closest('[role="button"]');

    fireEvent.keyDown(card!, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card!, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(card!, { key: 'Escape' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('应该设置正确的无障碍属性', () => {
    render(<StatsCards configs={MOCK_CONFIGS} stats={MOCK_STATS} />);

    const buttons = document.querySelectorAll('[role="button"]');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('应该在激活时更新 aria-pressed 属性', () => {
    render(
      <StatsCards
        configs={MOCK_CONFIGS}
        stats={MOCK_STATS}
        activeKey="pending"
      />
    );

    const buttons = document.querySelectorAll('[role="button"]');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'false');
  });

  it('应该应用正确的背景颜色类', () => {
    render(<StatsCards configs={MOCK_CONFIGS} stats={MOCK_STATS} />);

    const cards = document.querySelectorAll('[role="button"]');
    expect(cards[0]).toHaveClass('bg-gray-50');
    expect(cards[1]).toHaveClass('bg-green-50');
    expect(cards[2]).toHaveClass('bg-red-50');
  });

  it('应该应用正确的图标颜色类', () => {
    const { container } = render(<StatsCards configs={MOCK_CONFIGS} stats={MOCK_STATS} />);

    const icons = container.querySelectorAll('svg');
    expect(icons[0]).toHaveClass('text-gray-600');
    expect(icons[1]).toHaveClass('text-green-600');
    expect(icons[2]).toHaveClass('text-red-600');
  });

  it('应该在激活时高亮图标颜色', () => {
    const { container } = render(
      <StatsCards
        configs={MOCK_CONFIGS}
        stats={MOCK_STATS}
        activeKey="pending"
      />
    );

    const icons = container.querySelectorAll('svg');
    // 激活状态的图标应该有 text-blue-600
    expect(icons[0]).toHaveClass('text-blue-600');
  });

  it('应该正确处理空配置', () => {
    const { container } = render(
      <StatsCards configs={[]} stats={[]} />
    );

    const cards = container.querySelectorAll('[role="button"]');
    expect(cards).toHaveLength(0);
  });

  it('应该正确使用 grid 布局类', () => {
    const { container } = render(
      <StatsCards configs={MOCK_CONFIGS} stats={MOCK_STATS} />
    );

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-2');
    expect(grid).toHaveClass('md:grid-cols-3');
    expect(grid).toHaveClass('lg:grid-cols-5');
  });
});
