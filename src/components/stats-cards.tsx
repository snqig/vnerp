'use client';

import { ReactNode, useState } from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatsCardConfig<T = number | string> {
  /** 唯一标识，用于点击筛选 */
  key: T;
  /** 卡片标题/标签 */
  label: string | ReactNode;
  /** 图标组件 */
  icon: LucideIcon;
  /** 图标颜色类名（如 text-blue-600） */
  color?: string;
  /** 背景色类名（如 bg-blue-50） */
  bg?: string;
  /** 图标位置 */
  iconPosition?: 'left' | 'right';
  /** 副标题/描述 */
  description?: string;
  /** 副标题颜色 */
  descriptionColor?: string;
}

export interface StatsItem<T = number | string> {
  /** 对应 config.key */
  key: T;
  /** 主数值 */
  count: number;
  /** 次要金额（可选） */
  amount?: number;
  /** 额外内容（可选） */
  extra?: ReactNode;
  /** 是否高亮 */
  highlight?: boolean;
  /** 趋势（上升/下降） */
  trend?: 'up' | 'down' | 'flat';
  /** 趋势百分比 */
  trendPercent?: number;
  /** 数值前缀（如 ¥） */
  prefix?: string;
  /** 数值后缀（如 k, %） */
  suffix?: string;
}

export interface StatsCardsProps<T = number | string> {
  /** 卡片配置列表 */
  configs: StatsCardConfig<T>[];
  /** 统计数据列表 */
  stats: StatsItem<T>[];
  /** 当前激活的 key（用于筛选高亮） */
  activeKey?: T;
  /** 货币符号 */
  currencySymbol?: string;
  /** 金额格式化函数 */
  amountFormatter?: (amount: number) => string;
  /** 数值格式化函数 */
  countFormatter?: (count: number, key: T) => string;
  /** 是否可点击筛选 */
  clickable?: boolean;
  /** 点击回调 */
  onCardClick?: (key: T) => void;
  /** 网格列数 */
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /** 是否显示趋势 */
  showTrend?: boolean;
}

/**
 * 统一统计卡片组件
 * 
 * 特性：
 * - 统一样式、大小、背景
 * - 鼠标悬停效果（边框高亮、阴影）
 * - 激活状态高亮
 * - 趋势指示
 * - 响应式网格
 * - 可点击筛选
 * 
 * @example
 * <StatsCards
 *   configs={[
 *     { key: 'pending', label: '待处理', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
 *     { key: 'completed', label: '已完成', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
 *   ]}
 *   stats={[
 *     { key: 'pending', count: 12, amount: 12000, trend: 'up', trendPercent: 15 },
 *     { key: 'completed', count: 45, amount: 45000, trend: 'down', trendPercent: 5 },
 *   ]}
 *   activeKey={activeFilter}
 *   onCardClick={(key) => setActiveFilter(key)}
 * />
 */
export function StatsCards<T = number | string>({
  configs,
  stats,
  activeKey,
  currencySymbol = '¥',
  amountFormatter = (amount: number) =>
    amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  countFormatter,
  clickable = true,
  onCardClick,
  cols = { mobile: 2, tablet: 3, desktop: 5 },
  showTrend = true,
}: StatsCardsProps<T>) {
  const [hoveredKey, setHoveredKey] = useState<T | null>(null);

  const gridCols = `grid-cols-${cols.mobile} md:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop}`;

  const handleClick = (key: T) => {
    if (!clickable || !onCardClick) return;
    onCardClick(key);
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(key);
    }
  };

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {configs.map(({ key, label, icon: Icon, color, bg, iconPosition = 'right', description, descriptionColor }) => {
        const stat = stats.find((s) => s.key === key);
        const count = stat?.count ?? 0;
        const amount = stat?.amount ?? 0;
        const isActive = activeKey === key;
        const isHovered = hoveredKey === key;

        const formattedCount = countFormatter ? countFormatter(count, key) : count.toLocaleString();

        // 背景色：默认浅灰，激活时蓝色
        const backgroundColor = isActive
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
          : bg || 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800';

        // 边框样式
        const borderStyle = isActive
          ? 'border-2 border-blue-500'
          : isHovered && clickable
          ? 'border-2 border-blue-400 dark:border-blue-600 shadow-md'
          : 'border border-gray-200 dark:border-gray-800';

        // 趋势图标和颜色
        const trendIcon = stat?.trend === 'up' ? '↑' : stat?.trend === 'down' ? '↓' : '—';
        const trendColor = stat?.trend === 'up' ? 'text-green-600' : stat?.trend === 'down' ? 'text-red-600' : 'text-gray-500';

        return (
          <div
            key={String(key)}
            className={`
              ${backgroundColor}
              ${borderStyle}
              rounded-lg p-4
              flex flex-col gap-2
              transition-all duration-200 ease-in-out
              ${clickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''}
              ${isActive ? 'shadow-md' : ''}
            `}
            onClick={() => handleClick(key)}
            onMouseEnter={() => setHoveredKey(key)}
            onMouseLeave={() => setHoveredKey(null)}
            onKeyDown={(e) => handleKeyDown(e, key)}
            role={clickable ? 'button' : 'article'}
            tabIndex={clickable ? 0 : undefined}
            aria-pressed={isActive}
            aria-label={typeof label === 'string' ? label : undefined}
          >
            {/* 顶部行：标签 + 图标 */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {label}
              </span>
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                  color || 'text-gray-400'
                } ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}
              />
            </div>

            {/* 中间行：主数值 + 趋势 */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {formattedCount}
              </span>
              {showTrend && stat?.trendPercent !== undefined && (
                <span className={`text-xs font-medium ${trendColor} flex items-center gap-0.5`}>
                  {trendIcon}
                  {Math.abs(stat.trendPercent)}%
                </span>
              )}
            </div>

            {/* 底部行：金额或描述 */}
            {stat?.amount !== undefined ? (
              <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                {currencySymbol}{amountFormatter(amount)}
              </span>
            ) : description ? (
              <span className={`text-xs leading-tight ${descriptionColor || 'text-gray-500 dark:text-gray-400'}`}>
                {description}
              </span>
            ) : null}

            {/* 额外内容 */}
            {stat?.extra}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 预设的颜色主题
 */
export const StatsTheme = {
  /** 蓝色 - 进行中 */
  blue: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  /** 绿色 - 已完成/成功 */
  green: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  /** 橙色 - 待处理/警告 */
  orange: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  /** 红色 - 已取消/错误 */
  red: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  /** 紫色 - 特殊/重要 */
  purple: { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  /** 灰色 - 默认 */
  gray: { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/50' },
  /** 黄色 - 提醒 */
  yellow: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  /** 青色 - 信息 */
  cyan: { color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
} as const;
