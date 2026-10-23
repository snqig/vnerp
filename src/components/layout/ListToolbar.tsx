import { ReactNode } from 'react';

interface ListToolbarProps {
  children: ReactNode;
  className?: string;
}

/**
 * 统一的列表筛选工具栏容器：圆角、浅底、边框，将筛选控件与操作按钮归组。
 * 用于替代各录入页裸露的 <div className="flex ... gap-2 mb-4">。
 */
export function ListToolbar({ children, className = '' }: ListToolbarProps) {
  return (
    <div
      className={`mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40 ${className}`}
    >
      {children}
    </div>
  );
}
