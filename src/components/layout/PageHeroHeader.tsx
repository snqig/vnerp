'use client';

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeroHeaderProps {
  /** 图标组件（可选） */
  icon?: LucideIcon;
  /** 标题 */
  title: ReactNode;
  /** 副标题 / 描述（可选） */
  description?: ReactNode;
  /** 右侧操作区（按钮等） */
  action?: ReactNode;
}

/**
 * 统一的渐变页面头：左侧图标块 + 标题 + 副标题，右侧操作按钮。
 * 用于替代各录入页朴素的 <h1>+<Button> 头，提供一致的视觉语言。
 */
export function PageHeroHeader({ icon: Icon, title, description, action }: PageHeroHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-cyan-50 to-indigo-50 p-6 shadow-sm dark:border-slate-800 dark:from-sky-950/40 dark:via-slate-900/40 dark:to-indigo-950/40">
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30">
              <Icon className="h-7 w-7" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
